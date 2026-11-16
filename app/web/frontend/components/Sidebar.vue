<script setup>
import { computed, inject } from 'vue';
import Icon from './Icon.vue';
import PanelHandle from './PanelHandle.vue';
const workspace = inject('workspace'),
  state = workspace.state;
const categories = computed(() => {
  const counts = new Map();
  for (const paper of state.papers) {
    const name = paper.category || '未分类';
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  const result = [{ name: '', label: '全部文献', count: state.papers.length, child: '' }];
  for (const [name, count] of counts) {
    result.push({ name, label: name, count, child: '' });
    if (state.category !== name) continue;
    const children = new Map();
    for (const paper of state.papers)
      if (paper.category === name && paper.subcategory) {
        children.set(paper.subcategory, (children.get(paper.subcategory) || 0) + 1);
      }
    for (const [child, total] of children) result.push({ name, label: child, count: total, child });
  }
  return result;
});
const label = (text) => text.replace(/^\d+_/, '').replaceAll('_', ' ');
function choose(category) {
  state.category = category.name;
  state.subcategory = category.child;
  workspace.setView('library');
  workspace.setPanel('list');
}
</script>

<template>
  <aside id="navigation-panel" class="sidebar" aria-label="主导航">
    <a class="brand" href="/" aria-label="Zhiyue 首页">
      <span class="brand-mark"><Icon /></span><span>Zhiyue</span>
    </a>
    <nav class="main-nav">
      <button
        class="nav-item"
        :class="{ active: state.view === 'library' }"
        data-view="library"
        @click="workspace.setView('library')"
      >
        <Icon name="library" />文献
        <span id="nav-total" class="count">{{ state.papers.length }}</span>
      </button>
      <button
        class="nav-item"
        :class="{ active: state.view === 'downloads' }"
        data-view="downloads"
        @click="workspace.setView('downloads')"
      >
        <Icon name="download" />下载任务
      </button>
    </nav>
    <div class="section-label">分类</div>
    <div id="categories" class="categories">
      <button
        v-for="category in categories"
        :key="`${category.name}/${category.child}`"
        class="category-button"
        :class="{
          'category-child': category.child,
          active: state.category === category.name && state.subcategory === category.child,
        }"
        @click="choose(category)"
      >
        <Icon v-if="!category.child" name="folder" />
        <span class="cat-name">{{ label(category.label) }}</span
        ><span class="cat-count">{{ category.count }}</span>
      </button>
    </div>
    <div class="sidebar-bottom"><span class="workspace-dot" /><span>本地工作区</span></div>
    <PanelHandle kind="sidebar" />
  </aside>
</template>
