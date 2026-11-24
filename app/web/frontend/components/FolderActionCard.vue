<script setup lang="ts">
import { computed, inject } from 'vue';
import type { ChatFolderAction } from '../lib/types';
import type { WorkspaceApi } from '../lib/workspace';

const props = defineProps<{ action: ChatFolderAction }>();
const workspace = inject('workspace') as WorkspaceApi;
const busy = computed(() => workspace.state.folderActionSaving === props.action.id);
</script>

<template>
  <section class="folder-action" :data-folder-action="action.id">
    <header>
      <div>
        <strong>删除文件夹</strong>
        <small>{{ action.path }}</small>
      </div>
      <span class="folder-action-count">含 {{ action.papers }} 篇文献</span>
    </header>
    <p>
      空文件夹会移到 <code>.zhiyue/trash/categories</code>，可在回收站找回；
      非空文件夹或仍被批次引用的文件夹会被拒绝。
    </p>
    <p v-if="action.error" class="folder-action-error" role="alert">{{ action.error }}</p>
    <div class="folder-action-actions">
      <button
        class="button primary"
        type="button"
        :data-folder-apply="action.id"
        :disabled="busy"
        @click="workspace.resolveFolderAction(action.id, 'apply')"
      >
        {{ busy ? '删除中…' : '确认删除' }}
      </button>
      <button
        class="button subtle"
        type="button"
        :data-folder-discard="action.id"
        :disabled="busy"
        @click="workspace.resolveFolderAction(action.id, 'discard')"
      >
        取消
      </button>
    </div>
  </section>
</template>
