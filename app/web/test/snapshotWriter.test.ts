import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SnapshotWriter } from '../src/lib/snapshotWriter.js';

async function settle(): Promise<void> { for (let index = 0; index < 8; index++) await Promise.resolve(); }

test('同时请求只序列化最新状态，磁盘提交后才解除对应等待', async () => {
  let value = 0;
  let serialized = 0;
  const writes: number[] = [];
  const gates: Array<() => void> = [];
  const writer = new SnapshotWriter('unused', () => { serialized++; return { value }; }, async (_file, data) => {
    writes.push((JSON.parse(data) as { value: number }).value);
    await new Promise<void>((resolve) => gates.push(resolve));
  });
  let firstSaved = false;
  let latestSaved = false;
  const first = writer.save().then(() => { firstSaved = true; });
  value = 1;
  const second = writer.save();
  await settle();
  assert.deepEqual(writes, [1]);
  assert.equal(firstSaved, false);
  value = 2;
  const third = writer.save();
  value = 3;
  const fourth = writer.save().then(() => { latestSaved = true; });
  assert.equal(serialized, 1, '等待中的请求不能提前生成整份快照字符串');
  gates[0]!();
  await Promise.all([first, second]);
  await settle();
  assert.equal(firstSaved, true);
  assert.equal(latestSaved, false);
  assert.deepEqual(writes, [1, 3]);
  assert.equal(serialized, 2);
  gates[1]!();
  await Promise.all([third, fourth, writer.flush()]);
  assert.equal(latestSaved, true);
});

test('失败拒绝全部未提交等待者并保留原因，后续保存可以重试最新状态', async () => {
  const failure = new Error('合成磁盘失败');
  let fail = true;
  let value = 1;
  const writes: number[] = [];
  const writer = new SnapshotWriter('unused', () => ({ value }), async (_file, data) => {
    if (fail) throw failure;
    writes.push(JSON.parse(data).value);
  });
  const waiting = Promise.allSettled([writer.save(), writer.save()]);
  assert.ok((await waiting).every((outcome) => outcome.status === 'rejected' && outcome.reason === failure));
  assert.equal(writer.error, failure);
  await assert.rejects(writer.flush(), (error) => error === failure);
  fail = false;
  value = 3;
  await writer.save();
  await writer.flush();
  assert.deepEqual(writes, [3]);
  assert.equal(writer.error, undefined);
});

test('失败处理回调中立即重试不会遗留在旧写入循环之后', async () => {
  let attempts = 0;
  const writer = new SnapshotWriter('unused', () => ({ attempts }), async () => {
    if (!attempts++) throw new Error('首次失败');
  });
  await writer.save().catch(() => writer.save());
  await writer.flush();
  assert.equal(attempts, 2);
});

test('真实原子替换失败不报告已保存并清理临时文件，修复目标后重试成功', async (t) => {
  const temporary = path.resolve('build/test-tmp');
  await mkdir(temporary, { recursive: true });
  const directory = await mkdtemp(path.join(temporary, 'snapshots-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'jobs.json');
  await mkdir(file);
  await writeFile(path.join(file, 'keep'), '保留');
  const writer = new SnapshotWriter(file, () => [{ id: '最新快照' }]);
  await assert.rejects(writer.save());
  assert.equal(await readFile(path.join(file, 'keep'), 'utf8'), '保留');
  assert.deepEqual((await readdir(directory)).filter((name) => name.endsWith('.tmp')), []);
  await rm(file, { recursive: true });
  await writer.save();
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), [{ id: '最新快照' }]);
});
