<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import QuestionPapers from './QuestionPapers.vue';
import Icon from './Icon.vue';
import PanelHandle from './PanelHandle.vue';
import Composer from './Composer.vue';
import ChatMessage from './ChatMessage.vue';
import ApprovalCard from './ApprovalCard.vue';
import NoteDraftCard from './NoteDraftCard.vue';
import FolderActionCard from './FolderActionCard.vue';
import ClassifyProposalCard from './ClassifyProposalCard.vue';
import AgentSettingsDialog from './AgentSettingsDialog.vue';
import PaperActions from './PaperActions.vue';
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
const folderActions = computed(() => state.chat?.folderActions || []);
const classifyProposals = computed(() => state.chat?.classifyProposals || []);
const promptTemplates: Array<[string, string, string]> = [
  ['search', '解释方法', '请详细解释当前论文的核心方法、输入输出和关键假设，区分作者报告与补充解释。'],
  ['link', '比较论文', '请比较选中论文的研究任务、数据、评价条件和局限；不可比的指标请明确指出。'],
  ['download', '查找与下载', '请帮我检索并下载相关论文，先核对来源与版本，按项目约定归档并更新索引。'],
];
let scrollFrame: number | null = null;
let following = true;
let forceScroll = false;

function queueScroll(force = false): void {
  forceScroll ||= force;
  if (force) following = true;
  if (scrollFrame !== null || !following && !forceScroll) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = null;
    if (messages.value && (following || forceScroll)) messages.value.scrollTop = messages.value.scrollHeight;
    forceScroll = false;
  });
}
function messageScroll(): void {
  const element = messages.value;
  if (element) following = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
  if (!following) forceScroll = false;
}
function rendered(): void { queueScroll(); }
watch([
  () => state.chat?.id,
  () => state.chat?.messages?.length,
  () => state.chat?.messages?.at(-1)?.id,
  () => state.chat?.messages?.at(-1)?.text?.length,
  () => state.chat?.messages?.at(-1)?.thinking?.length,
  () => state.chat?.messages?.at(-1)?.status,
  () => state.historyOpen,
], async (value, previous) => {
  const changedChat = value[0] !== previous?.[0];
  if (!changedChat && !forceScroll) messageScroll();
  await nextTick();
  queueScroll(changedChat);
});
onBeforeUnmount(() => { if (scrollFrame !== null) cancelAnimationFrame(scrollFrame); });
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
        <span class="agent-mark"><Icon name="spark" /></span>
        <span class="agent-title-copy">
          <span class="agent-name">Pi Agent</span>
          <span class="agent-subtitle">研究助手</span>
        </span>
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
          <small v-if="chat.classifyRunning" role="status">归类中</small>
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
    <PaperActions v-if="!isArchived" />
    <div id="messages" ref="messages" class="messages" role="log" aria-label="对话消息" aria-live="off"
      @scroll.passive="messageScroll">
      <ChatMessage v-for="message in state.chat?.messages || []" :key="message.id" :message="message"
        @rendered="rendered" />
      <section v-if="!isArchived && !state.chat?.messages?.length" class="prompt-shortcuts" aria-label="提问模板">
        <div class="assistant-welcome">
          <span class="welcome-mark"><Icon name="spark" /></span>
          <h2>需要我帮你读什么？</h2>
          <p>可以从解释方法、比较论文或查找相关研究开始。</p>
        </div>
        <div class="prompt-list">
          <span class="prompt-label">常用提问</span>
          <button
            v-for="[image, label, prompt] in promptTemplates"
            :key="label"
            class="prompt-shortcut"
            @click="workspace.setDraft(prompt)"
          >
            <span class="prompt-icon"><Icon :name="image" /></span>
            <span>{{ label }}</span>
            <Icon class="prompt-arrow" name="arrow" />
          </button>
        </div>
      </section>
    </div>
    <div v-if="!isArchived && (classifyProposals.length || workspace.classifying.value)"
      id="classify-proposals" class="classify-proposals"
      aria-live="polite">
      <ClassifyProposalCard :key="state.chat?.id" :proposals="classifyProposals" />
    </div>
    <div v-if="!isArchived && folderActions.length" id="folder-actions" class="folder-actions" aria-live="polite">
      <FolderActionCard :key="state.chat?.id" :actions="folderActions" />
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
    <template v-else><QuestionPapers /><Composer /></template>
    <AgentSettingsDialog v-if="state.agentSettingsOpen" @close="state.agentSettingsOpen = false" />
  </aside>
</template>
