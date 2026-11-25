<script setup lang="ts">
import { inject, nextTick, onMounted, ref, watch } from 'vue';
import { endpoint } from '../lib/content';
import Icon from './Icon.vue';
import ModelPicker from './ModelPicker.vue';
import CommandMenu from './CommandMenu.vue';
import type { AttachmentItem } from '../lib/types';
import type { WorkspaceApi } from '../lib/workspace';

const workspace = inject('workspace') as WorkspaceApi;
const state = workspace.state;
const { canSend, generating } = workspace;
const input = ref<HTMLTextAreaElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const form = ref<HTMLFormElement | null>(null);
const menu = ref<InstanceType<typeof CommandMenu> | null>(null);
const stopping = ref(false);
function resize(): void {
  if (!input.value) return;
  input.value.style.height = '0px';
  input.value.style.height = `${Math.min(200, Math.max(58, input.value.scrollHeight))}px`;
  input.value.style.overflowY = input.value.scrollHeight > 200 ? 'auto' : 'hidden';
}
watch(() => state.draft, resize, { flush: 'post' });
watch(
  () => state.focusComposer,
  async () => {
    await nextTick();
    input.value?.focus();
  },
);
onMounted(resize);
function keydown(event: KeyboardEvent): void {
  // 命令菜单优先处理导航键，避免 Enter 插入命令时同时提交表单。
  if (menu.value?.keydown(event)) return;
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
    event.preventDefault();
    if (canSend.value) form.value?.requestSubmit();
  }
}
function pasted(event: ClipboardEvent): void {
  const files = [...(event.clipboardData?.items || [])]
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));
  if (files.length) {
    event.preventDefault();
    workspace.uploadFiles(files);
  }
}
function selected(event: Event): void {
  const target = event.target as HTMLInputElement;
  const files = [...(target.files || [])];
  target.value = '';
  workspace.uploadFiles(files);
}
function remove(key: string): void {
  state.attachments = state.attachments.filter((file) => file.key !== key);
}
async function stop(): Promise<void> {
  stopping.value = true;
  try {
    await workspace.interrupt();
  } finally {
    stopping.value = false;
  }
}
</script>

<template>
  <form
    id="chat-form"
    ref="form"
    class="composer"
    @submit.prevent="workspace.submit()"
    @dragover.prevent
    @drop.prevent="workspace.uploadFiles([...($event.dataTransfer?.files || [])])"
  >
    <div id="attachments" class="attachments">
      <div
        v-for="file in (state.attachments as AttachmentItem[])"
        :key="file.key"
        class="attachment"
        :class="{ error: file.status === 'error' }"
      >
        <img
          v-if="file.id && file.mime?.startsWith('image/')"
          :src="`/api/uploads/${endpoint(file.id)}`"
          :alt="file.name"
        />
        <Icon v-else name="attach" />
        <span class="attachment-name" :title="file.error || file.name"
          >{{ file.name }}
          {{ file.status === 'uploading' ? ' · 上传中' : file.status === 'error' ? ' · 失败' : '' }}</span
        >
        <button v-if="file.status === 'error'" type="button" @click="workspace.uploadOne(file)">重试</button>
        <button type="button" :aria-label="`移除附件 ${file.name}`" @click="remove(file.key)">×</button>
      </div>
    </div>
    <label class="sr-only" for="chat-input">向研究助手提问</label>
    <CommandMenu
      ref="menu"
      :draft="state.draft"
      :can-send="canSend"
    />
    <textarea
      id="chat-input"
      ref="input"
      v-model="state.draft"
      rows="2"
      placeholder="输入问题，或用 / 唤起命令…"
      @keydown="keydown"
      @paste="pasted"
    />
    <div class="composer-toolbar">
      <div class="composer-tools">
        <button
          type="button"
          class="attachment-picker"
          title="选择图片或文件作为本次提问的附件"
          @click="fileInput?.click()"
        >
          <Icon name="attach" /><span>添加文件</span>
        </button>
        <input id="file-input" ref="fileInput" type="file" hidden multiple @change="selected" />
        <ModelPicker />
      </div>
      <button
        v-if="generating"
        id="interrupt"
        type="button"
        class="send-button stop-button"
        title="停止生成"
        aria-label="停止生成"
        :disabled="stopping"
        @click="stop"
      >
        <Icon name="stop" />
      </button>
      <button
        v-else
        id="send"
        type="submit"
        class="send-button"
        title="发送"
        aria-label="发送消息"
        :disabled="!canSend"
      >
        <Icon name="arrow" />
      </button>
    </div>
  </form>
</template>
