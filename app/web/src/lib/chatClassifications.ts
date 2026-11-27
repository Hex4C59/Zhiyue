import { randomUUID } from 'node:crypto';
import { activeClassifyRun } from '../../shared/contracts.js';
import type { ChatClassifyRun, ClassifyRunItem } from '../../shared/contracts.js';
import type { Chat, ChatClassifyProposal, ChatMessage, ChatServiceOptions, LibraryPaper } from './chatTypes.js';
import type { ChatDraftHost } from './chatDrafts.js';
import type { ClassificationMovePreparation, JobRecord, PaperMoveItem } from './jobs.js';
import { errorMessage, httpStatus, statusError } from './errors.js';
import { redact } from './store.js';

export interface ClassificationHost extends ChatDraftHost { jobs: ChatServiceOptions['jobs'] }
export interface ClassifyResolution {
  applied: string[];
  discarded: string[];
  failed: Array<{ id: string; paperId: string; error: string }>;
  remaining: string[];
  message?: ChatMessage;
}
export interface ClassifySubmission { run: ChatClassifyRun; job: JobRecord | null; replayed: boolean }
interface CategoryNode { id: string; children: Array<{ id: string }> }
const reservedName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const folderKey = (value: string): string => value.replace(/^\d+_/, '').toLocaleLowerCase();
const basis = new Set(['notes', 'translation', 'notes+translation', 'pdf']);
const stamp = (): string => new Date().toISOString();

function cleanName(value: unknown): string {
  if (typeof value !== 'string') throw statusError('分类名称无效。');
  const name = value.trim().replace(/^\d+_/, '').trim().replace(/[. ]+$/, '');
  if (!name || name.length > 60) throw statusError('分类名称须为 1 至 60 个字符。');
  if (name.startsWith('.') || /[\\/:*?"<>|\x00-\x1f]/.test(name) || reservedName.test(name)) {
    throw statusError(`分类「${name}」包含不允许的字符。`);
  }
  return name;
}
const matchTop = (nodes: CategoryNode[], name: string): CategoryNode | undefined =>
  nodes.find(({ id }) => id.toLocaleLowerCase() === name.toLocaleLowerCase() || folderKey(id) === folderKey(name));
const matchChild = (top: CategoryNode, name: string): string | undefined =>
  top.children.map(({ id }) => id.split('/').pop()!).find((id) =>
    id.toLocaleLowerCase() === name.toLocaleLowerCase() || folderKey(id) === folderKey(name));

export function classificationBusy(
  host: Pick<ClassificationHost, 'resolvingClassifications'>, chat: Pick<Chat, 'id' | 'classifyRuns'>,
): boolean {
  return host.resolvingClassifications.has(chat.id) || (chat.classifyRuns ?? []).some(activeClassifyRun);
}

function publish(host: ClassificationHost, chat: Chat, run: ChatClassifyRun): void {
  run.revision = chat.classifyRevision = (chat.classifyRevision ?? 0) + 1;
  run.updatedAt = stamp();
  host.store.save(chat.id);
  host.emit({ type: 'classifyRun', chatId: chat.id, run: structuredClone(run), revision: chat.classifyRevision,
    proposals: structuredClone(chat.classifyProposals ?? []) });
}

/** 只解析并保存提案；新目录和文件移动均在用户确认后的后台任务里执行。 */
export async function proposePaperClassifications(
  host: ClassificationHost, chat: Chat, values: unknown,
): Promise<Record<string, unknown>> {
  if (classificationBusy(host, chat)) throw statusError('归类移动正在处理，请稍候。', 409);
  if (!Array.isArray(values) || !values.length || values.length > 50) {
    throw statusError('请指定 1 至 50 篇要归类的论文。');
  }
  const nodes = (await host.library.getLibrary()).categories;
  const next: ChatClassifyProposal[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const id = typeof input.paperId === 'string' ? input.paperId.trim().toUpperCase() : '';
    if (!/^L\d+$/.test(id) || seen.has(id)) throw statusError('文献编号无效或在本次提案中重复。');
    seen.add(id);
    const paper: LibraryPaper | null = await host.library.getPaper(id);
    if (!paper) throw statusError(`文献不存在：${id}`, 404);
    if (typeof input.basis !== 'string' || !basis.has(input.basis)) throw statusError('请说明有效的归类依据。');
    const reason = typeof input.reason === 'string' ? input.reason.replace(/\s+/g, ' ').trim() : '';
    if (!reason || reason.length > 300) throw statusError('归类理由须为 1 至 300 个字符。');
    const wanted = cleanName(input.category);
    const child = input.subcategory === undefined || input.subcategory === null || input.subcategory === ''
      ? '' : cleanName(input.subcategory);
    const top = matchTop(nodes, wanted);
    const realChild = child && top ? matchChild(top, child) : undefined;
    const category = top?.id ?? wanted;
    const subcategory = realChild ?? child;
    next.push({
      id: randomUUID(), paperId: id,
      title: paper.titleZh || (typeof paper.title === 'string' ? paper.title : '') || id,
      fromPath: `papers/${[paper.category, paper.subcategory].filter(Boolean).join('/')}`,
      targetCategory: category, ...(subcategory ? { targetSubcategory: subcategory } : {}),
      targetPath: `papers/${[category, subcategory].filter(Boolean).join('/')}`,
      willCreateCategory: !top, willCreateSubcategory: !!child && !realChild,
      basis: input.basis as ChatClassifyProposal['basis'], reason, createdAt: stamp(),
    });
  }
  // 解析过程中可能已受理另一页的确认；写回前再次核对，不能替换运行快照对应的提案。
  if (classificationBusy(host, chat)) throw statusError('归类移动正在处理，请稍候。', 409);
  const kept = (chat.classifyProposals ?? []).filter(({ paperId }) => !seen.has(paperId));
  if (kept.length + next.length > 50) throw statusError('请先处理已有的待确认归类。', 409);
  const previous = { proposals: chat.classifyProposals, revision: chat.classifyRevision };
  chat.classifyProposals = [...kept, ...next];
  chat.classifyRevision = (chat.classifyRevision ?? 0) + 1;
  try { host.store.save(chat.id); }
  catch (error) {
    chat.classifyProposals = previous.proposals;
    chat.classifyRevision = previous.revision;
    throw error;
  }
  for (const proposal of next) {
    host.emit({ type: 'classifyProposal', chatId: chat.id, proposal, revision: chat.classifyRevision });
  }
  return {
    status: 'pending_confirmation',
    items: next.map(({ id, paperId, fromPath, targetPath, willCreateCategory, willCreateSubcategory }) => ({
      proposalId: id, paperId, fromPath, targetPath, willCreateCategory, willCreateSubcategory,
    })),
    message: '等待用户在界面确认。确认前没有新建文件夹，也没有移动论文。',
  };
}

async function prepareTargets(
  host: ClassificationHost, chat: Chat, run: ChatClassifyRun, jobId: string, checkOpen: () => void,
): Promise<ClassificationMovePreparation> {
  const checkpoint = (): void => {
    checkOpen();
    if (!activeClassifyRun(run)) throw statusError('归类任务已结束，请先核实结果。', 503);
  };
  checkpoint();
  run.jobId = jobId;
  run.status = 'preparing';
  run.stage = '准备文件夹';
  publish(host, chat, run);
  let nodes: CategoryNode[] = structuredClone((await host.library.getLibrary()).categories);
  checkpoint();
  const tops = new Map<string, Promise<string>>();
  const children = new Map<string, Promise<string>>();
  const refresh = async (): Promise<void> => {
    await host.library.refresh();
    nodes = structuredClone((await host.library.getLibrary()).categories);
    checkpoint();
  };
  const created = (folder: string): void => {
    run.createdFolders.push(folder);
    publish(host, chat, run);
    checkpoint();
  };
  const create = async (name: string, parent?: string) => {
    try { return await host.library.createCategory(name, parent); }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code && ['EACCES', 'EPERM', 'ENOSPC', 'EDQUOT', 'EROFS', 'ENAMETOOLONG'].includes(code)) {
        throw Object.assign(statusError(`无法创建文件夹「${name}」（${code}），请核对权限和磁盘空间。`, 409),
          { cause: error });
      }
      throw error;
    }
  };
  const ensureTop = (name: string): Promise<string> => {
    const key = folderKey(name);
    if (!tops.has(key)) tops.set(key, (async () => {
      const matched = matchTop(nodes, name);
      if (matched) return matched.id;
      try {
        const { category } = await create(cleanName(name));
        nodes.push({ id: category, children: [] });
        created(`papers/${category}`);
        return category;
      } catch (error) {
        if (httpStatus(error, 500) !== 409) throw error;
        await refresh();
        const concurrent = matchTop(nodes, name);
        if (!concurrent) throw error;
        return concurrent.id;
      }
    })());
    return tops.get(key)!;
  };
  const ensureChild = (top: string, name: string): Promise<string> => {
    const key = `${top}/${folderKey(name)}`;
    if (!children.has(key)) children.set(key, (async () => {
      const parent = matchTop(nodes, top)!;
      const matched = matchChild(parent, name);
      if (matched) return matched;
      try {
        const { subcategory } = await create(cleanName(name), top);
        parent.children.push({ id: `${top}/${subcategory}` });
        created(`papers/${top}/${subcategory}`);
        return subcategory;
      } catch (error) {
        if (httpStatus(error, 500) !== 409) throw error;
        await refresh();
        const concurrent = matchChild(matchTop(nodes, top)!, name);
        if (!concurrent) throw error;
        return concurrent;
      }
    })());
    return children.get(key)!;
  };
  const prepared: ClassificationMovePreparation = { moves: [], blocked: [] };
  for (const proposal of run.proposals) {
    checkpoint();
    const item = run.items.find(({ proposalId }) => proposalId === proposal.id)!;
    try {
      const top = await ensureTop(proposal.targetCategory);
      checkpoint();
      const child = proposal.targetSubcategory ? await ensureChild(top, proposal.targetSubcategory) : '';
      checkpoint();
      item.category = `papers/${[top, child].filter(Boolean).join('/')}`;
      prepared.moves.push({ paperId: proposal.paperId, category: item.category });
    } catch (error) {
      // 未知故障不能当作已确定失败继续搬文件；终态对账会保留待核实项。
      if (httpStatus(error, 500) >= 500) throw error;
      item.status = 'blocked';
      item.error = redact(errorMessage(error));
      prepared.blocked.push({ paperId: item.paperId, category: item.category, status: 'blocked', error: item.error });
    }
  }
  checkpoint();
  run.status = 'moving';
  run.stage = prepared.moves.length ? '正在移动并更新索引' : '记录目录准备结果';
  publish(host, chat, run);
  return prepared;
}

function receipt(chat: Chat, run: ChatClassifyRun): ChatMessage {
  const lines = ['归类操作结果（用户已在界面处理）：'];
  for (const folder of run.createdFolders) lines.push(`已新建文件夹：\`${folder}\`。`);
  for (const item of run.items) {
    if (item.status === 'moved') lines.push(`${item.paperId} 已移动至 \`${item.category}\`。`);
    else if (item.status === 'unchanged') lines.push(`${item.paperId} 已在目标 \`${item.category}\`。`);
    else lines.push(`${item.paperId} 归类未完成：${item.error ?? '请先核实移动结果。'}`);
  }
  if (run.repair) lines.push(`需要核实并修复事务：\`${run.repair}\`。`);
  const message: ChatMessage = {
    id: run.messageId, role: 'system', status: 'completed', text: lines.join('\n\n'), createdAt: run.updatedAt,
  };
  const existing = chat.messages.find(({ id }) => id === message.id);
  if (existing) Object.assign(existing, message);
  else chat.messages.push(message);
  return message;
}

/** 完整回执、目标和成功的 CLI 步骤共同证明完成；重启不会依据文件名推测或重新执行。 */
function reliableItems(run: ChatClassifyRun, job: JobRecord): Map<string, PaperMoveItem> | null {
  const result = job.moveResult;
  if (!result || result.repair || !Array.isArray(result.items) || result.items.length !== run.items.length) return null;
  const byPaper = new Map<string, PaperMoveItem>();
  for (const item of result.items) {
    const expected = run.items.find(({ paperId }) => paperId === item?.paperId);
    if (!expected || byPaper.has(item.paperId) || item.category !== expected.category ||
      !['moved', 'unchanged', 'blocked', 'failed'].includes(item.status) ||
      (item.error !== undefined && typeof item.error !== 'string')) return null;
    byPaper.set(item.paperId, item);
  }
  const moved = result.items.some(({ status }) => status === 'moved' || status === 'unchanged');
  return !moved || job.steps.some(({ action, status }) => action === 'move-papers' && status === 'completed')
    ? byPaper : null;
}

function updateRunResult(
  host: ClassificationHost, chat: Chat, run: ChatClassifyRun, job: JobRecord | null,
): ChatMessage {
  const reliable = job ? reliableItems(run, job) : null;
  run.repair = job?.moveResult?.repair;
  const error = run.repair ? `需要核实并修复移动事务：${run.repair}`
    : job?.error || '归类任务在服务重启时中断，请先核实移动结果。';
  run.items = run.items.map<ClassifyRunItem>((item) => {
    const result = reliable?.get(item.paperId);
    if (result) return {
      ...item, status: result.status, ...(result.error ? { error: result.error } : { error: undefined }),
    };
    return item.status === 'blocked' ? item : { ...item, status: 'interrupted', error };
  });
  const successful = new Set(run.items.filter(({ status }) => ['moved', 'unchanged'].includes(status))
    .map(({ proposalId }) => proposalId));
  chat.classifyProposals = (chat.classifyProposals ?? []).filter(({ id }) => !successful.has(id));
  for (const proposal of chat.classifyProposals) {
    const result = run.items.find(({ proposalId }) => proposalId === proposal.id);
    if (result?.error) proposal.error = result.error;
  }
  run.status = reliable ? (successful.size === run.items.length ? 'completed' : successful.size ? 'partial' : 'failed')
    : 'interrupted';
  run.stage = { completed: '归类已完成', partial: '部分归类完成', failed: '归类未完成', interrupted: '归类中断，需核实' }[
    run.status];
  run.updatedAt = stamp();
  const message = receipt(chat, run);
  publish(host, chat, run);
  return message;
}

function finishRun(host: ClassificationHost, chat: Chat, run: ChatClassifyRun, job: JobRecord | null): void {
  const previous = structuredClone({
    run, proposals: chat.classifyProposals, messages: chat.messages, revision: chat.classifyRevision,
  });
  let message: ChatMessage;
  try { message = updateRunResult(host, chat, run, job); }
  catch (error) {
    Object.assign(run, previous.run, { repair: previous.run.repair });
    chat.classifyProposals = previous.proposals;
    chat.messages = previous.messages;
    chat.classifyRevision = previous.revision;
    throw error;
  }
  host.emit({ type: 'message', chatId: chat.id, message });
  host.emit({ type: 'library' });
}

export function reconcileClassifications(host: ClassificationHost, restarting = false, changed?: JobRecord): void {
  for (const chat of host.store.data.chats) {
    for (const run of chat.classifyRuns ?? []) {
      if (changed && (changed.classification?.chatId !== chat.id || changed.classification.runId !== run.id)) continue;
      const job = changed ?? (run.jobId ? host.jobs.getJob(run.jobId) : host.jobs.listJobs().find((candidate) =>
        candidate.classification?.chatId === chat.id && candidate.classification.runId === run.id) ?? null);
      if (!activeClassifyRun(run)) {
        if (!chat.messages.some(({ id }) => id === run.messageId)) {
          const previous = { messages: chat.messages.slice(), revision: chat.classifyRevision,
            runRevision: run.revision, updatedAt: run.updatedAt };
          let message: ChatMessage;
          try {
            message = receipt(chat, run);
            publish(host, chat, run);
          } catch (error) {
            chat.messages = previous.messages;
            chat.classifyRevision = previous.revision;
            run.revision = previous.runRevision;
            run.updatedAt = previous.updatedAt;
            throw error;
          }
          host.emit({ type: 'message', chatId: chat.id, message });
        }
        continue;
      }
      if (!job) { if (restarting) finishRun(host, chat, run, null); continue; }
      const linked = run.jobId !== job.id;
      run.jobId = job.id;
      if (['completed', 'partial', 'failed'].includes(job.status)) finishRun(host, chat, run, job);
      else if (linked || job.status === 'running' && run.status === 'queued') {
        if (job.status === 'running') { run.status = 'preparing'; run.stage = '准备文件夹'; }
        publish(host, chat, run);
      }
    }
  }
}

export async function resolveClassifyProposals(
  host: ClassificationHost, chatId: string, action: unknown, ids: unknown, requestId?: unknown,
): Promise<ClassifyResolution | ClassifySubmission> {
  if (action !== 'apply' && action !== 'discard') throw statusError('请指定确认或取消。');
  if (!Array.isArray(ids) || !ids.length ||
    !ids.every((id) => typeof id === 'string' && /^[\w-]{1,100}$/.test(id))) {
    throw statusError('请选择 1 至 50 项待确认的归类。');
  }
  const chat = host.writableChat(chatId);
  const selected = [...new Set<string>(ids)].sort();
  if (selected.length > 50) throw statusError('请选择 1 至 50 项待确认的归类。');
  if (action === 'apply') {
    if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(requestId)) {
      throw statusError('归类请求编号无效，请刷新界面后重试。');
    }
    const previous = (chat.classifyRuns ?? []).find((run) => run.requestId === requestId);
    if (previous) {
      if (JSON.stringify(previous.proposalIds) !== JSON.stringify(selected)) {
        throw statusError('同一归类请求编号不能提交不同的提案。', 409);
      }
      return { run: previous, job: previous.jobId ? host.jobs.getJob(previous.jobId) : null, replayed: true };
    }
  }
  if (classificationBusy(host, chat)) throw statusError('归类移动正在处理，请稍候。', 409);
  const proposals = (chat.classifyProposals ?? []).filter(({ id }) => selected.includes(id));
  if (proposals.length !== selected.length) throw statusError('待确认的归类操作不存在或已处理。', 404);
  if (action === 'discard') {
    const previous = { proposals: chat.classifyProposals, revision: chat.classifyRevision, length: chat.messages.length };
    chat.classifyProposals = chat.classifyProposals!.filter(({ id }) => !selected.includes(id));
    chat.classifyRevision = (chat.classifyRevision ?? 0) + 1;
    const message: ChatMessage = { id: randomUUID(), role: 'system', status: 'completed', createdAt: stamp(),
      text: `已取消 ${proposals.map(({ paperId }) => paperId).join('、')} 的归类请求，本次未新建文件夹或移动论文。` };
    chat.messages.push(message);
    try { host.store.save(chatId); }
    catch (error) {
      chat.classifyProposals = previous.proposals;
      chat.classifyRevision = previous.revision;
      chat.messages.splice(previous.length);
      throw error;
    }
    for (const id of selected) {
      host.emit({ type: 'classifyProposalResolved', chatId, id, applied: false, revision: chat.classifyRevision });
    }
    host.emit({ type: 'message', chatId, message });
    return {
      applied: [], discarded: selected, failed: [], remaining: chat.classifyProposals.map(({ id }) => id), message,
    };
  }
  const run: ChatClassifyRun = {
    id: randomUUID(), requestId: requestId as string, proposalIds: selected, proposals: structuredClone(proposals),
    jobId: null, status: 'queued', stage: '排队中', revision: 0, createdFolders: [],
    items: proposals.map(({ id, paperId, targetPath }) => ({
      proposalId: id, paperId, category: targetPath, status: 'pending',
    })), messageId: randomUUID(), createdAt: stamp(), updatedAt: stamp(),
  };
  const previousRevision = chat.classifyRevision;
  const runs = chat.classifyRuns ??= [];
  runs.push(run);
  try { publish(host, chat, run); }
  catch (error) {
    runs.splice(runs.indexOf(run), 1);
    chat.classifyRevision = previousRevision;
    throw error;
  }
  try {
    const job = await host.jobs.startClassificationMove({ chatId, runId: run.id }, proposals.length,
      (jobId, checkOpen) => prepareTargets(host, chat, run, jobId, checkOpen));
    if (run.jobId !== job.id) { run.jobId = job.id; publish(host, chat, run); }
    return { run, job: host.jobs.getJob(job.id) ?? job, replayed: false };
  } catch (error) {
    for (const item of run.items) {
      item.status = 'failed'; item.error = redact(errorMessage(error));
      const proposal = chat.classifyProposals?.find(({ id }) => id === item.proposalId);
      if (proposal) proposal.error = item.error;
    }
    run.status = 'failed'; run.stage = '归类任务提交失败';
    const message = receipt(chat, run);
    publish(host, chat, run);
    host.emit({ type: 'message', chatId, message });
    throw error;
  }
}
