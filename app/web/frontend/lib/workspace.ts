import { computed, markRaw, reactive } from 'vue';
import { request } from './api';
import { endpoint, json, titleOf } from './content';
import type {
  Category, Chat, ChatMessage, CommandInfo, JobRecord, ModelOption, Paper, PiAgentStatus, StatusInfo,
  WorkspaceEvent, WorkspaceState,
} from './types';

export type { WorkspaceState } from './types';

export const activeStatuses = ['streaming', 'pending', 'running', 'in_progress', 'inProgress', 'queued'];
export const statusLabels: Record<string, string> = {
  queued: '排队中',
  pending: '等待中',
  running: '进行中',
  completed: '流程结束',
  complete: '已完成',
  success: '已完成',
  succeeded: '已完成',
  failed: '失败',
  error: '错误',
  cancelled: '已取消',
  interrupted: '已停止',
  archived: '已归档',
  downloaded: '已下载',
  verified: '已核验',
  needs_access: '待获取权限',
  needs_review: '待人工核对',
  unknown: '状态待核实',
};

export const activeJob = (job: Pick<JobRecord, 'status'>): boolean =>
  ['queued', 'pending', 'running', 'in_progress'].includes(job.status);

export type ApiFn = <T = unknown>(path: string, options?: RequestInit) => Promise<T>;

export interface CreateWorkspaceOptions {
  api?: ApiFn;
  EventSourceImpl?: typeof EventSource;
  pollInterval?: number;
}

interface LibraryResponse {
  papers?: Paper[];
  categories?: Category[];
  stats?: Record<string, number>;
}

interface UploadResponse {
  id?: string;
  name?: string;
  mime?: string;
  size?: number;
}

interface UploadDraft {
  key: string;
  id?: string;
  name: string;
  mime?: string;
  size?: number;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
  file?: File;
}

interface ChatResponse extends Chat {
  messages?: ChatMessage[];
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createWorkspace({
  api = request,
  EventSourceImpl = globalThis.EventSource,
  pollInterval = 8000,
}: CreateWorkspaceOptions = {}) {
  const state = reactive({
    papers: [],
    categories: [],
    stats: {},
    current: null,
    category: '',
    subcategory: '',
    starred: false,
    query: '',
    year: '',
    read: '',
    sort: 'id',
    libraryError: '',
    downloadsError: '',
    readerMode: 'pdf',
    notePath: '',
    chat: null,
    chats: [],
    context: new Set(),
    attachments: [],
    approvals: new Map(),
    resolvedApprovals: new Set(),
    status: {},
    statusError: '',
    eventsOpen: false,
    model: '',
    draft: '',
    focusComposer: 0,
    historyOpen: false,
    jobs: new Map(),
    batches: [],
    sending: false,
    noteSaving: '',
    commands: [],
    commandError: '',
    creating: false,
    chatEpoch: 0,
    noteEpoch: 0,
    view: 'library',
    panel: 'list',
    pdfPage: 1,
    pdfTotal: null,
    pdfZoom: 100,
    pdfBrowser: false,
    pdfSession: null,
    previewLoading: false,
    toasts: [],
    pendingPatches: new Set(),
    refreshing: false,
    importOpen: false,
  }) as unknown as WorkspaceState;
  // 浏览器存储可能被隐私设置禁用，读取失败时使用默认会话与布局。
  const remember = (key: string, value?: string | null): void => {
    try {
      value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value);
    } catch {
      /* 存储不可用不影响本轮操作。 */
    }
  };
  const recalled = (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const currentPaper = computed(() => state.papers.find((paper) => paper.literature_id === state.current));
  const agent = computed<PiAgentStatus>(() => state.status.agents?.pi || {});
  const models = computed<ModelOption[]>(() =>
    (agent.value.models || [])
      .map((model) => {
        if (typeof model === 'string') return { id: model, label: model };
        const id = model.model || model.id || model.name;
        if (!id) return null;
        return {
          id,
          label: model.displayName || model.display_name || model.name || id,
          isDefault: model.isDefault,
        };
      })
      .filter((model): model is ModelOption => model !== null));
  const generating = computed(
    () => state.chat?.messages?.some((message) => activeStatuses.includes(message.status)) || false,
  );
  const busy = computed(() => state.sending || generating.value);
  const canSend = computed(
    () =>
      !state.statusError &&
      !busy.value &&
      !state.creating &&
      !!(state.draft.trim() || state.attachments.length) &&
      state.attachments.every((file) => file.status === 'ready') &&
      agent.value.available === true &&
      agent.value.authenticated === true &&
      state.eventsOpen,
  );
  let source: EventSource | undefined;
  let polling = false;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let uploadSequence = 0;
  let toastSequence = 0;
  let stopped = false;
  const toastTimers = new Set<ReturnType<typeof setTimeout>>();

  function toast(message: string, error = false): void {
    const id = ++toastSequence;
    state.toasts.push({ id, message, error });
    const timer = setTimeout(
      () => {
        state.toasts = state.toasts.filter((item) => item.id !== id);
        toastTimers.delete(timer);
      },
      error ? 10000 : 5000,
    );
    toastTimers.add(timer);
  }

  function setPanel(panel: WorkspaceState['panel']): void {
    state.panel = panel;
  }

  function setDraft(text: string): void {
    state.draft = text;
    state.focusComposer++;
  }

  function setView(view: WorkspaceState['view']): void {
    state.view = view;
    if (view === 'downloads') loadDownloads();
  }

  function selectPaper(id: string): void {
    state.current = id;
    state.readerMode = 'pdf';
    state.notePath = '';
    state.pdfPage = 1;
    state.pdfTotal = null;
    state.pdfZoom = 100;
    state.pdfBrowser = false;
    if (state.context.size < 6 || state.context.has(id)) state.context.add(id);
    else toast('最多附带 6 篇论文；请先移除不需要的上下文。', true);
    if (window.matchMedia('(max-width:680px)').matches) setPanel('reader');
  }

  function resetFilters(): void {
    Object.assign(state, { query: '', year: '', read: '', starred: false, category: '', subcategory: '' });
  }

  async function loadLibrary(): Promise<void> {
    try {
      const data = await api<LibraryResponse>('/api/library');
      state.papers = Array.isArray(data.papers) ? data.papers : [];
      state.categories = data.categories || [];
      state.stats = data.stats || {};
      state.libraryError = '';
    } catch (error) {
      state.libraryError = messageOf(error);
    }
  }

  async function createCategory(name: string): Promise<unknown> {
    try {
      const result = await api('/api/categories', json('POST', { name }));
      await loadLibrary();
      return result;
    } catch (error) {
      toast(messageOf(error), true);
      return null;
    }
  }

  async function renameCategory(category: string, subcategory: string, name: string): Promise<unknown> {
    try {
      const result = await api(
        '/api/categories/rename',
        json('POST', { category, subcategory, name }),
      );
      await loadLibrary();
      return result;
    } catch (error) {
      toast(messageOf(error), true);
      return null;
    }
  }

  async function patchPaper(id: string, update: Record<string, unknown>): Promise<boolean> {
    if (state.pendingPatches.has(id)) return false;
    state.pendingPatches.add(id);
    try {
      await api(`/api/papers/${endpoint(id)}`, json('PATCH', update));
      const paper = state.papers.find((item) => item.literature_id === id);
      if (paper) Object.assign(paper, update);
      return true;
    } catch (error) {
      toast(messageOf(error), true);
      return false;
    } finally {
      state.pendingPatches.delete(id);
    }
  }

  async function loadStatus(): Promise<void> {
    try {
      state.status = await api<StatusInfo>('/api/status');
      state.statusError = '';
    } catch (error) {
      state.statusError = messageOf(error);
    }
  }

  async function reconnectAgent(): Promise<void> {
    state.status.agents = {
      ...state.status.agents,
      pi: { ...state.status.agents?.pi, loading: true },
    };
    try {
      await api('/api/agents/pi/connect', json('POST', {}));
    } catch (error) {
      toast(messageOf(error), true);
    } finally {
      await loadStatus();
    }
  }

  async function loadChats(): Promise<void> {
    try {
      state.chats = await api<Chat[]>('/api/chats');
    } catch (error) {
      toast(messageOf(error), true);
    }
  }

  async function loadCommands(): Promise<void> {
    try {
      const data = await api<{ commands?: CommandInfo[] }>('/api/commands');
      state.commands = Array.isArray(data.commands) ? data.commands : [];
      state.commandError = '';
    } catch (error) {
      // 命令目录只用于输入提示；拉取失败时仍可直接发消息。
      state.commandError = messageOf(error);
    }
  }

  /**
   * 发送一条以斜杠开头的输入。
   * 本地命令由服务端直接回执，技能命令展开后作为用户回合发给模型。
   */
  async function runCommand(text: string): Promise<boolean> {
    if (!canSend.value) return false;
    state.sending = true;
    const paperIds = [...state.context];
    try {
      if (!state.chat) {
        state.creating = true;
        try {
          const chat = await api<ChatResponse>(
            '/api/chats',
            json('POST', { paperIds, title: text.slice(0, 50) || titleOf(currentPaper.value || {}) }),
          );
          state.chat = { ...chat, messages: chat.messages || [] };
          remember('zhiyue.chat', chat.id);
          state.chats.unshift(chat);
        } finally {
          state.creating = false;
        }
      }
      const chat = state.chat as Chat;
      const body: Record<string, unknown> = { text, paperIds };
      if (state.model) body.model = state.model;
      await api(`/api/chats/${endpoint(chat.id)}/commands`, json('POST', body));
      if (state.draft.trim() === text) state.draft = '';
      await syncChat(chat.id);
      loadChats();
      return true;
    } catch (error) {
      toast(`命令未执行：${messageOf(error)}`, true);
      return false;
    } finally {
      state.sending = false;
    }
  }

  /** 输入框提交入口：以斜杠开头走命令通道，其余按普通消息发送。 */
  async function submit(): Promise<boolean> {
    const text = state.draft.trim();
    if (text.startsWith('/')) return runCommand(text);
    return sendMessage();
  }

  function newChat(): void {
    if (state.sending) return;
    state.chatEpoch++;
    state.chat = null;
    remember('zhiyue.chat', null);
    state.focusComposer++;
  }

  async function openChat(id: string): Promise<void> {
    if (state.sending) return;
    const epoch = ++state.chatEpoch;
    try {
      const chat = await api<Chat>(`/api/chats/${endpoint(id)}`);
      if (epoch !== state.chatEpoch || stopped) return;
      state.chat = chat;
      state.context = new Set(chat.paperIds || []);
      remember('zhiyue.chat', chat.id);
      if (agent.value.available !== true) reconnectAgent();
    } catch (error) {
      toast(messageOf(error), true);
    }
  }

  async function syncChat(id: string): Promise<void> {
    const epoch = state.chatEpoch;
    const chat = await api<ChatResponse>(`/api/chats/${endpoint(id)}`);
    if (epoch !== state.chatEpoch || state.chat?.id !== id || stopped) return;
    const existing = new Map((state.chat.messages || []).map((message) => [message.id, message]));
    // 补查 HTTP 状态时保留已经通过 SSE 收到的较长正文，并更新最终状态。
    chat.messages = (chat.messages || []).map((message) => {
      const live = existing.get(message.id);
      existing.delete(message.id);
      return live && (live.text || '').length > (message.text || '').length
        ? { ...live, ...message, text: live.text }
        : message;
    });
    chat.messages.push(...existing.values());
    state.chat = chat;
  }

  async function sendMessage(): Promise<boolean> {
    if (!canSend.value || !state.chat && !state.draft.trim() && !state.attachments.length) return false;
    const text = state.draft.trim();
    const files = [...state.attachments];
    const paperIds = [...state.context];
    state.sending = true;
    try {
      if (!state.chat) {
        state.creating = true;
        try {
          const chat = await api<ChatResponse>(
            '/api/chats',
            json('POST', {
              paperIds,
              title: text.slice(0, 50) || titleOf(currentPaper.value || {}),
            }),
          );
          state.chat = { ...chat, messages: chat.messages || [] };
          remember('zhiyue.chat', chat.id);
          state.chats.unshift(chat);
        } finally {
          state.creating = false;
        }
      }
      const chat = state.chat as Chat;
      const body: Record<string, unknown> = { text, paperIds, attachmentIds: files.map((file) => file.id) };
      if (state.model) body.model = state.model;
      await api(`/api/chats/${endpoint(chat.id)}/messages`, json('POST', body));
      if (state.draft.trim() === text) state.draft = '';
      const submitted = new Set(files.map((file) => file.key));
      state.attachments = state.attachments.filter((file) => !submitted.has(file.key));
      try {
        await syncChat(chat.id);
      } catch {
        toast('消息已提交；正在等待会话同步，请勿重复发送。', true);
      }
      loadChats();
      return true;
    } catch (error) {
      toast(`消息未能确认提交：${messageOf(error)}。请检查会话后重试。`, true);
      return false;
    } finally {
      state.sending = false;
    }
  }

  async function interrupt(): Promise<void> {
    if (!state.chat) return;
    try {
      const id = state.chat.id;
      await api(`/api/chats/${endpoint(id)}/interrupt`, json('POST', {}));
      await syncChat(id);
    } catch (error) {
      toast(messageOf(error), true);
    }
  }

  async function uploadFile(file: File): Promise<UploadResponse> {
    const data = await api<UploadResponse>('/api/uploads', {
      method: 'POST',
      headers: {
        'X-Filename': encodeURIComponent(file.name),
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });
    if (!data.id) throw new Error('上传接口没有返回附件编号');
    return data;
  }

  async function uploadOne(item: UploadDraft): Promise<void> {
    item.status = 'uploading';
    item.error = '';
    try {
      Object.assign(item, await uploadFile(item.file as File), { status: 'ready' });
    } catch (error) {
      item.status = 'error';
      item.error = messageOf(error);
      toast(`上传 ${item.name} 失败：${messageOf(error)}`, true);
    }
  }

  async function uploadFiles(files: File[]): Promise<void> {
    // 顺序上传，避免多份大附件同时占满本机服务。
    for (const file of files) {
      if (state.attachments.length >= 8) {
        toast('每次最多附加 8 个文件。', true);
        break;
      }
      if (file.size > 25 * 1024 * 1024) {
        toast(`${file.name} 超过 25 MB 上传限制。`, true);
        continue;
      }
      const item = reactive({
        key: String(++uploadSequence),
        name: file.name,
        file: markRaw(file),
        status: 'uploading' as const,
      });
      state.attachments.push(item as unknown as UploadDraft);
      await uploadOne(item as unknown as UploadDraft);
    }
  }

  async function importPdfs({ uploads, category }: { uploads: unknown; category: string }): Promise<{ job: JobRecord; skipped: Array<Record<string, unknown>> }> {
    const { job, skipped } = await api<{ job: JobRecord; skipped: Array<Record<string, unknown>> }>(
      '/api/library/import',
      json('POST', { uploads, category }),
    );
    state.jobs.set(job.id, job);
    return { job, skipped };
  }

  async function resolveNoteDraft(id: string, action: 'save' | 'discard'): Promise<void> {
    const chat = state.chat;
    const draft = (chat?.noteDrafts || []).find((item) => item.id === id);
    if (!draft || state.noteSaving) return;
    state.noteSaving = id;
    try {
      const result = await api<{ path?: string }>(`/api/note-drafts/${endpoint(id)}`, json('POST', { action }));
      chat!.noteDrafts = (chat!.noteDrafts || []).filter((item) => item.id !== id);
      if (action === 'save') {
        toast(`笔记已保存：${result.path ?? ''}`);
        await loadLibrary();
      } else {
        toast('已丢弃笔记草稿');
      }
    } catch (error) {
      toast(messageOf(error), true);
    } finally {
      state.noteSaving = '';
    }
  }

  const saveNoteDraft = (id: string): Promise<void> => resolveNoteDraft(id, 'save');
  const discardNoteDraft = (id: string): Promise<void> => resolveNoteDraft(id, 'discard');

  async function decideApproval(
    id: string,
    decision: string,
    answers: Record<string, unknown> = {},
  ): Promise<void> {
    const approval = state.approvals.get(id);
    if (!approval || approval.submitting) return;
    approval.submitting = true;
    try {
      const body: Record<string, unknown> = { decision };
      const questions = approval.params.questions;
      if (decision === 'accept' && Array.isArray(questions) && questions.length) body.answers = answers;
      await api(`/api/approvals/${endpoint(id)}`, json('POST', body));
      state.resolvedApprovals.add(id);
      state.approvals.delete(id);
    } catch (error) {
      approval.submitting = false;
      toast(messageOf(error), true);
    }
  }

  async function loadDownloads(): Promise<void> {
    try {
      const data = await api<{ jobs?: JobRecord[]; batches?: WorkspaceState['batches'] }>('/api/downloads');
      for (const job of data.jobs || []) state.jobs.set(job.id, job);
      state.batches = data.batches || [];
      state.downloadsError = '';
    } catch (error) {
      state.downloadsError = messageOf(error);
    }
  }

  async function createDownload(data: unknown): Promise<boolean> {
    try {
      const job = await api<JobRecord>('/api/downloads', json('POST', data));
      state.jobs.set(job.id, job);
      toast('下载任务已创建');
      return true;
    } catch (error) {
      toast(messageOf(error), true);
      return false;
    }
  }

  async function batchAction(batch: string, action: string): Promise<boolean> {
    try {
      const body = { batch, action, ...(action === 'ieee' ? { submit: true } : {}) };
      const job = await api<JobRecord>('/api/downloads/action', json('POST', body));
      state.jobs.set(job.id, job);
      toast('批次操作已提交');
      return true;
    } catch (error) {
      toast(messageOf(error), true);
      return false;
    }
  }

  async function refreshCatalog(): Promise<void> {
    state.refreshing = true;
    try {
      const job = await api<JobRecord>('/api/catalog/refresh', json('POST', {}));
      state.jobs.set(job.id, job);
      toast('索引刷新任务已提交，可在任务中心查看');
    } catch (error) {
      toast(messageOf(error), true);
    } finally {
      state.refreshing = false;
    }
  }

  function upsertMessage(message: Partial<ChatMessage> & { id: string }): void {
    const chat = state.chat as Chat;
    const messages = (chat.messages ||= []);
    const index = messages.findIndex((item) => item.id === message.id);
    if (index < 0) messages.push(message as ChatMessage);
    else Object.assign(messages[index] as ChatMessage, message);
  }

  function receive(data: WorkspaceEvent): void {
    if (stopped) return;
    const chat = state.chat;
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
      const draft = data.draft as WorkspaceState['toasts'][number] extends never ? never : { id: string };
      const drafts = (chat!.noteDrafts ||= []);
      const index = drafts.findIndex((item) => item.id === draft.id);
      if (index < 0) drafts.push(draft as never);
      else drafts[index] = draft as never;
    }
    if (data.type === 'noteDraftResolved' && data.chatId === chat?.id) {
      chat!.noteDrafts = (chat!.noteDrafts || []).filter((item) => item.id !== data.id);
    }
    if (data.type === 'message' && data.chatId === chat?.id && (data.message as { id?: string } | undefined)?.id) {
      upsertMessage(data.message as Partial<ChatMessage> & { id: string });
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
      state.jobs.set(job.id, { ...previous, ...job });
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
    if (document.hidden || polling || stopped) return;
    polling = true;
    try {
      const work: Array<Promise<unknown>> = [loadStatus()];
      const chat = state.chat;
      if (chat && (!state.eventsOpen || busy.value)) work.push(syncChat(chat.id));
      for (const job of state.jobs.values()) {
        if (activeJob(job)) {
          work.push(
            api<JobRecord>(`/api/jobs/${endpoint(job.id)}`).then((data) => {
              state.jobs.set(data.id, data);
              if (!activeJob(data)) {
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
      source.onopen = () => {
        state.eventsOpen = true;
        loadStatus();
        if (state.chat) syncChat(state.chat.id).catch(() => {});
      };
      source.onerror = () => {
        state.eventsOpen = false;
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
    await Promise.allSettled([loadLibrary(), loadStatus(), loadChats(), loadDownloads(), loadCommands()]);
    if (stopped) return;
    const saved = recalled('zhiyue.chat');
    if (saved && state.chats.some((chat) => chat.id === saved)) await openChat(saved);
    if (pollInterval) pollTimer = setInterval(poll, pollInterval);
  }

  function stop(): void {
    stopped = true;
    source?.close();
    if (pollTimer) clearInterval(pollTimer);
    for (const timer of toastTimers) clearTimeout(timer);
  }

  return {
    state,
    api,
    currentPaper,
    agent,
    models,
    busy,
    generating,
    canSend,
    toast,
    setView,
    setPanel,
    setDraft,
    selectPaper,
    resetFilters,
    loadLibrary,
    createCategory,
    renameCategory,
    patchPaper,
    loadStatus,
    reconnectAgent,
    loadChats,
    loadCommands,
    openChat,
    syncChat,
    newChat,
    sendMessage,
    runCommand,
    submit,
    interrupt,
    uploadFile,
    uploadFiles,
    uploadOne,
    importPdfs,
    decideApproval,
    saveNoteDraft,
    discardNoteDraft,
    loadDownloads,
    createDownload,
    batchAction,
    refreshCatalog,
    receive,
    start,
    stop,
  };
}

export type WorkspaceApi = ReturnType<typeof createWorkspace>;
