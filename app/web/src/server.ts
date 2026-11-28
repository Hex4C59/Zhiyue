import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { redact } from './lib/store.js';
import { Library } from './lib/library.js';
import { JobManager } from './lib/jobs.js';
import type { JobEvent, JobRecord, SkippedImport } from './lib/jobs.js';
import { resolvePython, runCli } from './lib/python.js';
import { AssistantService } from './lib/assistants.js';
import type { ChatEvent, ChatMessage, ChatStatusSnapshot } from './lib/chat.js';
import { normalizePaperContext } from './lib/chat.js';
import { THINKING_LEVELS } from './lib/pi.js';
import type { ThinkingLevel } from './lib/pi.js';
import { previewPaper, previewTextLayer } from './lib/preview.js';
import { PdfTranslationService } from './lib/pdfTranslation.js';
import type { PdfTranslationOptions } from './lib/pdfTranslation.js';
import type { PdfTranslationServiceEvent } from '../shared/pdfTranslation.js';
import { UiStateStore } from './lib/uiState.js';
import { libraryPaths, resolveLibraryRoot, ensureLibrary } from './lib/paths.js';
import { appPaths } from './lib/appPaths.js';
import { httpStatus, errorMessage, statusError } from './lib/errors.js';
import { parseCommand, findCommand } from './lib/commands.js';
import { desktopCommandsAvailable, openPiTerminal } from './lib/piTerminal.js';
import { checkRequest, json, readJson, serveFile, serveStatic } from './lib/http.js';
import { extractFile } from './lib/extract.js';
import type { ExtractFileOptions } from './lib/extract.js';
import { UploadService } from './lib/uploads.js';
import type { UploadRecord } from './lib/uploads.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const error = (message: string, status = 400) => statusError(message, status);
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
  + "img-src 'self' data: blob:; frame-src 'self'; object-src 'self'; connect-src 'self'; "
  + "base-uri 'none'; form-action 'self'; frame-ancestors 'self'";

export interface AppOptions {
  root?: string;
  stateDir?: string;
  connectPi?: boolean;
  piClient?: ConstructorParameters<typeof AssistantService>[0]['piClient'];
  categoryCli?: (args: string[]) => Promise<unknown>;
  translation?: Pick<PdfTranslationOptions, 'mineruCommand' | 'worker' | 'getModel'>;
}

export interface App {
  server: http.Server;
  library: Library;
  jobs: JobManager;
  chats: AssistantService;
  ui: UiStateStore;
  emit: (event: ChatEvent) => void;
  close(): Promise<void>;
}

interface RouteContext {
  root: string;
  stateDir: string;
  python: string;
  library: Library;
  jobs: JobManager;
  chats: AssistantService;
  translations: PdfTranslationService;
  uploads: UploadService;
  ui: UiStateStore;
  connections: Set<ServerResponse>;
  emit: (event: ChatEvent | JobEvent | PdfTranslationServiceEvent) => void;
}

async function handleAgentRoutes(
  req: IncomingMessage, res: ServerResponse, url: URL, method: string, route: string, ctx: RouteContext,
): Promise<boolean> {
  const { chats, root, stateDir } = ctx;
  if (method === 'POST' && route === '/api/agents/pi/connect') { json(res, await chats.connect()); return true; }
  if (method === 'GET' && route === '/api/agents/pi/settings') { json(res, await chats.settings()); return true; }
  if (method === 'POST' && route === '/api/agents/pi/skills/reload') { json(res, await chats.reloadSkills()); return true; }
  if (method === 'POST' && route === '/api/agents/pi/settings/reload') { json(res, await chats.reloadConfiguration()); return true; }
  if (method === 'GET' && route === '/api/commands') {
    json(res, { commands: chats.commands(), desktop: desktopCommandsAvailable() }); return true;
  }
  if (method === 'POST' && (route === '/api/commands/terminal' || route === '/api/commands/quit')) {
    if (!desktopCommandsAvailable()) throw error('此命令需要在 Zhiyue 桌面版运行。', 409);
    if (req.headers.origin !== url.origin) throw error('请从本机桌面界面执行此命令。', 403);
    if (route.endsWith('/quit')) {
      res.once('finish', () => console.log('ZHIYUE_QUIT'));
      json(res, { accepted: true }, 202);
      return true;
    }
    const { text, chatId } = await readJson(req);
    if (typeof text !== 'string' || /[\x00-\x1f\x7f]/.test(text)) throw error('请输入一行 Pi 命令。');
    const parsed = parseCommand(text);
    const command = parsed && findCommand(chats.commands(), parsed.name);
    if (!parsed || command?.target !== 'terminal') throw error('未知的 Pi 终端命令。', 404);
    let threadId: string | undefined;
    if (command.scope === 'chat') {
      if (typeof chatId !== 'string') throw error('请先打开会话。', 409);
      threadId = chats.terminalSession(chatId) ?? undefined;
      if (!threadId) throw error('当前会话还没有 Pi 上下文，请先与模型对话。', 409);
    }
    await openPiTerminal({ root, stateDir, sessionsDir: chats.pi.sessionsDir, command: text, threadId });
    json(res, { accepted: true }, 202);
    return true;
  }
  if (method === 'POST' && route === '/api/agents/pi/settings/key') {
    const { provider, key } = await readJson(req);
    if (typeof provider !== 'string' || !/^[A-Za-z0-9._-]{1,100}$/.test(provider)) throw error('服务商名称不合法。');
    if (typeof key !== 'string' || !key.trim() || key.length > 4096 || /[\u0000-\u001f\u007f]/.test(key)) {
      throw error('请输入有效的 API 密钥。');
    }
    json(res, await chats.saveKey(provider, key.trim()));
    return true;
  }
  if (method === 'POST' && route === '/api/agents/pi/settings/key/remove') {
    const { provider } = await readJson(req);
    if (typeof provider !== 'string' || !/^[A-Za-z0-9._-]{1,100}$/.test(provider)) throw error('服务商名称不合法。');
    json(res, await chats.removeKey(provider));
    return true;
  }
  if (method === 'POST' && route === '/api/agents/pi/settings/model') {
    const { model } = await readJson(req);
    if (typeof model !== 'string' || !model || model.length > 200 || /[\u0000-\u001f\u007f]/.test(model)) {
      throw error('请选择模型。');
    }
    json(res, await chats.setDefaultModel(model));
    return true;
  }
  if (method === 'POST' && route === '/api/agents/pi/settings/thinking') {
    const { level, model } = await readJson(req);
    if (typeof level !== 'string' || !THINKING_LEVELS.includes(level as ThinkingLevel)) throw error('请选择有效的思考强度。');
    if (model !== undefined && (typeof model !== 'string' || !model || model.length > 200)) throw error('请选择模型。');
    json(res, await chats.setThinking(level as ThinkingLevel, model as string | undefined));
    return true;
  }
  if (method === 'POST' && route === '/api/agents/pi/settings/compaction') {
    const { enabled, reserveTokens, keepRecentTokens } = await readJson(req);
    if (enabled !== undefined && typeof enabled !== 'boolean') throw error('自动压缩开关必须是布尔值。');
    for (const value of [reserveTokens, keepRecentTokens]) {
      if (value !== undefined && (!Number.isSafeInteger(value) || (value as number) < 1000 || (value as number) > 2000000)) {
        throw error('上下文保留量需为 1000 到 2000000 之间的整数。');
      }
    }
    json(res, await chats.setCompaction({
      enabled: enabled as boolean | undefined,
      reserveTokens: reserveTokens as number | undefined,
      keepRecentTokens: keepRecentTokens as number | undefined,
    }));
    return true;
  }
  return false;
}

async function handleChatRoutes(
  req: IncomingMessage, res: ServerResponse, method: string, route: string, ctx: RouteContext,
): Promise<boolean> {
  const { chats, uploads } = ctx;
  if (method === 'GET' && route === '/api/chats') { json(res, chats.list()); return true; }
  if (method === 'POST' && route === '/api/chats') {
    const data = await readJson(req);
    const { paperIds } = normalizePaperContext(data);
    json(res, chats.create({
      title: typeof data.title === 'string' ? data.title : undefined,
      ...(paperIds ? { paperIds } : {}),
    }), 201);
    return true;
  }
  const chatMatch = /^\/api\/chats\/([\w-]+)(?:\/(messages|interrupt|commands|folder-actions|classify-proposals))?$/.exec(route);
  if (chatMatch) {
    const [, id, action] = chatMatch as unknown as [string, string, string | undefined];
    if (method === 'GET' && !action) {
      // 补查时补齐回执会写盘；落盘失败属于服务端故障，不能按未标注错误的默认 400 返回。
      try { chats.reconcileClassifications(); }
      catch (cause) {
        if (httpStatus(cause, 500) < 500) throw cause;
        throw statusError(`补齐归类回执失败：${errorMessage(cause)}`, 500);
      }
      json(res, chats.get(id)); return true;
    }
    if (method === 'PATCH' && !action) {
      const { historyState } = await readJson(req);
      if (historyState !== 'active' && historyState !== 'archived') throw error('无效的会话状态。');
      json(res, chats.changeHistory(id, historyState));
      return true;
    }
    if (method === 'DELETE' && !action) { json(res, chats.changeHistory(id, 'trashed')); return true; }
    if (method === 'POST' && action === 'commands') {
      const data = await readJson(req);
      const label = typeof data.text === 'string' && data.text.trim() ? data.text : '';
      if (!label || label.length > 50000) throw error('请输入以斜杠开头的命令。');
      // 前端在命令请求里一并带来选中文献；丢了它，技能回合就只能看到空列表。
      json(res, await chats.command(id, label, normalizePaperContext(data)), 202);
      return true;
    }
    if (method === 'POST' && action === 'messages') {
      const data = await readJson(req);
      const result = await chats.send(id, {
        ...data as { text?: string; model?: string },
        ...normalizePaperContext(data),
        attachments: uploads.validUploads(data.attachmentIds || []).map((file) => ({ ...file })),
      });
      json(res, result, 202);
      return true;
    }
    if (method === 'POST' && action === 'folder-actions') {
      const decision = await readJson(req);
      json(res, await chats.resolveFolderActions(id, decision.action, decision.ids));
      return true;
    }
    if (method === 'POST' && action === 'classify-proposals') {
      const decision = await readJson(req);
      const result = await chats.resolveClassifyProposals(id, decision.action, decision.ids, decision.requestId);
      json(res, result, 'run' in result && !result.replayed ? 202 : 200);
      return true;
    }
    if (method === 'POST' && action === 'interrupt') { json(res, await chats.interrupt(id)); return true; }
  }
  const noteDraft = /^\/api\/note-drafts\/([\w-]+)$/.exec(route);
  if (method === 'POST' && noteDraft) {
    const { action } = await readJson(req);
    json(res, await chats.resolveNoteDraft(noteDraft[1] as string, action));
    return true;
  }
  const approval = /^\/api\/approvals\/([\w-]+)$/.exec(route);
  if (method === 'POST' && approval) {
    json(res, chats.approve(
      approval[1] as string,
      await readJson(req) as { decision?: string; answers?: Record<string, unknown> },
    ));
    return true;
  }
  return false;
}

async function handleLibraryAndJobRoutes(
  req: IncomingMessage, res: ServerResponse, url: URL, method: string, route: string, ctx: RouteContext,
): Promise<boolean> {
  const { root, python, library, jobs, translations, uploads, emit } = ctx;
  if (method === 'GET' && route === '/api/translations/status') {
    json(res, translations.environment());
    return true;
  }
  if (method === 'GET' && route === '/api/translations') {
    json(res, translations.snapshot());
    return true;
  }
  if (method === 'POST' && route === '/api/translations/batches') {
    const submitted = translations.startBatch(await readJson(req));
    json(res, submitted, submitted.replayed ? 200 : 202);
    return true;
  }
  const batchCancel = /^\/api\/translations\/batches\/([A-Za-z0-9_-]{1,128})\/cancel$/.exec(route);
  if (method === 'POST' && batchCancel) {
    json(res, translations.cancelBatch(batchCancel[1] as string), 202);
    return true;
  }
  if (method === 'GET' && route === '/api/library') { json(res, await library.getLibrary()); return true; }
  if (method === 'POST' && route === '/api/categories') {
    const { name, parent } = await readJson(req) as { name?: unknown; parent?: unknown };
    json(res, await library.createCategory(name, parent), 201);
    return true;
  }
  if (method === 'POST' && route === '/api/categories/rename') {
    const { category, subcategory, name } = await readJson(req);
    json(res, await library.renameCategory(category, subcategory, name));
    return true;
  }
  if (method === 'POST' && route === '/api/categories/delete') {
    const { category, subcategory } = await readJson(req) as { category?: unknown; subcategory?: unknown };
    json(res, await library.deleteCategory(category, subcategory));
    return true;
  }
  const paper = /^\/api\/papers\/(L\d+)$/.exec(route);
  if (method === 'PATCH' && paper) {
    json(res, await library.updatePaper(paper[1] as string, await readJson(req)));
    return true;
  }
  // 界面拖动只负责提交目标；实际搬文件、改写引用和加锁都在 Python move-paper 内完成。
  const paperMove = /^\/api\/papers\/(L\d+)\/move$/.exec(route);
  if (method === 'POST' && paperMove) {
    const body = await readJson(req);
    const plain = (value: unknown): value is string =>
      typeof value === 'string' && value !== '' && value !== '.' && value !== '..' && !/[\\/]/.test(value);
    if (!plain(body.category)) throw error('请指定目标文件夹。');
    let subcategory = '';
    if (body.subcategory !== undefined && body.subcategory !== '') {
      if (!plain(body.subcategory)) throw error('子文件夹无效。');
      subcategory = body.subcategory;
    }
    const target = `papers/${body.category}${subcategory ? `/${subcategory}` : ''}`;
    const moved = await library.movePaper(paperMove[1] as string, target);
    emit({ type: 'library' });
    json(res, moved);
    return true;
  }
  const translationRoute = /^\/api\/papers\/(L\d+)\/translation(?:\/(file|markdown|asset|cancel))?$/.exec(route);
  if (translationRoute) {
    const id = translationRoute[1] as string;
    const action = translationRoute[2];
    if (method === 'GET' && !action) { json(res, await translations.status(id)); return true; }
    if (method === 'POST' && !action) {
      const { model, regenerate } = await readJson(req);
      if (regenerate !== undefined && typeof regenerate !== 'boolean') throw error('重新生成标志必须为布尔值。');
      const status = await translations.start(id, model, regenerate);
      json(res, status, status.job ? 202 : 200);
      return true;
    }
    if (method === 'POST' && action === 'cancel') {
      const { jobId } = await readJson(req);
      json(res, await translations.cancel(id, jobId), 202);
      return true;
    }
    if (method === 'GET' && action === 'markdown') {
      json(res, await translations.markdown(id, url.searchParams.get('key') || ''));
      return true;
    }
    if ((method === 'GET' || method === 'HEAD') && action === 'asset') {
      const file = await translations.asset(
        id, url.searchParams.get('key') || '', url.searchParams.get('file') || '',
      );
      await serveFile(req, res, file);
      return true;
    }
    if ((method === 'GET' || method === 'HEAD') && action === 'file') {
      const file = await translations.file(id, url.searchParams.get('key') || '');
      await serveFile(req, res, file, {
        download: url.searchParams.get('download') === '1', filename: `${id}-中文精读.md`,
      });
      return true;
    }
  }
  const preview = /^\/api\/papers\/(L\d+)\/(preview|text-layer)$/.exec(route);
  if ((method === 'GET' || method === 'HEAD') && preview) {
    const entry = await library.getPaper(preview[1] as string);
    if (!entry) throw error('文献不存在。', 404);
    const pageNumber = Number(url.searchParams.get('page') || 1);
    if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) throw error('请指定正整数PDF页序。');
    const file = await library.safeFile(entry.file);
    if (preview[2] === 'text-layer') {
      // 阅读器同一页会并发请求预览图和文字层。文字层命中缓存时只需读 meta.json，
      // 不必重新校验整条路径、不必排队等渲染名额。
      const cached = await previewTextLayer({ root, file, page: pageNumber });
      if (cached) {
        json(res, { page: pageNumber, totalPages: cached.totalPages, ...cached.textLayer });
        return true;
      }
    }
    const rendered = await previewPaper({
      root, python, file, page: pageNumber, scale: url.searchParams.get('scale') ?? undefined,
    });
    if (preview[2] === 'text-layer') {
      json(res, { page: pageNumber, totalPages: rendered.totalPages, ...rendered.textLayer });
      return true;
    }
    res.setHeader('X-PDF-Pages', String(rendered.totalPages));
    await serveFile(req, res, rendered.file);
    return true;
  }
  if ((method === 'GET' || method === 'HEAD') && route === '/api/file') {
    await serveFile(req, res, await library.safeFile(url.searchParams.get('path') || ''));
    return true;
  }
  if (method === 'POST' && route === '/api/notes/delete') {
    const { path: notePath } = await readJson(req);
    json(res, await library.deleteNote(notePath));
    return true;
  }
  if (method === 'GET' && route === '/api/text') {
    const relative = url.searchParams.get('path') || '';
    const file = await library.safeFile(relative);
    if (!['.md', '.txt', '.json'].includes(path.extname(file).toLowerCase())) throw error('此文件请通过阅读器打开。');
    const info = await fsp.stat(file);
    if (info.size > 3_000_000) throw error('文本文件过大。', 413);
    json(res, { path: relative, text: await fsp.readFile(file, 'utf8') });
    return true;
  }
  if (method === 'POST' && route === '/api/uploads') {
    json(res, await uploads.saveFromRequest(req), 201);
    return true;
  }
  const upload = /^\/api\/uploads\/([\w-]+)$/.exec(route);
  if ((method === 'GET' || method === 'HEAD') && upload) {
    const file = uploads.validUploads([upload[1]])[0] as UploadRecord;
    await serveFile(req, res, file.path, { filename: file.name, download: !file.mime.startsWith('image/') });
    return true;
  }
  if (method === 'POST' && route === '/api/library/import') {
    const { uploads: items, category } = await readJson(req);
    if (!Array.isArray(items) || !items.length) throw error('请选择要导入的 PDF。');
    if (items.length > 100) throw error('一次最多导入 100 个 PDF。');
    const resolved = items.map((item) => {
      if (!item || typeof item !== 'object') throw error('导入条目无效。');
      const file = uploads.findUpload((item as Record<string, unknown>).uploadId);
      if (path.extname(file.name).toLowerCase() !== '.pdf') throw error('只能导入 PDF 文件。', 415);
      return { ...item as Record<string, unknown>, uploadPath: file.path };
    });
    const result = await jobs.startLocalImports({
      uploads: resolved, category: typeof category === 'string' ? category : undefined,
    });
    json(res, {
      job: result.job,
      skipped: result.skipped.map((item: SkippedImport) => ({
        uploadId: (resolved[item.index] as Record<string, unknown> | undefined)?.uploadId, ...item,
      })),
    }, 202);
    return true;
  }
  if (method === 'GET' && route === '/api/downloads') {
    json(res, { batches: await jobs.listBatches(), jobs: jobs.listJobs() });
    return true;
  }
  if (method === 'POST' && route === '/api/downloads') {
    const body = await readJson(req);
    json(res, await jobs.startDownload(body as unknown as Parameters<JobManager['startDownload']>[0]), 202);
    return true;
  }
  if (method === 'POST' && route === '/api/downloads/action') {
    const body = await readJson(req);
    json(res, await jobs.startAction(body as unknown as Parameters<JobManager['startAction']>[0]), 202);
    return true;
  }
  if (method === 'POST' && route === '/api/catalog/refresh') {
    json(res, await jobs.refreshCatalog(), 202);
    return true;
  }
  const jobMatch = /^\/api\/jobs\/([\w-]+)$/.exec(route);
  if (method === 'GET' && jobMatch) {
    const job = jobs.getJob(jobMatch[1] as string);
    if (!job) throw error('任务不存在。', 404);
    json(res, job);
    return true;
  }
  return false;
}

export async function createApp({
  root: configuredRoot, stateDir: configuredStateDir, connectPi = true, piClient, categoryCli, translation,
}: AppOptions = {}): Promise<App> {
  const root = configuredRoot ?? resolveLibraryRoot(HERE);
  const paths = libraryPaths(root);
  const stateDir = configuredStateDir ?? paths.data;
  await ensureLibrary(paths);
  const connections = new Set<ServerResponse>();
  const python = resolvePython();
  const library = new Library({
    root, stateDir,
    categoryCommand: categoryCli ?? ((args: string[]) => runCli({ python, root, args })),
  });
  let reconcileJob: ((job: JobRecord) => void) | undefined;
  const emit = (event: ChatEvent | JobEvent | PdfTranslationServiceEvent): void => {
    const job = event.type === 'job' ? event.job as JobRecord : null;
    if (job) reconcileJob?.(job);
    if (job && ['completed', 'partial', 'failed'].includes(job.status)) void library.refresh();
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of connections) if (!res.writableEnded) res.write(data);
  };
  const jobs = new JobManager({ root, stateDir, emit: (event: JobEvent) => emit(event), python, library });
  // 翻译服务依赖 chats.pi 的模型配置，助手需要读取译本；用延迟闭包在两者都建好后再访问。
  let translations!: PdfTranslationService;
  const chats = new AssistantService({
    root, stateDir, library, jobs, emit,
    extract: (file, pages) => extractFile(python, file, { pages }),
    searchPdfText: (file, query, maxHits) => extractFile(python, file, { search: query, maxHits }),
    pdfOutline: (file) => extractFile(python, file, { outline: true }),
    renderPage: async (file, page) => {
      const rendered = await previewPaper({ root, python, file, page });
      const png = await fsp.readFile(rendered.file);
      if (png.byteLength > 6_000_000) throw error('渲染图像过大，请改用文字读取。', 413);
      return {
        data: png.toString('base64'), mimeType: 'image/png',
        totalPages: rendered.totalPages, page: rendered.page,
      };
    },
    readPaperTranslation: (paperId, offset, limit) => translations.readLatestMarkdown(paperId, offset, limit),
    piClient,
  });
  reconcileJob = (job) => chats.reconcileClassifications(false, job);
  await jobs.ready;
  chats.reconcileClassifications(true);
  translations = new PdfTranslationService({
    root, python, library, emit, getModel: (modelId?: string) => chats.pi.translationModel(modelId), ...translation,
  });
  const uploads = new UploadService(stateDir);
  const ui = new UiStateStore(path.join(stateDir, 'ui.json'));
  const ctx: RouteContext = {
    root, stateDir, python, library, jobs, chats, translations, uploads, ui, connections, emit,
  };
  const boot = (): void => { chats.connect().catch(() => emit({ type: 'status', ...chats.snapshot() })); };
  if (connectPi) boot();
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', CSP);
    try {
      checkRequest(req);
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`);
      const route = url.pathname;
      const method = req.method ?? '';
      if (method === 'GET' && route === '/api/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache',
          'Connection': 'keep-alive', 'X-Accel-Buffering': 'no',
        });
        res.write(`data: ${JSON.stringify({
          type: 'connected',
          approvals: [...chats.approvals.values()].map(({ id, chatId, method: m, params }) => ({ id, chatId, method: m, params })),
        })}\n\n`);
        connections.add(res);
        const timer = setInterval(() => res.write(': keepalive\n\n'), 20000);
        timer.unref();
        req.on('close', () => { clearInterval(timer); connections.delete(res); });
        return;
      }
      if (method === 'GET' && route === '/api/status') {
        return json(res, { ...chats.snapshot(), python, node: process.version, root });
      }
      // 界面状态存文献库而不是浏览器存储：本地服务每次启动会换端口，origin 也会随之变化。
      if (method === 'GET' && route === '/api/ui') return json(res, ui.read());
      if (method === 'PATCH' && route === '/api/ui') return json(res, ui.update(await readJson(req)));
      if (method === 'GET' && route === '/api/health') return json(res, { ok: true });
      if (await handleAgentRoutes(req, res, url, method, route, ctx)) return;
      if (await handleChatRoutes(req, res, method, route, ctx)) return;
      if (await handleLibraryAndJobRoutes(req, res, url, method, route, ctx)) return;
      if ((method === 'GET' || method === 'HEAD') && !route.startsWith('/api/')) {
        return await serveStatic(req, res, route);
      }
      throw error('接口不存在。', 404);
    } catch (e) {
      if (!res.headersSent) json(res, { error: redact(errorMessage(e)) }, httpStatus(e));
      else res.end();
    }
  });
  server.requestTimeout = 120000;
  server.headersTimeout = 15000;
  let closing: Promise<void> | undefined;
  return {
    server, library, jobs, chats, ui, emit,
    close: () => closing ??= (async () => {
      await translations.close();
      await chats.client.close();
      for (const res of connections) res.end();
      const stopped = new Promise<void>((resolve) => server.close(() => resolve()));
      server.closeIdleConnections();
      await jobs.close();
      await stopped;
    })(),
  };
}

// 新库首次启动时补入随包技能；已有同名技能不覆盖用户修改。
async function seedSkills(paths: ReturnType<typeof libraryPaths>): Promise<void> {
  const source = path.join(appPaths().templatesDir, 'skills');
  if (!fs.existsSync(source)) return;
  for (const entry of await fsp.readdir(source, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const target = path.join(paths.skills, entry.name);
    if (fs.existsSync(target)) continue;
    await fsp.cp(path.join(source, entry.name), target, { recursive: true });
  }
}

export async function startServer(): Promise<App> {
  const workspace = resolveLibraryRoot(HERE);
  const paths = libraryPaths(workspace);
  await ensureLibrary(paths);
  await seedSkills(paths);
  if (!fs.existsSync(paths.readme)) {
    await fsp.copyFile(path.join(appPaths().templatesDir, 'library-README.md'), paths.readme);
  }
  if (!fs.existsSync(paths.agents)) {
    await fsp.copyFile(path.join(appPaths().templatesDir, 'library-AGENTS.md'), paths.agents);
  }
  if (!fs.existsSync(path.join(paths.catalog, '文献索引.json'))) {
    await fsp.writeFile(path.join(paths.catalog, '文献索引.json'), JSON.stringify({
      schema_version: 1, record_count: 0, records: [], issues: [],
    }));
  }
  const app = await createApp({ root: workspace });
  // dist 不入库，源码检出后必须先构建；缺产物时提前报错，而不是让页面白屏或 404。
  const bundle = path.join(appPaths().distDir, 'app.js');
  if (!fs.existsSync(bundle)) {
    console.error(`缺少前端构建产物：${bundle}\n请先在项目根目录运行 npm run build（或 npm run build:web）。`);
    await app.chats.client.close();
    process.exitCode = 1;
    return app;
  }
  app.server.on('error', (failure: Error) => {
    console.error(`本地服务监听失败：${failure.message}`);
    void app.chats.client.close();
    process.exitCode = 1;
  });
  // 由系统分配空闲端口，桌面窗口从标准输出获取服务地址。
  app.server.listen(0, '127.0.0.1', () => {
    const address = app.server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    console.log(`ZHIYUE_URL=http://127.0.0.1:${port}`);
  });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => app.close().then(() => process.exit(0)));
  }
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await startServer();

export { checkRequest, serveFile, extractFile };
export type { ChatMessage, ChatStatusSnapshot, ExtractFileOptions };
