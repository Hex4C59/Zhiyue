use std::collections::VecDeque;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, RunEvent, WebviewWindow, WindowEvent};

mod update;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

struct Sidecar(Mutex<Option<Child>>);

struct Launch {
    node: PathBuf,
    entry: PathBuf,
    cwd: PathBuf,
    library: Option<PathBuf>,
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn stop_sidecar(app: &AppHandle) {
    let child = app
        .state::<Sidecar>()
        .0
        .lock()
        .ok()
        .and_then(|mut slot| slot.take());
    let Some(mut child) = child else { return };
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/PID", &child.id().to_string(), "/T", "/F"])
            .creation_flags(CREATE_NO_WINDOW)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    let _ = child.kill();
    let _ = child.wait();
}

fn fail_startup(window: &WebviewWindow, message: &str) {
    let window = window.clone();
    let message = message.to_string();
    std::thread::spawn(move || {
        // 等待启动页完成首帧，避免失败提示落在尚未加载的文档上。
        std::thread::sleep(Duration::from_millis(600));
        let text = serde_json::to_string(&message).unwrap_or_else(|_| "\"启动失败\"".to_string());
        let _ = window.eval(format!("window.showStartupError({text});"));
    });
}

fn resolve_launch(app: &AppHandle) -> Result<Launch, String> {
    if cfg!(debug_assertions) {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("..")
            .join("..")
            .canonicalize()
            .map_err(|error| format!("无法定位项目目录：{error}"))?;
        return Ok(Launch {
            node: PathBuf::from(if cfg!(windows) { "node.exe" } else { "node" }),
            entry: root.join("app/web/src/server.mjs"),
            cwd: root,
            library: None,
        });
    }
    let runtime = app
        .path()
        .resource_dir()
        .map_err(|error| format!("无法定位应用资源目录：{error}"))?
        .join("resources")
        .join("runtime");
    let node = runtime
        .join("node")
        .join(if cfg!(windows) { "node.exe" } else { "node" });
    let cwd = runtime.join("app");
    let entry = cwd.join("web/src/server.mjs");
    if !node.is_file() {
        return Err("缺少内置 Node 运行时，请重新安装 Zhiyue。".to_string());
    }
    if !entry.is_file() {
        return Err("缺少本地服务文件，请重新安装 Zhiyue。".to_string());
    }
    let library = std::env::var_os("LITERATURE_LIBRARY")
        .map(PathBuf::from)
        .or_else(|| {
            app.path()
                .document_dir()
                .ok()
                .map(|directory| directory.join("Zhiyue").join("library"))
        });
    Ok(Launch {
        node,
        entry,
        cwd,
        library,
    })
}

fn spawn_sidecar(app: &AppHandle, window: &WebviewWindow) -> Result<(), String> {
    let launch = resolve_launch(app)?;
    let mut command = Command::new(&launch.node);
    command
        .arg(&launch.entry)
        .current_dir(&launch.cwd)
        .env("LITERATURE_PORT", "0")
        .env("ZHIYUE_URL", "1")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(library) = &launch.library {
        command.env("LITERATURE_LIBRARY", library);
    }
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);
    let mut child = command
        .spawn()
        .map_err(|error| format!("无法启动本地 Node 服务：{error}"))?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法读取本地服务输出。".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "无法读取本地服务错误。".to_string())?;
    app.state::<Sidecar>()
        .0
        .lock()
        .map_err(|_| "本地服务状态不可用。".to_string())?
        .replace(child);

    let tail = Arc::new(Mutex::new(VecDeque::<String>::new()));
    let stderr_tail = tail.clone();
    std::thread::spawn(move || {
        for line in BufReader::new(stderr).lines().map_while(Result::ok) {
            eprintln!("[zhiyue] {line}");
            let mut tail = stderr_tail.lock().unwrap();
            tail.push_back(line);
            if tail.len() > 12 {
                tail.pop_front();
            }
        }
    });

    let ready = Arc::new(AtomicBool::new(false));
    let ready_flag = ready.clone();
    let ready_window = window.clone();
    let error_tail = tail.clone();
    std::thread::spawn(move || {
        let mut started = false;
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            if let Some(url) = line.strip_prefix("ZHIYUE_URL=") {
                started = true;
                ready_flag.store(true, Ordering::SeqCst);
                if let Ok(url) = tauri::Url::parse(url.trim()) {
                    let _ = ready_window.navigate(url);
                }
            }
        }
        if !started {
            let details = error_tail
                .lock()
                .map(|tail| tail.iter().cloned().collect::<Vec<_>>().join("\n"))
                .unwrap_or_default();
            let message = if details.is_empty() {
                "本地服务未能启动，请重新打开应用。".to_string()
            } else {
                format!("本地服务未能启动：\n{details}")
            };
            fail_startup(&ready_window, &message);
        }
    });

    let timeout_app = app.clone();
    let timeout_window = window.clone();
    std::thread::spawn(move || {
        for _ in 0..120 {
            if ready.load(Ordering::SeqCst) {
                return;
            }
            std::thread::sleep(Duration::from_millis(250));
        }
        if !ready.load(Ordering::SeqCst) {
            stop_sidecar(&timeout_app);
            fail_startup(&timeout_window, "本地服务启动超时，请重新打开应用。");
        }
    });
    Ok(())
}

fn hide_on_close(window: &WebviewWindow) {
    let window_for_event = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = window_for_event.hide();
        }
    });
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "显示 Zhiyue", true, None::<&str>)?;
    let check_update = MenuItem::with_id(app, "update", "检查更新", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &check_update, &separator, &quit])?;
    let icon = match app.default_window_icon().cloned() {
        Some(icon) => icon,
        None => tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png"))?,
    };
    TrayIconBuilder::new()
        .icon(icon)
        .tooltip("Zhiyue")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main(app),
            "update" => update::check_updates(app.clone(), false),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_main(app);
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Sidecar(Mutex::new(None)))
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .ok_or("缺少主窗口配置。")?;
            hide_on_close(&window);
            build_tray(app.handle()).map_err(|error| format!("无法创建托盘菜单：{error}"))?;
            if let Err(error) = spawn_sidecar(app.handle(), &window) {
                fail_startup(&window, &error);
            }
            update::schedule_startup_check(app.handle().clone());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("无法初始化 Zhiyue 桌面窗口");
    app.run(|app, event| {
        if let RunEvent::Exit = event {
            stop_sidecar(app);
        }
    });
}
