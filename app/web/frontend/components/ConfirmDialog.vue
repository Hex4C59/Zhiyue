<script setup lang="ts">
import { onMounted, ref } from 'vue';

// 通用确认对话框：替代 window.confirm，避免弹出带 URL 的浏览器原生框。
// 默认把焦点放在取消按钮上，删除类操作必须先明确选中确认按钮。
const props = withDefaults(
  defineProps<{
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    busy?: boolean;
  }>(),
  { confirmLabel: '确定', cancelLabel: '取消', danger: false, busy: false },
);
const emit = defineEmits<{ confirm: []; cancel: [] }>();
const dialog = ref<HTMLDialogElement | null>(null);
const cancelButton = ref<HTMLButtonElement | null>(null);
onMounted(() => {
  const element = dialog.value;
  if (typeof element?.showModal === 'function') element.showModal();
  else element?.setAttribute('open', '');
  cancelButton.value?.focus();
});
function close(): void {
  if (props.busy) return;
  const element = dialog.value;
  if (typeof element?.close === 'function') element.close();
  emit('cancel');
}
function accept(): void {
  if (props.busy) return;
  emit('confirm');
}
function backdrop(event: MouseEvent): void {
  if (event.target === dialog.value && !props.busy) close();
}
</script>

<template>
  <dialog
    ref="dialog"
    class="confirm-dialog"
    aria-labelledby="confirm-title"
    @cancel.prevent="close"
    @click="backdrop"
  >
    <div class="confirm-sheet">
      <header class="confirm-head">
        <h2 id="confirm-title">{{ title }}</h2>
        <p>{{ message }}</p>
      </header>
      <p v-if="$slots.default" class="confirm-detail"><slot /></p>
      <footer class="confirm-actions">
        <button
          ref="cancelButton"
          type="button"
          class="button subtle"
          :disabled="busy"
          @click="close"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="button"
          :class="danger ? 'danger' : 'primary'"
          data-confirm-accept
          :disabled="busy"
          @click="accept"
        >
          {{ busy ? '处理中…' : confirmLabel }}
        </button>
      </footer>
    </div>
  </dialog>
</template>
