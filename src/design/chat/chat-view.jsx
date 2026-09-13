/* chat/chat-view.jsx — top-level chat surface. Handles auto-scroll to
   bottom when new messages land, and routes each message to the right
   bubble component. The minimap-hover cross-highlight (mm-hot) flows
   through here via the `hoveredMsgIdx` prop. */

const { UserBubble: _CV_UserBubble, ToolCard: _CV_ToolCard, AssistantBubble: _CV_AssistantBubble, AskBubble: _CV_AskBubble, Icon: _CV_Icon } = window;

// ── Per-bubble memo wrappers ────────────────────────────────────────────────
// Primary streaming-perf win: only the live tail (new object ref per
// message_update) re-renders; stable messages bail out automatically.
// Created once at module load — React.memo returns a stable component type.
const _CV_UserBubble_M      = React.memo(_CV_UserBubble);
const _CV_ToolCard_M        = React.memo(_CV_ToolCard);
const _CV_AssistantBubble_M = React.memo(_CV_AssistantBubble);
const _CV_AskBubble_M       = React.memo(_CV_AskBubble);

const CompactRow = React.memo(function CompactRow({ msg }) {
  const [open, setOpen] = React.useState(false);
  const pending  = msg.status === "pending";
  const error    = msg.status === "error";
  const COLOR    = error ? "var(--rose)" : "var(--lilac)";
  const fmtTok   = n => n == null ? null
    : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000     ? `${(n / 1_000).toFixed(1)}k`
    : String(n);
  const tok      = fmtTok(msg.tokensBefore);
  const hasBody  = !!msg.summary && !pending && !error;

  return (
    <div className="row tool fade-up">
      <div className="ass-rail">
        <div className="tool-glyph" style={{ borderColor: COLOR, color: COLOR }}>
          <_CV_Icon name={error ? "warn" : "context"} size={11} color={COLOR} />
        </div>
        <div className="ass-thread" />
      </div>
      <div className={`tool-card ${pending ? "running" : "ok"}`}
        style={error ? { borderColor: "color-mix(in oklab, var(--rose) 35%, var(--line-bright))" } : {}}>
        <div className="tool-card-head"
          style={{ cursor: hasBody ? "pointer" : "default" }}
          onClick={() => hasBody && setOpen(o => !o)}>
          <span className="tool-tag" style={{
            color: COLOR,
            background: `color-mix(in oklab, ${COLOR} 14%, transparent)`,
            borderColor: `color-mix(in oklab, ${COLOR} 30%, var(--line))`,
          }}>compact</span>
          <span className="tool-title">
            {pending ? "compacting context\u2026"
              : error   ? "compaction failed"
              : (msg.shortSummary || "context compacted")}
          </span>
          <div className="tool-card-spacer" />
          {pending && (
            <span className="chip accent" style={{ animation: "pulseDot 1.4s infinite" }}>
              <span className="dot live" />{" "}running
            </span>
          )}
          {!pending && !error && tok && (
            <span className="chip muted mono">{tok} before</span>
          )}
          {error && <span className="chip" style={{ color: "var(--rose)" }}>failed</span>}
          {hasBody && <_CV_Icon name={open ? "chev" : "chevR"} size={10} color="var(--fg-4)" />}
        </div>
        {open && hasBody && (
          <div className="compact-body selectable">
            {msg.summary}
          </div>
        )}
      </div>
    </div>
  );
});

function ChatView({ messages, planMode, annotations, onAnnotate, hoveredMsgIdx, onAskAnswer, isWaitingFirstToken }) {
  const scrollRef    = React.useRef(null);
  const atBottomRef  = React.useRef(true);   // track whether user is at bottom
  const [showScrollBottom, setShowScrollBottom] = React.useState(false);

  // Track whether user is near the bottom with rAF throttling for 60fps scrolling
  const scrollRafRef = React.useRef(null);
  const onScroll = () => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = scrollRef.current;
      if (!el) return;
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      atBottomRef.current = isAtBottom;
      setShowScrollBottom(!isAtBottom);
    });
  };
  const scrollToBottom = (smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = true;
    setShowScrollBottom(false);
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };

  // Only auto-scroll if user is ALREADY at the bottom.
  // Never pull user down when they are inspecting history.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isWaitingFirstToken]);

  // Only the last completed assistant message is annotatable in plan mode
  let lastAsstIdx = -1;
  if (planMode) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].kind === "assistant" && !messages[i].streaming) { lastAsstIdx = i; break; }
    }
  }

  return (
    <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div className="chat-scroll selectable" ref={scrollRef} onScroll={onScroll}>
        <div className="chat-pad">
          {messages.map((m, i) => {
            const hl = hoveredMsgIdx === i;
            if (m.kind === "user")    return <_CV_UserBubble_M    key={m._id ?? i} idx={i} highlighted={hl} msg={m} />;
            if (m.kind === "compact") return <CompactRow          key={m._id ?? i} msg={m} />;
            if (m.kind === "tool")    return <_CV_ToolCard_M      key={m._id ?? i} idx={i} highlighted={hl} msg={m} />;
            if (m.kind === "ask")     return <_CV_AskBubble_M     key={m._id ?? i} idx={i} highlighted={hl} msg={m} onAnswer={onAskAnswer} />;
            return <_CV_AssistantBubble_M key={m._id ?? i} idx={i} highlighted={hl} msg={m}
              annotable={i === lastAsstIdx}
              annotations={annotations}
              onAnnotate={onAnnotate} />;
          })}
          {isWaitingFirstToken && (
            <div className="row fade-up" style={{ paddingLeft: 57, alignItems: "center", gap: 10, margin: "6px 0" }}>
              <span className="pulse-dot" style={{ background: "var(--accent)", width: 6, height: 6 }} />
              <span className="mono" style={{ color: "var(--fg-3)", fontSize: "var(--d-text-xs)", letterSpacing: "0.02em" }}>
                thinking...
              </span>
            </div>
          )}
          <div style={{ height: 24 }} />
        </div>
      </div>

      {showScrollBottom && (
        <button
          className="scroll-bottom-btn fade-up"
          onClick={() => scrollToBottom(true)}
          title="Scroll to latest"
          aria-label="Scroll to bottom"
        >
          <_CV_Icon name="chev" size={22} />
        </button>
      )}
    </div>
  );
}

Object.assign(window, { ChatView });
