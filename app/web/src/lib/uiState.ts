import fs from 'node:fs';
import { Store } from './store.js';
import { statusError } from './errors.js';

/** 需要跨启动保留的界面状态；比浏览器存储更可靠，因为本地服务每次启动会换端口。 */
export interface UiState {
  chatId: string | null;
  paperId: string | null;
  panelWidths: Record<string, number>;
}

const empty: UiState = { chatId: null, paperId: null, panelWidths: {} };
const CHAT_ID = /^[A-Za-z0-9-]{1,64}$/;
const PAPER_ID = /^L\d+$/;
const PANEL_KEYS = new Set(['sidebar', 'papers', 'assistant']);
const PANEL_MIN = 100;
const PANEL_MAX = 2000;

const copy = (value: UiState): UiState => ({
  chatId: value.chatId,
  paperId: value.paperId,
  panelWidths: { ...value.panelWidths },
});

/**
 * 界面状态的落盘读写，文件为 `.zhiyue/data/ui.json`。
 * 校验放在写入侧：只有通过白名单的字段才会替换旧值，未知字段与越界数值一律报错。
 */
export class UiStateStore {
  readonly store: Store<UiState>;

  constructor(file: string) {
    this.store = new Store<UiState>(file, copy(empty));
  }

  read(): UiState {
    return copy(this.reload());
  }

  /**
   * 每次读写前重新读取磁盘。
   * 桌面只开一个窗口，但同一库可能被第二个实例（如重启过渡期）同时写入；
   * 以磁盘为准合并，避免最后写入的一方把对方的字段静默丢掉。
   * 文件缺失或损坏时保留内存值：界面状态不值得为了一个坏 JSON 报错。
   */
  private reload(): UiState {
    let raw: string;
    try {
      raw = fs.readFileSync(this.store.file, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return this.store.data;
      throw error;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return this.store.data;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return this.store.data;
    const fields = parsed as Record<string, unknown>;
    const next = copy(empty);
    next.chatId = typeof fields.chatId === 'string' && CHAT_ID.test(fields.chatId) ? fields.chatId : null;
    next.paperId = typeof fields.paperId === 'string' && PAPER_ID.test(fields.paperId) ? fields.paperId : null;
    if (fields.panelWidths && typeof fields.panelWidths === 'object' && !Array.isArray(fields.panelWidths)) {
      for (const [key, width] of Object.entries(fields.panelWidths as Record<string, unknown>)) {
        if (!PANEL_KEYS.has(key)) continue;
        if (typeof width !== 'number' || !Number.isSafeInteger(width)) continue;
        if (width < PANEL_MIN || width > PANEL_MAX) continue;
        next.panelWidths[key] = width;
      }
    }
    this.store.data = next;
    return next;
  }

  update(patch: unknown): UiState {
    const fields = patch && typeof patch === 'object' && !Array.isArray(patch)
      ? patch as Record<string, unknown>
      : null;
    if (!fields || !Object.keys(fields).length) throw statusError('界面状态字段无效。', 400);
    // 先校验再合并：任一字段非法则整次拒绝，磁盘上的旧值不受影响。
    const validated: Partial<UiState> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (key === 'chatId') {
        if (value !== null && !(typeof value === 'string' && CHAT_ID.test(value))) {
          throw statusError('会话编号无效。', 400);
        }
        validated.chatId = value as string | null;
      } else if (key === 'paperId') {
        if (value !== null && !(typeof value === 'string' && PAPER_ID.test(value))) {
          throw statusError('文献编号无效。', 400);
        }
        validated.paperId = value as string | null;
      } else if (key === 'panelWidths') {
        validated.panelWidths = this.widths(value);
      } else {
        throw statusError('界面状态字段无效。', 400);
      }
    }
    const next = copy(this.reload());
    if (validated.chatId !== undefined) next.chatId = validated.chatId;
    if (validated.paperId !== undefined) next.paperId = validated.paperId;
    if (validated.panelWidths) next.panelWidths = { ...next.panelWidths, ...validated.panelWidths };
    this.store.data = next;
    this.store.save();
    return copy(next);
  }

  /** 只接受三个已知栏名与 100–2000 的整数，其余栏名按未知字段处理。 */
  private widths(value: unknown): Record<string, number> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw statusError('栏宽字段无效。', 400);
    const widths: Record<string, number> = {};
    for (const [key, width] of Object.entries(value as Record<string, unknown>)) {
      if (!PANEL_KEYS.has(key)) throw statusError('栏宽字段无效。', 400);
      if (typeof width !== 'number' || !Number.isSafeInteger(width) || width < PANEL_MIN || width > PANEL_MAX) {
        throw statusError('栏宽必须为 100 到 2000 之间的整数。', 400);
      }
      widths[key] = width;
    }
    return widths;
  }
}
