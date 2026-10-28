/* Transpiled from design/chat/tool-card.jsx via esbuild — DO NOT EDIT DIRECTLY */
(function() {
const { Icon: _TC_Icon, TOOL_META: _TC_TOOL_META, EvalCell: _TC_EvalCell } = window;
function ScrubbableDiff({ msg }) {
  const total = msg.diff.length;
  const [pos, setPos] = React.useState(total);
  const [hover, setHover] = React.useState(null);
  const trackRef = React.useRef(null);
  React.useEffect(() => {
    let i = 0;
    setPos(0);
    const id = setInterval(() => {
      i += 1;
      setPos(i);
      if (i >= total) clearInterval(id);
    }, 70);
    return () => clearInterval(id);
  }, [total]);
  const visiblePos = hover != null ? hover : pos;
  const onScrub = (e) => {
    const r = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(r.width, e.clientX - r.left));
    setHover(Math.max(1, Math.round(x / r.width * total)));
  };
  return /* @__PURE__ */ React.createElement("div", { className: "diff-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "diff-head mono" }, /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-3)" } }, msg.target), /* @__PURE__ */ React.createElement("span", { className: "diff-counts" }, /* @__PURE__ */ React.createElement("span", { style: { color: "var(--diff-add-fg)" } }, "+", msg.adds), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--diff-rm-fg)" } }, "\u2212", msg.rems))), /* @__PURE__ */ React.createElement("div", { className: "diff-body mono" }, /* @__PURE__ */ React.createElement("div", { className: "diff-lines" }, msg.diff.slice(0, visiblePos).map((l, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: `diff-line k-${l.kind} fade-up` }, /* @__PURE__ */ React.createElement("span", { className: "diff-gutter" }, l.line), /* @__PURE__ */ React.createElement("span", { className: "diff-mark" }, l.kind === "add" ? "+" : l.kind === "rem" ? "\u2212" : " "), /* @__PURE__ */ React.createElement("span", { className: "diff-code" }, l.text))), visiblePos < total && Array.from({ length: total - visiblePos }, (_, i) => /* @__PURE__ */ React.createElement("div", { key: `g-${i}`, className: "diff-line ghost" }, /* @__PURE__ */ React.createElement("span", { className: "diff-gutter" }, "\xB7"), /* @__PURE__ */ React.createElement("span", { className: "diff-mark" }, " "), /* @__PURE__ */ React.createElement("span", { className: "diff-code" }, "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501"))))), /* @__PURE__ */ React.createElement("div", { className: "diff-track-wrap" }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-4)", fontSize: "var(--d-text-xs)" } }, "scrub"), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "diff-track",
      ref: trackRef,
      onMouseMove: onScrub,
      onMouseLeave: () => setHover(null)
    },
    /* @__PURE__ */ React.createElement("div", { className: "diff-track-base" }),
    msg.diff.map((l, i) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: i,
        className: `diff-tick k-${l.kind}`,
        style: { left: `${i / total * 100}%`, width: `${100 / total}%` }
      }
    )),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "diff-track-cursor",
        style: { left: `${visiblePos / total * 100}%` }
      }
    )
  ), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-4)", fontSize: "var(--d-text-xs)" } }, visiblePos, "/", total)));
}
const _TA_CLR = {
  pending: "var(--fg-5)",
  running: "var(--accent)",
  completed: "var(--fg-3)",
  failed: "var(--rose)",
  aborted: "var(--amber)"
};
function TaskAgentRow({ sa }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const bodyRef = React.useRef(null);
  const isRunning = sa.status === "running";
  const lines = sa._stream?.length ? sa._stream : sa.output ? sa.output.split("\n") : [];
  const hasBody = lines.length > 0;
  const clr = _TA_CLR[sa.status] ?? "var(--fg-4)";
  const hint = isRunning ? sa.lastIntent : sa.status === "failed" || sa.status === "aborted" ? sa.error ?? sa.status : sa.task;
  React.useEffect(() => {
    if (isOpen && isRunning && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [lines.length, isOpen, isRunning]);
  return /* @__PURE__ */ React.createElement("div", { className: `ta-row ta-${sa.status}` }, /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "ta-hd",
      onClick: () => hasBody && setIsOpen((o) => !o),
      style: { cursor: hasBody ? "pointer" : "default" }
    },
    /* @__PURE__ */ React.createElement("span", { className: "dot", style: {
      background: clr,
      flexShrink: 0,
      ...isRunning ? { animation: "pulseDot 1.4s ease-in-out infinite" } : {}
    } }),
    /* @__PURE__ */ React.createElement("span", { className: "ta-agent" }, sa.agent),
    hint && /* @__PURE__ */ React.createElement("span", { className: "ta-hint" }, "\xB7 ", hint),
    /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }),
    sa.toolCount > 0 && /* @__PURE__ */ React.createElement("span", { className: "chip muted mono ta-chip" }, sa.toolCount, "\xD7"),
    sa.tokens > 0 && /* @__PURE__ */ React.createElement("span", { className: "chip muted mono ta-chip" }, sa.tokens >= 1e3 ? `${(sa.tokens / 1e3).toFixed(1)}k` : sa.tokens, "t"),
    sa.durationMs > 0 && /* @__PURE__ */ React.createElement("span", { className: "chip muted mono ta-chip" }, sa.durationMs >= 1e3 ? `${(sa.durationMs / 1e3).toFixed(1)}s` : `${sa.durationMs}ms`),
    hasBody && /* @__PURE__ */ React.createElement(_TC_Icon, { name: isOpen ? "chev" : "chevR", size: 10, color: "var(--fg-4)" })
  ), isOpen && hasBody && /* @__PURE__ */ React.createElement("div", { className: "ta-body selectable", ref: bodyRef }, lines.map((l, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "ta-stream-line" }, l || "\xA0"))));
}
function TaskPanel({ subagents }) {
  return /* @__PURE__ */ React.createElement("div", { className: "task-panel" }, subagents.map((sa) => /* @__PURE__ */ React.createElement(TaskAgentRow, { key: sa.index, sa })));
}
function ToolCard({ msg, idx, highlighted }) {
  const meta = _TC_TOOL_META[msg.tool] || { color: "var(--fg-3)", icon: "circle", label: msg.tool };
  const running = msg.status === "running";
  return /* @__PURE__ */ React.createElement("div", { className: `row tool fade-up${highlighted ? " mm-hot" : ""}`, "data-msg-idx": idx }, /* @__PURE__ */ React.createElement("div", { className: "ass-rail" }, /* @__PURE__ */ React.createElement("div", { className: "tool-glyph", style: { borderColor: meta.color, color: meta.color } }, /* @__PURE__ */ React.createElement(_TC_Icon, { name: meta.icon, size: 11, color: meta.color })), /* @__PURE__ */ React.createElement("div", { className: "ass-thread" })), /* @__PURE__ */ React.createElement("div", { className: `tool-card ${running ? "running" : "ok"}` }, /* @__PURE__ */ React.createElement("div", { className: "tool-card-head" }, /* @__PURE__ */ React.createElement("span", { className: "tool-tag", style: { color: meta.color, background: `color-mix(in oklab, ${meta.color} 14%, transparent)`, borderColor: `color-mix(in oklab, ${meta.color} 30%, var(--line))` } }, meta.label), /* @__PURE__ */ React.createElement("span", { className: "tool-title selectable" }, msg.title), /* @__PURE__ */ React.createElement("div", { className: "tool-card-spacer" }), running ? /* @__PURE__ */ React.createElement("span", { className: "chip accent", style: { animation: "pulseDot 1.4s infinite" } }, /* @__PURE__ */ React.createElement("span", { className: "dot live" }), " running") : /* @__PURE__ */ React.createElement("span", { className: "chip muted" }, /* @__PURE__ */ React.createElement("span", { className: "mono" }, msg.duration, "ms")), /* @__PURE__ */ React.createElement("span", { className: "chip muted mono" }, msg.time)), msg.tool === "search" && msg.preview && /* @__PURE__ */ React.createElement("div", { className: "tool-search" }, msg.preview.map((p, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: `search-row ${p.hot ? "hot" : ""}` }, /* @__PURE__ */ React.createElement(_TC_Icon, { name: "file", size: 11, color: p.hot ? "var(--accent)" : "var(--fg-3)" }), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: p.hot ? "var(--fg)" : "var(--fg-2)" } }, p.file), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-4)", marginLeft: "auto" } }, p.hits, " hits")))), msg.tool === "read" && /* @__PURE__ */ React.createElement("div", { className: "tool-foot mono" }, /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-3)" } }, "\u21B3"), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-2)" } }, msg.target), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-4)" } }, "\xB7 ", msg.summary)), msg.tool === "edit" && msg.diff && /* @__PURE__ */ React.createElement(ScrubbableDiff, { msg }), msg.tool === "edit" && !msg.diff && /* @__PURE__ */ React.createElement("div", { className: "tool-foot mono" }, /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-3)" } }, "\u21B3"), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-2)" } }, msg.target), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--diff-add-fg)", marginLeft: 8 }, className: "mono" }, "+", msg.adds || 0), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--diff-rm-fg)", marginLeft: 4 }, className: "mono" }, "\u2212", msg.rems || 0), running && /* @__PURE__ */ React.createElement("span", { className: "shimmer-text", style: { marginLeft: "auto" } }, "writing patch\u2026")), (msg.tool === "bash" || msg.tool === "hub") && msg.output && /* @__PURE__ */ React.createElement("pre", { className: "tool-bash mono selectable" }, msg.output.map((l, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { color: `var(--${l.color})` } }, l.line))), msg.tool === "eval" && msg.cells && /* @__PURE__ */ React.createElement("div", { className: "tool-eval" }, msg.cells.map((cell, i) => /* @__PURE__ */ React.createElement(_TC_EvalCell, { key: i, cell }))), msg.tool === "task" && msg.subagents?.length > 0 && /* @__PURE__ */ React.createElement(TaskPanel, { subagents: msg.subagents })));
}
Object.assign(window, { ToolCard, ScrubbableDiff });

})();
