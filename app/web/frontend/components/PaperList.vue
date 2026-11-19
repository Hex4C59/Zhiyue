<script setup lang="ts">
import { computed, inject } from 'vue';
import { authorText, readKey, readLabels, titleOf } from '../lib/content';
import Icon from './Icon.vue';
import PanelHandle from './PanelHandle.vue';
import type { Paper } from '../lib/types';
import type { WorkspaceApi } from '../lib/workspace';

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
const papers = computed<Paper[]>(() => {
  const query = state.query.trim().toLocaleLowerCase();
  const result = state.papers.filter((paper) => {
    const haystack = [
      paper.title,
      paper.titleZh,
      authorText(paper),
      paper.literature_id,
      paper.venue,
      paper.category,
      paper.subcategory,
    ]
      .join(' ')
      .toLocaleLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (!state.year || String(paper.year) === state.year) &&
      (!state.read || readKey(paper.readStatus) === state.read) &&
      (!state.starred || paper.starred) &&
      (!state.category || (paper.category || '未分类') === state.category) &&
      (!state.subcategory || paper.subcategory === state.subcategory)
    );
  });
  result.sort((a, b) =>
    state.sort.startsWith('year')
      ? (Number(a.year) || 0) - (Number(b.year) || 0)
      : state.sort === 'title'
        ? titleOf(a).localeCompare(titleOf(b))
        : a.literature_id.localeCompare(b.literature_id, undefined, { numeric: true }),
  );
  return state.sort === 'year-desc' ? result.reverse() : result;
});
</script>

<template>
  <section id="paper-panel" class="paper-panel" aria-label="文献筛选与列表">
    <div class="list-controls">
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
        <div class="list-meta-actions">
          <button
            id="import-paper"
            class="list-action"
            title="从本机导入 PDF 并归档"
            @click="state.importOpen = true"
          >
            <Icon name="upload" /><span>导入 PDF</span>
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
    </div>
    <div id="paper-list" class="paper-list" tabindex="0" aria-label="论文列表">
      <div v-if="state.libraryError" class="empty">
        <p class="error-text">{{ state.libraryError }}</p>
        <button class="button subtle" @click="workspace.loadLibrary">重新连接</button>
      </div>
      <article
        v-for="paper in papers"
        v-else
        :key="paper.literature_id"
        class="paper-card"
        :class="{ active: state.current === paper.literature_id }"
        :data-paper="paper.literature_id"
        tabindex="0"
        :aria-label="titleOf(paper)"
        :aria-current="state.current === paper.literature_id"
        @click="workspace.selectPaper(paper.literature_id)"
        @keydown.enter.self.prevent="workspace.selectPaper(paper.literature_id)"
        @keydown.space.self.prevent="workspace.selectPaper(paper.literature_id)"
      >
        <div class="paper-top">
          <span class="paper-id">{{ paper.literature_id }}</span>
          <span>· {{ paper.year || '年份待核实' }}</span>
          <button
            class="icon-button"
            :class="{ selected: paper.starred }"
            :aria-pressed="!!paper.starred"
            :title="paper.starred ? '取消收藏' : '收藏论文'"
            :aria-label="paper.starred ? '取消收藏' : '收藏论文'"
            :disabled="state.pendingPatches.has(paper.literature_id)"
            @click.stop="workspace.patchPaper(paper.literature_id, { starred: !paper.starred })"
          >
            <Icon name="star" />
          </button>
        </div>
        <h3>{{ titleOf(paper) }}</h3>
        <div class="paper-authors" :title="authorText(paper)">{{ authorText(paper) }}</div>
        <div class="paper-bottom">
          <span class="tag" :title="String(paper.subcategory || paper.venue || '')">
            {{ String(paper.subcategory || paper.venue || paper.category || '未分类').replace(/^\d+_/, '') }}</span
          >
          <span :class="readKey(paper.readStatus)"
            ><i class="read-dot" />{{ readLabels[readKey(paper.readStatus)] }}</span
          >
        </div>
      </article>
      <div v-if="!state.libraryError && !papers.length" class="empty">
        <span v-if="!filtering && !state.category" class="empty-art"><Icon name="library" /></span>
        <p>{{ emptyText }}</p>
        <div v-if="filtering || state.category" class="empty-actions">
          <button
            id="reset-filters"
            class="button subtle"
            @click="workspace.resetFilters"
          >
            {{ filtering ? '清除筛选' : '查看全部文献' }}
          </button>
        </div>
      </div>
    </div>
    <PanelHandle kind="papers" />
  </section>
</template>
