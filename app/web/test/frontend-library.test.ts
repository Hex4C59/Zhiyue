import test from 'node:test';
import assert from 'node:assert/strict';
import { click, fixture, flush, input, until, window } from './helpers/frontendFixture.js';

test('Vue 3 挂载全部面板，文献筛选与收藏保留节点和未读状态', async (t) => {
  const page = await fixture(t);
  assert.match(page.version, /^3\./);
  assert.equal(page.$('.shell').dataset.framework, 'vue');
  assert.equal(page.target.querySelectorAll('[data-resize-panel]').length, 3);
  const paper = page.$('[data-paper="L001"]');
  click(paper.querySelector('button'));
  await flush();
  assert.equal(page.$('[data-paper="L001"]'), paper);
  assert.equal(page.workspace.state.papers[0].starred, true);
  assert.equal(page.workspace.state.papers[0].readStatus, 'unread');
  input(page.$('#search'), '另一个');
  await flush();
  assert.equal(page.target.querySelectorAll('[data-paper]').length, 1);
  assert.equal(page.$('[data-paper]').dataset.paper, 'L002');
});

test('文件夹导入忽略来源记录等非 PDF，并明确提示数量上限', async (t) => {
  const page = await fixture(t);
  const file = (name: string) => new File([new Uint8Array(16)], name, { type: 'application/octet-stream' });
  const drop = (files: any[], items: any[] = []) => {
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { items: [], files } });
    page.$('.import-file').dispatchEvent(event);
  };
  const openDialog = async () => {
    click(page.$('#import-paper'));
    await until(() => page.$('.import-file'));
  };
  const closeDialog = async () => {
    click(page.$('.import-head .icon-button'));
    await until(() => !page.$('.import-file'));
  };
  click(page.$('[data-panel="chat"]:is(button)'));
  await flush();
  assert.equal(page.$('#library-view').dataset.panel, 'chat');
  assert.ok(page.$('.topbar #import-paper'));
  await openDialog();
  assert.equal(page.$('#library-view').dataset.panel, 'chat');
  drop([file('a.pdf'), file('b.pdf'), file('a.来源.json'), file('notes.txt')]);
  await flush();
  assert.equal(page.target.querySelectorAll('.import-item').length, 2);
  assert.equal(page.$('.import-error'), null);
  await closeDialog();
  await openDialog();
  const many = [];
  for (let index = 0; index < 102; index += 1) many.push(file(`p${index}.pdf`));
  many.push(file('a.来源.json'));
  drop(many);
  await flush();
  assert.equal(page.target.querySelectorAll('.import-item').length, 100);
  assert.match(page.$('.import-error').textContent, /最多导入 100 个 PDF，其余 2 个未加入/);
  await closeDialog();
  await openDialog();
  drop([file('a.来源.json'), file('b.txt')]);
  await flush();
  assert.equal(page.target.querySelectorAll('.import-item').length, 0);
  assert.match(page.$('.import-error').textContent, /没有可导入的 PDF/);
});

test('文件夹导入按同名分类预选归档位置，手动选择不被覆盖', async (t) => {
  const page = await fixture(t);
  const file = (name: string, relative: string) => {
    const result = new File([new Uint8Array(16)], name, { type: 'application/pdf' });
    Object.defineProperty(result, 'webkitRelativePath', { value: relative });
    return result;
  };
  const drop = (files: any[], items: any[] = []) => {
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { items, files } });
    page.$('.import-file').dispatchEvent(event);
  };
  const openDialog = async () => {
    click(page.$('#import-paper'));
    await until(() => page.$('.import-file'));
  };
  const closeDialog = async () => {
    click(page.$('.import-head .icon-button'));
    await until(() => !page.$('.import-file'));
  };
  const category = () => page.$('.import-fields select').value;
  await openDialog();
  assert.equal(category(), 'papers/09_情感综述调研/网站导入');
  drop([file('a.pdf', '02_模型/a.pdf'), file('b.pdf', '02_模型/b.pdf')]);
  await flush();
  assert.equal(category(), 'papers/02_模型/网站导入');
  await closeDialog();
  await openDialog();
  drop([file('c.pdf', '超声/c.pdf')]);
  await flush();
  assert.equal(category(), 'papers/01_超声/网站导入');
  await closeDialog();
  await openDialog();
  const entry: any = { isFile: true, name: 'd.pdf', file: (resolve: (file: File) => void) => resolve(file('d.pdf', '')) };
  let reads = 0;
  const folder: any = {
    isDirectory: true,
    isFile: false,
    name: '模型',
    createReader: () => ({ readEntries: (resolve: (entries: any[]) => void) => resolve(reads++ ? [] : [entry]) }),
  };
  drop([], [{ kind: 'file', webkitGetAsEntry: () => folder }]);
  await flush();
  assert.equal(category(), 'papers/02_模型/网站导入');
  await closeDialog();
  await openDialog();
  const select = page.$('.import-fields select');
  select.value = 'papers/01_超声/网站导入';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  drop([file('e.pdf', '02_模型/e.pdf')]);
  await flush();
  assert.equal(category(), 'papers/01_超声/网站导入');
  await closeDialog();
  await openDialog();
  drop([file('f.pdf', '03_新主题/f.pdf')]);
  await flush();
  assert.equal(category(), 'papers/03_新主题/网站导入');
  const labels = [...page.$('.import-fields select').options].map((option) =>
    option.textContent.trim(),
  );
  assert.ok(labels.includes('新主题 / 网站导入（新建）'));
  await closeDialog();
  await openDialog();
  drop([file('g.pdf', 'a:b/g.pdf')]);
  await flush();
  assert.equal(category(), 'papers/09_情感综述调研/网站导入');
});


test('右键文件夹可新建子文件夹、重命名并导入 PDF', async (t) => {
  const page = await fixture(t);
  const { workspace } = page;
  workspace.state.categories = [{ id: '01_超声', name: '01_超声', count: 1, children: [] }];
  await flush();
  const open = (): void => {
    page.$('[data-category="01_超声"]').dispatchEvent(new window.MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: 80, clientY: 100,
    }));
  };
  await flush();
  open();
  await flush();
  const menu = document.querySelector('.category-menu');
  assert.ok(menu);
  assert.match(menu.textContent ?? '', /新建子文件夹/);
  click([...menu.querySelectorAll('button')].find((item) => /新建子文件夹/.test(item.textContent ?? '')));
  await flush();
  const childInput = page.$('.category-editor.category-child input');
  assert.ok(childInput);
  input(childInput, '实验数据');
  childInput.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await until(() => workspace.state.subcategory === '01_实验数据');
  assert.ok(page.calls.some((call) => call.path === '/api/categories' && call.body.parent === '01_超声'));
  assert.deepEqual(
    page.calls.find((call) => call.path === '/api/categories' && call.body.parent === '01_超声')?.body,
    { name: '实验数据', parent: '01_超声' },
  );
  assert.equal(workspace.state.category, '01_超声');
  assert.equal(workspace.state.subcategory, '01_实验数据');

  workspace.state.categories = [{ id: '01_超声', name: '01_超声', count: 1, children: [] }];
  await flush();
  open();
  await flush();
  const importMenu = document.querySelector('.category-menu');
  assert.ok(importMenu);
  click([...importMenu.querySelectorAll('button')].find((item) => /导入 PDF/.test(item.textContent ?? '')));
  await flush();
  assert.equal(workspace.state.importOpen, true);
  assert.equal(workspace.state.importCategory, 'papers/01_超声');
  assert.equal(page.$('.import-fields select')?.value, 'papers/01_超声');
  workspace.state.importOpen = false;
  workspace.state.importCategory = '';
  await flush();
  open();
  await flush();
  const renameMenu = document.querySelector('.category-menu');
  assert.ok(renameMenu);
  click([...renameMenu.querySelectorAll('button')].find((item) => /重命名/.test(item.textContent ?? '')));
  await flush();
  const renameInput = page.$('.category-editor:not(.category-child) input');
  assert.ok(renameInput);
  input(renameInput, '超声新名');
  renameInput.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await until(() => workspace.state.category === '01_超声新名');
  assert.ok(page.calls.some((call) => call.path === '/api/categories/rename'));
  assert.deepEqual(
    page.calls.find((call) => call.path === '/api/categories/rename')?.body,
    { category: '01_超声', subcategory: '', name: '超声新名' },
  );
  workspace.state.categories = [];
  workspace.state.category = '';
  await flush();
  page.$('[data-category=""]').dispatchEvent(new window.MouseEvent('contextmenu', {
    bubbles: true, cancelable: true, clientX: 60, clientY: 90,
  }));
  await flush();
  const allMenu = document.querySelector('.category-menu');
  assert.ok(allMenu);
  assert.match(allMenu.textContent ?? '', /汇总视图，不能重命名/);
  assert.doesNotMatch(allMenu.textContent ?? '', /重命名文件夹|重新命名|新建子文件夹/);
});

test('侧栏加号在列表末尾新建顶层文件夹', async (t) => {
  const page = await fixture(t);
  const { workspace } = page;
  workspace.state.categories = [{ id: '01_超声', name: '01_超声', count: 1, children: [] }];
  await flush();
  click(page.$('.category-add'));
  await flush();
  const list = document.querySelector('#categories');
  assert.ok(list);
  const editor = list.lastElementChild;
  assert.ok(editor);
  assert.equal(editor.className, 'category-editor');
  assert.ok(editor.querySelector('.editor-icon'));
  const field = editor.querySelector('input');
  assert.ok(field);
  input(field, '新主题');
  editor.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await until(() => workspace.state.category === '03_新主题');
  assert.deepEqual(
    page.calls.find((call) => call.path === '/api/categories' && call.method === 'POST')?.body,
    { name: '新主题' },
  );
  assert.equal(document.querySelector('#categories .category-editor'), null);
});

test('再次点击已选中的文件夹折叠子文件夹', async (t) => {
  const page = await fixture(t);
  const { workspace } = page;
  workspace.state.categories = [{
    id: '01_超声', name: '01_超声', count: 1,
    children: [{ id: '01_超声/01_子项', name: '01_子项', count: 0 }],
  }];
  await flush();
  const button = (): any => page.$('[data-category="01_超声"][data-subcategory=""] .category-button');
  click(button());
  await flush();
  assert.ok(page.$('[data-subcategory="01_子项"]'));
  assert.equal(button().getAttribute('aria-expanded'), 'true');
  click(button());
  await flush();
  assert.equal(page.$('[data-subcategory="01_子项"]'), null);
  assert.equal(button().getAttribute('aria-expanded'), 'false');
  assert.equal(workspace.state.category, '01_超声');
  click(button());
  await flush();
  assert.ok(page.$('[data-subcategory="01_子项"]'));
});

test('右键空文件夹先在应用内对话框确认，非空文件夹禁用删除', async (t) => {
  const page = await fixture(t);
  const { workspace } = page;
  workspace.state.categories = [{ id: '09_测试', name: '09_测试', count: 0, children: [] }];
  workspace.state.category = '09_测试';
  await flush();
  const open = (): void => {
    page.$('[data-category="09_测试"]').dispatchEvent(new window.MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: 80, clientY: 100,
    }));
  };
  const triggerDelete = async (): Promise<Element> => {
    open();
    await flush();
    const menu = document.querySelector('.category-menu');
    assert.ok(menu);
    const remove = [...menu.querySelectorAll('button')]
      .find((item) => /删除文件夹/.test(item.textContent ?? ''));
    assert.ok(remove);
    assert.equal(remove.disabled, false);
    click(remove);
    await flush();
    const dialog = document.querySelector('.confirm-dialog');
    assert.ok(dialog);
    return dialog;
  };
  const dialog = await triggerDelete();
  assert.match(dialog.textContent ?? '', /删除文件夹/);
  assert.match(dialog.textContent ?? '', /「测试」是空文件夹/);
  assert.match(dialog.textContent ?? '', /trash\/categories/);
  const cancel = [...dialog.querySelectorAll('button')]
    .find((item) => /取消/.test(item.textContent ?? ''));
  assert.ok(cancel);
  click(cancel);
  await until(() => !document.querySelector('.confirm-dialog'));
  assert.equal(page.calls.some((call) => call.path === '/api/categories/delete'), false);
  const again = await triggerDelete();
  const accept = again.querySelector('[data-confirm-accept]');
  assert.ok(accept);
  click(accept);
  await until(() => page.calls.some((call) => call.path === '/api/categories/delete'));
  assert.deepEqual(
    page.calls.find((call) => call.path === '/api/categories/delete')?.body,
    { category: '09_测试' },
  );
  await until(() => workspace.state.category === '');
  workspace.state.categories = [{ id: '09_测试', name: '09_测试', count: 2, children: [] }];
  await flush();
  open();
  await flush();
  const busyMenu = document.querySelector('.category-menu');
  assert.ok(busyMenu);
  const busyRemove = [...busyMenu.querySelectorAll('button')]
    .find((item) => /删除文件夹/.test(item.textContent ?? ''));
  assert.ok(busyRemove);
  assert.equal(busyRemove.disabled, true);
});

test('已结束的维护任务收进历史任务，进行中任务直接显示', async (t) => {
  const page = await fixture(t);
  page.workspace.state.jobs.set('job-old', {
    id: 'job-old',
    title: '刷新文献索引',
    status: 'completed',
    log: 'ok',
    createdAt: '2026-11-17T03:18:22.152Z',
    updatedAt: '2026-11-17T03:18:23.391Z',
  });
  click(page.$('[data-view="downloads"]'));
  await flush();
  const history = page.$('[data-job-history]');
  assert.ok(history);
  assert.equal(history.open, false);
  assert.match(history.textContent ?? '', /已完成任务/);
  assert.match(history.textContent ?? '', /刷新文献索引/);
  assert.ok(history.querySelector('details[data-job-details="job-old"]'));
  assert.equal(history.querySelector('[data-job-details="job-1"]'), null);
  assert.ok(page.$('#download-jobs > .job-card details[data-job-details="job-1"]'));
  // 有进行中任务时历史就在面板里，说明行不再提供入口。
  assert.equal(page.$('.download-intro .history-link'), null);
});

test('只有历史任务时收起任务面板，可从说明行展开和收起', async (t) => {
  const page = await fixture(t);
  click(page.$('[data-view="downloads"]'));
  await flush();
  page.workspace.state.jobs.clear();
  page.workspace.state.jobs.set('job-old', {
    id: 'job-old',
    title: '刷新文献索引',
    status: 'completed',
    log: 'ok',
    createdAt: '2026-11-17T03:18:22.152Z',
    updatedAt: '2026-11-17T03:18:23.391Z',
  });
  await flush();
  assert.equal(page.$('#downloads-view .download-results'), null);
  const link = page.$('.download-intro .history-link');
  assert.ok(link);
  assert.match(link.textContent ?? '', /历史任务（1）/);
  click(link);
  await flush();
  assert.ok(page.$('#refresh-downloads'));
  assert.ok(page.$('[data-job-history]'));

  click(page.$('.download-intro .history-link'));
  await flush();
  assert.equal(page.$('#downloads-view .download-results'), null);
});

test('没有任务与批次时不显示任务与批次区域', async (t) => {
  const page = await fixture(t);
  click(page.$('[data-view="downloads"]'));
  await flush();
  assert.ok(page.$('#refresh-downloads'));
  page.workspace.state.jobs.clear();
  page.workspace.state.batches = [];
  await flush();
  assert.equal(page.$('#refresh-downloads'), null);
  assert.equal(page.$('#downloads-view .download-results'), null);
  assert.equal(page.$('.job-history'), null);
  assert.equal(page.$('.download-intro .history-link'), null);
});

test('下载页空闲时单栏居中并显示流程，论文信息按行或 JSON 计数', async (t) => {
  const page = await fixture(t);
  click(page.$('[data-view="downloads"]'));
  await flush();
  page.workspace.state.jobs.clear();
  await flush();
  assert.ok(page.$('#downloads-view.idle'));
  assert.equal(page.target.querySelectorAll('.download-steps li').length, 4);
  assert.equal(page.$('.entry-count'), null);
  input(page.$('#download-input'), '10.1/a\n\n10.1/b');
  await flush();
  assert.equal(page.$('.entry-count').textContent.trim(), '2 条');
  input(page.$('#download-input'), '[{"doi":"10.1/a"},{"doi":"10.1/b"},{"doi":"10.1/c"}]');
  await flush();
  assert.equal(page.$('.entry-count').textContent.trim(), '3 条');
  input(page.$('#download-input'), '[{"doi":');
  await flush();
  assert.equal(page.$('.entry-count'), null);
  page.workspace.state.jobs.set('job-run', { id: 'job-run', title: '下载', status: 'running', log: '' });
  await flush();
  assert.equal(page.$('#downloads-view.idle'), null);
  assert.equal(page.$('.download-steps'), null);
  assert.ok(page.$('#download-jobs .status-badge.running'));
});

test('下载表单和任务日志保持用户状态，模型与正文内容不能注入 HTML', async (t) => {
  const page = await fixture(t),
    { workspace } = page;
  click(page.$('[data-view="downloads"]'));
  await flush();
  const details = page.$('[data-job-details="job-1"]');
  details.open = true;
  workspace.receive({ type: 'job', job: { id: 'job-1', status: 'running', log: 'updated' } });
  await flush();
  assert.equal(page.$('[data-job-details="job-1"]'), details);
  assert.equal(details.open, true);
  input(page.$('#download-input'), 'synthetic-title');
  page.$('#download-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  assert.equal(
    page.calls.find((call) => call.path === '/api/downloads' && call.method === 'POST').body.input,
    'synthetic-title',
  );
  workspace.state.chat = {
    id: 'safe-chat',
    messages: [
      {
        id: 'safe',
        role: 'assistant',
        text: '<img src=x onerror=alert(1)> [bad](javascript:alert)',
        status: 'completed',
      },
    ],
  };
  await flush();
  assert.equal(page.$('[data-message="safe"] img'), null);
  assert.equal(page.$('[data-message="safe"] a'), null);
});


test('当前阅读的文献存于服务端文件，并在重启后恢复', async (t) => {
  const page = await fixture(t);
  click(page.$('[data-paper="L002"]'));
  await flush();
  assert.equal(page.workspace.state.current, 'L002');
  assert.equal(page.ui.paperId, 'L002');
  page.unmount();
  page.target.remove();

  // 重新挂载并以同样的服务端状态读取，等价于重启应用：选中项与“当前打开”都要回来。
  const restarted = await fixture(t, { ui: page.ui });
  assert.equal(restarted.workspace.state.current, 'L002');
  assert.ok(restarted.workspace.state.context.has('L002'));

  // 索引里已不存在的编号不能凭存储复活。
  const stale = await fixture(t, { ui: { paperId: 'L999' } });
  assert.equal(stale.workspace.state.current, null);
});

test('拖动文献到分类文件夹完成移动，非法放置不发请求', async (t) => {
  const page = await fixture(t);
  const { workspace } = page;
  const categories = [
    { id: '01_超声', name: '01_超声', count: 1, children: [] },
    {
      id: '09_目标', name: '09_目标', count: 0,
      children: [{ id: '09_目标/01_子目录', name: '01_子目录', count: 0 }],
    },
  ];
  const setCategories = async (): Promise<void> => {
    workspace.state.categories = structuredClone(categories);
    await flush();
  };
  const drag = (selector: string, type: string): void => {
    const element = page.$(selector);
    assert.ok(element, selector);
    const event = new window.Event(type, { bubbles: true, cancelable: true });
    const store = new Map<string, string>();
    Object.defineProperty(event, 'dataTransfer', {
      value: {
        effectAllowed: '', dropEffect: '', types: [] as string[],
        setData: (key: string, value: string) => store.set(key, value),
        getData: (key: string) => store.get(key) ?? '',
      },
    });
    element.dispatchEvent(event);
  };
  const moves = () => page.calls.filter((call) => call.path === '/api/papers/L001/move');

  await setCategories();
  drag('[data-paper="L001"]', 'dragstart');
  await flush();
  assert.equal(workspace.state.draggingPaper, 'L001');
  assert.ok(page.$('[data-paper="L001"]').classList.contains('dragging'));
  assert.ok(page.$('[data-category="09_目标"][data-subcategory="01_子目录"]'), '拖动期间展开子文件夹');

  drag('[data-category="09_目标"][data-subcategory=""]', 'dragover');
  await flush();
  const target = page.$('[data-category="09_目标"][data-subcategory=""]');
  assert.ok(target.classList.contains('drop-target'));
  assert.equal(target.getAttribute('data-drop-target'), 'true');
  drag('[data-category="09_目标"][data-subcategory=""]', 'drop');
  await until(() => moves().length === 1);
  assert.deepEqual(moves()[0].body, { category: '09_目标' });
  await until(() => workspace.state.movingPaper === '');
  assert.equal(workspace.state.draggingPaper, '');
  assert.ok(page.calls.filter((call) => call.path === '/api/library').length >= 2);

  await setCategories();
  drag('[data-paper="L001"]', 'dragstart');
  await flush();
  drag('[data-category="09_目标"][data-subcategory="01_子目录"]', 'drop');
  await until(() => moves().length === 2);
  assert.deepEqual(moves()[1].body, { category: '09_目标', subcategory: '01_子目录' });
  await until(() => workspace.state.movingPaper === '');

  await setCategories();
  drag('[data-paper="L001"]', 'dragstart');
  await flush();
  drag('[data-category=""][data-subcategory=""]', 'drop');
  await flush();
  assert.equal(moves().length, 2);
  drag('[data-paper="L001"]', 'dragstart');
  await flush();
  drag('[data-category="09_目标"][data-subcategory="01_子目录"]', 'drop');
  await flush();
  assert.equal(moves().length, 2);
  assert.ok(workspace.state.toasts.some((item: { message: string }) => item.message.includes('已在这个文件夹')));

  drag('[data-paper="L001"]', 'dragstart');
  await flush();
  assert.ok(page.$('[data-category="09_目标"][data-subcategory="01_子目录"]'));
  drag('[data-paper="L001"]', 'dragend');
  await flush();
  assert.equal(workspace.state.draggingPaper, '');
  assert.equal(page.$('[data-category="09_目标"][data-subcategory="01_子目录"]'), null);
});

test('栏宽从服务端读回，调整后写回服务端', async (t) => {
  const page = await fixture(t, { ui: { panelWidths: { sidebar: 240 } } });
  const width = () => document.documentElement.style.getPropertyValue('--sidebar-width');
  assert.equal(width(), '240px');

  // 方向键调整左栏宽度，结果应写回服务端界面状态。
  const handle = page.$('[data-resize-panel="sidebar"]');
  handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await flush();
  assert.equal(page.ui.panelWidths.sidebar, 256);
  assert.equal(width(), '256px');
});

test('界面状态接口失败不影响阅读与发消息', async (t) => {
  // 界面状态是偏好：写失败只记错误，选中与渲染仍要正常。
  const page = await fixture(t, { uiPatchError: '磁盘只读' });
  click(page.$('[data-paper="L002"]'));
  await flush();
  assert.equal(page.workspace.state.current, 'L002');
  assert.ok(page.$('#reader-content'));
  assert.equal(page.workspace.state.uiError, '磁盘只读');
});
