<script setup>
import { inject, nextTick, ref, watch, onMounted } from 'vue';
import { endpoint } from '../lib/content.js';
import Icon from './Icon.vue';
import ModelPicker from './ModelPicker.vue';
const workspace = inject('workspace'),
  state = workspace.state;
const { canSend, generating } = workspace;
const input = ref(null),
  form = ref(null),
  stopping = ref(false);
function resize() {
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
function keydown(event) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
    event.preventDefault();
    if (canSend.value) form.value.requestSubmit();
  }
}
function pasted(event) {
  const files = [...(event.clipboardData?.items || [])]
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter(Boolean);
  if (files.length) {
    event.preventDefault();
    workspace.uploadFiles(files);
  }
}
function selected(event) {
  const files = [...event.target.files];
  event.target.value = '';
  workspace.uploadFiles(files);
}
function remove(key) {
  state.attachments = state.attachments.filter((file) => file.key !== key);
}
async function stop() {
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
    @submit.prevent="workspace.sendMessage"
    @dragover.prevent
    @drop.prevent="workspace.uploadFiles([...($event.dataTransfer?.files || [])])"
  >
    <div id="attachments" class="attachments">
      <div
        v-for="file in state.attachments"
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
    <textarea
      id="chat-input"
      ref="input"
      v-model="state.draft"
      rows="2"
      placeholder="输入问题…"
      @keydown="keydown"
      @paste="pasted"
    />
    <div class="composer-toolbar">
      <div class="composer-tools">
        <label class="icon-button upload-button" title="添加附件"
          ><Icon name="plus" />
          <input id="file-input" type="file" multiple aria-label="添加图片或文件" @change="selected" />
        </label>
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
