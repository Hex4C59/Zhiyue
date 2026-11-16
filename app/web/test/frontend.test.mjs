import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

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
globalThis.getComputedStyle = window.getComputedStyle;
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
window.matchMedia = () => ({ matches: false });
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
globalThis.IntersectionObserver = class {
  observe() {}
  disconnect() {}
};
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
window.HTMLCanvasElement.prototype.getContext = () => ({
  font: '',
  measureText: (text) => ({ width: text.length * 7 }),
});
globalThis.Image = function () {
  const image = new window.Image();
  Object.defineProperties(image, { naturalWidth: { value: 300 }, naturalHeight: { value: 400 } });
  image.decode = async () => {};
  return image;
};
// Vue 的 DOM 运行时在导入时读取 document，因此先建立测试文档，再加载真实构建产物。
const { mountWorkspace } = await import('../dist/app.js');
const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};
const until = async (predicate) => {
  for (let index = 0; index < 100; index++) {
    if (predicate()) return;
    await flush();
  }
  throw new Error('界面状态等待超时');
};
const input = (element, value) => {
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
};
const click = (element) => element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

async function fixture(t) {
  localStorage.clear();
  const calls = [],
    decisions = [],
    chats = new Map();
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
  const status = {
    defaultProvider: 'pi',
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
  const jobs = new Map([['job-1', { id: 'job-1', title: '测试下载', status: 'running', log: 'start' }]]);
  class Events {
    constructor() {
      queueMicrotask(() => this.onopen?.());
    }
    close() {
      this.closed = true;
    }
  }
  async function api(path, options = {}) {
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
    if (path.startsWith('/api/papers/') && options.method === 'PATCH') {
      const paper = papers.find((item) => path.endsWith(item.literature_id));
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
    $: (selector) => target.querySelector(selector),
    calls,
    decisions,
    chats,
    status,
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
    paragraph = body.firstChild;
  const range = document.createRange();
  range.selectNodeContents(paragraph);
  document.getSelection().removeAllRanges();
  document.getSelection().addRange(range);
  const messages = page.$('#messages');
  Object.defineProperty(messages, 'scrollHeight', { configurable: true, value: 2000 });
  messages.scrollTop = 123;
  workspace.receive({ type: 'delta', chatId: 'local-chat', messageId: 'live', delta: '的增量。' });
  await flush();
  assert.equal(page.$('[data-message="completed"] .message-body').firstChild, paragraph);
  assert.equal(document.getSelection().toString(), '这段文字需要保持可选。');
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
  const word = page.$('.pdf-text-layer span');
  const range = document.createRange();
  range.selectNodeContents(word);
  document.getSelection().removeAllRanges();
  document.getSelection().addRange(range);
  const clipboard = {};
  const copy = new Event('copy', { bubbles: true, cancelable: true });
  Object.defineProperty(copy, 'clipboardData', {
    value: {
      setData: (type, text) => {
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
  assert.equal(document.getSelection().toString(), 'Selectable ');
  assert.equal(workspace.state.papers[0].readStatus, 'unread');
});
