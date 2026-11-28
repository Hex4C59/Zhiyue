import test from 'node:test';
import assert from 'node:assert/strict';
import { click, fixture, flush, input, until, window } from './helpers/frontendFixture.js';

test('历史会话可归档和恢复，确认删除后才会移入回收站', async (t) => {
  const page = await fixture(t);
  const chat = { id: 'history-chat', title: '已有会话', paperIds: ['L001'], messages: [] };
  page.chats.set(chat.id, chat);
  await page.workspace.loadChats();
  click(page.$('#chat-history-toggle'));
  await flush();
  click(page.$('[data-chat="history-chat"]'));
  await flush();
  click(page.$('[title="归档会话"]'));
  await flush();
  assert.equal(page.$('[data-chat="history-chat"]'), null);
  assert.ok(page.$('.archived-chat'));
  assert.equal(page.$('#chat-input'), null);
  click(page.$('[data-history-view="archived"]'));
  await flush();
  assert.equal(page.$('.history-title').textContent, '已有会话');
  click(page.$('.archived-chat button'));
  await flush();
  assert.ok(page.$('#chat-input'));

  click(page.$('[data-history-view="active"]'));
  await flush();
  const confirm = window.confirm;
  t.after(() => { window.confirm = confirm; });
  window.confirm = () => false;
  click(page.$('[title="删除会话"]'));
  assert.equal(page.calls.some((call) => call.method === 'DELETE'), false);
  window.confirm = () => true;
  click(page.$('[title="删除会话"]'));
  await flush();
  assert.equal(page.workspace.state.chat, null);
  assert.equal(page.ui.chatId, null);
  assert.equal(page.$('[data-chat="history-chat"]'), null);
  click(page.$('[data-history-view="trashed"]'));
  await flush();
  assert.equal(page.$('[data-chat="history-chat"]').tagName, 'DIV');
  click(page.$('[title="恢复会话"]'));
  await flush();
  assert.match(page.$('.chat-history .empty').textContent, /回收站为空/);
  click(page.$('[data-history-view="active"]'));
  await flush();
  assert.ok(page.$('[data-chat="history-chat"]'));
});

test('无模型时可打开命令菜单和设置，终端命令无需创建聊天', async (t) => {
  const page = await fixture(t);
  page.workspace.state.status.agents!.pi!.authenticated = false;
  page.workspace.state.draft = '/';
  await flush();
  assert.ok(page.$('[data-command="changelog"]'));
  page.workspace.state.draft = '/settings';
  assert.equal(await page.workspace.submit(), true);
  await flush();
  assert.ok(page.$('.settings-dialog'));
  page.workspace.state.draft = '/changelog';
  assert.equal(await page.workspace.submit(), true);
  assert.deepEqual(page.calls.find((call) => call.path === '/api/commands/terminal')?.body, { text: '/changelog' });
  assert.equal(page.calls.some((call) => call.path === '/api/chats' && call.method === 'POST'), false);
});


test('模型搜索和键盘选择驱动实际发送参数，输入与停止操作保持可用', async (t) => {
  const page = await fixture(t);
  assert.equal(page.$('#send').disabled, true);
  page.workspace.state.status.agents.pi.models.push(
    { id: 'alpha/luna', model: 'alpha/luna', displayName: 'GPT Luna · alpha' },
  );
  click(page.$('#model-trigger'));
  await flush();
  assert.deepEqual(
    [...page.target.querySelectorAll<HTMLElement>('[data-provider-value]')].map(node => node.dataset.providerValue),
    ['alpha', 'test'],
  );
  assert.equal(page.$('[data-model-value="test/luna"]'), null);
  input(page.$('#model-search'), 'test');
  await flush();
  const key = (target: HTMLElement, value: string): void => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }));
  };
  key(page.$('#model-search'), 'ArrowDown');
  assert.equal(document.activeElement, page.$('[data-provider-value="test"]'));
  key(page.$('[data-provider-value="test"]'), 'ArrowRight');
  await flush();
  assert.equal(page.$('#model-search').getAttribute('aria-label'), '搜索模型');
  assert.equal(page.$('[data-model-value="alpha/luna"]'), null);
  assert.equal(page.$('[data-model-value="test/luna"]').textContent.trim(), 'GPT Luna');
  key(page.$('#model-search'), 'Escape');
  await flush();
  assert.equal(page.$('#model-search').value, 'test');
  assert.equal(document.activeElement, page.$('[data-provider-value="test"]'));
  click(page.$('[data-provider-value="test"]'));
  await flush();
  input(page.$('#model-search'), 'luna');
  await flush();
  assert.equal(page.target.querySelectorAll('[role="option"]').length, 1);
  page
    .$('#model-search')
    .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await flush();
  assert.equal(page.workspace.state.model, 'test/luna');
  click(page.$('#model-trigger'));
  await flush();
  click(page.$('[data-model-value=""]'));
  assert.equal(page.workspace.state.model, '');
  await flush();
  click(page.$('#model-trigger'));
  await flush();
  click(page.$('[data-provider-value="test"]'));
  await flush();
  click(page.$('[data-model-value="test/luna"]'));
  await flush();
  input(page.$('#chat-input'), '合成测试问题');
  await flush();
  page
    .$('#chat-input')
    .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await until(() => page.$('#interrupt'));
  const sent = page.calls.find((call) => call.path.endsWith('/messages'));
  assert.equal(sent.body.text, '合成测试问题');
  assert.equal(sent.body.model, 'test/luna');
  assert.equal(page.$('#chat-input').value, '');
  click(page.$('#interrupt'));
  await until(() => page.$('#send'));
  assert.equal(page.workspace.state.chat.messages.at(-1).status, 'interrupted');
});

test('任务进行中也能切换模型，新模型从下一条消息生效', async (t) => {
  const page = await fixture(t);
  page.workspace.state.chat = {
    id: 'busy-chat',
    messages: [{ id: 'busy-1', role: 'assistant', text: '正在回答', status: 'running' }],
  };
  await flush();
  const trigger = page.$('#model-trigger');
  assert.equal(trigger.disabled, false);
  assert.match(trigger.getAttribute('title') ?? '', /下一条消息生效/);
  click(trigger);
  await flush();
  click(page.$('[data-provider-value="test"]'));
  await flush();
  click(page.$('[data-model-value="test/sonnet"]'));
  await flush();
  assert.equal(page.workspace.state.model, 'test/sonnet');
  assert.match(page.$('#toast-region').textContent ?? '', /下一条消息生效/);
});

test('流式增量只更新目标消息，保留已完成内容的选择范围、焦点与审批草稿', async (t) => {
  const page = await fixture(t),
    { workspace } = page;
  workspace.state.chat = {
    id: 'local-chat',
    provider: 'pi',
    messages: [
      { id: 'completed', role: 'assistant', text: '这段文字需要保持可选。', status: 'completed' },
      { id: 'live', role: 'assistant', text: '新回答', status: 'streaming' },
    ],
  };
  workspace.receive({
    type: 'approval',
    chatId: 'local-chat',
    approval: {
      id: 'approval-1',
      method: 'item/tool/requestUserInput',
      params: {
        questions: [{ id: 'question', question: '请选择方案', options: ['方案甲', '方案乙'] }],
      },
    },
  });
  await flush();
  const answer = page.$('[data-answer="question"]');
  input(answer, '尚未提交的回答');
  answer.focus();
  const body = page.$('[data-message="completed"] .message-body'),
    paragraph = body.firstChild as ChildNode;
  const range = document.createRange();
  range.selectNodeContents(paragraph);
  document.getSelection()!.removeAllRanges();
  document.getSelection()!.addRange(range);
  const messages = page.$('#messages');
  Object.defineProperty(messages, 'scrollHeight', { configurable: true, value: 2000 });
  messages.scrollTop = 123;
  messages.dispatchEvent(new Event('scroll'));
  workspace.receive({ type: 'delta', chatId: 'local-chat', messageId: 'live', delta: '的增量。' });
  await flush();
  assert.equal(page.$('[data-message="completed"] .message-body').firstChild, paragraph);
  assert.equal(document.getSelection()!.toString(), '这段文字需要保持可选。');
  assert.equal(document.activeElement, answer);
  assert.equal(answer.value, '尚未提交的回答');
  assert.equal(messages.scrollTop, 123);
  await until(() => page.$('[data-message="live"]').textContent.includes('新回答的增量'));
  assert.equal(messages.scrollTop, 123);
  page
    .$('[data-approval="approval-1"]')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  assert.deepEqual(page.decisions[0].answers.question.answers, ['尚未提交的回答']);
});

test('笔记草稿先预览，保存或丢弃都由用户点击触发', async (t) => {
  const page = await fixture(t),
    { workspace } = page;
  workspace.state.chat = { id: 'draft-chat', messages: [], noteDrafts: [] };
  workspace.receive({
    type: 'noteDraft',
    chatId: 'draft-chat',
    draft: {
      id: 'd1',
      paperId: 'L001',
      title: '测试笔记',
      path: 'notes/L001_测试笔记.md',
      content: '## 要点\n\n正文 <img src=x onerror=alert(1)>',
    },
  });
  await flush();
  assert.ok(page.$('[data-note-draft="d1"]'));
  assert.match(page.$('.note-preview').textContent, /要点/);
  assert.equal(page.$('.note-preview img'), null);
  assert.equal(workspace.state.chat.noteDrafts.length, 1);
  click(page.$('[data-note-save="d1"]'));
  await until(() => !page.$('[data-note-draft="d1"]'));
  assert.deepEqual(page.noteDecisions[0], { id: 'd1', body: { action: 'save' } });
  assert.equal(workspace.state.chat.noteDrafts.length, 0);
  workspace.receive({
    type: 'noteDraft',
    chatId: 'draft-chat',
    draft: {
      id: 'd2',
      paperId: 'L001',
      title: '另一份笔记',
      path: 'notes/L001_另一份笔记.md',
      content: '## 另一份',
    },
  });
  await flush();
  click(page.$('[data-note-discard="d2"]'));
  await until(() => !page.$('[data-note-draft="d2"]'));
  assert.deepEqual(page.noteDecisions[1], { id: 'd2', body: { action: 'discard' } });
  workspace.receive({
    type: 'noteDraft',
    chatId: 'draft-chat',
    draft: {
      id: 'd3',
      paperId: '',
      target: 'synthesis',
      paperIds: ['L001', 'L002'],
      title: '跨论文综合',
      path: 'synthesis/跨论文综合.md',
      content: '## 综合结论',
    },
  });
  await flush();
  assert.match(page.$('[data-note-draft="d3"]').textContent, /综合文稿/);
  assert.match(page.$('[data-note-save="d3"]').textContent, /保存为文稿/);
  click(page.$('[data-note-discard="d3"]'));
  await until(() => !page.$('[data-note-draft="d3"]'));
  assert.deepEqual(page.noteDecisions[2], { id: 'd3', body: { action: 'discard' } });
});

test('多个删除请求合并，确认一次处理勾选项，失败和未选目录保留', async (t) => {
  const page = await fixture(t);
  const { workspace } = page;
  const item = (id: string, category = `目录_${id}`) => ({
    id, kind: 'delete', category, path: `papers/${category}`, papers: 0, createdAt: new Date().toISOString(),
  });
  workspace.state.chat = {
    id: 'folder-chat', messages: [], noteDrafts: [],
    folderActions: [item('f1'), item('f2'), item('blocked'), item('unchecked'), item('duplicate', '目录_f1')],
  };
  await flush();
  assert.equal(document.querySelectorAll('.folder-action').length, 1);
  assert.equal(document.querySelectorAll('.folder-action input:checked').length, 4);
  const unchecked = page.$('[data-folder-action="unchecked"] input');
  unchecked.focus();
  unchecked.click();
  const apply = page.$('[data-folder-apply]');
  click(apply);
  click(apply);
  await until(() => !workspace.state.folderActionSaving);
  assert.deepEqual(page.folderDecisions, [{
    id: 'folder-chat', body: { action: 'apply', ids: ['f1', 'duplicate', 'f2', 'blocked'] },
  }]);
  assert.match(page.$('[data-folder-action="blocked"]').textContent, /文件夹不是空的/);
  assert.equal(unchecked.checked, false);
  assert.deepEqual(workspace.state.chat.folderActions.map((item: any) => item.id), ['blocked', 'unchecked']);
  click(page.$('[data-folder-discard]'));
  await until(() => !page.$('[data-folder-action="blocked"]'));
  assert.deepEqual(page.folderDecisions[1], { id: 'folder-chat', body: { action: 'discard', ids: ['blocked'] } });
});

test('浏览不累计引用，提问仅发送当前文献和手动固定的文献', async (t) => {
  const page = await fixture(t);
  const { workspace } = page;
  workspace.selectPaper('L001');
  workspace.selectPaper('L002');
  await flush();
  assert.equal(workspace.state.context.size, 0);
  click(page.$('.comparison-add'));
  await until(() => page.$('[data-pin-paper="L001"]'));
  click(page.$('[data-pin-paper="L001"]'));
  await flush();
  input(page.$('#chat-input'), '比较两篇论文');
  await workspace.submit();
  const submitted = page.calls.find(call => call.method === 'POST' && call.path.endsWith('/messages'));
  assert.deepEqual(submitted?.body.paperIds, ['L002', 'L001']);
  assert.equal(submitted?.body.activePaperId, 'L002');
  assert.equal(page.$('[data-context-remove="L002"]'), null);
});

test('附件上传与删除、Pi 标题与空上下文按 Vue 状态更新', async (t) => {
  const page = await fixture(t),
    { workspace } = page;
  assert.equal(page.$('.chat-context'), null);
  workspace.state.context.add('L001');
  await flush();
  assert.ok(page.$('[data-context-remove="L001"]'));
  click(page.$('[data-context-remove="L001"]'));
  await flush();
  assert.equal(page.$('.chat-context'), null);
  const picker = page.$('.attachment-picker');
  const fileInput = page.$('#file-input');
  assert.match(picker.textContent, /添加文件/);
  assert.equal(picker.type, 'button');
  assert.equal(fileInput.multiple, true);
  const files = [new File(['synthetic'], 'sample.txt', { type: 'text/plain' })];
  let opened = 0;
  fileInput.addEventListener('click', () => { opened++; });
  click(picker);
  assert.equal(opened, 1);
  Object.defineProperty(fileInput, 'files', { value: files });
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  await until(() => page.$('#send').disabled === false);
  assert.match(page.$('#attachments').textContent, /sample.txt/);
  click(page.$('#attachments button'));
  await flush();
  assert.equal(page.$('#send').disabled, true);
  assert.equal(page.$('#agent-select'), null);
  assert.equal(page.$('#codex-login'), null);
  assert.equal(page.$('.agent-name').textContent.trim(), 'Pi Agent');
  // 上传附件不应产生会话，也不该写入界面状态。
  assert.equal(page.ui.chatId, null);
});


test('助手消息渲染行内与块级 LaTeX 公式', async (t) => {
  const page = await fixture(t),
    { workspace } = page;
  workspace.state.chat = {
    id: 'math-chat',
    messages: [
      {
        id: 'math',
        role: 'assistant',
        text: `能量满足 $E = mc^2$，其中

$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

为高斯积分。`,
        status: 'completed',
      },
    ],
  };
  await flush();
  const body = page.$('[data-message="math"] .message-body');
  // KaTeX 渲染结果带 katex 类名，原文不再以 $ 包围的纯文本出现。
  assert.ok(body.querySelector('.katex'), '应渲染行内公式');
  assert.ok(body.querySelector('.math-block .katex'), '应渲染块级公式');
  assert.ok(body.querySelector('.katex .mord'), '行内公式应包含符号结构');
  assert.doesNotMatch(body.textContent, /\$E = mc\^2\$/);
  assert.doesNotMatch(body.textContent, /\\int_0/);
});

test('助手消息渲染 LaTeX 原生定界符 \\(...\\) 与 \\[...\\]（模型真实输出）', async (t) => {
  const page = await fixture(t),
    { workspace } = page;
  workspace.state.chat = {
    id: 'native-chat',
    messages: [
      {
        id: 'native',
        role: 'assistant',
        text: `输入原始语音 \\(X\\)，教师目标 \\(Y^T\\)。总损失为：

\\[
L = L_{\\mathrm{Frm}} + \\alpha L_{\\mathrm{Utt}}
\\]

其中 \\(\\alpha\\) 控制权重。`,
        status: 'completed',
      },
    ],
  };
  await flush();
  const body = page.$('[data-message="native"] .message-body');
  // 不应再出现原始定界符字面文本。
  assert.doesNotMatch(body.textContent, /\\\(X\\\)/);
  assert.doesNotMatch(body.textContent, /\\\[/);
  assert.doesNotMatch(body.textContent, /\\mathrm/);
  // 行内与块级都渲染出 katex 结构。
  assert.ok(body.querySelector('.math-block .katex'), '应渲染 \\[...\\] 块级公式');
  const inline = body.querySelectorAll('.katex:not(.katex-display)');
  assert.ok(inline.length >= 3, `应渲染多个行内公式，实际 ${inline.length}`);
});

test('单行块公式剥离定界符，未闭合公式保留后续正文', async (t) => {
  const page = await fixture(t);
  page.workspace.state.chat = {
    id: 'math-boundaries',
    messages: [{
      id: 'boundaries',
      role: 'assistant',
      text: [
        '\\[x^2 + 1\\]',
        '价格从 $5 到 $10，代码为 `$$x$$`。',
        '$$',
        '公式尚未输入完成',
        '',
        '## 后续正文',
      ].join('\n'),
      status: 'completed',
    }],
  };
  await flush();
  const body = page.$('[data-message="boundaries"] .message-body');
  assert.equal(body.querySelectorAll('.math-block .katex').length, 1);
  assert.equal(body.querySelector('.katex-error'), null);
  assert.match(body.textContent, /价格从 \$5 到 \$10/);
  assert.equal(body.querySelector('code')?.textContent, '$$x$$');
  assert.equal(body.querySelector('h2')?.textContent, '后续正文');
});


test('推理过程按消息折叠显示，增量流式追加到同一条消息', async (t) => {
  const page = await fixture(t),
    { workspace } = page;
  workspace.state.chat = {
    id: 'thinking-chat',
    messages: [
      { id: 'think', role: 'assistant', text: '先看结论。', thinking: '先核对航向。', status: 'completed' },
    ],
  };
  await flush();
  const details = page.$('[data-message="think"] .message-thinking');
  assert.ok(details);
  assert.equal(details.tagName, 'DETAILS');
  assert.equal(details.open, false);
  assert.match(details.querySelector('summary').textContent, /推理过程/);
  assert.equal(details.querySelector('.message-thinking-body'), null);
  click(details.querySelector('summary'));
  await until(() => details.querySelector('.message-thinking-body'));
  assert.match(details.textContent, /先核对航向/);
  workspace.receive({ type: 'thinking', chatId: 'thinking-chat', messageId: 'think', delta: '再核对样本。' });
  await flush();
  assert.match(page.$('[data-message="think"] .message-thinking').textContent, /再核对样本/);
  assert.equal(workspace.state.chat.messages[0].thinking, '先核对航向。再核对样本。');
});

test('设置面板显示当前思考强度与压缩阈值，修改后提交接口参数', async (t) => {
  const page = await fixture(t);
  click(page.$('#agent-settings'));
  await until(() => page.$('#settings-thinking'));
  assert.equal(page.$('#settings-thinking').value, 'medium');
  assert.equal(page.$('#settings-thinking').options.length, 5);
  assert.equal(page.$('.settings-check input').checked, true);
  assert.equal(page.$('.settings-token-field input').value, '20000');
  input(page.$('#settings-thinking'), 'high');
  page.$('#settings-thinking').dispatchEvent(new Event('change', { bubbles: true }));
  await until(() => page.calls.some((call) => call.path === '/api/agents/pi/settings/thinking'));
  assert.deepEqual(
    page.calls.find((call) => call.path === '/api/agents/pi/settings/thinking').body,
    { level: 'high', model: 'test/luna' },
  );
  const tokens = page.target.querySelectorAll('.settings-token-field input');
  input(tokens[0], '18000');
  tokens[0].dispatchEvent(new Event('change', { bubbles: true }));
  await until(() => page.calls.some((call) => call.path === '/api/agents/pi/settings/compaction'));
  assert.deepEqual(
    page.calls.find((call) => call.path === '/api/agents/pi/settings/compaction').body,
    { enabled: true, reserveTokens: 18000, keepRecentTokens: 30000 },
  );
  assert.equal(page.piSettings.thinking.level, 'high');
  assert.match(page.$('.settings-skills')?.textContent ?? '', /paper-reading/);
  const beforeReload = page.calls.filter((call) => call.path === '/api/commands').length;
  click(page.target.querySelector('.settings-skills')?.parentElement?.querySelector('.text-button'));
  await until(() => page.calls.some((call) => call.path === '/api/agents/pi/skills/reload'));
  await until(() => page.calls.filter((call) => call.path === '/api/commands').length > beforeReload &&
    !page.$('.settings-check input').disabled);
  click(page.$('.settings-check input'));
  await until(() => page.piSettings.compaction.enabled === false);
  const last = page.calls.filter((call) => call.path === '/api/agents/pi/settings/compaction').at(-1);
  assert.deepEqual(last.body, { enabled: false, reserveTokens: 18000, keepRecentTokens: 30000 });
  assert.equal(page.$('#agent-settings').getAttribute('title'), '模型与密钥');
});

test('输入框唤起斜杠命令菜单，键盘与点击都能插入命令', async (t) => {
  const page = await fixture(t);
  const composer = page.$('#chat-input');
  input(composer, '/');
  await flush();
  const menu = page.$('#command-menu');
  assert.ok(menu, '输入 / 应显示命令菜单');
  const names = [...menu.querySelectorAll('[data-command]')].map((node: any) => node.dataset.command);
  assert.deepEqual(names, [
    'help', 'compact', 'settings', 'model', 'changelog', 'skill:paper-reading', 'skill:paper-experiments',
    'skill:paper-organize',
  ]);
  assert.equal(menu.querySelector('[aria-selected="true"]')?.dataset.command, 'help');

  // 输入筛选词后上下键切换，Enter 只插入命令不提交表单。
  input(composer, '/skill:paper-r');
  await flush();
  assert.deepEqual(
    [...page.$('#command-menu').querySelectorAll('[data-command]')].map((node: any) => node.dataset.command),
    ['skill:paper-reading'],
  );
  composer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await flush();
  assert.equal(page.workspace.state.draft, '/skill:paper-reading');
  assert.equal(page.$('#command-menu'), null);
  assert.equal(page.calls.some((call) => call.path.startsWith('/api/chats/') && call.path.endsWith('/commands')), false);

  // 点击菜单项同样只插入命令。
  input(composer, '/help');
  await flush();
  click(page.$('#command-menu [data-command="help"]'));
  await flush();
  assert.equal(page.workspace.state.draft, '/help');
  assert.equal(page.$('#command-menu'), null);

  // 带参数后菜单收起，避免遮挡正文。
  input(composer, '/skill:paper-reading 只看第三节');
  await flush();
  assert.equal(page.$('#command-menu'), null);
  input(composer, '');
  await flush();
});

test('提交斜杠命令走命令接口并保留提示菜单可发现性', async (t) => {
  const page = await fixture(t);
  const composer = page.$('#chat-input');
  // 选中文献与阅读位置必须跟着命令请求一起发送，否则技能回合看不到当前论文。
  page.workspace.state.context.add('L001');
  page.workspace.state.current = 'L001';
  page.workspace.state.pdfPage = 3;
  input(composer, '/help');
  await flush();
  page.$('#chat-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  await until(() => page.calls.some((call) => call.path.startsWith('/api/chats/') && call.path.endsWith('/commands')));
  const call = page.calls.find((item) => item.path.startsWith('/api/chats/') && item.path.endsWith('/commands'));
  assert.equal(call.method, 'POST');
  assert.equal(call.body.text, '/help');
  assert.deepEqual(call.body.paperIds, ['L001']);
  assert.equal(call.body.activePaperId, 'L001');
  assert.equal(call.body.pdfPage, 3);
  assert.match(page.$('#messages').textContent, /斜杠命令/);
  assert.equal(page.workspace.state.draft, '');
});

test('当前论文的两个按钮调用对应技能，保留输入草稿并等待用户确认保存笔记', async (t) => {
  const page = await fixture(t);
  const actions = [...page.target.querySelectorAll<HTMLButtonElement>('.paper-actions button')];
  const [review, summarize] = actions;
  assert.deepEqual(actions.map((button) => button.textContent?.trim()), ['值得读吗？', '总结全文', '智能归类']);
  assert.ok(actions.every((button) => button.disabled));

  const { state } = page.workspace;
  state.context.add('L001');
  state.current = 'L002';
  state.pdfPage = 3;
  input(page.$('#chat-input'), '保留这条准备发送的问题');
  await flush();
  assert.ok(actions.every((button) => !button.disabled));

  const commands = () => page.calls.filter((call) => call.path.endsWith('/commands') && call.method === 'POST');
  review.click();
  await until(() => commands().length === 1 && !state.sending);
  const decision = commands()[0].body;
  assert.match(decision.text, /^\/skill:paper-reading .*证据不足时标为待判断/);
  assert.doesNotMatch(decision.text, /draft_note/);
  assert.ok(state.chat.messages.length > 0);
  assert.equal(summarize.disabled, false);

  summarize.click();
  await until(() => commands().length === 2 && !state.sending);
  const summary = commands()[1].body;
  assert.match(summary.text, /^\/skill:paper-experiments .*调用 draft_note/);
  for (const command of [decision, summary]) {
    assert.deepEqual(command.paperIds, ['L002']);
    assert.equal(command.activePaperId, 'L002');
    assert.equal(command.pdfPage, 3);
  }
  assert.equal(commands()[0].path, commands()[1].path);
  assert.deepEqual([...state.context], ['L001']);
  assert.equal(state.draft, '保留这条准备发送的问题');
  assert.deepEqual(page.noteDecisions, []);
});

test('空白阅读笔记页的两个按钮执行当前论文技能并切到助手面板', async (t) => {
  const page = await fixture(t);
  const { state } = page.workspace;
  click(page.$('[data-paper="L002"]'));
  await flush();
  click(page.$('[data-reader-mode="note"]'));
  await flush();

  const actions = () => [...page.target.querySelectorAll<HTMLButtonElement>('#reader-content .paper-actions button')];
  assert.deepEqual(actions().map((button) => button.textContent?.trim()), ['值得读吗？', '总结全文', '智能归类']);
  assert.equal(page.$('#ask-note'), null);

  const commands = () => page.calls.filter((call) => call.path.endsWith('/commands') && call.method === 'POST');
  for (const [index, skill] of ['paper-reading', 'paper-experiments'].entries()) {
    page.workspace.setPanel('reader');
    await flush();
    actions()[index].click();
    await until(() => commands().length === index + 1 && !state.sending);
    const { body } = commands()[index];
    assert.ok(body.text.startsWith(`/skill:${skill} `));
    assert.equal(body.activePaperId, 'L002');
    assert.deepEqual(body.paperIds, ['L002']);
    assert.equal(state.panel, 'chat');
  }

  click(page.$('[data-reader-mode="pdf"]'));
  await flush();
  assert.equal(actions().length, 0);
  click(page.$('[data-reader-mode="note"]'));
  await flush();
  assert.equal(actions().length, 3);
});

test('归类提案卡片显示依据与待新建目录，确认与取消按勾选项提交', async (t) => {
  const page = await fixture(t);
  const { workspace } = page;
  const proposal = (id: string, patch: Record<string, unknown> = {}) => ({
    id, paperId: `L00${id.length}`, title: `论文 ${id}`, fromPath: 'papers/01_综述',
    targetCategory: '02_方法', targetPath: 'papers/02_方法', willCreateCategory: false,
    willCreateSubcategory: false, basis: 'notes', reason: '笔记都在讲方法', createdAt: new Date().toISOString(),
    ...patch,
  });
  workspace.state.chat = {
    id: 'classify-chat', messages: [], noteDrafts: [],
    classifyProposals: [
      proposal('c1', { paperId: 'L001' }),
      proposal('c2', {
        targetCategory: '新领域', targetSubcategory: '子方向', targetPath: 'papers/新领域/子方向',
        willCreateCategory: true, willCreateSubcategory: true, basis: 'translation',
      }),
      proposal('c3', { basis: 'notes+translation', reason: '笔记与译文一致' }),
      proposal('blocked', { paperId: 'L002', basis: 'pdf', error: '目标目录不可写。' }),
    ],
  };
  page.chats.set('classify-chat', JSON.parse(JSON.stringify(workspace.state.chat)));
  await flush();
  assert.equal(document.querySelectorAll('.classify-proposal').length, 1);
  assert.equal(document.querySelectorAll('.classify-proposal-rows li').length, 4);
  // 新增提案默认勾选，便于一次确认。
  assert.equal(document.querySelectorAll('.classify-proposal input:checked').length, 4);
  const card = page.$('.classify-proposal');
  assert.equal(card.getAttribute('aria-label'), '确认论文归类');
  assert.match(card.textContent, /已选/);
  assert.match(page.$('[data-classify-proposal="c1"]').textContent, /papers\/01_综述/);
  assert.match(page.$('[data-classify-proposal="c1"]').textContent, /papers\/02_方法/);
  assert.match(page.$('[data-classify-proposal="c1"]').textContent, /依据：笔记/);
  assert.match(page.$('[data-classify-proposal="c1"]').textContent, /笔记都在讲方法/);
  // 只有需要新建目录的行显示提示标签。
  assert.doesNotMatch(page.$('[data-classify-proposal="c1"]').textContent, /将新建文件夹/);
  assert.match(page.$('[data-classify-proposal="c2"]').textContent, /将新建文件夹/);
  assert.match(page.$('[data-classify-proposal="c2"]').textContent, /依据：中文翻译/);
  assert.match(page.$('[data-classify-proposal="c3"]').textContent, /依据：笔记 \+ 译文/);
  assert.match(page.$('[data-classify-proposal="blocked"]').textContent, /依据：原文/);
  assert.match(page.$('[data-classify-proposal="blocked"]').textContent, /目标目录不可写/);
  assert.match(page.$('.classify-proposal-error').getAttribute('role') ?? '', /alert/);

  // 取消选中某行后，只提交剩余勾选项。
  const unchecked = page.$('[data-classify-proposal="c3"] input');
  unchecked.click();
  await flush();
  assert.equal(unchecked.checked, false);
  const apply = page.$('[data-classify-apply]');
  click(apply);
  click(apply);
  await until(() => !workspace.state.classifySaving);
  assert.match(page.classifyDecisions[0].body.requestId, /^[A-Za-z0-9_-]{1,128}$/);
  assert.deepEqual(page.classifyDecisions, [{
    id: 'classify-chat', body: {
      action: 'apply', ids: ['c1', 'c2', 'blocked'], requestId: page.classifyDecisions[0].body.requestId,
    },
  }]);
  assert.equal(page.$('[data-classify-apply]').disabled, true);
  page.completeClassification('classify-chat');
  await flush();
  // 成功项移除、失败项保留并回显原因，未选中的行原样保留（顺序按卡片原有顺序）。
  assert.deepEqual(workspace.state.chat.classifyProposals.map((item: any) => item.id), ['c3', 'blocked']);
  assert.match(page.$('[data-classify-proposal="blocked"]').textContent, /目标目录不可写/);
  assert.equal(page.$('[data-classify-proposal="c1"]'), null);
  const resultDetails = page.$('[data-message="classify-result-1"] .message-result');
  assert.equal(resultDetails.tagName, 'DETAILS');
  assert.equal(resultDetails.open, false);
  assert.equal(resultDetails.querySelector('summary').textContent, '操作结果');
  assert.equal(resultDetails.querySelector('.message-body'), null);
  click(resultDetails.querySelector('summary'));
  await until(() => resultDetails.querySelector('.message-body'));
  assert.equal(resultDetails.open, true);
  assert.match(resultDetails.textContent, /已新建文件夹/);
  assert.match(resultDetails.textContent, /L001 已归类至/);
  // SSE 与 HTTP 都送达时，同一条持久回执只显示一次，并保留用户的展开状态。
  const receipt = workspace.state.chat.messages.at(-1);
  workspace.receive({ type: 'message', chatId: 'classify-chat', message: receipt });
  await flush();
  assert.equal(document.querySelectorAll('[data-message="classify-result-1"]').length, 1);
  assert.equal(resultDetails.open, true);
  click(resultDetails.querySelector('summary'));
  await flush();
  assert.equal(resultDetails.open, false);

  workspace.receive({
    type: 'message', chatId: 'classify-chat',
    message: {
      id: 'classify-result-2', role: 'system', text: '已取消归类请求。', status: 'completed',
    },
  });
  click(page.$('[data-classify-discard]'));
  await until(() => !workspace.state.classifySaving);
  assert.deepEqual(page.classifyDecisions[1], {
    id: 'classify-chat', body: { action: 'discard', ids: ['blocked'] },
  });
  assert.deepEqual(workspace.state.chat.classifyProposals.map((item: any) => item.id), ['c3']);
  assert.ok(workspace.state.chat.messages.some(({ text }: { text: string }) => /已取消 L002 的归类请求/.test(text)));
  assert.equal(document.querySelectorAll('[data-message="classify-result-2"]').length, 1);
});

test('同一论文重新提案时替换实时卡片，确认只提交最新提案', async (t) => {
  const page = await fixture(t);
  const { workspace } = page;
  const proposal = {
    id: 'old-proposal', paperId: 'L001', title: '论文', fromPath: 'papers/01_综述',
    targetCategory: '02_方法', targetPath: 'papers/02_方法', willCreateCategory: false,
    willCreateSubcategory: false, basis: 'notes', reason: '原提案', createdAt: new Date().toISOString(),
  };
  workspace.state.chat = { id: 'classify-chat', messages: [], classifyProposals: [proposal] };
  await flush();
  workspace.receive({
    type: 'classifyProposal', chatId: 'classify-chat', revision: 1,
    proposal: { ...proposal, id: 'new-proposal', reason: '重新核对后的提案' },
  });
  await flush();
  assert.equal(document.querySelectorAll('.classify-proposal-rows li').length, 1);
  assert.equal(page.$('[data-classify-proposal="old-proposal"]'), null);
  assert.match(page.$('[data-classify-proposal="new-proposal"]').textContent, /重新核对后的提案/);
  page.chats.set('classify-chat', JSON.parse(JSON.stringify(workspace.state.chat)));
  click(page.$('[data-classify-apply]'));
  await until(() => !workspace.state.classifySaving);
  assert.deepEqual(page.classifyDecisions, [{
    id: 'classify-chat', body: {
      action: 'apply', ids: ['new-proposal'], requestId: page.classifyDecisions[0].body.requestId,
    },
  }]);
  page.completeClassification('classify-chat');
  await flush();
  assert.deepEqual(workspace.state.chat.classifyProposals, []);
});

test('智能归类按钮按归类技能发起会话并保留当前选中文献', async (t) => {
  const page = await fixture(t);
  const { state } = page.workspace;
  state.context.add('L001');
  state.current = 'L002';
  state.pdfPage = 4;
  await flush();
  const organize = [...page.target.querySelectorAll<HTMLButtonElement>('.paper-actions button')]
    .find((button) => button.textContent?.trim() === '智能归类');
  assert.ok(organize);
  organize.click();
  await until(() => page.calls.some((call) => call.path.endsWith('/commands') && call.method === 'POST'));
  const { body } = page.calls.find((call) => call.path.endsWith('/commands') && call.method === 'POST');
  assert.ok(body.text.startsWith('/skill:paper-organize '));
  // 技能正文要求先查目录、再读笔记或译文，最后提交确认卡片。
  assert.match(body.text, /library_categories/);
  assert.match(body.text, /read_paper_translation/);
  assert.match(body.text, /propose_paper_classification/);
  assert.deepEqual(body.paperIds, ['L002']);
  assert.equal(body.activePaperId, 'L002');
  assert.equal(body.pdfPage, 4);
  assert.equal(state.panel, 'chat');
});
