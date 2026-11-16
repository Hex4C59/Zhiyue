<script setup>
import { inject, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { createReader } from '../lib/reader.js';
const workspace = inject('workspace'),
  state = workspace.state,
  scope = ref(null);
let reader;
onMounted(() => {
  reader = createReader({
    state,
    scope: scope.value,
    api: workspace.api,
    toast: workspace.toast,
    patchPaper: workspace.patchPaper,
    setPanel: workspace.setPanel,
    setDraft: workspace.setDraft,
  });
  reader.render();
});
watch(
  [
    () => workspace.currentPaper.value?.file,
    () => state.current,
    () => state.readerMode,
    () => state.notePath,
    () => state.pdfBrowser,
  ],
  () => reader?.render(),
  { flush: 'post' },
);
onBeforeUnmount(() => reader?.dispose());
</script>

<template>
  <section ref="scope" class="reader-panel" aria-label="阅读区">
    <div id="reader-header" class="reader-header" />
    <div id="reader-toolbar" class="reader-toolbar" hidden />
    <div id="reader-content" class="reader-content" tabindex="0" aria-label="论文阅读内容" />
  </section>
</template>
