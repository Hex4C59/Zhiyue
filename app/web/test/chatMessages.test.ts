import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeMessages, messageSnapshot } from '../frontend/lib/chatMessages.js';

const active = (status: string) => ['streaming', 'running'].includes(status);
const message = (id: string, extra = {}) => ({
  id, role: 'assistant', text: '正文', thinking: '推理', status: 'completed',
  attachments: [{ id: 'upload', name: '附件' }], ...extra,
});

test('相同HTTP补查复用消息对象，深层附件一致不触发正文替换', () => {
  const live = message('a');
  const incoming = structuredClone(live);
  const result = mergeMessages([incoming], [live], messageSnapshot([live]), active);
  assert.equal(result[0], live);
});

test('补查保留SSE较长正文与推理和新消息，终态可以由新快照完成', () => {
  const live = message('a', { status: 'streaming' });
  const started = messageSnapshot([live]);
  live.text += '新增正文';
  live.thinking += '新增推理';
  const pushed = message('b');
  const result = mergeMessages([message('a')], [live, pushed], started, active);
  assert.equal(result[0].status, 'completed');
  assert.equal(result[0].text, live.text);
  assert.equal(result[0].thinking, live.thinking);
  assert.equal(result[1], pushed);
});

test('慢响应不能把SSE完成或失败的消息回退成生成中及旧错误正文', () => {
  const live = message('a', { status: 'streaming' });
  const started = messageSnapshot([live]);
  live.status = 'error';
  live.text = '执行失败';
  const result = mergeMessages([message('a', { text: '更长但过期的生成中正文', status: 'streaming' })],
    [live], started, active);
  assert.equal(result[0], live);
  assert.equal(result[0].status, 'error');
  assert.equal(result[0].text, '执行失败');
  const terminal = mergeMessages([message('a', { status: 'completed' })], [live], started, active);
  assert.equal(terminal[0], live);
});
