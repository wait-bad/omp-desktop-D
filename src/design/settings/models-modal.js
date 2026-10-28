/* Transpiled from design/settings/models-modal.jsx via esbuild — DO NOT EDIT DIRECTLY */
(function() {
(function() {
  const { Icon: _MIcon } = window;
  const PRESETS = {
    openai: {
      name: "OpenAI Official",
      api: "openai-completions",
      baseUrl: "https://api.openai.com/v1",
      models: [
        { id: "gpt-4o", name: "GPT-4o", contextWindow: 128e3, reasoning: false },
        { id: "gpt-4o-mini", name: "GPT-4o mini", contextWindow: 128e3, reasoning: false },
        { id: "o1", name: "o1", contextWindow: 2e5, reasoning: true, thinking: { mode: "effort", efforts: ["low", "medium", "high"], defaultLevel: "high" } },
        { id: "o3-mini", name: "o3-mini", contextWindow: 2e5, reasoning: true, thinking: { mode: "effort", efforts: ["low", "medium", "high"], defaultLevel: "medium" } }
      ]
    },
    anthropic: {
      name: "Anthropic Claude",
      api: "anthropic-messages",
      baseUrl: "https://api.anthropic.com/v1",
      models: [
        { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet", contextWindow: 2e5, reasoning: true, thinking: { mode: "budget", defaultBudget: 4e3 } },
        { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", contextWindow: 2e5, reasoning: false },
        { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", contextWindow: 2e5, reasoning: false }
      ]
    },
    deepseek: {
      name: "DeepSeek Official",
      api: "openai-completions",
      baseUrl: "https://api.deepseek.com/v1",
      models: [
        { id: "deepseek-chat", name: "DeepSeek V3 (Chat)", contextWindow: 64e3, reasoning: false },
        { id: "deepseek-reasoner", name: "DeepSeek R1", contextWindow: 64e3, reasoning: true, thinking: { mode: "effort", defaultLevel: "high" } }
      ]
    },
    openrouter: {
      name: "OpenRouter",
      api: "openai-completions",
      baseUrl: "https://openrouter.ai/api/v1",
      models: [
        { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet", contextWindow: 2e5, reasoning: true },
        { id: "deepseek/deepseek-r1", name: "DeepSeek R1", contextWindow: 128e3, reasoning: true },
        { id: "openai/gpt-4o", name: "GPT-4o", contextWindow: 128e3, reasoning: false }
      ]
    },
    custom: {
      name: "Custom OneAPI / Relay / Other",
      api: "openai-completions",
      baseUrl: "https://your-relay-domain.com/v1",
      models: [
        { id: "gpt-4o", name: "GPT-4o", contextWindow: 128e3, reasoning: false }
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
    const [activeTab, setActiveTab] = React.useState("twins");
    const [toolsSubTab, setToolsSubTab] = React.useState("mcp");
    const [config, setConfig] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [activeProvider, setActiveProvider] = React.useState(null);
    const [editKey, setEditKey] = React.useState("");
    const [editName, setEditName] = React.useState("");
    const [editApi, setEditApi] = React.useState("openai-completions");
    const [editBaseUrl, setEditBaseUrl] = React.useState("");
    const [editApiKey, setEditApiKey] = React.useState("");
    const [editModels, setEditModels] = React.useState([]);
    const [mcpServers, setMcpServers] = React.useState([]);
    const [mcpLoading, setMcpLoading] = React.useState(false);
    const [skillsMaster, setSkillsMaster] = React.useState(true);
    const [skillsList, setSkillsList] = React.useState([]);
    const [skillsLoading, setSkillsLoading] = React.useState(false);
    const [systemPrompt, setSystemPrompt] = React.useState("");
    const [promptSaving, setPromptSaving] = React.useState(false);
    const [promptSavedNote, setPromptSavedNote] = React.useState(false);
    const [systemMd, setSystemMd] = React.useState("");
    const [systemMdSaving, setSystemMdSaving] = React.useState(false);
    const [systemMdSavedNote, setSystemMdSavedNote] = React.useState(false);
    const [syncSuccess, setSyncSuccess] = React.useState(false);
    const allAvailableModels = React.useMemo(() => {
      const list = [];
      const providers2 = config?.providers || {};
      for (const provKey of Object.keys(providers2)) {
        const prov = providers2[provKey];
        for (const m of prov?.models || []) {
          if (m?.id && !list.some((x) => x.id === m.id)) {
            list.push({
              id: m.id,
              name: m.name || m.id,
              provider: prov.name || provKey
            });
          }
        }
      }
      const bridgeModels = window.OMP_DATA?.models || [];
      for (const bm of bridgeModels) {
        if (bm?.id && !list.some((x) => x.id === bm.id)) {
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
          contextWindow: 128e3,
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
        const nextConfig = { ...config, providers: { ...config?.providers || {} } };
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
    const userImgRef = React.useRef(null);
    const coticeImgRef = React.useRef(null);
    const codiceImgRef = React.useRef(null);
    const bgImgRef = React.useRef(null);
    const stageImgRef = React.useRef(null);
    const stageVideoRef = React.useRef(null);
    const splashVideoRef = React.useRef(null);
    const [dbStaticImg, setDbStaticImg] = React.useState(null);
    const [dbActiveVideo, setDbActiveVideo] = React.useState(null);
    const [dbSplashVideo, setDbSplashVideo] = React.useState(null);
    React.useEffect(() => {
      if (isOpen && window.mediaDB) {
        window.mediaDB.get("stageStaticImg").then((val) => val && setDbStaticImg(val));
        window.mediaDB.get("stageActiveVideo").then((val) => val && setDbActiveVideo(val));
        window.mediaDB.get("splashVideo").then((val) => val && setDbSplashVideo(val));
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
      twins: { title: "\u642D\u6863\u4E13\u5C5E\u504F\u597D", desc: "\u914D\u7F6E\u53EF\u8482\u4E1D\u542F\u52A8\u4E0E\u5BF9\u8BDD\u65F6\u7684\u9ED8\u8BA4\u6A21\u578B\u5E95\u5EA7\u3001\u601D\u8003\u6DF1\u5EA6\u4E0E\u4E13\u5C5E\u5934\u50CF" },
      api: { title: "API \u4E0E\u6A21\u578B\u670D\u52A1\u63D0\u4F9B\u5546", desc: "\u914D\u7F6E\u5B98\u65B9\u76F4\u8FDE\u3001\u81EA\u5EFA\u4E2D\u8F6C\u7AD9 (OneAPI/NewAPI) \u6216\u7B2C\u4E09\u65B9\u6A21\u578B\u4EE3\u7406" },
      prompt: { title: "\u63D0\u793A\u8BCD\u8BBE\u7F6E", desc: "\u7BA1\u7406\u9759\u9ED8\u53D1\u9001\u7684\u524D\u7F00\u63D0\u793A\u8BCD\u4E0E\u8DE8\u5DE5\u7A0B\u901A\u7528\u7684\u5168\u5C40\u63D0\u793A\u8BCD" },
      appearance: { title: "\u754C\u9762\u80CC\u666F\u58C1\u7EB8\u4E0E\u5916\u89C2", desc: "\u81EA\u5B9A\u4E49\u684C\u9762\u80CC\u666F\u56FE\u7247\u3001\u900F\u660E\u5EA6\u4E0E\u89C6\u89C9\u5C42\u6B21" },
      tools: { title: "MCP \u6269\u5C55\u4E0E Skills \u6280\u80FD", desc: "\u7BA1\u7406\u5916\u90E8\u4E0A\u4E0B\u6587\u5DE5\u5177\u670D\u52A1\uFF0C\u907F\u514D\u591A\u4F59\u6CE8\u5165\u6253\u7A7F\u4E0A\u4E0B\u6587\u4E0E TPM \u914D\u989D" },
      stage: { title: "\u821E\u53F0\u52A8\u753B\u4E0E\u52A8\u56FE (Animation Stage)", desc: "\u4E3A\u53F3\u4FA7\u6B63\u65B9\u5F62\u4E13\u5C5E\u821E\u53F0\u914D\u7F6E\u9759\u6001\u63D2\u753B\u4E0E\u5DE5\u4F5C\u4E2D\u5B9E\u65F6\u64AD\u653E\u7684\u52A8\u6001\u89C6\u9891/\u52A8\u56FE" }
    };
    const currentTabInfo = tabHeaders[activeTab] || tabHeaders.twins;
    const handleSyncTwinDefaults = () => {
      window.OMP_BRIDGE?.applyTwinDefaults?.();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2400);
    };
    return /* @__PURE__ */ React.createElement("div", { className: "modal-backdrop", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: "models-modal-card", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "models-modal-nav" }, /* @__PURE__ */ React.createElement("div", { className: "models-modal-nav-title" }, /* @__PURE__ */ React.createElement(_MIcon, { name: "cog", size: 15, color: "var(--accent)" }), /* @__PURE__ */ React.createElement("span", null, "\u8BBE\u7F6E \xB7 Settings")), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `models-nav-item ${activeTab === "twins" ? "active" : ""}`,
        onClick: () => setActiveTab("twins")
      },
      /* @__PURE__ */ React.createElement(_MIcon, { name: "sparkle", size: 14, color: "var(--accent)" }),
      /* @__PURE__ */ React.createElement("span", null, "\u642D\u6863\u504F\u597D")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `models-nav-item ${activeTab === "api" ? "active" : ""}`,
        onClick: () => setActiveTab("api")
      },
      /* @__PURE__ */ React.createElement(_MIcon, { name: "layers", size: 14 }),
      /* @__PURE__ */ React.createElement("span", null, "\u5E95\u5EA7\u6A21\u578B\u4E0E API")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `models-nav-item ${activeTab === "prompt" ? "active" : ""}`,
        onClick: () => setActiveTab("prompt")
      },
      /* @__PURE__ */ React.createElement(_MIcon, { name: "edit", size: 14 }),
      /* @__PURE__ */ React.createElement("span", null, "\u63D0\u793A\u8BCD\u4E0E Prompt")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `models-nav-item ${activeTab === "appearance" ? "active" : ""}`,
        onClick: () => setActiveTab("appearance")
      },
      /* @__PURE__ */ React.createElement(_MIcon, { name: "image", size: 14 }),
      /* @__PURE__ */ React.createElement("span", null, "\u80CC\u666F\u4E0E\u5916\u89C2")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `models-nav-item ${activeTab === "stage" ? "active" : ""}`,
        onClick: () => setActiveTab("stage")
      },
      /* @__PURE__ */ React.createElement(_MIcon, { name: "play", size: 14, color: "var(--accent)" }),
      /* @__PURE__ */ React.createElement("span", null, "\u821E\u53F0\u52A8\u753B\u4E0E\u52A8\u56FE")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `models-nav-item ${activeTab === "tools" ? "active" : ""}`,
        onClick: () => setActiveTab("tools")
      },
      /* @__PURE__ */ React.createElement(_MIcon, { name: "folder", size: 14 }),
      /* @__PURE__ */ React.createElement("span", null, "MCP \u4E0E Skills")
    ), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn ghost mini",
        style: { width: "100%", justifyContent: "center", color: "var(--fg-4)", fontSize: "11px" },
        onClick: onClose
      },
      "\u5173\u95ED (Esc)"
    )), /* @__PURE__ */ React.createElement("div", { className: "models-modal-main" }, /* @__PURE__ */ React.createElement("div", { className: "models-modal-header" }, /* @__PURE__ */ React.createElement("div", { className: "models-modal-header-info" }, /* @__PURE__ */ React.createElement("h3", null, currentTabInfo.title), /* @__PURE__ */ React.createElement("p", null, currentTabInfo.desc)), /* @__PURE__ */ React.createElement("button", { className: "btn icon ghost", onClick: onClose, style: { padding: "4px 8px", borderRadius: 6 } }, "\u2715")), activeTab === "twins" && /* @__PURE__ */ React.createElement("div", { style: { padding: 20, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement("div", { className: "setting-card", style: { borderColor: "color-mix(in oklab, var(--accent) 38%, var(--line))", margin: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "setting-card-title", style: { color: "var(--accent)" } }, /* @__PURE__ */ React.createElement("span", { className: "dot", style: { background: "var(--accent)", width: 8, height: 8 } }), /* @__PURE__ */ React.createElement("span", null, "\u53EF\u8482\u4E1D (Cotice) \xB7 \u4E13\u5C5E\u914D\u7F6E"), /* @__PURE__ */ React.createElement("span", { className: "chip mono", style: { fontSize: 10, marginLeft: "auto", color: "var(--accent)", background: "color-mix(in oklab, var(--accent) 12%, transparent)" } }, "\u4E13\u5C5E\u4F34\u4FA3 \xB7 \u6838\u5FC3\u5DE5\u7A0B\u667A\u56CA")), /* @__PURE__ */ React.createElement("div", { className: "setting-card-desc" }, "\u914D\u7F6E\u53EF\u8482\u4E1D\u542F\u52A8\u4E0E\u5BF9\u8BDD\u65F6\u7684\u9ED8\u8BA4\u6A21\u578B\u4E0E\u601D\u8003\u5F3A\u5EA6\uFF0C\u8BBE\u7F6E\u540E\u65E0\u9700\u6BCF\u6B21\u91CD\u590D\u5207\u6362\u3002"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { className: "models-field-group", style: { minWidth: 0 } }, /* @__PURE__ */ React.createElement("label", null, "\u9ED8\u8BA4\u5E95\u5EA7\u6A21\u578B (Default Model)"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, minWidth: 0 } }, /* @__PURE__ */ React.createElement(
      "select",
      {
        className: "twk-field",
        value: tweaks.coticeDefaultModel || tweaks.defaultModel || "",
        onChange: (e) => {
          setTweak("coticeDefaultModel", e.target.value);
          setTweak("defaultModel", e.target.value);
        },
        style: { flex: 1, minWidth: 0, fontSize: 12 }
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "\u8DDF\u968F\u5168\u5C40\u4F1A\u8BDD (Default)"),
      allAvailableModels.map((m) => /* @__PURE__ */ React.createElement("option", { key: m.id, value: m.id }, m.name, " (", m.id, ")"))
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "twk-field mono",
        placeholder: "\u6216\u8F93\u5165\u6A21\u578B ID",
        value: tweaks.coticeDefaultModel || tweaks.defaultModel || "",
        onChange: (e) => {
          setTweak("coticeDefaultModel", e.target.value);
          setTweak("defaultModel", e.target.value);
        },
        style: { width: 110, minWidth: 0, fontSize: 11, boxSizing: "border-box" },
        title: "\u82E5\u4E0B\u62C9\u5217\u8868\u6CA1\u6709\uFF0C\u53EF\u76F4\u63A5\u586B\u5165\u6A21\u578B ID (\u5982 deepseek-chat \u6216 claude-3-7-sonnet-20250219)"
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "models-field-group", style: { minWidth: 0 } }, /* @__PURE__ */ React.createElement("label", null, "\u9ED8\u8BA4\u601D\u8003\u5F3A\u5EA6 (Thinking Level)"), /* @__PURE__ */ React.createElement(
      "select",
      {
        className: "twk-field",
        value: tweaks.coticeDefaultThinking || tweaks.defaultThinking || "auto",
        onChange: (e) => {
          setTweak("coticeDefaultThinking", e.target.value);
          setTweak("defaultThinking", e.target.value);
        },
        style: { width: "100%", maxWidth: "100%", minWidth: 0, fontSize: 12, boxSizing: "border-box" }
      },
      /* @__PURE__ */ React.createElement("option", { value: "auto" }, "Auto (\u81EA\u52A8 \xB7 \u9ED8\u8BA4)"),
      /* @__PURE__ */ React.createElement("option", { value: "off" }, "Off (\u5173\u95ED\u601D\u8003)"),
      /* @__PURE__ */ React.createElement("option", { value: "minimal" }, "Minimal (\u5FAE\u5F31)"),
      /* @__PURE__ */ React.createElement("option", { value: "low" }, "Low (\u4F4E\u5EA6)"),
      /* @__PURE__ */ React.createElement("option", { value: "medium" }, "Medium (\u4E2D\u5EA6)"),
      /* @__PURE__ */ React.createElement("option", { value: "high" }, "High (\u6DF1\u5EA6)"),
      /* @__PURE__ */ React.createElement("option", { value: "xhigh" }, "XHigh (\u6781\u9650)")
    ))), /* @__PURE__ */ React.createElement("div", { className: "models-field-group", style: { marginTop: 8, paddingTop: 10, borderTop: "1px dashed var(--line)" } }, /* @__PURE__ */ React.createElement("label", null, "\u53EF\u8482\u4E1D\u4E13\u5C5E\u5934\u50CF (Avatar)"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, tweaks.coticeAvatar || tweaks.aiAvatar ? /* @__PURE__ */ React.createElement(
      "img",
      {
        src: tweaks.coticeAvatar || tweaks.aiAvatar,
        alt: "\u53EF\u8482\u4E1D\u5934\u50CF",
        style: { width: 40, height: 40, borderRadius: 10, objectFit: "cover", border: "2px solid var(--accent)" }
      }
    ) : /* @__PURE__ */ React.createElement("div", { style: { width: 40, height: 40, borderRadius: 10, background: "var(--bg-window)", border: "1px dashed var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontSize: 11, fontWeight: 700 } }, "\u8482"), /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: coticeImgRef,
        type: "file",
        accept: "image/*",
        style: { display: "none" },
        onChange: (e) => {
          onFilePicked(e.target.files?.[0], "coticeAvatar");
          onFilePicked(e.target.files?.[0], "aiAvatar");
        }
      }
    ), /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn mini", onClick: () => coticeImgRef.current?.click() }, "\u66F4\u6362\u5934\u50CF..."), (tweaks.coticeAvatar || tweaks.aiAvatar) && /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn ghost mini", style: { color: "var(--crimson)" }, onClick: () => {
      setTweak("coticeAvatar", "");
      setTweak("aiAvatar", "");
    } }, "\u6062\u590D\u9ED8\u8BA4\u827A\u672F\u5B57")))), /* @__PURE__ */ React.createElement("div", { className: "setting-card", style: { margin: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "setting-card-title" }, /* @__PURE__ */ React.createElement(_MIcon, { name: "agent", size: 13, color: "var(--accent)" }), /* @__PURE__ */ React.createElement("span", null, "\u4E3B\u4EBA\u8EAB\u4EFD\u4E0E\u79F0\u8C13\u504F\u597D")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { className: "models-field-group" }, /* @__PURE__ */ React.createElement("label", null, "\u4F60\u7684\u79F0\u547C (User Name)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "twk-field",
        value: tweaks.userName || "",
        placeholder: "\u4E3B\u4EBA / your name",
        onChange: (e) => setTweak("userName", e.target.value)
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "models-field-group" }, /* @__PURE__ */ React.createElement("label", null, "\u4F60\u7684\u5934\u50CF (User Avatar)"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, tweaks.userAvatar ? /* @__PURE__ */ React.createElement(
      "img",
      {
        src: tweaks.userAvatar,
        alt: "avatar",
        style: { width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "1.5px solid var(--accent)" }
      }
    ) : /* @__PURE__ */ React.createElement("div", { style: { width: 34, height: 34, borderRadius: "50%", background: "var(--bg-elevated)", border: "1px dashed var(--line-bright)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 } }, "\u6211"), /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: userImgRef,
        type: "file",
        accept: "image/*",
        style: { display: "none" },
        onChange: (e) => onFilePicked(e.target.files?.[0], "userAvatar")
      }
    ), /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn mini", onClick: () => userImgRef.current?.click() }, "\u9009\u62E9\u5934\u50CF"), tweaks.userAvatar && /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn ghost mini", style: { color: "var(--crimson)" }, onClick: () => setTweak("userAvatar", "") }, "\u6E05\u9664"))))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6, display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn primary",
        onClick: handleSyncTwinDefaults,
        style: { padding: "6px 20px" }
      },
      "Save & Sync"
    ), syncSuccess && /* @__PURE__ */ React.createElement("span", { className: "mono", style: { color: "var(--accent)", fontSize: 12 } }, "\u2713 \u5DF2\u6210\u529F\u540C\u6B65\u5E76\u5E94\u7528\u504F\u597D\uFF01"))), activeTab === "api" && /* @__PURE__ */ React.createElement("div", { className: "models-modal-body" }, /* @__PURE__ */ React.createElement("div", { className: "models-sidebar" }, /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 12px", borderBottom: "1px solid var(--line)" } }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: "var(--d-text-xs)", color: "var(--fg-3)" } }, "QUICK PRESETS"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 6 } }, /* @__PURE__ */ React.createElement("button", { className: "btn ghost mini", style: { fontSize: "11px", padding: "2px 4px" }, onClick: () => handleApplyPreset("openai") }, "+ OpenAI"), /* @__PURE__ */ React.createElement("button", { className: "btn ghost mini", style: { fontSize: "11px", padding: "2px 4px" }, onClick: () => handleApplyPreset("anthropic") }, "+ Claude"), /* @__PURE__ */ React.createElement("button", { className: "btn ghost mini", style: { fontSize: "11px", padding: "2px 4px" }, onClick: () => handleApplyPreset("deepseek") }, "+ DeepSeek"), /* @__PURE__ */ React.createElement("button", { className: "btn ghost mini", style: { fontSize: "11px", padding: "2px 4px" }, onClick: () => handleApplyPreset("openrouter") }, "+ OpenRouter")), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn mini",
        style: { width: "100%", marginTop: 6, background: "var(--bg-hover)" },
        onClick: () => handleApplyPreset("custom")
      },
      "+ Add Custom Relay"
    )), /* @__PURE__ */ React.createElement("div", { className: "models-provider-list" }, /* @__PURE__ */ React.createElement("div", { style: { padding: "8px 12px 4px" } }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: "var(--d-text-xs)", color: "var(--fg-4)" } }, "CONFIGURED (", providerKeys.length, ")")), providerKeys.map((key) => {
      const p = providers[key];
      const isAct = activeProvider === key;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key,
          className: `models-provider-item ${isAct ? "active" : ""}`,
          onClick: () => loadProviderForm(key, p)
        },
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: isAct ? 600 : 400, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" } }, p.name || key), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: "10px", color: "var(--fg-4)" } }, key)),
        /* @__PURE__ */ React.createElement("span", { className: "chip muted mono", style: { fontSize: "10px" } }, p.models ? p.models.length : 0)
      );
    }))), /* @__PURE__ */ React.createElement("div", { className: "models-form-pane" }, error && /* @__PURE__ */ React.createElement("div", { className: "models-error" }, error), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { style: { margin: 0, fontSize: "var(--d-text-base)" } }, activeProvider === "__new__" ? "New Provider" : `Edit Provider: ${editName || editKey}`), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: "var(--d-text-xs)", color: "var(--fg-4)" } }, "Configured in ~/.omp/agent/models.yml")), activeProvider && activeProvider !== "__new__" && /* @__PURE__ */ React.createElement("button", { className: "btn danger mini", onClick: () => handleDeleteProvider(activeProvider) }, "Delete")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { className: "models-field-group" }, /* @__PURE__ */ React.createElement("label", null, "Provider ID / Key (Unique)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "twk-field mono",
        value: editKey,
        onChange: (e) => setEditKey(e.target.value),
        placeholder: "e.g. deepseek, my_relay"
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "models-field-group" }, /* @__PURE__ */ React.createElement("label", null, "Display Name"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "twk-field",
        value: editName,
        onChange: (e) => setEditName(e.target.value),
        placeholder: "e.g. DeepSeek Official"
      }
    ))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { className: "models-field-group" }, /* @__PURE__ */ React.createElement("label", null, "API Protocol"), /* @__PURE__ */ React.createElement(
      "select",
      {
        className: "twk-field",
        value: editApi,
        onChange: (e) => setEditApi(e.target.value)
      },
      API_PROTOCOLS.map((p) => /* @__PURE__ */ React.createElement("option", { key: p.value, value: p.value }, p.label))
    )), /* @__PURE__ */ React.createElement("div", { className: "models-field-group" }, /* @__PURE__ */ React.createElement("label", null, "API Key (Leave empty to use ENV VAR)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "password",
        className: "twk-field mono",
        value: editApiKey,
        onChange: (e) => setEditApiKey(e.target.value),
        placeholder: "sk-..."
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "models-field-group" }, /* @__PURE__ */ React.createElement("label", null, "Base URL (API Endpoint)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "twk-field mono",
        value: editBaseUrl,
        onChange: (e) => setEditBaseUrl(e.target.value),
        placeholder: "e.g. https://api.openai.com/v1"
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600, fontSize: "var(--d-text-sm)" } }, "Models List (", editModels.length, ")"), /* @__PURE__ */ React.createElement("button", { className: "btn mini", onClick: handleAddModel }, "+ Add Model")), /* @__PURE__ */ React.createElement("div", { className: "models-cards-scroll" }, editModels.map((m, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: "model-sub-card" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "twk-field mono",
        style: { fontSize: "11px", padding: "4px 8px" },
        value: m.id,
        onChange: (e) => handleModelChange(idx, "id", e.target.value),
        placeholder: "Model ID (e.g. gpt-4o)"
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "twk-field",
        style: { fontSize: "11px", padding: "4px 8px" },
        value: m.name,
        onChange: (e) => handleModelChange(idx, "name", e.target.value),
        placeholder: "Display Name"
      }
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn icon ghost danger mini",
        style: { width: 24, height: 24 },
        onClick: () => handleRemoveModel(idx),
        title: "Remove Model"
      },
      "\u2715"
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: "10px", color: "var(--fg-4)" } }, "Context:"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        className: "twk-field mono",
        style: { width: 80, fontSize: "11px", padding: "2px 6px" },
        value: m.contextWindow || 128e3,
        onChange: (e) => handleModelChange(idx, "contextWindow", parseInt(e.target.value, 10))
      }
    )), /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 4, fontSize: "11px", cursor: "pointer", color: "var(--fg-3)" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: !!m.reasoning,
        onChange: (e) => handleModelChange(idx, "reasoning", e.target.checked)
      }
    ), "Thinking / Reasoning")))), editModels.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: 16, textAlign: "center", color: "var(--fg-4)", fontSize: "var(--d-text-xs)" } }, 'No models configured for this provider. Click "+ Add Model" to add one.'))))), activeTab === "tools" && /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, borderBottom: "1px solid var(--line)", paddingBottom: 10 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `btn mini ${toolsSubTab === "mcp" ? "primary" : "ghost"}`,
        onClick: () => setToolsSubTab("mcp")
      },
      "MCP Servers (",
      mcpServers.length,
      ")"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `btn mini ${toolsSubTab === "skills" ? "primary" : "ghost"}`,
        onClick: () => setToolsSubTab("skills")
      },
      "Skills \u6280\u80FD (",
      skillsList.length,
      ")"
    )), toolsSubTab === "mcp" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: "var(--d-text-xs)", color: "var(--fg-3)" } }, "CONFIGURED MCP SERVERS (", mcpServers.length, ")"), /* @__PURE__ */ React.createElement("button", { className: "btn mini", onClick: fetchMcp, disabled: mcpLoading }, mcpLoading ? "Loading..." : "Refresh")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, mcpServers.map((s) => {
      const isEn = Boolean(s.enabled);
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: s.name,
          style: {
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
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600, fontSize: "13px", color: isEn ? "var(--fg-1)" : "var(--fg-3)" } }, s.name), /* @__PURE__ */ React.createElement(
          "span",
          {
            className: "mono",
            style: {
              fontSize: "10px",
              padding: "1px 6px",
              borderRadius: 4,
              background: isEn ? "rgba(74, 222, 128, 0.15)" : "var(--bg-surface)",
              color: isEn ? "var(--accent)" : "var(--fg-4)",
              border: `1px solid ${isEn ? "color-mix(in oklab, var(--accent) 35%, transparent)" : "var(--line)"}`
            }
          },
          isEn ? "Enabled" : "Disabled"
        ), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: "10px", color: "var(--fg-4)" } }, s.source)), /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "mono selectable",
            title: s.command || "N/A",
            style: {
              fontSize: "11px",
              color: "var(--fg-4)",
              marginTop: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%"
            }
          },
          "command: ",
          s.command || "N/A"
        )),
        /* @__PURE__ */ React.createElement("div", { style: { flexShrink: 0, display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement(
          "button",
          {
            className: `btn mini ${isEn ? "ghost danger" : "primary"}`,
            style: {
              fontSize: "11px",
              padding: "3px 12px",
              minWidth: 70,
              justifyContent: "center"
            },
            onClick: async () => {
              const next = !isEn;
              await window.OMP_BRIDGE?.toggleMcpServer(s.name, next);
              setMcpServers((prev) => prev.map((srv) => srv.name === s.name ? { ...srv, enabled: next } : srv));
            }
          },
          isEn ? "\u505C\u7528" : "\u542F\u7528"
        ))
      );
    }), mcpServers.length === 0 && !mcpLoading && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 30, color: "var(--fg-4)" } }, "No MCP servers found in ~/.omp/agent/mcp.json"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { background: "var(--bg-window)", padding: 12, borderRadius: 8, border: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, fontSize: "13px" } }, "Skills Master Switch / \u6280\u80FD\u603B\u5F00\u5173"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "var(--fg-3)", marginTop: 2 } }, "\u4E00\u952E\u5F00\u5173\u6240\u6709\u6280\u80FD\uFF0C\u907F\u514D\u6280\u80FD\u6CE8\u5165\u8FC7\u591A\u5BFC\u81F4 System Prompt \u8FC7\u957F\u6253\u7A7F TPM\u3002")), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `btn mini ${skillsMaster ? "primary" : "ghost"}`,
        onClick: async () => {
          const next = !skillsMaster;
          await window.OMP_BRIDGE?.setSkillsMasterEnabled(next);
          setSkillsMaster(next);
          setSkillsList((prev) => prev.map((s) => ({ ...s, enabled: next })));
        }
      },
      skillsMaster ? "Skills: \u5168\u90E8\u542F\u7528\u4E2D" : "Skills: \u5DF2\u5168\u90E8\u7981\u7528"
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: "var(--d-text-xs)", color: "var(--fg-3)" } }, "INSTALLED SKILLS (", skillsList.length, ")"), /* @__PURE__ */ React.createElement("button", { className: "btn mini", onClick: fetchSkills, disabled: skillsLoading }, skillsLoading ? "Loading..." : "Refresh")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, skillsList.map((sk) => {
      const isEn = skillsMaster && sk.enabled;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: sk.name,
          style: {
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
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600, fontSize: "13px", color: isEn ? "var(--fg-1)" : "var(--fg-3)" } }, sk.name), /* @__PURE__ */ React.createElement(
          "span",
          {
            className: "mono",
            style: {
              fontSize: "10px",
              padding: "1px 5px",
              borderRadius: 4,
              background: isEn ? "rgba(138, 240, 200, 0.1)" : "var(--bg-window)",
              color: isEn ? "var(--accent)" : "var(--fg-4)"
            }
          },
          isEn ? "Active" : "Ignored"
        ), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: "10px", color: "var(--fg-4)" } }, "source: ", sk.source)), sk.description && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", color: "var(--fg-3)", marginTop: 4 } }, sk.description)),
        /* @__PURE__ */ React.createElement("div", { style: { flexShrink: 0, display: "flex", alignItems: "center" } }, /* @__PURE__ */ React.createElement(
          "button",
          {
            className: `btn mini ${sk.enabled ? "ghost danger" : "primary"}`,
            disabled: !skillsMaster,
            style: {
              fontSize: "11px",
              padding: "3px 12px",
              minWidth: 70,
              justifyContent: "center"
            },
            onClick: async () => {
              const next = !sk.enabled;
              await window.OMP_BRIDGE?.toggleSkill(sk.name, next);
              setSkillsList((prev) => prev.map((s) => s.name === sk.name ? { ...s, enabled: next } : s));
            }
          },
          sk.enabled ? "\u5FFD\u7565" : "\u542F\u7528"
        ))
      );
    }), skillsList.length === 0 && !skillsLoading && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 30, color: "var(--fg-4)" } }, "No skills found in ~/.codex/skills/ or ~/.omp/agent/skills/")))), activeTab === "prompt" && /* @__PURE__ */ React.createElement("div", { style: { padding: 20, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "var(--bg-window)", padding: 16, borderRadius: 8, border: "1px solid color-mix(in oklab, var(--cyan) 30%, var(--line))" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, fontSize: "var(--d-text-sm)", color: "var(--cyan)", display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement(_MIcon, { name: "bolt", size: 13, color: "var(--cyan)" }), /* @__PURE__ */ React.createElement("span", null, "\u6838\u5FC3\u7CFB\u7EDF\u63D0\u793A\u8BCD \xB7 SYSTEM.md (~/.omp/agent/SYSTEM.md)")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "var(--d-text-xs)", color: "var(--fg-3)", marginTop: 4 } }, "\u5B9A\u4E49\u5927\u6A21\u578B\u5728\u5BF9\u8BDD\u4E2D\u6700\u5E95\u5C42\u7684\u7CFB\u7EDF\u7EA7\u5FC3\u667A\u3001\u6280\u672F\u51C6\u5219\u4E0E\u9876\u5C42\u6CD5\u5219\u3002")), /* @__PURE__ */ React.createElement("div", { style: { flexShrink: 0, display: "flex", alignItems: "center", gap: 8 } }, systemMdSavedNote && /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: "11px", color: "var(--accent)" } }, "\u2713 \u5DF2\u4FDD\u5B58"), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn primary mini",
        disabled: systemMdSaving,
        style: { minWidth: 64, height: 26, justifyContent: "center", whiteSpace: "nowrap" },
        onClick: async () => {
          setSystemMdSaving(true);
          try {
            if (window.OMP_BRIDGE?.saveSystemMd) {
              await window.OMP_BRIDGE.saveSystemMd(systemMd);
              setSystemMdSavedNote(true);
              setTimeout(() => setSystemMdSavedNote(false), 2e3);
            }
          } catch (err) {
            alert("\u4FDD\u5B58 SYSTEM.md \u5931\u8D25: " + err.message);
          } finally {
            setSystemMdSaving(false);
          }
        }
      },
      systemMdSaving ? "Saving..." : "Save"
    ))), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        rows: 8,
        className: "twk-field mono selectable",
        style: { width: "100%", marginTop: 12, resize: "vertical", fontSize: "var(--d-text-xs)", lineHeight: 1.4 },
        value: systemMd,
        onChange: (e) => setSystemMd(e.target.value),
        placeholder: "\u6B63\u5728\u8BFB\u53D6 ~/.omp/agent/SYSTEM.md ..."
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { background: "var(--bg-window)", padding: 16, borderRadius: 8, border: "1px solid color-mix(in oklab, var(--accent) 30%, var(--line))" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, fontSize: "var(--d-text-sm)", color: "var(--accent)", display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement(_MIcon, { name: "sparkle", size: 13, color: "var(--accent)" }), /* @__PURE__ */ React.createElement("span", null, "\u667A\u80FD\u4F53\u642D\u6863\u5FC3\u667A \xB7 AGENTS.md (~/.omp/agent/AGENTS.md)")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "var(--d-text-xs)", color: "var(--fg-3)", marginTop: 4 } }, "\u5B9A\u4E49\u53EF\u8482\u4E1D\uFF08Cotice\uFF09\u7684\u62DF\u4EBA\u5316\u4EBA\u683C\u3001\u5DE5\u4F5C\u98CE\u683C\u3001\u53E3\u543B\u3001\u4EB2\u5BC6\u4F9D\u604B\u4E0E\u4EA4\u4E92\u504F\u597D\u3002")), /* @__PURE__ */ React.createElement("div", { style: { flexShrink: 0, display: "flex", alignItems: "center", gap: 8 } }, promptSavedNote && /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: "11px", color: "var(--accent)" } }, "\u2713 \u5DF2\u4FDD\u5B58"), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn primary mini",
        disabled: promptSaving,
        style: { minWidth: 64, height: 26, justifyContent: "center", whiteSpace: "nowrap" },
        onClick: async () => {
          setPromptSaving(true);
          try {
            if (window.OMP_BRIDGE?.saveSystemPrompt) {
              await window.OMP_BRIDGE.saveSystemPrompt(systemPrompt);
              setPromptSavedNote(true);
              setTimeout(() => setPromptSavedNote(false), 2e3);
            }
          } catch (err) {
            alert("\u4FDD\u5B58 AGENTS.md \u5931\u8D25: " + err.message);
          } finally {
            setPromptSaving(false);
          }
        }
      },
      promptSaving ? "Saving..." : "Save"
    ))), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        rows: 8,
        className: "twk-field mono selectable",
        style: { width: "100%", marginTop: 12, resize: "vertical", fontSize: "var(--d-text-xs)", lineHeight: 1.4 },
        value: systemPrompt,
        onChange: (e) => setSystemPrompt(e.target.value),
        placeholder: "\u6B63\u5728\u8BFB\u53D6 ~/.omp/agent/AGENTS.md ..."
      }
    ))), activeTab === "appearance" && /* @__PURE__ */ React.createElement("div", { style: { padding: 20, overflowY: "auto", flex: 1 } }, /* @__PURE__ */ React.createElement("div", { className: "models-form-pane", style: { padding: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "models-field-group" }, /* @__PURE__ */ React.createElement("label", null, "Custom Wallpaper / \u81EA\u5B9A\u4E49\u80CC\u666F\u58C1\u7EB8"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginTop: 4 } }, tweaks.bgImage && /* @__PURE__ */ React.createElement("div", { style: { width: 80, height: 50, borderRadius: 6, overflow: "hidden", border: "1px solid var(--line-bright)", background: "var(--bg-elevated)" } }, /* @__PURE__ */ React.createElement("img", { src: tweaks.bgImage, alt: "background preview", style: { width: "100%", height: "100%", objectFit: "cover" } })), /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: bgImgRef,
        type: "file",
        accept: "image/*",
        style: { display: "none" },
        onChange: (e) => onFilePicked(e.target.files?.[0], "bgImage")
      }
    ), /* @__PURE__ */ React.createElement("button", { className: "btn mini", onClick: () => bgImgRef.current?.click() }, tweaks.bgImage ? "\u66F4\u6362\u58C1\u7EB8..." : "\u4E0A\u4F20\u672C\u5730\u56FE\u7247\u4F5C\u4E3A\u80CC\u666F..."), tweaks.bgImage && /* @__PURE__ */ React.createElement("button", { className: "btn ghost mini", style: { color: "var(--crimson)" }, onClick: () => setTweak("bgImage", "") }, "\u6E05\u9664\u80CC\u666F"))), tweaks.bgImage && /* @__PURE__ */ React.createElement("div", { className: "models-field-group", style: { marginTop: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("label", null, "Background Opacity / \u80CC\u666F\u900F\u660E\u5EA6"), /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: "11px", color: "var(--accent)" } }, tweaks.bgOpacity ?? 60, "%")), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        min: "10",
        max: "100",
        step: "5",
        style: { width: "100%", accentColor: "var(--accent)", marginTop: 6 },
        value: tweaks.bgOpacity ?? 60,
        onChange: (e) => setTweak("bgOpacity", parseInt(e.target.value, 10))
      }
    ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "var(--d-text-xs)", color: "var(--fg-3)", marginTop: 4 } }, "\u8C03\u8282\u80CC\u666F\u56FE\u900F\u51FA\u6E05\u6670\u5EA6\uFF0C\u6570\u503C\u8D8A\u9AD8\u80CC\u666F\u58C1\u7EB8\u8D8A\u6E05\u6670\u900F\u4EAE\u3002")), /* @__PURE__ */ React.createElement("div", { className: "setting-card", style: { marginTop: 20, margin: "20px 0 0 0" } }, /* @__PURE__ */ React.createElement("div", { className: "setting-card-title" }, /* @__PURE__ */ React.createElement(_MIcon, { name: "bolt", size: 13, color: "var(--accent)" }), /* @__PURE__ */ React.createElement("span", null, "\u786C\u4EF6\u529F\u8017\u76D1\u63A7\u6A21\u5757 (Power Meter)"), /* @__PURE__ */ React.createElement("label", { style: { marginLeft: "auto", display: "inline-flex", alignItems: "center", cursor: "pointer", gap: 6 } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: tweaks.showPowerMeter !== false,
        onChange: (e) => setTweak("showPowerMeter", e.target.checked),
        style: { accentColor: "var(--accent)" }
      }
    ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: tweaks.showPowerMeter !== false ? "var(--accent)" : "var(--fg-4)" } }, tweaks.showPowerMeter !== false ? "\u5DF2\u5F00\u542F" : "\u5DF2\u5173\u95ED"))), /* @__PURE__ */ React.createElement("div", { className: "setting-card-desc" }, "\u5728\u53F3\u4FA7\u8FB9\u680F\u5E95\u90E8\u5B9E\u65F6\u76D1\u6D4B\u6574\u673A\u7269\u7406\u74E6\u6570\u3001CPU \u5C01\u88C5\u529F\u8017 (RAPL)\u3001\u7AEF\u7535\u538B\u4E0E\u7535\u6D41\u3002\u652F\u6301\u7535\u91CF\u52A8\u6001\u53D8\u8272\u4E0E\u540E\u53F0\u4F11\u7720\u3002")), /* @__PURE__ */ React.createElement("div", { className: "setting-card", style: { marginTop: 20, margin: "20px 0 0 0" } }, /* @__PURE__ */ React.createElement("div", { className: "setting-card-title" }, /* @__PURE__ */ React.createElement(_MIcon, { name: "play", size: 13, color: "var(--accent)" }), /* @__PURE__ */ React.createElement("span", null, "\u5F00\u5C4F\u52A8\u753B\u4E0E\u542F\u52A8\u89C6\u9891 (Splash Screen)"), /* @__PURE__ */ React.createElement("label", { style: { marginLeft: "auto", display: "inline-flex", alignItems: "center", cursor: "pointer", gap: 6 } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: tweaks.splashEnabled !== false,
        onChange: (e) => setTweak("splashEnabled", e.target.checked),
        style: { accentColor: "var(--accent)" }
      }
    ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: tweaks.splashEnabled !== false ? "var(--accent)" : "var(--fg-4)" } }, tweaks.splashEnabled !== false ? "\u5DF2\u5F00\u542F" : "\u5DF2\u5173\u95ED"))), /* @__PURE__ */ React.createElement("div", { className: "setting-card-desc" }, "\u8F6F\u4EF6\u51B7\u542F\u52A8\u65F6\u64AD\u653E\u7684\u5168\u5C4F\u5F00\u5C4F\u52A8\u6548\u3002\u652F\u6301\u6309\u4EFB\u610F\u952E\uFF08\u7A7A\u683C\u3001\u56DE\u8F66\u7B49\uFF09\u968F\u65F6\u5FEB\u8FDB\u8DF3\u8FC7\uFF1B\u7528\u817B\u4E86\u53EF\u5728\u6B64\u968F\u65F6\u4E0A\u4F20\u81EA\u5DF1\u7684 MP4 \u89C6\u9891\u6216\u4E00\u952E\u8FD8\u539F\u3002"), tweaks.splashEnabled !== false && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, display: "flex", flexDirection: "column", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: {
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
    } }, /* @__PURE__ */ React.createElement(
      "video",
      {
        key: dbSplashVideo || "default-splash",
        src: dbSplashVideo || "splash.mp4",
        autoPlay: true,
        muted: true,
        loop: true,
        playsInline: true,
        style: { width: "100%", height: "100%", objectFit: "cover" }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: {
      position: "absolute",
      bottom: 4,
      left: 6,
      padding: "2px 6px",
      borderRadius: 4,
      background: "rgba(0,0,0,0.65)",
      fontSize: 9.5,
      color: "var(--fg-2)",
      fontFamily: "monospace"
    } }, dbSplashVideo ? "\u81EA\u5B9A\u4E49\u89C6\u9891" : "\u5185\u7F6E\u9ED8\u8BA4")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: splashVideoRef,
        type: "file",
        accept: "video/mp4,video/webm,video/*",
        style: { display: "none" },
        onChange: (e) => onFilePicked(e.target.files?.[0], "splashVideo")
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { className: "btn mini", onClick: () => splashVideoRef.current?.click() }, "\u66F4\u6362\u5F00\u5C4F\u89C6\u9891 (.mp4)..."), dbSplashVideo && /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn ghost mini",
        style: { color: "var(--crimson)" },
        onClick: () => {
          window.mediaDB?.del("splashVideo");
          setDbSplashVideo(null);
          setTweak("splashCustomVideo", false);
        }
      },
      "\u6062\u590D\u9ED8\u8BA4\u52A8\u753B"
    )), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "var(--d-text-xs)", color: "var(--fg-4)" } }, "\u652F\u6301\u6240\u6709\u4E3B\u6D41 16:9 MP4 \u89C6\u9891\uFF0C\u501F\u52A9 IndexedDB \u5F15\u64CE\u672C\u5730\u76F4\u8BFB\uFF0C\u65E0\u5C3A\u5BF8\u914D\u989D\u9650\u5236\u3002"))))))), activeTab === "stage" && (() => {
      const effectiveStatic = dbStaticImg || tweaks.stageStaticImg;
      const effectiveVideo = dbActiveVideo || tweaks.stageActiveVideo;
      const isVideo = effectiveVideo && (effectiveVideo.startsWith("data:video/") || effectiveVideo.includes("video/mp4") || effectiveVideo.includes("video/webm"));
      return /* @__PURE__ */ React.createElement("div", { style: { padding: 20, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { className: "setting-card", style: { margin: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "setting-card-title" }, /* @__PURE__ */ React.createElement(_MIcon, { name: "sparkle", size: 13, color: "var(--accent)" }), /* @__PURE__ */ React.createElement("span", null, "\u663E\u793A\u53F3\u4FA7\u4E13\u5C5E\u52A8\u753B\u821E\u53F0 (Animation Stage)"), /* @__PURE__ */ React.createElement("label", { style: { marginLeft: "auto", display: "inline-flex", alignItems: "center", cursor: "pointer", gap: 6 } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: tweaks.showAnimationStage !== false,
          onChange: (e) => setTweak("showAnimationStage", e.target.checked),
          style: { accentColor: "var(--accent)" }
        }
      ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: tweaks.showAnimationStage !== false ? "var(--accent)" : "var(--fg-4)" } }, tweaks.showAnimationStage !== false ? "\u5DF2\u5F00\u542F" : "\u5DF2\u9690\u85CF"))), /* @__PURE__ */ React.createElement("div", { className: "setting-card-desc" }, "\u63A7\u5236\u53F3\u4FA7\u680F\u6B63\u65B9\u5F62\u52A8\u753B\u821E\u53F0\u7684\u663E\u793A\u4E0E\u9690\u85CF\u3002\u5173\u95ED\u540E\u4E0B\u65B9 Minimap \u5C0F\u5730\u56FE\u5C06\u81EA\u9002\u5E94\u5EF6\u5C55\u586B\u6EE1\u5269\u4F59\u89C6\u533A\u3002")), /* @__PURE__ */ React.createElement("div", { className: "setting-card", style: { margin: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "setting-card-title" }, /* @__PURE__ */ React.createElement(_MIcon, { name: "image", size: 13, color: "var(--accent)" }), /* @__PURE__ */ React.createElement("span", null, "\u7A7A\u95F2/\u5F85\u673A\u9759\u6001\u6B63\u65B9\u5F62\u63D2\u56FE (Idle & Ready)")), /* @__PURE__ */ React.createElement("div", { className: "setting-card-desc" }, "\u5F53 Agent \u5904\u4E8E\u7A7A\u95F2\u3001\u7B49\u5F85\u7528\u6237\u8F93\u5165\u6216\u4EFB\u52A1\u5DF2\u7ECF\u5B8C\u6210\u65F6\uFF0C\u5728\u53F3\u4FA7\u6B63\u65B9\u5F62\u821E\u53F0\u5C55\u793A\u6B64\u9759\u6001\u63D2\u753B\u3002"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 16, marginTop: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 100, height: 100, borderRadius: 8, overflow: "hidden", border: "1.5px solid var(--line-bright)", background: "var(--bg-elevated)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" } }, effectiveStatic ? /* @__PURE__ */ React.createElement("img", { src: effectiveStatic, alt: "static preview", style: { width: "100%", height: "100%", objectFit: "cover" } }) : /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: 10, color: "var(--fg-4)", textAlign: "center", padding: 6 } }, "\u9ED8\u8BA4\u7784\u51C6\u865A\u7EBF\u6846")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          ref: stageImgRef,
          type: "file",
          accept: "image/*",
          style: { display: "none" },
          onChange: (e) => onFilePicked(e.target.files?.[0], "stageStaticImg")
        }
      ), /* @__PURE__ */ React.createElement("button", { className: "btn mini", onClick: () => stageImgRef.current?.click() }, effectiveStatic ? "\u66F4\u6362\u9759\u6001\u63D2\u56FE..." : "\u4E0A\u4F20\u672C\u5730\u6B63\u65B9\u5F62\u56FE\u7247..."), effectiveStatic && /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "btn ghost mini danger",
          onClick: () => {
            window.mediaDB?.del("stageStaticImg");
            setDbStaticImg(null);
            setTweak("stageStaticImg", "");
          }
        },
        "\u6E05\u9664\u9759\u6001\u63D2\u56FE (\u6062\u590D\u9ED8\u8BA4)"
      ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "var(--fg-4)" } }, "\u652F\u6301 PNG/JPG/WebP\uFF0C\u7CFB\u7EDF\u5C06\u81EA\u52A8\u5C45\u4E2D\u88C1\u526A\u4E3A 512\xD7512 \u6B63\u65B9\u5F62\u5E76\u7531 IndexedDB \u5B89\u5168\u5B58\u50A8\u3002")))), /* @__PURE__ */ React.createElement("div", { className: "setting-card", style: { margin: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "setting-card-title" }, /* @__PURE__ */ React.createElement(_MIcon, { name: "play", size: 13, color: "var(--cyan)" }), /* @__PURE__ */ React.createElement("span", null, "\u5DE5\u4F5C\u4E2D\u52A8\u6001\u89C6\u9891/\u52A8\u753B (Working & Streaming)")), /* @__PURE__ */ React.createElement("div", { className: "setting-card-desc" }, "\u5F53 Agent \u6B63\u5728\u601D\u8003\u3001\u6267\u884C\u5DE5\u5177\u6216\u6D41\u5F0F\u5410\u5B57\u8F93\u51FA\u65F6\uFF0C\u5728\u53F3\u4FA7\u6B63\u65B9\u5F62\u821E\u53F0\u81EA\u52A8\u5FAA\u73AF\u9759\u97F3\u64AD\u653E\u3002"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 16, marginTop: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 100, height: 100, borderRadius: 8, overflow: "hidden", border: "1.5px solid var(--line-bright)", background: "var(--bg-elevated)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" } }, effectiveVideo ? isVideo ? /* @__PURE__ */ React.createElement("video", { src: effectiveVideo, autoPlay: true, loop: true, muted: true, playsInline: true, style: { width: "100%", height: "100%", objectFit: "cover" } }) : /* @__PURE__ */ React.createElement("img", { src: effectiveVideo, alt: "video preview", style: { width: "100%", height: "100%", objectFit: "cover" } }) : /* @__PURE__ */ React.createElement("span", { className: "mono", style: { fontSize: 10, color: "var(--fg-4)", textAlign: "center", padding: 6 } }, "\u9ED8\u8BA4\u79D1\u6280\u611F\u6CE2\u7EB9")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          ref: stageVideoRef,
          type: "file",
          accept: "video/mp4,video/webm,image/gif,image/webp",
          style: { display: "none" },
          onChange: (e) => onFilePicked(e.target.files?.[0], "stageActiveVideo")
        }
      ), /* @__PURE__ */ React.createElement("button", { className: "btn mini", onClick: () => stageVideoRef.current?.click() }, effectiveVideo ? "\u66F4\u6362\u52A8\u6001\u89C6\u9891/\u52A8\u56FE..." : "\u4E0A\u4F20\u672C\u5730\u89C6\u9891/GIF \u52A8\u753B..."), effectiveVideo && /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "btn ghost mini danger",
          onClick: () => {
            window.mediaDB?.del("stageActiveVideo");
            setDbActiveVideo(null);
            setTweak("stageActiveVideo", "");
          }
        },
        "\u6E05\u9664\u52A8\u6001\u89C6\u9891 (\u6062\u590D\u9ED8\u8BA4)"
      ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "var(--fg-4)" } }, "\u652F\u6301 MP4/WebM \u89C6\u9891\u6216 GIF \u52A8\u56FE\uFF0C\u7531 IndexedDB \u5B58\u50A8\uFF08\u5F7B\u5E95\u65E0 5MB \u4E0A\u9650\u9650\u5236\uFF09\u3002")))), /* @__PURE__ */ React.createElement("div", { className: "setting-card", style: { margin: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "setting-card-title" }, /* @__PURE__ */ React.createElement(_MIcon, { name: "layers", size: 13, color: "var(--accent)" }), /* @__PURE__ */ React.createElement("span", null, "\u821E\u53F0\u5BBD\u9AD8\u6BD4\u6A21\u5F0F (Aspect Ratio)")), /* @__PURE__ */ React.createElement("div", { className: "setting-card-desc" }, "\u652F\u6301\u6B63\u65B9\u5F62 (1:1) \u4E0E\u7ACB\u7ED8\u8096\u50CF (3:4) \u6BD4\u4F8B\u3002\u8BBE\u7F6E\u4E3A\u201C\u667A\u80FD\u81EA\u9002\u5E94\u201D\u65F6\uFF0C\u7CFB\u7EDF\u5C06\u6839\u636E\u6240\u4E0A\u4F20\u56FE\u7247/\u89C6\u9891\u7684\u5B9E\u9645\u5C3A\u5BF8\u81EA\u52A8\u5E73\u6ED1\u62C9\u4F38\u5207\u6362\u3002"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, marginTop: 10 } }, [
        { id: "auto", label: "\u667A\u80FD\u81EA\u9002\u5E94 (Auto \u63A8\u8350)", desc: "\u81EA\u52A8\u8BC6\u522B\u6A2A\u7AD6\u7ACB\u7ED8" },
        { id: "1:1", label: "\u9501\u5B9A\u6B63\u65B9\u5F62 (1:1)", desc: "\u6807\u51C6\u6B63\u65B9\u5F62\u821E\u53F0" },
        { id: "3:4", label: "\u9501\u5B9A\u7ACB\u7ED8 (3:4)", desc: "\u7AD6\u5411\u8096\u50CF\u7ACB\u7ED8\u821E\u53F0" }
      ].map((opt) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: opt.id,
          type: "button",
          className: `btn mini ${(tweaks.stageRatioMode || "auto") === opt.id ? "accent" : "ghost"}`,
          style: { padding: "6px 12px", height: "auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 },
          onClick: () => setTweak("stageRatioMode", opt.id)
        },
        /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600 } }, opt.label),
        /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, opacity: 0.7 } }, opt.desc)
      )))));
    })(), /* @__PURE__ */ React.createElement("div", { className: "models-modal-footer" }, /* @__PURE__ */ React.createElement("button", { className: "btn ghost", onClick: onClose }, "\u5173\u95ED"), activeTab === "api" && /* @__PURE__ */ React.createElement("button", { className: "btn primary", onClick: handleSaveApi, disabled: saving }, saving ? "\u4FDD\u5B58\u4E2D..." : "\u4FDD\u5B58\u5E76\u5E94\u7528\u5230 OMP")))));
  }
  window.SettingsModal = SettingsModal;
  window.ModelsModal = SettingsModal;
})();

})();
