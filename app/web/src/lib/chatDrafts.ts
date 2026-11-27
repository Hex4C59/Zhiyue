import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ChatStore } from './chatStore.js';
import { redact } from './store.js';
import { errorMessage, httpStatus, statusError } from './errors.js';
import type {
  Chat, ChatEvent, ChatFolderAction, ChatMessage, ChatNoteDraft, ChatServiceOptions, LibraryPaper,
} from './chatTypes.js';

export interface ChatDraftHost {
  readonly root: string;
  readonly library: ChatServiceOptions['library'];
  readonly store: Pick<ChatStore, 'data' | 'save'>;
  readonly emit: (event: ChatEvent) => unknown;
  readonly resolvingFolders: Set<string>;
  readonly resolvingClassifications: Set<string>;
  get(id: string): Chat;
  writableChat(id: string): Chat;
}

// 草稿文件名去掉路径分隔符、通配符和控制字符，保留中文题名；L 编号前缀同时避开 Windows 保留名。
const noteRelative = (paperId: string, title: string): string => {
  const safe = String(title).replace(/[\\/:*?"<>|%#?\x00-\x1f]/g, '_').replace(/\s+/g, ' ').trim()
    .replace(/[. ]+$/, '').slice(0, 80) || '论文笔记';
  return `notes/${paperId}_${safe}.md`;
};

const reservedName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const documentRelative = (target: 'synthesis' | 'outputs', title: string): string => {
  const safe = String(title).replace(/[\\/:*?"<>|%#?\x00-\x1f]/g, '_').replace(/\s+/g, ' ').trim()
    .replace(/[. ]+$/, '').slice(0, 80) || '未命名文稿';
  return `${target}/${reservedName.test(safe) ? `_${safe}` : safe}.md`;
};

export function createNoteDraft(
  host: ChatDraftHost,
  chatId: string,
  { paper, title, content }: { paper: LibraryPaper; title: string; content: string },
): ChatNoteDraft {
  const chat = host.get(chatId);
  const clean = String(title).replace(/\s+/g, ' ').trim();
  const draft: ChatNoteDraft = {
    id: randomUUID(), paperId: paper.id, paperIds: [paper.id], target: 'notes',
    title: clean, content, source: paper.file,
    path: noteRelative(paper.id, clean), createdAt: new Date().toISOString(),
  };
  chat.noteDrafts.push(draft);
  try { host.store.save(chatId); }
  catch (error) {
    chat.noteDrafts.splice(chat.noteDrafts.indexOf(draft), 1);
    throw error;
  }
  host.emit({ type: 'noteDraft', chatId, draft });
  return draft;
}

export async function createDocumentDraft(
  host: ChatDraftHost,
  chatId: string,
  { target, title, content, paperIds }: {
    target: 'synthesis' | 'outputs'; title: string; content: string; paperIds?: string[];
  },
): Promise<ChatNoteDraft> {
  const chat = host.get(chatId);
  if (!['synthesis', 'outputs'].includes(target)) throw new Error('文稿目录只能是 synthesis 或 outputs。');
  const ids = [...new Set((paperIds ?? []).map(String))];
  if (ids.length > 20 || ids.some((id) => !/^L\d+$/.test(id))) throw new Error('文献编号无效，最多关联20篇。');
  const papers: LibraryPaper[] = [];
  for (const id of ids) {
    const paper = await host.library.getPaper(id);
    if (!paper) throw new Error(`文献不存在：${id}`);
    papers.push(paper);
  }
  const clean = String(title).replace(/\s+/g, ' ').trim();
  const draft: ChatNoteDraft = {
    id: randomUUID(), paperId: papers[0]?.id ?? '', paperIds: ids, target,
    title: clean, content, source: papers.map((paper) => paper.file).join('、'),
    path: documentRelative(target, clean), createdAt: new Date().toISOString(),
  };
  chat.noteDrafts.push(draft);
  try { host.store.save(chatId); }
  catch (error) {
    chat.noteDrafts.splice(chat.noteDrafts.indexOf(draft), 1);
    throw error;
  }
  host.emit({ type: 'noteDraft', chatId, draft });
  return draft;
}

export async function draftTarget(rootDir: string, relative: string): Promise<string> {
  const root = await fs.realpath(rootDir);
  const target = relative.split('/')[0] as string;
  if (!['notes', 'synthesis', 'outputs'].includes(target)) throw new Error('草稿目录不在文献工作区内，拒绝写入。');
  const directory = path.join(root, target);
  await fs.mkdir(directory, { recursive: true });
  const resolved = await fs.realpath(directory);
  const within = path.relative(root, resolved);
  if (within.startsWith('..') || path.isAbsolute(within)) throw new Error('草稿目录不在文献工作区内，拒绝写入。');
  return path.join(resolved, path.basename(relative));
}

export async function resolveNoteDraft(
  host: ChatDraftHost,
  id: string,
  action: unknown,
): Promise<{ saved: true; path: string | undefined } | { discarded: true }> {
  if (!['save', 'discard'].includes(action as string)) throw new Error('请指定保存或丢弃。');
  let owner: Chat | undefined;
  for (const chat of host.store.data.chats) {
    if ((chat.noteDrafts || []).some((d) => d.id === id)) { owner = chat; break; }
  }
  const draft = owner?.noteDrafts.find((d) => d.id === id);
  if (!owner || !draft) throw statusError('草稿不存在或已处理。', 404);
  host.writableChat(owner.id);
  let savedPath: string | undefined;
  if (action === 'save') {
    const target = draft.target ?? 'notes';
    const relative = draft.path || (target === 'notes'
      ? noteRelative(draft.paperId, draft.title)
      : documentRelative(target, draft.title));
    const base = await draftTarget(host.root, relative);
    const ext = path.extname(base);
    const stem = base.slice(0, -ext.length);
    const heading = String(draft.content).trimStart().startsWith('# ') ? '' : `# ${draft.title}\n\n`;
    const date = new Date().toISOString().slice(0, 10);
    let meta: string;
    if (target === 'notes') {
      const paper = await host.library.getPaper(draft.paperId);
      if (!paper) throw new Error('文献不存在，无法保存笔记。');
      meta = `> 文献编号：${draft.paperId}  \n> 原文：\`${paper.file}\`  \n> 整理日期：${date}  \n> 来源：Pi Agent 生成，经用户确认保存\n\n`;
    } else {
      const ids = draft.paperIds?.length ? draft.paperIds : (draft.paperId ? [draft.paperId] : []);
      const source = draft.source ? `  \n> 关联原文：\`${draft.source}\`` : '';
      meta = `> 文献编号：${ids.join('、') || '未关联'}${source}  \n> 整理日期：${date}  \n> 来源：Pi Agent 生成，经用户确认保存\n\n`;
    }
    const text = `${heading}${meta}${String(draft.content).trim()}\n`;
    let file = base;
    let index = 1;
    for (;;) {
      try {
        await fs.writeFile(file, text, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        if (++index > 99) throw statusError('同名草稿过多，请更换标题。', 409);
        file = `${stem} (${index})${ext}`;
      }
    }
    await host.library.refresh();
    savedPath = `${target}/${path.basename(file)}`;
  }
  const previousDrafts = owner.noteDrafts;
  owner.noteDrafts = previousDrafts.filter((d) => d.id !== id);
  try { host.store.save(owner.id); }
  catch (error) { owner.noteDrafts = previousDrafts; throw error; }
  host.emit({ type: 'noteDraftResolved', id, chatId: owner.id, path: savedPath });
  return action === 'save' ? { saved: true, path: savedPath } : { discarded: true };
}

export async function proposeFolderDeletes(
  host: ChatDraftHost,
  chat: Chat,
  values: unknown,
): Promise<Record<string, unknown>> {
  if (!Array.isArray(values) || !values.length || values.length > 50) {
    throw statusError('请指定 1 至 50 个要删除的文件夹。');
  }
  const targets = new Map<string, Awaited<ReturnType<ChatServiceOptions['library']['resolveCategory']>>>();
  for (const value of values) {
    const target = await host.library.resolveCategory(value);
    targets.set(target.path, target);
  }
  const { categories } = await host.library.getLibrary();
  const pending = chat.folderActions ?? [];
  const byPath = new Map(pending.map((item) => [item.path, item]));
  const added: ChatFolderAction[] = [];
  const proposed = [...targets.values()].map((target) => {
    const existing = byPath.get(target.path);
    if (existing) return existing;
    const top = categories.find((category) => category.id === target.category);
    const node = target.subcategory
      ? top?.children.find((child) => child.id === `${target.category}/${target.subcategory}`) : top;
    const item: ChatFolderAction = {
      id: randomUUID(), kind: 'delete', ...target, papers: node?.count ?? 0,
      createdAt: new Date().toISOString(),
    };
    added.push(item);
    return item;
  });
  if (added.length) {
    if (pending.length + added.length > 50) throw statusError('请先处理已有的待确认文件夹。', 409);
    const previous = chat.folderActions;
    chat.folderActions = [...pending, ...added];
    try { host.store.save(chat.id); }
    catch (error) { chat.folderActions = previous; throw error; }
    for (const item of added) host.emit({ type: 'folderAction', chatId: chat.id, action: item });
  }
  return {
    status: 'pending_confirmation',
    items: proposed.map(({ id, path: folderPath, papers }) => ({ actionId: id, path: folderPath, papers })),
    message: '等待用户在界面确认。',
  };
}

export interface FolderActionResolution {
  applied: string[];
  discarded: string[];
  failed: Array<{ id: string; path: string; error: string }>;
  remaining: string[];
}

/** 按点击时提交的 ID 快照处理。子目录先执行，失败项留在当前会话。 */
export async function resolveFolderActions(
  host: ChatDraftHost,
  chatId: string,
  action: unknown,
  ids: unknown,
): Promise<FolderActionResolution> {
  if (action !== 'apply' && action !== 'discard') throw statusError('请指定确认或取消。');
  if (!Array.isArray(ids) || !ids.length ||
    !ids.every((id) => typeof id === 'string' && /^[\w-]{1,100}$/.test(id))) {
    throw statusError('请选择待确认的文件夹。');
  }
  const chat = host.writableChat(chatId);
  if (host.resolvingFolders.has(chatId)) throw statusError('文件夹删除正在处理，请稍候。', 409);
  const byId = new Map((chat.folderActions ?? []).map((item) => [item.id, item]));
  const items = [...new Set<string>(ids)].map((id) => {
    const item = byId.get(id);
    if (!item) throw statusError('待确认的文件夹操作不存在或已处理。', 404);
    return item;
  });
  items.sort((a, b) => Number(Boolean(b.subcategory)) - Number(Boolean(a.subcategory)));
  const result: FolderActionResolution = { applied: [], discarded: [], failed: [], remaining: [] };
  const remove = (selected: ChatFolderAction[], applied: boolean): void => {
    const resolved = new Set(selected.map(({ id }) => id));
    const previous = chat.folderActions;
    chat.folderActions = previous!.filter((current) => !resolved.has(current.id));
    try { host.store.save(chatId); }
    catch (error) { chat.folderActions = previous; throw error; }
    for (const { id } of selected) host.emit({ type: 'folderActionResolved', id, chatId, applied });
  };
  const grouped = new Map<string, ChatFolderAction[]>();
  for (const item of items) {
    const selected = grouped.get(item.path);
    if (selected) selected.push(item);
    else grouped.set(item.path, [item]);
  }
  const groups = [...grouped.values()];
  host.resolvingFolders.add(chatId);
  try {
    if (action === 'discard') {
      remove(items, false);
      result.discarded = items.map(({ id }) => id);
      return result;
    }
    for (const [index, selected] of groups.entries()) {
      const item = selected[0]!;
      try {
        await host.library.deleteCategory(item.category, item.subcategory ?? '');
      } catch (error) {
        const uncertain = httpStatus(error, 500) >= 500;
        const detail = redact(errorMessage(error));
        for (const pending of selected) {
          pending.error = uncertain ? `请核实文件夹状态。${detail}` : detail;
          result.failed.push({ id: pending.id, path: pending.path, error: pending.error });
        }
        host.store.save(chatId);
        for (const pending of selected) host.emit({ type: 'folderAction', chatId, action: pending });
        if (uncertain) {
          result.remaining = groups.slice(index + 1).flat().map(({ id }) => id);
          break;
        }
        continue;
      }
      result.applied.push(...selected.map(({ id }) => id));
      remove(selected, true);
    }
    return result;
  } finally {
    host.resolvingFolders.delete(chatId);
    if (result.applied.length || result.remaining.length || result.failed.length) host.emit({ type: 'library' });
  }
}
