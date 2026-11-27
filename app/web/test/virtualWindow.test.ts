import test from 'node:test';
import assert from 'node:assert/strict';
import { VirtualWindow } from '../frontend/lib/virtualWindow.js';

const keys = (count: number): string[] => Array.from({ length: count }, (_, index) => `row-${index}`);

test('可变行高使用前缀偏移和二分定位，长行及最后一行均可到达', () => {
  const window = new VirtualWindow(40);
  window.setKeys(['a', 'b', 'c', 'd', 'e']);
  window.measure(new Map([['a', 20], ['b', 80], ['c', 30], ['d', 60], ['e', 10]]));
  assert.equal(window.total, 200);
  assert.deepEqual(Array.from({ length: 6 }, (_, index) => window.offset(index)), [0, 20, 100, 130, 190, 200]);
  assert.deepEqual([0, 19, 20, 99, 100, 130, 190, 200].map((offset) => window.indexAt(offset)),
    [0, 0, 1, 1, 2, 3, 4, 4]);
  assert.equal(window.scrollTo(4, 0, 50), 150);
  assert.equal(window.scrollTo(0, 150, 50), 0);
  assert.equal(window.scrollTo(1, 0, 50), 20, '行高超过视口时对齐行首，正文仍可继续滚动');
  assert.equal(window.scrollTo(3, 0, 100, 'start'), 130);
  assert.equal(window.scrollTo(3, 0, 100, 'end'), 90);
});

test('一千行只保留可见窗口、上下各六行和一个远处聚焦行', () => {
  const window = new VirtualWindow(50);
  window.setKeys(keys(1000));
  assert.deepEqual(window.range(5000, 500), Array.from({ length: 22 }, (_, index) => index + 94));
  const retained = window.range(5000, 500, 'row-999');
  assert.equal(retained.length, 23);
  assert.equal(retained.at(-1), 999);
  assert.equal(window.range(5000, 500, 'row-100').length, 22);
  assert.deepEqual(window.range(0, 0), [0, 1, 2, 3, 4, 5, 6]);
});

test('按稳定键复用实际高度，重排与宽度变化后恢复首个可见键和偏移', () => {
  const window = new VirtualWindow(50);
  window.setKeys(['a', 'b', 'c', 'd']);
  window.measure(new Map([['a', 120], ['b', 80], ['c', 150]]));
  const anchor = window.anchor(137);
  assert.deepEqual(anchor, { key: 'b', offset: 17 });
  window.setKeys(['c', 'a', 'b', 'd']);
  assert.equal(window.restore(anchor), 287);
  assert.equal(window.height(2), 80);
  window.clearMeasurements();
  window.measure(new Map([['a', 170], ['b', 110], ['c', 190]]));
  assert.equal(window.restore(anchor), 377);
  window.measure(new Map([['b', 10]]));
  assert.equal(window.restore(anchor), 369, '行缩短后仍停留在同一行');
  window.setKeys(['a', 'c']);
  assert.equal(window.restore(anchor, 25), 25);
  assert.equal(window.index('b'), undefined);
});

test('空列表、无效测量与重复尺寸不生成多余窗口或偏移更新', () => {
  const window = new VirtualWindow(50);
  assert.equal(window.indexAt(0), -1);
  assert.equal(window.anchor(0), null);
  assert.deepEqual(window.range(0, 400), []);
  window.setKeys(['a']);
  assert.equal(window.setKeys(['a']), false);
  assert.equal(window.measure(new Map([['a', 0], ['missing', 100]])), false);
  assert.equal(window.measure(new Map([['a', Number.NaN]])), false);
  assert.equal(window.measure(new Map([['a', 70]])), true);
  assert.equal(window.measure(new Map([['a', 70.2]])), false);
  assert.equal(window.total, 70);
  window.setKeys([]);
  assert.equal(window.total, 0);
  window.setKeys(['a']);
  assert.equal(window.total, 50, '已移除行不保留历史尺寸');
});
