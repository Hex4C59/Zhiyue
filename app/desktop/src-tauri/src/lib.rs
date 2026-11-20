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
use std::os::windows::io::AsRawHandle;
#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

struct Sidecar(Mutex<Option<Child>>);

/// 正常退出流程会置位，避免把主动停止的服务误报为运行中崩溃。
struct Exiting(AtomicBool);

/// 句柄故意不在代码中关闭：桌面进程结束时由系统关闭句柄，
/// 作业对象的 KILL_ON_JOB_CLOSE 随即终止 Node 及其子进程。
#[cfg(windows)]
#[allow(dead_code)]
struct JobHandle(usize);

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
    app.state::<Exiting>().0.store(true, Ordering::SeqCst);
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

#[cfg(windows)]
fn create_containment_job() -> Option<usize> {
    use windows_sys::Win32::System::JobObjects::{
        CreateJobObjectW, JobObjectExtendedLimitInformation, SetInformationJobObject,
        JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    };
    unsafe {
        let job = CreateJobObjectW(std::ptr::null(), std::ptr::null());
        if job.is_null() {
            return None;
        }
        let mut limits: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
        limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        let configured = SetInformationJobObject(
            job,
            JobObjectExtendedLimitInformation,
            &limits as *const _ as *const core::ffi::c_void,
            std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
        );
        if configured == 0 {
            close_job(job as usize);
            return None;
        }
        Some(job as usize)
    }
}

#[cfg(windows)]
fn close_job(job: usize) {
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
    unsafe {
        let _ = CloseHandle(job as HANDLE);
    }
}

#[cfg(windows)]
fn assign_to_job(job: usize, child: &Child) -> bool {
    use windows_sys::Win32::Foundation::HANDLE;
    use windows_sys::Win32::System::JobObjects::AssignProcessToJobObject;
    unsafe { AssignProcessToJobObject(job as HANDLE, child.as_raw_handle() as HANDLE) != 0 }
}

/// 服务在握手后退出时回到启动页显示原因；若导航失败，直接在当前页面覆盖提示。
fn show_runtime_error(window: &WebviewWindow, startup: Option<&tauri::Url>, message: &str) {
    if let Some(startup) = startup {
        let _ = window.navigate(startup.clone());
    }
    // 启动页是本地资源，通常几十毫秒内完成导航；留出余量再写入错误。
    std::thread::sleep(Duration::from_millis(700));
    let text = serde_json::to_string(message).unwrap_or_else(|_| "\"本地服务已停止\"".to_string());
    let style = concat!(
        "margin:0;padding:48px;background:#f7f4ed;color:#8c3a2b;",
        "box-sizing:border-box;display:grid;place-items:center;min-height:100vh;",
        "font:15px/1.7 \"Segoe UI\",\"Microsoft YaHei UI\",sans-serif;",
        "white-space:pre-wrap;"
    );
    let style = serde_json::to_string(style).unwrap_or_default();
    let script = format!(
        "(() => {{ const message = {text}; \
         if (typeof window.showRuntimeError === 'function') {{ \
             window.showRuntimeError(message); return; \
         }} \
         document.body.textContent = message; \
         document.body.style.cssText = {style}; }})();"
    );
    let _ = window.eval(script);
}

/// 握手后每秒检查本地服务；意外退出时提示用户，不自动重启。
fn watch_sidecar(
    app: AppHandle,
    window: WebviewWindow,
    startup: Option<tauri::Url>,
    tail: Arc<Mutex<VecDeque<String>>>,
) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(1000));
        if app.state::<Exiting>().0.load(Ordering::SeqCst) {
            return;
        }
        let status = {
            let sidecar = app.state::<Sidecar>();
            let mut slot = match sidecar.0.lock() {
                Ok(slot) => slot,
                Err(_) => return,
            };
            let Some(child) = slot.as_mut() else { return };
            match child.try_wait() {
                Ok(Some(status)) => status,
                Ok(None) => continue,
                Err(_) => return,
            }
        };
        let code = status
            .code()
            .map(|code| code.to_string())
            .unwrap_or_else(|| "未知".to_string());
        let details = tail
            .lock()
            .map(|lines| lines.iter().cloned().collect::<Vec<_>>().join("\n"))
            .unwrap_or_default();
        let mut message =
            format!("本地服务意外停止（退出码 {code}）。\n请从托盘菜单退出 Zhiyue 后重新打开。");
        if !details.is_empty() {
            message.push_str(&format!("\n\n最近输出：\n{details}"));
        }
        show_runtime_error(&window, startup.as_ref(), &message);
        return;
    });
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

/// WebView 的 localStorage 按 origin（含端口）隔离，而本地服务每次启动换端口。
/// 界面状态已改存文献库 `.zhiyue/data/ui.json`，旧端口留下的存储不会被读取，
/// 因此在 WebView 启动前删除一次；目录名带标记，删过就不再重复尝试。
fn purge_legacy_storage(identifier: &str) {
    let Some(local) = std::env::var_os("LOCALAPPDATA") else {
        return;
    };
    let data_dir = PathBuf::from(local).join(identifier);
    let marker = data_dir.join("legacy-local-storage.purged");
    if marker.exists() {
        return;
    }
    let storage = data_dir.join("EBWebView").join("Default").join("Local Storage");
    if storage.exists() {
        match std::fs::remove_dir_all(&storage) {
            Ok(()) => eprintln!("已清理旧端口遗留的浏览器存储：{}", storage.display()),
            // 目录仍被占用（例如另一个实例在跑）：不写标记，下次启动再试。
            Err(error) => {
                eprintln!("清理旧浏览器存储失败：{error}");
                return;
            }
        }
    }
    let _ = std::fs::write(&marker, b"1");
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
            entry: root.join("build/app/web/src/server.js"),
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
    let entry = cwd.join("web/src/server.js");
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
        .env("ZHIYUE_DESKTOP", "1")
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
    #[cfg(windows)]
    match create_containment_job() {
        Some(job) => {
            if assign_to_job(job, &child) {
                let _ = app.manage(JobHandle(job));
            } else {
                eprintln!("[zhiyue] 无法把本地服务加入作业对象，强制结束桌面进程时可能遗留 Node。");
                close_job(job);
            }
        }
        None => eprintln!("[zhiyue] 无法创建作业对象，强制结束桌面进程时可能遗留 Node。"),
    }
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
    let ready_app = app.clone();
    let ready_window = window.clone();
    let error_tail = tail.clone();
    std::thread::spawn(move || {
        let mut started = false;
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            if !started {
                if let Some(url) = line.strip_prefix("ZHIYUE_URL=") {
                    started = true;
                    ready_flag.store(true, Ordering::SeqCst);
                    // 握手时启动页已加载，此时读取到的才是可返回的启动页地址；
                    // 窗口创建初期这里是 about:blank。
                    let startup = ready_window
                        .url()
                        .ok()
                        .filter(|url| url.as_str() != "about:blank");
                    if let Ok(url) = tauri::Url::parse(url.trim()) {
                        let _ = ready_window.navigate(url);
                    }
                    watch_sidecar(
                        ready_app.clone(),
                        ready_window.clone(),
                        startup,
                        error_tail.clone(),
                    );
                }
            } else if line == "ZHIYUE_QUIT" {
                ready_app.exit(0);
                break;
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
    // 在 Builder.build() 创建窗口之前清理：WebView 一旦启动就会锁住这些文件。
    let context = tauri::generate_context!();
    purge_legacy_storage(&context.config().identifier);
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_main(app);
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Sidecar(Mutex::new(None)))
        .manage(Exiting(AtomicBool::new(false)))
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .ok_or("缺少主窗口配置。")?;
            // 在窗口加载前清理，避免 WebView 已打开旧存储后目录被占用。
            hide_on_close(&window);
            build_tray(app.handle()).map_err(|error| format!("无法创建托盘菜单：{error}"))?;
            if let Err(error) = spawn_sidecar(app.handle(), &window) {
                fail_startup(&window, &error);
            }
            update::schedule_startup_check(app.handle().clone());
            Ok(())
        })
        .build(context)
        .expect("无法初始化 Zhiyue 桌面窗口");
    app.run(|app, event| {
        if let RunEvent::Exit = event {
            stop_sidecar(app);
        }
    });
}
