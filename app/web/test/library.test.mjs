import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, realpath, stat } from 'node:fs/promises';
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

test('empty folders appear as categories and new folders continue numbering', async t => {
  const { root, library } = await fixture(t);
  await mkdir(path.join(root, 'papers/09_空分类'), { recursive: true });
  let data = await library.getLibrary();
  const empty = data.categories.find(c => c.id === '09_空分类');
  assert.ok(empty);
  assert.equal(empty.count, 0);
  assert.deepEqual(empty.children, []);
  assert.deepEqual(data.categories.map(c => c.id), ['08_SER', '09_空分类']);

  const created = await library.createCategory('临床_应用');
  assert.equal(created.category, '10_临床_应用');
  assert.equal(await readFile(path.join(root, 'papers/10_临床_应用/.keep')).catch(e => e.code), 'ENOENT');
  data = await library.getLibrary();
  assert.equal(data.categories.find(c => c.id === '10_临床_应用').count, 0);

  await assert.rejects(library.createCategory('临床_应用'), /同名文件夹已存在/);
  await assert.rejects(library.createCategory('08_临床_应用'), /同名文件夹已存在/);
  await assert.rejects(library.createCategory('../逃逸'), /不允许的字符/);
  await assert.rejects(library.createCategory('CON'), /不能用作文件夹/);
  await assert.rejects(library.createCategory('   '), /请输入文件夹名称/);
  await assert.rejects(library.createCategory(123), /文件夹名称无效/);
});

test('import categories are created with numbering before the batch starts', async t => {
  const { root, library, put } = await fixture(t);
  assert.equal(await library.ensureCategory('papers/实验数据复核/网站导入'), 'papers/09_实验数据复核/网站导入');
  assert.ok((await stat(path.join(root, 'papers/09_实验数据复核/网站导入'))).isDirectory());
  assert.equal(await library.ensureCategory('papers/08_SER/网站导入'), 'papers/08_SER/网站导入');
  assert.equal(await library.ensureCategory('papers/08_SER/01_资源'), 'papers/08_SER/01_资源');
  await assert.rejects(library.ensureCategory('papers/../逃逸'), /文件夹路径无效/);
  await put('papers/08_SER/占位文件', 'x');
  await assert.rejects(library.ensureCategory('papers/08_SER/占位文件'), /不是普通目录/);
});

test('category rename validates input and delegates to the archive CLI', async t => {
  const { library } = await fixture(t);
  const calls = [];
  library.categoryCommand = async args => {
    calls.push(args);
    if (args.includes('不存在')) throw Object.assign(new Error('文件夹不存在。'), { statusCode: 404 });
    if (args.includes('--subcategory')) return { category: '08_SER', subcategory: '01_资源整理' };
    return { category: '08_语音识别', subcategory: '' };
  };
  assert.deepEqual(await library.renameCategory('08_SER', '', '语音识别'), {
    category: '08_语音识别',
    subcategory: '',
  });
  assert.deepEqual(calls[0], ['rename-category', '--category', '08_SER', '--name', '语音识别']);
  assert.deepEqual(await library.renameCategory('08_SER', '01_资源', '资源整理'), {
    category: '08_SER',
    subcategory: '01_资源整理',
  });
  assert.deepEqual(calls[1], ['rename-category', '--category', '08_SER', '--name', '资源整理', '--subcategory', '01_资源']);
  await assert.rejects(library.renameCategory('../x', '', 'a'), /文件夹路径无效/);
  await assert.rejects(library.renameCategory('08_SER', '..', 'a'), /文件夹路径无效/);
  await assert.rejects(library.renameCategory('不存在', '', 'a'), /文件夹不存在/);
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
