<script setup>
import { computed } from 'vue';
import { markdown, endpoint } from '../lib/content.js';
import { activeStatuses } from '../lib/workspace.js';
const props = defineProps({
  message: { type: Object, required: true },
});
const role = computed(() =>
  ['user', 'assistant', 'tool', 'system'].includes(props.message.role) ? props.message.role : 'assistant',
);
const label = computed(
  () => ({ user: '你', assistant: 'Pi Agent', tool: '工具', system: '系统' })[role.value],
);
const working = computed(() => activeStatuses.includes(props.message.status));
const failed = computed(() => ['error', 'failed'].includes(props.message.status));
const body = computed(() => markdown(props.message.text));
const error = computed(() => props.message.error?.message || props.message.error);
const stopped = computed(() => ['interrupted', 'cancelled'].includes(props.message.status));
const attachments = computed(() =>
  (props.message.attachments || props.message.attachmentIds || [])
    .map((file) => (typeof file === 'string' ? { id: file } : file))
    .filter((file) => file.id),
);
</script>

<template>
  <article class="message" :class="[role, { streaming: working, error: failed }]" :data-message="message.id">
    <div class="message-label sr-only">{{ label }}</div>
    <div v-if="role === 'user'" class="message-body">{{ message.text }}</div>
    <div v-else class="message-body markdown" v-html="body" />
    <div v-if="attachments.length" class="message-attachments">
      <a
        v-for="file in attachments"
        :key="file.id"
        :href="`/api/uploads/${endpoint(file.id)}`"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          v-if="(file.mime || file.mimeType || '').startsWith('image/')"
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
