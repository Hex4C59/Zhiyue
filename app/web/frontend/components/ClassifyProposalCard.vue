<script setup lang="ts">
import { computed, inject, reactive, watch } from 'vue';
import type { ChatClassifyProposal } from '../lib/types';
import type { WorkspaceApi } from '../lib/workspace';

const props = defineProps<{ proposals: ChatClassifyProposal[] }>();
const workspace = inject('workspace') as WorkspaceApi;
const busy = computed(() => Boolean(workspace.state.classifySaving));
const selected = reactive(new Set<string>());
const basisLabels: Record<string, string> = {
  notes: '笔记',
  translation: '中文翻译',
  'notes+translation': '笔记 + 译文',
  pdf: '原文',
};

watch(() => props.proposals.map(({ id }) => id), (ids, previous) => {
  const known = new Set(previous ?? []);
  for (const id of ids) if (!known.has(id)) selected.add(id);
  const current = new Set(ids);
  for (const id of selected) if (!current.has(id)) selected.delete(id);
}, { immediate: true });

const willCreate = (item: ChatClassifyProposal): boolean =>
  item.willCreateCategory || item.willCreateSubcategory;

function submit(action: 'apply' | 'discard'): void {
  const ids = props.proposals.filter(({ id }) => selected.has(id)).map(({ id }) => id);
  void workspace.resolveClassifyProposals(ids, action);
}
</script>

<template>
  <section class="classify-proposal" aria-label="确认论文归类" :aria-busy="busy">
    <header>
      <strong>论文归类</strong>
      <span class="classify-proposal-count">已选 {{ selected.size }} / {{ proposals.length }}</span>
    </header>
    <p>确认后会先补齐缺失的文件夹，再移动论文并同步索引与引用。</p>
    <ul class="classify-proposal-rows">
      <li v-for="item in proposals" :key="item.id" :data-classify-proposal="item.id">
        <label>
          <input v-model="selected" type="checkbox" :value="item.id" :disabled="busy" />
          <span class="classify-proposal-paper">
            <span class="classify-proposal-id">{{ item.paperId }}</span>
            <span class="classify-proposal-title">{{ item.title }}</span>
          </span>
        </label>
        <p class="classify-proposal-path">
          <code>{{ item.fromPath }}</code>
          <span aria-hidden="true">→</span>
          <code>{{ item.targetPath }}</code>
        </p>
        <p class="classify-proposal-meta">
          <span class="classify-proposal-basis">依据：{{ basisLabels[item.basis] || item.basis }}</span>
          <span v-if="willCreate(item)" class="classify-proposal-new">将新建文件夹</span>
        </p>
        <p class="classify-proposal-reason">{{ item.reason }}</p>
        <span v-if="item.error" class="classify-proposal-error" role="alert">{{ item.error }}</span>
      </li>
    </ul>
    <div class="classify-proposal-actions">
      <button class="button primary" type="button" data-classify-apply :disabled="busy || !selected.size"
        @click="submit('apply')">
        {{ busy ? '处理中…' : '确认归类并移动' }}
      </button>
      <button class="button subtle" type="button" data-classify-discard :disabled="busy || !selected.size"
        @click="submit('discard')">
        取消所选
      </button>
    </div>
  </section>
</template>
