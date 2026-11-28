export const PDF_TRANSLATION_MAX_BATCH = 1000;
export const PDF_TRANSLATION_CONCURRENCY = 2;

export interface PdfTranslationResult {
  key: string;
  sourceHash: string;
  model: string;
  completedAt: string;
  sections: number;
  images: number;
}

export type PdfTranslationJobStatus =
  | 'queued' | 'running' | 'cancelling' | 'saving' | 'completed' | 'skipped' | 'cancelled' | 'failed';

export interface PdfTranslationJob {
  id: string;
  paperId: string;
  model: string;
  batchId?: string;
  /** 排队时可能尚未计算原文哈希；准备生成后填入真正发布的译本键。 */
  key: string | null;
  status: PdfTranslationJobStatus;
  percent: number;
  stage: string;
  /** 从 1 开始，仅排队任务提供；当前执行项不计入排队位置。 */
  queuePosition?: number;
  createdAt: string;
  updatedAt: string;
  reason?: string;
  error?: string;
}

export const activeTranslationJob = (job?: Pick<PdfTranslationJob, 'status'> | null): boolean =>
  !!job && ['queued', 'running', 'cancelling', 'saving'].includes(job.status);

export interface PdfTranslationCounts {
  total: number;
  queued: number;
  running: number;
  completed: number;
  skipped: number;
  failed: number;
  cancelled: number;
  processed: number;
}

export interface PdfTranslationBatch {
  id: string;
  requestId: string;
  paperIds: string[];
  jobIds: string[];
  model: string;
  regenerate: boolean;
  createdAt: string;
  status: 'queued' | 'running' | 'cancelling' | 'completed' | 'partial' | 'failed' | 'cancelled';
  counts: PdfTranslationCounts;
}

export interface PdfTranslationEnvironment {
  revision: number;
  engineAvailable: boolean;
  model: string | null;
}

export interface PdfTranslationSnapshot extends PdfTranslationEnvironment {
  batches: PdfTranslationBatch[];
  jobs: PdfTranslationJob[];
}

export interface PdfTranslationBatchRequest {
  requestId: string;
  paperIds: string[];
  model: string;
  regenerate?: boolean;
}

export interface PdfTranslationBatchSubmission {
  batch: PdfTranslationBatch;
  snapshot: PdfTranslationSnapshot;
  replayed: boolean;
}

export interface PdfTranslationStatus {
  engineAvailable: boolean;
  model: string | null;
  job: PdfTranslationJob | null;
  result: PdfTranslationResult | null;
  updateAvailable: boolean;
}

export interface PdfTranslationMarkdown {
  key: string;
  text: string;
  result: PdfTranslationResult;
}

export interface PdfTranslationEvent {
  type: 'pdfTranslation';
  revision: number;
  job: PdfTranslationJob;
}

export type PdfTranslationQueueEvent = { type: 'pdfTranslationQueue'; revision: number } & (
  { batch: PdfTranslationBatch; jobs: PdfTranslationJob[] } | { cancelledBatchId: string }
);

export type PdfTranslationServiceEvent = PdfTranslationEvent | PdfTranslationQueueEvent;

export function translationBatchStatus(
  counts: PdfTranslationCounts, cancelRequested: boolean,
): PdfTranslationBatch['status'] {
  if (counts.running || counts.queued) {
    if (cancelRequested) return 'cancelling';
    return counts.running || counts.processed ? 'running' : 'queued';
  }
  if (cancelRequested || counts.cancelled === counts.total) return 'cancelled';
  if (counts.failed || counts.cancelled) return counts.failed === counts.total ? 'failed' : 'partial';
  return 'completed';
}

/** 汇总终态时分别计数，跳过或失败仅计入已处理，不计作新生成的译本。 */
export function translationCounts(jobs: readonly PdfTranslationJob[]): PdfTranslationCounts {
  const counts: PdfTranslationCounts = {
    total: jobs.length, queued: 0, running: 0, completed: 0,
    skipped: 0, failed: 0, cancelled: 0, processed: 0,
  };
  for (const job of jobs) {
    if (['running', 'cancelling', 'saving'].includes(job.status)) counts.running++;
    else counts[job.status as 'queued' | 'completed' | 'skipped' | 'failed' | 'cancelled']++;
  }
  counts.processed = counts.completed + counts.skipped + counts.failed + counts.cancelled;
  return counts;
}
