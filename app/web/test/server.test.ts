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
import type { ChatNoteDraft } from '../src/lib/chat.js';

// 服务端返回的 JSON 只在这里按用到的字段声明结构，读取后立即断言。
interface LibraryResponse {
  papers: Array<{ readStatus: string }>;
  categories: Array<{ id: string }>;
}

interface CategoryResponse {
  category: string;
}

interface UploadResponse {
  id: string;
  name: string;
  path?: string;
}

interface NoteDraftResponse {
  path: string;
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
  const categoryCli = async (args: string[]): Promise<{ category: string; subcategory: string }> => {
    if (args[0] !== 'rename-category') throw new Error('unexpected category command');
    const category = args[args.indexOf('--category') + 1];
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
  // 路由只读取笔记草案的标识、题名与正文，其余字段按服务端类型补齐。
  app.chats.get(chat.id).noteDrafts.push({
    id: 'draft-1', paperId: 'L001', title: '测试笔记', content: '## 要点\n\n内容', createdAt: new Date().toISOString(),
  } as ChatNoteDraft);
  response = await fetch(base + '/api/note-drafts/draft-1', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save' }),
  });
  assert.equal(response.status, 200);
  assert.equal((await readJson<NoteDraftResponse>(response)).path, 'notes/L001_测试笔记.md');
  assert.match(await fs.readFile(path.join(root, 'notes', 'L001_测试笔记.md'), 'utf8'), /## 要点/);
  response = await fetch(base + '/api/note-drafts/missing', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save' }),
  });
  assert.equal(response.status, 404);
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
