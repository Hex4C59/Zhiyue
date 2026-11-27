import test from 'node:test';
import assert from 'node:assert/strict';
import { activeClassifyRun, type ChatClassifyProposal, type ChatClassifyRun } from '../shared/contracts.js';
import { click, fixture, flush, input, until } from './helpers/frontendFixture.js';
import type { Json } from './helpers/frontendFixture.js';

const createdAt = '2026-11-27T10:00:00.000Z';
const chatWithProposals = (count = 14, id = 'classify-chat') => ({
  id, title: '批量归类', createdAt, messages: [] as Json[], classifyRevision: 1,
  classifyRuns: [] as ChatClassifyRun[],
  classifyProposals: Array.from({ length: count }, (_, index): ChatClassifyProposal => ({
    id: `proposal-${index + 1}`, paperId: `L${String(index + 1).padStart(3, '0')}`,
    title: `论文 ${index + 1}：很长的研究题名与方法比较`, fromPath: 'papers/01_原分类',
    targetCategory: '新领域', targetSubcategory: '子方向', targetPath: 'papers/新领域/子方向',
    willCreateCategory: true, willCreateSubcategory: true, basis: 'notes+translation',
    reason: '笔记与译文均指向这一研究方向。', createdAt,
  })),
});

type Page = Awaited<ReturnType<typeof fixture>>;
function publishRun(page: Page, patch: Partial<ChatClassifyRun>, chatId = 'classify-chat'): ChatClassifyRun {
  const chat = page.chats.get(chatId)!;
  const run = chat.classifyRuns.at(-1) as ChatClassifyRun;
  Object.assign(run, patch, { revision: ++chat.classifyRevision, updatedAt: new Date().toISOString() });
  page.events.message({ type: 'classifyRun', chatId, run, revision: run.revision, proposals: chat.classifyProposals });
  return structuredClone(run);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const submissions = (page: Page) => page.calls.filter((call) =>
  call.path.endsWith('/classify-proposals') && call.body?.action === 'apply');

test('14 篇归类受理后显示后台阶段与逐篇进度，重复点击只提交一次', async (t) => {
  const page = await fixture(t, { chats: [chatWithProposals()], ui: { chatId: 'classify-chat' } });
  const { workspace } = page;
  workspace.state.current = 'L001';
  input(page.$('#chat-input'), '归类完成后继续讨论');
  await flush();
  const initialLibraryReads = page.calls.filter((call) => call.path === '/api/library').length;
  const apply = page.$('[data-classify-apply]');
  click(apply);
  click(apply);
  await until(() => !workspace.state.classifySaving);
  assert.equal(submissions(page).length, 1);
  assert.equal(page.chats.get('classify-chat').classifyRuns.length, 1);
  assert.equal(workspace.state.chat.classifyRuns[0].status, 'queued');
  assert.equal(page.$('.classify-proposal').getAttribute('aria-busy'), 'true');
  assert.match(page.$('[data-classify-stage]').textContent, /排队中/);
  assert.equal(page.$('[data-classify-apply]').disabled, true);
  assert.equal(page.$('[data-classify-discard]').disabled, true);
  assert.ok([...page.target.querySelectorAll<HTMLInputElement>('.classify-proposal input')]
    .every((element) => element.disabled));
  assert.equal(page.$('#send').disabled, true);
  assert.equal(page.$('#interrupt'), null);
  assert.ok([...page.target.querySelectorAll<HTMLButtonElement>('.paper-actions button')]
    .every((element) => element.disabled));
  assert.equal(workspace.canChangeChat('classify-chat'), false);
  assert.equal(page.calls.filter((call) => call.path === '/api/library').length, initialLibraryReads);
  assert.doesNotMatch(page.$('#toast-region').textContent, /已归类 14/);

  publishRun(page, { status: 'preparing', stage: '准备文件夹', createdFolders: ['papers/03_新领域'] });
  await flush();
  assert.match(page.$('[data-classify-stage]').textContent, /准备文件夹/);
  assert.match(page.$('[data-classify-stage]').textContent, /已新建 1 个文件夹/);
  const serverRun = page.chats.get('classify-chat').classifyRuns[0] as ChatClassifyRun;
  publishRun(page, {
    status: 'moving', stage: '正在移动并更新索引', items: serverRun.items.map((item, index) => ({
      ...item, category: 'papers/03_新领域/01_子方向', status: index === 0 ? 'moved' : 'pending',
    })),
  });
  await flush();
  assert.match(page.$('[data-classify-stage]').textContent, /正在移动并更新索引/);
  assert.equal(page.$('progress[aria-label="归类进度"]').value, 1);
  assert.equal(page.$('progress[aria-label="归类进度"]').max, 14);
  assert.match(page.$('[data-classify-proposal="proposal-1"]').textContent, /已移动/);
  assert.match(page.$('[data-classify-proposal="proposal-1"]').textContent, /03_新领域/);

  const completed = page.completeClassification('classify-chat');
  await until(() => !page.$('#classify-proposals'));
  assert.equal(workspace.state.chat.classifyRuns[0].status, 'completed');
  assert.equal(page.$('#send').disabled, false);
  assert.equal(workspace.canChangeChat('classify-chat'), true);
  const receipt = page.$(`[data-message="${completed.messageId}"] .message-result`);
  assert.ok(receipt);
  assert.equal(receipt.open, false);
  assert.equal(receipt.querySelector('summary').textContent, '操作结果');
  assert.equal(receipt.querySelector('.message-body'), null);
  click(receipt.querySelector('summary'));
  await until(() => receipt.querySelector('.message-body'));
  assert.match(receipt.textContent, /L014 已归类至/);
  assert.ok(page.calls.filter((call) => call.path === '/api/library').length > initialLibraryReads);
});

test('归类响应丢失后按会话中的 requestId 找回已受理任务', async (t) => {
  let loseResponse = true;
  const page = await fixture(t, {
    chats: [chatWithProposals(2)], ui: { chatId: 'classify-chat' },
    classificationApi: async (call, next) => {
      const result = await next();
      if (call.body?.action === 'apply' && loseResponse) {
        loseResponse = false;
        throw new Error('提交响应丢失');
      }
      return result;
    },
  });
  await page.workspace.resolveClassifyProposals(['proposal-1', 'proposal-2'], 'apply');
  await flush();
  assert.equal(submissions(page).length, 1);
  assert.equal(page.workspace.state.classifyRequests.size, 0);
  assert.equal(page.chats.get('classify-chat').classifyRuns.length, 1);
  assert.equal(page.workspace.state.chat.classifyRuns[0].requestId, submissions(page)[0].body.requestId);
  assert.equal(page.$('[data-classify-retry]'), null);
  assert.equal(page.$('[data-classify-apply]').disabled, true);
  assert.match(page.$('[data-classify-stage]').textContent, /排队中/);
});

test('补查也失败时锁住所选提案，重试保持原 requestId 且不重复建任务', async (t) => {
  let offline = false;
  let loseResponse = true;
  const page = await fixture(t, {
    chats: [chatWithProposals(3)], ui: { chatId: 'classify-chat' },
    classificationApi: async (call, next) => {
      if (offline && call.method === 'GET' && call.path === '/api/chats/classify-chat') {
        throw new Error('会话补查失败');
      }
      const result = await next();
      if (call.body?.action === 'apply' && loseResponse) {
        loseResponse = false;
        offline = true;
        throw new Error('受理响应超时');
      }
      return result;
    },
  });
  await page.workspace.resolveClassifyProposals(['proposal-1', 'proposal-3'], 'apply');
  await flush();
  assert.match(page.$('[data-classify-stage]').textContent, /提交结果待确认/);
  assert.match(page.$('.classify-proposal-error').textContent, /受理响应超时/);
  assert.equal(page.$('[data-classify-proposal="proposal-2"] input').disabled, true);
  assert.equal(page.workspace.canChangeChat('classify-chat'), false);
  const first = submissions(page)[0].body;
  offline = false;
  click(page.$('[data-classify-retry]'));
  await until(() => !page.workspace.state.classifySaving);
  assert.equal(submissions(page).length, 2);
  assert.deepEqual(submissions(page)[1].body, first);
  assert.equal(page.chats.get('classify-chat').classifyRuns.length, 1);
  assert.equal(page.workspace.state.classifyRequests.size, 0);
  assert.equal(page.$('[data-classify-retry]'), null);
  assert.match(page.$('#toast-region').textContent, /已找回原归类任务/);
});

test('运行终态事件先于受理响应时，迟到的响应与旧事件不能回滚完成状态', async (t) => {
  const response = deferred<Json>();
  let accepted: Json | undefined;
  const page = await fixture(t, {
    chats: [chatWithProposals(2)], ui: { chatId: 'classify-chat' },
    classificationApi: async (call, next) => {
      const result = await next();
      if (call.body?.action === 'apply') {
        accepted = result;
        return response.promise;
      }
      return result;
    },
  });
  const submitting = page.workspace.resolveClassifyProposals(['proposal-1', 'proposal-2'], 'apply');
  await until(() => !!accepted);
  publishRun(page, { status: 'moving', stage: '正在移动并更新索引' });
  const completed = page.completeClassification('classify-chat');
  response.resolve(accepted!);
  await submitting;
  page.events.message({
    type: 'classifyRun', chatId: 'classify-chat', run: accepted!.run,
    revision: accepted!.run.revision, proposals: accepted!.run.proposals,
  });
  page.events.message({
    type: 'classifyProposal', chatId: 'classify-chat', revision: 1, proposal: accepted!.run.proposals[0],
  });
  await flush();
  assert.equal(page.workspace.state.chat.classifyRevision, completed.revision);
  assert.equal(page.workspace.state.chat.classifyRuns[0].status, 'completed');
  assert.deepEqual(page.workspace.state.chat.classifyProposals, []);
  assert.equal(page.workspace.state.classifyRequests.size, 0);
  assert.equal(page.workspace.state.jobs.get(completed.jobId!).status, 'completed');
  assert.doesNotMatch(page.$('#toast-region').textContent, /正在后台归类/);
  assert.equal(page.target.querySelectorAll(`[data-message="${completed.messageId}"]`).length, 1);
  assert.equal(page.$('#classify-proposals'), null);
});

test('较旧的会话 HTTP 快照不能恢复已解决提案或覆盖较新的运行结果', async (t) => {
  const response = deferred<Json>();
  let delay = false;
  let snapshot: Json | undefined;
  const page = await fixture(t, {
    chats: [chatWithProposals(2)], ui: { chatId: 'classify-chat' },
    classificationApi: async (call, next) => {
      const result = await next();
      if (delay && call.path === '/api/chats/classify-chat' && call.method === 'GET') {
        delay = false;
        snapshot = result;
        return response.promise;
      }
      return result;
    },
  });
  await page.workspace.resolveClassifyProposals(['proposal-1', 'proposal-2'], 'apply');
  delay = true;
  const syncing = page.workspace.syncChat('classify-chat');
  await until(() => !!snapshot);
  const completed = page.completeClassification('classify-chat');
  await flush();
  response.resolve(snapshot!);
  await syncing;
  assert.equal(page.workspace.state.chat.classifyRevision, completed.revision);
  assert.equal(page.workspace.state.chat.classifyRuns[0].status, 'completed');
  assert.deepEqual(page.workspace.state.chat.classifyProposals, []);
  assert.equal(page.target.querySelectorAll(`[data-message="${completed.messageId}"]`).length, 1);
});

test('切换会话后仍接收运行事件，历史列表只凭 classifyRunning 禁用归档和删除', async (t) => {
  const page = await fixture(t, {
    chats: [chatWithProposals(2), chatWithProposals(0, 'other-chat')], ui: { chatId: 'classify-chat' },
  });
  await page.workspace.resolveClassifyProposals(['proposal-1', 'proposal-2'], 'apply');
  await page.workspace.openChat('other-chat');
  input(page.$('#chat-input'), '其他会话可继续使用');
  click(page.$('#chat-history-toggle'));
  await flush();
  const summary = page.workspace.state.chats.find((chat: Json) => chat.id === 'classify-chat');
  assert.equal(summary.classifyRunning, true);
  assert.equal(summary.classifyRuns, undefined);
  assert.equal(page.$('#send').disabled, false);
  assert.equal(page.workspace.canChangeChat('classify-chat'), false);
  const row = page.$('[data-chat="classify-chat"]').closest('.history-row');
  assert.match(row.textContent, /归类中/);
  assert.ok([...row.querySelectorAll('button.icon-button')].every((button: any) => button.disabled));
  await page.workspace.changeChatHistory('classify-chat', 'trashed');
  assert.equal(page.calls.some((call) => call.method === 'DELETE'), false);
  const completed = page.completeClassification('classify-chat');
  await flush();
  assert.equal(page.workspace.state.chat.id, 'other-chat');
  assert.equal(page.workspace.state.chat.messages.length, 0);
  assert.equal(page.workspace.canChangeChat('classify-chat'), true);
  await page.workspace.openChat('classify-chat');
  await flush();
  assert.equal(page.workspace.state.chat.classifyRuns[0].status, 'completed');
  assert.equal(page.target.querySelectorAll(`[data-message="${completed.messageId}"]`).length, 1);
});

test('列表请求开始后收到的运行事件优先于迟到的会话摘要', async (t) => {
  const response = deferred<Json[]>();
  let delay = false;
  let summaries: Json[] | undefined;
  const page = await fixture(t, {
    chats: [chatWithProposals(1)], ui: { chatId: 'classify-chat' },
    classificationApi: async (call, next) => {
      const result = await next();
      if (delay && call.path === '/api/chats' && call.method === 'GET') {
        delay = false;
        summaries = result;
        return response.promise;
      }
      return result;
    },
  });
  delay = true;
  const loading = page.workspace.loadChats();
  await until(() => !!summaries);
  await page.workspace.resolveClassifyProposals(['proposal-1'], 'apply');
  response.resolve(summaries!);
  await loading;
  assert.equal(page.workspace.state.chats[0].classifyRunning, true);
  await page.workspace.openChat('classify-chat');
  assert.equal(page.workspace.canChangeChat('classify-chat'), false);
});

test('SSE 在线时也轮询归类运行，断线后通过完整会话恢复终态与回执', async (t) => {
  const page = await fixture(t, { chats: [chatWithProposals(2)], ui: { chatId: 'classify-chat' } });
  await page.workspace.resolveClassifyProposals(['proposal-1', 'proposal-2'], 'apply');
  const before = page.calls.filter((call) => call.path === '/api/chats/classify-chat').length;
  assert.equal(page.workspace.state.eventsOpen, true);
  assert.equal(page.workspace.generating.value, false);
  await page.workspace.poll();
  assert.ok(page.calls.filter((call) => call.path === '/api/chats/classify-chat').length > before);
  page.events.error();
  const handler = page.events.onmessage;
  page.events.onmessage = undefined;
  const completed = page.completeClassification('classify-chat');
  page.events.onmessage = handler;
  assert.equal(page.workspace.state.chat.classifyRuns[0].status, 'queued');
  await page.workspace.poll();
  await flush();
  assert.equal(page.workspace.state.chat.classifyRuns[0].status, 'completed');
  assert.deepEqual(page.workspace.state.chat.classifyProposals, []);
  assert.equal(page.target.querySelectorAll(`[data-message="${completed.messageId}"]`).length, 1);
  page.events.open();
  await flush();
  assert.equal(page.target.querySelectorAll(`[data-message="${completed.messageId}"]`).length, 1);
  assert.equal(submissions(page).length, 1);
});

test('重启恢复已有运行，部分成功与待核实项保留失败提案，重试使用新请求编号', async (t) => {
  const initial = await fixture(t, { chats: [chatWithProposals(3)], ui: { chatId: 'classify-chat' } });
  await initial.workspace.resolveClassifyProposals(['proposal-1', 'proposal-2', 'proposal-3'], 'apply');
  const firstRequest = submissions(initial)[0].body.requestId;
  publishRun(initial, { status: 'preparing', stage: '准备文件夹' });
  const persisted = structuredClone([...initial.chats.values()]);
  initial.unmount();
  initial.target.remove();
  const page = await fixture(t, { chats: persisted, ui: { chatId: 'classify-chat' } });
  assert.equal(submissions(page).length, 0);
  assert.equal(page.workspace.state.chat.classifyRuns[0].status, 'preparing');
  assert.match(page.$('[data-classify-stage]').textContent, /准备文件夹/);
  assert.equal(page.$('[data-classify-discard]').disabled, true);
  const run = page.chats.get('classify-chat').classifyRuns[0] as ChatClassifyRun;
  const completed = page.completeClassification('classify-chat', {
    status: 'interrupted', stage: '归类中断，需核实', repair: 'move-transaction-1',
    items: run.items.map((item, index) => ({
      ...item, status: index === 0 ? 'moved' : 'interrupted',
      ...(index ? { error: '需要核实并修复移动事务：move-transaction-1' } : {}),
    })),
  });
  await flush();
  assert.deepEqual(page.workspace.state.chat.classifyProposals.map((item: Json) => item.id),
    ['proposal-2', 'proposal-3']);
  assert.match(page.$('[data-classify-proposal="proposal-2"]').textContent, /需要核实并修复移动事务/);
  assert.equal(page.$('[data-classify-apply]').disabled, false);
  assert.equal(page.$(`[data-message="${completed.messageId}"] .message-result`).open, false);
  click(page.$('[data-classify-apply]'));
  await until(() => !page.workspace.state.classifySaving);
  assert.equal(submissions(page).length, 1);
  assert.notEqual(submissions(page)[0].body.requestId, firstRequest);
  assert.deepEqual(submissions(page)[0].body.ids, ['proposal-2', 'proposal-3']);
  assert.equal(page.chats.get('classify-chat').classifyRuns.length, 2);
  assert.equal(page.workspace.state.chat.classifyRuns.filter(activeClassifyRun).length, 1);
});

test('同一归类版本的多条提案与取消事件均合并，旧版本事件不能覆盖新提案', async (t) => {
  const page = await fixture(t, { chats: [chatWithProposals(0)], ui: { chatId: 'classify-chat' } });
  const proposals = chatWithProposals(2).classifyProposals;
  for (const proposal of proposals) {
    page.events.message({ type: 'classifyProposal', chatId: 'classify-chat', revision: 2, proposal });
  }
  page.events.message({
    type: 'classifyProposal', chatId: 'classify-chat', revision: 3,
    proposal: { ...proposals[0], id: 'replacement', reason: '重新核对的提案' },
  });
  page.events.message({ type: 'classifyProposal', chatId: 'classify-chat', revision: 2, proposal: proposals[0] });
  await flush();
  assert.equal(page.target.querySelectorAll('[data-classify-proposal]').length, 2);
  assert.equal(page.$('[data-classify-proposal="proposal-1"]'), null);
  assert.match(page.$('[data-classify-proposal="replacement"]').textContent, /重新核对/);
  for (const id of ['replacement', 'proposal-2']) {
    page.events.message({ type: 'classifyProposalResolved', chatId: 'classify-chat', revision: 4, id });
  }
  page.events.message({ type: 'classifyProposal', chatId: 'classify-chat', revision: 3, proposal: proposals[0] });
  await flush();
  assert.deepEqual(page.workspace.state.chat.classifyProposals, []);
  assert.equal(page.$('#classify-proposals'), null);
});

test('一个会话的受理响应仍未返回时，其他会话可以独立确认归类', async (t) => {
  const response = deferred<Json>();
  let accepted: Json | undefined;
  const page = await fixture(t, {
    chats: [chatWithProposals(1), chatWithProposals(1, 'other-chat')], ui: { chatId: 'classify-chat' },
    classificationApi: async (call, next) => {
      const result = await next();
      if (call.path === '/api/chats/classify-chat/classify-proposals' && call.body?.action === 'apply') {
        accepted = result;
        return response.promise;
      }
      return result;
    },
  });
  const first = page.workspace.resolveClassifyProposals(['proposal-1'], 'apply');
  await until(() => !!accepted);
  await page.workspace.openChat('other-chat');
  assert.equal(page.workspace.canChangeChat('other-chat'), true);
  assert.equal(page.$('[data-classify-apply]').disabled, false);
  await page.workspace.resolveClassifyProposals(['proposal-1'], 'apply');
  assert.equal(submissions(page).length, 2);
  assert.equal(page.chats.get('other-chat').classifyRuns.length, 1);
  assert.equal(page.workspace.classificationSubmitting('classify-chat'), true);
  response.resolve(accepted!);
  await first;
  assert.equal(page.workspace.classificationSubmitting('classify-chat'), false);
});

test('受理冲突后接续同一会话已有运行，终态后不留下不确定提交锁', async (t) => {
  let page: Page;
  let conflict = true;
  page = await fixture(t, {
    chats: [chatWithProposals(1)], ui: { chatId: 'classify-chat' },
    classificationApi: async (call, next) => {
      const result = await next();
      if (call.body?.action === 'apply' && conflict) {
        conflict = false;
        page.chats.get('classify-chat').classifyRuns[0].requestId = 'another-client';
        throw new Error('当前会话已有归类任务');
      }
      return result;
    },
  });
  await page.workspace.resolveClassifyProposals(['proposal-1'], 'apply');
  assert.equal(page.workspace.state.classifyRequests.size, 0);
  assert.equal(page.$('[data-classify-retry]'), null);
  assert.equal(page.$('[data-classify-apply]').disabled, true);
  page.completeClassification('classify-chat');
  await flush();
  assert.equal(page.workspace.classificationBusy('classify-chat'), false);
  assert.equal(page.workspace.state.classifyRequests.size, 0);
  assert.equal(page.$('#classify-proposals'), null);
});

test('另一个请求在冲突补查前已经完成时，恢复结果并解除提交锁', async (t) => {
  let page: Page;
  page = await fixture(t, {
    chats: [chatWithProposals(1)], ui: { chatId: 'classify-chat' },
    classificationApi: async (call, next) => {
      const result = await next();
      if (call.body?.action === 'apply') {
        page.chats.get('classify-chat').classifyRuns[0].requestId = 'another-client';
        const handler = page.events.onmessage;
        page.events.onmessage = undefined;
        try { page.completeClassification('classify-chat'); }
        finally { page.events.onmessage = handler; }
        throw Object.assign(new Error('当前会话已有归类任务'), { statusCode: 409 });
      }
      return result;
    },
  });
  await page.workspace.resolveClassifyProposals(['proposal-1'], 'apply');
  assert.equal(page.workspace.state.classifyRequests.size, 0);
  assert.equal(page.workspace.classificationBusy('classify-chat'), false);
  assert.equal(page.workspace.canChangeChat('classify-chat'), true);
  assert.equal(page.$('[data-classify-retry]'), null);
  assert.equal(page.$('#classify-proposals'), null);
  assert.equal(submissions(page).length, 1);
  assert.equal(page.workspace.state.chat.messages.filter((message: Json) => message.role === 'system').length, 1);
});

test('服务端明确拒绝已失效提案时，保留错误反馈并解除提交锁', async (t) => {
  let page: Page;
  page = await fixture(t, {
    chats: [chatWithProposals(1)], ui: { chatId: 'classify-chat' },
    classificationApi: (call, next) => {
      if (call.body?.action === 'apply') {
        const chat = page.chats.get('classify-chat');
        chat.classifyProposals = [];
        chat.classifyRevision++;
        throw Object.assign(new Error('待确认的归类操作不存在或已处理。'), { statusCode: 404 });
      }
      return next();
    },
  });
  await page.workspace.resolveClassifyProposals(['proposal-1'], 'apply');
  assert.equal(page.workspace.state.classifyRequests.size, 0);
  assert.equal(page.workspace.classificationBusy('classify-chat'), false);
  assert.equal(page.workspace.canChangeChat('classify-chat'), true);
  await flush();
  assert.match(page.$('#toast-region').textContent, /不存在或已处理/);
  assert.equal(page.chats.get('classify-chat').classifyRuns.length, 0);
});

test('较慢的任务补查不能把已完成归类任务还原为排队状态', async (t) => {
  const response = deferred<Json>();
  let snapshot: Json | undefined;
  let delay = false;
  const page = await fixture(t, {
    chats: [chatWithProposals(1)], ui: { chatId: 'classify-chat' },
    classificationApi: async (call, next) => {
      const result = await next();
      if (delay && call.path.startsWith('/api/jobs/') && call.method === 'GET') {
        delay = false;
        snapshot = result;
        return response.promise;
      }
      return result;
    },
  });
  await page.workspace.resolveClassifyProposals(['proposal-1'], 'apply');
  delay = true;
  const polling = page.workspace.poll();
  await until(() => !!snapshot);
  const completed = page.completeClassification('classify-chat');
  response.resolve(snapshot!);
  await polling;
  assert.equal(page.workspace.state.jobs.get(completed.jobId!).status, 'completed');
  assert.equal(page.workspace.state.chat.classifyRuns[0].status, 'completed');
  assert.equal(page.target.querySelectorAll(`[data-message="${completed.messageId}"]`).length, 1);
});
