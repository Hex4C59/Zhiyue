import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, flush, click, until } from './helpers/frontendFixture.js';

test('SSE 的历史预览只保留有限正文和状态，当前会话仍收到全文和推理', async (t) => {
  const page = await fixture(t);
  const { state, receive } = page.workspace;
  state.chats = [{ id: 'preview-chat', title: '预览' }];
  state.chat = { id: 'preview-chat', messages: [] };
  const text = '正文'.repeat(1000);
  const thinking = '推理'.repeat(1000);
  receive({ type: 'message', chatId: 'preview-chat', message: {
    id: 'answer', role: 'assistant', text, thinking, status: 'streaming',
  } });
  assert.equal(state.chat.messages[0].text, text);
  assert.equal(state.chat.messages[0].thinking, thinking);
  assert.equal(state.chats[0].messages[0].text, text.slice(0, 160));
  assert.equal(state.chats[0].messages[0].status, 'streaming');
  assert.equal(state.chats[0].messages[0].thinking, undefined);
});

test('收起结果与推理不挂载正文，展开后公式引用正确且SSE更新保持展开', async (t) => {
  const page = await fixture(t);
  page.workspace.state.chat = { id: 'render-chat', messages: [
    { id: 'result', role: 'system', text: '结果见 [文献](L001) 与 $E=mc^2$。', status: 'completed' },
    { id: 'thought', role: 'assistant', text: '正文', thinking: '推理公式 $a^2+b^2$。', status: 'streaming' },
  ] };
  await flush();
  const result = page.$('[data-message="result"] .message-result');
  const thought = page.$('[data-message="thought"] .message-thinking');
  assert.equal(result.querySelector('.message-body'), null);
  assert.equal(thought.querySelector('.message-thinking-body'), null);
  assert.equal(page.$('#messages').querySelectorAll('.katex').length, 0);
  click(result.querySelector('summary'));
  click(thought.querySelector('summary'));
  await until(() => result.querySelector('.message-body') && thought.querySelector('.message-thinking-body'));
  assert.equal(result.querySelector('a')?.getAttribute('href'), '/api/file?path=L001');
  assert.equal(page.$('#messages').querySelectorAll('.katex').length, 2);
  page.workspace.receive({ type: 'message', chatId: 'render-chat', message: {
    id: 'result', role: 'system', text: '更新结果 [文献](L001) 与 $E=mc^2$。', status: 'completed',
  } });
  await flush();
  assert.equal(result.open, true);
  assert.match(result.textContent, /更新结果/);
  click(result.querySelector('summary'));
  await until(() => !result.querySelector('.message-body'));
  assert.equal(result.open, false);
});

test('高频SSE立即进入原始状态，完成时不等待显示节流且推理展开显示最终全文', async (t) => {
  const page = await fixture(t);
  const w = page.workspace;
  w.state.chat = { id: 'render-chat', messages: [
    { id: 'live', role: 'assistant', text: '初始', thinking: '思考', status: 'streaming' },
  ] };
  await flush();
  for (let index = 0; index < 100; index++) {
    w.receive({ type: 'delta', chatId: 'render-chat', messageId: 'live', delta: '字' });
    w.receive({ type: 'thinking', chatId: 'render-chat', messageId: 'live', delta: '想' });
  }
  const message = w.state.chat.messages[0];
  assert.equal(message.text, '初始' + '字'.repeat(100));
  assert.equal(message.thinking, '思考' + '想'.repeat(100));
  w.receive({ type: 'message', chatId: 'render-chat', message: { ...message, status: 'completed' } });
  await flush();
  assert.match(page.$('[data-message="live"] .message-body').textContent, new RegExp('字'.repeat(100)));
  const thinking = page.$('[data-message="live"] .message-thinking');
  click(thinking.querySelector('summary'));
  await until(() => thinking.querySelector('.message-thinking-body'));
  assert.match(thinking.textContent, new RegExp('想'.repeat(100)));
});

test('重新打开当前会话的慢响应保留SSE终态、较长正文与新消息', async (t) => {
  let delay = false;
  let arrived!: () => void;
  let release!: () => void;
  const started = new Promise<void>((resolve) => { arrived = resolve; });
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  const chat = { id: 'live-chat', title: '当前会话', messages: [
    { id: 'answer', role: 'assistant', text: '开始', thinking: '推理', status: 'streaming' },
  ] };
  const page = await fixture(t, { chats: [chat], classificationApi: async (call, next) => {
    const response = await next();
    if (delay && call.path === '/api/chats/live-chat' && call.method === 'GET') {
      arrived();
      await blocked;
    }
    return response;
  } });
  const w = page.workspace;
  await w.openChat(chat.id);
  delay = true;
  const opening = w.openChat(chat.id);
  try {
    await started;
    w.receive({ type: 'message', chatId: chat.id, message: {
      id: 'answer', role: 'assistant', text: '完整最终正文', thinking: '完整推理', status: 'completed',
    } });
    w.receive({ type: 'message', chatId: chat.id, message: {
      id: 'receipt', role: 'system', text: '完成回执', status: 'completed',
    } });
    const answer = w.state.chat.messages[0];
    release();
    await opening;
    assert.equal(w.state.chat.messages[0], answer);
    assert.equal(w.state.chat.messages[0].status, 'completed');
    assert.equal(w.state.chat.messages[0].text, '完整最终正文');
    assert.equal(w.state.chat.messages[0].thinking, '完整推理');
    assert.equal(w.state.chat.messages[1].id, 'receipt');
  } finally { release(); await opening; }
});

test('相同HTTP补查保留历史消息对象、Markdown节点和已展开结果', async (t) => {
  const page = await fixture(t);
  const chat = { id: 'stable-chat', title: '稳定历史', messages: [
    { id: 'result', role: 'system', text: '结果 **保持**', status: 'completed' },
    { id: 'answer', role: 'assistant', text: '历史 **正文**', status: 'completed' },
  ] };
  page.chats.set(chat.id, structuredClone(chat));
  await page.workspace.openChat(chat.id);
  await flush();
  const details = page.$('[data-message="result"] .message-result');
  click(details.querySelector('summary'));
  await until(() => details.querySelector('.message-body'));
  const message = page.workspace.state.chat.messages[1];
  const paragraph = page.$('[data-message="answer"] .message-body p');
  await page.workspace.syncChat(chat.id);
  await flush();
  assert.equal(page.workspace.state.chat.messages[1], message);
  assert.equal(page.$('[data-message="answer"] .message-body p'), paragraph);
  assert.equal(details.open, true);
});
