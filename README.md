# Oh My Pi Desktop (omp-desktop-D)

基于 Tauri 2 构建的 [oh-my-pi](https://github.com/can1357/oh-my-pi) (`omp`) 跨平台轻量桌面端外壳。
将 `omp --mode rpc` 编程智能体封装为托管的子进程，并通过原生 React UI 进行实时连接交互 —— 无需浏览器，无 Electron，约 8 MB 极小二进制体积。

---

## 致谢与声明 (Credits & Acknowledgements)

本项目基于原作者优秀的开源项目 **[apoc/omp-desktop](https://github.com/apoc/omp-desktop)** 进行二次开发与增强。

非常感谢原开源作者 **[apoc](https://github.com/apoc)**（以及贡献者 Miroslav Drbal 等）为社区构建的优雅、纯粹且高性能的轻量级 Tauri 架构！
同时也感谢底层强大编码智能体 **[oh-my-pi](https://github.com/can1357/oh-my-pi)** 作者 [@can1357](https://github.com/can1357) 的卓越工作。

本分支（**omp-desktop-D**）为一个由个人维护的 DIY 增强版本，在完整保留原工程设计与核心特性的基础上，进行了体验优化、功能扩展与本地化完善。

---

## 核心基础功能 (Original Features)

### 对话与会话 (Chat & sessions)
- **多标签会话隔离**：每个标签页独立拥有自己的 `omp --mode rpc` 进程。
- **完整会话快照保存**：跨标签切换时，会话状态（包括正在流式生成的回复）完整保留。
- **全新会话指令**：`/new` 命令随时开启全新独立会话（历史记录安全保存在磁盘上）。
- **两级命令桥模型选择器**：支持通过快捷键呼出两级视图命令桥，或直接在底部状态栏轮换/切换模型。
- **思考等级调节**：支持便捷切换模型的思考层级（`off / minimal / low / medium / high / xhigh`，依据模型支持动态匹配）。
- **实时指标感知**：配备流式输出实时 Token 速率仪表盘（Tokens/sec Sparkline）与上下文窗口占用率指示条。

### 计划模式 (Plan mode)
- **草稿先行工作流**：在对话窗口中即可激活先拟定计划、确认后再执行的 Draft-before-write 流程。
- **意图引导提示**：第一条消息自动注入意图结构化框架，后续回复持续引导计划生成。
- **行内交互式批注**：计划中的每个段落均支持点击添加批注，确认前可全面 Review。
- **一键批准与联动**：点击批准按钮会将所有批注整合成单条反馈发送，并同步激活任务看板。
- **智能看板联动**：根据 Agent 发起的 `todo_write` 工具调用，自动生成任务进度看板（运行中 / 已完成）。

### 工具执行卡片 (Tool cards)
- **实时流式反馈**：对 `eval`（JS/Python 内核）与 `bash` 系统命令行调用提供无延迟的流式输出展示。
- **语法高亮展现**：代码单元执行完毕后，通过 highlight.js（atom-one-dark 主题）进行高质感语法高亮。
- **交互式 Diff 查看器**：针对 `edit` 代码修改工具，提供类似 IDE 的平滑动画与逐行统一 Diff 对比视图。
- **专用工具卡片支持**：涵盖搜索预览（Search）、读取摘要（Read）、子任务板（Task）、交互询问（Ask）等多种专用工具卡片。
- **鲜明的工具色彩体系**：为每种工具定义了专属的视觉图标与主题配色（read, search, edit, bash, eval, task, debug, ask）。

### 密集会话小地图 (Minimap)
- **高密网络小地图**：采用紧凑的密集网格设计（单个单元格代表一条消息），取代旧版滚动条，轻松容纳 200+ 条多轮对话。
- **Token 消耗热力图**：Assistant 单元格依据所消耗的 Token 数量按对数（Log）平滑缩放亮度，高开销回合一目了然。
- **悬停高亮定位**：鼠标悬停任意格子，聊天主窗口对应的对话气泡会以光环高亮。
- **一键平滑跳转**：点击任意格子，聊天窗口自动平滑滚动定位到对应消息。
- **丰富悬浮提示（Tooltip）**：悬停即可查看消息角色、输入/输出 Token 明细、工具耗时及内容预览。

### 原生极轻桌面底座 (Native shell)
- **极小资源占用**：基于 Tauri 2 + Rust 后端构建，彻底抛弃 Electron，零 CDN 依赖，整包仅约 8 MB 级。
- **精致无边框窗口**：支持 Windows 与 macOS 风格的无边框红绿灯窗口控制栏与拖拽交互。
- **原生文件选择**：原生级系统目录挑选器，用于打开工作区项目。
- **严苛的安全沙箱**：配置严格的内容安全策略（CSP），禁用 asset 协议，隔离潜在外部风险。

![Chat](screenshots/1.jpg)
![Tools](screenshots/2.jpg)
![Minimap](screenshots/3.jpg)

---

## 🚀 omp-desktop-D 专属增强与修复 (DIY Enhancements & Fixes)

作为本工程的 DIY 定制增强分支，**omp-desktop-D** 在完全保留上述全部原始功能的基础上，追加了以下体验强化、生态扩展与关键 Bug 修复：

### 1. 拟真聊天与个性化视觉 (Persona & Appearance)
- **双向自定义头像**：支持分别设置用户与 AI 的专属头像（支持直接选择本地图片），营造类似现代即时通讯软件的沉浸对话质感；同时随时可以重置为默认头像。
- **自定义角色与昵称**：支持自由配置用户与 AI 的显示名称（例如设置专属 AI 昵称），并在对话气泡与顶栏中实时同步生效。
- **自定义背景壁纸与透明度浓度调节**：支持自由上传本地图片作为应用背景壁纸，并提供浓度（Opacity）滑块无级调节，兼顾个性美感与文字/代码可读性。

### 2. 深度生态拓展与模型中转 (Ecosystem & Models)
- **可视化 API & 模型管理面板**：提供完整的模型配置视图，支持灵活新增第三方 API Key、无缝接入各类中转站（Reverse Proxy / Relay），支持手动添加自定义模型条目并自由配置其上下文长度（Context Window）。
- **MCP 服务与 Skill 插件管理器**：打通本地 MCP Server 与 Skill 生态，支持直观列出所有已配置的工具与技能，并支持按需一键开关（启用/禁用）。

### 3. 会话上下文与历史归档 (History & Context Management)
- **可视化历史会话管理页面**：提供专门的历史记录管理界面，支持清晰浏览过往所有对话，支持直接从历史会话启动/恢复（Resume），以及一键删除、归档历史聊天。

### 4. 关键体验优化与稳定性修复 (Stability & Experience)
- **修复 Hub 编译时闪退问题**：加固了进程通信与生命周期处理逻辑，彻底修复了在特定场景（如 Hub 编译处理）下可能导致软件崩溃闪退的问题。
- **新增等待首字/思考中动态指示**：彻底消除用户发送消息后等待响应时的界面“假死感”；在模型吐出首个 Token 之前，呈现动态脉冲光点与“正在思考中”的实时状态指示。

---

## 系统架构 (Architecture)

```
┌─────────────────────────────────────────────────────┐
│  Tauri WebView  (src/)                              │
│                                                     │
│  app-live.jsx ──► OMP_BRIDGE ──► live.js            │
│       │                │                            │
│  React state    RPC event handlers                  │
│  (messages,     (turn, message, tool,               │
│   model, ctx,    extension_ui, sparkline)           │
│   kanban…)             │                            │
│                  adapter.js (pure transforms)       │
└────────────────────────┬────────────────────────────┘
                         │  Tauri IPC (invoke / events)
┌────────────────────────▼────────────────────────────┐
│  Rust  (src-tauri/src/)                             │
│                                                     │
│  AgentBridge                                        │
│    spawn  omp --mode rpc                            │
│    stdin  ◄── send_command (JSON lines)             │
│    stdout ──► agent://line events (JSON lines)      │
│    kill   on drop / stop_session / hot-reload         │
└────────────────────────┬────────────────────────────┘
                         │  stdin / stdout pipes
┌────────────────────────▼────────────────────────────┐
│  omp  (oh-my-pi coding agent)                       │
│    JSON-line RPC protocol                           │
│    streams AgentSessionEvents to stdout             │
└─────────────────────────────────────────────────────┘
```

---

## 系统环境要求 (Requirements)

| 工具 / 环境 | 推荐版本 |
|------|---------|
| 运行桌面端 | Windows 10/11（当前提供预编译包） |
| [oh-my-pi](https://github.com/can1357/oh-my-pi)（`omp`） | 14.8+，且能在终端直接执行 |
| 自行编译时另需 | [Rust](https://rustup.rs/) stable 1.77+、[Node.js](https://nodejs.org/) 18+、[Tauri CLI](https://tauri.app/start/prerequisites/) 2.x |

> **给小白**：先装 `omp`，再装本客户端。完整图文步骤见 👉 **[oh-my-pi（omp）小白安装教程](docs/install-omp.md)**。  
> Windows 上 `omp.exe` 常见路径：`%LOCALAPPDATA%\omp\omp.exe`。

---

## 📥 下载与安装 (Download & Installation)

### 1. 先安装 omp（必做）

桌面端本身不能替代 `omp`。请按教程完成安装并验证 `omp --version`：

👉 **[oh-my-pi（omp）小白安装教程](docs/install-omp.md)**

- Windows 一键安装（PowerShell）：`irm https://omp.sh/install.ps1 | iex`
- macOS / Linux：`curl -fsSL https://omp.sh/install | sh`

### 2. 再下载本客户端（无需自己编译）

直接前往 Releases 下载预编译 Windows 产物即可，**普通用户不必配置 Rust / Node.js**：

👉 **[点击前往 GitHub Releases 下载最新版本 (v0.1.2)](https://github.com/wait-bad/omp-desktop-D/releases/latest)**

- **`OMP.Desktop_0.1.2_x64-setup.exe`**：标准 Windows 安装向导（推荐），自动创建桌面与开始菜单快捷方式。
- **`omp-desktop.exe`**：免安装便携版（Portable），双击即可直接运行。

---

## 🛠️ 源码编译与二次开发 (For Developers)

如果你想参与开发或自行编译：

```bash
# 1. 克隆代码仓库
git clone https://github.com/wait-bad/omp-desktop-D.git
cd omp-desktop-D

# 2. 安装开发依赖
npm install

# 3. 启动开发模式（支持前端热重载，自动编译 Rust 后端并唤起窗口）
npm run dev

# 4. 自行打包生成安装程序
npm run build
```

---

## 项目工程结构 (Project Structure)

```text
omp-desktop-D/
├── src/                        # 前端界面（由 Tauri 本地静态服务承载）
│   ├── index.html              # 应用主入口
│   ├── app-live.jsx            # React 根组件（状态流转、指令派发与视图装配）
│   ├── live.js                 # Tauri IPC 通信桥梁（封装 OMP_BRIDGE）
│   ├── adapter.js              # RPC 数据到 UI 模型的无副作用适配转换器
│   ├── model-names.js          # 模型 ID 到别名的字典映射
│   ├── platform.css            # 平台原生样式覆盖
│   ├── react.development.js    # 内置 React 18（离线无 CDN 依赖）
│   ├── marked.min.js           # Markdown 离线解析器
│   ├── highlight.min.js        # 语法高亮引擎（atom-one-dark 主题）
│   │
│   ├── app/                    # 核心状态钩子与常量配置
│   │   ├── constants.js        # 默认微调参数、模型占位定义
│   │   └── use-bridge-snapshot.jsx  # 状态订阅与快捷键桥接 Hook
│   │
│   └── design/                 # 业务功能组件域
│       ├── ui/                 # 基础原子组件（图标库、雷达图、看板批注等）
│       ├── chat/               # 对话视图（用户气泡、助手气泡、工具执行卡片等）
│       ├── settings/           # 模型管理、历史记录模态框
│       ├── tweaks/             # 实时微调与个性化侧边控制台
│       ├── layout/             # 模块化分层 CSS 样式
│       ├── chrome.jsx          # 自定义窗口控制、标签栏、小地图、底栏
│       ├── composer.jsx        # 富文本输入框与 ⌘K 快捷桥
│       └── panels.jsx          # 计划模式专属看板
│
├── src-tauri/                  # Rust 原生后端
│   ├── src/
│   │   ├── main.rs             # 应用二进制入口
│   │   ├── lib.rs              # Tauri 注册中心与 Command 分发
│   │   ├── history.rs          # 历史会话恢复与会话管理
│   │   ├── mcp_skill.rs        # MCP 与技能配置管理
│   │   └── agent/              # omp RPC 子进程管理（生命周期、管道读写）
│   ├── Cargo.toml
│   └── tauri.conf.json         # 窗口配置与安全策略
└── package.json
```

---

## RPC 通信协议规范 (RPC Protocol)

前端完全通过 Tauri IPC 桥梁与 `omp` 通信。
`live.js` 负责通过 `invoke("send_command", { sessionId, json })` 向后端发送 JSON 命令，并监听 Rust stdout 读取器发出的 `agent://line` 事件。

### 发送指令 (stdin → omp)

| 指令 (Command) | 触发时机 (When) |
|---|---|
| `get_state` | 收到 `ready` 事件时，或每次 `turn_end` 后 |
| `get_messages` | 收到 `ready` 事件时 |
| `get_available_models` | 收到 `ready` 事件时 |
| `prompt` | 用户发送消息 |
| `abort` | 用户点击中断生成 |
| `set_model` | 用户在 ⌘K 命令桥中选择模型 |
| `cycle_model` | 用户执行 `/model` 命令 |
| `cycle_thinking_level` | 用户在输入框切换思考深度或执行 `/thinking` |
| `compact` | 用户执行 `/compact` 压缩上下文 |
| `export_html` | 用户执行 `/export` 导出对话 |
| `get_session_stats` | 每次 `turn_end` 之后 |
| `extension_ui_response` | 交互式 UI 请求响应 |

### 接收事件 (stdout → frontend)

| 事件 (Event) | 处理器职责 (Handler) |
|---|---|
| `ready` | 引导初次数据拉取 |
| `turn_start` / `turn_end` | 流式状态、TPS 速率计算、Token 消耗统计 |
| `message_start` | 创建用户/助手消息气泡；标记当前模型名称 |
| `message_update` | 根据累积内容动态更新正在流式输出的气泡 |
| `message_end` | 结束当前气泡流式状态（`streaming: false`） |
| `tool_execution_start` | 创建正在执行的工具卡片 |
| `tool_execution_end` | 用结果/Diff/标准输出填充并终结工具卡片 |
| `extension_ui_request` | 交互式请求自动处理或取消 |
| `agent_start` / `agent_end` | 重新拉取会话最新状态 |

---

## 核心设计决策 (Key Design Decisions)

- **`omp --mode rpc` 而非 `omp --rpc`**：`--rpc` 并非合法参数，使用它会导致 omp 进入交互式 TUI 终端模式并输出带有 ANSI 颜色控制字符的文本而非 JSON。
- **空白行跳过而非当作 EOF**：Rust 的 stdout 读取器原先对空行和 IO 错误统一使用 `_ => break`，这会导致一旦 omp 输出一个空行读取线程就静默退出了。现已修正为 `Ok("") => continue`，仅在 `Err(_) => break`。
- **`AgentBridge` 释放时清理子进程**：在析构、停止或热重载时显式调用 `child.kill() + child.wait()`，确保标签关闭与应用热重载不会遗留孤儿 `omp` 僵尸进程。
- **窗口控件事件委托**：`WindowChrome` 在 DOM 加载后由 React 动态渲染，采用全局委托监听器确保窗口拖拽和红绿灯按钮即时响应。
- **`set_model` 响应同步处理**：选择模型后立即触发更新，避免后续 `turn_start` 时由于状态旧值回弹导致界面模型显示闪跳。
- **⌘K 搜索层级优化**：将模型列表置于命令之上，确保在视口受限时无需滚动即可第一屏选中模型。

---

## 微调面板配置 (Tweaks)

点击右下角悬浮按钮打开微调面板（Tweaks panel）：

| 设置项 | 可选项 |
|---|---|
| 主题配色 (Theme) | aurora · phosphor · daylight |
| 界面密度 (Density) | cozy（舒适） · compact（紧凑） · dense（高密） |
| 主题重音色 (Accent colour) | 6 种预设色 + 自定义拾色 |
| 等宽字体 (Mono chat font) | 开关切换 |
| 布局模式 (Layout) | rail（侧边栏） · split（分栏） · focus（专注） |

---

## 开发须知 (Development Notes)

- **`test-rpc.mjs`**：用于独立探测并测试 `omp --mode rpc` 协议通信的 Node/Bun 独立脚本，便于在无 UI 状态下验证底层 RPC 行为。
- **零外部 CDN 依赖**：React 18、ReactDOM 以及 Babel standalone 均完整内嵌在 `src/` 目录下，断网环境下依然完美运作。
- **`src/design/` 的权威性**：`src/design/` 是包含全部实时事件绑定的权威目录，切勿用静态原型覆盖它。
- **Windows 11 适配**：样式运用了 `color-mix(in oklab, …)`，需要 WebView2 ≥ 101 支持；无边框窗体依赖系统 DWM 渲染圆角。

---

## 开源协议与鸣谢

本项目基于开源精神共享，核心代码与设计成果归属于原作者及社区贡献者共同所有。欢迎体验、反馈与交流！
