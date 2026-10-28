/* Transpiled from design/chat/ask-bubble.jsx via esbuild — DO NOT EDIT DIRECTLY */
(function() {
const { Icon: _AskIcon } = window;
const DONE_LABEL_PREFIX = "Done selecting";
function isDoneOption(opt) {
  return opt.includes(DONE_LABEL_PREFIX);
}
function AskBubble({ msg, idx, highlighted, onAnswer }) {
  const [custom, setCustom] = React.useState("");
  const done = msg.answered || msg.cancelled;
  const [submittedVal, setSubmittedVal] = React.useState(null);
  const isDone = done || submittedVal !== null;
  const submit = (value) => {
    if (isDone) return;
    setSubmittedVal(value);
    onAnswer(msg.id, value);
  };
  const handleKey = (e) => {
    if (e.key === "Enter" && custom.trim()) {
      e.preventDefault();
      submit(custom.trim());
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: `row ask fade-up${highlighted ? " mm-hot" : ""}`, "data-msg-idx": idx }, /* @__PURE__ */ React.createElement("div", { className: "ass-rail" }, /* @__PURE__ */ React.createElement("div", { className: "ass-glyph ask-glyph" }, /* @__PURE__ */ React.createElement(_AskIcon, { name: "circle", size: 11, color: "var(--amber)" })), /* @__PURE__ */ React.createElement("div", { className: "ass-thread" })), /* @__PURE__ */ React.createElement("div", { className: "ass-body" }, /* @__PURE__ */ React.createElement("div", { className: "ass-meta" }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--amber)" } }, "Ask"), /* @__PURE__ */ React.createElement("span", { className: "chip muted" }, msg.time), msg.answered && /* @__PURE__ */ React.createElement("span", { className: "chip", style: { color: "var(--accent)", borderColor: "color-mix(in oklab, var(--accent) 30%, var(--line))" } }, "answered"), msg.cancelled && /* @__PURE__ */ React.createElement("span", { className: "chip", style: { color: "var(--fg-4)", borderColor: "var(--line-bright)" } }, "cancelled")), /* @__PURE__ */ React.createElement("div", { className: "ask-question" }, msg.title), msg.options.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "ask-options" }, msg.options.map((opt, i) => {
    const currentChoice = submittedVal ?? msg.answer;
    const isSelected = (msg.answered || submittedVal !== null) && currentChoice === opt;
    const isDimmed = isDone && !isSelected;
    const isDoneTag = isDoneOption(opt);
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: i,
        type: "button",
        className: [
          "ask-opt",
          isSelected ? "selected" : "",
          isDimmed ? "dimmed" : "",
          isDoneTag ? "done-opt" : ""
        ].filter(Boolean).join(" "),
        disabled: isDone,
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          submit(opt);
        }
      },
      isSelected && /* @__PURE__ */ React.createElement(_AskIcon, { name: "check", size: 10, color: "var(--accent)" }),
      opt
    );
  })), /* @__PURE__ */ React.createElement("div", { className: "ask-other" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      className: "ask-other-input",
      type: "text",
      placeholder: "Or type your own answer\u2026",
      value: custom,
      disabled: isDone,
      onChange: (e) => setCustom(e.target.value),
      onKeyDown: handleKey
    }
  ), !isDone && custom.trim() && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "ask-submit",
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        submit(custom.trim());
      }
    },
    "Submit"
  ), isDone && (submittedVal || msg.answer) && !msg.options.includes(submittedVal ?? msg.answer) && /* @__PURE__ */ React.createElement("span", { className: "ask-custom-echo" }, submittedVal ?? msg.answer))));
}
Object.assign(window, { AskBubble });

})();
