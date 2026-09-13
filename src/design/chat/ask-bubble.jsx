/* chat/ask-bubble.jsx — interactive ask-tool bubble.
   Rendered when the agent emits an extension_ui_request with method="select".
   Shows the question title, clickable option chips, and a free-text input.
   Stays interactive until the user answers or the agent cancels the request. */

const { Icon: _AskIcon } = window;

// Label used by omp for the multi-select terminator — show it distinctly.
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

  return (
    <div className={`row ask fade-up${highlighted ? " mm-hot" : ""}`} data-msg-idx={idx}>
      <div className="ass-rail">
        <div className="ass-glyph ask-glyph">
          <_AskIcon name="circle" size={11} color="var(--amber)" />
        </div>
        <div className="ass-thread" />
      </div>
      <div className="ass-body">
        <div className="ass-meta">
          <span className="mono" style={{ color: "var(--amber)" }}>Ask</span>
          <span className="chip muted">{msg.time}</span>
          {msg.answered && (
            <span className="chip" style={{ color: "var(--accent)", borderColor: "color-mix(in oklab, var(--accent) 30%, var(--line))" }}>
              answered
            </span>
          )}
          {msg.cancelled && (
            <span className="chip" style={{ color: "var(--fg-4)", borderColor: "var(--line-bright)" }}>
              cancelled
            </span>
          )}
        </div>

        <div className="ask-question">{msg.title}</div>

        {msg.options.length > 0 && (
          <div className="ask-options">
            {msg.options.map((opt, i) => {
              const currentChoice = submittedVal ?? msg.answer;
              const isSelected = (msg.answered || submittedVal !== null) && currentChoice === opt;
              const isDimmed   = isDone && !isSelected;
              const isDoneTag  = isDoneOption(opt);
              return (
                <button
                  key={i}
                  type="button"
                  className={[
                    "ask-opt",
                    isSelected ? "selected" : "",
                    isDimmed   ? "dimmed"   : "",
                    isDoneTag  ? "done-opt" : "",
                  ].filter(Boolean).join(" ")}
                  disabled={isDone}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    submit(opt);
                  }}
                >
                  {isSelected && <_AskIcon name="check" size={10} color="var(--accent)" />}
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {/* Free-text input — skips the "Other (type your own)" round-trip:
            typing here sends the text directly as the select response value. */}
        <div className="ask-other">
          <input
            className="ask-other-input"
            type="text"
            placeholder="Or type your own answer…"
            value={custom}
            disabled={isDone}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={handleKey}
          />
          {!isDone && custom.trim() && (
            <button
              type="button"
              className="ask-submit"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                submit(custom.trim());
              }}
            >
              Submit
            </button>
          )}
          {/* Show custom answer inline when the user typed rather than clicked */}
          {isDone && (submittedVal || msg.answer) && !msg.options.includes(submittedVal ?? msg.answer) && (
            <span className="ask-custom-echo">{submittedVal ?? msg.answer}</span>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AskBubble });
