import { randomUUID } from 'node:crypto';
import {
  activeTranslationJob, PDF_TRANSLATION_CONCURRENCY, translationBatchStatus,
  type PdfTranslationBatch, type PdfTranslationBatchRequest, type PdfTranslationCounts,
  type PdfTranslationJob, type PdfTranslationServiceEvent,
} from '../../shared/pdfTranslation.js';
import { errorMessage, statusError } from './errors.js';

export interface TranslationQueueEntry {
  job: PdfTranslationJob;
  fingerprint: string;
  regenerate: boolean;
  skipAnyCached: boolean;
}

interface BatchRecord {
  batch: Omit<PdfTranslationBatch, 'counts' | 'status'>;
  signature: string;
  cancelRequested: boolean;
}

interface ActiveEntry {
  entry: TranslationQueueEntry;
  controller: AbortController;
  done: Promise<void>;
}

/** 队列状态变更在同一事件循环中同步完成；异步执行槽直到资源清理结束才释放。 */
export class PdfTranslationQueue {
  private readonly entries = new Map<string, TranslationQueueEntry>();
  private readonly lastByPaper = new Map<string, string>();
  private readonly batches = new Map<string, BatchRecord>();
  private readonly requests = new Map<string, string>();
  private readonly pending: TranslationQueueEntry[] = [];
  private readonly active = new Map<string, ActiveEntry>();
  private scheduled = false;
  private version = 0;
  get revision(): number { return this.version; }
  private closed = false;

  constructor(
    private readonly run: (entry: TranslationQueueEntry, signal: AbortSignal) => Promise<void>,
    private readonly emit: (event: PdfTranslationServiceEvent) => void,
  ) {}

  private positions(): Map<string, number> {
    return new Map(this.pending.filter(({ job }) => job.status === 'queued')
      .map(({ job }, index) => [job.id, index + 1]));
  }

  private copy(job: PdfTranslationJob, positions?: Map<string, number>): PdfTranslationJob {
    const result = { ...job };
    delete result.queuePosition;
    if (job.status === 'queued') result.queuePosition = (positions ?? this.positions()).get(job.id);
    return result;
  }

  update(entry: TranslationQueueEntry, patch: Partial<PdfTranslationJob>): void {
    Object.assign(entry.job, patch, { updatedAt: new Date().toISOString() });
    this.emit({ type: 'pdfTranslation', revision: ++this.version, job: this.copy(entry.job) });
  }

  forPaper(paperId: string): PdfTranslationJob | null {
    const entry = this.entries.get(this.lastByPaper.get(paperId) ?? '');
    return entry ? this.copy(entry.job) : null;
  }

  unfinished(paperId: string): TranslationQueueEntry | undefined {
    const entry = this.entries.get(this.lastByPaper.get(paperId) ?? '');
    return entry && activeTranslationJob(entry.job) ? entry : undefined;
  }

  assertSame(entry: TranslationQueueEntry, model: string, fingerprint: string, regenerate: boolean): void {
    if (entry.job.model !== model || entry.fingerprint !== fingerprint || entry.regenerate !== regenerate) {
      throw statusError('该文献已使用其他翻译配置排队，请先取消原任务。', 409);
    }
  }

  private ensureOpen(): void {
    if (this.closed) throw statusError('翻译服务正在关闭。', 503);
  }

  private create(
    paperId: string, model: string, fingerprint: string, regenerate: boolean,
    batchId?: string, key: string | null = null, occupied = false,
  ): TranslationQueueEntry {
    const timestamp = new Date().toISOString();
    const entry: TranslationQueueEntry = {
      fingerprint, regenerate, skipAnyCached: !!batchId,
      job: {
        id: randomUUID(), paperId, model, key, batchId,
        status: occupied ? 'skipped' : 'queued', percent: occupied ? 100 : 0,
        stage: occupied ? '已跳过' : '排队中', createdAt: timestamp, updatedAt: timestamp,
        ...(occupied ? { reason: '已在翻译队列中' } : {}),
      },
    };
    this.entries.set(entry.job.id, entry);
    if (!occupied) {
      this.lastByPaper.set(paperId, entry.job.id);
      this.pending.push(entry);
    }
    return entry;
  }

  single(paperId: string, model: string, fingerprint: string, regenerate: boolean, key: string): PdfTranslationJob {
    this.ensureOpen();
    const existing = this.unfinished(paperId);
    if (existing) {
      this.assertSame(existing, model, fingerprint, regenerate);
      return this.copy(existing.job);
    }
    const entry = this.create(paperId, model, fingerprint, regenerate, undefined, key);
    const job = this.copy(entry.job);
    this.emit({ type: 'pdfTranslation', revision: ++this.version, job });
    this.schedule();
    return job;
  }

  private signature(request: PdfTranslationBatchRequest): string {
    return JSON.stringify([request.paperIds, request.model, request.regenerate === true]);
  }

  replay(request: PdfTranslationBatchRequest): PdfTranslationBatch | null {
    const id = this.requests.get(request.requestId);
    if (!id) return null;
    const record = this.batches.get(id)!;
    if (record.signature !== this.signature(request)) {
      throw statusError('该请求编号已用于其他批次，请重新提交。', 409);
    }
    return this.describe(record);
  }

  batch(request: PdfTranslationBatchRequest, fingerprint: string): PdfTranslationBatch {
    this.ensureOpen();
    const replayed = this.replay(request);
    if (replayed) return replayed;
    const id = randomUUID();
    const record: BatchRecord = {
      signature: this.signature(request), cancelRequested: false,
      batch: {
        id, requestId: request.requestId, paperIds: [...request.paperIds], jobIds: [], model: request.model,
        regenerate: request.regenerate === true, createdAt: new Date().toISOString(),
      },
    };
    this.batches.set(id, record);
    this.requests.set(request.requestId, id);
    for (const paperId of request.paperIds) {
      const occupied = !!this.unfinished(paperId);
      const entry = this.create(paperId, request.model, fingerprint, record.batch.regenerate, id, null, occupied);
      record.batch.jobIds.push(entry.job.id);
    }
    const positions = this.positions();
    const batch = this.describe(record);
    const jobs = batch.jobIds.map((id) => this.copy(this.entries.get(id)!.job, positions));
    this.emit({ type: 'pdfTranslationQueue', revision: ++this.version, batch, jobs });
    this.schedule();
    return batch;
  }

  private counts(record: BatchRecord): PdfTranslationCounts {
    const counts: PdfTranslationCounts = {
      total: record.batch.jobIds.length, queued: 0, running: 0, completed: 0,
      skipped: 0, failed: 0, cancelled: 0, processed: 0,
    };
    for (const id of record.batch.jobIds) {
      const job = this.entries.get(id)!.job;
      if (['running', 'cancelling', 'saving'].includes(job.status)) counts.running++;
      else counts[job.status as 'queued' | 'completed' | 'skipped' | 'failed' | 'cancelled']++;
    }
    counts.processed = counts.completed + counts.skipped + counts.failed + counts.cancelled;
    return counts;
  }

  private describe(record: BatchRecord): PdfTranslationBatch {
    const counts = this.counts(record);
    const status = translationBatchStatus(counts, record.cancelRequested);
    return { ...record.batch, paperIds: [...record.batch.paperIds], jobIds: [...record.batch.jobIds], counts, status };
  }

  snapshot(): { jobs: PdfTranslationJob[]; batches: PdfTranslationBatch[] } {
    const positions = this.positions();
    return {
      jobs: [...this.entries.values()].map(({ job }) => this.copy(job, positions)),
      batches: [...this.batches.values()].reverse().map((record) => this.describe(record)),
    };
  }

  private cancelEntry(entry: TranslationQueueEntry): void {
    if (entry.job.status === 'queued') {
      this.update(entry, { status: 'cancelled', stage: '已取消' });
    } else if (entry.job.status === 'running' || entry.job.status === 'cancelling') {
      this.update(entry, { status: 'cancelling', stage: '正在取消' });
      this.active.get(entry.job.id)?.controller.abort();
    }
  }

  cancel(paperId: string, jobId: string): void {
    const entry = this.entries.get(jobId);
    if (!entry || entry.job.paperId !== paperId ||
        !['queued', 'running', 'cancelling'].includes(entry.job.status)) {
      throw statusError('没有可取消的翻译任务。', 409);
    }
    this.cancelEntry(entry);
    this.schedule();
  }

  cancelBatch(id: string): void {
    const record = this.batches.get(id);
    if (!record) throw statusError('翻译批次不存在。', 404);
    const entries = record.batch.jobIds.map((jobId) => this.entries.get(jobId)!);
    if (entries.some(({ job }) => activeTranslationJob(job))) {
      if (!record.cancelRequested) {
        record.cancelRequested = true;
        this.emit({ type: 'pdfTranslationQueue', revision: ++this.version, cancelledBatchId: id });
      }
      for (const entry of entries) this.cancelEntry(entry);
      this.schedule();
    }
  }

  private schedule(): void {
    if (this.closed || this.active.size >= PDF_TRANSLATION_CONCURRENCY || this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      while (!this.closed && this.active.size < PDF_TRANSLATION_CONCURRENCY) {
        const entry = this.pending.shift();
        if (!entry) break;
        if (entry.job.status === 'queued') this.launch(entry);
      }
    });
  }

  private launch(entry: TranslationQueueEntry): void {
    const controller = new AbortController();
    const done = Promise.resolve().then(() => this.run(entry, controller.signal))
      .catch((error: unknown) => {
        this.update(entry, {
          status: controller.signal.aborted ? 'cancelled' : 'failed',
          stage: controller.signal.aborted ? '已取消' : '翻译失败',
          error: controller.signal.aborted ? undefined : errorMessage(error).slice(0, 300),
        });
      }).finally(() => {
        this.active.delete(entry.job.id);
        this.schedule();
      });
    this.active.set(entry.job.id, { entry, controller, done });
    this.update(entry, { status: 'running', stage: '准备翻译' });
  }

  async close(): Promise<void> {
    this.closed = true;
    for (const entry of this.pending) if (entry.job.status === 'queued') this.cancelEntry(entry);
    const active = [...this.active.values()];
    for (const { entry } of active) this.cancelEntry(entry);
    await Promise.all(active.map(({ done }) => done));
  }
}
