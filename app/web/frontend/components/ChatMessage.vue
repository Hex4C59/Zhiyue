<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { markdown, endpoint } from '../lib/content';
import { useMessageText } from '../lib/messageRendering';
import { activeStatuses } from '../lib/workspace';
import type { ChatMessage } from '../lib/types';

const props = defineProps<{ message: ChatMessage }>();
const emit = defineEmits<{ rendered: [] }>();
const resultOpen = ref(false);
const thinkingOpen = ref(false);
const rendered = useMessageText(() => props.message, (status) => activeStatuses.includes(status));
const role = computed(() =>
  ['user', 'assistant', 'tool', 'system'].includes(props.message.role) ? props.message.role : 'assistant',
);
const label = computed(
  () => ({ user: '你', assistant: 'Pi Agent', tool: '工具', system: '系统' })[role.value] ?? 'Pi Agent',
);
const working = computed(() => activeStatuses.includes(props.message.status));
const failed = computed(() => ['error', 'failed'].includes(props.message.status));
const body = computed(() => role.value === 'system' && !resultOpen.value ? '' : markdown(rendered.text.value));
const thinking = computed(() => thinkingOpen.value ? markdown(rendered.thinking.value) : '');

function toggle(event: Event, kind: 'result' | 'thinking'): void {
  const open = (event.currentTarget as HTMLDetailsElement).open;
  if (kind === 'result') resultOpen.value = open;
  else thinkingOpen.value = open;
  if (open) rendered.flush();
}

watch([rendered.text, rendered.thinking, resultOpen, thinkingOpen], async (value, previous) => {
  const visibilityChanged = value[2] !== previous[2] || value[3] !== previous[3];
  const bodyChanged = value[0] !== previous[0] && (role.value !== 'system' || resultOpen.value);
  const thoughtsChanged = thinkingOpen.value && value[1] !== previous[1];
  if (!visibilityChanged && !bodyChanged && !thoughtsChanged) return;
  await nextTick();
  emit('rendered');
});
const error = computed(() => {
  const value = props.message.error;
  if (value && typeof value === 'object' && 'message' in value) return String((value as { message?: unknown }).message ?? '');
  return value ? String(value) : '';
});
const stopped = computed(() => ['interrupted', 'cancelled'].includes(props.message.status));
const attachments = computed(() =>
  (props.message.attachments || props.message.attachmentIds || [])
    .map((file) => (typeof file === 'string' ? { id: file } : file))
    .filter((file): file is { id: string; name?: string; mime?: string } => Boolean(file.id)),
);
</script>

<template>
  <article class="message" :class="[role, { streaming: working, error: failed }]" :data-message="message.id">
    <div class="message-label sr-only">{{ label }}</div>
    <div v-if="role === 'user'" class="message-body">{{ message.text }}</div>
    <details v-else-if="role === 'system'" class="message-result" :open="resultOpen" @toggle="toggle($event, 'result')">
      <summary>操作结果</summary>
      <div v-if="resultOpen" class="message-body markdown" v-html="body" />
    </details>
    <template v-else>
      <details v-if="message.thinking" class="message-thinking" :open="thinkingOpen"
        @toggle="toggle($event, 'thinking')">
        <summary>推理过程</summary>
        <div v-if="thinkingOpen" class="message-thinking-body markdown" v-html="thinking" />
      </details>
      <div class="message-body markdown" v-html="body" />
    </template>
    <div v-if="attachments.length" class="message-attachments">
      <a
        v-for="file in attachments"
        :key="file.id"
        :href="`/api/uploads/${endpoint(file.id)}`"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          v-if="(file.mime || '').startsWith('image/')"
          :src="`/api/uploads/${endpoint(file.id)}`"
          :alt="file.name || '上传的图片'"
          loading="lazy"
        />
        <template v-else>{{ file.name || '附件' }}</template>
      </a>
    </div>
    <div v-if="working && !error" class="message-status" role="status" aria-label="正在生成">
      <span class="typing-indicator" aria-hidden="true"><i /><i /><i /></span>
    </div>
    <div v-else-if="error || failed || stopped" class="message-status">
      {{ error || (failed ? '生成失败' : '已停止') }}
    </div>
  </article>
</template>
