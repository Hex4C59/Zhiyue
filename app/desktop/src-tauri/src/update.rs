use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use tauri::window::{ProgressBarState, ProgressBarStatus};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_updater::UpdaterExt;

use crate::stop_sidecar;

static CHECKING: AtomicBool = AtomicBool::new(false);

#[cfg(windows)]
fn message_box(text: &str, flags: u32) -> i32 {
    use windows_sys::Win32::UI::WindowsAndMessaging::MessageBoxW;

    let text: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
    let title: Vec<u16> = "Zhiyue".encode_utf16().chain(std::iter::once(0)).collect();
    unsafe { MessageBoxW(std::ptr::null_mut(), text.as_ptr(), title.as_ptr(), flags) }
}

#[cfg(not(windows))]
fn message_box(text: &str, _flags: u32) -> i32 {
    eprintln!("[zhiyue] {text}");
    0
}

const MB_OK: u32 = 0x0000_0000;
const MB_ICONERROR: u32 = 0x0000_0010;
const MB_ICONINFORMATION: u32 = 0x0000_0040;
const MB_YESNO: u32 = 0x0000_0004;
const MB_SETFOREGROUND: u32 = 0x0001_0000;
const MB_TOPMOST: u32 = 0x0004_0000;
const IDYES: i32 = 6;

fn info(text: &str) {
    message_box(
        text,
        MB_OK | MB_ICONINFORMATION | MB_SETFOREGROUND | MB_TOPMOST,
    );
}

fn error(text: &str) {
    message_box(text, MB_OK | MB_ICONERROR | MB_SETFOREGROUND | MB_TOPMOST);
}

fn confirm(text: &str) -> bool {
    message_box(
        text,
        MB_YESNO | MB_ICONINFORMATION | MB_SETFOREGROUND | MB_TOPMOST,
    ) == IDYES
}

fn update_endpoint() -> Option<String> {
    std::env::var("ZHIYUE_UPDATE_ENDPOINT")
        .ok()
        .filter(|value| !value.trim().is_empty())
}

/// 环境变量优先；没有时读取 tauri.conf.json 的 plugins.updater.endpoints。
/// 两者都没有时不应构造 updater，否则 Tauri 会在 build() 阶段报 EmptyEndpoints。
fn has_update_source(app: &AppHandle) -> bool {
    if update_endpoint().is_some() {
        return true;
    }
    app.config()
        .plugins
        .0
        .get("updater")
        .and_then(|value| value.get("endpoints"))
        .and_then(|value| value.as_array())
        .is_some_and(|endpoints| !endpoints.is_empty())
}

enum Outcome {
    UpToDate,
    Declined,
    Installed,
}

pub(crate) fn check_updates(app: AppHandle, silent: bool) {
    if CHECKING.swap(true, Ordering::SeqCst) {
        if !silent {
            info("正在检查更新，请稍候。");
        }
        return;
    }
    if !has_update_source(&app) {
        CHECKING.store(false, Ordering::SeqCst);
        if !silent {
            info("尚未配置更新源。请设置 ZHIYUE_UPDATE_ENDPOINT，或在 tauri.conf.json 的 plugins.updater.endpoints 中配置。");
        }
        return;
    }
    tauri::async_runtime::spawn(async move {
        let result = run_check(app).await;
        CHECKING.store(false, Ordering::SeqCst);
        match result {
            Ok(Outcome::UpToDate) if !silent => info("当前已是最新版本。"),
            Ok(Outcome::Installed) => info("更新已安装，请重新启动 Zhiyue。"),
            Ok(_) => {}
            Err(message) => {
                if !silent {
                    error(&message);
                }
            }
        }
    });
}

/// 启动后静默检查一次；发现新版本仍会提示安装，出错不打扰用户。
pub(crate) fn schedule_startup_check(app: AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(6));
        check_updates(app, true);
    });
}

fn open_update_window(app: &AppHandle) -> Option<WebviewWindow> {
    if let Some(existing) = app.get_webview_window("update") {
        let _ = existing.close();
    }
    WebviewWindowBuilder::new(app, "update", WebviewUrl::App("update.html".into()))
        .title("Zhiyue 更新")
        .inner_size(400.0, 210.0)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .always_on_top(true)
        .center()
        .build()
        .ok()
}

fn show_update_progress(window: &WebviewWindow, percent: Option<u64>, message: &str) {
    let _ = window.set_progress_bar(ProgressBarState {
        status: Some(if percent.is_some() {
            ProgressBarStatus::Normal
        } else {
            ProgressBarStatus::Indeterminate
        }),
        progress: percent,
    });
    let message = serde_json::to_string(message).unwrap_or_else(|_| "\"正在下载更新…\"".to_string());
    let percent = percent.map_or_else(|| "null".to_string(), |value| value.to_string());
    let _ = window.eval(format!(
        "window.setUpdateProgress && window.setUpdateProgress({percent}, {message});"
    ));
}

async fn run_check(app: AppHandle) -> Result<Outcome, String> {
    let mut builder = app.updater_builder();
    if let Some(endpoint) = update_endpoint() {
        let endpoint = endpoint
            .trim()
            .parse()
            .map_err(|_| "更新源地址无效，请检查 ZHIYUE_UPDATE_ENDPOINT。".to_string())?;
        builder = builder
            .endpoints(vec![endpoint])
            .map_err(|error| format!("更新源地址无效：{error}"))?;
    }
    let cleanup_app = app.clone();
    let updater = builder
        .on_before_exit(move || stop_sidecar(&cleanup_app))
        .restart_after_install(true)
        .build()
        .map_err(|error| match error {
            tauri_plugin_updater::Error::EmptyEndpoints => {
                "尚未配置更新源，请先设置 ZHIYUE_UPDATE_ENDPOINT。".to_string()
            }
            error => format!("无法初始化更新器：{error}"),
        })?;
    let update = updater.check().await.map_err(|error| match error {
        tauri_plugin_updater::Error::EmptyEndpoints => {
            "尚未配置更新源，请先设置 ZHIYUE_UPDATE_ENDPOINT。".to_string()
        }
        error => format!("检查更新失败：{error}"),
    })?;
    let Some(update) = update else {
        return Ok(Outcome::UpToDate);
    };

    let mut prompt = format!(
        "发现新版本 {}（当前 {}）。",
        update.version, update.current_version
    );
    if let Some(body) = update.body.as_deref().map(str::trim).filter(|text| !text.is_empty()) {
        const MAX_NOTES: usize = 600;
        let mut notes: String = body.chars().take(MAX_NOTES).collect();
        if body.chars().count() > MAX_NOTES {
            notes.push('…');
        }
        prompt.push_str(&format!("\n\n{notes}"));
    }
    prompt.push_str("\n\n是否下载并安装？安装时应用会退出，完成后自动重新打开。");
    if !confirm(&prompt) {
        return Ok(Outcome::Declined);
    }

    // 下载时显示独立进度窗口；下载完成后更新器会停止本地服务、启动安装器并退出。
    let main_window = app.get_webview_window("main");
    let update_window = open_update_window(&app);
    if let Some(main) = &main_window {
        let _ = main.hide();
    }
    if update_window.is_none() {
        if let Some(main) = &main_window {
            let _ = main.set_title("Zhiyue（正在下载更新…）");
            let _ = main.set_progress_bar(ProgressBarState {
                status: Some(ProgressBarStatus::Indeterminate),
                progress: None,
            });
        }
    }
    let progress_window = update_window.clone();
    let fallback_window = if update_window.is_none() { main_window.clone() } else { None };
    let result = update
        .download_and_install(
            move |chunk, total| {
                let percent = total
                    .filter(|value| *value > 0)
                    .map(|total| ((chunk as f64 / total as f64) * 100.0).clamp(0.0, 100.0) as u64);
                if let Some(window) = progress_window.as_ref() {
                    show_update_progress(window, percent, "正在下载更新…");
                } else if let Some(window) = fallback_window.as_ref() {
                    let _ = window.set_progress_bar(ProgressBarState {
                        status: Some(if percent.is_some() {
                            ProgressBarStatus::Normal
                        } else {
                            ProgressBarStatus::Indeterminate
                        }),
                        progress: percent,
                    });
                }
            },
            || {},
        )
        .await;
    if let Some(window) = &update_window {
        let _ = window.set_progress_bar(ProgressBarState {
            status: Some(ProgressBarStatus::None),
            progress: None,
        });
        let _ = window.close();
    }
    if let Some(window) = &main_window {
        let _ = window.set_progress_bar(ProgressBarState {
            status: Some(ProgressBarStatus::None),
            progress: None,
        });
        let _ = window.set_title("Zhiyue");
        let _ = window.show();
        let _ = window.set_focus();
    }
    result.map_err(|error| format!("下载或安装更新失败：{error}"))?;
    Ok(Outcome::Installed)
}
