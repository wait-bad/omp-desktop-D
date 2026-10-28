use std::path::PathBuf;
use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Default)]
pub struct SenseVoiceState {
    is_busy: Arc<Mutex<bool>>,
}

impl SenseVoiceState {
    pub fn new() -> Self {
        Self {
            is_busy: Arc::new(Mutex::new(false)),
        }
    }
}

fn collect_search_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();

    if let Ok(cwd) = std::env::current_dir() {
        roots.push(cwd.clone());
        if let Some(parent) = cwd.parent() {
            roots.push(parent.to_path_buf());
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        let mut curr = exe.parent();
        let mut depth = 0;
        while let Some(dir) = curr {
            roots.push(dir.to_path_buf());
            curr = dir.parent();
            depth += 1;
            if depth >= 5 {
                break;
            }
        }
    }

    if let Ok(home) = std::env::var("USERPROFILE") {
        let p = PathBuf::from(&home).join("Desktop").join("test—agent");
        if p.exists() {
            roots.push(p);
        }
    }

    roots
}

fn find_sensevoice_cli() -> Option<PathBuf> {
    let subpaths = [
        "bin/sensevoice/sherpa-onnx-offline.exe",
        "sensevoice/sherpa-onnx-offline.exe",
        "sherpa-onnx-offline.exe",
    ];

    for root in collect_search_roots() {
        for sub in &subpaths {
            let candidate = root.join(sub);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

fn find_sensevoice_model() -> Option<(PathBuf, PathBuf)> {
    let subpaths = [
        (
            "sensevoice_model/model.int8.onnx",
            "sensevoice_model/tokens.txt",
        ),
        ("model.int8.onnx", "tokens.txt"),
    ];

    for root in collect_search_roots() {
        for (m, t) in &subpaths {
            let m_path = root.join(m);
            let t_path = root.join(t);
            if m_path.is_file() && t_path.is_file() {
                return Some((m_path, t_path));
            }
        }
    }
    None
}

/// Transcribe audio from Base64 WAV data using SenseVoice-Small int8
#[tauri::command]
pub async fn transcribe_sensevoice(
    app: AppHandle,
    state: State<'_, SenseVoiceState>,
    wav_base64: String,
) -> Result<String, String> {
    let busy_lock = state.is_busy.clone();
    {
        let mut busy = busy_lock.lock().map_err(|e| e.to_string())?;
        if *busy {
            return Err("SenseVoice 引擎正在推理上一段语音，请稍候...".to_string());
        }
        *busy = true;
    }

    let _guard = defer::Defer::new(move || {
        if let Ok(mut busy) = busy_lock.lock() {
            *busy = false;
        }
    });

    let cli_path = find_sensevoice_cli().ok_or_else(|| {
        "未找到 SenseVoice 执行引擎 (sherpa-onnx-offline.exe)，请检查 bin/sensevoice 目录"
            .to_string()
    })?;

    let (model_path, tokens_path) = find_sensevoice_model().ok_or_else(|| {
        "未找到 SenseVoice 深度学习模型或 tokens.txt，请检查 sensevoice_model 目录".to_string()
    })?;

    let audio_bytes =
        decode_base64(&wav_base64).map_err(|e| format!("Base64 音频解码失败: {e}"))?;

    if audio_bytes.len() < 44 {
        return Err("音频过短，无效的 WAV 格式".to_string());
    }

    let temp_wav = std::env::temp_dir().join(format!("omp-sensevoice-{}.wav", std::process::id()));
    std::fs::write(&temp_wav, &audio_bytes).map_err(|e| format!("写入临时音频文件失败: {e}"))?;

    let _clean_temp = defer::Defer::new({
        let p = temp_wav.clone();
        move || {
            let _ = std::fs::remove_file(p);
        }
    });

    let _ = app.emit("sensevoice://status", "SenseVoice 阿里工业级模型推理中...");

    let mut cmd = Command::new(&cli_path);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    if let Some(parent_dir) = cli_path.parent() {
        cmd.current_dir(parent_dir);
    }

    cmd.arg(format!("--sense-voice-model={}", model_path.display()))
        .arg(format!("--tokens={}", tokens_path.display()))
        .arg("--sense-voice-language=auto")
        .arg("--num-threads=4")
        .arg(&temp_wav);

    let output = cmd
        .output()
        .map_err(|e| format!("启动 SenseVoice 引擎失败: {e}"))?;

    if !output.status.success() {
        let err_str = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "SenseVoice 推理失败 (exit {:?}): {}",
            output.status.code(),
            err_str
        ));
    }

    let stdout_text = String::from_utf8_lossy(&output.stdout);

    // Parse JSON result line: {"lang": "<|zh|>", ..., "text": "..."}
    let mut recognized_text = String::new();
    for line in stdout_text.lines() {
        let t = line.trim();
        if t.starts_with('{') && t.ends_with('}') {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(t) {
                if let Some(txt) = v.get("text").and_then(|s| s.as_str()) {
                    let clean = txt
                        .replace("<|Speech|>", "")
                        .replace("<|Applause|>", "")
                        .replace("<|Laughter|>", "")
                        .replace("<|Music|>", "")
                        .replace("<|Cry|>", "")
                        .replace("<|Sneeze|>", "")
                        .replace("<|Breath|>", "")
                        .replace("<|Cough|>", "")
                        .replace("<|EMO_UNKNOWN|>", "")
                        .replace("<|HAPPY|>", "")
                        .replace("<|SAD|>", "")
                        .replace("<|ANGRY|>", "")
                        .replace("<|NEUTRAL|>", "")
                        .replace("<|FEARFUL|>", "")
                        .replace("<|DISGUSTED|>", "")
                        .replace("<|SURPRISED|>", "")
                        .trim()
                        .to_string();
                    if !clean.is_empty() {
                        recognized_text = clean;
                        break;
                    }
                }
            }
        }
    }

    Ok(recognized_text)
}

fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    const B64_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut table = [0xFFu8; 256];
    for (i, &c) in B64_CHARS.iter().enumerate() {
        table[c as usize] = i as u8;
    }

    let clean: Vec<u8> = input
        .bytes()
        .filter(|&b| b != b'\r' && b != b'\n' && b != b' ')
        .collect();

    let mut out = Vec::with_capacity(clean.len() * 3 / 4);
    let mut buf = 0u32;
    let mut bits = 0;

    for &b in &clean {
        if b == b'=' {
            break;
        }
        let val = table[b as usize];
        if val == 0xFF {
            return Err("Invalid base64 character".to_string());
        }
        buf = (buf << 6) | (val as u32);
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
            buf &= (1 << bits) - 1;
        }
    }

    Ok(out)
}

mod defer {
    pub struct Defer<F: FnOnce()>(Option<F>);
    impl<F: FnOnce()> Defer<F> {
        pub fn new(f: F) -> Self {
            Self(Some(f))
        }
    }
    impl<F: FnOnce()> Drop for Defer<F> {
        fn drop(&mut self) {
            if let Some(f) = self.0.take() {
                f();
            }
        }
    }
}
