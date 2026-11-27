import assert from 'node:assert/strict';
import test from 'node:test';
import { PdfTranslationQueue } from '../src/lib/pdfTranslationQueue.js';
import { translateMarkdownBlocks } from '../src/lib/pdfTranslationWorker.js';
import type { MarkdownBlock, TranslationModel } from '../src/lib/pdfTranslationWorker.js';

const gate = () => {
  let resolve!: () => void;
  return { promise: new Promise<void>((done) => { resolve = done; }), resolve };
};
async function until(ready: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (ready()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('等待队列状态超时');
}
const request = { requestId: 'queue-test-request', paperIds: ['L001', 'L002', 'L003'], model: 'test/model' };

test('保存时取消批次保留当前成品，其余任务取消，单篇继续等待保存完成', async (t) => {
  const publishing = gate();
  t.after(publishing.resolve);
  const calls: string[] = [];
  let savingSignal: AbortSignal | undefined;
  const queue = new PdfTranslationQueue(async (entry, signal) => {
    calls.push(entry.job.paperId);
    if (entry.job.paperId === 'L001') {
      savingSignal = signal;
      queue.update(entry, { status: 'saving', stage: '保存译本', percent: 99 });
      await publishing.promise;
    }
    queue.update(entry, { status: 'completed', stage: '翻译完成', percent: 100 });
  }, () => {});
  t.after(() => queue.close());
  const batch = queue.batch(request, 'fingerprint');
  await until(() => !!savingSignal);
  queue.cancelBatch(batch.id);
  queue.cancelBatch(batch.id);
  assert.equal(savingSignal?.aborted, false);
  const waiting = queue.snapshot().batches[0]!;
  assert.equal(waiting.status, 'cancelling');
  assert.equal(waiting.counts.cancelled, 2);
  assert.throws(() => queue.cancel('L001', batch.jobIds[0]!), /没有可取消/);
  queue.single('L004', request.model, 'fingerprint', false, '0'.repeat(64));
  assert.deepEqual(calls, ['L001']);
  publishing.resolve();
  await until(() => queue.forPaper('L004')?.status === 'completed');
  assert.deepEqual(calls, ['L001', 'L004']);
  const done = queue.snapshot().batches[0]!;
  assert.equal(done.status, 'cancelled');
  assert.deepEqual([done.counts.completed, done.counts.cancelled], [1, 2]);
});

test('关闭时先停止派发并取消排队项，等待当前请求清理，关闭后不再受理', async (t) => {
  const cleanup = gate();
  t.after(cleanup.resolve);
  const calls: string[] = [];
  let signal: AbortSignal | undefined;
  const queue = new PdfTranslationQueue(async (entry, currentSignal) => {
    calls.push(entry.job.paperId);
    signal = currentSignal;
    await cleanup.promise;
    currentSignal.throwIfAborted();
  }, () => {});
  const batch = queue.batch(request, 'fingerprint');
  await until(() => !!signal);
  let ended = false;
  const closing = queue.close().then(() => { ended = true; });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(signal?.aborted, true);
  assert.equal(ended, false);
  assert.equal(queue.snapshot().batches[0]?.counts.cancelled, 2);
  cleanup.resolve();
  await closing;
  assert.deepEqual(calls, ['L001']);
  assert.equal(queue.snapshot().batches[0]?.counts.cancelled, 3);
  assert.throws(() => queue.single('L004', request.model, 'fingerprint', false, '0'.repeat(64)), /正在关闭/);
  assert.equal(queue.snapshot().jobs.find(({ id }) => id === batch.jobIds[0])?.status, 'cancelled');
});

test('取消段落并发时等待所有已启动模型请求收尾再拒绝，未处理段落不再启动', async (t) => {
  const delayed = gate();
  const controller = new AbortController();
  t.after(() => { controller.abort(); delayed.resolve(); });
  let calls = 0;
  const model: TranslationModel = {
    id: 'test/drain', fingerprint: 'test/drain',
    complete: async (_mode, _text, signal) => {
      calls++;
      if (calls === 1) return new Promise<string>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
      await delayed.promise;
      return '第二个模型请求已结束。';
    },
  };
  const blocks: MarkdownBlock[] = ['First', 'Second', 'Third'].map((word) => ({
    kind: 'prose', text: `${word} paragraph about the experiment. ${'x'.repeat(3000)}`,
  }));
  let settled = false;
  const translating = translateMarkdownBlocks(blocks, model, controller.signal);
  void translating.then(() => { settled = true; }, () => { settled = true; });
  await until(() => calls === 2);
  controller.abort(new Error('取消请求'));
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(settled, false);
  assert.equal(calls, 2);
  delayed.resolve();
  await assert.rejects(translating, /取消请求/);
  assert.equal(calls, 2);
});
