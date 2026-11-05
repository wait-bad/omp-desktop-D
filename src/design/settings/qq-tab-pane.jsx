/* design/settings/qq-tab-pane.jsx — VoceChat Universal Hub & Event History Inspector
   Native OMP Design System styling using .setting-card, spacious vertical layout,
   zero squishing, clear error diagnostics, and 100% universal configuration. */

(function () {
  const { Icon: _MIcon } = window;

  function QQTabPane() {
    const [bridgeState, setBridgeState] = React.useState(() => window.CADICE_SANCTUARY_BRIDGE?.getState?.() || window.CADICE_QQ_BRIDGE?.getState?.() || {});
    const [filterCategory, setFilterCategory] = React.useState("all");
    const [searchKeyword, setSearchKeyword] = React.useState("");
    const [expandedJsonId, setExpandedJsonId] = React.useState(null);

    // Form inputs state
    const [cfgServerUrl, setCfgServerUrl] = React.useState(() => bridgeState.serverUrl || "");
    const [cfgEmail, setCfgEmail] = React.useState(() => bridgeState.email || "");
    const [cfgPassword, setCfgPassword] = React.useState(() => bridgeState.password || "");
    const [cfgFeedback, setCfgFeedback] = React.useState(null);

    // Test send state
    const [sendType, setSendType] = React.useState("user"); // "user" | "group"
    const [sendTargetId, setSendTargetId] = React.useState(() => String(bridgeState.lastSenderUid || 1));
    const [testInput, setTestInput] = React.useState("");
    const [isSending, setIsSending] = React.useState(false);
    const [sendFeedback, setSendFeedback] = React.useState(null);

    // Subscribe to bridge updates
    React.useEffect(() => {
      const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
      if (!bridge) return;
      const unsub = bridge.subscribe((st) => {
        setBridgeState(st);
        if (st.lastSenderUid && !sendTargetId) {
          setSendTargetId(String(st.lastSenderUid));
        }
      });
      return unsub;
    }, []);

    // Sync persisted inputs if form was opened empty
    React.useEffect(() => {
      if (bridgeState.serverUrl && !cfgServerUrl) setCfgServerUrl(bridgeState.serverUrl);
      if (bridgeState.email && !cfgEmail) setCfgEmail(bridgeState.email);
      if (bridgeState.password && !cfgPassword) setCfgPassword(bridgeState.password);
    }, [bridgeState.serverUrl, bridgeState.email, bridgeState.password]);

    const isConnected = !!bridgeState.isConnected;
    const isReconnecting = !!bridgeState.isReconnecting;
    const events = bridgeState.historyEvents || [];

    // Filter events
    const filteredEvents = React.useMemo(() => {
      return events
        .filter((ev) => {
          if (filterCategory === "all") return true;
          if (filterCategory === "private") return ev.category === "private";
          if (filterCategory === "group") return ev.category === "group";
          return true;
        })
        .filter((ev) => {
          if (!searchKeyword.trim()) return true;
          const kw = searchKeyword.toLowerCase();
          return (
            (ev.cleanText && ev.cleanText.toLowerCase().includes(kw)) ||
            (ev.senderNick && ev.senderNick.toLowerCase().includes(kw)) ||
            (ev.userId && String(ev.userId).includes(kw))
          );
        })
        .reverse();
    }, [events, filterCategory, searchKeyword]);

    const handleSaveConfig = () => {
      const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
      const rawUrl = cfgServerUrl.trim();
      const rawEmail = cfgEmail.trim();
      const rawPass = cfgPassword.trim();

      if (!rawUrl || !rawEmail || !rawPass) {
        setCfgFeedback({ success: false, text: "请完整填写服务器地址、邮箱和密码！" });
        return;
      }

      bridge?.setConfig({
        serverUrl: rawUrl,
        email: rawEmail,
        password: rawPass,
      });

      setCfgFeedback({ success: true, text: "正在发起认证登录..." });
      setTimeout(() => setCfgFeedback(null), 4000);
    };

    const handleSendMsg = async () => {
      if (!testInput.trim() || isSending) return;
      const targetIdNum = parseInt(sendTargetId, 10);
      if (isNaN(targetIdNum) || targetIdNum <= 0) {
        setSendFeedback({ success: false, text: "请输入有效的目标 ID！" });
        return;
      }

      setIsSending(true);
      setSendFeedback(null);
      const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
      try {
        let res;
        if (sendType === "group") {
          res = await bridge?.sendGroupMsg(targetIdNum, testInput.trim());
        } else {
          res = await bridge?.sendPrivateMsg(targetIdNum, testInput.trim());
        }

        if (res && res.status === "ok") {
          setSendFeedback({
            success: true,
            text: sendType === "group" ? `消息已成功广播至群组 (GID: ${targetIdNum})！` : `消息已成功投递至私聊 (UID: ${targetIdNum})！`,
          });
          setTestInput("");
        } else {
          setSendFeedback({ success: false, text: res?.error || "发送失败，请检查连接状态" });
        }
      } catch (err) {
        setSendFeedback({ success: false, text: err.message || "请求异常" });
      } finally {
        setIsSending(false);
        setTimeout(() => setSendFeedback(null), 3500);
      }
    };

    return (
      <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* 1. 🌟 Card 1: 城堡连接状态与概览 (采用 OMP 原生 .setting-card 样式，彻底告别挤压) */}
        <div className="setting-card" style={{ margin: 0, padding: "16px 18px", borderColor: isConnected ? "var(--green)" : "var(--line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: isConnected ? "var(--green)" : "var(--bg-card)",
                  border: "1px solid var(--line-bright)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  boxShadow: isConnected ? "0 0 12px color-mix(in oklab, var(--green) 30%, transparent)" : "none"
                }}
              >
                {isConnected ? "🏰" : "🔒"}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>
                    {isConnected ? (bridgeState.selfNick || "已登录用户") : "未连接服务器"}
                  </span>
                  <span
                    className="chip mono"
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 10,
                      background: isConnected ? "color-mix(in oklab, var(--green) 15%, transparent)" : "color-mix(in oklab, var(--red) 15%, transparent)",
                      color: isConnected ? "var(--green)" : "var(--red)",
                      border: `1px solid ${isConnected ? "color-mix(in oklab, var(--green) 30%, transparent)" : "color-mix(in oklab, var(--red) 30%, transparent)"}`
                    }}
                  >
                    {isConnected ? "● 专线在线" : isReconnecting ? "◌ 重连中..." : "○ 离线"}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>
                  登录账号：<strong style={{ color: "var(--fg-2)" }}>{bridgeState.selfUid ? `${bridgeState.selfNick} (UID: ${bridgeState.selfUid})` : "(未登录)"}</strong>
                  {bridgeState.serverUrl && (
                    <span style={{ marginLeft: 12, fontFamily: "monospace", color: "var(--accent)" }}>{bridgeState.serverUrl}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="btn mini"
                onClick={() => {
                  const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
                  bridge?.syncHighWatermarkHistory();
                }}
                style={{ gap: 4 }}
              >
                <_MIcon name="refresh" size={12} />
                <span>同步历史</span>
              </button>

              {bridgeState.serverUrl && (
                <button
                  className="btn mini ghost"
                  onClick={() => window.open(bridgeState.serverUrl, "_blank")}
                  style={{ gap: 4 }}
                >
                  <_MIcon name="globe" size={12} />
                  <span>Web端</span>
                </button>
              )}

              <button
                className="btn mini primary"
                onClick={() => {
                  const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
                  bridge?.reconnect();
                }}
                style={{ gap: 4 }}
              >
                <_MIcon name="plug" size={12} />
                <span>重新连接</span>
              </button>
            </div>
          </div>

          {/* Dedicated Alert Banner */}
          {bridgeState.connectError && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 12px",
                borderRadius: 6,
                background: "color-mix(in oklab, var(--red) 12%, transparent)",
                border: "1px solid color-mix(in oklab, var(--red) 30%, transparent)",
                color: "var(--red)",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <_MIcon name="alert" size={13} color="var(--red)" />
              <span>{bridgeState.connectError}</span>
            </div>
          )}
        </div>

        {/* 2. 🌟 Card 2: 服务器与账号配置 (垂直整洁排版，永不压缩) */}
        <div className="setting-card" style={{ margin: 0, padding: 16 }}>
          <div className="setting-card-title" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <_MIcon name="settings" size={14} color="var(--accent)" />
            <span>VoceChat 服务器与账号登录</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Field 1: Server URL */}
            <div className="models-field-group">
              <label style={{ fontSize: 11.5, color: "var(--fg-3)", display: "block", marginBottom: 4 }}>
                服务器地址 (Server URL，支持 waitb.sbs、https:// 前缀或本地 IP):
              </label>
              <input
                type="text"
                className="twk-field mono"
                placeholder="例如 https://waitb.sbs 或 http://192.168.1.20:3009"
                value={cfgServerUrl}
                onChange={(e) => setCfgServerUrl(e.target.value)}
                style={{ width: "100%", padding: "6px 10px", fontSize: 12.5 }}
              />
            </div>

            {/* Field 2 & 3: Email and Password (2-col grid) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="models-field-group">
                <label style={{ fontSize: 11.5, color: "var(--fg-3)", display: "block", marginBottom: 4 }}>
                  账号邮箱 (Email):
                </label>
                <input
                  type="text"
                  className="twk-field"
                  placeholder="输入注册邮箱"
                  value={cfgEmail}
                  onChange={(e) => setCfgEmail(e.target.value)}
                  style={{ width: "100%", padding: "6px 10px", fontSize: 12.5 }}
                />
              </div>

              <div className="models-field-group">
                <label style={{ fontSize: 11.5, color: "var(--fg-3)", display: "block", marginBottom: 4 }}>
                  密码 (Password):
                </label>
                <input
                  type="password"
                  className="twk-field"
                  placeholder="输入密码"
                  value={cfgPassword}
                  onChange={(e) => setCfgPassword(e.target.value)}
                  style={{ width: "100%", padding: "6px 10px", fontSize: 12.5 }}
                />
              </div>
            </div>

            {/* Submit Action */}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 4 }}>
              {cfgFeedback && (
                <div style={{ fontSize: 12, color: cfgFeedback.success ? "var(--green)" : "var(--red)", display: "flex", alignItems: "center", gap: 6 }}>
                  <_MIcon name={cfgFeedback.success ? "check" : "alert"} size={13} />
                  <span>{cfgFeedback.text}</span>
                </div>
              )}

              <button
                className="btn primary"
                onClick={handleSaveConfig}
                style={{ minWidth: 130, padding: "6px 16px", fontWeight: 600 }}
              >
                保存并登录
              </button>
            </div>
          </div>
        </div>

        {/* 3. 🌟 Card 3: 互动发射台 */}
        <div className="setting-card" style={{ margin: 0, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div className="setting-card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <_MIcon name="send" size={14} color="var(--accent)" />
              <span>全双工互动发射台</span>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  className={`btn mini ${sendType === "user" ? "primary" : "ghost"}`}
                  onClick={() => setSendType("user")}
                  style={{ fontSize: 11, padding: "2px 8px" }}
                >
                  私聊 (UID)
                </button>
                <button
                  className={`btn mini ${sendType === "group" ? "primary" : "ghost"}`}
                  onClick={() => setSendType("group")}
                  style={{ fontSize: 11, padding: "2px 8px" }}
                >
                  群聊 (GID)
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{sendType === "group" ? "GID:" : "UID:"}</span>
                <input
                  type="number"
                  min="1"
                  value={sendTargetId}
                  onChange={(e) => setSendTargetId(e.target.value)}
                  className="twk-field mono"
                  style={{ width: 65, padding: "2px 6px", fontSize: 12, textAlign: "center" }}
                />
              </div>

              {bridgeState.lastSenderUid && (
                <button
                  className="btn mini ghost"
                  onClick={() => {
                    setSendType("user");
                    setSendTargetId(String(bridgeState.lastSenderUid));
                  }}
                  style={{ fontSize: 11, padding: "2px 8px", color: "var(--accent)" }}
                >
                  回复最后发信人 ({bridgeState.lastSenderNick || `UID:${bridgeState.lastSenderUid}`})
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              className="twk-field"
              placeholder={sendType === "group" ? `向群组 (GID: ${sendTargetId}) 广播消息...` : `向用户 (UID: ${sendTargetId}) 发送私聊消息...`}
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMsg()}
              style={{ flex: 1, padding: "6px 10px", fontSize: 12.5 }}
            />
            <button
              className="btn primary"
              onClick={handleSendMsg}
              disabled={isSending || !testInput.trim()}
              style={{ minWidth: 90 }}
            >
              {isSending ? "发送中..." : "发射消息"}
            </button>
          </div>

          {sendFeedback && (
            <div style={{ fontSize: 12, color: sendFeedback.success ? "var(--green)" : "var(--red)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <_MIcon name={sendFeedback.success ? "check" : "alert"} size={13} />
              <span>{sendFeedback.text}</span>
            </div>
          )}
        </div>

        {/* 4. 🌟 Card 4: 动态滑动窗口与防抖微调 */}
        <div className="setting-card" style={{ margin: 0, padding: 16 }}>
          <div className="setting-card-title" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <_MIcon name="clock" size={14} color="var(--accent)" />
            <span>滑动窗口防抖与队列控制</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Left checkboxes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--accent)", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={bridgeState.autoInjectSession !== false}
                  onChange={(e) => {
                    const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
                    bridge?.setConfig({ autoInjectSession: e.target.checked });
                  }}
                />
                <span>自动注入当前会话执行 (收到手机消息直接触发回车)</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={bridgeState.middlewareEnabled}
                  onChange={(e) => {
                    const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
                    bridge?.setConfig({ middlewareEnabled: e.target.checked });
                  }}
                />
                <span>启用消息防抖与断线自愈 (合并连续短句)</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={bridgeState.syntaxSnifferEnabled}
                  onChange={(e) => {
                    const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
                    bridge?.setConfig({ syntaxSnifferEnabled: e.target.checked });
                  }}
                />
                <span>严格句末终结符嗅探 (遇句末。！？即时收网)</span>
              </label>
            </div>

            {/* Right selects & sliders */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ color: "var(--fg-3)" }}>单条滑动静默期:</span>
                <select
                  className="twk-field"
                  style={{ width: 150, padding: "3px 6px", fontSize: 11.5 }}
                  value={bridgeState.debounceMs || 1500}
                  onChange={(e) => {
                    const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
                    bridge?.setConfig({ debounceMs: parseInt(e.target.value, 10) });
                  }}
                >
                  <option value={1000}>1.0 秒 (极速连发)</option>
                  <option value={1500}>1.5 秒 (推荐默认)</option>
                  <option value={2000}>2.0 秒</option>
                  <option value={3000}>3.0 秒</option>
                  <option value={5000}>5.0 秒</option>
                  <option value={10000}>10 秒</option>
                  <option value={30000}>30 秒</option>
                  <option value={60000}>60 秒 (最大1分钟)</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ color: "var(--fg-3)" }}>最大打包等待窗口:</span>
                <select
                  className="twk-field"
                  style={{ width: 150, padding: "3px 6px", fontSize: 11.5 }}
                  value={bridgeState.maxWaitMs || 10000}
                  onChange={(e) => {
                    const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
                    bridge?.setConfig({ maxWaitMs: parseInt(e.target.value, 10) });
                  }}
                >
                  <option value={10000}>10 秒 (极速打包)</option>
                  <option value={20000}>20 秒</option>
                  <option value={30000}>30 秒</option>
                  <option value={60000}>1 分钟 (标准等待)</option>
                  <option value={120000}>2 分钟</option>
                  <option value={180000}>3 分钟</option>
                  <option value={300000}>5 分钟 (最大5分钟)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 5. 🌟 Card 5: 实时事件流记录 */}
        <div className="setting-card" style={{ margin: 0, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div className="setting-card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <_MIcon name="database" size={14} color="var(--accent)" />
              <span>实时消息事件流 (共 {filteredEvents.length} 条)</span>
            </div>

            <button
              className="btn mini ghost"
              onClick={() => {
                if (confirm("确定清空本地缓存的事件记录吗？")) {
                  const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
                  bridge?.clearHistory();
                }
              }}
              style={{ color: "var(--red)" }}
            >
              清空
            </button>
          </div>

          <div
            style={{
              maxHeight: 280,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {filteredEvents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px", color: "var(--fg-4)", fontSize: 12 }}>
                暂无匹配的消息事件。当服务器有数据流动时将在此处实时刷新。
              </div>
            ) : (
              filteredEvents.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontSize: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="chip" style={{ fontSize: 10, padding: "1px 6px" }}>
                        {ev.category === "private" ? "私聊" : "群聊"}
                      </span>
                      <strong style={{ color: "var(--fg)" }}>{ev.senderNick}</strong>
                      <span className="mono" style={{ color: "var(--fg-4)", fontSize: 11 }}>UID: {ev.userId}</span>
                    </div>
                    <span className="mono" style={{ color: "var(--fg-4)", fontSize: 11 }}>{ev.timeStr}</span>
                  </div>
                  <div style={{ color: "var(--fg-2)", lineHeight: "1.4", wordBreak: "break-all" }}>
                    {ev.cleanText || <span style={{ color: "var(--fg-4)", fontStyle: "italic" }}>(空正文)</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  window.QQTabPane = QQTabPane;
  window.SanctuaryTabPane = QQTabPane;
})();
