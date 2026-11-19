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
  'localStorage',
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

async function fixture(t: test.TestContext) {
  localStorage.clear();
  const calls: any[] = [];
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
      notes: [],
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
    if (path === '/api/library')
      return { papers: structuredClone(papers), categories: ['01_超声', '02_模型'] };
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
        lines: [
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
  };
}

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
  click(page.$('#model-trigger'));
  await flush();
  input(page.$('#model-search'), 'luna');
  await flush();
  assert.equal(page.target.querySelectorAll('[role="option"]').length, 1);
  page
    .$('#model-search')
    .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await flush();
  assert.equal(page.workspace.state.model, 'test/luna');
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
  assert.equal(localStorage.getItem('zhiyue.agent'), null);
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
  click(page.$('.settings-check input'));
  await until(() => page.piSettings.compaction.enabled === false);
  const last = page.calls.filter((call) => call.path === '/api/agents/pi/settings/compaction').at(-1);
  assert.deepEqual(last.body, { enabled: false, reserveTokens: 18000, keepRecentTokens: 30000 });
  assert.equal(page.$('#agent-settings').getAttribute('title'), '模型与密钥');
});
