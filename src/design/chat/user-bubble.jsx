/* chat/user-bubble.jsx — user-side bubble, right-aligned. */

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

  return (
    <div className={`row user fade-up${highlighted ? " mm-hot" : ""}`} data-msg-idx={idx} style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
      <div className="user-bubble selectable">
        <div className="user-meta" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
          <span className="mono" style={{ color: "var(--fg-4)" }}>{msg.time}</span>
          <span className="chip muted">{userName}</span>
        </div>
        <div className="user-text">{msg.text}</div>
      </div>
      <div className="user-rail" style={{ flexShrink: 0, width: 45, height: 45, borderRadius: "50%", overflow: "hidden", border: "1.5px solid var(--accent)", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {userAvatar ? (
          <img
            src={userAvatar}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--accent)" }}>
            {userName.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { UserBubble });
