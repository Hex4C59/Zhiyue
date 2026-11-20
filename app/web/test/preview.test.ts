import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, stat, rm, symlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { previewPaper } from '../src/lib/preview.js';
import { resolvePython } from '../src/lib/python.js';
import { createApp } from '../src/server.js';

// HTTP 文字层只按测试读取的字段声明；错误字段仅在返回体中可能存在。
interface TextLayerPayload {
  hasText: boolean;
  text: string;
  width: number;
  height: number;
  lines: Array<{ words: Array<{ x: number; y: number; width: number; height: number }> }>;
  error?: string;
}

interface HttpFailure extends Error {
  statusCode?: number;
}

const statusOf = (error: unknown): number | undefined => (error as HttpFailure).statusCode;
const cacheRejected = (error: unknown): boolean =>
  statusOf(error) === 400 && /缓存/.test((error as HttpFailure).message);

// 编译后的测试位于 build/app/web/test；从自身位置向上找到项目清单，统一指向仓库内 app/。
function repoRoot(): string {
  let directory = path.dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const manifest = path.join(directory, 'package.json');
    if (fs.existsSync(manifest)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(manifest, 'utf8')) as { name?: string };
        if (parsed.name === 'zhiyue') return directory;
      } catch { /* 非项目清单，继续向上查找。 */ }
    }
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error('无法定位项目根目录。');
    directory = parent;
  }
}

const project = path.join(repoRoot(), 'app');
const python = resolvePython();
// 夹具复用项目内的 Poppler 回退路径；与 app/downloader/validation.py 的查找顺序一致。
const bundledPoppler = path.join(repoRoot(), 'tools/poppler/Library/bin/pdftoppm.exe');
if (!process.env.PDFTOPPM && fs.existsSync(bundledPoppler)) process.env.PDFTOPPM = bundledPoppler;

test('real Poppler preview deduplicates concurrent requests, caches pages and validates bounds', { timeout: 30000 }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'literature-preview-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const downloader = path.join(root, 'fixture-downloader');
  await mkdir(downloader, { recursive: true });
  await mkdir(path.join(root, 'papers'), { recursive: true });
  // Reuse the project's real Poppler locator and dependencies, in an isolated fixture.
  for (const name of ['validation.py', 'common.py']) {
    await copyFile(path.join(project, 'downloader', name), path.join(downloader, name));
  }
  const file = path.join(root, 'papers', 'two-pages.pdf');
  await promisify(execFile)(python, ['-c', 'from pypdf import PdfWriter; import sys; w=PdfWriter(); w.add_blank_page(width=300,height=400); w.add_blank_page(width=400,height=300); w.write(sys.argv[1])', file], { windowsHide: true, timeout: 10000 });
  const original = await readFile(file);
  // Count actual renderer invocations while retaining real Python/Poppler behavior.
  await writeFile(path.join(downloader, 'validation.py'),
    '\nwith open(__file__ + ".calls", "a") as counter: counter.write("render\\n")\n', { flag: 'a' });
  const previousDownloader = process.env.LITERATURE_DOWNLOADER;
  process.env.LITERATURE_DOWNLOADER = downloader;
  t.after(() => {
    if (previousDownloader === undefined) delete process.env.LITERATURE_DOWNLOADER;
    else process.env.LITERATURE_DOWNLOADER = previousDownloader;
  });
  const results = await Promise.all(Array.from({ length: 5 }, () => previewPaper({ root, python, file, page: 1 })));
  assert.ok(results.every(r => r.file === results[0].file && r.totalPages === 2 && r.page === 1));
  assert.deepEqual((await readFile(path.join(downloader, 'validation.py.calls'), 'utf8')).trim().split(/\r?\n/),
    ['render']);
  assert.match(results[0].file, /\.zhiyue[/\\]cache[/\\]pdf-preview[/\\][a-f0-9]{64}[/\\]page\.png$/);
  const png = await readFile(results[0].file);
  assert.equal(Math.max(png.readUInt32BE(16), png.readUInt32BE(20)), 1600);
  const before = (await stat(results[0].file)).mtimeMs;
  assert.deepEqual(await previewPaper({ root, python: path.join(root, 'missing-python'), file, page: '1' }),
    results[0]);
  assert.equal((await stat(results[0].file)).mtimeMs, before);
  const meta = path.join(path.dirname(results[0].file), 'meta.json');
  const originalMeta = await readFile(meta, 'utf8');
  const [large, repeated] = await Promise.all([
    previewPaper({ root, python, file, page: 1, scale: 3200 }),
    previewPaper({ root, python, file, page: 1, scale: '3200' }),
  ]);
  assert.deepEqual(large, repeated);
  assert.equal(path.dirname(large.file), path.dirname(results[0].file));
  assert.notEqual(large.file, results[0].file);
  const largePng = await readFile(large.file);
  assert.equal(Math.max(largePng.readUInt32BE(16), largePng.readUInt32BE(20)), 3200);
  assert.deepEqual(large.textLayer, results[0].textLayer);
  assert.equal(await readFile(meta, 'utf8'), originalMeta);
  assert.deepEqual((await readFile(path.join(downloader, 'validation.py.calls'), 'utf8')).trim().split(/\r?\n/),
    ['render', 'render']);
  assert.deepEqual(await previewPaper({ root, python: path.join(root, 'missing-python'), file, scale: 3200 }), large);
  const second = await previewPaper({ root, python, file, page: 2 });
  assert.notEqual(second.file, results[0].file); assert.equal(second.page, 2);
  await assert.rejects(previewPaper({ root, python: path.join(root, 'missing-python'), file, page: 3 }),
    e => statusOf(e) === 500);
  for (const page of [0, -1, 1.5, '1foo', '', null, 3] as Array<number | string | null>) {
    await assert.rejects(previewPaper({ root, python, file, page: page as number | string }), e => statusOf(e) === 400);
  }
  assert.deepEqual(await readFile(file), original);
  // A truncated cached image must be replaced rather than served as a black/broken page.
  await writeFile(results[0].file, 'broken');
  await previewPaper({ root, python, file, page: 1 });
  assert.ok((await stat(results[0].file)).size > 100);
  // Even a valid cache must not be read through a symlinked metadata file.
  const externalMeta = path.join(root, 'metadata.json');
  await copyFile(meta, externalMeta); await rm(meta);
  await symlink(externalMeta, meta);
  await assert.rejects(previewPaper({ root, python, file, page: 1 }), cacheRejected);
});

test('cache rejects external ancestors and internal aliases before mkdir or cache reads', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'literature-preview-path-'));
  const outside = await mkdtemp(path.join(os.tmpdir(), 'literature-preview-outside-'));
  t.after(async () => {
    await rm(root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true });
  });
  const file = path.join(root, 'fixture.pdf'); await writeFile(file, '%PDF-fixture');
  const type = process.platform === 'win32' ? 'junction' : 'dir';
  await symlink(outside, path.join(root, '.zhiyue'), type);
  await assert.rejects(previewPaper({ root, python, file, page: 1 }), cacheRejected);
  assert.deepEqual(await readdir(outside), []);
  await rm(path.join(root, '.zhiyue'));
  await mkdir(path.join(root, '.zhiyue')); await mkdir(path.join(root, 'alias-target'));
  await symlink(path.join(root, 'alias-target'), path.join(root, '.zhiyue/cache'), type);
  await assert.rejects(previewPaper({ root, python, file, page: 1 }), cacheRejected);
  assert.deepEqual(await readdir(path.join(root, 'alias-target')), []);
});

test('PDF text boxes preserve selectable content, rotation, blank-page status and indexed HTTP boundaries', { timeout: 30000 }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'literature-text-layer-'));
  await mkdir(path.join(root, 'papers'));
  await mkdir(path.join(root, '.zhiyue/catalog'), { recursive: true });
  const file = path.join(root, 'papers', 'selectable.pdf');
  const fixture=`from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject
import sys
w=PdfWriter()
font=w._add_object(DictionaryObject({NameObject('/Type'):NameObject('/Font'),NameObject('/Subtype'):NameObject('/Type1'),NameObject('/BaseFont'):NameObject('/Helvetica')}))
for i in range(5):
    page=w.add_blank_page(width=300,height=400)
    if i!=2:
        page[NameObject('/Resources')]=DictionaryObject({NameObject('/Font'):DictionaryObject({NameObject('/F1'):font})})
        stream=DecodedStreamObject();stream.set_data(b'BT /F1 14 Tf 20 350 Td (Copy & select <PDF>) Tj 0 -24 Td (Second line.) Tj ET')
        page[NameObject('/Contents')]=w._add_object(stream)
    if i==1:page.rotate(90)
    if i==3:page.rotate(270)
    if i==4:page.rotate(180)
w.write(sys.argv[1])`;
  await promisify(execFile)(python, ['-c', fixture, file], { windowsHide: true, timeout: 10000 });
  const original = await readFile(file);
  await writeFile(path.join(root, '.zhiyue/catalog', '文献索引.json'), JSON.stringify({
    records: [{
      literature_id: 'L001', title: 'Synthetic selection test', authors: [], year: 2026,
      file: 'papers/selectable.pdf', versions: [],
    }],
  }));
  const app = await createApp({ root, stateDir: path.join(root, '.zhiyue/data'), connectPi: false });
  await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', () => resolve()));
  t.after(async () => { await app.close(); await rm(root, { recursive: true, force: true }); });
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  const response = await fetch(base + '/api/papers/L001/text-layer?page=1');
  assert.equal(response.status, 200);
  const text = (await response.json()) as TextLayerPayload;
  assert.equal(text.hasText, true, text.error);
  assert.match(text.text, /Copy & select <PDF>/);
  assert.match(text.text, /\nSecond line\./);
  assert.equal(text.width, 300); assert.equal(text.height, 400);
  assert.ok(text.lines.flatMap(l => l.words)
    .every(w => w.x >= 0 && w.y >= 0 && w.x + w.width <= text.width && w.y + w.height <= text.height));
  const rotated = await previewPaper({ root, python, file, page: 2 });
  assert.equal(rotated.textLayer.hasText, true);
  assert.match(rotated.textLayer.text.replace(/\s+/g, ' '), /Copy & select <PDF> Second line\./);
  assert.ok(rotated.textLayer.lines.flatMap(l => l.words).every(w => w.rotation === 90));
  const png = await readFile(rotated.file);
  assert.ok(Math.abs(rotated.textLayer.width / rotated.textLayer.height -
    png.readUInt32BE(16) / png.readUInt32BE(20)) < 0.002, '旋转页面的文字层应与图片方向一致');
  for (const [page, rotation] of [[4, 270], [5, 180]]) {
    const result = await previewPaper({ root, python, file, page });
    assert.match(result.textLayer.text.replace(/\s+/g, ' '), /Copy & select <PDF> Second line\./);
    assert.ok(result.textLayer.lines.flatMap(l => l.words).every(w => w.rotation === rotation));
  }
  const blank = await previewPaper({ root, python, file, page: 3 });
  assert.equal(blank.textLayer.hasText, false); assert.equal(blank.textLayer.text, '');
  assert.equal((blank.textLayer as TextLayerPayload).error, undefined);
  assert.equal((await fetch(base + '/api/papers/L999/text-layer?page=1')).status, 404);
  assert.equal((await fetch(base + '/api/papers/L001/text-layer?page=0')).status, 400);
  assert.equal((await fetch(base + '/api/papers/L001/text-layer?page=6')).status, 400);
  for (const scale of ['0', '2401', '48000', '']) {
    assert.equal((await fetch(base + `/api/papers/L001/preview?page=1&scale=${scale}`)).status, 400);
  }
  const cached = await previewPaper({ root, python, file, page: 1 });
  const meta = path.join(path.dirname(cached.file), 'meta.json');
  const old = JSON.parse(await readFile(meta, 'utf8')) as { textLayer?: unknown };
  delete old.textLayer;
  await writeFile(meta, JSON.stringify(old));
  const repaired = await previewPaper({ root, python, file, page: 1 });
  assert.equal(repaired.textLayer.hasText, true);
  assert.deepEqual(await readFile(file), original);
});
