# 变更记录

## 未发布

- 全部 JavaScript 源码迁移到 strict TypeScript：服务端、测试、维护脚本经 `tsc` 输出到 `build/`（不入库）；前端 lib 与 14 个 Vue 组件改用 TS 和 `vue-tsc`，Vite 直接编译 `frontend/main.ts`。新增 `npm run typecheck`，`npm test` 会先构建服务端与前端。Tauri 开发与安装版的服务端入口改为 `app/web/src/server.js`（发布包内由 `build/app/web/src` 复制）。
- 助手设置新增思考强度与上下文压缩：按默认模型的能力列出 `off`–`max` 档位，保存到 Pi 全局设置并同步当前会话；自动摘要开关与预留、保留近期 token 写入 `~/.pi/agent/settings.json`。模型返回的推理内容以折叠块随消息显示。
- 修复编译产物定位：`downloaderScript` 改为向上查找 `app/downloader/run.py`，下载任务与虚拟环境探测不再落到 `build/app/downloader`；预览与桌面测试统一使用仓库根定位夹具。`start-desktop.ps1` 在未设置 `PDFTOPPM` 时指向项目内 `tools/poppler`。
- 移除独立浏览器启动入口（`start-web.cmd`、`start-web.ps1` 和 `npm start`）；桌面界面由 Tauri 外壳启动，历史提交可能仍包含旧入口。
