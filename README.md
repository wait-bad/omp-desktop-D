# Oh My Pi Desktop (omp-desktop-D)

基于 Tauri 2 构建的 [oh-my-pi](https://github.com/can1357/oh-my-pi) (`omp`) 跨平台轻量桌面端外壳。

---

## 致谢与声明 (Credits & Acknowledgements)

本项目基于原作者优秀的开源项目 **[apoc/omp-desktop](https://github.com/apoc/omp-desktop)** 进行二次开发与增强。

非常感谢原开源作者 **[apoc](https://github.com/apoc)**（以及贡献者 Miroslav Drbal 等）为社区构建的优雅、纯粹且高性能的轻量级 Tauri 架构！
同时也感谢底层强大编码智能体 **[oh-my-pi](https://github.com/can1357/oh-my-pi)** 作者 [@can1357](https://github.com/can1357) 的卓越工作。

本衍生分支（**omp-desktop-D**）在此基础上持续进行体验优化、功能扩展与本地化完善。

---

## 🚀 omp-desktop-D 专属增强与改进 (Enhancements & Fixes)

相比于原生版本，**omp-desktop-D** 带来了全方位的交互体验升级、生态管理增强以及关键稳定性修复：

### 1. 拟真聊天与个性化视觉 (Persona & Appearance)
- **双向自定义头像**：支持分别设置用户与 AI 的专属头像（支持选择本地图片文件），营造类似现代即时通讯软件的沉浸对话质感；亦可一键重置为默认几何/专属图标。
- **自定义角色与昵称**：支持自由配置用户与 AI 的显示名称（例如赋予 AI 专属昵称），在对话气泡与顶栏中实时同步。
- **自定义背景壁纸与透明度浓度调节**：支持一键上传个性化背景图片，并提供浓度（Opacity）滑块无级调节，兼顾个性美感与文字/代码可读性。

### 2. 深度生态拓展与模型中转 (Ecosystem & Models)
- **可视化 API & 模型管理面板**：提供完整的模型配置视图，支持灵活新增第三方 API Key、无缝接入中转站（Reverse Proxy / Relay），自定义新增模型条目并自由配置上下文窗口（Context Window）上限。
- **MCP 服务与 Skill 插件管理器**：打通本地 MCP Server 与 Skill 生态，支持直观列出所有已配置的工具与技能，并支持按需一键启用/禁用切换。

### 3. 会话上下文与历史归档 (History & Context Management)
- **可视化历史会话管理页面**：告别黑盒与零散文件，提供专用的历史记录管理界面。支持快速浏览过往会话，支持一键恢复（Resume）历史任务，以及删除、归档历史会话。

### 4. 关键体验优化与稳定性修复 (Stability & Experience)
- **修复 Hub 编译闪退问题**：针对进程通信与生命周期处理进行了加固，彻底修复了在特定场景（如 Hub 编译处理）下可能引发的软件异常退出与闪退现象。
- **新增首字等待/思考中动态指示**：彻底消除发送后等待响应时的界面“假死感”；在模型吐出首个 Token 之前，呈现优雅的脉冲动态光点与实时思考状态提示。

---

## 核心基础特性 (Features)

### 1. 对话与多会话管理 (Chat & Sessions)
- **多标签会话隔离**：每个标签页独立管理自己的 `omp --mode rpc` 后台子进程，互不冲突。
- **状态持久化与快照切换**：在不同标签页之间丝滑切换，流式生成中的输出与上下文状态均被完整保留。
- **全新会话指令**：支持 `/new` 指令一键开启全新会话，历史会话安全保存在磁盘中。
- **模型与快捷指令面板**：支持通过快捷键呼出两级视图命令桥（Command Bridge），支持在状态栏直接轮换或选取不同模型。
- **思考等级调节**：支持便捷切换模型的思考层级（`off / minimal / low / medium / high / xhigh`）。
- **实时指标感知**：配备流式输出实时 Token 速率仪表盘（Tokens/sec Sparkline）与上下文窗口占用率指示条。

### 2. 计划与看板模式 (Plan Mode & Kanban)
- **草稿先行工作流**：在对话窗口中即可激活先拟定计划、确认后再执行的 Draft-before-write 流程。
- **意图引导提示**：第一条消息自动注入意图结构化框架，后续回复持续引导计划生成。
- **行内交互式批注**：计划中的每个段落均支持点击添加批注，确认前可全面 Review。
- **一键批准与联动**：点击批准按钮会将所有批注整合成单条反馈发送，并同步激活任务看板。
- **智能看板联动**：根据 Agent 发起的 `todo_write` 工具调用，自动生成任务进度看板（运行中 / 已完成）。

### 3. 工具执行卡片 (Tool Cards)
- **实时流式反馈**：对 `eval`（JS/Python 执行内核）与 `bash` 系统命令行调用提供无延迟的流式输出展示。
- **语法高亮展现**：代码单元执行完毕后，通过 highlight.js（atom-one-dark 主题）进行高质感代码高亮。
- **交互式 Diff 查看器**：针对 `edit` 代码修改工具，提供类似 IDE 的平滑动画与逐行统一 Diff 对比视图。
- **专用工具卡片支持**：涵盖搜索预览（Search）、读取摘要（Read）、子任务板（Task）、交互询问（Ask）等多种专用工具卡片。
- **鲜明的工具色彩体系**：为每种工具定义了专属的视觉图标与主题配色。

### 4. 密集会话小地图 (Session Minimap)
- **信息密集型网格**：采用高密度网格设计（单个单元格代表一条消息），可轻松容纳 200+ 条超长多轮对话。
- **Token 消耗热力图**：Assistant 单元格依据所消耗的 Token 数量按对数（Log）平滑缩放亮度，高开销回合一目了然。
- **悬停高亮定位**：鼠标悬停任意格子，聊天主窗口对应的对话气泡会以光环高亮。
- **一键平滑跳转**：点击任意格子，聊天窗口自动平滑滚动定位到对应消息。
- **丰富悬浮提示（Tooltip）**：悬停即可查看消息角色、输入/输出 Token 明细、工具耗时及内容预览。

### 5. 原生极轻桌面底座 (Native Shell)
- **极小资源占用**：基于 Tauri 2 + Rust 后端构建，彻底抛弃 Electron，整包体积约 8 MB 级。
- **零外部 CDN 依赖**：前端 React 18、ReactDOM、Babel、Marked 等均本地化内嵌，完全支持离线运行。
- **精致无边框窗口**：支持 Windows 与 macOS 风格的无边框红绿灯窗口控制栏与拖拽交互。
- **原生文件选择**：原生级系统目录挑选器，用于打开工作区项目。
- **严苛的安全沙箱**：配置严格的内容安全策略（CSP），隔离不必要的外部风险。

### 6. 个性化与微调面板 (Tweaks & Customization)
- **多套预设主题**：Aurora（极光）、Phosphor（荧光绿）、Daylight（明亮）等精美配色。
- **布局与密度调节**：支持舒适（Cozy）、紧凑（Compact）、高密（Dense）三种 UI 密度。
- **自适应与自定义重音色**：提供多种预设重音色彩及自定义色板选择。

---

## 系统环境要求 (Requirements)

| 工具 / 环境 | 推荐版本 |
|------|---------|
| [Rust](https://rustup.rs/) | 稳定版 stable (1.77+) |
| [Node.js](https://nodejs.org/) | 18+ |
| [Tauri CLI](https://tauri.app/start/prerequisites/) | 2.x |
| [oh-my-pi](https://github.com/can1357/oh-my-pi) | 14.8+（需将 `omp` 保持在环境变量 PATH 中） |

> **提示**：确保终端可以全局执行 `omp` 命令。在 Windows 环境下，`omp.exe` 常见安装路径为 `%LOCALAPPDATA%\omp\omp.exe`。

---

## 本地快速开始 (Getting Started)

```bash
# 1. 克隆代码仓库
git clone https://github.com/wait-bad/omp-desktop-D.git
cd omp-desktop-D

# 2. 安装前端开发依赖
npm install

# 3. 启动本地开发模式（支持热重载，自动编译 Rust 后端并唤起客户端）
npm run dev

# 4. 构建生产安装包
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
│   ├── react.development.js    # 内置 React 18（离线无 CDN 依赖）
│   ├── marked.min.js           # Markdown 离线解析器
│   ├── highlight.min.js        # 语法高亮引擎
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

## 开源协议与鸣谢

本项目遵循开源协议，代码与设计成果归属于原作者及社区贡献者共同所有。欢迎体验与交流！
