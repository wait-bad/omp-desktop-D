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
  const scrollRef               = React.useRef(null);
  const userHoveringRef         = React.useRef(false); // 用户是否主动向上滚动悬停查看历史
  const lastScrollTopRef        = React.useRef(0);     // 记录上次滚动位置，用于识别真实向上翻动
  const isProgrammaticScrollRef = React.useRef(false); // 标记是否为程序触发的滚动
  const prevMsgLenRef           = React.useRef(messages.length);
  const [showScrollBottom, setShowScrollBottom] = React.useState(false);
  // 监听用户鼠标滚轮交互：向上滚轮立即进入悬停保护，向下滚到底部解除保护
  const onWheel = (e) => {
    if (e.deltaY < 0) {
      // 用户主动向上滑滚轮，进入悬停保护模式
      userHoveringRef.current = true;
      setShowScrollBottom(true);
    } else if (e.deltaY > 0) {
      const el = scrollRef.current;
      if (el) {
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distFromBottom <= 100) {
          userHoveringRef.current = false;
          setShowScrollBottom(false);
        }
      }
    }
  };

  // 监听触摸滑动（触控板或触屏交互）
  const onTouchMove = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom > 120 && el.scrollTop < lastScrollTopRef.current - 5) {
      userHoveringRef.current = true;
      setShowScrollBottom(true);
    }
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const currentTop = el.scrollTop;
    const distFromBottom = el.scrollHeight - currentTop - el.clientHeight;

    if (!isProgrammaticScrollRef.current) {
      // 只有在用户主动向上拖动滚动条（scrollTop 明确减小且已远离底部）时，才标记悬停
      if (currentTop < lastScrollTopRef.current - 15 && distFromBottom > 120) {
        userHoveringRef.current = true;
        setShowScrollBottom(true);
      } else if (distFromBottom <= 80) {
        // 用户滚动回到了最底部
        userHoveringRef.current = false;
        setShowScrollBottom(false);
      }
    }

    lastScrollTopRef.current = currentTop;
  };

  // 一键到底保障机制：多帧对齐保证 100% 真正到达最底部，彻底根除中途停顿
  const scrollToBottom = (smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    userHoveringRef.current = false;
    setShowScrollBottom(false);
    isProgrammaticScrollRef.current = true;

    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });

    // 追踪多帧校准：在平滑滚动或异步 DOM 排版变动后再次严密校准到底部
    let frames = 0;
    const ensureBottom = () => {
      if (!el || userHoveringRef.current) {
        isProgrammaticScrollRef.current = false;
        return;
      }
      if (el.scrollHeight - el.scrollTop - el.clientHeight > 2) {
        el.scrollTop = el.scrollHeight;
      }
      if (++frames < 18) {
        requestAnimationFrame(ensureBottom);
      } else {
        isProgrammaticScrollRef.current = false;
      }
    };
    requestAnimationFrame(ensureBottom);
  };

  // 智能自动吸底：在流式吐字或新消息到来时，只要用户没有主动向上悬停，就稳稳吸在最底部
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // 当用户发送了新消息时，无论之前是否悬停，立刻解除悬停并贴底
    if (messages.length > prevMsgLenRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.kind === "user") {
        userHoveringRef.current = false;
        setShowScrollBottom(false);
      }
    }
    prevMsgLenRef.current = messages.length;

    if (!userHoveringRef.current) {
      isProgrammaticScrollRef.current = true;
      el.scrollTop = el.scrollHeight;
      lastScrollTopRef.current = el.scrollTop;
      // 在下一帧再次确认对齐，防止刚追加的 DOM 产生次微秒级重排
      requestAnimationFrame(() => {
        if (el && !userHoveringRef.current) {
          el.scrollTop = el.scrollHeight;
          lastScrollTopRef.current = el.scrollTop;
        }
        isProgrammaticScrollRef.current = false;
      });
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
      <div className="chat-scroll selectable" ref={scrollRef} onScroll={onScroll} onWheel={onWheel} onTouchMove={onTouchMove}>
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
