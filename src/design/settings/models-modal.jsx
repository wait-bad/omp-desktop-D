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
    const [activeTab, setActiveTab] = React.useState("api"); // "api" | "mcp" | "skills" | "prompt" | "persona" | "appearance"

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
      } catch (e) {
        console.error("Failed to load system prompt:", e);
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
        alert("API & Models configuration saved! Models are updated directly for OMP.");
      } catch (e) {
        setError("Failed to save: " + e.message);
      } finally {
        setSaving(false);
      }
    };

    // ── Local image picker handlers ─────────────────────────────────────────
    const userImgRef = React.useRef(null);
    const aiImgRef   = React.useRef(null);
    const bgImgRef   = React.useRef(null);

    const onFilePicked = (file, key) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) setTweak(key, e.target.result);
      };
      reader.readAsDataURL(file);
    };

    if (!isOpen) return null;

    const providers = config?.providers || {};
    const providerKeys = Object.keys(providers);

    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="models-modal-card" onClick={(e) => e.stopPropagation()} style={{ width: 840, height: 640 }}>
          {/* Header */}
          <div className="models-modal-header">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <_MIcon name="cog" size={16} color="var(--accent)" />
              <span style={{ fontWeight: 600, fontSize: "var(--d-text-base)" }}>Settings</span>
              <div style={{ display: "flex", gap: 4, marginLeft: 16 }}>
                <button
                  className={`btn mini ${activeTab === "api" ? "primary" : "ghost"}`}
                  onClick={() => setActiveTab("api")}
                >
                  API & Models
                </button>
                <button
                  className={`btn mini ${activeTab === "mcp" ? "primary" : "ghost"}`}
                  onClick={() => setActiveTab("mcp")}
                >
                  MCP Servers ({mcpServers.length})
                </button>
                <button
                  className={`btn mini ${activeTab === "skills" ? "primary" : "ghost"}`}
                  onClick={() => setActiveTab("skills")}
                >
                  Skills ({skillsList.length})
                </button>
                <button
                  className={`btn mini ${activeTab === "prompt" ? "primary" : "ghost"}`}
                  onClick={() => setActiveTab("prompt")}
                >
                  Prompts / 独立提示词
                </button>
                <button
                  className={`btn mini ${activeTab === "persona" ? "primary" : "ghost"}`}
                  onClick={() => setActiveTab("persona")}
                >
                  Persona & Avatars
                </button>
                <button
                  className={`btn mini ${activeTab === "appearance" ? "primary" : "ghost"}`}
                  onClick={() => setActiveTab("appearance")}
                >
                  Background
                </button>
              </div>
            </div>
            <button className="btn ghost" onClick={onClose} style={{ padding: "4px 8px" }}>✕</button>
          </div>

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

                <div className="models-providers-list">
                  <div style={{ padding: "8px 12px 4px" }}>
                    <span className="mono" style={{ fontSize: "var(--d-text-xs)", color: "var(--fg-4)" }}>
                      CONFIGURED ({providerKeys.length})
                    </span>
                  </div>
                  {providerKeys.map((k) => (
                    <div
                      key={k}
                      className={`models-provider-item ${activeProvider === k ? "active" : ""}`}
                      onClick={() => loadProviderForm(k, providers[k])}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {providers[k].name || k}
                      </span>
                      <button
                        className="btn ghost mini"
                        style={{ color: "var(--fg-4)", padding: "0 4px" }}
                        onClick={(e) => { e.stopPropagation(); handleDeleteProvider(k); }}
                        title="Delete provider"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {activeProvider === "__new__" && (
                    <div className="models-provider-item active">
                      <span>* New Provider</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right form pane */}
              <div className="models-form-pane">
                {error && <div className="models-error">{error}</div>}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="models-field-group">
                    <label>Provider ID / Unique Key</label>
                    <input
                      type="text"
                      className="twk-field"
                      value={editKey}
                      placeholder="e.g. openai, banban, 12key"
                      onChange={(e) => setEditKey(e.target.value)}
                    />
                  </div>
                  <div className="models-field-group">
                    <label>Display Name</label>
                    <input
                      type="text"
                      className="twk-field"
                      value={editName}
                      placeholder="e.g. Official OpenAI"
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
                  <div className="models-field-group">
                    <label>API Protocol / Format</label>
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
                    <label>API Base URL</label>
                    <input
                      type="text"
                      className="twk-field"
                      value={editBaseUrl}
                      placeholder="https://api.openai.com/v1"
                      onChange={(e) => setEditBaseUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="models-field-group" style={{ marginTop: 10 }}>
                  <label>API Key (Bearer Token / Key)</label>
                  <input
                    type="password"
                    className="twk-field"
                    value={editApiKey}
                    placeholder="sk-..."
                    onChange={(e) => setEditApiKey(e.target.value)}
                  />
                </div>

                {/* Beginner Explanation & Guide Card */}
                <div style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  background: "color-mix(in oklab, var(--accent) 6%, var(--bg-surface))",
                  border: "1px solid color-mix(in oklab, var(--accent) 25%, var(--line))",
                  borderRadius: 6,
                  fontSize: "var(--d-text-xs)",
                  lineHeight: 1.5,
                  color: "var(--fg-2)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "var(--accent)", marginBottom: 4 }}>
                    <_MIcon name="info" size={13} color="var(--accent)" />
                    <span>API 格式与中转站配置说明</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
                    <li>
                      <b>国内/第三方中转站 (OneAPI / NewAPI / 个人代理)：</b>
                      请统一选择 <code>OpenAI Compatible (openai-completions)</code>，Base URL 填写 <code>https://域名/v1</code>。即使模型是 Claude/Gemini/DeepSeek，中转站通常都转成了 OpenAI 兼容格式。
                    </li>
                    <li>
                      <b>官方直连：</b>
                      OpenAI / DeepSeek / OpenRouter 选 <code>openai-completions</code>；Anthropic 官方直连选 <code>anthropic-messages</code>；Google 官方直连选 <code>google-generative-ai</code>。
                    </li>
                    <li>
                      <b>左侧快捷模板：</b>
                      点击左侧 <b>QUICK PRESETS</b> 按钮可直接填入标准地址与协议，只需要修改域名与填入 API Key 即可！
                    </li>
                  </ul>
                </div>
                {/* Models Section */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: "var(--d-text-sm)" }}>Models ({editModels.length})</span>
                    <button className="btn mini" onClick={handleAddModel}>+ Add Model</button>
                  </div>

                  <div className="models-cards-scroll">
                    {editModels.map((m, idx) => (
                      <div key={idx} className="model-sub-card">
                        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                          <input
                            type="text"
                            className="twk-field"
                            style={{ flex: 1 }}
                            placeholder="Model ID (e.g. gpt-4o, claude-3-7-sonnet)"
                            value={m.id || ""}
                            onChange={(e) => handleModelChange(idx, "id", e.target.value)}
                          />
                          <input
                            type="text"
                            className="twk-field"
                            style={{ flex: 1 }}
                            placeholder="Display Name"
                            value={m.name || ""}
                            onChange={(e) => handleModelChange(idx, "name", e.target.value)}
                          />
                          <button
                            className="btn ghost mini"
                            style={{ color: "var(--crimson)" }}
                            onClick={() => handleRemoveModel(idx)}
                          >
                            ✕
                          </button>
                        </div>

                        <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: "var(--d-text-xs)" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={!!m.reasoning}
                              onChange={(e) => handleModelChange(idx, "reasoning", e.target.checked)}
                            />
                            Reasoning / Thinking
                          </label>
                          {m.reasoning && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span>Default Effort:</span>
                              <select
                                className="twk-field"
                                style={{ padding: "2px 6px", fontSize: "11px" }}
                                value={m.thinking?.defaultLevel || "medium"}
                                onChange={(e) => {
                                  const th = m.thinking || { mode: "effort", efforts: ["low", "medium", "high"] };
                                  handleModelChange(idx, "thinking", { ...th, defaultLevel: e.target.value });
                                }}
                              >
                                <option value="low">low</option>
                                <option value="medium">medium</option>
                                <option value="high">high</option>
                              </select>
                            </div>
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                            <span style={{ color: "var(--fg-4)" }}>Context:</span>
                            <input
                              type="number"
                              className="twk-field"
                              style={{ width: 80, padding: "2px 4px", fontSize: "11px" }}
                              value={m.contextWindow || 128000}
                              onChange={(e) => handleModelChange(idx, "contextWindow", parseInt(e.target.value, 10) || 128000)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: MCP Servers */}
          {activeTab === "mcp" && (
            <div style={{ padding: 20, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "var(--d-text-sm)", color: "var(--fg-1)" }}>
                    MCP 扩展服务管理 (Model Context Protocol)
                  </div>
                  <div style={{ fontSize: "var(--d-text-xs)", color: "var(--fg-3)", marginTop: 2 }}>
                    每个启用的 MCP 服务都会向 Agent 注入大量 Tools 和 Schema 说明。禁用不常用的服务可大幅降低初始 Token 消耗。
                  </div>
                </div>
                <button className="btn mini" onClick={fetchMcp} disabled={mcpLoading}>
                  {mcpLoading ? "Loading..." : "Refresh"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {mcpServers.map((srv) => {
                  const isEn = srv.enabled;
                  return (
                    <div
                      key={srv.name}
                      style={{
                        background: "var(--bg-window)",
                        border: isEn ? "1px solid var(--accent)" : "1px solid var(--line)",
                        borderRadius: 8,
                        padding: "12px 14px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: 8,
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 600, fontSize: "13px", color: isEn ? "var(--fg-1)" : "var(--fg-3)" }}>
                            {srv.name}
                          </span>
                          <span
                            className="mono"
                            style={{
                              fontSize: "10px",
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: isEn ? "rgba(138, 240, 200, 0.15)" : "var(--bg-elevated)",
                              color: isEn ? "var(--accent)" : "var(--fg-4)",
                              border: isEn ? "1px solid rgba(138, 240, 200, 0.3)" : "1px solid var(--line)"
                            }}
                          >
                            {isEn ? "ACTIVE" : "DISABLED"}
                          </span>
                        </div>
                        {srv.command && (
                          <div
                            className="mono"
                            style={{
                              fontSize: "11px",
                              color: "var(--fg-3)",
                              marginTop: 6,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}
                            title={`${srv.command} ${(srv.args || []).join(" ")}`}
                          >
                            {srv.command} {(srv.args || []).join(" ")}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <span className="mono" style={{ fontSize: "10px", color: "var(--fg-4)" }}>
                          source: {srv.source}
                        </span>
                        <button
                          className={`btn mini ${isEn ? "ghost" : "primary"}`}
                          style={{
                            fontSize: "11px",
                            padding: "2px 10px",
                            color: isEn ? "var(--crimson)" : undefined
                          }}
                          onClick={async () => {
                            const next = !isEn;
                            await window.OMP_BRIDGE?.toggleMcpServer(srv.name, next);
                            setMcpServers(prev => prev.map(s => s.name === srv.name ? { ...s, enabled: next } : s));
                          }}
                        >
                          {isEn ? "Disable (禁用)" : "Enable (启用)"}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {mcpServers.length === 0 && !mcpLoading && (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 30, color: "var(--fg-4)" }}>
                    No MCP servers detected in ~/.omp/agent/mcp.json or ~/.codex/config.toml
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Skills */}
          {activeTab === "skills" && (
            <div style={{ padding: 20, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-window)", padding: 14, borderRadius: 8, border: "1px solid var(--line)" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "var(--d-text-sm)", color: "var(--fg-1)" }}>
                    Skills 全局开关 (Master Switch)
                  </div>
                  <div style={{ fontSize: "var(--d-text-xs)", color: "var(--fg-3)", marginTop: 2 }}>
                    控制是否加载 ~/.codex/skills/ 和 ~/.omp/agent/skills/ 中的 Agent 技能
                  </div>
                </div>
                <button
                  className={`btn mini ${skillsMaster ? "primary" : "ghost"}`}
                  style={{ color: skillsMaster ? undefined : "var(--crimson)" }}
                  onClick={async () => {
                    const next = !skillsMaster;
                    await window.OMP_BRIDGE?.setSkillsMasterEnabled(next);
                    setSkillsMaster(next);
                    setSkillsList(prev => prev.map(s => ({ ...s, enabled: next })));
                  }}
                >
                  {skillsMaster ? "Skills: 已全部启用" : "Skills: 全部禁用"}
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
                        background: "var(--bg-window)",
                        border: isEn ? "1px solid var(--line)" : "1px dashed var(--line)",
                        opacity: skillsMaster ? 1 : 0.6,
                        borderRadius: 8,
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 16
                      }}
                    >
                      <div style={{ flex: 1 }}>
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
                              background: isEn ? "rgba(138, 240, 200, 0.1)" : "var(--bg-elevated)",
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

                      <button
                        className={`btn mini ${sk.enabled ? "ghost" : "primary"}`}
                        disabled={!skillsMaster}
                        style={{
                          fontSize: "11px",
                          padding: "2px 10px",
                          color: sk.enabled ? "var(--crimson)" : undefined
                        }}
                        onClick={async () => {
                          const next = !sk.enabled;
                          await window.OMP_BRIDGE?.toggleSkill(sk.name, next);
                          setSkillsList(prev => prev.map(s => s.name === sk.name ? { ...s, enabled: next } : s));
                        }}
                      >
                        {sk.enabled ? "Ignore (忽略)" : "Enable (启用)"}
                      </button>
                    </div>
                  );
                })}
                {skillsList.length === 0 && !skillsLoading && (
                  <div style={{ textAlign: "center", padding: 30, color: "var(--fg-4)" }}>
                    No skills found in ~/.codex/skills/ or ~/.omp/agent/skills/
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Prompts & 独立提示词 */}
          {activeTab === "prompt" && (
            <div style={{ padding: 20, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Section 1: 独立隐藏前缀提示词 */}
              <div style={{ background: "var(--bg-window)", padding: 16, borderRadius: 8, border: tweaks.prefixEnabled ? "1.5px solid var(--accent)" : "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "var(--d-text-sm)", color: "var(--fg-1)", display: "flex", alignItems: "center", gap: 8 }}>
                      <span>✨ 独立前缀提示词 (Custom Prefix Prompt)</span>
                      <span className="mono" style={{ fontSize: "10px", padding: "1px 6px", borderRadius: 4, background: tweaks.prefixEnabled ? "var(--accent)" : "var(--bg-elevated)", color: tweaks.prefixEnabled ? "#000" : "var(--fg-3)" }}>
                        {tweaks.prefixEnabled ? "已启用" : "已停用"}
                      </span>
                    </div>
                    <div style={{ fontSize: "var(--d-text-xs)", color: "var(--fg-3)", marginTop: 4 }}>
                      开启后，每次在输入框发送消息时，会自动将此提示词拼接在消息最前端发送给模型；<strong style={{ color: "var(--accent)" }}>在对话界面中隐蔽不显示</strong>，保持聊天记录干净清爽。
                    </div>
                  </div>
                  <button
                    className={`btn mini ${tweaks.prefixEnabled ? "primary" : "ghost"}`}
                    onClick={() => setTweak("prefixEnabled", !tweaks.prefixEnabled)}
                  >
                    {tweaks.prefixEnabled ? "关闭前缀注入" : "开启前缀注入"}
                  </button>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ fontSize: "12px", color: "var(--fg-2)" }}>前缀提示词内容：</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn ghost mini"
                        style={{ fontSize: "11px", padding: "1px 6px" }}
                        onClick={() => setTweak("customPrefix", "【提示：请始终保持可爱、可靠的「可蒂丝」人格回应我，自然灵动，偶尔撒娇卖萌，满满自信。】\n\n")}
                      >
                        + 可蒂丝预设
                      </button>
                      <button
                        className="btn ghost mini"
                        style={{ fontSize: "11px", padding: "1px 6px" }}
                        onClick={() => setTweak("customPrefix", "【强强可蒂丝模式：请先给出直接结论与判断，再给出严谨步骤与依据，降低可爱表达，最高理智与执行力。】\n\n")}
                      >
                        + 强强可蒂丝预设
                      </button>
                      <button
                        className="btn ghost mini"
                        style={{ fontSize: "11px", padding: "1px 6px" }}
                        onClick={() => setTweak("customPrefix", "【请使用精简高效的工程师风格，直接给出修改与结果，不要多余客套。】\n\n")}
                      >
                        + 极简工程师预设
                      </button>
                      <button
                        className="btn ghost mini"
                        style={{ fontSize: "11px", padding: "1px 6px", color: "var(--crimson)" }}
                        onClick={() => setTweak("customPrefix", "")}
                      >
                        清空
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    className="twk-field mono"
                    style={{ width: "100%", fontSize: "12px", padding: 8, lineHeight: 1.5, resize: "vertical" }}
                    placeholder="输入希望在每次发送提问时静默拼接在前部的提示词或指令..."
                    value={tweaks.customPrefix ?? ""}
                    onChange={(e) => setTweak("customPrefix", e.target.value)}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span className="mono" style={{ fontSize: "11px", color: "var(--fg-4)" }}>
                      字数: {(tweaks.customPrefix || "").length} | 估算 Tokens: ~{Math.ceil((tweaks.customPrefix || "").length / 3)}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--fg-3)" }}>
                      提示：输入框下方也可通过快捷胶囊按钮快速开启/关闭此功能
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: 全局 AGENTS.md 系统提示词 */}
              <div style={{ background: "var(--bg-window)", padding: 16, borderRadius: 8, border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "var(--d-text-sm)", color: "var(--fg-1)" }}>
                      全局 System Prompt (`~/.codex/AGENTS.md`)
                    </div>
                    <div style={{ fontSize: "var(--d-text-xs)", color: "var(--fg-3)", marginTop: 2 }}>
                      Agent 全局启动时加载的系统人设与基础规则定义（跨所有项目通用）。
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {promptSavedNote && (
                      <span style={{ color: "var(--accent)", fontSize: "12px" }}>✓ Saved successfully</span>
                    )}
                    <button
                      className="btn primary mini"
                      disabled={promptSaving}
                      onClick={async () => {
                        setPromptSaving(true);
                        try {
                          await window.OMP_BRIDGE?.saveSystemPrompt(systemPrompt);
                          setPromptSavedNote(true);
                          setTimeout(() => setPromptSavedNote(false), 2500);
                        } catch (e) {
                          alert("Failed to save AGENTS.md: " + e.message);
                        } finally {
                          setPromptSaving(false);
                        }
                      }}
                    >
                      {promptSaving ? "Saving..." : "Save AGENTS.md"}
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <textarea
                    rows={8}
                    className="twk-field mono"
                    style={{ width: "100%", fontSize: "12px", padding: 8, lineHeight: 1.5, resize: "vertical" }}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Persona & Avatars */}
          {activeTab === "persona" && (
            <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "var(--bg-window)", padding: 16, borderRadius: 8, border: "1px solid var(--line)" }}>
                <span className="mono" style={{ fontSize: "var(--d-text-xs)", color: "var(--accent)", fontWeight: 600 }}>
                  USER SETTINGS
                </span>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="models-field-group">
                    <label>User Name</label>
                    <input
                      type="text"
                      className="twk-field"
                      value={tweaks.userName ?? "you"}
                      placeholder="e.g. Master, Alice"
                      onChange={(e) => setTweak("userName", e.target.value)}
                    />
                  </div>

                  <div className="models-field-group">
                    <label>User Avatar (Local File / Image)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {tweaks.userAvatar ? (
                        <img
                          src={tweaks.userAvatar}
                          alt=""
                          style={{ width: 45, height: 45, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)" }}
                        />
                      ) : (
                        <div style={{ width: 45, height: 45, borderRadius: "50%", background: "var(--bg-elevated)", border: "1px dashed var(--line)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-4)", fontSize: 11 }}>
                          Default
                        </div>
                      )}
                      <input
                        ref={userImgRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => onFilePicked(e.target.files?.[0], "userAvatar")}
                      />
                      <button className="btn mini" onClick={() => userImgRef.current?.click()}>
                        Choose Local Image...
                      </button>
                      {tweaks.userAvatar && (
                        <button className="btn ghost mini" style={{ color: "var(--crimson)" }} onClick={() => setTweak("userAvatar", "")}>
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: "var(--bg-window)", padding: 16, borderRadius: 8, border: "1px solid var(--line)" }}>
                <span className="mono" style={{ fontSize: "var(--d-text-xs)", color: "var(--accent)", fontWeight: 600 }}>
                  AI ASSISTANT SETTINGS
                </span>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="models-field-group">
                    <label>AI Display Name</label>
                    <input
                      type="text"
                      className="twk-field"
                      value={tweaks.aiName ?? "OMP"}
                      placeholder="e.g. 可蒂丝, Assistant"
                      onChange={(e) => setTweak("aiName", e.target.value)}
                    />
                  </div>

                  <div className="models-field-group">
                    <label>AI Avatar (Local File / Image)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {tweaks.aiAvatar ? (
                        <img
                          src={tweaks.aiAvatar}
                          alt=""
                          style={{ width: 45, height: 45, borderRadius: 12, objectFit: "cover", border: "2px solid var(--accent)" }}
                        />
                      ) : (
                        <div style={{ width: 45, height: 45, borderRadius: 12, background: "var(--bg-elevated)", border: "1px dashed var(--line)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-4)", fontSize: 11 }}>
                          Sparkle
                        </div>
                      )}
                      <input
                        ref={aiImgRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => onFilePicked(e.target.files?.[0], "aiAvatar")}
                      />
                      <button className="btn mini" onClick={() => aiImgRef.current?.click()}>
                        Choose Local Image...
                      </button>
                      {tweaks.aiAvatar && (
                        <button className="btn ghost mini" style={{ color: "var(--crimson)" }} onClick={() => setTweak("aiAvatar", "")}>
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Appearance & Background */}
          {activeTab === "appearance" && (
            <div style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "var(--bg-window)", padding: 16, borderRadius: 8, border: "1px solid var(--line)" }}>
                <span className="mono" style={{ fontSize: "var(--d-text-xs)", color: "var(--accent)", fontWeight: 600 }}>
                  CUSTOM BACKGROUND IMAGE
                </span>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="models-field-group">
                    <label>Background Image (Local File)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {tweaks.bgImage ? (
                        <img
                          src={tweaks.bgImage}
                          alt=""
                          style={{ width: 80, height: 50, borderRadius: 6, objectFit: "cover", border: "1.5px solid var(--accent)" }}
                        />
                      ) : (
                        <div style={{ width: 80, height: 50, borderRadius: 6, background: "var(--bg-elevated)", border: "1px dashed var(--line)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-4)", fontSize: 11 }}>
                          None
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
                        Select Background Image...
                      </button>
                      {tweaks.bgImage && (
                        <button className="btn ghost mini" style={{ color: "var(--crimson)" }} onClick={() => setTweak("bgImage", "")}>
                          Clear Image
                        </button>
                      )}
                    </div>
                  </div>

                  {tweaks.bgImage && (
                    <div className="models-field-group">
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <label>Background Opacity / 背景透明度 (浓度)</label>
                        <span className="mono" style={{ fontSize: "11px", color: "var(--accent)" }}>
                          {tweaks.bgOpacity ?? 60}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        style={{ width: "100%", accentColor: "var(--accent)" }}
                        value={tweaks.bgOpacity ?? 60}
                        onChange={(e) => setTweak("bgOpacity", parseInt(e.target.value, 10))}
                      />
                      <span style={{ fontSize: "var(--d-text-xs)", color: "var(--fg-3)", marginTop: 4 }}>
                        调节背景图透出清晰度，数值越高背景壁纸越清晰透亮。
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="models-modal-footer">
            <button className="btn ghost" onClick={onClose}>Close</button>
            {activeTab === "api" && (
              <button className="btn primary" onClick={handleSaveApi} disabled={saving}>
                {saving ? "Saving..." : "Save & Apply to OMP"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  window.SettingsModal = SettingsModal;
  window.ModelsModal = SettingsModal; // backward alias
})();
