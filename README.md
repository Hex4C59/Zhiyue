# Zhiyue

集文献管理、PDF 阅读与 AI 研究助手于一体的本地工作台。

源码仓库：[Hex4C59/Zhiyue](https://github.com/Hex4C59/Zhiyue)。

项目按程序、私人文献、本机工具和分享交付分为四部分。

| 目录 | 内容 | 入口 |
| --- | --- | --- |
| `app/` | 网站、启动脚本、下载核心和测试 | [程序说明](app/README.md) |
| `library/` | 论文、笔记、综合分析、索引、下载批次、成果、私有资料及临时文件 | [文献总索引](library/README.md) |
| `tools/` | 本机第三方安装和机构登录环境 | [本机工具导航](tools/README.md) |
| `releases/` | 已经过隐私检查的分享包与独立分享副本 | [分享检查记录](library/.zhiyue/docs/分享版隐私检查_20261116.md) |

根目录仅保留本导航、协作规则、Git 忽略规则、统一命令和网站启动入口。

```powershell
npm start
npm test
npm run test:downloads
npm run test:desktop
npm run doctor
```

推荐在 PowerShell 运行 `.\start-web.cmd`，或双击该文件，打开 <http://127.0.0.1:8765>。此入口仅对启动子进程设置执行策略，不修改用户或系统的持久执行策略；支持 `-Port 8766` 和 `-NoBrowser`。`./start-web.ps1` 仍可在允许执行该脚本的环境中使用。下载任务可直接运行 `.\app\scripts\download.ps1 --help`。

右侧研究助手固定使用 **Pi Agent**，复用本机 Pi 的模型与登录配置；可以检索文献、读取原文页、发起下载，并把总结提交为需要用户确认的笔记草稿。旧 Codex 聊天数据仍保留在 `library/.zhiyue/data/chats.json`，网站不再读取或显示。详见[助手接入与使用](app/web/README.md#阅读和提问)。

查找论文、编号与阅读成果请进入 [library/README.md](library/README.md)。前端采用 Vue 3，修改组件后需运行 `npm run build:web`；日常启动使用随项目保存的构建产物。修改程序请进入 [app/README.md](app/README.md)。文献目录中的 `papers/`、`notes/` 等相对路径，均以 `library/` 为基准。

Windows 桌面版使用 Tauri 2 封装同一网站，程序在 `app/desktop/`，带原生窗口和托盘。`npm run desktop:dev` 用于开发调试；`npm run desktop:build` 生成 NSIS 安装包，输出在 `app/desktop/src-tauri/target/release/bundle/`，可选做 Authenticode 签名并生成更新签名，构建变量见[程序说明](app/README.md)。安装版首次启动会自动创建默认文献库 `文档/Zhiyue/library`（可用 `LITERATURE_LIBRARY` 指定其他位置），包括目录骨架、模板说明和空索引；启动后可在侧栏新建或重命名分类文件夹，也可在文献页选择本机 PDF，核对题名与作者后归档入库。Pi Agent 登录配置、Python 与 Poppler 仍使用本机安装。

`library/`、`tools/` 的本机安装和 `releases/` 均按本地资料处理，不进入 Git。只发送检查过的软件分享包，不要整体发送本项目。新的分享版可用 `npm run share -- --name new-name` 生成。

当前可分享交付（仅本机完整工作区）：[2026-11-16 软件包，含 Vue 前端](releases/packages/literature-workbench_20261116_vue_share.zip)。旧交付集中保存在 `releases/`，不覆盖历史版本。

本次目录迁移的清单、文本修改前备份和 PDF 校验记录保存在 `library/.zhiyue/tmp/layout_migration_20261105/`。迁移没有删除论文、笔记、申请材料、聊天或旧交付。
