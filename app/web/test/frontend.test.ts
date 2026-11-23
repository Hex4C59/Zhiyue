import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

// 编译后的测试位于 build/app/web/test；从自身位置向上找到项目清单，源码与产物指向同一份 dist。
function repoRoot(): string {
  let directory = path.dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const manifest = path.join(directory, 'package.json');
    if (fs.existsSync(manifest)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(manifest, 'utf8')) as { name?: string };
        if (parsed.name === 'zhiyue') return directory;
      } catch { /* 非项目清单，继续向上查找。 */ }
    }
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error('无法定位项目根目录。');
    directory = parent;
  }
}

// 测试夹具允许宽松类型：HTTP 响应按真实载荷断言，未用到的字段不做静态建模。
type Json = Record<string, any>;
interface MountedWorkspace {
  version: string;
  workspace: Json & { receive: (event: Json) => void };
  ready: Promise<void>;
  unmount: () => void;
}

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://127.0.0.1:8765/',
  pretendToBeVisual: true,
});
const { window } = dom;
for (const key of [
  'window',
  'document',
  'Document',
  'Element',
  'HTMLElement',
  'SVGElement',
  'Node',
  'navigator',
  'Event',
  'KeyboardEvent',
  'MouseEvent',
  'File',
  'DOMException',
]) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: window[key] });
}
globalThis.getComputedStyle = window.getComputedStyle as typeof globalThis.getComputedStyle;
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia;
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver = class {
  observe() {}
  disconnect() {}
} as unknown as typeof IntersectionObserver;
Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
  configurable: true,
  get() {
    return this.classList.contains('shell') ? 1440 : 600;
  },
});
Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
  configurable: true,
  get() {
    return 800;
  },
});
window.HTMLCanvasElement.prototype.getContext = (() => ({
  font: '',
  measureText: (text: string) => ({ width: text.length * 7 }),
})) as unknown as typeof window.HTMLCanvasElement.prototype.getContext;
globalThis.Image = function () {
  const image = new window.Image();
  Object.defineProperties(image, { naturalWidth: { value: 300 }, naturalHeight: { value: 400 } });
  image.decode = async () => {};
  return image;
} as unknown as typeof Image;
// Vue 的 DOM 运行时在导入时读取 document，因此先建立测试文档，再加载真实构建产物。
const distUrl = pathToFileURL(path.join(repoRoot(), 'app/web/dist/app.js')).href;
const { mountWorkspace } = await import(distUrl) as {
  mountWorkspace: (target: Element, options?: Json) => MountedWorkspace;
};
const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};
const until = async (predicate: () => boolean) => {
  for (let index = 0; index < 100; index++) {
    if (predicate()) return;
    await flush();
  }
  throw new Error('界面状态等待超时');
};
const input = (element: any, value: string) => {
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
};
const click = (element: any): boolean => element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

// `ui` 模拟文献库里的界面状态：传入上一次写回的值即可模拟重启后读回。
async function fixture(
  t: test.TestContext,
  { ui = {}, uiPatchError = '', pdfTextLines }: { ui?: Json; uiPatchError?: string; pdfTextLines?: Json[] } = {},
) {
  const calls: any[] = [];
  const uiState: Json = { chatId: null, paperId: null, panelWidths: {}, ...ui };
  const decisions: any[] = [];
  const noteDecisions: any[] = [];
  const chats = new Map<string, any>();
  const papers = [
    {
      literature_id: 'L001',
      title: '测试超声论文',
      authors: ['Test Author'],
      year: 2026,
      file: 'papers/test.pdf',
      category: '01_超声',
      notes: [{ path: 'notes/L001_测试笔记.md', title: 'L001_测试笔记' }],
      readStatus: 'unread',
      starred: false,
    },
    {
      literature_id: 'L002',
      title: '另一个方法',
      authors: ['Other'],
      year: 2025,
      file: 'papers/other.pdf',
      category: '02_模型',
      notes: [],
      readStatus: 'unread',
      starred: false,
    },
  ];
  const status = {    defaultProvider: 'pi',
    agents: {
      pi: {
        available: true,
        authenticated: true,
        models: [
          { id: 'test/luna', model: 'test/luna', displayName: 'GPT Luna · test', isDefault: true },
          { id: 'test/sonnet', model: 'test/sonnet', displayName: 'Claude Sonnet · test' },
        ],
      },
    },
  };
  const piSettings = {
    defaultModel: 'test/luna',
    providers: [
      {
        id: 'test',
        name: 'Test Provider',
        configured: true,
        source: 'stored',
        sourceLabel: null,
        credentialType: 'api_key',
        supportsApiKey: true,
        supportsOAuth: false,
        availableModels: 2,
      },
    ],
    thinking: {
      level: 'medium',
      default: 'medium',
      perModel: {},
      available: ['off', 'minimal', 'low', 'medium', 'high'],
    },
    compaction: { enabled: true, reserveTokens: 20000, keepRecentTokens: 30000 },
    skills: {
      count: 1,
      items: [{ name: 'paper-reading', description: '判断论文是否值得精读。' }],
      diagnostics: [],
    },
  };
  const jobs = new Map([['job-1', { id: 'job-1', title: '测试下载', status: 'running', log: 'start' }]]);
  class Events {
    onopen?: () => void;
    closed = false;
    constructor() {
      queueMicrotask(() => this.onopen?.());
    }
    close(): void {
      this.closed = true;
    }
  }
  async function api(path: string, options: any = {}) {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    calls.push({ path, method: options.method || 'GET', body });
    if (path === '/api/status') return structuredClone(status);
    if (path === '/api/ui') {
      if (options.method === 'PATCH') {
        if (uiPatchError) throw new Error(uiPatchError);
        Object.assign(uiState, structuredClone(body));
      }
      return structuredClone(uiState);
    }
    if (path === '/api/library')
      return { papers: structuredClone(papers), categories: ['01_超声', '02_模型'] };
    if (path === '/api/categories' && options.method === 'POST') {
      return body.parent
        ? { category: body.parent, subcategory: `01_${body.name}` }
        : { category: `03_${body.name}`, subcategory: '' };
    }
    if (path === '/api/categories/rename' && options.method === 'POST') {
      return body.subcategory
        ? { category: body.category, subcategory: `01_${body.name}` }
        : { category: `01_${body.name}`, subcategory: '' };
    }
    if (path === '/api/categories/delete' && options.method === 'POST') {
      return {
        category: body.category, subcategory: body.subcategory ?? '',
        trashed: '.zhiyue/trash/categories/x_测试',
      };
    }
    if (path === '/api/notes/delete') {
      const paper = papers.find((item) => item.notes.some((note) => note.path === body.path))!;
      if (!paper) throw new Error('笔记不存在。');
      paper.notes = paper.notes.filter((note) => note.path !== body.path);
      return {
        trashed: `.zhiyue/trash/notes/${body.path.split('/').pop()}`,
        library: { papers: structuredClone(papers), categories: ['01_超声', '02_模型'] },
      };
    }
    if (path.startsWith('/api/text?'))
      return { path: decodeURIComponent(path.split('=')[1]), text: '# 测试笔记\n\n正文内容' };
    if (path === '/api/downloads' && options.method === 'POST') {
      const job = { ...body, id: 'job-new', status: 'queued' };
      jobs.set(job.id, job);
      return structuredClone(job);
    }
    if (path === '/api/downloads') return { jobs: structuredClone([...jobs.values()]), batches: [] };
    if (path === '/api/chats' && options.method === 'POST') {
      const chat = { ...body, id: 'chat-1', messages: [], createdAt: new Date().toISOString() };
      chats.set(chat.id, chat);
      return structuredClone(chat);
    }
    if (path === '/api/chats') return structuredClone([...chats.values()]);
    if (path === '/api/agents/pi/settings') return structuredClone(piSettings);
    if (path === '/api/agents/pi/settings/thinking') {
      Object.assign(piSettings.thinking, { level: body.level, default: body.level });
      return structuredClone(piSettings);
    }
    if (path === '/api/agents/pi/settings/compaction') {
      Object.assign(piSettings.compaction, body);
      return structuredClone(piSettings);
    }
    if (path === '/api/agents/pi/skills/reload') return structuredClone(piSettings);
    if (path === '/api/commands')
      return {
        desktop: true,
        commands: [
          { name: 'help', description: '列出可用的斜杠命令与技能。', source: 'local', scope: 'composer' },
          { name: 'compact', description: '手动压缩当前会话上下文。', source: 'local', scope: 'chat', argumentHint: '[压缩说明]' },
          { name: 'settings', description: '打开设置。', source: 'local', scope: 'composer', target: 'workspace' },
          { name: 'model', description: '选择模型。', source: 'local', scope: 'composer', target: 'workspace' },
          { name: 'changelog', description: '查看更新记录。', source: 'local', scope: 'composer', target: 'terminal' },
          {
            name: 'skill:paper-reading',
            description: '判断论文是否值得精读。',
            source: 'skill',
            scope: 'composer',
          },
          {
            name: 'skill:paper-experiments',
            description: '总结论文并拆解实验。',
            source: 'skill',
            scope: 'composer',
          },
        ],
      };
    if (path === '/api/commands/terminal') return { accepted: true };
    if (path.startsWith('/api/agents/')) return structuredClone(status);
    if (path === '/api/uploads')
      return {
        id: 'upload-1',
        name: decodeURIComponent(options.headers['X-Filename']),
        mime: body.type,
        size: body.size,
      };
    if (path.startsWith('/api/approvals/')) {
      decisions.push(body);
      return { resolved: true };
    }
    if (path.startsWith('/api/chats/') && path.endsWith('/commands')) {
      const chat = chats.get(path.split('/')[3]);
      chat.messages.push(
        { id: 'cmd-user', role: 'user', text: body.text, status: 'completed' },
        { id: 'cmd-assistant', role: 'assistant', text: '## 斜杠命令', status: 'completed' },
      );
      return { kind: 'local', chatId: chat.id, text: '## 斜杠命令' };
    }
    if (path.startsWith('/api/note-drafts/')) {
      noteDecisions.push({ id: path.split('/').pop(), body });
      return body.action === 'save'
        ? { saved: true, path: 'notes/L001_测试笔记.md' }
        : { discarded: true };
    }
    if (path.startsWith('/api/papers/') && options.method === 'PATCH') {
      const paper = papers.find((item) => path.endsWith(item.literature_id))!;
      Object.assign(paper, body);
      return structuredClone(paper);
    }
    if (path.includes('/text-layer?'))
      return {
        page: 1,
        totalPages: 2,
        width: 300,
        height: 400,
        hasText: true,
        text: 'Selectable PDF text',
        lines: pdfTextLines ?? [
          {
            words: [
              { text: 'Selectable', x: 20, y: 30, width: 70, height: 14, rotation: 0 },
              { text: 'PDF text', x: 100, y: 30, width: 60, height: 14, rotation: 0 },
            ],
          },
        ],
      };
    const chatMatch = /^\/api\/chats\/([^/]+)(?:\/(messages|interrupt))?$/.exec(path);
    if (chatMatch) {
      const chat = chats.get(chatMatch[1]);
      if (options.method === 'DELETE' || options.method === 'PATCH') {
        chat.historyState = options.method === 'DELETE' ? 'trashed' : body.historyState;
        return { id: chat.id, historyState: chat.historyState };
      }
      if (chatMatch[2] === 'messages') {
        chat.messages.push(
          { id: 'user-1', role: 'user', text: body.text, status: 'completed' },
          { id: 'assistant-1', role: 'assistant', text: '', status: 'streaming' },
        );
        return { accepted: true };
      }
      if (chatMatch[2] === 'interrupt') {
        chat.messages.at(-1).status = 'interrupted';
        return { stopped: true };
      }
      return structuredClone(chat);
    }
    throw new Error(`未定义的测试接口：${path}`);
  }
  const target = document.createElement('div');
  document.body.append(target);
  const mounted = mountWorkspace(target, { api, EventSourceImpl: Events, pollInterval: 0 });
  await mounted.ready;
  await flush();
  t.after(() => {
    mounted.unmount();
    target.remove();
    document.getSelection()?.removeAllRanges();
  });
  return {
    ...mounted,
    target,
    $: (selector: string) => target.querySelector(selector) as any,
    calls,
    decisions,
    noteDecisions,
    chats,
    status,
    piSettings,
    ui: uiState,
  };
}

test('历史会话可归档和恢复，确认删除后才会移入回收站', async (t) => {
  const page = await fixture(t);
  const chat = { id: 'history-chat', title: '已有会话', paperIds: ['L001'], messages: [] };
  page.chats.set(chat.id, chat);
  await page.workspace.loadChats();
  click(page.$('#chat-history-toggle'));
  await flush();
  click(page.$('[data-chat="history-chat"]'));
  await flush();
  click(page.$('[title="归档会话"]'));
  await flush();
  assert.equal(page.$('[data-chat="history-chat"]'), null);
  assert.ok(page.$('.archived-chat'));
  assert.equal(page.$('#chat-input'), null);
  click(page.$('[data-history-view="archived"]'));
  await flush();
  assert.equal(page.$('.history-title').textContent, '已有会话');
  click(page.$('.archived-chat button'));
  await flush();
  assert.ok(page.$('#chat-input'));

  click(page.$('[data-history-view="active"]'));
  await flush();
  const confirm = window.confirm;
  t.after(() => { window.confirm = confirm; });
  window.confirm = () => false;
  click(page.$('[title="删除会话"]'));
  assert.equal(page.calls.some((call) => call.method === 'DELETE'), false);
  window.confirm = () => true;
  click(page.$('[title="删除会话"]'));
  await flush();
  assert.equal(page.workspace.state.chat, null);
  assert.equal(page.ui.chatId, null);
  assert.equal(page.$('[data-chat="history-chat"]'), null);
  click(page.$('[data-history-view="trashed"]'));
  await flush();
  assert.equal(page.$('[data-chat="history-chat"]').tagName, 'DIV');
  click(page.$('[title="恢复会话"]'));
  await flush();
  assert.match(page.$('.chat-history .empty').textContent, /回收站为空/);
  click(page.$('[data-history-view="active"]'));
  await flush();
  assert.ok(page.$('[data-chat="history-chat"]'));
});

test('无模型时可打开命令菜单和设置，终端命令无需创建聊天', async (t) => {
  const page = await fixture(t);
  page.workspace.state.status.agents!.pi!.authenticated = false;
  page.workspace.state.draft = '/';
  await flush();
  assert.ok(page.$('[data-command="changelog"]'));
  page.workspace.state.draft = '/settings';
  assert.equal(await page.workspace.submit(), true);
  await flush();
  assert.ok(page.$('.settings-dialog'));
  page.workspace.state.draft = '/changelog';
  assert.equal(await page.workspace.submit(), true);
  assert.deepEqual(page.calls.find((call) => call.path === '/api/commands/terminal')?.body, { text: '/changelog' });
  assert.equal(page.calls.some((call) => call.path === '/api/chats' && call.method === 'POST'), false);
});

test('Vue 3 挂载全部面板，文献筛选与收藏保留节点和未读状态', async (t) => {
  const page = await fixture(t);
  assert.match(page.version, /^3\./);
  assert.equal(page.$('.shell').dataset.framework, 'vue');
  assert.equal(page.target.querySelectorAll('[data-resize-panel]').length, 3);
  const paper = page.$('[data-paper="L001"]');
  click(paper.querySelector('button'));
  await flush();
  assert.equal(page.$('[data-paper="L001"]'), paper);
  assert.equal(page.workspace.state.papers[0].starred, true);
  assert.equal(page.workspace.state.papers[0].readStatus, 'unread');
  input(page.$('#search'), '另一个');
  await flush();
  assert.equal(page.target.querySelectorAll('[data-paper]').length, 1);
  assert.equal(page.$('[data-paper]').dataset.paper, 'L002');
});

test('文件夹导入忽略来源记录等非 PDF，并明确提示数量上限', async (t) => {
  const page = await fixture(t);
  const file = (name: string) => new File([new Uint8Array(16)], name, { type: 'application/octet-stream' });
  const drop = (files: any[], items: any[] = []) => {
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { items: [], files } });
    page.$('.import-file').dispatchEvent(event);
  };
  const openDialog = async () => {
    click(page.$('#import-paper'));
    await until(() => page.$('.import-file'));
  };
  const closeDialog = async () => {
    click(page.$('.import-head .icon-button'));
    await until(() => !page.$('.import-file'));
  };
  await openDialog();
  drop([file('a.pdf'), file('b.pdf'), file('a.来源.json'), file('notes.txt')]);
  await flush();
  assert.equal(page.target.querySelectorAll('.import-item').length, 2);
  assert.equal(page.$('.import-error'), null);
  await closeDialog();
  await openDialog();
  const many = [];
  for (let index = 0; index < 102; index += 1) many.push(file(`p${index}.pdf`));
  many.push(file('a.来源.json'));
  drop(many);
  await flush();
  assert.equal(page.target.querySelectorAll('.import-item').length, 100);
  assert.match(page.$('.import-error').textContent, /最多导入 100 个 PDF，其余 2 个未加入/);
  await closeDialog();
  await openDialog();
  drop([file('a.来源.json'), file('b.txt')]);
  await flush();
  assert.equal(page.target.querySelectorAll('.import-item').length, 0);
  assert.match(page.$('.import-error').textContent, /没有可导入的 PDF/);
});

test('文件夹导入按同名分类预选归档位置，手动选择不被覆盖', async (t) => {
  const page = await fixture(t);
  const file = (name: string, relative: string) => {
    const result = new File([new Uint8Array(16)], name, { type: 'application/pdf' });
    Object.defineProperty(result, 'webkitRelativePath', { value: relative });
    return result;
  };
  const drop = (files: any[], items: any[] = []) => {
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { items, files } });
    page.$('.import-file').dispatchEvent(event);
  };
  const openDialog = async () => {
    click(page.$('#import-paper'));
    await until(() => page.$('.import-file'));
  };
  const closeDialog = async () => {
    click(page.$('.import-head .icon-button'));
    await until(() => !page.$('.import-file'));
  };
  const category = () => page.$('.import-fields select').value;
  await openDialog();
  assert.equal(category(), 'papers/09_情感综述调研/网站导入');
  drop([file('a.pdf', '02_模型/a.pdf'), file('b.pdf', '02_模型/b.pdf')]);
  await flush();
  assert.equal(category(), 'papers/02_模型/网站导入');
  await closeDialog();
  await openDialog();
  drop([file('c.pdf', '超声/c.pdf')]);
  await flush();
  assert.equal(category(), 'papers/01_超声/网站导入');
  await closeDialog();
  await openDialog();
  const entry: any = { isFile: true, name: 'd.pdf', file: (resolve: (file: File) => void) => resolve(file('d.pdf', '')) };
  let reads = 0;
  const folder: any = {
    isDirectory: true,
    isFile: false,
    name: '模型',
    createReader: () => ({ readEntries: (resolve: (entries: any[]) => void) => resolve(reads++ ? [] : [entry]) }),
  };
  drop([], [{ kind: 'file', webkitGetAsEntry: () => folder }]);
  await flush();
  assert.equal(category(), 'papers/02_模型/网站导入');
  await closeDialog();
  await openDialog();
  const select = page.$('.import-fields select');
  select.value = 'papers/01_超声/网站导入';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  drop([file('e.pdf', '02_模型/e.pdf')]);
  await flush();
  assert.equal(category(), 'papers/01_超声/网站导入');
  await closeDialog();
  await openDialog();
  drop([file('f.pdf', '03_新主题/f.pdf')]);
  await flush();
  assert.equal(category(), 'papers/03_新主题/网站导入');
  const labels = [...page.$('.import-fields select').options].map((option) =>
    option.textContent.trim(),
  );
  assert.ok(labels.includes('新主题 / 网站导入（新建）'));
  await closeDialog();
  await openDialog();
  drop([file('g.pdf', 'a:b/g.pdf')]);
  await flush();
  assert.equal(category(), 'papers/09_情感综述调研/网站导入');
});

test('模型搜索和键盘选择驱动实际发送参数，输入与停止操作保持可用', async (t) => {
  const page = await fixture(t);
  assert.equal(page.$('#send').disabled, true);
  page.workspace.state.status.agents.pi.models.push(
    { id: 'alpha/luna', model: 'alpha/luna', displayName: 'GPT Luna · alpha' },
  );
  click(page.$('#model-trigger'));
  await flush();
  assert.deepEqual(
    [...page.target.querySelectorAll<HTMLElement>('[data-provider-value]')].map(node => node.dataset.providerValue),
    ['alpha', 'test'],
  );
  assert.equal(page.$('[data-model-value="test/luna"]'), null);
  input(page.$('#model-search'), 'test');
  await flush();
  const key = (target: HTMLElement, value: string): void => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }));
  };
  key(page.$('#model-search'), 'ArrowDown');
  assert.equal(document.activeElement, page.$('[data-provider-value="test"]'));
  key(page.$('[data-provider-value="test"]'), 'ArrowRight');
  await flush();
  assert.equal(page.$('#model-search').getAttribute('aria-label'), '搜索模型');
  assert.equal(page.$('[data-model-value="alpha/luna"]'), null);
  assert.equal(page.$('[data-model-value="test/luna"]').textContent.trim(), 'GPT Luna');
  key(page.$('#model-search'), 'Escape');
  await flush();
  assert.equal(page.$('#model-search').value, 'test');
  assert.equal(document.activeElement, page.$('[data-provider-value="test"]'));
  click(page.$('[data-provider-value="test"]'));
  await flush();
  input(page.$('#model-search'), 'luna');
  await flush();
  assert.equal(page.target.querySelectorAll('[role="option"]').length, 1);
  page
    .$('#model-search')
    .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await flush();
  assert.equal(page.workspace.state.model, 'test/luna');
  click(page.$('#model-trigger'));
  await flush();
  click(page.$('[data-model-value=""]'));
  assert.equal(page.workspace.state.model, '');
  await flush();
  click(page.$('#model-trigger'));
  await flush();
  click(page.$('[data-provider-value="test"]'));
  await flush();
  click(page.$('[data-model-value="test/luna"]'));
  await flush();
  input(page.$('#chat-input'), '合成测试问题');
  await flush();
  page
    .$('#chat-input')
    .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await until(() => page.$('#interrupt'));
  const sent = page.calls.find((call) => call.path.endsWith('/messages'));
  assert.equal(sent.body.text, '合成测试问题');
  assert.equal(sent.body.model, 'test/luna');
  assert.equal(page.$('#chat-input').value, '');
  click(page.$('#interrupt'));
  await until(() => page.$('#send'));
  assert.equal(page.workspace.state.chat.messages.at(-1).status, 'interrupted');
});

test('流式增量只更新目标消息，保留已完成内容的选择范围、焦点与审批草稿', async (t) => {
  const page = await fixture(t),
    { workspace } = page;
  workspace.state.chat = {
    id: 'local-chat',
    provider: 'pi',
    messages: [
      { id: 'completed', role: 'assistant', text: '这段文字需要保持可选。', status: 'completed' },
      { id: 'live', role: 'assistant', text: '新回答', status: 'streaming' },
    ],
  };
  workspace.receive({
    type: 'approval',
    chatId: 'local-chat',
    approval: {
      id: 'approval-1',
      method: 'item/tool/requestUserInput',
      params: {
        questions: [{ id: 'question', question: '请选择方案', options: ['方案甲', '方案乙'] }],
      },
    },
  });
  await flush();
  const answer = page.$('[data-answer="question"]');
  input(answer, '尚未提交的回答');
  answer.focus();
  const body = page.$('[data-message="completed"] .message-body'),
    paragraph = body.firstChild as ChildNode;
  const range = document.createRange();
  range.selectNodeContents(paragraph);
  document.getSelection()!.removeAllRanges();
  document.getSelection()!.addRange(range);
  const messages = page.$('#messages');
  Object.defineProperty(messages, 'scrollHeight', { configurable: true, value: 2000 });
  messages.scrollTop = 123;
  workspace.receive({ type: 'delta', chatId: 'local-chat', messageId: 'live', delta: '的增量。' });
  await flush();
  assert.equal(page.$('[data-message="completed"] .message-body').firstChild, paragraph);
  assert.equal(document.getSelection()!.toString(), '这段文字需要保持可选。');
  assert.equal(document.activeElement, answer);
  assert.equal(answer.value, '尚未提交的回答');
  assert.equal(messages.scrollTop, 123);
  assert.match(page.$('[data-message="live"]').textContent, /新回答的增量/);
  page
    .$('[data-approval="approval-1"]')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  assert.deepEqual(page.decisions[0].answers.question.answers, ['尚未提交的回答']);
});

test('笔记草稿先预览，保存或丢弃都由用户点击触发', async (t) => {
  const page = await fixture(t),
    { workspace } = page;
  workspace.state.chat = { id: 'draft-chat', messages: [], noteDrafts: [] };
  workspace.receive({
    type: 'noteDraft',
    chatId: 'draft-chat',
    draft: {
      id: 'd1',
      paperId: 'L001',
      title: '测试笔记',
      path: 'notes/L001_测试笔记.md',
      content: '## 要点\n\n正文 <img src=x onerror=alert(1)>',
    },
  });
  await flush();
  assert.ok(page.$('[data-note-draft="d1"]'));
  assert.match(page.$('.note-preview').textContent, /要点/);
  assert.equal(page.$('.note-preview img'), null);
  assert.equal(workspace.state.chat.noteDrafts.length, 1);
  click(page.$('[data-note-save="d1"]'));
  await until(() => !page.$('[data-note-draft="d1"]'));
  assert.deepEqual(page.noteDecisions[0], { id: 'd1', body: { action: 'save' } });
  assert.equal(workspace.state.chat.noteDrafts.length, 0);
  workspace.receive({
    type: 'noteDraft',
    chatId: 'draft-chat',
    draft: {
      id: 'd2',
      paperId: 'L001',
      title: '另一份笔记',
      path: 'notes/L001_另一份笔记.md',
      content: '## 另一份',
    },
  });
  await flush();
  click(page.$('[data-note-discard="d2"]'));
  await until(() => !page.$('[data-note-draft="d2"]'));
  assert.deepEqual(page.noteDecisions[1], { id: 'd2', body: { action: 'discard' } });
  workspace.receive({
    type: 'noteDraft',
    chatId: 'draft-chat',
    draft: {
      id: 'd3',
      paperId: '',
      target: 'synthesis',
      paperIds: ['L001', 'L002'],
      title: '跨论文综合',
      path: 'synthesis/跨论文综合.md',
      content: '## 综合结论',
    },
  });
  await flush();
  assert.match(page.$('[data-note-draft="d3"]').textContent, /综合文稿/);
  assert.match(page.$('[data-note-save="d3"]').textContent, /保存为文稿/);
  click(page.$('[data-note-discard="d3"]'));
  await until(() => !page.$('[data-note-draft="d3"]'));
  assert.deepEqual(page.noteDecisions[2], { id: 'd3', body: { action: 'discard' } });
});

test('附件上传与删除、Pi 标题与空上下文按 Vue 状态更新', async (t) => {
  const page = await fixture(t),
    { workspace } = page;
  assert.equal(page.$('.chat-context'), null);
  workspace.state.context.add('L001');
  await flush();
  assert.ok(page.$('[data-context-remove="L001"]'));
  click(page.$('#clear-context'));
  await flush();
  assert.equal(page.$('.chat-context'), null);
  await workspace.uploadFiles([new File(['synthetic'], 'sample.txt', { type: 'text/plain' })]);
  await flush();
  assert.match(page.$('#attachments').textContent, /sample.txt/);
  assert.equal(page.$('#send').disabled, false);
  click(page.$('#attachments button'));
  await flush();
  assert.equal(page.$('#send').disabled, true);
  assert.equal(page.$('#agent-select'), null);
  assert.equal(page.$('#codex-login'), null);
  assert.equal(page.$('.agent-name').textContent.trim(), 'Pi Agent');
  // 上传附件不应产生会话，也不该写入界面状态。
  assert.equal(page.ui.chatId, null);
});

test('右键文件夹可新建子文件夹、重命名并导入 PDF', async (t) => {
  const page = await fixture(t);
  const { workspace } = page;
  workspace.state.categories = [{ id: '01_超声', name: '01_超声', count: 1, children: [] }];
  await flush();
  const open = (): void => {
    page.$('[data-category="01_超声"]').dispatchEvent(new window.MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: 80, clientY: 100,
    }));
  };
  await flush();
  open();
  await flush();
  const menu = document.querySelector('.category-menu');
  assert.ok(menu);
  assert.match(menu.textContent ?? '', /新建子文件夹/);
  click([...menu.querySelectorAll('button')].find((item) => /新建子文件夹/.test(item.textContent ?? '')));
  await flush();
  const childInput = page.$('.category-editor.category-child input');
  assert.ok(childInput);
  input(childInput, '实验数据');
  childInput.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await until(() => workspace.state.subcategory === '01_实验数据');
  assert.ok(page.calls.some((call) => call.path === '/api/categories' && call.body.parent === '01_超声'));
  assert.deepEqual(
    page.calls.find((call) => call.path === '/api/categories' && call.body.parent === '01_超声')?.body,
    { name: '实验数据', parent: '01_超声' },
  );
  assert.equal(workspace.state.category, '01_超声');
  assert.equal(workspace.state.subcategory, '01_实验数据');

  workspace.state.categories = [{ id: '01_超声', name: '01_超声', count: 1, children: [] }];
  await flush();
  open();
  await flush();
  const importMenu = document.querySelector('.category-menu');
  assert.ok(importMenu);
  click([...importMenu.querySelectorAll('button')].find((item) => /导入 PDF/.test(item.textContent ?? '')));
  await flush();
  assert.equal(workspace.state.importOpen, true);
  assert.equal(workspace.state.importCategory, 'papers/01_超声');
  assert.equal(page.$('.import-fields select')?.value, 'papers/01_超声');
  workspace.state.importOpen = false;
  workspace.state.importCategory = '';
  await flush();
  open();
  await flush();
  const renameMenu = document.querySelector('.category-menu');
  assert.ok(renameMenu);
  click([...renameMenu.querySelectorAll('button')].find((item) => /重命名/.test(item.textContent ?? '')));
  await flush();
  const renameInput = page.$('.category-editor:not(.category-child) input');
  assert.ok(renameInput);
  input(renameInput, '超声新名');
  renameInput.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await until(() => workspace.state.category === '01_超声新名');
  assert.ok(page.calls.some((call) => call.path === '/api/categories/rename'));
  assert.deepEqual(
    page.calls.find((call) => call.path === '/api/categories/rename')?.body,
    { category: '01_超声', subcategory: '', name: '超声新名' },
  );
  workspace.state.categories = [];
  workspace.state.category = '';
  await flush();
  page.$('[data-category=""]').dispatchEvent(new window.MouseEvent('contextmenu', {
    bubbles: true, cancelable: true, clientX: 60, clientY: 90,
  }));
  await flush();
  const allMenu = document.querySelector('.category-menu');
  assert.ok(allMenu);
  assert.match(allMenu.textContent ?? '', /汇总视图，不能重命名/);
  assert.doesNotMatch(allMenu.textContent ?? '', /重命名文件夹|重新命名|新建子文件夹/);
});

test('右键空文件夹移入回收站，非空文件夹禁用删除', async (t) => {
  const page = await fixture(t);
  const { workspace } = page;
  const confirm = window.confirm;
  t.after(() => { window.confirm = confirm; });
  window.confirm = () => true;
  workspace.state.categories = [{ id: '09_测试', name: '09_测试', count: 0, children: [] }];
  workspace.state.category = '09_测试';
  await flush();
  const open = (): void => {
    page.$('[data-category="09_测试"]').dispatchEvent(new window.MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: 80, clientY: 100,
    }));
  };
  open();
  await flush();
  const menu = document.querySelector('.category-menu');
  assert.ok(menu);
  const remove = [...menu.querySelectorAll('button')].find((item) => /删除文件夹/.test(item.textContent ?? ''));
  assert.ok(remove);
  assert.equal(remove.disabled, false);
  click(remove);
  await until(() => page.calls.some((call) => call.path === '/api/categories/delete'));
  assert.deepEqual(
    page.calls.find((call) => call.path === '/api/categories/delete')?.body,
    { category: '09_测试' },
  );
  await until(() => workspace.state.category === '');
  workspace.state.categories = [{ id: '09_测试', name: '09_测试', count: 2, children: [] }];
  await flush();
  open();
  await flush();
  const busyMenu = document.querySelector('.category-menu');
  assert.ok(busyMenu);
  const busyRemove = [...busyMenu.querySelectorAll('button')]
    .find((item) => /删除文件夹/.test(item.textContent ?? ''));
  assert.ok(busyRemove);
  assert.equal(busyRemove.disabled, true);
});

test('下载表单和任务日志保持用户状态，模型与正文内容不能注入 HTML', async (t) => {
  const page = await fixture(t),
    { workspace } = page;
  click(page.$('[data-view="downloads"]'));
  await flush();
  const details = page.$('[data-job-details="job-1"]');
  details.open = true;
  workspace.receive({ type: 'job', job: { id: 'job-1', status: 'running', log: 'updated' } });
  await flush();
  assert.equal(page.$('[data-job-details="job-1"]'), details);
  assert.equal(details.open, true);
  input(page.$('#download-input'), 'synthetic-title');
  page.$('#download-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  assert.equal(
    page.calls.find((call) => call.path === '/api/downloads' && call.method === 'POST').body.input,
    'synthetic-title',
  );
  workspace.state.chat = {
    id: 'safe-chat',
    messages: [
      {
        id: 'safe',
        role: 'assistant',
        text: '<img src=x onerror=alert(1)> [bad](javascript:alert)',
        status: 'completed',
      },
    ],
  };
  await flush();
  assert.equal(page.$('[data-message="safe"] img'), null);
  assert.equal(page.$('[data-message="safe"] a'), null);
});

test('助手消息渲染行内与块级 LaTeX 公式', async (t) => {
  const page = await fixture(t),
    { workspace } = page;
  workspace.state.chat = {
    id: 'math-chat',
    messages: [
      {
        id: 'math',
        role: 'assistant',
        text: `能量满足 $E = mc^2$，其中

$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

为高斯积分。`,
        status: 'completed',
      },
    ],
  };
  await flush();
  const body = page.$('[data-message="math"] .message-body');
  // KaTeX 渲染结果带 katex 类名，原文不再以 $ 包围的纯文本出现。
  assert.ok(body.querySelector('.katex'), '应渲染行内公式');
  assert.ok(body.querySelector('.math-block .katex'), '应渲染块级公式');
  assert.ok(body.querySelector('.katex .mord'), '行内公式应包含符号结构');
  assert.doesNotMatch(body.textContent, /\$E = mc\^2\$/);
  assert.doesNotMatch(body.textContent, /\\int_0/);
});

test('助手消息渲染 LaTeX 原生定界符 \\(...\\) 与 \\[...\\]（模型真实输出）', async (t) => {
  const page = await fixture(t),
    { workspace } = page;
  workspace.state.chat = {
    id: 'native-chat',
    messages: [
      {
        id: 'native',
        role: 'assistant',
        text: `输入原始语音 \\(X\\)，教师目标 \\(Y^T\\)。总损失为：

\\[
L = L_{\\mathrm{Frm}} + \\alpha L_{\\mathrm{Utt}}
\\]

其中 \\(\\alpha\\) 控制权重。`,
        status: 'completed',
      },
    ],
  };
  await flush();
  const body = page.$('[data-message="native"] .message-body');
  // 不应再出现原始定界符字面文本。
  assert.doesNotMatch(body.textContent, /\\\(X\\\)/);
  assert.doesNotMatch(body.textContent, /\\\[/);
  assert.doesNotMatch(body.textContent, /\\mathrm/);
  // 行内与块级都渲染出 katex 结构。
  assert.ok(body.querySelector('.math-block .katex'), '应渲染 \\[...\\] 块级公式');
  const inline = body.querySelectorAll('.katex:not(.katex-display)');
  assert.ok(inline.length >= 3, `应渲染多个行内公式，实际 ${inline.length}`);
});

test('单行块公式剥离定界符，未闭合公式保留后续正文', async (t) => {
  const page = await fixture(t);
  page.workspace.state.chat = {
    id: 'math-boundaries',
    messages: [{
      id: 'boundaries',
      role: 'assistant',
      text: [
        '\\[x^2 + 1\\]',
        '价格从 $5 到 $10，代码为 `$$x$$`。',
        '$$',
        '公式尚未输入完成',
        '',
        '## 后续正文',
      ].join('\n'),
      status: 'completed',
    }],
  };
  await flush();
  const body = page.$('[data-message="boundaries"] .message-body');
  assert.equal(body.querySelectorAll('.math-block .katex').length, 1);
  assert.equal(body.querySelector('.katex-error'), null);
  assert.match(body.textContent, /价格从 \$5 到 \$10/);
  assert.equal(body.querySelector('code')?.textContent, '$$x$$');
  assert.equal(body.querySelector('h2')?.textContent, '后续正文');
});

test('Vue 阅读区保留 PDF 文字层与复制内容，其他面板更新不重建选中页', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(new Uint8Array([137, 80, 78, 71]), {
      headers: { 'Content-Type': 'image/png', 'X-PDF-Pages': '2' },
    });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const page = await fixture(t),
    { workspace } = page;
  click(page.$('[data-paper="L001"]'));
  await until(() => page.$('.pdf-text-layer span'));
  const word = page.$('.pdf-text-layer span')!;
  const range = document.createRange();
  range.selectNodeContents(word);
  document.getSelection()!.removeAllRanges();
  document.getSelection()!.addRange(range);
  const clipboard: Record<string, string> = {};
  const copy = new Event('copy', { bubbles: true, cancelable: true });
  Object.defineProperty(copy, 'clipboardData', {
    value: {
      setData: (type: string, text: string) => {
        clipboard[type] = text;
      },
    },
  });
  word.dispatchEvent(copy);
  assert.equal(clipboard['text/plain'], 'Selectable ');
  workspace.state.draft = '不应重新加载 PDF';
  workspace.state.context.add('L002');
  await flush();
  assert.equal(page.$('.pdf-text-layer span'), word);
  assert.equal(document.getSelection()!.toString(), 'Selectable ');
  assert.equal(workspace.state.papers[0].readStatus, 'unread');
});

test('连续阅读拖选多行标题时，选区与复制内容只包含标题', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(new Blob(['pdf']), {
    headers: { 'content-type': 'image/png', 'X-PDF-Pages': '1' },
  });
  t.after(() => { globalThis.fetch = originalFetch; });
  const word = (text: string, x: number, y: number, width: number) => ({ text, x, y, width, height: 14 });
  const page = await fixture(t, { pdfTextLines: [
    { words: [word('Journal header', 20, 15, 70)] },
    { words: [word('REVIEW', 23, 80, 52)] },
    { words: [word('Article', 20, 110, 50), word('title', 74, 110, 35)] },
    { words: [word('second line', 20, 130, 64)] },
    { words: [word('Authors', 20, 154, 52)] },
  ] });
  click(page.$('[data-paper="L001"]'));
  await until(() => page.$('.pdf-text-layer span'));
  const root = page.$('#reader-content');
  const layer = page.$('.pdf-text-layer');
  const visible = new window.DOMRect(100, 50, 600, 800);
  root.getBoundingClientRect = () => visible;
  layer.getBoundingClientRect = () => visible;
  const drag = (x1: number, y1: number, x2: number, y2: number): string => {
    const emit = (target: EventTarget, type: string, clientX: number, clientY: number, buttons: number): void => {
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY, buttons }));
    };
    emit(layer, 'mousedown', x1, y1, 1);
    emit(document, 'mousemove', x2, y2, 1);
    emit(document, 'mouseup', x2, y2, 0);
    const copy = new Event('copy', { bubbles: true, cancelable: true });
    let copied = '';
    Object.defineProperty(copy, 'clipboardData', { value: { setData: (_type: string, data: string) => { copied = data; } } });
    root.dispatchEvent(copy);
    return copied;
  };
  assert.equal(drag(138, 282, 274, 322), 'Article title\nsecond line');
  assert.equal(drag(274, 322, 138, 282), 'Article title\nsecond line');
  assert.equal(drag(106, 282, 274, 322), '');
});

// 删除笔记只在用户确认后调接口，确认框默认拒绝不产生请求。
test('当前阅读的文献存于服务端文件，并在重启后恢复', async (t) => {
  const page = await fixture(t);
  click(page.$('[data-paper="L002"]'));
  await flush();
  assert.equal(page.workspace.state.current, 'L002');
  assert.equal(page.ui.paperId, 'L002');
  page.unmount();
  page.target.remove();

  // 重新挂载并以同样的服务端状态读取，等价于重启应用：选中项与“当前打开”都要回来。
  const restarted = await fixture(t, { ui: page.ui });
  assert.equal(restarted.workspace.state.current, 'L002');
  assert.ok(restarted.workspace.state.context.has('L002'));

  // 索引里已不存在的编号不能凭存储复活。
  const stale = await fixture(t, { ui: { paperId: 'L999' } });
  assert.equal(stale.workspace.state.current, null);
});

test('栏宽从服务端读回，调整后写回服务端', async (t) => {
  const page = await fixture(t, { ui: { panelWidths: { sidebar: 240 } } });
  const width = () => document.documentElement.style.getPropertyValue('--sidebar-width');
  assert.equal(width(), '240px');

  // 方向键调整左栏宽度，结果应写回服务端界面状态。
  const handle = page.$('[data-resize-panel="sidebar"]');
  handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await flush();
  assert.equal(page.ui.panelWidths.sidebar, 256);
  assert.equal(width(), '256px');
});

test('界面状态接口失败不影响阅读与发消息', async (t) => {
  // 界面状态是偏好：写失败只记错误，选中与渲染仍要正常。
  const page = await fixture(t, { uiPatchError: '磁盘只读' });
  click(page.$('[data-paper="L002"]'));
  await flush();
  assert.equal(page.workspace.state.current, 'L002');
  assert.ok(page.$('#reader-content'));
  assert.equal(page.workspace.state.uiError, '磁盘只读');
});

test('阅读笔记可删除，取消确认不发请求', async (t) => {
  const page = await fixture(t),
    { workspace } = page;
  const confirmations: string[] = [];
  let answer = false;
  window.confirm = ((message: string) => {
    confirmations.push(message);
    return answer;
  }) as typeof window.confirm;
  t.after(() => {
    delete (window as { confirm?: unknown }).confirm;
  });
  click(page.$('[data-paper="L001"]'));
  await flush();
  click(page.$('[data-reader-mode="note"]'));
  await until(() => page.$('.note-document'));
  assert.match(page.$('.note-document').textContent, /正文内容/);
  const remove = page.$('#delete-note');
  assert.equal(remove.getAttribute('aria-label'), '删除当前笔记');

  click(remove);
  await flush();
  assert.equal(confirmations.length, 1);
  assert.match(confirmations[0], /L001_测试笔记/);
  assert.equal(page.calls.some((call) => call.path === '/api/notes/delete'), false);
  assert.equal(workspace.state.papers[0].notes.length, 1);

  answer = true;
  click(page.$('#delete-note'));
  await until(() => page.calls.some((call) => call.path === '/api/notes/delete'));
  await until(() => !page.$('#delete-note'));
  assert.deepEqual(
    page.calls.find((call) => call.path === '/api/notes/delete').body,
    { path: 'notes/L001_测试笔记.md' },
  );
  assert.equal(workspace.state.papers[0].notes.length, 0);
  assert.equal(workspace.state.notePath, '');
  assert.match(page.$('#reader-content').textContent, /阅读笔记尚待积累/);
  assert.match(page.$('.toast-region').textContent, /回收站/);
});

test('高像素密度下升级 PDF 页图，替换成功或失败都保留选区', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalRatio = window.devicePixelRatio;
  const scales: string[] = [];
  let finishUpgrade: (response: Response) => void = () => {};
  const png = () => new Response(new Blob(['pdf']), {
    headers: { 'Content-Type': 'image/png', 'X-PDF-Pages': '1' },
  });
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 });
  globalThis.fetch = async (url) => {
    const scale = new URL(String(url), 'http://localhost').searchParams.get('scale') ?? '';
    scales.push(scale);
    if (scale === '1600') return png();
    if (scale === '2400') return new Promise((resolve) => { finishUpgrade = resolve; });
    return new Response(null, { status: 500 });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: originalRatio });
    document.getSelection()!.removeAllRanges();
  });
  const page = await fixture(t);
  click(page.$('[data-paper="L001"]'));
  await until(() => page.$('.pdf-text-layer span'));
  const sheet = page.$('.pdf-page-sheet') as HTMLElement;
  sheet.getBoundingClientRect = () => {
    const zoom = parseFloat(sheet.style.width) / 100;
    return new window.DOMRect(0, 0, 600 * zoom, 800 * zoom);
  };
  const root = page.$('#reader-content');
  const originalImage = page.$('.pdf-page-image');
  const word = page.$('.pdf-text-layer span');
  const range = document.createRange();
  range.selectNodeContents(word);
  document.getSelection()!.addRange(range);
  root.dispatchEvent(new Event('scroll'));
  await until(() => scales.includes('2400'));
  assert.equal(page.$('.pdf-page-image'), originalImage);
  finishUpgrade(png());
  await until(() => page.$('.pdf-page-image') !== originalImage);
  const sharpImage = page.$('.pdf-page-image');
  assert.equal(page.$('.pdf-text-layer span'), word);
  assert.equal(document.getSelection()!.toString(), 'Selectable ');
  click(page.$('[data-pdf-zoom="50"]'));
  await until(() => scales.includes('4000') && page.workspace.state.pdfSession?.running === 0);
  root.dispatchEvent(new Event('scroll'));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  assert.deepEqual(scales, ['1600', '2400', '4000']);
  assert.equal(page.$('.pdf-page-image'), sharpImage);
  assert.equal(document.getSelection()!.toString(), 'Selectable ');
  assert.equal(page.calls.filter((call) => call.path.includes('/text-layer?')).length, 1);
});

test('连续阅读中 Ctrl+滚轮缩放 PDF 页面，普通滚轮不受影响', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(new Uint8Array([137, 80, 78, 71]), {
      headers: { 'Content-Type': 'image/png', 'X-PDF-Pages': '2' },
    });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const page = await fixture(t);
  click(page.$('[data-paper="L001"]'));
  await until(() => page.$('.pdf-text-layer span'));
  const reader = page.$('#reader-content');
  const width = () => page.$('.pdf-page-sheet').style.width;
  const wheel = (deltaY: number, ctrlKey: boolean) => {
    const event = new window.WheelEvent('wheel', {
      deltaY,
      ctrlKey,
      bubbles: true,
      cancelable: true,
    });
    reader.dispatchEvent(event);
    return event;
  };
  assert.equal(width(), '100%');
  const plain = wheel(-100, false);
  await flush();
  assert.equal(width(), '100%');
  assert.equal(plain.defaultPrevented, false);
  const zoom = wheel(-100, true);
  await flush();
  assert.equal(width(), '110%');
  assert.equal(zoom.defaultPrevented, true);
  assert.match(page.$('#pdf-fit').textContent, /110%/);
  wheel(-100, true);
  await flush();
  assert.equal(width(), '120%');
  for (let index = 0; index < 20; index += 1) wheel(-100, true);
  await flush();
  assert.equal(width(), '200%');
  wheel(100, true);
  await flush();
  assert.equal(width(), '190%');
  for (let index = 0; index < 20; index += 1) wheel(100, true);
  await flush();
  assert.equal(width(), '100%');
  for (let index = 0; index < 24; index += 1) wheel(-4, true);
  await flush();
  assert.equal(width(), '100%');
  wheel(-4, true);
  await flush();
  assert.equal(width(), '110%');
  wheel(100, true);
  await flush();
  assert.equal(width(), '100%');
});

test('推理过程按消息折叠显示，增量流式追加到同一条消息', async (t) => {
  const page = await fixture(t),
    { workspace } = page;
  workspace.state.chat = {
    id: 'thinking-chat',
    messages: [
      { id: 'think', role: 'assistant', text: '先看结论。', thinking: '先核对航向。', status: 'completed' },
    ],
  };
  await flush();
  const details = page.$('[data-message="think"] .message-thinking');
  assert.ok(details);
  assert.equal(details.tagName, 'DETAILS');
  assert.equal(details.open, false);
  assert.match(details.querySelector('summary').textContent, /推理过程/);
  assert.match(details.textContent, /先核对航向/);
  workspace.receive({ type: 'thinking', chatId: 'thinking-chat', messageId: 'think', delta: '再核对样本。' });
  await flush();
  assert.match(page.$('[data-message="think"] .message-thinking').textContent, /再核对样本/);
  assert.equal(workspace.state.chat.messages[0].thinking, '先核对航向。再核对样本。');
});

test('设置面板显示当前思考强度与压缩阈值，修改后提交接口参数', async (t) => {
  const page = await fixture(t);
  click(page.$('#agent-settings'));
  await until(() => page.$('#settings-thinking'));
  assert.equal(page.$('#settings-thinking').value, 'medium');
  assert.equal(page.$('#settings-thinking').options.length, 5);
  assert.equal(page.$('.settings-check input').checked, true);
  assert.equal(page.$('.settings-token-field input').value, '20000');
  input(page.$('#settings-thinking'), 'high');
  page.$('#settings-thinking').dispatchEvent(new Event('change', { bubbles: true }));
  await until(() => page.calls.some((call) => call.path === '/api/agents/pi/settings/thinking'));
  assert.deepEqual(
    page.calls.find((call) => call.path === '/api/agents/pi/settings/thinking').body,
    { level: 'high', model: 'test/luna' },
  );
  const tokens = page.target.querySelectorAll('.settings-token-field input');
  input(tokens[0], '18000');
  tokens[0].dispatchEvent(new Event('change', { bubbles: true }));
  await until(() => page.calls.some((call) => call.path === '/api/agents/pi/settings/compaction'));
  assert.deepEqual(
    page.calls.find((call) => call.path === '/api/agents/pi/settings/compaction').body,
    { enabled: true, reserveTokens: 18000, keepRecentTokens: 30000 },
  );
  assert.equal(page.piSettings.thinking.level, 'high');
  assert.match(page.$('.settings-skills')?.textContent ?? '', /paper-reading/);
  const beforeReload = page.calls.filter((call) => call.path === '/api/commands').length;
  click(page.target.querySelector('.settings-skills')?.parentElement?.querySelector('.text-button'));
  await until(() => page.calls.some((call) => call.path === '/api/agents/pi/skills/reload'));
  await until(() => page.calls.filter((call) => call.path === '/api/commands').length > beforeReload &&
    !page.$('.settings-check input').disabled);
  click(page.$('.settings-check input'));
  await until(() => page.piSettings.compaction.enabled === false);
  const last = page.calls.filter((call) => call.path === '/api/agents/pi/settings/compaction').at(-1);
  assert.deepEqual(last.body, { enabled: false, reserveTokens: 18000, keepRecentTokens: 30000 });
  assert.equal(page.$('#agent-settings').getAttribute('title'), '模型与密钥');
});

test('输入框唤起斜杠命令菜单，键盘与点击都能插入命令', async (t) => {
  const page = await fixture(t);
  const composer = page.$('#chat-input');
  input(composer, '/');
  await flush();
  const menu = page.$('#command-menu');
  assert.ok(menu, '输入 / 应显示命令菜单');
  const names = [...menu.querySelectorAll('[data-command]')].map((node: any) => node.dataset.command);
  assert.deepEqual(names, [
    'help', 'compact', 'settings', 'model', 'changelog', 'skill:paper-reading', 'skill:paper-experiments',
  ]);
  assert.equal(menu.querySelector('[aria-selected="true"]')?.dataset.command, 'help');

  // 输入筛选词后上下键切换，Enter 只插入命令不提交表单。
  input(composer, '/skill:paper-r');
  await flush();
  assert.deepEqual(
    [...page.$('#command-menu').querySelectorAll('[data-command]')].map((node: any) => node.dataset.command),
    ['skill:paper-reading'],
  );
  composer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await flush();
  assert.equal(page.workspace.state.draft, '/skill:paper-reading');
  assert.equal(page.$('#command-menu'), null);
  assert.equal(page.calls.some((call) => call.path.startsWith('/api/chats/') && call.path.endsWith('/commands')), false);

  // 点击菜单项同样只插入命令。
  input(composer, '/help');
  await flush();
  click(page.$('#command-menu [data-command="help"]'));
  await flush();
  assert.equal(page.workspace.state.draft, '/help');
  assert.equal(page.$('#command-menu'), null);

  // 带参数后菜单收起，避免遮挡正文。
  input(composer, '/skill:paper-reading 只看第三节');
  await flush();
  assert.equal(page.$('#command-menu'), null);
  input(composer, '');
  await flush();
});

test('提交斜杠命令走命令接口并保留提示菜单可发现性', async (t) => {
  const page = await fixture(t);
  const composer = page.$('#chat-input');
  // 选中文献与阅读位置必须跟着命令请求一起发送，否则技能回合看不到当前论文。
  page.workspace.state.context.add('L001');
  page.workspace.state.current = 'L001';
  page.workspace.state.pdfPage = 3;
  input(composer, '/help');
  await flush();
  page.$('#chat-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  await until(() => page.calls.some((call) => call.path.startsWith('/api/chats/') && call.path.endsWith('/commands')));
  const call = page.calls.find((item) => item.path.startsWith('/api/chats/') && item.path.endsWith('/commands'));
  assert.equal(call.method, 'POST');
  assert.equal(call.body.text, '/help');
  assert.deepEqual(call.body.paperIds, ['L001']);
  assert.equal(call.body.activePaperId, 'L001');
  assert.equal(call.body.pdfPage, 3);
  assert.match(page.$('#messages').textContent, /斜杠命令/);
  assert.equal(page.workspace.state.draft, '');
});

test('当前论文的两个按钮调用对应技能，保留输入草稿并等待用户确认保存笔记', async (t) => {
  const page = await fixture(t);
  const actions = [...page.target.querySelectorAll<HTMLButtonElement>('.paper-actions button')];
  const [review, summarize] = actions;
  assert.deepEqual(actions.map((button) => button.textContent?.trim()), ['值得读吗？', '总结全文']);
  assert.ok(actions.every((button) => button.disabled));

  const { state } = page.workspace;
  state.context.add('L001');
  state.current = 'L002';
  state.pdfPage = 3;
  input(page.$('#chat-input'), '保留这条准备发送的问题');
  await flush();
  assert.ok(actions.every((button) => !button.disabled));

  const commands = () => page.calls.filter((call) => call.path.endsWith('/commands') && call.method === 'POST');
  review.click();
  await until(() => commands().length === 1 && !state.sending);
  const decision = commands()[0].body;
  assert.match(decision.text, /^\/skill:paper-reading .*证据不足时标为待判断/);
  assert.doesNotMatch(decision.text, /draft_note/);
  assert.ok(state.chat.messages.length > 0);
  assert.equal(summarize.disabled, false);

  summarize.click();
  await until(() => commands().length === 2 && !state.sending);
  const summary = commands()[1].body;
  assert.match(summary.text, /^\/skill:paper-experiments .*调用 draft_note/);
  for (const command of [decision, summary]) {
    assert.deepEqual(command.paperIds, ['L002']);
    assert.equal(command.activePaperId, 'L002');
    assert.equal(command.pdfPage, 3);
  }
  assert.equal(commands()[0].path, commands()[1].path);
  assert.deepEqual([...state.context], ['L001']);
  assert.equal(state.draft, '保留这条准备发送的问题');
  assert.deepEqual(page.noteDecisions, []);
});

test('空白阅读笔记页的两个按钮执行当前论文技能并切到助手面板', async (t) => {
  const page = await fixture(t);
  const { state } = page.workspace;
  click(page.$('[data-paper="L002"]'));
  await flush();
  click(page.$('[data-reader-mode="note"]'));
  await flush();

  const actions = () => [...page.target.querySelectorAll<HTMLButtonElement>('#reader-content .paper-actions button')];
  assert.deepEqual(actions().map((button) => button.textContent?.trim()), ['值得读吗？', '总结全文']);
  assert.equal(page.$('#ask-note'), null);

  const commands = () => page.calls.filter((call) => call.path.endsWith('/commands') && call.method === 'POST');
  for (const [index, skill] of ['paper-reading', 'paper-experiments'].entries()) {
    page.workspace.setPanel('reader');
    await flush();
    actions()[index].click();
    await until(() => commands().length === index + 1 && !state.sending);
    const { body } = commands()[index];
    assert.ok(body.text.startsWith(`/skill:${skill} `));
    assert.equal(body.activePaperId, 'L002');
    assert.deepEqual(body.paperIds, ['L002']);
    assert.equal(state.panel, 'chat');
  }

  click(page.$('[data-reader-mode="pdf"]'));
  await flush();
  assert.equal(actions().length, 0);
  click(page.$('[data-reader-mode="note"]'));
  await flush();
  assert.equal(actions().length, 2);
});
