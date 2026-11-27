import test from 'node:test';
import assert from 'node:assert/strict';
import {
  click, fixture, flush, frames, input, resizeObservationCount, resizeVirtualList, until, window,
} from './helpers/frontendFixture.js';
import type { FixturePaper } from './helpers/frontendFixture.js';

type Page = Awaited<ReturnType<typeof fixture>>;
const papers = (count = 864): FixturePaper[] => Array.from({ length: count }, (_, index) => ({
  literature_id: `L${String(index + 1).padStart(4, '0')}`,
  title: `主题 ${index % 3}：${'用于验证可变高度的完整长题名，'.repeat(index % 7 + 1)} ${index + 1}`,
  authors: ['Synthetic Author'], year: 2026 - index % 5,
  category: index % 2 ? '02_模型' : '01_超声', notes: [], readStatus: 'unread', starred: false,
}));
const rowHeight = (key: string, width: number): number => 172 + Number(key.slice(1)) % 7 * 28 + (width < 350 ? 90 : 0);
const layout = { width: 480, height: 480, rowHeight };

function key(element: HTMLElement, value: string): void {
  element.dispatchEvent(new window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }));
}
function rowTop(element: HTMLElement): number {
  return Number(/translateY\(([-.\d]+)px\)/.exec(element.style.transform)?.[1]) || 0;
}
function anchor(list: HTMLElement): { key: string; offset: number } {
  const row = [...list.querySelectorAll<HTMLElement>('.virtual-row')].find((element) => {
    const offset = rowTop(element);
    return offset <= list.scrollTop && offset + element.getBoundingClientRect().height > list.scrollTop;
  });
  assert.ok(row, '当前滚动位置必须有实际可见的行');
  return { key: row.dataset.virtualKey!, offset: rowTop(row) - list.scrollTop };
}
async function end(page: Page): Promise<void> {
  const list = page.$('#paper-list');
  key(list, 'End');
  await frames(5);
}

test('864 篇长标题只挂载窗口，键盘首尾可达、阅读选择与离屏焦点保持', async (t) => {
  const page = await fixture(t, { papers: papers(), virtualLayout: layout });
  const list = page.$('#paper-list') as HTMLElement;
  await frames(4);
  assert.equal(page.$('#result-count').textContent, '864 篇文献');
  assert.ok(page.target.querySelectorAll('[data-paper]').length < 80);
  assert.equal(list.getAttribute('aria-label'), '论文列表');
  const first = page.$('[data-paper="L0001"]') as HTMLElement;
  assert.equal(first.closest('.virtual-row')!.getAttribute('aria-posinset'), '1');
  assert.equal(first.closest('.virtual-row')!.getAttribute('aria-setsize'), '864');
  first.focus();
  key(first, ' ');
  await flush();
  assert.equal(page.workspace.state.current, 'L0001');
  assert.equal(page.workspace.currentPaper.value, page.workspace.paperById.value.get('L0001'));

  list.scrollTop = 6000;
  list.dispatchEvent(new Event('scroll'));
  await frames(4);
  assert.equal(document.activeElement, first, '滚动不能使当前聚焦行卸载');
  const visible = [...list.querySelectorAll<HTMLElement>('.virtual-row')];
  const retained = visible.filter((row) => rowTop(row) + row.getBoundingClientRect().height < list.scrollTop);
  assert.ok(retained.some((row) => row.dataset.virtualKey === 'L0001'));
  assert.ok(visible.length < 80);
  assert.equal(page.workspace.state.current, 'L0001');
  assert.ok(page.workspace.state.context.has('L0001'));

  key(first, 'End');
  await frames(5);
  const last = page.$('[data-paper="L0864"]') as HTMLElement;
  assert.ok(last);
  assert.equal(document.activeElement, last);
  assert.equal(page.$('[data-paper="L0001"]'), null, '换焦点后不再保留旧的远处行');
  assert.equal(last.closest('.virtual-row')!.getAttribute('aria-posinset'), '864');
  key(last, 'ArrowUp');
  await frames(3);
  assert.equal((document.activeElement as HTMLElement).dataset.paper, 'L0863');
  key(document.activeElement as HTMLElement, 'Home');
  await frames(4);
  assert.equal((document.activeElement as HTMLElement).dataset.paper, 'L0001');
  key(document.activeElement as HTMLElement, 'ArrowDown');
  await frames(3);
  assert.equal((document.activeElement as HTMLElement).dataset.paper, 'L0002');
  key(document.activeElement as HTMLElement, 'Enter');
  await flush();
  assert.equal(page.workspace.state.current, 'L0002');
  assert.ok(page.target.querySelectorAll('[data-paper]').length < 80);
});

test('尺寸、收藏和阅读状态局部变化保持可见锚点，观察器随窗口及卸载清理', async (t) => {
  const page = await fixture(t, { papers: papers(), virtualLayout: layout });
  const list = page.$('#paper-list') as HTMLElement;
  await frames(4);
  const oldRow = list.querySelector('.virtual-row')!;
  assert.equal(resizeObservationCount(list), 1);
  assert.equal(resizeObservationCount(oldRow), 1);
  list.scrollTop = 7500;
  list.dispatchEvent(new Event('scroll'));
  await frames(5);
  assert.equal(resizeObservationCount(oldRow), 0, '滚出预留范围后调用 unobserve');
  const before = anchor(list);
  const sorted = page.workspace.sortedPapers.value;
  const indexed = page.workspace.paperById.value;
  const card = page.$(`[data-paper="${before.key}"]`);
  click(card.querySelector('button'));
  await flush();
  await page.workspace.patchPaper(before.key, { readStatus: 'reading' });
  await frames(3);
  assert.equal(page.workspace.sortedPapers.value, sorted);
  assert.equal(page.workspace.paperById.value, indexed);
  assert.deepEqual(anchor(list), before);
  assert.equal(indexed.get(before.key).readStatus, 'reading');

  resizeVirtualList(list, { width: 280 });
  await frames(5);
  assert.deepEqual(anchor(list), before, '窄栏换行导致高度变化时保留首个可见键及像素偏移');
  const row = page.$(`[data-paper="${before.key}"]`).closest('.virtual-row');
  assert.equal(row.getBoundingClientRect().height, rowHeight(before.key, 280));
  assert.ok(list.querySelectorAll('.virtual-row').length < 80);
  page.unmount();
  assert.equal(resizeObservationCount(list), 0);
  assert.equal(resizeObservationCount(row), 0);
  await frames(2);
  assert.equal(list.isConnected, false);
});

test('搜索、排序和分类筛选回到结果开头，空状态与连接失败保留恢复入口', async (t) => {
  const page = await fixture(t, { papers: papers(), virtualLayout: layout });
  const list = page.$('#paper-list') as HTMLElement;
  await end(page);
  assert.ok(list.scrollTop > 0);
  input(page.$('#search'), '主题 1');
  await frames(4);
  assert.equal(list.scrollTop, 0);
  assert.equal(page.$('#result-count').textContent, '288 篇文献');
  assert.equal(page.$('[data-paper]').dataset.paper, 'L0002');
  await end(page);
  page.workspace.state.sort = 'year-desc';
  await frames(4);
  assert.equal(list.scrollTop, 0);
  assert.equal(Number(page.workspace.filteredPapers.value[0].year), 2026);
  await end(page);
  page.workspace.state.category = '02_模型';
  await frames(4);
  assert.equal(list.scrollTop, 0);
  assert.equal(page.$('#result-count').textContent, '144 篇文献');
  input(page.$('#search'), '不可能匹配的合成题名');
  await frames(3);
  assert.equal(list.querySelector('.virtual-spacer'), null);
  assert.match(page.$('.paper-list-empty').textContent, /没有找到匹配结果/);
  assert.ok(page.$('#reset-filters'));
  page.workspace.state.libraryError = '测试连接已断开';
  await flush();
  assert.match(list.textContent!, /测试连接已断开/);
  assert.match(list.querySelector('button')!.textContent!, /重新连接/);
  page.workspace.state.libraryError = '';
  page.workspace.resetFilters();
  await frames(3);
  assert.equal(page.$('#result-count').textContent, '864 篇文献');
});

test('共享索引与排序缓存按元数据失效，搜索缓存不随关键词和阅读筛选重复拼接', async (t) => {
  const page = await fixture(t, { papers: papers(), virtualLayout: layout });
  const w = page.workspace;
  const paper = w.state.papers[500];
  const indexed = w.paperById.value;
  const sorted = w.sortedPapers.value;
  let reads = 0;
  let titleZh = '唯一搜索词';
  Object.defineProperty(paper, 'titleZh', {
    configurable: true, get: () => { reads++; return titleZh; }, set: (value: string) => { titleZh = value; },
  });
  await frames(3);
  assert.equal(reads, 0, '空关键词不构造离屏文献的搜索串');
  w.state.query = '唯一搜索词';
  await flush();
  assert.equal(w.filteredPapers.value.length, 1);
  const searched = reads;
  assert.ok(searched > 0);
  w.state.query = paper.literature_id;
  await flush();
  w.state.read = 'unread';
  await flush();
  assert.equal(reads, searched);
  assert.equal(w.sortedPapers.value, sorted);
  assert.equal(w.paperById.value, indexed);
  paper.titleZh = '更新后的元数据';
  w.state.query = '更新后的元数据';
  await flush();
  assert.equal(w.filteredPapers.value[0], paper);
  assert.ok(reads > searched);
  w.state.query = '唯一搜索词';
  await flush();
  assert.equal(w.filteredPapers.value.length, 0);
  w.state.papers = w.state.papers.filter((item: FixturePaper) => item.literature_id !== paper.literature_id);
  await flush();
  assert.equal(w.paperById.value.has(paper.literature_id), false);
});
