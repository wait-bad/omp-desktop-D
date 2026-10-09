# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.5] - 2026-10-10

### Added

- **输入框原生图片附件接入 (Image Attachments)** — 支持点击附件图标选择图片、系统剪贴板（微信/截屏等）直接 `Ctrl+V` 粘贴、文件拖拽放下吸附，并在输入框上方呈现缩略图预览条与快速删除按钮；气泡与发送流完整支持图文多模态混发。
- **现代化设置中心 (Settings UI)** — 升级为大视野左右分栏架构，包含竖向导航栏、搭档偏好卡片、底座模型配置、单列宽幅 MCP 服务与 Skills 技能管理列表。

### Fixed

- **彻底根治会话流式输出上下文误判悬停问题 (Race Condition)** — 重构滚动意图判定引擎，物理分离滚轮方向（`deltaY < 0`）与程序流式内容自滚，防止内容高速追加时将 DOM 膨胀误判为用户向上翻阅，消除流式输出中途锁死不再自动滚动的顽疾。
- **彻底根治一键回到底部卡顿停顿问题 (Guaranteed Bottom-Reach)** — 从 `.row` 样式中移除导致虚拟渲染坍塌的 `content-visibility: auto`；并在一键回底时挂载 18 帧自适应连续贴底校准循环，确保 100% 精确直达最底部。

### Changed

- **极简状态栏 (StatusBar) 与输入框界面去冗** — 移除输入框右下角 `↵ send`、`⎋ abort` 等冗余快捷键提示；状态栏全面精简瘦身，裁撤冗余指标，仅保留 Todo 任务规划看板入口与 Tweaks 调参入口。

## [0.1.4] - 2026-09-13

### Added

- One-click "scroll to latest" button — a floating chevron appears whenever the user scrolls away from the bottom, jumping smoothly back to the newest message.

### Fixed

- Ask tool stuck / unclickable — an `extension_ui_request.select` bubble buffered waiting for a `tool_execution_start` that never arrived (e.g. ask-only turns) blocked the whole ask flow. A 200ms fallback now flushes the pending bubble so it always renders and stays interactive. Option buttons also capture the click reliably (`type="button"`, `preventDefault`/`stopPropagation`) and echo the picked value immediately via local `submittedVal` state instead of waiting on the round-trip.
- Cannot hover-highlight context — `onScroll` now throttles through `requestAnimationFrame`, and the auto-scroll effect only follows the tail when the user is already at the bottom, so scroll-tracking no longer fights the minimap cross-highlight.
- Slow context loading — `.chat-scroll` gets `contain: layout` + `will-change: scroll-position`, message rows get `content-visibility: auto` with a retained intrinsic size, and the auto-scroll effect no longer forces a synchronous reflow on every message mutation.

## [0.1.3] - 2026-09-13

### Fixed

- 修复了 todo 不能正常显示的问题 (fix tode board)
- Tab switch drops all tool cards from chat — `get_messages` returns only text entries; tool/ask/compact cards live exclusively in live event state. Fixed by merging `get_messages` ground-truth text into the existing snapshot (preserving tool cards in-place) instead of replacing `state.messages` wholesale. `activeToolCards` indices are rebuilt after merge so in-flight `tool_execution_update` events continue landing correctly.
- Minimap cell stuck pulsating after tab switch — `streamingBubble` restored from snapshot was never cleared when `get_state` reported `isStreaming: false` (turn completed while away); `_applyRpcState` now retires the bubble and strips `streaming: true` entries from `state.messages` immediately, before `get_messages` arrives.

## [0.1.2] - 2026-05-11

### Fixed

- macOS freeze (spinning beach ball + high CPU) when opening a project folder via the + button — `blocking_pick_folder` was called from a command-handler thread, deadlocking against the main RunLoop; switched to callback-based `pick_folder` with an async command and `spawn_blocking` channel bridge

## [0.1.1] - 2026-05-10

### Added

- `/login` command with OAuth provider picker (fetches providers via `get_login_providers` RPC)
- Ask tool rendered as inline chat bubble with `rpc-ui` mode support _(requires [can1357/oh-my-pi#994](https://github.com/can1357/oh-my-pi/pull/994) to be merged)_

### Performance

- Fixed 13×13 minimap grid (169 cells); oldest row of 13 messages evicted at turn boundary once the grid is full, keeping memory and render cost bounded in long sessions
- `React.memo` on all bubble components (UserBubble, AssistantBubble, ToolCard, AskBubble, CompactRow); only the live streaming tail re-renders per token — stable history bails out
- Stable `_id` stamped on every message object in `live.js`; bubbles keyed by `_id` instead of array index, eliminating remount/fade-in blink when the oldest row is evicted
- `useCallback` on `handleAnnotate` and `handleAskAnswer` in App to stabilize function-prop refs and preserve memo bailouts for AssistantBubble and AskBubble

## [0.1.0] - 2026-05-10

### Added

- Initial Tauri 2 shell: spawns `omp --mode rpc` per tab, no bundler, JSX transpiled in-browser via `@babel/standalone`
- GitHub Actions CI (cargo check + cargo test on win/linux/mac) and release pipeline
- Per-tab omp process isolation — one process per tab, preserved across switches via session snapshots
- Model picker as a separate bridge view with on-load fetch and refresh button
- Markdown rendering with syntax highlighting (marked v12 + highlight.js) in chat
- Plan mode: full intent → drafting → review → running → done lifecycle with inline block annotations
- Slash command palette with arrow-key navigation, fuzzy filter, and Enter execution
- `/new` command to start a fresh omp session in the current tab
- Steer: send a message to the agent mid-turn without waiting for completion
- Compact tool cards: full expand/collapse card showing live progress and final result
- Task/quick_task tool cards: collapsible subagent panel with live-stream view on row click
- Eval cell tool cards: stream code and output live; syntax highlight on completion
- Auto-scroll chat to bottom as the agent streams output
- Minimap: dense grid heatmap with chat-bubble cross-highlight and per-kind tooltips
- Long paste collapse into `[paste #N +K lines]` inline tokens in the composer
- macOS-style traffic light window controls on Windows (DWM frameless)
- Autosave toggle button in the status bar
- Font size slider in the tweaks panel (75–150%, step 5)
- Git branch chip in the title bar via `gix` + `notify`
- OMP icon pack v1 as app icons across all platforms
- MIT license

### Fixed

- Black screen on startup — disable Tauri CSP hash injection, remove Google Fonts CDN link
- Git HEAD watcher — watch `.git/` directory instead of `HEAD` file to survive atomic rename on Linux/macOS
- Window drag — replaced custom handler with `data-tauri-drag-region`
- Diff block overflow — contained within chat column width
- Composer textarea: single-line default via `field-sizing: content`; focus restored after send; textarea stays enabled during streaming for steer input
- Phantom textarea scrollbar hidden at min-height
- Window control symbols: always colored red/yellow/green, no hover background bleed
- Tweaks panel: persist settings to `localStorage`; retheme to use app CSS variables
- Token and context gauge percentages truncated to one decimal place
- Stream line accumulation — handle in-place growing lines without duplication
- ToolCard: remove duplicate `return` statement; expand individual subagent rows, not the card header
- Plan annotations always reaching the prompt; `sendFeedback` working with annotations and no body text
- Plan running→done state transition
- Message history preserved across tab switches
- Tab name retained from folder path when `omp sessionName` is absent
- `_handleResponse` in `live.js` — missing closing brace caused silent IIFE syntax error
- Thinking level values aligned to valid RPC set (`off | minimal | low | medium | high | xhigh`)
- Rust agent: race-safe sessions, lock-free per-session stdin writes, no orphan child processes on hot-reload

### Changed

- Project renamed from `omp-desktop` to `Oh My Pi Desktop`
- Split large files into focused modules: `agent.rs` → `agent/`, `app.jsx` → `app-live.jsx` + `src/app/`, monolithic CSS and chat/UI/tweaks components into dedicated directories
- Plan mode moved from a dedicated side panel into the chat timeline
