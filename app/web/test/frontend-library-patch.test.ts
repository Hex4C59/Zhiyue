import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers/frontendFixture.js';

test('阅读与收藏采用服务端单篇结果并更新计数，不再请求全库', async (t) => {
  const page = await fixture(t);
  const state = page.workspace.state;
  state.stats = { total: 2, unread: 2, reading: 0, read: 0, starred: 0, withNotes: 1 };
  state.current = 'L001';
  const paper = state.papers[0];
  const originalTitle = paper.title;
  paper.title = '已过期的本地题名';
  const before = page.calls.length;
  assert.equal(await page.workspace.patchPaper('L001', { readStatus: 'read', starred: true }), true);
  assert.equal(state.papers[0], paper);
  assert.equal(paper.title, originalTitle);
  assert.equal(paper.readStatus, 'read');
  assert.equal(paper.starred, true);
  assert.equal(state.stats.unread, 1);
  assert.equal(state.stats.read, 1);
  assert.equal(state.stats.starred, 1);
  assert.equal(state.stats.total, 2);
  assert.equal(state.current, 'L001');
  assert.equal(state.pendingPatches.size, 0);
  const calls = page.calls.slice(before);
  assert.equal(calls.filter(({ path }) => path === '/api/library').length, 0);
  assert.deepEqual(calls.filter(({ method }) => method === 'PATCH').map(({ path, method }) => [path, method]), [
    ['/api/papers/L001', 'PATCH'],
  ]);
  await page.workspace.patchPaper('L001', { starred: false });
  assert.equal(state.stats.starred, 0);
  assert.equal(state.stats.read, 1);
});
