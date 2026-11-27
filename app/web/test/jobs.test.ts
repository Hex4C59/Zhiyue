import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { JobManager } from '../src/lib/jobs.js';
import type { BatchSummary, JobEvent, JobRecord } from '../src/lib/jobs.js';
import { resolvePython } from '../src/lib/python.js';


type TestJob = JobRecord & { batch: string; result: BatchSummary };

// 测试夹具总会写入批次与统计；这里显式收窄，避免每处重复判空。
function requiredJob(manager: JobManager, id: string): TestJob {
  const job = manager.getJob(id);
  if (!job) throw new Error(`missing job ${id}`);
  return job as TestJob;
}

async function fixture(t: test.TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'literature-jobs-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'fixture'), { recursive: true });
  await mkdir(path.join(root, '.zhiyue/batches'), { recursive: true });
  await mkdir(path.join(root, '.zhiyue/tmp'), { recursive: true });
  // A local Node fixture acts as the executable's script; no real downloads.
  const downloader = path.join(root, 'fixture/run.py');
  await writeFile(downloader, `
const fs = require('node:fs'); const path = require('node:path');
const args = process.argv.slice(2); const root = args[1]; const command = args[2];
const batch = args[args.indexOf('--batch') + 1];
fs.appendFileSync(path.join(root, 'calls.jsonl'), JSON.stringify({command,args})+'\\n');
if(command === 'import') {
 const entries = JSON.parse(fs.readFileSync(args[3], 'utf8')).map(e=>({...e,status:'pending'}));
 const dir=path.join(root,'.zhiyue','batches',batch); fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'下载状态.json'), JSON.stringify({batch_id:batch,entries,scope_note:'fixture'}));
}
if(command === 'download') {
 const file=path.join(root,'.zhiyue','batches',batch,'下载状态.json'); const state=JSON.parse(fs.readFileSync(file));
 state.entries.forEach(e=>e.status='needs_review'); fs.writeFileSync(file, JSON.stringify(state));
}
process.stdout.write('Authorization: Bea');
setTimeout(()=>{process.stdout.write('rer secret-value\\nhttps://example.test/a?api_key=secret-query\\n');},5);
`);
  const stateDir = path.join(root, '.zhiyue/data');
  const events: JobEvent[] = [];
  const manager = new JobManager({
    root, stateDir, python: process.execPath, downloader, emit: (event) => { events.push(event); },
  });
  const calls = async (): Promise<Array<{ command: string; args: string[] }>> =>
    (await readFile(path.join(root, 'calls.jsonl'), 'utf8')).trim().split('\n')
      .map((line) => JSON.parse(line) as { command: string; args: string[] });
  return { root, stateDir, downloader, events, manager, calls };
}

test('批量移动任务保存逐项结果并清除私有输入', async t => {
  const { root, manager, downloader, stateDir } = await fixture(t);
  await writeFile(downloader, `
const fs = require('node:fs');
const moves = JSON.parse(fs.readFileSync(process.argv[5], 'utf8'));
console.log(JSON.stringify({items: moves.map((move, index) => ({
  ...move, ...(index ? {status: 'blocked', error: '同名文件'} : {status: 'moved'}),
}))}));
`);
  const moves = [
    { paperId: 'L001', category: 'papers/01_目标' },
    { paperId: 'L002', category: 'papers/02_目标' },
  ];
  const queued = await manager.startPaperMove(moves);
  assert.equal(queued.status, 'queued');
  await manager.queue;
  const job = manager.getJob(queued.id);
  assert.equal(job?.status, 'partial');
  assert.deepEqual(job?.moveResult?.items, [
    { ...moves[0], status: 'moved' },
    { ...moves[1], status: 'blocked', error: '同名文件' },
  ]);
  await assert.rejects(readFile(path.join(stateDir, `${queued.id}_moves.json`)), { code: 'ENOENT' });
  const reloaded = new JobManager({ root, stateDir, python: process.execPath, downloader });
  assert.deepEqual(reloaded.getJob(queued.id)?.moveResult, job?.moveResult);
});

test('downloads are queued, safely imported, redacted and never claim unverified acquisition', async t => {
  const { root, manager, calls, events, stateDir } = await fixture(t);
  assert.equal(typeof resolvePython(), 'string'); assert.equal(manager.python, process.execPath);
  const first = await manager.startDownload({ input: '10.1234/test\nA paper title' });
  const second = await manager.startDownload({ input: [{ title: 'Other', file: '../private.pdf', human_visual_review: true }], channel: 'ieee' });
  await manager.queue;
  const sequence = (await calls()).map(c => c.command);
  assert.deepEqual(sequence, ['import', 'download', 'archive', 'import', 'download', 'ieee', 'archive']);
  for (const id of [first.id, second.id]) {
    const job = requiredJob(manager, id);
    assert.equal(job.status, 'completed'); assert.ok(job.result.counts.needs_review);
    assert.equal(job.result.counts.archived, undefined);
    assert.ok(!job.log.includes('secret-value')); assert.ok(!job.log.includes('secret-query'));
    assert.match(job.log, /needs_review/); assert.ok(job.log.length <= 100000);
  }
  assert.match(first.batch ?? '', /^\d{8}_web_[a-f0-9]{8}$/);
  const input = JSON.parse(await readFile(path.join(stateDir, `${second.id}_input.json`), 'utf8'));
  assert.deepEqual(input, [{ title: 'Other' }]);
  assert.ok((await calls()).find(c => c.command === 'ieee')!.args.includes('--submit'));
  assert.equal((await calls())[0].args.at(-1)!, 'papers/09_情感综述调研/网站导入');
  assert.ok(events.every(e => e.type === 'job'));
  const persisted = new JobManager({ root, stateDir, python: process.execPath, downloader: path.join(root, 'fixture/run.py') });
  assert.equal(persisted.listJobs().length, 2);
});

test('action allowlist, explicit IEEE submission, refresh and restart recovery', async t => {
  const { root, manager, calls, stateDir } = await fixture(t);
  const job = await manager.startDownload({ input: JSON.stringify({ entries: [{ title: 'Example' }] }), autoArchive: false });
  await manager.queue;
  await assert.rejects(manager.startAction({ batch: '../bad', action: 'archive' }));
  await assert.rejects(manager.startAction({ batch: job.batch as string, action: 'review' as never }));
  await assert.rejects(manager.startAction({ batch: job.batch as string, action: 'download', submit: true }));
  await assert.rejects(manager.startDownload({ input: 'x', channel: 'elsevier' }));
  await assert.rejects(manager.startDownload({ input: [] }));
  await manager.startAction({ batch: job.batch as string, action: 'ieee' }); await manager.queue;
  assert.ok(!(await calls()).at(-1)!.args.includes('--submit'));
  await manager.startAction({ batch: job.batch as string, action: 'verify' }); await manager.queue;
  await manager.refreshCatalog(); await manager.queue;
  assert.equal((await calls()).at(-1)!.command, 'catalog');
  assert.equal((await manager.listBatches())[0]!.counts.needs_review, 1);
  await writeFile(path.join(stateDir, 'jobs.json'), JSON.stringify([{ id: 'old', status: 'running', log: '', steps: [] }]));
  const restarted = new JobManager({ root, stateDir }); await restarted.ready;
  assert.equal(requiredJob(restarted, 'old').status, 'failed'); assert.match(requiredJob(restarted, 'old').error ?? '', /中断/);
  assert.throws(() => new JobManager({ root, stateDir: path.dirname(root) }));
});

test('从库根别名启动时任务仍可运行，状态目录不得链接到库外', async (t) => {
  const { root, stateDir, downloader } = await fixture(t);
  const aliasParent = await mkdtemp(path.join(os.tmpdir(), 'literature-alias-'));
  t.after(() => rm(aliasParent, { recursive: true, force: true }));
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  const alias = path.join(aliasParent, 'library');
  await symlink(await realpath(root), alias, linkType);
  const options = { root: alias, stateDir: path.join(alias, '.zhiyue/data'), python: process.execPath, downloader };
  const manager = new JobManager(options);
  try {
    assert.equal(manager.stateDir, await realpath(stateDir));
    const job = await manager.startDownload({ input: '别名路径测试' });
    await manager.queue;
    assert.equal(requiredJob(manager, job.id).status, 'completed');
    const outside = path.join(aliasParent, 'outside');
    await mkdir(outside);
    const escaped = path.join(alias, '.zhiyue/escaped');
    await symlink(await realpath(outside), escaped, linkType);
    assert.throws(() => new JobManager({ ...options, stateDir: escaped }), /不能链接到项目外/);
  } finally {
    await manager.close();
  }
});

test('large logs stay bounded and process/spawn failures persist as failed', async t => {
  const { root, manager, stateDir } = await fixture(t);
  await writeFile(path.join(root, 'fixture/run.py'), `
process.stdout.write(('ordinary line\\n').repeat(12000));
process.stderr.write('token=very-private-value\\n');
process.exitCode=2;
`);
  const job = await manager.refreshCatalog(); await manager.queue;
  const result = requiredJob(manager, job.id);
  assert.equal(result.status, 'failed'); assert.equal(result.steps[0].status, 'failed');
  assert.ok(result.log.length <= 100000); assert.ok(!result.log.includes('very-private-value'));
  assert.equal(JSON.parse(await readFile(path.join(stateDir, 'jobs.json'), 'utf8'))[0].status, 'failed');
  const missing = new JobManager({ root, stateDir, python: path.join(root, 'nonexistent-python'), downloader: path.join(root, 'fixture/run.py') });
  const failed = await missing.refreshCatalog(); await missing.queue;
  assert.equal(requiredJob(missing, failed.id).status, 'failed');
});

test('explicit Python environment override takes precedence over installed interpreters', async t => {
  await fixture(t);
  const previous = process.env.LITERATURE_PYTHON;
  try {
    process.env.LITERATURE_PYTHON = process.execPath;
    assert.equal(resolvePython(), process.execPath);
  } finally {
    if (previous === undefined) delete process.env.LITERATURE_PYTHON;
    else process.env.LITERATURE_PYTHON = previous;
  }
});

test('category accepts new papers subdirectories and rejects unsafe paths before queuing', async t => {
  const { root, manager, calls } = await fixture(t);
  const category = 'papers/10_网站导入/自定义分类';
  const job = await manager.startDownload({ input: 'A paper', category }); await manager.queue;
  assert.equal(requiredJob(manager, job.id).status, 'completed');
  assert.equal((await calls())[0].args.at(-1)!, category);
  const count = manager.listJobs().length;
  for (const bad of ['papers', '../papers/test', 'notes/test', '/papers/test', 'C:/papers/test', 'papers/../notes', 'papers/one/../../tmp', 'papers\\test', 'papers//test', 'papers/./test', 'papers/test/', 'papers/%2e%2e', 'papers/key:stream', 'papers/test. ', 'papers/NUL', null]) {
    await assert.rejects(manager.startDownload({ input: 'A paper', category: bad as string }), String(bad));
  }
  assert.equal(manager.listJobs().length, count);
  const outside = await mkdtemp(path.join(os.tmpdir(), 'literature-category-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await mkdir(path.join(root, 'papers'), { recursive: true });
  await symlink(outside, path.join(root, 'papers/escape'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(manager.startDownload({ input: 'A paper', category: 'papers/escape/new' }));
});

test('collect uses only the batch IEEE output and refuses caller paths, mismatches and link escapes', async t => {
  const { root, manager, calls } = await fixture(t);
  const job = await manager.startDownload({ input: 'A paper', autoArchive: false }); await manager.queue;
  await assert.rejects(manager.startAction({ batch: job.batch as string, action: 'collect' }));
  const directory = path.join(root, '.zhiyue', 'tmp', job.batch as string, 'instsci');
  await mkdir(directory, { recursive: true });
  await assert.rejects(manager.startAction({ batch: job.batch as string, action: 'collect', directory: root }));
  await assert.rejects(manager.startAction({ batch: job.batch as string, action: 'collect', submit: true }));
  const collection = await manager.startAction({ batch: job.batch as string, action: 'collect' }); await manager.queue;
  assert.equal(requiredJob(manager, collection.id).status, 'completed');
  const call = (await calls()).at(-1)!;
  assert.equal(call.command, 'collect');
  assert.deepEqual(call.args.slice(3), ['--batch', job.batch as string, '--directory', await realpath(directory)]);
  const ledger = path.join(root, '.zhiyue', 'batches', job.batch as string, '下载状态.json');
  const state = JSON.parse(await readFile(ledger, 'utf8'));
  await writeFile(ledger, JSON.stringify({ ...state, batch_id: 'another_batch' }));
  await assert.rejects(manager.startAction({ batch: job.batch as string, action: 'collect' }));
  await writeFile(ledger, JSON.stringify(state));
  const outside = await mkdtemp(path.join(os.tmpdir(), 'literature-collect-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await rm(directory, { recursive: true });
  await symlink(outside, directory, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(manager.startAction({ batch: job.batch as string, action: 'collect' }));
});

test('local PDF batch import reuses the batch pipeline and skips duplicates', async t => {
  const { root, manager, calls, stateDir } = await fixture(t);
  const uploads = path.join(stateDir, 'uploads');
  await mkdir(uploads, { recursive: true });
  const first = path.join(uploads, 'first.pdf');
  const second = path.join(uploads, 'second.pdf');
  await writeFile(first, '%PDF-1.7\nfirst import fixture');
  await writeFile(second, '%PDF-1.7\nsecond import fixture');
  const imported = await manager.startLocalImports({
    uploads: [
      {
        uploadPath: first, title: '第一篇', authors: '张三; 李四', year: '2024',
        doi: 'https://doi.org/10.1234/local',
      },
      { uploadPath: second, title: '第二篇' },
    ],
  });
  assert.deepEqual(imported.skipped, []);
  assert.match(imported.job.title, /批量导入 2 篇/);
  await manager.queue;
  assert.equal(requiredJob(manager, imported.job.id).status, 'completed');
  assert.match(imported.job.batch ?? '', /^\d{8}_local_[a-f0-9]{8}$/);
  const recorded = await calls();
  assert.deepEqual(
    recorded.map(call => call.command),
    ['import', 'attach', 'review', 'attach', 'review', 'archive'],
  );
  assert.equal(recorded[0].args.at(-1)!, 'papers/09_情感综述调研/网站导入');
  const [firstPath, secondPath] = await Promise.all([realpath(first), realpath(second)]);
  assert.deepEqual(recorded[1].args.slice(-4), ['--item', 'I0001', '--file', firstPath]);
  assert.ok(recorded[2].args.includes('--accept-identity'));
  assert.ok(recorded[2].args.includes('用户在网站批量导入时确认题名与作者与 PDF 首页一致'));
  assert.deepEqual(recorded[3].args.slice(-4), ['--item', 'I0002', '--file', secondPath]);
  assert.deepEqual(recorded[5].args.slice(3), ['--batch', imported.job.batch]);
  const input = JSON.parse(
    await readFile(path.join(stateDir, `${imported.job.id}_input.json`), 'utf8'),
  );
  assert.deepEqual(input, [
    { title: '第一篇', authors: ['张三', '李四'], year: '2024', doi: '10.1234/local' },
    { title: '第二篇', authors: [], year: '待核实', doi: '' },
  ]);

  await assert.rejects(manager.startLocalImports({ uploads: [] }), /选择/);
  await assert.rejects(
    manager.startLocalImports({ uploads: [{ uploadPath: first, title: '' }] }),
    /题名/,
  );
  await assert.rejects(
    manager.startLocalImports({ uploads: [{ uploadPath: first, title: 'x', year: '24' }] }),
    /四位/,
  );
  await assert.rejects(
    manager.startLocalImports({
      uploads: [{ uploadPath: first, title: 'x', doi: 'https://example.com/x' }],
    }),
    /DOI/,
  );
  const outside = path.join(root, 'fixture/outside.pdf');
  await writeFile(outside, '%PDF-1.7');
  await assert.rejects(
    manager.startLocalImports({ uploads: [{ uploadPath: outside, title: 'x' }] }),
    /本网站上传/,
  );
  const fake = path.join(uploads, 'fake.pdf');
  await writeFile(fake, 'not a pdf');
  await assert.rejects(
    manager.startLocalImports({ uploads: [{ uploadPath: fake, title: 'x' }] }),
    /不是有效PDF/,
  );
  await assert.rejects(
    manager.startLocalImports({
      uploads: Array.from({ length: 101 }, () => ({ uploadPath: first, title: 'x' })),
    }),
    /100/,
  );
  assert.equal(manager.listJobs().length, 1);

  const copy = path.join(uploads, 'copy.pdf');
  await writeFile(copy, await readFile(first));
  const repeated = await manager.startLocalImports({
    uploads: [
      { uploadPath: first, title: '第一篇副本 A' },
      { uploadPath: copy, title: '第一篇副本 B' },
    ],
  });
  assert.deepEqual(repeated.skipped.map(item => [item.index, item.literature_id]), [[1, '']]);
  assert.match(repeated.skipped[0].reason, /第 1 个/);
  await manager.queue;
  assert.equal(requiredJob(manager, repeated.job.id).status, 'completed');
  const repeatedCalls = (await calls()).slice(6);
  assert.deepEqual(
    repeatedCalls.map(call => call.command),
    ['import', 'attach', 'review', 'archive'],
  );
  assert.ok(repeatedCalls[1].args.includes(firstPath));
  assert.ok(!repeatedCalls[3].args.includes('--item'));

  const third = path.join(uploads, 'third.pdf');
  await writeFile(third, '%PDF-1.7\nthird import fixture');
  const digest = createHash('sha256').update(await readFile(second)).digest('hex');
  await mkdir(path.join(root, '.zhiyue/catalog'), { recursive: true });
  await writeFile(
    path.join(root, '.zhiyue/catalog/文献索引.json'),
    JSON.stringify({
      records: [{ literature_id: 'L009', title: '已归档论文', sha256: digest, file_exists: true }],
    }),
  );
  const mixed = await manager.startLocalImports({
    uploads: [
      { uploadPath: second, title: '重复论文' },
      { uploadPath: third, title: '新论文' },
    ],
  });
  assert.deepEqual(mixed.skipped.map(item => [item.index, item.literature_id]), [[0, 'L009']]);
  await manager.queue;
  assert.equal(requiredJob(manager, mixed.job.id).status, 'completed');
  await assert.rejects(
    manager.startLocalImports({ uploads: [{ uploadPath: second, title: '重复论文' }] }),
    (error: unknown) => (error as { statusCode?: number; message?: string }).statusCode === 409 && /L009/.test((error as Error).message),
  );
  assert.equal(manager.listJobs().length, 3);
});

test('close kills its running process tree, prevents queued work and persists interrupted jobs', { timeout: 18000 }, async t => {
  const { root, stateDir, downloader, calls } = await fixture(t);
  const script = path.join(root, 'fixture/run.py');
  await writeFile(script, (await readFile(script, 'utf8')) + `
if(command === 'download') {
 const child=require('node:child_process').spawn(process.execPath,['-e','setTimeout(()=>{},10000)'],{stdio:'inherit',windowsHide:true,shell:false});
 fs.writeFileSync(path.join(root,'running.json'),JSON.stringify({pid:process.pid,descendant:child.pid}));
 setTimeout(()=>{},10000);
}
`);
  // Run the lifecycle in a separate process with a deadline: a broken close must not hang the test runner.
  const source = `
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { JobManager } from ${JSON.stringify(new URL('../src/lib/jobs.js', import.meta.url).href)};
const root=${JSON.stringify(root)}, stateDir=${JSON.stringify(stateDir)}, downloader=${JSON.stringify(downloader)};
const manager=new JobManager({root,stateDir,python:process.execPath,downloader});
const first=await manager.startDownload({input:'First'});
const second=await manager.startDownload({input:'Second'});
let running;
for(let i=0;i<400;i++) { try { running=JSON.parse(await fs.readFile(path.join(root,'running.json'),'utf8'));break; } catch { await delay(10); } }
assert.ok(running,'download fixture did not start');
assert.equal(manager.getJob(second.id).status,'queued');
const closed=manager.close(); assert.equal(manager.close(),closed); await closed;
for(const id of [first.id,second.id]) { assert.equal(manager.getJob(id).status,'failed');assert.match(manager.getJob(id).error,/中断/); }
assert.equal(manager.getJob(first.id).steps.at(-1).status,'failed');
assert.equal(manager.getJob(second.id).steps.length,0);
assert.equal(manager.children.size,0);
await assert.rejects(manager.refreshCatalog(),/中断/);
await assert.rejects(manager.startDownload({input:'Third'}),/中断/);
for(const pid of [running.pid,running.descendant]) {
 let alive=true;
 for(let i=0;i<100;i++) { try { process.kill(pid,0);await delay(10); } catch(e) { if(e.code==='ESRCH') { alive=false;break; } throw e; } }
 assert.equal(alive,false,'owned child survived close: '+pid);
}
const restarted=new JobManager({root,stateDir,python:process.execPath,downloader});await restarted.ready;
assert.ok(restarted.listJobs().every(j=>j.status==='failed'&&/中断/.test(j.error)));
await restarted.close();
`;
  const result = await new Promise<{ code: number | null; signal: string | null; output: string }>((resolve, reject) => {
    const proc = spawn(process.execPath, ['--input-type=module', '-e', source], { shell: false, windowsHide: true, timeout: 13000, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    proc.stdout.on('data', (b: Buffer) => { output += b.toString(); });
    proc.stderr.on('data', (b: Buffer) => { output += b.toString(); });
    proc.once('error', reject); proc.once('close', (code, signal) => resolve({ code, signal, output }));
  });
  assert.equal(result.code, 0, JSON.stringify(result));
  assert.deepEqual((await calls()).map(c => c.command), ['import', 'download']);
  const saved = JSON.parse(await readFile(path.join(stateDir, 'jobs.json'), 'utf8'));
  assert.equal(saved.length, 2); assert.ok(saved.every((j: { status: string }) => j.status === 'failed'));
});
