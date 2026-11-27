import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { activeClassifyRun, type ChatClassifyRun } from '../../shared/contracts.js';
import {
  translationCounts,
  type PdfTranslationBatch, type PdfTranslationBatchRequest, type PdfTranslationSnapshot,
} from '../../shared/pdfTranslation.js';

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
export type Json = Record<string, any>;
export interface FixturePaper extends Json {
  literature_id: string;
  notes: Array<{ path: string; title?: string }>;
}
export interface TranslationApiCall {
  path: string;
  method: string;
  body?: any;
}
export interface VirtualLayout {
  width?: number;
  height?: number;
  rowHeight?: (key: string, width: number) => number;
}
export interface FrontendFixtureOptions {
  virtualLayout?: VirtualLayout;
  ui?: Json;
  uiPatchError?: string;
  pdfTextLines?: Json[];
  pdfTranslation?: Json;
  papers?: FixturePaper[];
  chats?: Json[];
  // 归类接口及会话补查可延迟或丢失响应；next 使用持久化运行记录的模拟服务。
  classificationApi?: (call: TranslationApiCall, next: () => Promise<any>) => any;
  translations?: PdfTranslationSnapshot;
  // next 使用默认模拟服务；覆盖函数可以延迟返回，或先受理再抛错以模拟响应丢失。
  translationApi?: (call: TranslationApiCall, next: () => Promise<any>) => any;
}
interface MountedWorkspace {
  version: string;
  workspace: Json & { receive: (event: Json) => void };
  ready: Promise<void>;
  unmount: () => void;
}

export const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://127.0.0.1:8765/',
  pretendToBeVisual: true,
});
export const { window } = dom;
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
const virtualLayouts = new WeakMap<Element, VirtualLayout>();
const resizeObservers = new Set<FixtureResizeObserver>();
function virtualLayoutOf(element: Element): VirtualLayout {
  const chain: VirtualLayout[] = [];
  for (let current: Element | null = element; current; current = current.parentElement) {
    const layout = virtualLayouts.get(current);
    if (layout) chain.unshift(layout);
  }
  return Object.assign({}, ...chain);
}
class FixtureResizeObserver {
  readonly targets = new Set<Element>();
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(element: Element): void { this.targets.add(element); resizeObservers.add(this); }
  unobserve(element: Element): void { this.targets.delete(element); }
  disconnect(): void { this.targets.clear(); resizeObservers.delete(this); }
  deliver(elements: Element[]): void {
    const entries = elements.filter((element) => this.targets.has(element)).map((target) => {
      const contentRect = target.getBoundingClientRect();
      const size = { inlineSize: contentRect.width, blockSize: contentRect.height };
      return { target, contentRect, borderBoxSize: [size], contentBoxSize: [size], devicePixelContentBoxSize: [size] };
    });
    if (entries.length) this.callback(entries, this as unknown as ResizeObserver);
  }
}
globalThis.ResizeObserver = FixtureResizeObserver as unknown as typeof ResizeObserver;
/** 显式触发观察中的视口与行，测试可改变宽度及换行后的高度，无需真实排版或毫秒耗时断言。 */
export function resizeVirtualList(element: HTMLElement, layout: VirtualLayout): void {
  virtualLayouts.set(element, { ...virtualLayouts.get(element), ...layout });
  const elements = [element, ...element.querySelectorAll<HTMLElement>('.virtual-row')];
  for (const observer of resizeObservers) observer.deliver(elements);
}
export function resizeObservationCount(element: Element): number {
  return [...resizeObservers].filter((observer) => observer.targets.has(element)).length;
}
globalThis.IntersectionObserver = class {
  observe() {}
  disconnect() {}
} as unknown as typeof IntersectionObserver;
Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
  configurable: true,
  get() {
    if (this.classList.contains('virtual-list')) return virtualLayoutOf(this).width ?? 600;
    return this.classList.contains('shell') ? 1440 : 600;
  },
});
Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
  configurable: true,
  get() {
    if (this.classList.contains('virtual-list')) return virtualLayoutOf(this).height ?? 800;
    return 800;
  },
});
const originalBoundingRect = window.HTMLElement.prototype.getBoundingClientRect;
window.HTMLElement.prototype.getBoundingClientRect = function () {
  if (this.classList.contains('virtual-list')) return new window.DOMRect(0, 0, this.clientWidth, this.clientHeight);
  if (this.classList.contains('virtual-row')) {
    const list = this.closest<HTMLElement>('.virtual-list');
    const layout = virtualLayoutOf(this);
    if (list && layout.rowHeight) {
      const offset = Number(/translateY\(([-.\d]+)px\)/.exec(this.style.transform)?.[1]) || 0;
      return new window.DOMRect(0, offset - list.scrollTop, list.clientWidth,
        layout.rowHeight(this.dataset.virtualKey ?? '', list.clientWidth));
    }
  }
  return originalBoundingRect.call(this);
};
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
export const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};
export async function frames(count = 3): Promise<void> {
  for (let index = 0; index < count; index++) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await flush();
  }
}
export const until = async (predicate: () => boolean) => {
  for (let index = 0; index < 100; index++) {
    if (predicate()) return;
    await flush();
  }
  throw new Error('界面状态等待超时');
};
export const input = (element: any, value: string) => {
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
};
export const click = (element: any): boolean => element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

// `ui` 模拟文献库里的界面状态：传入上一次写回的值即可模拟重启后读回。
export async function fixture(
  t: test.TestContext,
  {
    ui = {}, uiPatchError = '', pdfTextLines, pdfTranslation, papers: suppliedPapers, virtualLayout,
    chats: suppliedChats = [], classificationApi,
    translations = {
      engineAvailable: pdfTranslation?.engineAvailable ?? false,
      model: pdfTranslation?.model ?? null, batches: [], jobs: [],
    },
    translationApi,
  }: FrontendFixtureOptions = {},
) {
  let translationSequence = 0;
  let batchSequence = 0;
  let classifySequence = suppliedChats.reduce((sequence, chat) => Math.max(sequence,
    ...(chat.classifyRuns ?? []).map((run: ChatClassifyRun) => Number(run.id.split('-').at(-1)) || 0)), 0);
  const calls: any[] = [];
  const uiState: Json = { chatId: null, paperId: null, panelWidths: {}, ...ui };
  const decisions: any[] = [];
  const noteDecisions: any[] = [];
  const folderDecisions: any[] = [];
  const classifyDecisions: any[] = [];
  const chats = new Map<string, any>(suppliedChats.map((chat) => [chat.id, structuredClone(chat)]));
  const papers: FixturePaper[] = suppliedPapers ? structuredClone(suppliedPapers) : [
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
  const eventSources: Events[] = [];
  class Events {
    onopen?: () => void;
    onerror?: () => void;
    onmessage?: (event: { data: string }) => void;
    closed = false;
    constructor() {
      eventSources.push(this);
      queueMicrotask(() => this.open());
    }
    open(): void {
      if (!this.closed) this.onopen?.();
    }
    error(): void {
      if (!this.closed) this.onerror?.();
    }
    message(data: Json): void {
      if (!this.closed) this.onmessage?.({ data: JSON.stringify(data) });
    }
    close(): void {
      this.closed = true;
    }
  }
  async function translationResponse({ path, method, body }: TranslationApiCall) {
    if (path === '/api/translations') return structuredClone(translations);
    if (path === '/api/translations/batches' && method === 'POST') {
      const request = body as PdfTranslationBatchRequest;
      const previous = translations.batches.find(({ requestId }) => requestId === request.requestId);
      if (previous) {
        return { batch: structuredClone(previous), snapshot: structuredClone(translations), replayed: true };
      }
      const id = `batch-${++batchSequence}`;
      const createdAt = new Date().toISOString();
      const queued = translations.jobs.filter(({ status }) => status === 'queued').length;
      const jobs = request.paperIds.map((paperId, index) => ({
        id: `${id}-job-${index + 1}`, paperId, model: request.model, batchId: id, key: null,
        status: 'queued' as const, percent: 0, stage: '等待翻译', queuePosition: queued + index + 1,
        createdAt, updatedAt: createdAt,
      }));
      const batch: PdfTranslationBatch = {
        id, requestId: request.requestId, paperIds: [...request.paperIds], jobIds: jobs.map(({ id }) => id),
        model: request.model, regenerate: request.regenerate === true, createdAt, status: 'queued',
        counts: translationCounts(jobs),
      };
      translations.jobs.push(...jobs);
      translations.batches.unshift(batch);
      return { batch: structuredClone(batch), snapshot: structuredClone(translations), replayed: false };
    }
    const cancel = /^\/api\/translations\/batches\/([^/]+)\/cancel$/.exec(path);
    if (cancel && method === 'POST') {
      const batch = translations.batches.find(({ id }) => id === decodeURIComponent(cancel[1]));
      assert.ok(batch, '取消的翻译批次必须存在');
      const jobs = translations.jobs.filter(({ id }) => batch.jobIds.includes(id));
      for (const job of jobs) {
        if (job.status === 'queued') Object.assign(job, { status: 'cancelled', stage: '已取消' });
        else if (job.status === 'running') Object.assign(job, { status: 'cancelling', stage: '正在取消' });
      }
      batch.counts = translationCounts(jobs);
      batch.status = batch.counts.running ? 'cancelling'
        : batch.counts.cancelled === batch.counts.total ? 'cancelled' : 'partial';
      return structuredClone(translations);
    }
    if (/^\/api\/papers\/L\d+\/translation\/markdown\?/.test(path)) {
      const key = new URL(path, 'http://localhost').searchParams.get('key') || '';
      return {
        key,
        text: [
          '# Original Paper Title',
          '',
          `这是译本 ${key.slice(0, 8)} 的中文正文，包含公式 $E=mc^2$。`,
          '',
          '![](images/fig1.png)',
          '',
          '<table><tr><th>Metric</th><th>Score</th></tr>' +
            '<tr><td>AUROC</td><td>0.95 &#x110000; &#1114112; &#x1F4D6;</td></tr></table>',
        ].join('\n'),
        result: pdfTranslation?.result ?? null,
      };
    }
    const route = /^\/api\/papers\/(L\d+)\/translation(\/cancel)?$/.exec(path);
    if (route) {
      if (!pdfTranslation || route[1] !== 'L001') {
        return { engineAvailable: false, model: null, job: null, result: null, updateAvailable: false };
      }
      if (method === 'POST' && route[2]) {
        assert.equal(body.jobId, pdfTranslation.job.id);
        Object.assign(pdfTranslation.job, { status: 'cancelling', stage: '正在取消' });
      } else if (method === 'POST') {
        const sequence = ++translationSequence;
        pdfTranslation.job = {
          id: `translation-${sequence}`, paperId: 'L001', key: sequence.toString(16).padStart(64, '0'),
          status: 'running', percent: 25, stage: '翻译与排版',
        };
      }
      return structuredClone(pdfTranslation);
    }
    throw new Error(`未定义的测试翻译接口：${path}`);
  }
  async function api(path: string, options: any = {}) {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    const call = { path, method: options.method || 'GET', body };
    calls.push(call);
    if (classificationApi && (path.startsWith('/api/chats') || path.startsWith('/api/jobs/'))) {
      return classificationApi(call, async () => response(path, options, body, call));
    }
    return response(path, options, body, call);
  }
  function response(path: string, options: any, body: any, call: TranslationApiCall) {
    if (path === '/api/translations' || path.startsWith('/api/translations/') ||
      /^\/api\/papers\/L\d+\/translation(?:[/?]|$)/.test(path)) {
      const next = () => translationResponse(call);
      return translationApi ? translationApi(call, next) : next();
    }
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
      const chat = {
        ...body, id: 'chat-1', messages: [], classifyRuns: [], classifyRevision: 0, createdAt: new Date().toISOString(),
      };
      chats.set(chat.id, chat);
      return structuredClone(chat);
    }
    if (path === '/api/chats') return [...chats.values()].map((chat) => {
      const { classifyRuns, classifyProposals, classifyRevision, ...summary } = chat;
      return structuredClone({ ...summary, classifyRunning: (classifyRuns ?? []).some(activeClassifyRun) });
    });
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
          {
            name: 'skill:paper-organize',
            description: '根据笔记或中文翻译归类论文。',
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
    if (/^\/api\/chats\/[^/]+\/folder-actions$/.test(path)) {
      folderDecisions.push({ id: path.split('/')[3], body });
      return {
        applied: body.action === 'apply' ? body.ids.filter((id: string) => id !== 'blocked') : [],
        discarded: body.action === 'discard' ? body.ids : [], remaining: [],
        failed: body.action === 'apply' && body.ids.includes('blocked')
          ? [{ id: 'blocked', error: '文件夹不是空的。' }] : [],
      };
    }
    if (/^\/api\/chats\/[^/]+\/classify-proposals$/.test(path)) {
      const chatId = path.split('/')[3];
      const chat = chats.get(chatId);
      assert.ok(chat, '归类请求所属的测试会话必须存在');
      classifyDecisions.push({ id: chatId, body });
      if (body.action === 'discard') {
        chat.classifyProposals = (chat.classifyProposals ?? []).filter((item: Json) => !body.ids.includes(item.id));
        chat.classifyRevision = (chat.classifyRevision ?? 0) + 1;
        const message = {
          id: `classify-result-${++classifySequence}`, role: 'system', status: 'completed',
          text: '已取消 L002 的归类请求，本次未新建文件夹或移动论文。',
        };
        chat.messages.push(message);
        return { applied: [], discarded: body.ids, failed: [], remaining: [], message };
      }
      assert.match(body.requestId, /^[A-Za-z0-9_-]{1,128}$/);
      const previous = (chat.classifyRuns ?? []).find((run: ChatClassifyRun) => run.requestId === body.requestId);
      if (previous) {
        assert.deepEqual([...previous.proposalIds].sort(), [...body.ids].sort());
        return { run: structuredClone(previous), job: structuredClone(jobs.get(previous.jobId)), replayed: true };
      }
      const sequence = ++classifySequence;
      const proposals = chat.classifyProposals.filter((proposal: Json) => body.ids.includes(proposal.id));
      assert.equal(proposals.length, body.ids.length);
      const revision = chat.classifyRevision = (chat.classifyRevision ?? 0) + 1;
      const createdAt = new Date().toISOString();
      const run: ChatClassifyRun = {
        id: `classify-run-${sequence}`, requestId: body.requestId, proposalIds: [...body.ids].sort(),
        proposals: structuredClone(proposals), jobId: `classify-job-${sequence}`, status: 'queued', stage: '排队中',
        revision, createdFolders: [], items: proposals.map((proposal: Json) => ({
          proposalId: proposal.id, paperId: proposal.paperId, category: proposal.targetPath, status: 'pending',
        })), messageId: `classify-result-${sequence}`, createdAt, updatedAt: createdAt,
      };
      (chat.classifyRuns ??= []).push(run);
      const job = {
        id: run.jobId!, title: `归类 ${proposals.length} 篇论文`, status: 'queued', log: '',
        classification: { chatId, runId: run.id }, createdAt, updatedAt: createdAt,
      };
      jobs.set(job.id, job);
      return { run: structuredClone(run), job: structuredClone(job), replayed: false };
    }
    if (options.method === 'POST' && /^\/api\/papers\/L\d+\/move$/.test(path)) {
      const paper = papers.find((item) => path.includes(item.literature_id));
      if (paper) Object.assign(paper, { category: body.category, subcategory: body.subcategory ?? '' });
      return { literature_id: paper?.literature_id, moved: [] };
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
    if (path.startsWith('/api/jobs/')) return structuredClone(jobs.get(decodeURIComponent(path.split('/')[3])));
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
  function completeClassification(chatId: string, patch: Partial<ChatClassifyRun> = {}): ChatClassifyRun {
    const chat = chats.get(chatId);
    const run = chat?.classifyRuns?.at(-1) as ChatClassifyRun | undefined;
    assert.ok(run, '完成的测试归类任务必须已经受理');
    const items = patch.items ?? run.items.map((item) => ({
      ...item, status: item.proposalId === 'blocked' ? 'blocked' as const : 'moved' as const,
      ...(item.proposalId === 'blocked' ? { error: '目标目录不可写。' } : {}),
    }));
    Object.assign(run, {
      items, status: items.some((item) => item.status === 'blocked') ? 'partial' : 'completed',
      stage: '归类已完成', createdFolders: [...new Set(run.proposals.filter((item) => item.willCreateCategory ||
        item.willCreateSubcategory).map((item) => item.targetPath))], ...patch,
      revision: chat.classifyRevision = (chat.classifyRevision ?? 0) + 1, updatedAt: new Date().toISOString(),
    });
    const successful = new Set(run.items.filter((item) => ['moved', 'unchanged'].includes(item.status))
      .map((item) => item.proposalId));
    chat.classifyProposals = chat.classifyProposals.filter((item: Json) => !successful.has(item.id));
    for (const proposal of chat.classifyProposals) {
      const item = run.items.find((item) => item.proposalId === proposal.id);
      if (item?.error) proposal.error = item.error;
    }
    const message = {
      id: run.messageId, role: 'system', status: 'completed', text: [
        ...run.createdFolders.map((folder) => `已新建文件夹：\`${folder}\`。`),
        ...run.items.map((item) => ['moved', 'unchanged'].includes(item.status)
          ? `${item.paperId} 已归类至 \`${item.category}\`。` : `${item.paperId}：${item.error ?? '归类失败'}`),
      ].join('\n\n'),
    };
    const existing = chat.messages.find((item: Json) => item.id === message.id);
    if (existing) Object.assign(existing, message);
    else chat.messages.push(message);
    const job = jobs.get(run.jobId!);
    if (job) Object.assign(job, { status: run.status, updatedAt: run.updatedAt });
    const events = eventSources[0];
    events?.message({
      type: 'classifyRun', chatId, run, revision: run.revision, proposals: chat.classifyProposals,
    });
    events?.message({ type: 'message', chatId, message });
    if (job) events?.message({ type: 'job', job });
    events?.message({ type: 'library' });
    return structuredClone(run);
  }
  const target = document.createElement('div');
  if (virtualLayout) virtualLayouts.set(target, virtualLayout);
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
    papers,
    translations,
    events: eventSources[0]!,
    decisions,
    noteDecisions,
    folderDecisions,
    classifyDecisions,
    completeClassification,
    chats,
    status,
    piSettings,
    ui: uiState,
  };
}
