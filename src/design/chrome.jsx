/* ═════════════════════════════════════════════════════════════════════
   chrome.jsx — window chrome, tabs, status bar, ambient peripherals
   - WindowChrome (traffic lights, title)
   - TabBar
   - StatusBar
   - Ambient rail: TokenGauge, ActivityRadar, Minimap, Peer session
   ═════════════════════════════════════════════════════════════════════ */



// ── Platform detection ────────────────────────────────────────────────
const IS_WIN = typeof navigator !== "undefined" &&
  (navigator.userAgent.includes("Windows") || navigator.platform.startsWith("Win"));

// ── Window chrome ─────────────────────────────────────────────────────
function WindowChrome({ project, peer, onCmd, onSettings, onHistory }) {
  return (
    <div className="chrome" data-tauri-drag-region>
      {/* macOS traffic lights — left side, hidden on Windows */}
      {!IS_WIN && (
        <div className="chrome-lights">
          <span className="light red" />
          <span className="light amber" />
          <span className="light green" />
        </div>
      )}

      <div className="chrome-left" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          className="btn ghost"
          onClick={onHistory}
          title="Session History"
          style={{ padding: "4px 8px", display: "flex", alignItems: "center", gap: 5 }}
        >
          <Icon name="clock" size={13} color="var(--accent, #8AF0C8)" />
          <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>History</span>
        </button>
      </div>

      <div className="chrome-title">
        <span className="mono" style={{ color: "var(--fg-3)" }}>OMP</span>
        <span className="mono" style={{ color: "var(--fg-5)" }}>·</span>
        <span style={{ color: "var(--fg-2)" }}>{project.name}</span>
        {project.branch && (
          <span className="chip muted" style={{ marginLeft: 6 }}>
            <Icon name="branch" size={9} color="var(--fg-3)" />
            <span className="mono" style={{ color: "var(--fg-3)" }}>{project.branch}</span>
          </span>
        )}
      </div>

      <div className="chrome-right">
        <button className="btn ghost" onClick={onSettings} title="Settings (API & Persona)" style={{ padding: "4px 8px" }}>
          <Icon name="cog" size={13} color="var(--fg-2)" />
        </button>

        <button className="btn ghost outlined" onClick={onCmd}>
          <Icon name="command" size={11} /> bridge{" "}
          <span className="kbd">{IS_WIN ? "^K" : "⌘K"}</span>
        </button>
        {IS_WIN && (
          <div className="win-controls">
            <button className="win-ctrl win-min"   title="Minimize">&#8211;</button>
            <button className="win-ctrl win-max"   title="Maximize / Restore">&#9633;</button>
            <button className="win-ctrl win-close" title="Close">&#10005;</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Project tabs ─────────────────────────────────────────────────────
function TabBar({ projects, activeId, onSelect, onClose, peer, onNew }) {
  return (
    <div className="tabs">
      {projects.map((p) => {
        const active = p.id === activeId;
        return (
          <div key={p.id}
            className={`tab ${active ? "active" : ""}`}
            onClick={() => onSelect(p.id)}>
            <span className="tab-bar-mark" style={{ background: active ? p.color : "transparent" }} />
            <Icon name="folder" size={11} color={active ? p.color : "var(--fg-4)"} />
            <span className="tab-name">{p.name}</span>
            {p.id === peer?.projectId && (
              <span className="chip accent" style={{ padding: "1px 6px" }}>split</span>
            )}
            <button className="tab-close" onClick={e => { e.stopPropagation(); onClose?.(p.id); }}><Icon name="close" size={9} /></button>
          </div>
        );
      })}
      <button className="tab-add" title="open project" onClick={onNew}>
        <Icon name="plus" size={11} />
      </button>
      <div style={{ flex: 1 }} />
    </div>
  );
}

// ── Status bar (footer): todos, tweaks ────────────────────────────────
function StatusBar({ todoDone, todoTotal, onTodo, onTweaks }) {
  return (
    <div className="status">
      <div style={{ flex: 1 }} />
      <button className="status-cell btn ghost" onClick={onTodo} style={{ height: 20, padding: "0 6px" }}>
        <Icon name="plan" size={11} color="var(--accent)" />
        <span style={{ color: "var(--accent)" }}>todo {todoDone}/{todoTotal}</span>
      </button>
      <span className="status-sep">·</span>
      <button className="status-cell btn ghost" onClick={onTweaks} title="tweaks" style={{ height: 20, padding: "0 6px" }}>
        <Icon name="cog" size={11} color="var(--fg-3)" />
      </button>
    </div>
  );
}

// ── Minimap of the session: dense grid, one cell per message ─────────
// Hue encodes role/tool color (same palette as the chat). For assistant
// messages, opacity is log-scaled by tokens used so expensive turns pop
// against cheap ones. Click scrolls the chat to that message; hover
// highlights it via shared hoveredIdx state.
function SessionMinimap({ messages, hoveredIdx, onHover, onClick }) {
  // Log-scaled max across assistant messages so heatmap variance is
  // visible even when one compaction turn dwarfs the rest.
  const maxTokens = React.useMemo(() => {
    let max = 0;
    for (const m of messages) {
      if (m.kind === "assistant" && m.tokens && m.tokens > max) max = m.tokens;
    }
    return max;
  }, [messages]);
  const logMax = Math.log10(maxTokens + 1) || 1;

  return (
    <div className="minimap">
      <div className="minimap-grid">
        {messages.map((m, i) => {
          let hue = "var(--fg-5)";
          if      (m.kind === "user")      hue = "var(--fg-3)";
          else if (m.kind === "assistant") hue = "var(--accent)";
          else if (m.kind === "ask")       hue = "var(--amber)";
          else if (m.kind === "tool")      hue = TOOL_META[m.tool]?.color || "var(--fg-4)";

          // Brightness: assistant cells modulate by log(tokens), others flat.
          let opacity = 0.7;
          if (m.kind === "assistant" && m.tokens && maxTokens > 0) {
            const t = Math.log10(m.tokens + 1) / logMax;
            opacity = 0.4 + 0.6 * Math.max(0, Math.min(1, t));
          }

          // Per-kind tooltip — tools don't carry their own tokens (the
          // LLM cost lives on the assistant message that invoked them),
          // so they get tool-specific info instead of a token chip.
          let title;
          if (m.kind === "assistant") {
            const tok  = m.tokens ? `${m.tokens.toLocaleString()} tok` : "—";
            const inOut = (m.tokensIn != null || m.tokensOut != null)
              ? ` (${(m.tokensIn ?? 0).toLocaleString()} in · ${(m.tokensOut ?? 0).toLocaleString()} out)`
              : "";
            title = `assistant · ${tok}${inOut}${m.time ? " · " + m.time : ""}`;
          } else if (m.kind === "tool") {
            const dur = m.duration ? ` · ${(m.duration / 1000).toFixed(1)}s` : "";
            const status = m.status === "running" ? " · running" : (m.status === "ok" ? "" : ` · ${m.status}`);
            title = `${m.tool ?? "tool"}${m.title ? " " + m.title : ""}${dur}${status}`;
          } else if (m.kind === "user") {
            const preview = m.text ? ` · ${m.text.slice(0, 80)}${m.text.length > 80 ? "…" : ""}` : "";
            title = `you${preview}`;
          } else {
            title = m.kind;
          }
          const cls = `minimap-cell ${m.kind} ${m.streaming ? "live" : ""} ${hoveredIdx === i ? "hot" : ""}`.trim();

          return (
            <div key={m._id ?? i}
              className={cls}
              style={{ background: hue, opacity }}
              title={title}
              onMouseEnter={() => onHover?.(i)}
              onMouseLeave={() => onHover?.(null)}
              onClick={() => onClick?.(i)} />
          );
        })}
      </div>
    </div>
  );
}

// ── Peer session widget — shows the OTHER agent, when split is on ────
function PeerSession({ peer }) {
  const meta = TOOL_META[peer.activity?.split(" · ")[0]] || TOOL_META.edit;
  return (
    <div className="peer">
      <div className="peer-head">
        <span className="dot live" style={{ background: "var(--cyan)", boxShadow: "0 0 0 0 var(--cyan)" }} />
        <span className="mono" style={{ color: "var(--cyan)" }}>{peer.project}</span>
        <span className="mono" style={{ marginLeft: "auto", color: "var(--fg-4)" }}>{peer.tps}t/s</span>
      </div>
      <div className="peer-title selectable">{peer.title}</div>
      <div className="peer-row">
        <span className="chip accent" style={{ borderColor: `color-mix(in oklab, ${meta.color} 40%, var(--line))`, color: meta.color, background: `color-mix(in oklab, ${meta.color} 12%, transparent)` }}>
          <Icon name={meta.icon} size={9} color={meta.color} />
          {peer.activity}
        </span>
      </div>
      <div className="peer-row mono" style={{ color: "var(--fg-3)" }}>
        todo {peer.todo.done}/{peer.todo.total}
        <span className="status-bar-tube" style={{ marginLeft: 6, flex: 1 }}>
          <span className="status-bar-fill" style={{ width: `${(peer.todo.done / peer.todo.total) * 100}%`, background: "var(--cyan)" }} />
        </span>
        <button className="btn ghost" style={{ marginLeft: 6, height: 18, padding: "0 6px", fontSize: "var(--d-text-xs)" }}>focus →</button>
      </div>
    </div>
  );
}

// ── Reserved Animation / GIF Stage (Hardware Isolated) ──
function AnimationStageCard({ isWorking, staticImg, activeVideo, ratioMode = "auto" }) {
  const videoRef = React.useRef(null);
  const [dbStatic, setDbStatic] = React.useState(null);
  const [dbVideo, setDbVideo] = React.useState(null);
  const [detectedRatio, setDetectedRatio] = React.useState("1:1");
  const [activated, setActivated] = React.useState(true);
  const [activeWorking, setActiveWorking] = React.useState(Boolean(isWorking));
  const timerRef = React.useRef(null);

  // 任务结束 5 秒平滑防抖退出：工作状态变为 false 时，启动 5s 延时保护窗口
  React.useEffect(() => {
    if (isWorking) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setActiveWorking(true);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setActiveWorking(false);
        timerRef.current = null;
      }, 5000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isWorking]);

  React.useEffect(() => {
    try { localStorage.setItem("omp:stage_media_activated", "1"); } catch {}
  }, []);

  React.useEffect(() => {
    if (window.mediaDB) {
      window.mediaDB.get("stageStaticImg").then(v => v && setDbStatic(v));
      window.mediaDB.get("stageActiveVideo").then(v => v && setDbVideo(v));
    }
    const onMediaChange = (e) => {
      if (e.detail?.key === "stageStaticImg") setDbStatic(e.detail.value);
      if (e.detail?.key === "stageActiveVideo") setDbVideo(e.detail.value);
    };
    const onActivated = () => setActivated(true);
    window.addEventListener("omp:mediachange", onMediaChange);
    window.addEventListener("omp:stage_activated", onActivated);
    return () => {
      window.removeEventListener("omp:mediachange", onMediaChange);
      window.removeEventListener("omp:stage_activated", onActivated);
    };
  }, []);

  const effectiveStatic = dbStatic || staticImg;
  const effectiveVideo  = dbVideo || activeVideo;

  const hasActiveMedia = activeWorking && Boolean(effectiveVideo);
  const isVideo = hasActiveMedia && (
    effectiveVideo.startsWith("data:video/") ||
    effectiveVideo.includes("video/mp4") ||
    effectiveVideo.includes("video/webm") ||
    (!effectiveVideo.startsWith("data:image/") && !effectiveVideo.startsWith("blob:image/"))
  );

  const handleMediaSize = (w, h) => {
    if (h > 0) {
      const r = w / h;
      if (r <= 0.85) setDetectedRatio("3:4");
      else setDetectedRatio("1:1");
    }
  };

  const activeRatio = (ratioMode && ratioMode !== "auto") ? ratioMode : detectedRatio;
  const ratioClass = activeRatio === "3:4" ? "ratio-3-4" : "ratio-1-1";

  const triggerPlay = React.useCallback(() => {
    localStorage.setItem("omp:stage_media_activated", "1");
    setActivated(true);
    if (videoRef.current) {
      const v = videoRef.current;
      v.defaultMuted = true;
      v.muted = true;
      v.play().catch(e => console.warn("[AnimationStage] play caught:", e));
    }
  }, []);

  React.useEffect(() => {
    if (isVideo && videoRef.current) {
      triggerPlay();
    }
  }, [isVideo, effectiveVideo, activeWorking, triggerPlay]);

  return (
    <div
      className={`rail-card glass animation-stage-card ${ratioClass}`}
      title={activeWorking ? "工作中 · 点击可确保视频播放" : "空闲待机 · 静态模式"}
      onClick={triggerPlay}
      style={{ cursor: "pointer" }}
    >
      {/* 状态指示角标 */}
      <span className={`chip mono ${activeWorking ? "accent" : "muted"}`}
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          zIndex: 5,
          fontSize: 9,
          padding: "1px 6px",
          pointerEvents: "none",
          background: activeWorking ? "color-mix(in oklab, var(--accent) 18%, var(--bg-surface))" : "var(--bg-surface)",
          borderColor: activeWorking ? "var(--accent)" : "var(--line)",
        }}>
        <span className="dot" style={{ background: activeWorking ? "var(--accent)" : "var(--fg-4)", width: 5, height: 5 }} />
        {activeWorking ? "WORKING" : "IDLE"}
      </span>

      <div className="animation-stage-inner">
        {hasActiveMedia ? (
          isVideo ? (
            <video
              ref={videoRef}
              src={effectiveVideo}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => {
                handleMediaSize(e.currentTarget.videoWidth, e.currentTarget.videoHeight);
              }}
              onCanPlay={(e) => {
                e.currentTarget.muted = true;
                e.currentTarget.play().catch(() => {});
              }}
              onLoadedData={(e) => {
                e.currentTarget.muted = true;
                e.currentTarget.play().catch(() => {});
              }}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration > 0 && v.currentTime >= v.duration - 0.12) {
                  v.currentTime = 0;
                  v.play().catch(() => {});
                }
              }}
              onEnded={(e) => {
                const v = e.currentTarget;
                v.currentTime = 0;
                v.play().catch(() => {});
              }}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: "calc(var(--r-2) - 1px)" }}
            />
          ) : (
            <img
              src={effectiveVideo}
              alt="active animation"
              onLoad={(e) => {
                handleMediaSize(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight);
              }}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: "calc(var(--r-2) - 1px)" }}
            />
          )
        ) : effectiveStatic ? (
          <img
            src={effectiveStatic}
            alt="static stage"
            onLoad={(e) => {
              handleMediaSize(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight);
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              borderRadius: "calc(var(--r-2) - 1px)",
              filter: activeWorking ? "drop-shadow(0 0 6px var(--accent))" : "none",
              transition: "filter 300ms ease",
            }}
          />
        ) : (
          <>
            <div className="stage-corner top-left" />
            <div className="stage-corner top-right" />
            <div className="stage-corner bottom-left" />
            <div className="stage-corner bottom-right" />
            <div className="stage-placeholder-text mono">
              <Icon name="sparkle" size={13} color={activeWorking ? "var(--accent)" : "var(--fg-4)"} />
              <span style={{ color: activeWorking ? "var(--accent)" : "var(--fg-4)" }}>
                {activeWorking ? "agent working…" : "stage · reserved"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Hardware Power Meter Peripheral ────────────────────────
function PowerMeterCard() {
  const [metrics, setMetrics] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    const fetchPower = async () => {
      if (document.hidden) return;
      try {
        if (window.__TAURI__?.core?.invoke) {
          const res = await window.__TAURI__.core.invoke("get_hardware_power_metrics");
          if (mounted && res) setMetrics(res);
        }
      } catch (err) {
        console.warn("[PowerMeter] query failed:", err);
      }
    };

    fetchPower();
    const timer = setInterval(fetchPower, 2000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  if (!metrics) return null;

  const pct = metrics.batteryPct ?? 100;
  const isAc = metrics.isAc;

  // 动态电量颜色计算: >70% 翠绿, 40-70% 科技蓝, 20-40% 警告黄, <20% 告急红
  const getBatteryTone = (p, ac) => {
    if (ac) return { color: "var(--accent)", label: "AC 供电" };
    if (p >= 70) return { color: "#10b981", label: `${p}%` };
    if (p >= 40) return { color: "#06b6d4", label: `${p}%` };
    if (p >= 20) return { color: "#f59e0b", label: `${p}%` };
    return { color: "#f43f5e", label: `${p}% 告急` };
  };

  const tone = getBatteryTone(pct, isAc);

  return (
    <div className="rail-card glass power-meter-card">
      <div className="pm-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="bolt" size={13} color={tone.color} />
          <span className="pm-title" style={{ color: "var(--fg-2)" }}>POWER METER</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: tone.color, lineHeight: 1 }}>
            {isAc ? `AC · ${pct}%` : `${pct}%`}
          </span>
          <span style={{ fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
            {isAc ? "POWER" : "BATT"}
          </span>
        </div>
      </div>

      <div className="pm-main-grid">
        <div className="pm-metric">
          <span className="pm-label">Total Power</span>
          <span className="pm-val-hero" style={{ color: "var(--accent)" }}>
            {metrics.totalPowerW.toFixed(1)}<span className="pm-unit">W</span>
          </span>
        </div>
        <div className="pm-metric">
          <span className="pm-label">CPU Package</span>
          <span className="pm-val-hero" style={{ color: "var(--cyan)" }}>
            {metrics.cpuPkgW.toFixed(1)}<span className="pm-unit">W</span>
          </span>
        </div>
      </div>

      <div className="pm-sub-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "2px 8px" }}>
        <div className="pm-sub-item">
          <span>Cores:</span>
          <span className="pm-sub-val">{metrics.cpuCoresW.toFixed(1)} W</span>
        </div>
        <div className="pm-sub-item">
          <span>CPU 占用:</span>
          <span className="pm-sub-val" style={{ color: "var(--accent)" }}>{metrics.cpuUsagePct.toFixed(1)}%</span>
        </div>
      </div>

      <div className="pm-battery-tube" title={`当前电池剩余: ${pct}%${isAc ? " (已连接电源适配器)" : ""}`}>
        <div className="pm-battery-fill" style={{ width: `${pct}%`, background: tone.color }} />
      </div>
    </div>
  );
}

// ── Right rail: ambient peripherals stacked ──────────────────────────
function AmbientRail({ ctx, activity, peer, messages, microcopy, onClose, sparklineValues, hoveredMsgIdx, onMinimapHover, onMinimapClick, showPowerMeter = true, showAnimationStage = true, isWorking = false, stageStaticImg = "", stageActiveVideo = "", stageRatioMode = "auto" }) {
  const sparkVals = (sparklineValues && sparklineValues.length > 0)
    ? sparklineValues
    : Array(30).fill(0);
  return (
    <aside className="rail">
      {/* 1. 顶部 ambient 标题与关闭按钮 */}
      <div className="rail-head">
        <span className="mono" style={{ color: "var(--fg-3)" }}>ambient</span>
        <button className="btn icon ghost" onClick={onClose} title="hide rail">
          <Icon name="close" size={10} />
        </button>
      </div>

      {/* 2. 最上边的 ambient 原有指标 (TokenGauge + Sparkline) */}
      <div className="rail-card glass">
        <TokenGauge used={ctx.used} total={ctx.total} pct={ctx.pct}
          label={ctx.label} sub={`cost ${ctx.cost} · ${ctx.tokensPerSec} t/s`} />
        <div className="rail-spark">
          <Sparkline values={sparkVals} width={210} height={28} />
          <div className="rail-spark-foot mono">
            <span style={{ color: "var(--fg-4)" }}>throughput</span>
            <span style={{ color: "var(--accent)" }}>{ctx.tokensPerSec} t/s</span>
          </div>
        </div>
      </div>

      {/* 3. animation 自适应舞台 (支持开关控制与 5s 优雅迟滞) */}
      {showAnimationStage && (
        <AnimationStageCard isWorking={isWorking} staticImg={stageStaticImg} activeVideo={stageActiveVideo} ratioMode={stageRatioMode} />
      )}
      {/* 4. power meter 功率计模块 */}
      {showPowerMeter && <PowerMeterCard />}

      {/* 5. minimap 小地图在最底下 */}
      <div className="rail-card glass" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 140 }}>
        <div className="rail-card-head" style={{ display: "flex", alignItems: "center" }}>
          <Icon name="minimap" size={11} color="var(--fg-3)" />
          <span className="mono" style={{ color: "var(--fg-2)" }}>minimap</span>
          <span className="mono" style={{ marginLeft: "auto", color: "var(--fg-4)", fontSize: "11px" }}>{messages.length}</span>
        </div>
        <SessionMinimap messages={messages} hoveredIdx={hoveredMsgIdx} onHover={onMinimapHover} onClick={onMinimapClick} />
      </div>
    </aside>
  );
}

Object.assign(window, { WindowChrome, TabBar, StatusBar, AmbientRail, SessionMinimap, PeerSession, AnimationStageCard, PowerMeterCard });
