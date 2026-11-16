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
└─ templates/             文献库初始 AGENTS.md 与 README.md
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
npm run doctor
npm run share -- --name new-name
```

分享导出检查是本机维护功能，分享包不附私人检查脚本，因而分享版无 share 命令。

推荐使用根目录的 `./start-web.cmd` 启动网站，避免旧版 Windows PowerShell 对本地脚本的来源或签名判断造成拦截；该入口仅对启动子进程设置执行策略。`./start-web.ps1` 转发到 `app/scripts`。网站默认读取 `library`；下载工具默认将 `library` 作为 `--root`。显式 `--root` 仍支持隔离工作区与测试。

CMD 启动入口显式调用系统 Windows PowerShell，避免 PATH 中同名程序造成差异。根目录和 app/scripts 下的 start-web.ps1 使用 UTF-8 BOM 编码，修改时应保留 BOM，以兼容 Windows PowerShell 5.1 对中文注释和字符串的解析。

网站私有状态在 `library/.zhiyue/data/`。原上传文件路径已随目录迁移更新，聊天文本及会话标识保留。PDF 渲染使用 `library/.zhiyue/cache/pdf-preview/` 下的派生缓存，不修改原文。

下载代码从 `app/downloader` 读取，配置使用同目录的 `config.json`。第三方机构入口从根 `tools/` 调用，不将浏览器会话搬入代码目录。

## 修改和检查

前端组件改 web/frontend，样式改 web/public/css，业务改 web/src/lib，HTTP 改 web/src/server.mjs，下载改 app/downloader，启动维护改 app/scripts。前端使用 Vue 3 Composition API 与 Vite，依赖由根 package-lock.json 固定；不引入路由或全局状态库。dist/app.js 随源码保存，直接启动无需安装 npm 依赖；组件修改后在根目录运行 npm run build:web。npm test 自动先构建再运行后端与 DOM 测试。路径变更须同步检查分享文件清单、默认工作区与测试。

网站静态地址为 `/js/app.js` 和 `/css/styles.css`。

先运行网站和下载测试，再检查实际库数量、PDF 预览、附件路径与新分享包空库启动。不要直接打包整个项目。
