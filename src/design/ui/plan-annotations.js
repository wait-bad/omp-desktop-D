/* Transpiled from design/ui/plan-annotations.jsx via esbuild — DO NOT EDIT DIRECTLY */
(function() {
const { Icon: _PA_Icon } = window;
function segmentPlan(text) {
  if (!text) return [];
  try {
    if (!window.marked) throw new Error("no marked");
    const tokens = window.marked.lexer(text);
    return tokens.filter((t) => t.type !== "space").map((t, i) => ({ index: i, kind: t.type, raw: t.raw ?? "", html: window.marked.parser([t]) }));
  } catch {
    return [{ index: 0, kind: "paragraph", raw: text, html: `<pre>${text.replace(/</g, "&lt;")}</pre>` }];
  }
}
const CommentForm = ({ block, initial, onSave, onCancel }) => {
  const [text, setText] = React.useState(initial);
  const ref = React.useRef(null);
  React.useEffect(() => {
    ref.current?.focus();
  }, []);
  return /* @__PURE__ */ React.createElement("div", { className: "plan-comment-form" }, /* @__PURE__ */ React.createElement("div", { className: "plan-comment-form-quote mono" }, block.raw.split("\n")[0].trim().slice(0, 80), block.raw.length > 80 ? "\u2026" : ""), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      ref,
      className: "plan-comment-form-area",
      value: text,
      placeholder: "your comment\u2026",
      onChange: (e) => setText(e.target.value),
      onKeyDown: (e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onSave(text.trim());
        }
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "plan-comment-form-foot" }, initial && /* @__PURE__ */ React.createElement("button", { className: "btn ghost", style: { color: "var(--rose)" }, onClick: () => onSave(null) }, /* @__PURE__ */ React.createElement(_PA_Icon, { name: "trash", size: 9 }), " remove"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement("button", { className: "btn ghost", onClick: onCancel }, "cancel"), /* @__PURE__ */ React.createElement("button", { className: "btn outlined", onClick: () => onSave(text.trim()), disabled: !text.trim() && !initial }, "save ", /* @__PURE__ */ React.createElement("span", { className: "kbd", style: { marginLeft: 2 } }, "\u2318\u21B5"))));
};
const AnnotablePlan = ({ text, annotations, onAnnotate }) => {
  const [selectedBlock, setSelectedBlock] = React.useState(null);
  const blocks = React.useMemo(() => segmentPlan(text), [text]);
  if (blocks.length === 0) return /* @__PURE__ */ React.createElement("div", { className: "md-content selectable", style: { color: "var(--fg-4)", fontFamily: "var(--font-mono)", fontSize: "var(--d-text-sm)" } }, "(no plan content yet)");
  return /* @__PURE__ */ React.createElement("div", { className: "plan-annot-blocks" }, blocks.map((block) => {
    const ann = annotations[block.index];
    const isOpen = selectedBlock === block.index;
    const isHr = block.kind === "hr";
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: block.index,
        className: `plan-block${isOpen ? " is-selected" : ""}${ann ? " has-comment" : ""}`
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "plan-block-body md-content selectable",
          dangerouslySetInnerHTML: { __html: block.html }
        }
      ),
      !isHr && /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "plan-block-add",
          title: ann ? "edit comment" : "add comment",
          onClick: () => setSelectedBlock(isOpen ? null : block.index)
        },
        ann ? /* @__PURE__ */ React.createElement(_PA_Icon, { name: "edit", size: 9, color: "var(--amber)" }) : /* @__PURE__ */ React.createElement(_PA_Icon, { name: "plus", size: 9, color: "var(--fg-3)" })
      ),
      ann && !isOpen && /* @__PURE__ */ React.createElement("div", { className: "plan-comment-chip", onClick: () => setSelectedBlock(block.index) }, /* @__PURE__ */ React.createElement(_PA_Icon, { name: "edit", size: 8, color: "var(--lilac)" }), /* @__PURE__ */ React.createElement("span", null, ann.comment)),
      isOpen && /* @__PURE__ */ React.createElement(
        CommentForm,
        {
          block,
          initial: ann?.comment ?? "",
          onSave: (comment) => {
            onAnnotate(block.index, comment ? { raw: block.raw, comment } : null);
            setSelectedBlock(null);
          },
          onCancel: () => setSelectedBlock(null)
        }
      )
    );
  }));
};
Object.assign(window, { AnnotablePlan, segmentPlan });

})();
