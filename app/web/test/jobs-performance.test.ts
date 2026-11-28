import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { JobManager, type BatchSummary, type JobEvent, type JobRecord } from '../src/lib/jobs.js';

async function fixture(t: test.TestContext) {
  const temporary = path.resolve('build/test-tmp');
  await mkdir(temporary, { recursive: true });
  const root = await mkdtemp(path.join(temporary, 'job-updates-'));
  const events: JobEvent[] = [];
  const manager = new JobManager({ root, stateDir: path.join(root, '.zhiyue/data'), emit: (event) => events.push(event) });
  t.after(async () => { await manager.close(); await rm(root, { recursive: true, force: true }); });
  await manager.ready;
  return { root, manager, events };
}

const record = (): JobRecord => ({
  id: 'synthetic', batch: null, title: '日志夹具', status: 'running', log: '', steps: [],
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
});

test('入队存盘失败不留下永久排队记录，修复磁盘后新任务可可靠执行', async (t) => {
  const { manager, events } = await fixture(t);
  const file = path.join(manager.stateDir, 'jobs.json');
  await mkdir(file);
  try {
    await assert.rejects(manager.refreshCatalog());
    assert.deepEqual(manager.listJobs(), []);
    assert.equal(events.length, 0, '受理失败不能广播排队任务');
  } finally { await rm(file, { recursive: true, force: true }); }
  let executed = false;
  const accepted = await manager._enqueue({ title: '恢复后任务' }, async () => { executed = true; });
  await manager.queue;
  assert.equal(executed, true);
  const saved = JSON.parse(await readFile(file, 'utf8')) as JobRecord[];
  assert.equal(saved.length, 1);
  assert.equal(saved[0]!.id, accepted.id);
  assert.equal(saved[0]!.status, 'completed');
});

test('日志立即脱敏且限长，通知每100毫秒合并，终态和关闭立即刷新并清理计时器', async (t) => {
  const { manager, events } = await fixture(t);
  const job = record();
  manager.jobs.push(job);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (let index = 0; index < 1000; index++) manager._log(job, `第${index}行\n`);
  manager._log(job, 'Authorization: Bearer fixture-secret\n');
  assert.equal(events.length, 0);
  assert.match(job.log, /第999行/);
  assert.doesNotMatch(job.log, /fixture-secret/);
  t.mock.timers.tick(99);
  assert.equal(events.length, 0);
  t.mock.timers.tick(1);
  assert.equal(events.length, 1);
  assert.equal(events[0]!.job.log, job.log);
  manager._log(job, '末行\n');
  job.status = 'completed';
  manager._notify(job);
  assert.equal(events.length, 2);
  assert.match(events[1]!.job.log, /末行/);
  assert.equal(events[1]!.job.status, 'completed');
  t.mock.timers.tick(1000);
  assert.equal(events.length, 2, '终态后不能再触发旧日志通知');
  manager._log(job, '关闭前最新日志\n');
  await manager.close();
  const count = events.length;
  assert.match(events.at(-1)!.job.log, /关闭前最新日志/);
  t.mock.timers.tick(1000);
  assert.equal(events.length, count);
  const saved = JSON.parse(await readFile(path.join(manager.stateDir, 'jobs.json'), 'utf8')) as JobRecord[];
  assert.equal(saved[0]!.log, job.log);
});

test('台账摘要缓存按文件变化失效，返回值隔离且命中前仍拒绝目录逃逸', async (t) => {
  const { root, manager } = await fixture(t);
  const directory = path.join(root, '.zhiyue/batches/batch-one');
  await mkdir(directory, { recursive: true });
  const ledger = path.join(directory, '下载状态.json');
  const content = (count: number) => JSON.stringify({ scope_note: 'cache-probe',
    entries: Array.from({ length: count }, () => ({ status: 'pending' })) });
  await writeFile(ledger, content(1));
  const parse = JSON.parse;
  let reads = 0;
  JSON.parse = (text, reviver) => { if (text.includes('cache-probe')) reads++; return parse(text, reviver); };
  try {
    const first = await manager._summary('batch-one');
    first.counts.pending = 999;
    assert.equal((await manager._summary('batch-one')).counts.pending, 1);
    assert.equal(reads, 1, '未变化台账不重复解析正文');
    await writeFile(ledger, content(2));
    assert.equal((await manager._summary('batch-one')).entries, 2);
    assert.equal(reads, 2);
    await writeFile(ledger, '{"scope_note":"cache-probe"');
    await assert.rejects(manager._summary('batch-one'), SyntaxError);
    await writeFile(ledger, content(3));
    assert.equal((await manager._summary('batch-one')).entries, 3);
    assert.equal(reads, 4, '读取错误不成为可用缓存');
  } finally { JSON.parse = parse; }
  const outside = path.join(root, 'outside');
  await mkdir(outside);
  await writeFile(path.join(outside, '下载状态.json'), content(9));
  await rm(directory, { recursive: true });
  await symlink(outside, directory, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(manager._summary('batch-one'), /批次目录逃逸/);
});

test('一次提交一百个 PDF 只读取一次索引，下一批重新查重', async (t) => {
  const { manager, root } = await fixture(t);
  const catalog = path.join(root, '.zhiyue/catalog');
  const uploads = path.join(manager.stateDir, 'uploads');
  await Promise.all([mkdir(catalog, { recursive: true }), mkdir(uploads, { recursive: true })]);
  const uploadPath = path.join(uploads, 'sample.pdf');
  const bytes = Buffer.from('%PDF-1.4 synthetic');
  await writeFile(uploadPath, bytes);
  const digest = createHash('sha256').update(bytes).digest('hex');
  const records = ['L000', 'L001', 'L002'].map((literature_id, index) => ({
    literature_id, sha256: digest.toUpperCase(), file_exists: index > 0,
  }));
  const submit = () => manager.startLocalImports({ category: 'papers/topic',
    uploads: Array.from({ length: 100 }, () => ({ title: '合成论文', uploadPath })) });
  const read = t.mock.method(manager, '_catalogByDigest');
  await writeFile(path.join(catalog, '文献索引.json'), JSON.stringify({ records }));
  await assert.rejects(submit(), /L001/);
  assert.equal(read.mock.callCount(), 1);
  await writeFile(path.join(catalog, '文献索引.json'), JSON.stringify({ records: [] }));
  t.mock.method(manager, '_enqueue', async () => record());
  const { skipped } = await submit();
  assert.equal(read.mock.callCount(), 2);
  assert.equal(skipped.length, 99);
  assert.ok(skipped.every((item) => item.reason.includes('与本批第 1 个文件相同')));
});

test('失效批次摘要最多四路读取，结果排序不受完成顺序影响', async (t) => {
  const { root, manager } = await fixture(t);
  for (let index = 0; index < 8; index++) await mkdir(path.join(root, '.zhiyue/batches', `batch-${index}`), { recursive: true });
  const gates: Array<() => void> = [];
  let active = 0;
  let maximum = 0;
  let started = 0;
  let firstFour!: () => void;
  let allEight!: () => void;
  const first = new Promise<void>((resolve) => { firstFour = resolve; });
  const second = new Promise<void>((resolve) => { allEight = resolve; });
  manager._summary = async (batch): Promise<BatchSummary> => {
    maximum = Math.max(maximum, ++active);
    started++;
    const gate = new Promise<void>((resolve) => gates.push(resolve));
    if (started === 4) firstFour();
    if (started === 8) allEight();
    await gate;
    active--;
    return { batch, entries: 1, counts: { pending: 1 }, scope_note: '' };
  };
  const operation = manager.listBatches();
  try {
    await first;
    assert.equal(started, 4);
    for (const release of gates.slice(0, 4).reverse()) release();
    await second;
    for (const release of gates.slice(4).reverse()) release();
    assert.equal(maximum, 4);
    assert.deepEqual((await operation).map(({ batch }) => batch),
      Array.from({ length: 8 }, (_, index) => `batch-${7 - index}`));
  } finally { for (const release of gates) release(); await operation; }
});
