import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ChatService } from '../src/lib/chat.js';
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
  contentItems: Array<{ type: string; text: string }>;
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
  const options = {
    root: dir,
    stateDir: dir,
    library: {
      getPaper: async () => null,
      getLibrary: async () => ({ papers: [], categories: [], stats: {} }),
      safeFile: async () => '',
      refresh: async () => {},
    },
    jobs: {
      startDownload: async (input: unknown) => ({ id: 'job-1', status: 'queued', input }),
      startAction: async () => ({ id: 'job-1' }),
      getJob: () => ({ id: 'job-1' }),
    },
    emit: (event: ChatEvent) => events.push(structuredClone(event)),
    extract: async () => ({ text: '文件内容' }),
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
  assert.equal((client.calls[0]?.params?.dynamicTools as unknown[]).length, 6);
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
  await request(88, 'item/tool/call', { threadId: chat.threadId, tool: 'download_papers', arguments: { input: '10.1234/example' } });
  assert.equal(client.responses.at(-1)?.result.success, true);
  assert.match(client.responses.at(-1)?.result.contentItems[0]?.text ?? '', /queued/);
  await request(89, 'item/commandExecution/requestApproval', { threadId: chat.threadId, command: 'a command' });
  assert.equal(client.responses.length, 1);
  const approval = events.find((event) => event.type === 'approval') as unknown as { approval: { id: string } };
  chats.approve(approval.approval.id, { decision: 'decline' });
  assert.equal(client.responses.at(-1)?.result.decision, 'decline');
  assert.throws(() => chats.approve(approval.approval.id, { decision: 'accept' }));
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
