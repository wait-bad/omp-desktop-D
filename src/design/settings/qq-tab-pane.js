/* Transpiled from design/settings/qq-tab-pane.jsx via esbuild — DO NOT EDIT DIRECTLY */
(function() {
(function() {
  const { Icon: _MIcon } = window;
  function QQTabPane() {
    const [bridgeState, setBridgeState] = React.useState(() => window.CADICE_SANCTUARY_BRIDGE?.getState?.() || window.CADICE_QQ_BRIDGE?.getState?.() || {});
    const [filterCategory, setFilterCategory] = React.useState("all");
    const [searchKeyword, setSearchKeyword] = React.useState("");
    const [expandedJsonId, setExpandedJsonId] = React.useState(null);
    const [cfgServerUrl, setCfgServerUrl] = React.useState(() => bridgeState.serverUrl || "");
    const [cfgEmail, setCfgEmail] = React.useState(() => bridgeState.email || "");
    const [cfgPassword, setCfgPassword] = React.useState(() => bridgeState.password || "");
    const [cfgFeedback, setCfgFeedback] = React.useState(null);
    const [sendType, setSendType] = React.useState("user");
    const [sendTargetId, setSendTargetId] = React.useState(() => String(bridgeState.lastSenderUid || 1));
    const [testInput, setTestInput] = React.useState("");
    const [isSending, setIsSending] = React.useState(false);
    const [sendFeedback, setSendFeedback] = React.useState(null);
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
    React.useEffect(() => {
      if (bridgeState.serverUrl && !cfgServerUrl) setCfgServerUrl(bridgeState.serverUrl);
      if (bridgeState.email && !cfgEmail) setCfgEmail(bridgeState.email);
      if (bridgeState.password && !cfgPassword) setCfgPassword(bridgeState.password);
    }, [bridgeState.serverUrl, bridgeState.email, bridgeState.password]);
    const isConnected = !!bridgeState.isConnected;
    const isReconnecting = !!bridgeState.isReconnecting;
    const events = bridgeState.historyEvents || [];
    const filteredEvents = React.useMemo(() => {
      return events.filter((ev) => {
        if (filterCategory === "all") return true;
        if (filterCategory === "private") return ev.category === "private";
        if (filterCategory === "group") return ev.category === "group";
        return true;
      }).filter((ev) => {
        if (!searchKeyword.trim()) return true;
        const kw = searchKeyword.toLowerCase();
        return ev.cleanText && ev.cleanText.toLowerCase().includes(kw) || ev.senderNick && ev.senderNick.toLowerCase().includes(kw) || ev.userId && String(ev.userId).includes(kw);
      }).reverse();
    }, [events, filterCategory, searchKeyword]);
    const handleSaveConfig = () => {
      const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
      const rawUrl = cfgServerUrl.trim();
      const rawEmail = cfgEmail.trim();
      const rawPass = cfgPassword.trim();
      if (!rawUrl || !rawEmail || !rawPass) {
        setCfgFeedback({ success: false, text: "\u8BF7\u5B8C\u6574\u586B\u5199\u670D\u52A1\u5668\u5730\u5740\u3001\u90AE\u7BB1\u548C\u5BC6\u7801\uFF01" });
        return;
      }
      bridge?.setConfig({
        serverUrl: rawUrl,
        email: rawEmail,
        password: rawPass
      });
      setCfgFeedback({ success: true, text: "\u6B63\u5728\u53D1\u8D77\u8BA4\u8BC1\u767B\u5F55..." });
      setTimeout(() => setCfgFeedback(null), 4e3);
    };
    const handleSendMsg = async () => {
      if (!testInput.trim() || isSending) return;
      const targetIdNum = parseInt(sendTargetId, 10);
      if (isNaN(targetIdNum) || targetIdNum <= 0) {
        setSendFeedback({ success: false, text: "\u8BF7\u8F93\u5165\u6709\u6548\u7684\u76EE\u6807 ID\uFF01" });
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
            text: sendType === "group" ? `\u6D88\u606F\u5DF2\u6210\u529F\u5E7F\u64AD\u81F3\u7FA4\u7EC4 (GID: ${targetIdNum})\uFF01` : `\u6D88\u606F\u5DF2\u6210\u529F\u6295\u9012\u81F3\u79C1\u804A (UID: ${targetIdNum})\uFF01`
          });
          setTestInput("");
        } else {
          setSendFeedback({ success: false, text: res?.error || "\u53D1\u9001\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u8FDE\u63A5\u72B6\u6001" });
        }
      } catch (err) {
        setSendFeedback({ success: false, text: err.message || "\u8BF7\u6C42\u5F02\u5E38" });
      } finally {
        setIsSending(false);
        setTimeout(() => setSendFeedback(null), 3500);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement("div", { className: "setting-card", style: { margin: 0, padding: "16px 18px", borderColor: isConnected ? "var(--green)" : "var(--line)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 14 } }, /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
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
        }
      },
      isConnected ? "\u{1F3F0}" : "\u{1F512}"
    ), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 15, fontWeight: 700, color: "var(--fg)" } }, isConnected ? bridgeState.selfNick || "\u5DF2\u767B\u5F55\u7528\u6237" : "\u672A\u8FDE\u63A5\u670D\u52A1\u5668"), /* @__PURE__ */ React.createElement(
      "span",
      {
        className: "chip mono",
        style: {
          fontSize: 11,
          padding: "2px 8px",
          borderRadius: 10,
          background: isConnected ? "color-mix(in oklab, var(--green) 15%, transparent)" : "color-mix(in oklab, var(--red) 15%, transparent)",
          color: isConnected ? "var(--green)" : "var(--red)",
          border: `1px solid ${isConnected ? "color-mix(in oklab, var(--green) 30%, transparent)" : "color-mix(in oklab, var(--red) 30%, transparent)"}`
        }
      },
      isConnected ? "\u25CF \u4E13\u7EBF\u5728\u7EBF" : isReconnecting ? "\u25CC \u91CD\u8FDE\u4E2D..." : "\u25CB \u79BB\u7EBF"
    )), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "var(--fg-3)", marginTop: 4 } }, "\u767B\u5F55\u8D26\u53F7\uFF1A", /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--fg-2)" } }, bridgeState.selfUid ? `${bridgeState.selfNick} (UID: ${bridgeState.selfUid})` : "(\u672A\u767B\u5F55)"), bridgeState.serverUrl && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 12, fontFamily: "monospace", color: "var(--accent)" } }, bridgeState.serverUrl)))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn mini",
        onClick: () => {
          const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
          bridge?.syncHighWatermarkHistory();
        },
        style: { gap: 4 }
      },
      /* @__PURE__ */ React.createElement(_MIcon, { name: "refresh", size: 12 }),
      /* @__PURE__ */ React.createElement("span", null, "\u540C\u6B65\u5386\u53F2")
    ), bridgeState.serverUrl && /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn mini ghost",
        onClick: () => window.open(bridgeState.serverUrl, "_blank"),
        style: { gap: 4 }
      },
      /* @__PURE__ */ React.createElement(_MIcon, { name: "globe", size: 12 }),
      /* @__PURE__ */ React.createElement("span", null, "Web\u7AEF")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn mini primary",
        onClick: () => {
          const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
          bridge?.reconnect();
        },
        style: { gap: 4 }
      },
      /* @__PURE__ */ React.createElement(_MIcon, { name: "plug", size: 12 }),
      /* @__PURE__ */ React.createElement("span", null, "\u91CD\u65B0\u8FDE\u63A5")
    ))), bridgeState.connectError && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          marginTop: 12,
          padding: "8px 12px",
          borderRadius: 6,
          background: "color-mix(in oklab, var(--red) 12%, transparent)",
          border: "1px solid color-mix(in oklab, var(--red) 30%, transparent)",
          color: "var(--red)",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          gap: 8
        }
      },
      /* @__PURE__ */ React.createElement(_MIcon, { name: "alert", size: 13, color: "var(--red)" }),
      /* @__PURE__ */ React.createElement("span", null, bridgeState.connectError)
    )), /* @__PURE__ */ React.createElement("div", { className: "setting-card", style: { margin: 0, padding: 16 } }, /* @__PURE__ */ React.createElement("div", { className: "setting-card-title", style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 12 } }, /* @__PURE__ */ React.createElement(_MIcon, { name: "settings", size: 14, color: "var(--accent)" }), /* @__PURE__ */ React.createElement("span", null, "VoceChat \u670D\u52A1\u5668\u4E0E\u8D26\u53F7\u767B\u5F55")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { className: "models-field-group" }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11.5, color: "var(--fg-3)", display: "block", marginBottom: 4 } }, "\u670D\u52A1\u5668\u5730\u5740 (Server URL\uFF0C\u652F\u6301 waitb.sbs\u3001https:// \u524D\u7F00\u6216\u672C\u5730 IP):"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "twk-field mono",
        placeholder: "\u4F8B\u5982 https://waitb.sbs \u6216 http://192.168.1.20:3009",
        value: cfgServerUrl,
        onChange: (e) => setCfgServerUrl(e.target.value),
        style: { width: "100%", padding: "6px 10px", fontSize: 12.5 }
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { className: "models-field-group" }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11.5, color: "var(--fg-3)", display: "block", marginBottom: 4 } }, "\u8D26\u53F7\u90AE\u7BB1 (Email):"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "twk-field",
        placeholder: "\u8F93\u5165\u6CE8\u518C\u90AE\u7BB1",
        value: cfgEmail,
        onChange: (e) => setCfgEmail(e.target.value),
        style: { width: "100%", padding: "6px 10px", fontSize: 12.5 }
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "models-field-group" }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11.5, color: "var(--fg-3)", display: "block", marginBottom: 4 } }, "\u5BC6\u7801 (Password):"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "password",
        className: "twk-field",
        placeholder: "\u8F93\u5165\u5BC6\u7801",
        value: cfgPassword,
        onChange: (e) => setCfgPassword(e.target.value),
        style: { width: "100%", padding: "6px 10px", fontSize: 12.5 }
      }
    ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 4 } }, cfgFeedback && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: cfgFeedback.success ? "var(--green)" : "var(--red)", display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement(_MIcon, { name: cfgFeedback.success ? "check" : "alert", size: 13 }), /* @__PURE__ */ React.createElement("span", null, cfgFeedback.text)), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn primary",
        onClick: handleSaveConfig,
        style: { minWidth: 130, padding: "6px 16px", fontWeight: 600 }
      },
      "\u4FDD\u5B58\u5E76\u767B\u5F55"
    )))), /* @__PURE__ */ React.createElement("div", { className: "setting-card", style: { margin: 0, padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { className: "setting-card-title", style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement(_MIcon, { name: "send", size: 14, color: "var(--accent)" }), /* @__PURE__ */ React.createElement("span", null, "\u5168\u53CC\u5DE5\u4E92\u52A8\u53D1\u5C04\u53F0")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `btn mini ${sendType === "user" ? "primary" : "ghost"}`,
        onClick: () => setSendType("user"),
        style: { fontSize: 11, padding: "2px 8px" }
      },
      "\u79C1\u804A (UID)"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `btn mini ${sendType === "group" ? "primary" : "ghost"}`,
        onClick: () => setSendType("group"),
        style: { fontSize: 11, padding: "2px 8px" }
      },
      "\u7FA4\u804A (GID)"
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "var(--fg-4)" } }, sendType === "group" ? "GID:" : "UID:"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        min: "1",
        value: sendTargetId,
        onChange: (e) => setSendTargetId(e.target.value),
        className: "twk-field mono",
        style: { width: 65, padding: "2px 6px", fontSize: 12, textAlign: "center" }
      }
    )), bridgeState.lastSenderUid && /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn mini ghost",
        onClick: () => {
          setSendType("user");
          setSendTargetId(String(bridgeState.lastSenderUid));
        },
        style: { fontSize: 11, padding: "2px 8px", color: "var(--accent)" }
      },
      "\u56DE\u590D\u6700\u540E\u53D1\u4FE1\u4EBA (",
      bridgeState.lastSenderNick || `UID:${bridgeState.lastSenderUid}`,
      ")"
    ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "twk-field",
        placeholder: sendType === "group" ? `\u5411\u7FA4\u7EC4 (GID: ${sendTargetId}) \u5E7F\u64AD\u6D88\u606F...` : `\u5411\u7528\u6237 (UID: ${sendTargetId}) \u53D1\u9001\u79C1\u804A\u6D88\u606F...`,
        value: testInput,
        onChange: (e) => setTestInput(e.target.value),
        onKeyDown: (e) => e.key === "Enter" && handleSendMsg(),
        style: { flex: 1, padding: "6px 10px", fontSize: 12.5 }
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn primary",
        onClick: handleSendMsg,
        disabled: isSending || !testInput.trim(),
        style: { minWidth: 90 }
      },
      isSending ? "\u53D1\u9001\u4E2D..." : "\u53D1\u5C04\u6D88\u606F"
    )), sendFeedback && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: sendFeedback.success ? "var(--green)" : "var(--red)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement(_MIcon, { name: sendFeedback.success ? "check" : "alert", size: 13 }), /* @__PURE__ */ React.createElement("span", null, sendFeedback.text))), /* @__PURE__ */ React.createElement("div", { className: "setting-card", style: { margin: 0, padding: 16 } }, /* @__PURE__ */ React.createElement("div", { className: "setting-card-title", style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 12 } }, /* @__PURE__ */ React.createElement(_MIcon, { name: "clock", size: 14, color: "var(--accent)" }), /* @__PURE__ */ React.createElement("span", null, "\u6ED1\u52A8\u7A97\u53E3\u9632\u6296\u4E0E\u961F\u5217\u63A7\u5236")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, fontSize: 12 } }, /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--accent)", fontWeight: 600 } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: bridgeState.autoInjectSession !== false,
        onChange: (e) => {
          const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
          bridge?.setConfig({ autoInjectSession: e.target.checked });
        }
      }
    ), /* @__PURE__ */ React.createElement("span", null, "\u81EA\u52A8\u6CE8\u5165\u5F53\u524D\u4F1A\u8BDD\u6267\u884C (\u6536\u5230\u624B\u673A\u6D88\u606F\u76F4\u63A5\u89E6\u53D1\u56DE\u8F66)")), /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: bridgeState.middlewareEnabled,
        onChange: (e) => {
          const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
          bridge?.setConfig({ middlewareEnabled: e.target.checked });
        }
      }
    ), /* @__PURE__ */ React.createElement("span", null, "\u542F\u7528\u6D88\u606F\u9632\u6296\u4E0E\u65AD\u7EBF\u81EA\u6108 (\u5408\u5E76\u8FDE\u7EED\u77ED\u53E5)")), /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: bridgeState.syntaxSnifferEnabled,
        onChange: (e) => {
          const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
          bridge?.setConfig({ syntaxSnifferEnabled: e.target.checked });
        }
      }
    ), /* @__PURE__ */ React.createElement("span", null, "\u4E25\u683C\u53E5\u672B\u7EC8\u7ED3\u7B26\u55C5\u63A2 (\u9047\u53E5\u672B\u3002\uFF01\uFF1F\u5373\u65F6\u6536\u7F51)"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, fontSize: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-3)" } }, "\u5355\u6761\u6ED1\u52A8\u9759\u9ED8\u671F:"), /* @__PURE__ */ React.createElement(
      "select",
      {
        className: "twk-field",
        style: { width: 150, padding: "3px 6px", fontSize: 11.5 },
        value: bridgeState.debounceMs || 1500,
        onChange: (e) => {
          const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
          bridge?.setConfig({ debounceMs: parseInt(e.target.value, 10) });
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: 1e3 }, "1.0 \u79D2 (\u6781\u901F\u8FDE\u53D1)"),
      /* @__PURE__ */ React.createElement("option", { value: 1500 }, "1.5 \u79D2 (\u63A8\u8350\u9ED8\u8BA4)"),
      /* @__PURE__ */ React.createElement("option", { value: 2e3 }, "2.0 \u79D2"),
      /* @__PURE__ */ React.createElement("option", { value: 3e3 }, "3.0 \u79D2"),
      /* @__PURE__ */ React.createElement("option", { value: 5e3 }, "5.0 \u79D2"),
      /* @__PURE__ */ React.createElement("option", { value: 1e4 }, "10 \u79D2"),
      /* @__PURE__ */ React.createElement("option", { value: 3e4 }, "30 \u79D2"),
      /* @__PURE__ */ React.createElement("option", { value: 6e4 }, "60 \u79D2 (\u6700\u59271\u5206\u949F)")
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-3)" } }, "\u6700\u5927\u6253\u5305\u7B49\u5F85\u7A97\u53E3:"), /* @__PURE__ */ React.createElement(
      "select",
      {
        className: "twk-field",
        style: { width: 150, padding: "3px 6px", fontSize: 11.5 },
        value: bridgeState.maxWaitMs || 1e4,
        onChange: (e) => {
          const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
          bridge?.setConfig({ maxWaitMs: parseInt(e.target.value, 10) });
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: 1e4 }, "10 \u79D2 (\u6781\u901F\u6253\u5305)"),
      /* @__PURE__ */ React.createElement("option", { value: 2e4 }, "20 \u79D2"),
      /* @__PURE__ */ React.createElement("option", { value: 3e4 }, "30 \u79D2"),
      /* @__PURE__ */ React.createElement("option", { value: 6e4 }, "1 \u5206\u949F (\u6807\u51C6\u7B49\u5F85)"),
      /* @__PURE__ */ React.createElement("option", { value: 12e4 }, "2 \u5206\u949F"),
      /* @__PURE__ */ React.createElement("option", { value: 18e4 }, "3 \u5206\u949F"),
      /* @__PURE__ */ React.createElement("option", { value: 3e5 }, "5 \u5206\u949F (\u6700\u59275\u5206\u949F)")
    ))))), /* @__PURE__ */ React.createElement("div", { className: "setting-card", style: { margin: 0, padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { className: "setting-card-title", style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement(_MIcon, { name: "database", size: 14, color: "var(--accent)" }), /* @__PURE__ */ React.createElement("span", null, "\u5B9E\u65F6\u6D88\u606F\u4E8B\u4EF6\u6D41 (\u5171 ", filteredEvents.length, " \u6761)")), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn mini ghost",
        onClick: () => {
          if (confirm("\u786E\u5B9A\u6E05\u7A7A\u672C\u5730\u7F13\u5B58\u7684\u4E8B\u4EF6\u8BB0\u5F55\u5417\uFF1F")) {
            const bridge = window.CADICE_SANCTUARY_BRIDGE || window.CADICE_QQ_BRIDGE;
            bridge?.clearHistory();
          }
        },
        style: { color: "var(--red)" }
      },
      "\u6E05\u7A7A"
    )), /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          maxHeight: 280,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8
        }
      },
      filteredEvents.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "30px", color: "var(--fg-4)", fontSize: 12 } }, "\u6682\u65E0\u5339\u914D\u7684\u6D88\u606F\u4E8B\u4EF6\u3002\u5F53\u670D\u52A1\u5668\u6709\u6570\u636E\u6D41\u52A8\u65F6\u5C06\u5728\u6B64\u5904\u5B9E\u65F6\u5237\u65B0\u3002") : filteredEvents.map((ev) => /* @__PURE__ */ React.createElement(
        "div",
        {
          key: ev.id,
          style: {
            background: "var(--bg-card)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 12,
            display: "flex",
            flexDirection: "column",
            gap: 4
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { className: "chip", style: { fontSize: 10, padding: "1px 6px" } }, ev.category === "private" ? "\u79C1\u804A" : "\u7FA4\u804A"), /* @__PURE__ */ React.createElement("strong", { style: { color: "var(--fg)" } }, ev.senderNick), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-4)", fontSize: 11 } }, "UID: ", ev.userId)), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--fg-4)", fontSize: 11 } }, ev.timeStr)),
        /* @__PURE__ */ React.createElement("div", { style: { color: "var(--fg-2)", lineHeight: "1.4", wordBreak: "break-all" } }, ev.cleanText || /* @__PURE__ */ React.createElement("span", { style: { color: "var(--fg-4)", fontStyle: "italic" } }, "(\u7A7A\u6B63\u6587)"))
      ))
    )));
  }
  window.QQTabPane = QQTabPane;
  window.SanctuaryTabPane = QQTabPane;
})();

})();
