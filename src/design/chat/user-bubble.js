/* Transpiled from design/chat/user-bubble.jsx via esbuild — DO NOT EDIT DIRECTLY */
(function() {
function UserBubble({ msg, idx, highlighted }) {
  const tweaks = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("omp-desktop:tweaks") || "{}");
    } catch {
      return {};
    }
  }, []);
  const rawUserName = tweaks.userName?.trim() || "you";
  const userName = rawUserName.replace(/\s*\(.*?\)\s*/g, "").trim() || "you";
  const userAvatar = tweaks.userAvatar?.trim();
  return /* @__PURE__ */ React.createElement("div", { className: `row user fade-up${highlighted ? " mm-hot" : ""}`, "data-msg-idx": idx, style: { display: "flex", gap: 12, justifyContent: "flex-end" } }, /* @__PURE__ */ React.createElement("div", { className: "user-bubble selectable" }, /* @__PURE__ */ React.createElement("div", { className: "user-meta", style: { display: "flex", gap: 8, alignItems: "center", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-4)" } }, msg.time), /* @__PURE__ */ React.createElement("span", { className: "chip muted" }, userName)), msg.images && msg.images.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: msg.text ? 8 : 0 } }, msg.images.map((img, i) => /* @__PURE__ */ React.createElement(
    "img",
    {
      key: i,
      src: typeof img === "string" ? img : img.url || (img.data ? `data:${img.mimeType || "image/png"};base64,${img.data}` : ""),
      alt: "",
      style: { maxWidth: 200, maxHeight: 150, borderRadius: 8, objectFit: "cover", border: "1px solid var(--line)" }
    }
  ))), msg.text ? /* @__PURE__ */ React.createElement("div", { className: "user-text" }, msg.text) : null), /* @__PURE__ */ React.createElement("div", { className: "user-rail", style: { flexShrink: 0, width: 45, height: 45, borderRadius: "50%", overflow: "hidden", border: "1.5px solid var(--accent)", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" } }, userAvatar ? /* @__PURE__ */ React.createElement(
    "img",
    {
      src: userAvatar,
      alt: "",
      style: { width: "100%", height: "100%", objectFit: "cover" },
      onError: (e) => {
        e.target.style.display = "none";
      }
    }
  ) : /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: 15, fontWeight: 600, color: "var(--accent)" } }, userName.slice(0, 1).toUpperCase())));
}
Object.assign(window, { UserBubble });

})();
