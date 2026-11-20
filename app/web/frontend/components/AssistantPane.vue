<script setup lang="ts">
import { computed, inject, nextTick, ref, watch } from 'vue';
import { titleOf } from '../lib/content';
import Icon from './Icon.vue';
import PanelHandle from './PanelHandle.vue';
import Composer from './Composer.vue';
import ChatMessage from './ChatMessage.vue';
import ApprovalCard from './ApprovalCard.vue';
import NoteDraftCard from './NoteDraftCard.vue';
import AgentSettingsDialog from './AgentSettingsDialog.vue';
import type { PaperLike } from '../lib/content';
import type { Chat, ChatHistoryState } from '../lib/types';
import type { WorkspaceApi } from '../lib/workspace';

const workspace = inject('workspace') as WorkspaceApi;
const state = workspace.state;
const { agent } = workspace;
const messages = ref<HTMLElement | null>(null);
const historyTabs = [['active', '会话'], ['archived', '已归档'], ['trashed', '回收站']] as const;
const historyView = ref<ChatHistoryState>('active');
const historyChats = computed(() => state.chats.filter((chat) => (chat.historyState ?? 'active') === historyView.value));
const isArchived = computed(() => state.chat?.historyState === 'archived');

function trashChat(chat: Chat): void {
  if (window.confirm(`将「${chat.title || '新会话'}」移入会话回收站？`)) {
    void workspace.changeChatHistory(chat.id, 'trashed');
  }
}
const detecting = computed(
  () =>
    agent.value.loading === true ||
    agent.value.available == null ||
    agent.value.authenticated == null,
);
const connected = computed(() => agent.value.available === true && agent.value.authenticated === true);
const status = computed(() =>
  state.statusError || agent.value.available === false
    ? 'error'
    : detecting.value || !state.eventsOpen || !connected.value
      ? 'loading'
      : 'connected',
);
const statusText = computed(
  () =>
    state.statusError ||
    agent.value.error ||
    (connected.value && state.eventsOpen ? '已连接' : detecting.value ? '正在连接' : '等待配置'),
);
const banner = computed(() => Boolean(state.statusError) || (!detecting.value && !connected.value));
const approvals = computed(() =>
  [...state.approvals.values()].filter(
    (approval) => approval.chatId === state.chat?.id && !state.resolvedApprovals.has(approval.id),
  ),
);
const noteDrafts = computed(() => state.chat?.noteDrafts || []);
const paperActions = [
  {
    skill: 'paper-reading', icon: 'search', label: '值得读吗？', title: '判断当前论文是否值得精读',
    instruction: '根据本次阅读目的和文献库偏好，快速判断当前论文值得精读、略读还是跳过。'
      + '给出理由、原文定位和优先阅读位置，证据不足时标为待判断。只在聊天中回答，不生成笔记。',
  },
  {
    skill: 'paper-experiments', icon: 'book', label: '总结全文', title: '总结当前论文并生成笔记草稿',
    instruction: '按当前论文的类型总结全文，重点讲清方法或论证、关键证据、结果及直接相关工作。'
      + '算法论文要展开模型、实验设置和结果可比性。注明阅读范围和原文定位，并调用 draft_note 生成完整笔记草稿。',
  },
] as const;
const skillLoaded = (name: string): boolean =>
  state.commands.some((command) => command.source === 'skill' && command.name === `skill:${name}`);
function paperActionTitle(action: (typeof paperActions)[number]): string {
  if (!workspace.currentPaper.value) return '请先打开一篇论文';
  if (!skillLoaded(action.skill)) return '技能尚未加载，请在设置中重新扫描技能';
  return action.title;
}
const promptTemplates: Array<[string, string, string]> = [
  ['search', '解释方法', '请详细解释当前论文的核心方法、输入输出和关键假设，区分作者报告与补充解释。'],
  ['link', '比较论文', '请比较选中论文的研究任务、数据、评价条件和局限；不可比的指标请明确指出。'],
  ['download', '查找与下载', '请帮我检索并下载相关论文，先核对来源与版本，按项目约定归档并更新索引。'],
];
const paperTitle = (id: string): string =>
  titleOf((state.papers.find((paper) => paper.literature_id === id) || { literature_id: id }) as PaperLike);
watch(
  () => {
    const items = state.chat?.messages || [];
    const last = items.at(-1);
    return [state.chat?.id, items.length, last?.id, last?.text?.length, last?.status, state.historyOpen];
  },
  async (value, previous) => {
    const element = messages.value;
    const atEnd = !element || element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    await nextTick();
    if (messages.value && (value[0] !== previous?.[0] || atEnd)) {
      messages.value.scrollTop = messages.value.scrollHeight;
    }
  },
);
function history(): void {
  state.historyOpen = !state.historyOpen;
  if (state.historyOpen) workspace.loadChats();
}
function historyDate(chat: Chat): string {
  return new Date(chat.createdAt ?? '').toLocaleString('zh-CN');
}
</script>

<template>
  <aside id="assistant-panel" class="chat-panel" aria-label="文献研究助手">
    <PanelHandle kind="assistant" />
    <div class="chat-header">
      <div class="assistant-title">
        <span class="agent-name">Pi Agent</span>
        <span
          id="connection-status"
          class="connection-indicator"
          role="status"
          :aria-label="statusText"
          :title="statusText"
          :data-state="status"
        />
      </div>
      <div class="chat-actions">
        <button
          id="agent-settings"
          class="icon-button"
          title="模型与密钥"
          aria-label="模型与密钥"
          @click="state.agentSettingsOpen = true"
        >
          <Icon name="settings" />
        </button>
        <button
          id="chat-history-toggle"
          class="icon-button"
          title="会话列表"
          aria-label="会话列表"
          :aria-expanded="state.historyOpen"
          @click="history"
        >
          <Icon name="history" />
        </button>
        <button
          id="new-chat"
          class="icon-button"
          title="新建会话"
          aria-label="新建会话"
          :disabled="state.creating || state.sending"
          @click="workspace.newChat"
        >
          <Icon name="plus" />
        </button>
      </div>
    </div>
    <div v-if="state.historyOpen" id="chat-history" class="chat-history">
      <div class="segmented history-filters" role="group" aria-label="会话分类">
        <button
          v-for="[view, label] in historyTabs"
          :key="view"
          :class="{ active: historyView === view }"
          :aria-pressed="historyView === view"
          :data-history-view="view"
          @click="historyView = view"
        >{{ label }}</button>
      </div>
      <div v-for="chat in historyChats" :key="chat.id" class="history-row">
        <component
          :is="historyView === 'trashed' ? 'div' : 'button'"
          class="history-item"
          :class="{ active: state.chat?.id === chat.id }"
          :data-chat="chat.id"
          :title="chat.title || '新会话'"
          @click="historyView !== 'trashed' && workspace.openChat(chat.id)"
        >
          <span class="history-title">{{ chat.title || '新会话' }}</span>
          <small>{{ historyDate(chat) }} {{ (chat.paperIds || []).join(' · ') }}</small>
        </component>
        <div class="history-actions">
          <button
            v-if="historyView === 'active'"
            class="icon-button compact"
            title="归档会话"
            :aria-label="`归档会话：${chat.title || '新会话'}`"
            :disabled="!workspace.canChangeChat(chat.id)"
            @click="workspace.changeChatHistory(chat.id, 'archived')"
          ><Icon name="archive" /></button>
          <button
            v-else
            class="icon-button compact"
            title="恢复会话"
            :aria-label="`恢复会话：${chat.title || '新会话'}`"
            :disabled="!workspace.canChangeChat(chat.id)"
            @click="workspace.changeChatHistory(chat.id, 'active')"
          ><Icon name="restore" /></button>
          <button
            v-if="historyView !== 'trashed'"
            class="icon-button compact danger"
            title="删除会话"
            :aria-label="`删除会话：${chat.title || '新会话'}`"
            :disabled="!workspace.canChangeChat(chat.id)"
            @click="trashChat(chat)"
          ><Icon name="trash" /></button>
        </div>
      </div>
      <div v-if="!historyChats.length" class="empty">
        {{ { active: '暂无会话', archived: '暂无归档会话', trashed: '回收站为空' }[historyView] }}
      </div>
    </div>
    <div v-if="banner" id="auth-banner" class="auth-banner">
      <span>{{ state.statusError || agent.error || 'Pi 尚未配置模型或密钥。' }}</span>
      <span class="auth-banner-actions">
        <button id="open-agent-settings" @click="state.agentSettingsOpen = true">配置模型与密钥</button>
        <button id="retry-status" @click="workspace.reconnectAgent">重新检测</button>
      </span>
    </div>
    <div v-if="state.context.size" class="chat-context">
      <div id="context-papers">
        <button
          v-for="id in state.context"
          :key="id"
          class="context-chip"
          :data-context-remove="id"
          :title="paperTitle(id)"
          :aria-label="`移除 ${id}`"
          @click="state.context.delete(id)"
        >
          {{ id }}<Icon name="close" />
        </button>
      </div>
      <button
        id="clear-context"
        class="icon-button"
        title="清空论文上下文"
        aria-label="清空论文上下文"
        @click="state.context.clear()"
      >
        <Icon name="close" />
      </button>
    </div>
    <div v-if="!isArchived" class="paper-actions" role="group" aria-label="当前论文操作">
      <button
        v-for="action in paperActions"
        :key="action.skill"
        type="button"
        class="button subtle"
        :title="paperActionTitle(action)"
        :disabled="!workspace.canRunPaperSkill.value || !skillLoaded(action.skill)"
        @click="workspace.runPaperSkill(action.skill, action.instruction)"
      ><Icon :name="action.icon" />{{ action.label }}</button>
    </div>
    <div id="messages" ref="messages" class="messages" role="log" aria-label="对话消息" aria-live="off">
      <ChatMessage v-for="message in state.chat?.messages || []" :key="message.id" :message="message" />
      <section v-if="!isArchived && !state.chat?.messages?.length" class="prompt-shortcuts" aria-label="提问模板">
        <h2>提问模板</h2>
        <button
          v-for="[image, label, prompt] in promptTemplates"
          :key="label"
          class="prompt-shortcut"
          @click="workspace.setDraft(prompt)"
        >
          <Icon :name="image" />{{ label }}
        </button>
      </section>
    </div>
    <div v-if="!isArchived && noteDrafts.length" id="note-drafts" class="note-drafts" aria-live="polite">
      <NoteDraftCard v-for="draft in noteDrafts" :key="draft.id" :draft="draft" />
    </div>
    <div id="approvals" class="approvals" aria-live="polite">
      <ApprovalCard v-for="approval in approvals" :key="approval.id" :approval="approval" />
    </div>
    <div v-if="isArchived && state.chat" class="archived-chat">
      <button
        :disabled="!workspace.canChangeChat(state.chat.id)"
        @click="workspace.changeChatHistory(state.chat.id, 'active')"
      ><Icon name="restore" />恢复会话</button>
    </div>
    <Composer v-else />
    <AgentSettingsDialog v-if="state.agentSettingsOpen" @close="state.agentSettingsOpen = false" />
  </aside>
</template>
