import test from 'node:test';
import assert from 'node:assert/strict';
import {
  translationCounts,
  type PdfTranslationJob, type PdfTranslationJobStatus, type PdfTranslationSnapshot,
} from '../shared/pdfTranslation.js';
import {
  click, fixture, flush, frames, input, resizeVirtualList, until, window,
} from './helpers/frontendFixture.js';
import type { FixturePaper, FrontendFixtureOptions, Json } from './helpers/frontendFixture.js';

type Page = Awaited<ReturnType<typeof fixture>>;
const modelKey = 'zhiyue.translationModel';
const batchPath = '/api/translations/batches';
const singlePath = '/api/papers/L001/translation';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function papers(count = 8): FixturePaper[] {
  return Array.from({ length: count }, (_, index) => ({
    literature_id: `L${String(index + 1).padStart(3, '0')}`,
    title: `批量论文 ${String(count - index).padStart(2, '0')}`,
    authors: ['Test Author'], year: 2026, file: `papers/test-${index + 1}.pdf`,
    category: '01_超声', notes: [], readStatus: 'reading', starred: true,
  }));
}

function emptySnapshot(): PdfTranslationSnapshot {
  return { engineAvailable: true, model: 'test/luna', batches: [], jobs: [] };
}

function history(statuses: PdfTranslationJobStatus[]): PdfTranslationSnapshot {
  const createdAt = '2026-11-20T00:00:00.000Z';
  const jobs: PdfTranslationJob[] = statuses.map((status, index) => ({
    id: `history-job-${index + 1}`, paperId: `L${String(index + 1).padStart(3, '0')}`,
    batchId: 'history-batch', model: 'test/sonnet',
    key: status === 'queued' ? null : String(index + 1).repeat(64), status,
    percent: status === 'completed' ? 100 : status === 'saving' ? 99 : status === 'running' ? 42 : 0,
    stage: {
      queued: '等待翻译', running: '翻译与排版', cancelling: '正在取消', saving: '保存译本',
      completed: '翻译完成', skipped: '已有匹配译本', failed: '翻译失败', cancelled: '已取消',
    }[status],
    ...(status === 'queued' ? { queuePosition: 1 } : {}),
    ...(status === 'failed' ? { error: '测试模型暂时不可用' } : {}),
    ...(status === 'skipped' ? { reason: '原文与已完成译本一致' } : {}),
    createdAt, updatedAt: createdAt,
  }));
  return {
    engineAvailable: true, model: 'test/luna', jobs,
    batches: [{
      id: 'history-batch', requestId: 'history-request', paperIds: jobs.map(({ paperId }) => paperId),
      jobIds: jobs.map(({ id }) => id), model: 'test/sonnet', regenerate: true,
      createdAt, status: 'running', counts: translationCounts(jobs),
    }],
  };
}

async function translationFixture(t: test.TestContext, options: FrontendFixtureOptions = {}): Promise<Page> {
  const previousModel = window.localStorage.getItem(modelKey);
  const previousFetch = globalThis.fetch;
  window.localStorage.removeItem(modelKey);
  // 原文页图也只返回合成数据，整个测试不访问本地服务或真实模型。
  globalThis.fetch = async (url) => {
    assert.match(String(url), /\/preview\?/);
    return new Response(new Uint8Array([137, 80, 78, 71]), {
      headers: { 'Content-Type': 'image/png', 'X-PDF-Pages': '2' },
    });
  };
  t.after(() => {
    globalThis.fetch = previousFetch;
    if (previousModel === null) window.localStorage.removeItem(modelKey);
    else window.localStorage.setItem(modelKey, previousModel);
  });
  return fixture(t, { papers: papers(), translations: emptySnapshot(), ...options });
}

function change(element: HTMLSelectElement, value: string): void {
  element.value = value;
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

const candidateIds = (page: Page): string[] =>
  [...page.target.querySelectorAll<HTMLElement>('[data-translation-candidate]')]
    .map((node) => node.dataset.translationCandidate!);
const selectedIds = (page: Page): string[] =>
  [...page.target.querySelectorAll<HTMLElement>('[data-translation-candidate]')]
    .filter((node) => node.querySelector<HTMLInputElement>('input')!.checked)
    .map((node) => node.dataset.translationCandidate!);
const submissions = (page: Page) => page.calls.filter(({ path, method }) => path === batchPath && method === 'POST');
const translationGets = (page: Page) => page.calls.filter(({ path }) => path === '/api/translations').length;
const batch = (page: Page, id = 'history-batch'): HTMLElement => page.$(`[data-translation-batch="${id}"]`);
const counts = (section: HTMLElement): string[] =>
  [...section.querySelectorAll('.translation-counts span')].map((node) => node.textContent!.trim());

async function openNew(page: Page): Promise<void> {
  click(page.$('[data-batch-translation]'));
  await until(() => !!page.$('.translation-form') && !page.workspace.state.translationLoading);
}

async function openTasks(page: Page): Promise<void> {
  click(page.$('#translation-tasks'));
  await until(() => !!page.$('.translation-task-body') && !page.workspace.state.translationLoading);
}

async function expandBatch(page: Page, id = 'history-batch'): Promise<void> {
  const details = batch(page, id).querySelector('details')!;
  details.open = true;
  details.dispatchEvent(new Event('toggle'));
  await until(() => !!details.querySelector('.translation-job-list'));
}

function navigate(element: HTMLElement, key: string): void {
  element.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

async function chooseModel(page: Page, scope: string, model: string): Promise<void> {
  click(page.$(`${scope} [data-translation-model-trigger]`));
  await flush();
  if (model) {
    click(page.$(`${scope} [data-translation-provider-value="${model.split('/')[0]}"]`));
    await flush();
  }
  click(page.$(`${scope} [data-translation-model-value="${model}"]`));
  await flush();
}

test('批量翻译冻结当前全部筛选及题名排序，可选择超过六篇且不改助手上下文', async (t) => {
  const library = papers(13);
  Object.assign(library[8], { title: '其他论文' });
  Object.assign(library[9], { year: 2025 });
  Object.assign(library[10], { readStatus: 'unread' });
  Object.assign(library[11], { starred: false });
  Object.assign(library[12], { category: '02_模型' });
  const page = await translationFixture(t, { papers: library });
  const { state } = page.workspace;
  const context = state.context;
  for (const paper of library.slice(7)) context.add(paper.literature_id);
  const originalContext = [...context];
  state.categories = [
    { id: '01_超声', name: '01_超声', count: 12 },
    { id: '02_模型', name: '02_模型', count: 1 },
  ];
  await flush();
  click(page.$('[data-category="01_超声"][data-subcategory=""] .category-button'));
  input(page.$('#search'), '批量论文');
  change(page.$('#year-filter'), '2026');
  change(page.$('#read-filter'), 'reading');
  click(page.$('#star-filter'));
  change(page.$('#sort'), 'title');
  await until(() => page.$('#result-count').textContent === '8 篇文献');
  const expected = ['L008', 'L007', 'L006', 'L005', 'L004', 'L003', 'L002', 'L001'];
  assert.deepEqual(
    [...page.target.querySelectorAll<HTMLElement>('[data-paper]')].map((node) => node.dataset.paper), expected,
  );
  await openNew(page);
  assert.deepEqual(candidateIds(page), expected);
  assert.deepEqual(selectedIds(page), expected);
  assert.equal(page.$('[data-translation-selected]').textContent, '已选 8 / 8 篇');
  assert.equal(state.context, context);
  assert.deepEqual([...state.context], originalContext);

  // 后台筛选变化不能改变已经展示给用户确认的批次范围与提交顺序。
  state.query = '其他论文';
  state.sort = 'id';
  await flush();
  assert.equal(page.$('#result-count').textContent, '1 篇文献');
  assert.deepEqual(candidateIds(page), expected);
  click(page.$('[data-translation-submit]'));
  await until(() => !!page.$('[data-translation-batch="batch-1"]'));
  assert.deepEqual(submissions(page)[0].body.paperIds, expected);
  assert.deepEqual([...state.context], originalContext);
  assert.equal(state.current, null);
  assert.equal(page.calls.some(({ path, method }) => path === '/api/chats' && method === 'POST'), false);
});

test('批量文献可逐项勾选、全选和清空，清空禁用提交并按候选顺序发送所选项', async (t) => {
  const page = await translationFixture(t);
  await openNew(page);
  click(page.$('[aria-label="选择 L002"]'));
  await flush();
  assert.equal(selectedIds(page).length, 7);
  assert.equal(page.$('[data-translation-selected]').textContent, '已选 7 / 8 篇');
  click(page.$('[data-translation-clear]'));
  await flush();
  assert.deepEqual(selectedIds(page), []);
  assert.equal(page.$('[data-translation-submit]').disabled, true);
  click(page.$('[aria-label="选择 L003"]'));
  await flush();
  assert.deepEqual(selectedIds(page), ['L003']);
  click(page.$('[data-translation-select-all]'));
  await flush();
  assert.deepEqual(selectedIds(page), papers().map(({ literature_id }) => literature_id));
  click(page.$('[data-translation-clear]'));
  await flush();
  click(page.$('[aria-label="选择 L003"]'));
  click(page.$('[aria-label="选择 L001"]'));
  await flush();
  assert.equal(page.$('[data-translation-submit]').textContent.trim(), '开始翻译 2 篇');
  click(page.$('[data-translation-submit]'));
  await until(() => !!page.$('[data-translation-batch="batch-1"]'));
  assert.deepEqual(submissions(page)[0].body.paperIds, ['L001', 'L003']);
  assert.equal(page.workspace.state.context.size, 0);
});

test('全选排除缺失原文、非 PDF 和文献目录外文件，仍显示禁用原因', async (t) => {
  const library = papers();
  Object.assign(library[5], { _file_exists: false });
  Object.assign(library[6], { file: 'papers/test.txt' });
  Object.assign(library[7], { file: 'notes/test.pdf' });
  const page = await translationFixture(t, { papers: library });
  await openNew(page);
  assert.equal(page.$('[data-translation-selected]').textContent, '已选 5 / 8 篇');
  for (const id of ['L006', 'L007', 'L008']) {
    assert.equal(page.$(`[aria-label="选择 ${id}"]`).disabled, true);
    assert.match(page.$(`[data-translation-candidate="${id}"]`).textContent, /原文 PDF 不可用/);
  }
  click(page.$('[data-translation-clear]'));
  click(page.$('[data-translation-select-all]'));
  await flush();
  assert.deepEqual(selectedIds(page), ['L001', 'L002', 'L003', 'L004', 'L005']);
  click(page.$('[data-translation-submit]'));
  await until(() => !!page.$('[data-translation-batch="batch-1"]'));
  assert.deepEqual(submissions(page)[0].body.paperIds, ['L001', 'L002', 'L003', 'L004', 'L005']);
});

test('批量和单篇共用可搜索模型选择与本机偏好，跟随默认时清除显式选择', async (t) => {
  const translations = emptySnapshot();
  translations.model = 'test/sonnet';
  const pdfTranslation: Json = {
    engineAvailable: true, model: 'test/sonnet', result: null, job: null, updateAvailable: false,
  };
  const page = await translationFixture(t, { translations, pdfTranslation });
  click(page.$('[data-paper="L001"]'));
  await until(() => !!page.$('.pdf-translation-bar [data-translation-model-trigger]'));
  await openNew(page);
  assert.match(page.$('.translation-dialog [data-translation-model-trigger]').textContent, /test\/sonnet/);
  assert.equal(page.workspace.state.translationModel, '');
  click(page.$('.translation-dialog [data-translation-model-trigger]'));
  await flush();
  input(page.$('.translation-dialog [data-translation-model-search]'), '没有此服务商');
  await flush();
  assert.match(page.$('.translation-dialog .model-empty').textContent, /未找到服务商/);
  input(page.$('.translation-dialog [data-translation-model-search]'), 'TEST');
  await flush();
  assert.ok(page.$('.translation-dialog [data-translation-provider-value="test"]'));
  click(page.$('.translation-dialog [data-translation-provider-value="test"]'));
  await flush();
  assert.equal(page.$('.translation-dialog [data-translation-model-search]').getAttribute('aria-label'), '搜索模型');
  input(page.$('.translation-dialog [data-translation-model-search]'), '不存在的模型');
  await flush();
  assert.match(page.$('.translation-dialog .model-empty').textContent, /未找到模型/);
  input(page.$('.translation-dialog [data-translation-model-search]'), 'sONNet');
  await flush();
  assert.equal(page.$('.translation-dialog [data-translation-model-value="test/luna"]'), null);
  click(page.$('.translation-dialog [data-translation-model-value="test/sonnet"]'));
  await flush();
  assert.equal(window.localStorage.getItem(modelKey), 'test/sonnet');
  assert.match(page.$('.pdf-translation-bar [data-translation-model-trigger]').textContent, /test\/sonnet/);
  click(page.$('[aria-label="关闭翻译窗口"]'));
  await flush();
  await chooseModel(page, '.pdf-translation-bar', 'test/luna');
  assert.equal(window.localStorage.getItem(modelKey), 'test/luna');
  await openNew(page);
  assert.match(page.$('.translation-dialog [data-translation-model-trigger]').textContent, /test\/luna/);
  await chooseModel(page, '.translation-dialog', '');
  assert.equal(page.workspace.state.translationModel, '');
  assert.equal(window.localStorage.getItem(modelKey), null);
  for (const scope of ['.translation-dialog', '.pdf-translation-bar']) {
    assert.match(page.$(`${scope} [data-translation-model-trigger]`).textContent, /test\/sonnet/);
  }
  click(page.$('[data-translation-submit]'));
  await until(() => !!page.$('[data-translation-batch="batch-1"]'));
  assert.equal(submissions(page)[0].body.model, 'test/sonnet');
});

test('慢提交期间重复点击与表单提交只创建一批，早到的 SSE 进度不被提交响应覆盖', async (t) => {
  const release = deferred<void>();
  const page = await translationFixture(t, {
    translationApi: async ({ path, method }, next) => {
      const response = await next();
      if (path === batchPath && method === 'POST') await release.promise;
      return response;
    },
  });
  t.after(() => release.resolve());
  await openNew(page);
  const submit = page.$('[data-translation-submit]');
  click(submit);
  click(submit);
  page.$('.translation-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await until(() => submissions(page).length === 1 && page.$('[data-translation-submit]').disabled);
  for (const selector of [
    '[data-translation-model-trigger]', '[data-translation-select-all]', '[data-translation-clear]',
    '[aria-label="选择 L001"]', '.translation-regenerate input',
  ]) assert.equal(page.$(`.translation-dialog ${selector}`).disabled, true);
  assert.match(page.$('[data-translation-submit]').textContent, /正在加入队列/);
  const job = page.translations.jobs[0];
  Object.assign(job, { status: 'running', key: 'a'.repeat(64), percent: 73, stage: '正在翻译正文' });
  page.events.message({ type: 'pdfTranslation', job });
  await flush();
  release.resolve();
  await until(() => !!page.$('[data-translation-batch="batch-1"]'));
  assert.equal(submissions(page).length, 1);
  assert.equal(page.translations.batches.length, 1);
  assert.equal(page.translations.jobs.length, 8);
  assert.equal(page.$(`[data-translation-job="${job.id}"] progress`).value, 73);
  assert.match(page.$(`[data-translation-job="${job.id}"]`).textContent, /正在翻译正文/);
  assert.match(page.$('[data-translation-job="batch-1-job-2"]').textContent, /第 2 位/);
});

test('提交响应丢失且补查失败后保留 requestId 重试，服务端重放原批次', async (t) => {
  let lost = false;
  let attempts = 0;
  const page = await translationFixture(t, {
    translationApi: async ({ path, method }, next) => {
      if (path === '/api/translations' && lost) throw new Error('补查暂时断线');
      const response = await next();
      if (path === batchPath && method === 'POST' && ++attempts === 1) {
        lost = true;
        throw new Error('提交响应丢失，请重试');
      }
      return response;
    },
  });
  await openNew(page);
  await chooseModel(page, '.translation-dialog', 'test/sonnet');
  click(page.$('.translation-regenerate input'));
  click(page.$('[data-translation-submit]'));
  await until(() => !page.workspace.state.translationSubmitting &&
    !!page.$('.translation-dialog-error')?.textContent.includes('提交响应丢失'));
  const original = structuredClone(submissions(page)[0].body);
  assert.match(original.requestId, /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i);
  assert.equal(original.model, 'test/sonnet');
  assert.equal(original.regenerate, true);
  assert.deepEqual(original.paperIds, papers().map(({ literature_id }) => literature_id));
  assert.equal(page.$('[data-translation-submit]').disabled, false);
  lost = false;
  click(page.$('[data-translation-submit]'));
  await until(() => !!page.$('[data-translation-batch="batch-1"]'));
  assert.equal(submissions(page).length, 2);
  assert.deepEqual(submissions(page)[1].body, original);
  assert.equal(page.translations.batches.length, 1);
  assert.equal(page.translations.jobs.length, 8);
  assert.equal(page.$('.translation-dialog-error'), null);
  assert.match(page.$('.toast-region').textContent, /已找回原翻译批次/);
});

test('提交响应丢失后通过快照找回已受理批次，无需再次提交', async (t) => {
  const page = await translationFixture(t, {
    translationApi: async ({ path, method }, next) => {
      const response = await next();
      if (path === batchPath && method === 'POST') throw new Error('连接在返回结果前断开');
      return response;
    },
  });
  await openNew(page);
  const before = translationGets(page);
  click(page.$('[data-translation-submit]'));
  await until(() => !!page.$('[data-translation-batch="batch-1"]') && !page.workspace.state.translationSubmitting);
  assert.equal(translationGets(page), before + 1);
  assert.equal(submissions(page).length, 1);
  assert.equal(page.$('.translation-dialog-error'), null);
  assert.equal(page.workspace.state.translationBatchId, 'batch-1');
  assert.deepEqual(counts(batch(page, 'batch-1')), ['已生成 0', '已跳过 0', '失败 0', '已取消 0']);
  assert.match(batch(page, 'batch-1').textContent!, /已处理 0 \/ 8/);
});

test('汇总分别展示成功、跳过、失败和取消，取消收尾后只重试失败与取消项', async (t) => {
  const translations = history([
    'completed', 'skipped', 'failed', 'cancelled', 'running', 'queued', 'saving', 'cancelling',
  ]);
  const cancelRelease = deferred<void>();
  const page = await translationFixture(t, {
    translations,
    translationApi: async ({ path }, next) => {
      const response = await next();
      if (path.endsWith('/cancel')) await cancelRelease.promise;
      return response;
    },
  });
  t.after(() => cancelRelease.resolve());
  await openTasks(page);
  await expandBatch(page);
  assert.deepEqual(counts(batch(page)), ['已生成 1', '已跳过 1', '失败 1', '已取消 1']);
  assert.equal(batch(page).querySelector('progress')!.value, 4);
  assert.equal(batch(page).querySelector('progress')!.max, 8);
  assert.match(page.$('#translation-tasks').textContent, /4\/8/);
  assert.match(page.$('[data-translation-job="history-job-2"]').textContent, /原文与已完成译本一致/);
  assert.match(page.$('[data-translation-job="history-job-3"]').textContent, /测试模型暂时不可用/);
  assert.match(page.$('[data-translation-job="history-job-6"]').textContent, /第 1 位/);
  assert.equal(page.$('[data-translation-job="history-job-5"] progress').value, 42);
  assert.equal(page.$('[data-translation-job="history-job-7"] progress').value, 99);
  const cancel = page.$('[data-translation-cancel="history-batch"]');
  click(cancel);
  click(cancel);
  await flush();
  assert.equal(page.calls.filter(({ path }) => path.endsWith('/history-batch/cancel')).length, 1);
  assert.equal(cancel.disabled, true);
  cancelRelease.resolve();
  await until(() => batch(page).textContent!.includes('已处理 5 / 8'));
  assert.deepEqual(counts(batch(page)), ['已生成 1', '已跳过 1', '失败 1', '已取消 2']);
  assert.equal(page.$('[data-translation-cancel="history-batch"]').disabled, true);
  assert.equal(page.$('[data-translation-retry="history-batch"]'), null);

  for (const index of [4, 6, 7]) {
    Object.assign(translations.jobs[index], {
      status: index === 6 ? 'completed' : 'cancelled',
      stage: index === 6 ? '翻译完成' : '已取消', percent: index === 6 ? 100 : 0,
    });
  }
  translations.batches[0].status = 'partial';
  translations.batches[0].counts = translationCounts(translations.jobs);
  page.events.message({ type: 'pdfTranslationQueue' });
  await until(() => !!page.$('[data-translation-retry="history-batch"]'));
  assert.equal(page.$('[data-translation-cancel="history-batch"]'), null);
  assert.deepEqual(counts(batch(page)), ['已生成 2', '已跳过 1', '失败 1', '已取消 4']);
  assert.equal(batch(page).querySelector('progress')!.value, 8);
  click(page.$('[data-translation-retry="history-batch"]'));
  await until(() => !!page.$('[data-translation-batch="batch-1"]'));
  const request = submissions(page)[0].body;
  assert.deepEqual(request.paperIds, ['L003', 'L004', 'L005', 'L006', 'L008']);
  assert.equal(request.model, 'test/sonnet');
  assert.equal(request.regenerate, true);
  assert.notEqual(request.requestId, 'history-request');
  assert.equal(page.translations.batches.length, 2);
  assert.match(page.$('#translation-tasks').textContent, /0\/5/);
});

test('关闭翻译窗口后继续接收任务进度，重开仍展示原批次且不重复提交', async (t) => {
  const page = await translationFixture(t);
  await openNew(page);
  click(page.$('[data-translation-submit]'));
  await until(() => !!page.$('[data-translation-batch="batch-1"]'));
  click(page.$('[aria-label="关闭翻译窗口"]'));
  await flush();
  assert.equal(page.$('.translation-dialog'), null);
  const job = page.translations.jobs[0];
  Object.assign(job, { status: 'running', percent: 61, stage: '窗口关闭后仍在翻译' });
  page.translations.batches[0].status = 'running';
  page.events.message({ type: 'pdfTranslation', job });
  await flush();
  assert.equal(page.workspace.state.translationSnapshot.jobs[0].percent, 61);
  assert.equal(page.events.closed, false);
  await openTasks(page);
  assert.equal(page.workspace.state.translationBatchId, 'batch-1');
  assert.equal(page.$('[data-translation-job="batch-1-job-1"] progress').value, 61);
  assert.match(page.$('[data-translation-job="batch-1-job-1"]').textContent, /窗口关闭后仍在翻译/);
  assert.equal(page.$('[data-translation-batch="batch-1"] details').open, true);
  assert.equal(submissions(page).length, 1);
});

test('EventSource 断线与重新连接均补查快照，恢复断线期间遗漏的完成状态', async (t) => {
  const translations = history(['running', 'queued']);
  const page = await translationFixture(t, { translations });
  await openTasks(page);
  await expandBatch(page);
  assert.equal(page.workspace.state.eventsOpen, true);
  Object.assign(translations.jobs[0], { status: 'completed', percent: 100, stage: '翻译完成' });
  Object.assign(translations.jobs[1], { status: 'running', percent: 64, stage: '断线期间已开始' });
  const beforeError = translationGets(page);
  page.events.error();
  await until(() => !page.workspace.state.translationLoading &&
    page.$('[data-translation-job="history-job-2"] progress')?.value === 64);
  assert.equal(page.workspace.state.eventsOpen, false);
  assert.equal(translationGets(page), beforeError + 1);
  assert.deepEqual(counts(batch(page)), ['已生成 1', '已跳过 0', '失败 0', '已取消 0']);
  Object.assign(translations.jobs[1], { status: 'completed', percent: 100, stage: '翻译完成' });
  translations.batches[0].status = 'completed';
  const beforeOpen = translationGets(page);
  page.events.open();
  await until(() => !page.workspace.state.translationLoading && batch(page).querySelector('progress')!.value === 2);
  assert.equal(page.workspace.state.eventsOpen, true);
  assert.equal(translationGets(page), beforeOpen + 1);
  assert.deepEqual(counts(batch(page)), ['已生成 2', '已跳过 0', '失败 0', '已取消 0']);
  assert.equal(submissions(page).length, 0);
});

test('慢 GET 返回旧快照时保留其请求期间收到的逐篇 SSE 进度与完成汇总', async (t) => {
  const translations = history(['running', 'queued']);
  const started = deferred<void>();
  const release = deferred<void>();
  let delayNext = false;
  const page = await translationFixture(t, {
    translations,
    translationApi: async ({ path }, next) => {
      // 先复制旧响应，再让事件抵达，确保测试确实制造了 HTTP 与 SSE 的交错。
      const response = await next();
      if (path === '/api/translations' && delayNext) {
        delayNext = false;
        started.resolve();
        await release.promise;
      }
      return response;
    },
  });
  t.after(() => release.resolve());
  await openTasks(page);
  await expandBatch(page);
  delayNext = true;
  page.events.message({ type: 'pdfTranslationQueue' });
  await started.promise;
  assert.equal(page.workspace.state.translationLoading, true);
  Object.assign(translations.jobs[0], { percent: 87, stage: 'SSE 已收到最新进度' });
  Object.assign(translations.jobs[1], { status: 'completed', key: 'c'.repeat(64), percent: 100, stage: '翻译完成' });
  for (const job of translations.jobs) page.events.message({ type: 'pdfTranslation', job });
  await until(() => page.$('[data-translation-job="history-job-1"] progress')?.value === 87);
  assert.deepEqual(counts(batch(page)), ['已生成 1', '已跳过 0', '失败 0', '已取消 0']);
  release.resolve();
  await until(() => !page.workspace.state.translationLoading);
  assert.equal(page.$('[data-translation-job="history-job-1"] progress').value, 87);
  assert.match(page.$('[data-translation-job="history-job-1"]').textContent, /SSE 已收到最新进度/);
  assert.equal(page.workspace.state.translationSnapshot.jobs.find(({ id }: PdfTranslationJob) =>
    id === 'history-job-2').status, 'completed');
  assert.deepEqual(counts(batch(page)), ['已生成 1', '已跳过 0', '失败 0', '已取消 0']);
  assert.equal(batch(page).querySelector('progress')!.value, 1);
});

test('千篇候选只挂载窗口，全选仍覆盖完整范围并维持一千篇上限及去重', async (t) => {
  const library = papers(1005);
  const page = await translationFixture(t, {
    papers: library, virtualLayout: { width: 480, height: 360, rowHeight: (id) => 64 + Number(id.slice(1)) % 4 * 20 },
  });
  const expected = library.map(({ literature_id }) => literature_id);
  page.workspace.openBatchTranslation([...expected, expected[0], expected.at(-1)!]);
  await until(() => !!page.$('.translation-form') && !page.workspace.state.translationLoading);
  await frames(4);
  assert.equal(page.workspace.state.translationCandidates.length, 1005);
  assert.equal(page.workspace.state.translationSelected.size, 1000);
  assert.ok(candidateIds(page).length < 80);
  assert.equal(page.$('[data-translation-selected]').textContent, '已选 1000 / 1005 篇');
  const list = page.$('.translation-candidates') as HTMLElement;
  navigate(list, 'End');
  await frames(4);
  assert.equal((document.activeElement as HTMLInputElement).getAttribute('aria-label'), '选择 L1005');
  const last = page.$('[data-translation-candidate="L1005"]');
  assert.equal(last.closest('.virtual-row').getAttribute('aria-posinset'), '1005');
  assert.equal(last.closest('.virtual-row').getAttribute('aria-setsize'), '1005');
  click(last.querySelector('input'));
  await flush();
  assert.equal(page.workspace.state.translationSelected.has('L1005'), false);
  assert.equal(page.workspace.state.translationSelected.size, 1000);
  click(page.$('[data-translation-clear]'));
  await flush();
  assert.equal(page.workspace.state.translationSelected.size, 0);
  click(page.$('[data-translation-select-all]'));
  await flush();
  assert.equal(page.workspace.state.translationSelected.size, 1000);
  assert.equal(page.workspace.state.translationSelected.has('L001'), true, '离屏项照常被全选');
  click(page.$('[data-translation-submit]'));
  await until(() => !!page.$('[data-translation-batch="batch-1"]'));
  assert.deepEqual(submissions(page)[0].body.paperIds, expected.slice(0, 1000));
  assert.equal(page.workspace.state.context.size, 0);
  assert.equal(page.workspace.state.translationSnapshot.jobs.length, 1000);
  assert.ok(page.target.querySelectorAll('[data-translation-job]').length < 80);
});

test('候选键盘定位与离屏勾选保持独立，宽度变化不丢焦点并按完整候选顺序提交', async (t) => {
  const page = await translationFixture(t, {
    papers: papers(1000), virtualLayout: {
      width: 480, height: 360, rowHeight: (id, width) => 64 + Number(id.slice(1)) % 3 * 18 + (width < 350 ? 60 : 0),
    },
  });
  await openNew(page);
  click(page.$('[data-translation-clear]'));
  await flush();
  const list = page.$('.translation-candidates') as HTMLElement;
  navigate(list, 'End');
  await frames(4);
  const last = page.$('[aria-label="选择 L1000"]') as HTMLInputElement;
  navigate(last, 'Enter');
  await flush();
  assert.equal(page.workspace.state.translationSelected.has('L1000'), true);
  resizeVirtualList(list, { width: 280 });
  await frames(4);
  assert.equal(document.activeElement, last);
  assert.equal(last.checked, true);
  navigate(last, 'Home');
  await frames(4);
  const first = page.$('[aria-label="选择 L001"]') as HTMLInputElement;
  assert.equal(document.activeElement, first);
  navigate(first, 'ArrowDown');
  await frames(3);
  assert.equal((document.activeElement as HTMLInputElement).getAttribute('aria-label'), '选择 L002');
  navigate(document.activeElement as HTMLElement, 'Enter');
  await flush();
  assert.equal(page.workspace.state.translationSelected.has('L002'), true);
  assert.equal(page.$('[aria-label="选择 L1000"]'), null);
  assert.equal(page.workspace.state.translationSelected.size, 2);
  click(page.$('[data-translation-submit]'));
  await until(() => !!page.$('[data-translation-batch="batch-1"]'));
  assert.deepEqual(submissions(page)[0].body.paperIds, ['L002', 'L1000']);
});

test('千篇历史收起时不挂载任务行，单项事件只重算所属批次，展开后首尾错误可达', async (t) => {
  const translations = history(Array.from({ length: 1000 }, () => 'failed'));
  translations.jobs[0].error = '首篇的完整失败原因';
  translations.jobs.at(-1)!.error = '末篇的完整失败原因。'.repeat(12);
  const other = { ...translations.jobs[0], id: 'other-job', batchId: 'other-batch', paperId: 'L1001' };
  translations.jobs.push(other);
  translations.batches.push({ ...translations.batches[0], id: 'other-batch', requestId: 'other-request',
    jobIds: [other.id], paperIds: [other.paperId], counts: translationCounts([other]), status: 'failed' });
  const page = await translationFixture(t, {
    translations, papers: papers(1001),
    virtualLayout: { width: 480, height: 360, rowHeight: (id) => 108 + Number(id.split('-').at(-1)) % 4 * 36 },
  });
  const w = page.workspace;
  const summarized: string[] = [];
  const batchJobs = w.batchJobs;
  w.batchJobs = (batch: { id: string }) => { summarized.push(batch.id); return batchJobs(batch); };
  await openTasks(page);
  await flush();
  assert.equal(page.target.querySelectorAll('[data-translation-job]').length, 0);
  assert.equal(batch(page).querySelector('details')!.open, false);
  const untouched = w.translationJobs.value.get('other-job');
  const jobIndex = w.translationJobs.value;
  summarized.length = 0;
  const first = translations.jobs[0];
  page.events.message({ type: 'pdfTranslation', job: { ...first, reason: '刚收到的失败说明' } });
  await flush();
  assert.deepEqual(summarized, ['history-batch']);
  assert.equal(w.translationJobs.value, jobIndex);
  assert.equal(w.translationJobs.value.get('other-job'), untouched);
  assert.equal(page.target.querySelectorAll('[data-translation-job]').length, 0);

  await expandBatch(page);
  await frames(4);
  const details = batch(page).querySelector('details')!;
  const list = details.querySelector<HTMLElement>('.translation-job-list')!;
  assert.match(page.$('[data-translation-job="history-job-1"]').textContent, /首篇的完整失败原因/);
  assert.ok(list.querySelectorAll('[data-translation-job]').length < 80);
  navigate(list, 'End');
  await frames(5);
  const last = page.$('[data-translation-job="history-job-1000"]');
  assert.ok(last);
  assert.match(last.textContent, /末篇的完整失败原因/);
  assert.equal(last.querySelector('p').textContent, translations.jobs[999].error);
  assert.equal(document.activeElement, last);
  assert.equal(last.closest('.virtual-row').getAttribute('aria-setsize'), '1000');
  assert.equal(list.querySelector('ul,li'), null, '虚拟列表不嵌套列表项或生成非法列表层级');
  details.open = false;
  details.dispatchEvent(new Event('toggle'));
  await until(() => !details.querySelector('.translation-job-list'));
  assert.equal(w.state.translationSnapshot.jobs.length, 1001, '收起只卸载 DOM，完整历史留在状态中');
  assert.equal(w.translationJobs.value.size, 1001);
  await expandBatch(page);
  await frames(3);
  assert.match(page.$('[data-translation-job="history-job-1"]').textContent, /首篇的完整失败原因/);
});

test('快照重排后增量索引仍更新正确任务，单篇历史列表也只挂载窗口', async (t) => {
  const translations = history(Array.from({ length: 1000 }, () => 'failed'));
  translations.batches = [];
  for (const job of translations.jobs) delete job.batchId;
  const page = await translationFixture(t, {
    translations, papers: papers(1000), virtualLayout: { width: 480, height: 360, rowHeight: () => 120 },
  });
  await openTasks(page);
  await frames(3);
  const w = page.workspace;
  const untouched = w.translationJobs.value.get('history-job-2');
  translations.jobs.reverse();
  await w.loadTranslations();
  const changed = { ...translations.jobs[0], status: 'running', percent: 43, stage: '快照重排后的新进度' };
  page.events.message({ type: 'pdfTranslation', job: changed });
  await flush();
  assert.equal(w.state.translationSnapshot.jobs[0].id, changed.id);
  assert.equal(w.state.translationSnapshot.jobs[0].percent, 43);
  assert.equal(w.translationJobs.value.get(changed.id), w.state.translationSnapshot.jobs[0]);
  assert.equal(w.translationJobs.value.get('history-job-2'), untouched);
  assert.equal(w.translationActivity.value.active, 1);
  assert.equal(w.translationActivity.value.total, 1);
  const list = page.$('.translation-job-list') as HTMLElement;
  navigate(list, 'Home');
  await frames(4);
  assert.equal(page.$(`[data-translation-job="${changed.id}"] progress`).value, 43);
  navigate(list, 'End');
  await frames(4);
  assert.ok(page.$('[data-translation-job="history-job-1"]'));
  assert.ok(list.querySelectorAll('[data-translation-job]').length < 80);
});

test('单篇 key 为空的排队任务以任务编号关联完成结果，仍自动切换中文精读', async (t) => {
  const pdfTranslation: Json = {
    engineAvailable: true, model: 'test/luna', result: null, job: null, updateAvailable: false,
  };
  const page = await translationFixture(t, {
    pdfTranslation,
    translationApi: async ({ path, method }, next) => {
      const response = await next();
      if (path === singlePath && method === 'POST') {
        Object.assign(pdfTranslation.job, { key: null, status: 'queued', percent: 0, stage: '等待翻译', queuePosition: 2 });
        return structuredClone(pdfTranslation);
      }
      return response;
    },
  });
  click(page.$('[data-paper="L001"]'));
  await until(() => !!page.$('[data-translation-start]') && !!page.$('.pdf-page-image'));
  click(page.$('[data-translation-start]'));
  await until(() => page.$('.pdf-translation-bar progress')?.value === 0);
  const id = pdfTranslation.job.id;
  assert.equal(pdfTranslation.job.key, null);
  assert.match(page.$('.pdf-translation-bar').textContent, /等待翻译/);
  assert.equal(page.workspace.state.readerMode, 'pdf');
  assert.equal(page.$('[data-reader-mode="translation"]').disabled, true);
  const key = 'd'.repeat(64);
  pdfTranslation.result = {
    key, sourceHash: 'e'.repeat(64), model: 'test/luna',
    completedAt: '2026-11-20T01:00:00.000Z', sections: 3, images: 1,
  };
  Object.assign(pdfTranslation.job, { key, status: 'completed', percent: 100, stage: '翻译完成' });
  page.events.message({ type: 'pdfTranslation', job: pdfTranslation.job });
  await until(() => page.workspace.state.readerMode === 'translation' && !!page.$('.translation-document'));
  assert.equal(pdfTranslation.job.id, id);
  assert.equal(page.workspace.state.pdfTranslation, key);
  assert.match(page.$('.translation-document').textContent, /dddddddd/);
  assert.equal(new URL(page.$('.pdf-translation-download').href).searchParams.get('key'), key);
  const requests = page.calls.filter(({ path, method }) => path === singlePath && method === 'POST');
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].body, { model: 'test/luna' });
});

test('单篇重新生成以空 key 排队时取消，保留旧译本正文、中文模式与导出链接', async (t) => {
  const old = {
    key: 'b'.repeat(64), sourceHash: 'c'.repeat(64), model: 'test/luna',
    completedAt: '2026-11-20T00:00:00.000Z', sections: 3, images: 1,
  };
  const pdfTranslation: Json = {
    engineAvailable: true, model: 'test/luna', result: old, job: null, updateAvailable: false,
  };
  const page = await translationFixture(t, {
    pdfTranslation,
    translationApi: async ({ path, method }, next) => {
      const response = await next();
      if (path === singlePath && method === 'POST') {
        Object.assign(pdfTranslation.job, { key: null, status: 'queued', percent: 0, stage: '等待翻译' });
        return structuredClone(pdfTranslation);
      }
      if (path === `${singlePath}/cancel`) {
        Object.assign(pdfTranslation.job, { status: 'cancelled', stage: '已取消' });
        return structuredClone(pdfTranslation);
      }
      return response;
    },
  });
  click(page.$('[data-paper="L001"]'));
  await until(() => !!page.$('[data-translation-start]') && !page.$('[data-reader-mode="translation"]').disabled);
  click(page.$('[data-reader-mode="translation"]'));
  await until(() => !!page.$('.translation-document'));
  const download = page.$('.pdf-translation-download').href;
  click(page.$('[data-translation-start]'));
  await until(() => page.$('.pdf-translation-bar progress')?.value === 0);
  assert.equal(pdfTranslation.job.key, null);
  assert.equal(page.workspace.state.pdfTranslation, old.key);
  assert.match(page.$('.translation-document').textContent, /bbbbbbbb/);
  assert.equal(page.$('.pdf-translation-download').href, download);
  click(page.$('.pdf-translation-bar [data-translation-cancel]'));
  await until(() => page.$('[data-translation-start]')?.textContent === '重新生成中文');
  assert.equal(pdfTranslation.job.status, 'cancelled');
  assert.equal(page.workspace.state.readerMode, 'translation');
  assert.equal(page.workspace.state.pdfTranslation, old.key);
  assert.match(page.$('.translation-document').textContent, /bbbbbbbb/);
  assert.equal(page.$('.pdf-translation-download').href, download);
  assert.deepEqual(page.calls.find(({ path }) => path === `${singlePath}/cancel`).body,
    { jobId: pdfTranslation.job.id });
  assert.deepEqual(page.calls.find(({ path, method }) => path === singlePath && method === 'POST').body,
    { model: 'test/luna', regenerate: true });
});
