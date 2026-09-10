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
use agent::AgentBridge;
use git_watcher::GitWatcherState;
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
    bridge.start_session(
        session_id,
        cwd_opt.as_deref(),
        resume_path.as_deref(),
        app,
    )
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

/// Read ~/.omp/agent/models.yml and return as JSON string
#[tauri::command]
fn load_models_config() -> Result<String, String> {
    let path = get_models_config_path()?;
    if !path.exists() {
        return Ok("{}".to_string());
    }
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read models.yml: {e}"))?;
    let val: serde_yaml::Value = serde_yaml::from_str(&content)
        .map_err(|e| format!("Invalid YAML format: {e}"))?;
    serde_json::to_string(&val)
        .map_err(|e| format!("Failed to convert YAML to JSON: {e}"))
}

/// Save raw YAML or JSON string back to ~/.omp/agent/models.yml safely
#[tauri::command]
fn save_models_config(json: String) -> Result<(), String> {
    let path = get_models_config_path()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config dir: {e}"))?;
    }
    let val: serde_yaml::Value = serde_json::from_str(&json)
        .map_err(|e| format!("Invalid JSON received: {e}"))?;
    let yaml_str = serde_yaml::to_string(&val)
        .map_err(|e| format!("Failed to serialize to YAML: {e}"))?;

    // Backup existing file if present
    if path.exists() {
        let mut bak_path = path.clone();
        bak_path.set_extension("yml.bak");
        let _ = std::fs::copy(&path, &bak_path);
    }

    std::fs::write(&path, yaml_str)
        .map_err(|e| format!("Failed to write models.yml: {e}"))?;
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


///
/// Panics if `tauri::Builder::run` returns an error (e.g. the webview
/// runtime cannot be initialised). This is a fatal startup condition;
/// there is no meaningful recovery from inside `main`.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AgentBridge::new())
        .manage(GitWatcherState::new())
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
        ])
        .setup(|app| {
            // Devtools can still be opened manually or enabled if needed
            // The frontend activates this session on load via OMP_BRIDGE.activateSession("default").
            //
            // Failure handling: the bridge caches the spawn error keyed
            // by session_id. The frontend's activateSession queries
            // session_status on attach and surfaces the cached reason
            // if any — no event timing race, no delayed emit thread.
            let bridge = app.state::<AgentBridge>();
            if let Err(e) = bridge.start_session("default".into(), None, None, app.handle().clone()) {
                eprintln!("[omp-desktop] failed to start default session: {e}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
