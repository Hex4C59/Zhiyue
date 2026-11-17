# Zhiyue 开发与维护

## 根目录

- `app/`：全部自维护程序。
- `library/`：私人文献工作区。`papers/`、`notes/`、`synthesis/`、`outputs/` 对用户可见；索引、批次、内部文档、聊天、缓存和临时文件在隐藏的 `library/.zhiyue/`。
- `tools/`：本机第三方工具安装和机构登录环境。安装路径保持原样，避免损坏已有虚拟环境。
- `releases/`：packages 保存干净分享包，projects 保存对应分享副本。

根目录只保留 README、AGENTS、.gitignore、package.json 和网站启动入口。文献总索引是 `library/README.md`。

## 程序分层

```text
app/
├─ web/
│  ├─ src/server.mjs      HTTP 与服务装配
│  ├─ src/lib/            书目、助手协议、任务、预览、路径和提取
│  ├─ frontend/          Vue 3 单文件组件与状态、阅读控制器
│  ├─ dist/              Vite 构建的 app.js 与 Vue MIT 许可证
│  ├─ public/index.html   Vue 挂载入口
│  ├─ public/css/         样式
│  └─ test/               网站测试
├─ downloader/            下载、核验、归档、来源记录与测试
├─ scripts/               启动、下载与本机维护入口
├─ templates/             文献库初始 AGENTS.md 与 README.md
└─ desktop/               Tauri 2 桌面外壳（Rust 窗口、托盘与本地服务进程）
   ├─ src-tauri/          Rust 程序、图标、NSIS 配置和生成的运行资源
   ├─ test/               安装布局、首次启动与导入的端到端测试
   └─ frontend/           启动页：等待本地服务就绪，失败时显示原因
```

## 统一命令

在项目根目录执行：

```powershell
npm start
# 开发、构建和测试前安装依赖（推荐 Node.js 24.15+）
npm ci
npm run build:web
npm test
npm run test:downloads
npm run test:desktop
npm run doctor
npm run share -- --name new-name
npm run desktop:dev
npm run desktop:prepare
npm run desktop:build
```

分享导出检查是本机维护功能，分享包不附私人检查脚本，因而分享版无 share 命令。

推荐使用根目录的 `./start-web.cmd` 启动网站，避免旧版 Windows PowerShell 对本地脚本的来源或签名判断造成拦截；该入口仅对启动子进程设置执行策略。`./start-web.ps1` 转发到 `app/scripts`。网站默认读取 `library`；下载工具默认将 `library` 作为 `--root`。显式 `--root` 仍支持隔离工作区与测试。

CMD 启动入口显式调用系统 Windows PowerShell，避免 PATH 中同名程序造成差异。根目录和 app/scripts 下的 start-web.ps1 使用 UTF-8 BOM 编码，修改时应保留 BOM，以兼容 Windows PowerShell 5.1 对中文注释和字符串的解析。

网站私有状态在 `library/.zhiyue/data/`。原上传文件路径已随目录迁移更新，聊天文本及会话标识保留。PDF 渲染使用 `library/.zhiyue/cache/pdf-preview/` 下的派生缓存，不修改原文。

下载代码从 `app/downloader` 读取，配置使用同目录的 `config.json`。第三方机构入口从根 `tools/` 调用，不将浏览器会话搬入代码目录。

## 桌面应用

桌面版由 Tauri 2 启动原生窗口和托盘，并拉起内置 Node 运行 `app/web/src/server.mjs`；服务在标准输出给出地址后窗口跳转过去，关闭窗口只隐藏到托盘，托盘菜单可显示、检查更新或退出。Rust 代码在 `app/desktop/src-tauri/src/`。调试构建从仓库根定位网站源码；发布构建读取 `resources/runtime/`，该目录由 `npm run desktop:prepare` 生成并被 Git 忽略，包含网站、下载器、文献库模板和当前机器的 Node 可执行文件。安装版默认使用 `文档/Zhiyue/library`，`LITERATURE_LIBRARY` 可覆盖；Pi Agent 登录配置、Python 和 Poppler 取用户本机安装。

`npm run desktop:build` 默认生成未签名安装包。以下变量只在本机构建环境设置，不写入仓库配置：

- `ZHIYUE_SIGN_THUMBPRINT`：代码签名证书指纹，设置后对可执行文件和安装包做 Authenticode 签名；可选 `ZHIYUE_SIGN_TIMESTAMP_URL` 加 RFC 3161 时间戳。自签名证书仅供本机验证，分发给他人需换成受信任 CA 签发的证书。
- `TAURI_SIGNING_PRIVATE_KEY`：更新包签名私钥（Tauri 官方变量），设置后为安装包生成同名 `.sig` 更新签名。公钥固定在 `tauri.conf.json` 的 `plugins.updater.pubkey`，应用只接受用对应私钥签名、且签名内版本号与 `latest.json` 一致的更新包。

应用启动后静默检查一次更新，失败不打扰用户；托盘“检查更新”会显示检查和安装结果。更新源通过运行环境变量 `ZHIYUE_UPDATE_ENDPOINT` 指定为 `latest.json` 地址，未设置时提示尚未配置。`latest.json` 中 `windows-x86_64` 平台的 `signature` 填 `.sig` 文件内容，`url` 指向安装包；正式发布的更新源必须使用 HTTPS，发布构建会拒绝 HTTP 地址。

文献库由随包本地服务在首次启动时创建：默认在 `文档/Zhiyue/library`（`LITERATURE_LIBRARY` 可覆盖）建立 `papers/`、`notes/`、`synthesis/`、`outputs/` 和隐藏的 `.zhiyue/`（索引、批次、数据、缓存、临时文件），从随包模板复制 `README.md` 与 `.zhiyue/AGENTS.md`，并写入记录数为 0 的 `文献索引.json`。已有文件不覆盖；导入和归档只在 `papers/` 下按分类创建目录并更新索引。侧栏“分类”旁的加号可新建文件夹，文件夹行悬停或聚焦时出现的铅笔按钮可重命名；两者直接操作 `papers/` 下的编号目录，重命名还会同步更新 README、笔记、成果和索引中的路径。文献页的“导入 PDF”接受本机 PDF 和题名、作者等书目信息，复用下载工具的导入、核验与归档流程；PDF 内容按 SHA-256 查重。

`npm run test:desktop` 验证安装后的首次启动与导入流程，运行前需先有 `npm run desktop:build` 的产物。测试在系统临时目录复制一份安装布局（可执行文件和 `resources/`），用随包 Node 从新位置启动服务，检查文献库骨架、模板和空索引，再通过下载器的 `import`、`attach` 和服务器归档任务离线导入一篇合成 PDF，核对编号、来源记录、README 索引和网站接口。它不运行 NSIS 安装器，也不启动 Tauri 窗口，因此不覆盖注册表、快捷方式和 WebView 界面；缺少打包产物时跳过，缺少 pypdf 或 Poppler 时只验证首次启动并注明跳过导入阶段。测试使用 `LITERATURE_PYTHON` 或 `app/downloader/.venv`，Poppler 可用 `PDFTOPPM` 指定。

打包若在解压 NSIS 时提示 `os error 17`（不同磁盘驱动器），可把 `%LOCALAPPDATA%\tauri\nsis-3.13` 手动改名为同目录下的 `NSIS`，再把 `nsis_tauri_utils.dll` 放入 `NSIS\Plugins\x86-unicode\additional\` 后重试。目录被加密导致无法改名时，可把工具集放在其他磁盘的普通目录，用目录联接让 `%LOCALAPPDATA%\tauri\NSIS` 指向它。

WebView2 要求可执行文件所在目录的完整性级别为 Medium。旧沙箱工具可能在项目目录留下低完整性标签（Low mandatory level）和拒绝 ACE，表现为窗口空白、`msedgewebview2.exe` 在 `msedge_elf.dll` 崩溃。遇到时先用 `icacls 目录 /grant "用户名:(OI)(CI)(WO)"` 取得写所有者权限，再运行 `icacls 目录 /setintegritylevel (OI)(CI)M`，不要用代码绕开。

## 修改和检查

前端组件改 web/frontend，样式改 web/public/css，业务改 web/src/lib，HTTP 改 web/src/server.mjs，下载改 app/downloader，启动维护改 app/scripts，桌面外壳与打包改 app/desktop。前端使用 Vue 3 Composition API 与 Vite，依赖由根 package-lock.json 固定；不引入路由或全局状态库。dist/app.js 随源码保存，直接启动无需安装 npm 依赖；组件修改后在根目录运行 npm run build:web。npm test 自动先构建再运行后端与 DOM 测试。路径变更须同步检查分享文件清单、默认工作区与测试。

网站静态地址为 `/js/app.js` 和 `/css/styles.css`。

先运行网站和下载测试，再检查实际库数量、PDF 预览、附件路径与新分享包空库启动。不要直接打包整个项目。
