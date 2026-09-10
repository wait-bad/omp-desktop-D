/* ═════════════════════════════════════════════════════════════════════
   app-live.jsx — live-wired root. Replaces design/app.jsx.

   Session model: each tab owns one omp process. OMP_BRIDGE manages
   session lifecycle; the tab list and active session come from the
   bridge (snap.sessions / snap.activeSessionId). Switching tabs calls
   bridge.activateSession() which resets ALL per-session state and
   re-fetches from omp — so the right panel (sparkline, activity radar,
   minimap, kanban, context gauge) always reflects the active session.

   Constants and the cross-cutting effects (bridge subscription, theme,
   ⌘K shortcut) live in app/constants.js and app/use-bridge-snapshot.jsx
   respectively. This file owns only the App component itself: state
   declarations, handlers, and the render tree.
   ═════════════════════════════════════════════════════════════════════ */

(function () {
  const {
    Icon, ChatView, Composer, CommandBridge, WindowChrome, TabBar,
    StatusBar, AmbientRail, PlanKanban, useTweaks, ModelsModal, HistoryModal,
    TweaksPanel, TweakSection, TweakRadio, TweakToggle, TweakColor, TweakSlider, TweakText, TweakImageUpload,
    INTENT_FRAMING, APPROVAL_PROMPT,
    useBridgeSnapshot, useThemeEffect, useCommandShortcut, timeNow,
  } = window;
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const data          = window.OMP_DATA;
  const bridge        = window.OMP_BRIDGE;

  // ── UI state ──────────────────────────────────────────────────────────────
  const [bridgeOpen, setBridgeOpen] = React.useState(false);
  const [bridgeView, setBridgeView] = React.useState("commands");
  const [planOpen,   setPlanOpen]   = React.useState(false);
  const [planMode,   setPlanMode]   = React.useState(false);
  const [modelsModalOpen, setModelsModalOpen] = React.useState(false);
  const [historyModalOpen, setHistoryModalOpen] = React.useState(false);
  const planStartedRef = React.useRef(false); // true after first send in plan mode
  const [planAnnotations, setPlanAnnotations] = React.useState({});
  const handleAnnotate = React.useCallback((idx, value) => setPlanAnnotations(prev => {
    const next = { ...prev };
    if (value === null) delete next[idx]; else next[idx] = value;
    return next;
  }), []);

  // Cross-component highlight: hovering a minimap cell lights up the
  // matching chat bubble; clicking scrolls to it.
  const [hoveredMsgIdx, setHoveredMsgIdx] = React.useState(null);
  const handleMinimapClick = (idx) => {
    const el = document.querySelector(`[data-msg-idx="${idx}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  // ── Live data (all per-session — driven by OMP_BRIDGE.onUpdate) ───────────
  const [messages,            setMessages]            = React.useState([]);
  const [streaming,           setStreaming]           = React.useState(false);
  const [isWaitingFirstToken, setIsWaitingFirstToken] = React.useState(false);
  const [model,               setModelState]          = React.useState(NULL_MODEL);
  const [thinkingLevel, setThinkingLevel] = React.useState(null);
  const [ctx,           setCtx]           = React.useState(data.ctx);
  const [kanban,        setKanban]        = React.useState([]);
  const [planMeta,      setPlanMeta]      = React.useState(data.planMeta);
  const [models,        setModels]        = React.useState([]);
  const [activity,      setActivity]      = React.useState([]);
  const [sparkline,     setSparkline]     = React.useState(Array(30).fill(0));
  const [loginProviders, setLoginProviders] = React.useState(null);

  // ── Tab list — driven by bridge session registry ──────────────────────────
  // Each entry: { id, name, path, color, branch }
  const [sessions,        setSessions]        = React.useState([]);
  const [activeSessionId, setActiveSessionId] = React.useState("");

  // ── Cross-cutting effects (bridge subscription, theme, ⌘K) ────────────────
  useBridgeSnapshot(bridge, {
    setMessages, setStreaming, setIsWaitingFirstToken, setCtx, setKanban, setPlanMeta,
    setModels, setActivity, setSparkline,
    setModelState, setThinkingLevel,
    setSessions, setActiveSessionId,
  });
  useThemeEffect(t);
  useCommandShortcut(setBridgeOpen, setBridgeView);

  // Fetch OAuth providers whenever the login view opens (ensures fresh auth status)
  React.useEffect(() => {
    if (!bridgeOpen || bridgeView !== "login") return;
    setLoginProviders(null);
    bridge?.getLoginProviders()
      .then(data => setLoginProviders(data?.providers ?? []))
      .catch(() => setLoginProviders([]));
  }, [bridgeOpen, bridgeView]);

  const openBridge = view => { setBridgeView(view); setBridgeOpen(true); };

  // ── Derived values ────────────────────────────────────────────────────────
  const activeProject = sessions.find(s => s.id === activeSessionId) ?? sessions[0] ?? EMPTY_PROJECT;
  const todoCounts    = kanban.reduce(
    (acc, col) => {
      acc.total += col.tasks.length;
      acc.done  += col.tasks.filter(tk => tk.status === "done").length;
      return acc;
    },
    { total: 0, done: 0 }
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSend = text => {
    const hasAnnotations = Object.keys(planAnnotations).length > 0;
    if (!text.trim() && !hasAnnotations) return;
    let msg = text.trim();
    let displayMsg = msg; // Text to show in the UI user message bubble
    if (planMode) {
      if (hasAnnotations) {
        // Feedback with block comments — always takes priority over intent framing
        const lineComments = Object.entries(planAnnotations)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([, { raw, comment }]) => {
            const quoted = raw.split('\n').map(l => `> ${l}`).join('\n');
            return `${quoted}\n→ ${comment.trim()}`;
          }).join('\n\n');
        const parts = ['Line comments:\n' + lineComments, text.trim()].filter(Boolean);
        msg = parts.join('\n\n');
        displayMsg = msg;
        setPlanAnnotations({});
        planStartedRef.current = true; // annotations imply plan is already in progress
      } else if (!planStartedRef.current) {
        // First clean send — wrap in intent framing
        planStartedRef.current = true;
        msg = INTENT_FRAMING(text.trim());
        displayMsg = msg;
      }
    }

    // If custom prefix prompt is enabled, prepend to actual payload but keep displayMsg clean
    if (t.prefixEnabled && t.customPrefix && t.customPrefix.trim()) {
      msg = `${t.customPrefix.trim()}\n\n${msg}`;
    }

    if (bridge?.isConnected) {
      if (streaming) {
        bridge.steer(msg, displayMsg);
      } else {
        bridge.send(msg, undefined, displayMsg);
      }
    } else {
      setMessages(prev => [...prev, { kind: "user", time: timeNow(), text: displayMsg }]);
      setIsWaitingFirstToken(true);
    }
  };

  const handleAbort      = () => { bridge?.abort(); setStreaming(false); };
  const handlePickModel  = m  => { setModelState(m); bridge?.setModel(m); };
  const handleAskAnswer  = React.useCallback((id, value) => { bridge?.answerAsk(id, value); }, [bridge]); // bridge = window.OMP_BRIDGE, assigned once before React renders — stable ref
  const handlePickLogin = async (provider) => {
    if (!bridge) return;
    try {
      // OMP_BRIDGE.login resolves when OAuth completes (≤300 s).
      // live.js handles extension_ui_request.open_url via open_url_external (system browser).
      // For already-authenticated providers omp refreshes the token silently (no browser).
      // Use bridge.addAssistantMessage — writes into state.messages so the message
      // survives any subsequent notify() call (e.g. model registry refresh after login).
      await bridge.login(provider.id);
      bridge.addAssistantMessage(`Logged in to **${provider.name}**.`);
    } catch (err) {
      const msg = err?.message ?? String(err);
      bridge.addAssistantMessage(`**Login failed (${provider.name}):** ${msg}`);
    }
  };
  const cycleThinking    = () => bridge?.cycleThinking();

  const handleCommand = c => {
    if      (c.name === "plan")     { setPlanMode(true); planStartedRef.current = false; }
    else if (c.name === "todo")     { setPlanOpen(true); }
    else if (c.name === "compact")  { bridge?.compact(); }
    else if (c.name === "export")   { bridge?.exportHtml(); }
    else if (c.name === "thinking") { cycleThinking(); }
    else if (c.name === "model")    { openBridge("models"); }
    else if (c.name === "login")    { openBridge("login"); }
    else if (c.name === "settings") { setModelsModalOpen(true); }
    else if (c.name === "new")      { bridge?.newSession(); }
  };

  const handleApprovePlan = () => {
    setPlanAnnotations({});
    bridge?.followUp(APPROVAL_PROMPT);
    setPlanMode(false);
    planStartedRef.current = false;
    setPlanOpen(true);
  };

  // Tab select — switches the active session; bridge resets all per-session state
  // and re-fetches from the new session's omp → notify() pushes fresh data.
  const handleSelectTab = id => {
    if (id === activeSessionId) return;
    bridge?.activateSession(id);
    // setActiveSessionId is driven by snap.activeSessionId from onUpdate
  };

  // Open project → new session → new tab with its own omp process
  const handleNewProject = async () => {
    if (!bridge) return;
    const path = await bridge.pickFolder();
    if (!path) return;
    await bridge.openSession(path);
    // Tab list and activeSessionId are updated via onUpdate from the bridge
  };

  // Close tab → kills that session's omp process; bridge updates tab list
  const handleCloseTab = id => { bridge?.closeSession(id); };

  const showRail  = t.layout !== "focus";
  const showSplit = t.layout === "split" && data.peer !== null;
  const safePeer  = data.peer ?? NULL_PEER;
  const liveCtx   = ctx ?? data.ctx;

  return (
    <>
      <div className="app-backdrop" />
      <div className="app">
        <div className={`window scanlines ${showSplit ? "is-split" : ""}`}>
          <WindowChrome
            project={activeProject}
            peer={safePeer}
            onCmd={() => setBridgeOpen(true)}
            onSettings={() => setModelsModalOpen(true)}
            onHistory={() => setHistoryModalOpen(true)}
          />
          <TabBar
            projects={sessions}
            activeId={activeSessionId}
            onSelect={handleSelectTab}
            peer={safePeer}
            onNew={handleNewProject}
            onClose={handleCloseTab}
          />

          <div className={`stage ${showRail ? "with-rail" : ""}`}>
            <main className="session">
              <ChatView messages={messages}
                planMode={planMode}
                annotations={planAnnotations}
                onAnnotate={handleAnnotate}
                onAskAnswer={handleAskAnswer}
                hoveredMsgIdx={hoveredMsgIdx}
                isWaitingFirstToken={isWaitingFirstToken}
              />
              <Composer
                onSend={handleSend}
                planMode={planMode}
                onTogglePlan={() => {
                  const next = !planMode;
                  setPlanMode(next);
                  if (!next) planStartedRef.current = false;
                }}
                prefixEnabled={t.prefixEnabled ?? false}
                onTogglePrefix={() => setTweak("prefixEnabled", !t.prefixEnabled)}
                onOpenCmd={() => openBridge("commands")}
                onOpenModel={() => openBridge("models")}
                currentModel={model}
                thinking={thinkingLevel}
                onCycleThinking={cycleThinking}
                isStreaming={streaming}
                onAbort={handleAbort}
                onApprove={handleApprovePlan}
                annotationCount={Object.keys(planAnnotations).length}
                microcopy={data.microcopy}
                onPick={handleCommand}
              />
              <StatusBar
                ctx={liveCtx}
                model={model}
                thinking={thinkingLevel}
                todoDone={todoCounts.done}
                todoTotal={todoCounts.total}
                onTodo={() => setPlanOpen(true)}
                onModel={() => openBridge("models")}
                onTweaks={() => window.postMessage({ type: '__activate_edit_mode' }, '*')}
                autosave={t.autosave ?? true}
                onAutosave={v => setTweak("autosave", v)}
              />
            </main>

            {showSplit && data.peer && <SplitPeer peer={data.peer} />}

            {showRail && (
              <AmbientRail
                ctx={liveCtx}
                activity={activity}
                peer={safePeer}
                messages={messages}
                microcopy={data.microcopy}
                sparklineValues={sparkline}
                onClose={() => setTweak("layout", "focus")}
                hoveredMsgIdx={hoveredMsgIdx}
                onMinimapHover={setHoveredMsgIdx}
                onMinimapClick={handleMinimapClick}
              />
            )}
          </div>
        </div>
      </div>

      <CommandBridge
        open={bridgeOpen}
        initialView={bridgeView}
        onClose={() => setBridgeOpen(false)}
        onPick={handleCommand}
        onPickModel={handlePickModel}
        onPickLogin={handlePickLogin}
        loginProviders={loginProviders}
        currentModelId={model.id}
      />

      {planOpen && (
        <PlanKanban
          kanban={kanban}
          planMeta={planMeta}
          onClose={() => setPlanOpen(false)}
          onAbort={handleAbort}
        />
      )}

      <TweaksPanel title="Tweaks" noDeckControls>
        <TweakSection label="Look">
          <TweakRadio label="theme" value={t.theme}
            options={[
              { label: "aurora",   value: "aurora"   },
              { label: "phosphor", value: "phosphor" },
              { label: "daylight", value: "daylight" },
            ]}
            onChange={v => setTweak({ theme: v, accent:
              v === "aurora"   ? "#8AF0C8" :
              v === "phosphor" ? "#C4FF3F" : "#1F8A5B"
            })}
          />
          <TweakRadio label="density" value={t.density}
            options={[
              { label: "cozy",    value: "cozy"    },
              { label: "compact", value: "compact" },
              { label: "dense",   value: "dense"   },
            ]}
            onChange={v => setTweak("density", v)}
          />
          <TweakColor label="accent" value={t.accent}
            options={["#8AF0C8", "#6EE7FF", "#FF7AC6", "#FFC56E", "#B59BFF", "#C4FF3F"]}
            onChange={v => setTweak("accent", v)}
          />
          <TweakToggle label="mono chat font" value={t.monoChat}
            onChange={v => setTweak("monoChat", v)} />
          <TweakSlider label="font size" value={t.fontSize ?? 100}
            min={75} max={150} step={5} unit="%"
            onChange={v => setTweak("fontSize", v)} />
          <TweakImageUpload label="Background Image" value={t.bgImage ?? ""}
            onChange={v => setTweak("bgImage", v)} />
          {t.bgImage && (
            <TweakSlider label="BG Opacity" value={t.bgOpacity ?? 60} min={10} max={100} step={5} unit="%"
              onChange={v => setTweak("bgOpacity", v)} />
          )}
        </TweakSection>
        <TweakSection label="Layout">
          <TweakRadio label="layout" value={t.layout}
            options={[
              { label: "rail",  value: "rail"  },
              { label: "split", value: "split" },
              { label: "focus", value: "focus" },
            ]}
            onChange={v => setTweak("layout", v)}
          />
        </TweakSection>
        <TweakSection label="API & Models">
          <div style={{ padding: "4px 12px" }}>
            <button
              className="btn primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => setModelsModalOpen(true)}
            >
              Configure API / Providers
            </button>
          </div>
        </TweakSection>
        <TweakSection label="Persona (Display Only)">
          <TweakText label="User Name" value={t.userName ?? "you"} placeholder="e.g. Master, Alice"
            onChange={v => setTweak("userName", v)} />
          <TweakImageUpload label="User Avatar" value={t.userAvatar ?? ""}
            onChange={v => setTweak("userAvatar", v)} />
          <TweakText label="AI Name" value={t.aiName ?? "OMP"} placeholder="e.g. 可蒂丝, Assistant"
            onChange={v => setTweak("aiName", v)} />
          <TweakImageUpload label="AI Avatar" value={t.aiAvatar ?? ""}
            onChange={v => setTweak("aiAvatar", v)} />
        </TweakSection>
      </TweaksPanel>

      <ModelsModal
        isOpen={modelsModalOpen}
        onClose={() => setModelsModalOpen(false)}
        tweaks={t}
        setTweak={setTweak}
      />
      <HistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        onResumeSession={async (session) => {
          try {
            await bridge.resumeSession(session.path, "", session.title);
          } catch (e) {
            alert("Failed to resume session: " + e);
          }
        }}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})();
