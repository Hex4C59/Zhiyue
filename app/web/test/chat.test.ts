import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { activeClassifyRun } from '../shared/contracts.js';
import type { ClassificationMovePreparation, JobRecord, PaperMove } from '../src/lib/jobs.js';
import { ChatService } from '../src/lib/chat.js';
import type { ChatRecord } from '../src/lib/chatStore.js';
import { ChatStore } from '../src/lib/chatStore.js';
import { resolvePi } from '../src/lib/pi.js';
import type {
  AccountResult, AssistantClient, ChatEvent, ChatMessage, ChatServiceOptions,
  ClientNotification, ClientRequest, ModelListResult, ThreadResult, TurnResult,
} from '../src/lib/chat.js';

interface ClientCall {
  method: string;
  params?: Record<string, unknown>;
}

interface ToolReplyShape {
  success: boolean;
  contentItems: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  decision?: string;
}

class FakeAgent extends EventEmitter implements AssistantClient {
  available = true;
  lastError: string | null = null;
  calls: ClientCall[] = [];
  responses: Array<{ id: number; result: ToolReplyShape }> = [];

  async start(): Promise<void> {}

  async request<R>(method: string, params?: Record<string, unknown>): Promise<R> {
    this.calls.push({ method, params });
    if (method === 'account/read') return { account: { type: 'apiKey' }, requiresOpenaiAuth: true } as AccountResult as R;
    if (method === 'model/list') return { data: [] } as ModelListResult as R;
    if (method === 'thread/start') return { thread: { id: 'thread-1' } } as ThreadResult as R;
    if (method === 'turn/start') return { turn: { id: 'turn-1' } } as TurnResult as R;
    return {} as R;
  }

  respond(id: number, result: unknown): void { this.responses.push({ id, result: result as ToolReplyShape }); }

  respondError(id: number, message: string): void { this.responses.push({ id, result: { success: false, contentItems: [{ type: 'inputText', text: message }] } }); }

  async close(): Promise<void> {}
}

interface Fixture {
  chats: ChatService;
  client: FakeAgent;
  events: ChatEvent[];
  dir: string;
  classificationBatches: PaperMove[][];
}

async function fixture(t: test.TestContext): Promise<Fixture> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'literature-chat-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const client = new FakeAgent();
  const events: ChatEvent[] = [];
  const classificationJobs = new Map<string, JobRecord>();
  const classificationBatches: PaperMove[][] = [];
  const skillList: Array<{ name: string; description: string; filePath: string; baseDir: string; disableModelInvocation: boolean }> = [
    {
      name: 'paper-reading', description: '判断论文是否值得精读。',
      filePath: path.join(dir, '.zhiyue', 'skills', 'paper-reading', 'SKILL.md'),
      baseDir: path.join(dir, '.zhiyue', 'skills', 'paper-reading'), disableModelInvocation: false,
    },
  ];
  const options = {
    root: dir,
    stateDir: dir,
    library: {
      getPaper: async () => null,
      getLibrary: async () => ({ papers: [], categories: [], stats: {} }),
      safeFile: async () => '',
      readDocument: async (relativePath: unknown, offset: unknown = 0) => ({
        path: String(relativePath), offset: Number(offset), totalChars: 12, text: '# README\n正文', truncated: false,
      }),
      refresh: async () => {},
    },
    jobs: {
      startDownload: async (input: unknown) => ({ id: 'job-1', status: 'queued', input }),
      startAction: async () => ({ id: 'job-1' }),
      startPaperMove: async (moves: unknown) => ({ id: 'move-1', status: 'queued', moves }),
      startClassificationMove: async (
        classification: { chatId: string; runId: string }, _count: number,
        prepare: (jobId: string, checkOpen: () => void) => Promise<ClassificationMovePreparation>,
      ) => {
        const job: JobRecord = { id: randomUUID(), title: '归类移动', batch: null, classification,
          status: 'queued', log: '', steps: [], createdAt: '', updatedAt: '' };
        classificationJobs.set(job.id, job);
        queueMicrotask(async () => {
          try {
            job.status = 'running';
            chats.reconcileClassifications(false, job);
            const { moves, blocked } = await prepare(job.id, () => {});
            classificationBatches.push(structuredClone(moves));
            job.moveResult = { items: [...blocked, ...moves.map(({ paperId, category }) => ({
              paperId, category, status: paperId === 'L009' ? 'blocked' as const : 'moved' as const,
              ...(paperId === 'L009' ? { error: '目标同名文件已存在。' } : {}),
            }))] };
            job.steps = [{ action: 'move-papers', status: 'completed', startedAt: '', finishedAt: '' }];
            job.status = job.moveResult.items.some(({ status }) => status === 'blocked') ? 'partial' : 'completed';
          } catch (error) { job.status = 'failed'; job.error = (error as Error).message; }
          chats.reconcileClassifications(false, job);
        });
        return job;
      },
      getJob: (id: string) => classificationJobs.get(id) ?? { id: 'job-1' },
      listJobs: () => [...classificationJobs.values()],
    },
    emit: (event: ChatEvent) => events.push(structuredClone(event)),
    extract: async () => ({ text: '文件内容' }),
    searchPdfText: async (_file: string, query: string) => ({ kind: 'pdf-search', query, hits: [] }),
    pdfOutline: async () => ({ kind: 'pdf-outline', outline: [], total_pages: 3 }),
    renderPage: async () => ({
      data: Buffer.from('png').toString('base64'), mimeType: 'image/png', totalPages: 3, page: 1,
    }),
    readSkill: async (name: unknown) => {
      if (name === 'missing') throw new Error('技能不存在或未加载。');
      return { name: String(name), file: 'SKILL.md', text: '# 技能正文' };
    },
    skills: {
      list: () => skillList,
      diagnostics: () => ['坏技能：缺少 description'],
      reload: () => {},
      read: (name: unknown) => {
        if (String(name) !== 'paper-reading') throw new Error('技能不存在或未加载。');
        return { name: 'paper-reading', file: 'SKILL.md', text: '# 精读步骤' };
      },
      expand: (name: string, args = '') => {
        const block = `<skill name="${name}">\n\n# 精读步骤\n</skill>`;
        return args ? `${block}\n\n${args}` : block;
      },
    },
    compact: async () => ({ tokensBefore: 4000, estimatedTokensAfter: 1200 }),
    client,
  } as unknown as ChatServiceOptions;
  const chats = new ChatService(options);
  chats.authenticated = true;
  return { chats, client, events, dir, classificationBatches };
}

const until = async (predicate: () => boolean): Promise<void> => {
  for (let index = 0; index < 40; index++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('condition timeout');
};

const applyClassifications = async (chats: ChatService, chatId: string, ids: string[]) => {
  const submitted = await chats.resolveClassifyProposals(chatId, 'apply', ids, randomUUID());
  assert.ok('run' in submitted);
  await until(() => !activeClassifyRun(submitted.run));
  const run = submitted.run;
  return {
    run, applied: run.items.filter(({ status }) => status === 'moved' || status === 'unchanged')
      .map(({ proposalId }) => proposalId),
    failed: run.items.filter(({ status }) => !['moved', 'unchanged'].includes(status))
      .map(({ proposalId, paperId, error }) => ({ id: proposalId, paperId, error })),
    message: chats.get(chatId).messages.find(({ id }) => id === run.messageId),
  };
};

test('用户消息与占位回答只保存一次，持久化成功后才发布两条事件', async (t) => {
  const { chats, client, events } = await fixture(t);
  const chat = chats.create({ paperIds: ['L001'] });
  const other = chats.create({ title: '不应改写的另一会话' });
  const before = await fs.readFile(chats.store.fileFor(other.id));
  let release!: (value: ThreadResult) => void;
  const request = client.request.bind(client);
  client.request = async <R,>(method: string, params?: Record<string, unknown>): Promise<R> => {
    if (method === 'thread/start') return new Promise<ThreadResult>((resolve) => { release = resolve; }) as Promise<R>;
    return request<R>(method, params);
  };
  const save = chats.store.save.bind(chats.store);
  const commits: string[] = [];
  t.mock.method(chats.store, 'save', (id: string) => { commits.push(id); save(id); });
  const emit = chats.emit;
  const publications: Array<{ messages: number; commits: number }> = [];
  t.mock.method(chats, 'emit', (event: ChatEvent) => {
    if (event.type === 'message') {
      const committed = new ChatStore(path.dirname(chats.store.directory)).get(chat.id)!;
      publications.push({ messages: committed.messages.length, commits: commits.length });
    }
    return emit(event);
  });
  assert.deepEqual(await chats.send(chat.id, { text: '一次可靠提交', paperIds: ['L002'] }), { accepted: true });
  assert.deepEqual(commits, [chat.id]);
  assert.deepEqual(publications, [{ messages: 2, commits: 1 }, { messages: 2, commits: 1 }]);
  const saved = JSON.parse(await fs.readFile(chats.store.fileFor(chat.id), 'utf8')) as ChatRecord;
  assert.deepEqual(saved.chat.paperIds, ['L002']);
  assert.deepEqual(saved.chat.messages.map(({ role, status }) => [role, status]),
    [['user', 'completed'], ['assistant', 'streaming']]);
  assert.equal(events.filter(({ type }) => type === 'message').length, 2);
  assert.deepEqual(await fs.readFile(chats.store.fileFor(other.id)), before);
  await chats.interrupt(chat.id);
  release({ thread: { id: 'obsolete-thread' } });
  await new Promise<void>((resolve) => setImmediate(resolve));
});

test('消息受理保存失败回滚正文、上下文和标题，不发布事件或启动模型回合', async (t) => {
  const { chats, client, events } = await fixture(t);
  const chat = chats.create({ title: '原名称', paperIds: ['L001'] });
  const original = structuredClone(chat);
  const before = await fs.readFile(chats.store.fileFor(chat.id));
  t.mock.method(chats.store, 'save', () => { throw new Error('合成受理保存失败'); });
  await assert.rejects(chats.send(chat.id, { text: '不能被受理', paperIds: ['L002'] }), /受理保存失败/);
  assert.deepEqual(chat, original);
  assert.equal(chats.active.has(chat.id), false);
  assert.equal(client.calls.length, 0);
  assert.equal(events.filter(({ type }) => type === 'message').length, 0);
  assert.deepEqual(await fs.readFile(chats.store.fileFor(chat.id)), before);
  assert.throws(() => chats.create(), /受理保存失败/);
  assert.equal(chats.store.summaries().length, 1, '新建失败不残留无法恢复的内存会话');
});

test('归档与草稿状态保存失败回滚内存，并保留可重试的完整草稿', async (t) => {
  const { chats, events, dir } = await fixture(t);
  const chat = chats.create();
  const paper = { id: 'L001', file: 'papers/synthetic.pdf', title: '合成论文', authors: [], titleZh: '',
    category: '01_测试', subcategory: '', notes: [], readStatus: 'unread' as const, starred: false };
  const fail = () => { throw new Error('合成草稿保存失败'); };
  const failing = t.mock.method(chats.store, 'save', fail);
  assert.throws(() => chats.changeHistory(chat.id, 'archived'), /草稿保存失败/);
  assert.equal(chat.historyState, undefined);
  assert.throws(() => chats.createNoteDraft(chat.id, { paper, title: '临时笔记', content: '内容' }), /草稿保存失败/);
  await assert.rejects(chats.createDocumentDraft(chat.id, { target: 'outputs', title: '临时文稿', content: '内容' }),
    /草稿保存失败/);
  assert.deepEqual(chat.noteDrafts, []);
  assert.equal(events.length, 0);
  failing.mock.restore();
  const draft = chats.createNoteDraft(chat.id, { paper, title: '必须保留的笔记', content: '# 完整草稿' });
  const before = await fs.readFile(chats.store.fileFor(chat.id));
  const discard = t.mock.method(chats.store, 'save', fail);
  await assert.rejects(chats.resolveNoteDraft(draft.id, 'discard'), /草稿保存失败/);
  assert.deepEqual(chat.noteDrafts, [draft]);
  assert.deepEqual(await fs.readFile(chats.store.fileFor(chat.id)), before);
  assert.equal(events.some(({ type }) => type === 'noteDraftResolved'), false);
  discard.mock.restore();
  assert.deepEqual(await chats.resolveNoteDraft(draft.id, 'discard'), { discarded: true });
  assert.deepEqual(new ChatStore(dir).get(chat.id)!.noteDrafts, []);
});

test('已结束回答的异步工具和草稿保存仍持有原正文，淘汰后从磁盘恢复操作结果', async (t) => {
  const { chats, client, dir } = await fixture(t);
  const chat = chats.create();
  await chats.send(chat.id, { text: '生成文稿' });
  await until(() => !!chat.threadId);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const paper = { id: 'L001', file: 'papers/L001.pdf', title: '示例', category: '01_测试', notes: [], authors: [],
    titleZh: '', subcategory: '', readStatus: 'unread' as const, starred: false };
  chats.library.getPaper = async () => { await gate; return paper; };
  const tool = chats.serverRequest({ id: 97, method: 'item/tool/call', params: {
    threadId: chat.threadId, tool: 'draft_document', arguments: {
      target: 'outputs', title: '保留草稿', content: '第一行\n'.repeat(60), paperIds: ['L001'],
    },
  } });
  chats.finish(chat.id, 'completed');
  const pressure = () => { for (let index = 0; index < 10; index++) chats.create(); };
  pressure();
  const retained = chats.get(chat.id);
  release();
  await tool;
  assert.equal(retained, chat);
  assert.equal(client.responses.at(-1)?.result.success, true);
  const draft = chat.noteDrafts[0]!;
  pressure();
  assert.notEqual(chats.get(chat.id), chat);
  const settled = chats.get(chat.id);
  let refreshed = false;
  const refreshing = new Promise<void>((resolve) => { release = resolve; });
  chats.library.refresh = async () => { refreshed = true; await refreshing; };
  const resolution = chats.resolveNoteDraft(draft.id, 'save');
  await until(() => refreshed);
  pressure();
  assert.equal(chats.get(chat.id), settled);
  release();
  await resolution;
  assert.deepEqual(new ChatStore(dir).get(chat.id)!.noteDrafts, []);
});

test('重启只提交中断回答所属会话，其他会话和固定回执保持不变', async (t) => {
  const { chats, dir } = await fixture(t);
  const pending = chats.create();
  pending.messages.push({ id: 'unfinished', role: 'assistant', text: '', thinking: '已收到的推理',
    createdAt: new Date().toISOString(), status: 'streaming' });
  chats.store.save(pending.id);
  const other = chats.create({ title: '保留固定回执' });
  other.messages.push({ id: 'fixed-receipt', role: 'system', text: '确认结果',
    status: 'completed', createdAt: new Date().toISOString() });
  other.lastContextOperationId = 'fixed-receipt';
  chats.store.save(other.id);
  const before = await fs.readFile(chats.store.fileFor(other.id));
  const restored = new ChatService({ root: dir, stateDir: dir, library: chats.library, jobs: chats.jobs,
    emit: () => {}, extract: chats.extract, client: new FakeAgent() });
  assert.equal(restored.get(pending.id).messages[0]!.status, 'interrupted');
  assert.equal(restored.get(pending.id).messages[0]!.thinking, '已收到的推理');
  const saved = JSON.parse(await fs.readFile(restored.store.fileFor(pending.id), 'utf8')) as ChatRecord;
  assert.equal(saved.chat.messages[0]!.status, 'interrupted');
  assert.deepEqual(await fs.readFile(chats.store.fileFor(other.id)), before);
  assert.equal(restored.get(other.id).lastContextOperationId, 'fixed-receipt');
});

test('生成中的会话不能归档或移入回收站', async (t) => {
  const { chats, client } = await fixture(t);
  const chat = chats.create();
  await chats.send(chat.id, { text: '测试' });
  await until(() => client.calls.some(({ method }) => method === 'turn/start'));
  assert.throws(() => chats.changeHistory(chat.id, 'archived'), { statusCode: 409 });
  assert.throws(() => chats.changeHistory(chat.id, 'trashed'), { statusCode: 409 });
  chats.finish(chat.id, 'completed');
  assert.equal(chats.changeHistory(chat.id, 'archived').historyState, 'archived');
});

const lastMessage = (chat: { messages: ChatMessage[] }): ChatMessage => chat.messages.at(-1) as ChatMessage;

test('会话接入真实协议形状，图片以localImage输入，文件提取为有范围的文本', async (t) => {
  const { chats, client } = await fixture(t);
  const chat = chats.create();
  await chats.send(chat.id, {
    text: '解释附件',
    attachments: [
      { id: 'a', name: '图.png', mime: 'image/png', path: '/chosen/image.png', size: 10 },
      { id: 'b', name: '文档.txt', mime: 'text/plain', path: '/chosen/file.txt', size: 10 },
    ],
  });
  await until(() => client.calls.some((call) => call.method === 'turn/start'));
  const turn = client.calls.find((call) => call.method === 'turn/start')?.params as {
    threadId: string;
    input: Array<{ type: string; text?: string }>;
  };
  assert.equal(turn.threadId, 'thread-1');
  assert.equal(turn.input[1]?.type, 'localImage');
  assert.match(turn.input[0]?.text ?? '', /文件内容/);
  assert.match(String(client.calls[0]?.params?.developerInstructions), /文献研究助手/);
  assert.equal((client.calls[0]?.params?.dynamicTools as unknown[]).length, 21);
});

test('多条agent消息流可拼接并在turn完成后持久化', async (t) => {
  const { chats, events, dir } = await fixture(t);
  const chat = chats.create();
  await chats.send(chat.id, { text: '问题' });
  await until(() => Boolean(chat.threadId));
  for (const [itemId, delta] of [['1', '第一段'], ['2', '第二段']]) {
    chats.notification({ method: 'item/agentMessage/delta', params: { threadId: chat.threadId, itemId, delta } });
  }
  chats.notification({ method: 'turn/completed', params: { threadId: chat.threadId, turn: { status: 'completed' } } });
  assert.equal(lastMessage(chat).text, '第一段\n\n第二段');
  assert.equal(lastMessage(chat).status, 'completed');
  assert.equal(events.filter((e) => e.type === 'delta').map((e) => e.delta).join(''), '第一段\n\n第二段');
  const saved = JSON.parse(await fs.readFile(chats.store.fileFor(chat.id), 'utf8')) as ChatRecord;
  assert.equal(saved.chat.messages.at(-1)?.text, '第一段\n\n第二段');
});

test('推理增量按消息保存，多轮之间分隔且不被最终整段覆盖', async (t) => {
  const { chats, events, dir } = await fixture(t);
  const chat = chats.create();
  await chats.send(chat.id, { text: '问题' });
  await until(() => Boolean(chat.threadId));
  for (const [itemId, delta] of [['1', '先看'], ['1', '目录'], ['2', '再核对']]) {
    chats.notification({ method: 'item/agentMessage/thinking', params: { threadId: chat.threadId, itemId, delta } });
  }
  chats.notification({
    method: 'item/completed',
    params: { threadId: chat.threadId, item: { id: '2', type: 'agentMessage', text: '答', thinking: '再核对' } },
  });
  chats.notification({
    method: 'item/completed',
    params: { threadId: chat.threadId, item: { id: '3', type: 'agentMessage', text: '', thinking: '补录的推理' } },
  });
  chats.notification({ method: 'turn/completed', params: { threadId: chat.threadId, turn: { status: 'completed' } } });
  const message = lastMessage(chat);
  assert.equal(message.thinking, '先看目录\n\n再核对\n\n补录的推理');
  assert.equal(events.filter((e) => e.type === 'thinking').map((e) => e.delta).join(''), '先看目录\n\n再核对');
  const saved = JSON.parse(await fs.readFile(chats.store.fileFor(chat.id), 'utf8')) as ChatRecord;
  assert.equal(saved.chat.messages.at(-1)?.thinking, '先看目录\n\n再核对\n\n补录的推理');
});

test('下载请求必须通过命名工具，审批只响应明确点击', async (t) => {
  const { chats, client, events } = await fixture(t);
  const chat = chats.create();
  await chats.send(chat.id, { text: '下载' });
  await until(() => Boolean(chat.threadId));
  const request = (id: number, method: string, params: Record<string, unknown>): Promise<void> =>
    chats.serverRequest({ id, method, params } as ClientRequest);
  await request(87, 'item/tool/call', { threadId: chat.threadId, tool: 'read_skill', arguments: { name: 'paper-reading' } });
  assert.match(client.responses.at(-1)?.result.contentItems[0]?.text ?? '', /# 技能正文/);
  await request(86, 'item/tool/call', { threadId: chat.threadId, tool: 'read_skill', arguments: { name: 'missing' } });
  assert.match(client.responses.at(-1)?.result.contentItems[0]?.text ?? '', /不存在或未加载/);
  await request(88, 'item/tool/call', { threadId: chat.threadId, tool: 'download_papers', arguments: { input: '10.1234/example' } });
  assert.equal(client.responses.at(-1)?.result.success, true);
  assert.match(client.responses.at(-1)?.result.contentItems[0]?.text ?? '', /queued/);
  const beforeApproval = client.responses.length;
  await request(89, 'item/commandExecution/requestApproval', { threadId: chat.threadId, command: 'a command' });
  assert.equal(client.responses.length, beforeApproval);
  const approval = events.find((event) => event.type === 'approval') as unknown as { approval: { id: string } };
  chats.approve(approval.approval.id, { decision: 'decline' });
  assert.equal(client.responses.at(-1)?.result.decision, 'decline');
  assert.throws(() => chats.approve(approval.approval.id, { decision: 'accept' }));
});

test('分类工具：新建与改名直接执行，删除先生成待确认卡片', async (t) => {
  const { chats, client, events } = await fixture(t);
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const library = {
    getPaper: async () => null,
    getLibrary: async () => ({
      papers: [], stats: {},
      categories: [{
        id: '09_空分类', name: '09_空分类', count: 1,
        children: [{ id: '09_空分类/01_子目录', name: '01_子目录', count: 0 }],
      }],
    }),
    safeFile: async () => '',
    readDocument: async () => ({ path: '', offset: 0, totalChars: 0, text: '', truncated: false }),
    refresh: async () => {},
    resolveCategory: async (value: unknown) => {
      calls.push({ method: 'resolveCategory', args: [value] });
      if (String(value).includes('不存在')) {
        throw Object.assign(new Error('没有找到分类「不存在」。'), { statusCode: 404 });
      }
      const [top, child] = String(value).replace(/^papers\//, '').split('/');
      return child
        ? { category: top, subcategory: child, path: `papers/${top}/${child}` }
        : { category: top, subcategory: '', path: `papers/${top}` };
    },
    createCategory: async (name: unknown, parent: unknown) => {
      calls.push({ method: 'createCategory', args: [name, parent] });
      return { category: '10_新分类', subcategory: '' };
    },
    renameCategory: async (category: unknown, subcategory: unknown, name: unknown) => {
      calls.push({ method: 'renameCategory', args: [category, subcategory, name] });
      return { category: '09_改名', subcategory: '' };
    },
    deleteCategory: async (category: unknown, subcategory: unknown) => {
      calls.push({ method: 'deleteCategory', args: [category, subcategory] });
      return { trashed: '.zhiyue/trash/categories/x' };
    },
    movePaper: async (paperId: unknown, category: unknown) => {
      calls.push({ method: 'movePaper', args: [paperId, category] });
      return { literature_id: 'L001', from: 'papers/08_SER', to: 'papers/09_空分类' };
    },
  } as unknown as ChatServiceOptions['library'];
  chats.library = library;
  const chat = chats.create();
  await chats.send(chat.id, { text: '整理分类' });
  await until(() => Boolean(chat.threadId));
  const request = (id: number, tool: string, args: Record<string, unknown>): Promise<void> =>
    chats.serverRequest({ id, method: 'item/tool/call', params: { threadId: chat.threadId, tool, arguments: args } } as ClientRequest);
  const reply = (): { success: boolean; text: string } => {
    const result = client.responses.at(-1)?.result as ToolReplyShape;
    return { success: result.success, text: result.contentItems[0]?.text ?? '' };
  };
  await request(1, 'library_categories', {});
  assert.equal(reply().success, true);
  assert.match(reply().text, /09_空分类/);
  await request(2, 'create_category', { name: '新分类' });
  assert.deepEqual(calls.at(-1), { method: 'createCategory', args: ['新分类', undefined] });
  assert.ok(events.some((event) => event.type === 'library'));
  await request(3, 'rename_category', { category: '09_空分类', name: '改名' });
  assert.deepEqual(calls.at(-1), { method: 'renameCategory', args: ['09_空分类', '', '改名'] });
  await request(4, 'delete_category', { category: '09_空分类' });
  assert.match(reply().text, /pending_confirmation/);
  assert.equal(calls.some((call) => call.method === 'deleteCategory'), false);
  const pending = chat.folderActions?.[0];
  assert.ok(pending);
  assert.equal(pending?.papers, 1);
  assert.ok(events.some((event) => event.type === 'folderAction'));
  await request(41, 'delete_categories', { categories: ['09_空分类/01_子目录', '不存在'] });
  assert.equal(reply().success, false);
  assert.equal(chat.folderActions?.length, 1);
  await request(42, 'delete_categories', { categories: ['09_空分类', '09_空分类/01_子目录'] });
  assert.equal(reply().success, true);
  assert.equal(chat.folderActions?.length, 2);
  const child = chat.folderActions?.find((item) => item.subcategory);
  assert.ok(child);
  let resume!: () => void;
  const waiting = new Promise<void>((resolve) => { resume = resolve; });
  chats.library = {
    ...library,
    deleteCategory: async (_category: unknown, subcategory: unknown) => {
      if (subcategory) {
        await waiting;
        return { trashed: 'x' };
      }
      throw Object.assign(new Error('文件夹不是空的，请先移出文献或子文件夹。'), { statusCode: 409 });
    },
  } as unknown as ChatServiceOptions['library'];
  const deciding = chats.resolveFolderActions(chat.id, 'apply', [pending.id, child.id]);
  await assert.rejects(chats.resolveFolderActions(chat.id, 'apply', [child.id]), /正在处理/);
  await request(43, 'delete_category', { category: '10_新分类' });
  const extra = chat.folderActions?.find((item) => item.category === '10_新分类');
  assert.ok(extra);
  resume();
  const result = await deciding;
  assert.deepEqual(result.applied, [child.id]);
  assert.match(result.failed[0]?.error ?? '', /文件夹不是空的/);
  assert.deepEqual(chat.folderActions?.map(({ id }) => id), [pending.id, extra.id]);
  assert.deepEqual((await chats.resolveFolderActions(chat.id, 'discard', [pending.id])).discarded, [pending.id]);
  await assert.rejects(chats.resolveFolderActions(chat.id, 'apply', ['missing']), /不存在/);
  await request(5, 'move_paper', { paperId: 'L001', category: '09_空分类' });
  assert.deepEqual(calls.at(-1), { method: 'movePaper', args: ['L001', '09_空分类'] });
  const submitted: unknown[] = [];
  const startMove = chats.jobs.startPaperMove;
  chats.jobs.startPaperMove = (items) => {
    submitted.push(items);
    return startMove(items);
  };
  await request(6, 'move_papers', { includeRelatedVersions: true, groups: [
    { category: '09_空分类', paperIds: [' l001 ', 'L002', 'L001'] },
    { category: 'papers/09_空分类/01_子目录', paperIds: ['L003'] },
  ] });
  assert.equal(reply().success, true);
  assert.match(reply().text, /move-1/);
  assert.deepEqual(submitted, [[
    { paperId: 'L001', category: 'papers/09_空分类', includeRelatedVersions: true },
    { paperId: 'L002', category: 'papers/09_空分类', includeRelatedVersions: true },
    { paperId: 'L003', category: 'papers/09_空分类/01_子目录', includeRelatedVersions: true },
  ]]);
  await request(7, 'move_papers', { groups: [
    { category: '09_空分类', paperIds: ['L001'] },
    { category: '09_空分类/01_子目录', paperIds: ['L001'] },
  ] });
  assert.match(reply().text, /两个不同的目标/);
  assert.equal(submitted.length, 1);
});

test('新增阅读工具通过桥接返回文档、目录、检索片段和页面图片', async (t) => {
  const { chats, client } = await fixture(t);
  chats.library = {
    getPaper: async (id: string) => ({ id, title: '测试论文', file: 'papers/01_测试/test.pdf' }),
    getLibrary: async () => ({ papers: [], categories: [], stats: {} }),
    safeFile: async () => '/tmp/test.pdf',
    readDocument: async (relativePath: unknown, offset: unknown = 0) => ({
      path: String(relativePath), offset: Number(offset), totalChars: 12, text: '# README\n正文', truncated: false,
    }),
    refresh: async () => {},
  } as unknown as ChatServiceOptions['library'];
  const chat = chats.create();
  await chats.send(chat.id, { text: '读一下' });
  await until(() => Boolean(chat.threadId));
  const request = (id: number, tool: string, args: Record<string, unknown>): Promise<void> => chats.serverRequest({
    id, method: 'item/tool/call', params: { threadId: chat.threadId, tool, arguments: args },
  } as ClientRequest);
  await request(1, 'read_library_doc', { path: 'README.md', offset: 0, limit: 20 });
  assert.equal(client.responses.at(-1)?.result.success, true);
  assert.match(client.responses.at(-1)?.result.contentItems[0]?.text ?? '', /README/);
  await request(2, 'paper_outline', { paperId: 'L001' });
  assert.match(client.responses.at(-1)?.result.contentItems[0]?.text ?? '', /pdf-outline/);
  await request(3, 'search_paper_text', { paperId: 'L001', query: '方法', maxHits: 3 });
  assert.match(client.responses.at(-1)?.result.contentItems[0]?.text ?? '', /方法/);
  await request(4, 'render_paper_page', { paperId: 'L001', page: 2 });
  const items = client.responses.at(-1)?.result.contentItems ?? [];
  assert.equal(items[1]?.type, 'inputImage');
  assert.equal(items[1]?.mimeType, 'image/png');
  assert.equal(items[1]?.data, Buffer.from('png').toString('base64'));
  assert.match(items[0]?.text ?? '', /totalPages/);
  await request(5, 'render_paper_page', { paperId: 'L001', page: 0 });
  assert.equal(client.responses.at(-1)?.result.success, false);
});

test('文稿草稿保存到 synthesis，并记录关联文献', async (t) => {
  const { chats, client, dir } = await fixture(t);
  chats.library = {
    getPaper: async (id: string) => ({ id, title: `论文 ${id}`, file: `papers/${id}.pdf` }),
    getLibrary: async () => ({ papers: [], categories: [], stats: {} }),
    safeFile: async () => '',
    readDocument: async () => ({ path: '', offset: 0, totalChars: 0, text: '', truncated: false }),
    refresh: async () => {},
  } as unknown as ChatServiceOptions['library'];
  const chat = chats.create();
  await chats.send(chat.id, { text: '整理综合' });
  await until(() => Boolean(chat.threadId));
  await chats.serverRequest({
    id: 10,
    method: 'item/tool/call',
    params: {
      threadId: chat.threadId,
      tool: 'draft_document',
      arguments: { target: 'synthesis', title: '跨论文 比较', content: '## 结论', paperIds: ['L001', 'L002'] },
    },
  } as ClientRequest);
  const reply = JSON.parse(client.responses.at(-1)?.result.contentItems[0]?.text ?? '{}') as {
    status: string; path: string;
  };
  assert.equal(reply.status, 'pending_confirmation');
  assert.equal(reply.path, 'synthesis/跨论文 比较.md');
  const draft = chat.noteDrafts[0] as { id: string; target?: string };
  assert.equal(draft.target, 'synthesis');
  const saved = await chats.resolveNoteDraft(draft.id, 'save');
  assert.equal('saved' in saved && saved.path, 'synthesis/跨论文 比较.md');
  const text = await fs.readFile(path.join(dir, 'synthesis', '跨论文 比较.md'), 'utf8');
  assert.match(text, /文献编号：L001、L002/);
  assert.match(text, /## 结论/);
  assert.equal(chat.noteDrafts.length, 0);
});

test('笔记草稿只在用户确认后写入 notes，且不覆盖同名文件', async (t) => {
  const { chats, client, events, dir } = await fixture(t);
  chats.library = {
    getPaper: async (id: string) => ({ id, title: '测试论文', file: 'papers/01_测试/test.pdf' }),
    getLibrary: async () => ({ papers: [], categories: [], stats: {} }),
    safeFile: async () => '',
    refresh: async () => {},
  } as unknown as ChatServiceOptions['library'];
  const chat = chats.create();
  await chats.send(chat.id, { text: '整理笔记' });
  await until(() => Boolean(chat.threadId));
  const draftCall = (id: number, content: string): Promise<void> => chats.serverRequest({
    id,
    method: 'item/tool/call',
    params: { threadId: chat.threadId, tool: 'draft_note', arguments: { paperId: 'L001', title: '测试 笔记', content } },
  } as ClientRequest);
  await draftCall(90, '## 要点\n\n第一版');
  const reply = JSON.parse(client.responses.at(-1)?.result.contentItems[0]?.text ?? '{}') as {
    status: string; path: string;
  };
  assert.equal(reply.status, 'pending_confirmation');
  assert.equal(reply.path, 'notes/L001_测试 笔记.md');
  assert.equal(chat.noteDrafts.length, 1);
  assert.equal(events.filter((e) => e.type === 'noteDraft').length, 1);
  assert.equal('noteDrafts' in (chats.list()[0] as object), false);
  await assert.rejects(fs.readFile(path.join(dir, 'notes', 'L001_测试 笔记.md')), /ENOENT/);
  const saved = await chats.resolveNoteDraft((chat.noteDrafts[0] as { id: string }).id, 'save');
  assert.equal('saved' in saved && saved.path, 'notes/L001_测试 笔记.md');
  const text = await fs.readFile(path.join(dir, 'notes', 'L001_测试 笔记.md'), 'utf8');
  assert.match(text, /文献编号：L001/);
  assert.match(text, /papers\/01_测试\/test\.pdf/);
  assert.match(text, /## 要点/);
  assert.equal(chat.noteDrafts.length, 0);
  assert.equal(events.filter((e) => e.type === 'noteDraftResolved').at(-1)?.path, 'notes/L001_测试 笔记.md');
  await draftCall(91, '第二版');
  const second = await chats.resolveNoteDraft((chat.noteDrafts[0] as { id: string }).id, 'save');
  assert.equal('saved' in second && second.path, 'notes/L001_测试 笔记 (2).md');
  assert.match(await fs.readFile(path.join(dir, 'notes', 'L001_测试 笔记.md'), 'utf8'), /第一版/);
  assert.match(await fs.readFile(path.join(dir, 'notes', 'L001_测试 笔记 (2).md'), 'utf8'), /第二版/);
  assert.equal(chat.noteDrafts.length, 0);
  await draftCall(92, '第三版');
  assert.deepEqual(await chats.resolveNoteDraft((chat.noteDrafts[0] as { id: string }).id, 'discard'), { discarded: true });
  assert.equal(chat.noteDrafts.length, 0);
  await assert.rejects(chats.resolveNoteDraft('missing', 'save'), /不存在/);
});

test('附件解析期间停止并重发，旧请求不会发送或结束新一轮', async (t) => {
  const { chats, client } = await fixture(t);
  const chat = chats.create();
  let release: ((value: unknown) => void) | undefined;
  let extracting = false;
  chats.extract = () => {
    extracting = true;
    return new Promise<unknown>((resolve) => { release = resolve; });
  };
  await chats.send(chat.id, {
    text: '旧问题',
    attachments: [{ id: 'a', name: '资料.txt', mime: 'text/plain', path: '/old.txt', size: 4 }],
  });
  await until(() => extracting);
  await chats.interrupt(chat.id);
  assert.equal(lastMessage(chat).status, 'interrupted');
  await chats.send(chat.id, { text: '新问题' });
  await until(() => client.calls.some((call) => call.method === 'turn/start'));
  (release as (value: unknown) => void)({ text: '过期附件' });
  await new Promise((resolve) => setImmediate(resolve));
  const starts = client.calls.filter((call) => call.method === 'turn/start');
  assert.equal(starts.length, 1);
  const input = starts[0]?.params?.input as Array<{ text?: string }>;
  assert.match(input[0]?.text ?? '', /新问题/);
  assert.equal(lastMessage(chat).status, 'streaming');
});

test('启动turn的请求尚未返回时，停止会等待真实turn ID再中断', async (t) => {
  const { chats, client } = await fixture(t);
  const chat = chats.create();
  let release: ((value: unknown) => void) | undefined;
  const original = client.request.bind(client);
  client.request = async <R,>(method: string, params?: Record<string, unknown>): Promise<R> => {
    if (method === 'turn/start') {
      client.calls.push({ method, params });
      return new Promise<R>((resolve) => { release = resolve as (value: unknown) => void; });
    }
    return original<R>(method, params);
  };
  await chats.send(chat.id, { text: '启动期间停止' });
  await until(() => Boolean(release));
  await chats.interrupt(chat.id);
  assert.ok(chats.active.has(chat.id));
  await assert.rejects(chats.send(chat.id, { text: '此时尚不能发新轮次' }), /尚未完成/);
  (release as (value: unknown) => void)({ turn: { id: 'starting-turn' } });
  await until(() => client.calls.some((call) => call.method === 'turn/interrupt'));
  const interrupt = client.calls.find((call) => call.method === 'turn/interrupt');
  assert.equal(interrupt?.params?.turnId, 'starting-turn');
  const notification: ClientNotification = {
    method: 'turn/completed',
    params: { threadId: chat.threadId, turn: { id: 'starting-turn', status: 'interrupted' } },
  };
  chats.notification(notification);
  assert.equal(lastMessage(chat).status, 'interrupted');
});

test('斜杠命令目录包含本地命令与技能命令，/help 与 /skills 直接回执', async (t) => {
  const { chats, events } = await fixture(t);
  const chat = chats.create();
  const names = chats.commands().map((command) => command.name);
  const catalog = await fs.readFile(path.join(path.dirname(resolvePi()), 'core', 'slash-commands.js'), 'utf8');
  const bundledNames = [...catalog.matchAll(/\{ name: "([^"]+)"/g)].map((match) => match[1]);
  assert.ok(bundledNames.length > 20, '应读取实际安装的 Pi 命令清单');
  assert.equal(new Set(names).size, names.length, '命令名称不能重复');
  for (const name of [...bundledNames, 'help', 'skills', 'mcp', 'llama', 'skill:paper-reading']) {
    assert.ok(names.includes(name as string), '缺少命令：' + name);
  }
  assert.equal(chats.commands().find((command) => command.name === 'compact')?.scope, 'chat');

  const help = await chats.command(chat.id, '/help');
  assert.equal(help.kind, 'local');
  assert.match(help.text, /\/skills/);
  assert.match(help.text, /\/compact/);
  assert.match(help.text, /\/skill:paper-reading/);
  assert.equal(lastMessage(chat).role, 'assistant');
  assert.equal(lastMessage(chat).status, 'completed');
  assert.equal(events.filter((event) => event.type === 'message').length, 1);

  const skills = await chats.command(chat.id, '/skills');
  assert.match(skills.text, /paper-reading/);
  assert.match(skills.text, /坏技能/);
  // 本地命令不进入 Pi 会话，也不消耗 user 轮次。
  assert.equal(chat.messages.length, 2);
  assert.equal(chat.threadId, null);
});

test('名称、会话信息和快捷键可在 Pi 模型未连接时执行', async (t) => {
  const { chats, client } = await fixture(t);
  const chat = chats.create({ paperIds: ['L001'] });
  chats.authenticated = false;
  client.available = false;
  assert.match((await chats.command(chat.id, '/name 阅读记录')).text, /阅读记录/);
  assert.equal(chats.get(chat.id).title, '阅读记录');
  assert.match((await chats.command(chat.id, '/session')).text, /L001/);
  assert.match((await chats.command(chat.id, '/hotkeys')).text, /Shift\+Enter/);
  assert.equal(client.calls.length, 0);
  await assert.rejects(chats.command(chat.id, '/share'), /斜杠命令菜单/);
});

test('未知命令、非斜杠输入与非命令会话的 /compact 明确报错', async (t) => {
  const { chats, client } = await fixture(t);
  const chat = chats.create();
  await assert.rejects(chats.command(chat.id, '/missing'), /未知命令/);
  await assert.rejects(chats.command(chat.id, '普通问题'), /以斜杠开头/);
  await assert.rejects(chats.command(chat.id, '/compact'), /还没有上下文/);
  assert.equal(chat.messages.length, 0);
  assert.equal(client.calls.some((call) => call.method === 'turn/start'), false);
});

test('技能命令携带当前选中文献与阅读位置，并写回会话记录', async (t) => {
  const { chats, client } = await fixture(t);
  chats.library = {
    getPaper: async (id: string) => ({ id, title: 'emotion2vec', file: `papers/01/${id}.pdf`, pages: 14 }),
    getLibrary: async () => ({ papers: [], categories: [], stats: {} }),
    safeFile: async () => '',
    refresh: async () => {},
  } as unknown as ChatServiceOptions['library'];
  const chat = chats.create();
  await chats.command(chat.id, '/skill:paper-reading 看看当前这篇', {
    paperIds: ['L028'], activePaperId: 'L028', pdfPage: 3,
  });
  await until(() => client.calls.some((call) => call.method === 'turn/start'));
  const prompt = (client.calls.find((call) => call.method === 'turn/start')?.params as {
    input: Array<{ text?: string }>;
  }).input[0]?.text ?? '';
  // 之前命令通道丢掉 paperIds，模型只会看到空列表。
  assert.match(prompt, /"文献编号":"L028"/);
  assert.match(prompt, /"当前打开":true/);
  assert.match(prompt, /"阅读页":3/);
  assert.match(prompt, /"页数":14/);
  assert.match(prompt, /阅读器当前打开 L028 第 3 页/);
  assert.match(prompt, /<skill name="paper-reading">/);
  assert.deepEqual(chat.paperIds, ['L028']);
});

test('命令未带 paperIds 时保留选中范围，显式空数组清空且非法项被过滤', async (t) => {
  const { chats, client } = await fixture(t);
  const chat = chats.create({ paperIds: ['L001'] });
  await chats.command(chat.id, '/help');
  assert.deepEqual(chat.paperIds, ['L001']);
  await chats.command(chat.id, '/help', { paperIds: [] });
  assert.deepEqual(chat.paperIds, []);
  await chats.command(chat.id, '/help', { paperIds: ['L002', 'x9', 'L003', 'L004', 'L005', 'L006', 'L007', 'L008'] });
  assert.deepEqual(chat.paperIds, ['L002', 'L003', 'L004', 'L005', 'L006', 'L007']);
  // 非法阅读位置按缺失处理，不报错、也不写进提示。
  chats.authenticated = true;
  await chats.send(chat.id, { text: '问题', paperIds: ['L002'], activePaperId: 'bad', pdfPage: 0 });
  await until(() => client.calls.some((call) => call.method === 'turn/start'));
  const prompt = (client.calls.find((call) => call.method === 'turn/start')?.params as {
    input: Array<{ text?: string }>;
  }).input[0]?.text ?? '';
  assert.doesNotMatch(prompt, /阅读器当前打开/);
});

test('技能命令作为用户回合发送展开后的技能说明，界面保留单行指令', async (t) => {
  const { chats, client, dir } = await fixture(t);
  const chat = chats.create();
  const result = await chats.command(chat.id, '/skill:paper-reading 只看第 3 节');
  assert.equal(result.kind, 'skill');
  await until(() => client.calls.some((call) => call.method === 'turn/start'));
  const turn = client.calls.find((call) => call.method === 'turn/start')?.params as {
    input: Array<{ type: string; text?: string }>;
  };
  const prompt = turn.input[0]?.text ?? '';
  assert.match(prompt, /<skill name="paper-reading">/);
  assert.match(prompt, /# 精读步骤/);
  assert.match(prompt, /只看第 3 节/);
  const user = chat.messages.find((message) => message.role === 'user');
  assert.equal(user?.text, '/skill:paper-reading 只看第 3 节');
  // 保存的聊天记录只留可见指令，不落展开后的技能正文。
  const saved = JSON.parse(await fs.readFile(chats.store.fileFor(chat.id), 'utf8')) as ChatRecord;
  assert.equal(saved.chat.messages[0]?.text, '/skill:paper-reading 只看第 3 节');
});

test('已开始回答时拒绝命令，避免与流式回合交错', async (t) => {
  const { chats } = await fixture(t);
  const chat = chats.create();
  await chats.send(chat.id, { text: '问题' });
  await until(() => Boolean(chat.threadId));
  await assert.rejects(chats.command(chat.id, '/help'), /尚未完成/);
  chats.notification({ method: 'turn/completed', params: { threadId: chat.threadId, turn: { status: 'completed' } } });
  assert.equal((await chats.command(chat.id, '/help')).kind, 'local');
});

test('/compact 调用会话压缩并回执 token 变化', async (t) => {
  const { chats } = await fixture(t);
  const chat = chats.create();
  await chats.send(chat.id, { text: '问题' });
  await until(() => Boolean(chat.threadId));
  chats.notification({ method: 'turn/completed', params: { threadId: chat.threadId, turn: { status: 'completed' } } });
  const result = await chats.command(chat.id, '/compact 保留方法部分');
  assert.equal(result.kind, 'local');
  assert.match(result.text, /上下文已压缩/);
  assert.match(result.text, /4000/);
  assert.match(result.text, /1200/);
});

test('中文译本读取工具通过宿主回调返回分段结果，未注入时明确报错', async (t) => {
  const { chats, client } = await fixture(t);
  chats.library = {
    getPaper: async (id: string) => id === 'L404' ? null : ({ id, title: '译论文', file: `papers/01_测试/${id}.pdf` }),
    getLibrary: async () => ({ papers: [], categories: [], stats: {} }),
    safeFile: async () => '',
    refresh: async () => {},
  } as unknown as ChatServiceOptions['library'];
  const calls: Array<{ paperId: string; offset?: number; limit?: number }> = [];
  chats.readPaperTranslation = async (paperId: string, offset?: number, limit?: number) => {
    calls.push({ paperId, offset, limit });
    return { paperId, available: true, offset, totalChars: 6, text: '中文译本', truncated: false };
  };
  const chat = chats.create();
  await chats.send(chat.id, { text: '读译文' });
  await until(() => Boolean(chat.threadId));
  const request = (id: number, tool: string, args: Record<string, unknown>): Promise<void> => chats.serverRequest({
    id, method: 'item/tool/call', params: { threadId: chat.threadId, tool, arguments: args },
  } as ClientRequest);
  await request(1, 'read_paper_translation', { paperId: 'L001', offset: 10, limit: 500 });
  assert.deepEqual(calls.at(-1), { paperId: 'L001', offset: 10, limit: 500 });
  assert.match(client.responses.at(-1)?.result.contentItems[0]?.text ?? '', /中文译本/);
  await request(2, 'read_paper_translation', { paperId: 'L404' });
  assert.equal(client.responses.at(-1)?.result.success, false);
  assert.match(client.responses.at(-1)?.result.contentItems[0]?.text ?? '', /文献不存在/);
});

test('未注入译文回调时 read_paper_translation 明确报错', async (t) => {
  const { chats, client } = await fixture(t);
  chats.library = {
    getPaper: async (id: string) => ({ id, title: '译论文', file: `papers/01_测试/${id}.pdf` }),
    getLibrary: async () => ({ papers: [], categories: [], stats: {} }),
    safeFile: async () => '',
    refresh: async () => {},
  } as unknown as ChatServiceOptions['library'];
  const chat = chats.create();
  await chats.send(chat.id, { text: '读译文' });
  await until(() => Boolean(chat.threadId));
  await chats.serverRequest({
    id: 1, method: 'item/tool/call',
    params: { threadId: chat.threadId, tool: 'read_paper_translation', arguments: { paperId: 'L001' } },
  } as ClientRequest);
  assert.equal(client.responses.at(-1)?.result.success, false);
  assert.match(client.responses.at(-1)?.result.contentItems[0]?.text ?? '', /未启用中文译本读取/);
});

const classifyLibrary = (calls: Array<{ method: string; args: unknown[] }>): ChatServiceOptions['library'] => ({
  getPaper: async (id: string) => id === 'L404' ? null : ({
    id, title: `Paper ${id}`, titleZh: `论文 ${id}`, file: `papers/01_综述/${id}.pdf`,
    authors: [], category: '01_综述', subcategory: '', notes: [],
  }),
  getLibrary: async () => ({
    papers: [], stats: {},
    categories: [
      { id: '01_综述', name: '01_综述', count: 1, children: [{ id: '01_综述/01_语音', name: '01_语音', count: 0 }] },
      { id: '02_方法', name: '02_方法', count: 0, children: [] },
    ],
  }),
  safeFile: async () => '',
  readDocument: async () => ({ path: '', offset: 0, totalChars: 0, text: '', truncated: false }),
  refresh: () => {},
  createCategory: async (name: unknown, parent: unknown) => {
    calls.push({ method: 'createCategory', args: [name, parent] });
    if (name === '冲突') throw Object.assign(new Error('同名文件夹已存在。'), { statusCode: 409 });
    return parent
      ? { category: String(parent), subcategory: `01_${String(name)}` }
      : { category: `03_${String(name)}`, subcategory: '' };
  },
  resolveCategory: async (value: unknown) => ({
    category: String(value).replace(/^papers\//, '').split('/')[0] as string,
    subcategory: String(value).split('/')[1] ?? '',
    path: String(value).startsWith('papers/') ? String(value) : `papers/${String(value)}`,
  }),
  movePaper: async (paperId: unknown, category: unknown) => {
    calls.push({ method: 'movePaper', args: [paperId, category] });
    if (paperId === 'L009') throw Object.assign(new Error('目标同名文件已存在。'), { statusCode: 409 });
    return { literature_id: paperId, category };
  },
} as unknown as ChatServiceOptions['library']);

test('归类提案匹配已有目录或标记待新建，确认后去重创建并提交一次整批移动', async (t) => {
  const { chats, client, events, dir, classificationBatches } = await fixture(t);
  const calls: Array<{ method: string; args: unknown[] }> = [];
  chats.library = classifyLibrary(calls);
  const chat = chats.create();
  await chats.send(chat.id, { text: '整理' });
  await until(() => Boolean(chat.threadId));
  const request = (id: number, tool: string, args: Record<string, unknown>): Promise<void> => chats.serverRequest({
    id, method: 'item/tool/call', params: { threadId: chat.threadId, tool, arguments: args },
  } as ClientRequest);
  const reply = (): { status?: string; message?: string; items?: unknown[] } =>
    JSON.parse(client.responses.at(-1)?.result.contentItems[0]?.text ?? '{}');

  await request(1, 'propose_paper_classification', {
    items: [
      { paperId: 'L001', category: '02_方法', basis: 'notes', reason: '笔记显示方法相同' },
      { paperId: 'L002', category: '综述', subcategory: '语音', basis: 'translation', reason: '译文主题为语音' },
      { paperId: 'L003', category: '新领域', subcategory: '子方向', basis: 'notes+translation', reason: '新材料' },
    ],
  });
  assert.equal(reply().status, 'pending_confirmation');
  assert.equal(chat.classifyProposals?.length, 3);
  const [existing, matched, fresh] = chat.classifyProposals ?? [];
  assert.equal(existing?.targetPath, 'papers/02_方法');
  assert.equal(existing?.fromPath, 'papers/01_综述');
  assert.equal(existing?.willCreateCategory, false);
  assert.equal(matched?.targetPath, 'papers/01_综述/01_语音');
  assert.equal(matched?.willCreateSubcategory, false);
  assert.equal(matched?.willCreateCategory, false);
  assert.equal(fresh?.willCreateCategory, true);
  assert.equal(fresh?.willCreateSubcategory, true);
  assert.equal(fresh?.targetPath, 'papers/新领域/子方向');
  assert.equal(calls.length, 0, '提案阶段不能创建目录或移动文献');
  assert.equal(events.filter((event) => event.type === 'classifyProposal').length, 3);
  assert.equal((chats.list()[0] as { classifyProposals?: unknown }).classifyProposals, undefined);

  // 同一篇文献再次提案时替换，不叠加重复行。
  await request(2, 'propose_paper_classification', {
    items: [{ paperId: 'L003', category: '02_方法', basis: 'pdf', reason: '读首页后改为方法' }],
  });
  assert.equal(chat.classifyProposals?.length, 3);
  assert.equal(chat.classifyProposals?.filter((item) => item.paperId === 'L003').length, 1);
  assert.equal(chat.classifyProposals?.find((item) => item.paperId === 'L003')?.basis, 'pdf');
  // 替换会生成新提案行，后续只能引用替换后的那条。
  const replaced = chat.classifyProposals?.find((item) => item.paperId === 'L003');
  assert.ok(replaced);

  // 非法依据、重复编号、非法名称与空理由都拒绝，且不改动已有提案。
  const before = chat.classifyProposals?.map(({ id }) => id);
  for (const items of [
    [{ paperId: 'L004', category: '02_方法', basis: 'guess', reason: '理由' }],
    [
      { paperId: 'L004', category: '02_方法', basis: 'notes', reason: '理由' },
      { paperId: 'L004', category: '02_方法', basis: 'notes', reason: '理由' },
    ],
    [{ paperId: 'L004', category: 'a/b', basis: 'notes', reason: '理由' }],
    [{ paperId: 'L004', category: 'CON', basis: 'notes', reason: '理由' }],
    [{ paperId: 'L004', category: '02_方法', basis: 'notes', reason: '' }],
    [{ paperId: 'L404', category: '02_方法', basis: 'notes', reason: '理由' }],
  ]) {
    await request(3, 'propose_paper_classification', { items });
    assert.equal(client.responses.at(-1)?.result.success, false);
  }
  assert.deepEqual(chat.classifyProposals?.map(({ id }) => id), before);

  // 取消丢弃指定提案，并留下明确的取消回执。
  const discarded = await chats.resolveClassifyProposals(chat.id, 'discard', [replaced.id]);
  assert.ok('discarded' in discarded);
  assert.deepEqual(discarded.discarded, [replaced.id]);
  assert.match(discarded.message?.text ?? '', /已取消 L003 的归类请求/);
  assert.match(discarded.message?.text ?? '', /未新建文件夹或移动论文/);
  assert.equal(chat.classifyProposals?.length, 2);

  // 确认：已有目录直接移动，缺失顶层与子分类先创建再移动。
  await request(4, 'propose_paper_classification', {
    items: [
      { paperId: 'L004', category: '新领域', subcategory: '子方向', basis: 'notes', reason: '新材料' },
      { paperId: 'L005', category: '新领域', subcategory: '另一方向', basis: 'notes', reason: '另一材料' },
    ],
  });
  const pending = (chat.classifyProposals ?? []).filter((item) =>
    item.paperId === 'L004' || item.paperId === 'L005');
  assert.equal(pending.length, 2);
  const applied = await applyClassifications(chats, chat.id, [
    existing.id, matched.id, ...pending.map(({ id }) => id),
  ]);
  assert.deepEqual(applied.failed, []);
  assert.equal(applied.applied.length, 4);
  assert.deepEqual(calls.filter((call) => call.method === 'createCategory').map(({ args }) => args), [
    ['新领域', undefined],
    ['子方向', '03_新领域'],
    ['另一方向', '03_新领域'],
  ]);
  assert.equal(classificationBatches.length, 1);
  assert.deepEqual(classificationBatches[0]?.map(({ paperId, category }) => [paperId, category]), [
    ['L001', 'papers/02_方法'],
    ['L002', 'papers/01_综述/01_语音'],
    ['L004', 'papers/03_新领域/01_子方向'],
    ['L005', 'papers/03_新领域/01_另一方向'],
  ]);
  assert.deepEqual(chat.classifyProposals, []);
  assert.ok(events.some((event) => event.type === 'classifyRun' &&
    (event.run as { status?: string }).status === 'completed'));
  assert.ok(events.some((event) => event.type === 'library'));
  const receipt = applied.message;
  assert.ok(receipt);
  assert.equal(receipt.role, 'system');
  assert.equal(receipt.status, 'completed');
  assert.equal((receipt.text.match(/已新建文件夹：`papers\/03_新领域`/g) ?? []).length, 1);
  assert.match(receipt.text, /L001 已移动至 `papers\/02_方法`/);
  assert.match(receipt.text, /L004 已移动至 `papers\/03_新领域\/01_子方向`/);
  assert.match(receipt.text, /L005 已移动至 `papers\/03_新领域\/01_另一方向`/);
  assert.equal(chat.messages.at(-1)?.id, receipt.id);
  assert.ok(events.some((event) => event.type === 'message' &&
    (event.message as ChatMessage | undefined)?.id === receipt.id));
  const saved = JSON.parse(await fs.readFile(chats.store.fileFor(chat.id), 'utf8')) as ChatRecord;
  assert.equal(saved.chat.messages.at(-1)?.text, receipt.text);
  await assert.rejects(chats.resolveClassifyProposals(chat.id, 'apply', [existing.id], 'reapply'), /不存在/);

  // 用户下一次提问时，即使 SDK 历史还停在 pending_confirmation，也会补入界面执行结果。
  chats.finish(chat.id, 'completed');
  const turnsBefore = client.calls.filter(({ method }) => method === 'turn/start').length;
  await chats.send(chat.id, { text: '已经新建了吗？' });
  await until(() => client.calls.filter(({ method }) => method === 'turn/start').length > turnsBefore);
  const followUp = client.calls.filter(({ method }) => method === 'turn/start').at(-1)?.params as {
    input: Array<{ type: string; text?: string }>;
  };
  assert.match(followUp.input[0]?.text ?? '', /界面操作结果/);
  assert.ok(followUp.input[0]?.text?.includes(receipt.text));
  assert.ok(followUp.input[0]?.text?.includes(discarded.message?.text ?? ''));
});

test('分批操作回执完整同步，失败后重送且完成后跨重启保留同步位置', async (t) => {
  const { chats, client, dir } = await fixture(t);
  const chat = chats.create();
  const receipt = (id: string, text: string): ChatMessage => ({
    id, role: 'system', text, status: 'completed', createdAt: new Date().toISOString(),
  });
  chat.messages.push(receipt('applied', 'L001 已归类至 papers/02_方法。'), receipt('discarded', '已取消 L002。'));
  const prompt = async (): Promise<string> => {
    const turnsBefore = client.calls.filter(({ method }) => method === 'turn/start').length;
    await chats.send(chat.id, { text: '处理结果是什么？' });
    await until(() => client.calls.filter(({ method }) => method === 'turn/start').length > turnsBefore);
    const turn = client.calls.filter(({ method }) => method === 'turn/start').at(-1)?.params as {
      input: Array<{ text?: string }>;
    };
    return turn.input[0]?.text ?? '';
  };
  const first = await prompt();
  assert.match(first, /L001 已归类至/);
  assert.match(first, /已取消 L002/);
  // 回合开始后又处理的提案，留给下一轮同步。
  chat.messages.push(receipt('failed', 'L003 归类未完成：目标不可写。'));
  chats.finish(chat.id, 'completed');
  assert.equal(chat.lastContextOperationId, 'discarded');
  const second = await prompt();
  assert.match(second, /L003 归类未完成/);
  assert.doesNotMatch(second, /L001 已归类至|已取消 L002/);
  chats.finish(chat.id, 'failed', '模型服务暂不可用。');
  assert.equal(chat.lastContextOperationId, 'discarded');
  assert.match(await prompt(), /L003 归类未完成/);
  chats.finish(chat.id, 'completed');
  const saved = JSON.parse(await fs.readFile(chats.store.fileFor(chat.id), 'utf8')) as ChatRecord;
  assert.equal(saved.chat.lastContextOperationId, 'failed');
  assert.doesNotMatch(await prompt(), /界面操作结果/);
});

test('归类执行失败时保留该行并写回原因，冲突目录重新解析复用', async (t) => {
  const { chats, client, events, classificationBatches } = await fixture(t);
  const calls: Array<{ method: string; args: unknown[] }> = [];
  chats.library = classifyLibrary(calls);
  const chat = chats.create();
  await chats.send(chat.id, { text: '整理' });
  await until(() => Boolean(chat.threadId));
  const request = (id: number, args: Record<string, unknown>): Promise<void> => chats.serverRequest({
    id, method: 'item/tool/call',
    params: { threadId: chat.threadId, tool: 'propose_paper_classification', arguments: args },
  } as ClientRequest);
  await request(1, {
    items: [
      { paperId: 'L009', category: '新领域', basis: 'notes', reason: '会失败' },
      { paperId: 'L010', category: '02_方法', basis: 'notes', reason: '会成功' },
    ],
  });
  const [failing, passing] = (chat.classifyProposals ?? []).map(({ id }) => id);
  const result = await applyClassifications(chats, chat.id, [failing, passing]);
  assert.deepEqual(result.applied, [passing]);
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0]?.paperId, 'L009');
  assert.match(result.failed[0]?.error ?? '', /同名文件/);
  assert.deepEqual(chat.classifyProposals?.map(({ id }) => id), [failing]);
  assert.match(chat.classifyProposals?.[0]?.error ?? '', /同名文件/);
  assert.match(result.message?.text ?? '', /已新建文件夹：`papers\/03_新领域`/);
  assert.match(result.message?.text ?? '', /L009 归类未完成：目标同名文件已存在/);
  assert.match(result.message?.text ?? '', /L010 已移动至 `papers\/02_方法`/);
  assert.doesNotMatch(result.message?.text ?? '', /L009 已移动至/);
  assert.ok(events.some((event) => event.type === 'classifyRun' &&
    (event.proposals as Array<{ error?: string }>).some(({ error }) => error)));

  // 并发建目录返回 409 时重新解析已有目录，不重复创建。
  const conflictCalls: Array<{ method: string; args: unknown[] }> = [];
  chats.library = {
    ...classifyLibrary(conflictCalls),
    getLibrary: async () => ({
      papers: [], stats: {},
      categories: [{ id: '05_冲突', name: '05_冲突', count: 0, children: [] }],
    }),
  } as unknown as ChatServiceOptions['library'];
  await request(2, { items: [{ paperId: 'L011', category: '冲突', basis: 'notes', reason: '并发已存在' }] });
  const concurrent = (chat.classifyProposals ?? []).find((item) => item.paperId === 'L011')?.id as string;
  const reused = await applyClassifications(chats, chat.id, [concurrent]);
  assert.deepEqual(reused.failed, []);
  assert.deepEqual(classificationBatches.at(-1)?.map(({ paperId, category }) => [paperId, category]), [
    ['L011', 'papers/05_冲突'],
  ]);

  // 防重入与非法参数。
  chats.resolvingClassifications.add(chat.id);
  await assert.rejects(chats.resolveClassifyProposals(chat.id, 'apply', [failing], 'busy'), /正在处理/);
  chats.resolvingClassifications.delete(chat.id);
  await assert.rejects(chats.resolveClassifyProposals(chat.id, 'apply', ['missing'], 'missing'), /不存在/);
  await assert.rejects(chats.resolveClassifyProposals(chat.id, 'delete', [failing]), /确认或取消/);
  await assert.rejects(chats.resolveClassifyProposals(chat.id, 'apply', []), /请选择/);
});

test('归类提案在会话记录中持久化，归档会话拒绝执行', async (t) => {
  const { chats } = await fixture(t);
  chats.library = classifyLibrary([]);
  const chat = chats.create();
  // 比较副本而不直接传入属性，避免严格断言模式把属性收窄成空数组类型。
  assert.deepEqual([...(chat.classifyProposals ?? [])], []);
  await chats.send(chat.id, { text: '整理' });
  await until(() => Boolean(chat.threadId));
  await chats.serverRequest({
    id: 1, method: 'item/tool/call',
    params: {
      threadId: chat.threadId, tool: 'propose_paper_classification',
      arguments: { items: [{ paperId: 'L001', category: '02_方法', basis: 'notes', reason: '笔记相同' }] },
    },
  } as ClientRequest);
  const proposal = chat.classifyProposals?.[0];
  assert.ok(proposal);
  chats.finish(chat.id, 'completed');
  chats.changeHistory(chat.id, 'archived');
  await assert.rejects(chats.resolveClassifyProposals(chat.id, 'discard', [proposal.id]), /归档/);
});
