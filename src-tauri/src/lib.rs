// Tauri's `#[command]` macro requires arguments by value (owned `String`,
// `State<'_, _>`, `AppHandle`) for deserialization from the frontend
// invoke payload. Suppress the related pedantic lints at module scope so
// command signatures stay idiomatic for the Tauri API.
#![allow(clippy::needless_pass_by_value)]

mod agent;
mod git;
mod git_watcher;
mod history;
mod mcp_skill;
mod sensevoice_speech;
use sensevoice_speech::SenseVoiceState;
mod power_metrics;
use agent::AgentBridge;
use git_watcher::GitWatcherState;
use power_metrics::{HardwarePowerMetrics, PowerState};
use tauri::{Manager, State};

/// Write a JSON command to a specific session's omp stdin.
#[tauri::command]
fn send_command(
    session_id: String,
    json: String,
    bridge: State<'_, AgentBridge>,
) -> Result<(), String> {
    bridge.send(&session_id, &json)
}

/// Start an omp process for a new tab session.
/// `cwd`: absolute path to the project folder (empty string = omp's default).
#[tauri::command]
fn start_session(
    session_id: String,
    cwd: String,
    resume_path: Option<String>,
    bridge: State<'_, AgentBridge>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let cwd_opt = if cwd.is_empty() { None } else { Some(cwd) };
    bridge.start_session(session_id, cwd_opt.as_deref(), resume_path.as_deref(), app)
}

/// Kill the omp process for a tab session.
#[tauri::command]
fn stop_session(session_id: String, bridge: State<'_, AgentBridge>) {
    bridge.stop_session(&session_id);
}

/// Query a session's last error. Returns `None` if the session is
/// running (or has never been started under this id), `Some(reason)`
/// if its last `start_session` attempt failed.
///
/// This replaces a previous timing-fragile pattern that emitted a
/// delayed `agent://exit/{id}` after a fixed sleep, hoping the
/// frontend listener was attached in time. The frontend can now query
/// this synchronously on activation and surface the real reason.
#[tauri::command]
fn session_status(session_id: String, bridge: State<'_, AgentBridge>) -> Option<String> {
    bridge.last_error(&session_id)
}

/// Native folder picker — returns the chosen path or null.
///
/// On macOS, `AppKit` requires all `NSOpenPanel` calls to originate from
/// the main thread. `blocking_pick_folder` invokes the dialog directly
/// on the calling command-handler thread — an `AppKit` threading-model
/// violation that causes an indefinite hang (spinning beach ball + high CPU).
///
/// The callback-based `pick_folder` dispatches the dialog to the main
/// thread correctly. We bridge the callback to our async context with
/// an `mpsc` channel + `spawn_blocking` so the async executor is never
/// stalled.
#[tauri::command]
async fn open_project(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let (tx, rx) = std::sync::mpsc::channel();
    // Use into_path() rather than to_string() so we get a real PathBuf
    // and convert through to_string_lossy(). Avoids platform-specific
    // FilePath::to_string formatting (URL encoding, UNC prefix quirks)
    // that could diverge from what std::fs and the rest of the app
    // expect downstream.
    app.dialog()
        .file()
        .set_title("Open Project Folder")
        .pick_folder(move |result| {
            let _ = tx.send(result);
        });
    let picked = tauri::async_runtime::spawn_blocking(move || rx.recv())
        .await
        .map_err(|e| format!("join error: {e}"))?
        .map_err(|e| format!("channel error: {e}"))?;
    let Some(picked) = picked else {
        return Ok(None);
    };
    let path = picked
        .into_path()
        .map_err(|e| format!("invalid picked path: {e}"))?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

/// Start watching `.git/HEAD` for a session's project path.
///
/// Returns the short branch name at call time, or `None` when `path` is
/// not inside a git repo or HEAD is detached.  The watcher fires
/// `"git://branch/{session_id}"` events on every subsequent HEAD change.
/// Watcher errors are silently ignored — the branch chip simply won't
/// update live.
#[tauri::command]
fn start_git_watch(
    session_id: String,
    path: String,
    watcher: State<'_, GitWatcherState>,
    app: tauri::AppHandle,
) -> Option<String> {
    let p = std::path::Path::new(&path);
    let (branch, head) = git::probe(p);
    if let Some(h) = head {
        let _ = watcher.start(&session_id, p, h, app);
    }
    branch
}

/// Stop the HEAD watcher for a session.  No-op when none is active.
#[tauri::command]
fn stop_git_watch(session_id: String, watcher: State<'_, GitWatcherState>) {
    watcher.stop(&session_id);
}

/// Open a URL in the system default browser.
/// Uses the `open` crate (`ShellExecute` on Windows, `xdg-open` on Linux, `open` on macOS).
/// `window.open(url, "_blank")` creates a Tauri webview instead — this is the correct
/// path for OAuth flows and any external URL that must open in the user's real browser.
#[tauri::command]
fn open_url_external(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())
}

fn get_models_config_path() -> Result<std::path::PathBuf, String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "Could not determine user home directory".to_string())?;
    let mut path = std::path::PathBuf::from(home);
    path.push(".omp");
    path.push("agent");
    path.push("models.yml");
    Ok(path)
}
/// Ensure ~/.omp/agent/config.yml and models.yml exist with setupVersion: 2 and a placeholder model.
/// This defends fresh omp installations against exiting with "No models available"
/// or hanging inside the terminal Setup Wizard.
fn ensure_omp_onboarding_seeded() {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .ok();
    let Some(home) = home else { return };
    let agent_dir = std::path::PathBuf::from(home).join(".omp").join("agent");
    let _ = std::fs::create_dir_all(&agent_dir);

    // 1. config.yml - ensure setupVersion: 2 to skip TUI onboarding wizard
    let config_path = agent_dir.join("config.yml");
    if !config_path.exists() {
        let default_config = "setupVersion: 2\nstartup:\n  setupWizard: false\ndefaultThinkingLevel: high\n";
        let _ = std::fs::write(&config_path, default_config);
    } else if let Ok(content) = std::fs::read_to_string(&config_path) {
        if !content.contains("setupVersion") {
            let patched = format!("setupVersion: 2\nstartup:\n  setupWizard: false\n{content}");
            let _ = std::fs::write(&config_path, patched);
        }
    }

    // 2. models.yml - ensure at least a placeholder model exists so omp doesn't exit(1) on boot
    let models_path = agent_dir.join("models.yml");
    let needs_placeholder = if !models_path.exists() {
        true
    } else if let Ok(content) = std::fs::read_to_string(&models_path) {
        content.trim().is_empty() || content.trim() == "{}"
    } else {
        true
    };

    if needs_placeholder {
        let placeholder_models = r#"providers:
  default:
    name: Placeholder
    api: openai-completions
    baseUrl: https://api.openai.com/v1
    apiKey: placeholder-key
    models:
    - id: gpt-4o
      name: GPT-4o (Placeholder)
      contextWindow: 128000
      reasoning: false
"#;
        let _ = std::fs::write(&models_path, placeholder_models);
    }
}

/// Read ~/.omp/agent/models.yml and return as JSON string
#[tauri::command]
fn load_models_config() -> Result<String, String> {
    let path = get_models_config_path()?;
    if !path.exists() {
        return Ok("{}".to_string());
    }
    let content =
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read models.yml: {e}"))?;
    let val: serde_yaml::Value =
        serde_yaml::from_str(&content).map_err(|e| format!("Invalid YAML format: {e}"))?;
    serde_json::to_string(&val).map_err(|e| format!("Failed to convert YAML to JSON: {e}"))
}

/// Save raw YAML or JSON string back to ~/.omp/agent/models.yml safely
#[tauri::command]
fn save_models_config(json: String) -> Result<(), String> {
    let path = get_models_config_path()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create config dir: {e}"))?;
    }
    let val: serde_yaml::Value =
        serde_json::from_str(&json).map_err(|e| format!("Invalid JSON received: {e}"))?;
    let yaml_str =
        serde_yaml::to_string(&val).map_err(|e| format!("Failed to serialize to YAML: {e}"))?;

    // Backup existing file if present
    if path.exists() {
        let mut bak_path = path.clone();
        bak_path.set_extension("yml.bak");
        let _ = std::fs::copy(&path, &bak_path);
    }

    std::fs::write(&path, yaml_str).map_err(|e| format!("Failed to write models.yml: {e}"))?;
    Ok(())
}

/// Run the Tauri application. Panics if the runtime fails to initialise.
///
/// # Panics
#[tauri::command]
fn list_history_sessions() -> Vec<history::SessionSummary> {
    history::list_sessions()
}

#[tauri::command]
fn delete_history_session(path: String) -> Result<(), String> {
    history::delete_session(&path)
}

#[tauri::command]
fn toggle_archive_history_session(path: String) -> Result<String, String> {
    history::toggle_archive_session(&path)
}
#[tauri::command]
fn get_session_history_messages(path: String) -> Vec<history::HistoryMessage> {
    history::read_session_messages(&path)
}

#[tauri::command]
fn list_mcp_servers() -> Result<Vec<mcp_skill::McpServerItem>, String> {
    mcp_skill::list_mcp_servers()
}

#[tauri::command]
fn toggle_mcp_server(name: String, enabled: bool) -> Result<(), String> {
    mcp_skill::toggle_mcp_server(&name, enabled)
}

#[tauri::command]
fn list_skills() -> Result<(bool, Vec<mcp_skill::SkillItem>), String> {
    mcp_skill::list_skills()
}

#[tauri::command]
fn toggle_skill(name: String, enabled: bool) -> Result<(), String> {
    mcp_skill::toggle_skill(&name, enabled)
}

#[tauri::command]
fn set_skills_master_enabled(enabled: bool) -> Result<(), String> {
    mcp_skill::set_skills_master_enabled(enabled)
}

#[tauri::command]
fn get_system_prompt() -> Result<String, String> {
    mcp_skill::get_system_prompt()
}

#[tauri::command]
fn save_system_prompt(content: String) -> Result<(), String> {
    mcp_skill::save_system_prompt(&content)
}
#[tauri::command]
fn get_system_md() -> Result<String, String> {
    mcp_skill::get_system_md()
}

#[tauri::command]
fn save_system_md(content: String) -> Result<(), String> {
    mcp_skill::save_system_md(&content)
}

#[cfg(target_os = "windows")]
fn hide_windows_input_experience_window() {
    use std::ffi::c_void;
    type HWND = *mut c_void;
    type HRGN = *mut c_void;
    type BOOL = i32;
    type LPARAM = isize;

    extern "system" {
        fn EnumWindows(
            lpEnumFunc: unsafe extern "system" fn(HWND, LPARAM) -> BOOL,
            lParam: LPARAM,
        ) -> BOOL;
        fn GetClassNameW(hWnd: HWND, lpClassName: *mut u16, nMaxCount: i32) -> i32;
        fn GetWindowTextW(hWnd: HWND, lpString: *mut u16, nMaxCount: i32) -> i32;
        fn GetWindowLongW(hWnd: HWND, nIndex: i32) -> i32;
        fn SetWindowLongW(hWnd: HWND, nIndex: i32, dwNewLong: i32) -> i32;
        fn SetLayeredWindowAttributes(hWnd: HWND, crKey: u32, bAlpha: u8, dwFlags: u32) -> BOOL;
        fn SetWindowPos(
            hWnd: HWND,
            hWndInsertAfter: HWND,
            X: i32,
            Y: i32,
            cx: i32,
            cy: i32,
            uFlags: u32,
        ) -> BOOL;
        fn CreateRectRgn(x1: i32, y1: i32, x2: i32, y2: i32) -> HRGN;
        fn SetWindowRgn(hWnd: HWND, hRgn: HRGN, bRedraw: BOOL) -> i32;
        fn ShowWindow(hWnd: HWND, nCmdShow: i32) -> BOOL;
    }

    unsafe extern "system" fn enum_proc(hwnd: HWND, _lparam: LPARAM) -> BOOL {
        let mut cls_buf = [0u16; 256];
        let len = GetClassNameW(hwnd, cls_buf.as_mut_ptr(), 256);
        if len > 0 {
            let cls = String::from_utf16_lossy(&cls_buf[..len as usize]);
            if cls == "Windows.UI.Core.CoreWindow" {
                let mut title_buf = [0u16; 256];
                let tlen = GetWindowTextW(hwnd, title_buf.as_mut_ptr(), 256);
                let title = if tlen > 0 {
                    String::from_utf16_lossy(&title_buf[..tlen as usize])
                } else {
                    String::new()
                };
                let low = title.to_lowercase();
                if title.contains("输入")
                    || low.contains("experience")
                    || low.contains("dictation")
                    || low.contains("input")
                {
                    // 1. 终极一击：ShowWindow(SW_HIDE = 0) 直接从桌面视窗渲染管线中剔除
                    ShowWindow(hwnd, 0);

                    // 2. 几何裁剪区域置空 (SetWindowRgn 0x0)
                    let empty_rgn = CreateRectRgn(0, 0, 0, 0);
                    let _ = SetWindowRgn(hwnd, empty_rgn, 1);

                    // 3. 分层透明 + 点击穿透 (WS_EX_LAYERED + WS_EX_TRANSPARENT + Alpha=0)
                    const GWL_EXSTYLE: i32 = -20;
                    const WS_EX_LAYERED: i32 = 0x0008_0000;
                    const WS_EX_TRANSPARENT: i32 = 0x0000_0020;
                    const LWA_ALPHA: u32 = 0x2;
                    let style = GetWindowLongW(hwnd, GWL_EXSTYLE);
                    let _ = SetWindowLongW(
                        hwnd,
                        GWL_EXSTYLE,
                        style | WS_EX_LAYERED | WS_EX_TRANSPARENT,
                    );
                    let _ = SetLayeredWindowAttributes(hwnd, 0, 0, LWA_ALPHA);

                    // 4. 物理坐标移出屏幕 (-10000, -10000)
                    const FLAGS: u32 = 0x0001 | 0x0004 | 0x0010;
                    let _ = SetWindowPos(hwnd, std::ptr::null_mut(), -10000, -10000, 0, 0, FLAGS);
                }
            }
        }
        1
    }

    unsafe {
        EnumWindows(enum_proc, 0);
    }
}

/// Trigger Windows native Speech-to-Text dictation overlay (Win + H) and move the overlay offscreen
#[tauri::command]
fn trigger_windows_dictation() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        extern "system" {
            fn keybd_event(b_vk: u8, b_scan: u8, dw_flags: u32, dw_extra_info: usize);
        }
        unsafe {
            // VK_LWIN = 0x5B, VK_H = 0x48, KEYEVENTF_KEYUP = 0x0002
            keybd_event(0x5B, 0, 0, 0);
            keybd_event(0x48, 0, 0, 0);
            keybd_event(0x48, 0, 2, 0);
            keybd_event(0x5B, 0, 2, 0);
        }

        // Spawn a daemon thread to silently relocate TextInputHost CoreWindow offscreen
        std::thread::spawn(|| {
            for _ in 0..30 {
                std::thread::sleep(std::time::Duration::from_millis(80));
                hide_windows_input_experience_window();
            }
        });
    }
    Ok(())
}

/// Stop Windows native dictation (send ESC to cancel dictation)
#[tauri::command]
fn stop_windows_dictation() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        extern "system" {
            fn keybd_event(b_vk: u8, b_scan: u8, dw_flags: u32, dw_extra_info: usize);
        }
        unsafe {
            // Send Escape key (VK_ESCAPE = 0x1B) to cancel dictation
            keybd_event(0x1B, 0, 0, 0);
            keybd_event(0x1B, 0, 2, 0);
        }
    }
    Ok(())
}
#[tauri::command]
fn get_hardware_power_metrics(state: State<'_, PowerState>) -> HardwarePowerMetrics {
    state.read_metrics()
}

///
/// Panics if `tauri::Builder::run` returns an error (e.g. the webview
/// runtime cannot be initialised). This is a fatal startup condition;
/// there is no meaningful recovery from inside `main`.
pub fn run() {
    #[cfg(target_os = "windows")]
    {
        if std::env::var_os("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").is_none() {
            std::env::set_var(
                "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
                "--autoplay-policy=no-user-gesture-required --enable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling,HighPriorityBackgroundThrottling",
            );
        }
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AgentBridge::new())
        .manage(GitWatcherState::new())
        .manage(SenseVoiceState::new())
        .manage(PowerState::new())
        .invoke_handler(tauri::generate_handler![
            send_command,
            start_session,
            stop_session,
            session_status,
            open_project,
            start_git_watch,
            stop_git_watch,
            open_url_external,
            load_models_config,
            save_models_config,
            list_history_sessions,
            delete_history_session,
            toggle_archive_history_session,
            get_session_history_messages,
            list_mcp_servers,
            toggle_mcp_server,
            list_skills,
            toggle_skill,
            set_skills_master_enabled,
            get_system_prompt,
            save_system_prompt,
            get_system_md,
            save_system_md,
            trigger_windows_dictation,
            stop_windows_dictation,
            sensevoice_speech::transcribe_sensevoice,
            get_hardware_power_metrics,
        ])
        .setup(|app| {
            ensure_omp_onboarding_seeded();
            // Devtools can still be opened manually or enabled if needed
            // The frontend activates this session on load via OMP_BRIDGE.activateSession("default").
            //
            // Failure handling: the bridge caches the spawn error keyed
            // by session_id. The frontend's activateSession queries
            // session_status on attach and surfaces the cached reason
            // if any — no event timing race, no delayed emit thread.
            let bridge = app.state::<AgentBridge>();
            if let Err(e) = bridge.start_session("default".into(), None, None, app.handle().clone())
            {
                eprintln!("[omp-desktop] failed to start default session: {e}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
