import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import { Store, redact } from './lib/store.js';
import { Library } from './lib/library.js';
import { JobManager } from './lib/jobs.js';
import type { JobEvent, JobRecord, SkippedImport } from './lib/jobs.js';
import { resolvePython, runCli } from './lib/python.js';
import { AssistantService } from './lib/assistants.js';
import type { ChatEvent, ChatMessage, ChatStatusSnapshot } from './lib/chat.js';
import { normalizePaperContext } from './lib/chat.js';
import { THINKING_LEVELS } from './lib/pi.js';
import type { ThinkingLevel } from './lib/pi.js';
import { previewPaper } from './lib/preview.js';
import { UiStateStore } from './lib/uiState.js';
import { libraryPaths, resolveLibraryRoot, ensureLibrary } from './lib/paths.js';
import { appPaths } from './lib/appPaths.js';
import { httpStatus, errorMessage, statusError } from './lib/errors.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.pdf': 'application/pdf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.csv': 'text/csv; charset=utf-8', '.tsv': 'text/tab-separated-values; charset=utf-8',
};
const UPLOADS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.pdf', '.txt', '.md', '.csv', '.tsv', '.json', '.docx', '.pptx', '.xlsx']);
const error = (message: string, status = 400) => statusError(message, status);

interface UploadRecord {
  id: string;
  name: string;
  mime: string;
  size: number;
  path: string;
  createdAt: string;
}

interface UploadStore {
  files: UploadRecord[];
}

export interface AppOptions {
  root?: string;
  stateDir?: string;
  connectPi?: boolean;
  piClient?: ConstructorParameters<typeof AssistantService>[0]['piClient'];
  categoryCli?: (args: string[]) => Promise<unknown>;
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

export function checkRequest(req: IncomingMessage): void {
  const host = req.headers.host || '';
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)) throw error('仅允许通过本机地址访问。', 403);
  const origin = req.headers.origin;
  if (origin && origin !== `http://${host}`) throw error('不接受其他网站发起的请求。', 403);
  if (req.headers['sec-fetch-site'] === 'cross-site') throw error('不接受跨站请求。', 403);
  if (!['GET', 'HEAD'].includes(req.method ?? '') && req.url !== '/api/uploads' &&
    !String(req.headers['content-type']).startsWith('application/json')) {
    throw error('请使用JSON请求。', 415);
  }
}

async function readBody(req: IncomingMessage, max = 2_000_000): Promise<Buffer> {
  if (Number(req.headers['content-length']) > max) throw error('文件或请求过大。', 413);
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > max) throw error('文件或请求过大。', 413);
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const body = await readBody(req);
  try {
    const value = JSON.parse(body.toString('utf8') || '{}') as unknown;
    if (!value || typeof value !== 'object') throw new Error('JSON格式不正确。');
    return value as Record<string, unknown>;
  } catch { throw error('JSON格式不正确。'); }
}

function json(res: ServerResponse, value: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

export async function serveFile(req: IncomingMessage, res: ServerResponse, file: string, { download = false, filename }: { download?: boolean; filename?: string } = {}): Promise<void> {
  const info = await fsp.stat(file);
  if (!info.isFile()) throw error('文件不存在。', 404);
  const mime = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const headers: Record<string, string | number> = {
    'Content-Type': mime,
    'Accept-Ranges': 'bytes',
    'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(filename || path.basename(file))}`,
    'Cache-Control': 'private, no-cache',
  };
  const range = req.headers.range;
  let start = 0;
  let end = info.size - 1;
  let status = 200;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      res.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
      res.end();
      return;
    }
    if (!match[1]) start = Math.max(0, info.size - Number(match[2]));
    else {
      start = Number(match[1]);
      if (match[2]) end = Math.min(end, Number(match[2]));
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
      res.end();
      return;
    }
    status = 206;
    headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
  }
  headers['Content-Length'] = info.size ? end - start + 1 : 0;
  res.writeHead(status, headers);
  if (req.method === 'HEAD' || !info.size) {
    res.end();
    return;
  }
  const stream = fs.createReadStream(file, { start, end });
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}

export function extractFile(python: string, file: string, pages?: number[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const args = [path.join(appPaths().sourceLibDir, 'extract.py'), file, ...(pages ? ['--pages', pages.join(',')] : [])];
    const proc = spawn(python, args, {
      shell: false, windowsHide: true, env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
    });
    let output = '';
    let stderr = '';
    let overflow = false;
    let bytes = 0;
    const decoder = new StringDecoder('utf8');
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('文件解析超过45秒，请缩小页范围。'));
    }, 45000);
    proc.stdout.on('data', (buffer: Buffer) => {
      bytes += buffer.length;
      if (bytes > 800000) { overflow = true; proc.kill(); return; }
      output += decoder.write(buffer);
    });
    proc.stdout.on('end', () => { output += decoder.end(); });
    proc.stderr.on('data', (buffer: Buffer) => { stderr = (stderr + buffer.toString('utf8')).slice(-3000); });
    proc.on('error', (e: Error) => { clearTimeout(timer); reject(e); });
    proc.on('close', (code: number | null) => {
      clearTimeout(timer);
      if (overflow) return reject(new Error('文件提取结果超过限制。'));
      try {
        const data = JSON.parse(output) as { error?: string };
        if (code !== 0 || data.error) throw new Error(data.error || redact(stderr) || '文件解析失败。');
        resolve(data);
      } catch (e) { reject(e); }
    });
  });
}

export async function createApp({
  root: configuredRoot, stateDir: configuredStateDir, connectPi = true, piClient, categoryCli,
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
  const emit = (event: ChatEvent | JobEvent): void => {
    const job = event.type === 'job' ? event.job as JobRecord : null;
    if (job && ['completed', 'failed'].includes(job.status)) void library.refresh();
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of connections) if (!res.writableEnded) res.write(data);
  };
  const jobs = new JobManager({ root, stateDir, emit: (event: JobEvent) => emit(event), python, library });
  const chats = new AssistantService({
    root, stateDir, library, jobs, emit,
    extract: (file, pages) => extractFile(python, file, pages),
    piClient,
  });
  const uploads = new Store<UploadStore>(path.join(stateDir, 'uploads.json'), { files: [] });
  const ui = new UiStateStore(path.join(stateDir, 'ui.json'));
  const validUploads = (ids: unknown): UploadRecord[] => {
    if (!Array.isArray(ids) || ids.length > 8) throw error('每次最多附加8个文件。');
    return ids.map((id) => {
      const file = uploads.data.files.find((f) => f.id === id);
      if (!file || !fs.existsSync(file.path)) throw error('附件不存在，请重新上传。');
      return file;
    });
  };
  const findUpload = (id: unknown): UploadRecord => {
    if (typeof id !== 'string' || !id) throw error('请选择要导入的 PDF。');
    const file = uploads.data.files.find((f) => f.id === id);
    if (!file || !fs.existsSync(file.path)) throw error('附件不存在，请重新上传。');
    return file;
  };
  const boot = (): void => { chats.connect().catch(() => emit({ type: 'status', ...chats.snapshot() })); };
  if (connectPi) boot();
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src 'self'; object-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'");
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
      if (method === 'GET' && route === '/api/library') return json(res, await library.getLibrary());
      if (method === 'POST' && route === '/api/categories') {
        const { name } = await readJson(req);
        return json(res, await library.createCategory(name), 201);
      }
      if (method === 'POST' && route === '/api/categories/rename') {
        const { category, subcategory, name } = await readJson(req);
        return json(res, await library.renameCategory(category, subcategory, name));
      }
      if (method === 'GET' && route === '/api/status') {
        return json(res, { ...chats.snapshot(), python, node: process.version, root });
      }
      // 界面状态存文献库而不是浏览器存储：本地服务每次启动会换端口，origin 也会随之变化。
      if (method === 'GET' && route === '/api/ui') return json(res, ui.read());
      if (method === 'PATCH' && route === '/api/ui') return json(res, ui.update(await readJson(req)));
      if (method === 'POST' && route === '/api/agents/pi/connect') return json(res, await chats.connect());
      if (method === 'GET' && route === '/api/agents/pi/settings') return json(res, await chats.settings());
      if (method === 'POST' && route === '/api/agents/pi/skills/reload') return json(res, await chats.reloadSkills());
      if (method === 'GET' && route === '/api/commands') return json(res, { commands: chats.commands() });
      if (method === 'POST' && route === '/api/agents/pi/settings/key') {
        const { provider, key } = await readJson(req);
        if (typeof provider !== 'string' || !/^[A-Za-z0-9._-]{1,100}$/.test(provider)) throw error('服务商名称不合法。');
        if (typeof key !== 'string' || !key.trim() || key.length > 4096 || /[\u0000-\u001f\u007f]/.test(key)) {
          throw error('请输入有效的 API 密钥。');
        }
        return json(res, await chats.saveKey(provider, key.trim()));
      }
      if (method === 'POST' && route === '/api/agents/pi/settings/key/remove') {
        const { provider } = await readJson(req);
        if (typeof provider !== 'string' || !/^[A-Za-z0-9._-]{1,100}$/.test(provider)) throw error('服务商名称不合法。');
        return json(res, await chats.removeKey(provider));
      }
      if (method === 'POST' && route === '/api/agents/pi/settings/model') {
        const { model } = await readJson(req);
        if (typeof model !== 'string' || !model || model.length > 200 || /[\u0000-\u001f\u007f]/.test(model)) {
          throw error('请选择模型。');
        }
        return json(res, await chats.setDefaultModel(model));
      }
      if (method === 'POST' && route === '/api/agents/pi/settings/thinking') {
        const { level, model } = await readJson(req);
        if (typeof level !== 'string' || !THINKING_LEVELS.includes(level as ThinkingLevel)) throw error('请选择有效的思考强度。');
        if (model !== undefined && (typeof model !== 'string' || !model || model.length > 200)) throw error('请选择模型。');
        return json(res, await chats.setThinking(level as ThinkingLevel, model as string | undefined));
      }
      if (method === 'POST' && route === '/api/agents/pi/settings/compaction') {
        const { enabled, reserveTokens, keepRecentTokens } = await readJson(req);
        if (enabled !== undefined && typeof enabled !== 'boolean') throw error('自动压缩开关必须是布尔值。');
        for (const value of [reserveTokens, keepRecentTokens]) {
          if (value !== undefined && (!Number.isSafeInteger(value) || (value as number) < 1000 || (value as number) > 2000000)) {
            throw error('上下文保留量需为 1000 到 2000000 之间的整数。');
          }
        }
        return json(res, await chats.setCompaction({
          enabled: enabled as boolean | undefined,
          reserveTokens: reserveTokens as number | undefined,
          keepRecentTokens: keepRecentTokens as number | undefined,
        }));
      }
      if (method === 'GET' && route === '/api/chats') return json(res, chats.list());
      if (method === 'POST' && route === '/api/chats') {
        const data = await readJson(req);
        const { paperIds } = normalizePaperContext(data);
        return json(res, chats.create({
          title: typeof data.title === 'string' ? data.title : undefined,
          ...(paperIds ? { paperIds } : {}),
        }), 201);
      }
      const chatMatch = /^\/api\/chats\/([\w-]+)(?:\/(messages|interrupt|commands))?$/.exec(route);
      if (chatMatch) {
        const [, id, action] = chatMatch as unknown as [string, string, string | undefined];
        if (method === 'GET' && !action) return json(res, chats.get(id));
        if (method === 'POST' && action === 'commands') {
          const data = await readJson(req);
          const label = typeof data.text === 'string' && data.text.trim() ? data.text : '';
          if (!label || label.length > 50000) throw error('请输入以斜杠开头的命令。');
          // 前端在命令请求里一并带来选中文献；丢了它，技能回合就只能看到空列表。
          return json(res, await chats.command(id, label, normalizePaperContext(data)), 202);
        }
        if (method === 'POST' && action === 'messages') {
          const data = await readJson(req);
          const result = await chats.send(id, {
            ...data as { text?: string; model?: string },
            ...normalizePaperContext(data),
            attachments: validUploads(data.attachmentIds || []).map((file) => ({ ...file })),
          });
          return json(res, result, 202);
        }
        if (method === 'POST' && action === 'interrupt') return json(res, await chats.interrupt(id));
      }
      const noteDraft = /^\/api\/note-drafts\/([\w-]+)$/.exec(route);
      if (method === 'POST' && noteDraft) {
        const { action } = await readJson(req);
        return json(res, await chats.resolveNoteDraft((noteDraft[1] as string), action));
      }
      const approval = /^\/api\/approvals\/([\w-]+)$/.exec(route);
      if (method === 'POST' && approval) {
        return json(res, chats.approve(approval[1] as string, await readJson(req) as { decision?: string; answers?: Record<string, unknown> }));
      }
      const paper = /^\/api\/papers\/(L\d+)$/.exec(route);
      if (method === 'PATCH' && paper) return json(res, await library.updatePaper(paper[1] as string, await readJson(req)));
      const preview = /^\/api\/papers\/(L\d+)\/(preview|text-layer)$/.exec(route);
      if ((method === 'GET' || method === 'HEAD') && preview) {
        const entry = await library.getPaper(preview[1] as string);
        if (!entry) throw error('文献不存在。', 404);
        const pageNumber = Number(url.searchParams.get('page') || 1);
        if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) throw error('请指定正整数PDF页序。');
        const rendered = await previewPaper({ root, python, file: await library.safeFile(entry.file), page: pageNumber });
        if (preview[2] === 'text-layer') return json(res, { page: pageNumber, totalPages: rendered.totalPages, ...rendered.textLayer });
        res.setHeader('X-PDF-Pages', String(rendered.totalPages));
        return await serveFile(req, res, rendered.file);
      }
      if ((method === 'GET' || method === 'HEAD') && route === '/api/file') {
        return await serveFile(req, res, await library.safeFile(url.searchParams.get('path') || ''));
      }
      if (method === 'POST' && route === '/api/notes/delete') {
        const { path: notePath } = await readJson(req);
        return json(res, await library.deleteNote(notePath));
      }
      if (method === 'GET' && route === '/api/text') {
        const relative = url.searchParams.get('path') || '';
        const file = await library.safeFile(relative);
        if (!['.md', '.txt', '.json'].includes(path.extname(file).toLowerCase())) throw error('此文件请通过阅读器打开。');
        const info = await fsp.stat(file);
        if (info.size > 3_000_000) throw error('文本文件过大。', 413);
        return json(res, { path: relative, text: await fsp.readFile(file, 'utf8') });
      }
      if (method === 'POST' && route === '/api/uploads') {
        let name: string;
        const rawName = req.headers['x-filename'];
        try { name = decodeURIComponent(Array.isArray(rawName) ? rawName[0] ?? '' : rawName ?? ''); }
        catch { throw error('文件名编码无效。'); }
        name = path.basename(name.replaceAll('\\', '/')).replace(/[\x00-\x1f]/g, '').slice(0, 180);
        const ext = path.extname(name).toLowerCase();
        if (!UPLOADS.has(ext)) throw error('支持图片、PDF、文本、CSV、Word、Excel和PowerPoint文件。', 415);
        const data = await readBody(req, 25 * 1024 * 1024);
        if (!data.length) throw error('文件为空。');
        const magic = data.subarray(0, 16);
        if (ext === '.pdf' && !data.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw error('文件内容不是有效PDF。');
        const mime = MIME[ext] || 'application/octet-stream';
        if (mime.startsWith('image/')) {
          const ok = ext === '.png'
            ? magic.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : ['.jpg', '.jpeg'].includes(ext)
              ? magic[0] === 255 && magic[1] === 216
              : ext === '.webp'
                ? magic.toString('ascii', 0, 4) === 'RIFF' && magic.toString('ascii', 8, 12) === 'WEBP'
                : magic.toString('ascii', 0, 3) === 'GIF';
          if (!ok) throw error('图片内容与扩展名不匹配。');
        }
        const id = randomUUID();
        const file = path.join(stateDir, 'uploads', id + ext);
        await fsp.writeFile(file, data, { flag: 'wx', mode: 0o600 });
        const record: UploadRecord = { id, name, mime, size: data.length, path: file, createdAt: new Date().toISOString() };
        uploads.data.files.push(record);
        uploads.save();
        return json(res, { id, name, mime, size: data.length }, 201);
      }
      const upload = /^\/api\/uploads\/([\w-]+)$/.exec(route);
      if ((method === 'GET' || method === 'HEAD') && upload) {
        const file = validUploads([upload[1]])[0] as UploadRecord;
        return await serveFile(req, res, file.path, { filename: file.name, download: !file.mime.startsWith('image/') });
      }
      if (method === 'POST' && route === '/api/library/import') {
        const { uploads: items, category } = await readJson(req);
        if (!Array.isArray(items) || !items.length) throw error('请选择要导入的 PDF。');
        if (items.length > 100) throw error('一次最多导入 100 个 PDF。');
        const resolved = items.map((item) => {
          if (!item || typeof item !== 'object') throw error('导入条目无效。');
          const file = findUpload((item as Record<string, unknown>).uploadId);
          if (path.extname(file.name).toLowerCase() !== '.pdf') throw error('只能导入 PDF 文件。', 415);
          return { ...item as Record<string, unknown>, uploadPath: file.path };
        });
        const result = await jobs.startLocalImports({ uploads: resolved, category: typeof category === 'string' ? category : undefined });
        return json(res, {
          job: result.job,
          skipped: result.skipped.map((item: SkippedImport) => ({
            uploadId: (resolved[item.index] as Record<string, unknown> | undefined)?.uploadId, ...item,
          })),
        }, 202);
      }
      if (method === 'GET' && route === '/api/downloads') {
        return json(res, { batches: await jobs.listBatches(), jobs: jobs.listJobs() });
      }
      if (method === 'POST' && route === '/api/downloads') {
        const body = await readJson(req);
        return json(res, await jobs.startDownload(body as unknown as Parameters<JobManager['startDownload']>[0]), 202);
      }
      if (method === 'POST' && route === '/api/downloads/action') {
        const body = await readJson(req);
        return json(res, await jobs.startAction(body as unknown as Parameters<JobManager['startAction']>[0]), 202);
      }
      if (method === 'POST' && route === '/api/catalog/refresh') {
        const job = await jobs.refreshCatalog();
        return json(res, job, 202);
      }
      const jobMatch = /^\/api\/jobs\/([\w-]+)$/.exec(route);
      if (method === 'GET' && jobMatch) {
        const job = jobs.getJob(jobMatch[1] as string);
        if (!job) throw error('任务不存在。', 404);
        return json(res, job);
      }
      if (method === 'GET' && route === '/api/health') return json(res, { ok: true });
      if ((method === 'GET' || method === 'HEAD') && !route.startsWith('/api/')) {
        const staticFiles: Record<string, string> = {
          '/': 'index.html', '/index.html': 'index.html',
          '/js/app.js': path.join(appPaths().distDir, 'app.js'),
          '/css/styles.css': 'css/styles.css',
        };
        const entry = staticFiles[route];
        if (!entry) throw error('页面不存在。', 404);
        const file = path.isAbsolute(entry) ? entry : path.join(appPaths().publicDir, entry);
        return await serveFile(req, res, file);
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

export type { ChatMessage, ChatStatusSnapshot };
