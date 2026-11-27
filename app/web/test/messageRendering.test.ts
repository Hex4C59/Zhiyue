import test from 'node:test';
import assert from 'node:assert/strict';
import { effectScope, reactive } from 'vue';
import { useMessageText } from '../frontend/lib/messageRendering.js';

const active = (status: string) => status === 'streaming';

test('流式显示按50毫秒合并，原始内容立即保留，终态立即完整', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const message = reactive({ id: 'a', text: '开始', thinking: '思考', status: 'streaming' });
  const scope = effectScope();
  const view = scope.run(() => useMessageText(() => message, active))!;
  try {
    for (let index = 0; index < 100; index++) { message.text += '字'; message.thinking += '想'; }
    assert.equal(message.text.length, 102);
    assert.equal(view.text.value, '开始');
    t.mock.timers.tick(49);
    assert.equal(view.text.value, '开始');
    t.mock.timers.tick(1);
    assert.equal(view.text.value, message.text);
    assert.equal(view.thinking.value, message.thinking);
    message.text += '最终正文';
    message.thinking += '最终推理';
    message.status = 'completed';
    assert.equal(view.text.value, message.text);
    assert.equal(view.thinking.value, message.thinking);
    t.mock.timers.tick(100);
    assert.equal(view.text.value, message.text);
  } finally { scope.stop(); }
});

test('切换消息或失败时立即刷新，卸载取消待显示计时器', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const message = reactive({ id: 'a', text: '一', thinking: '', status: 'streaming' });
  const scope = effectScope();
  const view = scope.run(() => useMessageText(() => message, active))!;
  message.text = '尚未提交的显示';
  message.id = 'b';
  assert.equal(view.text.value, message.text);
  message.text = '失败前最后一段';
  message.status = 'error';
  assert.equal(view.text.value, message.text);
  message.status = 'streaming';
  message.text = '卸载之后不刷新';
  const finalVisible = view.text.value;
  scope.stop();
  t.mock.timers.tick(100);
  assert.equal(view.text.value, finalVisible);
});
