# Zhiyue 开发与维护

## 根目录

- `app/`：应用源码和运行时模板。
- `scripts/`：启动、下载、打包和维护入口，位于项目根目录。
- `library/`：私人文献工作区。`papers/`、`notes/`、`synthesis/`、`outputs/` 对用户可见；索引、批次、内部文档、聊天、缓存和临时文件在隐藏的 `library/.zhiyue/`。
- `tools/`：本机第三方工具安装和机构登录环境。安装路径保持原样，避免损坏已有虚拟环境。
- `releases/`：packages 保存干净分享包，projects 保存对应分享副本。

根目录的 `start-desktop.cmd` 是桌面启动入口。文献总索引是 `library/README.md`。

## 程序分层

```text
app/
├─ web/
│  ├─ src/server.ts      HTTP 与服务装配（tsc 编译到 build/）
│  ├─ src/lib/            书目、助手协议、任务、预览、路径和提取
│  ├─ frontend/          Vue 3 单文件组件与状态、阅读控制器（TypeScript）
│  ├─ dist/              Vite 构建的 app.js 与 Vue MIT 许可证
│  ├─ public/index.html   Vue 挂载入口
│  ├─ public/css/         样式
│  └─ test/               本地服务与界面测试
├─ downloader/            下载、核验、归档、来源记录与测试
├─ templates/             文献库初始 AGENTS.md、README.md 与默认技能
└─ desktop/               Tauri 2 桌面外壳（Rust 窗口、托盘与本地服务进程）
   ├─ src-tauri/          Rust 程序、图标、NSIS 配置和生成的运行资源
   ├─ test/               安装布局、首次启动与导入的端到端测试
   └─ frontend/           启动页：等待本地服务就绪，失败时显示原因
```

## 统一命令

在项目根目录执行：

```powershell
# 开发、构建和测试前安装依赖（推荐 Node.js 24.15+）
npm ci
npm run build
npm run typecheck
npm test
npm run test:downloads
npm run test:desktop
npm run doctor
npm run build:node
npm run build:web
npm run desktop:dev
npm run desktop:prepare
npm run desktop:build
```

分享时可提供构建生成的 NSIS 安装包。

下载工具默认将 `library` 作为 `--root`，可显式指定其他工作区。`start-desktop.cmd` 调用系统 Windows PowerShell，并仅对启动子进程设置执行策略。根目录和 `scripts/` 下的 `start-desktop.ps1` 使用 UTF-8 BOM，供 Windows PowerShell 5.1 解析中文注释和字符串。

构建桌面版需要 Python 3.13 用于打包便携运行时；安装后的用户不需要本机 Python。构建完成后可用根目录的 `./start-desktop.cmd` 启动窗口。该入口默认将 `LITERATURE_LIBRARY` 指向本项目的 `library`，并优先将 `LITERATURE_PYTHON` 指向 `app/downloader/.venv`；可用 `-Library`、`-Python` 改为其他位置。直接运行可执行文件不会带上这些路径。

应用私有状态在 `library/.zhiyue/data/`。原上传文件路径已随目录迁移更新，聊天文本及会话标识保留。PDF 渲染使用 `library/.zhiyue/cache/pdf-preview/` 下的派生缓存，不修改原文。

下载代码从 `app/downloader` 读取，配置使用同目录的 `config.json`。第三方机构入口从根 `tools/` 调用，不将浏览器会话搬入代码目录。

## 桌面应用

桌面版由 Tauri 2 启动原生窗口和托盘，并拉起内置 Node 运行 `app/web/src/server.ts`；服务仅监听 127.0.0.1，由系统分配空闲端口，并在标准输出写入 `ZHIYUE_URL=` 握手行供窗口加载界面，关闭窗口只隐藏到托盘，托盘菜单可显示、检查更新或退出。Rust 代码在 `app/desktop/src-tauri/src/`。调试构建从仓库根定位网站源码；发布构建读取 `resources/runtime/`，该目录由 `npm run desktop:prepare` 生成并被 Git 忽略，包含网站、下载器、文献库模板、当前机器的 Node 可执行文件、便携 Python 3.13（pypdf、pdfplumber、pypdfium2）和网站的 npm 运行依赖（含项目自带的官方 Pi SDK）。安装版默认使用 `文档/Zhiyue/library`，`LITERATURE_LIBRARY` 可覆盖；Pi Agent 登录配置取用户本机，Poppler 可选，缺失时使用随包 pypdfium2 渲染。本机构建可用 `./start-desktop.cmd` 让桌面版直接使用项目文献库和虚拟环境，并在未设置 `PDFTOPPM` 时指向项目内 `tools/poppler`。

握手成功后 Tauri 每秒检查 Node 子进程：服务意外退出时窗口回到启动页，显示退出码和 stderr 最近输出，不会自动重启，需从托盘退出后重新打开。关闭窗口只隐藏；托盘退出和更新安装前用 `taskkill /T /F` 终止 Node 进程树，Windows 作业对象在桌面进程被强制结束时兜底终止 Node 及其子进程。两条退出路径都不执行任务与事务的优雅收尾（库写锁由操作系统释放），下次启动会把 `running`/`queued` 任务标为失败，流式回答标为中断，归档按事务日志用 `run.py repair` 恢复。真实安装版的验收步骤见 [桌面进程验收清单](desktop/桌面进程验收.md)。

`npm run desktop:build` 默认生成未签名安装包。以下变量只在本机构建环境设置，不写入仓库配置：

- `ZHIYUE_SIGN_THUMBPRINT`：代码签名证书指纹，设置后对可执行文件和安装包做 Authenticode 签名；可选 `ZHIYUE_SIGN_TIMESTAMP_URL` 加 RFC 3161 时间戳。自签名证书仅供本机验证，分发给他人需换成受信任 CA 签发的证书。
- `TAURI_SIGNING_PRIVATE_KEY`：更新包签名私钥（Tauri 官方变量），设置后为安装包生成同名 `.sig` 更新签名。公钥固定在 `tauri.conf.json` 的 `plugins.updater.pubkey`，应用只接受用对应私钥签名、且签名内版本号与 `latest.json` 一致的更新包。

应用启动后静默检查一次更新，失败不打扰用户；未配置更新源时启动检查直接跳过，托盘“检查更新”提示尚未配置。手动确认更新后打开独立进度窗口，显示下载百分比；下载完成才退出并启动安装器。安装器默认装到 `%LOCALAPPDATA%\Zhiyue`，目录页会沿用上次安装位置；卸载时会通过 [installer-hooks.nsh](desktop/src-tauri/nsis/installer-hooks.nsh) 清掉该记录，重新安装回到默认目录。更新源优先取运行环境变量 `ZHIYUE_UPDATE_ENDPOINT` 的 `latest.json` 地址，其次取 `tauri.conf.json` 的 `plugins.updater.endpoints`。`latest.json` 中 `windows-x86_64` 平台的 `signature` 填 `.sig` 文件内容，`url` 指向安装包；正式发布的更新源必须使用 HTTPS，发布构建会拒绝 HTTP 地址。

### GitHub Releases 自动发布

仓库包含 [`.github/workflows/release.yml`](../.github/workflows/release.yml)。推送形如 `v0.1.1` 的标签后，工作流会在 `windows-latest` 上构建 NSIS 安装包、生成更新签名、创建 GitHub Release，并上传安装包、`.sig` 和自动生成的 `latest.json`。

首次使用前在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 配置：

- `TAURI_SIGNING_PRIVATE_KEY`：更新签名私钥内容（必需）。
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`：私钥密码（私钥有密码时必需）。
- `ZHIYUE_SIGN_THUMBPRINT`：Windows Authenticode 证书指纹（可选）。
- `ZHIYUE_SIGN_TIMESTAMP_URL`：代码签名时间戳地址（可选）。

发布前把 `app/desktop/src-tauri/tauri.conf.json` 和 `package.json` 的版本改成同一版本，提交后打标签：

```powershell
git tag v0.1.1
git push origin v0.1.1
```

工作流会校验标签与 `tauri.conf.json` 版本一致。Release 必须保持为正式发布（不要勾选 Draft 或 Pre-release），`latest.json` 才会通过下面的固定地址访问：

```text
https://github.com/Hex4C59/Zhiyue/releases/latest/download/latest.json
```

将该地址写入 `ZHIYUE_UPDATE_ENDPOINT`，或写进 `plugins.updater.endpoints` 后重新构建基础安装包。仓库必须保持公开；私有仓库的 Release 资产需要登录，当前更新器不会携带 GitHub Token。若更换了签名私钥，必须先发布一个带新 `pubkey` 的完整安装包，旧安装版无法验证新私钥签出的更新。

文献库由随包本地服务在首次启动时创建：默认在 `文档/Zhiyue/library`（`LITERATURE_LIBRARY` 可覆盖）建立 `papers/`、`notes/`、`synthesis/`、`outputs/` 和隐藏的 `.zhiyue/`（索引、批次、数据、缓存、临时文件），从随包模板复制 `README.md` 与 `.zhiyue/AGENTS.md`，并写入记录数为 0 的 `文献索引.json`。已有文件不覆盖；导入前在 `papers/` 下创建所选分类，归档只向已存在的分类写入并更新索引。侧栏“分类”旁的加号可新建顶层文件夹；右键文件夹可新建子文件夹、重命名、把 PDF 导入该目录或删除空文件夹（移到 `.zhiyue/trash/categories/`），文件夹行悬停或聚焦时出现的铅笔按钮仍可重命名。这些操作 `papers/` 下的编号目录，重命名还会同步更新 README、笔记、成果、来源记录、批次台账和索引中的路径；分类只承载归档论文，不支持在分类里创建任意文本文件。窗口顶部的“导入 PDF”支持多选、选择文件夹或拖放批量导入本机 PDF（单次最多 100 个），逐条预填并编辑题名、作者、年份和 DOI，复用下载工具的导入、逐条核验与整批归档流程；PDF 内容按 SHA-256 查重，重复文件跳过并给出已有编号；文件夹导入按文件夹名预选同名分类，没有同名分类时在提交前按编号规则新建。

`npm run test:desktop` 验证安装后的首次启动与导入流程，运行前需先有 `npm run desktop:build` 的产物。测试在系统临时目录复制一份安装布局（可执行文件和 `resources/`），用随包 Node 从新位置启动服务，检查文献库骨架、模板和空索引，再通过下载器的 `import`、`attach` 和服务器归档任务离线导入一篇合成 PDF，核对编号、来源记录、README 索引和网站接口。它不运行 NSIS 安装器，也不启动 Tauri 窗口，因此不覆盖注册表、快捷方式和 WebView 界面；缺少打包产物时跳过，缺少 pypdf 或 Poppler 时只验证首次启动并注明跳过导入阶段。测试使用 `LITERATURE_PYTHON` 或 `app/downloader/.venv`；Poppler 依次取 `PDFTOPPM`、PATH 和项目内 `tools/poppler`。测试直接启动随包 Node 并显式传入 `LITERATURE_LIBRARY`，因此不覆盖桌面壳、WebView2、默认库路径定位、握手后崩溃和强制退出；这些在真实安装版上按 [桌面进程验收清单](desktop/桌面进程验收.md) 验收。

打包若在解压 NSIS 时提示 `os error 17`（不同磁盘驱动器），可把 `%LOCALAPPDATA%\tauri\nsis-3.13` 手动改名为同目录下的 `NSIS`，再把 `nsis_tauri_utils.dll` 放入 `NSIS\Plugins\x86-unicode\additional\` 后重试。目录被加密导致无法改名时，可把工具集放在其他磁盘的普通目录，用目录联接让 `%LOCALAPPDATA%\tauri\NSIS` 指向它。

WebView2 要求可执行文件所在目录的完整性级别为 Medium。旧沙箱工具可能在项目目录留下低完整性标签（Low mandatory level）和拒绝 ACE，表现为窗口空白、`msedgewebview2.exe` 在 `msedge_elf.dll` 崩溃，或启动时报 WebView2 环境创建失败（`HRESULT(0x800700AA)`，提示“请求的资源在使用中”）。遇到时先用 `icacls 目录 /grant "用户名:(OI)(CI)(WO)"` 取得写所有者权限，再运行 `icacls 目录 /setintegritylevel (OI)(CI)M`，不要用代码绕开。

## 修改和检查

前端组件改 web/frontend，样式改 web/public/css，业务改 web/src/lib，HTTP 改 web/src/server.ts，下载改 app/downloader，启动维护改 scripts/，桌面外壳与打包改 app/desktop。前端使用 Vue 3 Composition API 与 Vite，依赖由根 package-lock.json 固定；不引入路由或全局状态库。app/web/dist/ 是构建产物、不入库（含 Vue 许可证副本，由 npm run build:web 生成），检出源码后先构建再启动。安装版自带 Node 和 Pi SDK，源码开发使用 npm ci 安装开发及运行依赖。服务端、测试、脚本和前端都用 strict TypeScript：服务端改后运行 npm run build:node（或 npm run build），组件改后运行 npm run build:web。npm run typecheck 同时检查服务端 tsc 与前端 vue-tsc，npm test 自动先构建再运行后端与 DOM 测试。路径变更须同步检查分享文件清单、默认工作区与测试。

本地服务的静态资源路径为 `/js/app.js` 和 `/css/styles.css`。

先运行本地服务、界面和下载测试，再检查实际库数量、PDF 预览、附件路径与新分享包空库启动。不要直接打包整个项目。
