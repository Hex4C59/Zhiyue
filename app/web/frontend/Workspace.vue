<script setup lang="ts">
import { onBeforeUnmount, onMounted, provide, computed } from 'vue';
import { initializePanelResizing } from './lib/layout';
import Sidebar from './components/Sidebar.vue';
import PaperList from './components/PaperList.vue';
import ReaderPane from './components/ReaderPane.vue';
import AssistantPane from './components/AssistantPane.vue';
import DownloadPanel from './components/DownloadPanel.vue';
import ImportPaperDialog from './components/ImportPaperDialog.vue';
import type { WorkspaceApi } from './lib/workspace';

const props = defineProps<{ workspace: WorkspaceApi }>();
provide('workspace', props.workspace);
const workspace = props.workspace;
const state = workspace.state;
const noteCount = computed(() => state.papers.filter((paper) => paper.notes?.length).length);
function afterImport(id?: string): void {
  workspace.setView('library');
  if (id) workspace.selectPaper(id);
}
const panelKeys: Array<['list' | 'reader' | 'chat', string]> = [
  ['list', '文献'],
  ['reader', '阅读'],
  ['chat', '研究助手'],
];
let disposeLayout: (() => void) | undefined;
let lifecycle: AbortController | undefined;
onMounted(() => {
  disposeLayout = initializePanelResizing(document);
  lifecycle = new window.AbortController();
  document.addEventListener(
    'keydown',
    (event) => {
      const target = event.target as HTMLElement;
      if (
        event.key !== '/' ||
        /INPUT|TEXTAREA|SELECT/.test(target.tagName) ||
        target.isContentEditable
      ) return;
      event.preventDefault();
      workspace.setView('library');
      workspace.setPanel('list');
      document.querySelector<HTMLElement>('#search')?.focus();
    },
    { signal: lifecycle.signal },
  );
});
onBeforeUnmount(() => {
  disposeLayout?.();
  lifecycle?.abort();
  workspace.stop();
});
</script>

<template>
  <div class="shell" data-framework="vue">
    <Sidebar />
    <main class="main">
      <header class="topbar">
        <h1 id="page-title">{{ state.view === 'library' ? '文献' : '下载任务' }}</h1>
        <div class="top-actions">
          <span id="library-summary" class="muted"
            >{{ state.papers.length }} 篇文献 · {{ noteCount }} 篇有笔记</span
          >
        </div>
      </header>
      <div v-show="state.view === 'library'" class="mobile-tabs" aria-label="工作面板">
        <button
          v-for="[panel, label] in panelKeys"
          :key="panel"
          :class="{ active: state.panel === panel }"
          :data-panel="panel"
          @click="workspace.setPanel(panel)"
        >
          {{ label }}
        </button>
      </div>
      <section
        id="library-view"
        v-show="state.view === 'library'"
        class="library-layout"
        :data-panel="state.panel"
      >
        <PaperList /><ReaderPane /><AssistantPane />
      </section>
      <DownloadPanel v-show="state.view === 'downloads'" />
    </main>
    <ImportPaperDialog
      v-if="state.importOpen"
      @close="state.importOpen = false"
      @imported="afterImport"
    />
  </div>
  <div id="toast-region" class="toast-region" role="status" aria-live="polite">
    <div v-for="toast in state.toasts" :key="toast.id" class="toast" :class="{ error: toast.error }">
      {{ toast.message }}
    </div>
  </div>
</template>
