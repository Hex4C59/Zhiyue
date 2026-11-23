import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ChatService } from '../src/lib/chat.js';
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
}

async function fixture(t: test.TestContext): Promise<Fixture> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'literature-chat-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const client = new FakeAgent();
  const events: ChatEvent[] = [];
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
      getJob: () => ({ id: 'job-1' }),
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
  return { chats, client, events, dir };
}

const until = async (predicate: () => boolean): Promise<void> => {
  for (let index = 0; index < 40; index++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('condition timeout');
};

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
  assert.equal((client.calls[0]?.params?.dynamicTools as unknown[]).length, 12);
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
  const saved = JSON.parse(await fs.readFile(path.join(dir, 'chats.json'), 'utf8')) as {
    chats: Array<{ messages: ChatMessage[] }>;
  };
  assert.equal(saved.chats[0]?.messages.at(-1)?.text, '第一段\n\n第二段');
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
  const saved = JSON.parse(await fs.readFile(path.join(dir, 'chats.json'), 'utf8')) as {
    chats: Array<{ messages: ChatMessage[] }>;
  };
  assert.equal(saved.chats[0]?.messages.at(-1)?.thinking, '先看目录\n\n再核对\n\n补录的推理');
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
  const saved = JSON.parse(await fs.readFile(path.join(dir, 'chats.json'), 'utf8')) as {
    chats: Array<{ messages: ChatMessage[] }>;
  };
  assert.equal(saved.chats[0]?.messages[0]?.text, '/skill:paper-reading 只看第 3 节');
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
