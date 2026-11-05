/* design/settings/scheduler-engine.js — Global Autonomous Task Scheduler Engine
   Maintains periodic trigger loop, file concatenations, and session injection.
   Audited & Hardened by Cadice: Fixed pause-time drift, localStorage quota explosion,
   manual-trigger timer pollution, and unformatted concatenation bugs. */

(function () {
  const STORAGE_KEY = "omp_scheduler_config_v1";

  // Initial state defaults
  const state = {
    isRunning: false,
    isPaused: false,
    pausedAt: null,        // ★ Cadice Fix: 暂停时的时间戳，用于恢复时精准补偿时钟漂移
    durationMinutes: 60,   // 总时间块（分钟，0为不限）
    intervalMinutes: 5,    // 触发间隔（分钟）
    maxRuns: 10,           // 最大触发次数（0为不限）
    currentRunCount: 0,    // 已触发次数
    startedAt: null,       // 开始时间戳 (ms)
    nextRunAt: null,       // 下次触发时间戳 (ms)
    remainingMs: 0,        // 距离下次触发剩余毫秒
    remainingDurationMs: 0,// 总时间块剩余毫秒
    selectedFiles: [],     // Array<{ id, name, size, lineCount, content, lastModified }>
    logs: [],              // Array<{ id, time, runIndex, status, message }>
    lastTriggeredAt: null,
  };

  const listeners = new Set();
  function notify() {
    const snapshot = { ...state, selectedFiles: [...state.selectedFiles], logs: [...state.logs] };
    for (const cb of listeners) {
      try {
        cb(snapshot);
      } catch (err) {
        console.error("[scheduler] listener notification error:", err);
      }
    }
  }

  // Load persisted config and selected files from localStorage
  function loadPersisted() {
    if (typeof localStorage === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.durationMinutes === "number") state.durationMinutes = parsed.durationMinutes;
      if (typeof parsed.intervalMinutes === "number") state.intervalMinutes = parsed.intervalMinutes;
      if (typeof parsed.maxRuns === "number") state.maxRuns = parsed.maxRuns;
      if (Array.isArray(parsed.selectedFiles)) state.selectedFiles = parsed.selectedFiles;
    } catch (e) {
      console.warn("[scheduler] failed to load persisted config:", e);
    }
  }

  // ★ Cadice Fix: 防御性存储，防止超过 5MB 引爆 localStorage 击穿整个域
  function savePersisted() {
    if (typeof localStorage === "undefined") return;
    try {
      const toSave = {
        durationMinutes: state.durationMinutes,
        intervalMinutes: state.intervalMinutes,
        maxRuns: state.maxRuns,
        // 如果文件内容过大，限制持久化内容（最多保留前 64KB 内容，防止爆仓）
        selectedFiles: state.selectedFiles.map((f) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          lineCount: f.lineCount,
          lastModified: f.lastModified,
          content: f.content && f.content.length > 65536 ? f.content.slice(0, 65536) : f.content,
        })),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn("[scheduler] localStorage quota exceeded, falling back to metadata-only:", e);
      try {
        // 降级：仅存元数据
        const metaOnly = {
          durationMinutes: state.durationMinutes,
          intervalMinutes: state.intervalMinutes,
          maxRuns: state.maxRuns,
          selectedFiles: state.selectedFiles.map((f) => ({
            id: f.id,
            name: f.name,
            size: f.size,
            lineCount: f.lineCount,
            lastModified: f.lastModified,
            content: "",
          })),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(metaOnly));
      } catch (_) {
        // 静默保护
      }
    }
  }

  function addLog(status, message, runIndex) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const logItem = {
      id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 5),
      time: timeStr,
      runIndex: runIndex !== undefined ? runIndex : state.currentRunCount,
      status, // "success" | "info" | "warn" | "error"
      message,
    };
    state.logs.unshift(logItem);
    if (state.logs.length > 50) state.logs.pop();
  }

  let tickerId = null;

  function tick() {
    if (!state.isRunning || state.isPaused) return;

    const now = Date.now();

    // 1. Check total duration timeout (★ 已由 pause 机制做精准时钟补偿)
    if (state.durationMinutes > 0 && state.startedAt) {
      const totalDurationMs = state.durationMinutes * 60 * 1000;
      const elapsed = now - state.startedAt;
      state.remainingDurationMs = Math.max(0, totalDurationMs - elapsed);
      if (state.remainingDurationMs <= 0) {
        stop("总时间块耗尽，自动化顺利达成！");
        return;
      }
    } else {
      state.remainingDurationMs = Infinity;
    }

    // 2. Check interval trigger
    if (state.nextRunAt) {
      state.remainingMs = Math.max(0, state.nextRunAt - now);
      if (state.remainingMs <= 0) {
        triggerNext(false);
      }
    }

    notify();
  }

  function triggerNext(isManual = false) {
    if (state.selectedFiles.length === 0) {
      addLog("warn", isManual ? "未选择任何文件，手动触发跳过" : "未选择任何文件，本次跳过触发");
      if (!isManual) scheduleNext();
      notify();
      return;
    }

    const bridge = window.OMP_BRIDGE;
    if (!bridge || !bridge.isConnected) {
      addLog("error", "OMP 桥接连接不可用，无法注入任务");
      if (!isManual) scheduleNext();
      notify();
      return;
    }

    // Check if session is currently streaming/generating (busy protection)
    if (bridge.isStreaming) {
      if (isManual) {
        // ★ Cadice Fix: 手动测试遇到 busy 时仅提示，绝对不要篡改主定时器的倒计时！
        addLog("warn", "当前长会话正处于推理/执行中，手动触发已取消，请稍候重试");
        notify();
        return;
      }
      addLog("warn", "当前长会话正处于推理/执行中，安全顺延 10 秒后重试...");
      state.nextRunAt = Date.now() + 10000;
      state.remainingMs = 10000;
      notify();
      return;
    }

    // Check non-empty content
    const validFiles = state.selectedFiles.filter((f) => (f.content || "").trim().length > 0);
    if (validFiles.length === 0) {
      addLog("warn", "所选文件内容均为空，已取消发送");
      if (!isManual) scheduleNext();
      notify();
      return;
    }

    // ★ Cadice Fix: 结构化语义包裹，杜绝“无名无姓缝合怪”
    const sections = validFiles.map((f, idx) => {
      const header = `### 📄 [文件 ${idx + 1}/${validFiles.length}: ${f.name}] (${f.lineCount || 0} 行, ${formatBytes(f.size || 0)})`;
      return `${header}\n\`\`\`\n${(f.content || "").trim()}\n\`\`\``;
    });

    const promptText = `## 📋 [自动化巡航任务注入 · 包含 ${validFiles.length} 个任务文件]\n\n` + sections.join("\n\n---\n\n");
    const runNum = state.currentRunCount + 1;
    const fileSummary = validFiles.map((f) => f.name).join(", ");
    const displayText = isManual
      ? `⚡ [手动测试触发] (${fileSummary})`
      : `⏰ [定时自动触发 #${runNum}] (${fileSummary})`;

    try {
      bridge.send(promptText, undefined, displayText);
      state.lastTriggeredAt = Date.now();

      if (!isManual) {
        state.currentRunCount = runNum;
        addLog("success", `第 ${runNum} 次触发执行成功，内容已注入当前会话`, runNum);

        // Check max run limit
        if (state.maxRuns > 0 && state.currentRunCount >= state.maxRuns) {
          stop(`已达成设定最大触发次数 (${state.maxRuns} 次)`);
          return;
        }
        scheduleNext();
      } else {
        addLog("success", `手动测试触发成功，内容已注入当前会话`);
      }
    } catch (e) {
      addLog("error", "发送失败: " + (e.message || String(e)));
      if (!isManual) scheduleNext();
    }

    notify();
  }

  function scheduleNext() {
    const intervalMs = Math.max(1, state.intervalMinutes) * 60 * 1000;
    state.nextRunAt = Date.now() + intervalMs;
    state.remainingMs = intervalMs;
  }

  function start() {
    if (state.selectedFiles.length === 0) {
      addLog("error", "请先选择至少一个用于拼接内容的文件！");
      notify();
      return false;
    }

    state.isRunning = true;
    state.isPaused = false;
    state.pausedAt = null;
    state.currentRunCount = 0;
    state.startedAt = Date.now();
    scheduleNext();

    if (state.durationMinutes > 0) {
      state.remainingDurationMs = state.durationMinutes * 60 * 1000;
    } else {
      state.remainingDurationMs = Infinity;
    }

    if (!tickerId) {
      tickerId = setInterval(tick, 1000);
    }

    addLog(
      "info",
      `调度器已启动：持续 ${state.durationMinutes > 0 ? state.durationMinutes + "分钟" : "不限时"}，` +
      `间隔 ${state.intervalMinutes}分钟，上限 ${state.maxRuns > 0 ? state.maxRuns + "次" : "不限次"}`
    );
    notify();
    return true;
  }

  function stop(reason = "用户手动停止") {
    state.isRunning = false;
    state.isPaused = false;
    state.pausedAt = null;
    state.nextRunAt = null;
    state.remainingMs = 0;
    state.remainingDurationMs = 0;

    if (tickerId) {
      clearInterval(tickerId);
      tickerId = null;
    }

    addLog("info", `调度器已停止 (${reason})`);
    notify();
  }

  // ★ Cadice Fix: 真正无偏的暂停/恢复机制
  function togglePause() {
    if (!state.isRunning) return;

    if (!state.isPaused) {
      // 进入暂停状态，记录打瞌睡的时间戳
      state.isPaused = true;
      state.pausedAt = Date.now();
      addLog("info", "调度器已暂停，时钟已冻结");
    } else {
      // 从暂停恢复，计算暂停了多久并对齐全部时钟
      state.isPaused = false;
      if (state.pausedAt) {
        const pauseDurationMs = Date.now() - state.pausedAt;
        if (state.startedAt) state.startedAt += pauseDurationMs;
        if (state.nextRunAt) state.nextRunAt += pauseDurationMs;
        state.pausedAt = null;
      }
      addLog("info", "调度器已恢复运行，时序已无缝顺延对齐");
    }

    notify();
  }

  function triggerNow() {
    triggerNext(true);
  }

  // File management
  async function addFilesFromInput(fileList) {
    if (!fileList || fileList.length === 0) return;
    const added = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const text = await file.text();
        const lineCount = text ? text.split("\n").length : 0;
        const fileObj = {
          id: "f_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          name: file.name,
          size: file.size,
          lineCount,
          content: text,
          lastModified: file.lastModified || Date.now(),
        };
        // Replace if same name already exists, or append
        const existingIdx = state.selectedFiles.findIndex((f) => f.name === file.name);
        if (existingIdx >= 0) {
          state.selectedFiles[existingIdx] = fileObj;
        } else {
          state.selectedFiles.push(fileObj);
        }
        added.push(file.name);
      } catch (err) {
        console.error("[scheduler] error reading file:", file.name, err);
        addLog("error", `读取文件 ${file.name} 失败: ${err.message || String(err)}`);
      }
    }

    if (added.length > 0) {
      addLog("info", `已加载 ${added.length} 个文件: ${added.join(", ")}`);
      savePersisted();
      notify();
    }
  }

  function removeFile(fileId) {
    const idx = state.selectedFiles.findIndex((f) => f.id === fileId);
    if (idx >= 0) {
      const removed = state.selectedFiles.splice(idx, 1)[0];
      addLog("info", `已移除文件: ${removed.name}`);
      savePersisted();
      notify();
    }
  }

  function clearFiles() {
    state.selectedFiles = [];
    addLog("info", "已清空所选文件列表");
    savePersisted();
    notify();
  }

  function updateConfig(cfg) {
    if (typeof cfg.durationMinutes === "number") state.durationMinutes = Math.max(0, cfg.durationMinutes);
    if (typeof cfg.intervalMinutes === "number") state.intervalMinutes = Math.max(1, cfg.intervalMinutes);
    if (typeof cfg.maxRuns === "number") state.maxRuns = Math.max(0, cfg.maxRuns);
    savePersisted();
    notify();
  }

  // Helpers
  function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return "00:00";
    const totalSec = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  // Initialize
  loadPersisted();

  window.OMP_SCHEDULER = {
    getState: () => ({ ...state, selectedFiles: [...state.selectedFiles], logs: [...state.logs] }),
    subscribe: (cb) => {
      listeners.add(cb);
      cb({ ...state, selectedFiles: [...state.selectedFiles], logs: [...state.logs] });
      return () => listeners.delete(cb);
    },
    start,
    stop,
    togglePause,
    triggerNow,
    addFilesFromInput,
    removeFile,
    clearFiles,
    updateConfig,
    formatDuration,
    formatBytes,
  };
})();
