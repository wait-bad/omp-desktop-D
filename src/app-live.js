/* Transpiled from app-live.jsx via esbuild — DO NOT EDIT DIRECTLY */
(function() {
(function() {
  const {
    Icon,
    ChatView,
    Composer,
    CommandBridge,
    WindowChrome,
    TabBar,
    StatusBar,
    AmbientRail,
    PlanKanban,
    useTweaks,
    ModelsModal,
    HistoryModal,
    TweaksPanel,
    TweakSection,
    TweakRadio,
    TweakToggle,
    TweakColor,
    TweakSlider,
    TweakText,
    TweakImageUpload,
    INTENT_FRAMING,
    APPROVAL_PROMPT,
    useBridgeSnapshot,
    useThemeEffect,
    useCommandShortcut,
    timeNow
  } = window;
  function App() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const data = window.OMP_DATA;
    const bridge = window.OMP_BRIDGE;
    const [bridgeOpen, setBridgeOpen] = React.useState(false);
    const [bridgeView, setBridgeView] = React.useState("commands");
    const [planOpen, setPlanOpen] = React.useState(false);
    const [planMode, setPlanMode] = React.useState(false);
    const [modelsModalOpen, setModelsModalOpen] = React.useState(false);
    const [historyModalOpen, setHistoryModalOpen] = React.useState(false);
    const planStartedRef = React.useRef(false);
    const [planAnnotations, setPlanAnnotations] = React.useState({});
    const handleAnnotate = React.useCallback((idx, value) => setPlanAnnotations((prev) => {
      const next = { ...prev };
      if (value === null) delete next[idx];
      else next[idx] = value;
      return next;
    }), []);
    const [hoveredMsgIdx, setHoveredMsgIdx] = React.useState(null);
    const handleMinimapClick = (idx) => {
      const el = document.querySelector(`[data-msg-idx="${idx}"]`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    const [messages, setMessages] = React.useState([]);
    const [streaming, setStreaming] = React.useState(false);
    const [isWaitingFirstToken, setIsWaitingFirstToken] = React.useState(false);
    const [model, setModelState] = React.useState(NULL_MODEL);
    const [thinkingLevel, setThinkingLevel] = React.useState(null);
    const [ctx, setCtx] = React.useState(data.ctx);
    const [kanban, setKanban] = React.useState([]);
    const [planMeta, setPlanMeta] = React.useState(data.planMeta);
    const [models, setModels] = React.useState([]);
    const [activity, setActivity] = React.useState([]);
    const [sparkline, setSparkline] = React.useState(Array(30).fill(0));
    const [loginProviders, setLoginProviders] = React.useState(null);
    const [sessions, setSessions] = React.useState([]);
    const [activeSessionId, setActiveSessionId] = React.useState("");
    useBridgeSnapshot(bridge, {
      setMessages,
      setStreaming,
      setIsWaitingFirstToken,
      setCtx,
      setKanban,
      setPlanMeta,
      setModels,
      setActivity,
      setSparkline,
      setModelState,
      setThinkingLevel,
      setSessions,
      setActiveSessionId
    });
    useThemeEffect(t);
    useCommandShortcut(setBridgeOpen, setBridgeView);
    React.useEffect(() => {
      if (typeof window.__OMP_SPLASH_DISMISS__ === "function") {
        window.__OMP_SPLASH_DISMISS__(false);
      }
    }, []);
    React.useEffect(() => {
      if (!bridgeOpen || bridgeView !== "login") return;
      setLoginProviders(null);
      bridge?.getLoginProviders().then((data2) => setLoginProviders(data2?.providers ?? [])).catch(() => setLoginProviders([]));
    }, [bridgeOpen, bridgeView]);
    const openBridge = (view) => {
      setBridgeView(view);
      setBridgeOpen(true);
    };
    const activeProject = sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? EMPTY_PROJECT;
    const todoCounts = kanban.reduce(
      (acc, col) => {
        acc.total += col.tasks.length;
        acc.done += col.tasks.filter((tk) => tk.status === "done").length;
        return acc;
      },
      { total: 0, done: 0 }
    );
    const handleSend = (text, images) => {
      const hasAnnotations = Object.keys(planAnnotations).length > 0;
      const hasImages = Array.isArray(images) && images.length > 0;
      if (!text.trim() && !hasAnnotations && !hasImages) return;
      let msg = text.trim();
      let displayMsg = msg;
      if (planMode) {
        if (hasAnnotations) {
          const lineComments = Object.entries(planAnnotations).sort(([a], [b]) => Number(a) - Number(b)).map(([, { raw, comment }]) => {
            const quoted = raw.split("\n").map((l) => `> ${l}`).join("\n");
            return `${quoted}
\u2192 ${comment.trim()}`;
          }).join("\n\n");
          const parts = ["Line comments:\n" + lineComments, text.trim()].filter(Boolean);
          msg = parts.join("\n\n");
          displayMsg = msg;
          setPlanAnnotations({});
          planStartedRef.current = true;
        } else if (!planStartedRef.current) {
          planStartedRef.current = true;
          msg = INTENT_FRAMING(text.trim());
          displayMsg = msg;
        }
      }
      const payloadImages = hasImages ? images.map((img) => ({ data: img.data, mimeType: img.mimeType })) : void 0;
      if (bridge?.isConnected) {
        if (streaming) {
          bridge.steer(msg, displayMsg);
        } else {
          bridge.send(msg, payloadImages, displayMsg);
        }
      } else {
        setMessages((prev) => [...prev, { kind: "user", time: timeNow(), text: displayMsg, images: hasImages ? images : void 0 }]);
        setIsWaitingFirstToken(true);
      }
    };
    const handleAbort = () => {
      bridge?.abort();
      setStreaming(false);
    };
    const handlePickModel = (m) => {
      setModelState(m);
      bridge?.setModel(m);
    };
    const handleAskAnswer = React.useCallback((id, value) => {
      bridge?.answerAsk(id, value);
    }, [bridge]);
    const handlePickLogin = async (provider) => {
      if (!bridge) return;
      try {
        await bridge.login(provider.id);
        bridge.addAssistantMessage(`Logged in to **${provider.name}**.`);
      } catch (err) {
        const msg = err?.message ?? String(err);
        bridge.addAssistantMessage(`**Login failed (${provider.name}):** ${msg}`);
      }
    };
    const cycleThinking = () => bridge?.cycleThinking();
    const handleCommand = (c) => {
      if (c.name === "plan") {
        setPlanMode(true);
        planStartedRef.current = false;
      } else if (c.name === "todo") {
        setPlanOpen(true);
      } else if (c.name === "compact") {
        bridge?.compact();
      } else if (c.name === "export") {
        bridge?.exportHtml();
      } else if (c.name === "thinking") {
        cycleThinking();
      } else if (c.name === "model") {
        openBridge("models");
      } else if (c.name === "login") {
        openBridge("login");
      } else if (c.name === "settings") {
        setModelsModalOpen(true);
      } else if (c.name === "new") {
        bridge?.newSession();
      }
    };
    const handleApprovePlan = () => {
      setPlanAnnotations({});
      bridge?.followUp(APPROVAL_PROMPT);
      setPlanMode(false);
      planStartedRef.current = false;
      setPlanOpen(true);
    };
    const handleSelectTab = (id) => {
      if (id === activeSessionId) return;
      bridge?.activateSession(id);
    };
    const handleNewProject = async () => {
      if (!bridge) return;
      const path = await bridge.pickFolder();
      if (!path) return;
      await bridge.openSession(path);
    };
    const handleCloseTab = (id) => {
      bridge?.closeSession(id);
    };
    const showRail = t.layout !== "focus";
    const showSplit = t.layout === "split" && data.peer !== null;
    const safePeer = data.peer ?? NULL_PEER;
    const liveCtx = ctx ?? data.ctx;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "app-backdrop" }), /* @__PURE__ */ React.createElement("div", { className: "app" }, /* @__PURE__ */ React.createElement("div", { className: `window scanlines ${showSplit ? "is-split" : ""}` }, /* @__PURE__ */ React.createElement(
      WindowChrome,
      {
        project: activeProject,
        peer: safePeer,
        onCmd: () => setBridgeOpen(true),
        onSettings: () => setModelsModalOpen(true),
        onHistory: () => setHistoryModalOpen(true)
      }
    ), /* @__PURE__ */ React.createElement(
      TabBar,
      {
        projects: sessions,
        activeId: activeSessionId,
        onSelect: handleSelectTab,
        peer: safePeer,
        onNew: handleNewProject,
        onClose: handleCloseTab
      }
    ), /* @__PURE__ */ React.createElement("div", { className: `stage ${showRail ? "with-rail" : ""}` }, /* @__PURE__ */ React.createElement("main", { className: "session" }, /* @__PURE__ */ React.createElement(
      ChatView,
      {
        messages,
        planMode,
        annotations: planAnnotations,
        onAnnotate: handleAnnotate,
        onAskAnswer: handleAskAnswer,
        hoveredMsgIdx,
        isWaitingFirstToken
      }
    ), /* @__PURE__ */ React.createElement(
      Composer,
      {
        onSend: handleSend,
        planMode,
        onTogglePlan: () => {
          const next = !planMode;
          setPlanMode(next);
          if (!next) planStartedRef.current = false;
        },
        onOpenCmd: () => openBridge("commands"),
        onOpenModel: () => openBridge("models"),
        currentModel: model,
        thinking: thinkingLevel,
        onCycleThinking: cycleThinking,
        isStreaming: streaming,
        onAbort: handleAbort,
        onApprove: handleApprovePlan,
        annotationCount: Object.keys(planAnnotations).length,
        microcopy: data.microcopy,
        onPick: handleCommand
      }
    ), /* @__PURE__ */ React.createElement(
      StatusBar,
      {
        todoDone: todoCounts.done,
        todoTotal: todoCounts.total,
        onTodo: () => setPlanOpen(true),
        onTweaks: () => window.postMessage({ type: "__activate_edit_mode" }, "*")
      }
    )), showSplit && data.peer && /* @__PURE__ */ React.createElement(SplitPeer, { peer: data.peer }), showRail && /* @__PURE__ */ React.createElement(
      AmbientRail,
      {
        ctx: liveCtx,
        activity,
        peer: safePeer,
        messages,
        microcopy: data.microcopy,
        sparklineValues: sparkline,
        onClose: () => setTweak("layout", "focus"),
        hoveredMsgIdx,
        onMinimapHover: setHoveredMsgIdx,
        onMinimapClick: handleMinimapClick,
        showPowerMeter: t.showPowerMeter !== false,
        showAnimationStage: t.showAnimationStage !== false,
        isWorking: streaming || isWaitingFirstToken,
        stageStaticImg: t.stageStaticImg || "",
        stageActiveVideo: t.stageActiveVideo || "",
        stageRatioMode: t.stageRatioMode || "auto"
      }
    )))), /* @__PURE__ */ React.createElement(
      CommandBridge,
      {
        open: bridgeOpen,
        initialView: bridgeView,
        onClose: () => setBridgeOpen(false),
        onPick: handleCommand,
        onPickModel: handlePickModel,
        onPickLogin: handlePickLogin,
        loginProviders,
        currentModelId: model.id
      }
    ), planOpen && /* @__PURE__ */ React.createElement(
      PlanKanban,
      {
        kanban,
        planMeta,
        onClose: () => setPlanOpen(false),
        onAbort: handleAbort
      }
    ), /* @__PURE__ */ React.createElement(TweaksPanel, { title: "Tweaks", noDeckControls: true }, /* @__PURE__ */ React.createElement(TweakSection, { label: "Look" }, /* @__PURE__ */ React.createElement(
      TweakRadio,
      {
        label: "theme",
        value: t.theme,
        options: [
          { label: "aurora", value: "aurora" },
          { label: "phosphor", value: "phosphor" },
          { label: "daylight", value: "daylight" }
        ],
        onChange: (v) => setTweak({
          theme: v,
          accent: v === "aurora" ? "#8AF0C8" : v === "phosphor" ? "#C4FF3F" : "#1F8A5B"
        })
      }
    ), /* @__PURE__ */ React.createElement(
      TweakRadio,
      {
        label: "density",
        value: t.density,
        options: [
          { label: "cozy", value: "cozy" },
          { label: "compact", value: "compact" },
          { label: "dense", value: "dense" }
        ],
        onChange: (v) => setTweak("density", v)
      }
    ), /* @__PURE__ */ React.createElement(
      TweakColor,
      {
        label: "accent",
        value: t.accent,
        options: ["#8AF0C8", "#6EE7FF", "#FF7AC6", "#FFC56E", "#B59BFF", "#C4FF3F"],
        onChange: (v) => setTweak("accent", v)
      }
    ), /* @__PURE__ */ React.createElement(
      TweakToggle,
      {
        label: "mono chat font",
        value: t.monoChat,
        onChange: (v) => setTweak("monoChat", v)
      }
    ), /* @__PURE__ */ React.createElement(
      TweakSlider,
      {
        label: "font size",
        value: t.fontSize ?? 100,
        min: 75,
        max: 150,
        step: 5,
        unit: "%",
        onChange: (v) => setTweak("fontSize", v)
      }
    ), /* @__PURE__ */ React.createElement(
      TweakImageUpload,
      {
        label: "Background Image",
        value: t.bgImage ?? "",
        onChange: (v) => setTweak("bgImage", v)
      }
    ), t.bgImage && /* @__PURE__ */ React.createElement(
      TweakSlider,
      {
        label: "BG Opacity",
        value: t.bgOpacity ?? 60,
        min: 10,
        max: 100,
        step: 5,
        unit: "%",
        onChange: (v) => setTweak("bgOpacity", v)
      }
    )), /* @__PURE__ */ React.createElement(TweakSection, { label: "Layout" }, /* @__PURE__ */ React.createElement(
      TweakRadio,
      {
        label: "layout",
        value: t.layout,
        options: [
          { label: "rail", value: "rail" },
          { label: "split", value: "split" },
          { label: "focus", value: "focus" }
        ],
        onChange: (v) => setTweak("layout", v)
      }
    )), /* @__PURE__ */ React.createElement(TweakSection, { label: "API & Models" }, /* @__PURE__ */ React.createElement("div", { style: { padding: "4px 12px" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn primary",
        style: { width: "100%", justifyContent: "center" },
        onClick: () => setModelsModalOpen(true)
      },
      "Configure API / Providers"
    ))), /* @__PURE__ */ React.createElement(TweakSection, { label: "Persona (Display Only)" }, /* @__PURE__ */ React.createElement(
      TweakText,
      {
        label: "User Name",
        value: t.userName ?? "you",
        placeholder: "e.g. Master, Alice",
        onChange: (v) => setTweak("userName", v)
      }
    ), /* @__PURE__ */ React.createElement(
      TweakImageUpload,
      {
        label: "User Avatar",
        value: t.userAvatar ?? "",
        onChange: (v) => setTweak("userAvatar", v)
      }
    ), /* @__PURE__ */ React.createElement(
      TweakText,
      {
        label: "AI Name",
        value: t.aiName ?? "OMP",
        placeholder: "e.g. \u53EF\u8482\u4E1D, Assistant",
        onChange: (v) => setTweak("aiName", v)
      }
    ), /* @__PURE__ */ React.createElement(
      TweakImageUpload,
      {
        label: "AI Avatar",
        value: t.aiAvatar ?? "",
        onChange: (v) => setTweak("aiAvatar", v)
      }
    ))), /* @__PURE__ */ React.createElement(
      ModelsModal,
      {
        isOpen: modelsModalOpen,
        onClose: () => setModelsModalOpen(false),
        tweaks: t,
        setTweak
      }
    ), /* @__PURE__ */ React.createElement(
      HistoryModal,
      {
        isOpen: historyModalOpen,
        onClose: () => setHistoryModalOpen(false),
        onResumeSession: async (session) => {
          try {
            await bridge.resumeSession(session.path, "", session.title);
          } catch (e) {
            alert("Failed to resume session: " + e);
          }
        }
      }
    ));
  }
  ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
})();

})();
