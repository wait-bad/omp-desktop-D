/* Transpiled from design/composer.jsx via esbuild — DO NOT EDIT DIRECTLY */
(function() {
function Composer({ onSend, onPick, planMode, onTogglePlan, onOpenCmd, onOpenModel, currentModel, thinking, onCycleThinking, isStreaming, onAbort, onApprove, annotationCount = 0, microcopy }) {
  const [text, setText] = React.useState("");
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [attachments, setAttachments] = React.useState([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isDictating, setIsDictating] = React.useState(false);
  const [dictationTip, setDictationTip] = React.useState(null);
  const taRef = React.useRef(null);
  const listRef = React.useRef(null);
  const imgInputRef = React.useRef(null);
  const recognitionRef = React.useRef(null);
  const shouldDictateRef = React.useRef(false);
  const restartTimerRef = React.useRef(null);
  const pasteBlocksRef = React.useRef(/* @__PURE__ */ new Map());
  const pasteCounterRef = React.useRef(0);
  const cmds = window.OMP_DATA?.commands || [];
  const slashQ = text.startsWith("/") ? text.slice(1).split(" ")[0].toLowerCase() : null;
  const filtered = slashQ !== null ? cmds.filter((c) => !slashQ || c.name.startsWith(slashQ) || c.name.includes(slashQ)) : [];
  const showSlash = filtered.length > 0;
  const clampedIdx = showSlash ? Math.min(activeIdx, filtered.length - 1) : 0;
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
          setAttachments((prev) => [...prev, {
            name: file.name,
            mimeType,
            data: b64,
            url
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };
  const removeAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };
  const audioContextRef = React.useRef(null);
  const audioStreamRef = React.useRef(null);
  const audioProcessorRef = React.useRef(null);
  const audioSamplesRef = React.useRef([]);
  const encodeWavBase64 = (samples, sampleRate) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeString = (offset2, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset2 + i, str.charCodeAt(i));
      }
    };
    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 32768 : s * 32767, true);
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
    if (audioProcessorRef.current) {
      try {
        audioProcessorRef.current.disconnect();
      } catch (_) {
      }
      audioProcessorRef.current = null;
    }
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch (_) {
      }
      audioStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (_) {
      }
      audioContextRef.current = null;
    }
    const recordedSamples = audioSamplesRef.current;
    audioSamplesRef.current = [];
    if (wasDictating && recordedSamples.length > 8e3 && window.__TAURI__?.core?.invoke) {
      setDictationTip("SenseVoice \u5DE5\u4E1A\u7EA7 AI \u63A8\u7406\u8F6C\u5199\u4E2D...");
      try {
        const b64 = encodeWavBase64(recordedSamples, 16e3);
        const recognized = await window.__TAURI__.core.invoke("transcribe_sensevoice", { wavBase64: b64 });
        if (recognized && typeof recognized === "string" && recognized.trim()) {
          const cleanText = recognized.trim();
          setText((prev) => {
            const base = prev.trim();
            return base ? `${base} ${cleanText}` : cleanText;
          });
          setDictationTip(`SenseVoice \u5DF2\u8F6C\u5199: "${cleanText}"`);
          setTimeout(() => setDictationTip(null), 3e3);
        } else {
          setDictationTip("\u672A\u68C0\u6D4B\u5230\u6E05\u6670\u8BED\u97F3\u5185\u5BB9");
          setTimeout(() => setDictationTip(null), 2500);
        }
      } catch (err) {
        console.error("[SenseVoice] Transcribe error:", err);
        setDictationTip(`SenseVoice \u8F6C\u5199\u5F02\u5E38: ${err?.message || err}`);
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
    if (navigator?.mediaDevices?.getUserMedia && window.__TAURI__?.core?.invoke) {
      try {
        shouldDictateRef.current = true;
        setIsDictating(true);
        audioSamplesRef.current = [];
        setDictationTip("SenseVoice \u6B63\u5728\u8046\u542C... \u8BF7\u8BF4\u8BDD (\u518D\u6B21\u70B9\u51FB\u9EA6\u514B\u98CE\u5B8C\u6210)");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16e3,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        audioStreamRef.current = stream;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx({ sampleRate: 16e3 });
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
            const bars = vol > 50 ? "\u2582\u2584\u2586\u2588" : vol > 25 ? "\u2582\u2584\u2586" : vol > 10 ? "\u2582\u2584" : "\u2582";
            setDictationTip(`SenseVoice \u62FE\u97F3\u4E2D [${bars}]... (\u518D\u6B21\u70B9\u51FB\u5B8C\u6210\u8F6C\u5199)`);
          }
        };
        source.connect(processor);
        processor.connect(ctx.destination);
        return;
      } catch (err) {
        console.error("[Dictation] SenseVoice capture failed:", err);
        setDictationTip("\u9EA6\u514B\u98CE\u6743\u9650\u83B7\u53D6\u5931\u8D25: " + (err?.message || err));
        await stopDictation();
        setTimeout(() => setDictationTip(null), 3500);
      }
    } else {
      setDictationTip("\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u5F55\u97F3\u529F\u80FD");
      setTimeout(() => setDictationTip(null), 3e3);
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
  const expandPastes = (txt) => txt.replace(/\[paste #(\d+) \+\d+ lines?\]/g, (match, id) => pasteBlocksRef.current.get(Number(id)) ?? match);
  const send = () => {
    if (showSlash) {
      execCmd(filtered[clampedIdx]);
      return;
    }
    const canSend = text.trim() || attachments.length > 0 || planMode && annotationCount > 0;
    if (!canSend) return;
    const toSend = expandPastes(text.trim());
    const attachedImages = attachments.map((a) => ({ data: a.data, mimeType: a.mimeType, name: a.name, url: a.url }));
    setText("");
    setAttachments([]);
    if (taRef.current) {
      taRef.current.value = "";
      taRef.current.style.height = "auto";
    }
    pasteBlocksRef.current.clear();
    pasteCounterRef.current = 0;
    onSend(toSend, attachedImages.length > 0 ? attachedImages : void 0);
    requestAnimationFrame(() => taRef.current?.focus());
  };
  const onPaste = (e) => {
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
    if (lines.length <= 5 && raw.length <= 500) return;
    e.preventDefault();
    const id = ++pasteCounterRef.current;
    pasteBlocksRef.current.set(id, raw);
    const token = `[paste #${id} +${lines.length} line${lines.length === 1 ? "" : "s"}]`;
    const ta = taRef.current;
    const start = ta ? ta.selectionStart : text.length;
    const end = ta ? ta.selectionEnd : text.length;
    const next = text.slice(0, start) + token + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      if (!taRef.current) return;
      const pos = start + token.length;
      taRef.current.selectionStart = taRef.current.selectionEnd = pos;
    });
  };
  const onKey = (e) => {
    if (showSlash) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setText("");
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % filtered.length);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
      return;
    }
    if (e.key === "Escape" && isStreaming) {
      onAbort();
      return;
    }
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onOpenCmd();
    }
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `composer ${planMode ? "plan-on" : ""}`,
      onDragOver: (e) => {
        e.preventDefault();
        setIsDragging(true);
      },
      onDragLeave: () => setIsDragging(false),
      onDrop: (e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer?.files);
      }
    },
    /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: imgInputRef,
        type: "file",
        accept: "image/*",
        multiple: true,
        style: { display: "none" },
        onChange: (e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }
      }
    ),
    attachments.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "composer-attachment-strip" }, attachments.map((att, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: "composer-img-thumb", title: att.name || "Attached image" }, /* @__PURE__ */ React.createElement("img", { src: att.url, alt: att.name || "" }), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "composer-img-remove",
        onClick: () => removeAttachment(idx),
        title: "Remove image"
      },
      "\u2715"
    )))),
    planMode && /* @__PURE__ */ React.createElement("div", { className: "plan-strip" }, /* @__PURE__ */ React.createElement(Icon, { name: "plan", size: 12, color: "var(--amber)" }), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--amber)" } }, "plan mode"), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-3)" } }, "\xB7 I'll draft before I write"), /* @__PURE__ */ React.createElement("button", { className: "btn ghost", onClick: onTogglePlan, style: { marginLeft: "auto", height: 22 } }, "exit")),
    showSlash && /* @__PURE__ */ React.createElement("div", { className: "slash-pop", ref: listRef }, filtered.map((c, i) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: c.name,
        className: `slash-row${i === clampedIdx ? " active" : ""}`,
        onMouseEnter: () => setActiveIdx(i),
        onMouseDown: (e) => {
          e.preventDefault();
          execCmd(c);
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: "slash-glyph" }, c.icon),
      /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--accent)" } }, "/", c.name),
      /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-3)" } }, c.hint),
      /* @__PURE__ */ React.createElement("span", { className: "chip muted", style: { marginLeft: "auto" } }, c.group)
    ))),
    dictationTip && /* @__PURE__ */ React.createElement("div", { className: "composer-tip-strip mono", style: { fontSize: "11px", padding: "4px 10px", marginBottom: 6, borderRadius: 6, background: "color-mix(in oklab, var(--accent) 12%, var(--bg-elevated))", color: "var(--accent)", border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)", display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { className: "pulse-dot", style: { width: 6, height: 6, background: "var(--accent)" } }), /* @__PURE__ */ React.createElement("span", null, dictationTip)),
    /* @__PURE__ */ React.createElement("div", { className: `composer-row ${isDragging ? "composer-drag-over" : ""}` }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "btn icon ghost",
        title: "attach image",
        onClick: () => imgInputRef.current?.click(),
        style: { color: attachments.length > 0 ? "var(--accent)" : void 0 }
      },
      /* @__PURE__ */ React.createElement(Icon, { name: "image", size: 13, color: attachments.length > 0 ? "var(--accent)" : void 0 })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: `btn icon ghost ${isDictating ? "composer-voice-active" : ""}`,
        title: isDictating ? "\u6B63\u5728\u8BED\u97F3\u8F93\u5165\u4E2D (\u70B9\u51FB\u505C\u6B62)" : "\u8BED\u97F3\u8F93\u5165 (dictate)",
        onClick: toggleDictation,
        style: { color: isDictating ? "var(--rose)" : void 0 }
      },
      /* @__PURE__ */ React.createElement(Icon, { name: "voice", size: 13, color: isDictating ? "var(--rose)" : void 0 })
    ), /* @__PURE__ */ React.createElement("div", { className: "composer-input" }, /* @__PURE__ */ React.createElement(
      "textarea",
      {
        ref: taRef,
        rows: "1",
        placeholder: planMode && !isStreaming ? microcopy?.planTip ?? "describe what to build, or give feedback on the plan\u2026" : isStreaming ? microcopy?.streamingTip : microcopy?.paletteTip ?? "what should we ship?  \xB7  / for commands  \xB7  \u2318K for the bridge",
        value: text,
        onChange: (e) => setText(e.target.value),
        onKeyDown: onKey,
        onPaste,
        className: "selectable"
      }
    )), /* @__PURE__ */ React.createElement("button", { className: "btn outlined", title: "open command bridge (\u2318K)", onClick: onOpenCmd }, /* @__PURE__ */ React.createElement(Icon, { name: "command", size: 11 }), /* @__PURE__ */ React.createElement("span", { className: "kbd", style: { marginLeft: 2 } }, "K")), isStreaming ? /* @__PURE__ */ React.createElement(React.Fragment, null, text.trim() && /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn outlined",
        onClick: send,
        style: { color: "var(--amber)", borderColor: "color-mix(in oklab, var(--amber) 40%, var(--line))" }
      },
      /* @__PURE__ */ React.createElement(Icon, { name: "arrow", size: 10, color: "var(--amber)" }),
      " steer"
    ), /* @__PURE__ */ React.createElement("button", { className: "btn danger", onClick: onAbort }, /* @__PURE__ */ React.createElement(Icon, { name: "stop", size: 10 }), " abort ", /* @__PURE__ */ React.createElement("span", { className: "kbd" }, "\u238B"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, planMode && /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn outlined",
        onClick: onApprove,
        style: { color: "var(--amber)", borderColor: "color-mix(in oklab, var(--amber) 40%, var(--line))" }
      },
      /* @__PURE__ */ React.createElement(Icon, { name: "play", size: 10, color: "var(--amber)" }),
      " approve"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn primary",
        onClick: send,
        disabled: !(text.trim() || attachments.length > 0 || planMode && annotationCount > 0)
      },
      planMode ? `send feedback${annotationCount > 0 ? ` \xB7 ${annotationCount} comment${annotationCount !== 1 ? "s" : ""}` : ""}` : "send",
      " ",
      /* @__PURE__ */ React.createElement(Icon, { name: "arrow", size: 11 })
    ))),
    /* @__PURE__ */ React.createElement("div", { className: "composer-foot" }, /* @__PURE__ */ React.createElement("button", { className: "composer-pill", onClick: onOpenModel }, /* @__PURE__ */ React.createElement("span", { className: "dot", style: { background: "var(--accent)" } }), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-2)" } }, currentModel?.name), /* @__PURE__ */ React.createElement(Icon, { name: "chev", size: 10, color: "var(--fg-4)" })), /* @__PURE__ */ React.createElement("button", { className: "composer-pill", onClick: onCycleThinking }, /* @__PURE__ */ React.createElement(Icon, { name: "thinking", size: 11, color: "var(--lilac)" }), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-2)" } }, "thinking \xB7 ", thinking)), /* @__PURE__ */ React.createElement("button", { className: `composer-pill ${planMode ? "on" : ""}`, onClick: onTogglePlan }, /* @__PURE__ */ React.createElement(Icon, { name: "plan", size: 11, color: planMode ? "var(--amber)" : "var(--fg-3)" }), /* @__PURE__ */ React.createElement("span", { style: { color: planMode ? "var(--amber)" : "var(--fg-2)" } }, "plan mode")), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }))
  );
}
function CommandBridge({ open, onClose, onPick, onPickModel, currentModelId, onPickLogin, loginProviders, initialView = "commands" }) {
  const [q, setQ] = React.useState("");
  const [view, setView] = React.useState("commands");
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
  const fil = (s) => (s || "").toLowerCase().includes(q.toLowerCase());
  const models = window.OMP_DATA?.models || [];
  const modelHits = view === "models" ? models.filter((m) => !q || fil(m.name) || fil(m.id)) : [];
  const cmds = window.OMP_DATA?.commands || [];
  const cmdHits = view === "commands" ? cmds.filter((c) => !q || fil(c.name) || fil(c.hint)) : [];
  const groups = {};
  if (view === "commands") {
    cmdHits.forEach((c) => {
      (groups[c.group] = groups[c.group] || []).push(c);
    });
  }
  React.useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "Escape") {
        if (view === "models") {
          if (initialView === "models") onClose();
          else {
            setView("commands");
            setQ("");
          }
        } else if (view === "login") {
          if (initialView === "login") onClose();
          else {
            setView("commands");
            setQ("");
          }
        } else onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const max = view === "models" ? modelHits.length : view === "commands" ? cmdHits.length : 0;
        if (max > 0) setSelectedIdx((i) => (i + 1) % max);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const max = view === "models" ? modelHits.length : view === "commands" ? cmdHits.length : 0;
        if (max > 0) setSelectedIdx((i) => (i - 1 + max) % max);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (view === "models" && modelHits.length > 0) {
          const chosen = modelHits[selectedIdx] || modelHits[0];
          if (chosen) {
            onPickModel(chosen);
            onClose();
          }
        } else if (view === "commands" && cmdHits.length > 0) {
          const chosen = cmdHits[selectedIdx] || cmdHits[0];
          if (chosen) {
            if (chosen.name === "model") {
              setQ("");
              setView("models");
            } else if (chosen.name === "login") {
              setQ("");
              setView("login");
            } else {
              onPick(chosen);
              onClose();
            }
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, view, initialView, selectedIdx, modelHits, cmdHits, onPickModel, onPick]);
  if (!open) return null;
  if (view === "models") {
    return /* @__PURE__ */ React.createElement("div", { className: "bridge-scrim", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: "bridge slide-in", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "bridge-input-row" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn icon ghost",
        title: "back",
        onClick: () => {
          setView("commands");
          setQ("");
        },
        style: { marginRight: 4 }
      },
      /* @__PURE__ */ React.createElement(
        Icon,
        {
          name: "chevR",
          size: 12,
          color: "var(--fg-3)",
          style: { transform: "rotate(180deg)", display: "block" }
        }
      )
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: inputRef,
        className: "bridge-input mono",
        placeholder: "filter models\u2026",
        value: q,
        onChange: (e) => setQ(e.target.value)
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "kbd" }, "esc")), /* @__PURE__ */ React.createElement("div", { className: "bridge-body" }, /* @__PURE__ */ React.createElement("div", { className: "bridge-group" }, /* @__PURE__ */ React.createElement("div", { className: "bridge-group-head mono", style: { display: "flex", alignItems: "center", gap: 8 } }, "switch model", /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-4)" } }, "tauri:", window.__TAURI__ ? "\u2713" : "\u2717", "\xB7 connected:", window.OMP_BRIDGE?.isConnected ? "\u2713" : "\u2717", "\xB7 models:", models.length), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn ghost",
        style: { marginLeft: "auto", height: 18, fontSize: "var(--d-text-xs)", padding: "0 6px" },
        onClick: () => window.OMP_BRIDGE?.refreshModels()
      },
      "refresh"
    )), modelHits.map((m, idx) => {
      const isCurrent = m.id === currentModelId;
      const isHighlighted = idx === selectedIdx;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: m.id,
          className: `bridge-row ${isCurrent ? "active" : ""}`,
          style: isHighlighted ? { outline: "1px solid var(--accent)", background: "color-mix(in oklab, var(--accent) 12%, transparent)" } : void 0,
          onClick: () => {
            onPickModel(m);
            onClose();
          }
        },
        /* @__PURE__ */ React.createElement("span", { className: "bridge-glyph" }, isCurrent ? /* @__PURE__ */ React.createElement(Icon, { name: "check", size: 10, color: "var(--accent)" }) : /* @__PURE__ */ React.createElement(Icon, { name: "bolt", size: 10, color: "var(--cyan)" })),
        /* @__PURE__ */ React.createElement("span", { style: { color: isCurrent ? "var(--accent)" : "var(--fg)" } }, m.name),
        /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-4)" } }, m.id),
        /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-3)" } }, "\xB7 ", m.note),
        /* @__PURE__ */ React.createElement("span", { className: "chip muted", style: { marginLeft: "auto" } }, m.latency, "ms")
      );
    }), modelHits.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "bridge-empty" }, "no models found"))), /* @__PURE__ */ React.createElement("div", { className: "bridge-foot mono" }, /* @__PURE__ */ React.createElement("span", { className: "kbd" }, "\u2191\u2193"), " navigate", /* @__PURE__ */ React.createElement("span", { className: "kbd" }, "\u21B5"), " switch", /* @__PURE__ */ React.createElement("span", { className: "kbd" }, "esc"), " back")));
  }
  if (view === "login") {
    return /* @__PURE__ */ React.createElement("div", { className: "bridge-scrim", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: "bridge slide-in", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "bridge-input-row" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn icon ghost",
        title: "back",
        onClick: () => {
          setView("commands");
          setQ("");
        },
        style: { marginRight: 4 }
      },
      /* @__PURE__ */ React.createElement(
        Icon,
        {
          name: "chevR",
          size: 12,
          color: "var(--fg-3)",
          style: { transform: "rotate(180deg)", display: "block" }
        }
      )
    ), /* @__PURE__ */ React.createElement("span", { className: "bridge-input mono", style: { cursor: "default", lineHeight: "normal" } }, "login"), /* @__PURE__ */ React.createElement("span", { className: "kbd" }, "esc")), /* @__PURE__ */ React.createElement("div", { className: "bridge-body" }, /* @__PURE__ */ React.createElement("div", { className: "bridge-group" }, /* @__PURE__ */ React.createElement("div", { className: "bridge-group-head mono" }, "select provider"), loginProviders === null && /* @__PURE__ */ React.createElement("div", { className: "bridge-empty", style: { padding: "16px 32px" } }, "loading providers\u2026"), loginProviders !== null && loginProviders.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "bridge-empty" }, "no providers available"), loginProviders !== null && loginProviders.map((p) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: p.id,
        className: `bridge-row ${p.authenticated ? "active" : ""}`,
        onClick: () => {
          if (p.available) {
            onPickLogin(p);
            onClose();
          }
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: "bridge-glyph" }, p.authenticated ? /* @__PURE__ */ React.createElement(Icon, { name: "check", size: 10, color: "var(--accent)" }) : /* @__PURE__ */ React.createElement(Icon, { name: "bolt", size: 10, color: p.available ? "var(--cyan)" : "var(--fg-5)" })),
      /* @__PURE__ */ React.createElement("span", { style: { color: p.authenticated ? "var(--accent)" : p.available ? "var(--fg)" : "var(--fg-4)" } }, p.name),
      /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-4)" } }, p.id),
      /* @__PURE__ */ React.createElement("span", { className: "chip muted", style: { marginLeft: "auto" } }, p.authenticated ? "logged in" : p.available ? "available" : "unavailable")
    )))), /* @__PURE__ */ React.createElement("div", { className: "bridge-foot mono" }, /* @__PURE__ */ React.createElement("span", { className: "kbd" }, "\u21B5"), " authenticate", /* @__PURE__ */ React.createElement("span", { className: "kbd" }, "esc"), " back")));
  }
  const activeModelName = models.find((m) => m.id === currentModelId)?.name ?? "\u2013";
  return /* @__PURE__ */ React.createElement("div", { className: "bridge-scrim", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: "bridge slide-in", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "bridge-input-row" }, /* @__PURE__ */ React.createElement(Icon, { name: "command", size: 14, color: "var(--accent)" }), /* @__PURE__ */ React.createElement(
    "input",
    {
      ref: inputRef,
      className: "bridge-input mono",
      placeholder: "cross the bridge \u2014 type to filter\u2026",
      value: q,
      onChange: (e) => setQ(e.target.value)
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "kbd" }, "esc")), /* @__PURE__ */ React.createElement("div", { className: "bridge-body" }, Object.entries(groups).map(([g, list]) => /* @__PURE__ */ React.createElement("div", { key: g, className: "bridge-group" }, /* @__PURE__ */ React.createElement("div", { className: "bridge-group-head mono" }, g.toLowerCase()), list.map((c) => {
    const isModel = c.name === "model";
    const isLogin = c.name === "login";
    const drillsIn = isModel || isLogin;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: c.name,
        className: "bridge-row",
        onClick: () => {
          if (isModel) {
            setQ("");
            setView("models");
          } else if (isLogin) {
            setQ("");
            setView("login");
          } else {
            onPick(c);
            onClose();
          }
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: "bridge-glyph" }, c.icon),
      /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--accent)" } }, "/", c.name),
      /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-3)" } }, c.hint),
      isModel && /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-4)", marginLeft: "auto" } }, activeModelName),
      /* @__PURE__ */ React.createElement(
        Icon,
        {
          name: drillsIn ? "chevR" : "arrow",
          size: 11,
          color: "var(--fg-4)",
          style: { marginLeft: drillsIn ? 8 : "auto" }
        }
      )
    );
  }))), cmdHits.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "bridge-empty" }, "no luck \u2014 try `plan`, `branch`, `model`\u2026")), /* @__PURE__ */ React.createElement("div", { className: "bridge-foot mono" }, /* @__PURE__ */ React.createElement("span", { className: "kbd" }, "\u2191\u2193"), " navigate", /* @__PURE__ */ React.createElement("span", { className: "kbd" }, "\u21B5"), " run", /* @__PURE__ */ React.createElement("span", { className: "kbd" }, "esc"), " close", /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "auto", color: "var(--fg-4)" } }, window.OMP_DATA.microcopy.paletteTip))));
}
Object.assign(window, { Composer, CommandBridge });

})();
