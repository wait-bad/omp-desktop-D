# Tauri 2.0 桌面应用开发与编译完整指南 (OMP Desktop)

> 记录日期：2026-09-10  
> 项目目标：OMP Desktop (基于 Tauri 2 + Rust + React/Babel 的桌面 GUI 客户端)

---

## 1. 常见编译卡住 / 失败原因排查

1. **Rust 大型底层依赖构建耗时高**：
   - 本项目依赖了 `tauri`、`gix` (纯 Rust Git 引擎)、`notify`、`serde` 等大型 Crate。
   - 首次全量编译或下载依赖时控制台长时间没有文字输出属正常现象，后台正在编译几百个底层依赖库。
2. **命令路径与全局工具缺失**：
   - 系统若未全局安装 `cargo-tauri`，直接运行 `tauri dev` 或 `tauri build` 会报命令不存在。
   - 正确做法是使用本地安装的 `@tauri-apps/cli`，通过 `npx tauri <command>` 执行。
3. **缺少 C++ 构建工具链**：
   - Windows 环境下必须具备 Visual Studio C++ Build Tools (MSVC) 以及 WebView2 运行时。

---

## 2. 编译与运行命令速查表

### 模式 A：实时开发与热重载模式（推荐）
**工作目录**：项目根目录 (`test—agent`)
```bash
# 方式 1：使用 npx 调用本地 tauri CLI
npx tauri dev

# 方式 2：使用 npm package.json 脚本
npm run dev
```
- **特点**：启动本地开发窗口，修改前端 `src/` 文件实时生效，修改 Rust 文件自动触发增量重编译。

---

### 模式 B：纯 Rust 快速编译（直接生成 `.exe`，不打包安装器）
**工作目录**：`src-tauri` 目录
```bash
# 1. 进入 Rust 项目子目录
cd src-tauri

# 2. 编译 Debug 开发版本 (编译速度最快)
cargo build

# 或者：编译 Release 优化版本 (体积最小、运行性能最高)
cargo build --release
```
- **生成的可执行文件产物路径**：
  - Debug 版：`src-tauri/target/debug/omp-desktop.exe`
  - Release 版：`src-tauri/target/release/omp-desktop.exe`
- **使用方式**：直接双击 `.exe` 即可独立运行。

---

### 模式 C：全量打包生成 Windows 安装程序 (`.msi` / `.exe`)
**工作目录**：项目根目录 (`test—agent`)
```bash
# 全量打包为分发安装包
npx tauri build
```
- **产物位置**：`src-tauri/target/release/bundle/nsis/` 或 `bundle/msi/`

---

## 3. Tauri 2 项目结构架构要点

```text
test—agent/
├── package.json              # 前端配置，定义了 @tauri-apps/cli
├── src/                      # 前端 UI 代码 (HTML / CSS / JS / JSX)
│   ├── app-live.jsx          # 主应用容器
│   ├── live.js               # Tauri IPC 通信核心与 RPC 事件桥接
│   └── design/               # 界面组件库与设置中心 (SettingsModal)
└── src-tauri/                # Rust 后端
    ├── Cargo.toml            # Rust 依赖声明 (tauri, gix, notify, serde, open)
    ├── tauri.conf.json       # Tauri 窗口大小、权限、CSP 与打包配置
    └── src/
        ├── main.rs           # 应用入口，设置 windows_subsystem = "windows"
        ├── lib.rs            # Tauri Commands 注册与 App 初始化
        ├── agent/            # OMP 核心子进程生命周期与 RPC Pipe 桥接
        ├── history/          # 会话归档与历史记录管理
        └── mcp_skill.rs      # MCP 服务与 Skills 动态配置管理
```
