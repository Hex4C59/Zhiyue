use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use tauri::{AppHandle, Manager};
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
        .map_err(|error| format!("无法初始化更新器：{error}"))?;
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

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_title("Zhiyue（正在下载更新…）");
    }
    let result = update.download_and_install(|_, _| {}, || {}).await;
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_title("Zhiyue");
    }
    result.map_err(|error| format!("下载或安装更新失败：{error}"))?;
    Ok(Outcome::Installed)
}
