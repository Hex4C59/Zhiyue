import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Library } from '../src/lib/library.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'literature-library-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const put = async (name, text = '') => { const file = path.join(root, name); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, text); return file; };
  const file = 'papers/08_SER/01_资源/paper.pdf';
  const source = 'papers/08_SER/01_资源/paper.来源.json';
  const records = [{ literature_id: 'L001', title: 'Paper', authors: 'Alice; Bob', file, source_record: source, versions: [] }];
  await put('.zhiyue/catalog/文献索引.json', JSON.stringify({ records }));
  await put(file, '%PDF-test');
  await put(source, JSON.stringify({ display_title_zh: '中文题名', 用户阅读状态: '已读' }));
  await put('notes/子目录/L001_笔记.md', '# Note');
  await put('notes/assets/image.png');
  await put('synthesis/review.md');
  await put('outputs/正常/image.jpg');
  await put('outputs/RECOLA_申请资料/secret.png', 'private');
  const library = new Library({ root, stateDir: path.join(root, '.zhiyue/data') });
  return { root, put, records, file, source, library };
}

test('catalog enrichment and user-only reading persistence; refresh sees catalog updates', async t => {
  const { root, put, records, library, source } = await fixture(t);
  const before = await readFile(path.join(root, source), 'utf8');
  const data = await library.getLibrary();
  assert.equal(data.stats.total, 1);
  const paper = data.papers[0];
  assert.equal(paper.readStatus, 'unread'); assert.equal(paper.starred, false);
  assert.deepEqual(paper.authors, ['Alice', 'Bob']); assert.equal(paper.titleZh, '中文题名');
  assert.equal(paper.category, '08_SER'); assert.equal(paper.subcategory, '01_资源');
  assert.equal(paper.notes[0].path, 'notes/子目录/L001_笔记.md');
  assert.equal(data.categories[0].children[0].count, 1);
  await Promise.all([library.updatePaper('L001', { readStatus: 'reading' }), library.updatePaper('L001', { starred: true })]);
  assert.equal((await library.getPaper('L001')).readStatus, 'reading');
  assert.equal((await library.getPaper('L001')).starred, true);
  assert.equal(await readFile(path.join(root, source), 'utf8'), before);
  assert.equal(new Library({ root, stateDir: path.join(root, '.zhiyue/data') }).root, root);
  await assert.rejects(library.updatePaper('L001', { readStatus: 'done' }));
  await assert.rejects(library.updatePaper('L002', { starred: true }));
  records.push({ literature_id: 'L002', file: 'papers/08_SER/second.pdf', authors: [] });
  await put('.zhiyue/catalog/文献索引.json', JSON.stringify({ records }));
  assert.equal((await library.getLibrary()).stats.total, 1);
  await library.refresh(); assert.equal((await library.getLibrary()).stats.total, 2);
});

test('file allowlist denies traversal, unindexed PDFs, private outputs and active content', async t => {
  const { library, root, file, source, put } = await fixture(t);
  for (const rel of [file, source, 'notes/子目录/L001_笔记.md', 'notes/assets/image.png', 'synthesis/review.md', 'outputs/正常/image.jpg']) {
    assert.equal(await library.safeFile(rel), await realpath(path.join(root, rel)));
  }
  await put('papers/08_SER/unindexed.pdf'); await put('notes/script.svg'); await put('notes/index.html'); await put('notes/private.json');
  for (const rel of ['../README.md', '/etc/passwd', 'C:/Windows/win.ini', 'notes/../tools/key.json', 'notes/%2e%2e/key.txt', 'notes\\assets\\image.png', 'papers/08_SER/unindexed.pdf', 'notes/script.svg', 'notes/index.html', 'notes/private.json', 'outputs/RECOLA_申请资料/secret.png', 'docs/内部/info.txt', '.git/config', 'tools/credentials.json', 'notes/.git/config', 'outputs/正常/readme.txt']) {
    await assert.rejects(library.safeFile(rel), undefined, rel);
  }
});

test('symlink file alias cannot expose an unindexed target', async t => {
  const { library, root, put } = await fixture(t);
  const target = await put('tools/private.txt', 'secret');
  try { await symlink(target, path.join(root, 'notes/leak.txt')); }
  catch (e) { if (['EPERM', 'EACCES'].includes(e.code)) return t.skip('当前Windows账户无文件symlink权限'); throw e; }
  await assert.rejects(library.safeFile('notes/leak.txt'));
});
