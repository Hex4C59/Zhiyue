import type { ComputedRef } from 'vue';
import type { PdfTranslationEvent } from '../../shared/pdfTranslation.js';
import { endpoint } from './content';
import type {
  Chat, ChatFolderAction, ChatHistoryState, ChatMessage, JobRecord, StatusInfo, WorkspaceEvent, WorkspaceState,
} from './types';
import type { ApiFn } from './workspaceLibrary';

export interface EventsDeps {
  state: WorkspaceState;
  api: ApiFn;
  EventSourceImpl?: typeof EventSource;
  pollInterval: number;
  busy: ComputedRef<boolean>;
  statusLabels: Record<string, string>;
  activeJob: (job: Pick<JobRecord, 'status'>) => boolean;
  isStopped: () => boolean;
  markStopped: () => void;
  toast: (message: string, error?: boolean) => void;
  loadLibrary: () => Promise<void>;
  loadStatus: () => Promise<void>;
  loadChats: () => Promise<void>;
  loadDownloads: () => Promise<void>;
  loadCommands: () => Promise<void>;
  loadUiState: () => Promise<void>;
  loadTranslations: () => Promise<void>;
  receiveTranslation: (data: WorkspaceEvent) => boolean;
  openChat: (id: string) => Promise<void>;
  syncChat: (id: string) => Promise<void>;
  receiveClassification: (data: WorkspaceEvent) => boolean;
  needsClassifySync: (id: string) => boolean;
  selectPaper: (id: string) => void;
  applyChatHistory: (id: string, historyState: ChatHistoryState) => void;
  clearToasts: () => void;
}

export function createWorkspaceEvents({
  state, api, EventSourceImpl, pollInterval, busy, statusLabels, activeJob, isStopped, markStopped,
  toast, loadLibrary, loadStatus, loadChats, loadDownloads, loadCommands, loadUiState, openChat, syncChat,
  selectPaper, applyChatHistory, clearToasts, loadTranslations, receiveTranslation,
  receiveClassification, needsClassifySync,
}: EventsDeps) {
  let source: EventSource | undefined;
  let polling = false;
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  function upsertMessage(message: Partial<ChatMessage> & { id: string }): void {
    const chat = state.chat as Chat;
    const messages = (chat.messages ||= []);
    const index = messages.findIndex((item) => item.id === message.id);
    if (index < 0) messages.push(message as ChatMessage);
    else Object.assign(messages[index] as ChatMessage, message);
  }

  function mergeJob(job: JobRecord): boolean {
    const previous = state.jobs.get(job.id);
    if (previous && ((!activeJob(previous) && activeJob(job)) ||
      (previous.updatedAt && job.updatedAt && job.updatedAt < previous.updatedAt))) return false;
    state.jobs.set(job.id, { ...previous, ...job });
    return true;
  }

  function receive(data: WorkspaceEvent): void {
    if (isStopped()) return;
    if (data.type === 'pdfTranslation' && (data.job as PdfTranslationEvent['job'] | undefined)?.paperId) {
      state.pdfTranslationEvent = data as unknown as PdfTranslationEvent;
      receiveTranslation(data);
      return;
    }
    if (receiveTranslation(data) || receiveClassification(data)) return;
    const chat = state.chat;
    const history = data.historyState;
    if (data.type === 'chatHistory' && typeof data.chatId === 'string' &&
      (history === 'active' || history === 'archived' || history === 'trashed')) {
      applyChatHistory(data.chatId, history);
      void loadChats();
    }
    if (data.type === 'connected' && Array.isArray(data.approvals)) {
      state.approvals.clear();
      for (const approval of data.approvals as Array<{ id: string }>) {
        if (!state.resolvedApprovals.has(approval.id)) state.approvals.set(approval.id, approval as never);
      }
    }
    if (data.type === 'approvalResolved') {
      const id = String(data.id);
      state.approvals.delete(id);
      state.resolvedApprovals.add(id);
    }
    if (data.type === 'noteDraft' && data.chatId === chat?.id && (data.draft as { id?: string } | undefined)?.id) {
      const draft = data.draft as { id: string };
      const drafts = (chat!.noteDrafts ||= []);
      const index = drafts.findIndex((item) => item.id === draft.id);
      if (index < 0) drafts.push(draft as never);
      else drafts[index] = draft as never;
    }
    if (data.type === 'noteDraftResolved' && data.chatId === chat?.id) {
      chat!.noteDrafts = (chat!.noteDrafts || []).filter((item) => item.id !== data.id);
    }
    if (data.type === 'folderAction' && data.chatId === chat?.id && (data.action as { id?: string } | undefined)?.id) {
      const action = data.action as ChatFolderAction;
      const actions = (chat!.folderActions ||= []);
      const index = actions.findIndex((item) => item.id === action.id);
      if (index < 0) actions.push(action);
      else actions[index] = action;
    }
    if (data.type === 'folderActionResolved' && data.chatId === chat?.id) {
      chat!.folderActions = (chat!.folderActions || []).filter((item) => item.id !== data.id);
    }
    // 助手在聊天里新建/改名/删除分类或移动文献后，侧栏与分类计数需要跟着刷新。
    if (data.type === 'library') void loadLibrary();
    if (data.type === 'message' && (data.message as ChatMessage | undefined)?.id) {
      const message = data.message as ChatMessage;
      const summary = state.chats.find((item) => item.id === data.chatId);
      if (summary && summary !== chat) summary.messages = [message];
      if (data.chatId === chat?.id) upsertMessage(message);
    }
    if (data.type === 'delta' && data.chatId === chat?.id) {
      let message = chat!.messages?.find((item) => item.id === data.messageId);
      if (!message) {
        upsertMessage({ id: String(data.messageId), role: 'assistant', text: '', status: 'streaming' });
        message = chat!.messages?.find((item) => item.id === data.messageId);
      }
      if (message) {
        message.text = (message.text || '') + String(data.delta || '');
        message.status = 'streaming';
      }
    }
    if (data.type === 'thinking' && data.chatId === chat?.id) {
      const message = chat!.messages?.find((item) => item.id === data.messageId);
      if (message) {
        message.thinking = (message.thinking || '') + String(data.delta || '');
        message.status = 'streaming';
      }
    }
    const approval = data.approval as { id?: string } | undefined;
    if (data.type === 'approval' && approval?.id && !state.resolvedApprovals.has(approval.id)) {
      state.approvals.set(approval.id, {
        ...state.approvals.get(approval.id),
        ...approval,
        chatId: data.chatId as string,
      } as never);
    }
    if (data.type === 'status') {
      const status = (data.status || data) as StatusInfo;
      state.status = {
        ...state.status,
        ...status,
        agents: { ...state.status.agents, ...status.agents },
      };
    }
    const job = data.job as JobRecord | undefined;
    if (data.type === 'job' && job?.id) {
      const previous = state.jobs.get(job.id);
      if (!mergeJob(job)) return;
      if (job.classification?.chatId && !activeJob(job)) {
        void syncChat(job.classification.chatId).catch(() => {});
      }
      if (previous && activeJob(previous) && !activeJob(job)) {
        toast(
          `任务${statusLabels[job.status] || job.status}：${job.title || job.id}`,
          ['error', 'failed'].includes(job.status),
        );
        loadLibrary();
        if (state.view === 'downloads') loadDownloads();
      }
    }
  }

  async function poll(): Promise<void> {
    if (document.hidden || polling || isStopped()) return;
    polling = true;
    try {
      const work: Array<Promise<unknown>> = [loadStatus(), loadTranslations()];
      const chat = state.chat;
      if (chat && (!state.eventsOpen || busy.value || needsClassifySync(chat.id))) work.push(syncChat(chat.id));
      if (state.historyOpen) work.push(loadChats());
      for (const job of state.jobs.values()) {
        if (activeJob(job)) {
          work.push(
            api<JobRecord>(`/api/jobs/${endpoint(job.id)}`).then((data) => {
              if (!mergeJob(data)) return;
              if (!activeJob(data)) {
                if (data.classification?.chatId) void syncChat(data.classification.chatId).catch(() => {});
                loadLibrary();
                if (state.view === 'downloads') loadDownloads();
              }
            }),
          );
        }
      }
      await Promise.allSettled(work);
    } finally {
      polling = false;
    }
  }

  async function start(): Promise<void> {
    if (EventSourceImpl) {
      source = new EventSourceImpl('/api/events');
      let connectedBefore = false;
      source.onopen = () => {
        state.eventsOpen = true;
        loadStatus();
        void loadTranslations();
        if (connectedBefore) void loadChats();
        connectedBefore = true;
        if (state.chat) syncChat(state.chat.id).catch(() => {});
      };
      source.onerror = () => {
        state.eventsOpen = false;
        void loadTranslations();
      };
      source.onmessage = (event) => {
        let data: WorkspaceEvent;
        try {
          data = JSON.parse(event.data as string) as WorkspaceEvent;
        } catch {
          return;
        }
        receive(data);
      };
    }
    await Promise.allSettled([
      loadLibrary(), loadStatus(), loadChats(), loadDownloads(), loadCommands(), loadUiState(), loadTranslations(),
    ]);
    if (isStopped()) return;
    const saved = state.ui.chatId;
    if (saved && state.chats.some((chat) => chat.id === saved && chat.historyState !== 'trashed')) {
      await openChat(saved);
    }
    // 恢复上次阅读的文献；编号必须仍在当前索引里，已删除的条目不能凭存储复活。
    const paper = state.ui.paperId;
    if (paper && !state.current && state.papers.some((item) => item.literature_id === paper)) selectPaper(paper);
    if (pollInterval) pollTimer = setInterval(poll, pollInterval);
  }

  function stop(): void {
    markStopped();
    source?.close();
    if (pollTimer) clearInterval(pollTimer);
    clearToasts();
  }

  return { receive, start, stop, poll };
}
