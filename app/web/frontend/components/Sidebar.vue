<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import Icon from './Icon.vue';
import ConfirmDialog from './ConfirmDialog.vue';
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
    // 选中的分类默认展开；用户点第二次折叠后隐藏。拖动时临时展开，方便放到子文件夹。
    const open = state.category === category.id
      ? collapsedCategory.value !== category.id
      : !!state.draggingPaper || !!state.movingPaper;
    if (!open) continue;
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
// 记录用户主动折叠的分类；再次点击同一分类行时复位。
const collapsedCategory = ref('');
const hasChildren = (row: CategoryRow): boolean =>
  !row.child && (state.categories || []).some(
    (category) => category.id === row.category && (category.children || []).length > 0,
  );
const isExpanded = (row: CategoryRow): boolean =>
  collapsedCategory.value !== row.category;
const creating = ref(false);
const creatingChildOf = ref('');
const editing = ref<{ category: string; child: string } | null>(null);
const menu = ref<{ row: CategoryRow | null; x: number; y: number } | null>(null);
const deleteTarget = ref<CategoryRow | null>(null);
const menuEl = ref<HTMLElement | null>(null);
const draft = ref('');
const saving = ref(false);
const editor = ref<HTMLInputElement | null>(null);
const setEditor = (element: unknown): void => {
  if (element) editor.value = element as HTMLInputElement;
};
function choose(row: CategoryRow): void {
  // 点击已选中的父文件夹切换展开状态，其他情况仍然进入该分类并确保展开。
  if (row.category && !row.child && hasChildren(row) && state.category === row.category) {
    collapsedCategory.value = collapsedCategory.value === row.category ? '' : row.category;
    return;
  }
  state.category = row.category;
  state.subcategory = row.child;
  collapsedCategory.value = '';
  workspace.setView('library');
  workspace.setPanel('list');
}
const dropKey = ref('');
const rowKey = (row: CategoryRow): string => `${row.category}/${row.child}`;
function dragOver(event: DragEvent, row: CategoryRow): void {
  if (!state.draggingPaper || !row.category) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  dropKey.value = rowKey(row);
}
function dragLeave(event: DragEvent, row: CategoryRow): void {
  const next = event.relatedTarget as Node | null;
  if (next && (event.currentTarget as HTMLElement | null)?.contains(next)) return;
  if (dropKey.value === rowKey(row)) dropKey.value = '';
}
async function dropPaper(event: DragEvent, row: CategoryRow): Promise<void> {
  event.preventDefault();
  dropKey.value = '';
  const id = state.draggingPaper;
  workspace.endPaperDrag();
  if (!id || !row.category || state.movingPaper) return;
  await workspace.movePaper(id, row.category, row.child);
}
async function focusEditor(): Promise<void> {
  await nextTick();
  const element = editor.value;
  element?.focus();
  element?.select();
  element?.scrollIntoView?.({ block: 'nearest' });
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
  else if (action === 'delete' && row) removeFolder(row);
}
async function removeFolder(row: CategoryRow): Promise<void> {
  if (!row.category || saving.value) return;
  if (row.count > 0) {
    workspace.toast('文件夹中还有文献，暂不能删除。', true);
    return;
  }
  deleteTarget.value = row;
}
async function confirmRemoveFolder(): Promise<void> {
  const row = deleteTarget.value;
  if (!row || saving.value) return;
  saving.value = true;
  const result = await workspace.deleteCategory(row.category, row.child) as { trashed?: string } | null;
  saving.value = false;
  deleteTarget.value = null;
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
      <span class="brand-mark"><Icon /></span>
      <span class="brand-copy"><strong>Zhiyue</strong><small>知阅 · 研究工作台</small></span>
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
    <div id="categories" class="categories" @contextmenu.prevent="openMenu($event, null)" @scroll="closeMenu"
      @dragover.prevent @drop.prevent>
      <template v-for="row in rows" :key="`${row.category}/${row.child}`">
        <form
          v-if="isEditing(row)"
          class="category-editor"
          :class="{ 'category-child': row.child }"
          @submit.prevent="submitRename(row)"
        >
          <Icon v-if="!row.child" class="editor-icon" name="folder" />
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
          :class="{ 'drop-target': !!state.draggingPaper && dropKey === rowKey(row) }"
          :data-drop-target="state.draggingPaper && dropKey === rowKey(row) ? 'true' : undefined"
          :aria-dropeffect="state.draggingPaper && row.category ? 'move' : undefined"
          @dragstart.prevent
          @dragover="dragOver($event, row)"
          @dragleave="dragLeave($event, row)"
          @drop="dropPaper($event, row)"
          @contextmenu.prevent.stop="openMenu($event, row)"
        >
          <button
            class="category-button"
            :class="{
              'category-child': row.child,
              active: state.category === row.category && state.subcategory === row.child,
              'parent-open': !row.child && state.category === row.category && !!state.subcategory,
              'has-children': hasChildren(row),
            }"
            :aria-expanded="hasChildren(row) ? isExpanded(row) : undefined"
            :title="hasChildren(row) ? '点击折叠或展开子文件夹' : undefined"
            @click="choose(row)"
          >
            <Icon v-if="!row.child" name="folder" />
            <span class="cat-name" :title="label(row.label)">{{ label(row.label) }}</span
            ><span
              v-if="hasChildren(row)"
              class="cat-caret"
              :class="{ open: isExpanded(row) }"
              aria-hidden="true"
            /><span class="cat-count">{{ row.count }}</span>
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
      <form v-if="creating" class="category-editor" @submit.prevent="submitCreate">
        <Icon class="editor-icon" name="folder" />
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
          :title="menu.row.count > 0 ? '文件夹中还有文献，暂不能删除' : '没有文献的文件夹可移到回收站'"
          @click="runMenu('delete')"
        >
          <Icon name="trash" />删除文件夹
        </button>
      </div>
    </Teleport>
    <ConfirmDialog
      v-if="deleteTarget"
      title="删除文件夹"
      :message="`「${label(deleteTarget.label)}」没有文献，说明和历史下载资料一起移到回收站。`"
      confirm-label="移到回收站"
      danger
      :busy="saving"
      @confirm="confirmRemoveFolder"
      @cancel="deleteTarget = null"
    >
      含 PDF、来源记录或仍被索引、批次引用的目录会保留；移入 <code>.zhiyue/trash/categories/</code> 的资料可手动找回。
    </ConfirmDialog>
    <PanelHandle kind="sidebar" />
  </aside>
</template>
