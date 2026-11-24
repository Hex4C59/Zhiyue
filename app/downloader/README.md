# Zhiyue 文献工具

入口：[download.ps1](../../scripts/download.ps1)。完整操作：[论文下载流程](../../library/.zhiyue/docs/论文下载流程.md)。渠道、权限和故障：[下载渠道与问题处理](../../library/.zhiyue/docs/下载渠道与问题处理.md)。

## 快速入口

在项目根目录的 PowerShell 中运行：

```powershell
.\scripts\download.ps1 --help
.\scripts\download.ps1 doctor
.\scripts\download.ps1 status
```

Python入口为`run.py`，默认以本工具所在项目为根目录，和当前终端工作目录无关。可通过全局参数`--root`指定另一份文献库；该目录须有README文献索引表。配置文件为[config.json](config.json)，只放选项和环境变量名称。

## 命令

| 命令 | 用途 |
| --- | --- |
| doctor [--network] | 检查Python、pypdf、curl、Poppler、InstSci入口及凭据是否已配置；可选一次Crossref只读请求 |
| catalog | 读取README和全部来源侧车，生成catalog的JSON、CSV及待核实项；不改写原来源 |
| migrate | 将既有第01至06组关联到统一批次；已存在的新台账保留，不重新覆盖 |
| import INPUT --batch NAME | 导入新清单，可指定--category；目录须已存在，保留输入文件和组内原序号 |
| status [--batch NAME] | 查看全部或单批任务状态 |
| download --batch NAME | 查重、补充元数据并尝试下载；支持--item、--limit、--dry-run、--channel及--retry |
| set --batch NAME --item ID | 补充准确DOI、题名、作者、版本、资料类型、候选链接或已有文献编号 |
| attach --batch NAME --item ID --file PDF | 明确导入一个手动取得的文件，复制到暂存后统一核验 |
| collect --batch NAME --directory DIR | 根据首页DOI/题名批量匹配浏览器/InstSci下载结果，保留歧义项 |
| verify --batch NAME [--item ID] | 重新核验身份、全部页解析和首页末页渲染 |
| review --batch NAME --item ID --note TEXT | 完成人工查看后记录核对；可指定--accept-identity、--visual-reviewed、--type、--version |
| archive --batch NAME [--category DIR] | 归档已核验项，分配或复用L编号，保留版本及更新README/catalog；分类目录须已存在，指定的DIR会写回台账 |
| rename-category --category NAME [--subcategory NAME] --name NEW | 在库写锁下移动分类目录，同步README、来源记录、文本引用、批次台账和catalog |
| move-paper --literature-id L --category DIR | 在库写锁下把一篇文献及其来源记录移到现有分类，同步README链接、笔记与成果引用、批次台账条目、归档事务和catalog；目标同名文件时报错且不改动 |
| repair | 恢复未完成的分类改名、文献移动和归档事务；冲突只报告，不删除文件 |
| ieee --batch NAME [--submit] | 生成IEEE串行队列；明确--submit后使用现有可见InstSci机构会话 |
| pack --batch NAME | 普通分组文件夹ZIP；重复--batch可合包；--mode nested先打各组ZIP再生成外层ZIP |

每个子命令支持`--help`。`--item`接受I0001这样的条目ID或组内原序号。批量命令可用逗号列出多个条目；attach/review/set要求一次只选一个。

## 分类改名、锁与修复

分类改名由 `categories.py` 在库写锁 `.zhiyue/library.write.lock` 下执行。归档、catalog 和改名共用该锁；批次命令先取批次锁，再取库写锁。改名取锁最多等待 5 秒，归档取锁最多等待 20 秒；取不到锁返回“其他任务正在写入”。改名本身按文件量耗时，大库的顶层改名可能持续十余秒。锁文件已从旧的 `.zhiyue/catalog/.write.lock` 迁移；升级后请重启正在运行的桌面端和 CLI，避免新旧进程使用不同锁同时写入。

改名顺序为“移动目录 → 重写 README → 重写 `papers/`、`notes/`、`synthesis/`、`outputs/` 的路径 → 更新批次台账和归档事务 → 重建索引”。开始时写 `.zhiyue/data/repairs/rename/*.json`，成功后删除。中断后运行：

```powershell
.\scripts\download.ps1 repair
```

改名不会等待尚未开始的批次队列；排队任务开始后若分类已改名会失败，需要重新提交。`repair` 只续做已经移动的目录；只有旧目录时判定未移动，新旧都在时报告冲突。归档的 `prepared` 事务会重新执行归档，目标 PDF 已存在且哈希一致时继续提交，不会重复复制；`repair` 结束前会在库写锁内重建一次派生索引。

`move-paper` 只处理已经归档的 `L` 编号，目标分类必须已存在；同目录内的主文件、其他版本与 `.来源.json` 一起搬，其他目录的同编号版本留在原处并在 `other_locations` 里报告。搬完文件后改写 README 链接、`notes/`/`synthesis/`/`outputs/` 中的路径、来源记录的 `当前路径`、批次台账条目的 `file`/`source_record`、归档事务记录，并重建 catalog；批次级 `category` 不变。引用改写失败时保留 `.zhiyue/tmp/paper_moves/` 事务记录，`repair` 可续做。

`archive` 不再为缺失的分类目录执行 `mkdir`。导入前由网站按编号规则创建分类；直接调用 CLI 时需先创建目录，否则 `import` 返回“分类目录不存在”。已有批次可用 `archive --category papers/现有目录` 把台账分类改到现有目录，后续续跑沿用新分类。

## 依赖和启动器

本机验证环境：Python 3.12.14、pypdf 6.10.0、系统curl、已有Poppler及InstSci独立环境。启动器先使用本目录`.venv`，再使用PATH中的Python；`LITERATURE_PYTHON`可显式指定解释器。没有修改用户现有Python环境。

桌面安装包内置便携 Python 和[requirements.txt](requirements.txt)的依赖；独立命令行部署时，可自行创建本目录`.venv`后按[requirements.txt](requirements.txt)安装依赖。curl和Poppler为外部可执行程序；`PDFTOPPM`环境变量可以指定`pdftoppm.exe`，项目内`tools/poppler/Library/bin/pdftoppm.exe`会作为回退路径被自动使用。`doctor`会列出实际找到的路径。仅关闭渲染不能让文件通过archive的渲染要求。

## 认证配置

凭据只从当前进程环境变量读取，不扫描聊天存档，不读取浏览器Cookie，不写入来源记录、CSV或分享包。

- `ELSEVIER_API_KEY`：Elsevier调用方Key。
- `ELSEVIER_INSTTOKEN`：仅在机构明确提供时设置；不能自行生成。
- `UNPAYWALL_EMAIL`：Unpaywall要求的实际联系邮箱。
- `CROSSREF_EMAIL`：可选的Crossref联系邮箱。

当前终端隐藏输入Key的示例：

```powershell
$downloadKey = Read-Host '输入Elsevier API Key' -AsSecureString
$env:ELSEVIER_API_KEY = [System.Net.NetworkCredential]::new('', $downloadKey).Password
.\scripts\download.ps1 doctor
```

此设置只对当前终端及其子进程生效。`doctor`只报告是否配置，不显示值。不要把真实值填进`config.json`或清单。需要订阅访问的IEEE会话仍由现有InstSci维护，参见[本机说明](../../../tools/docs/InstSci_本机使用说明.md)。

## 维护代码

- `common.py`：路径边界、原子写入、锁、归一化与脱敏。
- `library.py`：兼容旧来源格式并生成全库索引。
- `batches.py`：输入解析、批次状态与历史关联。
- `transport.py`：有限重试、显式重定向、TLS与主机范围内认证。
- `providers/`：Crossref/公开链接/可选Unpaywall、Elsevier、现有IEEE入口。
- `validation.py`：PDF身份、解析与渲染，区分人工目视状态。
- `workflow.py`：查重、断点续跑、手动或目录收集。
- `archiving.py`：编号、版本、归档、事务恢复与索引更新。
- `categories.py`：分类目录校验、改名事务、引用/台账同步和修复。
- `sharing.py`：可复用的分组打包和ZIP合辑。

```powershell
npm run test:downloads
```

测试使用隔离目录和明确标记的合成PDF，涵盖错误页、截断文件、参考文献误匹配、摘要页、版本保留、查重、凭据重定向范围和ZIP成员完整性，也覆盖分类改名的引用/台账同步、锁等待、归档恢复和目录缺失时不重建，不产生正式论文编号。
