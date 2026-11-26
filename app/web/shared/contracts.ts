/** 前后端共享的斜杠命令、界面状态、会话与文字层契约类型。 */

export type CommandSource = 'local' | 'skill';
export type CommandScope = 'composer' | 'chat';
export type CommandTarget = 'workspace' | 'terminal';

export interface CommandInfo {
  name: string;
  description: string;
  source: CommandSource;
  /** 需要已有会话才能执行的命令标为 chat。 */
  scope: CommandScope;
  argumentHint?: string;
  target?: CommandTarget;
}

/** 文献库里的界面状态；跨启动保留，不随本地服务端口变化而失效。 */
export interface UiState {
  chatId: string | null;
  paperId: string | null;
  panelWidths: Record<string, number>;
}

export type ChatRole = 'user' | 'assistant' | 'tool' | 'system';
export type ChatStatus = 'streaming' | 'completed' | 'interrupted' | 'failed' | 'error' | 'cancelled';
export type ChatDraftTarget = 'notes' | 'synthesis' | 'outputs';
export type ChatHistoryState = 'active' | 'archived' | 'trashed';

export interface ChatAttachmentRef {
  id: string;
  name: string;
  mime: string;
  size: number;
}

/** 助手发起的分类删除：用户在聊天卡片上确认后才执行，服务端持久化。 */
export interface ChatFolderAction {
  id: string;
  kind: 'delete';
  category: string;
  subcategory?: string;
  path: string;
  papers: number;
  createdAt: string;
  error?: string;
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

export interface TextLine {
  words: TextWord[];
}

export interface TextLayer {
  width: number;
  height: number;
  hasText: boolean;
  text: string;
  error?: string;
  lines: TextLine[];
}
