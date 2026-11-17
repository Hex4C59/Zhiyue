<script setup>
import { computed, provide, onMounted, onBeforeUnmount } from 'vue';
import { initializePanelResizing } from './lib/layout.js';
import Sidebar from './components/Sidebar.vue';
import PaperList from './components/PaperList.vue';
import ReaderPane from './components/ReaderPane.vue';
import AssistantPane from './components/AssistantPane.vue';
import DownloadPanel from './components/DownloadPanel.vue';
import ImportPaperDialog from './components/ImportPaperDialog.vue';
import Icon from './components/Icon.vue';

const props = defineProps({ workspace: { type: Object, required: true } });
provide('workspace', props.workspace);
const workspace = props.workspace,
  state = workspace.state;
const noteCount = computed(() => state.papers.filter((paper) => paper.notes?.length).length);
function afterImport(id) {
  workspace.setView('library');
  if (id) workspace.selectPaper(id);
}
let disposeLayout, lifecycle;
onMounted(() => {
  disposeLayout = initializePanelResizing(document);
  lifecycle = new window.AbortController();
  document.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key !== '/' ||
        /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) ||
        event.target.isContentEditable
      )
        return;
      event.preventDefault();
      workspace.setView('library');
      workspace.setPanel('list');
      document.querySelector('#search')?.focus();
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
          <button
            v-if="state.view === 'library'"
            id="import-paper"
            class="button primary"
            title="从本机导入 PDF 并归档"
            @click="state.importOpen = true"
          >
            <Icon name="upload" /><span>导入 PDF</span>
          </button>
          <button
            id="refresh-catalog"
            class="button subtle"
            title="重新扫描目录并更新索引"
            :disabled="state.refreshing"
            @click="workspace.refreshCatalog"
          >
            <Icon name="refresh" /><span>刷新索引</span>
          </button>
        </div>
      </header>
      <div v-show="state.view === 'library'" class="mobile-tabs" aria-label="工作面板">
        <button
          v-for="[panel, label] in [
            ['list', '文献'],
            ['reader', '阅读'],
            ['chat', '研究助手'],
          ]"
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
