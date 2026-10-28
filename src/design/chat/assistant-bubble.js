/* Transpiled from design/chat/assistant-bubble.jsx via esbuild — DO NOT EDIT DIRECTLY */
(function() {
const { Icon: _ChatIcon, MarkdownContent: _ChatMd, AnnotablePlan: _ChatAP } = window;
function InlinePlan({ plan }) {
  return /* @__PURE__ */ React.createElement("div", { className: "inline-plan slide-in" }, /* @__PURE__ */ React.createElement("div", { className: "inline-plan-head" }, /* @__PURE__ */ React.createElement(_ChatIcon, { name: "plan", size: 12, color: "var(--accent)" }), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-2)", fontWeight: 600 } }, plan.title), /* @__PURE__ */ React.createElement("span", { className: "chip muted" }, plan.phases.reduce((n, p) => n + p.tasks.length, 0), " tasks"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement("button", { className: "btn ghost", style: { height: 22 } }, "open kanban \u2192")), /* @__PURE__ */ React.createElement("div", { className: "inline-plan-body" }, plan.phases.map((ph) => /* @__PURE__ */ React.createElement("div", { key: ph.id, className: "inline-phase" }, /* @__PURE__ */ React.createElement("div", { className: "inline-phase-head" }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-3)" } }, ph.label.toUpperCase()), /* @__PURE__ */ React.createElement("span", { className: "hr" })), ph.tasks.map((t) => /* @__PURE__ */ React.createElement("div", { key: t.id, className: `inline-task status-${t.status}` }, /* @__PURE__ */ React.createElement("span", { className: "task-mark" }, t.status === "done" && /* @__PURE__ */ React.createElement(_ChatIcon, { name: "check", size: 10 }), t.status === "in_progress" && /* @__PURE__ */ React.createElement("span", { className: "pulse-dot" }), t.status === "pending" && /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-4)" } }, "\u25CB")), /* @__PURE__ */ React.createElement("span", { className: "task-text selectable" }, t.text)))))));
}
function AssistantBubble({ msg, idx, highlighted, annotable, annotations, onAnnotate }) {
  const tweaks = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("omp-desktop:tweaks") || "{}");
    } catch {
      return {};
    }
  }, []);
  const aiName = tweaks.aiName?.trim();
  const aiAvatar = tweaks.aiAvatar?.trim();
  const rawName = aiName || (msg.model ?? "OMP");
  const displayName = rawName.replace(/\s*\(.*?\)\s*/g, "").trim() || "OMP";
  return /* @__PURE__ */ React.createElement("div", { className: `row assistant fade-up${highlighted ? " mm-hot" : ""}`, "data-msg-idx": idx }, /* @__PURE__ */ React.createElement("div", { className: "ass-rail" }, /* @__PURE__ */ React.createElement("div", { className: "ass-glyph", style: { overflow: "hidden" } }, aiAvatar ? /* @__PURE__ */ React.createElement(
    "img",
    {
      src: aiAvatar,
      alt: "",
      style: { width: "100%", height: "100%", objectFit: "cover" },
      onError: (e) => {
        e.target.style.display = "none";
      }
    }
  ) : /* @__PURE__ */ React.createElement(_ChatIcon, { name: "sparkle", size: 11, color: "var(--accent)" })), /* @__PURE__ */ React.createElement("div", { className: "ass-thread" })), /* @__PURE__ */ React.createElement("div", { className: "ass-body" }, /* @__PURE__ */ React.createElement("div", { className: "ass-meta" }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--accent)" } }, displayName), /* @__PURE__ */ React.createElement("span", { className: "chip muted" }, msg.time), msg.lead === "thinking" && /* @__PURE__ */ React.createElement("span", { className: "chip", style: { color: "var(--lilac)", borderColor: "color-mix(in oklab, var(--lilac) 30%, var(--line))" } }, /* @__PURE__ */ React.createElement(_ChatIcon, { name: "thinking", size: 10 }), "thinking")), msg.thought && /* @__PURE__ */ React.createElement("div", { className: "thought selectable" }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-4)" } }, "// "), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-3)", fontStyle: "italic" } }, msg.thought)), msg.blocks?.map((b, i) => {
    if (b.type === "text") {
      if (annotable && !msg.streaming) {
        return /* @__PURE__ */ React.createElement(
          _ChatAP,
          {
            key: i,
            text: b.text,
            annotations,
            onAnnotate
          }
        );
      }
      return /* @__PURE__ */ React.createElement(
        _ChatMd,
        {
          key: i,
          text: b.text,
          streaming: msg.streaming && i === msg.blocks.length - 1
        }
      );
    }
    if (b.type === "plan") {
      return /* @__PURE__ */ React.createElement(InlinePlan, { key: i, plan: b });
    }
    return null;
  })));
}
Object.assign(window, { AssistantBubble, InlinePlan });

})();
