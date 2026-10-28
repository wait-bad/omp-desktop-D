/* Transpiled from design/chat/eval-cell.jsx via esbuild — DO NOT EDIT DIRECTLY */
(function() {
function EvalCell({ cell }) {
  const done = cell.status === "complete" || cell.status === "error";
  const lang = cell.language === "py" ? "python" : "javascript";
  const codeHtml = React.useMemo(() => {
    if (!done || !cell.code || !window.hljs) return null;
    try {
      return window.hljs.highlight(cell.code.trimEnd(), { language: lang }).value;
    } catch (_) {
      return null;
    }
  }, [done, cell.code, lang]);
  return /* @__PURE__ */ React.createElement("div", { className: `eval-cell eval-${cell.status}` }, /* @__PURE__ */ React.createElement("div", { className: "eval-cell-head mono" }, /* @__PURE__ */ React.createElement("span", { className: "eval-lang" }, cell.language), cell.title && /* @__PURE__ */ React.createElement("span", { className: "eval-title" }, cell.title), cell.durationMs != null ? /* @__PURE__ */ React.createElement("span", { className: "eval-dur", style: { marginLeft: "auto" } }, cell.durationMs, "ms") : cell.status === "running" && /* @__PURE__ */ React.createElement("span", { className: "shimmer-text", style: { marginLeft: "auto", fontSize: 10 } }, "running\u2026")), cell.code && (codeHtml ? /* @__PURE__ */ React.createElement("pre", { className: "eval-code selectable" }, /* @__PURE__ */ React.createElement(
    "code",
    {
      className: `hljs language-${lang}`,
      dangerouslySetInnerHTML: { __html: codeHtml }
    }
  )) : /* @__PURE__ */ React.createElement("pre", { className: "eval-code selectable mono" }, cell.code.trimEnd())), cell.output && /* @__PURE__ */ React.createElement("pre", { className: `eval-output selectable mono${cell.status === "error" ? " eval-error" : ""}` }, cell.output.trimEnd()));
}
Object.assign(window, { EvalCell });

})();
