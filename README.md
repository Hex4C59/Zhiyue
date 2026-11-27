# Zhiyue

本地优先的文献管理、PDF 阅读与 AI 研究助手工作台。

在 Windows 桌面应用中浏览自己的论文库：连续阅读 PDF、记录笔记与阅读进度、按 DOI 或题名批量下载并核验归档，并在右侧与 AI 研究助手（[Pi Agent](https://github.com/earendil-works/pi)）讨论论文、生成笔记草稿。服务只监听 `127.0.0.1`，文献与状态保存在本机；提问时选中文献的索引、助手实际读取的页文本与附件内容会发送给你配置的模型服务，发送范围与确认方式见[架构说明](ARCHITECTURE.md#模型上下文与数据外发)。

- **桌面版**：Tauri 2 原生窗口与托盘，使用 Vue 3 界面和内置 Node.js 服务，通过 Windows NSIS 安装包分发
- **文献工具**：Python 命令行，负责下载、核验、编号归档与索引维护

## 功能特性

- **文献库浏览**：按主题分类、年份、阅读进度、收藏筛选，支持题名／作者／L 编号搜索；分类对应真实目录，可在界面新建顶层/子文件夹、重命名、删除空文件夹，或右键把 PDF 导入该目录；文献卡片可拖动到左侧任意文件夹（含子文件夹）直接移动分类。
- **连续阅读**：PDF 页面纵向排列跨页滚动，Ctrl+滚轮缩放，透明文字层支持选择复制；可切换 Markdown 笔记或浏览器原生阅读器，笔记可删除（移入 `.zhiyue/trash/notes/` 回收站）。
- **中文精读翻译**：可在阅读器翻译单篇，也可在文献列表点击「批量翻译」，选择当前筛选范围内的多篇 PDF 和翻译模型后依次处理。本机 MinerU 解析英文论文的结构、LaTeX 公式和图表，模型翻译正文与图表标题。译本保留原文标题、公式、表格和参考文献，支持正文引用跳转、原文与译本左右对照、导出中文 Markdown；已有有效译本默认跳过，失败项可单独重试。
- **专注阅读**：可单独折叠文献列表或助手栏，也可开启「专注模式」，一键收起分类、文献列表和助手栏。
- **批量导入**：多选文件、整个文件夹或拖放导入本机 PDF（单次最多 100 个），逐条核对书目后归档，SHA-256 查重避免重复入库。
- **下载任务中心**：按 DOI／题名创建批次，经公开来源、Elsevier API 或机构渠道下载，自动核验 PDF 身份、解析与渲染，仅归档通过核验的条目，断点可续跑。
- **AI 研究助手**：基于官方 Pi SDK 的流式问答，支持论文上下文、图片与文件附件、历史会话；可加载文献库 `.zhiyue/skills/` 中的指令型技能，按需读取技能说明，随包提供 `paper-experiments`（总结论文并拆解实验设计）、`paper-reading`（判断是否值得精读）、`paper-translation`（学术论文段落精翻与术语对照）与 `paper-organize`（根据笔记或中文译文整理分类）四个技能；可检索文献、读取任意已索引文献的页文本、发起下载；可列出、新建、改名分类或把单篇文献移到其他分类，删除空分类需在聊天里点确认；输入框支持斜杠命令，`/help`、`/skills`、`/compact` 由网站直接处理，`/skill:<名称>` 强制套用某个技能流程；在“模型与密钥”中可更换默认模型、填写 API 密钥并调整思考强度与上下文压缩阈值，推理内容在消息内折叠显示；笔记以草稿形式经用户确认后保存。
- **智能归类**：根据当前论文的笔记或已完成中文译文，优先匹配已有分类，必要时提出新目录。确认卡片支持逐项勾选、执行和取消，操作结果保留在对话中，并同步给助手的后续回答。
- **索引与来源记录**：每篇文献分配固定 `L001` 式编号，`.来源.json` 记录下载与校验历史，README 索引与目录同步更新。

## 环境要求

| 组件 | 要求 |
| --- | --- |
| 操作系统 | Windows 10/11（启动脚本与安装包面向 Windows） |
| Node.js | 源码开发与构建需要 ≥ 22（推荐 24.15+），安装版内置 |
| Python | 3.13（源码运行与打包需要；安装版已内置便携 Python 3.13） |
| Poppler | 可选。`pdftoppm` 用于页面渲染；优先用 `PDFTOPPM` 指定，项目内 `tools/poppler/Library/bin/pdftoppm.exe` 会被自动使用，缺失时安装版使用随包 `pypdfium2` 渲染 |
| Rust | 仅构建桌面版时需要（Tauri 2） |

Python 依赖见 [app/downloader/requirements.txt](app/downloader/requirements.txt)（pypdf、pdfplumber、pypdfium2）。运行 `npm run doctor` 可检查本机各项依赖是否就绪。桌面安装包会从 Python 官网下载并内置便携 Python，不需要用户另装 Python。

## 快速开始

运行 Windows NSIS 安装包，再从开始菜单打开 Zhiyue。首次启动会在 `文档/Zhiyue/library` 初始化文献库。已有文献库可通过 `LITERATURE_LIBRARY` 指定。使用源码时，按下文的桌面构建步骤生成安装包。

### 配置 Python 环境（下载与文字层功能）

```powershell
python -m venv app\downloader\.venv
app\downloader\.venv\Scripts\pip install -r app\downloader\requirements.txt
npm run doctor
```

源码环境优先使用 `LITERATURE_PYTHON` 指定的解释器，其次是项目虚拟环境和 PATH。安装版优先使用随包便携 Python，`LITERATURE_PYTHON` 可覆盖。

### 启用 AI 助手（可选）

桌面安装包自带官方 Pi SDK（`@earendil-works/pi-coding-agent`）。在助手面板的“模型与密钥”中填写 API 密钥并选择默认模型，也可在终端运行 `pi` 完成账号登录。模型与登录配置读取本机 `~/.pi/agent`（可用 `PI_CODING_AGENT_DIR` 指定）。未配置时文献浏览与下载不受影响。

### 启用中文精读翻译（可选）

用 [uv](https://docs.astral.sh/uv/getting-started/installation/) 准备独立的 MinerU（4.x）运行环境并预下载本地模型。源码版和安装版共用此位置；`ZHIYUE_MINERU_CMD` 可指定已安装的 `mineru-kit` 可执行文件。应用只调用 `mineru-kit parse` 做本机离线解析，不使用依赖后台服务、默认走 mineru.net 远程解析的 `mineru` 命令。

```powershell
$mineruEnv = Join-Path $env:LOCALAPPDATA 'Zhiyue\mineru\venv'
uv venv --python 3.13 $mineruEnv
uv pip install --python (Join-Path $mineruEnv 'Scripts\python.exe') "mineru[core]"
& (Join-Path $mineruEnv 'Scripts\mineru-kit.exe') models download --tier standard --source modelscope
```

在「模型与密钥」中配置 Pi 模型，再打开论文。阅读器可搜索服务商并单独选择翻译模型，未选择时沿用 Pi 默认模型。点击「翻译成中文」后，MinerU 在本机（支持 NVIDIA GPU 加速）把 PDF 解析为结构化 Markdown，正文、图表标题及用于统一术语的论文题名与短摘录会发送给所选模型。译本保留作者信息、章节标题、独立公式、表格与参考文献。完成后可在阅读器顶部切换「原文 PDF / 中文精读 / 左右对照」，也可导出中文 Markdown。已有译本时可点「重新生成中文」，生成期间、取消后或失败后仍可阅读和导出上一次成功的译本。

在文献列表点击「批量翻译」，可对当前分类、搜索、筛选和排序得到的文献一次选择多篇 PDF，每批最多 1000 篇。此选择独立于助手上下文，不受 6 篇限制。单篇与批量入口共用翻译模型偏好；提交后固定所选模型，服务端按提交顺序逐篇处理，失败后继续下一篇。默认跳过与当前原文匹配的已完成译本，无论旧译本使用哪个模型；勾选「重新生成已有译本」可重新翻译。

顶部「翻译任务」显示逐篇状态和已处理数量，并分别统计已生成、已跳过、失败和已取消。可取消批次，结束后点「重试未完成」只处理失败或取消项。取消运行项会等待解析、模型请求和临时目录清理；正在保存的译本继续完成发布。关闭翻译窗口、切换页面、刷新页面或关闭到托盘均不停止队列。队列与批次历史只保留到本地服务退出，应用重启后需重新选择原范围提交，默认跳过已完成译本以继续剩余论文。

## 桌面版（Windows）

桌面窗口使用 WebView2 显示 Vue 界面。关闭窗口时应用隐藏到托盘，托盘菜单可显示窗口、检查更新或退出。本地服务在握手后意外退出时会回到启动页显示原因，但不会自动重启，需要从托盘退出后重新打开；强制结束桌面进程会一并终止随包 Node，正在运行的任务在下次启动时标为中断。

```powershell
npm ci
npm run desktop:dev     # 开发调试
npm run desktop:build   # 生成 NSIS 安装包
```

安装包输出在 `app/desktop/src-tauri/target/release/bundle/`。安装版首次启动会在 `文档/Zhiyue/library` 创建默认文献库（`LITERATURE_LIBRARY` 可覆盖）；Pi SDK 和便携 Python 随安装包分发；模型登录仍使用用户配置，Poppler 缺失时用随包 pypdfium2 渲染。

本机构建后可用 `.\start-desktop.cmd` 启动，它默认把文献库指向项目内 `library/`、Python 指向 `app/downloader/.venv`（`-Library`、`-Python` 可改）。代码签名、更新签名与更新源等构建变量见 [app/README.md](app/README.md)。推送 `v*` 标签会触发 GitHub Actions 自动构建并发布更新，配置见 [GitHub Releases 自动发布](app/README.md#github-releases-自动发布)。

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
npm ci                  # 安装依赖（含 Vue、Vite、Tauri CLI、Pi SDK、TypeScript）
npm run build           # 编译服务端与脚本到 build/，再构建前端 dist/app.js
npm run typecheck       # 服务端 tsc 与前端 vue-tsc 类型检查
npm test                # 本地服务与 DOM 测试（自动先构建）
npm run test:downloads  # 下载工具测试（隔离目录与合成 PDF）
npm run test:desktop    # 安装布局与首次启动测试（需先 desktop:build）
npm run doctor          # 本机依赖体检
```

服务端、测试、维护脚本与前端均为 strict TypeScript：`npm run build:node` 用 `tsc` 输出到 `build/`（不入库），前端由 Vite 直接编译 `frontend/main.ts` 与 Vue 单文件组件到 `dist/app.js`，并顺带生成 Vue 的许可证副本（`dist/` 整体不入库）。测试与桌面版都运行编译后的 JS，源码目录不再直接启动；缺前端产物时服务会提示先运行 `npm run build`。

前端使用 Vue 3 Composition API + Vite，不引入路由或全局状态库；`app/web/dist/` 是构建产物，不入库，检出源码后需先构建。开发约定、模块职责与桌面打包细节见 [app/README.md](app/README.md)，界面使用与测试说明见 [app/web/README.md](app/web/README.md)。

## 隐私与数据

- 服务仅监听 `127.0.0.1`。Host、Origin、跨站标记与资料路径校验只用于排除浏览器跨源请求和资料越界，不是登录鉴权：同机的其他程序可以直接调用这些接口读取文献、提交任务或管理模型密钥。
- PDF、笔记、聊天记录、上传文件与下载凭据均保存在本机；仓库通过 `.gitignore` 排除全部个人资料。
- AI 助手并非默认离线：提问时所选论文索引、读取的原文内容、图片与附件文字会发送给你在 Pi 中配置的模型服务，遵循该服务的网络、计费与数据处理设置。选中文献只决定初始提示，助手可读取任何已索引文献的页文本；提示中还包含文献库根目录、选中文献与附件的本机绝对路径。下载工具会直接建批次并在自动核验后归档，正式笔记需在界面确认后才写入；助手新建/改名分类和移动文献会直接执行，删除分类需在聊天卡片确认。
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