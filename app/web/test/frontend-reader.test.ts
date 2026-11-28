import test from 'node:test';
import assert from 'node:assert/strict';
import { click, fixture, flush, input, until, window } from './helpers/frontendFixture.js';
import type { Json } from './helpers/frontendFixture.js';

test('Vue 阅读区保留 PDF 文字层与复制内容，其他面板更新不重建选中页', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(new Uint8Array([137, 80, 78, 71]), {
      headers: { 'Content-Type': 'image/png', 'X-PDF-Pages': '2' },
    });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const page = await fixture(t),
    { workspace } = page;
  click(page.$('[data-paper="L001"]'));
  await until(() => page.$('.pdf-text-layer span'));
  const word = page.$('.pdf-text-layer span')!;
  const range = document.createRange();
  range.selectNodeContents(word);
  document.getSelection()!.removeAllRanges();
  document.getSelection()!.addRange(range);
  const clipboard: Record<string, string> = {};
  const copy = new Event('copy', { bubbles: true, cancelable: true });
  Object.defineProperty(copy, 'clipboardData', {
    value: {
      setData: (type: string, text: string) => {
        clipboard[type] = text;
      },
    },
  });
  word.dispatchEvent(copy);
  assert.equal(clipboard['text/plain'], 'Selectable ');
  workspace.state.draft = '不应重新加载 PDF';
  workspace.state.context.add('L002');
  await flush();
  assert.equal(page.$('.pdf-text-layer span'), word);
  assert.equal(document.getSelection()!.toString(), 'Selectable ');
  assert.equal(workspace.state.papers[0].readStatus, 'unread');
});

for (const responseFirst of [true, false]) {
  test(`已有译本在首图${responseFirst ? '之前' : '之后'}返回时保留原文会话`, async (t) => {
    const originalFetch = globalThis.fetch;
    let finishImage!: () => void;
    let finishStatus!: () => void;
    let previews = 0;
    const image = new Promise<void>((resolve) => { finishImage = resolve; });
    const status = new Promise<void>((resolve) => { finishStatus = resolve; });
    globalThis.fetch = async () => {
      previews++;
      await image;
      return new Response(new Blob(['pdf']), { headers: { 'Content-Type': 'image/png', 'X-PDF-Pages': '1' } });
    };
    t.after(() => { finishImage(); finishStatus(); globalThis.fetch = originalFetch; });
    const page = await fixture(t, {
      pdfTranslation: { result: { key: 'a'.repeat(64) }, job: null },
      translationApi: async (call, next) => {
        if (call.path === '/api/papers/L001/translation') await status;
        return next();
      },
    });
    click(page.$('[data-paper="L001"]'));
    await until(() => previews === 1);
    const session = page.workspace.state.pdfSession;
    if (responseFirst) finishStatus();
    else finishImage();
    if (responseFirst) await until(() => !page.$('[data-reader-mode="translation"]').disabled);
    finishImage();
    await until(() => page.$('.pdf-text-layer span'));
    const word = page.$('.pdf-text-layer span');
    const sheet = page.$('.pdf-page-sheet');
    const root = page.$('#reader-content');
    root.scrollTop = 17;
    const range = document.createRange();
    range.selectNodeContents(word);
    document.getSelection()!.removeAllRanges();
    document.getSelection()!.addRange(range);
    finishStatus();
    await until(() => !page.$('[data-reader-mode="translation"]').disabled);
    assert.equal(page.workspace.state.pdfSession, session);
    assert.equal(page.$('.pdf-page-sheet'), sheet);
    assert.equal(root.scrollTop, 17);
    assert.equal(document.getSelection()!.toString(), 'Selectable ');
    assert.equal(previews, 1);
    assert.equal(page.calls.filter((call) => call.path.includes('/text-layer?')).length, 1);
  });
}

test('切换文献后旧译本状态返回时保留新文献首页', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(new Blob(['pdf']), {
    headers: { 'Content-Type': 'image/png', 'X-PDF-Pages': '1' },
  });
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => { release = resolve; });
  t.after(() => { release(); globalThis.fetch = originalFetch; });
  const page = await fixture(t, {
    pdfTranslation: { result: { key: 'a'.repeat(64) }, job: null },
    translationApi: async (call, next) => {
      if (call.path === '/api/papers/L001/translation') await delayed;
      return next();
    },
  });
  click(page.$('[data-paper="L001"]'));
  await until(() => page.calls.some(({ path }) => path === '/api/papers/L001/translation'));
  click(page.$('[data-paper="L002"]'));
  await until(() => page.workspace.state.pdfSession?.paper.literature_id === 'L002' && page.$('.pdf-page-image'));
  const sheet = page.$('.pdf-page-sheet');
  release();
  await flush();
  assert.equal(page.workspace.state.pdfTranslation, '');
  assert.equal(page.$('.pdf-page-sheet'), sheet);
});

test('重复选择当前论文时返回正文并保留阅读进度', async (t) => {
  const page = await fixture(t);
  const { state } = page.workspace;
  page.workspace.selectPaper('L002');
  state.readerMode = 'note';
  state.pdfPage = 7;
  state.pdfZoom = 150;
  await flush();
  const node = page.$('#reader-content');
  click(page.$('[data-paper="L002"]'));
  await flush();
  assert.equal(document.activeElement, node);
  assert.equal(state.readerMode, 'note');
  assert.equal(state.pdfPage, 7);
  assert.equal(state.pdfZoom, 150);
});

test('连续阅读拖选多行标题时，选区与复制内容只包含标题', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(new Blob(['pdf']), {
    headers: { 'content-type': 'image/png', 'X-PDF-Pages': '1' },
  });
  t.after(() => { globalThis.fetch = originalFetch; });
  const word = (text: string, x: number, y: number, width: number) => ({ text, x, y, width, height: 14 });
  const page = await fixture(t, { pdfTextLines: [
    { words: [word('Journal header', 20, 15, 70)] },
    { words: [word('REVIEW', 23, 80, 52)] },
    { words: [word('Article', 20, 110, 50), word('title', 74, 110, 35)] },
    { words: [word('second line', 20, 130, 64)] },
    { words: [word('Authors', 20, 154, 52)] },
  ] });
  click(page.$('[data-paper="L001"]'));
  await until(() => page.$('.pdf-text-layer span'));
  const root = page.$('#reader-content');
  const layer = page.$('.pdf-text-layer');
  const visible = new window.DOMRect(100, 50, 600, 800);
  root.getBoundingClientRect = () => visible;
  layer.getBoundingClientRect = () => visible;
  const drag = (x1: number, y1: number, x2: number, y2: number): string => {
    const emit = (target: EventTarget, type: string, clientX: number, clientY: number, buttons: number): void => {
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY, buttons }));
    };
    emit(layer, 'mousedown', x1, y1, 1);
    emit(document, 'mousemove', x2, y2, 1);
    emit(document, 'mouseup', x2, y2, 0);
    const copy = new Event('copy', { bubbles: true, cancelable: true });
    let copied = '';
    Object.defineProperty(copy, 'clipboardData', { value: { setData: (_type: string, data: string) => { copied = data; } } });
    root.dispatchEvent(copy);
    return copied;
  };
  assert.equal(drag(138, 282, 274, 322), 'Article title\nsecond line');
  assert.equal(drag(274, 322, 138, 282), 'Article title\nsecond line');
  assert.equal(drag(106, 282, 274, 322), '');
});

// 删除笔记只在用户确认后调接口，确认框默认拒绝不产生请求。

test('阅读笔记可删除，取消确认不发请求', async (t) => {
  const page = await fixture(t),
    { workspace } = page;
  const confirmations: string[] = [];
  let answer = false;
  window.confirm = ((message: string) => {
    confirmations.push(message);
    return answer;
  }) as typeof window.confirm;
  t.after(() => {
    delete (window as { confirm?: unknown }).confirm;
  });
  click(page.$('[data-paper="L001"]'));
  await flush();
  click(page.$('[data-reader-mode="note"]'));
  await until(() => page.$('.note-document'));
  assert.match(page.$('.note-document').textContent, /正文内容/);
  const remove = page.$('#delete-note');
  assert.equal(remove.getAttribute('aria-label'), '删除当前笔记');

  click(remove);
  await flush();
  assert.equal(confirmations.length, 1);
  assert.match(confirmations[0], /L001_测试笔记/);
  assert.equal(page.calls.some((call) => call.path === '/api/notes/delete'), false);
  assert.equal(workspace.state.papers[0].notes.length, 1);

  answer = true;
  click(page.$('#delete-note'));
  await until(() => page.calls.some((call) => call.path === '/api/notes/delete'));
  await until(() => !page.$('#delete-note'));
  assert.deepEqual(
    page.calls.find((call) => call.path === '/api/notes/delete').body,
    { path: 'notes/L001_测试笔记.md' },
  );
  assert.equal(workspace.state.papers[0].notes.length, 0);
  assert.equal(workspace.state.notePath, '');
  assert.match(page.$('#reader-content').textContent, /阅读笔记尚待积累/);
  assert.match(page.$('.toast-region').textContent, /回收站/);
});

test('高像素密度下升级 PDF 页图，替换成功或失败都保留选区', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalRatio = window.devicePixelRatio;
  const scales: string[] = [];
  let finishUpgrade: (response: Response) => void = () => {};
  const png = () => new Response(new Blob(['pdf']), {
    headers: { 'Content-Type': 'image/png', 'X-PDF-Pages': '1' },
  });
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 });
  globalThis.fetch = async (url) => {
    const scale = new URL(String(url), 'http://localhost').searchParams.get('scale') ?? '';
    scales.push(scale);
    if (scale === '1600') return png();
    if (scale === '2400') return new Promise((resolve) => { finishUpgrade = resolve; });
    return new Response(null, { status: 500 });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: originalRatio });
    document.getSelection()!.removeAllRanges();
  });
  const page = await fixture(t);
  click(page.$('[data-paper="L001"]'));
  await until(() => page.$('.pdf-text-layer span'));
  const sheet = page.$('.pdf-page-sheet') as HTMLElement;
  sheet.getBoundingClientRect = () => {
    const zoom = parseFloat(sheet.style.width) / 100;
    return new window.DOMRect(0, 0, 600 * zoom, 800 * zoom);
  };
  const root = page.$('#reader-content');
  const originalImage = page.$('.pdf-page-image');
  const word = page.$('.pdf-text-layer span');
  const range = document.createRange();
  range.selectNodeContents(word);
  document.getSelection()!.addRange(range);
  root.dispatchEvent(new Event('scroll'));
  await until(() => scales.includes('2400'));
  assert.equal(page.$('.pdf-page-image'), originalImage);
  finishUpgrade(png());
  await until(() => page.$('.pdf-page-image') !== originalImage);
  const sharpImage = page.$('.pdf-page-image');
  assert.equal(page.$('.pdf-text-layer span'), word);
  assert.equal(document.getSelection()!.toString(), 'Selectable ');
  click(page.$('[data-pdf-zoom="50"]'));
  await until(() => scales.includes('4000') && page.workspace.state.pdfSession?.running === 0);
  root.dispatchEvent(new Event('scroll'));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  assert.deepEqual(scales, ['1600', '2400', '4000']);
  assert.equal(page.$('.pdf-page-image'), sharpImage);
  assert.equal(document.getSelection()!.toString(), 'Selectable ');
  assert.equal(page.calls.filter((call) => call.path.includes('/text-layer?')).length, 1);
});

test('翻译完成后自动进入中文精读视图，支持表格、插图、导出与左右对照', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(new Uint8Array([137, 80, 78, 71]), {
    headers: { 'Content-Type': 'image/png', 'X-PDF-Pages': '2' },
  });
  t.after(() => { globalThis.fetch = originalFetch; });
  const translation: Json = { engineAvailable: true, model: 'test/luna', result: null, job: null, updateAvailable: false };
  const page = await fixture(t, { pdfTranslation: translation });
  click(page.$('[data-paper="L001"]'));
  await until(() => page.$('.pdf-translation-bar button')?.textContent === '翻译成中文' && page.$('.pdf-page-image'));
  assert.equal(page.$('[data-reader-mode="translation"]').disabled, true);
  click(page.$('.pdf-translation-bar button'));
  await until(() => page.$('.pdf-translation-bar progress'));
  assert.deepEqual(page.calls.find(({ path, method }) => path.endsWith('/translation') && method === 'POST').body,
    { model: 'test/luna' });
  translation.result = { key: translation.job.key, sourceHash: 'a'.repeat(64), sections: 3, images: 1 };
  translation.job.status = 'completed';
  translation.job.percent = 100;
  page.workspace.receive({ type: 'pdfTranslation', revision: page.workspace.state.translationSnapshot.revision + 1,
    job: structuredClone(translation.job) });
  await until(() => page.$('.translation-document') && page.workspace.state.readerMode === 'translation');
  const article = page.$('.translation-document');
  assert.match(article.innerHTML, /Original Paper Title/);
  assert.match(article.innerHTML, /中文正文/);
  assert.equal(article.querySelector('table td:last-child')?.textContent, '0.95 � � 📖');
  assert.match(article.querySelector('img').getAttribute('src'), /\/translation\/asset\?key=.*&file=fig1\.png$/);
  assert.match(page.$('.pdf-translation-download').getAttribute('href'), /\/translation\/file\?key=.*&download=1$/);
  click(page.$('[data-reader-mode="split"]'));
  await until(() => page.$('.reader-split') && page.$('#reader-split-pdf .pdf-page-image') && page.$('#reader-split-translation .translation-document'));
  click(page.$('[data-reader-mode="pdf"]'));
  await until(() => page.workspace.state.readerMode === 'pdf' && page.$('.pdf-page-image'));
});

test('已有中文时可重新生成，失败或取消仍可阅读和导出旧译本', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(new Uint8Array([137, 80, 78, 71]), {
    headers: { 'Content-Type': 'image/png', 'X-PDF-Pages': '2' },
  });
  t.after(() => { globalThis.fetch = originalFetch; });
  const old = { key: 'b'.repeat(64), sourceHash: 'c'.repeat(64), sections: 3, images: 1 };
  const translation: Json = { engineAvailable: true, model: 'test/luna', result: old, job: null, updateAvailable: false };
  const page = await fixture(t, { pdfTranslation: translation });
  const { state } = page.workspace;
  const button = (text: string) => [...document.querySelectorAll('.pdf-translation-bar button')]
    .find((item) => item.textContent === text);
  const downloadKey = () => new URL(page.$('.pdf-translation-download').href).searchParams.get('key');
  const event = (job = translation.job) => page.workspace.receive({ type: 'pdfTranslation',
    revision: state.translationSnapshot.revision + 1, job: structuredClone(job) });
  const start = async () => {
    await until(() => !!button('重新生成中文'));
    click(button('重新生成中文'));
    await until(() => page.$('.pdf-translation-bar progress')?.value === 25 && !!button('取消'));
    assert.equal(button('重新生成中文'), undefined);
    await flush();
  };
  click(page.$('[data-paper="L001"]'));
  await until(() => button('重新生成中文') && page.$('.pdf-page-image'));
  assert.match(page.$('.pdf-translation-bar').textContent, /正文发送至 test\/luna/);
  click(page.$('[data-reader-mode="translation"]'));
  await until(() => page.$('.translation-document')?.textContent.includes(old.key.slice(0, 8)));

  await start();
  assert.equal(downloadKey(), old.key);
  click(button('取消'));
  await until(() => page.$('.pdf-translation-bar').textContent.includes('正在取消'));
  assert.equal(downloadKey(), old.key);
  translation.updateAvailable = true;
  Object.assign(translation.job, { status: 'cancelled', stage: '已取消' });
  event();
  await until(() => !!button('重新生成中文'));
  assert.equal(state.pdfTranslation, old.key);
  assert.equal(downloadKey(), old.key);

  await start();
  Object.assign(translation.job, { status: 'failed', error: '合成模型请求失败' });
  event();
  await until(() => page.$('.pdf-translation-error')?.textContent.includes('合成模型请求失败'));
  assert.equal(state.pdfTranslation, old.key);
  assert.equal(downloadKey(), old.key);

  await start();
  event({ ...translation.job, id: 'other-task', status: 'completed', percent: 100 });
  event({ ...translation.job, paperId: 'L002', status: 'completed', percent: 100 });
  await flush();
  assert.equal(page.$('.pdf-translation-bar progress').value, 25);
  const next = { ...old, key: translation.job.key };
  Object.assign(translation, { result: next, updateAvailable: false });
  Object.assign(translation.job, { status: 'saving', percent: 99 });
  event({ ...translation.job, status: 'completed', percent: 100 });
  await until(() => page.$('.pdf-translation-bar progress')?.value === 99);
  assert.equal(state.pdfTranslation, old.key);
  assert.equal(downloadKey(), old.key);
  Object.assign(translation.job, { status: 'completed', percent: 100 });
  event();
  await until(() => page.$('.translation-document')?.textContent.includes(next.key.slice(0, 8)));
  assert.equal(downloadKey(), next.key);
  assert.ok(button('重新生成中文'));
  const submissions = page.calls.filter(({ path, method }) => path.endsWith('/translation') && method === 'POST');
  assert.equal(submissions.length, 3);
  for (const { body } of submissions) assert.deepEqual(body, { model: 'test/luna', regenerate: true });
});

test('连续阅读中 Ctrl+滚轮缩放 PDF 页面，普通滚轮不受影响', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(new Uint8Array([137, 80, 78, 71]), {
      headers: { 'Content-Type': 'image/png', 'X-PDF-Pages': '2' },
    });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const page = await fixture(t);
  click(page.$('[data-paper="L001"]'));
  await until(() => page.$('.pdf-text-layer span'));
  const reader = page.$('#reader-content');
  const width = () => page.$('.pdf-page-sheet').style.width;
  const wheel = (deltaY: number, ctrlKey: boolean) => {
    const event = new window.WheelEvent('wheel', {
      deltaY,
      ctrlKey,
      bubbles: true,
      cancelable: true,
    });
    reader.dispatchEvent(event);
    return event;
  };
  assert.equal(width(), '100%');
  const plain = wheel(-100, false);
  await flush();
  assert.equal(width(), '100%');
  assert.equal(plain.defaultPrevented, false);
  const zoom = wheel(-100, true);
  await flush();
  assert.equal(width(), '110%');
  assert.equal(zoom.defaultPrevented, true);
  assert.match(page.$('#pdf-fit').textContent, /110%/);
  wheel(-100, true);
  await flush();
  assert.equal(width(), '120%');
  for (let index = 0; index < 20; index += 1) wheel(-100, true);
  await flush();
  assert.equal(width(), '200%');
  wheel(100, true);
  await flush();
  assert.equal(width(), '190%');
  for (let index = 0; index < 20; index += 1) wheel(100, true);
  await flush();
  assert.equal(width(), '100%');
  for (let index = 0; index < 24; index += 1) wheel(-4, true);
  await flush();
  assert.equal(width(), '100%');
  wheel(-4, true);
  await flush();
  assert.equal(width(), '110%');
  wheel(100, true);
  await flush();
  assert.equal(width(), '100%');
});
