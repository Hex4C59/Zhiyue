<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import PaperActions from './PaperActions.vue';
import PdfTranslationControls from './PdfTranslationControls.vue';
import { createReader } from '../lib/reader';
import type { ReaderController } from '../lib/reader';
import type { WorkspaceApi } from '../lib/workspace';

const workspace = inject('workspace') as WorkspaceApi;
const state = workspace.state;
const scope = ref<HTMLElement | null>(null);
const pdfPaper = computed(() => state.readerMode === 'pdf' ? workspace.currentPaper.value : undefined);
const visibleNoteCount = computed(() => {
  const paper = workspace.currentPaper.value;
  if (!paper || state.readerMode !== 'note') return null;
  return Array.isArray(paper.notes) ? paper.notes.length : 0;
});
let reader: ReaderController | undefined;
onMounted(() => {
  if (!scope.value) return;
  reader = createReader({
    state,
    scope: scope.value,
    api: workspace.api,
    toast: workspace.toast,
    patchPaper: workspace.patchPaper,
    deleteNote: workspace.deleteNote,
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
    () => state.pdfTranslation,
    visibleNoteCount,
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
    <PdfTranslationControls v-if="pdfPaper?.file" :key="pdfPaper.literature_id"
      :paper-id="pdfPaper.literature_id" :file="pdfPaper.file" />
    <div v-if="visibleNoteCount === 0" id="reader-content" class="reader-content" tabindex="0" aria-label="论文阅读内容">
      <div class="empty">
        <h2>阅读笔记尚待积累</h2>
        <PaperActions />
      </div>
    </div>
    <div v-else id="reader-content" class="reader-content" tabindex="0" aria-label="论文阅读内容" />
  </section>
</template>
