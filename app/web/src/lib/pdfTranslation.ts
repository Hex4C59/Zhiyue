import { createReadStream, existsSync } from 'node:fs';
import { lstat, mkdir, mkdtemp, readdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { appPaths } from './appPaths.js';
import { errorMessage, statusError } from './errors.js';
import type { Library } from './library.js';
import { libraryPaths } from './paths.js';
import { downloaderScript, runCli } from './python.js';
import { PDF_TRANSLATION_REVISION, runTranslationWorker, validTranslationOutput } from './pdfTranslationWorker.js';
import type { TranslationModel } from './pdfTranslationWorker.js';
import { PdfTranslationQueue } from './pdfTranslationQueue.js';
import type { TranslationQueueEntry } from './pdfTranslationQueue.js';
import {
  PDF_TRANSLATION_MAX_BATCH,
  type PdfTranslationBatchRequest, type PdfTranslationBatchSubmission, type PdfTranslationJob,
  type PdfTranslationMarkdown, type PdfTranslationResult, type PdfTranslationServiceEvent,
  type PdfTranslationSnapshot, type PdfTranslationStatus,
} from '../../shared/pdfTranslation.js';

const HASH = /^[0-9a-f]{64}$/;
const SAFE_ASSET = /^[A-Za-z0-9._-]{1,180}$/;
const MAX_BYTES = 100 * 1024 * 1024;
const CONFIG_PREFIX_LENGTH = 40;
// 与 readDocument 共用同一份文档大小上限，避免助手一次读入过大的译本。
const MAX_MARKDOWN_BYTES = 3_000_000;
const TRANSLATION_UNAVAILABLE = '该论文暂无与当前原文匹配的已完成中文翻译。';

function translationConfigKey(sourceHash: string, model: TranslationModel): string {
  return createHash('sha256').update(JSON.stringify([sourceHash, model.fingerprint, PDF_TRANSLATION_REVISION]))
    .digest('hex');
}

const configPrefix = (key: string): string => key.slice(0, CONFIG_PREFIX_LENGTH);

/**
 * 定位本机离线解析用的 `mineru-kit`：优先环境变量 ZHIYUE_MINERU_CMD，其次 %LOCALAPPDATA%\Zhiyue\mineru\venv，
 * 最后回退 PATH。MinerU 4.x 的 `mineru` 命令依赖后台服务且默认远程解析，不用于此处。
 */
export function resolveMineruCommand(): string {
  if (process.env.ZHIYUE_MINERU_CMD) return path.resolve(process.env.ZHIYUE_MINERU_CMD);
  const appData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const bundled = path.join(
    appData, 'Zhiyue', 'mineru', 'venv',
    process.platform === 'win32' ? 'Scripts/mineru-kit.exe' : 'bin/mineru-kit',
  );
  if (existsSync(bundled)) return bundled;
  const probe = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['mineru-kit'], {
    encoding: 'utf8', windowsHide: true,
  });
  if (probe.status === 0) {
    const first = probe.stdout.split(/\r?\n/).map((s) => s.trim()).find(Boolean);
    if (first && existsSync(first)) return first;
  }
  return bundled;
}

export interface PdfTranslationOptions {
  root: string;
  python: string;
  library: Pick<Library, 'getPaper' | 'safeFile'>;
  getModel(modelId?: string): TranslationModel | undefined;
  emit(event: PdfTranslationServiceEvent): void;
  mineruCommand?: string;
  worker?: typeof runTranslationWorker;
}

const missing = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === 'ENOENT';

async function checkPath(root: string, target: string, directory: boolean): Promise<void> {
  const relative = path.relative(root, target);
  if (!relative || path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`)) {
    throw statusError('译本路径超出文献库。', 403);
  }
  const info = await lstat(target);
  const resolved = await realpath(target);
  const normalized = (value: string): string => process.platform === 'win32' ? value.toLowerCase() : value;
  if (info.isSymbolicLink() || normalized(resolved) !== normalized(target) ||
    !(directory ? info.isDirectory() : info.isFile())) {
    throw statusError('译本路径包含链接或文件类型错误。', 403);
  }
}

export class PdfTranslationService {
  private readonly mineru: string;
  private readonly script = path.join(appPaths().pythonDir, 'parse_pdf_mineru.py');
  private readonly worker: typeof runTranslationWorker;
  private readonly queue: PdfTranslationQueue;
  private hashCache?: { file: string; stamp: string; hash: string };

  constructor(private readonly options: PdfTranslationOptions) {
    this.mineru = options.mineruCommand || resolveMineruCommand();
    this.worker = options.worker ?? runTranslationWorker;
    this.queue = new PdfTranslationQueue((entry, signal) => this.run(entry, signal), options.emit);
  }

  private async source(id: string): Promise<string> {
    if (!/^L\d+$/.test(id)) throw statusError('文献编号无效。', 400);
    const paper = await this.options.library.getPaper(id);
    if (!paper?.file || !paper.file.startsWith('papers/') || path.extname(paper.file).toLowerCase() !== '.pdf') {
      throw statusError('没有可用的原文 PDF。', 404);
    }
    return this.options.library.safeFile(paper.file);
  }

  private async hash(file: string): Promise<string> {
    const stamp = async (): Promise<string> => {
      const info = await stat(file, { bigint: true });
      if (info.size > MAX_BYTES) throw statusError('单次可翻译的 PDF 最大为 100 MB。', 413);
      return `${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`;
    };
    const before = await stamp();
    if (this.hashCache?.file === file && this.hashCache.stamp === before) return this.hashCache.hash;
    const digest = createHash('sha256');
    for await (const chunk of createReadStream(file)) digest.update(chunk);
    const hash = digest.digest('hex');
    if (await stamp() !== before) throw statusError('原文正在变化，请稍后重试。', 409);
    this.hashCache = { file, stamp: before, hash };
    return hash;
  }

  private resultBase(root: string, id: string): string {
    return path.join(libraryPaths(root).data, 'translations', id);
  }

  private async resultAt(root: string, id: string, key: string): Promise<PdfTranslationResult | null> {
    const dir = path.join(this.resultBase(root, id), key);
    const manifest = path.join(dir, 'result.json');
    try {
      await checkPath(root, manifest, false);
      await checkPath(root, path.join(dir, 'zh.md'), false);
      if ((await stat(manifest)).size > 16_384) throw statusError('译本记录过大。', 500);
      const result = JSON.parse(await readFile(manifest, 'utf8')) as PdfTranslationResult;
      if (!result || typeof result.sourceHash !== 'string' || !HASH.test(result.sourceHash) ||
        result.key !== key || typeof result.model !== 'string' ||
        typeof result.completedAt !== 'string' || Number.isNaN(Date.parse(result.completedAt)) ||
        !validTranslationOutput(result)) throw statusError('译本记录无效。', 500);
      return result;
    } catch (error) {
      if (missing(error)) return null;
      throw error;
    }
  }

  private async resultKeys(root: string, id: string): Promise<string[]> {
    const base = this.resultBase(root, id);
    try {
      await checkPath(root, base, true);
      return (await readdir(base)).filter((entry) => HASH.test(entry));
    } catch (error) {
      if (missing(error)) return [];
      throw error;
    }
  }

  private async latestResult(
    root: string, id: string, sourceHash: string, keys: string[],
  ): Promise<PdfTranslationResult | null> {
    let latest: PdfTranslationResult | null = null;
    let latestTime = -Infinity;
    for (const key of keys) {
      const result = await this.resultAt(root, id, key);
      if (result?.sourceHash !== sourceHash) continue;
      const time = Date.parse(result.completedAt);
      if (!latest || time > latestTime || (time === latestTime && key > latest.key)) {
        latest = result;
        latestTime = time;
      }
    }
    return latest;
  }

  async status(id: string): Promise<PdfTranslationStatus> {
    const source = await this.source(id);
    const root = await realpath(this.options.root);
    const job = this.queue.forPaper(id);
    const keys = await this.resultKeys(root, id);
    const model = this.options.getModel();
    let configKey: string | undefined;
    let result: PdfTranslationResult | null = null;
    if (keys.length && (await stat(source)).size <= MAX_BYTES) {
      const sourceHash = await this.hash(source);
      configKey = model && translationConfigKey(sourceHash, model);
      // 阅读器展示同一原文的最新成品，默认模型只影响下一次提交。
      result = await this.latestResult(root, id, sourceHash, keys);
    }
    return {
      engineAvailable: existsSync(this.mineru),
      model: model?.id ?? null,
      job,
      result,
      updateAvailable: !!(result && configKey && !result.key.startsWith(configPrefix(configKey))),
    };
  }

  private async verifiedResult(id: string, key: string): Promise<{ root: string; dir: string; result: PdfTranslationResult }> {
    if (!HASH.test(key)) throw statusError('译本编号无效。', 400);
    const source = await this.source(id);
    const root = await realpath(this.options.root);
    const result = await this.resultAt(root, id, key);
    if (!result || result.sourceHash !== await this.hash(source)) throw statusError('当前原文没有该译本。', 404);
    return { root, dir: path.join(this.resultBase(root, id), key), result };
  }

  async file(id: string, key: string): Promise<string> {
    const { dir } = await this.verifiedResult(id, key);
    return path.join(dir, 'zh.md');
  }

  async markdown(id: string, key: string): Promise<PdfTranslationMarkdown> {
    const { dir, result } = await this.verifiedResult(id, key);
    const text = await readFile(path.join(dir, 'zh.md'), 'utf8');
    return { key, text, result };
  }

  /**
   * 读取与当前原文 SHA-256 匹配的最新已完成译本正文，供助手按需分段取用。
   * 只读路径复用 checkPath，拒绝符号链接与越界；原文过大或尚无匹配译本时返回 available=false，不抛 404。
   */
  async readLatestMarkdown(id: string, offset?: number, limit?: number): Promise<{
    paperId: string; available: boolean; message?: string; key?: string; model?: string; completedAt?: string;
    offset?: number; totalChars?: number; text?: string; truncated?: boolean;
  }> {
    const start = offset === undefined ? 0 : offset;
    const count = limit === undefined ? 60_000 : limit;
    if (!Number.isSafeInteger(start) || (start as number) < 0 || !Number.isSafeInteger(count) ||
      (count as number) < 1 || (count as number) > 120_000) {
      throw statusError('译本读取偏移或长度无效。', 400);
    }
    const unavailable = { paperId: id, available: false, message: TRANSLATION_UNAVAILABLE };
    const source = await this.source(id);
    const root = await realpath(this.options.root);
    if ((await stat(source)).size > MAX_BYTES) return unavailable;
    const sourceHash = await this.hash(source);
    const keys = await this.resultKeys(root, id);
    const result = await this.latestResult(root, id, sourceHash, keys);
    if (!result) return unavailable;
    const file = path.join(this.resultBase(root, id), result.key, 'zh.md');
    await checkPath(root, file, false);
    if ((await stat(file)).size > MAX_MARKDOWN_BYTES) return unavailable;
    const text = (await readFile(file, 'utf8')).replace(/^\uFEFF/, '');
    const slice = text.slice(start as number, (start as number) + (count as number));
    return {
      paperId: id, available: true, key: result.key, model: result.model, completedAt: result.completedAt,
      offset: start, totalChars: text.length, text: slice, truncated: (start as number) + slice.length < text.length,
    };
  }

  async asset(id: string, key: string, filename: string): Promise<string> {
    if (!SAFE_ASSET.test(filename) || filename === '.' || filename === '..') {
      throw statusError('图片文件名无效。', 400);
    }
    const { root, dir } = await this.verifiedResult(id, key);
    const target = path.join(dir, 'images', filename);
    try {
      await checkPath(root, target, false);
    } catch (error) {
      if (missing(error)) throw statusError('图片不存在。', 404);
      throw error;
    }
    return target;
  }

  snapshot(): PdfTranslationSnapshot {
    return {
      engineAvailable: existsSync(this.mineru), model: this.options.getModel()?.id ?? null,
      ...this.queue.snapshot(),
    };
  }

  private requireModel(approvedModel: unknown): TranslationModel {
    if (!existsSync(this.mineru)) {
      throw statusError('请先安装 MinerU 解析环境（详见项目 README）。', 503);
    }
    const requested = typeof approvedModel === 'string' && approvedModel.trim() ? approvedModel.trim() : undefined;
    const model = requested ? this.options.getModel(requested) : this.options.getModel();
    if (!model) {
      if (requested && this.options.getModel()) {
        throw statusError('所选翻译模型不可用，请重新选择模型后重试。', 409);
      }
      throw statusError('请先在「模型与密钥」中配置 Pi 模型。', 409);
    }
    if (approvedModel !== model.id) throw statusError('默认模型已变化，请确认当前模型后重试。', 409);
    return model;
  }

  private batchRequest(input: unknown): PdfTranslationBatchRequest {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw statusError('批次参数无效。', 400);
    const { requestId, paperIds, model, regenerate } = input as Record<string, unknown>;
    if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(requestId)) {
      throw statusError('批次请求编号无效。', 400);
    }
    if (!Array.isArray(paperIds) || !paperIds.length ||
        paperIds.some((id) => typeof id !== 'string' || id.length > 32 || !/^L\d+$/.test(id))) {
      throw statusError('请选择有效的文献编号。', 400);
    }
    const unique = [...new Set(paperIds as string[])];
    if (unique.length > PDF_TRANSLATION_MAX_BATCH) {
      throw statusError(`每批最多选择 ${PDF_TRANSLATION_MAX_BATCH} 篇文献。`, 400);
    }
    if (typeof model !== 'string' || !model.trim() || model.length > 300 || model !== model.trim()) {
      throw statusError('请选择翻译模型。', 400);
    }
    if (regenerate !== undefined && typeof regenerate !== 'boolean') {
      throw statusError('重新生成标志必须是布尔值。', 400);
    }
    return { requestId, paperIds: unique, model, regenerate: regenerate === true };
  }

  startBatch(input: unknown): PdfTranslationBatchSubmission {
    const request = this.batchRequest(input);
    const replayed = this.queue.replay(request);
    if (replayed) return { batch: replayed, snapshot: this.snapshot(), replayed: true };
    const model = this.requireModel(request.model);
    const batch = this.queue.batch(request, model.fingerprint);
    return { batch, snapshot: this.snapshot(), replayed: false };
  }

  cancelBatch(id: string): PdfTranslationSnapshot {
    this.queue.cancelBatch(id);
    return this.snapshot();
  }

  async start(id: string, approvedModel: unknown, regenerate = false): Promise<PdfTranslationStatus> {
    const model = this.requireModel(approvedModel);
    const source = await this.source(id);
    const root = await realpath(this.options.root);
    const sourceHash = await this.hash(source);
    const configKey = translationConfigKey(sourceHash, model);
    const prefix = configPrefix(configKey);
    const keys = await this.resultKeys(root, id);
    const result = await this.latestResult(root, id, sourceHash, keys);
    const status = {
      engineAvailable: true, model: model.id, result, updateAvailable: !!result && !result.key.startsWith(prefix),
    };
    const existing = this.queue.unfinished(id);
    if (existing) {
      this.queue.assertSame(existing, model.id, model.fingerprint, regenerate);
      if (existing.job.key && !existing.job.key.startsWith(prefix)) {
        throw statusError('该文献的旧原文仍在翻译，请先取消原任务。', 409);
      }
      return { ...status, job: this.queue.forPaper(id) };
    }
    if (!regenerate) {
      const cached = await this.latestResult(root, id, sourceHash, keys.filter((key) => key.startsWith(prefix)));
      if (cached) return { ...status, result: cached, updateAvailable: false, job: null };
    }
    const key = regenerate ? prefix + randomBytes(12).toString('hex') : configKey;
    const job = this.queue.single(id, model.id, model.fingerprint, regenerate, key);
    return { ...status, job };
  }

  private async run(entry: TranslationQueueEntry, signal: AbortSignal): Promise<void> {
    const { job } = entry;
    let terminal: Partial<PdfTranslationJob>;
    let work: string | undefined;
    try {
      signal.throwIfAborted();
      // 每篇重新创建模型会话，核对提交时的配置，避免队列等待期间悄悄换模型或跨论文共享上下文。
      const model = this.requireModel(job.model);
      if (model.fingerprint !== entry.fingerprint) {
        throw statusError('所选翻译模型配置已变化，请重新提交该论文。', 409);
      }
      const source = await this.source(job.paperId);
      const root = await realpath(this.options.root);
      const sourceHash = await this.hash(source);
      const configKey = translationConfigKey(sourceHash, model);
      const prefix = configPrefix(configKey);
      const keys = await this.resultKeys(root, job.paperId);
      const previous = await this.latestResult(root, job.paperId, sourceHash, keys);
      signal.throwIfAborted();
      if (!entry.regenerate) {
        const cached = entry.skipAnyCached ? previous : await this.latestResult(
          root, job.paperId, sourceHash, keys.filter((key) => key.startsWith(prefix)),
        );
        if (cached) {
          this.queue.update(entry, {
            key: cached.key, status: job.batchId ? 'skipped' : 'completed', percent: 100,
            stage: job.batchId ? '已跳过' : '已有有效译本', reason: '已有与当前原文匹配的译本',
          });
          return;
        }
      }
      const key = entry.regenerate
        ? job.key?.startsWith(prefix) ? job.key : prefix + randomBytes(12).toString('hex')
        : configKey;
      this.queue.update(entry, { key, stage: '准备翻译' });
      const tmp = libraryPaths(root).tmp;
      await checkPath(root, tmp, true);
      work = await mkdtemp(path.join(tmp, 'translate-'));
      signal.throwIfAborted();
      const output = await this.worker({
        python: this.options.python, mineru: this.mineru, script: this.script,
        source, sourceHash, work, model, signal,
        progress: (percent, stage) => {
          if (!signal.aborted && (percent > job.percent || job.stage !== stage)) {
            this.queue.update(entry, { percent: Math.max(percent, job.percent), stage });
          }
        },
      });
      signal.throwIfAborted();
      const resultDir = path.join(work, 'result');
      await checkPath(root, path.join(resultDir, 'zh.md'), false);
      const minimum = previous ? Date.parse(previous.completedAt) + 1 : 0;
      const completedAt = new Date(Math.max(Date.now(), minimum)).toISOString();
      const result: PdfTranslationResult = { key, sourceHash, model: model.id, completedAt, ...output };
      await writeFile(path.join(resultDir, 'result.json'), JSON.stringify(result), { flag: 'wx' });
      const currentSource = await this.source(job.paperId);
      signal.throwIfAborted();
      this.queue.update(entry, { status: 'saving', stage: '保存译本', percent: 99 });
      await runCli({
        python: this.options.python, root, script: this.script, timeout: 20_000,
        args: ['publish', '--work', work, '--source', currentSource, '--source-hash', sourceHash,
          '--paper', job.paperId, '--key', key, '--downloader', path.dirname(downloaderScript)],
      });
      terminal = { status: 'completed', percent: 100, stage: '翻译完成' };
    } catch (error) {
      terminal = signal.aborted
        ? { status: 'cancelled', stage: '已取消' }
        : { status: 'failed', stage: '翻译失败', error: errorMessage(error).slice(0, 300) };
    } finally {
      try {
        if (work) await rm(work, { recursive: true, force: true });
      } catch (error) {
        console.error('无法清理 PDF 翻译临时目录。', (error as NodeJS.ErrnoException).code);
      }
    }
    this.queue.update(entry, terminal);
  }

  async cancel(id: string, jobId: unknown): Promise<PdfTranslationStatus> {
    if (typeof jobId !== 'string') throw statusError('翻译任务编号无效。', 400);
    this.queue.cancel(id, jobId);
    return this.status(id);
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
