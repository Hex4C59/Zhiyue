import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Store } from './store.js';
import { redact } from './store.js';
import { errorMessage, httpStatus, statusError } from './errors.js';
import type {
  Chat, ChatClassifyProposal, ChatEvent, ChatFolderAction, ChatMessage, ChatNoteDraft, ChatServiceOptions, LibraryPaper,
} from './chatTypes.js';

export interface ChatDraftHost {
  readonly root: string;
  readonly library: ChatServiceOptions['library'];
  readonly store: Store<{ chats: Chat[] }>;
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
  host.store.save();
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
  host.store.save();
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
  owner.noteDrafts = owner.noteDrafts.filter((d) => d.id !== id);
  host.store.save();
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
    chat.folderActions = [...pending, ...added];
    host.store.save();
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
    chat.folderActions = chat.folderActions!.filter((current) => !resolved.has(current.id));
    host.store.save();
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
        host.store.save();
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

interface ClassifyTarget {
  /** 清理后的顶层分类名；命中已有分类时为真实目录名。 */
  category: string;
  subcategory: string;
  path: string;
  willCreateCategory: boolean;
  willCreateSubcategory: boolean;
}

// 与 Library._categoryName 保持同一套命名规则：去编号、去尾随点与空格、拒绝保留名和非法字符。
const cleanFolderName = (value: unknown): string => {
  if (typeof value !== 'string') throw statusError('分类名称无效。', 400);
  const name = value.trim().replace(/^\d+_/, '').trim().replace(/[. ]+$/, '');
  if (!name) throw statusError('请输入分类名称。', 400);
  if (name.length > 60) throw statusError('分类名称不能超过 60 个字符。', 400);
  if (name.startsWith('.') || /[\\/:*?"<>|\x00-\x1f]/.test(name)) {
    throw statusError(`分类「${name}」包含不允许的字符。`, 400);
  }
  if (reservedName.test(name)) throw statusError(`「${name}」不能用作文件夹名。`, 400);
  return name;
};

const BASIS = new Set(['notes', 'translation', 'notes+translation', 'pdf']);
const displayName = (id: string): string => id.replace(/^\d+_/, '');
const folderKey = (value: string): string => displayName(value).toLocaleLowerCase();

interface CategoryNode {
  id: string;
  children: Array<{ id: string }>;
}

/** 在真实分类树里按目录名或显示名匹配，大小写不敏感。 */
function matchCategory(
  categories: CategoryNode[], value: string,
): { category: string; children: string[] } | undefined {
  const name = value.replace(/^papers\//i, '').split('/')[0] ?? '';
  const key = folderKey(name);
  const top = categories.find((item) => item.id.toLocaleLowerCase() === name.toLocaleLowerCase() ||
    folderKey(item.id) === key);
  if (!top) return undefined;
  return {
    category: top.id,
    children: top.children.map((child) => child.id.split('/').pop() as string),
  };
}

const matchChild = (children: string[], value: string): string | undefined => children.find((child) =>
  child.toLocaleLowerCase() === value.toLocaleLowerCase() || folderKey(child) === folderKey(value));

/**
 * 把模型给出的分类与子分类解析成真实目录，或保留为待新建的名称。
 * 只匹配不创建：确认卡片先展示目标，用户点击后才由 resolveClassifyProposals 建目录。
 */
async function resolveClassifyTarget(
  host: ChatDraftHost, categoryValue: unknown, subcategoryValue: unknown,
): Promise<ClassifyTarget> {
  const wanted = cleanFolderName(categoryValue);
  const child = subcategoryValue === undefined || subcategoryValue === null || subcategoryValue === ''
    ? '' : cleanFolderName(subcategoryValue);
  const { categories } = await host.library.getLibrary();
  const top = matchCategory(categories as unknown as CategoryNode[], wanted);
  if (!top) {
    return {
      category: wanted, subcategory: child,
      path: `papers/${[wanted, child].filter(Boolean).join('/')}`,
      willCreateCategory: true, willCreateSubcategory: !!child,
    };
  }
  if (!child) {
    return {
      category: top.category, subcategory: '', path: `papers/${top.category}`,
      willCreateCategory: false, willCreateSubcategory: false,
    };
  }
  const real = matchChild(top.children, child);
  return real
    ? {
      category: top.category, subcategory: real, path: `papers/${top.category}/${real}`,
      willCreateCategory: false, willCreateSubcategory: false,
    }
    : {
      category: top.category, subcategory: child, path: `papers/${top.category}/${child}`,
      willCreateCategory: false, willCreateSubcategory: true,
    };
}

const paperFolder = (paper: LibraryPaper): string =>
  `papers/${[paper.category, paper.subcategory].filter(Boolean).join('/')}`;

/**
 * 为论文生成归类提案卡片。同一会话内同一文献的未处理提案直接替换，避免堆叠重复行。
 * 本函数不创建目录、不移动文件；确认与执行在 resolveClassifyProposals。
 */
export async function proposePaperClassifications(
  host: ChatDraftHost, chat: Chat, values: unknown,
): Promise<Record<string, unknown>> {
  if (!Array.isArray(values) || !values.length || values.length > 50) {
    throw statusError('请指定 1 至 50 篇要归类的论文。');
  }
  const entries: Array<{ paper: LibraryPaper; target: ClassifyTarget; basis: string; reason: string }> = [];
  const seen = new Set<string>();
  for (const value of values) {
    const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const id = typeof item.paperId === 'string' ? item.paperId.trim().toUpperCase() : '';
    if (!/^L\d+$/.test(id)) throw statusError('文献编号无效。');
    if (seen.has(id)) throw statusError(`${id} 在本次提案中重复出现。`);
    seen.add(id);
    const paper = await host.library.getPaper(id);
    if (!paper) throw statusError(`文献不存在：${id}`, 404);
    const basis = typeof item.basis === 'string' ? item.basis : '';
    if (!BASIS.has(basis)) throw statusError('请说明归类依据：笔记、中文翻译、两者或原文。');
    if (typeof item.reason !== 'string') throw statusError('请给出归类理由。');
    const reason = item.reason.replace(/\s+/g, ' ').trim();
    if (!reason || reason.length > 300) throw statusError('归类理由须为 1 至 300 个字符。');
    entries.push({ paper, target: await resolveClassifyTarget(host, item.category, item.subcategory), basis, reason });
  }
  const pending = chat.classifyProposals ?? [];
  const replaced = new Set(entries.map(({ paper }) => paper.id));
  const kept = pending.filter((item) => !replaced.has(item.paperId));
  const next: ChatClassifyProposal[] = entries.map(({ paper, target, basis, reason }) => ({
    id: randomUUID(), paperId: paper.id,
    title: paper.titleZh || (typeof paper.title === 'string' ? paper.title : '') || paper.id,
    fromPath: paperFolder(paper), targetCategory: target.category,
    ...(target.subcategory ? { targetSubcategory: target.subcategory } : {}),
    targetPath: target.path, willCreateCategory: target.willCreateCategory,
    willCreateSubcategory: target.willCreateSubcategory, basis: basis as ChatClassifyProposal['basis'],
    reason, createdAt: new Date().toISOString(),
  }));
  if (kept.length + next.length > 50) throw statusError('请先处理已有的待确认归类。', 409);
  chat.classifyProposals = [...kept, ...next];
  host.store.save();
  for (const proposal of next) host.emit({ type: 'classifyProposal', chatId: chat.id, proposal });
  return {
    status: 'pending_confirmation',
    items: next.map(({ id, paperId, fromPath, targetPath, willCreateCategory, willCreateSubcategory }) => ({
      proposalId: id, paperId, fromPath, targetPath, willCreateCategory, willCreateSubcategory,
    })),
    message: '等待用户在界面确认。确认前没有新建文件夹，也没有移动论文。',
  };
}

export interface ClassifyResolution {
  applied: string[];
  discarded: string[];
  failed: Array<{ id: string; paperId: string; error: string }>;
  remaining: string[];
  message?: ChatMessage;
}

/**
 * 按点击时提交的 ID 快照执行归类：先补齐缺失目录（同一目标只建一次），再逐篇调用 movePaper。
 * 逐篇执行让每张卡片都有自己的成功或失败状态；失败的提案留在会话里并写回 error。
 */
export async function resolveClassifyProposals(
  host: ChatDraftHost, chatId: string, action: unknown, ids: unknown,
): Promise<ClassifyResolution> {
  if (action !== 'apply' && action !== 'discard') throw statusError('请指定确认或取消。');
  if (!Array.isArray(ids) || !ids.length ||
    !ids.every((id) => typeof id === 'string' && /^[\w-]{1,100}$/.test(id))) {
    throw statusError('请选择待确认的归类。');
  }
  const chat = host.writableChat(chatId);
  if (host.resolvingClassifications.has(chatId)) throw statusError('归类移动正在处理，请稍候。', 409);
  const byId = new Map((chat.classifyProposals ?? []).map((item) => [item.id, item]));
  const items = [...new Set<string>(ids)].map((id) => {
    const item = byId.get(id);
    if (!item) throw statusError('待确认的归类操作不存在或已处理。', 404);
    return item;
  });
  const result: ClassifyResolution = { applied: [], discarded: [], failed: [], remaining: [] };
  const created: string[] = [];
  const moved = new Map<string, string>();
  const recordResult = (): void => {
    const lines = ['归类操作结果（用户已在界面处理）：'];
    for (const folder of created) lines.push(`已新建文件夹：\`${folder}\`。`);
    for (const [paperId, folder] of moved) lines.push(`${paperId} 已归类至 \`${folder}\`。`);
    for (const { paperId, error } of result.failed) lines.push(`${paperId} 归类未完成：${error}`);
    if (result.discarded.length) {
      lines.push(`已取消 ${items.map(({ paperId }) => paperId).join('、')} 的归类请求，本次未新建文件夹或移动论文。`);
    }
    const message: ChatMessage = {
      id: randomUUID(), role: 'system', text: lines.join('\n\n'),
      status: 'completed', createdAt: new Date().toISOString(),
    };
    chat.messages.push(message);
    result.message = message;
    host.store.save();
    host.emit({ type: 'message', chatId, message });
  };
  const remove = (selected: ChatClassifyProposal[], applied: boolean): void => {
    const resolved = new Set(selected.map(({ id }) => id));
    chat.classifyProposals = chat.classifyProposals!.filter((current) => !resolved.has(current.id));
    host.store.save();
    for (const { id } of selected) host.emit({ type: 'classifyProposalResolved', id, chatId, applied });
  };
  // 同一顶层分类或子文件夹在本轮只创建一次，并发 409 时重新解析后复用。
  const tops = new Map<string, string>();
  const folders = new Map<string, string>();
  const currentCategories = async (): Promise<CategoryNode[]> => {
    host.library.refresh();
    const { categories } = await host.library.getLibrary();
    return categories as unknown as CategoryNode[];
  };
  const ensureTop = async (value: string): Promise<string> => {
    const key = folderKey(value);
    const known = tops.get(key);
    if (known) return known;
    let categories = await currentCategories();
    const matched = matchCategory(categories, value);
    if (matched) {
      tops.set(key, matched.category);
      return matched.category;
    }
    let folder: string;
    try {
      folder = (await host.library.createCategory(cleanFolderName(value))).category;
      created.push(`papers/${folder}`);
    } catch (error) {
      if (httpStatus(error, 400) !== 409) throw error;
      categories = await currentCategories();
      const concurrent = matchCategory(categories, value);
      if (!concurrent) throw error;
      folder = concurrent.category;
    }
    tops.set(key, folder);
    return folder;
  };
  const ensureChild = async (top: string, value: string): Promise<string> => {
    const key = `${top}/${folderKey(value)}`;
    const known = folders.get(key);
    if (known) return known;
    let categories = await currentCategories();
    const matched = matchChild(matchCategory(categories, top)?.children ?? [], value);
    if (matched) {
      folders.set(key, matched);
      return matched;
    }
    let folder: string;
    try {
      folder = (await host.library.createCategory(cleanFolderName(value), top)).subcategory;
      created.push(`papers/${top}/${folder}`);
    } catch (error) {
      if (httpStatus(error, 400) !== 409) throw error;
      categories = await currentCategories();
      const concurrent = matchChild(matchCategory(categories, top)?.children ?? [], value);
      if (!concurrent) throw error;
      folder = concurrent;
    }
    folders.set(key, folder);
    return folder;
  };
  host.resolvingClassifications.add(chatId);
  try {
    if (action === 'discard') {
      remove(items, false);
      result.discarded = items.map(({ id }) => id);
      recordResult();
      return result;
    }
    for (const item of items) {
      try {
        const top = await ensureTop(item.targetCategory);
        const child = item.targetSubcategory ? await ensureChild(top, item.targetSubcategory) : '';
        const target = `papers/${[top, child].filter(Boolean).join('/')}`;
        await host.library.movePaper(item.paperId, target);
        moved.set(item.paperId, target);
        result.applied.push(item.id);
        remove([item], true);
      } catch (error) {
        const uncertain = httpStatus(error, 500) >= 500;
        const detail = redact(errorMessage(error));
        item.error = uncertain ? `请核实移动结果。${detail}` : detail;
        result.failed.push({ id: item.id, paperId: item.paperId, error: item.error });
        host.store.save();
        host.emit({ type: 'classifyProposal', chatId, proposal: item });
      }
    }
    result.remaining = (chat.classifyProposals ?? []).map(({ id }) => id);
    recordResult();
    return result;
  } finally {
    host.resolvingClassifications.delete(chatId);
    if (result.applied.length || result.discarded.length || result.failed.length) host.emit({ type: 'library' });
  }
}
