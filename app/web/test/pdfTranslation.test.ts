import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createApp } from '../src/server.js';
import { resolveTranslationPython } from '../src/lib/pdfTranslation.js';
import { resolvePython } from '../src/lib/python.js';
import { runTranslationWorker } from '../src/lib/pdfTranslationWorker.js';
import type { TranslationModel } from '../src/lib/pdfTranslationWorker.js';
import type { PdfTranslationStatus } from '../src/lib/pdfTranslationTypes.js';

const modelId = 'test/translator';
const model = { id: modelId, fingerprint: modelId, complete: async () => '' };
const sha256 = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');

function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

async function waitFor<T>(read: () => Promise<T>, condition: (value: T) => boolean): Promise<T> {
  for (let count = 0; count < 100; count++) {
    const state = await read();
    if (condition(state)) return state;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('翻译任务状态等待超时。');
}

test('更新译本时旧键仍可预览、导出，成功后按当前指纹命中缓存', { timeout: 30_000 }, async (t) => {
  const python = resolvePython();
  if (spawnSync(python, ['-c', 'import pypdf, pdfplumber, pypdfium2'], { windowsHide: true }).status !== 0) {
    return t.skip('译本发布和预览需要文献库 Python 依赖。');
  }
  const root = await mkdtemp(path.join(os.tmpdir(), 'zhiyue-translation-'));
  const apps: Awaited<ReturnType<typeof createApp>>[] = [];
  const stopped = gate();
  const publish = gate();
  t.after(async () => {
    stopped.resolve();
    publish.resolve();
    await Promise.all(apps.map((app) => app.close()));
    await rm(root, { recursive: true, force: true });
  });
  await mkdir(path.join(root, '.zhiyue/catalog'), { recursive: true });
  await mkdir(path.join(root, 'papers'));
  await writeFile(path.join(root, '.zhiyue/catalog/文献索引.json'), JSON.stringify({ records: [
    { literature_id: 'L001', file: 'papers/a.pdf' }, { literature_id: 'L002', file: 'papers/b.pdf' },
  ] }));
  const source = path.join(root, 'papers/a.pdf');
  const rendered = spawnSync(python, [path.resolve('app/desktop/test/fixtures/make_pdf.py'), source,
    path.join(root, 'fixture.json'), 'Cached PDF fixture', 'A. Example', '10.1000/example', '2026'], {
    encoding: 'utf8', windowsHide: true, timeout: 5000,
  });
  assert.equal(rendered.status, 0, rendered.stderr || rendered.error?.message);
  const original = await readFile(source);
  const sourceHash = sha256(original);
  const oldKey = sha256(JSON.stringify([sourceHash, model.fingerprint, 'babeldoc-0.7.1-zh-CN-2']));
  const old = Buffer.concat([original, Buffer.from('\n% previous translation\n')]);
  const translated = Buffer.concat([original, Buffer.from('\n% updated translation\n')]);
  const baseDir = path.join(root, '.zhiyue/data/translations/L001');
  for (const [key, completedAt] of [['a'.repeat(64), '2000-01-01T00:00:00Z'], [oldKey, '2999-01-01T00:00:00Z']]) {
    const cached = path.join(baseDir, key);
    await mkdir(cached, { recursive: true });
    await writeFile(path.join(cached, 'result.json'), JSON.stringify({
      key, sourceHash, completedAt, model: modelId, pages: 2, reviewPages: [],
    }));
    await writeFile(path.join(cached, 'zh.pdf'), old);
  }
  await writeFile(path.join(root, 'papers/b.pdf'), original);
  let runs = 0;
  let operation: 'cancel' | 'fail' | 'publish' = 'cancel';
  let currentModel = model;
  const waiting = gate();
  const start = async (): Promise<string> => {
    const app = await createApp({ root, connectPi: false, translation: {
      getModel: () => currentModel, enginePython: process.execPath,
      worker: async ({ work, signal, progress }) => {
        runs++;
        progress(50, '翻译与排版');
        if (operation === 'fail') throw new Error('合成更新任务失败');
        if (operation === 'cancel') {
          waiting.resolve();
          if (!signal.aborted) {
            await new Promise<void>((resolve) => signal.addEventListener('abort', () => resolve(), { once: true }));
          }
          await stopped.promise;
          signal.throwIfAborted();
        }
        await publish.promise;
        await mkdir(path.join(work, 'result'));
        await writeFile(path.join(work, 'result', 'zh.pdf'), translated);
        return { pages: 2, reviewPages: [2] };
      },
    } });
    apps.push(app);
    await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve));
    const address = app.server.address();
    assert.ok(address && typeof address === 'object');
    return `http://127.0.0.1:${address.port}/api/papers`;
  };
  let base = await start();
  const route = (id = 'L001') => `${base}/${id}/translation`;
  const get = async () => (await fetch(route())).json() as Promise<PdfTranslationStatus>;
  const post = (url: string, body: unknown) => fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const submit = async (code = 202) => {
    const response = await post(route(), { model: modelId });
    assert.equal(response.status, code);
    return response.json() as Promise<PdfTranslationStatus>;
  };
  const exported = async (key: string, expected: Buffer) => {
    const response = await fetch(`${route()}/file?key=${key}&download=1`);
    assert.equal(response.status, 200);
    assert.match(String(response.headers.get('content-disposition')), /^attachment/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected);
  };
  assert.equal((await post(route(), { model: 'test/different' })).status, 409);
  assert.equal((await fetch(`${route()}/file?key=arbitrary.pdf`)).status, 400);
  assert.equal((await get()).result?.key, oldKey);
  assert.equal((await get()).updateAvailable, true);

  const first = await submit();
  assert.ok(first.job);
  assert.equal(first.result?.key, oldKey);
  assert.equal((await submit()).job?.id, first.job.id);
  await waiting.promise;
  const preview = await fetch(`${base}/L001/preview?page=2&translation=${oldKey}`);
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get('x-pdf-pages'), '2');
  assert.equal(Buffer.from(await preview.arrayBuffer()).subarray(1, 4).toString(), 'PNG');
  const layer = await fetch(`${base}/L001/text-layer?page=2&translation=${oldKey}`);
  assert.equal(layer.status, 200);
  assert.match((await layer.json()).text, /Cached PDF fixture/);
  await exported(oldKey, old);
  try {
    const stopping = await post(`${route()}/cancel`, { jobId: first.job.id });
    assert.equal(stopping.status, 202);
    const status = await stopping.json() as PdfTranslationStatus;
    assert.equal(status.job?.status, 'cancelling');
    assert.equal(status.result?.key, oldKey);
    assert.equal((await post(route('L002'), { model: modelId })).status, 409);
  } finally { stopped.resolve(); }
  await waitFor(get, (state) => state.job?.status === 'cancelled');
  assert.equal((await get()).result?.key, oldKey);
  await exported(oldKey, old);

  operation = 'fail';
  assert.equal((await submit()).result?.key, oldKey);
  const failed = await waitFor(get, (state) => state.job?.status === 'failed');
  assert.match(failed.job?.error ?? '', /合成更新任务失败/);
  assert.equal(failed.result?.key, oldKey);
  await exported(oldKey, old);

  operation = 'publish';
  const updating = await submit();
  assert.equal(updating.result?.key, oldKey);
  assert.notEqual(updating.job?.key, oldKey);
  await exported(oldKey, old);
  publish.resolve();
  const ready = await waitFor(get, (state) => state.job?.status === 'completed' || state.job?.status === 'failed');
  assert.equal(ready.job?.status, 'completed', ready.job?.error);
  assert.ok(ready.result);
  assert.equal(ready.result.key, updating.job?.key);
  assert.deepEqual(ready.result.reviewPages, [2]);
  assert.equal(ready.updateAvailable, false);
  assert.equal((await submit(200)).job, null);
  assert.equal(runs, 3);
  await exported(ready.result.key, translated);
  await exported(oldKey, old);
  assert.deepEqual(await readdir(path.join(root, '.zhiyue/tmp')), []);
  assert.deepEqual(await readFile(source), original);
  currentModel = { ...model, fingerprint: 'same-id-new-config' };
  assert.equal((await get()).updateAvailable, true);
  assert.equal((await get()).result?.key, oldKey);
  currentModel = model;

  await apps[0]?.close();
  base = await start();
  assert.equal((await get()).result?.key, ready.result.key);
  assert.equal((await submit(200)).result?.key, ready.result.key);
  assert.equal((await fetch(`${route('L002')}/file?key=${ready.result.key}`)).status, 404);
  await writeFile(source, '%PDF-1.7\nreplacement PDF\n%%EOF');
  assert.equal((await get()).result, null);
  for (const key of [oldKey, ready.result.key]) {
    assert.equal((await fetch(`${route()}/file?key=${key}`)).status, 404);
  }
});

test('模型重试后仍改变段落内数值时停止发布', async (t) => {
  const work = await mkdtemp(path.join(os.tmpdir(), 'zhiyue-translation-pipe-'));
  t.after(() => rm(work, { recursive: true, force: true }));
  const script = path.join(work, 'mock.cjs');
  const event = { type: 'request', id: 1, mode: 'batch',
    text: '## Translation\n## Here is the input:\n' + JSON.stringify([{ id: 7, input: 'Result <b1> is 12 [3].' }]) };
  await writeFile(script, `console.log(${JSON.stringify(JSON.stringify(event))}); process.stdin.resume();`);
  const attempts: Array<boolean | undefined> = [];
  await assert.rejects(runTranslationWorker({
    python: process.execPath, script, source: 'unused.pdf', sourceHash: '', work,
    model: { ...model, complete: async (_mode, _text, _signal, retry) => {
      attempts.push(retry);
      return JSON.stringify([{ id: 7, output: '结果 <b1> 是 21 [3]。' }]);
    } },
    signal: AbortSignal.timeout(5000), progress: () => {},
  }), /数字或引用不一致/);
  assert.deepEqual(attempts, [undefined, true]);
});

test('带上下文提示的单段请求只校验正文，重试后复原数字、编号和引用', async (t) => {
  const work = await mkdtemp(path.join(os.tmpdir(), 'zhiyue-translation-pipe-'));
  t.after(() => rm(work, { recursive: true, force: true }));
  const script = path.join(work, 'mock.cjs');
  const text = [
    '## Context / Hints',
    '1. The most recent title is: Results in 2025',
    "2. Formula placeholder hint:\n{'<b3>': 'x + 1'}",
    '',
    '## Output',
    '',
    'Output ONLY the translated zh-CN text. No explanations, no backticks, no extra text.',
    '',
    'Now translate the following text:',
    '',
    'The 4th study of COVID- 19 reported a <b3> of 12, 15 [5].',
  ].join('\n');
  const event = { type: 'request', id: 1, mode: 'batch', text };
  const output = '第4项研究报告了 COVID- 19 的 <b3> 为 12， 15 [5]。';
  const finish = { type: 'finish', pages: 1, reviewPages: [] };
  await writeFile(script, [
    `console.log(${JSON.stringify(JSON.stringify(event))});`,
    `process.stdin.once('data', (data) => {`,
    `  require('node:assert/strict').deepEqual(JSON.parse(data), ${JSON.stringify({ id: 1, text: output })});`,
    `  process.stdout.write(${JSON.stringify(`${JSON.stringify(finish)}\n`)}, () => process.exit(0));`,
    `});`,
  ].join('\n'));
  const result = await runTranslationWorker({
    python: process.execPath, script, source: 'unused.pdf', sourceHash: '', work,
    model: { ...model, complete: async (_mode, prompt, _signal, retry) => {
      if (!retry) {
        assert.equal(prompt, text);
        return '第四项研究报告了新冠肺炎的 <b3> 为 12，15 [5]。';
      }
      const header = text.slice(0, text.lastIndexOf('\n') + 1);
      assert.ok(prompt.startsWith(header));
      const protectedBody = prompt.slice(header.length);
      assert.ok(!protectedBody.includes('<b3>'));
      const [ordinal, identifier, formula, first, second, citation] =
        protectedBody.match(/\[\[ZHIYUE_KEEP_[a-f\d]+_\d+\]\]/g) ?? [];
      assert.ok(ordinal && identifier && formula && first && second && citation);
      return `第${ordinal}项研究报告了 ${identifier} 的 ${formula} 为 ${first}，${second} ${citation}。`;
    } },
    signal: AbortSignal.timeout(5000), progress: () => {},
  });
  assert.deepEqual(result, { pages: 1, reviewPages: [] });
});

test('英文日期可以用中文年月日表示，月日互换时仍拒绝译文', async (t) => {
  const work = await mkdtemp(path.join(os.tmpdir(), 'zhiyue-translation-date-'));
  t.after(() => rm(work, { recursive: true, force: true }));
  const script = path.join(work, 'mock.cjs');
  const input = [
    { id: 0, input: 'October 15th, 2007' },
    { id: 1, input: 'On 9 Mar. 2007, the study used 12 samples [4].' },
  ];
  const event = { type: 'request', id: 1, mode: 'batch', text: '\n## Here is the input:\n' + JSON.stringify(input) };
  const output = [
    { id: 0, output: '2007年10月15日' },
    { id: 1, output: '2007 年 3 月 9 日，研究使用了 12 个样本 [4]。' },
  ];
  const expected = { id: 1, text: JSON.stringify(output) };
  const finish = { type: 'finish', pages: 1, reviewPages: [] };
  await writeFile(script, [
    `console.log(${JSON.stringify(JSON.stringify(event))});`,
    'process.stdin.once("data", (data) => {',
    `  require('node:assert/strict').deepEqual(JSON.parse(data), ${JSON.stringify(expected)});`,
    `  process.stdout.write(${JSON.stringify(`${JSON.stringify(finish)}\n`)}, () => process.exit(0));`,
    '});',
  ].join('\n'));
  const translate = (complete: TranslationModel['complete']) => runTranslationWorker({
    python: process.execPath, script, source: 'unused.pdf', sourceHash: '', work,
    model: { ...model, complete }, signal: AbortSignal.timeout(5000), progress: () => {},
  });
  const ready = await translate(async (_mode, _text, _signal, retry) => {
    assert.equal(retry, undefined);
    return JSON.stringify(output);
  });
  assert.deepEqual(ready, { pages: 1, reviewPages: [] });

  const attempts: Array<boolean | undefined> = [];
  await assert.rejects(translate(async (_mode, text, _signal, retry) => {
    attempts.push(retry);
    if (retry) {
      const protectedInput = JSON.parse(text.split('\n## Here is the input:\n')[1]!);
      assert.deepEqual(protectedInput.map(({ id }: { id: number }) => id), [1]);
      assert.match(protectedInput[0].input, /^On \[\[ZHIYUE_KEEP_[a-f0-9]+_\d+\]\], the study used/u);
      return JSON.stringify([{ id: 1, output: '2007 年 9 月 3 日，研究使用了 12 个样本 [4]。' }]);
    }
    return JSON.stringify([output[0], { id: 1, output: '2007 年 9 月 3 日，研究使用了 12 个样本 [4]。' }]);
  }), /数字或引用不一致/);
  assert.deepEqual(attempts, [undefined, true]);
});

test('模型重复引用时只重试受影响段落，并按原顺序合并', async (t) => {
  const work = await mkdtemp(path.join(os.tmpdir(), 'zhiyue-translation-citation-'));
  t.after(() => rm(work, { recursive: true, force: true }));
  const script = path.join(work, 'mock.cjs');
  const input = [
    { id: 4, input: 'Categorical descriptors' },
    { id: 9, input: 'Mixed emotions are common. These are basic emotions <b4>.',
      formula_placeholders_hint: "{'<b4>': '[31]'}" },
  ];
  const header = '\n## Here is the input:\n';
  const event = { type: 'request', id: 1, mode: 'batch', text: header + JSON.stringify(input) };
  const good = { id: 4, output: '类别描述' };
  const expected = { id: 1, text: JSON.stringify([good, { id: 9, output: '混合情绪很常见。这些是基本情绪 <b4>。' }]) };
  const finish = { type: 'finish', pages: 1, reviewPages: [] };
  await writeFile(script, [
    `console.log(${JSON.stringify(JSON.stringify(event))});`,
    'process.stdin.once("data", (data) => {',
    `  require('node:assert/strict').deepEqual(JSON.parse(data), ${JSON.stringify(expected)});`,
    `  process.stdout.write(${JSON.stringify(`${JSON.stringify(finish)}\n`)}, () => process.exit(0));`,
    '});',
  ].join('\n'));
  const result = await runTranslationWorker({
    python: process.execPath, script, source: 'unused.pdf', sourceHash: '', work,
    model: { ...model, complete: async (_mode, text, _signal, retry) => {
      if (!retry) return JSON.stringify([{ id: 9, output: '混合情绪 <b4> 很常见。这些是基本情绪 <b4>。' }, good]);
      const paragraphs = JSON.parse(text.slice(header.length));
      assert.deepEqual(paragraphs.map(({ id }: { id: number }) => id), [9]);
      assert.equal(paragraphs[0].formula_placeholders_hint, input[1].formula_placeholders_hint);
      assert.ok(!paragraphs[0].input.includes('<b4>'));
      const token = paragraphs[0].input.match(/\[\[ZHIYUE_KEEP_[a-f\d]+_\d+\]\]/u)?.[0];
      assert.ok(token);
      return JSON.stringify([{ id: 9, output: `混合情绪很常见。这些是基本情绪 ${token}。` }]);
    } },
    signal: AbortSignal.timeout(5000), progress: () => {},
  });
  assert.deepEqual(result, { pages: 1, reviewPages: [] });
});

test('Python 翻译入口将原生库的标准输出移出事件通道', (t) => {
  const python = resolvePython();
  if (spawnSync(python, ['-c', 'import os'], { windowsHide: true }).status !== 0) {
    return t.skip('翻译进程测试需要 Python。');
  }
  const probe = [
    'import os, runpy, sys',
    'script = sys.argv[1]',
    'helper = runpy.run_path(script)',
    'def translate(args):',
    '    os.write(1, b"native font diagnostic\\n")',
    '    helper["send"]("finish", pages=1, reviewPages=[])',
    'helper["main"].__globals__["translate"] = translate',
    'sys.argv = [script, "translate", "--source", "x", "--work", "x", "--source-hash", "x"]',
    'sys.exit(helper["main"]())',
  ].join('\n');
  const helper = path.resolve('app/web/src/lib/translate_pdf.py');
  const result = spawnSync(python, ['-X', 'utf8', '-c', probe, helper], {
    encoding: 'utf8', windowsHide: true, timeout: 5000,
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stderr, /native font diagnostic/);
  assert.deepEqual(JSON.parse(result.stdout), { type: 'finish', pages: 1, reviewPages: [] });
});

function runPython(python: string, script: string, ...args: string[]): void {
  const result = spawnSync(python, ['-X', 'utf8', path.resolve('app/web/test/fixtures', script), ...args], {
    encoding: 'utf8', windowsHide: true, timeout: 20_000,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
  assert.equal(result.status, 0, result.error?.message || result.stderr);
}

test('按视觉栏序识别编号和作者年份式参考文献，排除非书目并验证条目区域', (t) => {
  const python = resolvePython();
  if (spawnSync(python, ['-c', 'import sys'], { windowsHide: true }).status !== 0) {
    return t.skip('参考文献版式测试需要 Python。');
  }
  runPython(python, 'pdf_references_test.py');
});

const engineSkip = process.env.ZHIYUE_TEST_PDF_ENGINE !== '1' && '设置 ZHIYUE_TEST_PDF_ENGINE=1 启用本机排版测试';

test('保留裁切与旋转，错排时恢复原页文字与图形', { skip: engineSkip, timeout: 25_000 }, async (t) => {
  const work = await mkdtemp(path.join(os.tmpdir(), 'zhiyue-pdf-recovery-'));
  t.after(() => rm(work, { recursive: true, force: true }));
  runPython(resolveTranslationPython(), 'pdf_translation_engine.py', 'recovery', work);
});

test('轻微越栏只收窄可定位的书目行，保留中文文字、邻栏、图形和链接', {
  skip: engineSkip, timeout: 25_000,
}, async (t) => {
  const work = await mkdtemp(path.join(os.tmpdir(), 'zhiyue-pdf-spill-'));
  t.after(() => rm(work, { recursive: true, force: true }));
  runPython(resolveTranslationPython(), 'pdf_translation_engine.py', 'spill', work);
});

test('按原栏居中单行章节标题，并保留左对齐或存在遮挡的标题', {
  skip: engineSkip, timeout: 25_000,
}, async (t) => {
  const work = await mkdtemp(path.join(os.tmpdir(), 'zhiyue-pdf-headings-'));
  t.after(() => rm(work, { recursive: true, force: true }));
  runPython(resolveTranslationPython(), 'pdf_translation_engine.py', 'headings', work);
});

test('BabelDOC 实际排版保留栏序和独立编号，并生成可复制中文', {
  skip: engineSkip, timeout: 180_000,
}, async (t) => {
  const python = resolveTranslationPython();
  const work = await mkdtemp(path.join(os.tmpdir(), 'zhiyue-pdf-engine-'));
  t.after(() => rm(work, { recursive: true, force: true }));
  const source = path.join(work, 'fixture.pdf');
  runPython(python, 'pdf_translation_engine.py', 'create', source);
  const sourceHash = sha256(await readFile(source));
  const batch = '\n## Here is the input:\n';
  const body = 'Now translate the following text:\n\n';
  const translate = (text: string) => text.replace(/\b(?:Research|study)\b/gi, '研究')
    .replace(/\b(?:results?|reports?)\b/gi, '结果')
    .replace(/\b(?:methods?|testing)\b/gi, '方法')
    .replace(/\b(?:references|abstract|vectors?)\b/gi, (word) => (
      { references: '参考文献', abstract: '摘要' }[word.toLowerCase()] ?? '向量'
    ));
  const result = await runTranslationWorker({
    python, script: path.resolve('app/web/src/lib/translate_pdf.py'), source, sourceHash, work,
    model: { ...model, complete: async (mode, prompt) => {
      if (mode === 'batch' && prompt.includes(batch)) {
        const entries = JSON.parse(prompt.split(batch).at(-1)!) as Array<{ id: number; input: string }>;
        return JSON.stringify(entries.map(({ id, input }) => ({ id, output: translate(input) })));
      }
      return translate(mode === 'batch' ? prompt.split(body).at(-1)! : prompt);
    } },
    signal: AbortSignal.timeout(165_000), progress: () => {},
  });
  assert.deepEqual(result, { pages: 2, reviewPages: [] });
  runPython(python, 'pdf_translation_engine.py', 'verify', source, path.join(work, 'result/zh.pdf'));
  assert.equal(sha256(await readFile(source)), sourceHash);
});
