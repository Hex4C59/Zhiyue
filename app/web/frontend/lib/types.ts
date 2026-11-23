import type { ReadStatus } from './content';

export interface NoteRef {
  path: string;
  title?: string;
}

export interface Paper extends Record<string, unknown> {
  literature_id: string;
  title?: string;
  titleZh?: string;
  authors?: string[] | Array<string | { name?: string }> | string;
  year?: number | string;
  file?: string;
  category?: string;
  subcategory?: string;
  notes?: NoteRef[];
  readStatus?: ReadStatus;
  starred?: boolean;
  pages?: number;
}

export interface Category {
  id?: string;
  name?: string;
  count?: number;
  children?: Category[];
}

export interface ChatMessage {
  id: string;
  role: string;
  text: string;
  thinking?: string;
  status: string;
  createdAt?: string;
  attachments?: Array<{ id: string; name?: string; mime?: string }>;
  attachmentIds?: string[];
  error?: unknown;
}

export type ChatDraftTarget = 'notes' | 'synthesis' | 'outputs';

export interface ChatNoteDraft {
  id: string;
  paperId: string;
  paperIds?: string[];
  target?: ChatDraftTarget;
  title: string;
  path: string;
  content: string;
}

export type ChatHistoryState = 'active' | 'archived' | 'trashed';

export interface Chat {
  id: string;
  title?: string;
  createdAt?: string;
  messages?: ChatMessage[];
  noteDrafts?: ChatNoteDraft[];
  threadId?: string | null;
  paperIds?: string[];
  historyState?: ChatHistoryState;
}

export interface AttachmentItem {
  key: string;
  id?: string;
  name: string;
  mime?: string;
  size?: number;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
  file?: File;
  path?: string;
}

export interface ApprovalRecord {
  id: string;
  chatId?: string;
  method: string;
  params: Record<string, unknown>;
  submitting?: boolean;
}

export interface JobRecord {
  id: string;
  status: string;
  title?: string;
  batch?: string | null;
  message?: string;
  action?: string;
  log?: unknown;
  error?: string;
  steps?: Array<{ action?: string; status?: string }>;
  result?: { counts?: Record<string, number>; [key: string]: unknown };
  [key: string]: unknown;
}

export interface BatchRecord {
  batch: string;
  entries: number;
  counts: Record<string, number>;
  scope_note?: string;
}

export interface PiAgentStatus {
  available?: boolean;
  authenticated?: boolean;
  error?: string | null;
  loading?: boolean;
  models?: Array<string | { id?: string; model?: string; name?: string; displayName?: string; display_name?: string; isDefault?: boolean }>;
}

export interface StatusInfo {
  agents?: { pi?: PiAgentStatus };
  models?: unknown;
  python?: string;
  node?: string;
  root?: string;
  [key: string]: unknown;
}

export interface ToastItem {
  id: number;
  message: string;
  error: boolean;
}

export interface TextWord {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
}

export interface TextLayerData {
  width: number;
  height: number;
  hasText: boolean;
  text: string;
  error?: string;
  lines: Array<{ words: TextWord[] }>;
}

export interface PDFPageData {
  img: HTMLImageElement;
  url: string;
  total: number;
  scale: number;
  textLayer?: TextLayerData;
}

export interface PDFSession {
  paper: Paper;
  epoch: number;
  root: HTMLElement;
  disposed: boolean;
  pages: Map<number, HTMLElement>;
  images: Map<number, { url: string; scale: number }>;
  failedUpgrades: Map<number, number>;
  controllers: Map<number, AbortController>;
  errors: Set<number>;
  textLayers: Map<number, { data: TextLayerData; element: HTMLElement | null }>;
  queue: number[];
  running: number;
  frame: number | null;
  manualPage: { page: number; scrollTop: number } | null;
  anchor?: { page: number; offset: number };
  observer?: IntersectionObserver;
  resizeObserver?: ResizeObserver;
  disposeSelection?: () => void;
  disposePixelRatioWatch?: () => void;
  onScroll?: () => void;
  onCopy?: (event: ClipboardEvent) => void;
  onUserScroll?: (event: Event) => void;
  onZoomWheel?: (event: WheelEvent) => void;
  zoomDelta: number;
}

export interface CommandInfo {
  name: string;
  description: string;
  source: 'local' | 'skill';
  scope: 'composer' | 'chat';
  argumentHint?: string;
  target?: 'workspace' | 'terminal';
}

export interface ModelOption {
  id: string;
  label: string;
  isDefault?: boolean;
}

/** 文献库里的界面状态；跨启动保留，不随本地服务端口变化而失效。 */
export interface UiState {
  chatId: string | null;
  paperId: string | null;
  panelWidths?: Record<string, number>;
}

export interface WorkspaceState {
  papers: Paper[];
  categories: Category[];
  stats: Record<string, number>;
  current: string | null;
  category: string;
  subcategory: string;
  starred: boolean;
  query: string;
  year: string;
  read: string;
  sort: string;
  libraryError: string;
  downloadsError: string;
  readerMode: 'pdf' | 'note';
  notePath: string;
  noteDeleting: boolean;
  chat: Chat | null;
  chats: Chat[];
  context: Set<string>;
  attachments: AttachmentItem[];
  approvals: Map<string, ApprovalRecord>;
  resolvedApprovals: Set<string>;
  status: StatusInfo;
  statusError: string;
  eventsOpen: boolean;
  model: string;
  draft: string;
  focusComposer: number;
  historyOpen: boolean;
  agentSettingsOpen: boolean;
  focusModelPicker: number;
  jobs: Map<string, JobRecord>;
  batches: BatchRecord[];
  sending: boolean;
  noteSaving: string;
  creating: boolean;
  chatEpoch: number;
  noteEpoch: number;
  view: 'library' | 'downloads';
  panel: 'list' | 'reader' | 'chat';
  pdfPage: number;
  pdfTotal: number | null;
  pdfZoom: number;
  pdfBrowser: boolean;
  pdfSession: PDFSession | null;
  previewLoading: boolean;
  toasts: ToastItem[];
  pendingPatches: Set<string>;
  refreshing: boolean;
  importing: boolean;
  importOpen: boolean;
  /** 打开导入对话框时的预选归档目录；空字符串表示使用默认目录。 */
  importCategory: string;
  /** 斜杠命令目录，来自 /api/commands；只影响输入框提示，不阻塞发送。 */
  commands: CommandInfo[];
  desktopCommands: boolean;
  commandError: string;
  /** 服务端 ui.json 里的会话与当前文献；栏宽另存于 panelWidths。 */
  ui: { chatId: string | null; paperId: string | null };
  panelWidths: Record<string, number>;
  /** 用户已手动调整栏宽或会话，晚到的服务端旧值不再覆盖本地。 */
  uiDirty: boolean;
  uiError: string;
}

export interface WorkspaceEvent {
  type?: string;
  [key: string]: unknown;
}
