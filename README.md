# Zhiyue

本地优先的文献管理、PDF 阅读与 AI 研究助手工作台。

在 Windows 桌面应用中浏览自己的论文库：连续阅读 PDF、记录笔记与阅读进度、按 DOI 或题名批量下载并核验归档，并在右侧与 AI 研究助手（[Pi Agent](https://github.com/earendil-works/pi)）讨论论文、生成笔记草稿。服务只监听 `127.0.0.1`，文献与状态保存在本机；提问时选中文献的索引、助手实际读取的页文本与附件内容会发送给你配置的模型服务，发送范围与确认方式见[架构说明](ARCHITECTURE.md#模型上下文与数据外发)。

- **桌面版**：Tauri 2 原生窗口与托盘，使用 Vue 3 界面和内置 Node.js 服务，通过 Windows NSIS 安装包分发
- **文献工具**：Python 命令行，负责下载、核验、编号归档与索引维护

## 功能特性

- **文献库浏览**：按主题分类、年份、阅读进度、收藏筛选，支持题名／作者／L 编号搜索；分类对应真实目录，可在界面新建与重命名。
- **连续阅读**：PDF 页面纵向排列跨页滚动，Ctrl+滚轮缩放，透明文字层支持选择复制；可切换 Markdown 笔记或浏览器原生阅读器。
- **批量导入**：多选文件、整个文件夹或拖放导入本机 PDF（单次最多 100 个），逐条核对书目后归档，SHA-256 查重避免重复入库。
- **下载任务中心**：按 DOI／题名创建批次，经公开来源、Elsevier API 或机构渠道下载，自动核验 PDF 身份、解析与渲染，仅归档通过核验的条目，断点可续跑。
- **AI 研究助手**：基于官方 Pi SDK 的流式问答，支持论文上下文、图片与文件附件、历史会话；可检索文献、读取任意已索引文献的页文本、发起下载，笔记以草稿形式经用户确认后保存。
- **索引与来源记录**：每篇文献分配固定 `L001` 式编号，`.来源.json` 记录下载与校验历史，README 索引与目录同步更新。

## 环境要求

| 组件 | 要求 |
| --- | --- |
| 操作系统 | Windows 10/11（启动脚本与安装包面向 Windows） |
| Node.js | 源码开发与构建需要 ≥ 22（推荐 24.15+），安装版内置 |
| Python | 3.12（验证环境版本；PDF 解析、下载与文字层提取，仅浏览索引时可缺省） |
| Poppler | `pdftoppm` 用于 PDF 页面渲染，可用 `PDFTOPPM` 指定路径 |
| Rust | 仅构建桌面版时需要（Tauri 2） |

Python 依赖见 [app/downloader/requirements.txt](app/downloader/requirements.txt)（pypdf、pdfplumber）。运行 `npm run doctor` 可检查本机各项依赖是否就绪。

## 快速开始

运行 Windows NSIS 安装包，再从开始菜单打开 Zhiyue。首次启动会在 `文档/Zhiyue/library` 初始化文献库。已有文献库可通过 `LITERATURE_LIBRARY` 指定。使用源码时，按下文的桌面构建步骤生成安装包。

### 配置 Python 环境（下载与文字层功能）

```powershell
python -m venv app\downloader\.venv
app\downloader\.venv\Scripts\pip install -r app\downloader\requirements.txt
npm run doctor
```

源码环境优先使用 `LITERATURE_PYTHON` 指定的解释器，其次是项目虚拟环境和 PATH。安装版从 `LITERATURE_PYTHON` 或 PATH 选择本机 Python。

### 启用 AI 助手（可选）

桌面安装包自带官方 Pi SDK（`@earendil-works/pi-coding-agent`）。在助手面板的“模型与密钥”中填写 API 密钥并选择默认模型，也可在终端运行 `pi` 完成账号登录。模型与登录配置读取本机 `~/.pi/agent`（可用 `PI_CODING_AGENT_DIR` 指定）。未配置时文献浏览与下载不受影响。

## 桌面版（Windows）

桌面窗口使用 WebView2 显示 Vue 界面。关闭窗口时应用隐藏到托盘，托盘菜单可显示窗口、检查更新或退出。本地服务在握手后意外退出时会回到启动页显示原因，但不会自动重启，需要从托盘退出后重新打开；强制结束桌面进程会一并终止随包 Node，正在运行的任务在下次启动时标为中断。

```powershell
npm ci
npm run desktop:dev     # 开发调试
npm run desktop:build   # 生成 NSIS 安装包
```

安装包输出在 `app/desktop/src-tauri/target/release/bundle/`。安装版首次启动会在 `文档/Zhiyue/library` 创建默认文献库（`LITERATURE_LIBRARY` 可覆盖）；Pi SDK 随安装包分发，模型登录、Python 与 Poppler 仍使用本机环境。

本机构建后可用 `.\start-desktop.cmd` 启动，它默认把文献库指向项目内 `library/`、Python 指向 `app/downloader/.venv`（`-Library`、`-Python` 可改）。代码签名、更新签名与更新源等构建变量见 [app/README.md](app/README.md)。

## 命令行文献工具

桌面应用与 AI 助手复用同一套 Python 工具，也可独立使用：

```powershell
.\scripts\download.ps1 doctor            # 检查依赖与凭据配置
.\scripts\download.ps1 import list.json --batch my-batch
.\scripts\download.ps1 download --batch my-batch
.\scripts\download.ps1 archive --batch my-batch
```

完整命令（导入、下载、核验、人工核对、归档、机构渠道、打包）见 [app/downloader/README.md](app/downloader/README.md)。Elsevier、Unpaywall 等凭据只从进程环境变量读取（`ELSEVIER_API_KEY`、`UNPAYWALL_EMAIL` 等），不落盘、不进仓库。

## 项目结构

```text
Zhiyue/
├─ app/                   应用源码与运行时模板
│  ├─ web/                桌面界面、Node 本地服务与构建产物
│  ├─ downloader/         Python 文献工具：下载、核验、归档、索引
│  ├─ desktop/            Tauri 2 桌面外壳（Rust）与安装测试
│  └─ templates/          新文献库的初始 README 与协作规则
├─ scripts/               启动、下载、打包与维护入口
├─ library/               本地文献工作区（Git 忽略，首次启动自动创建）
├─ start-desktop.cmd      桌面版启动入口（本机构建后）
└─ package.json           统一 npm 命令
```

文献库内 `papers/`（原文）、`notes/`（笔记）、`synthesis/`（综合分析）、`outputs/`（成果）对用户可见；索引、批次、聊天与缓存统一在隐藏的 `.zhiyue/` 下。个人文献、聊天与本机工具不进入 Git。

## 开发

```powershell
npm ci                  # 安装依赖（含 Vue、Vite、Tauri CLI、Pi SDK）
npm run build:web       # 修改前端组件后重新构建
npm test                # 本地服务与 DOM 测试（自动先构建）
npm run test:downloads  # 下载工具测试（隔离目录与合成 PDF）
npm run test:desktop    # 安装布局与首次启动测试（需先 desktop:build）
npm run doctor          # 本机依赖体检
```

前端使用 Vue 3 Composition API + Vite，不引入路由或全局状态库；`dist/app.js` 随源码保存。开发约定、模块职责与桌面打包细节见 [app/README.md](app/README.md)，界面使用与测试说明见 [app/web/README.md](app/web/README.md)。

## 隐私与数据

- 服务仅监听 `127.0.0.1`。Host、Origin、跨站标记与资料路径校验只用于排除浏览器跨源请求和资料越界，不是登录鉴权：同机的其他程序可以直接调用这些接口读取文献、提交任务或管理模型密钥。
- PDF、笔记、聊天记录、上传文件与下载凭据均保存在本机；仓库通过 `.gitignore` 排除全部个人资料。
- AI 助手并非默认离线：提问时所选论文索引、读取的原文内容、图片与附件文字会发送给你在 Pi 中配置的模型服务，遵循该服务的网络、计费与数据处理设置。选中文献只决定初始提示，助手可读取任何已索引文献的页文本；提示中还包含文献库根目录、选中文献与附件的本机绝对路径。下载工具会直接建批次并在自动核验后归档，正式笔记需在界面确认后才写入。
- 下载凭据只从环境变量读取，不写入来源记录或分享包。

## 文档

| 文档 | 内容 |
| --- | --- |
| [app/README.md](app/README.md) | 程序结构、统一命令、桌面打包与签名 |
| [app/web/README.md](app/web/README.md) | 桌面界面、阅读与助手使用、测试说明 |
| [app/downloader/README.md](app/downloader/README.md) | 命令行工具、下载渠道与凭据配置 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 系统结构、关键流程与架构决策 |
| [CHANGELOG.md](CHANGELOG.md) | 未发布及已记录的项目变更 |
| [AGENTS.md](AGENTS.md) | 仓库维护与协作约定 |

## 许可证

本仓库暂未附带许可证文件。第三方组件（Vue、Pi SDK、Tauri 等）遵循各自的许可证。