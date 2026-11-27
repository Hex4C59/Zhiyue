import { computed, reactive } from 'vue';
import { activeClassifyRun } from '../../shared/contracts.js';
import { endpoint, json } from './content';
import type {
  Chat, ChatClassifyProposal, ChatClassifyRun, ChatMessage, ClassifyRequest, JobRecord, WorkspaceEvent, WorkspaceState,
} from './types';
import { messageOf } from './workspaceLibrary';
import type { ApiFn } from './workspaceLibrary';

interface ClassificationSnapshot {
  classifyProposals: ChatClassifyProposal[];
  classifyRuns: ChatClassifyRun[];
  classifyRevision: number;
}
interface ClassificationDeps {
  state: WorkspaceState;
  api: ApiFn;
  isStopped: () => boolean;
  toast: (message: string, error?: boolean) => void;
  syncChat: (id: string) => Promise<void>;
  loadLibrary: () => Promise<void>;
}

const revisionOf = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;

export function createWorkspaceClassificationActions({
  state, api, isStopped, toast, syncChat, loadLibrary,
}: ClassificationDeps) {
  // 离开会话后仍接收归类事件；再次打开时，较旧的 HTTP 快照不能恢复已完成的提案或运行状态。
  const snapshots = new Map<string, ClassificationSnapshot>();
  const summaryVersions = new Map<string, number>();
  const submitting = reactive(new Set<string>());
  let classificationVersion = 0;
  const classifying = computed(() => !!state.chat && classificationBusy(state.chat.id));

  function snapshotOf(chat: Chat): ClassificationSnapshot {
    return {
      classifyProposals: chat.classifyProposals ?? [], classifyRuns: chat.classifyRuns ?? [],
      classifyRevision: revisionOf(chat.classifyRevision),
    };
  }

  function latest(id: string): ClassificationSnapshot {
    const cached = snapshots.get(id);
    const current = state.chat?.id === id ? snapshotOf(state.chat) : undefined;
    return current && (!cached || current.classifyRevision >= cached.classifyRevision)
      ? current : cached ?? { classifyProposals: [], classifyRuns: [], classifyRevision: 0 };
  }

  function remember(id: string, snapshot: ClassificationSnapshot): void {
    const previous = latest(id);
    const finished = snapshot.classifyRuns.some((run) => !activeClassifyRun(run) &&
      previous.classifyRuns.some((old) => old.id === run.id && activeClassifyRun(old)));
    snapshots.set(id, snapshot);
    if (state.chat?.id === id) Object.assign(state.chat, snapshot);
    const running = snapshot.classifyRuns.some(activeClassifyRun);
    if (state.chat?.id === id) state.chat.classifyRunning = running;
    const summary = state.chats.find((chat) => chat.id === id);
    if (summary) summary.classifyRunning = running;
    summaryVersions.set(id, ++classificationVersion);
    const pending = state.classifyRequests.get(id);
    if (pending && snapshot.classifyRuns.some((run) => run.requestId === pending.requestId)) {
      state.classifyRequests.delete(id);
    }
    if (finished) void loadLibrary();
  }

  function mergeClassifyChat(chat: Chat): void {
    const previous = latest(chat.id);
    const incoming = snapshotOf(chat);
    const snapshot = incoming.classifyRevision < previous.classifyRevision ? previous : incoming;
    Object.assign(chat, snapshot, { classifyRunning: snapshot.classifyRuns.some(activeClassifyRun) });
    remember(chat.id, snapshot);
  }

  function classifySummaryVersion(): number { return classificationVersion; }

  function mergeClassifySummaries(chats: Chat[], started: number): void {
    for (const chat of chats) {
      if ((summaryVersions.get(chat.id) ?? 0) > started) {
        chat.classifyRunning = latest(chat.id).classifyRuns.some(activeClassifyRun);
      }
    }
  }

  function classificationBusy(id: string): boolean {
    if (submitting.has(id) || state.classifyRequests.has(id)) return true;
    if (state.chat?.id === id) {
      return !!state.chat.classifyRunning || (state.chat.classifyRuns ?? []).some(activeClassifyRun);
    }
    return state.chats.find((chat) => chat.id === id)?.classifyRunning === true;
  }

  function needsClassifySync(id: string): boolean {
    const snapshot = latest(id);
    return classificationBusy(id) || snapshot.classifyRuns.some((run) =>
      !activeClassifyRun(run) && !state.chat?.messages?.some((message) => message.id === run.messageId));
  }

  function mergeRun(
    id: string, run: ChatClassifyRun, proposals?: ChatClassifyProposal[], revision = run.revision,
  ): void {
    const previous = latest(id);
    const runs = [...previous.classifyRuns];
    const index = runs.findIndex((item) => item.id === run.id);
    if (index < 0 && revisionOf(revision) < previous.classifyRevision) return;
    if (index < 0) runs.push(run);
    else if (revisionOf(run.revision) >= runs[index].revision) runs[index] = run;
    remember(id, {
      classifyRuns: runs,
      classifyProposals: proposals && revision >= previous.classifyRevision ? proposals : previous.classifyProposals,
      classifyRevision: Math.max(previous.classifyRevision, revisionOf(revision), revisionOf(run.revision)),
    });
  }

  function receiveClassification(data: WorkspaceEvent): boolean {
    if (!['classifyRun', 'classifyProposal', 'classifyProposalResolved'].includes(data.type ?? '')) return false;
    if (typeof data.chatId !== 'string') return true;
    const id = data.chatId;
    const revision = revisionOf(data.revision);
    const previous = latest(id);
    if (data.type === 'classifyRun') {
      const run = data.run as ChatClassifyRun | undefined;
      if (run?.id) mergeRun(id, run, Array.isArray(data.proposals) ? data.proposals : undefined, revision);
      return true;
    }
    if (revision < previous.classifyRevision) return true;
    let proposals = [...previous.classifyProposals];
    if (data.type === 'classifyProposal') {
      const proposal = data.proposal as ChatClassifyProposal | undefined;
      if (!proposal?.id) return true;
      const index = proposals.findIndex((item) => item.id === proposal.id || item.paperId === proposal.paperId);
      if (index < 0) proposals.push(proposal);
      else proposals[index] = proposal;
    } else {
      proposals = proposals.filter((item) => item.id !== data.id);
    }
    remember(id, { ...previous, classifyRevision: revision, classifyProposals: proposals });
    return true;
  }

  function upsertReceipt(id: string, message?: ChatMessage): void {
    if (!message || state.chat?.id !== id) return;
    const messages = (state.chat.messages ??= []);
    const existing = messages.find((item) => item.id === message.id);
    if (existing) Object.assign(existing, message);
    else messages.push(message);
  }

  async function submitRequest(id: string, pending: ClassifyRequest): Promise<void> {
    if (submitting.has(id) || isStopped()) return;
    submitting.add(id);
    state.classifySaving = id;
    pending.status = 'submitting';
    pending.error = '';
    state.classifyRequests.set(id, pending);
    try {
      const result = await api<{ run: ChatClassifyRun; job: JobRecord | null; replayed: boolean }>(
        `/api/chats/${endpoint(id)}/classify-proposals`,
        json('POST', { action: 'apply', ids: pending.ids, requestId: pending.requestId }),
      );
      if (isStopped()) return;
      mergeRun(id, result.run);
      const job = result.job;
      if (job) {
        const previous = state.jobs.get(job.id);
        // 受理响应可能晚于终态事件；此时保留任务中心已收到的进度。
        const stale = previous?.updatedAt && job.updatedAt && job.updatedAt < previous.updatedAt;
        const resurrects = previous && !['queued', 'running'].includes(previous.status) &&
          ['queued', 'running'].includes(job.status);
        if (!stale && !resurrects) state.jobs.set(job.id, { ...previous, ...job });
      }
      const current = latest(id).classifyRuns.find((run) => run.id === result.run.id) ?? result.run;
      if (activeClassifyRun(current)) {
        toast(result.replayed ? '已找回原归类任务。' : `已提交 ${pending.ids.length} 篇论文，正在后台归类。`);
      } else {
        if (result.replayed) toast('已找回归类操作记录。');
        await syncChat(id);
      }
    } catch (error) {
      if (isStopped()) return;
      // 超时不能证明未受理；先按 requestId 补查，再保留原快照供幂等重试。
      try { await syncChat(id); }
      catch { /* 服务尚未恢复时保留待确认请求，后续轮询仍会补查。 */ }
      if (isStopped()) return;
      const known = latest(id).classifyRuns;
      const recovered = known.some((run) => run.requestId === pending.requestId);
      const rejected = [400, 403, 404, 409].includes(
        Number((error as Error & { statusCode?: number }).statusCode),
      );
      if (recovered || known.some(activeClassifyRun) || rejected) {
        state.classifyRequests.delete(id);
        if (!recovered) {
          const handled = known.some((run) => run.proposalIds.some((proposalId) => pending.ids.includes(proposalId)));
          toast(handled ? '已同步当前归类任务及结果。' : (error as Error).message);
        }
      } else {
        state.classifyRequests.set(id, { ...pending, status: 'uncertain', error: messageOf(error) });
        toast('归类提交结果尚未确认，可使用原请求重试。', true);
      }
    } finally {
      submitting.delete(id);
      if (state.classifySaving === id) state.classifySaving = '';
    }
  }

  async function retryClassifyProposals(): Promise<void> {
    const id = state.chat?.id;
    const pending = id ? state.classifyRequests.get(id) : undefined;
    if (id && pending?.status === 'uncertain') await submitRequest(id, pending);
  }

  async function resolveClassifyProposals(ids: string[], action: 'apply' | 'discard'): Promise<void> {
    const chat = state.chat;
    if (!chat || !ids.length || classificationBusy(chat.id)) return;
    if (action === 'apply') {
      await submitRequest(chat.id, {
        requestId: crypto.randomUUID(), ids: [...new Set(ids)], status: 'submitting', error: '',
      });
      return;
    }
    submitting.add(chat.id);
    state.classifySaving = chat.id;
    try {
      const result = await api<{ discarded: string[]; message?: ChatMessage }>(
        `/api/chats/${endpoint(chat.id)}/classify-proposals`, json('POST', { action, ids }),
      );
      if (isStopped()) return;
      const previous = latest(chat.id);
      remember(chat.id, {
        ...previous,
        classifyProposals: previous.classifyProposals.filter((item) => !result.discarded.includes(item.id)),
      });
      upsertReceipt(chat.id, result.message);
      toast(`已取消 ${result.discarded.length} 项归类请求`);
      await syncChat(chat.id);
    } catch (error) {
      if (!isStopped()) toast(messageOf(error), true);
    } finally {
      submitting.delete(chat.id);
      if (state.classifySaving === chat.id) state.classifySaving = '';
    }
  }

  return {
    classifying, classificationBusy, classificationSubmitting: (id: string) => submitting.has(id),
    needsClassifySync, mergeClassifyChat, classifySummaryVersion,
    mergeClassifySummaries, receiveClassification, resolveClassifyProposals, retryClassifyProposals,
  };
}
