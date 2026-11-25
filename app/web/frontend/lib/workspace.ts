import { computed, markRaw, reactive } from 'vue';
import type { PdfTranslationEvent } from '../../src/lib/pdfTranslationTypes.js';
import { request } from './api';
import { endpoint, json, titleOf } from './content';
import type {
  AttachmentItem, Category, Chat, ChatFolderAction, ChatHistoryState, ChatMessage, CommandInfo, JobRecord, ModelOption, Paper,
  PiAgentStatus, StatusInfo, UiState, WorkspaceEvent, WorkspaceState,
} from './types';

export type { WorkspaceState, UiState } from './types';

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
    noteDeleting: false,
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
    agentSettingsOpen: false,
    focusModelPicker: 0,
    jobs: new Map(),
    batches: [],
    sending: false,
    noteSaving: '',
    folderActionSaving: '',
    draggingPaper: '',
    movingPaper: '',
    commands: [],
    desktopCommands: false,
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
    pdfTranslation: '',
    pdfTranslationEvent: null,
    pdfSession: null,
    previewLoading: false,
    toasts: [],
    pendingPatches: new Set(),
    refreshing: false,
    importOpen: false,
    importCategory: '',
    ui: { chatId: null, paperId: null },
    panelWidths: {},
    uiDirty: false,
    uiError: '',
  }) as unknown as WorkspaceState;
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
  const pendingChatChanges = reactive(new Set<string>());
  let historyVersion = 0;
  const modelReady = computed(
    () => !state.statusError && agent.value.available === true && agent.value.authenticated === true && state.eventsOpen,
  );
  const canStartTurn = computed(() =>
    !busy.value && !state.creating && state.chat?.historyState !== 'archived' &&
    !pendingChatChanges.has(state.chat?.id ?? ''),
  );
  const canRunPaperSkill = computed(() => canStartTurn.value && modelReady.value && !!currentPaper.value);
  const canSend = computed(() => {
    if (!canStartTurn.value) return false;
    if (state.draft.trimStart().startsWith('/')) return true;
    return modelReady.value && !!(state.draft.trim() || state.attachments.length) &&
      state.attachments.every((file) => file.status === 'ready');
  });
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
    // 重启后恢复到上次阅读的那篇：助手靠 state.current 判断“当前打开”的是哪一篇。
    saveUiState({ paperId: id });
    state.readerMode = 'pdf';
    state.notePath = '';
    state.pdfPage = 1;
    state.pdfTotal = null;
    state.pdfZoom = 100;
    state.pdfBrowser = false;
    state.pdfTranslation = '';
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

  async function createCategory(name: string, parent = ''): Promise<unknown> {
    try {
      const result = await api('/api/categories', json('POST', { name, ...(parent ? { parent } : {}) }));
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

  async function deleteCategory(category: string, subcategory = ''): Promise<unknown> {
    try {
      const result = await api(
        '/api/categories/delete',
        json('POST', { category, ...(subcategory ? { subcategory } : {}) }),
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

  // 拖动只记录来源，真正的搬文件、改引用和加锁由 Python move-paper 完成。
  function beginPaperDrag(id: string): boolean {
    if (!id || state.movingPaper) return false;
    state.draggingPaper = id;
    return true;
  }

  function endPaperDrag(): void {
    state.draggingPaper = '';
  }

  async function movePaper(id: string, category: string, subcategory = ''): Promise<boolean> {
    if (!id || state.movingPaper) return false;
    const paper = state.papers.find((item) => item.literature_id === id);
    if (paper && paper.category === category && (paper.subcategory ?? '') === subcategory) {
      toast('这篇文献已在这个文件夹');
      return false;
    }
    state.movingPaper = id;
    try {
      await api(`/api/papers/${endpoint(id)}/move`, json('POST', {
        category, ...(subcategory ? { subcategory } : {}),
      }));
      const target = (subcategory || category).replace(/^\d+_/, '');
      toast(`已移到「${target}」`);
      await loadLibrary();
      return true;
    } catch (error) {
      toast(messageOf(error), true);
      return false;
    } finally {
      state.movingPaper = '';
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
    const version = ++historyVersion;
    try {
      const chats = await api<Chat[]>('/api/chats');
      if (version !== historyVersion || stopped) return;
      state.chats = chats;
      const current = chats.find((chat) => chat.id === state.chat?.id);
      if (current?.historyState) applyChatHistory(current.id, current.historyState);
    } catch (error) {
      toast(messageOf(error), true);
    }
  }

  async function loadCommands(): Promise<void> {
    try {
      const data = await api<{ commands?: CommandInfo[]; desktop?: boolean }>('/api/commands');
      state.commands = Array.isArray(data.commands) ? data.commands : [];
      state.desktopCommands = data.desktop === true;
      state.commandError = '';
    } catch (error) {
      // 命令目录只用于输入提示；拉取失败时仍可直接发消息。
      state.commandError = messageOf(error);
    }
  }

  /**
   * 读取文献库里的界面状态（会话、当前文献、栏宽）。
   * 本地服务每次启动会换端口，浏览器存储因此按端口隔离而不可靠；失败时保持默认值，不阻断启动。
   */
  async function loadUiState(): Promise<void> {
    try {
      const data = await api<UiState>('/api/ui');
      state.ui = { chatId: data.chatId ?? null, paperId: data.paperId ?? null };
      // 用户已经拖过栏宽时不再用服务端旧值覆盖，避免慢返回把刚调好的宽度弹回去。
      if (!state.uiDirty) state.panelWidths = { ...(data.panelWidths || {}) };
      state.uiError = '';
    } catch (error) {
      state.uiError = messageOf(error);
    }
  }

  /** 保存局部界面状态；偏好写失败只记下来，不回滚也不打断阅读。 */
  function saveUiState(patch: Partial<UiState>): void {
    if (patch.chatId !== undefined) state.ui.chatId = patch.chatId;
    if (patch.paperId !== undefined) state.ui.paperId = patch.paperId;
    if (patch.panelWidths) state.panelWidths = { ...state.panelWidths, ...patch.panelWidths };
    state.uiDirty = true;
    api('/api/ui', json('PATCH', patch)).catch((error: unknown) => {
      state.uiError = messageOf(error);
    });
  }

  async function runWorkspaceCommand(name: string, args: string): Promise<void> {
    switch (name) {
      case 'settings':
        state.agentSettingsOpen = true;
        return;
      case 'model': {
        if (!args) {
          if (models.value.length) state.focusModelPicker++;
          else state.agentSettingsOpen = true;
          return;
        }
        const target = models.value.find(({ id }) => id === args);
        const matches = models.value.filter(({ id }) => id.split('/').slice(1).join('/') === args);
        const option = target ?? (matches.length === 1 ? matches[0] : undefined);
        if (!option) throw new Error('模型不可用或名称不唯一，请使用完整的服务商/模型名称。');
        state.model = option.id;
        toast(`已选择模型：${option.label}`);
        return;
      }
      case 'thinking':
        if (!args) {
          state.agentSettingsOpen = true;
          return;
        }
        await api('/api/agents/pi/settings/thinking', json('POST', { level: args, ...(state.model && { model: state.model }) }));
        toast('已更新推理强度');
        return;
      case 'new':
        newChat();
        return;
      case 'resume':
        state.historyOpen = true;
        await loadChats();
        if (args) {
          const chat = state.chats.find(({ id, historyState }) => id === args && historyState !== 'trashed');
          if (!chat) throw new Error('找不到可打开的会话。');
          await openChat(chat.id);
        }
        return;
      case 'copy': {
        const message = state.chat?.messages?.slice().reverse().find(({ role, text }) =>
          role === 'assistant' && text?.trim(),
        );
        if (!message?.text) throw new Error('当前会话还没有可复制的助手消息。');
        await navigator.clipboard.writeText(message.text);
        toast('已复制最后一条助手消息');
        return;
      }
      case 'reload':
        await api('/api/agents/pi/settings/reload', json('POST', {}));
        await Promise.all([loadStatus(), loadCommands()]);
        toast('已重新加载模型和文献库技能');
        return;
      case 'quit':
        if (!state.desktopCommands) throw new Error('此命令需要在 Zhiyue 桌面版运行。');
        await api('/api/commands/quit', json('POST', {}));
        return;
      default:
        throw new Error(`无法执行界面命令 /${name}。`);
    }
  }

  /** 界面操作直接执行，Pi 终端命令交给随包 CLI。服务端回执与技能仍走会话接口。 */
  async function runCommand(text: string, paperIds = [...state.context]): Promise<boolean> {
    if (!canStartTurn.value) return false;
    const [, name = '', rawArgs = ''] = /^\/([^\s/]+)(?:\s+([\s\S]*))?$/.exec(text) ?? [];
    const command = state.commands.find((item) => item.name === name);
    if (command?.target) {
      try {
        if (command.target === 'workspace') {
          await runWorkspaceCommand(name, rawArgs.trim());
        } else {
          if (!state.desktopCommands) throw new Error('此命令需要在 Zhiyue 桌面版运行。');
          await api('/api/commands/terminal', json('POST', { text, chatId: state.chat?.id }));
        }
        if (state.draft.trim() === text) state.draft = '';
        return true;
      } catch (error) {
        toast(`命令未执行：${messageOf(error)}`, true);
        return false;
      }
    }
    if (command?.source === 'skill' && !modelReady.value) {
      toast('请先连接可用模型，再执行技能命令。', true);
      return false;
    }
    if (command?.scope === 'chat' && !state.chat) {
      toast('请先打开会话。', true);
      return false;
    }
    state.sending = true;
    // 阅读位置跟着请求一起发出：命令与普通消息共用同一套服务端上下文校验。
    const place = { activePaperId: state.current || undefined, pdfPage: state.pdfPage };
    try {
      if (!state.chat) {
        state.creating = true;
        try {
          const chat = await api<ChatResponse>(
            '/api/chats',
            json('POST', { paperIds, title: text.slice(0, 50) || titleOf(currentPaper.value || {}) }),
          );
          state.chat = { ...chat, messages: chat.messages || [] };
          saveUiState({ chatId: chat.id });
          state.chats.unshift(chat);
        } finally {
          state.creating = false;
        }
      }
      const chat = state.chat as Chat;
      const body: Record<string, unknown> = { text, paperIds, ...place };
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

  function runPaperSkill(name: string, instruction: string): Promise<boolean> | false {
    const paper = currentPaper.value;
    if (!paper || !canRunPaperSkill.value) return false;
    return runCommand(`/skill:${name} ${instruction}`, [paper.literature_id]);
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
    saveUiState({ chatId: null });
    state.focusComposer++;
  }

  function applyChatHistory(id: string, historyState: ChatHistoryState): void {
    historyVersion++;
    const summary = state.chats.find((chat) => chat.id === id);
    if (summary) summary.historyState = historyState;
    if (state.chat?.id !== id) return;
    if (historyState === 'trashed') {
      state.chatEpoch++;
      state.chat = null;
      saveUiState({ chatId: null });
    } else {
      state.chat.historyState = historyState;
    }
  }

  function canChangeChat(id: string): boolean {
    if (pendingChatChanges.has(id)) return false;
    if (id === state.chat?.id) return !busy.value && !state.noteSaving && !state.folderActionSaving;
    const summary = state.chats.find((chat) => chat.id === id);
    return !summary?.messages?.some((message) => activeStatuses.includes(message.status));
  }

  async function changeChatHistory(id: string, historyState: ChatHistoryState): Promise<void> {
    if (!canChangeChat(id)) return;
    pendingChatChanges.add(id);
    try {
      const result = await api<{ historyState: ChatHistoryState }>(
        `/api/chats/${endpoint(id)}`,
        historyState === 'trashed' ? json('DELETE', {}) : json('PATCH', { historyState }),
      );
      applyChatHistory(id, result.historyState);
      toast({ active: '已恢复会话', archived: '已归档会话', trashed: '已移入会话回收站' }[historyState]);
    } catch (error) {
      toast(messageOf(error), true);
      void loadChats();
    } finally {
      pendingChatChanges.delete(id);
    }
  }

  async function openChat(id: string): Promise<void> {
    if (state.sending || pendingChatChanges.has(id)) return;
    const epoch = ++state.chatEpoch;
    try {
      const chat = await api<Chat>(`/api/chats/${endpoint(id)}`);
      if (epoch !== state.chatEpoch || stopped || pendingChatChanges.has(id)) return;
      const summary = state.chats.find((item) => item.id === id);
      if (summary?.historyState === 'trashed') return;
      if (summary?.historyState) chat.historyState = summary.historyState;
      state.chat = chat;
      state.context = new Set(chat.paperIds || []);
      saveUiState({ chatId: chat.id });
      if (agent.value.available !== true) reconnectAgent();
    } catch (error) {
      toast(messageOf(error), true);
    }
  }

  async function syncChat(id: string): Promise<void> {
    const epoch = state.chatEpoch;
    const chat = await api<ChatResponse>(`/api/chats/${endpoint(id)}`);
    if (epoch !== state.chatEpoch || state.chat?.id !== id || stopped || pendingChatChanges.has(id)) return;
    const summary = state.chats.find((item) => item.id === id);
    if (summary?.historyState) chat.historyState = summary.historyState;
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
    if (!canSend.value || !modelReady.value || !state.chat && !state.draft.trim() && !state.attachments.length) {
      return false;
    }
    const text = state.draft.trim();
    const files = [...state.attachments];
    const paperIds = [...state.context];
    const place = { activePaperId: state.current || undefined, pdfPage: state.pdfPage };
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
          saveUiState({ chatId: chat.id });
          state.chats.unshift(chat);
        } finally {
          state.creating = false;
        }
      }
      const chat = state.chat as Chat;
      const body: Record<string, unknown> = { text, paperIds, attachmentIds: files.map((file) => file.id), ...place };
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
      const isDocument = draft.target === 'synthesis' || draft.target === 'outputs';
      chat!.noteDrafts = (chat!.noteDrafts || []).filter((item) => item.id !== id);
      if (action === 'save') {
        toast(`${isDocument ? '文稿' : '笔记'}已保存：${result.path ?? ''}`);
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

  /** 确认或取消助手提出的分类删除；失败时服务端会推送带 error 的同一张卡片，这里只提示原因。 */
  async function resolveFolderAction(id: string, action: 'apply' | 'discard'): Promise<void> {
    const chat = state.chat;
    const pending = (chat?.folderActions || []).find((item) => item.id === id);
    if (!pending || state.folderActionSaving) return;
    state.folderActionSaving = id;
    try {
      await api(`/api/folder-actions/${endpoint(id)}`, json('POST', { action }));
      chat!.folderActions = (chat!.folderActions || []).filter((item) => item.id !== id);
      if (action === 'apply') {
        toast(`文件夹已移到回收站：${pending.path}`);
        await loadLibrary();
      } else {
        toast('已取消删除文件夹');
      }
    } catch (error) {
      toast(messageOf(error), true);
    } finally {
      state.folderActionSaving = '';
    }
  }

  /**
   * 删除已保存的阅读笔记。服务端只把文件移到 `.zhiyue/trash/notes/`，所以确认文案要说明可以找回；
   * 删除后回到笔记列表第一项，没有剩余笔记时清空选中路径。
   */
  async function deleteNote(relativePath: string): Promise<boolean> {
    if (!relativePath || state.noteDeleting) return false;
    state.noteDeleting = true;
    try {
      const result = await api<{ trashed: string; library?: LibraryResponse }>(
        '/api/notes/delete',
        json('POST', { path: relativePath }),
      );
      state.papers = Array.isArray(result.library?.papers) ? result.library.papers : state.papers;
      const paper = state.papers.find((item) => item.literature_id === state.current);
      const remaining = Array.isArray(paper?.notes) ? paper.notes : [];
      state.notePath = remaining[0]?.path ?? '';
      toast(`笔记已移入回收站：${result.trashed}`);
      return true;
    } catch (error) {
      toast(messageOf(error), true);
      return false;
    } finally {
      state.noteDeleting = false;
    }
  }

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
      toast('索引刷新任务已提交，可在“下载任务”页查看');
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
    if (data.type === 'pdfTranslation' && (data.job as PdfTranslationEvent['job'] | undefined)?.paperId) {
      state.pdfTranslationEvent = data as unknown as PdfTranslationEvent;
      return;
    }
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
      const draft = data.draft as WorkspaceState['toasts'][number] extends never ? never : { id: string };
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
      if (state.historyOpen && !state.eventsOpen) work.push(loadChats());
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
      let connectedBefore = false;
      source.onopen = () => {
        state.eventsOpen = true;
        loadStatus();
        if (connectedBefore) void loadChats();
        connectedBefore = true;
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
    await Promise.allSettled([
      loadLibrary(), loadStatus(), loadChats(), loadDownloads(), loadCommands(), loadUiState(),
    ]);
    if (stopped) return;
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
    canRunPaperSkill,
    toast,
    setView,
    setPanel,
    setDraft,
    selectPaper,
    resetFilters,
    loadLibrary,
    createCategory,
    renameCategory,
    deleteCategory,
    patchPaper,
    beginPaperDrag,
    endPaperDrag,
    movePaper,
    loadStatus,
    reconnectAgent,
    loadChats,
    canChangeChat,
    changeChatHistory,
    loadCommands,
    loadUiState,
    saveUiState,
    openChat,
    syncChat,
    newChat,
    sendMessage,
    runCommand,
    runPaperSkill,
    submit,
    interrupt,
    uploadFile,
    uploadFiles,
    uploadOne,
    importPdfs,
    decideApproval,
    saveNoteDraft,
    discardNoteDraft,
    resolveFolderAction,
    deleteNote,
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
