/* ═════════════════════════════════════════════════════════════════════
   composer.jsx — input area + slash palette + ⌘K command bridge
   ═════════════════════════════════════════════════════════════════════ */



// ── The composer (input + plan/steer modes + send) ────────────────────
function Composer({ onSend, onPick, planMode, onTogglePlan, onOpenCmd, onOpenModel, currentModel, thinking, onCycleThinking, isStreaming, onAbort, onApprove, annotationCount = 0, microcopy }) {
  const [text, setText]               = React.useState("");
  const [activeIdx, setActiveIdx]     = React.useState(0);
  const [attachments, setAttachments] = React.useState([]);
  const [isDragging, setIsDragging]   = React.useState(false);
  const [isDictating, setIsDictating]   = React.useState(false);
  const [dictationTip, setDictationTip] = React.useState(null);
  const taRef            = React.useRef(null);
  const listRef          = React.useRef(null);
  const imgInputRef      = React.useRef(null);
  const recognitionRef   = React.useRef(null);
  const shouldDictateRef = React.useRef(false);
  const restartTimerRef  = React.useRef(null);
  // paste blocks: id → raw content; collapsed in textarea as [paste #N +K lines]
  const pasteBlocksRef   = React.useRef(new Map());
  const pasteCounterRef  = React.useRef(0);

  const cmds = window.OMP_DATA?.commands || [];

  // Derive slash state inline — no useEffect, no stale flicker
  const slashQ = text.startsWith("/") ? text.slice(1).split(" ")[0].toLowerCase() : null;
  const filtered = slashQ !== null
    ? cmds.filter(c => !slashQ || c.name.startsWith(slashQ) || c.name.includes(slashQ))
    : [];
  const showSlash = filtered.length > 0;

  // Keep activeIdx in bounds; auto-select when single result
  const clampedIdx = showSlash ? Math.min(activeIdx, filtered.length - 1) : 0;

  // Scroll active item into view
  React.useEffect(() => {
    if (!showSlash || !listRef.current) return;
    const el = listRef.current.children[clampedIdx];
    el?.scrollIntoView({ block: "nearest" });
  }, [clampedIdx, showSlash]);

  React.useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 320)}px`;
  }, [text]);

  // Restore focus when the agent finishes streaming and the textarea re-enables.
  React.useEffect(() => {
    if (!isStreaming) requestAnimationFrame(() => taRef.current?.focus());
  }, [isStreaming]);

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result;
        if (typeof url === "string") {
          const parts = url.split(";base64,");
          const mimeType = parts[0].replace("data:", "") || file.type || "image/png";
          const b64 = parts[1] || "";
          setAttachments(prev => [...prev, {
            name: file.name,
            mimeType,
            data: b64,
            url,
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const audioContextRef   = React.useRef(null);
  const audioStreamRef    = React.useRef(null);
  const audioProcessorRef = React.useRef(null);
  const audioSamplesRef   = React.useRef([]);

  // WAV 格式编码辅助函数 (16kHz 16-bit mono)
  const encodeWavBase64 = (samples, sampleRate) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };
    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const stopDictation = async () => {
    const wasDictating = shouldDictateRef.current || isDictating;
    shouldDictateRef.current = false;
    setIsDictating(false);

    // 停止麦克风音频流
    if (audioProcessorRef.current) {
      try { audioProcessorRef.current.disconnect(); } catch (_) {}
      audioProcessorRef.current = null;
    }
    if (audioStreamRef.current) {
      try { audioStreamRef.current.getTracks().forEach(t => t.stop()); } catch (_) {}
      audioStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (_) {}
      audioContextRef.current = null;
    }

    const recordedSamples = audioSamplesRef.current;
    audioSamplesRef.current = [];

    // 若录音样本足够（大于0.5秒），送入 SenseVoice 本地模型执行毫秒级极速推理
    if (wasDictating && recordedSamples.length > 8000 && window.__TAURI__?.core?.invoke) {
      setDictationTip("SenseVoice 工业级 AI 推理转写中...");
      try {
        const b64 = encodeWavBase64(recordedSamples, 16000);
        const recognized = await window.__TAURI__.core.invoke("transcribe_sensevoice", { wavBase64: b64 });
        if (recognized && typeof recognized === "string" && recognized.trim()) {
          const cleanText = recognized.trim();
          setText(prev => {
            const base = prev.trim();
            return base ? `${base} ${cleanText}` : cleanText;
          });
          setDictationTip(`SenseVoice 已转写: "${cleanText}"`);
          setTimeout(() => setDictationTip(null), 3000);
        } else {
          setDictationTip("未检测到清晰语音内容");
          setTimeout(() => setDictationTip(null), 2500);
        }
      } catch (err) {
        console.error("[SenseVoice] Transcribe error:", err);
        setDictationTip(`SenseVoice 转写异常: ${err?.message || err}`);
        setTimeout(() => setDictationTip(null), 3500);
      }
    } else {
      setDictationTip(null);
    }
  };

  const toggleDictation = async () => {
    if (taRef.current) {
      taRef.current.focus();
    }

    if (shouldDictateRef.current || isDictating) {
      await stopDictation();
      return;
    }

    // 方案：阿里开源 SenseVoice-Small 纯本地高精度离线模型（零弹窗、零延迟、专精中文语音）
    if (navigator?.mediaDevices?.getUserMedia && window.__TAURI__?.core?.invoke) {
      try {
        shouldDictateRef.current = true;
        setIsDictating(true);
        audioSamplesRef.current = [];
        setDictationTip("SenseVoice 正在聆听... 请说话 (再次点击麦克风完成)");

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        audioStreamRef.current = stream;

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx({ sampleRate: 16000 });
        audioContextRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        audioProcessorRef.current = processor;

        let lastVolTime = 0;
        processor.onaudioprocess = (e) => {
          if (!shouldDictateRef.current) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const copy = new Float32Array(inputData.length);
          copy.set(inputData);
          for (let i = 0; i < copy.length; i++) {
            audioSamplesRef.current.push(copy[i]);
          }

          const now = Date.now();
          if (now - lastVolTime > 150) {
            lastVolTime = now;
            let sum = 0;
            for (let i = 0; i < inputData.length; i += 8) {
              sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / (inputData.length / 8));
            const vol = Math.min(100, Math.round(rms * 250));
            const bars = vol > 50 ? "▂▄▆█" : vol > 25 ? "▂▄▆" : vol > 10 ? "▂▄" : "▂";
            setDictationTip(`SenseVoice 拾音中 [${bars}]... (再次点击完成转写)`);
          }
        };

        source.connect(processor);
        processor.connect(ctx.destination);
        return;
      } catch (err) {
        console.error("[Dictation] SenseVoice capture failed:", err);
        setDictationTip("麦克风权限获取失败: " + (err?.message || err));
        await stopDictation();
        setTimeout(() => setDictationTip(null), 3500);
      }
    } else {
      setDictationTip("当前环境不支持录音功能");
      setTimeout(() => setDictationTip(null), 3000);
    }
  };

  React.useEffect(() => {
    return () => {
      stopDictation();
    };
  }, []);

  const execCmd = (cmd) => {
    setText("");
    setActiveIdx(0);
    pasteBlocksRef.current.clear();
    pasteCounterRef.current = 0;
    onPick?.(cmd);
  };

  // Expand [paste #N +K lines] tokens back to their real content before sending.
  const expandPastes = (txt) =>
    txt.replace(/\[paste #(\d+) \+\d+ lines?\]/g, (match, id) =>
      pasteBlocksRef.current.get(Number(id)) ?? match);

  const send = () => {
    // If the slash popup is open, Enter executes the highlighted command
    if (showSlash) { execCmd(filtered[clampedIdx]); return; }
    const canSend = text.trim() || attachments.length > 0 || (planMode && annotationCount > 0);
    if (!canSend) return;
    const toSend = expandPastes(text.trim());
    const attachedImages = attachments.map(a => ({ data: a.data, mimeType: a.mimeType, name: a.name, url: a.url }));
    setText("");
    setAttachments([]);
    if (taRef.current) {
      taRef.current.value = "";
      taRef.current.style.height = "auto";
    }
    pasteBlocksRef.current.clear();
    pasteCounterRef.current = 0;
    onSend(toSend, attachedImages.length > 0 ? attachedImages : undefined);
    requestAnimationFrame(() => taRef.current?.focus());
  };

  // Collapse long pastes into a token so the textarea stays navigable; handle image pastes
  const onPaste = (e) => {
    // Check for pasted image files first
    const items = e.clipboardData?.items;
    if (items) {
      const imgFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) imgFiles.push(file);
        }
      }
      if (imgFiles.length > 0) {
        e.preventDefault();
        handleFiles(imgFiles);
        return;
      }
    }

    const raw = e.clipboardData?.getData("text/plain") ?? "";
    const lines = raw.split("\n");
    if (lines.length <= 5 && raw.length <= 500) return; // short — let browser handle normally
    e.preventDefault();
    const id    = ++pasteCounterRef.current;
    pasteBlocksRef.current.set(id, raw);
    const token = `[paste #${id} +${lines.length} line${lines.length === 1 ? "" : "s"}]`;
    const ta    = taRef.current;
    const start = ta ? ta.selectionStart : text.length;
    const end   = ta ? ta.selectionEnd   : text.length;
    const next  = text.slice(0, start) + token + text.slice(end);
    setText(next);
    // Reposition cursor after the token on next frame (state not flushed yet).
    requestAnimationFrame(() => {
      if (!taRef.current) return;
      const pos = start + token.length;
      taRef.current.selectionStart = taRef.current.selectionEnd = pos;
    });
  };
  const onKey = (e) => {
    if (showSlash) {
      if (e.key === "ArrowDown")  { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === "ArrowUp")    { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === "Escape")     { e.preventDefault(); setText(""); return; }
      if (e.key === "Tab")        { e.preventDefault(); setActiveIdx(i => (i + 1) % filtered.length); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); return; }
    if (e.key === "Escape" && isStreaming) { onAbort(); return; }
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onOpenCmd(); }
  };

  return (
    <div
      className={`composer ${planMode ? "plan-on" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer?.files);
      }}
    >
      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {attachments.length > 0 && (
        <div className="composer-attachment-strip">
          {attachments.map((att, idx) => (
            <div key={idx} className="composer-img-thumb" title={att.name || "Attached image"}>
              <img src={att.url} alt={att.name || ""} />
              <button
                type="button"
                className="composer-img-remove"
                onClick={() => removeAttachment(idx)}
                title="Remove image"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {planMode && (
        <div className="plan-strip">
          <Icon name="plan" size={12} color="var(--amber)" />
          <span style={{ color: "var(--amber)" }}>plan mode</span>
          <span style={{ color: "var(--fg-3)" }}>· I'll draft before I write</span>
          <button className="btn ghost" onClick={onTogglePlan} style={{ marginLeft: "auto", height: 22 }}>exit</button>
        </div>
      )}

      {showSlash && (
        <div className="slash-pop" ref={listRef}>
          {filtered.map((c, i) => (
            <button key={c.name}
              className={`slash-row${i === clampedIdx ? " active" : ""}`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => { e.preventDefault(); execCmd(c); }}>
              <span className="slash-glyph">{c.icon}</span>
              <span className="mono" style={{ color: "var(--accent)" }}>/{c.name}</span>
              <span style={{ color: "var(--fg-3)" }}>{c.hint}</span>
              <span className="chip muted" style={{ marginLeft: "auto" }}>{c.group}</span>
            </button>
          ))}
        </div>
      )}

      {dictationTip && (
        <div className="composer-tip-strip mono" style={{ fontSize: "11px", padding: "4px 10px", marginBottom: 6, borderRadius: 6, background: "color-mix(in oklab, var(--accent) 12%, var(--bg-elevated))", color: "var(--accent)", border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)", display: "flex", alignItems: "center", gap: 6 }}>
          <span className="pulse-dot" style={{ width: 6, height: 6, background: "var(--accent)" }} />
          <span>{dictationTip}</span>
        </div>
      )}

      <div className={`composer-row ${isDragging ? "composer-drag-over" : ""}`}>
        <button
          type="button"
          className="btn icon ghost"
          title="attach image"
          onClick={() => imgInputRef.current?.click()}
          style={{ color: attachments.length > 0 ? "var(--accent)" : undefined }}
        >
          <Icon name="image" size={13} color={attachments.length > 0 ? "var(--accent)" : undefined} />
        </button>
        <button
          type="button"
          className={`btn icon ghost ${isDictating ? "composer-voice-active" : ""}`}
          title={isDictating ? "正在语音输入中 (点击停止)" : "语音输入 (dictate)"}
          onClick={toggleDictation}
          style={{ color: isDictating ? "var(--rose)" : undefined }}
        >
          <Icon name="voice" size={13} color={isDictating ? "var(--rose)" : undefined} />
        </button>
        <div className="composer-input">
          <textarea
            ref={taRef}
            rows="1"
            placeholder={
              planMode && !isStreaming
                ? (microcopy?.planTip ?? "describe what to build, or give feedback on the plan…")
                : isStreaming
                  ? microcopy?.streamingTip
                  : (microcopy?.paletteTip ?? "what should we ship?  ·  / for commands  ·  ⌘K for the bridge")
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            onPaste={onPaste}
            className="selectable"
          />
        </div>
        <button className="btn outlined" title="open command bridge (⌘K)" onClick={onOpenCmd}>
          <Icon name="command" size={11} />
          <span className="kbd" style={{ marginLeft: 2 }}>K</span>
        </button>
        {isStreaming ? (
          <>
            {text.trim() && (
              <button className="btn outlined" onClick={send}
                style={{ color: "var(--amber)", borderColor: "color-mix(in oklab, var(--amber) 40%, var(--line))" }}>
                <Icon name="arrow" size={10} color="var(--amber)" /> steer
              </button>
            )}
            <button className="btn danger" onClick={onAbort}>
              <Icon name="stop" size={10} /> abort <span className="kbd">⎋</span>
            </button>
          </>
        ) : (
          <>
            {planMode && (
              <button className="btn outlined" onClick={onApprove}
                style={{ color: "var(--amber)", borderColor: "color-mix(in oklab, var(--amber) 40%, var(--line))" }}>
                <Icon name="play" size={10} color="var(--amber)" /> approve
              </button>
            )}
            <button className="btn primary" onClick={send}
              disabled={!(text.trim() || attachments.length > 0 || (planMode && annotationCount > 0))}>
              {planMode
                ? `send feedback${annotationCount > 0 ? ` · ${annotationCount} comment${annotationCount !== 1 ? "s" : ""}` : ""}`
                : "send"}
              {" "}<Icon name="arrow" size={11} />
            </button>
          </>
        )}
      </div>

      <div className="composer-foot">
        <button className="composer-pill" onClick={onOpenModel}>
          <span className="dot" style={{ background: "var(--accent)" }} />
          <span style={{ color: "var(--fg-2)" }}>{currentModel?.name}</span>
          <Icon name="chev" size={10} color="var(--fg-4)" />
        </button>
        <button className="composer-pill" onClick={onCycleThinking}>
          <Icon name="thinking" size={11} color="var(--lilac)" />
          <span style={{ color: "var(--fg-2)" }}>thinking · {thinking}</span>
        </button>
        <button className={`composer-pill ${planMode ? "on" : ""}`} onClick={onTogglePlan}>
          <Icon name="plan" size={11} color={planMode ? "var(--amber)" : "var(--fg-3)"} />
          <span style={{ color: planMode ? "var(--amber)" : "var(--fg-2)" }}>plan mode</span>
        </button>
        <div style={{ flex: 1 }} />
      </div>
    </div>
  );
}

// ── ⌘K Command bridge — two views: commands → model picker ────────────
//
//  commands view  — lists all slash-commands; /model drills into picker
//  models view    — filterable model list; Esc returns to commands
//
function CommandBridge({ open, onClose, onPick, onPickModel, currentModelId, onPickLogin, loginProviders, initialView = "commands" }) {
  const [q, setQ]             = React.useState("");
  const [view, setView]       = React.useState("commands");
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      setQ("");
      setView(initialView);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  React.useEffect(() => {
    setSelectedIdx(0);
  }, [q, view]);

  const fil    = (s) => (s || "").toLowerCase().includes(q.toLowerCase());
  const models = window.OMP_DATA?.models || [];
  const modelHits = view === "models" ? models.filter((m) => !q || fil(m.name) || fil(m.id)) : [];

  const cmds    = window.OMP_DATA?.commands || [];
  const cmdHits = view === "commands" ? cmds.filter((c) => !q || fil(c.name) || fil(c.hint)) : [];
  const groups  = {};
  if (view === "commands") {
    cmdHits.forEach((c) => { (groups[c.group] = groups[c.group] || []).push(c); });
  }

  React.useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "Escape") {
        if (view === "models") { if (initialView === "models") onClose(); else { setView("commands"); setQ(""); } }
        else if (view === "login") { if (initialView === "login") onClose(); else { setView("commands"); setQ(""); } }
        else onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const max = view === "models" ? modelHits.length : (view === "commands" ? cmdHits.length : 0);
        if (max > 0) setSelectedIdx((i) => (i + 1) % max);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const max = view === "models" ? modelHits.length : (view === "commands" ? cmdHits.length : 0);
        if (max > 0) setSelectedIdx((i) => (i - 1 + max) % max);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (view === "models" && modelHits.length > 0) {
          const chosen = modelHits[selectedIdx] || modelHits[0];
          if (chosen) { onPickModel(chosen); onClose(); }
        } else if (view === "commands" && cmdHits.length > 0) {
          const chosen = cmdHits[selectedIdx] || cmdHits[0];
          if (chosen) {
            if (chosen.name === "model") { setQ(""); setView("models"); }
            else if (chosen.name === "login") { setQ(""); setView("login"); }
            else { onPick(chosen); onClose(); }
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, view, initialView, selectedIdx, modelHits, cmdHits, onPickModel, onPick]);

  if (!open) return null;

  // ── Model picker view ──────────────────────────────────────────────
  if (view === "models") {
    return (
      <div className="bridge-scrim" onClick={onClose}>
        <div className="bridge slide-in" onClick={(e) => e.stopPropagation()}>
          <div className="bridge-input-row">
            <button className="btn icon ghost" title="back"
              onClick={() => { setView("commands"); setQ(""); }}
              style={{ marginRight: 4 }}>
              <Icon name="chevR" size={12} color="var(--fg-3)"
                style={{ transform: "rotate(180deg)", display: "block" }} />
            </button>
            <input ref={inputRef} className="bridge-input mono"
              placeholder="filter models…" value={q}
              onChange={(e) => setQ(e.target.value)} />
            <span className="kbd">esc</span>
          </div>
          <div className="bridge-body">
            <div className="bridge-group">
              <div className="bridge-group-head mono" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                switch model
                <span style={{ color: "var(--fg-4)" }}>
                  tauri:{window.__TAURI__ ? "✓" : "✗"}
                  · connected:{window.OMP_BRIDGE?.isConnected ? "✓" : "✗"}
                  · models:{models.length}
                </span>
                <button className="btn ghost" style={{ marginLeft: "auto", height: 18, fontSize: "var(--d-text-xs)", padding: "0 6px" }}
                  onClick={() => window.OMP_BRIDGE?.refreshModels()}>
                  refresh
                </button>
              </div>
              {modelHits.map((m, idx) => {
                const isCurrent = m.id === currentModelId;
                const isHighlighted = idx === selectedIdx;
                return (
                  <button key={m.id}
                    className={`bridge-row ${isCurrent ? "active" : ""}`}
                    style={isHighlighted ? { outline: "1px solid var(--accent)", background: "color-mix(in oklab, var(--accent) 12%, transparent)" } : undefined}
                    onClick={() => { onPickModel(m); onClose(); }}>
                    <span className="bridge-glyph">
                      {isCurrent
                        ? <Icon name="check" size={10} color="var(--accent)" />
                        : <Icon name="bolt"  size={10} color="var(--cyan)" />}
                    </span>
                    <span style={{ color: isCurrent ? "var(--accent)" : "var(--fg)" }}>{m.name}</span>
                    <span className="mono" style={{ color: "var(--fg-4)" }}>{m.id}</span>
                    <span style={{ color: "var(--fg-3)" }}>· {m.note}</span>
                    <span className="chip muted" style={{ marginLeft: "auto" }}>{m.latency}ms</span>
                  </button>
                );
              })}
              {modelHits.length === 0 && <div className="bridge-empty">no models found</div>}
            </div>
          </div>
          <div className="bridge-foot mono">
            <span className="kbd">↑↓</span> navigate
            <span className="kbd">↵</span> switch
            <span className="kbd">esc</span> back
          </div>
        </div>
      </div>
    );
  }

  // ── Login view ───────────────────────────────────────────────────────────
  if (view === "login") {
    return (
      <div className="bridge-scrim" onClick={onClose}>
        <div className="bridge slide-in" onClick={(e) => e.stopPropagation()}>
          <div className="bridge-input-row">
            <button className="btn icon ghost" title="back"
              onClick={() => { setView("commands"); setQ(""); }}
              style={{ marginRight: 4 }}>
              <Icon name="chevR" size={12} color="var(--fg-3)"
                style={{ transform: "rotate(180deg)", display: "block" }} />
            </button>
            <span className="bridge-input mono" style={{ cursor: "default", lineHeight: "normal" }}>
              login
            </span>
            <span className="kbd">esc</span>
          </div>
          <div className="bridge-body">
            <div className="bridge-group">
              <div className="bridge-group-head mono">select provider</div>
              {loginProviders === null && (
                <div className="bridge-empty" style={{ padding: "16px 32px" }}>loading providers…</div>
              )}
              {loginProviders !== null && loginProviders.length === 0 && (
                <div className="bridge-empty">no providers available</div>
              )}
              {loginProviders !== null && loginProviders.map((p) => (
                <button key={p.id}
                  className={`bridge-row ${p.authenticated ? "active" : ""}`}
                  onClick={() => { if (p.available) { onPickLogin(p); onClose(); } }}>
                  <span className="bridge-glyph">
                    {p.authenticated
                      ? <Icon name="check" size={10} color="var(--accent)" />
                      : <Icon name="bolt"  size={10} color={p.available ? "var(--cyan)" : "var(--fg-5)"} />}
                  </span>
                  <span style={{ color: p.authenticated ? "var(--accent)" : p.available ? "var(--fg)" : "var(--fg-4)" }}>
                    {p.name}
                  </span>
                  <span className="mono" style={{ color: "var(--fg-4)" }}>{p.id}</span>
                  <span className="chip muted" style={{ marginLeft: "auto" }}>
                    {p.authenticated ? "logged in" : p.available ? "available" : "unavailable"}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="bridge-foot mono">
            <span className="kbd">↵</span> authenticate
            <span className="kbd">esc</span> back
          </div>
        </div>
      </div>
    );
  }

  // ── Commands view ──────────────────────────────────────────────────

  const activeModelName = models.find((m) => m.id === currentModelId)?.name ?? "–";

  return (
    <div className="bridge-scrim" onClick={onClose}>
      <div className="bridge slide-in" onClick={(e) => e.stopPropagation()}>
        <div className="bridge-input-row">
          <Icon name="command" size={14} color="var(--accent)" />
          <input ref={inputRef} className="bridge-input mono"
            placeholder="cross the bridge — type to filter…" value={q}
            onChange={(e) => setQ(e.target.value)} />
          <span className="kbd">esc</span>
        </div>
        <div className="bridge-body">
          {Object.entries(groups).map(([g, list]) => (
            <div key={g} className="bridge-group">
              <div className="bridge-group-head mono">{g.toLowerCase()}</div>
              {list.map((c) => {
                const isModel = c.name === "model";
                const isLogin = c.name === "login";
                const drillsIn = isModel || isLogin;
                return (
                  <button key={c.name} className="bridge-row"
                    onClick={() => {
                      if (isModel) { setQ(""); setView("models"); }
                      else if (isLogin) { setQ(""); setView("login"); }
                      else { onPick(c); onClose(); }
                    }}>
                    <span className="bridge-glyph">{c.icon}</span>
                    <span className="mono" style={{ color: "var(--accent)" }}>/{c.name}</span>
                    <span style={{ color: "var(--fg-3)" }}>{c.hint}</span>
                    {isModel && (
                      <span className="mono" style={{ color: "var(--fg-4)", marginLeft: "auto" }}>
                        {activeModelName}
                      </span>
                    )}
                    <Icon name={drillsIn ? "chevR" : "arrow"} size={11} color="var(--fg-4)"
                      style={{ marginLeft: drillsIn ? 8 : "auto" }} />
                  </button>
                );
              })}
            </div>
          ))}
          {cmdHits.length === 0 && (
            <div className="bridge-empty">no luck — try `plan`, `branch`, `model`…</div>
          )}
        </div>
        <div className="bridge-foot mono">
          <span className="kbd">↑↓</span> navigate
          <span className="kbd">↵</span> run
          <span className="kbd">esc</span> close
          <span style={{ marginLeft: "auto", color: "var(--fg-4)" }}>{window.OMP_DATA.microcopy.paletteTip}</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Composer, CommandBridge });
