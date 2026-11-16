<script setup>
import { computed, inject, ref } from 'vue';
import { markdown } from '../lib/content.js';
const props = defineProps({ draft: { type: Object, required: true } });
const workspace = inject('workspace');
const expanded = ref(true);
const preview = computed(() => markdown(props.draft.content || ''));
const busy = computed(() => workspace.state.noteSaving === props.draft.id);
</script>

<template>
  <section class="note-draft" :data-note-draft="draft.id">
    <header>
      <div>
        <strong>{{ draft.title }}</strong>
        <small>{{ draft.paperId }} · {{ draft.path }}</small>
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
        {{ busy ? '保存中…' : '保存为笔记' }}
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
