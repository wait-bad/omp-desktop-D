/* Transpiled from design/chat/chat-view.jsx via esbuild — DO NOT EDIT DIRECTLY */
(function() {
const { UserBubble: _CV_UserBubble, ToolCard: _CV_ToolCard, AssistantBubble: _CV_AssistantBubble, AskBubble: _CV_AskBubble, Icon: _CV_Icon } = window;
const _CV_UserBubble_M = React.memo(_CV_UserBubble);
const _CV_ToolCard_M = React.memo(_CV_ToolCard);
const _CV_AssistantBubble_M = React.memo(_CV_AssistantBubble);
const _CV_AskBubble_M = React.memo(_CV_AskBubble);
const CompactRow = React.memo(function CompactRow2({ msg }) {
  const [open, setOpen] = React.useState(false);
  const pending = msg.status === "pending";
  const error = msg.status === "error";
  const COLOR = error ? "var(--rose)" : "var(--lilac)";
  const fmtTok = (n) => n == null ? null : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n);
  const tok = fmtTok(msg.tokensBefore);
  const hasBody = !!msg.summary && !pending && !error;
  return /* @__PURE__ */ React.createElement("div", { className: "row tool fade-up" }, /* @__PURE__ */ React.createElement("div", { className: "ass-rail" }, /* @__PURE__ */ React.createElement("div", { className: "tool-glyph", style: { borderColor: COLOR, color: COLOR } }, /* @__PURE__ */ React.createElement(_CV_Icon, { name: error ? "warn" : "context", size: 11, color: COLOR })), /* @__PURE__ */ React.createElement("div", { className: "ass-thread" })), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `tool-card ${pending ? "running" : "ok"}`,
      style: error ? { borderColor: "color-mix(in oklab, var(--rose) 35%, var(--line-bright))" } : {}
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "tool-card-head",
        style: { cursor: hasBody ? "pointer" : "default" },
        onClick: () => hasBody && setOpen((o) => !o)
      },
      /* @__PURE__ */ React.createElement("span", { className: "tool-tag", style: {
        color: COLOR,
        background: `color-mix(in oklab, ${COLOR} 14%, transparent)`,
        borderColor: `color-mix(in oklab, ${COLOR} 30%, var(--line))`
      } }, "compact"),
      /* @__PURE__ */ React.createElement("span", { className: "tool-title" }, pending ? "compacting context\u2026" : error ? "compaction failed" : msg.shortSummary || "context compacted"),
      /* @__PURE__ */ React.createElement("div", { className: "tool-card-spacer" }),
      pending && /* @__PURE__ */ React.createElement("span", { className: "chip accent", style: { animation: "pulseDot 1.4s infinite" } }, /* @__PURE__ */ React.createElement("span", { className: "dot live" }), " ", "running"),
      !pending && !error && tok && /* @__PURE__ */ React.createElement("span", { className: "chip muted mono" }, tok, " before"),
      error && /* @__PURE__ */ React.createElement("span", { className: "chip", style: { color: "var(--rose)" } }, "failed"),
      hasBody && /* @__PURE__ */ React.createElement(_CV_Icon, { name: open ? "chev" : "chevR", size: 10, color: "var(--fg-4)" })
    ),
    open && hasBody && /* @__PURE__ */ React.createElement("div", { className: "compact-body selectable" }, msg.summary)
  ));
});
function ChatView({ messages, planMode, annotations, onAnnotate, hoveredMsgIdx, onAskAnswer, isWaitingFirstToken }) {
  const scrollRef = React.useRef(null);
  const userHoveringRef = React.useRef(false);
  const lastScrollTopRef = React.useRef(0);
  const isProgrammaticScrollRef = React.useRef(false);
  const prevMsgLenRef = React.useRef(messages.length);
  const [showScrollBottom, setShowScrollBottom] = React.useState(false);
  const onWheel = (e) => {
    if (e.deltaY < 0) {
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
      if (currentTop < lastScrollTopRef.current - 15 && distFromBottom > 120) {
        userHoveringRef.current = true;
        setShowScrollBottom(true);
      } else if (distFromBottom <= 80) {
        userHoveringRef.current = false;
        setShowScrollBottom(false);
      }
    }
    lastScrollTopRef.current = currentTop;
  };
  const scrollToBottom = (smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    userHoveringRef.current = false;
    setShowScrollBottom(false);
    isProgrammaticScrollRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
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
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
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
      requestAnimationFrame(() => {
        if (el && !userHoveringRef.current) {
          el.scrollTop = el.scrollHeight;
          lastScrollTopRef.current = el.scrollTop;
        }
        isProgrammaticScrollRef.current = false;
      });
    }
  }, [messages, isWaitingFirstToken]);
  let lastAsstIdx = -1;
  if (planMode) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].kind === "assistant" && !messages[i].streaming) {
        lastAsstIdx = i;
        break;
      }
    }
  }
  return /* @__PURE__ */ React.createElement("div", { style: { position: "relative", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "chat-scroll selectable", ref: scrollRef, onScroll, onWheel, onTouchMove }, /* @__PURE__ */ React.createElement("div", { className: "chat-pad" }, messages.map((m, i) => {
    const hl = hoveredMsgIdx === i;
    if (m.kind === "user") return /* @__PURE__ */ React.createElement(_CV_UserBubble_M, { key: m._id ?? i, idx: i, highlighted: hl, msg: m });
    if (m.kind === "compact") return /* @__PURE__ */ React.createElement(CompactRow, { key: m._id ?? i, msg: m });
    if (m.kind === "tool") return /* @__PURE__ */ React.createElement(_CV_ToolCard_M, { key: m._id ?? i, idx: i, highlighted: hl, msg: m });
    if (m.kind === "ask") return /* @__PURE__ */ React.createElement(_CV_AskBubble_M, { key: m._id ?? i, idx: i, highlighted: hl, msg: m, onAnswer: onAskAnswer });
    return /* @__PURE__ */ React.createElement(
      _CV_AssistantBubble_M,
      {
        key: m._id ?? i,
        idx: i,
        highlighted: hl,
        msg: m,
        annotable: i === lastAsstIdx,
        annotations,
        onAnnotate
      }
    );
  }), isWaitingFirstToken && /* @__PURE__ */ React.createElement("div", { className: "row fade-up", style: { paddingLeft: 57, alignItems: "center", gap: 10, margin: "6px 0" } }, /* @__PURE__ */ React.createElement("span", { className: "pulse-dot", style: { background: "var(--accent)", width: 6, height: 6 } }), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-3)", fontSize: "var(--d-text-xs)", letterSpacing: "0.02em" } }, "thinking...")), /* @__PURE__ */ React.createElement("div", { style: { height: 24 } }))), showScrollBottom && /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "scroll-bottom-btn fade-up",
      onClick: () => scrollToBottom(true),
      title: "Scroll to latest",
      "aria-label": "Scroll to bottom"
    },
    /* @__PURE__ */ React.createElement(_CV_Icon, { name: "chev", size: 22 })
  ));
}
Object.assign(window, { ChatView });

})();
