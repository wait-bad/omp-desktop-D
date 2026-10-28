/* Transpiled from design/chrome.jsx via esbuild — DO NOT EDIT DIRECTLY */
(function() {
const IS_WIN = typeof navigator !== "undefined" && (navigator.userAgent.includes("Windows") || navigator.platform.startsWith("Win"));
function WindowChrome({ project, peer, onCmd, onSettings, onHistory }) {
  return /* @__PURE__ */ React.createElement("div", { className: "chrome", "data-tauri-drag-region": true }, !IS_WIN && /* @__PURE__ */ React.createElement("div", { className: "chrome-lights" }, /* @__PURE__ */ React.createElement("span", { className: "light red" }), /* @__PURE__ */ React.createElement("span", { className: "light amber" }), /* @__PURE__ */ React.createElement("span", { className: "light green" })), /* @__PURE__ */ React.createElement("div", { className: "chrome-left", style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "btn ghost",
      onClick: onHistory,
      title: "Session History",
      style: { padding: "4px 8px", display: "flex", alignItems: "center", gap: 5 }
    },
    /* @__PURE__ */ React.createElement(Icon, { name: "clock", size: 13, color: "var(--accent, #8AF0C8)" }),
    /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: 11, color: "var(--fg-3)" } }, "History")
  )), /* @__PURE__ */ React.createElement("div", { className: "chrome-title" }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-3)" } }, "OMP"), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-5)" } }, "\xB7"), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-2)" } }, project.name), project.branch && /* @__PURE__ */ React.createElement("span", { className: "chip muted", style: { marginLeft: 6 } }, /* @__PURE__ */ React.createElement(Icon, { name: "branch", size: 9, color: "var(--fg-3)" }), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-3)" } }, project.branch))), /* @__PURE__ */ React.createElement("div", { className: "chrome-right" }, /* @__PURE__ */ React.createElement("button", { className: "btn ghost", onClick: onSettings, title: "Settings (API & Persona)", style: { padding: "4px 8px" } }, /* @__PURE__ */ React.createElement(Icon, { name: "cog", size: 13, color: "var(--fg-2)" })), /* @__PURE__ */ React.createElement("button", { className: "btn ghost outlined", onClick: onCmd }, /* @__PURE__ */ React.createElement(Icon, { name: "command", size: 11 }), " bridge", " ", /* @__PURE__ */ React.createElement("span", { className: "kbd" }, IS_WIN ? "^K" : "\u2318K")), IS_WIN && /* @__PURE__ */ React.createElement("div", { className: "win-controls" }, /* @__PURE__ */ React.createElement("button", { className: "win-ctrl win-min", title: "Minimize" }, "\u2013"), /* @__PURE__ */ React.createElement("button", { className: "win-ctrl win-max", title: "Maximize / Restore" }, "\u25A1"), /* @__PURE__ */ React.createElement("button", { className: "win-ctrl win-close", title: "Close" }, "\u2715"))));
}
function TabBar({ projects, activeId, onSelect, onClose, peer, onNew }) {
  return /* @__PURE__ */ React.createElement("div", { className: "tabs" }, projects.map((p) => {
    const active = p.id === activeId;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: p.id,
        className: `tab ${active ? "active" : ""}`,
        onClick: () => onSelect(p.id)
      },
      /* @__PURE__ */ React.createElement("span", { className: "tab-bar-mark", style: { background: active ? p.color : "transparent" } }),
      /* @__PURE__ */ React.createElement(Icon, { name: "folder", size: 11, color: active ? p.color : "var(--fg-4)" }),
      /* @__PURE__ */ React.createElement("span", { className: "tab-name" }, p.name),
      p.id === peer?.projectId && /* @__PURE__ */ React.createElement("span", { className: "chip accent", style: { padding: "1px 6px" } }, "split"),
      /* @__PURE__ */ React.createElement("button", { className: "tab-close", onClick: (e) => {
        e.stopPropagation();
        onClose?.(p.id);
      } }, /* @__PURE__ */ React.createElement(Icon, { name: "close", size: 9 }))
    );
  }), /* @__PURE__ */ React.createElement("button", { className: "tab-add", title: "open project", onClick: onNew }, /* @__PURE__ */ React.createElement(Icon, { name: "plus", size: 11 })), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }));
}
function StatusBar({ todoDone, todoTotal, onTodo, onTweaks }) {
  return /* @__PURE__ */ React.createElement("div", { className: "status" }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement("button", { className: "status-cell btn ghost", onClick: onTodo, style: { height: 20, padding: "0 6px" } }, /* @__PURE__ */ React.createElement(Icon, { name: "plan", size: 11, color: "var(--accent)" }), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--accent)" } }, "todo ", todoDone, "/", todoTotal)), /* @__PURE__ */ React.createElement("span", { className: "status-sep" }, "\xB7"), /* @__PURE__ */ React.createElement("button", { className: "status-cell btn ghost", onClick: onTweaks, title: "tweaks", style: { height: 20, padding: "0 6px" } }, /* @__PURE__ */ React.createElement(Icon, { name: "cog", size: 11, color: "var(--fg-3)" })));
}
function SessionMinimap({ messages, hoveredIdx, onHover, onClick }) {
  const maxTokens = React.useMemo(() => {
    let max = 0;
    for (const m of messages) {
      if (m.kind === "assistant" && m.tokens && m.tokens > max) max = m.tokens;
    }
    return max;
  }, [messages]);
  const logMax = Math.log10(maxTokens + 1) || 1;
  return /* @__PURE__ */ React.createElement("div", { className: "minimap" }, /* @__PURE__ */ React.createElement("div", { className: "minimap-grid" }, messages.map((m, i) => {
    let hue = "var(--fg-5)";
    if (m.kind === "user") hue = "var(--fg-3)";
    else if (m.kind === "assistant") hue = "var(--accent)";
    else if (m.kind === "ask") hue = "var(--amber)";
    else if (m.kind === "tool") hue = TOOL_META[m.tool]?.color || "var(--fg-4)";
    let opacity = 0.7;
    if (m.kind === "assistant" && m.tokens && maxTokens > 0) {
      const t = Math.log10(m.tokens + 1) / logMax;
      opacity = 0.4 + 0.6 * Math.max(0, Math.min(1, t));
    }
    let title;
    if (m.kind === "assistant") {
      const tok = m.tokens ? `${m.tokens.toLocaleString()} tok` : "\u2014";
      const inOut = m.tokensIn != null || m.tokensOut != null ? ` (${(m.tokensIn ?? 0).toLocaleString()} in \xB7 ${(m.tokensOut ?? 0).toLocaleString()} out)` : "";
      title = `assistant \xB7 ${tok}${inOut}${m.time ? " \xB7 " + m.time : ""}`;
    } else if (m.kind === "tool") {
      const dur = m.duration ? ` \xB7 ${(m.duration / 1e3).toFixed(1)}s` : "";
      const status = m.status === "running" ? " \xB7 running" : m.status === "ok" ? "" : ` \xB7 ${m.status}`;
      title = `${m.tool ?? "tool"}${m.title ? " " + m.title : ""}${dur}${status}`;
    } else if (m.kind === "user") {
      const preview = m.text ? ` \xB7 ${m.text.slice(0, 80)}${m.text.length > 80 ? "\u2026" : ""}` : "";
      title = `you${preview}`;
    } else {
      title = m.kind;
    }
    const cls = `minimap-cell ${m.kind} ${m.streaming ? "live" : ""} ${hoveredIdx === i ? "hot" : ""}`.trim();
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: m._id ?? i,
        className: cls,
        style: { background: hue, opacity },
        title,
        onMouseEnter: () => onHover?.(i),
        onMouseLeave: () => onHover?.(null),
        onClick: () => onClick?.(i)
      }
    );
  })));
}
function PeerSession({ peer }) {
  const meta = TOOL_META[peer.activity?.split(" \xB7 ")[0]] || TOOL_META.edit;
  return /* @__PURE__ */ React.createElement("div", { className: "peer" }, /* @__PURE__ */ React.createElement("div", { className: "peer-head" }, /* @__PURE__ */ React.createElement("span", { className: "dot live", style: { background: "var(--cyan)", boxShadow: "0 0 0 0 var(--cyan)" } }), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--cyan)" } }, peer.project), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { marginLeft: "auto", color: "var(--fg-4)" } }, peer.tps, "t/s")), /* @__PURE__ */ React.createElement("div", { className: "peer-title selectable" }, peer.title), /* @__PURE__ */ React.createElement("div", { className: "peer-row" }, /* @__PURE__ */ React.createElement("span", { className: "chip accent", style: { borderColor: `color-mix(in oklab, ${meta.color} 40%, var(--line))`, color: meta.color, background: `color-mix(in oklab, ${meta.color} 12%, transparent)` } }, /* @__PURE__ */ React.createElement(Icon, { name: meta.icon, size: 9, color: meta.color }), peer.activity)), /* @__PURE__ */ React.createElement("div", { className: "peer-row mono", style: { color: "var(--fg-3)" } }, "todo ", peer.todo.done, "/", peer.todo.total, /* @__PURE__ */ React.createElement("span", { className: "status-bar-tube", style: { marginLeft: 6, flex: 1 } }, /* @__PURE__ */ React.createElement("span", { className: "status-bar-fill", style: { width: `${peer.todo.done / peer.todo.total * 100}%`, background: "var(--cyan)" } })), /* @__PURE__ */ React.createElement("button", { className: "btn ghost", style: { marginLeft: 6, height: 18, padding: "0 6px", fontSize: "var(--d-text-xs)" } }, "focus \u2192")));
}
function AnimationStageCard({ isWorking, staticImg, activeVideo, ratioMode = "auto" }) {
  const videoRef = React.useRef(null);
  const [dbStatic, setDbStatic] = React.useState(null);
  const [dbVideo, setDbVideo] = React.useState(null);
  const [detectedRatio, setDetectedRatio] = React.useState("1:1");
  const [activated, setActivated] = React.useState(true);
  const [activeWorking, setActiveWorking] = React.useState(Boolean(isWorking));
  const timerRef = React.useRef(null);
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
      }, 5e3);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isWorking]);
  React.useEffect(() => {
    try {
      localStorage.setItem("omp:stage_media_activated", "1");
    } catch {
    }
  }, []);
  React.useEffect(() => {
    if (window.mediaDB) {
      window.mediaDB.get("stageStaticImg").then((v) => v && setDbStatic(v));
      window.mediaDB.get("stageActiveVideo").then((v) => v && setDbVideo(v));
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
  const effectiveVideo = dbVideo || activeVideo;
  const hasActiveMedia = activeWorking && Boolean(effectiveVideo);
  const isVideo = hasActiveMedia && (effectiveVideo.startsWith("data:video/") || effectiveVideo.includes("video/mp4") || effectiveVideo.includes("video/webm") || !effectiveVideo.startsWith("data:image/") && !effectiveVideo.startsWith("blob:image/"));
  const handleMediaSize = (w, h) => {
    if (h > 0) {
      const r = w / h;
      if (r <= 0.85) setDetectedRatio("3:4");
      else setDetectedRatio("1:1");
    }
  };
  const activeRatio = ratioMode && ratioMode !== "auto" ? ratioMode : detectedRatio;
  const ratioClass = activeRatio === "3:4" ? "ratio-3-4" : "ratio-1-1";
  const triggerPlay = React.useCallback(() => {
    localStorage.setItem("omp:stage_media_activated", "1");
    setActivated(true);
    if (videoRef.current) {
      const v = videoRef.current;
      v.defaultMuted = true;
      v.muted = true;
      v.play().catch((e) => console.warn("[AnimationStage] play caught:", e));
    }
  }, []);
  React.useEffect(() => {
    if (isVideo && videoRef.current) {
      triggerPlay();
    }
  }, [isVideo, effectiveVideo, activeWorking, triggerPlay]);
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `rail-card glass animation-stage-card ${ratioClass}`,
      title: activeWorking ? "\u5DE5\u4F5C\u4E2D \xB7 \u70B9\u51FB\u53EF\u786E\u4FDD\u89C6\u9891\u64AD\u653E" : "\u7A7A\u95F2\u5F85\u673A \xB7 \u9759\u6001\u6A21\u5F0F",
      onClick: triggerPlay,
      style: { cursor: "pointer" }
    },
    /* @__PURE__ */ React.createElement(
      "span",
      {
        className: `chip mono ${activeWorking ? "accent" : "muted"}`,
        style: {
          position: "absolute",
          top: 6,
          right: 6,
          zIndex: 5,
          fontSize: 9,
          padding: "1px 6px",
          pointerEvents: "none",
          background: activeWorking ? "color-mix(in oklab, var(--accent) 18%, var(--bg-surface))" : "var(--bg-surface)",
          borderColor: activeWorking ? "var(--accent)" : "var(--line)"
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: "dot", style: { background: activeWorking ? "var(--accent)" : "var(--fg-4)", width: 5, height: 5 } }),
      activeWorking ? "WORKING" : "IDLE"
    ),
    /* @__PURE__ */ React.createElement("div", { className: "animation-stage-inner" }, hasActiveMedia ? isVideo ? /* @__PURE__ */ React.createElement(
      "video",
      {
        ref: videoRef,
        src: effectiveVideo,
        autoPlay: true,
        loop: true,
        muted: true,
        playsInline: true,
        preload: "auto",
        onLoadedMetadata: (e) => {
          handleMediaSize(e.currentTarget.videoWidth, e.currentTarget.videoHeight);
        },
        onCanPlay: (e) => {
          e.currentTarget.muted = true;
          e.currentTarget.play().catch(() => {
          });
        },
        onLoadedData: (e) => {
          e.currentTarget.muted = true;
          e.currentTarget.play().catch(() => {
          });
        },
        onTimeUpdate: (e) => {
          const v = e.currentTarget;
          if (v.duration > 0 && v.currentTime >= v.duration - 0.12) {
            v.currentTime = 0;
            v.play().catch(() => {
            });
          }
        },
        onEnded: (e) => {
          const v = e.currentTarget;
          v.currentTime = 0;
          v.play().catch(() => {
          });
        },
        style: { width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: "calc(var(--r-2) - 1px)" }
      }
    ) : /* @__PURE__ */ React.createElement(
      "img",
      {
        src: effectiveVideo,
        alt: "active animation",
        onLoad: (e) => {
          handleMediaSize(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight);
        },
        style: { width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: "calc(var(--r-2) - 1px)" }
      }
    ) : effectiveStatic ? /* @__PURE__ */ React.createElement(
      "img",
      {
        src: effectiveStatic,
        alt: "static stage",
        onLoad: (e) => {
          handleMediaSize(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight);
        },
        style: {
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          borderRadius: "calc(var(--r-2) - 1px)",
          filter: activeWorking ? "drop-shadow(0 0 6px var(--accent))" : "none",
          transition: "filter 300ms ease"
        }
      }
    ) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "stage-corner top-left" }), /* @__PURE__ */ React.createElement("div", { className: "stage-corner top-right" }), /* @__PURE__ */ React.createElement("div", { className: "stage-corner bottom-left" }), /* @__PURE__ */ React.createElement("div", { className: "stage-corner bottom-right" }), /* @__PURE__ */ React.createElement("div", { className: "stage-placeholder-text mono" }, /* @__PURE__ */ React.createElement(Icon, { name: "sparkle", size: 13, color: activeWorking ? "var(--accent)" : "var(--fg-4)" }), /* @__PURE__ */ React.createElement("span", { style: { color: activeWorking ? "var(--accent)" : "var(--fg-4)" } }, activeWorking ? "agent working\u2026" : "stage \xB7 reserved"))))
  );
}
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
    const timer = setInterval(fetchPower, 2e3);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);
  if (!metrics) return null;
  const pct = metrics.batteryPct ?? 100;
  const isAc = metrics.isAc;
  const getBatteryTone = (p, ac) => {
    if (ac) return { color: "var(--accent)", label: "AC \u4F9B\u7535" };
    if (p >= 70) return { color: "#10b981", label: `${p}%` };
    if (p >= 40) return { color: "#06b6d4", label: `${p}%` };
    if (p >= 20) return { color: "#f59e0b", label: `${p}%` };
    return { color: "#f43f5e", label: `${p}% \u544A\u6025` };
  };
  const tone = getBatteryTone(pct, isAc);
  return /* @__PURE__ */ React.createElement("div", { className: "rail-card glass power-meter-card" }, /* @__PURE__ */ React.createElement("div", { className: "pm-head", style: { display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement(Icon, { name: "bolt", size: 13, color: tone.color }), /* @__PURE__ */ React.createElement("span", { className: "pm-title", style: { color: "var(--fg-2)" } }, "POWER METER")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: tone.color, lineHeight: 1 } }, isAc ? `AC \xB7 ${pct}%` : `${pct}%`), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)" } }, isAc ? "POWER" : "BATT"))), /* @__PURE__ */ React.createElement("div", { className: "pm-main-grid" }, /* @__PURE__ */ React.createElement("div", { className: "pm-metric" }, /* @__PURE__ */ React.createElement("span", { className: "pm-label" }, "Total Power"), /* @__PURE__ */ React.createElement("span", { className: "pm-val-hero", style: { color: "var(--accent)" } }, metrics.totalPowerW.toFixed(1), /* @__PURE__ */ React.createElement("span", { className: "pm-unit" }, "W"))), /* @__PURE__ */ React.createElement("div", { className: "pm-metric" }, /* @__PURE__ */ React.createElement("span", { className: "pm-label" }, "CPU Package"), /* @__PURE__ */ React.createElement("span", { className: "pm-val-hero", style: { color: "var(--cyan)" } }, metrics.cpuPkgW.toFixed(1), /* @__PURE__ */ React.createElement("span", { className: "pm-unit" }, "W")))), /* @__PURE__ */ React.createElement("div", { className: "pm-sub-grid", style: { gridTemplateColumns: "1fr 1fr", gap: "2px 8px" } }, /* @__PURE__ */ React.createElement("div", { className: "pm-sub-item" }, /* @__PURE__ */ React.createElement("span", null, "Cores:"), /* @__PURE__ */ React.createElement("span", { className: "pm-sub-val" }, metrics.cpuCoresW.toFixed(1), " W")), /* @__PURE__ */ React.createElement("div", { className: "pm-sub-item" }, /* @__PURE__ */ React.createElement("span", null, "CPU \u5360\u7528:"), /* @__PURE__ */ React.createElement("span", { className: "pm-sub-val", style: { color: "var(--accent)" } }, metrics.cpuUsagePct.toFixed(1), "%"))), /* @__PURE__ */ React.createElement("div", { className: "pm-battery-tube", title: `\u5F53\u524D\u7535\u6C60\u5269\u4F59: ${pct}%${isAc ? " (\u5DF2\u8FDE\u63A5\u7535\u6E90\u9002\u914D\u5668)" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "pm-battery-fill", style: { width: `${pct}%`, background: tone.color } })));
}
function AmbientRail({ ctx, activity, peer, messages, microcopy, onClose, sparklineValues, hoveredMsgIdx, onMinimapHover, onMinimapClick, showPowerMeter = true, showAnimationStage = true, isWorking = false, stageStaticImg = "", stageActiveVideo = "", stageRatioMode = "auto" }) {
  const sparkVals = sparklineValues && sparklineValues.length > 0 ? sparklineValues : Array(30).fill(0);
  return /* @__PURE__ */ React.createElement("aside", { className: "rail" }, /* @__PURE__ */ React.createElement("div", { className: "rail-head" }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-3)" } }, "ambient"), /* @__PURE__ */ React.createElement("button", { className: "btn icon ghost", onClick: onClose, title: "hide rail" }, /* @__PURE__ */ React.createElement(Icon, { name: "close", size: 10 }))), /* @__PURE__ */ React.createElement("div", { className: "rail-card glass" }, /* @__PURE__ */ React.createElement(
    TokenGauge,
    {
      used: ctx.used,
      total: ctx.total,
      pct: ctx.pct,
      label: ctx.label,
      sub: `cost ${ctx.cost} \xB7 ${ctx.tokensPerSec} t/s`
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "rail-spark" }, /* @__PURE__ */ React.createElement(Sparkline, { values: sparkVals, width: 210, height: 28 }), /* @__PURE__ */ React.createElement("div", { className: "rail-spark-foot mono" }, /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-4)" } }, "throughput"), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--accent)" } }, ctx.tokensPerSec, " t/s")))), showAnimationStage && /* @__PURE__ */ React.createElement(AnimationStageCard, { isWorking, staticImg: stageStaticImg, activeVideo: stageActiveVideo, ratioMode: stageRatioMode }), showPowerMeter && /* @__PURE__ */ React.createElement(PowerMeterCard, null), /* @__PURE__ */ React.createElement("div", { className: "rail-card glass", style: { flex: 1, display: "flex", flexDirection: "column", minHeight: 140 } }, /* @__PURE__ */ React.createElement("div", { className: "rail-card-head", style: { display: "flex", alignItems: "center" } }, /* @__PURE__ */ React.createElement(Icon, { name: "minimap", size: 11, color: "var(--fg-3)" }), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-2)" } }, "minimap"), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { marginLeft: "auto", color: "var(--fg-4)", fontSize: "11px" } }, messages.length)), /* @__PURE__ */ React.createElement(SessionMinimap, { messages, hoveredIdx: hoveredMsgIdx, onHover: onMinimapHover, onClick: onMinimapClick })));
}
Object.assign(window, { WindowChrome, TabBar, StatusBar, AmbientRail, SessionMinimap, PeerSession, AnimationStageCard, PowerMeterCard });

})();
