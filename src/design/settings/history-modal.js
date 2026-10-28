/* Transpiled from design/settings/history-modal.jsx via esbuild — DO NOT EDIT DIRECTLY */
(function() {
function HistoryModal({ isOpen, onClose, onResumeSession }) {
  const [sessions, setSessions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const loadHistory = React.useCallback(async () => {
    if (!window.OMP_BRIDGE?.listHistory) return;
    setLoading(true);
    try {
      const list = await window.OMP_BRIDGE.listHistory();
      setSessions(list || []);
    } catch (e) {
      console.error("[HistoryModal] Failed to load history:", e);
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);
  const handleDelete = async (e, s) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete this session?
"${s.title}"`)) {
      return;
    }
    try {
      await window.OMP_BRIDGE.deleteHistory(s.path);
      setSessions((prev) => prev.filter((item) => item.path !== s.path));
    } catch (err) {
      alert("Failed to delete session: " + err);
    }
  };
  const handleToggleArchive = async (e, s) => {
    e.stopPropagation();
    try {
      await window.OMP_BRIDGE.toggleArchiveHistory(s.path);
      await loadHistory();
    } catch (err) {
      alert("Failed to update archive status: " + err);
    }
  };
  const handleResume = (s) => {
    if (onResumeSession) {
      onResumeSession(s);
      onClose();
    }
  };
  if (!isOpen) return null;
  const filtered = sessions.filter((s) => {
    if (filter === "active" && s.is_archived) return false;
    if (filter === "archived" && !s.is_archived) return false;
    if (search.trim()) {
      const query = search.toLowerCase();
      const matchTitle = (s.title || "").toLowerCase().includes(query);
      const matchFolder = (s.folder || "").toLowerCase().includes(query);
      const matchId = (s.id || "").toLowerCase().includes(query);
      return matchTitle || matchFolder || matchId;
    }
    return true;
  });
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      },
      onClick: onClose
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          width: 780,
          maxWidth: "92vw",
          height: 600,
          maxHeight: "88vh",
          backgroundColor: "var(--bg-1, #16181d)",
          border: "1px solid var(--line, #2c3038)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 48px rgba(0,0,0,0.6)",
          color: "var(--fg-1, #e6edf3)",
          fontFamily: "var(--font-sans, inherit)"
        },
        onClick: (e) => e.stopPropagation()
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            padding: "16px 20px",
            borderBottom: "1px solid var(--line, #2c3038)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-2, #1b1e24)"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement("div", { style: {
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "rgba(138, 240, 200, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        } }, /* @__PURE__ */ React.createElement(Icon, { name: "clock", size: 16, color: "var(--accent, #8AF0C8)" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 600, letterSpacing: -0.2 } }, "Session History"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--fg-4, #768390)" } }, "Resume past dialogues or manage storage"))),
        /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "btn ghost",
            onClick: onClose,
            style: { padding: "4px 8px", cursor: "pointer", borderRadius: 6 }
          },
          /* @__PURE__ */ React.createElement(Icon, { name: "close", size: 14, color: "var(--fg-3)" })
        )
      ),
      /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            padding: "12px 20px",
            borderBottom: "1px solid var(--line, #2c3038)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "var(--bg-1, #16181d)"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flex: 1, position: "relative" } }, /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", left: 10, pointerEvents: "none", display: "flex" } }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 13, color: "var(--fg-4)" })), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            placeholder: "Search past questions or folders...",
            value: search,
            onChange: (e) => setSearch(e.target.value),
            style: {
              width: "100%",
              padding: "6px 10px 6px 30px",
              borderRadius: 6,
              backgroundColor: "var(--bg-2, #1b1e24)",
              border: "1px solid var(--line, #2c3038)",
              color: "var(--fg-1)",
              fontSize: 13,
              outline: "none"
            }
          }
        )),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, ["all", "active", "archived"].map((mode) => /* @__PURE__ */ React.createElement(
          "button",
          {
            key: mode,
            className: `btn ${filter === mode ? "primary" : "ghost"}`,
            style: {
              fontSize: 12,
              padding: "4px 10px",
              height: 28,
              borderRadius: 6,
              textTransform: "capitalize"
            },
            onClick: () => setFilter(mode)
          },
          mode
        )))
      ),
      /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            flex: 1,
            overflowY: "auto",
            padding: "12px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 8
          }
        },
        loading ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "40px 0", color: "var(--fg-4)" } }, "Loading sessions...") : filtered.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "40px 0", color: "var(--fg-4)", fontSize: 13 } }, search ? "No matching sessions found." : "No saved sessions yet.") : filtered.map((s) => {
          const dateStr = s.mtime ? new Date(s.mtime * 1e3).toLocaleString() : "";
          return /* @__PURE__ */ React.createElement(
            "div",
            {
              key: s.path,
              onClick: () => handleResume(s),
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: 8,
                background: "var(--bg-2, #1b1e24)",
                border: "1px solid var(--line, #2c3038)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              },
              onMouseEnter: (e) => {
                e.currentTarget.style.borderColor = "var(--accent, #8AF0C8)";
                e.currentTarget.style.transform = "translateY(-1px)";
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.borderColor = "var(--line, #2c3038)";
                e.currentTarget.style.transform = "none";
              }
            },
            /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0, paddingRight: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement(
              "span",
              {
                style: {
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--fg-1)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }
              },
              s.title
            ), s.is_archived && /* @__PURE__ */ React.createElement(
              "span",
              {
                style: {
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "rgba(255, 197, 110, 0.15)",
                  color: "var(--amber, #FFC56E)",
                  border: "1px solid rgba(255, 197, 110, 0.3)",
                  fontWeight: 600
                }
              },
              "ARCHIVED"
            )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--fg-4)" } }, /* @__PURE__ */ React.createElement("span", { className: "mono" }, dateStr), /* @__PURE__ */ React.createElement("span", null, "\xB7"), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-3)" } }, s.folder.replace(/^-/, "").replace(/-/g, "/")), /* @__PURE__ */ React.createElement("span", null, "\xB7"), /* @__PURE__ */ React.createElement("span", { className: "mono" }, (s.size / 1024).toFixed(1), " KB"))),
            /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 }, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
              "button",
              {
                className: "btn ghost",
                title: "Resume session",
                onClick: () => handleResume(s),
                style: {
                  padding: "5px 10px",
                  fontSize: 12,
                  borderRadius: 6,
                  color: "var(--accent)",
                  borderColor: "rgba(138, 240, 200, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }
              },
              /* @__PURE__ */ React.createElement(Icon, { name: "play", size: 11, color: "var(--accent)" }),
              "Resume"
            ), /* @__PURE__ */ React.createElement(
              "button",
              {
                className: "btn ghost",
                title: s.is_archived ? "Unarchive" : "Archive",
                onClick: (e) => handleToggleArchive(e, s),
                style: { padding: "6px", borderRadius: 6 }
              },
              /* @__PURE__ */ React.createElement(Icon, { name: s.is_archived ? "refresh" : "plan", size: 13, color: "var(--fg-3)" })
            ), /* @__PURE__ */ React.createElement(
              "button",
              {
                className: "btn ghost",
                title: "Delete session",
                onClick: (e) => handleDelete(e, s),
                style: { padding: "6px", borderRadius: 6, color: "var(--red, #ff7a7a)" }
              },
              /* @__PURE__ */ React.createElement(Icon, { name: "trash", size: 13, color: "var(--red, #ff7a7a)" })
            ))
          );
        })
      )
    )
  );
}
window.HistoryModal = HistoryModal;

})();
