import assert from 'node:assert/strict';
import test from 'node:test';
import { PdfTranslationQueue } from '../src/lib/pdfTranslationQueue.js';
import type { PdfTranslationJob, PdfTranslationSnapshot } from '../shared/pdfTranslation.js';
import { fixture } from './helpers/frontendFixture.js';

test('事件出现缺口合并在途补查，连线正常时轮询只读取修订号和环境', async (t) => {
  const server: PdfTranslationSnapshot = { revision: 0, model: 'old', engineAvailable: true, jobs: [], batches: [] };
  let delayed = false;
  let release!: () => void;
  const gate = new Promise<void>((done) => { release = done; });
  let concurrent = 0;
  let maximum = 0;
  const page = await fixture(t, { translations: server, translationApi: async ({ path }, next) => {
    if (!delayed || path !== '/api/translations') return next();
    maximum = Math.max(maximum, ++concurrent);
    const response = await next();
    await gate;
    concurrent--;
    return response;
  } });
  t.after(release);
  const job: PdfTranslationJob = { id: 'gap', paperId: 'L002', status: 'running', key: null,
    model: 'old', percent: 25, stage: '翻译中', createdAt: '', updatedAt: '' };
  delayed = true;
  server.jobs.push(job);
  server.revision = 2;
  page.events.message({ type: 'pdfTranslation', revision: 2, job });
  server.revision++;
  Object.assign(job, { status: 'completed', percent: 100, stage: '已完成' });
  page.events.message({ type: 'pdfTranslation', revision: 3, job });
  release();
  await page.workspace.loadTranslations();
  assert.equal(maximum, 1);
  assert.deepEqual(page.workspace.state.translationSnapshot, server);
  const before = page.calls.filter(({ path }) => path === '/api/translations').length;
  server.model = 'new';
  await page.workspace.pollTranslations();
  assert.equal(page.calls.at(-1)?.path, '/api/translations/status');
  assert.equal(page.calls.filter(({ path }) => path === '/api/translations').length, before);
  assert.equal(page.workspace.state.translationSnapshot.model, 'new');
});

test('真实队列处理一千篇时工作区只按事件同步，计数与服务端一致', async (t) => {
  const model = 'test/model';
  const page = await fixture(t, { translations: { revision: 0, model, engineAvailable: true, jobs: [], batches: [] } });
  const gets = () => page.calls.filter((call) => call.path === '/api/translations').length;
  const baseline = gets();
  let bytes = 0;
  let resolve!: () => void;
  const release = new Promise<void>((done) => { resolve = done; });
  const queue = new PdfTranslationQueue(async (entry) => {
    await release;
    queue.update(entry, { status: 'skipped', percent: 100, stage: '已有译本' });
  }, (event) => {
    bytes += Buffer.byteLength(JSON.stringify(event));
    page.workspace.receive(event);
  });
  t.after(async () => { resolve(); await queue.close(); });
  const paperIds = Array.from({ length: 1000 }, (_, index) => `L${index + 1}`);
  const batch = queue.batch({ requestId: 'large-batch', model, paperIds }, 'fingerprint');
  await new Promise<void>((done) => setImmediate(done));
  assert.equal(page.workspace.queuePositions.value.get(batch.jobIds[999]), 998);
  resolve();
  await new Promise<void>((done) => setImmediate(done));
  const snapshot = queue.snapshot();
  assert.equal(page.workspace.state.translationSnapshot.revision, queue.revision);
  assert.deepEqual(page.workspace.state.translationSnapshot.batches, snapshot.batches);
  assert.deepEqual(page.workspace.state.translationSnapshot.jobs, snapshot.jobs);
  assert.equal(gets() - baseline, 0);
  t.diagnostic(`千篇批次事件 JSON 合计 ${bytes} 字节，执行阶段全量 GET 为零`);
});
