import { markRaw, reactive } from 'vue';
import type { ComputedRef } from 'vue';
import { endpoint, json, titleOf } from './content';
import type {
  Chat, ChatHistoryState, ChatMessage, CommandInfo, ModelOption, Paper, PiAgentStatus, StatusInfo, UiState,
  WorkspaceState,
} from './types';
import { messageOf } from './workspaceLibrary';
import type { ApiFn } from './workspaceLibrary';

export interface UploadResponse {
  id?: string;
  name?: string;
  mime?: string;
  size?: number;
}

export interface UploadDraft {
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

export interface ChatActionsDeps {
  state: WorkspaceState;
  api: ApiFn;
  activeStatuses: string[];
  pendingChatChanges: Set<string>;
  currentPaper: ComputedRef<Paper | undefined>;
  agent: ComputedRef<PiAgentStatus>;
  models: ComputedRef<ModelOption[]>;
  busy: ComputedRef<boolean>;
  modelReady: ComputedRef<boolean>;
  canStartTurn: ComputedRef<boolean>;
  canRunPaperSkill: ComputedRef<boolean>;
  canSend: ComputedRef<boolean>;
  isStopped: () => boolean;
  toast: (message: string, error?: boolean) => void;
  saveUiState: (patch: Partial<UiState>) => void;
  loadLibrary: () => Promise<void>;
}

export function createWorkspaceChatActions({
  state, api, activeStatuses, pendingChatChanges, currentPaper, agent, models, busy, modelReady, canStartTurn,
  canRunPaperSkill, canSend, isStopped, toast, saveUiState, loadLibrary,
}: ChatActionsDeps) {
  let historyVersion = 0;
  let uploadSequence = 0;

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

  async function loadChats(): Promise<void> {
    const version = ++historyVersion;
    try {
      const chats = await api<Chat[]>('/api/chats');
      if (version !== historyVersion || isStopped()) return;
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

  function newChat(): void {
    if (state.sending) return;
    state.chatEpoch++;
    state.chat = null;
    saveUiState({ chatId: null });
    state.focusComposer++;
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
      if (epoch !== state.chatEpoch || isStopped() || pendingChatChanges.has(id)) return;
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
    if (epoch !== state.chatEpoch || state.chat?.id !== id || isStopped() || pendingChatChanges.has(id)) return;
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

  async function ensureChat(title: string, paperIds: string[]): Promise<Chat> {
    if (state.chat) return state.chat;
    state.creating = true;
    try {
      const chat = await api<ChatResponse>(
        '/api/chats',
        json('POST', { paperIds, title: title.slice(0, 50) || titleOf(currentPaper.value || {}) }),
      );
      state.chat = { ...chat, messages: chat.messages || [] };
      saveUiState({ chatId: chat.id });
      state.chats.unshift(chat);
      return state.chat;
    } finally {
      state.creating = false;
    }
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
    const place = { activePaperId: state.current || undefined, pdfPage: state.pdfPage };
    try {
      const chat = await ensureChat(text, paperIds);
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
      const chat = await ensureChat(text, paperIds);
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

  /** 输入框提交入口：以斜杠开头走命令通道，其余按普通消息发送。 */
  async function submit(): Promise<boolean> {
    const text = state.draft.trim();
    if (text.startsWith('/')) return runCommand(text);
    return sendMessage();
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

  /** 提交已勾选的删除请求，按服务端实际返回更新卡片。 */
  async function resolveFolderActions(ids: string[], action: 'apply' | 'discard'): Promise<void> {
    const chat = state.chat;
    if (!chat || !ids.length || state.folderActionSaving) return;
    const paths = new Map((chat.folderActions ?? []).map(({ id, path }) => [id, path]));
    const countFolders = (items: string[]): number => new Set(items.map((id) => paths.get(id) ?? id)).size;
    state.folderActionSaving = chat.id;
    try {
      const result = await api<{
        applied: string[]; discarded: string[]; failed: Array<{ id: string; error: string }>; remaining: string[];
      }>(`/api/chats/${endpoint(chat.id)}/folder-actions`, json('POST', { action, ids }));
      const resolved = new Set([...result.applied, ...result.discarded]);
      const errors = new Map(result.failed.map(({ id, error }) => [id, error]));
      if (state.chat?.id === chat.id) {
        state.chat.folderActions = (state.chat.folderActions ?? []).filter((item) => !resolved.has(item.id));
        for (const item of state.chat.folderActions) {
          const error = errors.get(item.id);
          if (error) item.error = error;
        }
      }
      if (action === 'apply') {
        const failed = result.failed.length ? `，${countFolders(result.failed.map(({ id }) => id))} 项需处理` : '';
        const remaining = result.remaining.length ? `，${countFolders(result.remaining)} 项未执行` : '';
        toast(`已移入回收站 ${countFolders(result.applied)} 个文件夹${failed}${remaining}`, !!failed || !!remaining);
        await loadLibrary();
      } else {
        toast(`已取消 ${countFolders(result.discarded)} 个文件夹的删除请求`);
      }
    } catch (error) {
      toast(messageOf(error), true);
    } finally {
      state.folderActionSaving = '';
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

  return {
    loadStatus,
    reconnectAgent,
    applyChatHistory,
    loadChats,
    loadCommands,
    newChat,
    canChangeChat,
    changeChatHistory,
    openChat,
    syncChat,
    runCommand,
    runPaperSkill,
    sendMessage,
    submit,
    interrupt,
    uploadFile,
    uploadOne,
    uploadFiles,
    saveNoteDraft,
    discardNoteDraft,
    resolveFolderActions,
    decideApproval,
  };
}
