import { computed, shallowReactive } from 'vue';
import {
  activeTranslationJob, PDF_TRANSLATION_MAX_BATCH, translationCounts,
  type PdfTranslationBatch, type PdfTranslationBatchRequest, type PdfTranslationBatchSubmission,
  type PdfTranslationCounts, type PdfTranslationJob, type PdfTranslationSnapshot,
} from '../../shared/pdfTranslation';
import type { ApiFn } from './workspaceLibrary';
import { json } from './content';
import type { ModelOption, Paper, WorkspaceEvent, WorkspaceState } from './types';

const MODEL_KEY = 'zhiyue.translationModel';

export function storedTranslationModel(): string {
  try { return window.localStorage.getItem(MODEL_KEY) || ''; }
  catch { return ''; }
}

export function translatablePaper(paper?: Paper): boolean {
  return !!paper?.file?.startsWith('papers/') && paper.file.toLowerCase().endsWith('.pdf') &&
    paper._file_exists !== false;
}

interface TranslationDeps {
  state: WorkspaceState;
  api: ApiFn;
  paperById: () => ReadonlyMap<string, Paper>;
  models: () => ModelOption[];
  isStopped: () => boolean;
  toast: (message: string, error?: boolean) => void;
}

export function createWorkspaceTranslationActions({
  state, api, paperById, models, isStopped, toast,
}: TranslationDeps) {
  let requestVersion = 0;
  let eventVersion = 0;
  const jobVersions = new Map<string, number>();
  let pending: { request: PdfTranslationBatchRequest; signature: string } | null = null;

  const translationModelOption = computed(() => models().find(({ id }) => id === state.translationModel) ||
    models().find(({ id }) => id === state.translationSnapshot.model) ||
    models().find(({ isDefault }) => isDefault) || models()[0]);
  const jobsById = shallowReactive(new Map<string, PdfTranslationJob>());
  const jobPositions = new Map<string, number>();
  const singlesById = shallowReactive(new Map<string, PdfTranslationJob>());
  const groupCounts = shallowReactive(new Map<string, PdfTranslationCounts>());
  const translationJobs = computed<ReadonlyMap<string, PdfTranslationJob>>(() => jobsById);
  const translationSingles = computed(() => [...singlesById.values()]);
  const candidateIds = computed(() => new Set(state.translationCandidates));
  const translationActivity = computed(() => {
    const counts = translationCounts([]);
    let active = 0;
    for (const [batchId, group] of groupCounts) {
      const running = group.queued + group.running;
      if (!running) continue;
      active += running;
      // 单篇只汇总进行中的项；有进行中任务的批次则同时展示该批次已处理的数量。
      if (!batchId) {
        counts.total += running;
        counts.queued += group.queued;
        counts.running += group.running;
      } else {
        for (const key of Object.keys(counts) as Array<keyof PdfTranslationCounts>) counts[key] += group[key];
      }
    }
    return { active, ...counts };
  });

  function sameJob(a: PdfTranslationJob | undefined, b: PdfTranslationJob): boolean {
    return !!a && Object.keys(a).length === Object.keys(b).length &&
      (Object.keys(b) as Array<keyof PdfTranslationJob>).every((key) => a[key] === b[key]);
  }

  function adjustCount(counts: PdfTranslationCounts, job: PdfTranslationJob, delta: number): void {
    const status = activeTranslationJob(job) && job.status !== 'queued' ? 'running' : job.status;
    counts.total += delta;
    counts[status as 'queued' | 'running' | 'completed' | 'skipped' | 'failed' | 'cancelled'] += delta;
    if (!activeTranslationJob(job)) counts.processed += delta;
  }

  /** 快照加载时重建位置索引；保留未变任务的对象及 Map 项，增量事件只触发所属批次。 */
  function rebuildJobIndex(): void {
    jobPositions.clear();
    const present = new Set<string>();
    const groups = new Map<string, PdfTranslationCounts>();
    state.translationSnapshot.jobs.forEach((job, index) => {
      present.add(job.id);
      jobPositions.set(job.id, index);
      if (jobsById.get(job.id) !== job) jobsById.set(job.id, job);
      if (!job.batchId) singlesById.set(job.id, job);
      else singlesById.delete(job.id);
      const group = groups.get(job.batchId ?? '') ?? translationCounts([]);
      adjustCount(group, job, 1);
      groups.set(job.batchId ?? '', group);
    });
    for (const id of jobsById.keys()) {
      if (!present.has(id)) { jobsById.delete(id); singlesById.delete(id); jobVersions.delete(id); }
    }
    // Map 更新已有值不会改变插入顺序；完整快照重排时同步单篇列表的实际顺序。
    const singles = state.translationSnapshot.jobs.filter((job) => !job.batchId);
    const previousOrder = [...singlesById.keys()];
    if (singles.some((job, index) => previousOrder[index] !== job.id)) {
      singlesById.clear();
      for (const job of singles) singlesById.set(job.id, job);
    }
    for (const id of groupCounts.keys()) if (!groups.has(id)) groupCounts.delete(id);
    for (const [id, counts] of groups) {
      const previous = groupCounts.get(id);
      if (!previous || (Object.keys(counts) as Array<keyof PdfTranslationCounts>)
        .some((key) => previous[key] !== counts[key])) groupCounts.set(id, counts);
    }
  }

  function upsertJob(job: PdfTranslationJob): void {
    const previous = jobsById.get(job.id);
    if (sameJob(previous, job)) return;
    const jobs = state.translationSnapshot.jobs;
    let index = jobPositions.get(job.id);
    if (index === undefined) {
      index = jobs.length;
      jobPositions.set(job.id, index);
      jobs.push({ ...job });
    } else jobs[index] = { ...job };
    const next = jobs[index]!;
    jobsById.set(job.id, next);
    if (next.batchId) singlesById.delete(job.id);
    else singlesById.set(job.id, next);
    if (previous?.batchId === next.batchId && previous?.status === next.status) return;
    const groups = new Set([next.batchId ?? '', ...(previous ? [previous.batchId ?? ''] : [])]);
    for (const id of groups) {
      const counts = { ...(groupCounts.get(id) ?? translationCounts([])) };
      if (previous && (previous.batchId ?? '') === id) adjustCount(counts, previous, -1);
      if ((next.batchId ?? '') === id) adjustCount(counts, next, 1);
      if (counts.total) groupCounts.set(id, counts);
      else groupCounts.delete(id);
    }
  }

  rebuildJobIndex();

  function batchJobs(batch: PdfTranslationBatch): PdfTranslationJob[] {
    return batch.jobIds.map((id) => translationJobs.value.get(id)).filter((job): job is PdfTranslationJob => !!job);
  }

  function applySnapshot(snapshot: PdfTranslationSnapshot, started: number): void {
    const jobs = new Map(snapshot.jobs.map((job) => [job.id,
      sameJob(jobsById.get(job.id), job) ? jobsById.get(job.id)! : job]));
    // 请求开始后收到的逐篇事件优先；仍采用快照中的批次元数据，避免丢失刚受理的批次。
    for (const previous of state.translationSnapshot.jobs) {
      if ((jobVersions.get(previous.id) ?? 0) > started) jobs.set(previous.id, previous);
    }
    state.translationSnapshot = { ...snapshot, jobs: [...jobs.values()] };
    rebuildJobIndex();
    state.translationReady = true;
    state.translationLoading = false;
    state.translationLoadError = '';
    if (pending) {
      const recovered = snapshot.batches.find(({ requestId }) => requestId === pending!.request.requestId);
      if (recovered) {
        state.translationBatchId = recovered.id;
        state.translationMode = 'tasks';
        state.translationError = '';
        pending = null;
      }
    }
  }

  async function loadTranslations(): Promise<void> {
    const version = ++requestVersion;
    const started = eventVersion;
    state.translationLoading = true;
    try {
      const snapshot = await api<PdfTranslationSnapshot>('/api/translations');
      if (!isStopped() && version === requestVersion) applySnapshot(snapshot, started);
    } catch (error) {
      if (!isStopped() && version === requestVersion) {
        state.translationLoadError = (error as Error).message || '无法读取翻译任务。';
      }
    } finally {
      if (!isStopped() && version === requestVersion) state.translationLoading = false;
    }
  }

  function receiveTranslation(data: WorkspaceEvent): boolean {
    if (data.type === 'pdfTranslationQueue') {
      void loadTranslations();
      return true;
    }
    if (data.type !== 'pdfTranslation') return false;
    const job = data.job as PdfTranslationJob | undefined;
    if (!job?.id || !job.paperId) return false;
    jobVersions.set(job.id, ++eventVersion);
    upsertJob(job);
    return true;
  }

  function setTranslationModel(value: string): void {
    state.translationModel = value;
    state.translationError = '';
    try {
      if (value) window.localStorage.setItem(MODEL_KEY, value);
      else window.localStorage.removeItem(MODEL_KEY);
    } catch { /* 存储不可用时，在当前工作区内继续同步选择。 */ }
  }

  function selectAllTranslations(): void {
    const ids = state.translationCandidates.filter((id) => translatablePaper(paperById().get(id)));
    state.translationSelected = new Set(ids.slice(0, PDF_TRANSLATION_MAX_BATCH));
    if (ids.length > PDF_TRANSLATION_MAX_BATCH) {
      toast(`已选择当前范围的前 ${PDF_TRANSLATION_MAX_BATCH} 篇，请分批提交。`);
    }
  }

  function toggleTranslation(id: string, checked: boolean): void {
    if (state.translationSubmitting) return;
    if (!checked) { state.translationSelected.delete(id); return; }
    if (state.translationSelected.size >= PDF_TRANSLATION_MAX_BATCH) {
      toast(`每批最多选择 ${PDF_TRANSLATION_MAX_BATCH} 篇文献。`, true);
      return;
    }
    if (candidateIds.value.has(id) && translatablePaper(paperById().get(id))) state.translationSelected.add(id);
  }

  function openBatchTranslation(ids: string[]): void {
    if (state.translationSubmitting) return;
    state.translationCandidates = [...new Set(ids)];
    state.translationRegenerate = false;
    state.translationError = '';
    state.translationMode = 'new';
    state.translationOpen = true;
    selectAllTranslations();
    void loadTranslations();
  }

  function openTranslationTasks(): void {
    state.translationOpen = true;
    state.translationMode = 'tasks';
    void loadTranslations();
  }

  async function submitRequest(request: PdfTranslationBatchRequest): Promise<void> {
    if (state.translationSubmitting) return;
    const signature = JSON.stringify([request.paperIds, request.model, request.regenerate === true]);
    if (pending?.signature === signature) request = pending.request;
    else pending = { signature, request };
    state.translationSubmitting = true;
    state.translationError = '';
    const started = eventVersion;
    const version = ++requestVersion;
    try {
      const result = await api<PdfTranslationBatchSubmission>('/api/translations/batches', json('POST', request));
      if (isStopped()) return;
      if (version === requestVersion) applySnapshot(result.snapshot, started);
      else await loadTranslations();
      // 即使补查暂时失败，也保留已确认受理的新批次；已有事件状态不被旧提交响应覆盖。
      if (!state.translationSnapshot.batches.some(({ id }) => id === result.batch.id)) {
        state.translationSnapshot.batches.unshift(result.batch);
        for (const job of result.snapshot.jobs.filter(({ batchId }) => batchId === result.batch.id)) {
          if (!jobsById.has(job.id)) upsertJob(job);
        }
      }
      state.translationBatchId = result.batch.id;
      state.translationMode = 'tasks';
      pending = null;
      toast(result.replayed ? '已找回原翻译批次。' : `已加入翻译队列：${result.batch.counts.total} 篇。`);
    } catch (error) {
      if (isStopped()) return;
      // 响应丢失时先补查已受理批次；没有查到才保留原 requestId，供用户安全重试。
      await loadTranslations();
      if (pending) state.translationError = (error as Error).message || '提交结果未确认，请重试。';
    } finally {
      state.translationSubmitting = false;
    }
  }

  async function submitTranslations(): Promise<void> {
    const paperIds = state.translationCandidates.filter((id) => state.translationSelected.has(id));
    const model = translationModelOption.value;
    if (!paperIds.length) { state.translationError = '请至少选择一篇论文。'; return; }
    if (!model || state.translationModel && !models().some(({ id }) => id === state.translationModel)) {
      state.translationError = '所选翻译模型不可用，请重新选择。';
      return;
    }
    await submitRequest({ requestId: crypto.randomUUID(), paperIds, model: model.id,
      regenerate: state.translationRegenerate });
  }

  async function cancelTranslationBatch(id: string): Promise<void> {
    if (state.translationCancelling.has(id)) return;
    state.translationCancelling.add(id);
    state.translationError = '';
    const started = eventVersion;
    const version = ++requestVersion;
    try {
      const snapshot = await api<PdfTranslationSnapshot>(
        `/api/translations/batches/${encodeURIComponent(id)}/cancel`, json('POST', {}),
      );
      if (!isStopped()) {
        if (version === requestVersion) applySnapshot(snapshot, started);
        else await loadTranslations();
      }
    } catch (error) {
      if (!isStopped()) state.translationError = (error as Error).message;
      await loadTranslations();
    } finally { state.translationCancelling.delete(id); }
  }

  async function retryTranslationBatch(batch: PdfTranslationBatch): Promise<void> {
    const paperIds = batchJobs(batch).filter(({ status }) => ['failed', 'cancelled'].includes(status))
      .map(({ paperId }) => paperId);
    if (!paperIds.length || state.translationSubmitting) return;
    if (!models().some(({ id }) => id === batch.model)) {
      openBatchTranslation(paperIds);
      state.translationRegenerate = batch.regenerate;
      setTranslationModel(batch.model);
      state.translationError = '原批次模型已不可用，请重新选择模型后提交。';
      return;
    }
    await submitRequest({ requestId: crypto.randomUUID(), paperIds, model: batch.model, regenerate: batch.regenerate });
  }

  return {
    translationModelOption, translationJobs, translationSingles, translationActivity, batchJobs,
    loadTranslations, receiveTranslation, setTranslationModel, selectAllTranslations, toggleTranslation,
    openBatchTranslation, openTranslationTasks, submitTranslations, cancelTranslationBatch, retryTranslationBatch,
  };
}
