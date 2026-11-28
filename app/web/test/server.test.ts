import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { createApp, checkRequest } from '../src/server.js';
import { downloaderScript, resolvePython } from '../src/lib/python.js';
import type { Chat, ChatClassifyProposal, ChatFolderAction } from '../src/lib/chat.js';

// 服务端返回的 JSON 只在这里按用到的字段声明结构，读取后立即断言。
interface LibraryResponse {
  papers: Array<{ readStatus: string }>;
  categories: Array<{ id: string }>;
}

interface CategoryResponse {
  category: string;
  subcategory?: string;
  trashed?: string;
}

interface UploadResponse {
  id: string;
  name: string;
  path?: string;
}

interface NoteDraftResponse {
  path: string;
}

interface NoteDeleteResponse {
  trashed: string;
  library: { papers: Array<{ notes: Array<{ path: string }> }>; stats: { withNotes: number } };
}

interface ErrorResponse {
  error: string;
}

interface ChatResponse {
  id: string;
}

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T;

test('编译产物定位 app/downloader 与项目虚拟环境', () => {
  assert.ok(existsSync(downloaderScript), downloaderScript);
  assert.match(downloaderScript, /app[\\/]downloader[\\/]run\.py$/);
  assert.equal(typeof resolvePython(), 'string');
});

test('界面状态接口读写 ui.json，并拒绝脏值', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'literature-ui-'));
  await fs.mkdir(path.join(root, '.zhiyue/catalog'), { recursive: true });
  const stateDir = path.join(root, '.zhiyue/data');
  const app = await createApp({ root, stateDir, connectPi: false });
  await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', () => resolve()));
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  let restarted: Awaited<ReturnType<typeof createApp>> | undefined;
  // 先关两个服务再删目录：close() 内部还会写 jobs.json，目录提前消失会让日志写出 ENOENT。
  t.after(async () => {
    if (restarted) await restarted.close();
    await app.close();
    await fs.rm(root, { recursive: true, force: true });
  });
  const file = path.join(stateDir, 'ui.json');
  const patch = (body: unknown) => fetch(base + '/api/ui', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  type UiResponse = { chatId: string | null; paperId: string | null; panelWidths: Record<string, number> };
  const read = async (): Promise<UiResponse> => readJson<UiResponse>(await fetch(base + '/api/ui'));

  // 初始为空，不凭端口或浏览器存储推断。
  assert.deepEqual(await read(), { chatId: null, paperId: null, panelWidths: {} });
  let response = await patch({ chatId: 'chat-1', paperId: 'L001', panelWidths: { sidebar: 240 } });
  assert.equal(response.status, 200);
  assert.deepEqual(await read(), { chatId: 'chat-1', paperId: 'L001', panelWidths: { sidebar: 240 } });
  // 部分更新保留未提供的字段，与 reading.json 的 PATCH 语义一致。
  response = await patch({ panelWidths: { papers: 300 } });
  assert.equal(response.status, 200);
  assert.deepEqual(await read(), {
    chatId: 'chat-1', paperId: 'L001', panelWidths: { sidebar: 240, papers: 300 },
  });
  const saved = JSON.parse(await fs.readFile(file, 'utf8')) as Record<string, unknown>;
  assert.equal(saved.paperId, 'L001');

  // 非法编号、超长会话号、越界栏宽与未知字段一律 400，且不改变文件。
  for (const body of [
    { paperId: 'X1' }, { chatId: 'ch at' }, { panelWidths: { sidebar: 50 } },
    { panelWidths: { wrong: 200 } }, { unknown: 1 }, {},
  ]) {
    response = await patch(body);
    assert.equal(response.status, 400, JSON.stringify(body));
  }
  assert.deepEqual(await read(), {
    chatId: 'chat-1', paperId: 'L001', panelWidths: { sidebar: 240, papers: 300 },
  });

  // 清空也是合法请求：null 表示不恢复任何会话或文献。
  response = await patch({ chatId: null, paperId: null });
  assert.equal(response.status, 200);
  assert.equal((await read()).paperId, null);

  // 重建服务（等价于重启）后仍能读回，证明它落在文献库里而不是浏览器 origin 里。
  await app.close();
  restarted = await createApp({ root, stateDir, connectPi: false });
  await new Promise<void>((resolve) => restarted.server.listen(0, '127.0.0.1', () => resolve()));
  const again = restarted.server.address();
  assert.ok(again && typeof again === 'object');
  const reread = await readJson<{ panelWidths: Record<string, number> }>(
    await fetch(`http://127.0.0.1:${again.port}/api/ui`),
  );
  assert.deepEqual(reread.panelWidths, { sidebar: 240, papers: 300 });
});

test('会话归档和回收站状态跨重启保留，恢复后仍有原来的消息和上下文', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'literature-chat-history-'));
  const apps: Awaited<ReturnType<typeof createApp>>[] = [];
  t.after(async () => {
    for (const app of apps) await app.close();
    await fs.rm(root, { recursive: true, force: true });
  });
  const launch = async () => {
    const app = await createApp({ root, connectPi: false });
    apps.push(app);
    await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve));
    const address = app.server.address();
    assert.ok(address && typeof address === 'object');
    const call = (route: string, method = 'GET', body?: unknown) => fetch(
      `http://127.0.0.1:${address.port}/api/chats${route}`,
      body === undefined ? { method } : { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } },
    );
    return { app, call };
  };

  const first = await launch();
  const chat = await readJson<Chat>(await first.call('', 'POST', { title: '原会话', paperIds: ['L001'] }));
  const route = '/' + chat.id;
  const reply = await first.call(route + '/commands', 'POST', { text: '/help' });
  assert.equal(reply.status, 202);
  assert.equal((await first.call(route, 'PATCH', { historyState: 'invalid' })).status, 400);
  assert.equal((await first.call(route, 'PATCH', { historyState: 'archived' })).status, 200);
  assert.equal((await readJson<Chat>(await first.call(route))).historyState, 'archived');
  assert.equal((await first.call(route + '/commands', 'POST', { text: '/help' })).status, 409);
  assert.equal((await first.call(route + '/messages', 'POST', { text: '继续讨论' })).status, 409);
  assert.equal((await first.call(route, 'DELETE', {})).status, 200);
  assert.equal((await first.call(route)).status, 404);
  await first.app.close();
  apps.shift();

  const second = await launch();
  const history = await readJson<Chat[]>(await second.call(''));
  assert.equal(history[0]?.historyState, 'trashed');
  assert.deepEqual(history[0]?.messages, []);
  assert.equal((await second.call(route, 'PATCH', { historyState: 'active' })).status, 200);
  const restored = await readJson<Chat>(await second.call(route));
  assert.deepEqual(restored.paperIds, ['L001']);
  assert.match(restored.messages[0]?.text ?? '', /斜杠命令/);
});

test('两个实例交错写 ui.json 不丢字段', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'literature-ui-race-'));
  await fs.mkdir(path.join(root, '.zhiyue/catalog'), { recursive: true });
  const stateDir = path.join(root, '.zhiyue/data');
  const first = await createApp({ root, stateDir, connectPi: false });
  const second = await createApp({ root, stateDir, connectPi: false });
  await Promise.all([first, second].map((app) => new Promise<void>((resolve) => {
    app.server.listen(0, '127.0.0.1', () => resolve());
  })));
  t.after(async () => {
    await second.close();
    await first.close();
    await fs.rm(root, { recursive: true, force: true });
  });
  const port = (app: typeof first): number => {
    const address = app.server.address();
    assert.ok(address && typeof address === 'object');
    return address.port;
  };
  const patch = (app: typeof first, body: unknown) => fetch(`http://127.0.0.1:${port(app)}/api/ui`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });

  // 每个实例只改自己的字段：后写的一方必须先重读磁盘，否则会把对方的写入覆盖掉。
  assert.equal((await patch(first, { paperId: 'L028' })).status, 200);
  assert.equal((await patch(second, { panelWidths: { sidebar: 240 } })).status, 200);
  assert.equal((await patch(first, { chatId: 'chat-1' })).status, 200);
  const saved = JSON.parse(await fs.readFile(path.join(stateDir, 'ui.json'), 'utf8')) as {
    chatId: string | null; paperId: string | null; panelWidths: Record<string, number>;
  };
  assert.equal(saved.paperId, 'L028');
  assert.equal(saved.chatId, 'chat-1');
  assert.equal(saved.panelWidths.sidebar, 240);
  // 两个实例的 GET 都按磁盘最新值回答。
  for (const app of [first, second]) {
    const data = await readJson<{ paperId: string | null }>(await fetch(`http://127.0.0.1:${port(app)}/api/ui`));
    assert.equal(data.paperId, 'L028');
  }
});

test('本地HTTP服务提供目录、PDF范围读取和上传，拒绝跨站与越界资料', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'literature-http-'));
  await fs.mkdir(path.join(root, '.zhiyue/catalog'), { recursive: true });
  await fs.mkdir(path.join(root, 'papers'));
  await fs.writeFile(path.join(root, 'papers', '论文.pdf'), '%PDF-1.4\nexample-bytes');
  await fs.writeFile(path.join(root, '.zhiyue/catalog', '文献索引.json'), JSON.stringify({
    records: [{
      literature_id: 'L001', title: '测试论文', authors: ['作者'], year: 2001, file: 'papers/论文.pdf', versions: [],
    }],
  }));
  // 分类改名由归档工具完成；测试只验证 HTTP 路由和参数传递。
  const categoryCli = async (args: string[]): Promise<{
    category: string; subcategory: string; trashed?: string;
  }> => {
    if (args[0] !== 'rename-category' && args[0] !== 'delete-category') {
      throw new Error('unexpected category command');
    }
    const category = args[args.indexOf('--category') + 1];
    const subcategory = args.includes('--subcategory') ? args[args.indexOf('--subcategory') + 1] : '';
    const target = path.join(root, 'papers', category, ...(subcategory ? [subcategory] : []));
    if (args[0] === 'delete-category') {
      await fs.rmdir(target);
      return { category, subcategory, trashed: '.zhiyue/trash/categories/x_空目录' };
    }
    const name = args[args.indexOf('--name') + 1];
    const folder = `${category.match(/^\d+_/)?.[0] ?? ''}${name}`;
    await fs.rename(path.join(root, 'papers', category), path.join(root, 'papers', folder));
    return { category: folder, subcategory: '' };
  };
  const app = await createApp({ root, stateDir: path.join(root, '.zhiyue/data'), connectPi: false, categoryCli });
  await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', () => resolve()));
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  t.after(async () => { await app.close(); await fs.rm(root, { recursive: true, force: true }); });
  const index = await fetch(base + '/');
  assert.equal(index.status, 200); assert.match(await index.text(), /id="app"/);
  for (const route of ['/js/app.js']) {
    const script = await fetch(base + route);
    assert.equal(script.status, 200); assert.match(String(script.headers.get('content-type')), /javascript/);
    const source = await script.text();
    assert.match(source, /mountWorkspace/); assert.doesNotMatch(source, /process\.env|new Function\(/);
  }
  assert.equal((await fetch(base + '/dist/../frontend/main.js')).status, 404);
  let response = await fetch(base + '/api/library');
  assert.equal(response.status, 200);
  assert.equal((await readJson<LibraryResponse>(response)).papers[0].readStatus, 'unread');
  const postCategory = (route: string, body: unknown) => fetch(base + route, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  response = await postCategory('/api/categories', { name: '新分类' });
  assert.equal(response.status, 201); assert.equal((await readJson<CategoryResponse>(response)).category, '01_新分类');
  assert.ok((await fs.stat(path.join(root, 'papers/01_新分类'))).isDirectory());
  response = await postCategory('/api/categories', { name: '新分类' });
  assert.equal(response.status, 409);
  response = await postCategory('/api/categories/rename', { category: '01_新分类', subcategory: '', name: '改名分类' });
  assert.equal(response.status, 200); assert.equal((await readJson<CategoryResponse>(response)).category, '01_改名分类');
  const libraryAfterRename = await readJson<LibraryResponse>(await fetch(base + '/api/library'));
  assert.ok(libraryAfterRename.categories.some((category) => category.id === '01_改名分类'));
  response = await postCategory('/api/categories', { name: '子分类', parent: '01_改名分类' });
  assert.equal(response.status, 201);
  const childCategory = await readJson<CategoryResponse>(response);
  assert.equal(childCategory.category, '01_改名分类');
  assert.equal(childCategory.subcategory, '01_子分类');
  assert.ok((await fs.stat(path.join(root, 'papers/01_改名分类/01_子分类'))).isDirectory());
  response = await postCategory('/api/categories', { name: '子分类2', parent: '不存在' });
  assert.equal(response.status, 404);
  response = await postCategory('/api/categories/delete', {
    category: '01_改名分类', subcategory: '01_子分类',
  });
  assert.equal(response.status, 200);
  assert.equal((await readJson<CategoryResponse>(response)).trashed, '.zhiyue/trash/categories/x_空目录');
  await assert.rejects(fs.stat(path.join(root, 'papers/01_改名分类/01_子分类')), /ENOENT/);
  response = await fetch(base + '/api/file?path=' + encodeURIComponent('papers/论文.pdf'),
    { headers: { Range: 'bytes=0-3' } });
  assert.equal(response.status, 206); assert.equal(await response.text(), '%PDF');
  assert.match(String(response.headers.get('content-range')), /^bytes 0-3\//);
  response = await fetch(base + '/api/file?path=' + encodeURIComponent('papers/../.zhiyue/catalog/文献索引.json'));
  assert.equal(response.status, 403);
  response = await fetch(base + '/api/chats', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: '{}',
  });
  assert.equal(response.status, 403);
  response = await fetch(base + '/api/chats', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '问题' }),
  });
  assert.equal(response.status, 201);
  const chat = await readJson<ChatResponse>(response);
  // 命令通道必须带上选中文献：早前该路由只取 text，技能回合因而看到空列表。
  response = await fetch(`${base}/api/chats/${chat.id}/commands`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: '/skills', paperIds: ['L001', 'x9', 'L002'], activePaperId: 'L001', pdfPage: 2 }),
  });
  assert.equal(response.status, 202);
  // 非法编号被过滤，会话记录记下服务端实际接受的范围。
  assert.deepEqual(app.chats.get(chat.id).paperIds, ['L001', 'L002']);
  const paper = await app.library.getPaper('L001');
  assert.ok(paper);
  const draft = app.chats.createNoteDraft(chat.id, { paper, title: '测试笔记', content: '## 要点\n\n内容' });
  response = await fetch(`${base}/api/note-drafts/${draft.id}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save' }),
  });
  assert.equal(response.status, 200);
  assert.equal((await readJson<NoteDraftResponse>(response)).path, 'notes/L001_测试笔记.md');
  assert.match(await fs.readFile(path.join(root, 'notes', 'L001_测试笔记.md'), 'utf8'), /## 要点/);
  // 删除笔记走 POST /api/notes/delete：文件移到 .zhiyue/trash/notes，响应带回新索引。
  response = await fetch(base + '/api/notes/delete', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: 'notes/L001_测试笔记.md' }),
  });
  assert.equal(response.status, 200);
  const removed = await readJson<NoteDeleteResponse>(response);
  assert.match(removed.trashed, /^\.zhiyue\/trash\/notes\/[^/]+_L001_测试笔记\.md$/);
  assert.equal(removed.library.papers[0]?.notes.length, 0);
  assert.equal(removed.library.stats.withNotes, 0);
  // 文件已移走，再读同一路径只剩 ENOENT，删除也不再成功。
  assert.equal((await fetch(base + '/api/text?path=' + encodeURIComponent('notes/L001_测试笔记.md'))).status, 404);
  response = await fetch(base + '/api/notes/delete', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: 'notes/L001_测试笔记.md' }),
  });
  assert.equal(response.status, 404);
  response = await fetch(base + '/api/notes/delete', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: 'papers/论文.pdf' }),
  });
  assert.equal(response.status, 400);
  response = await fetch(base + '/api/note-drafts/missing', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save' }),
  });
  assert.equal(response.status, 404);
  // 文件夹删除：只有待确认卡片存在时才可应用，路由透传 Python 结果并清空卡片。
  app.chats.get(chat.id).folderActions = [{
    id: 'folder-1', kind: 'delete', category: '01_改名分类', subcategory: '',
    path: 'papers/01_改名分类', papers: 0, createdAt: new Date().toISOString(),
  } satisfies ChatFolderAction];
  const decideFolders = (ids: string[], id = chat.id) => fetch(`${base}/api/chats/${id}/folder-actions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'apply', ids }),
  });
  const other = app.chats.create();
  assert.equal((await decideFolders(['folder-1'], other.id)).status, 404);
  assert.equal((await decideFolders(['folder-1', 'missing'])).status, 404);
  assert.equal(app.chats.get(chat.id).folderActions?.length, 1);
  response = await decideFolders(['folder-1', 'folder-1']);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json() as { applied: string[] }).applied, ['folder-1']);
  assert.deepEqual(app.chats.get(chat.id).folderActions, []);
  assert.equal((await decideFolders(['folder-1'])).status, 404);
  const filename = encodeURIComponent('附件.txt');
  response = await fetch(base + '/api/uploads', {
    method: 'POST', headers: { 'X-Filename': filename, 'Content-Type': 'application/octet-stream' }, body: '待解释的文字',
  });
  assert.equal(response.status, 201);
  const attachment = await readJson<UploadResponse>(response);
  assert.equal(attachment.name, '附件.txt'); assert.equal(attachment.path, undefined);
  response = await fetch(base + '/api/uploads/' + attachment.id);
  assert.equal(await response.text(), '待解释的文字');
  response = await fetch(base + '/api/uploads', {
    method: 'POST', headers: { 'X-Filename': 'fake.png', 'Content-Type': 'application/octet-stream' },
    body: '<script>attack</script>',
  });
  assert.equal(response.status, 400);
  response = await fetch(base + '/api/uploads', {
    method: 'POST', headers: { 'X-Filename': 'test.html', 'Content-Type': 'application/octet-stream' }, body: 'html',
  });
  assert.equal(response.status, 415);
  const postJson = (route: string, body: unknown) => fetch(base + route, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  response = await postJson('/api/library/import', { uploads: [{ uploadId: attachment.id, title: '文本附件' }] });
  assert.equal(response.status, 415);
  response = await postJson('/api/library/import', {});
  assert.equal(response.status, 400);
  const pdfBody = '%PDF-1.4\nduplicate-import';
  response = await fetch(base + '/api/uploads', {
    method: 'POST', headers: { 'X-Filename': 'import.pdf', 'Content-Type': 'application/pdf' }, body: pdfBody,
  });
  assert.equal(response.status, 201);
  const pdfUpload = await readJson<UploadResponse>(response);
  response = await postJson('/api/library/import', { uploads: [{ uploadId: pdfUpload.id }] });
  assert.equal(response.status, 400);
  assert.match((await readJson<ErrorResponse>(response)).error, /题名/);
  response = await postJson('/api/library/import', { uploads: [{}] });
  assert.equal(response.status, 400);
  response = await postJson('/api/library/import', {
    uploads: Array.from({ length: 101 }, () => ({ uploadId: pdfUpload.id, title: 'x' })),
  });
  assert.equal(response.status, 400);
  assert.match((await readJson<ErrorResponse>(response)).error, /100/);
  const pdfHash = createHash('sha256').update(pdfBody).digest('hex');
  await fs.writeFile(path.join(root, '.zhiyue/catalog', '文献索引.json'), JSON.stringify({
    records: [{
      literature_id: 'L001', title: '测试论文', authors: ['作者'], year: 2001, file: 'papers/论文.pdf', versions: [],
      sha256: pdfHash, file_exists: true,
    }],
  }));
  response = await fetch(base + '/api/uploads', {
    method: 'POST', headers: { 'X-Filename': 'import-copy.pdf', 'Content-Type': 'application/pdf' }, body: pdfBody,
  });
  assert.equal(response.status, 201);
  const pdfCopy = await readJson<UploadResponse>(response);
  response = await postJson('/api/library/import', {
    uploads: [{ uploadId: pdfUpload.id, title: '重复导入' }, { uploadId: pdfCopy.id, title: '重复副本' }],
  });
  assert.equal(response.status, 409);
  assert.match((await readJson<ErrorResponse>(response)).error, /L001/);
  response = await fetch(base + '/api/downloads/action', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch: '../x', action: 'delete' }),
  });
  assert.equal(response.status, 400);
  const foreignRequest = { headers: { host: 'evil.example' }, method: 'GET', url: '/api/library' };
  assert.throws(() => checkRequest(foreignRequest as unknown as IncomingMessage), /本机/);
});

test('拖动移动文献的路由校验参数并委托 move-paper', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'literature-move-'));
  await fs.mkdir(path.join(root, 'papers/08_SER'), { recursive: true });
  await fs.mkdir(path.join(root, 'papers/09_目标'), { recursive: true });
  await fs.writeFile(path.join(root, 'papers/08_SER/paper.pdf'), '%PDF-1.4\nmove-me');
  await fs.mkdir(path.join(root, '.zhiyue/catalog'), { recursive: true });
  await fs.writeFile(path.join(root, '.zhiyue/catalog/文献索引.json'), JSON.stringify({
    records: [{ literature_id: 'L001', title: '待移动', authors: [], file: 'papers/08_SER/paper.pdf', versions: [] }],
  }));
  const calls: string[][] = [];
  const categoryCli = async (args: string[]): Promise<unknown> => {
    if (args[0] !== 'move-paper') throw new Error('unexpected category command');
    calls.push(args);
    const target = args[args.indexOf('--category') + 1] as string;
    await fs.rename(
      path.join(root, 'papers/08_SER/paper.pdf'),
      path.join(root, ...target.split('/'), 'paper.pdf'),
    );
    return { literature_id: 'L001', from: 'papers/08_SER', to: target, moved: [] };
  };
  const app = await createApp({ root, stateDir: path.join(root, '.zhiyue/data'), connectPi: false, categoryCli });
  await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', () => resolve()));
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  t.after(async () => { await app.close(); await fs.rm(root, { recursive: true, force: true }); });
  const move = (body: unknown) => fetch(base + '/api/papers/L001/move', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  assert.equal((await move({})).status, 400);
  assert.equal((await move({ category: 'a/b' })).status, 400);
  assert.equal(calls.length, 0);
  assert.equal((await move({ category: '99_不存在' })).status, 404);
  assert.equal(calls.length, 0);
  const accepted = await move({ category: '09_目标' });
  assert.equal(accepted.status, 200);
  assert.deepEqual(calls[0]?.slice(0, 5), ['move-paper', '--literature-id', 'L001', '--category', 'papers/09_目标']);
  assert.equal(await fs.readFile(path.join(root, 'papers/09_目标/paper.pdf'), 'utf8'), '%PDF-1.4\nmove-me');
  assert.equal(existsSync(path.join(root, 'papers/08_SER/paper.pdf')), false);
});

test('归类提案路由透传确认与取消，并校验动作和编号', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'literature-classify-'));
  await fs.mkdir(path.join(root, 'papers/01_综述'), { recursive: true });
  await fs.mkdir(path.join(root, 'papers/02_方法'), { recursive: true });
  await fs.writeFile(path.join(root, 'papers/01_综述/paper.pdf'), '%PDF-1.4\nclassify-me');
  await fs.writeFile(path.join(root, 'papers/01_综述/second.pdf'), '%PDF-1.4\nclassify-me-too');
  await fs.mkdir(path.join(root, '.zhiyue/catalog'), { recursive: true });
  await fs.writeFile(path.join(root, '.zhiyue/catalog/文献索引.json'), JSON.stringify({
    records: [
      { literature_id: 'L001', title: '待归类', authors: [], file: 'papers/01_综述/paper.pdf', versions: [] },
      { literature_id: 'L002', title: '待归类续', authors: [], file: 'papers/01_综述/second.pdf', versions: [] },
    ],
  }));
  // 在真实后台队列中阻塞批量工作器，确认 HTTP 不等待文件移动完成。
  const calls: string[][] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const app = await createApp({ root, stateDir: path.join(root, '.zhiyue/data'), connectPi: false });
  app.jobs._run = async (job, command, args = [], onOutput) => {
    assert.equal(command, 'move-papers');
    calls.push([command, ...args]);
    const moves = JSON.parse(await fs.readFile(args[0]!, 'utf8')) as Array<{ paperId: string; category: string }>;
    await gate;
    for (const { paperId, category } of moves) {
      const name = paperId === 'L001' ? 'paper.pdf' : 'second.pdf';
      await fs.rename(path.join(root, 'papers/01_综述', name), path.join(root, category, name));
    }
    onOutput?.(JSON.stringify({ items: moves.map((item) => ({ ...item, status: 'moved' })) }));
    job.steps.push({ action: command, status: 'completed', startedAt: '', finishedAt: '' });
  };
  await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', () => resolve()));
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  t.after(async () => { release(); await app.close(); await fs.rm(root, { recursive: true, force: true }); });
  const chat = app.chats.create();
  const decide = (body: Record<string, unknown>, id = chat.id) => fetch(`${base}/api/chats/${id}/classify-proposals`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: 'route-request', ...body }),
  });
  const pending = (paperId: string, id: string): ChatClassifyProposal => ({
    id, paperId, title: `论文 ${paperId}`, fromPath: 'papers/01_综述',
    targetCategory: '02_方法', targetPath: 'papers/02_方法', willCreateCategory: false,
    willCreateSubcategory: false, basis: 'notes', reason: '笔记主题相同', createdAt: new Date().toISOString(),
  });

  // 无待确认提案时不能凭空执行。
  assert.equal((await decide({ action: 'apply', ids: ['missing'] })).status, 404);
  assert.equal(calls.length, 0);

  app.chats.get(chat.id).classifyProposals = [pending('L001', 'classify-1')];
  // 非法动作、空编号与非字符串编号都在业务层拒绝，且不改动卡片和磁盘。
  assert.equal((await decide({ action: 'delete', ids: ['classify-1'] })).status, 400);
  assert.equal((await decide({ action: 'apply', ids: [] })).status, 400);
  assert.equal((await decide({ action: 'apply', ids: [1] })).status, 400);
  assert.equal((await decide({ action: 'apply' })).status, 400);
  assert.equal(app.chats.get(chat.id).classifyProposals?.length, 1);
  assert.equal(calls.length, 0);
  // 未知会话同样不能执行；重复编号去重后只处理一次。
  assert.equal((await decide({ action: 'apply', ids: ['classify-1'] }, 'missing-chat')).status, 404);
  const submitted = await decide({ action: 'apply', ids: ['classify-1', 'classify-1'] });
  assert.equal(submitted.status, 202);
  const accepted = await readJson<{ run: { id: string; jobId: string }; job: { id: string } }>(submitted);
  assert.ok(accepted.run.jobId);
  assert.equal(app.chats.get(chat.id).classifyProposals?.length, 1);
  assert.ok(existsSync(path.join(root, 'papers/01_综述/paper.pdf')));
  const replay = await decide({ action: 'apply', ids: ['classify-1'] });
  assert.equal(replay.status, 200);
  assert.equal((await readJson<{ run: { id: string } }>(replay)).run.id, accepted.run.id);
  assert.equal((await decide({ action: 'apply', ids: ['other'] })).status, 409);
  assert.throws(() => app.chats.changeHistory(chat.id, 'archived'), /正在处理/);
  release();
  for (let index = 0; index < 100 && app.jobs.getJob(accepted.job.id)?.status !== 'completed'; index++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(app.jobs.getJob(accepted.job.id)?.status, 'completed');
  assert.equal(app.chats.get(chat.id).classifyProposals?.length, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.[0], 'move-papers');
  assert.equal(existsSync(calls[0]![1]!), false);
  assert.equal((await decide({ action: 'apply', ids: ['classify-1'] })).status, 200);
  assert.equal(existsSync(path.join(root, 'papers/01_综述/paper.pdf')), false);
  assert.ok(existsSync(path.join(root, 'papers/02_方法/paper.pdf')));

  // 取消只丢弃卡片，不触碰磁盘。
  app.chats.get(chat.id).classifyProposals = [pending('L002', 'classify-2')];
  const discarded = await decide({ action: 'discard', ids: ['classify-2'] });
  assert.equal(discarded.status, 200);
  assert.deepEqual((await readJson<{ discarded: string[] }>(discarded)).discarded, ['classify-2']);
  assert.deepEqual(app.chats.get(chat.id).classifyProposals, []);
  assert.equal(calls.length, 1);
  assert.ok(existsSync(path.join(root, 'papers/01_综述/second.pdf')));
});
