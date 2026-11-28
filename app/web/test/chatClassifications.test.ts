import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { createApp } from '../src/server.js';
import type { App } from '../src/server.js';
import type { Chat, ChatEvent } from '../src/lib/chatTypes.js';
import type { ChatRecord } from '../src/lib/chatStore.js';
import type { ClassifySubmission } from '../src/lib/chatClassifications.js';
import type { JobRecord, PaperMove, PaperMoveResult } from '../src/lib/jobs.js';
import type { ChatClassifyProposal, ChatClassifyRun } from '../shared/contracts.js';
import { activeClassifyRun } from '../shared/contracts.js';

const stamp = () => new Date().toISOString();
const paperId = (index: number) => `L${String(index).padStart(3, '0')}`;
function deferred() {
  let resolve!: () => void;
  let resolved = false;
  const promise = new Promise<void>((done) => { resolve = () => { resolved = true; done(); }; });
  return { promise, resolve, get resolved() { return resolved; } };
}
async function until(ready: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 300; attempt++) {
    if (ready()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('等待归类事件超时。');
}
function proposal(index: number, top = '02_目标', child?: string): ChatClassifyProposal {
  const id = paperId(index);
  return {
    id: `proposal-${id}`, paperId: id, title: `合成论文 ${id}`, fromPath: 'papers/01_来源',
    targetCategory: top, ...(child ? { targetSubcategory: child } : {}),
    targetPath: `papers/${[top, child].filter(Boolean).join('/')}`,
    willCreateCategory: !/^\d+_/.test(top), willCreateSubcategory: !!child && !/^\d+_/.test(child),
    basis: 'notes', reason: '合成笔记表明主题一致。', createdAt: stamp(),
  };
}

async function fixture(t: test.TestContext, count = 2) {
  const scratch = path.resolve('build/test-tmp');
  await mkdir(scratch, { recursive: true });
  const root = await mkdtemp(path.join(scratch, 'chat-classifications-'));
  const stateDir = path.join(root, '.zhiyue/data');
  const releases: Array<() => void> = [];
  const apps: App[] = [];
  t.after(async () => {
    for (const release of releases) release();
    for (const app of apps) await app.close();
    await rm(root, { recursive: true, force: true });
  });
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  await mkdir(path.join(root, 'papers/01_来源'), { recursive: true });
  await mkdir(path.join(root, 'papers/02_目标/01_既有子类'), { recursive: true });
  await mkdir(path.join(root, '.zhiyue/catalog'), { recursive: true });
  const records = Array.from({ length: count }, (_, index) => ({
    literature_id: paperId(index + 1), title: `合成论文 ${index + 1}`, authors: [],
    file: `papers/01_来源/${paperId(index + 1)}.pdf`, versions: [],
  }));
  await Promise.all(records.map((record) => writeFile(path.join(root, record.file), '%PDF-1.4\nsynthetic\n')));
  await writeFile(path.join(root, 'README.md'), '# 隔离归类测试库\n');
  await writeFile(path.join(root, '.zhiyue/catalog/文献索引.json'), JSON.stringify({ records }));
  let app!: App;
  let base = '';
  const open = async () => {
    app = await createApp({ root, stateDir, connectPi: false });
    apps.push(app);
    // 此套测试只合成 CLI 回执；真实搬文件与进程生命周期分别由 Python 和 jobs 测试负责。
    app.jobs._run = async () => { throw new Error('测试未安装合成移动工作器。'); };
    await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve));
    const address = app.server.address();
    assert.ok(address && typeof address === 'object');
    base = `http://127.0.0.1:${address.port}`;
  };
  await open();
  return {
    root, stateDir,
    get app() { return app; },
    get base() { return base; },
    gate() { const gate = deferred(); releases.push(gate.resolve); return gate; },
    createChat(proposals: ChatClassifyProposal[]) {
      const chat = app.chats.create();
      chat.classifyProposals = structuredClone(proposals);
      app.chats.store.save(chat.id);
      return chat;
    },
    async getChat(id: string): Promise<Chat> {
      const response = await fetch(`${base}/api/chats/${id}`);
      assert.equal(response.status, 200);
      return response.json() as Promise<Chat>;
    },
    decide(chatId: string, body: Record<string, unknown>) {
      return fetch(`${base}/api/chats/${chatId}/classify-proposals`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
    },
    async restart() { await app.close(); await open(); },
  };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
const apply = (f: Fixture, chat: Chat, requestId: string, ids = chat.classifyProposals!.map(({ id }) => id)) =>
  f.decide(chat.id, { action: 'apply', requestId, ids });
function runOf(chat: Chat, id: string): ChatClassifyRun {
  const run = chat.classifyRuns?.find((run) => run.id === id);
  assert.ok(run);
  return run;
}
function worker(
  f: Fixture, result: (moves: PaperMove[]) => PaperMoveResult = (moves) => ({
    items: moves.map((move) => ({ ...move, status: 'moved' })),
  }), waiting?: Promise<void>,
) {
  const calls: Array<{ command: string; input: string; moves: PaperMove[] }> = [];
  f.app.jobs._run = async (job, command, args = [], onOutput) => {
    assert.equal(command, 'move-papers');
    assert.equal(args.length, 1);
    const moves = JSON.parse(await readFile(args[0]!, 'utf8')) as PaperMove[];
    calls.push({ command, input: args[0]!, moves });
    await waiting;
    f.app.jobs._assertOpen();
    assert.ok(onOutput);
    onOutput(JSON.stringify(result(moves)));
    job.steps.push({ action: command, status: 'completed', startedAt: stamp(), finishedAt: stamp() });
    await f.app.jobs._save();
  };
  return calls;
}
async function events(f: Fixture, t: test.TestContext): Promise<ChatEvent[]> {
  const controller = new AbortController();
  const response = await fetch(`${f.base}/api/events`, { signal: controller.signal });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/);
  const received: ChatEvent[] = [];
  const reader = response.body!.getReader();
  const reading = (async () => {
    let pending = '';
    const decoder = new TextDecoder();
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      pending += decoder.decode(chunk.value, { stream: true });
      let end;
      while ((end = pending.indexOf('\n\n')) !== -1) {
        const entry = pending.slice(0, end);
        pending = pending.slice(end + 2);
        if (entry.startsWith('data: ')) received.push(JSON.parse(entry.slice(6)) as ChatEvent);
      }
    }
  })();
  reading.catch(() => {});
  t.after(async () => {
    controller.abort();
    await reading.catch((error: unknown) => { if (!controller.signal.aborted) throw error; });
  });
  return received;
}

/** 模拟 CLI 已落盘、聊天终态尚未保存就退出；重启必须依靠持久化证据对账。 */
async function leaveUnreconciled(
  f: Fixture, chatId: string, runId: string, alterJob: (job: JobRecord) => void = () => {},
): Promise<void> {
  await f.app.close();
  const chatFile = f.app.chats.store.fileFor(chatId);
  const saved = JSON.parse(await readFile(chatFile, 'utf8')) as ChatRecord;
  const chat = saved.chat;
  const run = runOf(chat, runId);
  chat.messages = chat.messages.filter(({ id }) => id !== run.messageId);
  chat.classifyProposals = structuredClone(run.proposals);
  run.status = 'moving';
  run.items = run.items.map((item) => ({ ...item, status: 'pending', error: undefined }));
  await writeFile(chatFile, JSON.stringify(saved));
  const jobsFile = path.join(f.stateDir, 'jobs.json');
  const jobs = JSON.parse(await readFile(jobsFile, 'utf8')) as JobRecord[];
  const job = jobs.find(({ id }) => id === run.jobId)!;
  job.status = 'running';
  alterJob(job);
  await writeFile(jobsFile, JSON.stringify(jobs));
}

test('十四篇确认先返回202，目标去重且只移动一次，重放和重复终态事件保持唯一回执', async (t) => {
  const f = await fixture(t, 14);
  const blocked = f.gate();
  const calls = worker(f, undefined, blocked.promise);
  const received = await events(f, t);
  const create = f.app.library.createCategory.bind(f.app.library);
  const folders: Array<{ name: unknown; parent: unknown }> = [];
  f.app.library.createCategory = async (name, parent) => {
    folders.push({ name, parent: parent ?? null });
    return create(name, parent);
  };
  const proposals = Array.from({ length: 14 }, (_, index) => proposal(index + 1,
    index % 2 ? '99_新主题' : '新主题', index % 2 ? '99_方法' : '方法'));
  const chat = f.createChat(proposals);
  const ids = proposals.map(({ id }) => id);
  const accepted = await apply(f, chat, 'fourteen', [...ids, ids[0]!]);
  assert.equal(accepted.status, 202);
  const submitted = await accepted.json() as ClassifySubmission;
  assert.equal(submitted.replayed, false);
  assert.equal(submitted.job?.id, submitted.run.jobId);
  assert.equal(blocked.resolved, false);
  await until(() => calls.length === 1);
  assert.equal(f.app.jobs.getJob(submitted.job!.id)?.status, 'running');
  for (let index = 0; index < 10; index++) f.app.chats.create();
  assert.equal(f.app.chats.get(chat.id), chat, '归类任务排队、准备目录和等待回执时保留同一正文');
  const pending = await f.getChat(chat.id);
  assert.equal(pending.classifyProposals?.length, 14);
  assert.equal(runOf(pending, submitted.run.id).status, 'moving');
  assert.ok(pending.classifyRevision! > 0);
  assert.deepEqual(folders, [{ name: '新主题', parent: null }, { name: '方法', parent: '03_新主题' }]);
  assert.deepEqual(new Set(calls[0]!.moves.map(({ category }) => category)), new Set(['papers/03_新主题/01_方法']));
  assert.equal(calls[0]!.moves.length, 14);
  const replay = await apply(f, chat, 'fourteen', [...ids].reverse());
  assert.equal(replay.status, 200);
  const repeated = await replay.json() as ClassifySubmission;
  assert.equal(repeated.run.id, submitted.run.id);
  assert.equal(repeated.replayed, true);
  assert.equal((await apply(f, chat, 'fourteen', ids.slice(1))).status, 409);
  assert.equal((await apply(f, chat, 'other-active', ids)).status, 409);
  assert.equal((await f.decide(chat.id, { action: 'discard', ids })).status, 409);
  assert.equal(f.app.jobs.listJobs().length, 1);
  blocked.resolve();
  await f.app.jobs.queue;
  const finished = await f.getChat(chat.id);
  const run = runOf(finished, submitted.run.id);
  assert.equal(run.status, 'completed');
  assert.ok(run.items.every(({ status }) => status === 'moved'));
  assert.deepEqual(finished.classifyProposals, []);
  assert.deepEqual(run.createdFolders, ['papers/03_新主题', 'papers/03_新主题/01_方法']);
  assert.equal(finished.messages.filter(({ id }) => id === run.messageId).length, 1);
  await until(() => received.some((event) => event.type === 'classifyRun' &&
    (event.run as ChatClassifyRun).status === 'completed'));
  const terminal = f.app.jobs.getJob(submitted.job!.id)!;
  for (let index = 0; index < 3; index++) f.app.emit({ type: 'job', job: terminal });
  const finalReplay = await apply(f, chat, 'fourteen', ids);
  assert.equal(finalReplay.status, 200);
  assert.deepEqual((await finalReplay.json() as ClassifySubmission).run, run);
  assert.deepEqual(await f.getChat(chat.id), finished);
  assert.equal(calls.length, 1);
  assert.equal(received.filter((event) => event.type === 'classifyRun' &&
    (event.run as ChatClassifyRun).status === 'completed').length, 1);
  assert.ok(received.some((event) => event.type === 'classifyRun' &&
    event.revision === (event.run as ChatClassifyRun).revision && Array.isArray(event.proposals)));
  await assert.rejects(readFile(calls[0]!.input), { code: 'ENOENT' });
});

test('非法请求、跨会话提案及归档会话拒绝执行，取消仍返回原有结果', async (t) => {
  const f = await fixture(t);
  const calls = worker(f);
  const chat = f.createChat([proposal(1)]);
  const other = f.createChat([proposal(2)]);
  const ids = [proposal(1).id];
  for (const requestId of [undefined, null, 1, '', 'bad/request', '有中文', 'x'.repeat(129)]) {
    assert.equal((await f.decide(chat.id, { action: 'apply', ids, requestId })).status, 400);
  }
  for (const bad of [{ action: 'delete', ids }, { action: 'apply', ids: [] }, { action: 'apply', ids: [1] }]) {
    assert.equal((await f.decide(chat.id, { requestId: 'invalid', ...bad })).status, 400);
  }
  assert.equal((await apply(f, chat, 'foreign', [proposal(2).id])).status, 404);
  assert.equal((await f.decide('missing-chat', { action: 'apply', requestId: 'missing', ids })).status, 404);
  f.app.chats.changeHistory(other.id, 'archived');
  assert.equal((await apply(f, other, 'archived')).status, 409);
  assert.equal((await f.decide(other.id, { action: 'discard', ids: [proposal(2).id] })).status, 409);
  assert.deepEqual((await f.getChat(chat.id)).classifyRuns, []);
  const cancelled = await f.decide(chat.id, { action: 'discard', ids });
  assert.equal(cancelled.status, 200);
  const result = await cancelled.json() as {
    applied: string[]; discarded: string[]; failed: unknown[]; remaining: string[];
  };
  assert.deepEqual(result.applied, []);
  assert.deepEqual(result.discarded, ids);
  assert.deepEqual(result.failed, []);
  assert.deepEqual(result.remaining, []);
  const discarded = await f.getChat(chat.id);
  assert.deepEqual(discarded.classifyProposals, []);
  assert.equal(discarded.messages.length, 1);
  assert.match(discarded.messages[0]!.text, /已取消 L001/);
  assert.equal(f.app.jobs.listJobs().length, 0);
  assert.equal(calls.length, 0);
  assert.match(await readFile(path.join(f.root, 'papers/01_来源/L001.pdf'), 'utf8'), /synthetic/);
});

test('混合目录准备与CLI逐项结果保留成功行，只移除 moved 和 unchanged 提案', async (t) => {
  const f = await fixture(t, 5);
  const calls = worker(f, (moves) => ({ items: moves.map((move) => ({
    ...move,
    ...(move.paperId === 'L002' ? { status: 'unchanged' as const } :
      move.paperId === 'L003' ? { status: 'blocked' as const, error: '目标有同名文件。' } :
      move.paperId === 'L004' ? { status: 'failed' as const, error: '文件正在使用。' } : { status: 'moved' as const }),
  })) }));
  const chat = f.createChat([
    proposal(1, '非法/目录'), proposal(2), proposal(3, '02_目标', '01_既有子类'),
    proposal(4), proposal(5, '新主题'),
  ]);
  const response = await apply(f, chat, 'mixed');
  assert.equal(response.status, 202);
  const submitted = await response.json() as ClassifySubmission;
  await f.app.jobs.queue;
  const finished = await f.getChat(chat.id);
  const run = runOf(finished, submitted.run.id);
  const job = f.app.jobs.getJob(submitted.job!.id)!;
  assert.equal(job.status, 'failed');
  assert.deepEqual(job.steps.map(({ action, status }) => [action, status]), [['move-papers', 'completed']]);
  assert.equal(run.status, 'partial');
  assert.deepEqual(run.items.map(({ status }) => status), ['blocked', 'unchanged', 'blocked', 'failed', 'moved']);
  assert.deepEqual(finished.classifyProposals?.map(({ paperId }) => paperId), ['L001', 'L003', 'L004']);
  assert.ok(finished.classifyProposals?.every(({ error }) => !!error));
  assert.deepEqual(run.createdFolders, ['papers/03_新主题']);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]!.moves.map(({ paperId }) => paperId), ['L002', 'L003', 'L004', 'L005']);
  assert.equal(run.items[2]!.category, 'papers/02_目标/01_既有子类');
  const message = finished.messages.find(({ id }) => id === run.messageId)!;
  assert.match(message.text, /L002 已在目标/);
  assert.match(message.text, /L005 已移动至/);
  assert.match(message.text, /L004 归类未完成：文件正在使用/);
});

test('mkdir遇到文件占用或明确权限故障时保留失败项，其他有效目标仍可整批移动', async (t) => {
  const f = await fixture(t, 4);
  const occupied = path.join(f.root, 'papers/03_占用');
  await writeFile(occupied, '必须保留的合成文件');
  const create = f.app.library.createCategory.bind(f.app.library);
  f.app.library.createCategory = async (name, parent) => {
    if (name === '权限受限') throw Object.assign(new Error('合成 mkdir 权限故障。'), { code: 'EACCES' });
    return create(name, parent);
  };
  const calls = worker(f);
  const chat = f.createChat([
    proposal(1, '占用'), proposal(2, '权限受限'), proposal(3, '有效目标'), proposal(4, '有效目标'),
  ]);
  const response = await apply(f, chat, 'mkdir-conflict');
  assert.equal(response.status, 202);
  const submitted = await response.json() as ClassifySubmission;
  await f.app.jobs.queue;
  const finished = await f.getChat(chat.id);
  const run = runOf(finished, submitted.run.id);
  assert.equal(run.status, 'partial');
  assert.deepEqual(run.items.map(({ status }) => status), ['blocked', 'blocked', 'moved', 'moved']);
  assert.match(run.items[1]!.error ?? '', /EACCES/);
  assert.deepEqual(finished.classifyProposals?.map(({ paperId }) => paperId), ['L001', 'L002']);
  assert.deepEqual(run.createdFolders, ['papers/03_有效目标']);
  assert.deepEqual(calls[0]!.moves.map(({ paperId }) => paperId), ['L003', 'L004']);
  assert.equal(await readFile(occupied, 'utf8'), '必须保留的合成文件');
});

test('完整持久化回执跨服务重启补齐固定结果，成功和部分成功均不重复执行', async (t) => {
  for (const mixed of [false, true]) await t.test(mixed ? '部分成功' : '全部成功', async (t) => {
    const f = await fixture(t);
    worker(f, (moves) => ({ items: moves.map((move, index) => ({ ...move,
      ...(mixed && index ? { status: 'failed' as const, error: '合成逐项失败。' } : { status: 'moved' as const }),
    })) }));
    const chat = f.createChat([proposal(1), proposal(2)]);
    const response = await apply(f, chat, 'restart-complete');
    assert.equal(response.status, 202);
    const submitted = await response.json() as ClassifySubmission;
    await f.app.jobs.queue;
    const before = await f.getChat(chat.id);
    const original = runOf(before, submitted.run.id);
    const message = before.messages.find(({ id }) => id === original.messageId)!;
    await leaveUnreconciled(f, chat.id, original.id);
    await f.restart();
    const calls = worker(f);
    const recovered = await f.getChat(chat.id);
    const run = runOf(recovered, original.id);
    assert.equal(run.status, mixed ? 'partial' : 'completed');
    assert.deepEqual(run.items, original.items);
    assert.deepEqual(recovered.classifyProposals?.map(({ id }) => id), mixed ? [proposal(2).id] : []);
    assert.equal(recovered.messages.length, 1);
    assert.equal(recovered.messages[0]!.id, message.id);
    assert.equal(recovered.messages[0]!.text, message.text);
    const replay = await apply(f, chat, 'restart-complete', original.proposalIds);
    assert.equal(replay.status, 200);
    assert.equal((await replay.json() as ClassifySubmission).run.messageId, message.id);
    assert.equal(f.app.jobs.listJobs().length, 1);
    assert.equal(calls.length, 0);
    const persisted = JSON.parse(await readFile(f.app.chats.store.fileFor(chat.id), 'utf8')) as ChatRecord;
    assert.equal(runOf(persisted.chat, run.id).status, run.status);
  });
});

test('中断且缺少可靠证据时保留提案并要求核实，不依据文件名或局部回执宣告成功', async (t) => {
  const cases: Array<[string, (job: JobRecord) => void]> = [
    ['没有回执', (job) => { delete job.moveResult; }],
    ['回执不完整', (job) => { job.moveResult!.items.pop(); }],
    ['没有成功CLI步骤', (job) => { job.steps = []; }],
    ['回执目标不符', (job) => { job.moveResult!.items[0]!.category = 'papers/别处'; }],
  ];
  for (const [label, alter] of cases) await t.test(label, async (t) => {
    const f = await fixture(t);
    worker(f);
    const chat = f.createChat([proposal(1), proposal(2)]);
    const submitted = await (await apply(f, chat, 'interrupted')).json() as ClassifySubmission;
    await f.app.jobs.queue;
    await leaveUnreconciled(f, chat.id, submitted.run.id, alter);
    await f.restart();
    const calls = worker(f);
    const recovered = await f.getChat(chat.id);
    const run = runOf(recovered, submitted.run.id);
    assert.equal(run.status, 'interrupted');
    assert.deepEqual(run.items.map(({ status }) => status), ['interrupted', 'interrupted']);
    assert.equal(recovered.classifyProposals?.length, 2);
    assert.ok(recovered.classifyProposals?.every(({ error }) => /中断|核实/.test(error ?? '')));
    assert.match(run.stage, /核实/);
    assert.equal(recovered.messages.filter(({ id }) => id === run.messageId).length, 1);
    assert.doesNotMatch(recovered.messages[0]!.text, /已移动至/);
    assert.equal(calls.length, 0);
  });
});

test('repair回执即使含moved也不报告完成，提案和事务记录继续保留', async (t) => {
  const f = await fixture(t);
  const repair = '.zhiyue/tmp/paper_moves/needs-repair.json';
  await mkdir(path.dirname(path.join(f.root, repair)), { recursive: true });
  await writeFile(path.join(f.root, repair), '{"synthetic":true}\n');
  const calls = worker(f, (moves) => ({ repair, items: moves.map((move, index) => ({ ...move,
    ...(index ? { status: 'failed' as const, error: '索引写入失败。' } : { status: 'moved' as const }),
  })) }));
  const chat = f.createChat([proposal(1), proposal(2)]);
  const submitted = await (await apply(f, chat, 'repair')).json() as ClassifySubmission;
  await f.app.jobs.queue;
  const finished = await f.getChat(chat.id);
  const run = runOf(finished, submitted.run.id);
  assert.equal(run.status, 'interrupted');
  assert.equal(run.repair, repair);
  assert.ok(run.items.every(({ status }) => status === 'interrupted'));
  assert.equal(finished.classifyProposals?.length, 2);
  assert.equal(f.app.jobs.getJob(submitted.job!.id)?.steps[0]?.status, 'completed');
  assert.match(finished.messages[0]!.text, /需要核实并修复事务/);
  assert.doesNotMatch(finished.messages[0]!.text, /已移动至/);
  assert.equal((await apply(f, chat, 'repair')).status, 200);
  assert.equal(calls.length, 1);
  assert.equal(await readFile(path.join(f.root, repair), 'utf8'), '{"synthetic":true}\n');
});

test('首次保存失败后没有永久queued状态，新请求可继续处理保留的提案', async (t) => {
  const f = await fixture(t);
  const calls = worker(f);
  const chat = f.createChat([proposal(1)]);
  const store = f.app.chats.store;
  const save = store.save.bind(store);
  let first = true;
  store.save = (chatId) => {
    if (first) { first = false; throw new Error('合成聊天存储写入失败。'); }
    save(chatId);
  };
  try {
    const response = await apply(f, chat, 'save-fails');
    assert.ok(response.status >= 400);
    assert.match((await response.json() as { error: string }).error, /存储写入失败/);
  } finally { store.save = save; }
  assert.equal(f.app.jobs.listJobs().length, 0);
  const failed = await f.getChat(chat.id);
  assert.ok((failed.classifyRuns ?? []).every((run) => !activeClassifyRun(run)));
  assert.equal(failed.classifyProposals?.length, 1);
  const response = await apply(f, chat, 'save-retry');
  assert.equal(response.status, 202);
  const submitted = await response.json() as ClassifySubmission;
  await f.app.jobs.queue;
  assert.equal(runOf(await f.getChat(chat.id), submitted.run.id).status, 'completed');
  assert.equal(calls.length, 1);
});

test('创建目录后的保存故障不能被当作mkdir故障继续执行，保留提案和已建目录供核实', async (t) => {
  const f = await fixture(t);
  const calls = worker(f);
  const chat = f.createChat([proposal(1, '首个目标'), proposal(2, '后续目标')]);
  const store = f.app.chats.store;
  const save = store.save.bind(store);
  let injected = false;
  store.save = (chatId) => {
    const run = chat.classifyRuns?.[0];
    if (!injected && run?.createdFolders.length === 1 && run.status === 'preparing') {
      injected = true;
      throw Object.assign(new Error('合成目录回执保存失败。'), { code: 'ENOSPC' });
    }
    save(chatId);
  };
  try {
    const response = await apply(f, chat, 'prepare-save-fails');
    assert.equal(response.status, 202);
    const submitted = await response.json() as ClassifySubmission;
    await f.app.jobs.queue;
    const finished = await f.getChat(chat.id);
    const run = runOf(finished, submitted.run.id);
    assert.equal(injected, true);
    assert.equal(run.status, 'interrupted');
    assert.deepEqual(run.createdFolders, ['papers/03_首个目标']);
    assert.ok(run.items.every(({ status }) => status === 'interrupted'));
    assert.equal(finished.classifyProposals?.length, 2);
    assert.match(finished.messages[0]!.text, /目录回执保存失败/);
    assert.equal(calls.length, 0);
    assert.ok(!(await readdir(path.join(f.root, 'papers'))).some((name) => name.includes('后续目标')));
  } finally { store.save = save; }
});

test('终态保存失败回滚内存结果，下次GET可补齐唯一回执和成功提案移除', async (t) => {
  const f = await fixture(t);
  const release = f.gate();
  const calls = worker(f, undefined, release.promise);
  const chat = f.createChat([proposal(1)]);
  const submitted = await (await apply(f, chat, 'terminal-save-fails')).json() as ClassifySubmission;
  await until(() => calls.length === 1);
  const store = f.app.chats.store;
  const save = store.save.bind(store);
  let failures = 0;
  store.save = (chatId) => {
    if (chat.classifyRuns?.some(({ status }) => status === 'completed')) {
      failures++;
      throw Object.assign(new Error('合成终态保存失败。'), { code: 'ENOSPC' });
    }
    save(chatId);
  };
  try {
    release.resolve();
    await f.app.jobs.queue;
    assert.ok(failures > 0);
    assert.equal(f.app.jobs.getJob(submitted.job!.id)?.status, 'completed');
    assert.equal(runOf(chat, submitted.run.id).status, 'moving');
    assert.equal(chat.classifyProposals?.length, 1);
    assert.equal(chat.messages.length, 0);
  } finally { store.save = save; }
  const recovered = await f.getChat(chat.id);
  const run = runOf(recovered, submitted.run.id);
  assert.equal(run.status, 'completed');
  assert.deepEqual(recovered.classifyProposals, []);
  assert.equal(recovered.messages.filter(({ id }) => id === run.messageId).length, 1);
  assert.deepEqual(await f.getChat(chat.id), recovered);
  assert.equal(calls.length, 1);
});

test('补齐终态固定回执时保存失败也回滚，下次补查仍可可靠保存唯一回执', async (t) => {
  const f = await fixture(t);
  worker(f);
  const chat = f.createChat([proposal(1)]);
  const submitted = await (await apply(f, chat, 'missing-receipt-save')).json() as ClassifySubmission;
  await f.app.jobs.queue;
  const run = runOf(chat, submitted.run.id);
  chat.messages = [];
  const store = f.app.chats.store;
  store.save(chat.id);
  const before = await readFile(store.fileFor(chat.id));
  const revision = chat.classifyRevision;
  const save = store.save.bind(store);
  store.save = () => { throw new Error('合成补齐回执保存失败'); };
  try {
    const response = await fetch(`${f.base}/api/chats/${chat.id}`);
    assert.equal(response.status, 500);
    assert.deepEqual(chat.messages, []);
    assert.equal(chat.classifyRevision, revision);
    assert.deepEqual(await readFile(store.fileFor(chat.id)), before);
  } finally { store.save = save; }
  const recovered = await f.getChat(chat.id);
  assert.equal(recovered.messages.filter(({ id }) => id === run.messageId).length, 1);
  const persisted = JSON.parse(await readFile(store.fileFor(chat.id), 'utf8')) as ChatRecord;
  assert.equal(persisted.chat.messages[0]!.id, run.messageId);
  assert.deepEqual(await f.getChat(chat.id), recovered);
});

test('关闭等待中的目录准备时先等待收尾，不能提前终态或继续创建后续目标', { timeout: 10000 }, async (t) => {
  const f = await fixture(t);
  const entered = f.gate();
  const release = f.gate();
  const calls = worker(f);
  const create = f.app.library.createCategory.bind(f.app.library);
  const names: unknown[] = [];
  f.app.library.createCategory = async (name, parent) => {
    names.push(name);
    entered.resolve();
    await release.promise;
    return create(name, parent);
  };
  const chat = f.createChat([proposal(1, '首个目标'), proposal(2, '后续目标')]);
  const response = await apply(f, chat, 'close-prepare');
  assert.equal(response.status, 202);
  const submitted = await response.json() as ClassifySubmission;
  await entered.promise;
  let closed = false;
  const closing = f.app.jobs.close().then(() => { closed = true; });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(closed, false);
  assert.equal(runOf(f.app.chats.get(chat.id), submitted.run.id).status, 'preparing');
  assert.equal(f.app.chats.get(chat.id).messages.length, 0);
  release.resolve();
  await closing;
  const finished = await f.getChat(chat.id);
  const run = runOf(finished, submitted.run.id);
  assert.equal(run.status, 'interrupted');
  assert.equal(finished.classifyProposals?.length, 2);
  assert.equal(finished.messages.filter(({ id }) => id === run.messageId).length, 1);
  assert.deepEqual(names, ['首个目标']);
  assert.ok(!(await readdir(path.join(f.root, 'papers'))).some((name) => name.includes('后续目标')));
  assert.equal(calls.length, 0);
});
