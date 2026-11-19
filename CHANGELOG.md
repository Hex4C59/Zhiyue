# 变更记录

## 未发布

- 删除失效的分享导出脚本：`scripts/export_share.py` 仍引用 TypeScript 迁移前的 `.mjs` 路径，运行即报“源文件不安全或缺失”，且它本身从未入库。同时移除 `package.json` 的 `share` 命令、`app/README.md` 与 `tools/README.md` 中的相关入口，`.gitignore` 去掉对应条目。
- 前端构建产物不入库：`app/web/dist/` 加入 `.gitignore` 并移出版本控制，Vue 许可证副本改由 `npm run build:web` 从 `node_modules/vue/LICENSE` 生成；`startServer` 在产物缺失时给出明确提示。
- 全部 JavaScript 源码迁移到 strict TypeScript：服务端、测试、维护脚本经 `tsc` 输出到 `build/`（不入库）；前端 lib 与 14 个 Vue 组件改用 TS 和 `vue-tsc`，Vite 直接编译 `frontend/main.ts`。新增 `npm run typecheck`，`npm test` 会先构建服务端与前端。Tauri 开发与安装版的服务端入口改为 `app/web/src/server.js`（发布包内由 `build/app/web/src` 复制）。
- 助手设置新增思考强度与上下文压缩：按默认模型的能力列出 `off`–`max` 档位，保存到 Pi 全局设置并同步当前会话；自动摘要开关与预留、保留近期 token 写入 `~/.pi/agent/settings.json`。模型返回的推理内容以折叠块随消息显示。
- 修复编译产物定位：`downloaderScript` 改为向上查找 `app/downloader/run.py`，下载任务与虚拟环境探测不再落到 `build/app/downloader`；预览与桌面测试统一使用仓库根定位夹具。`start-desktop.ps1` 在未设置 `PDFTOPPM` 时指向项目内 `tools/poppler`。
- 界面状态（上次会话、当前文献、三栏宽度）改存文献库 `.zhiyue/data/ui.json`，新增 `GET/PATCH /api/ui`；不再使用按端口隔离的 `localStorage`，本地服务每次启动换端口导致的恢复失效随之消失。
- 桌面壳启动前清理旧端口遗留的 `Local Storage` 目录（一次性，带标记）；`UiStateStore` 每次读写前重读磁盘合并字段，多实例交错写不再互相覆盖。
- 修复斜杠命令丢失选中文献：`/api/chats/:id/commands` 之前只读取 `text`，技能回合的提示词因此恒为“当前选定文献 `[]`”。命令与普通消息现在共用 `normalizePaperContext` 校验与上下文写回，新增 `activePaperId`、`pdfPage`，提示词标注阅读器当前打开的文献、当前页与各篇总页数。
- 助手支持斜杠命令：输入框以 `/` 开头时显示可搜索命令菜单，↑↓ 选择、Enter/Tab 插入、Esc 清空。`/help`、`/skills`、`/compact` 由服务端直接回执，不进入模型上下文；`/skill:<名称>` 把技能说明展开成本轮要求发给模型，聊天记录只留用户输入的单行指令。技能可用 `disable-model-invocation: true` 只保留命令入口。命令目录来自 `GET /api/commands`，执行走 `POST /api/chats/:id/commands`；`/compact` 调用 Pi 的 `thread/compact`。
- 助手支持库内技能：从 `.zhiyue/skills/<名称>/SKILL.md` 扫描 frontmatter，系统提示只列名称、描述与路径，新增 `read_skill` 工具按需读取技能目录内的 `.md`/`.txt`；新库首次启动复制随包技能，设置面板可查看并重新扫描。随包两个技能分工：`paper-experiments` 总结论文并拆解实验设计（数据、基线、训练与推理设置、主结果、消融、复现清单），`paper-reading` 判断是否值得精读并给出取舍结论。
- 阅读笔记可删除：笔记模式下工具栏出现删除按钮，确认后调用 `POST /api/notes/delete`，由 `Library.deleteNote` 把文件移到 `.zhiyue/trash/notes/`（带时间戳前缀）并返回刷新后的索引；只接受 `notes/` 下的 `.md`/`.txt`，拒绝路径穿越、符号链接与其他目录，误删可从回收站手动找回。
- 移除独立浏览器启动入口（`start-web.cmd`、`start-web.ps1` 和 `npm start`）；桌面界面由 Tauri 外壳启动，历史提交可能仍包含旧入口。
