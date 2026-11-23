<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import { markdown } from '../lib/content';
import type { WorkspaceApi } from '../lib/workspace';

const props = defineProps<{
  draft: {
    id: string; title: string; paperId: string; path: string; content?: string;
    target?: string; paperIds?: string[];
  };
}>();
const workspace = inject('workspace') as WorkspaceApi;
const expanded = ref(true);
const preview = computed(() => markdown(props.draft.content || ''));
const busy = computed(() => workspace.state.noteSaving === props.draft.id);
const isDocument = computed(() => props.draft.target === 'synthesis' || props.draft.target === 'outputs');
const metaLabel = computed(() => {
  if (props.draft.target === 'synthesis') return '综合文稿';
  if (props.draft.target === 'outputs') return '成果文稿';
  return props.draft.paperId;
});
const saveLabel = computed(() => isDocument.value ? '保存为文稿' : '保存为笔记');
</script>

<template>
  <section class="note-draft" :data-note-draft="draft.id">
    <header>
      <div>
        <strong>{{ draft.title }}</strong>
        <small>{{ metaLabel }} · {{ draft.path }}</small>
      </div>
      <button
        class="button subtle"
        type="button"
        :data-note-preview="draft.id"
        @click="expanded = !expanded"
      >
        {{ expanded ? '收起' : '预览' }}
      </button>
    </header>
    <div v-if="expanded" class="markdown note-preview" v-html="preview"></div>
    <div class="note-draft-actions">
      <button
        class="button primary"
        type="button"
        :data-note-save="draft.id"
        :disabled="busy"
        @click="workspace.saveNoteDraft(draft.id)"
      >
        {{ busy ? '保存中…' : saveLabel }}
      </button>
      <button
        class="button subtle"
        type="button"
        :data-note-discard="draft.id"
        :disabled="busy"
        @click="workspace.discardNoteDraft(draft.id)"
      >
        丢弃
      </button>
    </div>
  </section>
</template>
