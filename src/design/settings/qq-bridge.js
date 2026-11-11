/* design/settings/qq-bridge.js — VoceChat Universal Hub Middleware & Realtime Event Stream
   Universal open architecture: Supports any user login, any server URL, zero hardcoded presets,
   and receives messages from all users without low-level blocking.
   Includes FIFO Queue Worker, 1s-60s debounce, 10s-300s hard deadline, and syntax sniffer. */

(function () {
  const STORAGE_KEY_CONFIG = "vocechat_universal_config_v1";
  const STORAGE_KEY_HISTORY = "vocechat_universal_history_v1";
  const MAX_HISTORY = 500;

  // Helper to normalize any user-entered server URL
  function normalizeUrl(rawUrl) {
    let url = (rawUrl || "").trim().replace(/\/+$/, "");
    if (!url) return "";
    if (!/^https?:\/\//i.test(url)) {
      if (/^(127\.0\.0\.1|localhost|192\.168\.|10\.|172\.)/i.test(url)) {
        url = "http://" + url;
      } else {
        url = "https://" + url;
      }
    }
    return url;
  }

  // Generic State Defaults (No hardcoded credentials or accounts)
  const state = {
    // Connection & Auth
    serverUrl: "",
    email: "",
    password: "",
    token: null,
    isConnected: false,
    isReconnecting: false,
    lastConnectedAt: null,
    connectError: null,

    // Identity (Dynamically resolved from server upon login)
    selfUid: null,
    selfNick: "",
    lastSenderUid: null,
    lastSenderNick: "",

    // Middleware settings
    autoInjectSession: true,      // 自动注入当前活跃会话并触发回车执行
    middlewareEnabled: true,      // 启用滑动窗口防抖
    debounceMs: 1500,             // 每收到一条消息暂停 (1-60秒可调，默认 1.5s)
    maxWaitMs: 10000,             // 最大打包等待时间 (10-300秒可调，默认 10s)
    syntaxSnifferEnabled: true,   // 遇到句末终结符 。？！?!～~… 立即提前收网打包
    highWatermarkSyncEnabled: true,

    // State machine: "IDLE" | "ACCUMULATING" | "BUSY"
    hubState: "IDLE",
    pendingCount: 0,
    pendingSessionCount: 0,

    // Data streams
    historyEvents: [], // Array<UniversalEventRecord>
    activeFilter: "all", // "all" | "private" | "group"
    lastSyncedMsgId: 0,
  };

  // Dynamic entity registries populated from SSE events
  const usersMap = new Map();   // uid -> name
  const groupsMap = new Map();  // gid -> name

  const listeners = new Set();
  function notify() {
    const snapshot = {
      ...state,
      historyEvents: [...state.historyEvents],
    };
    for (const cb of listeners) {
      try {
        cb(snapshot);
      } catch (err) {
        console.error("[vocechat-bridge] listener error:", err);
      }
    }
  }

  // Load persisted config & history from localStorage
  function loadPersisted() {
    try {
      const savedConfig = window.localStorage.getItem(STORAGE_KEY_CONFIG);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (typeof parsed.serverUrl === "string") state.serverUrl = normalizeUrl(parsed.serverUrl);
        if (typeof parsed.email === "string") state.email = parsed.email;
        if (typeof parsed.password === "string") state.password = parsed.password;
        if (typeof parsed.selfUid === "number") state.selfUid = parsed.selfUid;
        if (typeof parsed.selfNick === "string") state.selfNick = parsed.selfNick;
        if (typeof parsed.autoInjectSession === "boolean") state.autoInjectSession = parsed.autoInjectSession;
        if (typeof parsed.middlewareEnabled === "boolean") state.middlewareEnabled = parsed.middlewareEnabled;
        if (typeof parsed.debounceMs === "number") state.debounceMs = parsed.debounceMs;
        if (typeof parsed.maxWaitMs === "number") state.maxWaitMs = parsed.maxWaitMs;
        if (typeof parsed.syntaxSnifferEnabled === "boolean") state.syntaxSnifferEnabled = parsed.syntaxSnifferEnabled;
        if (typeof parsed.highWatermarkSyncEnabled === "boolean") state.highWatermarkSyncEnabled = parsed.highWatermarkSyncEnabled;
      }
      const savedHist = window.localStorage.getItem(STORAGE_KEY_HISTORY);
      if (savedHist) {
        const hist = JSON.parse(savedHist);
        if (Array.isArray(hist)) {
          state.historyEvents = hist.slice(-MAX_HISTORY);
          if (state.historyEvents.length > 0) {
            const maxId = Math.max(...state.historyEvents.map((e) => e.messageId || 0));
            if (maxId > 0) state.lastSyncedMsgId = maxId;
          }
        }
      }
    } catch (e) {
      console.warn("[vocechat-bridge] failed to load persisted config:", e);
    }
  }

  function savePersisted() {
    try {
      const toSaveConfig = {
        serverUrl: normalizeUrl(state.serverUrl),
        email: state.email,
        password: state.password,
        selfUid: state.selfUid,
        selfNick: state.selfNick,
        autoInjectSession: state.autoInjectSession,
        middlewareEnabled: state.middlewareEnabled,
        debounceMs: state.debounceMs,
        maxWaitMs: state.maxWaitMs,
        syntaxSnifferEnabled: state.syntaxSnifferEnabled,
        highWatermarkSyncEnabled: state.highWatermarkSyncEnabled,
      };
      window.localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(toSaveConfig));
      window.localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(state.historyEvents.slice(-200)));
    } catch (e) {
      console.warn("[vocechat-bridge] failed to save persisted state:", e);
    }
  }

  // --- Auth & Session ---
  async function ensureAuthToken() {
    if (state.token) return state.token;
    const cleanUrl = normalizeUrl(state.serverUrl);
    if (!cleanUrl || !state.email || !state.password) {
      state.connectError = "请完整填写服务器地址、邮箱和密码";
      notify();
      return null;
    }

    try {
      const resp = await fetch(`${cleanUrl}/api/token/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: {
            type: "password",
            email: state.email.trim(),
            password: state.password.trim(),
          },
          device: "universal_omp_agent",
        }),
      });

      if (!resp.ok) {
        let errDesc = `HTTP ${resp.status}`;
        if (resp.status === 401 || resp.status === 400) {
          errDesc = "账号或密码错误 (请核对邮箱与大小写)";
        } else if (resp.status === 403) {
          errDesc = "访问被拒绝 (403 Forbidden，请核对透传反代配置或证书)";
        } else if (resp.status === 404) {
          errDesc = "未找到登录服务 (404 Not Found)，请确认服务器地址是否正确";
        }
        try {
          const errData = await resp.json();
          if (errData.message) errDesc += `: ${errData.message}`;
        } catch (_) {}
        throw new Error(errDesc);
      }

      const data = await resp.json();
      state.token = data.token;
      if (data.user) {
        state.selfUid = data.user.uid;
        state.selfNick = data.user.name || `用户 #${data.user.uid}`;
        usersMap.set(Number(data.user.uid), state.selfNick);
      }
      state.connectError = null;
      savePersisted();
      notify();
      return state.token;
    } catch (e) {
      console.error("[vocechat-bridge] login failed:", e);
      let userMsg = e.message;
      if (e.message.includes("Failed to fetch") || e.name === "TypeError") {
        userMsg = `无法连接至服务器 (${cleanUrl})，请检查网络连通性或域名证书`;
      }
      state.connectError = `登录失败: ${userMsg}`;
      state.token = null;
      notify();
      return null;
    }
  }

  // --- Event Stream (SSE) & Auto Reconnection ---
  let eventSource = null;
  let reconnectTimer = null;
  let streamReady = false;
  let connectStartTime = 0;

  async function connectStream() {
    if (eventSource) {
      try {
        eventSource.close();
      } catch (e) {}
      eventSource = null;
    }

    const cleanUrl = normalizeUrl(state.serverUrl);
    if (!cleanUrl || !state.email || !state.password) {
      state.isConnected = false;
      state.isReconnecting = false;
      state.connectError = "请在下方配置服务器地址、邮箱和密码并点击保存";
      notify();
      return;
    }

    state.isReconnecting = true;
    notify();

    const token = await ensureAuthToken();
    if (!token) {
      state.isConnected = false;
      state.isReconnecting = false;
      notify();
      return;
    }

    state.isConnected = true;
    state.isReconnecting = false;
    state.connectError = null;
    state.lastConnectedAt = Date.now();
    connectStartTime = Date.now();
    streamReady = false;
    notify();

    if (state.highWatermarkSyncEnabled) {
      syncHighWatermarkHistory();
    }

    try {
      const streamUrl = `${cleanUrl}/api/user/events?api-key=${token}`;
      eventSource = new EventSource(streamUrl);

      eventSource.onopen = () => {
        state.isConnected = true;
        state.isReconnecting = false;
        state.connectError = null;
        connectStartTime = Date.now();
        console.log("[vocechat-bridge] SSE stream connected to", cleanUrl);
        notify();
      };

      eventSource.onmessage = (event) => {
        try {
          if (!event.data) return;
          const rawObj = JSON.parse(event.data);
          handleIncomingEvent(rawObj);
        } catch (err) {
          console.error("[vocechat-bridge] error parsing event data:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.warn("[vocechat-bridge] SSE stream status change / error:", err);
        if (eventSource && eventSource.readyState === EventSource.CLOSED) {
          state.connectError = "SSE 链路已断开，准备重连...";
          streamReady = false;
          notify();
          scheduleReconnect();
        } else if (eventSource && eventSource.readyState === EventSource.CONNECTING) {
          state.isReconnecting = true;
          notify();
        }
      };
    } catch (e) {
      state.isConnected = false;
      state.connectError = e.message;
      streamReady = false;
      notify();
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    state.isReconnecting = true;
    notify();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connectStream();
    }, 4000);
  }

  // --- High-Watermark Sync ---
  async function syncHighWatermarkHistory() {
    const token = await ensureAuthToken();
    if (!token) return;

    try {
      const cleanUrl = normalizeUrl(state.serverUrl);
      const groupResp = await fetch(`${cleanUrl}/api/group`, {
        headers: { "X-API-Key": token },
      });
      if (groupResp.ok) {
        const groups = await groupResp.json();
        if (Array.isArray(groups)) {
          for (const g of groups) {
            groupsMap.set(Number(g.gid), g.name || `群组 #${g.gid}`);
            try {
              const hResp = await fetch(`${cleanUrl}/api/group/${g.gid}/history`, {
                headers: { "X-API-Key": token },
              });
              if (hResp.ok) {
                const msgs = await hResp.json();
                if (Array.isArray(msgs)) {
                  for (const m of msgs) recordNormalizedMessage(m, "group");
                }
              }
            } catch (_) {}
          }
        }
      }

      state.historyEvents.sort((a, b) => a.timestamp - b.timestamp);
      if (state.historyEvents.length > MAX_HISTORY) {
        state.historyEvents = state.historyEvents.slice(-MAX_HISTORY);
      }
      savePersisted();
      notify();
    } catch (err) {
      console.warn("[vocechat-bridge] sync history failed:", err);
    }
  }

  function recordNormalizedMessage(msg, category) {
    const mid = msg.mid;
    if (!mid || state.historyEvents.some((ev) => ev.messageId === mid)) return;

    const fromUid = Number(msg.from_uid || msg.from || 0);
    const isSelf = state.selfUid !== null && fromUid === Number(state.selfUid);
    const senderNick = usersMap.get(fromUid) || (isSelf ? state.selfNick : `用户 #${fromUid}`);

    const content = typeof msg.detail?.content === "string" ? msg.detail.content : JSON.stringify(msg.detail || "");
    const record = {
      id: "event_" + mid + "_" + Date.now(),
      messageId: mid,
      timestamp: msg.created_at || Date.now(),
      timeStr: new Date(msg.created_at || Date.now()).toLocaleTimeString(),
      category: category, // "private" | "group"
      userId: fromUid,
      senderNick: senderNick,
      isSelfSent: isSelf,
      cleanText: content,
      images: [],
      rawEvent: msg,
    };
    state.historyEvents.push(record);
  }

  // --- 核心消息接收：不加底层阻拦，所有人的消息全部接收 ---
  function handleIncomingEvent(raw) {
    const type = raw.type;

    if (type === "users_snapshot" && Array.isArray(raw.users)) {
      raw.users.forEach((u) => {
        usersMap.set(Number(u.uid), u.name || `用户 #${u.uid}`);
      });
      return;
    }

    if (type === "related_groups" && Array.isArray(raw.groups)) {
      raw.groups.forEach((g) => {
        groupsMap.set(Number(g.gid), g.name || `群组 #${g.gid}`);
      });
      return;
    }

    if (type === "ready") {
      streamReady = true;
      console.log("[vocechat-bridge] SSE stream ready for live messages!");
      return;
    }

    if (type === "chat" || type === "message" || raw.detail?.content) {
      const fromUid = Number(raw.from_uid || raw.from || 0);
      const targetGid = raw.target_gid || raw.gid || raw.target?.gid;
      const category = targetGid ? "group" : "private";
      recordNormalizedMessage(raw, category);

      state.historyEvents.sort((a, b) => a.timestamp - b.timestamp);
      if (state.historyEvents.length > MAX_HISTORY) {
        state.historyEvents = state.historyEvents.slice(-MAX_HISTORY);
      }
      savePersisted();
      notify();

      const isLive = streamReady || (raw.created_at && raw.created_at >= connectStartTime - 1000);
      const isSelf = state.selfUid !== null && fromUid === Number(state.selfUid);

      if (state.middlewareEnabled && !isSelf && isLive) {
        const senderNick = usersMap.get(fromUid) || `用户 #${fromUid}`;
        const groupName = targetGid ? (groupsMap.get(Number(targetGid)) || `群组 #${targetGid}`) : null;
        state.lastSenderUid = fromUid;
        state.lastSenderNick = senderNick;

        accumulateIncomingMessage({
          messageId: raw.mid,
          cleanText: typeof raw.detail?.content === "string" ? raw.detail.content : "",
          fromUid: fromUid,
          senderNick: senderNick,
          category: category,
          targetGid: targetGid,
          groupName: groupName,
          timestamp: raw.created_at || Date.now(),
          timeStr: new Date(raw.created_at || Date.now()).toLocaleTimeString(),
        });
      }
    }
  }

  // --- 动态滑动窗口防抖 ---
  let debounceTimeout = null;
  let burstDeadlineTimeout = null;
  let burstAccumulator = [];

  function accumulateIncomingMessage(record) {
    burstAccumulator.push(record);
    state.hubState = "ACCUMULATING";
    state.pendingCount = burstAccumulator.length;
    notify();

    const txt = (record.cleanText || "").trim();
    const hasSyntaxTerminator = state.syntaxSnifferEnabled && /[。！？!?～~…]+[\s]*$/.test(txt);
    if (hasSyntaxTerminator) {
      console.log("[vocechat-bridge] 句末终结符命中，提前收网打包!");
      finalizeBurst();
      return;
    }

    if (!burstDeadlineTimeout) {
      const maxWait = Math.max(3000, state.maxWaitMs || 10000);
      burstDeadlineTimeout = setTimeout(() => {
        console.log(`[vocechat-bridge] 达到最大等待窗口 (${maxWait}ms)，强制收网打包!`);
        finalizeBurst();
      }, maxWait);
    }

    clearTimeout(debounceTimeout);
    const debounceDelay = Math.max(500, state.debounceMs || 1500);
    debounceTimeout = setTimeout(() => {
      console.log(`[vocechat-bridge] 单条滑动静默期结束 (${debounceDelay}ms)，收网打包!`);
      finalizeBurst();
    }, debounceDelay);
  }

  // --- 🌸 工业级 FIFO 待注入消息持久化队列 (Pending Queue Worker) ---
  let pendingSessionQueue = [];
  let queueWorkerInterval = null;

  function enqueueBurstForSession(mergedText, messages) {
    if (!mergedText || !mergedText.trim()) return;

    const queueItem = {
      id: "queue_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      mergedText: mergedText.trim(),
      messages: Array.isArray(messages) ? messages : [],
      createdAt: Date.now(),
    };

    pendingSessionQueue.push(queueItem);
    state.pendingSessionCount = pendingSessionQueue.length;
    console.log(`[vocechat-bridge] 消息已进入待执行安全队列 (当前排队: ${pendingSessionQueue.length} 批)`);
    notify();

    scheduleQueueDrain();
  }

  function scheduleQueueDrain() {
    if (queueWorkerInterval) return;
    queueWorkerInterval = setInterval(() => {
      drainSessionQueue();
    }, 1000);
  }

  function drainSessionQueue() {
    if (pendingSessionQueue.length === 0) {
      if (queueWorkerInterval) {
        clearInterval(queueWorkerInterval);
        queueWorkerInterval = null;
      }
      state.pendingSessionCount = 0;
      notify();
      return;
    }

    const bridge = window.OMP_BRIDGE;
    if (!bridge || !bridge.isConnected) {
      console.warn("[vocechat-bridge] OMP_BRIDGE 尚未连接，安全队列等待连接...");
      return;
    }

    const isBusy = !!bridge.isStreaming || !!window.OMP_DATA?.isStreaming;
    if (isBusy) {
      return;
    }

    const batches = [...pendingSessionQueue];
    pendingSessionQueue = [];
    state.pendingSessionCount = 0;
    notify();

    const allMessages = batches.flatMap((b) => b.messages);
    const allTexts = batches.map((b) => b.mergedText).filter(Boolean);
    const combinedText = allTexts.join("\n\n");

    const count = allMessages.length || batches.length;
    const isMulti = count > 1;
    const countTag = isMulti ? ` (排队唤醒 · 连续打包 ${count} 条)` : "";

    let promptContent = "";
    if (allMessages.length > 0) {
      promptContent = allMessages
        .map((m, idx) => {
          const where = m.category === "group" ? `[群聊: ${m.groupName || m.targetGid}]` : "[私聊]";
          return `[发信人: ${m.senderNick} (UID: ${m.fromUid}) · ${where} · ${m.timeStr}]:\n${m.cleanText}`;
        })
        .join("\n\n---\n\n");
    } else {
      promptContent = combinedText;
    }

    const firstSender = allMessages[0] || {};
    const promptText = `## 📱 [来自 VoceChat 实时交互${countTag}]\n\n${promptContent}\n\n---\n*请根据发信人身份与需求直接理解并回应。如需回复该发信人，可通过双向发射 API 发送（如 sendPrivateMsg(${firstSender.fromUid || 1}, ...)）。*`;

    const displaySummary = allMessages.length > 1
      ? allMessages.map((m) => `${m.senderNick}: ${m.cleanText}`).join(" ↵ ")
      : combinedText;
    const displayText = `📱 [${firstSender.senderNick || "用户"}${countTag}]: ${displaySummary}`;

    try {
      const ta = document.querySelector('textarea');
      if (ta) {
        ta.value = displayText;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(() => {
          if (ta && ta.value === displayText) {
            ta.value = '';
            ta.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, 300);
      }
    } catch (_) {}

    try {
      bridge.send(promptText, undefined, displayText);
      console.log(`[vocechat-bridge] 队列清空！成功将排队的 ${count} 条消息自动拉起并注入会话！`);
    } catch (err) {
      console.error("[vocechat-bridge] 队列注入失败，自动回滚放回队列头部重试:", err);
      pendingSessionQueue.unshift(...batches);
      state.pendingSessionCount = pendingSessionQueue.length;
      notify();
    }
  }

  function finalizeBurst() {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
      debounceTimeout = null;
    }
    if (burstDeadlineTimeout) {
      clearTimeout(burstDeadlineTimeout);
      burstDeadlineTimeout = null;
    }

    if (burstAccumulator.length === 0) {
      state.hubState = "IDLE";
      state.pendingCount = 0;
      notify();
      return;
    }

    const messages = [...burstAccumulator];
    burstAccumulator = [];
    state.hubState = "BUSY";
    state.pendingCount = 0;
    notify();

    const mergedText = messages.map((m) => m.cleanText).filter(Boolean).join("\n");
    console.log(`[vocechat-bridge] Burst finalized! Merged ${messages.length} messages:`, mergedText);

    broadcastBurst({
      count: messages.length,
      text: mergedText,
      images: [],
      messages,
      timestamp: Date.now(),
    });

    if (state.autoInjectSession !== false) {
      enqueueBurstForSession(mergedText, messages);
    }

    setTimeout(() => {
      state.hubState = "IDLE";
      notify();
    }, 1500);
  }

  const burstListeners = new Set();
  function broadcastBurst(burstData) {
    for (const cb of burstListeners) {
      try {
        cb(burstData);
      } catch (err) {
        console.error("[vocechat-bridge] burst listener error:", err);
      }
    }
  }

  // --- 智能多条连珠炮发射引擎 ---
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function sendBatchMsg(targetId, messages, delayMs = 600, targetType = "private") {
    if (!Array.isArray(messages) || messages.length === 0) return { status: "failed", error: "messages 必须为非空数组" };
    const results = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = String(messages[i]).trim();
      if (!msg) continue;

      let res;
      if (targetType === "group") {
        res = await sendGroupMsg(targetId, msg);
      } else {
        res = await sendPrivateMsg(targetId, msg);
      }
      results.push(res);

      if (i < messages.length - 1 && delayMs > 0) {
        await sleep(delayMs);
      }
    }
    return { status: "ok", count: results.length, details: results };
  }

  async function sendSmartBurst(targetId, longText, delayMs = 600, targetType = "private") {
    if (!longText || typeof longText !== "string") return { status: "failed", error: "无效文本" };

    let segments = longText.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    if (segments.length <= 1) {
      segments = longText.split(/\n+/).map(s => s.trim()).filter(Boolean);
    }
    if (segments.length <= 1) {
      return targetType === "group" ? await sendGroupMsg(targetId, longText) : await sendPrivateMsg(targetId, longText);
    }

    return await sendBatchMsg(targetId, segments, delayMs, targetType);
  }

  // --- Outgoing Actions & API Calls ---
  async function sendPrivateMsg(targetUid, text) {
    const token = await ensureAuthToken();
    if (!token) return { status: "failed", error: "未认证" };

    try {
      const cleanUrl = normalizeUrl(state.serverUrl);
      const resp = await fetch(`${cleanUrl}/api/user/${targetUid}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "X-API-Key": token,
        },
        body: text,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const mid = await resp.text();
      return { status: "ok", data: { message_id: mid } };
    } catch (err) {
      console.error("[vocechat-bridge] sendPrivateMsg error:", err);
      return { status: "failed", error: err.message };
    }
  }

  async function sendGroupMsg(gid, text) {
    const token = await ensureAuthToken();
    if (!token) return { status: "failed", error: "未认证" };

    try {
      const cleanUrl = normalizeUrl(state.serverUrl);
      const resp = await fetch(`${cleanUrl}/api/group/${gid}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "X-API-Key": token,
        },
        body: text,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const mid = await resp.text();
      return { status: "ok", data: { message_id: mid } };
    } catch (err) {
      console.error("[vocechat-bridge] sendGroupMsg error:", err);
      return { status: "failed", error: err.message };
    }
  }

  function clearHistory() {
    state.historyEvents = [];
    savePersisted();
    notify();
  }

  function setConfig(updates) {
    if (updates.serverUrl !== undefined) {
      updates.serverUrl = normalizeUrl(updates.serverUrl);
    }

    Object.assign(state, updates);
    state.token = null;
    state.selfUid = null;
    state.selfNick = "";
    state.isConnected = false;
    state.connectError = null;
    streamReady = false;

    savePersisted();
    notify();

    if (state.serverUrl && state.email && state.password) {
      setTimeout(() => {
        connectStream();
      }, 100);
    }
  }

  // Initialize
  loadPersisted();
  if (state.serverUrl && state.email && state.password) {
    setTimeout(() => {
      connectStream();
    }, 400);
  }

  // Global Controller Export
  const controller = {
    getState: () => ({
      ...state,
      historyEvents: [...state.historyEvents],
    }),
    subscribe: (cb) => {
      listeners.add(cb);
      cb({ ...state, historyEvents: [...state.historyEvents] });
      return () => listeners.delete(cb);
    },
    onBurst: (cb) => {
      burstListeners.add(cb);
      return () => burstListeners.delete(cb);
    },
    setConfig,
    clearHistory,
    reconnect: () => {
      state.token = null;
      return connectStream();
    },
    syncHighWatermarkHistory,
    sendPrivateMsg,
    sendGroupMsg,
    sendBatchMsg,
    sendSmartBurst,
    drainSessionQueue,
    refreshLoginInfo: syncHighWatermarkHistory,
  };

  window.CADICE_SANCTUARY_BRIDGE = controller;
  window.CADICE_QQ_BRIDGE = controller; // Backward compatibility
})();
