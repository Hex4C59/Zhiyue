import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, access, appendFile, stat, rename, symlink }
  from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { appPaths } from '../src/lib/appPaths.js';
import { previewPaper, type PreviewResult } from '../src/lib/preview.js';

async function deadline<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('预览请求未在夹具截止时间内结束')), 5000);
    })]);
  } finally { clearTimeout(timer!); }
}

async function fixture(t: test.TestContext) {
  const temporary = path.resolve('build/test-tmp');
  await mkdir(temporary, { recursive: true });
  const root = await mkdtemp(path.join(temporary, 'zhiyue-preview-queue-'));
  const directory = path.join(root, 'renderer');
  const file = path.join(root, 'source/fixture.pdf');
  const paths = appPaths();
  const previous = paths.pythonDir;
  const pending: Promise<PreviewResult>[] = [];
  await mkdir(directory);
  await mkdir(path.dirname(file));
  await writeFile(file, '%PDF-queue-fixture');
  await writeFile(path.join(directory, 'package.json'), '{"type":"commonjs"}');
  await writeFile(path.join(directory, 'render.py'), `
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const value = (key) => args[args.indexOf(key) + 1];
const root = value('--root'), page = Number(value('--page')), scale = Number(value('--scale-to'));
fs.appendFileSync(path.join(root, 'calls'), String(page) + '\\n');
fs.writeFileSync(path.join(root, 'started-' + page), '1');
function publish() {
  if (fs.existsSync(path.join(root, 'change-during-render'))) fs.appendFileSync(value('--file'), '\\nchanged');
  const png = Buffer.alloc(24);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(png);
  png.write('IHDR', 12, 'ascii'); png.writeUInt32BE(scale, 16); png.writeUInt32BE(scale, 20);
  fs.writeFileSync(value('--output'), png);
  console.log(JSON.stringify({page,totalPages:4,textLayer:{width:100,height:100,text:'',hasText:false,lines:[]}}));
}
function tick() {
  if (fs.existsSync(path.join(root, 'block-' + page)) && !fs.existsSync(path.join(root, 'release-' + page))) {
    setTimeout(tick, 5);
  } else publish();
}
tick();
`);
  paths.pythonDir = directory;
  const exists = (name: string) => access(path.join(root, name)).then(() => true, () => false);
  const release = (page: number) => writeFile(path.join(root, `release-${page}`), '1');
  t.after(async () => {
    await Promise.all([1, 2, 3, 4].map(release));
    await Promise.allSettled(pending);
    paths.pythonDir = previous;
    await rm(root, { recursive: true, force: true });
  });
  return {
    root, file, exists, release,
    block: (page: number) => writeFile(path.join(root, `block-${page}`), '1'),
    async started(page: number) {
      for (let attempt = 0; attempt < 500; attempt++) {
        if (await exists(`started-${page}`)) return;
        await pause(10);
      }
      throw new Error(`第 ${page} 页工作器未启动`);
    },
    preview(page: number, python = process.execPath) {
      const promise = previewPaper({ root, python, file, page });
      pending.push(promise);
      void promise.catch(() => {});
      return promise;
    },
    async calls() { return (await readFile(path.join(root, 'calls'), 'utf8')).trim().split('\n').map(Number); },
  };
}

test('两个渲染名额被阻塞时，已验证缓存直接返回且未命中仍限流去重', { timeout: 20000 }, async (t) => {
  const f = await fixture(t);
  const cached = await f.preview(1);
  await Promise.all([f.block(2), f.block(3)]);
  const second = f.preview(2);
  const third = f.preview(3);
  await Promise.all([f.started(2), f.started(3)]);
  const fourth = f.preview(4);
  const duplicate = f.preview(4);
  const hit = await deadline(f.preview(1, path.join(f.root, 'missing-python')));
  assert.deepEqual(hit, cached);
  assert.equal(await f.exists('release-2'), false);
  assert.equal(await f.exists('release-3'), false);
  assert.equal(await f.exists('started-4'), false);
  await f.release(2);
  await second;
  assert.deepEqual(await deadline(fourth), await duplicate);
  assert.equal((await f.calls()).filter((page) => page === 4).length, 1);
  await f.release(3);
  await third;
});

test('等待中原文变化使用新签名重试，返回的元数据对应当前原文', { timeout: 20000 }, async (t) => {
  const f = await fixture(t);
  await Promise.all([f.block(2), f.block(3)]);
  const second = f.preview(2);
  const third = f.preview(3);
  await Promise.all([f.started(2), f.started(3)]);
  const queued = f.preview(4);
  await pause(20);
  await appendFile(f.file, '\n新原文');
  await f.release(2);
  const result = await deadline(queued);
  const info = await stat(f.file);
  const meta = JSON.parse(await readFile(path.join(path.dirname(result.file), 'meta.json'), 'utf8'));
  assert.equal(meta.size, info.size);
  assert.equal(meta.mtimeMs, info.mtimeMs);
  await f.release(3);
  await Promise.all([second, third]);
});

test('排队期间源目录替换成库外链接时拒绝重试，不能渲染链接目标', { timeout: 20000 }, async (t) => {
  const f = await fixture(t);
  const outside = await mkdtemp(path.join(path.dirname(f.root), 'outside-preview-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await writeFile(path.join(outside, 'fixture.pdf'), '%PDF-outside');
  await Promise.all([f.block(2), f.block(3)]);
  const second = f.preview(2);
  const third = f.preview(3);
  await Promise.all([f.started(2), f.started(3)]);
  const queued = f.preview(4);
  await pause(20);
  const sourceDirectory = path.dirname(f.file);
  await rename(sourceDirectory, `${sourceDirectory}-original`);
  await symlink(outside, sourceDirectory, process.platform === 'win32' ? 'junction' : 'dir');
  await f.release(2);
  await assert.rejects(deadline(queued), (error: any) => error.statusCode === 403 && /路径已变化/.test(error.message));
  assert.equal(await f.exists('started-4'), false);
  await f.release(3);
  await Promise.allSettled([second, third]);
});

test('重复变化至多重试一次且先释放名额，不发布旧签名元数据', { timeout: 20000 }, async (t) => {
  const f = await fixture(t);
  await f.block(2);
  const blocked = f.preview(2);
  await f.started(2);
  await writeFile(path.join(f.root, 'change-during-render'), '1');
  await assert.rejects(deadline(f.preview(1)), (error: any) => error.statusCode === 409 && /原文正在变化/.test(error.message));
  assert.equal((await f.calls()).filter((page) => page === 1).length, 2);
  const cache = path.join(f.root, '.zhiyue/cache/pdf-preview');
  for (const directory of await readdir(cache)) {
    await assert.rejects(access(path.join(cache, directory, 'meta.json')), { code: 'ENOENT' });
  }
  await rm(path.join(f.root, 'change-during-render'));
  await f.release(2);
  await blocked;
});
