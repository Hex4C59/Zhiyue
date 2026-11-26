import { statusError } from './errors.js';
import type {
  Chat, ChatEvent, ChatNoteDraft, ChatServiceOptions, DynamicTool, JobRecord, LibraryPaper,
} from './chatTypes.js';
import { PAPER_ID } from './chatTypes.js';

const stringSchema = { type: 'string' };
const object = (properties: Record<string, unknown>, required: string[] = []): DynamicTool['inputSchema'] =>
  ({ type: 'object', properties, required, additionalProperties: false });

export const dynamicTools: DynamicTool[] = [
  { type: 'function', name: 'library_search', description: '按题名、作者、文献编号或DOI搜索本地文献库，返回真实归档信息。', inputSchema: object({ query: stringSchema }, ['query']) },
  {
    type: 'function', name: 'read_library_doc',
    description: '读取库内 README、notes/、synthesis/、outputs/ 的 Markdown 或文本，支持 offset/limit 分段。不能读取论文 PDF；PDF 用 read_paper_pages。',
    inputSchema: object({
      path: stringSchema,
      offset: { type: 'integer', minimum: 0 },
      limit: { type: 'integer', minimum: 1, maximum: 120000 },
    }, ['path']),
  },
  {
    type: 'function', name: 'paper_outline',
    description: '返回指定论文的总页数、书目元信息和 PDF 内嵌目录。没有书签时 outline 为空，仍需按页读取核对。',
    inputSchema: object({ paperId: stringSchema }, ['paperId']),
  },
  {
    type: 'function', name: 'search_paper_text',
    description: '在单篇论文的文字层中检索关键词，返回命中页、次数和片段。片段只用于定位，不能替代整页核对。',
    inputSchema: object({
      paperId: stringSchema,
      query: stringSchema,
      maxHits: { type: 'integer', minimum: 1, maximum: 20 },
    }, ['paperId', 'query']),
  },
  { type: 'function', name: 'read_paper_pages', description: '读取指定本地论文的PDF物理页。每次最多12页，返回逐页文本与扫描页提示；不得把局部读取称为全文阅读。', inputSchema: object({ paperId: stringSchema, pages: { type: 'array', items: { type: 'integer', minimum: 1 }, maxItems: 12 } }, ['paperId', 'pages']) },
  {
    type: 'function', name: 'render_paper_page',
    description: '把指定 PDF 物理页渲染成图片，用于扫描页、图表和公式。每次只渲染一页；图片不替代文字核对。',
    inputSchema: object({
      paperId: stringSchema,
      page: { type: 'integer', minimum: 1 },
    }, ['paperId', 'page']),
  },
  {
    type: 'function', name: 'library_categories',
    description: '列出 papers/ 下的分类与子文件夹及各级文献数。改名、删除、移动文献前先用它核对真实目录名。',
    inputSchema: object({}),
  },
  {
    type: 'function', name: 'create_category',
    description: '新建分类文件夹，直接执行。parent 为已有顶层分类目录名时创建子文件夹；名称会自动加两位编号，不能包含 / \\ : * ? " < > |。',
    inputSchema: object({ name: stringSchema, parent: stringSchema }, ['name']),
  },
  {
    type: 'function', name: 'rename_category',
    description: '重命名已有分类或子文件夹，直接执行并保留编号前缀；会同步README、来源记录、文本引用、批次台账和索引。',
    inputSchema: object({ category: stringSchema, name: stringSchema, subcategory: stringSchema }, ['category', 'name']),
  },
  {
    type: 'function', name: 'delete_category',
    description: '删除空分类或空子文件夹。只接受空文件夹，执行时移入 .zhiyue/trash/categories 可找回；本工具只生成待确认操作，返回pending_confirmation后必须等用户在界面确认，不得声称已删除。',
    inputSchema: object({ category: stringSchema, subcategory: stringSchema }, ['category']),
  },
  {
    type: 'function', name: 'delete_categories',
    description: '把多个空文件夹加入同一张待确认卡片。用户确认后才移入回收站。路径可含子文件夹。',
    inputSchema: object({ categories: { type: 'array', items: stringSchema, minItems: 1, maxItems: 50 } }, ['categories']),
  },
  {
    type: 'function', name: 'move_paper',
    description: '把一篇已归档文献及其来源记录移到另一个已存在分类，直接执行；会同步README链接、笔记与成果中的路径、批次台账和索引。目标分类先用library_categories确认，不存在时先create_category。',
    inputSchema: object({ paperId: stringSchema, category: stringSchema }, ['paperId', 'category']),
  },
  {
    type: 'function', name: 'move_papers',
    description: '按目标分类分组批量移动已归档文献，最多 1000 个明确的 L 编号。已明确授权时提交一次。通过 get_download_status 查看实际结果。',
    inputSchema: object({ groups: {
      type: 'array', minItems: 1, maxItems: 1000,
      items: object({ category: stringSchema, paperIds: {
        type: 'array', items: stringSchema, minItems: 1, maxItems: 1000,
      } }, ['category', 'paperIds']),
    } }, ['groups']),
  },
  { type: 'function', name: 'download_papers', description: '用户要求下载时调用统一文献工具：查重、下载、核验并归档已通过验证的文件。返回后台任务ID；排队不等于已下载，请据状态报告。category为papers/下的相对归档目录；不传则归入情感综述调研/网站导入。IEEE可使用已有机构工具，需登录时由用户完成。', inputSchema: object({ input: stringSchema, channel: { type: 'string', enum: ['public', 'auto', 'ieee'] }, category: stringSchema }, ['input']) },
  { type: 'function', name: 'continue_download_batch', description: '续跑已有下载批次，或核验、归档、收集本批次机构下载文件。IEEE操作默认仅准备队列，用户要求实际机构获取时才传submit=true。不能将待人工核对的文件标记为核验通过。', inputSchema: object({ batch: stringSchema, action: { type: 'string', enum: ['download', 'verify', 'archive', 'ieee', 'collect'] }, submit: { type: 'boolean' } }, ['batch', 'action']) },
  { type: 'function', name: 'get_download_status', description: '查看文献下载任务的实际进度、日志及批次统计。', inputSchema: object({ jobId: stringSchema }, ['jobId']) },
  {
    type: 'function',
    name: 'read_skill',
    description: '读取文献库 .zhiyue/skills 下已加载技能的说明（SKILL.md）或技能目录内的 .md/.txt 附件。任务与技能描述匹配时先调用它，再按步骤执行；不要用它读取其他文件。',
    inputSchema: object({ name: stringSchema, file: stringSchema }, ['name']),
  },
  {
    type: 'function',
    name: 'draft_note',
    description: '把论文笔记草稿提交到网站，由用户在聊天中预览并确认后才写入 notes/。paperId 为 L 编号，title 为笔记标题，content 为完整 Markdown 正文（不要重复标题）。本工具不直接写文件；不得声称已保存，除非工具返回 saved。',
    inputSchema: object({ paperId: stringSchema, title: stringSchema, content: stringSchema }, ['paperId', 'title', 'content']),
  },
  {
    type: 'function',
    name: 'draft_document',
    description: '把跨文献综合或成果草稿提交到 synthesis/ 或 outputs/，由用户在聊天中预览并确认后才写入。paperIds 可选，用于关联文献；本工具不直接写文件，用户确认前不得声称已保存。',
    inputSchema: object({
      target: { type: 'string', enum: ['synthesis', 'outputs'] },
      title: stringSchema,
      content: stringSchema,
      paperIds: { type: 'array', items: stringSchema, maxItems: 20 },
    }, ['target', 'title', 'content']),
  },
];

export interface ToolExecutionHost {
  readonly library: ChatServiceOptions['library'];
  readonly jobs: ChatServiceOptions['jobs'];
  readonly emit: (event: ChatEvent) => unknown;
  readonly extract: ChatServiceOptions['extract'];
  readonly searchPdfText?: ChatServiceOptions['searchPdfText'];
  readonly pdfOutline?: ChatServiceOptions['pdfOutline'];
  readonly renderPage?: ChatServiceOptions['renderPage'];
  readonly readSkill?: ChatServiceOptions['readSkill'];
  createNoteDraft(chatId: string, input: { paper: LibraryPaper; title: string; content: string }): ChatNoteDraft;
  createDocumentDraft(chatId: string, input: {
    target: 'synthesis' | 'outputs'; title: string; content: string; paperIds?: string[];
  }): Promise<ChatNoteDraft>;
  proposeFolderDeletes(chat: Chat, values: unknown): Promise<Record<string, unknown>>;
}

export type ToolContentItem =
  | { type: 'inputText'; text: string }
  | { type: 'inputImage'; data: string; mimeType: string };

async function queuePaperMoves(host: ToolExecutionHost, groups: unknown): Promise<JobRecord> {
  if (!Array.isArray(groups) || !groups.length || groups.length > 1000) {
    throw statusError('请按实际目标分类分组，并明确列出要移动的文献编号。');
  }
  const entries: Array<{ category: string; ids: string[] }> = [];
  let count = 0;
  for (const group of groups) {
    if (!group || typeof group.category !== 'string' || !Array.isArray(group.paperIds) || !group.paperIds.length) {
      throw statusError('每组须指定一个目标分类和至少一个文献编号。');
    }
    count += group.paperIds.length;
    if (count > 1000) throw statusError('每次最多提交 1000 个文献编号。');
    const ids = group.paperIds.map((value: unknown) => {
      const id = typeof value === 'string' ? value.trim().toUpperCase() : '';
      if (!PAPER_ID.test(id) || id.length > 32) throw statusError(`无效的文献编号：${String(value).slice(0, 80)}`);
      return id;
    });
    entries.push({ category: group.category, ids });
  }
  const moves = new Map<string, string>();
  const targets = new Map<string, string>();
  for (const { category, ids } of entries) {
    let target = targets.get(category);
    if (!target) {
      target = (await host.library.resolveCategory(category)).path;
      targets.set(category, target);
    }
    for (const id of ids) {
      const existing = moves.get(id);
      if (existing && existing !== target) throw statusError(`${id} 同时指定了两个不同的目标分类。`);
      moves.set(id, target);
    }
  }
  return host.jobs.startPaperMove([...moves].map(([paperId, category]) => ({ paperId, category })));
}

export async function executeToolCall(
  host: ToolExecutionHost,
  chat: Chat,
  tool: string,
  args: Record<string, unknown>,
): Promise<ToolContentItem[]> {
  const paperFor = async (value: unknown): Promise<LibraryPaper> => {
    const paper = await host.library.getPaper(String(value ?? ''));
    if (!paper) throw new Error('文献不存在。');
    return paper;
  };
  let result: unknown;
  if (tool === 'library_search') {
    const lib = await host.library.getLibrary();
    const q = String(args.query || '').toLocaleLowerCase();
    result = lib.papers
      .filter((x) => JSON.stringify([x.literature_id, x.title, x.titleZh, x.authors, x.doi]).toLocaleLowerCase().includes(q))
      .slice(0, 20)
      .map(({ literature_id, title, year, doi, file, notes }) => ({ literature_id, title, year, doi, file, notes }));
  } else if (tool === 'read_library_doc') {
    result = await host.library.readDocument(args.path, args.offset, args.limit);
  } else if (tool === 'paper_outline') {
    if (!host.pdfOutline) throw new Error('当前助手未启用目录读取。');
    const paper = await paperFor(args.paperId);
    result = await host.pdfOutline(await host.library.safeFile(paper.file));
  } else if (tool === 'search_paper_text') {
    if (!host.searchPdfText) throw new Error('当前助手未启用全文检索。');
    const query = String(args.query ?? '').trim();
    if (!query || query.length > 200) throw new Error('检索词须为1至200个字符。');
    const maxHits = args.maxHits === undefined ? 20 : args.maxHits;
    if (!Number.isSafeInteger(maxHits) || (maxHits as number) < 1 || (maxHits as number) > 20) {
      throw new Error('命中数量须为1至20。');
    }
    const paper = await paperFor(args.paperId);
    result = await host.searchPdfText(await host.library.safeFile(paper.file), query, maxHits as number);
  } else if (tool === 'read_paper_pages') {
    const pages = args.pages;
    if (!Array.isArray(pages) || !pages.length || pages.length > 12 || !pages.every(Number.isSafeInteger)) {
      throw new Error('请指定1至12个PDF物理页序。');
    }
    const paper = await paperFor(args.paperId);
    result = await host.extract(await host.library.safeFile(paper.file), pages as number[]);
  } else if (tool === 'render_paper_page') {
    if (!host.renderPage) throw new Error('当前助手未启用页面渲染。');
    const page = args.page;
    if (!Number.isSafeInteger(page) || (page as number) < 1) throw new Error('请指定正整数PDF页序。');
    const paper = await paperFor(args.paperId);
    const rendered = await host.renderPage(await host.library.safeFile(paper.file), page as number);
    return [
      {
        type: 'inputText',
        text: JSON.stringify({
          paperId: paper.id, file: paper.file, page: rendered.page, totalPages: rendered.totalPages,
          mimeType: rendered.mimeType,
          note: '这是PDF页面图像，用于扫描页、图表和公式；引用前仍需核对文字与页码。',
        }),
      },
      { type: 'inputImage', data: rendered.data, mimeType: rendered.mimeType },
    ];
  } else if (tool === 'library_categories') {
    const lib = await host.library.getLibrary();
    result = {
      categories: lib.categories.map((category) => ({
        id: category.id, name: category.id.replace(/^\d+_/, ''), count: category.count,
        children: category.children.map((child) => ({
          id: child.id.split('/').pop(),
          name: child.id.split('/').pop()?.replace(/^\d+_/, ''),
          count: child.count,
        })),
      })),
    };
  } else if (tool === 'create_category') {
    const created = await host.library.createCategory(args.name, args.parent);
    host.emit({ type: 'library' });
    result = { ...created, path: `papers/${[created.category, created.subcategory].filter(Boolean).join('/')}` };
  } else if (tool === 'rename_category') {
    const value = args.subcategory
      ? `${String(args.category ?? '')}/${String(args.subcategory)}` : args.category;
    const target = await host.library.resolveCategory(value);
    const renamed = await host.library.renameCategory(target.category, target.subcategory, args.name);
    host.emit({ type: 'library' });
    result = { ...(renamed as Record<string, unknown>), previous: target.path };
  } else if (tool === 'delete_category') {
    const value = args.subcategory
      ? `${String(args.category ?? '')}/${String(args.subcategory)}` : args.category;
    result = await host.proposeFolderDeletes(chat, [value]);
  } else if (tool === 'delete_categories') {
    result = await host.proposeFolderDeletes(chat, args.categories);
  } else if (tool === 'move_paper') {
    result = await host.library.movePaper(args.paperId, args.category);
    host.emit({ type: 'library' });
  } else if (tool === 'move_papers') {
    const { id, status, title } = await queuePaperMoves(host, args.groups);
    result = { id, status, title, message: '已提交任务，请使用 get_download_status 核对实际移动结果。' };
  } else if (tool === 'download_papers') {
    result = await host.jobs.startDownload({
      input: args.input,
      channel: typeof args.channel === 'string' ? args.channel : 'public',
      autoArchive: true,
      ...(args.category ? { category: String(args.category) } : {}),
    });
  } else if (tool === 'continue_download_batch') {
    result = await host.jobs.startAction({
      batch: String(args.batch ?? ''),
      action: args.action as 'download' | 'verify' | 'archive' | 'ieee' | 'collect',
      submit: (args.submit ?? false) as boolean,
    });
  } else if (tool === 'get_download_status') {
    result = host.jobs.getJob(String(args.jobId ?? ''));
  } else if (tool === 'read_skill') {
    if (!host.readSkill) throw new Error('当前助手未启用技能加载。');
    result = await host.readSkill(args.name, args.file);
  } else if (tool === 'draft_note') {
    const paper = await host.library.getPaper(String(args.paperId || ''));
    if (!paper) throw new Error('文献不存在，无法创建笔记草稿。');
    const title = String(args.title || '').trim();
    const content = String(args.content || '');
    if (!title || title.length > 100) throw new Error('笔记标题须为1至100个字符。');
    if (!content.trim() || content.length > 200000) throw new Error('笔记正文不能为空且不能超过20万字符。');
    const draft = host.createNoteDraft(chat.id, { paper, title, content });
    result = {
      status: 'pending_confirmation', draftId: draft.id, path: draft.path,
      message: '笔记草稿已显示在聊天中，等待用户确认保存。',
    };
  } else if (tool === 'draft_document') {
    const target = String(args.target ?? '');
    if (target !== 'synthesis' && target !== 'outputs') throw new Error('文稿目录只能是 synthesis 或 outputs。');
    const title = String(args.title || '').trim();
    const content = String(args.content || '');
    const ids = args.paperIds === undefined ? [] : args.paperIds;
    if (!title || title.length > 100) throw new Error('文稿标题须为1至100个字符。');
    if (!content.trim() || content.length > 200000) throw new Error('文稿正文不能为空且不能超过20万字符。');
    if (!Array.isArray(ids) || ids.length > 20 || !ids.every((id) => typeof id === 'string')) {
      throw new Error('关联文献须为最多20个L编号。');
    }
    const draft = await host.createDocumentDraft(chat.id, {
      target, title, content, paperIds: ids as string[],
    });
    result = {
      status: 'pending_confirmation', draftId: draft.id, path: draft.path, target,
      message: '文稿草稿已显示在聊天中，等待用户确认保存。',
    };
  } else {
    throw new Error('未知的文献工具。');
  }
  return [{ type: 'inputText', text: JSON.stringify(result) }];
}
