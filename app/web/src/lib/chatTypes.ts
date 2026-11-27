import type { SkillRuntime } from './skills.js';
import type { Library, LibraryPaper } from './library.js';
import type { JobManager, JobRecord } from './jobs.js';
import type {
  ChatAttachmentRef, ChatClassifyProposal, ChatDraftTarget, ChatFolderAction, ChatHistoryState, ChatRole,
  ChatStatus,
} from '../../shared/contracts.js';

export type {
  ChatAttachmentRef, ChatClassifyProposal, ChatDraftTarget, ChatFolderAction, ChatHistoryState, ChatRole,
  ChatStatus, JobRecord, LibraryPaper,
};

export interface ChatModel {
  id: string;
  model: string;
  displayName: string;
  isDefault?: boolean;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  thinking?: string;
  status: ChatStatus;
  createdAt: string;
  attachments?: ChatAttachmentRef[];
  error?: string;
}

export interface ChatNoteDraft {
  id: string;
  paperId: string;
  paperIds?: string[];
  target?: ChatDraftTarget;
  title: string;
  content: string;
  source: string;
  path: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  title: string;
  provider?: string;
  paperIds: string[];
  messages: ChatMessage[];
  noteDrafts: ChatNoteDraft[];
  folderActions?: ChatFolderAction[];
  classifyProposals?: ChatClassifyProposal[];
  /** 最近一次已在完成的模型回合中同步的系统回执；失败或中断后仍会重送未同步结果。 */
  lastContextOperationId?: string;
  createdAt: string;
  threadId: string | null;
  historyState?: ChatHistoryState;
}

export interface ChatEvent {
  type: string;
  [key: string]: unknown;
}

export interface ChatStatusSnapshot {
  available: boolean;
  authenticated: boolean;
  account: { type?: string; email?: string; planType?: string } | null;
  error: string | null;
  loading: boolean;
}

export interface ChatStatusResult extends ChatStatusSnapshot {
  agents?: { pi: ChatStatusSnapshot & { models?: ChatModel[] } };
  models?: ChatModel[];
  defaultProvider?: string;
}

export interface ThreadResult {
  thread: { id: string };
}

export interface TurnResult {
  turn: { id: string };
}

export interface AccountResult {
  account: { type?: string; email?: string; planType?: string } | null;
  requiresOpenaiAuth?: boolean;
}

export interface ModelListResult {
  data: ChatModel[];
}

export interface AssistantClient {
  available: boolean;
  lastError: string | null;
  start(): Promise<unknown>;
  request<R>(method: string, params?: Record<string, unknown>, timeout?: number): Promise<R>;
  respond(id: number, result: unknown): void;
  respondError(id: number, message: string): void;
  close(): Promise<void>;
  on(event: 'notification', listener: (message: ClientNotification) => void): unknown;
  on(event: 'request', listener: (message: ClientRequest) => void): unknown;
  on(event: 'disconnected', listener: (error: string) => void): unknown;
}

export interface ClientNotification {
  method: string;
  params?: Record<string, unknown>;
}

export interface ClientRequest {
  id: number;
  method: string;
  params: Record<string, unknown>;
}

export interface DynamicTool {
  type: 'function';
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: false;
  };
}

export interface AttachmentInput extends ChatAttachmentRef {
  path: string;
}

export interface ChatServiceOptions {
  root: string;
  stateDir: string;
  library: Pick<Library, 'getPaper' | 'getLibrary' | 'safeFile' | 'readDocument' | 'refresh' |
    'createCategory' | 'renameCategory' | 'deleteCategory' | 'resolveCategory' | 'movePaper'>;
  jobs: Pick<JobManager, 'startDownload' | 'startAction' | 'startPaperMove' | 'getJob'>;
  emit: (event: ChatEvent) => unknown;
  extract: (file: string, pages?: number[]) => Promise<unknown>;
  /** 单篇论文文字层检索；由服务端复用 extract.py，避免模型逐页读取。 */
  searchPdfText?: (file: string, query: string, maxHits?: number) => Promise<unknown>;
  /** 读取 PDF 内嵌书签，返回页序与目录。 */
  pdfOutline?: (file: string) => Promise<unknown>;
  /** 把指定页渲染成 PNG 并返回 base64，用于扫描页、图表和公式。 */
  renderPage?: (file: string, page: number) => Promise<{
    data: string; mimeType: string; totalPages: number; page: number;
  }>;
  readSkill?: (name: unknown, file?: unknown) => Promise<{ name: string; file: string; text: string }>;
  /** 读取与当前原文匹配的最新已完成中文译本；由服务端延迟装配，避免与翻译服务循环依赖。 */
  readPaperTranslation?: (paperId: string, offset?: number, limit?: number) => Promise<unknown>;
  /** 斜杠命令与 read_skill 使用的库内技能注册表；未提供时只开放本地命令。 */
  skills?: SkillRuntime;
  /** 手动压缩会话上下文；未提供时 /compact 报错。 */
  compact?: (chatId: string, instructions?: string) => Promise<{ tokensBefore: number; estimatedTokensAfter?: number }>;
  client: AssistantClient;
}

/**
 * 选中文献与阅读位置的请求载荷。
 * 命令与普通消息共用同一套校验：`paperIds` 缺省表示保留会话原值，空数组表示清空。
 */
export interface PaperContext {
  paperIds?: string[];
  /** 阅读器当前打开的文献编号；只用于标注“这篇”，不扩大或缩小可选范围。 */
  activePaperId?: string;
  /** 阅读器当前物理页；缺省表示尚未打开具体页。 */
  pdfPage?: number;
}

const MAX_CONTEXT_PAPERS = 6;
export const PAPER_ID = /^L\d+$/;

/**
 * 校验前端传来的上下文。
 * 非法编号与非正整数的页序按缺失处理，超出上限的编号截断；不抛错，避免脏字段挡住整个回合。
 */
export function normalizePaperContext(input: unknown): PaperContext {
  const fields = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const ids = Array.isArray(fields.paperIds)
    ? fields.paperIds.filter((id): id is string => typeof id === 'string' && PAPER_ID.test(id))
      .slice(0, MAX_CONTEXT_PAPERS)
    : undefined;
  const active = typeof fields.activePaperId === 'string' && PAPER_ID.test(fields.activePaperId)
    ? fields.activePaperId
    : undefined;
  const page = typeof fields.pdfPage === 'number' && Number.isSafeInteger(fields.pdfPage) && fields.pdfPage > 0
    ? fields.pdfPage
    : undefined;
  return {
    ...(ids ? { paperIds: ids } : {}),
    ...(active ? { activePaperId: active } : {}),
    ...(page ? { pdfPage: page } : {}),
  };
}

/**
 * 把显式提供的 paperIds 写回会话记录。
 * 只有请求带 paperIds 时才覆盖，返回是否发生改动，调用方据此决定是否落盘；阅读位置属于单轮状态，不写进 chats.json。
 */
export function applyPaperContext(chat: Chat, context: PaperContext): boolean {
  if (!context.paperIds || context.paperIds.join(' ') === chat.paperIds.join(' ')) return false;
  chat.paperIds = context.paperIds;
  return true;
}
