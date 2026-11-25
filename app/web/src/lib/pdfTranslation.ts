import { createReadStream, existsSync } from 'node:fs';
import { lstat, mkdir, mkdtemp, readdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { appPaths } from './appPaths.js';
import { errorMessage, statusError } from './errors.js';
import type { Library } from './library.js';
import { libraryPaths } from './paths.js';
import { downloaderScript, runCli } from './python.js';
import { PDF_TRANSLATION_REVISION, runTranslationWorker, validTranslationPages } from './pdfTranslationWorker.js';
import type { TranslationModel } from './pdfTranslationWorker.js';
import type {
  PdfTranslationEvent, PdfTranslationJob, PdfTranslationResult, PdfTranslationStatus,
} from './pdfTranslationTypes.js';

const HASH = /^[0-9a-f]{64}$/;
const MAX_BYTES = 100 * 1024 * 1024;

function translationKey(sourceHash: string, model: TranslationModel): string {
  return createHash('sha256').update(JSON.stringify([sourceHash, model.fingerprint, PDF_TRANSLATION_REVISION]))
    .digest('hex');
}

export function resolveTranslationPython(): string {
  if (process.env.ZHIYUE_TRANSLATION_PYTHON) return path.resolve(process.env.ZHIYUE_TRANSLATION_PYTHON);
  const appData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(appData, 'Zhiyue', 'translation', 'venv',
    process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
}

export interface PdfTranslationOptions {
  root: string;
  python: string;
  library: Pick<Library, 'getPaper' | 'safeFile'>;
  getModel(): TranslationModel | undefined;
  emit(event: PdfTranslationEvent): void;
  enginePython?: string;
  worker?: typeof runTranslationWorker;
}

interface ActiveTranslation {
  job: PdfTranslationJob;
  controller: AbortController;
  done: Promise<void>;
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
  private readonly engine: string;
  private readonly script = path.join(appPaths().sourceLibDir, 'translate_pdf.py');
  private readonly worker: typeof runTranslationWorker;
  private active?: ActiveTranslation;
  private readonly lastJobs = new Map<string, PdfTranslationJob>();
  private closed = false;
  private hashCache?: { file: string; stamp: string; hash: string };

  constructor(private readonly options: PdfTranslationOptions) {
    this.engine = options.enginePython || resolveTranslationPython();
    this.worker = options.worker ?? runTranslationWorker;
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
      await checkPath(root, path.join(dir, 'zh.pdf'), false);
      if ((await stat(manifest)).size > 16_384) throw statusError('译本记录过大。', 500);
      const result = JSON.parse(await readFile(manifest, 'utf8')) as PdfTranslationResult;
      if (!result || typeof result.sourceHash !== 'string' || !HASH.test(result.sourceHash) ||
        result.key !== key || typeof result.model !== 'string' ||
        typeof result.completedAt !== 'string' || Number.isNaN(Date.parse(result.completedAt)) ||
        !validTranslationPages(result)) throw statusError('译本记录无效。', 500);
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

  private async preferredResult(
    root: string, id: string, sourceHash: string, keys: string[], preferred?: string,
  ): Promise<PdfTranslationResult | null> {
    if (preferred) {
      const exact = await this.resultAt(root, id, preferred);
      if (exact?.sourceHash === sourceHash) return exact;
    }
    let latest: PdfTranslationResult | null = null;
    for (const key of keys) {
      if (key === preferred) continue;
      const result = await this.resultAt(root, id, key);
      if (result?.sourceHash === sourceHash && (!latest || Date.parse(result.completedAt) > Date.parse(latest.completedAt))) {
        latest = result;
      }
    }
    return latest;
  }

  async status(id: string): Promise<PdfTranslationStatus> {
    const source = await this.source(id);
    const root = await realpath(this.options.root);
    // 先拍下任务状态。磁盘查询期间发布的新结果不能让旧的查询误报为已完成。
    const lastJob = this.lastJobs.get(id);
    const job = lastJob ? { ...lastJob } : null;
    const keys = await this.resultKeys(root, id);
    const model = this.options.getModel();
    let preferred: string | undefined;
    let result: PdfTranslationResult | null = null;
    if (keys.length && (await stat(source)).size <= MAX_BYTES) {
      const sourceHash = await this.hash(source);
      preferred = model && translationKey(sourceHash, model);
      result = await this.preferredResult(root, id, sourceHash, keys, preferred);
    }
    return {
      engineAvailable: existsSync(this.engine),
      model: model?.id ?? null,
      job,
      result,
      updateAvailable: !!(result && preferred && result.key !== preferred),
    };
  }

  async file(id: string, key: string): Promise<string> {
    if (!HASH.test(key)) throw statusError('译本编号无效。', 400);
    const source = await this.source(id);
    const root = await realpath(this.options.root);
    const result = await this.resultAt(root, id, key);
    if (!result || result.sourceHash !== await this.hash(source)) throw statusError('当前原文没有该译本。', 404);
    return path.join(this.resultBase(root, id), key, 'zh.pdf');
  }

  private notify(job: PdfTranslationJob, patch: Partial<PdfTranslationJob>): void {
    Object.assign(job, patch);
    this.lastJobs.set(job.paperId, job);
    this.options.emit({ type: 'pdfTranslation', job: { ...job } });
  }

  async start(id: string, approvedModel: unknown): Promise<PdfTranslationStatus> {
    if (!existsSync(this.engine)) {
      throw statusError('请先安装 PDF 翻译运行环境，安装方法见项目 README。', 503);
    }
    const model = this.options.getModel();
    if (!model) throw statusError('请先在「模型与密钥」中配置 Pi 模型。', 409);
    if (approvedModel !== model.id) throw statusError('默认模型已变化，请确认当前模型后重试。', 409);
    const source = await this.source(id);
    const root = await realpath(this.options.root);
    const sourceHash = await this.hash(source);
    const key = translationKey(sourceHash, model);
    const keys = await this.resultKeys(root, id);
    const result = await this.preferredResult(root, id, sourceHash, keys, key);
    const status = { engineAvailable: true, model: model.id, result, updateAvailable: !!result && result.key !== key };
    if (result?.key === key) return { ...status, job: null };
    if (this.closed) throw statusError('应用正在退出。', 503);
    if (this.active) {
      const active = this.active.job;
      if (active.paperId === id && active.key === key) return { ...status, job: { ...active } };
      throw statusError(`正在处理 ${active.paperId}，请等当前翻译完成。`, 409);
    }
    const job: PdfTranslationJob = {
      id: randomUUID(), paperId: id, key, status: 'running', percent: 0, stage: '准备翻译',
    };
    const controller = new AbortController();
    const done = this.run(root, source, sourceHash, model, job, controller.signal);
    this.active = { job, controller, done };
    this.notify(job, {});
    return { ...status, job: { ...job } };
  }

  private async run(root: string, source: string, sourceHash: string, model: TranslationModel,
    job: PdfTranslationJob, signal: AbortSignal): Promise<void> {
    const { key } = job;
    let terminal: Partial<PdfTranslationJob>;
    let work: string | undefined;
    try {
      const tmp = libraryPaths(root).tmp;
      await checkPath(root, tmp, true);
      work = await mkdtemp(path.join(tmp, 'translate-'));
      const output = await this.worker({
        python: this.engine, script: this.script, source, sourceHash, work, model, signal,
        progress: (percent, stage) => {
          if (!signal.aborted && (percent > job.percent || job.stage !== stage)) {
            this.notify(job, { percent: Math.max(percent, job.percent), stage });
          }
        },
      });
      signal.throwIfAborted();
      const resultDir = path.join(work, 'result');
      await checkPath(root, path.join(resultDir, 'zh.pdf'), false);
      const result: PdfTranslationResult = {
        key, sourceHash, model: model.id, completedAt: new Date().toISOString(), ...output,
      };
      await writeFile(path.join(resultDir, 'result.json'), JSON.stringify(result), { flag: 'wx' });
      const currentSource = await this.source(job.paperId);
      signal.throwIfAborted();
      this.notify(job, { status: 'saving', stage: '保存译本', percent: 99 });
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
      } finally {
        this.active = undefined;
      }
    }
    // 终态发出时，译本已原子发布或取消已收尾，可以立即重试。
    this.notify(job, terminal);
  }

  async cancel(id: string, jobId: unknown): Promise<PdfTranslationStatus> {
    const active = this.active;
    if (!active || active.job.paperId !== id || active.job.id !== jobId || active.job.status !== 'running') {
      throw statusError('该翻译任务已结束或正在保存。', 409);
    }
    this.notify(active.job, { status: 'cancelling', stage: '正在取消' });
    active.controller.abort();
    return this.status(id);
  }

  async close(): Promise<void> {
    this.closed = true;
    const active = this.active;
    if (active?.job.status === 'running') active.controller.abort();
    await active?.done;
  }
}
