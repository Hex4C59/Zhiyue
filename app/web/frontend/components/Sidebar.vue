<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
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
const creatingChildOf = ref('');
const editing = ref<{ category: string; child: string } | null>(null);
const menu = ref<{ row: CategoryRow | null; x: number; y: number } | null>(null);
const menuEl = ref<HTMLElement | null>(null);
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
  creatingChildOf.value = '';
  draft.value = '';
  creating.value = true;
  closeMenu();
  await focusEditor();
}
function startCreateChild(row: CategoryRow): void {
  if (saving.value || !row.category || row.child) return;
  creating.value = false;
  editing.value = null;
  creatingChildOf.value = row.category;
  draft.value = '';
  closeMenu();
  void focusEditor();
}
function startRename(row: CategoryRow): void {
  if (saving.value) return;
  creating.value = false;
  creatingChildOf.value = '';
  editing.value = { category: row.category, child: row.child };
  draft.value = row.name.replace(/^\d+_/, '');
  closeMenu();
  void focusEditor();
}
function cancelEdit(): void {
  if (saving.value) return;
  creating.value = false;
  creatingChildOf.value = '';
  editing.value = null;
  draft.value = '';
}
function isCreatingChild(row: CategoryRow): boolean {
  return !!creatingChildOf.value && creatingChildOf.value === row.category && !row.child;
}
function closeMenu(): void {
  menu.value = null;
}
function openMenu(event: MouseEvent, row: CategoryRow | null): void {
  event.preventDefault();
  event.stopPropagation();
  const width = 200;
  const height = row?.category ? 170 : 92;
  const x = Math.max(8, Math.min(event.clientX, window.innerWidth - width - 8));
  const y = Math.max(8, Math.min(event.clientY, window.innerHeight - height - 8));
  menu.value = { row, x, y };
  void nextTick(() => menuEl.value?.querySelector<HTMLButtonElement>('button')?.focus());
}
function runMenu(action: 'create' | 'create-child' | 'import' | 'rename' | 'delete'): void {
  const row = menu.value?.row ?? null;
  closeMenu();
  if (action === 'create') void startCreate();
  else if (action === 'create-child' && row) startCreateChild(row);
  else if (action === 'import' && row) openImport(row);
  else if (action === 'rename' && row) startRename(row);
  else if (action === 'delete' && row) void removeFolder(row);
}
async function removeFolder(row: CategoryRow): Promise<void> {
  if (!row.category || saving.value) return;
  if (row.count > 0) {
    workspace.toast('文件夹中还有文献，暂不能删除。', true);
    return;
  }
  const ok = window.confirm(
    `删除文件夹「${label(row.label)}」？

仅空文件夹可删除；目录会移到 .zhiyue/trash/categories/，需要时可手动找回。`,
  );
  if (!ok) return;
  saving.value = true;
  const result = await workspace.deleteCategory(row.category, row.child) as { trashed?: string } | null;
  saving.value = false;
  if (!result) return;
  if (state.category === row.category && (!row.child || state.subcategory === row.child)) {
    state.category = '';
    state.subcategory = '';
  }
  const trashName = result.trashed?.split('/').pop() ?? '';
  workspace.toast(`文件夹已移到回收站${trashName ? `「${trashName}」` : ''}`);
}
function openImport(row: CategoryRow): void {
  if (!row.category) return;
  state.importCategory = row.child ? `papers/${row.category}/${row.child}` : `papers/${row.category}`;
  state.importOpen = true;
}
const closeMenuOnPointer = (event: PointerEvent): void => {
  if (menu.value && !menuEl.value?.contains(event.target as Node)) closeMenu();
};
const closeMenuOnKey = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') closeMenu();
};
onMounted(() => {
  document.addEventListener('pointerdown', closeMenuOnPointer);
  document.addEventListener('keydown', closeMenuOnKey);
  window.addEventListener('resize', closeMenu);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeMenuOnPointer);
  document.removeEventListener('keydown', closeMenuOnKey);
  window.removeEventListener('resize', closeMenu);
});
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
async function submitCreateChild(row: CategoryRow): Promise<void> {
  const name = draft.value.trim();
  if (!name || saving.value) return;
  saving.value = true;
  const result = await workspace.createCategory(name, row.category) as ListResult | null;
  saving.value = false;
  if (!result) return;
  creatingChildOf.value = '';
  draft.value = '';
  state.category = result.category ?? row.category;
  state.subcategory = result.subcategory ?? '';
  workspace.setView('library');
  workspace.setPanel('list');
  workspace.toast(`已新建子文件夹「${label(result.subcategory ?? '')}」`);
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
    <div class="section-head" @contextmenu.prevent="openMenu($event, null)">
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
    <div id="categories" class="categories" @contextmenu.prevent="openMenu($event, null)" @scroll="closeMenu">
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
        <div
          v-else
          class="category-row"
          :data-category="row.category"
          :data-subcategory="row.child"
          @contextmenu.prevent.stop="openMenu($event, row)"
        >
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
        <form
          v-if="isCreatingChild(row)"
          class="category-editor category-child"
          @submit.prevent="submitCreateChild(row)"
        >
          <input
            :ref="setEditor"
            v-model="draft"
            maxlength="60"
            placeholder="子文件夹名称"
            aria-label="子文件夹名称"
            @keydown.esc="cancelEdit"
            @blur="cancelEdit"
          />
        </form>
      </template>
    </div>
    <Teleport to="body">
      <div
        v-if="menu"
        ref="menuEl"
        class="category-menu"
        role="menu"
        aria-label="文件夹操作"
        :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"
        @contextmenu.prevent
      >
        <div v-if="!menu.row?.category" class="category-menu-note">全部文献是汇总视图，不能重命名</div>
        <button
          v-if="!menu.row?.category"
          type="button"
          role="menuitem"
          @click="runMenu('create')"
        >
          <Icon name="plus" />新建文件夹
        </button>
        <button
          v-if="menu.row?.category && !menu.row.child"
          type="button"
          role="menuitem"
          @click="runMenu('create-child')"
        >
          <Icon name="folder" />新建子文件夹
        </button>
        <button
          v-if="menu.row?.category"
          type="button"
          role="menuitem"
          @click="runMenu('import')"
        >
          <Icon name="upload" />导入 PDF 到此文件夹
        </button>
        <button
          v-if="menu.row?.category"
          type="button"
          role="menuitem"
          @click="runMenu('rename')"
        >
          <Icon name="edit" />重命名
        </button>
        <button
          v-if="menu.row?.category"
          class="danger"
          type="button"
          role="menuitem"
          :disabled="menu.row.count > 0"
          :title="menu.row.count > 0 ? '文件夹中还有文献，暂不能删除' : '仅空文件夹可删除'"
          @click="runMenu('delete')"
        >
          <Icon name="trash" />删除文件夹
        </button>
      </div>
    </Teleport>
    <PanelHandle kind="sidebar" />
  </aside>
</template>
