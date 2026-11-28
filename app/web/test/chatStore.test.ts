import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ChatStore } from '../src/lib/chatStore.js';
import type { ChatRecord } from '../src/lib/chatStore.js';
import type { Chat } from '../src/lib/chatTypes.js';

const hash = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
const recordName = (id: string): string => `${hash(id)}.json`;
function directory(t: test.TestContext): string {
  const scratch = path.resolve('build/test-tmp');
  fs.mkdirSync(scratch, { recursive: true });
  const directory = fs.mkdtempSync(path.join(scratch, 'chat-store-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}
function chat(id: string, state: Chat['historyState'] = 'active'): Chat {
  const createdAt = '2026-11-27T00:00:00.000Z';
  const proposal = {
    id: `proposal-${id}`, paperId: 'L001', title: '完整中文题名', fromPath: 'papers/01_来源',
    targetCategory: '02_目标', targetPath: 'papers/02_目标', willCreateCategory: false,
    willCreateSubcategory: false, basis: 'notes+translation' as const, reason: '来自合成笔记和译文。', createdAt,
  };
  return {
    id, title: `会话 ${id}`, createdAt, provider: 'pi', historyState: state, paperIds: ['L001', 'L002'],
    threadId: 'synthetic-session.jsonl', lastContextOperationId: 'receipt-1',
    messages: [{ id: 'message-1', role: 'assistant', text: '回答正文', thinking: '完整推理', status: 'completed',
      createdAt, attachments: [{ id: 'upload-1', name: '合成附件.txt', mime: 'text/plain', size: 12 }] },
    { id: 'receipt-1', role: 'system', text: '固定归类回执', status: 'completed', createdAt }],
    noteDrafts: [{ id: 'draft-1', paperId: 'L001', paperIds: ['L001', 'L002'], target: 'outputs', title: '合成文稿',
      content: '# 全部草稿内容', source: 'papers/01_来源/L001.pdf', path: 'outputs/合成文稿.md', createdAt }],
    folderActions: [{ id: 'folder-1', kind: 'delete', category: '03_空目录', subcategory: '',
      path: 'papers/03_空目录', papers: 0, createdAt, error: '合成失败原因' }],
    classifyProposals: [proposal], classifyRevision: 7,
    classifyRuns: [{ id: 'run-1', requestId: 'request-1', proposalIds: [proposal.id], proposals: [proposal],
      jobId: 'job-1', status: 'failed', stage: '需要核实', revision: 7, createdFolders: ['papers/02_目标'],
      items: [{ proposalId: proposal.id, paperId: 'L001', category: proposal.targetPath, status: 'failed',
        error: '合成移动失败' }], messageId: 'receipt-1', repair: '.zhiyue/tmp/synthetic-repair.json',
      createdAt, updatedAt: createdAt }],
  };
}
function legacy(directory: string, chats: Chat[]): { file: string; source: Buffer } {
  const file = path.join(directory, 'chats.json');
  const source = Buffer.from(`${JSON.stringify({ chats }, null, 3)}\r\n`);
  fs.writeFileSync(file, source);
  return { file, source };
}
function backupFiles(directory: string): string[] {
  return fs.readdirSync(path.join(directory, 'chat-store-backups')).filter((file) => file.endsWith('.json'));
}
function all(store: ChatStore): Chat[] {
  return store.summaries().map(({ id }) => store.get(id)!);
}
function read(store: ChatStore, id: string): ChatRecord {
  return JSON.parse(fs.readFileSync(store.fileFor(id), 'utf8')) as ChatRecord;
}

test('迁移保留原始字节备份、全部会话字段和相同时间的原数组顺序，只留下新读取入口', (t) => {
  const root = directory(t);
  const chats = [chat('z-last-name', 'trashed'), chat('../中文/会话 ID', 'archived'), chat('a-first-name')];
  Object.assign(chats[0]!, { extraMetadata: { keep: ['未知扩展字段也保留', 123] } });
  const { file, source } = legacy(root, chats);
  const store = new ChatStore(root);
  assert.deepEqual(all(store), chats);
  assert.equal(fs.existsSync(file), false);
  assert.equal(fs.existsSync(path.join(root, 'chat-store-migration.json')), false);
  assert.equal(fs.existsSync(path.join(root, 'chat-store-migrating')), false);
  assert.deepEqual(fs.readdirSync(store.directory).sort(), chats.map(({ id }) => recordName(id)).sort());
  chats.forEach((chat, position) => assert.deepEqual(read(store, chat.id), { version: 1, position, chat }));
  const backups = backupFiles(root);
  assert.equal(backups.length, 1);
  const saved = path.join(root, 'chat-store-backups', backups[0]!);
  assert.deepEqual(fs.readFileSync(saved), source);
  assert.equal(fs.readFileSync(`${saved}.sha256`, 'utf8').trim(), hash(source));

  const readFile = fs.readFileSync;
  const reads: string[] = [];
  t.mock.method(fs, 'readFileSync', (...args: Parameters<typeof fs.readFileSync>) => {
    reads.push(String(args[0]));
    return readFile(...args);
  });
  assert.deepEqual(all(new ChatStore(root)), chats);
  assert.ok(reads.every((name) => path.dirname(name) === store.directory), '迁移完成后只读取正式记录');
});

test('新空库与旧空数组均可初始化，空数组迁移仍保留字节备份', (t) => {
  const fresh = new ChatStore(directory(t));
  assert.deepEqual(fresh.summaries(), []);
  assert.deepEqual(fs.readdirSync(fresh.directory), []);
  const root = directory(t);
  const { file } = legacy(root, []);
  assert.deepEqual(new ChatStore(root).summaries(), []);
  assert.equal(fs.existsSync(file), false);
  assert.equal(backupFiles(root).length, 1);
});

test('较早的会话可缺省后来新增的草稿与归类字段，迁移不擅自补写内容', (t) => {
  const root = directory(t);
  const item: Partial<Chat> = chat('older-chat');
  delete item.noteDrafts;
  delete item.folderActions;
  delete item.classifyProposals;
  delete item.classifyRuns;
  delete item.classifyRevision;
  legacy(root, [item as Chat]);
  assert.deepEqual(all(new ChatStore(root)), [item]);
});

test('只序列化和替换指定会话，其余大历史记录的字节及修改时间保持不变', (t) => {
  const root = directory(t);
  const store = new ChatStore(root);
  const first = chat('first');
  const other = chat('other');
  other.messages[0]!.text = '大段合成历史。'.repeat(10000);
  store.create(first);
  store.create(other);
  const before = fs.readFileSync(store.fileFor(other.id));
  const modified = fs.statSync(store.fileFor(other.id), { bigint: true }).mtimeNs;
  Object.defineProperty(other, 'toJSON', { value: () => { throw new Error('不应序列化其他会话'); } });
  first.messages[0]!.text = '只更新第一篇会话';
  store.save(first.id);
  assert.equal(read(store, first.id).chat.messages[0]!.text, '只更新第一篇会话');
  assert.deepEqual(fs.readFileSync(store.fileFor(other.id)), before);
  assert.equal(fs.statSync(store.fileFor(other.id), { bigint: true }).mtimeNs, modified);
  assert.deepEqual(new ChatStore(root).summaries().map(({ id }) => id), ['first', 'other']);
  assert.throws(() => store.save('missing'), /不存在的会话/);
});

test('单篇写入或rename失败保持原记录并清理临时文件，后续保存可重试', async (t) => {
  for (const operation of ['write', 'rename']) await t.test(operation, (t) => {
    const store = new ChatStore(directory(t));
    const item = chat('one');
    store.create(item);
    const before = fs.readFileSync(store.fileFor(item.id));
    const rename = fs.renameSync;
    const write = fs.writeFileSync;
    const intercept = operation === 'rename'
      ? t.mock.method(fs, 'renameSync', (...args: Parameters<typeof fs.renameSync>) => {
        if (String(args[1]) === store.fileFor(item.id)) throw new Error('合成 rename 失败');
        return rename(...args);
      })
      : t.mock.method(fs, 'writeFileSync', (...args: Parameters<typeof fs.writeFileSync>) => {
        if (String(args[0]).startsWith(store.fileFor(item.id))) throw new Error('合成 write 失败');
        return write(...args);
      });
    item.title = '失败时的新标题';
    assert.throws(() => store.save(item.id), /合成 .* 失败/);
    assert.deepEqual(fs.readFileSync(store.fileFor(item.id)), before);
    assert.deepEqual(fs.readdirSync(store.directory), [recordName(item.id)]);
    intercept.mock.restore();
    store.save(item.id);
    assert.equal(new ChatStore(path.dirname(store.directory)).get(item.id)!.title, item.title);
  });
});

test('迁移在暂存、标记、目录发布及清理阶段中断后均能按原始内容恢复', async (t) => {
  const phases = ['partial-stage', 'marker', 'publish', 'remove-old', 'remove-marker'];
  for (const phase of phases) await t.test(phase, (t) => {
    const root = directory(t);
    const chats = [chat('one'), chat('two', 'archived')];
    const { file, source } = legacy(root, chats);
    const staging = path.join(root, 'chat-store-migrating');
    const published = path.join(root, 'chats');
    const marker = path.join(root, 'chat-store-migration.json');
    const rename = fs.renameSync;
    const unlink = fs.unlinkSync;
    let stopped = false;
    const stop = (): never => { stopped = true; throw new Error(`迁移断点：${phase}`); };
    const renameMock = t.mock.method(fs, 'renameSync', (...args: Parameters<typeof fs.renameSync>) => {
      const destination = String(args[1]);
      if (!stopped && (phase === 'partial-stage' && destination === path.join(staging, recordName('two')) ||
        phase === 'marker' && destination === marker || phase === 'publish' && destination === published)) stop();
      return rename(...args);
    });
    const unlinkMock = t.mock.method(fs, 'unlinkSync', (...args: Parameters<typeof fs.unlinkSync>) => {
      if (!stopped && (phase === 'remove-old' && String(args[0]) === file ||
        phase === 'remove-marker' && String(args[0]) === marker)) stop();
      return unlink(...args);
    });
    assert.throws(() => new ChatStore(root), /迁移断点/);
    assert.equal(stopped, true);
    renameMock.mock.restore();
    unlinkMock.mock.restore();
    if (phase !== 'remove-marker') assert.deepEqual(fs.readFileSync(file), source);
    assert.ok(backupFiles(root).length >= 1);
    const store = new ChatStore(root);
    assert.deepEqual(all(store), chats);
    assert.equal(fs.existsSync(file), false);
    assert.equal(fs.existsSync(marker), false);
    assert.equal(fs.existsSync(staging), false);
    assert.deepEqual(all(new ChatStore(root)), chats);
  });
});

function publishedMigration(t: test.TestContext): { root: string; file: string; source: Buffer; marker: string } {
  const root = directory(t);
  const { file, source } = legacy(root, [chat('one'), chat('two')]);
  const unlink = fs.unlinkSync;
  const mock = t.mock.method(fs, 'unlinkSync', (...args: Parameters<typeof fs.unlinkSync>) => {
    if (String(args[0]) === file) throw new Error('在清理旧文件前中断');
    return unlink(...args);
  });
  assert.throws(() => new ChatStore(root), /清理旧文件前中断/);
  mock.mock.restore();
  return { root, file, source, marker: path.join(root, 'chat-store-migration.json') };
}

test('正式目录发布后内容、旧文件、标记或备份不一致时停止恢复并保留证据', async (t) => {
  const changes = ['record', 'source', 'marker-version', 'backup', 'backup-hash'];
  for (const change of changes) await t.test(change, (t) => {
    const { root, file, marker } = publishedMigration(t);
    const metadata = JSON.parse(fs.readFileSync(marker, 'utf8')) as { version: number; backup: string };
    if (change === 'record') fs.appendFileSync(path.join(root, 'chats', recordName('one')), '\n');
    if (change === 'source') fs.appendFileSync(file, '\n');
    if (change === 'marker-version') fs.writeFileSync(marker, JSON.stringify({ ...metadata, version: 2 }));
    const backup = path.join(root, 'chat-store-backups', metadata.backup);
    if (change === 'backup') fs.appendFileSync(backup, '\n');
    if (change === 'backup-hash') fs.writeFileSync(`${backup}.sha256`, `${'0'.repeat(64)}\n`);
    const original = fs.readFileSync(file);
    assert.throws(() => new ChatStore(root), /失败|不一致|不受支持/);
    assert.deepEqual(fs.readFileSync(file), original);
    assert.equal(fs.existsSync(marker), true);
    assert.equal(fs.existsSync(backup), true);
  });
});

test('损坏或重复的旧会话先备份后报错，不删除原文件或初始化为空记录', async (t) => {
  const invalid = [
    '{broken', JSON.stringify({ chats: [chat('same'), chat('same')] }), JSON.stringify({ chats: {} }),
    JSON.stringify({ chats: [{ ...chat('bad'), messages: [{ text: 123 }] }] }),
    JSON.stringify({ chats: [{ ...chat('bad'), noteDrafts: '损坏的草稿字段' }] }),
  ];
  for (const source of invalid) await t.test(source.slice(0, 30), (t) => {
    const root = directory(t);
    const file = path.join(root, 'chats.json');
    fs.writeFileSync(file, source);
    assert.throws(() => new ChatStore(root), /聊天|会话/);
    assert.equal(fs.readFileSync(file, 'utf8'), source);
    assert.equal(fs.existsSync(path.join(root, 'chats')), false);
    assert.equal(backupFiles(root).length, 1);
    assert.equal(fs.readFileSync(path.join(root, 'chat-store-backups', backupFiles(root)[0]!), 'utf8'), source);
  });
});

test('正式记录版本、内容、编号或位置损坏时拒绝加载，不转换成空聊天', async (t) => {
  const mutations: Array<[string, (record: ChatRecord) => void]> = [
    ['版本不一致', (record) => { Object.assign(record, { version: 2 }); }],
    ['编号不匹配', (record) => { record.chat.id = 'other-id'; }],
    ['位置重复', (record) => { record.position = 0; }],
    ['消息损坏', (record) => { Object.assign(record.chat, { messages: null }); }],
  ];
  for (const [label, mutate] of mutations) await t.test(label, (t) => {
    const root = directory(t);
    const store = new ChatStore(root);
    store.create(chat('one'));
    store.create(chat('two'));
    const record = read(store, 'two');
    mutate(record);
    const content = JSON.stringify(record);
    fs.writeFileSync(store.fileFor('two'), content);
    assert.throws(() => new ChatStore(root), /失败|不一致|重复/);
    assert.equal(fs.readFileSync(store.fileFor('two'), 'utf8'), content);
  });
});

test('孤立暂存目录和没有迁移标记的新旧并存状态明确报错，不猜测数据来源', (t) => {
  const missing = directory(t);
  fs.mkdirSync(path.join(missing, 'chat-store-migrating'));
  fs.writeFileSync(path.join(missing, 'chat-store-migrating', 'partial'), '保留现场');
  assert.throws(() => new ChatStore(missing), /旧聊天文件缺失/);
  assert.equal(fs.existsSync(path.join(missing, 'chats')), false);
  const ambiguous = directory(t);
  new ChatStore(ambiguous);
  const { source, file } = legacy(ambiguous, [chat('old')]);
  assert.throws(() => new ChatStore(ambiguous), /缺少迁移标记/);
  assert.deepEqual(fs.readFileSync(file), source);
});

test('列表预览有界且不加载正文，按最近访问淘汰，淘汰后能恢复完整记录', (t) => {
  const root = directory(t);
  const seed = new ChatStore(root);
  for (let i = 0; i < 9; i++) {
    const item = chat(String(i));
    item.messages.at(-1)!.text = '长'.repeat(159) + '😀后半段'.repeat(1000);
    item.messages.at(-1)!.thinking = '完整思考';
    seed.create(item);
  }
  const store = new ChatStore(root);
  const reads = t.mock.method(fs, 'readFileSync');
  const summaries = store.summaries();
  assert.equal(store.residentCount, 0);
  assert.equal(reads.mock.callCount(), 0);
  assert.equal(summaries[0]!.messages[0]!.text, '长'.repeat(159));
  assert.equal('thinking' in summaries[0]!.messages[0]!, false);
  assert.equal('noteDrafts' in summaries[0]!, false);
  const first = store.get('0');
  const second = store.get('1');
  store.get('2'); store.get('3');
  assert.equal(store.get('0'), first);
  store.get('4');
  assert.equal(store.residentCount, 4);
  assert.equal(store.get('0'), first);
  const reloaded = store.get('1');
  assert.notEqual(reloaded, second);
  assert.deepEqual(reloaded, second);
  assert.equal(store.residentCount, 4);
});

test('多重持有与写入失败都能跨越淘汰压力，成功提交后才发布摘要并允许重载', (t) => {
  const store = new ChatStore(directory(t), 1);
  const first = chat('1');
  store.create(first);
  const pressure = () => { for (let i = 2; i < 5; i++) store.get(String(i)); };
  const release = store.pin(first.id);
  const otherRelease = store.pin(first.id);
  for (let i = 2; i < 5; i++) store.create(chat(String(i)));
  release();
  pressure();
  assert.equal(store.get(first.id), first);
  const previous = store.summaries()[0]!.title;
  first.title = '等待重试';
  const rename = t.mock.method(fs, 'renameSync', () => { throw new Error('模拟磁盘已满'); });
  assert.throws(() => store.save(first.id), /磁盘已满/);
  otherRelease();
  pressure();
  assert.equal(store.get(first.id), first);
  assert.equal(store.summaries()[0]!.title, previous);
  rename.mock.restore();
  store.save(first.id);
  pressure();
  assert.equal(store.residentCount, 1);
  assert.notEqual(store.get(first.id), first);
  assert.equal(store.get(first.id)?.title, first.title);
});

test('合成百篇会话测量启动、列表与轮流打开后的常驻堆', { skip: !global.gc }, (t) => {
  const root = directory(t);
  const records = path.join(root, 'chats');
  fs.mkdirSync(records);
  const count = 100;
  function seed(): void {
    for (let i = 0; i < count; i++) {
      const id = `synthetic-chat-step-five-${i}`;
      const item = chat(id);
      item.messages = [{ ...item.messages[0]!, text: '合成大段历史。'.repeat(5000), thinking: '合成思考。'.repeat(5000) }];
      fs.writeFileSync(path.join(records, recordName(id)), JSON.stringify({ version: 1, position: i, chat: item }));
    }
  }
  const heap = () => { global.gc!(); global.gc!(); return process.memoryUsage().heapUsed; };
  seed();
  const base = heap();
  const store = new ChatStore(root);
  const startup = heap() - base;
  assert.equal(store.summaries().length, count);
  assert.equal(store.residentCount, 0);
  const list = heap() - base;
  for (let i = 0; i < count; i++) store.get(`synthetic-chat-step-five-${i}`);
  const opened = heap() - base;
  assert.equal(store.residentCount, 4);
  t.diagnostic(`合成会话 ${count} 篇，强制 GC 后堆增量（字节）：启动 ${startup}，列表 ${list}，轮流打开 ${opened}`);
});

test('重启丢弃未发布的单篇临时文件，继续读取已原子提交的完整记录', (t) => {
  const root = directory(t);
  const store = new ChatStore(root);
  store.create(chat('one'));
  const temp = `${store.fileFor('one')}.00000000-0000-0000-0000-000000000000.writing`;
  fs.writeFileSync(temp, '{unfinished');
  assert.deepEqual(all(new ChatStore(root)), all(store));
  assert.equal(fs.existsSync(temp), false);
});
