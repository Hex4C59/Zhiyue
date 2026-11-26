import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createApp } from '../src/server.js';
import {
  PDF_TRANSLATION_REVISION, splitMarkdownBlocks, translateMarkdownBlocks,
} from '../src/lib/pdfTranslationWorker.js';
import type { TranslationModel } from '../src/lib/pdfTranslationWorker.js';
import type { PdfTranslationMarkdown, PdfTranslationStatus } from '../shared/pdfTranslation.js';

const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const modelId = 'test/luna';
const model: TranslationModel = {
  id: modelId,
  fingerprint: JSON.stringify([modelId, 'openai', 'https://api.example.invalid']),
  complete: async () => '',
};

const gate = () => {
  let resolve!: () => void;
  return { promise: new Promise<void>((done) => { resolve = done; }), resolve };
};

async function waitFor<T>(read: () => Promise<T>, ready: (value: T) => boolean): Promise<T> {
  for (let i = 0; i < 80; i++) {
    const value = await read();
    if (ready(value)) return value;
    await new Promise((done) => setTimeout(done, 25));
  }
  throw new Error('等待翻译任务终态超时');
}

test('Markdown 切块保留英文标题、HTML/管道表格、独立公式与插图，仅翻译正文与图注', async () => {
  const source = [
    '# A Survey of Deep Learning',
    '',
    '## 1. Introduction',
    '',
    'Deep learning has transformed computer vision [1–3].',
    '',
    '$$',
    'E = mc^2',
    '$$',
    '',
    '![](images/fig1.png)',
    '',
    'Fig. 1. Overview of the architecture.',
    '',
    '<table><tr><th>Model</th><th>Acc</th></tr><tr><td>ResNet</td><td>95.2%</td></tr></table>',
    '',
    '| Dataset | Size |',
    '| --- | --- |',
    '| ImageNet | 1.2M |',
  ].join('\n');

  const blocks = splitMarkdownBlocks(source);
  assert.deepEqual(
    blocks.map((b) => b.kind),
    ['heading', 'heading', 'prose', 'math', 'image', 'prose', 'table', 'table'],
  );

  const sent: string[] = [];
  const { markdown, translatedCount } = await translateMarkdownBlocks(
    blocks,
    {
      ...model,
      complete: async (mode, text) => {
        sent.push(mode);
        if (mode === 'batch') {
          const items = JSON.parse(text.slice(text.indexOf('['))) as Array<{ id: number; text: string }>;
          return JSON.stringify(items.map(({ id, text: src }) => ({
            id,
            output: src.includes('Fig. 1') ? '图 1. 整体架构概览。' : '深度学习改变了计算机视觉 [1–3]。',
          })));
        }
        return text;
      },
    },
    AbortSignal.timeout(5000),
  );

  assert.equal(translatedCount, 2);
  assert.deepEqual(sent, ['batch']);
  assert.match(markdown, /^# A Survey of Deep Learning/m);
  assert.match(markdown, /^## 1\. Introduction/m);
  assert.match(markdown, /深度学习改变了计算机视觉 \[1–3\]。/);
  assert.match(markdown, /图 1\. 整体架构概览。/);
  assert.match(markdown, /<table><tr><th>Model<\/th>/);
  assert.match(markdown, /\| ImageNet \| 1\.2M \|/);
  assert.match(markdown, /!\[\]\(images\/fig1\.png\)/);
});

test('批量 JSON 格式错误时自动降级为逐段翻译，顽固单段异常安全回退原文', async () => {
  const blocks = splitMarkdownBlocks([
    'First paragraph about methods.',
    '',
    'Second paragraph with tricky text.',
  ].join('\n'));
  const calls: Array<{ mode: string; retry?: boolean }> = [];
  const { markdown, translatedCount } = await translateMarkdownBlocks(
    blocks,
    {
      ...model,
      complete: async (mode, text, _signal, retry) => {
        calls.push({ mode, retry });
        if (mode === 'batch') return 'not valid json';
        if (text.includes('Second')) throw new Error('model transient error');
        return '第一段关于方法。';
      },
    },
    AbortSignal.timeout(5000),
  );
  assert.equal(translatedCount, 1);
  assert.match(markdown, /第一段关于方法。/);
  assert.match(markdown, /Second paragraph with tricky text\./);
  assert.equal(calls.some((c) => c.mode === 'batch'), true);
  assert.equal(calls.some((c) => c.mode === 'paragraph' && c.retry === true), true);
});

test('译本发布、Markdown 读取、图片资产边界、重新生成与取消/失败回滚', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zhiyue-md-translation-'));
  const publish = gate();
  let app: Awaited<ReturnType<typeof createApp>> | undefined;
  t.after(async () => {
    publish.resolve();
    await app?.close();
    await rm(root, { recursive: true, force: true });
  });
  const papers = path.join(root, 'papers');
  const source = path.join(papers, 'a.pdf');
  const original = Buffer.from('%PDF-1.4\nsynthetic paper\n%%EOF');
  const sourceHash = sha256(original);
  await mkdir(papers);
  await mkdir(path.join(root, '.zhiyue/catalog'), { recursive: true });
  await writeFile(source, original);
  await writeFile(path.join(root, '.zhiyue/catalog/文献索引.json'), JSON.stringify({
    records: [{ literature_id: 'L001', file: 'papers/a.pdf' }],
  }));

  const oldKey = sha256(JSON.stringify([sourceHash, model.fingerprint, PDF_TRANSLATION_REVISION]));
  const oldTime = '2026-01-01T00:00:00.000Z';
  const oldDir = path.join(root, '.zhiyue/data/translations/L001', oldKey);
  await mkdir(path.join(oldDir, 'images'), { recursive: true });
  await writeFile(path.join(oldDir, 'zh.md'), '# Old Title\n\n旧版中文精读。\n![](images/fig1.png)\n');
  await writeFile(path.join(oldDir, 'images/fig1.png'), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  await writeFile(path.join(oldDir, 'result.json'), JSON.stringify({
    key: oldKey, sourceHash, model: modelId, completedAt: oldTime, sections: 1, images: 1,
  }));

  let runs = 0;
  let operation: 'publish' | 'cancel' | 'fail' = 'publish';
  const server = await createApp({
    root, connectPi: false,
    translation: {
      getModel: () => model,
      mineruCommand: process.execPath,
      worker: async ({ work, signal }) => {
        runs++;
        if (operation === 'fail') throw new Error('合成翻译任务失败');
        if (operation === 'cancel') {
          signal.throwIfAborted();
          await new Promise<void>((resolve) => signal.addEventListener('abort', () => resolve(), { once: true }));
          signal.throwIfAborted();
        }
        await publish.promise;
        const resultDir = path.join(work, 'result');
        await mkdir(path.join(resultDir, 'images'), { recursive: true });
        await writeFile(path.join(resultDir, 'zh.md'), '# New Title\n\n新版中文精读。\n');
        await writeFile(path.join(resultDir, 'images/fig2.png'), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        return { sections: 2, images: 1 };
      },
    },
  });
  app = server;
  await new Promise<void>((resolve) => server.server.listen(0, '127.0.0.1', resolve));
  const address = server.server.address();
  assert.ok(address && typeof address === 'object');
  const route = `http://127.0.0.1:${address.port}/api/papers/L001/translation`;
  const post = (url: string, body: unknown) => fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const get = async () => (await fetch(route)).json() as Promise<PdfTranslationStatus>;

  // 缓存命中返回 200
  const cachedRes = await post(route, { model: modelId });
  assert.equal(cachedRes.status, 200);
  assert.equal(runs, 0);

  // 读取旧译本 Markdown、导出和图片资产（并验证拒绝路径穿越）
  const md = await (await fetch(`${route}/markdown?key=${oldKey}`)).json() as PdfTranslationMarkdown;
  assert.match(md.text, /旧版中文精读/);
  const assetOk = await fetch(`${route}/asset?key=${oldKey}&file=fig1.png`);
  assert.equal(assetOk.status, 200);
  assert.equal((await fetch(`${route}/asset?key=${oldKey}&file=../result.json`)).status, 400);
  const exported = await fetch(`${route}/file?key=${oldKey}&download=1`);
  assert.equal(exported.status, 200);
  assert.match(await exported.text(), /旧版中文精读/);

  // 重新生成
  const regenRes = await post(route, { model: modelId, regenerate: true });
  assert.equal(regenRes.status, 202);
  const started = await regenRes.json() as PdfTranslationStatus;
  assert.ok(started.job);
  const newKey = started.job.key;
  assert.notEqual(newKey, oldKey);
  publish.resolve();
  const ready = await waitFor(get, (state) => ['completed', 'failed'].includes(state.job?.status ?? ''));
  assert.equal(ready.job?.status, 'completed', ready.job?.error);
  assert.equal(ready.result?.key, newKey);
  const newMd = await (await fetch(`${route}/markdown?key=${newKey}`)).json() as PdfTranslationMarkdown;
  assert.match(newMd.text, /新版中文精读/);

  // 取消与失败均保留上次成功的译本
  operation = 'cancel';
  const cancelStart = await (await post(route, { model: modelId, regenerate: true })).json() as PdfTranslationStatus;
  assert.equal((await post(`${route}/cancel`, { jobId: cancelStart.job?.id })).status, 202);
  assert.equal((await waitFor(get, (s) => s.job?.status === 'cancelled')).result?.key, newKey);

  operation = 'fail';
  await post(route, { model: modelId, regenerate: true });
  const failed = await waitFor(get, (s) => s.job?.status === 'failed');
  assert.match(failed.job?.error ?? '', /合成翻译任务失败/);
  assert.equal(failed.result?.key, newKey);
  assert.deepEqual(await readdir(path.join(root, '.zhiyue/tmp')), []);
});
