import { computed, reactive, markRaw } from 'vue';
import { request } from './api.js';
import { json, endpoint, titleOf } from './content.js';

export const activeStatuses = ['streaming', 'pending', 'running', 'in_progress', 'inProgress', 'queued'];
export const statusLabels = {
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
export const activeJob = (job) => ['queued', 'pending', 'running', 'in_progress'].includes(job.status);

export function createWorkspace({
  api = request,
  EventSourceImpl = globalThis.EventSource,
  pollInterval = 8000,
} = {}) {
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
  });
  // 浏览器存储可能被隐私设置禁用，读取失败时使用默认会话与布局。
  const remember = (key, value) => {
    try {
      value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value);
    } catch {
      /* 存储不可用不影响本轮操作。 */
    }
  };
  const recalled = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const currentPaper = computed(() => state.papers.find((paper) => paper.literature_id === state.current));
  const agent = computed(() => state.status.agents?.pi || {});
  const models = computed(() =>
    (agent.value.models || [])
      .map((model) => {
        if (typeof model === 'string') return { id: model, label: model };
        const id = model.model || model.id || model.name;
        return {
          id,
          label: model.displayName || model.display_name || model.name || id,
          isDefault: model.isDefault,
        };
      })
      .filter((model) => model.id),
  );
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
  let source,
    polling = false,
    pollTimer,
    uploadSequence = 0,
    toastSequence = 0,
    stopped = false;
  const toastTimers = new Set();

  function toast(message, error = false) {
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
  function setPanel(panel) {
    state.panel = panel;
  }
  function setDraft(text) {
    state.draft = text;
    state.focusComposer++;
  }
  function setView(view) {
    state.view = view;
    if (view === 'downloads') loadDownloads();
  }
  function selectPaper(id) {
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
  function resetFilters() {
    Object.assign(state, { query: '', year: '', read: '', starred: false, category: '', subcategory: '' });
  }
  async function loadLibrary() {
    try {
      const data = await api('/api/library');
      state.papers = Array.isArray(data.papers) ? data.papers : [];
      state.categories = data.categories || [];
      state.stats = data.stats || {};
      state.libraryError = '';
    } catch (error) {
      state.libraryError = error.message;
    }
  }
  async function patchPaper(id, update) {
    if (state.pendingPatches.has(id)) return false;
    state.pendingPatches.add(id);
    try {
      await api(`/api/papers/${endpoint(id)}`, json('PATCH', update));
      const paper = state.papers.find((item) => item.literature_id === id);
      if (paper) Object.assign(paper, update);
      return true;
    } catch (error) {
      toast(error.message, true);
      return false;
    } finally {
      state.pendingPatches.delete(id);
    }
  }
  async function loadStatus() {
    try {
      state.status = await api('/api/status');
      state.statusError = '';
    } catch (error) {
      state.statusError = error.message;
    }
  }
  async function reconnectAgent() {
    state.status.agents = {
      ...state.status.agents,
      pi: { ...state.status.agents?.pi, loading: true },
    };
    try {
      await api('/api/agents/pi/connect', json('POST', {}));
    } catch (error) {
      toast(error.message, true);
    } finally {
      await loadStatus();
    }
  }
  async function loadChats() {
    try {
      state.chats = await api('/api/chats');
    } catch (error) {
      toast(error.message, true);
    }
  }
  function newChat() {
    if (state.sending) return;
    state.chatEpoch++;
    state.chat = null;
    remember('zhiyue.chat', null);
    state.focusComposer++;
  }
  async function openChat(id) {
    if (state.sending) return;
    const epoch = ++state.chatEpoch;
    try {
      const chat = await api(`/api/chats/${endpoint(id)}`);
      if (epoch !== state.chatEpoch || stopped) return;
      state.chat = chat;
      state.context = new Set(chat.paperIds || []);
      remember('zhiyue.chat', chat.id);
      if (agent.value.available !== true) reconnectAgent();
    } catch (error) {
      toast(error.message, true);
    }
  }
  async function syncChat(id) {
    const epoch = state.chatEpoch,
      chat = await api(`/api/chats/${endpoint(id)}`);
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
  async function sendMessage() {
    if (!canSend.value) return false;
    const text = state.draft.trim(),
      files = [...state.attachments],
      paperIds = [...state.context];
    state.sending = true;
    try {
      if (!state.chat) {
        state.creating = true;
        try {
          const chat = await api(
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
      const id = state.chat.id,
        body = { text, paperIds, attachmentIds: files.map((file) => file.id) };
      if (state.model) body.model = state.model;
      await api(`/api/chats/${endpoint(id)}/messages`, json('POST', body));
      if (state.draft.trim() === text) state.draft = '';
      const submitted = new Set(files.map((file) => file.key));
      state.attachments = state.attachments.filter((file) => !submitted.has(file.key));
      try {
        await syncChat(id);
      } catch {
        toast('消息已提交；正在等待会话同步，请勿重复发送。', true);
      }
      loadChats();
      return true;
    } catch (error) {
      toast(`消息未能确认提交：${error.message}。请检查会话后重试。`, true);
      return false;
    } finally {
      state.sending = false;
    }
  }
  async function interrupt() {
    if (!state.chat) return;
    try {
      const id = state.chat.id;
      await api(`/api/chats/${endpoint(id)}/interrupt`, json('POST', {}));
      await syncChat(id);
    } catch (error) {
      toast(error.message, true);
    }
  }
  async function uploadOne(item) {
    item.status = 'uploading';
    item.error = '';
    try {
      const data = await api('/api/uploads', {
        method: 'POST',
        headers: {
          'X-Filename': encodeURIComponent(item.file.name),
          'Content-Type': item.file.type || 'application/octet-stream',
        },
        body: item.file,
      });
      if (!data.id) throw new Error('上传接口没有返回附件编号');
      Object.assign(item, data, { status: 'ready' });
    } catch (error) {
      item.status = 'error';
      item.error = error.message;
      toast(`上传 ${item.name} 失败：${error.message}`, true);
    }
  }
  async function uploadFiles(files) {
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
        status: 'uploading',
      });
      state.attachments.push(item);
      await uploadOne(item);
    }
  }
  async function resolveNoteDraft(id, action) {
    const chat = state.chat,
      draft = (chat?.noteDrafts || []).find((item) => item.id === id);
    if (!draft || state.noteSaving) return;
    state.noteSaving = id;
    try {
      const result = await api(`/api/note-drafts/${endpoint(id)}`, json('POST', { action }));
      chat.noteDrafts = (chat.noteDrafts || []).filter((item) => item.id !== id);
      if (action === 'save') {
        toast(`笔记已保存：${result.path}`);
        await loadLibrary();
      } else {
        toast('已丢弃笔记草稿');
      }
    } catch (error) {
      toast(error.message, true);
    } finally {
      state.noteSaving = '';
    }
  }
  const saveNoteDraft = (id) => resolveNoteDraft(id, 'save');
  const discardNoteDraft = (id) => resolveNoteDraft(id, 'discard');
  async function decideApproval(id, decision, answers = {}) {
    const approval = state.approvals.get(id);
    if (!approval || approval.submitting) return;
    approval.submitting = true;
    try {
      const body = { decision };
      if (decision === 'accept' && approval.params?.questions?.length) body.answers = answers;
      await api(`/api/approvals/${endpoint(id)}`, json('POST', body));
      state.resolvedApprovals.add(id);
      state.approvals.delete(id);
    } catch (error) {
      approval.submitting = false;
      toast(error.message, true);
    }
  }
  async function loadDownloads() {
    try {
      const data = await api('/api/downloads');
      for (const job of data.jobs || []) state.jobs.set(job.id, job);
      state.batches = data.batches || [];
      state.downloadsError = '';
    } catch (error) {
      state.downloadsError = error.message;
    }
  }
  async function createDownload(data) {
    try {
      const job = await api('/api/downloads', json('POST', data));
      state.jobs.set(job.id, job);
      toast('下载任务已创建');
      return true;
    } catch (error) {
      toast(error.message, true);
      return false;
    }
  }
  async function batchAction(batch, action) {
    try {
      const body = { batch, action, ...(action === 'ieee' ? { submit: true } : {}) };
      const job = await api('/api/downloads/action', json('POST', body));
      state.jobs.set(job.id, job);
      toast('批次操作已提交');
      return true;
    } catch (error) {
      toast(error.message, true);
      return false;
    }
  }
  async function refreshCatalog() {
    state.refreshing = true;
    try {
      const job = await api('/api/catalog/refresh', json('POST', {}));
      state.jobs.set(job.id, job);
      toast('索引刷新任务已提交，可在任务中心查看');
    } catch (error) {
      toast(error.message, true);
    } finally {
      state.refreshing = false;
    }
  }
  function upsertMessage(message) {
    const messages = (state.chat.messages ||= []),
      index = messages.findIndex((item) => item.id === message.id);
    if (index < 0) messages.push(message);
    else Object.assign(messages[index], message);
  }
  function receive(data) {
    if (stopped) return;
    if (data.type === 'connected' && Array.isArray(data.approvals)) {
      state.approvals.clear();
      for (const approval of data.approvals) {
        if (!state.resolvedApprovals.has(approval.id)) state.approvals.set(approval.id, approval);
      }
    }
    if (data.type === 'approvalResolved') {
      state.approvals.delete(data.id);
      state.resolvedApprovals.add(data.id);
    }
    if (data.type === 'noteDraft' && data.chatId === state.chat?.id && data.draft?.id) {
      const drafts = (state.chat.noteDrafts ||= []);
      const index = drafts.findIndex((item) => item.id === data.draft.id);
      if (index < 0) drafts.push(data.draft);
      else drafts[index] = data.draft;
    }
    if (data.type === 'noteDraftResolved' && data.chatId === state.chat?.id) {
      state.chat.noteDrafts = (state.chat.noteDrafts || []).filter((item) => item.id !== data.id);
    }
    if (data.type === 'message' && data.chatId === state.chat?.id && data.message?.id)
      upsertMessage(data.message);
    if (data.type === 'delta' && data.chatId === state.chat?.id) {
      let message = state.chat.messages?.find((item) => item.id === data.messageId);
      if (!message) {
        upsertMessage({ id: data.messageId, role: 'assistant', text: '', status: 'streaming' });
        message = state.chat.messages.find((item) => item.id === data.messageId);
      }
      message.text = (message.text || '') + String(data.delta || '');
      message.status = 'streaming';
    }
    if (data.type === 'approval' && data.approval?.id && !state.resolvedApprovals.has(data.approval.id)) {
      state.approvals.set(data.approval.id, {
        ...state.approvals.get(data.approval.id),
        ...data.approval,
        chatId: data.chatId,
      });
    }
    if (data.type === 'status') {
      const status = data.status || data;
      state.status = {
        ...state.status,
        ...status,
        agents: { ...state.status.agents, ...status.agents },
      };
    }
    if (data.type === 'job' && data.job?.id) {
      const previous = state.jobs.get(data.job.id);
      state.jobs.set(data.job.id, { ...previous, ...data.job });
      if (previous && activeJob(previous) && !activeJob(data.job)) {
        toast(
          `任务${statusLabels[data.job.status] || data.job.status}：${data.job.title || data.job.id}`,
          ['error', 'failed'].includes(data.job.status),
        );
        loadLibrary();
        if (state.view === 'downloads') loadDownloads();
      }
    }
  }
  async function poll() {
    if (document.hidden || polling || stopped) return;
    polling = true;
    try {
      const work = [loadStatus()];
      if (state.chat && (!state.eventsOpen || busy.value)) work.push(syncChat(state.chat.id));
      for (const job of state.jobs.values())
        if (activeJob(job)) {
          work.push(
            api(`/api/jobs/${endpoint(job.id)}`).then((data) => {
              state.jobs.set(data.id, data);
              if (!activeJob(data)) {
                loadLibrary();
                if (state.view === 'downloads') loadDownloads();
              }
            }),
          );
        }
      await Promise.allSettled(work);
    } finally {
      polling = false;
    }
  }
  async function start() {
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
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        receive(data);
      };
    }
    await Promise.allSettled([loadLibrary(), loadStatus(), loadChats(), loadDownloads()]);
    if (stopped) return;
    const saved = recalled('zhiyue.chat');
    if (saved && state.chats.some((chat) => chat.id === saved)) await openChat(saved);
    if (pollInterval) pollTimer = setInterval(poll, pollInterval);
  }
  function stop() {
    stopped = true;
    source?.close();
    clearInterval(pollTimer);
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
    patchPaper,
    loadStatus,
    reconnectAgent,
    loadChats,
    openChat,
    syncChat,
    newChat,
    sendMessage,
    interrupt,
    uploadFiles,
    uploadOne,
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
