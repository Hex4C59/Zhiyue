<script setup lang="ts">
import { computed, inject, nextTick, ref } from 'vue';
import Icon from './Icon.vue';
import PanelHandle from './PanelHandle.vue';
import type { WorkspaceApi } from '../lib/workspace';

interface CategoryRow {
  category: string;
  child: string;
  label: string;
  name: string;
  count: number;
}

interface ListResult {
  category?: string;
  subcategory?: string;
}

const workspace = inject('workspace') as WorkspaceApi;
const state = workspace.state;
const rows = computed<CategoryRow[]>(() => {
  const result: CategoryRow[] = [{ category: '', child: '', label: '全部文献', name: '', count: state.papers.length }];
  for (const category of state.categories || []) {
    if (!category.id) continue;
    result.push({
      category: category.id,
      child: '',
      label: category.name ?? category.id,
      name: category.name ?? category.id,
      count: category.count ?? 0,
    });
    if (state.category !== category.id) continue;
    for (const child of category.children || []) {
      result.push({
        category: category.id,
        child: child.name ?? '',
        label: child.name ?? '',
        name: child.name ?? '',
        count: child.count ?? 0,
      });
    }
  }
  return result;
});
const label = (text: string): string => text.replace(/^\d+_/, '').replaceAll('_', ' ');
const creating = ref(false);
const editing = ref<{ category: string; child: string } | null>(null);
const draft = ref('');
const saving = ref(false);
const editor = ref<HTMLInputElement | null>(null);
const setEditor = (element: unknown): void => {
  if (element) editor.value = element as HTMLInputElement;
};
function choose(row: CategoryRow): void {
  state.category = row.category;
  state.subcategory = row.child;
  workspace.setView('library');
  workspace.setPanel('list');
}
async function focusEditor(): Promise<void> {
  await nextTick();
  editor.value?.focus();
  editor.value?.select();
}
async function startCreate(): Promise<void> {
  if (saving.value) return;
  editing.value = null;
  draft.value = '';
  creating.value = true;
  await focusEditor();
}
function startRename(row: CategoryRow): void {
  if (saving.value) return;
  creating.value = false;
  editing.value = { category: row.category, child: row.child };
  draft.value = row.name.replace(/^\d+_/, '');
  void focusEditor();
}
function cancelEdit(): void {
  if (saving.value) return;
  creating.value = false;
  editing.value = null;
  draft.value = '';
}
function isEditing(row: CategoryRow): boolean {
  return (
    !!editing.value &&
    editing.value.category === row.category &&
    editing.value.child === row.child
  );
}
async function submitCreate(): Promise<void> {
  const name = draft.value.trim();
  if (!name || saving.value) return;
  saving.value = true;
  const result = await workspace.createCategory(name) as ListResult | null;
  saving.value = false;
  if (!result) return;
  creating.value = false;
  draft.value = '';
  state.category = result.category ?? state.category;
  state.subcategory = '';
  workspace.setView('library');
  workspace.setPanel('list');
  workspace.toast(`已新建文件夹「${label(result.category ?? '')}」`);
}
async function submitRename(row: CategoryRow): Promise<void> {
  const name = draft.value.trim();
  if (!name || saving.value) return;
  saving.value = true;
  const result = await workspace.renameCategory(row.category, row.child, name) as ListResult | null;
  saving.value = false;
  if (!result) return;
  editing.value = null;
  draft.value = '';
  if (row.child) {
    if (state.category === row.category && state.subcategory === row.child) {
      state.subcategory = result.subcategory ?? '';
    }
  } else if (state.category === row.category) {
    state.category = result.category ?? state.category;
  }
  workspace.toast(`文件夹已重命名为「${label(result.subcategory || result.category || '')}」`);
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
    <div class="section-head">
      <span class="section-label">分类</span>
      <button
        class="category-add"
        type="button"
        title="新建文件夹"
        aria-label="新建文件夹"
        :disabled="saving"
        @click="startCreate"
      >
        <Icon name="plus" />
      </button>
    </div>
    <div id="categories" class="categories">
      <form v-if="creating" class="category-editor" @submit.prevent="submitCreate">
        <input
          :ref="setEditor"
          v-model="draft"
          maxlength="60"
          placeholder="文件夹名称"
          aria-label="文件夹名称"
          @keydown.esc="cancelEdit"
          @blur="cancelEdit"
        />
      </form>
      <template v-for="row in rows" :key="`${row.category}/${row.child}`">
        <form
          v-if="isEditing(row)"
          class="category-editor"
          :class="{ 'category-child': row.child }"
          @submit.prevent="submitRename(row)"
        >
          <input
            :ref="setEditor"
            v-model="draft"
            maxlength="60"
            placeholder="文件夹名称"
            aria-label="文件夹名称"
            @keydown.esc="cancelEdit"
            @blur="cancelEdit"
          />
        </form>
        <div v-else class="category-row">
          <button
            class="category-button"
            :class="{
              'category-child': row.child,
              active: state.category === row.category && state.subcategory === row.child,
            }"
            @click="choose(row)"
          >
            <Icon v-if="!row.child" name="folder" />
            <span class="cat-name" :title="label(row.label)">{{ label(row.label) }}</span
            ><span class="cat-count">{{ row.count }}</span>
          </button>
          <button
            v-if="row.category"
            class="category-action"
            type="button"
            title="重命名文件夹"
            aria-label="重命名文件夹"
            :disabled="saving"
            @click="startRename(row)"
          >
            <Icon name="edit" />
          </button>
        </div>
      </template>
    </div>
    <PanelHandle kind="sidebar" />
  </aside>
</template>
