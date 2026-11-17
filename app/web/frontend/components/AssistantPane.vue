<script setup>
import { computed, inject, nextTick, ref, watch } from 'vue';
import { titleOf } from '../lib/content.js';
import Icon from './Icon.vue';
import PanelHandle from './PanelHandle.vue';
import Composer from './Composer.vue';
import ChatMessage from './ChatMessage.vue';
import ApprovalCard from './ApprovalCard.vue';
import NoteDraftCard from './NoteDraftCard.vue';
import AgentSettingsDialog from './AgentSettingsDialog.vue';
const workspace = inject('workspace'),
  state = workspace.state;
const { agent } = workspace,
  messages = ref(null),
  settingsOpen = ref(false);
const detecting = computed(
  () =>
    agent.value.loading === true ||
    agent.value.available == null ||
    agent.value.authenticated == null ||
    agent.value.available === 'loading',
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
const banner = computed(() => state.statusError || (!detecting.value && !connected.value));
const approvals = computed(() =>
  [...state.approvals.values()].filter(
    (approval) => approval.chatId === state.chat?.id && !state.resolvedApprovals.has(approval.id),
  ),
);
const noteDrafts = computed(() => state.chat?.noteDrafts || []);
const presets = [
  ['book', '概括论文', '请结合当前选中的论文，解释它的研究问题、核心贡献与证据，并给出原文定位。'],
  ['spark', '解释方法', '请详细解释当前论文的核心方法、输入输出和关键假设，区分作者报告与补充解释。'],
  ['link', '比较论文', '请比较选中论文的研究任务、数据、评价条件和局限；不可比的指标请明确指出。'],
  ['download', '查找与下载', '请帮我检索并下载相关论文，先核对来源与版本，按项目约定归档并更新索引。'],
];
const paperTitle = (id) =>
  titleOf(state.papers.find((paper) => paper.literature_id === id) || { literature_id: id });
watch(
  () => {
    const items = state.chat?.messages || [],
      last = items.at(-1);
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
function history() {
  state.historyOpen = !state.historyOpen;
  if (state.historyOpen) workspace.loadChats();
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
          @click="settingsOpen = true"
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
      <button
        v-for="chat in state.chats"
        :key="chat.id"
        class="history-item"
        :class="{ active: state.chat?.id === chat.id }"
        :data-chat="chat.id"
        @click="workspace.openChat(chat.id)"
      >
        {{ chat.title || '新会话' }}
        <small
          >{{ new Date(chat.createdAt).toLocaleString('zh-CN') }}
          {{ (chat.paperIds || []).join(' · ') }}</small
        >
      </button>
      <div v-if="!state.chats.length" class="empty">暂无会话</div>
    </div>
    <div v-if="banner" id="auth-banner" class="auth-banner">
      <span>{{ state.statusError || agent.error || 'Pi 尚未配置模型或密钥。' }}</span>
      <span class="auth-banner-actions">
        <button id="open-agent-settings" @click="settingsOpen = true">配置模型与密钥</button>
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
    <div id="messages" ref="messages" class="messages" role="log" aria-label="对话消息" aria-live="off">
      <ChatMessage v-for="message in state.chat?.messages || []" :key="message.id" :message="message" />
      <div v-if="!state.chat?.messages?.length" class="chat-empty">
        <h2>从一个问题开始</h2>
        <div class="presets">
          <button
            v-for="[image, label, prompt] in presets"
            :key="label"
            class="preset"
            :data-prompt="prompt"
            @click="workspace.setDraft(prompt)"
          >
            <Icon :name="image" />{{ label }}
          </button>
        </div>
      </div>
    </div>
    <div v-if="noteDrafts.length" id="note-drafts" class="note-drafts" aria-live="polite">
      <NoteDraftCard v-for="draft in noteDrafts" :key="draft.id" :draft="draft" />
    </div>
    <div id="approvals" class="approvals" aria-live="polite">
      <ApprovalCard v-for="approval in approvals" :key="approval.id" :approval="approval" />
    </div>
    <Composer />
    <AgentSettingsDialog v-if="settingsOpen" @close="settingsOpen = false" />
  </aside>
</template>
