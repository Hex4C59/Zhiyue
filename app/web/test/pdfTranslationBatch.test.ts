import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createApp } from '../src/server.js';
import type { TranslationModel, runTranslationWorker } from '../src/lib/pdfTranslationWorker.js';
import type {
  PdfTranslationBatchSubmission, PdfTranslationSnapshot, PdfTranslationStatus,
} from '../shared/pdfTranslation.js';

const model: TranslationModel = { id: 'test/bulk', fingerprint: 'bulk-config', complete: async () => '' };
const alternate: TranslationModel = { ...model, id: 'test/alternate', fingerprint: 'alternate-config' };
const gate = () => {
  let resolve!: () => void;
  return { promise: new Promise<void>((done) => { resolve = done; }), resolve };
};
const pause = (ms = 20) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until<T>(read: () => Promise<T>, ready: (value: T) => boolean): Promise<T> {
  for (let attempt = 0; attempt < 400; attempt++) {
    const value = await read();
    if (ready(value)) return value;
    await pause();
  }
  throw new Error('等待批量翻译超时');
}
const output = async (work: string): Promise<{ sections: number; images: number }> => {
  await mkdir(path.join(work, 'result'), { recursive: true });
  await writeFile(path.join(work, 'result/zh.md'), '# Synthetic paper\n\n合成中文译文。\n');
  return { sections: 1, images: 0 };
};

async function fixture(
  t: test.TestContext, worker: typeof runTranslationWorker, count = 8,
  getModel: (id?: string) => TranslationModel | undefined = (id) => !id || id === model.id ? { ...model } : undefined,
  cleanup: () => void = () => {}, engine = true,
) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zhiyue-translation-batch-'));
  await mkdir(path.join(root, 'papers'));
  await mkdir(path.join(root, '.zhiyue/catalog'), { recursive: true });
  const records = Array.from({ length: count }, (_, index) => ({
    literature_id: `L${String(index + 1).padStart(3, '0')}`,
    file: `papers/paper-${index + 1}.pdf`, title: `合成论文 ${index + 1}`,
  }));
  for (const record of records) {
    await writeFile(path.join(root, record.file), `%PDF-1.4\n${record.literature_id}\n%%EOF`);
  }
  await writeFile(path.join(root, '.zhiyue/catalog/文献索引.json'), JSON.stringify({ records }));
  const app = await createApp({
    root, connectPi: false,
    translation: { mineruCommand: engine ? process.execPath : path.join(root, 'missing-mineru'), getModel, worker },
  });
  t.after(async () => {
    cleanup();
    await app.close();
    await rm(root, { recursive: true, force: true });
  });
  await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  const post = (route: string, body: unknown = {}) => fetch(`${base}${route}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const snapshot = async () => (await fetch(`${base}/api/translations`)).json() as Promise<PdfTranslationSnapshot>;
  const paper = async (id: string): Promise<PdfTranslationStatus> =>
    (await fetch(`${base}/api/papers/${id}/translation`)).json() as Promise<PdfTranslationStatus>;
  return { root, app, base, post, snapshot, paper, ids: records.map(({ literature_id }) => literature_id) };
}

test('至少八篇按提交顺序自动处理，重复请求幂等且每篇创建独立模型会话', async (t) => {
  const release = gate();
  const calls: string[] = [];
  const sessions = new Set<TranslationModel>();
  let active = 0;
  let maximum = 0;
  const f = await fixture(t, async ({ source, work, model: selected }) => {
    active++;
    maximum = Math.max(maximum, active);
    calls.push(path.basename(source));
    sessions.add(selected);
    try {
      await release.promise;
      return await output(work);
    } finally { active--; }
  }, 8, undefined, release.resolve);
  const request = { requestId: 'eight-papers-request', paperIds: [...f.ids, f.ids[0]], model: model.id };
  const accepted = await f.post('/api/translations/batches', request);
  assert.equal(accepted.status, 202);
  const initial = await accepted.json() as PdfTranslationBatchSubmission;
  assert.equal(initial.batch.counts.total, 8);
  assert.equal(initial.batch.paperIds.length, 8);
  await until(f.snapshot, () => calls.length === 2);
  const waiting = await f.snapshot();
  assert.equal(waiting.jobs.filter(({ status }) => status === 'running').length, 2);
  assert.equal(waiting.jobs.filter(({ status }) => status === 'queued').length, 6);
  assert.ok(waiting.jobs.filter(({ status }) => status === 'queued').every(({ key }) => key === null));
  const repeated = await f.post('/api/translations/batches', request);
  assert.equal(repeated.status, 200);
  assert.equal((await repeated.json() as PdfTranslationBatchSubmission).batch.id, initial.batch.id);
  assert.equal((await f.post('/api/translations/batches', { ...request, paperIds: [...f.ids].reverse() })).status, 409);
  assert.equal((await f.snapshot()).batches.length, 1);
  release.resolve();
  const done = await until(f.snapshot, (state) => state.batches[0]?.counts.processed === 8);
  assert.equal(done.batches[0]?.status, 'completed');
  assert.equal(done.batches[0]?.counts.completed, 8);
  assert.equal(maximum, 2);
  assert.equal(sessions.size, 8);
  assert.deepEqual(calls.toSorted(), f.ids.map((_, index) => `paper-${index + 1}.pdf`));
  assert.ok(done.jobs.every(({ key, status }) => key?.length === 64 && status === 'completed'));
  assert.deepEqual(await readdir(path.join(f.root, '.zhiyue/tmp')), []);
});

test('旧译本跨模型跳过，缺失或失败的论文单独失败，强制重新生成保留旧成品', async (t) => {
  const failures = new Set<string>(['paper-3.pdf']);
  const calls: string[] = [];
  const f = await fixture(t, async ({ source, work }) => {
    const name = path.basename(source);
    calls.push(name);
    if (failures.has(name)) throw new Error('合成论文无法翻译');
    return output(work);
  }, 4, (id) => !id || id === model.id ? { ...model } : id === alternate.id ? { ...alternate } : undefined);
  await f.post('/api/papers/L001/translation', { model: model.id });
  const original = await until(() => f.paper('L001'), (state) => state.job?.status === 'completed');
  const oldKey = original.result!.key;
  await rm(path.join(f.root, 'papers/paper-2.pdf'));
  const submitted = await (await f.post('/api/translations/batches', {
    requestId: 'mixed-results-request', paperIds: f.ids, model: alternate.id,
  })).json() as PdfTranslationBatchSubmission;
  const ready = await until(f.snapshot,
    (state) => state.batches.find(({ id }) => id === submitted.batch.id)?.counts.processed === 4);
  const batch = ready.batches.find(({ id }) => id === submitted.batch.id)!;
  assert.equal(batch.status, 'partial');
  assert.deepEqual([batch.counts.completed, batch.counts.skipped, batch.counts.failed], [1, 1, 2]);
  assert.match(ready.jobs.find(({ batchId, paperId }) => batchId === batch.id && paperId === 'L001')?.reason ?? '',
    /已有与当前原文匹配/);
  assert.deepEqual(calls.toSorted(), ['paper-1.pdf', 'paper-3.pdf', 'paper-4.pdf']);
  assert.equal((await f.paper('L001')).result?.key, oldKey);

  failures.add('paper-1.pdf');
  await f.post('/api/translations/batches', {
    requestId: 'failed-regenerate', paperIds: ['L001'], model: alternate.id, regenerate: true,
  });
  await until(f.snapshot, (state) => state.batches[0]?.status === 'failed');
  assert.equal((await f.paper('L001')).result?.key, oldKey);
  failures.delete('paper-1.pdf');
  await f.post('/api/translations/batches', {
    requestId: 'valid-regenerate', paperIds: ['L001'], model: alternate.id, regenerate: true,
  });
  await until(f.snapshot, (state) => state.batches[0]?.status === 'completed');
  const regenerated = await f.paper('L001');
  assert.notEqual(regenerated.result?.key, oldKey);
  assert.equal(regenerated.result?.model, alternate.id);
  assert.match(await readFile(path.join(f.root, '.zhiyue/data/translations/L001', oldKey, 'zh.md'), 'utf8'), /合成中文/);
});

test('批次取消立即取消排队项，运行项和清理结束前不派发其他论文', async (t) => {
  const cleanup = gate();
  const calls: string[] = [];
  let firstWork = '';
  let aborted = 0;
  const f = await fixture(t, async ({ source, work, signal }) => {
    calls.push(path.basename(source));
    if (path.basename(source) !== 'paper-4.pdf') {
      firstWork = work;
      if (!signal.aborted) await new Promise<void>((resolve) => signal.addEventListener('abort', () => {
        aborted++;
        resolve();
      }, { once: true }));
      await cleanup.promise;
      signal.throwIfAborted();
    }
    return output(work);
  }, 4, undefined, cleanup.resolve);
  const created = await (await f.post('/api/translations/batches', {
    requestId: 'cancel-batch-request', paperIds: f.ids.slice(0, 3), model: model.id,
  })).json() as PdfTranslationBatchSubmission;
  await until(f.snapshot, () => calls.length === 2);
  const cancel = await f.post(`/api/translations/batches/${created.batch.id}/cancel`);
  assert.equal(cancel.status, 202);
  const cancelled = await cancel.json() as PdfTranslationSnapshot;
  assert.equal(cancelled.batches[0]?.counts.cancelled, 1);
  assert.equal(cancelled.batches[0]?.status, 'cancelling');
  assert.equal(aborted, 2);
  const other = await f.post('/api/papers/L004/translation', { model: model.id });
  assert.equal(other.status, 202);
  assert.equal((await other.json() as PdfTranslationStatus).job?.status, 'queued');
  await pause(30);
  assert.deepEqual(calls.toSorted(), ['paper-1.pdf', 'paper-2.pdf']);
  assert.equal((await f.post(`/api/translations/batches/${created.batch.id}/cancel`)).status, 202);
  cleanup.resolve();
  await until(() => f.paper('L004'), (state) => state.job?.status === 'completed');
  assert.deepEqual(calls.toSorted(), ['paper-1.pdf', 'paper-2.pdf', 'paper-4.pdf']);
  const finished = (await f.snapshot()).batches[0]!;
  assert.equal(finished.status, 'cancelled');
  assert.equal(finished.counts.cancelled, 3);
  await assert.rejects(readFile(path.join(firstWork, 'result/zh.md')), { code: 'ENOENT' });
});

test('单篇与批次共享队列，重复论文跳过，默认模型变化不影响已提交模型而配置变化逐篇失败', async (t) => {
  const first = gate();
  const second = gate();
  const configured = new Map([[model.id, { ...model }], [alternate.id, { ...alternate }]]);
  let defaultId = model.id;
  const calls: Array<{ paper: string; model: string }> = [];
  const f = await fixture(t, async ({ source, work, model: selected }) => {
    const paper = path.basename(source);
    calls.push({ paper, model: selected.id });
    if (paper === 'paper-1.pdf') await first.promise;
    if (paper === 'paper-2.pdf') await second.promise;
    return output(work);
  }, 3, (id) => {
    const selected = configured.get(id ?? defaultId);
    return selected ? { ...selected } : undefined;
  }, () => { first.resolve(); second.resolve(); });
  const singleResponse = await f.post('/api/papers/L001/translation', { model: model.id });
  const single = await singleResponse.json() as PdfTranslationStatus;
  await until(f.snapshot, () => calls.length === 1);
  const repeatedResponse = await f.post('/api/papers/L001/translation', { model: model.id });
  const repeated = await repeatedResponse.json() as PdfTranslationStatus;
  assert.equal(repeated.job?.id, single.job?.id);
  assert.equal((await f.post('/api/papers/L001/translation', { model: alternate.id })).status, 409);
  await f.post('/api/translations/batches', {
    requestId: 'shared-queue-request', paperIds: f.ids, model: model.id,
  });
  const skipped = (await f.snapshot()).jobs.find(({ batchId, paperId }) => batchId && paperId === 'L001');
  assert.equal(skipped?.status, 'skipped');
  assert.equal(skipped?.reason, '已在翻译队列中');
  defaultId = alternate.id;
  await until(f.snapshot, () => calls.length === 2);
  assert.equal(calls[1]?.model, model.id);
  configured.set(model.id, { ...model, fingerprint: 'changed-after-submit' });
  first.resolve();
  second.resolve();
  const final = await until(f.snapshot, (state) => state.batches[0]?.counts.processed === 3);
  assert.deepEqual(calls.map(({ paper }) => paper), ['paper-1.pdf', 'paper-2.pdf']);
  assert.match(final.jobs.find(({ paperId }) => paperId === 'L003')?.error ?? '', /配置已变化/);
});

test('批次接口校验编号、数量、请求编号、模型与布尔参数', async (t) => {
  const f = await fixture(t, ({ work }) => output(work), 1);
  const request = { requestId: 'validation-request', paperIds: f.ids, model: model.id };
  for (const bad of [
    { ...request, paperIds: [] }, { ...request, paperIds: ['../L001'] },
    { ...request, paperIds: Array.from({ length: 1001 }, (_, index) => `L${index + 1}`) },
    { ...request, requestId: '' }, { ...request, requestId: '../invalid' },
    { ...request, model: 123 }, { ...request, regenerate: 'true' },
  ]) assert.equal((await f.post('/api/translations/batches', bad)).status, 400);
  assert.equal((await f.post('/api/translations/batches', { ...request, model: 'missing/model' })).status, 409);
  assert.equal((await f.snapshot()).batches.length, 0);
  assert.equal((await f.post('/api/translations/batches/unknown-batch/cancel')).status, 404);
});

test('提交批次前检查解析环境，模型移除后排队项明确失败且不调用工作器', async (t) => {
  const unavailable = await fixture(t, ({ work }) => output(work), 1, undefined, undefined, false);
  const request = { requestId: 'missing-engine-request', paperIds: unavailable.ids, model: model.id };
  assert.equal((await unavailable.post('/api/translations/batches', request)).status, 503);
  assert.equal((await unavailable.snapshot()).batches.length, 0);
  const release = gate();
  let available = true;
  let calls = 0;
  const f = await fixture(t, async ({ work }) => {
    calls++;
    await release.promise;
    return output(work);
  }, 3, () => available ? { ...model } : undefined, release.resolve);
  await f.post('/api/translations/batches', { ...request, requestId: 'removed-model-request', paperIds: f.ids });
  await until(f.snapshot, () => calls === 2);
  available = false;
  release.resolve();
  const final = await until(f.snapshot, (state) => state.batches[0]?.counts.processed === 3);
  assert.equal(calls, 2);
  assert.equal(final.batches[0]?.counts.failed, 1);
  assert.match(final.jobs.find(({ paperId }) => paperId === 'L003')?.error ?? '', /模型/);
});

test('翻译中原文变化时拒绝发布当前成品，仍继续处理队列后续论文', async (t) => {
  const release = gate();
  let calls = 0;
  const f = await fixture(t, async ({ work, source }) => {
    calls++;
    if (path.basename(source) === 'paper-1.pdf') await release.promise;
    return output(work);
  }, 2, undefined, release.resolve);
  await f.post('/api/translations/batches', {
    requestId: 'changed-source-request', paperIds: f.ids, model: model.id,
  });
  await until(f.snapshot, () => calls === 2);
  await writeFile(path.join(f.root, 'papers/paper-1.pdf'), '%PDF-1.4\n原文已更新\n%%EOF');
  release.resolve();
  const ready = await until(f.snapshot, (state) => state.batches[0]?.counts.processed === 2);
  assert.equal(ready.jobs.find(({ paperId }) => paperId === 'L001')?.status, 'failed');
  assert.equal(ready.jobs.find(({ paperId }) => paperId === 'L002')?.status, 'completed');
  assert.equal((await f.paper('L001')).result, null);
});
