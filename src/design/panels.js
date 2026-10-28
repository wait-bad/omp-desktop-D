/* Transpiled from design/panels.jsx via esbuild — DO NOT EDIT DIRECTLY */
(function() {
const { Icon, TOOL_META } = window;
function PhasePill({ phase }) {
  const map = {
    running: { color: "var(--cyan)", icon: "play", label: "running" },
    done: { color: "var(--accent)", icon: "check", label: "done" }
  };
  const m = map[phase] ?? map.running;
  return /* @__PURE__ */ React.createElement("span", { className: "chip", style: {
    color: m.color,
    borderColor: `color-mix(in oklab, ${m.color} 35%, var(--line))`,
    background: `color-mix(in oklab, ${m.color} 12%, transparent)`
  } }, /* @__PURE__ */ React.createElement(Icon, { name: m.icon, size: 9, color: m.color }), " ", m.label);
}
function PlanKanban({ kanban, planMeta, onClose, onAbort }) {
  const total = kanban.reduce((n, c) => n + c.tasks.length, 0);
  const done = kanban.reduce((n, c) => n + c.tasks.filter((t) => t.status === "done").length, 0);
  const inProg = kanban.reduce((n, c) => n + c.tasks.filter((t) => t.status === "in_progress").length, 0);
  const allDone = total > 0 && done === total;
  const phase = allDone ? "done" : "running";
  return /* @__PURE__ */ React.createElement("div", { className: "kanban-scrim", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: "kanban slide-in", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "kanban-head" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement(Icon, { name: "plan", size: 16, color: "var(--accent)" }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "var(--d-text-lg)", fontWeight: 600 } }, phase === "done" ? "plan complete" : "executing plan"), /* @__PURE__ */ React.createElement(PhasePill, { phase }), /* @__PURE__ */ React.createElement("span", { className: "chip muted mono" }, done, "/", total, inProg ? ` \xB7 ${inProg} live` : "")), planMeta?.ask && /* @__PURE__ */ React.createElement("div", { className: "plan-ask selectable" }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-4)" } }, "ask \xA0"), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-2)" } }, planMeta.ask))), /* @__PURE__ */ React.createElement("button", { className: "btn ghost icon", onClick: onClose, title: "close (esc)" }, /* @__PURE__ */ React.createElement(Icon, { name: "close", size: 11 }))), planMeta?.risks?.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "plan-risks" }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--amber)" } }, "risks"), planMeta.risks.map((r, i) => /* @__PURE__ */ React.createElement("span", { key: i, className: "chip", style: {
    color: `var(--${r.tone})`,
    borderColor: `color-mix(in oklab, var(--${r.tone}) 30%, var(--line))`,
    background: `color-mix(in oklab, var(--${r.tone}) 8%, transparent)`
  } }, r.text))), /* @__PURE__ */ React.createElement("div", { className: "kanban-progress" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "kanban-progress-fill",
      style: { width: total ? `${done / total * 100}%` : "0%" }
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "kanban-cols" }, kanban.length > 0 ? kanban.map((col, idx) => /* @__PURE__ */ React.createElement(KanbanCol, { key: col.id, col, idx, mode: phase })) : /* @__PURE__ */ React.createElement("div", { style: { padding: "32px 24px", color: "var(--fg-4)", fontFamily: "var(--font-mono)", fontSize: "var(--d-text-sm)" } }, "waiting for agent to write tasks\u2026")), /* @__PURE__ */ React.createElement("div", { className: "kanban-foot mono" }, phase === "running" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-4)" } }, "agent is executing the plan"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement("button", { className: "btn danger", onClick: onAbort }, /* @__PURE__ */ React.createElement(Icon, { name: "stop", size: 10 }), " abort")), phase === "done" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: { color: "var(--accent)" } }, "plan complete \xB7 ", done, "/", total, " tasks shipped"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: onClose }, "close")))));
}
function KanbanCol({ col, idx, mode }) {
  const colDone = col.tasks.filter((t) => t.status === "done").length;
  return /* @__PURE__ */ React.createElement("div", { className: "kanban-col" }, /* @__PURE__ */ React.createElement("div", { className: "kanban-col-head" }, /* @__PURE__ */ React.createElement("span", { className: "kanban-col-mark", style: { background: `var(--${col.tone})` } }), /* @__PURE__ */ React.createElement(Icon, { name: col.icon, size: 11, color: `var(--${col.tone})` }), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg)", fontWeight: 600 } }, col.title), /* @__PURE__ */ React.createElement("span", { className: "chip muted" }, colDone, "/", col.tasks.length)), col.tasks.map((t, i) => /* @__PURE__ */ React.createElement(KanbanCard, { key: t.id, task: t, idx: idx * 8 + i, mode })));
}
function KanbanCard({ task, idx, mode }) {
  const [open, setOpen] = React.useState(false);
  const tone = task.status === "done" ? "ok" : task.status === "in_progress" ? "live" : "pending";
  const tmeta = TOOL_META[task.tool] || { color: "var(--fg-3)", icon: "circle", label: task.tool };
  const effortColor = task.effort === "L" ? "var(--rose)" : task.effort === "M" ? "var(--amber)" : "var(--fg-3)";
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `kcard ${tone} fade-up ${open ? "open" : ""}`,
      style: { animationDelay: `${idx * 30}ms` },
      onClick: () => setOpen((v) => !v)
    },
    /* @__PURE__ */ React.createElement("div", { className: "kcard-head" }, task.status === "done" && /* @__PURE__ */ React.createElement("span", { className: "kcard-mark ok" }, /* @__PURE__ */ React.createElement(Icon, { name: "check", size: 10 })), task.status === "in_progress" && /* @__PURE__ */ React.createElement("span", { className: "kcard-mark live" }, /* @__PURE__ */ React.createElement("span", { className: "pulse-dot" })), task.status === "pending" && /* @__PURE__ */ React.createElement("span", { className: "kcard-mark pending" }, "\u25CB"), /* @__PURE__ */ React.createElement("span", { className: "kcard-text selectable" }, task.text)),
    /* @__PURE__ */ React.createElement("div", { className: "kcard-tags" }, /* @__PURE__ */ React.createElement("span", { className: "chip mono", style: {
      color: tmeta.color,
      borderColor: `color-mix(in oklab, ${tmeta.color} 30%, var(--line))`,
      background: `color-mix(in oklab, ${tmeta.color} 10%, transparent)`
    } }, /* @__PURE__ */ React.createElement(Icon, { name: tmeta.icon, size: 9, color: tmeta.color }), " ", tmeta.label), task.effort && /* @__PURE__ */ React.createElement("span", { className: "chip mono", style: { color: effortColor, borderColor: `color-mix(in oklab, ${effortColor} 30%, var(--line))` } }, task.effort), task.file && /* @__PURE__ */ React.createElement("span", { className: "chip mono muted", style: { overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 } }, /* @__PURE__ */ React.createElement(Icon, { name: "file", size: 9, color: "var(--fg-4)" }), task.file)),
    open && task.reason && /* @__PURE__ */ React.createElement("div", { className: "kcard-why selectable" }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-4)" } }, "// why \xA0"), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-3)", fontStyle: "italic" } }, task.reason)),
    mode === "running" && task.status === "in_progress" && /* @__PURE__ */ React.createElement("div", { className: "kcard-live mono" }, /* @__PURE__ */ React.createElement("span", { className: "dot live" }), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--cyan)" } }, "agent is here"), /* @__PURE__ */ React.createElement("span", { className: "shimmer-text", style: { marginLeft: "auto" } }, "writing patch\u2026"))
  );
}
Object.assign(window, { PlanKanban });

})();
