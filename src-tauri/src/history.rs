//! Historical session management: list, delete, archive, unarchive.
//!
//! Scans `~/.omp/agent/sessions/` (or current project session dir) and extracts
//! session metadata (title from the first user prompt or title record, mtime, size, archive status).

use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionSummary {
    pub id: String,
    pub path: String,
    pub filename: String,
    pub folder: String,
    pub title: String,
    pub is_archived: bool,
    pub mtime: u64,
    pub size: u64,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryBlock {
    #[serde(rename = "type")]
    pub block_type: String,
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryMessage {
    pub kind: String,
    pub time: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thought: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lead: Option<String>,
    #[serde(default)]
    pub blocks: Vec<HistoryBlock>,
    pub streaming: bool,
}


fn get_sessions_root() -> Option<PathBuf> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .ok()?;
    let mut path = PathBuf::from(home);
    path.push(".omp");
    path.push("agent");
    path.push("sessions");
    if path.exists() {
        Some(path)
    } else {
        None
    }
}

/// Extract title directly from first message/user prompt without LLM summary.
fn extract_session_info(path: &Path) -> (String, bool) {
    let filename = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
    let is_archived = filename.contains(".archived") || path.to_string_lossy().contains("archived");

    let file = match fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return (String::new(), is_archived),
    };

    let reader = BufReader::new(file);
    let mut title = String::new();
    let mut first_user_prompt = String::new();

    for line in reader.lines().take(60) {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };
        if line.trim().is_empty() {
            continue;
        }

        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
            let msg_type = val.get("type").and_then(|v| v.as_str()).unwrap_or("");
            if (msg_type == "title" || msg_type == "title_change") && title.is_empty() {
                if let Some(t) = val.get("title").and_then(|v| v.as_str()) {
                    if !t.trim().is_empty() {
                        title = t.trim().to_string();
                    }
                }
            } else if msg_type == "message" && first_user_prompt.is_empty() {
                // Check if role is user
                let is_user = val.get("role").and_then(|v| v.as_str()) == Some("user")
                    || val
                        .get("message")
                        .and_then(|m| m.get("role"))
                        .and_then(|v| v.as_str())
                        == Some("user");

                if is_user {
                    if let Some(msg_obj) = val.get("message") {
                        if let Some(content) = msg_obj.get("content") {
                            if let Some(arr) = content.as_array() {
                                for block in arr {
                                    if block.get("type").and_then(|v| v.as_str()) == Some("text") {
                                        if let Some(txt) = block.get("text").and_then(|v| v.as_str()) {
                                            first_user_prompt = txt.trim().chars().take(80).collect();
                                            break;
                                        }
                                    }
                                }
                            } else if let Some(txt) = content.as_str() {
                                first_user_prompt = txt.trim().chars().take(80).collect();
                            }
                        }
                    } else if let Some(content) = val.get("content").and_then(|v| v.as_str()) {
                        first_user_prompt = content.trim().chars().take(80).collect();
                    }
                }
            }
        }

        if !first_user_prompt.is_empty() {
            break;
        }
    }

    // User rule: directly use first question as title, or fallback to record title
    let final_title = if !first_user_prompt.is_empty() {
        first_user_prompt
    } else if !title.is_empty() {
        title
    } else {
        path.file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Untitled Session")
            .to_string()
    };

    (final_title, is_archived)
}

fn scan_dir_recursive(dir: &Path, list: &mut Vec<SessionSummary>) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let p = entry.path();
        if p.is_dir() {
            scan_dir_recursive(&p, list);
        } else if p.extension().and_then(|s| s.to_str()) == Some("jsonl") {
            let metadata = match entry.metadata() {
                Ok(m) => m,
                Err(_) => continue,
            };

            let mtime = metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);

            let filename = p.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
            let name_parts: Vec<&str> = filename.split('_').collect();
            let session_id = if name_parts.len() > 1 {
                name_parts[1].trim_end_matches(".jsonl").to_string()
            } else {
                p.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string()
            };

            let folder = p
                .parent()
                .and_then(|p| p.file_name())
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();

            let (title, is_archived) = extract_session_info(&p);

            list.push(SessionSummary {
                id: session_id,
                path: p.to_string_lossy().to_string(),
                filename,
                folder,
                title,
                is_archived,
                mtime,
                size: metadata.len(),
            });
        }
    }
}

pub fn list_sessions() -> Vec<SessionSummary> {
    let mut list = Vec::new();
    if let Some(root) = get_sessions_root() {
        scan_dir_recursive(&root, &mut list);
    }
    list.sort_by(|a, b| b.mtime.cmp(&a.mtime));
    list
}

pub fn delete_session(path_str: &str) -> Result<(), String> {
    let p = PathBuf::from(path_str);
    if !p.exists() {
        return Err("Session file does not exist".to_string());
    }
    fs::remove_file(&p).map_err(|e| format!("Failed to delete session file: {e}"))
}

pub fn toggle_archive_session(path_str: &str) -> Result<String, String> {
    let p = PathBuf::from(path_str);
    if !p.exists() {
        return Err("Session file does not exist".to_string());
    }

    let parent = p.parent().ok_or_else(|| "Invalid parent path".to_string())?;
    let file_name = p.file_name().and_then(|n| n.to_str()).ok_or_else(|| "Invalid filename".to_string())?;

    let new_path = if file_name.contains(".archived.") {
        let restored_name = file_name.replace(".archived.", ".");
        parent.join(restored_name)
    } else {
        let archived_name = file_name.replace(".jsonl", ".archived.jsonl");
        parent.join(archived_name)
    };

    fs::rename(&p, &new_path).map_err(|e| format!("Failed to toggle archive session file: {e}"))?;
    Ok(new_path.to_string_lossy().to_string())
}

pub fn read_session_messages(path_str: &str) -> Vec<HistoryMessage> {
    let p = PathBuf::from(path_str);
    if !p.exists() {
        return Vec::new();
    }

    let file = match fs::File::open(&p) {
        Ok(f) => f,
        Err(_) => return Vec::new(),
    };

    let reader = BufReader::new(file);
    let mut messages = Vec::new();

    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };
        if line.trim().is_empty() {
            continue;
        }

        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
            if val.get("type").and_then(|v| v.as_str()) != Some("message") {
                continue;
            }

            let msg_obj = val.get("message");
            let role = msg_obj
                .and_then(|m| m.get("role"))
                .and_then(|v| v.as_str())
                .or_else(|| val.get("role").and_then(|v| v.as_str()))
                .unwrap_or("");

            let content = msg_obj
                .and_then(|m| m.get("content"))
                .or_else(|| val.get("content"));

            let raw_ts = val
                .get("timestamp")
                .or_else(|| msg_obj.and_then(|m| m.get("timestamp")));

            let time_str = if let Some(ts) = raw_ts.and_then(|v| v.as_str()) {
                if let Some(pos) = ts.find('T') {
                    ts[pos + 1..].chars().take(5).collect()
                } else {
                    ts.to_string()
                }
            } else {
                String::new()
            };

            if role == "user" {
                let mut text = String::new();
                if let Some(arr) = content.and_then(|c| c.as_array()) {
                    for b in arr {
                        if b.get("type").and_then(|v| v.as_str()) == Some("text") {
                            if let Some(txt) = b.get("text").and_then(|v| v.as_str()) {
                                text.push_str(txt);
                                text.push('\n');
                            }
                        }
                    }
                } else if let Some(txt) = content.and_then(|c| c.as_str()) {
                    text.push_str(txt);
                }
                let text = text.trim().to_string();
                if !text.is_empty() {
                    messages.push(HistoryMessage {
                        kind: "user".to_string(),
                        time: time_str,
                        text: Some(text),
                        thought: None,
                        lead: None,
                        blocks: Vec::new(),
                        streaming: false,
                    });
                }
            } else if role == "assistant" {
                let mut thought = None;
                let mut blocks = Vec::new();

                if let Some(arr) = content.and_then(|c| c.as_array()) {
                    for b in arr {
                        let btype = b.get("type").and_then(|v| v.as_str()).unwrap_or("");
                        if btype == "thinking" {
                            if let Some(th) = b.get("thinking").and_then(|v| v.as_str()) {
                                if !th.trim().is_empty() {
                                    thought = Some(th.to_string());
                                }
                            }
                        } else if btype == "text" {
                            if let Some(txt) = b.get("text").and_then(|v| v.as_str()) {
                                if !txt.trim().is_empty() {
                                    blocks.push(HistoryBlock {
                                        block_type: "text".to_string(),
                                        text: txt.to_string(),
                                    });
                                }
                            }
                        }
                    }
                } else if let Some(txt) = content.and_then(|c| c.as_str()) {
                    if !txt.trim().is_empty() {
                        blocks.push(HistoryBlock {
                            block_type: "text".to_string(),
                            text: txt.to_string(),
                        });
                    }
                }

                if !blocks.is_empty() || thought.is_some() {
                    let lead = if thought.is_some() {
                        Some("thinking".to_string())
                    } else {
                        None
                    };
                    messages.push(HistoryMessage {
                        kind: "assistant".to_string(),
                        time: time_str,
                        text: None,
                        thought,
                        lead,
                        blocks,
                        streaming: false,
                    });
                }
            }
        }
    }

    messages
}
