use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

fn get_home_dir() -> Result<PathBuf, String> {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map(PathBuf::from)
        .map_err(|_| "Could not determine user home directory".to_string())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct McpServerItem {
    pub name: String,
    pub enabled: bool,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
    pub source: String, // "omp" | "codex"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillItem {
    pub name: String,
    pub enabled: bool,
    pub description: String,
    pub path: String,
    pub source: String,
}


// ── MCP Config Handling ──────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Default)]
struct OmpMcpJson {
    #[serde(default, rename = "$schema")]
    pub schema: Option<String>,
    #[serde(default, rename = "mcpServers")]
    pub mcp_servers: HashMap<String, serde_json::Value>,
    #[serde(default, rename = "disabledServers")]
    pub disabled_servers: Option<Vec<String>>,
    #[serde(default, rename = "enabledServers")]
    pub enabled_servers: Option<Vec<String>>,
}

fn get_omp_mcp_path() -> Result<PathBuf, String> {
    let mut p = get_home_dir()?;
    p.push(".omp");
    p.push("agent");
    p.push("mcp.json");
    Ok(p)
}

fn get_codex_config_path() -> Result<PathBuf, String> {
    let mut p = get_home_dir()?;
    p.push(".codex");
    p.push("config.toml");
    Ok(p)
}

fn get_omp_config_path() -> Result<PathBuf, String> {
    let mut p = get_home_dir()?;
    p.push(".omp");
    p.push("agent");
    p.push("config.yml");
    Ok(p)
}

fn get_agents_md_path() -> Result<PathBuf, String> {
    let mut p = get_home_dir()?;
    p.push(".codex");
    p.push("AGENTS.md");
    Ok(p)
}

pub fn list_mcp_servers() -> Result<Vec<McpServerItem>, String> {
    let mut items = Vec::new();
    let mut disabled_set = std::collections::HashSet::new();

    // 1. Read omp mcp.json
    let omp_path = get_omp_mcp_path()?;
    let mut omp_mcp = OmpMcpJson::default();
    if omp_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&omp_path) {
            if let Ok(parsed) = serde_json::from_str::<OmpMcpJson>(&content) {
                omp_mcp = parsed;
            }
        }
    }
    if let Some(dis) = &omp_mcp.disabled_servers {
        for s in dis {
            disabled_set.insert(s.clone());
        }
    }

    for (name, val) in omp_mcp.mcp_servers {
        let is_disabled = disabled_set.contains(&name);
        let enabled = if is_disabled {
            false
        } else {
            val.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true)
        };
        let command = val.get("command").and_then(|v| v.as_str()).map(String::from);
        let args = val.get("args").and_then(|v| v.as_array()).map(|arr| {
            arr.iter()
                .filter_map(|x| x.as_str().map(String::from))
                .collect()
        });
        items.push(McpServerItem {
            name,
            enabled,
            command,
            args,
            env: None,
            source: "omp".to_string(),
        });
    }

    // 2. Read codex config.toml (if any exist not already in items)
    let codex_path = get_codex_config_path()?;
    if codex_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&codex_path) {
            // Simple parsing for [mcp_servers.<name>] blocks
            let mut current_section = String::new();
            let mut current_cmd: Option<String> = None;
            let mut current_args: Option<Vec<String>> = None;
            let mut current_enabled = true;

            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("[mcp_servers.") && trimmed.ends_with(']') {
                    // Flush previous section
                    if !current_section.is_empty() {
                        let name = current_section.clone();
                        if !items.iter().any(|it| it.name == name) {
                            let is_dis = disabled_set.contains(&name);
                            items.push(McpServerItem {
                                name,
                                enabled: if is_dis { false } else { current_enabled },
                                command: current_cmd.take(),
                                args: current_args.take(),
                                env: None,
                                source: "codex".to_string(),
                            });
                        }
                    }
                    let section = &trimmed[13..trimmed.len() - 1];
                    // Skip nested like .env
                    if !section.contains('.') {
                        current_section = section.to_string();
                        current_cmd = None;
                        current_args = None;
                        current_enabled = true;
                    } else {
                        current_section.clear();
                    }
                } else if !current_section.is_empty() {
                    if trimmed.starts_with("command") {
                        if let Some((_, val)) = trimmed.split_once('=') {
                            current_cmd = Some(val.trim().trim_matches('"').trim_matches('\'').to_string());
                        }
                    } else if trimmed.starts_with("enabled") {
                        if let Some((_, val)) = trimmed.split_once('=') {
                            current_enabled = val.trim().parse::<bool>().unwrap_or(true);
                        }
                    } else if trimmed.starts_with("args") {
                        if let Some((_, val)) = trimmed.split_once('=') {
                            if let Ok(parsed_args) = serde_json::from_str::<Vec<String>>(val.trim()) {
                                current_args = Some(parsed_args);
                            }
                        }
                    }
                }
            }
            if !current_section.is_empty() {
                let name = current_section.clone();
                if !items.iter().any(|it| it.name == name) {
                    let is_dis = disabled_set.contains(&name);
                    items.push(McpServerItem {
                        name,
                        enabled: if is_dis { false } else { current_enabled },
                        command: current_cmd,
                        args: current_args,
                        env: None,
                        source: "codex".to_string(),
                    });
                }
            }
        }
    }

    Ok(items)
}

pub fn toggle_mcp_server(name: &str, enable: bool) -> Result<(), String> {
    let omp_path = get_omp_mcp_path()?;
    if let Some(parent) = omp_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let mut omp_mcp = OmpMcpJson::default();
    if omp_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&omp_path) {
            if let Ok(parsed) = serde_json::from_str::<OmpMcpJson>(&content) {
                omp_mcp = parsed;
            }
        }
    }

    let mut dis_set: std::collections::BTreeSet<String> = omp_mcp
        .disabled_servers
        .unwrap_or_default()
        .into_iter()
        .collect();

    if enable {
        dis_set.remove(name);
    } else {
        dis_set.insert(name.to_string());
    }

    omp_mcp.disabled_servers = if dis_set.is_empty() {
        None
    } else {
        Some(dis_set.into_iter().collect())
    };

    let json_str = serde_json::to_string_pretty(&omp_mcp).map_err(|e| e.to_string())?;
    std::fs::write(&omp_path, json_str).map_err(|e| e.to_string())?;
    Ok(())
}

// ── Skills Config Handling ───────────────────────────────────────────────────

pub fn list_skills() -> Result<(bool, Vec<SkillItem>), String> {
    let config_path = get_omp_config_path()?;
    let mut skills_master_enabled = true;
    let mut ignored_skills = std::collections::HashSet::new();

    if config_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&config_path) {
            if let Ok(val) = serde_yaml::from_str::<serde_yaml::Value>(&content) {
                if let Some(skills_val) = val.get("skills") {
                    if let Some(en) = skills_val.get("enabled").and_then(|v| v.as_bool()) {
                        skills_master_enabled = en;
                    }
                    if let Some(arr) = skills_val.get("ignoredSkills").and_then(|v| v.as_sequence()) {
                        for item in arr {
                            if let Some(s) = item.as_str() {
                                ignored_skills.insert(s.to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    let mut items = Vec::new();
    let mut scan_dirs = Vec::new();

    let mut codex_skills = get_home_dir()?;
    codex_skills.push(".codex");
    codex_skills.push("skills");
    if codex_skills.exists() {
        scan_dirs.push((codex_skills, "codex"));
    }

    let mut omp_skills = get_home_dir()?;
    omp_skills.push(".omp");
    omp_skills.push("agent");
    omp_skills.push("skills");
    if omp_skills.exists() {
        scan_dirs.push((omp_skills, "omp"));
    }

    for (dir, source) in scan_dirs {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_dir() {
                    let name = p.file_name().unwrap_or_default().to_string_lossy().to_string();
                    if name.starts_with('.') {
                        continue;
                    }
                    let skill_md = p.join("SKILL.md");
                    let mut desc = String::new();
                    if skill_md.exists() {
                        if let Ok(txt) = std::fs::read_to_string(&skill_md) {
                            for line in txt.lines().take(20) {
                                let tr = line.trim();
                                if let Some(stripped) = tr.strip_prefix("description:") {
                                    desc = stripped.trim().to_string();
                                    break;
                                } else if let Some(stripped) = tr.strip_prefix("Description:") {
                                    desc = stripped.trim().to_string();
                                    break;
                                }
                            }
                        }
                    }
                    let enabled = skills_master_enabled && !ignored_skills.contains(&name);
                    items.push(SkillItem {
                        name,
                        enabled,
                        description: desc,
                        path: p.to_string_lossy().to_string(),
                        source: source.to_string(),
                    });
                }
            }
        }
    }

    items.sort_by(|a, b| a.name.cmp(&b.name));
    Ok((skills_master_enabled, items))
}

pub fn toggle_skill(name: &str, enable: bool) -> Result<(), String> {
    let config_path = get_omp_config_path()?;
    if let Some(parent) = config_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let mut val: serde_yaml::Value = if config_path.exists() {
        let c = std::fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        serde_yaml::from_str(&c).unwrap_or(serde_yaml::Value::Mapping(serde_yaml::Mapping::new()))
    } else {
        serde_yaml::Value::Mapping(serde_yaml::Mapping::new())
    };

    let mapping = val.as_mapping_mut().ok_or("Config is not a YAML object")?;
    let skills_key = serde_yaml::Value::String("skills".to_string());
    if !mapping.contains_key(&skills_key) {
        mapping.insert(skills_key.clone(), serde_yaml::Value::Mapping(serde_yaml::Mapping::new()));
    }
    let skills_map = mapping
        .get_mut(&skills_key)
        .and_then(|v| v.as_mapping_mut())
        .ok_or("skills field is not a YAML object")?;

    let ignored_key = serde_yaml::Value::String("ignoredSkills".to_string());
    let mut ignored_list = Vec::new();
    if let Some(arr) = skills_map.get(&ignored_key).and_then(|v| v.as_sequence()) {
        for it in arr {
            if let Some(s) = it.as_str() {
                if s != name {
                    ignored_list.push(s.to_string());
                }
            }
        }
    }
    if !enable {
        ignored_list.push(name.to_string());
    }
    ignored_list.sort();
    ignored_list.dedup();

    skills_map.insert(
        ignored_key,
        serde_yaml::Value::Sequence(
            ignored_list
                .into_iter()
                .map(serde_yaml::Value::String)
                .collect(),
        ),
    );

    let yaml_out = serde_yaml::to_string(&val).map_err(|e| e.to_string())?;
    std::fs::write(&config_path, yaml_out).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn set_skills_master_enabled(enabled: bool) -> Result<(), String> {
    let config_path = get_omp_config_path()?;
    if let Some(parent) = config_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let mut val: serde_yaml::Value = if config_path.exists() {
        let c = std::fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        serde_yaml::from_str(&c).unwrap_or(serde_yaml::Value::Mapping(serde_yaml::Mapping::new()))
    } else {
        serde_yaml::Value::Mapping(serde_yaml::Mapping::new())
    };

    let mapping = val.as_mapping_mut().ok_or("Config is not a YAML object")?;
    let skills_key = serde_yaml::Value::String("skills".to_string());
    if !mapping.contains_key(&skills_key) {
        mapping.insert(skills_key.clone(), serde_yaml::Value::Mapping(serde_yaml::Mapping::new()));
    }
    let skills_map = mapping
        .get_mut(&skills_key)
        .and_then(|v| v.as_mapping_mut())
        .ok_or("skills field is not a YAML object")?;

    let enabled_key = serde_yaml::Value::String("enabled".to_string());
    skills_map.insert(enabled_key, serde_yaml::Value::Bool(enabled));

    let yaml_out = serde_yaml::to_string(&val).map_err(|e| e.to_string())?;
    std::fs::write(&config_path, yaml_out).map_err(|e| e.to_string())?;
    Ok(())
}

// ── Global & Independent Prompt Handling ─────────────────────────────────────

pub fn get_system_prompt() -> Result<String, String> {
    let p = get_agents_md_path()?;
    if p.exists() {
        std::fs::read_to_string(&p).map_err(|e| e.to_string())
    } else {
        Ok(String::new())
    }
}

pub fn save_system_prompt(content: &str) -> Result<(), String> {
    let p = get_agents_md_path()?;
    if let Some(parent) = p.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&p, content).map_err(|e| e.to_string())
}
