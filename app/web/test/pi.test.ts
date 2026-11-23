import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PiClient, resolvePi } from '../src/lib/pi.js';
import type { PiSdk, PiSettings } from '../src/lib/pi.js';
import { AssistantService } from '../src/lib/assistants.js';
import { createApp } from '../src/server.js';
import type { ChatEvent } from '../src/lib/chat.js';
import type { ChatServiceOptions } from '../src/lib/chat.js';

const wait = async (predicate: () => boolean): Promise<void> => {
  for (let n = 0; n < 200; n++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('condition timeout');
};

interface MockModel {
  id: string;
  provider: string;
  name: string;
  input: string[];
  reasoning: boolean;
  thinkingLevelMap?: Record<string, string>;
}

interface MockSettings {
  defaultProvider?: string;
  defaultModel?: string;
  defaultThinkingLevel?: string;
  modelThinkingLevels: Record<string, string>;
  compaction: { enabled: boolean; reserveTokens: number; keepRecentTokens: number };
}

interface MockCredential {
  providerId: string;
  type: string;
  key?: string;
}

interface MockToolReply {
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
}

interface MockMemoryManager {
  getSettings(): Record<string, unknown>;
  applyOverrides(overrides: Record<string, unknown>): void;
}

interface MockSessionOptions {
  customTools: Array<{
    name: string;
    execute(callId: string, args: Record<string, unknown>, signal: AbortSignal): Promise<MockToolReply>;
  }>;
  settingsManager: MockMemoryManager;
  resourceLoader: { getSystemPrompt(): string };
  tools: string[];
}

interface MockSession {
  model: MockModel;
  options: MockSessionOptions;
  thinkingLevel: string;
  thinkingOptions?: unknown;
  lastPrompt?: { text: string; images?: Array<{ data: string }>; expandPromptTemplates?: boolean };
  compaction?: string;
  toolReply?: MockToolReply;
  subscribe(listener: (event: Record<string, unknown>) => void): () => void;
  setModel(model: MockModel, options?: { persist?: boolean }): Promise<void>;
  setThinkingLevel(level: string, options?: { persist?: boolean }): void;
  getAvailableThinkingLevels(): string[];
  prompt(text: string, options?: { images?: unknown[]; expandPromptTemplates?: boolean }): Promise<void>;
  abort(): Promise<void>;
  dispose(): void;
  compact?(instructions?: string): Promise<{ tokensBefore: number; estimatedTokensAfter?: number }>;
}

interface MockSdk {
  created: MockSession[];
  models: MockModel[];
  credentials: Map<string, MockCredential>;
  settings: MockSettings;
  sessionManagers: MockMemoryManager[];
}

function mockSDK(agentDir: string): MockSdk {
  const models: MockModel[] = [
    { id: 'test-model', provider: 'test', name: 'Test', input: ['text', 'image'], reasoning: true, thinkingLevelMap: { medium: 'medium', high: 'high' } },
    { id: 'backup-model', provider: 'test', name: 'Backup', input: ['text'], reasoning: false },
  ];
  const created: MockSession[] = [];
  const sessionManagers: MockMemoryManager[] = [];
  let hold: (() => void) | undefined;
  const credentials = new Map<string, MockCredential>([
    ['test', { providerId: 'test', type: 'api_key' }],
    ['oauth', { providerId: 'oauth', type: 'oauth' }],
  ]);
  const settings: MockSettings = {
    defaultProvider: 'test', defaultModel: 'test-model', defaultThinkingLevel: 'medium', modelThinkingLevels: {},
    compaction: { enabled: true, reserveTokens: 20000, keepRecentTokens: 30000 },
  };
  const providers = [
    { id: 'test', name: 'Test Provider', auth: { apiKey: {} } },
    { id: 'oauth', name: 'OAuth Provider', auth: { oauth: {} } },
    { id: 'other', name: 'Other Provider', auth: { apiKey: {} } },
  ];
  const runtime = {
    getAvailable: async () => models.filter((model) => credentials.has(model.provider)),
    settleCredentialWrites: async () => {},
    getProviders: () => providers,
    getProvider: (id: string) => providers.find((provider) => provider.id === id),
    getProviderAuthStatus: (id: string) => (credentials.has(id) ? { configured: true, source: 'stored' } : { configured: false }),
    listCredentials: async () => [...credentials.values()],
    login: async (id: string, type: string, interaction: { prompt(input: { type: string; message?: string }): Promise<string> }) => {
      const key = await interaction.prompt({ type: 'secret', message: 'Enter API key' });
      credentials.set(id, { providerId: id, type, key });
    },
    logout: async (id: string) => { credentials.delete(id); },
  };
  const settingsManager = {
    getGlobalSettings: () => ({ ...settings }),
    setDefaultModelAndProvider: (provider: string, model: string) => {
      settings.defaultProvider = provider;
      settings.defaultModel = model;
    },
    getDefaultThinkingLevel: () => settings.defaultThinkingLevel,
    setDefaultThinkingLevel: (level: string) => { settings.defaultThinkingLevel = level; },
    getModelThinkingLevel: (provider: string, id: string) => settings.modelThinkingLevels[`${provider}/${id}`],
    getAllModelThinkingLevels: () => ({ ...settings.modelThinkingLevels }),
    setModelThinkingLevel: (provider: string, id: string, level: string) => {
      settings.modelThinkingLevels[`${provider}/${id}`] = level;
    },
    removeModelThinkingLevel: (provider: string, id: string) => {
      delete settings.modelThinkingLevels[`${provider}/${id}`];
    },
    getCompactionSettings: () => ({ ...settings.compaction }),
    getCompactionEnabled: () => settings.compaction.enabled,
    setCompactionEnabled: (enabled: boolean) => { settings.compaction.enabled = enabled; },
    reload: async () => {
      const file = path.join(agentDir, 'settings.json');
      if (fs.existsSync(file)) Object.assign(settings, JSON.parse(fs.readFileSync(file, 'utf8')) as MockSettings);
    },
  };
  const sdk = {
    created, models, credentials, settings, sessionManagers,
    ModelRuntime: { create: async () => runtime },
    SettingsManager: {
      create: () => settingsManager,
      inMemory: (x: Record<string, unknown>): MockMemoryManager => {
        const manager: MockMemoryManager = { getSettings: () => ({ ...x }), applyOverrides: (overrides) => Object.assign(x, overrides) };
        sessionManagers.push(manager);
        return manager;
      },
    },
    createExtensionRuntime: () => ({}),
    SessionManager: {
      create: (_cwd: string, dir: string) => {
        const file = path.join(dir, `${randomUUID()}.jsonl`);
        fs.writeFileSync(file, '{}');
        return { getSessionFile: () => file };
      },
      open: (file: string) => ({ getSessionFile: () => file }),
    },
    createAgentSession: async (options: MockSessionOptions) => {
      let listener: ((event: Record<string, unknown>) => void) | undefined;
      const session: MockSession = {
        model: models[0] as MockModel,
        options,
        thinkingLevel: 'medium',
        subscribe: (fn) => {
          listener = fn;
          return () => { listener = undefined; };
        },
        setModel: async () => {},
        setThinkingLevel: (level, levelOptions) => {
          session.thinkingLevel = level;
          session.thinkingOptions = levelOptions;
        },
        getAvailableThinkingLevels: () => (session.model.reasoning ? ['off', 'minimal', 'low', 'medium', 'high'] : ['off']),
        prompt: async (text, promptOptions) => {
          session.lastPrompt = { text, ...promptOptions, images: promptOptions?.images as Array<{ data: string }> | undefined };
          if (text.includes('等待停止')) {
            await new Promise<void>((resolve) => { hold = resolve; });
            return;
          }
          const tool = options.customTools.find((item) => item.name === 'library_search');
          session.toolReply = await (tool as NonNullable<typeof tool>).execute('call-1', { query: 'L001' }, new AbortController().signal);
          listener?.({ type: 'message_start', message: { role: 'assistant' } });
          for (const delta of ['先核对', '再回答']) {
            listener?.({ type: 'message_update', assistantMessageEvent: { type: 'thinking_delta', delta } });
          }
          for (const delta of ['Pi', '已连接']) {
            listener?.({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta } });
          }
          listener?.({
            type: 'message_end',
            message: {
              role: 'assistant', stopReason: 'stop',
              content: [{ type: 'thinking', thinking: '先核对再回答' }, { type: 'text', text: 'Pi已连接' }],
            },
          });
        },
        abort: async () => { hold?.(); },
        compact: async (instructions?: string) => {
          session.compaction = instructions ?? '';
          return { tokensBefore: 5000, estimatedTokensAfter: 1500 };
        },
        dispose: () => { hold?.(); },
      };
      created.push(session);
      return { session };
    },
  };
  return sdk as unknown as MockSdk;
}

interface Fixture {
  chats: AssistantService;
  pi: PiClient;
  sdk: MockSdk;
  dir: string;
  events: ChatEvent[];
  options: ConstructorParameters<typeof AssistantService>[0];
  agentDir: string;
}

function fixture(t: test.TestContext): Fixture {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'literature-pi-test-'));
  const agentDir = path.join(dir, 'pi-agent');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const sdk = mockSDK(agentDir);
  const events: ChatEvent[] = [];
  const pi = new PiClient({ root: dir, stateDir: dir, sdk: sdk as unknown as PiSdk, agentDir });
  const options = {
    root: dir,
    stateDir: dir,
    piClient: pi,
    emit: (event: ChatEvent) => events.push(structuredClone(event)),
    library: {
      getPaper: async () => null,
      getLibrary: async () => ({ papers: [{ literature_id: 'L001', title: 'Test paper', authors: [] }], categories: [], stats: {} }),
      safeFile: async () => '',
      refresh: async () => {},
    },
    jobs: {},
    extract: async () => ({ text: '附件内容' }),
    renderPage: async () => ({ data: 'cG5n', mimeType: 'image/png', totalPages: 1, page: 1 }),
  } as unknown as ConstructorParameters<typeof AssistantService>[0];
  const chats = new AssistantService(options);
  t.after(() => chats.client.close());
  return { chats, pi, sdk, dir, events, options, agentDir };
}

const lastMessage = (chats: AssistantService, id: string) => {
  const message = chats.get(id).messages.at(-1);
  if (!message) throw new Error('missing message');
  return message;
};

test('Pi 复用流式消息、附件和文献工具', async (t) => {
  const { chats, pi, sdk, dir, events } = fixture(t);
  await chats.connect();
  const chat = chats.create();
  const image = path.join(dir, 'test.png');
  fs.writeFileSync(image, 'test-image');
  await chats.send(chat.id, {
    text: '请解释附件',
    model: 'test/test-model',
    attachments: [
      { id: 'a', name: 'test.png', path: image, mime: 'image/png', size: 10 },
      { id: 'b', name: 'test.txt', path: 'example.txt', mime: 'text/plain', size: 4 },
    ],
  });
  await wait(() => lastMessage(chats, chat.id).status === 'completed');
  assert.equal(lastMessage(chats, chat.id).text, 'Pi已连接');
  assert.equal(events.filter((e) => e.type === 'delta').map((e) => e.delta).join(''), 'Pi已连接');
  assert.equal(lastMessage(chats, chat.id).thinking, '先核对再回答');
  assert.equal(events.filter((e) => e.type === 'thinking').map((e) => e.delta).join(''), '先核对再回答');
  const session = sdk.created[0] as MockSession;
  assert.match(session.lastPrompt?.text ?? '', /附件内容/);
  assert.equal(session.lastPrompt?.images?.[0]?.data, Buffer.from('test-image').toString('base64'));
  assert.match(session.toolReply?.content[0]?.text ?? '', /Test paper/);
  assert.deepEqual(
    (session.options as unknown as { tools: string[] }).tools,
    ['library_search', 'read_library_doc', 'paper_outline', 'search_paper_text', 'read_paper_pages',
      'render_paper_page', 'download_papers', 'continue_download_batch', 'get_download_status',
      'read_skill', 'draft_note', 'draft_document'],
  );
  assert.equal(session.lastPrompt?.expandPromptTemplates, false);
  assert.equal(pi.pending.size, 0);
});

test('Pi 工具结果中的图片保留为 image 内容', async (t) => {
  const { chats, pi, sdk } = fixture(t);
  await chats.connect();
  chats.library = {
    getPaper: async (id: string) => ({ id, title: '测试论文', file: 'papers/01_测试/test.pdf' }),
    getLibrary: async () => ({ papers: [], categories: [], stats: {} }),
    safeFile: async () => '/tmp/test.pdf',
    readDocument: async () => ({ path: '', offset: 0, totalChars: 0, text: '', truncated: false }),
    refresh: async () => {},
  } as unknown as ConstructorParameters<typeof AssistantService>[0]['library'];
  const chat = chats.create();
  await chats.send(chat.id, { text: '等待停止' });
  await wait(() => Boolean(sdk.created[0]?.lastPrompt));
  const tool = sdk.created[0]?.options.customTools.find((item) => item.name === 'render_paper_page');
  assert.ok(tool);
  const reply = await tool.execute('call-image', { paperId: 'L001', page: 1 }, new AbortController().signal);
  assert.equal(reply.content[0]?.type, 'text');
  assert.equal(reply.content[1]?.type, 'image');
  assert.equal(reply.content[1]?.data, 'cG5n');
  assert.equal(reply.content[1]?.mimeType, 'image/png');
  assert.equal(pi.pending.size, 0);
  chats.finish(chat.id, 'completed');
});

test('Pi 会话保存于独立目录，重建服务可恢复', async (t) => {
  const { chats, dir, options, sdk, agentDir } = fixture(t);
  await chats.connect();
  const chat = chats.create({ title: 'Pi 会话' });
  await chats.send(chat.id, { text: '问题' });
  await wait(() => lastMessage(chats, chat.id).status === 'completed');
  await chats.client.close();
  const pi = new PiClient({ root: dir, stateDir: dir, sdk: sdk as unknown as PiSdk, agentDir });
  const restored = new AssistantService({ ...options, piClient: pi } as ConstructorParameters<typeof AssistantService>[0]);
  t.after(() => restored.client.close());
  assert.equal(restored.get(chat.id).id, chat.id);
  assert.equal(restored.get(chat.id).messages.length, 2);
  const saved = JSON.parse(fs.readFileSync(path.join(dir, 'pi', 'chats.json'), 'utf8')) as { chats: unknown[] };
  assert.equal(saved.chats.length, 1);
  await restored.send(chat.id, { text: '继续' });
  await wait(() => lastMessage(restored, chat.id).status === 'completed');
  assert.equal(restored.get(chat.id).messages.length, 4);
  assert.equal(restored.list().length, 1);
});

test('Pi 可停止正在生成的回答并继续新一轮，未知模型明确报错', async (t) => {
  const { chats, pi, sdk } = fixture(t);
  await chats.connect();
  const chat = chats.create();
  await chats.send(chat.id, { text: '等待停止' });
  await wait(() => Boolean(sdk.created[0]?.lastPrompt));
  await chats.interrupt(chat.id);
  await wait(() => lastMessage(chats, chat.id).status === 'interrupted');
  assert.equal(pi.turns.size, 0);
  await chats.send(chat.id, { text: '新问题' });
  await wait(() => lastMessage(chats, chat.id).status === 'completed');
  await assert.rejects(
    pi.request('turn/start', { threadId: chats.get(chat.id).threadId, model: 'test/missing' }),
    /不可用/,
  );
});

test('Pi 恢复会话拒绝目录外文件，自带 SDK 可从项目依赖定位', async (t) => {
  const { pi, dir } = fixture(t);
  await pi.start();
  pi.toolDefinitions = [];
  pi.instructions = 'test';
  const outside = path.join(dir, 'outside.jsonl');
  fs.writeFileSync(outside, '{}');
  fs.mkdirSync(pi.sessionsDir, { recursive: true });
  await assert.rejects(pi.createSession({}, outside), /越界/);
  assert.match(resolvePi(), /pi-coding-agent[\\/]dist[\\/]index\.js$/);
});

test('Pi 设置可保存和清除密钥并更换默认模型', async (t) => {
  const { chats, sdk } = fixture(t);
  const initial = await chats.settings();
  assert.equal(initial.defaultModel, 'test/test-model');
  assert.equal(initial.providers.find((p) => p.id === 'test')?.credentialType, 'api_key');
  assert.equal(initial.providers.find((p) => p.id === 'other')?.configured, false);
  assert.equal(initial.providers.find((p) => p.id === 'oauth')?.supportsApiKey, false);
  const testKey = 'mock-api-credential';
  const saved = await chats.saveKey('other', testKey);
  assert.equal(saved.providers.find((p) => p.id === 'other')?.configured, true);
  assert.equal(saved.providers.find((p) => p.id === 'other')?.credentialType, 'api_key');
  assert.equal(sdk.credentials.get('other')?.key, testKey);
  await assert.rejects(() => chats.saveKey('oauth', 'sk-test-00000000'), /不支持 API 密钥/);
  await assert.rejects(() => chats.removeKey('oauth'), /账号登录/);
  const cleared = await chats.removeKey('other');
  assert.equal(cleared.providers.find((p) => p.id === 'other')?.configured, false);
  const updated = await chats.setDefaultModel('test/backup-model');
  assert.equal(updated.defaultModel, 'test/backup-model');
  assert.ok(chats.models.find((model) => model.id === 'test/backup-model'));
  await assert.rejects(() => chats.setDefaultModel('test/missing'), /不可用/);
});

test('Pi 加载库内技能：系统提示列出清单，read_skill 读取正文', async (t) => {
  const { chats, pi, sdk, dir } = fixture(t);
  const skillDir = path.join(dir, '.zhiyue', 'skills', 'paper-reading');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), [
    '---',
    'name: paper-reading',
    'description: 判断论文是否值得精读。',
    '---',
    '',
    '# 步骤',
    '',
    '1. 读首页与末页。',
  ].join('\n'));
  await chats.connect();
  const settings = await chats.settings();
  assert.equal(settings.skills.count, 1);
  assert.equal(settings.skills.items[0]?.name, 'paper-reading');
  const chat = chats.create();
  await chats.send(chat.id, { text: '读一下这篇论文' });
  await wait(() => lastMessage(chats, chat.id).status === 'completed');
  const prompt = sdk.created[0]?.options.resourceLoader.getSystemPrompt() ?? '';
  assert.match(prompt, /<available_skills>/);
  assert.match(prompt, /<name>paper-reading<\/name>/);
  assert.match(prompt, /read_skill/);
  const loaded = await pi.readSkill('paper-reading');
  assert.match(loaded.text, /# 步骤/);
  await assert.rejects(pi.readSkill('../AGENTS.md'), /无效/);
  await pi.close();
});

test('Pi 斜杠命令：本地回执不进入模型，技能命令展开后发给 Pi', async (t) => {
  const { chats, sdk, dir } = fixture(t);
  const skillDir = path.join(dir, '.zhiyue', 'skills', 'paper-reading');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), [
    '---', 'name: paper-reading', 'description: 判断论文是否值得精读。', '---', '', '# 精读步骤', '', '1. 读首页。',
  ].join('\n'));
  chats.pi.refreshSkills();
  await chats.connect();
  const chat = chats.create();

  assert.equal(chats.commands().find((command) => command.name === 'skill:paper-reading')?.source, 'skill');
  const help = await chats.command(chat.id, '/help');
  assert.equal(help.kind, 'local');
  assert.match(help.text, /skill:paper-reading/);
  assert.equal(sdk.created.length, 0, '本地命令不应创建 Pi 会话');
  assert.equal(chats.get(chat.id).messages.length, 1);
  assert.equal(chats.get(chat.id).messages[0]?.status, 'completed');

  await chats.command(chat.id, '/skill:paper-reading 只看第 3 节');
  await wait(() => lastMessage(chats, chat.id).status === 'completed');
  const session = sdk.created[0] as MockSession;
  assert.match(session.lastPrompt?.text ?? '', /<skill name="paper-reading"/);
  assert.match(session.lastPrompt?.text ?? '', /# 精读步骤/);
  assert.match(session.lastPrompt?.text ?? '', /只看第 3 节/);
  // 会话记录里只保留用户输入的单行指令。
  const user = chats.get(chat.id).messages.find((message) => message.role === 'user');
  assert.equal(user?.text, '/skill:paper-reading 只看第 3 节');

  await assert.rejects(() => chats.command(chat.id, '/skill:missing'), /未知命令/);
  await assert.rejects(() => chats.command(chat.id, '/unknown'), /未知命令/);
});

test('Pi /compact 走会话压缩，未载入会话时恢复后压缩', async (t) => {
  const { chats, sdk } = fixture(t);
  await chats.connect();
  const chat = chats.create();
  await chats.send(chat.id, { text: '问题' });
  await wait(() => lastMessage(chats, chat.id).status === 'completed');
  const result = await chats.command(chat.id, '/compact 保留方法部分');
  assert.equal(result.kind, 'local');
  assert.match(result.text, /上下文已压缩/);
  assert.match(result.text, /5000/);
  assert.match(result.text, /1500/);
  const session = sdk.created[0] as MockSession;
  assert.equal(session.compaction, '保留方法部分');
});

test('Pi 思考强度按模型能力提供档位，并同步到当前会话', async (t) => {
  const { chats, pi, sdk } = fixture(t);
  const initial = await chats.settings();
  assert.equal(initial.thinking.default, 'medium');
  assert.equal(initial.thinking.level, 'medium');
  assert.deepEqual(initial.thinking.available, ['off', 'minimal', 'low', 'medium', 'high']);
  assert.equal(initial.compaction.enabled, true);
  assert.equal(initial.compaction.reserveTokens, 20000);
  const chat = chats.create();
  await chats.send(chat.id, { text: '问题' });
  await wait(() => lastMessage(chats, chat.id).status === 'completed');
  const session = sdk.created[0] as MockSession;
  assert.equal((session.options.settingsManager.getSettings() as unknown as MockSettings).defaultThinkingLevel, 'medium');
  const updated = await chats.setThinking('high', 'test/test-model');
  assert.equal(updated.thinking.level, 'high');
  assert.equal(updated.thinking.perModel['test/test-model'], 'high');
  assert.equal(session.thinkingLevel, 'high');
  assert.equal((session.options.settingsManager.getSettings() as unknown as MockSettings).defaultThinkingLevel, 'high');
  await chats.setDefaultModel('test/backup-model');
  const backup = await chats.settings();
  assert.deepEqual(backup.thinking.available, ['off']);
  assert.equal(backup.thinking.level, 'off');
  await assert.rejects(() => chats.setThinking('extreme' as never), /未知的思考强度/);
  const clamped = await chats.setThinking('high', 'test/backup-model');
  assert.equal(clamped.thinking.perModel['test/backup-model'], 'off');
  await pi.close();
});

test('Pi 上下文压缩写入全局设置并对已有会话生效', async (t) => {
  const { chats, pi, sdk, agentDir } = fixture(t);
  const chat = chats.create();
  await chats.send(chat.id, { text: '问题' });
  await wait(() => lastMessage(chats, chat.id).status === 'completed');
  const session = sdk.created[0] as MockSession;
  const updated = await chats.setCompaction({ enabled: false, reserveTokens: 40000, keepRecentTokens: 12000 });
  assert.equal(updated.compaction.enabled, false);
  assert.equal(updated.compaction.reserveTokens, 40000);
  assert.equal(updated.compaction.keepRecentTokens, 12000);
  const file = JSON.parse(fs.readFileSync(path.join(agentDir, 'settings.json'), 'utf8')) as {
    compaction: { enabled: boolean; reserveTokens: number; keepRecentTokens: number };
  };
  assert.deepEqual(file.compaction, { enabled: false, reserveTokens: 40000, keepRecentTokens: 12000 });
  assert.equal(sdk.settings.compaction.reserveTokens, 40000);
  const sessionSettings = session.options.settingsManager.getSettings() as unknown as {
    compaction: { enabled: boolean; reserveTokens: number };
  };
  assert.equal(sessionSettings.compaction.enabled, false);
  assert.equal(sessionSettings.compaction.reserveTokens, 40000);
  await assert.rejects(() => chats.setCompaction({ reserveTokens: 10 }), /1000 到 2000000/);
  await assert.rejects(() => chats.setCompaction({}), /没有需要保存/);
  await pi.close();
});

test('HTTP 提供 Pi 状态和连接接口', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'literature-pi-http-'));
  fs.mkdirSync(path.join(dir, '.zhiyue', 'catalog'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.zhiyue', 'catalog', '文献索引.json'), JSON.stringify({ records: [] }));
  const stateDir = path.join(dir, '.zhiyue', 'data');
  const agentDir = path.join(dir, 'pi-agent');
  const sdk = mockSDK(agentDir);
  const piClient = new PiClient({ root: dir, stateDir, sdk: sdk as unknown as PiSdk, agentDir });
  const app = await createApp({ root: dir, stateDir, connectPi: false, piClient });
  await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await app.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const address = app.server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const base = `http://127.0.0.1:${port}`;
  const post = async (route: string, data: Record<string, unknown> = {}): Promise<Response> =>
    fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const connected = await post('/api/agents/pi/connect');
  assert.equal(connected.status, 200);
  const status = await connected.json() as {
    agents: { pi: { authenticated: boolean; models: Array<{ model: string }> } };
  };
  assert.equal(status.agents.pi.authenticated, true);
  assert.equal(status.agents.pi.models[0]?.model, 'test/test-model');
  assert.deepEqual(Object.keys(status.agents), ['pi']);
  const settings = await (await fetch(base + '/api/agents/pi/settings')).json() as {
    defaultModel: string;
    providers: Array<{ id: string; credentialType: string; configured: boolean }>;
  };
  assert.equal(settings.defaultModel, 'test/test-model');
  assert.equal(settings.providers.find((p) => p.id === 'test')?.credentialType, 'api_key');
  let response = await post('/api/agents/pi/settings/key', { provider: '../evil', key: 'sk-abcdefgh' });
  assert.equal(response.status, 400);
  response = await post('/api/agents/pi/settings/key', { provider: 'other', key: '  ' });
  assert.equal(response.status, 400);
  response = await post('/api/agents/pi/settings/key', { provider: 'other', key: 'sk-http-00000000' });
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { providers: Array<{ id: string; configured: boolean }> }).providers.find((p) => p.id === 'other')?.configured, true);
  response = await post('/api/agents/pi/settings/key/remove', { provider: 'other' });
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { providers: Array<{ id: string; configured: boolean }> }).providers.find((p) => p.id === 'other')?.configured, false);
  response = await post('/api/agents/pi/settings/model', { model: 'test/backup-model' });
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { defaultModel: string }).defaultModel, 'test/backup-model');
  const reloadSkillDir = path.join(dir, '.zhiyue', 'skills', 'demo');
  fs.mkdirSync(reloadSkillDir, { recursive: true });
  fs.writeFileSync(path.join(reloadSkillDir, 'SKILL.md'), '---\nname: demo\ndescription: 演示技能。\n---\n\n# 演示\n');
  response = await post('/api/agents/pi/skills/reload', {});
  assert.equal(response.status, 200);
  const reloaded = await response.json() as { skills: { count: number; items: Array<{ name: string }> } };
  assert.equal(reloaded.skills.count, 1);
  assert.equal(reloaded.skills.items[0]?.name, 'demo');

  response = await post('/api/agents/pi/settings/model', { model: '' });
  assert.equal(response.status, 400);
  response = await post('/api/agents/pi/settings/thinking', { level: 'high', model: 'test/test-model' });
  assert.equal(response.status, 200);
  const thinkingSaved = await response.json() as {
    thinking: { default: string; perModel: Record<string, string> };
  };
  assert.equal(thinkingSaved.thinking.default, 'high');
  assert.equal(thinkingSaved.thinking.perModel['test/test-model'], 'high');
  response = await post('/api/agents/pi/settings/thinking', { level: 'extreme' });
  assert.equal(response.status, 400);
  response = await post('/api/agents/pi/settings/compaction', { enabled: true, reserveTokens: 18000, keepRecentTokens: 9000 });
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { compaction: { reserveTokens: number } }).compaction.reserveTokens, 18000);
  response = await post('/api/agents/pi/settings/compaction', { reserveTokens: 'abc' });
  assert.equal(response.status, 400);
  response = await post('/api/agents/pi/settings/compaction', { enabled: 'yes' });
  assert.equal(response.status, 400);
  const piChat = await (await post('/api/chats', {})).json() as { id: string };
  const sent = await post(`/api/chats/${piChat.id}/messages`, { text: 'HTTP 问题' });
  assert.equal(sent.status, 202);
  await wait(() => lastMessage(app.chats, piChat.id).status !== 'streaming');
  assert.equal(lastMessage(app.chats, piChat.id).status, 'completed', lastMessage(app.chats, piChat.id).error);
  const stored = await (await fetch(base + `/api/chats/${piChat.id}`)).json() as { messages: Array<{ text: string }> };
  assert.equal(stored.messages.at(-1)?.text, 'Pi已连接');
  assert.equal(lastMessage(app.chats, piChat.id).thinking, '先核对再回答');
  // 斜杠命令目录与执行接口：本地命令回执，未知命令 404，非命令输入 400。
  const catalog = await (await fetch(base + '/api/commands')).json() as {
    commands: Array<{ name: string; source: string; target?: string }>;
    desktop: boolean;
  };
  assert.equal(catalog.desktop, false);
  assert.equal(catalog.commands.find((command) => command.name === 'export')?.target, 'terminal');
  assert.equal(catalog.commands.find((command) => command.name === 'model')?.target, 'workspace');
  assert.equal(catalog.commands.find((command) => command.name === 'skill:demo')?.source, 'skill');
  assert.equal((await post('/api/commands/terminal', { text: '/changelog' })).status, 409);
  const helpReply = await post(`/api/chats/${piChat.id}/commands`, { text: '/help' });
  assert.equal(helpReply.status, 202);
  assert.equal(((await helpReply.json()) as { kind: string }).kind, 'local');
  assert.match(
    ((await (await fetch(base + `/api/chats/${piChat.id}`)).json()) as { messages: Array<{ text: string }> })
      .messages.at(-1)?.text ?? '',
    /skill:demo/,
  );
  assert.equal((await post(`/api/chats/${piChat.id}/commands`, { text: '/nope' })).status, 404);
  assert.equal((await post(`/api/chats/${piChat.id}/commands`, { text: '普通问题' })).status, 400);
  const chats = await (await fetch(base + '/api/chats')).json() as unknown[];
  assert.equal(chats.length, 1);
  assert.equal((await post('/api/agents/codex/connect')).status, 404);
});

export type { ChatServiceOptions };
