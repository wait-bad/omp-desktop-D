/* design/settings/models-modal.jsx — Unified Settings Modal (API & Models, Persona, Appearance/Background) */

(function () {
  const { Icon: _MIcon } = window;

  // Preset templates for quick 1-click zero friction config
  const PRESETS = {
    openai: {
      name: "OpenAI Official",
      api: "openai-completions",
      baseUrl: "https://api.openai.com/v1",
      models: [
        { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000, reasoning: false },
        { id: "gpt-4o-mini", name: "GPT-4o mini", contextWindow: 128000, reasoning: false },
        { id: "o1", name: "o1", contextWindow: 200000, reasoning: true, thinking: { mode: "effort", efforts: ["low", "medium", "high"], defaultLevel: "high" } },
        { id: "o3-mini", name: "o3-mini", contextWindow: 200000, reasoning: true, thinking: { mode: "effort", efforts: ["low", "medium", "high"], defaultLevel: "medium" } }
      ]
    },
    anthropic: {
      name: "Anthropic Claude",
      api: "anthropic-messages",
      baseUrl: "https://api.anthropic.com/v1",
      models: [
        { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet", contextWindow: 200000, reasoning: true, thinking: { mode: "budget", defaultBudget: 4000 } },
        { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", contextWindow: 200000, reasoning: false },
        { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", contextWindow: 200000, reasoning: false }
      ]
    },
    deepseek: {
      name: "DeepSeek Official",
      api: "openai-completions",
      baseUrl: "https://api.deepseek.com/v1",
      models: [
        { id: "deepseek-chat", name: "DeepSeek V3 (Chat)", contextWindow: 64000, reasoning: false },
        { id: "deepseek-reasoner", name: "DeepSeek R1", contextWindow: 64000, reasoning: true, thinking: { mode: "effort", defaultLevel: "high" } }
      ]
    },
    openrouter: {
      name: "OpenRouter",
      api: "openai-completions",
      baseUrl: "https://openrouter.ai/api/v1",
      models: [
        { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet", contextWindow: 200000, reasoning: true },
        { id: "deepseek/deepseek-r1", name: "DeepSeek R1", contextWindow: 128000, reasoning: true },
        { id: "openai/gpt-4o", name: "GPT-4o", contextWindow: 128000, reasoning: false }
      ]
    },
    custom: {
      name: "Custom OneAPI / Relay / Other",
      api: "openai-completions",
      baseUrl: "https://your-relay-domain.com/v1",
      models: [
        { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000, reasoning: false }
      ]
    }
  };

  const API_PROTOCOLS = [
    { value: "openai-completions", label: "OpenAI Compatible (openai-completions)" },
    { value: "anthropic-messages", label: "Anthropic Messages (anthropic-messages)" },
    { value: "google-generative-ai", label: "Google Gemini (google-generative-ai)" },
    { value: "azure-openai", label: "Azure OpenAI" },
    { value: "ollama", label: "Ollama Local" }
  ];

  function SettingsModal({ isOpen, onClose, tweaks, setTweak }) {
    const [activeTab, setActiveTab] = React.useState("twins"); // "twins" | "api" | "prompt" | "appearance" | "tools"
    const [toolsSubTab, setToolsSubTab] = React.useState("mcp"); // "mcp" | "skills"

    // ── API & Models state ──────────────────────────────────────────────────
    const [config, setConfig] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [activeProvider, setActiveProvider] = React.useState(null);

    // Form inputs
    const [editKey, setEditKey] = React.useState("");
    const [editName, setEditName] = React.useState("");
    const [editApi, setEditApi] = React.useState("openai-completions");
    const [editBaseUrl, setEditBaseUrl] = React.useState("");
    const [editApiKey, setEditApiKey] = React.useState("");
    const [editModels, setEditModels] = React.useState([]);

    // ── MCP State ───────────────────────────────────────────────────────────
    const [mcpServers, setMcpServers] = React.useState([]);
    const [mcpLoading, setMcpLoading] = React.useState(false);

    // ── Skills State ────────────────────────────────────────────────────────
    const [skillsMaster, setSkillsMaster] = React.useState(true);
    const [skillsList, setSkillsList] = React.useState([]);
    const [skillsLoading, setSkillsLoading] = React.useState(false);

    // ── System Prompt & Custom Prefix State ──────────────────────────────────
    const [systemPrompt, setSystemPrompt] = React.useState("");
    const [promptSaving, setPromptSaving] = React.useState(false);
    const [promptSavedNote, setPromptSavedNote] = React.useState(false);
    const [systemMd, setSystemMd] = React.useState("");
    const [systemMdSaving, setSystemMdSaving] = React.useState(false);
    const [systemMdSavedNote, setSystemMdSavedNote] = React.useState(false);
    const [syncSuccess, setSyncSuccess]         = React.useState(false);

    // ── Aggregate all available models from providers for dropdown selection ──
    const allAvailableModels = React.useMemo(() => {
      const list = [];
      const providers = config?.providers || {};
      for (const provKey of Object.keys(providers)) {
        const prov = providers[provKey];
        for (const m of (prov?.models || [])) {
          if (m?.id && !list.some(x => x.id === m.id)) {
            list.push({
              id: m.id,
              name: m.name || m.id,
              provider: prov.name || provKey,
            });
          }
        }
      }
      const bridgeModels = window.OMP_DATA?.models || [];
      for (const bm of bridgeModels) {
        if (bm?.id && !list.some(x => x.id === bm.id)) {
          list.push({ id: bm.id, name: bm.name || bm.id, provider: bm.provider || "omp" });
        }
      }
      return list;
    }, [config]);

    const fetchConfig = React.useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        if (window.OMP_BRIDGE?.getModelsConfig) {
          const cfg = await window.OMP_BRIDGE.getModelsConfig();
          setConfig(cfg || {});
          const provKeys = Object.keys(cfg?.providers || {});
          if (provKeys.length > 0 && !activeProvider) {
            loadProviderForm(provKeys[0], cfg.providers[provKeys[0]]);
          } else if (provKeys.length === 0) {
            handleApplyPreset("custom");
          }
        }
      } catch (e) {
        setError("Failed to load config: " + e.message);
      } finally {
        setLoading(false);
      }
    }, [activeProvider]);

    const fetchMcp = React.useCallback(async () => {
      setMcpLoading(true);
      try {
        if (window.OMP_BRIDGE?.getMcpServers) {
          const servers = await window.OMP_BRIDGE.getMcpServers();
          setMcpServers(servers || []);
        }
      } catch (e) {
        console.error("Failed to load MCP servers:", e);
      } finally {
        setMcpLoading(false);
      }
    }, []);

    const fetchSkills = React.useCallback(async () => {
      setSkillsLoading(true);
      try {
        if (window.OMP_BRIDGE?.getSkills) {
          const [master, list] = await window.OMP_BRIDGE.getSkills();
          setSkillsMaster(master);
          setSkillsList(list || []);
        }
      } catch (e) {
        console.error("Failed to load skills:", e);
      } finally {
        setSkillsLoading(false);
      }
    }, []);

    const fetchPrompt = React.useCallback(async () => {
      try {
        if (window.OMP_BRIDGE?.getSystemPrompt) {
          const sys = await window.OMP_BRIDGE.getSystemPrompt();
          setSystemPrompt(sys || "");
        }
        if (window.OMP_BRIDGE?.getSystemMd) {
          const smd = await window.OMP_BRIDGE.getSystemMd();
          setSystemMd(smd || "");
        }
      } catch (e) {
        console.error("Failed to load system prompt files:", e);
      }
    }, []);

    React.useEffect(() => {
      if (isOpen) {
        fetchConfig();
        fetchMcp();
        fetchSkills();
        fetchPrompt();
      }
    }, [isOpen]);

    const loadProviderForm = (key, p) => {
      setActiveProvider(key);
      setEditKey(key);
      setEditName(p.name || key);
      setEditApi(p.api || "openai-completions");
      setEditBaseUrl(p.baseUrl || "");
      setEditApiKey(p.apiKey || "");
      setEditModels(p.models ? JSON.parse(JSON.stringify(p.models)) : []);
    };

    const handleApplyPreset = (presetKey) => {
      const p = PRESETS[presetKey] || PRESETS.custom;
      setActiveProvider("__new__");
      setEditKey(presetKey === "custom" ? "custom_relay" : presetKey);
      setEditName(p.name);
      setEditApi(p.api);
      setEditBaseUrl(p.baseUrl);
      setEditApiKey("");
      setEditModels(JSON.parse(JSON.stringify(p.models)));
    };

    const handleDeleteProvider = (key) => {
      if (!confirm(`Delete provider "${key}"?`)) return;
      const nextConfig = { ...config };
      if (nextConfig.providers) {
        delete nextConfig.providers[key];
      }
      setConfig(nextConfig);
      const remaining = Object.keys(nextConfig.providers || {});
      if (remaining.length > 0) {
        loadProviderForm(remaining[0], nextConfig.providers[remaining[0]]);
      } else {
        handleApplyPreset("custom");
      }
    };

    const handleAddModel = () => {
      setEditModels([
        ...editModels,
        {
          id: "new-model-" + (editModels.length + 1),
          name: "New Model",
          contextWindow: 128000,
          reasoning: false
        }
      ]);
    };

    const handleRemoveModel = (idx) => {
      setEditModels(editModels.filter((_, i) => i !== idx));
    };

    const handleModelChange = (idx, field, val) => {
      const next = [...editModels];
      next[idx] = { ...next[idx], [field]: val };
      setEditModels(next);
    };

    const handleSaveApi = async () => {
      if (!editKey.trim()) {
        alert("Provider ID (Key) cannot be empty");
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const nextConfig = { ...config, providers: { ...(config?.providers || {}) } };
        if (activeProvider && activeProvider !== editKey && activeProvider !== "__new__") {
          delete nextConfig.providers[activeProvider];
        }

        nextConfig.providers[editKey.trim()] = {
          name: editName.trim() || editKey.trim(),
          api: editApi || "openai-completions",
          baseUrl: editBaseUrl.trim(),
          apiKey: editApiKey.trim(),
          models: editModels
        };

        await window.OMP_BRIDGE.saveModelsConfig(nextConfig);
        setConfig(nextConfig);
        setActiveProvider(editKey.trim());
        if (window.OMP_BRIDGE?.restartActiveSession) {
          await window.OMP_BRIDGE.restartActiveSession();
        }
        if (editModels && editModels.length > 0) {
          window.OMP_BRIDGE?.setModel?.({
            id: editModels[0].id,
            name: editModels[0].name || editModels[0].id,
            provider: editKey.trim(),
          });
        }
        alert("API 与模型配置已保存！后台会话已完成热更新与模型同步绑定。");
      } catch (e) {
        setError("Failed to save: " + e.message);
      } finally {
        setSaving(false);
      }
    };

    // ── Local image picker handlers ─────────────────────────────────────────
    const userImgRef   = React.useRef(null);
    const coticeImgRef = React.useRef(null);
    const codiceImgRef = React.useRef(null);
    const bgImgRef     = React.useRef(null);
    const stageImgRef   = React.useRef(null);
    const stageVideoRef = React.useRef(null);
    const splashVideoRef = React.useRef(null);
    const [dbStaticImg, setDbStaticImg] = React.useState(null);
    const [dbActiveVideo, setDbActiveVideo] = React.useState(null);
    const [dbSplashVideo, setDbSplashVideo] = React.useState(null);

    React.useEffect(() => {
      if (isOpen && window.mediaDB) {
        window.mediaDB.get("stageStaticImg").then(val => val && setDbStaticImg(val));
        window.mediaDB.get("stageActiveVideo").then(val => val && setDbActiveVideo(val));
        window.mediaDB.get("splashVideo").then(val => val && setDbSplashVideo(val));
      }
    }, [isOpen]);

    const onFilePicked = (file, key) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawData = e.target?.result;
        if (!rawData) return;
        if (key === "stageStaticImg") {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const size = 512;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
            const compressed = canvas.toDataURL("image/webp", 0.9);
            window.mediaDB?.set(key, compressed);
            setDbStaticImg(compressed);
          };
          img.src = rawData;
        } else if (key.includes("Avatar") || key.includes("avatar")) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const size = 256;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
            const compressed = canvas.toDataURL("image/webp", 0.85);
            setTweak(key, compressed);
          };
          img.src = rawData;
        } else if (key === "stageActiveVideo") {
          let corrected = rawData;
          const lowerName = (file.name || "").toLowerCase();
          if (typeof rawData === "string" && !rawData.startsWith("data:video/") && !rawData.startsWith("data:image/")) {
            if (lowerName.endsWith(".mp4")) {
              corrected = rawData.replace(/^data:[^;]*/, "data:video/mp4");
            } else if (lowerName.endsWith(".webm")) {
              corrected = rawData.replace(/^data:[^;]*/, "data:video/webm");
            } else if (lowerName.endsWith(".gif")) {
              corrected = rawData.replace(/^data:[^;]*/, "data:image/gif");
            }
          }
          window.mediaDB?.set(key, corrected);
          setDbActiveVideo(corrected);
        } else if (key === "splashVideo") {
          let corrected = rawData;
          const lowerName = (file.name || "").toLowerCase();
          if (typeof rawData === "string" && !rawData.startsWith("data:video/")) {
            if (lowerName.endsWith(".mp4")) {
              corrected = rawData.replace(/^data:[^;]*/, "data:video/mp4");
            } else if (lowerName.endsWith(".webm")) {
              corrected = rawData.replace(/^data:[^;]*/, "data:video/webm");
            }
          }
          window.mediaDB?.set("splashVideo", corrected);
          setDbSplashVideo(corrected);
          setTweak("splashCustomVideo", true);
        } else {
          setTweak(key, rawData);
        }
      };
      reader.readAsDataURL(file);
    };

    if (!isOpen) return null;

    const providers = config?.providers || {};
    const providerKeys = Object.keys(providers);

    const tabHeaders = {
      twins: { title: "搭档专属偏好", desc: "配置可蒂丝启动与对话时的默认模型底座、思考深度与专属头像" },
      api: { title: "API 与模型服务提供商", desc: "配置官方直连、自建中转站 (OneAPI/NewAPI) 或第三方模型代理" },
      prompt: { title: "提示词设置", desc: "管理静默发送的前缀提示词与跨工程通用的全局提示词" },
      appearance: { title: "界面背景壁纸与外观", desc: "自定义桌面背景图片、透明度与视觉层次" },
      tools: { title: "MCP 扩展与 Skills 技能", desc: "管理外部上下文工具服务，避免多余注入打穿上下文与 TPM 配额" },
      stage: { title: "舞台动画与动图 (Animation Stage)", desc: "为右侧正方形专属舞台配置静态插画与工作中实时播放的动态视频/动图" },
    };
    const currentTabInfo = tabHeaders[activeTab] || tabHeaders.twins;

    const handleSyncTwinDefaults = () => {
      window.OMP_BRIDGE?.applyTwinDefaults?.();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2400);
    };

    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="models-modal-card" onClick={(e) => e.stopPropagation()}>
          {/* Left Navigation Sidebar */}
          <div className="models-modal-nav">
            <div className="models-modal-nav-title">
              <_MIcon name="cog" size={15} color="var(--accent)" />
              <span>设置 · Settings</span>
            </div>

            <button
              className={`models-nav-item ${activeTab === "twins" ? "active" : ""}`}
              onClick={() => setActiveTab("twins")}
            >
              <_MIcon name="sparkle" size={14} color="var(--accent)" />
              <span>搭档偏好</span>
            </button>

            <button
              className={`models-nav-item ${activeTab === "api" ? "active" : ""}`}
              onClick={() => setActiveTab("api")}
            >
              <_MIcon name="layers" size={14} />
              <span>底座模型与 API</span>
            </button>

            <button
              className={`models-nav-item ${activeTab === "prompt" ? "active" : ""}`}
              onClick={() => setActiveTab("prompt")}
            >
              <_MIcon name="edit" size={14} />
              <span>提示词与 Prompt</span>
            </button>

            <button
              className={`models-nav-item ${activeTab === "appearance" ? "active" : ""}`}
              onClick={() => setActiveTab("appearance")}
            >
              <_MIcon name="image" size={14} />
              <span>背景与外观</span>
            </button>
            <button
              className={`models-nav-item ${activeTab === "stage" ? "active" : ""}`}
              onClick={() => setActiveTab("stage")}
            >
              <_MIcon name="play" size={14} color="var(--accent)" />
              <span>舞台动画与动图</span>
            </button>

            <button
              className={`models-nav-item ${activeTab === "tools" ? "active" : ""}`}
              onClick={() => setActiveTab("tools")}
            >
              <_MIcon name="folder" size={14} />
              <span>MCP 与 Skills</span>
            </button>

            <div style={{ flex: 1 }} />
            <button
              className="btn ghost mini"
              style={{ width: "100%", justifyContent: "center", color: "var(--fg-4)", fontSize: "11px" }}
              onClick={onClose}
            >
              关闭 (Esc)
            </button>
          </div>

          {/* Right Main Content */}
          <div className="models-modal-main">
            <div className="models-modal-header">
              <div className="models-modal-header-info">
                <h3>{currentTabInfo.title}</h3>
                <p>{currentTabInfo.desc}</p>
              </div>
              <button className="btn icon ghost" onClick={onClose} style={{ padding: "4px 8px", borderRadius: 6 }}>✕</button>
            </div>

            {/* Tab 0: 搭档偏好 */}
            {activeTab === "twins" && (
              <div style={{ padding: 20, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                {/* 可蒂丝设置卡片 */}
                <div className="setting-card" style={{ borderColor: "color-mix(in oklab, var(--accent) 38%, var(--line))", margin: 0 }}>
                  <div className="setting-card-title" style={{ color: "var(--accent)" }}>
                    <span className="dot" style={{ background: "var(--accent)", width: 8, height: 8 }} />
                    <span>可蒂丝 (Cotice) · 专属配置</span>
                    <span className="chip mono" style={{ fontSize: 10, marginLeft: "auto", color: "var(--accent)", background: "color-mix(in oklab, var(--accent) 12%, transparent)" }}>专属伴侣 · 核心工程智囊</span>
                  </div>
                  <div className="setting-card-desc">
                    配置可蒂丝启动与对话时的默认模型与思考强度，设置后无需每次重复切换。
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="models-field-group" style={{ minWidth: 0 }}>
                      <label>默认底座模型 (Default Model)</label>
                      <div style={{ display: "flex", gap: 6, minWidth: 0 }}>
                        <select
                          className="twk-field"
                          value={tweaks.coticeDefaultModel || tweaks.defaultModel || ""}
                          onChange={(e) => {
                            setTweak("coticeDefaultModel", e.target.value);
                            setTweak("defaultModel", e.target.value);
                          }}
                          style={{ flex: 1, minWidth: 0, fontSize: 12 }}
                        >
                          <option value="">跟随全局会话 (Default)</option>
                          {allAvailableModels.map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          className="twk-field mono"
                          placeholder="或输入模型 ID"
                          value={tweaks.coticeDefaultModel || tweaks.defaultModel || ""}
                          onChange={(e) => {
                            setTweak("coticeDefaultModel", e.target.value);
                            setTweak("defaultModel", e.target.value);
                          }}
                          style={{ width: 110, minWidth: 0, fontSize: 11, boxSizing: "border-box" }}
                          title="若下拉列表没有，可直接填入模型 ID (如 deepseek-chat 或 claude-3-7-sonnet-20250219)"
                        />
                      </div>
                    </div>

                    <div className="models-field-group" style={{ minWidth: 0 }}>
                      <label>默认思考强度 (Thinking Level)</label>
                      <select
                        className="twk-field"
                        value={tweaks.coticeDefaultThinking || tweaks.defaultThinking || "auto"}
                        onChange={(e) => {
                          setTweak("coticeDefaultThinking", e.target.value);
                          setTweak("defaultThinking", e.target.value);
                        }}
                        style={{ width: "100%", maxWidth: "100%", minWidth: 0, fontSize: 12, boxSizing: "border-box" }}
                      >
                        <option value="auto">Auto (自动 · 默认)</option>
                        <option value="off">Off (关闭思考)</option>
                        <option value="minimal">Minimal (微弱)</option>
                        <option value="low">Low (低度)</option>
                        <option value="medium">Medium (中度)</option>
                        <option value="high">High (深度)</option>
                        <option value="xhigh">XHigh (极限)</option>
                      </select>
                    </div>
                  </div>

                  <div className="models-field-group" style={{ marginTop: 8, paddingTop: 10, borderTop: "1px dashed var(--line)" }}>
                    <label>可蒂丝专属头像 (Avatar)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {(tweaks.coticeAvatar || tweaks.aiAvatar) ? (
                        <img
                          src={tweaks.coticeAvatar || tweaks.aiAvatar}
                          alt="可蒂丝头像"
                          style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover", border: "2px solid var(--accent)" }}
                        />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-window)", border: "1px dashed var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontSize: 11, fontWeight: 700 }}>
                          蒂
                        </div>
                      )}
                      <input
                        ref={coticeImgRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          onFilePicked(e.target.files?.[0], "coticeAvatar");
                          onFilePicked(e.target.files?.[0], "aiAvatar");
                        }}
                      />
                      <button type="button" className="btn mini" onClick={() => coticeImgRef.current?.click()}>
                        更换头像...
                      </button>
                      {(tweaks.coticeAvatar || tweaks.aiAvatar) && (
                        <button type="button" className="btn ghost mini" style={{ color: "var(--crimson)" }} onClick={() => { setTweak("coticeAvatar", ""); setTweak("aiAvatar", ""); }}>
                          恢复默认艺术字
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 主人信息设置卡片 */}
                <div className="setting-card" style={{ margin: 0 }}>
                  <div className="setting-card-title">
                    <_MIcon name="agent" size={13} color="var(--accent)" />
                    <span>主人身份与称谓偏好</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="models-field-group">
                      <label>你的称呼 (User Name)</label>
                      <input
                        type="text"
                        className="twk-field"
                        value={tweaks.userName || ""}
                        placeholder="主人 / your name"
                        onChange={(e) => setTweak("userName", e.target.value)}
                      />
                    </div>
                    <div className="models-field-group">
                      <label>你的头像 (User Avatar)</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {tweaks.userAvatar ? (
                          <img
                            src={tweaks.userAvatar}
                            alt="avatar"
                            style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "1.5px solid var(--accent)" }}
                          />
                        ) : (
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--bg-elevated)", border: "1px dashed var(--line-bright)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                            我
                          </div>
                        )}
                        <input
                          ref={userImgRef}
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => onFilePicked(e.target.files?.[0], "userAvatar")}
                        />
                        <button type="button" className="btn mini" onClick={() => userImgRef.current?.click()}>
                          选择头像
                        </button>
                        {tweaks.userAvatar && (
                          <button type="button" className="btn ghost mini" style={{ color: "var(--crimson)" }} onClick={() => setTweak("userAvatar", "")}>
                            清除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save & Sync 操作栏 */}
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    className="btn primary"
                    onClick={handleSyncTwinDefaults}
                    style={{ padding: "6px 20px" }}
                  >
                    Save & Sync
                  </button>
                  {syncSuccess && (
                    <span className="mono" style={{ color: "var(--accent)", fontSize: 12 }}>
                      ✓ 已成功同步并应用偏好！
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Tab 1: API & Models */}
            {activeTab === "api" && (
              <div className="models-modal-body">
                {/* Left sidebar: Providers list & quick presets */}
                <div className="models-sidebar">
                  <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)" }}>
                    <span className="mono" style={{ fontSize: "var(--d-text-xs)", color: "var(--fg-3)" }}>
                      QUICK PRESETS
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 6 }}>
                      <button className="btn ghost mini" style={{ fontSize: "11px", padding: "2px 4px" }} onClick={() => handleApplyPreset("openai")}>+ OpenAI</button>
                      <button className="btn ghost mini" style={{ fontSize: "11px", padding: "2px 4px" }} onClick={() => handleApplyPreset("anthropic")}>+ Claude</button>
                      <button className="btn ghost mini" style={{ fontSize: "11px", padding: "2px 4px" }} onClick={() => handleApplyPreset("deepseek")}>+ DeepSeek</button>
                      <button className="btn ghost mini" style={{ fontSize: "11px", padding: "2px 4px" }} onClick={() => handleApplyPreset("openrouter")}>+ OpenRouter</button>
                    </div>
                    <button
                      className="btn mini"
                      style={{ width: "100%", marginTop: 6, background: "var(--bg-hover)" }}
                      onClick={() => handleApplyPreset("custom")}
                    >
                      + Add Custom Relay
                    </button>
                  </div>

                  <div className="models-provider-list">
                    <div style={{ padding: "8px 12px 4px" }}>
                      <span className="mono" style={{ fontSize: "var(--d-text-xs)", color: "var(--fg-4)" }}>
                        CONFIGURED ({providerKeys.length})
                      </span>
                    </div>
                    {providerKeys.map((key) => {
                      const p = providers[key];
                      const isAct = activeProvider === key;
                      return (
                        <div
                          key={key}
                          className={`models-provider-item ${isAct ? "active" : ""}`}
                          onClick={() => loadProviderForm(key, p)}
                        >
                          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                            <span style={{ fontWeight: isAct ? 600 : 400, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                              {p.name || key}
                            </span>
                            <span className="mono" style={{ fontSize: "10px", color: "var(--fg-4)" }}>
                              {key}
                            </span>
                          </div>
                          <span className="chip muted mono" style={{ fontSize: "10px" }}>
                            {p.models ? p.models.length : 0}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right form pane */}
                <div className="models-form-pane">
                  {error && <div className="models-error">{error}</div>}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "var(--d-text-base)" }}>
                        {activeProvider === "__new__" ? "New Provider" : `Edit Provider: ${editName || editKey}`}
                      </h4>
                      <span className="mono" style={{ fontSize: "var(--d-text-xs)", color: "var(--fg-4)" }}>
                        Configured in ~/.omp/agent/models.yml
                      </span>
                    </div>

                    {activeProvider && activeProvider !== "__new__" && (
                      <button className="btn danger mini" onClick={() => handleDeleteProvider(activeProvider)}>
                        Delete
                      </button>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="models-field-group">
                      <label>Provider ID / Key (Unique)</label>
                      <input
                        type="text"
                        className="twk-field mono"
                        value={editKey}
                        onChange={(e) => setEditKey(e.target.value)}
                        placeholder="e.g. deepseek, my_relay"
                      />
                    </div>
                    <div className="models-field-group">
                      <label>Display Name</label>
                      <input
                        type="text"
                        className="twk-field"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. DeepSeek Official"
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="models-field-group">
                      <label>API Protocol</label>
                      <select
                        className="twk-field"
                        value={editApi}
                        onChange={(e) => setEditApi(e.target.value)}
                      >
                        {API_PROTOCOLS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="models-field-group">
                      <label>API Key (Leave empty to use ENV VAR)</label>
                      <input
                        type="password"
                        className="twk-field mono"
                        value={editApiKey}
                        onChange={(e) => setEditApiKey(e.target.value)}
                        placeholder="sk-..."
                      />
                    </div>
                  </div>

                  <div className="models-field-group">
                    <label>Base URL (API Endpoint)</label>
                    <input
                      type="text"
                      className="twk-field mono"
                      value={editBaseUrl}
                      onChange={(e) => setEditBaseUrl(e.target.value)}
                      placeholder="e.g. https://api.openai.com/v1"
                    />
                  </div>

                  {/* Models list sub-section */}
                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: "var(--d-text-sm)" }}>
                        Models List ({editModels.length})
                      </span>
                      <button className="btn mini" onClick={handleAddModel}>+ Add Model</button>
                    </div>

                    <div className="models-cards-scroll">
                      {editModels.map((m, idx) => (
                        <div key={idx} className="model-sub-card">
                          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                            <div style={{ flex: 1 }}>
                              <input
                                type="text"
                                className="twk-field mono"
                                style={{ fontSize: "11px", padding: "4px 8px" }}
                                value={m.id}
                                onChange={(e) => handleModelChange(idx, "id", e.target.value)}
                                placeholder="Model ID (e.g. gpt-4o)"
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <input
                                type="text"
                                className="twk-field"
                                style={{ fontSize: "11px", padding: "4px 8px" }}
                                value={m.name}
                                onChange={(e) => handleModelChange(idx, "name", e.target.value)}
                                placeholder="Display Name"
                              />
                            </div>
                            <button
                              className="btn icon ghost danger mini"
                              style={{ width: 24, height: 24 }}
                              onClick={() => handleRemoveModel(idx)}
                              title="Remove Model"
                            >
                              ✕
                            </button>
                          </div>

                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span className="mono" style={{ fontSize: "10px", color: "var(--fg-4)" }}>Context:</span>
                              <input
                                type="number"
                                className="twk-field mono"
                                style={{ width: 80, fontSize: "11px", padding: "2px 6px" }}
                                value={m.contextWindow || 128000}
                                onChange={(e) => handleModelChange(idx, "contextWindow", parseInt(e.target.value, 10))}
                              />
                            </div>
                            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "11px", cursor: "pointer", color: "var(--fg-3)" }}>
                              <input
                                type="checkbox"
                                checked={!!m.reasoning}
                                onChange={(e) => handleModelChange(idx, "reasoning", e.target.checked)}
                              />
                              Thinking / Reasoning
                            </label>
                          </div>
                        </div>
                      ))}
                      {editModels.length === 0 && (
                        <div style={{ padding: 16, textAlign: "center", color: "var(--fg-4)", fontSize: "var(--d-text-xs)" }}>
                          No models configured for this provider. Click "+ Add Model" to add one.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: MCP & Skills */}
            {activeTab === "tools" && (
              <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                  <button
                    className={`btn mini ${toolsSubTab === "mcp" ? "primary" : "ghost"}`}
                    onClick={() => setToolsSubTab("mcp")}
                  >
                    MCP Servers ({mcpServers.length})
                  </button>
                  <button
                    className={`btn mini ${toolsSubTab === "skills" ? "primary" : "ghost"}`}
                    onClick={() => setToolsSubTab("skills")}
                  >
                    Skills 技能 ({skillsList.length})
                  </button>
                </div>

                {toolsSubTab === "mcp" ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="mono" style={{ fontSize: "var(--d-text-xs)", color: "var(--fg-3)" }}>
                        CONFIGURED MCP SERVERS ({mcpServers.length})
                      </span>
                      <button className="btn mini" onClick={fetchMcp} disabled={mcpLoading}>
                        {mcpLoading ? "Loading..." : "Refresh"}
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {mcpServers.map((s) => {
                        const isEn = Boolean(s.enabled);
                        return (
                          <div
                            key={s.name}
                            style={{
                              background: "var(--bg-elevated)",
                              border: isEn ? "1px solid color-mix(in oklab, var(--accent) 30%, var(--line))" : "1px dashed var(--line)",
                              borderRadius: 8,
                              padding: "10px 14px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 16,
                              minWidth: 0,
                              transition: "all 150ms ease"
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontWeight: 600, fontSize: "13px", color: isEn ? "var(--fg-1)" : "var(--fg-3)" }}>
                                  {s.name}
                                </span>
                                <span
                                  className="mono"
                                  style={{
                                    fontSize: "10px",
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                    background: isEn ? "rgba(74, 222, 128, 0.15)" : "var(--bg-surface)",
                                    color: isEn ? "var(--accent)" : "var(--fg-4)",
                                    border: `1px solid ${isEn ? "color-mix(in oklab, var(--accent) 35%, transparent)" : "var(--line)"}`
                                  }}
                                >
                                  {isEn ? "Enabled" : "Disabled"}
                                </span>
                                <span className="mono" style={{ fontSize: "10px", color: "var(--fg-4)" }}>
                                  {s.source}
                                </span>
                              </div>
                              <div
                                className="mono selectable"
                                title={s.command || "N/A"}
                                style={{
                                  fontSize: "11px",
                                  color: "var(--fg-4)",
                                  marginTop: 4,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: "100%"
                                }}
                              >
                                command: {s.command || "N/A"}
                              </div>
                            </div>

                            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                              <button
                                className={`btn mini ${isEn ? "ghost danger" : "primary"}`}
                                style={{
                                  fontSize: "11px",
                                  padding: "3px 12px",
                                  minWidth: 70,
                                  justifyContent: "center"
                                }}
                                onClick={async () => {
                                  const next = !isEn;
                                  await window.OMP_BRIDGE?.toggleMcpServer(s.name, next);
                                  setMcpServers(prev => prev.map(srv => srv.name === s.name ? { ...srv, enabled: next } : srv));
                                }}
                              >
                                {isEn ? "停用" : "启用"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {mcpServers.length === 0 && !mcpLoading && (
                        <div style={{ textAlign: "center", padding: 30, color: "var(--fg-4)" }}>
                          No MCP servers found in ~/.omp/agent/mcp.json
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ background: "var(--bg-window)", padding: 12, borderRadius: 8, border: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px" }}>Skills Master Switch / 技能总开关</div>
                        <div style={{ fontSize: "11px", color: "var(--fg-3)", marginTop: 2 }}>
                          一键开关所有技能，避免技能注入过多导致 System Prompt 过长打穿 TPM。
                        </div>
                      </div>
                      <button
                        className={`btn mini ${skillsMaster ? "primary" : "ghost"}`}
                        onClick={async () => {
                          const next = !skillsMaster;
                          await window.OMP_BRIDGE?.setSkillsMasterEnabled(next);
                          setSkillsMaster(next);
                          setSkillsList(prev => prev.map(s => ({ ...s, enabled: next })));
                        }}
                      >
                        {skillsMaster ? "Skills: 全部启用中" : "Skills: 已全部禁用"}
                      </button>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="mono" style={{ fontSize: "var(--d-text-xs)", color: "var(--fg-3)" }}>
                        INSTALLED SKILLS ({skillsList.length})
                      </span>
                      <button className="btn mini" onClick={fetchSkills} disabled={skillsLoading}>
                        {skillsLoading ? "Loading..." : "Refresh"}
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {skillsList.map((sk) => {
                        const isEn = skillsMaster && sk.enabled;
                        return (
                          <div
                            key={sk.name}
                            style={{
                              background: "var(--bg-elevated)",
                              border: isEn ? "1px solid color-mix(in oklab, var(--accent) 30%, var(--line))" : "1px dashed var(--line)",
                              opacity: skillsMaster ? 1 : 0.6,
                              borderRadius: 8,
                              padding: "10px 14px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 16,
                              minWidth: 0,
                              transition: "all 150ms ease"
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontWeight: 600, fontSize: "13px", color: isEn ? "var(--fg-1)" : "var(--fg-3)" }}>
                                  {sk.name}
                                </span>
                                <span
                                  className="mono"
                                  style={{
                                    fontSize: "10px",
                                    padding: "1px 5px",
                                    borderRadius: 4,
                                    background: isEn ? "rgba(138, 240, 200, 0.1)" : "var(--bg-window)",
                                    color: isEn ? "var(--accent)" : "var(--fg-4)"
                                  }}
                                >
                                  {isEn ? "Active" : "Ignored"}
                                </span>
                                <span className="mono" style={{ fontSize: "10px", color: "var(--fg-4)" }}>
                                  source: {sk.source}
                                </span>
                              </div>
                              {sk.description && (
                                <div style={{ fontSize: "12px", color: "var(--fg-3)", marginTop: 4 }}>
                                  {sk.description}
                                </div>
                              )}
                            </div>
                            <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                              <button
                                className={`btn mini ${sk.enabled ? "ghost danger" : "primary"}`}
                                disabled={!skillsMaster}
                                style={{
                                  fontSize: "11px",
                                  padding: "3px 12px",
                                  minWidth: 70,
                                  justifyContent: "center"
                                }}
                                onClick={async () => {
                                  const next = !sk.enabled;
                                  await window.OMP_BRIDGE?.toggleSkill(sk.name, next);
                                  setSkillsList(prev => prev.map(s => s.name === sk.name ? { ...s, enabled: next } : s));
                                }}
                              >
                                {sk.enabled ? "忽略" : "启用"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {skillsList.length === 0 && !skillsLoading && (
                        <div style={{ textAlign: "center", padding: 30, color: "var(--fg-4)" }}>
                          No skills found in ~/.codex/skills/ or ~/.omp/agent/skills/
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab 3: Prompts & 提示词 */}
            {activeTab === "prompt" && (
              <div style={{ padding: 20, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
                {/* 1. 全局 System Prompt (SYSTEM.md) */}
                <div style={{ background: "var(--bg-window)", padding: 16, borderRadius: 8, border: "1px solid color-mix(in oklab, var(--cyan) 30%, var(--line))" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "var(--d-text-sm)", color: "var(--cyan)", display: "flex", alignItems: "center", gap: 6 }}>
                        <_MIcon name="bolt" size={13} color="var(--cyan)" />
                        <span>核心系统提示词 · SYSTEM.md (~/.omp/agent/SYSTEM.md)</span>
                      </div>
                      <div style={{ fontSize: "var(--d-text-xs)", color: "var(--fg-3)", marginTop: 4 }}>
                        定义大模型在对话中最底层的系统级心智、技术准则与顶层法则。
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      {systemMdSavedNote && (
                        <span className="mono" style={{ fontSize: "11px", color: "var(--accent)" }}>✓ 已保存</span>
                      )}
                      <button
                        className="btn primary mini"
                        disabled={systemMdSaving}
                        style={{ minWidth: 64, height: 26, justifyContent: "center", whiteSpace: "nowrap" }}
                        onClick={async () => {
                          setSystemMdSaving(true);
                          try {
                            if (window.OMP_BRIDGE?.saveSystemMd) {
                              await window.OMP_BRIDGE.saveSystemMd(systemMd);
                              setSystemMdSavedNote(true);
                              setTimeout(() => setSystemMdSavedNote(false), 2000);
                            }
                          } catch (err) {
                            alert("保存 SYSTEM.md 失败: " + err.message);
                          } finally {
                            setSystemMdSaving(false);
                          }
                        }}
                      >
                        {systemMdSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    className="twk-field mono selectable"
                    style={{ width: "100%", marginTop: 12, resize: "vertical", fontSize: "var(--d-text-xs)", lineHeight: 1.4 }}
                    value={systemMd}
                    onChange={(e) => setSystemMd(e.target.value)}
                    placeholder="正在读取 ~/.omp/agent/SYSTEM.md ..."
                  />
                </div>

                {/* 2. 智能体与搭档心智 (AGENTS.md) */}
                <div style={{ background: "var(--bg-window)", padding: 16, borderRadius: 8, border: "1px solid color-mix(in oklab, var(--accent) 30%, var(--line))" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "var(--d-text-sm)", color: "var(--accent)", display: "flex", alignItems: "center", gap: 6 }}>
                        <_MIcon name="sparkle" size={13} color="var(--accent)" />
                        <span>智能体搭档心智 · AGENTS.md (~/.omp/agent/AGENTS.md)</span>
                      </div>
                      <div style={{ fontSize: "var(--d-text-xs)", color: "var(--fg-3)", marginTop: 4 }}>
                        定义可蒂丝（Cotice）的拟人化人格、工作风格、口吻、亲密依恋与交互偏好。
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      {promptSavedNote && (
                        <span className="mono" style={{ fontSize: "11px", color: "var(--accent)" }}>✓ 已保存</span>
                      )}
                      <button
                        className="btn primary mini"
                        disabled={promptSaving}
                        style={{ minWidth: 64, height: 26, justifyContent: "center", whiteSpace: "nowrap" }}
                        onClick={async () => {
                          setPromptSaving(true);
                          try {
                            if (window.OMP_BRIDGE?.saveSystemPrompt) {
                              await window.OMP_BRIDGE.saveSystemPrompt(systemPrompt);
                              setPromptSavedNote(true);
                              setTimeout(() => setPromptSavedNote(false), 2000);
                            }
                          } catch (err) {
                            alert("保存 AGENTS.md 失败: " + err.message);
                          } finally {
                            setPromptSaving(false);
                          }
                        }}
                      >
                        {promptSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    className="twk-field mono selectable"
                    style={{ width: "100%", marginTop: 12, resize: "vertical", fontSize: "var(--d-text-xs)", lineHeight: 1.4 }}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="正在读取 ~/.omp/agent/AGENTS.md ..."
                  />
                </div>
              </div>
            )}

            {/* Tab 4: Background / Appearance */}
            {activeTab === "appearance" && (
              <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
                <div className="models-form-pane" style={{ padding: 0 }}>
                  <div className="models-field-group">
                    <label>Custom Wallpaper / 自定义背景壁纸</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                      {tweaks.bgImage && (
                        <div style={{ width: 80, height: 50, borderRadius: 6, overflow: "hidden", border: "1px solid var(--line-bright)", background: "var(--bg-elevated)" }}>
                          <img src={tweaks.bgImage} alt="background preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      )}
                      <input
                        ref={bgImgRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => onFilePicked(e.target.files?.[0], "bgImage")}
                      />
                      <button className="btn mini" onClick={() => bgImgRef.current?.click()}>
                        {tweaks.bgImage ? "更换壁纸..." : "上传本地图片作为背景..."}
                      </button>
                      {tweaks.bgImage && (
                        <button className="btn ghost mini" style={{ color: "var(--crimson)" }} onClick={() => setTweak("bgImage", "")}>
                          清除背景
                        </button>
                      )}
                    </div>
                  </div>

                  {tweaks.bgImage && (
                    <div className="models-field-group" style={{ marginTop: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <label>Background Opacity / 背景透明度</label>
                        <span className="mono" style={{ fontSize: "11px", color: "var(--accent)" }}>
                          {tweaks.bgOpacity ?? 60}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        style={{ width: "100%", accentColor: "var(--accent)", marginTop: 6 }}
                        value={tweaks.bgOpacity ?? 60}
                        onChange={(e) => setTweak("bgOpacity", parseInt(e.target.value, 10))}
                      />
                      <span style={{ fontSize: "var(--d-text-xs)", color: "var(--fg-3)", marginTop: 4 }}>
                        调节背景图透出清晰度，数值越高背景壁纸越清晰透亮。
                      </span>
                    </div>
                  )}
                  <div className="setting-card" style={{ marginTop: 20, margin: "20px 0 0 0" }}>
                    <div className="setting-card-title">
                      <_MIcon name="bolt" size={13} color="var(--accent)" />
                      <span>硬件功耗监控模块 (Power Meter)</span>
                      <label style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", cursor: "pointer", gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={tweaks.showPowerMeter !== false}
                          onChange={(e) => setTweak("showPowerMeter", e.target.checked)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                        <span style={{ fontSize: 11, color: tweaks.showPowerMeter !== false ? "var(--accent)" : "var(--fg-4)" }}>
                          {tweaks.showPowerMeter !== false ? "已开启" : "已关闭"}
                        </span>
                      </label>
                    </div>
                    <div className="setting-card-desc">
                      在右侧边栏底部实时监测整机物理瓦数、CPU 封装功耗 (RAPL)、端电压与电流。支持电量动态变色与后台休眠。
                    </div>
                  </div>

                  {/* 开屏动画与启动视频设置卡片 */}
                  <div className="setting-card" style={{ marginTop: 20, margin: "20px 0 0 0" }}>
                    <div className="setting-card-title">
                      <_MIcon name="play" size={13} color="var(--accent)" />
                      <span>开屏动画与启动视频 (Splash Screen)</span>
                      <label style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", cursor: "pointer", gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={tweaks.splashEnabled !== false}
                          onChange={(e) => setTweak("splashEnabled", e.target.checked)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                        <span style={{ fontSize: 11, color: tweaks.splashEnabled !== false ? "var(--accent)" : "var(--fg-4)" }}>
                          {tweaks.splashEnabled !== false ? "已开启" : "已关闭"}
                        </span>
                      </label>
                    </div>
                    <div className="setting-card-desc">
                      软件冷启动时播放的全屏开屏动效。支持按任意键（空格、回车等）随时快进跳过；用腻了可在此随时上传自己的 MP4 视频或一键还原。
                    </div>
                    {tweaks.splashEnabled !== false && (
                      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                        {/* 启动音效独立开关 */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          background: "var(--bg-elevated)",
                          borderRadius: 6,
                          border: "1px solid var(--line)"
                        }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg)", display: "flex", alignItems: "center", gap: 6 }}>
                              <_MIcon name="voice" size={13} color="var(--accent)" />
                              <span>开屏启动音效 (Startup Sound)</span>
                            </div>
                            <span style={{ fontSize: "var(--d-text-xs)", color: "var(--fg-3)" }}>
                              冷启动时播放视频内置的原生背景音乐与音效（支持随时按空格键跳过并平滑淡出）
                            </span>
                          </div>
                          <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", gap: 6 }}>
                            <input
                              type="checkbox"
                              checked={tweaks.splashAudio !== false}
                              onChange={(e) => setTweak("splashAudio", e.target.checked)}
                              style={{ accentColor: "var(--accent)" }}
                            />
                            <span style={{ fontSize: 11, color: tweaks.splashAudio !== false ? "var(--accent)" : "var(--fg-4)" }}>
                              {tweaks.splashAudio !== false ? "已开启" : "已静音"}
                            </span>
                          </label>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                          {/* 视频实时预览框 */}
                          <div style={{
                            width: 150,
                            height: 84,
                            borderRadius: 8,
                            overflow: "hidden",
                            background: "#0d0f12",
                            border: "1px solid var(--line-bright)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.4)"
                          }}>
                            <video
                              key={dbSplashVideo || "default-splash"}
                              src={dbSplashVideo || "splash.mp4"}
                              autoPlay
                              muted
                              loop
                              playsInline
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                            <div style={{
                              position: "absolute",
                              bottom: 4,
                              left: 6,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "rgba(0,0,0,0.65)",
                              fontSize: 9.5,
                              color: "var(--fg-2)",
                              fontFamily: "monospace"
                            }}>
                              {dbSplashVideo ? "自定义视频" : "内置默认"}
                            </div>
                          </div>

                          {/* 按钮操作组 */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <input
                              ref={splashVideoRef}
                              type="file"
                              accept="video/mp4,video/webm,video/*"
                              style={{ display: "none" }}
                              onChange={(e) => onFilePicked(e.target.files?.[0], "splashVideo")}
                            />
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button className="btn mini" onClick={() => splashVideoRef.current?.click()}>
                                更换开屏视频 (.mp4)...
                              </button>
                              {dbSplashVideo && (
                                <button
                                  className="btn ghost mini"
                                  style={{ color: "var(--crimson)" }}
                                  onClick={() => {
                                    window.mediaDB?.del("splashVideo");
                                    setDbSplashVideo(null);
                                    setTweak("splashCustomVideo", false);
                                  }}
                                >
                                  恢复默认动画
                                </button>
                              )}
                            </div>
                            <span style={{ fontSize: "var(--d-text-xs)", color: "var(--fg-4)" }}>
                              支持所有主流 16:9 MP4 视频，借助 IndexedDB 引擎本地直读，无尺寸配额限制。
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Tab 5: Animation Stage Settings */}
            {activeTab === "stage" && (() => {
              const effectiveStatic = dbStaticImg || tweaks.stageStaticImg;
              const effectiveVideo = dbActiveVideo || tweaks.stageActiveVideo;
              const isVideo = effectiveVideo && (
                effectiveVideo.startsWith("data:video/") ||
                effectiveVideo.includes("video/mp4") ||
                effectiveVideo.includes("video/webm")
              );

              return (
                <div style={{ padding: 20, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* 0. 舞台总开关 */}
                  <div className="setting-card" style={{ margin: 0 }}>
                    <div className="setting-card-title">
                      <_MIcon name="sparkle" size={13} color="var(--accent)" />
                      <span>显示右侧专属动画舞台 (Animation Stage)</span>
                      <label style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", cursor: "pointer", gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={tweaks.showAnimationStage !== false}
                          onChange={(e) => setTweak("showAnimationStage", e.target.checked)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                        <span style={{ fontSize: 11, color: tweaks.showAnimationStage !== false ? "var(--accent)" : "var(--fg-4)" }}>
                          {tweaks.showAnimationStage !== false ? "已开启" : "已隐藏"}
                        </span>
                      </label>
                    </div>
                    <div className="setting-card-desc">
                      控制右侧栏正方形动画舞台的显示与隐藏。关闭后下方 Minimap 小地图将自适应延展填满剩余视区。
                    </div>
                  </div>
                  {/* 1. 静态插画设置卡片 */}
                  <div className="setting-card" style={{ margin: 0 }}>
                    <div className="setting-card-title">
                      <_MIcon name="image" size={13} color="var(--accent)" />
                      <span>空闲/待机静态正方形插图 (Idle & Ready)</span>
                    </div>
                    <div className="setting-card-desc">
                      当 Agent 处于空闲、等待用户输入或任务已经完成时，在右侧正方形舞台展示此静态插画。
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10 }}>
                      <div style={{ width: 100, height: 100, borderRadius: 8, overflow: "hidden", border: "1.5px solid var(--line-bright)", background: "var(--bg-elevated)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {effectiveStatic ? (
                          <img src={effectiveStatic} alt="static preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span className="mono" style={{ fontSize: 10, color: "var(--fg-4)", textAlign: "center", padding: 6 }}>
                            默认瞄准虚线框
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input
                          ref={stageImgRef}
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => onFilePicked(e.target.files?.[0], "stageStaticImg")}
                        />
                        <button className="btn mini" onClick={() => stageImgRef.current?.click()}>
                          {effectiveStatic ? "更换静态插图..." : "上传本地正方形图片..."}
                        </button>
                        {effectiveStatic && (
                          <button
                            className="btn ghost mini danger"
                            onClick={() => {
                              window.mediaDB?.del("stageStaticImg");
                              setDbStaticImg(null);
                              setTweak("stageStaticImg", "");
                            }}
                          >
                            清除静态插图 (恢复默认)
                          </button>
                        )}
                        <span style={{ fontSize: 11, color: "var(--fg-4)" }}>
                          支持 PNG/JPG/WebP，系统将自动居中裁剪为 512×512 正方形并由 IndexedDB 安全存储。
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. 动态视频/动画设置卡片 */}
                  <div className="setting-card" style={{ margin: 0 }}>
                    <div className="setting-card-title">
                      <_MIcon name="play" size={13} color="var(--cyan)" />
                      <span>工作中动态视频/动画 (Working & Streaming)</span>
                    </div>
                    <div className="setting-card-desc">
                      当 Agent 正在思考、执行工具或流式吐字输出时，在右侧正方形舞台自动循环静音播放。
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10 }}>
                      <div style={{ width: 100, height: 100, borderRadius: 8, overflow: "hidden", border: "1.5px solid var(--line-bright)", background: "var(--bg-elevated)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {effectiveVideo ? (
                          isVideo ? (
                            <video src={effectiveVideo} autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <img src={effectiveVideo} alt="video preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          )
                        ) : (
                          <span className="mono" style={{ fontSize: 10, color: "var(--fg-4)", textAlign: "center", padding: 6 }}>
                            默认科技感波纹
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input
                          ref={stageVideoRef}
                          type="file"
                          accept="video/mp4,video/webm,image/gif,image/webp"
                          style={{ display: "none" }}
                          onChange={(e) => onFilePicked(e.target.files?.[0], "stageActiveVideo")}
                        />
                        <button className="btn mini" onClick={() => stageVideoRef.current?.click()}>
                          {effectiveVideo ? "更换动态视频/动图..." : "上传本地视频/GIF 动画..."}
                        </button>
                        {effectiveVideo && (
                          <button
                            className="btn ghost mini danger"
                            onClick={() => {
                              window.mediaDB?.del("stageActiveVideo");
                              setDbActiveVideo(null);
                              setTweak("stageActiveVideo", "");
                            }}
                          >
                            清除动态视频 (恢复默认)
                          </button>
                        )}
                        <span style={{ fontSize: 11, color: "var(--fg-4)" }}>
                          支持 MP4/WebM 视频或 GIF 动图，由 IndexedDB 存储（彻底无 5MB 上限限制）。
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* 3. 舞台比例自适应模式 */}
                  <div className="setting-card" style={{ margin: 0 }}>
                    <div className="setting-card-title">
                      <_MIcon name="layers" size={13} color="var(--accent)" />
                      <span>舞台宽高比模式 (Aspect Ratio)</span>
                    </div>
                    <div className="setting-card-desc">
                      支持正方形 (1:1) 与立绘肖像 (3:4) 比例。设置为“智能自适应”时，系统将根据所上传图片/视频的实际尺寸自动平滑拉伸切换。
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                      {[
                        { id: "auto", label: "智能自适应 (Auto 推荐)", desc: "自动识别横竖立绘" },
                        { id: "1:1", label: "锁定正方形 (1:1)", desc: "标准正方形舞台" },
                        { id: "3:4", label: "锁定立绘 (3:4)", desc: "竖向肖像立绘舞台" },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          className={`btn mini ${(tweaks.stageRatioMode || "auto") === opt.id ? "accent" : "ghost"}`}
                          style={{ padding: "6px 12px", height: "auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}
                          onClick={() => setTweak("stageRatioMode", opt.id)}
                        >
                          <span style={{ fontWeight: 600 }}>{opt.label}</span>
                          <span style={{ fontSize: 9, opacity: 0.7 }}>{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Footer */}
            <div className="models-modal-footer">
              <button className="btn ghost" onClick={onClose}>关闭</button>
              {activeTab === "api" && (
                <button className="btn primary" onClick={handleSaveApi} disabled={saving}>
                  {saving ? "保存中..." : "保存并应用到 OMP"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.SettingsModal = SettingsModal;
  window.ModelsModal = SettingsModal; // backward alias
})();
