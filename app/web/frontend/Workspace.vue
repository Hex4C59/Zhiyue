<script setup lang="ts">
import { onBeforeUnmount, onMounted, provide, computed, ref, watch } from 'vue';
import { initializePanelResizing } from './lib/layout';
import type { PanelLayout } from './lib/layout';
import Sidebar from './components/Sidebar.vue';
import PaperList from './components/PaperList.vue';
import ReaderPane from './components/ReaderPane.vue';
import AssistantPane from './components/AssistantPane.vue';
import DownloadPanel from './components/DownloadPanel.vue';
import ImportPaperDialog from './components/ImportPaperDialog.vue';
import BatchTranslationDialog from './components/BatchTranslationDialog.vue';
import Icon from './components/Icon.vue';
import type { WorkspaceApi } from './lib/workspace';

const COLLAPSE_STORAGE_KEY = 'zhiyue.panelCollapse';
interface CollapseState {
  sidebar: boolean;
  papers: boolean;
  assistant: boolean;
}
function loadCollapseState(): CollapseState {
  try {
    const raw = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (!raw) return { sidebar: false, papers: false, assistant: false };
    const parsed = JSON.parse(raw) as Partial<CollapseState>;
    return {
      sidebar: parsed.sidebar === true,
      papers: parsed.papers === true,
      assistant: parsed.assistant === true,
    };
  } catch {
    return { sidebar: false, papers: false, assistant: false };
  }
}

const props = defineProps<{ workspace: WorkspaceApi }>();
provide('workspace', props.workspace);
const workspace = props.workspace;
const state = workspace.state;
const noteCount = computed(() => state.papers.filter((paper) => paper.notes?.length).length);
const initialCollapse = loadCollapseState();
const sidebarCollapsed = ref(initialCollapse.sidebar);
const papersCollapsed = ref(initialCollapse.papers);
const assistantCollapsed = ref(initialCollapse.assistant);
const focusMode = computed(() => sidebarCollapsed.value && papersCollapsed.value && assistantCollapsed.value);

function saveCollapseState(): void {
  try {
    window.localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify({
      sidebar: sidebarCollapsed.value,
      papers: papersCollapsed.value,
      assistant: assistantCollapsed.value,
    }));
  } catch { /* 存储不可用时仅在当前会话生效。 */ }
}

function togglePapers(): void {
  papersCollapsed.value = !papersCollapsed.value;
  if (!papersCollapsed.value) sidebarCollapsed.value = false;
  saveCollapseState();
}

function toggleAssistant(): void {
  assistantCollapsed.value = !assistantCollapsed.value;
  saveCollapseState();
}

function toggleFocusMode(): void {
  const next = !focusMode.value;
  sidebarCollapsed.value = next;
  papersCollapsed.value = next;
  assistantCollapsed.value = next;
  saveCollapseState();
}

function afterImport(id?: string): void {
  workspace.setView('library');
  if (id) workspace.selectPaper(id);
}
function closeImport(): void {
  state.importOpen = false;
  state.importCategory = '';
}
const panelKeys: Array<['list' | 'reader' | 'chat', string]> = [
  ['list', '文献'],
  ['reader', '阅读'],
  ['chat', '研究助手'],
];
let disposeLayout: PanelLayout | undefined;
let lifecycle: AbortController | undefined;
onMounted(() => {
  disposeLayout = initializePanelResizing(document, {
    widths: state.panelWidths,
    onSave: (widths) => workspace.saveUiState({ panelWidths: widths }),
  });
  lifecycle = new window.AbortController();
  // 界面状态可能晚于挂载到达；拿到栏宽后重算布局，不用重新挂载。
  watch(
    () => state.panelWidths,
    (widths) => disposeLayout?.setWidths(widths),
    { deep: true },
  );
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
      if (papersCollapsed.value) {
        papersCollapsed.value = false;
        saveCollapseState();
      }
      workspace.setPanel('list');
      document.querySelector<HTMLElement>('#search')?.focus();
    },
    { signal: lifecycle.signal },
  );
});
onBeforeUnmount(() => {
  disposeLayout?.dispose();
  lifecycle?.abort();
  workspace.stop();
});
</script>

<template>
  <div class="shell" :class="{ 'sidebar-collapsed': sidebarCollapsed && state.view === 'library' }" data-framework="vue">
    <Sidebar />
    <main class="main">
      <header class="topbar">
        <h1 id="page-title">{{ state.view === 'library' ? '文献' : '下载任务' }}</h1>
        <div class="top-actions">
          <div v-if="state.view === 'library'" class="layout-toggles" role="group" aria-label="面板显示与专注模式">
            <button
              id="toggle-papers-panel"
              type="button"
              class="icon-button layout-toggle"
              :class="{ active: !papersCollapsed }"
              :aria-pressed="!papersCollapsed"
              :aria-label="papersCollapsed ? '展开左侧文献列表' : '收起左侧文献列表'"
              :title="papersCollapsed ? '展开左侧文献列表' : '收起左侧文献列表'"
              @click="togglePapers"
            >
              <Icon name="panelLeft" />
            </button>
            <button
              id="toggle-assistant-panel"
              type="button"
              class="icon-button layout-toggle"
              :class="{ active: !assistantCollapsed }"
              :aria-pressed="!assistantCollapsed"
              :aria-label="assistantCollapsed ? '展开右侧研究助手' : '收起右侧研究助手'"
              :title="assistantCollapsed ? '展开右侧研究助手' : '收起右侧研究助手'"
              @click="toggleAssistant"
            >
              <Icon name="panelRight" />
            </button>
            <button
              id="toggle-focus-mode"
              type="button"
              class="button subtle focus-toggle"
              :class="{ active: focusMode }"
              :aria-pressed="focusMode"
              :title="focusMode ? '退出专注阅读模式，恢复左右侧栏' : '专注阅读：同时收起左侧栏与研究助手'"
              @click="toggleFocusMode"
            >
              <Icon name="focus" /><span>{{ focusMode ? '退出专注' : '专注模式' }}</span>
            </button>
          </div>
          <button id="translation-tasks" type="button" class="button subtle translation-task-trigger"
            title="查看翻译队列与批次进度" @click="workspace.openTranslationTasks">
            翻译任务
            <span v-if="workspace.translationActivity.value.active">
              {{ workspace.translationActivity.value.processed }}/{{ workspace.translationActivity.value.total }}
            </span>
          </button>
          <span id="library-summary" class="muted"
            >{{ state.papers.length }} 篇文献 · {{ noteCount }} 篇有笔记</span
          >
          <button
            id="import-paper"
            type="button"
            class="button primary import-trigger"
            title="从本机导入 PDF 并归档"
            @click="state.importOpen = true"
          >
            <Icon name="upload" />导入 PDF
          </button>
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
        :class="{ 'papers-collapsed': papersCollapsed, 'assistant-collapsed': assistantCollapsed }"
        :data-panel="state.panel"
      >
        <PaperList /><ReaderPane /><AssistantPane />
      </section>
      <DownloadPanel v-show="state.view === 'downloads'" />
    </main>
    <BatchTranslationDialog v-if="state.translationOpen" />
    <ImportPaperDialog
      v-if="state.importOpen"
      @close="closeImport"
      @imported="afterImport"
    />
  </div>
  <div id="toast-region" class="toast-region" role="status" aria-live="polite">
    <div v-for="toast in state.toasts" :key="toast.id" class="toast" :class="{ error: toast.error }">
      {{ toast.message }}
    </div>
  </div>
</template>
