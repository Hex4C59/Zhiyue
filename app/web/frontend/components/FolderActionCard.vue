<script setup lang="ts">
import { computed, inject, reactive, watch } from 'vue';
import type { ChatFolderAction } from '../lib/types';
import type { WorkspaceApi } from '../lib/workspace';

const props = defineProps<{ actions: ChatFolderAction[] }>();
const workspace = inject('workspace') as WorkspaceApi;
const busy = computed(() => Boolean(workspace.state.folderActionSaving));
const rows = computed(() => {
  const byPath = new Map<string, { action: ChatFolderAction; ids: string[] }>();
  for (const action of props.actions) {
    const row = byPath.get(action.path);
    if (row) {
      row.ids.push(action.id);
      if (action.error) row.action = action;
    } else byPath.set(action.path, { action, ids: [action.id] });
  }
  return [...byPath.values()];
});
const selected = reactive(new Set<string>());
watch(() => rows.value.map(({ action }) => action.path), (paths, previous) => {
  const known = new Set(previous);
  for (const path of paths) if (!known.has(path)) selected.add(path);
  const current = new Set(paths);
  for (const path of selected) if (!current.has(path)) selected.delete(path);
}, { immediate: true });

function submit(action: 'apply' | 'discard'): void {
  const ids = rows.value.filter((row) => selected.has(row.action.path)).flatMap((row) => row.ids);
  void workspace.resolveFolderActions(ids, action);
}
</script>

<template>
  <section class="folder-action" aria-label="确认删除文件夹" :aria-busy="busy">
    <header>
      <strong>删除文件夹</strong>
      <span class="folder-action-count">已选 {{ selected.size }} / {{ rows.length }}</span>
    </header>
    <p>空文件夹会移到 <code>.zhiyue/trash/categories</code>。非空或被批次引用的目录会保留。</p>
    <ul class="folder-action-rows">
      <li v-for="{ action } in rows" :key="action.path" :data-folder-action="action.id">
        <label>
          <input v-model="selected" type="checkbox" :value="action.path" :disabled="busy" />
          <span class="folder-action-path">{{ action.path }}</span>
        </label>
        <span v-if="action.papers" class="folder-action-count">含 {{ action.papers }} 篇文献</span>
        <span v-if="action.error" class="folder-action-error" role="alert">{{ action.error }}</span>
      </li>
    </ul>
    <div class="folder-action-actions">
      <button class="button primary" type="button" data-folder-apply :disabled="busy || !selected.size"
        @click="submit('apply')">
        {{ busy ? '处理中…' : '将所选移入回收站' }}
      </button>
      <button class="button subtle" type="button" data-folder-discard :disabled="busy || !selected.size"
        @click="submit('discard')">
        取消所选
      </button>
    </div>
  </section>
</template>
