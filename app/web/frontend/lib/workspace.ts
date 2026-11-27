import { computed, inject, reactive } from 'vue';
import { request } from './api';
import type { ComputedRef } from 'vue';
import { authorText, readKey, titleOf } from './content';
import type { JobRecord, ModelOption, Paper, PiAgentStatus, WorkspaceState } from './types';
import { createWorkspaceLibraryActions } from './workspaceLibrary';
import type { ApiFn } from './workspaceLibrary';
import { createWorkspaceChatActions } from './workspaceChat';
import { createWorkspaceClassificationActions } from './workspaceClassifications';
import { createWorkspaceEvents } from './workspaceEvents';
import { createWorkspaceTranslationActions, storedTranslationModel } from './workspaceTranslations';

export type { WorkspaceState, UiState } from './types';
export type { ApiFn } from './workspaceLibrary';

export const activeStatuses = ['streaming', 'pending', 'running', 'in_progress', 'inProgress', 'queued'];
export const statusLabels: Record<string, string> = {
  queued: '排队中',
  pending: '等待中',
  running: '进行中',
  completed: '流程结束',
  partial: '部分完成',
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

export interface CreateWorkspaceOptions {
  api?: ApiFn;
  EventSourceImpl?: typeof EventSource;
  pollInterval?: number;
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
    classifySaving: '',
    classifyRequests: new Map(),
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
    translationModel: storedTranslationModel(),
    translationSnapshot: { engineAvailable: false, model: null, batches: [], jobs: [] },
    translationReady: false,
    translationLoading: false,
    translationOpen: false,
    translationMode: 'new',
    translationCandidates: [],
    translationSelected: new Set(),
    translationRegenerate: false,
    translationSubmitting: false,
    translationCancelling: new Set(),
    translationBatchId: '',
    translationError: '',
    translationLoadError: '',
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

  const paperById = computed<ReadonlyMap<string, Paper>>(() =>
    new Map(state.papers.map((paper) => [paper.literature_id, paper])));
  const currentPaper = computed(() => paperById.value.get(state.current ?? ''));
  const titleCollator = new Intl.Collator();
  const idCollator = new Intl.Collator(undefined, { numeric: true });
  const searchCache = new WeakMap<Paper, ComputedRef<string>>();

  function searchText(paper: Paper): string {
    let cached = searchCache.get(paper);
    if (!cached) {
      // 搜索串只依赖书目元数据；收藏和阅读进度更新复用缓存，空查询不会建立缓存。
      cached = computed(() => [
        paper.title, paper.titleZh, authorText(paper), paper.literature_id,
        paper.venue, paper.category, paper.subcategory,
      ].join(' ').toLocaleLowerCase());
      searchCache.set(paper, cached);
    }
    return cached.value;
  }

  // 先缓存全库排序，再筛选，输入关键词时无需重复比较题名或编号。
  const sortedPapers = computed(() => {
    const result = [...state.papers];
    const sort = state.sort;
    result.sort((a, b) => sort.startsWith('year')
      ? (Number(a.year) || 0) - (Number(b.year) || 0)
      : sort === 'title'
        ? titleCollator.compare(titleOf(a), titleOf(b))
        : idCollator.compare(a.literature_id, b.literature_id));
    return sort === 'year-desc' ? result.reverse() : result;
  });
  const filteredPapers = computed(() => {
    const query = state.query.trim().toLocaleLowerCase();
    return sortedPapers.value.filter((paper) =>
      (!query || searchText(paper).includes(query)) &&
      (!state.year || String(paper.year) === state.year) &&
      (!state.read || readKey(paper.readStatus) === state.read) &&
      (!state.starred || paper.starred) &&
      (!state.category || (paper.category || '未分类') === state.category) &&
      (!state.subcategory || paper.subcategory === state.subcategory));
  });
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
  const busy = computed(() => state.sending || generating.value || classifications.classifying.value);
  const pendingChatChanges = reactive(new Set<string>());
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

  const library = createWorkspaceLibraryActions({ state, api, toast, setPanel });

  function setView(view: WorkspaceState['view']): void {
    state.view = view;
    if (view === 'downloads') library.loadDownloads();
  }

  const classifications = createWorkspaceClassificationActions({
    state, api, isStopped: () => stopped, toast, syncChat: (id) => chat.syncChat(id),
    loadLibrary: library.loadLibrary,
  });

  const chat = createWorkspaceChatActions({
    state, api, activeStatuses, pendingChatChanges, currentPaper, agent, models, busy, modelReady, canStartTurn,
    canRunPaperSkill, canSend, isStopped: () => stopped, toast,
    saveUiState: library.saveUiState,
    loadLibrary: library.loadLibrary,
    classificationBusy: classifications.classificationBusy,
    mergeClassifyChat: classifications.mergeClassifyChat,
    classifySummaryVersion: classifications.classifySummaryVersion,
    mergeClassifySummaries: classifications.mergeClassifySummaries,
  });

  const translations = createWorkspaceTranslationActions({
    state, api, paperById: () => paperById.value, models: () => models.value, isStopped: () => stopped, toast,
  });

  const events = createWorkspaceEvents({
    state, api, EventSourceImpl, pollInterval, busy, statusLabels, activeJob,
    isStopped: () => stopped,
    markStopped: () => { stopped = true; },
    toast,
    loadLibrary: library.loadLibrary,
    loadStatus: chat.loadStatus,
    loadChats: chat.loadChats,
    loadDownloads: library.loadDownloads,
    loadCommands: chat.loadCommands,
    loadUiState: library.loadUiState,
    loadTranslations: translations.loadTranslations,
    receiveTranslation: translations.receiveTranslation,
    openChat: chat.openChat,
    syncChat: chat.syncChat,
    receiveClassification: classifications.receiveClassification,
    needsClassifySync: classifications.needsClassifySync,
    selectPaper: library.selectPaper,
    applyChatHistory: chat.applyChatHistory,
    clearToasts: () => { for (const timer of toastTimers) clearTimeout(timer); },
  });

  return {
    state,
    api,
    currentPaper,
    paperById,
    sortedPapers,
    filteredPapers,
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
    ...library,
    ...chat,
    ...classifications,
    ...translations,
    ...events,
  };
}

export type WorkspaceApi = ReturnType<typeof createWorkspace>;

export function useWorkspace(): WorkspaceApi {
  const workspace = inject<WorkspaceApi>('workspace');
  if (!workspace) throw new Error('工作区尚未初始化。');
  return workspace;
}
