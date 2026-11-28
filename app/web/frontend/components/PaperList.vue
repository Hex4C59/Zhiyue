<script setup lang="ts">
import { computed, inject } from 'vue';
import { authorText, readKey, readLabels, titleOf } from '../lib/content';
import FolderScope from './FolderScope.vue';
import Icon from './Icon.vue';
import PanelHandle from './PanelHandle.vue';
import VirtualList from './VirtualList.vue';
import type { Paper } from '../lib/types';
import { inPrimaryFolder, type WorkspaceApi } from '../lib/workspace';

const workspace = inject('workspace') as WorkspaceApi;
const state = workspace.state;
const years = computed(() =>
  [
    ...new Set(
      state.papers
        .map((paper) => paper.year)
        .filter(Boolean)
        .map(String),
    ),
  ].sort((a, b) => (Number(b) || 0) - (Number(a) || 0)),
);
const filtering = computed(
  () => !!(state.query.trim() || state.year || state.read || state.starred),
);
const emptyText = computed(() =>
  filtering.value
    ? '没有匹配的文献'
    : state.category
      ? '这个文件夹还没有文献'
      : '文献库还没有文献',
);
const papers = workspace.filteredPapers;
const showsPrimary = (paper: Paper): boolean => inPrimaryFolder(paper, state.category, state.subcategory);
const relatedHint = '此文件夹存有该文献的关联版本或来源记录。点击可阅读主版本。';
const paperKey = (paper: Paper): string => paper.literature_id;
const resetKey = computed(() => JSON.stringify([
  state.query.trim().toLocaleLowerCase(), state.year, state.read, state.starred,
  state.category, state.subcategory, state.sort,
]));

function firstAuthor(paper: Paper): string {
  const first = Array.isArray(paper.authors) ? paper.authors[0] : paper.authors;
  return (typeof first === 'string' ? first : first?.name) || '作者待核实';
}
function viewAll(): void {
  state.category = '';
  state.subcategory = '';
  workspace.resetFilters();
}
function openImport(): void {
  state.importCategory = state.category
    ? `papers/${state.category}${state.subcategory ? `/${state.subcategory}` : ''}`
    : '';
  state.importOpen = true;
}

// 拖动只负责选中源；放置目标由左侧分类判断，实际移动由工作区提交给 Python。
function dragStart(event: DragEvent, paper: Paper): void {
  if (!showsPrimary(paper) || !workspace.beginPaperDrag(paper.literature_id)) {
    event.preventDefault();
    return;
  }
  const transfer = event.dataTransfer;
  if (!transfer) return;
  transfer.effectAllowed = 'move';
  transfer.setData('application/x-zhiyue-paper', paper.literature_id);
  transfer.setData('text/plain', paper.literature_id);
}
</script>

<template>
  <section id="paper-panel" class="paper-panel" aria-label="文献筛选与列表">
    <div class="list-controls">
      <FolderScope />
      <label class="search-box"
        ><Icon name="search" /><input
          id="search"
          v-model="state.query"
          type="search"
          placeholder="搜索题名、作者、编号…"
          aria-label="搜索文献"
        /><kbd>/</kbd></label
      >
      <div class="filter-row">
        <select id="year-filter" v-model="state.year" aria-label="按年份筛选">
          <option value="">全部年份</option>
          <option v-for="year in years" :key="year">{{ year }}</option>
        </select>
        <select id="read-filter" v-model="state.read" aria-label="按阅读状态筛选">
          <option value="">全部进度</option>
          <option v-for="(text, value) in readLabels" :key="value" :value="value">{{ text }}</option>
        </select>
        <button
          id="star-filter"
          class="icon-button"
          :class="{ selected: state.starred }"
          title="仅看收藏"
          aria-label="仅看收藏"
          :aria-pressed="state.starred"
          @click="state.starred = !state.starred"
        >
          <Icon name="star" />
        </button>
      </div>
      <div class="list-meta">
        <div class="list-meta-info">
          <span id="result-count">{{ state.libraryError ? '加载失败' : `${papers.length} 篇文献` }}</span>
          <select id="sort" v-model="state.sort" aria-label="排序">
            <option value="id">编号顺序</option>
            <option value="year-desc">年份从新到旧</option>
            <option value="year-asc">年份从旧到新</option>
            <option value="title">题名顺序</option>
          </select>
        </div>
        <button type="button" class="button subtle compact batch-translation-trigger"
          :disabled="!papers.length || !!state.libraryError" title="批量翻译当前筛选结果"
          data-batch-translation @click="workspace.openBatchTranslation(papers.map(paper => paper.literature_id))">
          批量翻译
        </button>
        <button
          id="refresh-catalog"
          class="icon-button compact"
          :class="{ refreshing: state.refreshing }"
          title="重新扫描目录并更新索引"
          aria-label="刷新索引"
          :disabled="state.refreshing"
          @click="workspace.refreshCatalog"
        >
          <Icon name="refresh" />
        </button>
      </div>
    </div>
    <VirtualList id="paper-list" class="paper-list" aria-label="论文列表"
      :items="state.libraryError ? [] : papers" :item-key="paperKey"
      :estimate="172" :gap="9" :reset-key="resetKey">
      <template #default="{ item: paper }">
        <article
          class="paper-card"
          :class="{
            active: state.current === paper.literature_id,
            dragging: state.draggingPaper === paper.literature_id,
          }"
          :data-paper="paper.literature_id"
          data-virtual-focus
          :draggable="showsPrimary(paper)"
          :title="titleOf(paper)"
          tabindex="0"
          :aria-label="titleOf(paper)"
          :aria-current="state.current === paper.literature_id"
          @dragstart="dragStart($event, paper)"
          @dragend="workspace.endPaperDrag()"
          @click="workspace.selectPaper(paper.literature_id)"
          @keydown.enter.self.prevent="workspace.selectPaper(paper.literature_id)"
          @keydown.space.self.prevent="workspace.selectPaper(paper.literature_id)"
        >
          <div class="paper-top">
            <span class="paper-id">{{ paper.literature_id }}</span>
            <button
              class="icon-button"
              :class="{ selected: paper.starred }"
              :aria-pressed="!!paper.starred"
              :title="paper.starred ? '取消收藏' : '收藏论文'"
              :aria-label="paper.starred ? '取消收藏' : '收藏论文'"
              :disabled="state.pendingPatches.has(paper.literature_id)"
              draggable="false"
              @dragstart.stop.prevent
              @click.stop="workspace.patchPaper(paper.literature_id, { starred: !paper.starred })"
            >
              <Icon name="star" />
            </button>
          </div>
          <h3>{{ titleOf(paper) }}</h3>
          <div class="paper-authors" :title="authorText(paper)">{{ firstAuthor(paper) }} · {{ paper.year || '年份待核实' }}</div>
          <div class="paper-bottom">
            <span v-if="!showsPrimary(paper)" class="tag" :title="relatedHint">关联文献</span>
            <span v-else class="tag" :title="String(paper.subcategory || paper.venue || '')">
              {{ String(paper.subcategory || paper.venue || paper.category || '未分类').replace(/^\d+_/, '') }}</span
            >
            <span :class="readKey(paper.readStatus)"
              ><i class="read-dot" />{{ readLabels[readKey(paper.readStatus)] }}</span
            >
          </div>
        </article>
      </template>
      <template #empty>
        <div v-if="state.libraryError" class="empty">
          <p class="error-text">{{ state.libraryError }}</p>
          <button class="button subtle" @click="workspace.loadLibrary">重新连接</button>
        </div>
        <div v-else class="empty paper-list-empty">
          <span class="empty-art"><Icon :name="filtering ? 'search' : 'library'" /></span>
          <h2>{{ filtering ? '没有找到匹配结果' : emptyText }}</h2>
          <p>{{ filtering ? '试试其他关键词，或清除筛选条件。' : '导入 PDF，慢慢搭建你的专属文献库。' }}</p>
          <div class="empty-actions">
            <button
              v-if="filtering"
              id="reset-filters"
              class="button subtle"
              @click="workspace.resetFilters"
            >
              清除筛选
            </button>
            <button v-if="state.category" class="button subtle" @click="viewAll">查看全部文献</button>
            <button v-if="!filtering" class="button primary" @click="openImport">
              <Icon name="upload" />导入 PDF
            </button>
          </div>
        </div>
      </template>
    </VirtualList>
    <PanelHandle kind="papers" />
  </section>
</template>
