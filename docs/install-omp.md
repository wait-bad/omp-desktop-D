# 📖 oh-my-pi（omp）小白安装教程

`omp-desktop-D` 只是桌面外壳，真正干活的是命令行智能体 **oh-my-pi**（命令名：`omp`）。

**请先装好 `omp`，再打开本客户端。** 如果终端里敲不出 `omp`，桌面端会启动失败或无法对话。

官方仓库：[can1357/oh-my-pi](https://github.com/can1357/oh-my-pi) · 官网：[omp.sh](https://omp.sh)

---

## 你需要准备什么

| 项目 | 说明 |
|------|------|
| 操作系统 | Windows 10/11、macOS 或 Linux 均可 |
| 网络 | 能访问 GitHub / omp.sh（国内网络可能需要稳定一点） |
| 权限 | Windows 建议用**普通用户 PowerShell**，第一次安装脚本时如被拦截，选「允许」 |
| 桌面端版本 | 建议 `omp` **14.8 及以上** |

> 用官方安装脚本时，**不必先装 Node.js / Rust**。  
> 只有走 `bun install -g` 那条路时，才需要 [Bun](https://bun.sh)（≥ 1.3.14）。

---

## 第一步：打开终端

### Windows（推荐）

1. 按键盘 `Win`，输入 **PowerShell**。
2. 点开 **Windows PowerShell** 或 **终端**。
3. 看到类似 `PS C:\Users\你的用户名>` 就可以了。

> 不推荐用「命令提示符 CMD」跑安装脚本，容易踩坑。请用 PowerShell。

### macOS

打开 **「终端」（Terminal）**。

### Linux

打开你平时用的终端即可。

---

## 第二步：安装 omp（选一种即可）

### 方式 A：官方一键脚本（最推荐，适合小白）

**Windows（PowerShell）——整行复制，回车：**

```powershell
irm https://omp.sh/install.ps1 | iex
```

含义：从官网下载安装脚本并立刻执行。脚本会把 `omp.exe` 放到本机（常见路径见下文），并尽量写入 PATH。

**macOS / Linux：**

```sh
curl -fsSL https://omp.sh/install | sh
```

装完后：

1. **关掉当前终端窗口，再开一个新的**（让 PATH 生效）。
2. 进入第三步做验证。

---

### 方式 B：其他安装渠道（可选）

按你熟悉的工具选一条即可，**不要重复装好几遍**。

| 渠道 | 命令 |
|------|------|
| Homebrew（macOS / Linux） | `brew install can1357/tap/omp` |
| Bun 全局包 | `bun install -g @oh-my-pi/pi-coding-agent` |
| Nix 临时运行 | `nix run github:can1357/oh-my-pi` |
| Nix 装进当前 profile | `nix profile install github:can1357/oh-my-pi` |
| mise 钉版本 | `mise use -g github:can1357/oh-my-pi` |

---

## 第三步：验证有没有装成功（必做）

**新开一个终端**，输入：

```powershell
omp --version
```

### 成功长什么样

终端会打印一串版本号（例如 `14.x.x` 或类似文字）。  
**只要不是报错、能认出 `omp` 这个命令，就算成功。**

### 失败长什么样

- `'omp' 不是内部或外部命令`
- `omp: command not found`
- `无法将“omp”项识别为 cmdlet、函数、脚本文件或可运行程序的名称`

说明：程序可能装上了，但系统还找不到它。请看下面「常见问题」。

---

## 第四步：Windows 常见安装位置

官方安装器在 Windows 上通常会把可执行文件放到：

```text
%LOCALAPPDATA%\omp\omp.exe
```

展开后类似：

```text
C:\Users\你的用户名\AppData\Local\omp\omp.exe
```

检查方法（PowerShell）：

```powershell
Test-Path "$env:LOCALAPPDATA\omp\omp.exe"
Get-Command omp -ErrorAction SilentlyContinue | Format-List
```

- 第一个命令返回 `True`：文件在。
- 第二个命令能列出 `Source`：PATH 已经通了。

`omp-desktop-D` 启动会话时会去 PATH 里找 `omp`。PATH 通了，桌面端才能拉起后台智能体。

---

## 第五步：装好后怎么配合桌面端使用

1. 确认 `omp --version` 成功。
2. 到本仓库 [Releases](https://github.com/wait-bad/omp-desktop-D/releases/latest) 下载：
   - **安装包**：`OMP.Desktop_0.1.2_x64-setup.exe`（推荐）
   - **便携版**：`omp-desktop.exe`（双击即用）
3. 打开桌面端，选工作区文件夹，开始对话。
4. API Key、模型、中转站可以在桌面端的 **API / 模型管理** 里配置；也可以按 oh-my-pi 官方方式写到用户目录配置里。

> 密钥、全局提示词、头像都在你电脑本地，**不会**跟着本仓库代码上传到 GitHub。

---

## 常见问题（小白必看）

### 1. 提示找不到 `omp` 命令

按顺序试：

1. **完全关掉终端，再开一个新窗口**，再跑 `omp --version`。
2. **注销或重启一次电脑**（安装脚本刚写入 PATH 时经常需要）。
3. 手动看文件在不在：
   ```powershell
   dir "$env:LOCALAPPDATA\omp"
   ```
4. 若文件在、命令仍找不到：把该目录加进用户 PATH。
   - 右键「此电脑」→ 属性 → 高级系统设置 → 环境变量
   - 用户变量里选 `Path` → 编辑 → 新建，填入：
     ```text
     C:\Users\你的用户名\AppData\Local\omp
     ```
   - 确定保存，**再开新终端**验证。

### 2. PowerShell 报「禁止运行脚本」

先看当前策略：

```powershell
Get-ExecutionPolicy
```

若是 `Restricted`，可仅对当前用户放宽（相对安全）：

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

然后再执行官方安装命令。不要随手改成全机 `Unrestricted`。

### 3. 安装脚本下载失败 / 很慢 / 被拦截

- 换网络、关一下过于严格的代理或公司防火墙后再试。
- 浏览器打开 [https://omp.sh](https://omp.sh) 看官网是否能访问。
- Windows Defender 弹窗时选择允许本次脚本。
- 也可改用 Homebrew / Bun / Nix 等其他渠道。

### 4. 装了好几份，不知道用的是哪一个

```powershell
Get-Command omp | Format-List *
```

看 `Source` 指向哪条路径。桌面端用的就是 PATH 里**排在最前面**的那一个。

### 5. 桌面端能打开，但一发消息就失败

优先检查：

- 终端里 `omp --version` 是否成功；
- `omp` 版本是否过旧（建议 14.8+）；
- 是否配置了可用的模型与 API Key。

### 6. Alpine Linux 特别说明

musl 预编译包会动态链接 `libstdc++` / `libgcc`，Alpine 默认没有。先执行：

```sh
apk add libstdc++ libgcc
```

再跑官方 `curl | sh` 安装。

---

## 升级 omp

以后想更新到新版本，用**当初同一种方式**再执行一次即可，例如 Windows 再跑：

```powershell
irm https://omp.sh/install.ps1 | iex
```

然后新开终端执行 `omp --version` 确认版本号变了。

---

## 相关链接

- oh-my-pi 源码：[github.com/can1357/oh-my-pi](https://github.com/can1357/oh-my-pi)
- 安装与产品页：[omp.sh](https://omp.sh)
- 本桌面端下载：[omp-desktop-D Releases](https://github.com/wait-bad/omp-desktop-D/releases/latest)
- 本桌面端主页：[wait-bad/omp-desktop-D](https://github.com/wait-bad/omp-desktop-D)
