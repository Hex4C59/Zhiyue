import { spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, realpathSync, readFileSync } from 'node:fs';
import { readFile, writeFile, rename, readdir, realpath, lstat, open, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import { downloaderScript, resolvePython } from './python.js';
import { libraryPaths } from './paths.js';
import { statusError } from './errors.js';
import type { Library } from './library.js';

export type JobStatus = 'queued' | 'running' | 'completed' | 'partial' | 'failed';
export interface PaperMove { paperId: string; category: string }
export interface PaperMoveItem extends PaperMove {
  status: 'moved' | 'unchanged' | 'blocked' | 'failed';
  error?: string;
  otherLocations?: string[];
}
export interface PaperMoveResult { items: PaperMoveItem[]; repair?: string }
export type ActionName = 'download' | 'verify' | 'archive' | 'ieee' | 'collect';

export interface JobStep {
  action: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt?: string;
}

export interface BatchSummary {
  batch: string;
  entries: number;
  counts: Record<string, number>;
  scope_note: string;
}

export interface JobRecord {
  id: string;
  batch: string | null;
  title: string;
  status: JobStatus;
  log: string;
  steps: JobStep[];
  createdAt: string;
  updatedAt: string;
  error?: string;
  result?: BatchSummary;
  kind?: 'paper-move';
  moveResult?: PaperMoveResult;
}

export interface DownloadEntry {
  doi?: string;
  title?: string;
  authors?: string[] | string;
  year?: string;
  venue?: string;
}

export interface ImportEntry {
  title: string;
  authors: string[];
  year: string;
  doi: string;
}

export interface ImportUpload extends Record<string, unknown> {
  uploadPath?: string;
  uploadId?: string;
}

export interface SkippedImport {
  index: number;
  title: string;
  literature_id: string;
  literature_title?: string;
  reason: string;
}

export interface JobEvent {
  type: 'job';
  job: JobRecord;
}

export interface JobManagerOptions {
  root: string;
  stateDir: string;
  emit?: (event: JobEvent) => unknown;
  python?: string;
  downloader?: string;
  library?: Pick<Library, 'ensureCategory'> | null;
}

const clone = <T>(value: T): T => structuredClone(value);
const inside = (base: string, file: string): boolean => {
  const rel = path.relative(base, file);
  return !path.isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${path.sep}`);
};
const fail = (message: string) => statusError(message, 400);
const stamp = (): string => new Date().toISOString();
const validBatch = (name: unknown): name is string =>
  typeof name === 'string' && /^[\p{L}\p{N}_-]{1,100}$/u.test(name);
const LOG_LIMIT = 100_000;
const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
const MAX_IMPORT_FILES = 100;
const INTERRUPTED = '服务关闭，任务已中断；请检查批次后手动续跑';

function redact(value: string): string {
  return String(value)
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    .replace(/^.*(?:authorization|proxy-authorization|cookie|set-cookie|x-api-key|api[_-]?key|insttoken|(?:access[_-]?|refresh[_-]?)?token|password|secret|headers?)\s*["']?\s*[:=].*$/gim, '[敏感字段已隐藏]')
    .replace(/https?:\/\/[^\s<>"']+/gi, '[URL已隐藏]')
    .replace(/\b(?:Bearer|Basic)\s+[^\s,"'}]+/gi, '[认证已隐藏]')
    .replace(/\b(?:sk-[\w-]{8,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)\b/g, '[密钥已隐藏]');
}

function cleanField(value: unknown, max: number, label: string): string {
  if (value == null || value === '') return '';
  if (!['string', 'number'].includes(typeof value)) throw fail(`${label}格式无效`);
  const text = String(value).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length > max) throw fail(`${label}过长`);
  return text;
}

function splitAuthors(value: unknown): string[] {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) {
    if (value.length > 100) throw fail('作者过多');
    return value.map((item) => cleanField(item, 120, '作者')).filter(Boolean);
  }
  return cleanField(value, 3000, '作者')
    .split(/[;；]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 100);
}

async function fileDigest(file: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(file);
    stream.on('data', (chunk: string | Buffer) => hash.update(chunk));
    stream.once('error', reject);
    stream.once('end', () => resolve(hash.digest('hex')));
  });
}

const entryFields = ['doi', 'title', 'authors', 'year', 'venue'] as const;

function entriesFrom(rawInput: unknown): DownloadEntry[] {
  let input: unknown = rawInput;
  if (typeof input === 'string') {
    if (input.length > 1_000_000) throw fail('输入过长');
    const text = input.trim();
    if (text.startsWith('[') || text.startsWith('{')) {
      try { input = JSON.parse(text); } catch { throw fail('JSON输入无效'); }
    } else {
      input = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).map((line) => {
        const doi = line.match(/(?:https?:\/\/(?:dx\.)?doi\.org\/)?(10\.\d{4,9}\/\S+)/i)?.[1];
        return doi
          ? { doi, title: line.replace(/(?:https?:\/\/(?:dx\.)?doi\.org\/)?10\.\d{4,9}\/\S+/i, '').trim() }
          : { title: line };
      });
    }
  }
  const container = input && typeof input === 'object' ? input as Record<string, unknown> : null;
  const rows = Array.isArray(input)
    ? input
    : container?.entries ?? container?.条目 ?? (container?.doi || container?.title ? [input] : null);
  if (!Array.isArray(rows) || !rows.length || rows.length > 500) throw fail('请提供1至500条DOI或题名');
  return rows.map((row) => {
    if (typeof row === 'string') return entriesFrom(row)[0] as DownloadEntry;
    if (!row || typeof row !== 'object') throw fail('论文条目无效');
    const record = row as Record<string, unknown>;
    const result: DownloadEntry = {};
    for (const key of entryFields) {
      const value = record[key];
      if (value == null) continue;
      // 作者既接受数组也接受分隔文本，保持与 Python 输入侧一致的宽松格式。
      if (key === 'authors') {
        if (Array.isArray(value)) result.authors = value.map(String);
        else if (['string', 'number'].includes(typeof value)) result.authors = String(value).trim();
        else throw fail('字段authors类型无效');
        continue;
      }
      if (!['string', 'number'].includes(typeof value)) throw fail(`字段${key}类型无效`);
      const text = String(value).trim();
      if (key === 'doi') result.doi = text;
      else if (key === 'title') result.title = text;
      else if (key === 'year') result.year = text;
      else result.venue = text;
    }
    if (!result.doi && !result.title) throw fail('每条论文需有DOI或题名');
    if (JSON.stringify(result).length > 20_000) throw fail('论文条目过长');
    // Never forward file/category/review flags supplied inside JSON.
    return result;
  });
}

export class JobManager {
  readonly root: string;
  stateDir: string;
  readonly python: string;
  readonly downloader: string;
  readonly library: Pick<Library, 'ensureCategory'> | null;
  readonly emit: (event: JobEvent) => unknown;
  jobs: JobRecord[];
  closed: boolean;
  children: Set<import('node:child_process').ChildProcess>;
  queue: Promise<unknown>;
  persistence: Promise<unknown>;
  ready: Promise<unknown>;
  closing?: Promise<void>;

  constructor({ root, stateDir, emit = () => {}, python, downloader = downloaderScript, library = null }: JobManagerOptions) {
    const rootPath = path.resolve(root);
    const statePath = path.resolve(stateDir);
    // Windows 短路径须用原生 realpath 展开，与后续异步路径检查使用同一种拼写。
    this.root = realpathSync.native(rootPath);
    this.stateDir = inside(rootPath, statePath) ? path.join(this.root, path.relative(rootPath, statePath)) : statePath;
    if (!path.relative(this.root, this.stateDir) || !inside(this.root, this.stateDir)) {
      throw fail('任务状态目录必须位于项目内部');
    }
    let ancestor = this.stateDir;
    while (!existsSync(ancestor)) ancestor = path.dirname(ancestor);
    if (!inside(this.root, realpathSync.native(ancestor))) throw fail('任务状态目录不能链接到项目外');
    mkdirSync(this.stateDir, { recursive: true });
    this.stateDir = realpathSync.native(this.stateDir);
    if (!inside(this.root, this.stateDir)) throw fail('任务状态目录逃逸');
    this.python = python ?? resolvePython();
    this.downloader = path.resolve(downloader);
    this.library = library;
    this.emit = emit;
    this.jobs = [];
    this.closed = false;
    this.children = new Set();
    this.queue = Promise.resolve();
    this.persistence = Promise.resolve();
    try {
      const saved = JSON.parse(readFileSync(path.join(this.stateDir, 'jobs.json'), 'utf8').replace(/^\uFEFF/, '')) as unknown;
      this.jobs = Array.isArray(saved) ? saved as JobRecord[] : (saved as { jobs?: JobRecord[] }).jobs ?? [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    let recovered = false;
    for (const job of this.jobs) {
      job.log = redact(job.log ?? '').slice(-LOG_LIMIT);
      if (job.status === 'running' || job.status === 'queued') {
        job.status = 'failed';
        job.error = '进程重启，任务已中断；请检查批次后手动续跑';
        job.updatedAt = stamp();
        recovered = true;
      }
    }
    this.ready = recovered ? this._save() : Promise.resolve();
  }

  listJobs(): JobRecord[] { return clone(this.jobs); }

  getJob(id: string): JobRecord | null {
    const job = this.jobs.find((item) => item.id === id);
    return job ? clone(job) : null;
  }

  _assertOpen(): void {
    if (this.closed) throw Object.assign(new Error(INTERRUPTED), { statusCode: 503 });
  }

  async _stopChild(child: import('node:child_process').ChildProcess): Promise<void> {
    // Only target live process handles created by this manager; never process names.
    if (!this.children.has(child) || !child.pid || child.exitCode !== null || child.signalCode !== null) return;
    if (process.platform === 'win32') {
      await new Promise<void>((resolve) => {
        const killer = spawn(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe'),
          ['/PID', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore', timeout: 5000 });
        killer.once('error', resolve);
        killer.once('close', resolve);
      });
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    } else {
      // Each spawned command owns a new process group, including curl descendants.
      try { process.kill(-(child.pid as number), 'SIGKILL'); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
      }
    }
  }

  close(): Promise<void> {
    if (this.closing) return this.closing;
    this.closed = true;
    for (const job of this.jobs) {
      if (!['queued', 'running'].includes(job.status)) continue;
      job.status = 'failed';
      job.error = INTERRUPTED;
      this._log(job, `\n${INTERRUPTED}\n`);
    }
    // Start termination immediately, even if an earlier persistence write is pending.
    const stops = Promise.allSettled([...this.children].map((child) => this._stopChild(child)));
    this.closing = (async () => {
      await this.ready;
      await this._save();
      const results = await stops;
      await this.queue;
      await this._save();
      const failed = results.find((result) => result.status === 'rejected');
      if (failed?.status === 'rejected') throw failed.reason;
    })();
    return this.closing;
  }

  _save(): Promise<unknown> {
    const data = JSON.stringify(this.jobs, null, 2);
    const operation = this.persistence.then(async () => {
      const target = path.join(this.stateDir, 'jobs.json');
      const temp = `${target}.${randomUUID()}.tmp`;
      await writeFile(temp, data, { mode: 0o600 });
      await rename(temp, target);
    });
    this.persistence = operation.catch(() => {});
    return operation;
  }

  _notify(job: JobRecord): void {
    job.updatedAt = stamp();
    try {
      const result = this.emit({ type: 'job', job: clone(job) });
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch(() => {});
      }
    } catch { /* UI listeners do not stop downloads. */ }
  }

  _log(job: JobRecord, message: string): void {
    job.log = (job.log + redact(message)).slice(-LOG_LIMIT);
    this._notify(job);
  }

  async _batchPath(batch: unknown): Promise<string> {
    if (!validBatch(batch)) throw fail('批次名称无效');
    const directory = await realpath(path.join(libraryPaths(this.root).batches, batch));
    if (!inside(libraryPaths(this.root).batches, directory) || !inside(this.root, directory)) throw fail('批次目录逃逸');
    const file = await realpath(path.join(directory, '下载状态.json'));
    if (!inside(directory, file)) throw fail('批次状态文件逃逸');
    return file;
  }

  // Validate every existing ancestor, including junctions, without creating a directory.
  async _projectDirectory(relative: string, mustExist = false): Promise<string> {
    let current = this.root;
    for (const part of relative.split('/')) {
      current = path.join(current, part);
      let info;
      try { info = await lstat(current); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT' && !mustExist) {
          return path.join(this.root, ...relative.split('/'));
        }
        throw error;
      }
      if (info.isSymbolicLink() || !info.isDirectory() || !inside(this.root, await realpath(current))) {
        throw fail('目录不能包含符号链接、非目录或项目外路径');
      }
    }
    return realpath(current);
  }

  async _category(category: unknown): Promise<string> {
    if (typeof category !== 'string' || !category.startsWith('papers/') ||
      /[\\\x00-\x1f\x7f:%?*"<>|]/.test(category) || category.includes('..') ||
      category.split('/').some((p) => !p || p === '.' || /[. ]$/.test(p) ||
        /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))) {
      throw fail('category必须是papers/内的项目相对目录，不能包含路径遍历或特殊路径');
    }
    await this._projectDirectory(category);
    return category;
  }

  async _collectDirectory(batch: string): Promise<string> {
    const state = JSON.parse((await readFile(await this._batchPath(batch), 'utf8')).replace(/^\uFEFF/, '')) as {
      batch_id?: unknown;
    };
    // providers/ieee.py writes to root/.zhiyue/tmp/state['batch_id']/instsci.
    // Refuse a mismatched ledger instead of collecting another batch's files.
    if (state.batch_id !== batch) throw fail('批次记录编号不一致，不能收集其他批次的输出');
    return this._projectDirectory(`.zhiyue/tmp/${batch}/instsci`, true);
  }

  async _summary(batch: string): Promise<BatchSummary> {
    const state = JSON.parse((await readFile(await this._batchPath(batch), 'utf8')).replace(/^\uFEFF/, '')) as {
      entries?: unknown; 条目?: unknown; scope_note?: unknown;
    };
    const entries = Array.isArray(state.entries)
      ? state.entries as Array<Record<string, unknown>>
      : Array.isArray(state.条目) ? state.条目 as Array<Record<string, unknown>> : [];
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      const status = String(entry.status ?? entry.状态 ?? 'unknown');
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return { batch, entries: entries.length, counts, scope_note: String(state.scope_note ?? '') };
  }

  async _catalogDuplicate(digest: string): Promise<Record<string, unknown> | null> {
    let data: { records?: Array<Record<string, unknown>> };
    try {
      const catalogFile = path.join(libraryPaths(this.root).catalog, '文献索引.json');
      data = JSON.parse((await readFile(catalogFile, 'utf8')).replace(/^\uFEFF/, '')) as typeof data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
    return (data.records ?? []).find((record) =>
      record.sha256 && String(record.sha256).toLowerCase() === digest &&
      record.file_exists !== false) ?? null;
  }

  async listBatches(): Promise<BatchSummary[]> {
    const result: BatchSummary[] = [];
    const dirs = await readdir(libraryPaths(this.root).batches, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    for (const dir of dirs) {
      if (!dir.isDirectory() || !validBatch(dir.name)) continue;
      try { result.push(await this._summary(dir.name)); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    return result.sort((a, b) => b.batch.localeCompare(a.batch));
  }

  async _run(job: JobRecord, command: string, args: string[] = [], onOutput?: (output: string) => void): Promise<void> {
    this._assertOpen();
    const script = await realpath(this.downloader);
    this._assertOpen();
    const step: JobStep = { action: command, status: 'running', startedAt: stamp() };
    job.steps.push(step);
    this._log(job, `\n[${command}] 开始\n`);
    await this._save();
    try {
      this._assertOpen();
      await new Promise<void>((resolve, reject) => {
        const child = spawn(this.python, [script, '--root', this.root, command, ...args], {
          cwd: this.root, shell: false, windowsHide: true, detached: process.platform !== 'win32',
          env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        this.children.add(child);
        let output = '';
        let overflow = false;
        if (onOutput) {
          child.stdout?.setEncoding('utf8');
          child.stdout?.on('data', (text: string) => {
            if (overflow) return;
            output += text;
            if (output.length > 4_000_000) { overflow = true; output = ''; }
          });
        }
        // 按行收集日志，以便即使敏感字段横跨多个数据块也能脱敏。
        const attach = (stream: NodeJS.ReadableStream): void => {
          const decoder = new StringDecoder('utf8');
          let pending = '';
          let discarding = false;
          const consume = (text: string): void => {
            pending += text;
            let index;
            while ((index = pending.indexOf('\n')) !== -1) {
              const line = pending.slice(0, index + 1);
              pending = pending.slice(index + 1);
              if (!discarding) this._log(job, line);
              discarding = false;
            }
            if (pending.length > LOG_LIMIT) { pending = ''; discarding = true; }
          };
          stream.on('data', (data: Buffer | string) => consume(decoder.write(data)));
          stream.on('end', () => {
            consume(decoder.end());
            if (pending && !discarding) this._log(job, `${pending}\n`);
          });
        };
        if (!onOutput) attach(child.stdout as NodeJS.ReadableStream);
        attach(child.stderr as NodeJS.ReadableStream);
        child.once('error', reject);
        child.once('close', (code: number | null, signal: NodeJS.Signals | null) => {
          this.children.delete(child);
          if (this.closed) reject(new Error(INTERRUPTED));
          else if (code !== 0) reject(new Error(`${command}执行失败（exit=${code}, signal=${signal ?? ''}）`));
          else if (overflow) reject(new Error('移动结果超过大小限制。'));
          else {
            try { onOutput?.(output); resolve(); }
            catch (error) { reject(error); }
          }
        });
      });
      this._assertOpen();
      step.status = 'completed';
    } catch (error) {
      step.status = 'failed';
      throw error;
    } finally {
      step.finishedAt = stamp();
      this._notify(job);
      await this._save();
    }
  }

  async _enqueue({ batch = null, title, kind }: {
    batch?: string | null; title?: string; kind?: JobRecord['kind'];
  }, work: (job: JobRecord) => Promise<void>): Promise<JobRecord> {
    this._assertOpen();
    await this.ready;
    this._assertOpen();
    const job: JobRecord = {
      id: randomUUID(), batch, title: String(title ?? '文献任务').slice(0, 300), status: 'queued',
      log: '', steps: [], createdAt: stamp(), updatedAt: stamp(), ...(kind ? { kind } : {}),
    };
    this.jobs.push(job);
    await this._save();
    this._notify(job);
    if (this.closed) return clone(job);
    this.queue = this.queue.catch(() => {}).then(async () => {
      try {
        this._assertOpen();
        job.status = 'running';
        this._notify(job);
        await this._save();
        this._assertOpen();
        await work(job);
        this._assertOpen();
        job.status = job.moveResult?.items.some(({ status }) => status === 'blocked') ? 'partial' : 'completed';
      } catch (error) {
        job.status = 'failed';
        job.error = this.closed ? INTERRUPTED : redact((error as Error).message).slice(-LOG_LIMIT);
        this._log(job, `\n${job.error}\n`);
      } finally {
        if (job.batch) {
          try {
            job.result = await this._summary(job.batch);
            this._log(job, `\n流程结束；批次状态：${JSON.stringify(job.result.counts)}。completed仅表示命令流程结束，只有archived计入归档；needs_review需人工核对。\n`);
          } catch (error) {
            this._log(job, `\n无法读取批次结果：${(error as Error).message}\n`);
          }
        }
        this._notify(job);
        await this._save();
      }
    });
    // Attach a handler immediately for disk failures; later jobs may still proceed.
    this.queue.catch(() => {});
    return clone(job);
  }

  async startDownload({ input, title, channel = 'public', autoArchive = true, category = 'papers/09_情感综述调研/网站导入' }: {
    input: unknown;
    title?: string;
    channel?: string;
    autoArchive?: boolean;
    category?: string;
  }): Promise<JobRecord> {
    if (!['public', 'auto', 'ieee'].includes(channel)) throw fail('下载渠道无效');
    if (typeof autoArchive !== 'boolean') throw fail('autoArchive必须为布尔值');
    const entries = entriesFrom(input);
    await this._category(category);
    const archiveCategory = this.library ? await this.library.ensureCategory(category) : category;
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(new Date()).replaceAll('-', '');
    const batch = `${day}_web_${randomUUID().slice(0, 8)}`;
    return this._enqueue({ batch, title: title ?? `导入${entries.length}篇论文` }, async (job) => {
      await this._category(archiveCategory);
      const batchesDir = libraryPaths(this.root).batches;
      mkdirSync(batchesDir, { recursive: true });
      if (!inside(this.root, await realpath(batchesDir))) throw fail('批次目录不能位于项目外');
      const inputPath = path.join(this.stateDir, `${job.id}_input.json`);
      if (!inside(this.root, await realpath(this.stateDir))) throw fail('任务输入目录逃逸');
      await writeFile(inputPath, JSON.stringify(entries, null, 2), { flag: 'wx', mode: 0o600 });
      await this._run(job, 'import', [inputPath, '--batch', batch, '--category', archiveCategory]);
      await this._run(job, 'download', ['--batch', batch, '--channel', channel]);
      if (channel === 'ieee') await this._run(job, 'ieee', ['--batch', batch, '--submit']);
      if (autoArchive) {
        await this._category(archiveCategory);
        await this._run(job, 'archive', ['--batch', batch]);
      }
    });
  }

  async _importEntry(item: unknown): Promise<ImportEntry> {
    if (!item || typeof item !== 'object') throw fail('导入条目无效');
    const record = item as Record<string, unknown>;
    const title = cleanField(record.title, 300, '题名');
    if (!title) throw fail('请填写论文题名');
    const authors = splitAuthors(record.authors);
    const year = cleanField(record.year, 16, '年份');
    if (year && !/^\d{4}$/.test(year)) throw fail('年份需为四位数字');
    const doi = cleanField(record.doi, 300, 'DOI').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
    if (doi && !/^10\.\d{4,9}\/\S+$/.test(doi)) throw fail('DOI格式不正确');
    return { title, authors, year: year || '待核实', doi };
  }

  async _uploadedPdf(uploadPath: unknown): Promise<string> {
    if (typeof uploadPath !== 'string' || !uploadPath) throw fail('请选择要导入的 PDF');
    let file: string;
    try { file = await realpath(uploadPath); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw fail('上传的 PDF 已不存在，请重新选择');
      throw error;
    }
    const uploads = path.join(this.stateDir, 'uploads');
    if (!inside(uploads, file) || !inside(this.root, file)) throw fail('只能导入本网站上传的 PDF');
    if (path.extname(file).toLowerCase() !== '.pdf') throw fail('只能导入 PDF 文件');
    const info = await stat(file);
    if (!info.isFile() || !info.size) throw fail('PDF 文件为空');
    if (info.size > MAX_IMPORT_BYTES) throw fail('PDF 超过 25 MB');
    const handle = await open(file, 'r');
    let header: Buffer;
    try {
      header = Buffer.alloc(Math.min(1024, info.size));
      await handle.read(header, 0, header.length, 0);
    } finally { await handle.close(); }
    if (!header.includes(Buffer.from('%PDF-'))) throw fail('文件内容不是有效PDF');
    return file;
  }

  async startLocalImports({ uploads, category = 'papers/09_情感综述调研/网站导入' }: {
    uploads: ImportUpload[];
    category?: string;
  }): Promise<{ job: JobRecord; skipped: SkippedImport[] }> {
    if (!Array.isArray(uploads) || !uploads.length) throw fail('请选择要导入的 PDF');
    if (uploads.length > MAX_IMPORT_FILES) throw fail(`一次最多导入 ${MAX_IMPORT_FILES} 个 PDF`);
    await this._category(category);
    const entries: ImportEntry[] = [];
    const files: string[] = [];
    const skipped: SkippedImport[] = [];
    const seen = new Map<string, number>();
    for (const [index, upload] of uploads.entries()) {
      const entry = await this._importEntry(upload);
      const file = await this._uploadedPdf(upload?.uploadPath);
      const digest = await fileDigest(file);
      const archived = await this._catalogDuplicate(digest);
      if (archived) {
        skipped.push({
          index, title: entry.title, literature_id: String(archived.literature_id ?? ''),
          literature_title: typeof archived.title === 'string' ? archived.title : undefined,
          reason: '文献库已有相同 PDF',
        });
        continue;
      }
      if (seen.has(digest)) {
        skipped.push({
          index, title: entry.title, literature_id: '',
          reason: `与本批第 ${(seen.get(digest) ?? 0) + 1} 个文件相同`,
        });
        continue;
      }
      seen.set(digest, index);
      entries.push(entry);
      files.push(file);
    }
    if (!entries.length) {
      const detail = skipped.map((item) =>
        item.literature_id ? `${item.literature_id}《${item.title}》` : `《${item.title}》`).join('、');
      throw Object.assign(new Error(`所选 PDF 均已归档：${detail}`), { statusCode: 409 });
    }
    const archiveCategory = this.library ? await this.library.ensureCategory(category) : category;
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date()).replaceAll('-', '');
    const batch = `${day}_local_${randomUUID().slice(0, 8)}`;
    const title = entries.length === 1
      ? `导入 PDF：${entries[0]?.title ?? ''}` : `批量导入 ${entries.length} 篇 PDF`;
    const job = await this._enqueue({ batch, title }, async (current) => {
      await this._category(archiveCategory);
      const batchesDir = libraryPaths(this.root).batches;
      mkdirSync(batchesDir, { recursive: true });
      if (!inside(this.root, await realpath(batchesDir))) throw fail('批次目录不能位于项目外');
      const inputPath = path.join(this.stateDir, `${current.id}_input.json`);
      if (!inside(this.root, await realpath(this.stateDir))) throw fail('任务输入目录逃逸');
      await writeFile(inputPath, JSON.stringify(entries, null, 2), { flag: 'wx', mode: 0o600 });
      await this._run(current, 'import', [inputPath, '--batch', batch, '--category', archiveCategory]);
      if (skipped.length) this._log(current, `\n已跳过 ${skipped.length} 个重复文件。\n`);
      const failed: Array<{ item: string; title: string }> = [];
      for (const [index, file] of files.entries()) {
        const item = `I${String(index + 1).padStart(4, '0')}`;
        const note = entries.length === 1
          ? '用户在网站导入时确认题名与作者与 PDF 首页一致'
          : '用户在网站批量导入时确认题名与作者与 PDF 首页一致';
        try {
          await this._run(current, 'attach', ['--batch', batch, '--item', item, '--file', file]);
          await this._run(current, 'review', [
            '--batch', batch, '--item', item, '--accept-identity', '--note', note,
          ]);
        } catch (error) {
          if (this.closed) throw error;
          failed.push({ item, title: entries[index]?.title ?? '' });
          this._log(current, `\n${item}《${entries[index]?.title ?? ''}》未能完成核验：${redact((error as Error).message)}\n`);
        }
      }
      await this._run(current, 'archive', ['--batch', batch]);
      if (failed.length) this._log(current, `\n${failed.length} 篇未完成核验，已保留在批次中待处理。\n`);
    });
    return { job, skipped };
  }

  async startAction({ batch, action, submit = false, ...extra }: {
    batch: string;
    action: ActionName;
    submit?: boolean;
    [key: string]: unknown;
  }): Promise<JobRecord> {
    if (!['download', 'verify', 'archive', 'ieee', 'collect'].includes(action)) throw fail('操作无效');
    if (typeof submit !== 'boolean' || (submit && action !== 'ieee')) throw fail('submit仅适用于IEEE提交');
    if (action === 'collect' && Object.keys(extra).length) throw fail('collect目录由本批次确定，不能指定其他参数或目录');
    await this._batchPath(batch);
    if (action === 'collect') await this._collectDirectory(batch);
    return this._enqueue({ batch, title: `${batch} · ${action}` }, async (job) => {
      await this._batchPath(batch);
      const args = ['--batch', batch];
      if (action === 'download') args.push('--channel', 'public', '--retry');
      if (action === 'ieee' && submit) args.push('--submit');
      if (action === 'collect') args.push('--directory', await this._collectDirectory(batch));
      await this._run(job, action, args);
    });
  }

  async startPaperMove(moves: PaperMove[]): Promise<JobRecord> {
    return this._enqueue({ title: `批量移动 ${moves.length} 篇文献`, kind: 'paper-move' }, async (job) => {
      const input = path.join(this.stateDir, `${job.id}_moves.json`);
      if (!inside(this.root, await realpath(this.stateDir))) throw fail('任务输入目录逃逸');
      await writeFile(input, JSON.stringify(moves), { flag: 'wx', mode: 0o600 });
      try {
        await this._run(job, 'move-papers', [input], (output) => {
          const result = JSON.parse(output) as PaperMoveResult;
          const expected = new Map(moves.map(({ paperId, category }) => [paperId, category]));
          if (!Array.isArray(result?.items) || result.items.length !== expected.size ||
            (result.repair !== undefined && typeof result.repair !== 'string')) {
            throw new Error('文献工具返回了无效的移动结果。');
          }
          for (const item of result.items) {
            if (!item || !expected.has(item.paperId) || expected.get(item.paperId) !== item.category ||
              !['moved', 'unchanged', 'blocked', 'failed'].includes(item.status) ||
              (item.error !== undefined && typeof item.error !== 'string') ||
              (item.otherLocations !== undefined && (!Array.isArray(item.otherLocations) ||
                !item.otherLocations.every((file) => typeof file === 'string')))) {
              throw new Error('文献工具返回了无效的移动明细。');
            }
            expected.delete(item.paperId);
            if (item.error) item.error = redact(item.error);
          }
          job.moveResult = result;
          if (result.repair) throw new Error(`请运行文献库修复。事务记录：${result.repair}`);
          if (result.items.some(({ status }) => status === 'failed')) throw new Error('文献移动失败，请核对任务明细。');
        });
      } finally {
        await rm(input, { force: true });
      }
    });
  }

  async refreshCatalog(): Promise<JobRecord> {
    return this._enqueue({ title: '刷新文献索引' }, (job) => this._run(job, 'catalog', ['--no-hash']));
  }
}
