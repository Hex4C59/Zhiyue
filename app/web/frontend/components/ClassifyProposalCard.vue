<script setup lang="ts">
import { computed, inject, reactive, watch } from 'vue';
import { activeClassifyRun } from '../../shared/contracts.js';
import type { ChatClassifyProposal } from '../lib/types';
import type { WorkspaceApi } from '../lib/workspace';

const props = defineProps<{ proposals: ChatClassifyProposal[] }>();
const workspace = inject('workspace') as WorkspaceApi;
const state = workspace.state;
const selected = reactive(new Set<string>());
const run = computed(() => [...(state.chat?.classifyRuns ?? [])].reverse().find(activeClassifyRun));
const pending = computed(() => state.chat ? state.classifyRequests.get(state.chat.id) : undefined);
const submitting = computed(() => !!state.chat && workspace.classificationSubmitting(state.chat.id));
const locked = computed(() => submitting.value || !!run.value || !!pending.value);
const processed = computed(() => run.value?.items.filter((item) => item.status !== 'pending').length ?? 0);
const results = computed(() => new Map(run.value?.items.map((item) => [item.proposalId, item]) ?? []));
const basisLabels: Record<string, string> = {
  notes: '笔记', translation: '中文翻译', 'notes+translation': '笔记 + 译文', pdf: '原文',
};
const labels: Record<string, string> = {
  pending: '等待移动', moved: '已移动', unchanged: '已在目标目录', blocked: '无法移动',
  failed: '移动失败', interrupted: '结果待核实',
};
const stage = computed(() => run.value?.stage || (pending.value?.status === 'uncertain'
  ? '归类提交结果待确认' : submitting.value ? '正在提交归类请求…' : ''));

watch(() => props.proposals.map(({ id }) => id), (ids, previous) => {
  const known = new Set(previous ?? []);
  for (const id of ids) if (!known.has(id)) selected.add(id);
  const current = new Set(ids);
  for (const id of selected) if (!current.has(id)) selected.delete(id);
}, { immediate: true });
watch(() => run.value?.id, () => {
  if (!run.value) return;
  selected.clear();
  for (const id of run.value.proposalIds) selected.add(id);
}, { immediate: true });

const willCreate = (item: ChatClassifyProposal): boolean =>
  item.willCreateCategory || item.willCreateSubcategory;

function submit(action: 'apply' | 'discard'): void {
  const ids = props.proposals.filter(({ id }) => selected.has(id)).map(({ id }) => id);
  void workspace.resolveClassifyProposals(ids, action);
}
</script>

<template>
  <section class="classify-proposal" aria-label="确认论文归类"
    :aria-busy="submitting || !!run" :data-classify-run="run?.id">
    <header>
      <strong>论文归类</strong>
      <span v-if="run" class="classify-proposal-count">已处理 {{ processed }} / {{ run.items.length }}</span>
      <span v-else class="classify-proposal-count">已选 {{ selected.size }} / {{ proposals.length }}</span>
    </header>
    <div v-if="stage" role="status" data-classify-stage>
      <p>{{ stage }}</p>
      <progress v-if="run" :value="processed" :max="run.items.length" aria-label="归类进度" />
      <p v-if="run?.createdFolders.length">已新建 {{ run.createdFolders.length }} 个文件夹</p>
    </div>
    <p v-else>确认后会先补齐缺失的文件夹，再移动论文并同步索引与引用。</p>
    <p v-if="pending?.error" class="classify-proposal-error" role="alert">{{ pending.error }}</p>
    <ul class="classify-proposal-rows">
      <li v-for="item in proposals" :key="item.id" :data-classify-proposal="item.id">
        <label>
          <input v-model="selected" type="checkbox" :value="item.id" :disabled="locked" />
          <span class="classify-proposal-paper">
            <span class="classify-proposal-id">{{ item.paperId }}</span>
            <span class="classify-proposal-title">{{ item.title }}</span>
          </span>
        </label>
        <p class="classify-proposal-path">
          <code>{{ item.fromPath }}</code>
          <span aria-hidden="true">→</span>
          <code>{{ results.get(item.id)?.category || item.targetPath }}</code>
        </p>
        <p class="classify-proposal-meta">
          <span class="classify-proposal-basis">依据：{{ basisLabels[item.basis] || item.basis }}</span>
          <span v-if="results.has(item.id)" :data-classify-item-status="results.get(item.id)?.status">
            {{ labels[results.get(item.id)?.status ?? ''] }}
          </span>
          <span v-else-if="willCreate(item)" class="classify-proposal-new">将新建文件夹</span>
        </p>
        <p class="classify-proposal-reason">{{ item.reason }}</p>
        <span v-if="results.get(item.id)?.error || (!run && item.error)" class="classify-proposal-error" role="alert">
          {{ results.get(item.id)?.error || item.error }}
        </span>
      </li>
    </ul>
    <div class="classify-proposal-actions">
      <button v-if="pending?.status === 'uncertain'" class="button primary" type="button" data-classify-retry
        :disabled="submitting" @click="workspace.retryClassifyProposals()">重试确认提交</button>
      <template v-else>
        <button class="button primary" type="button" data-classify-apply :disabled="locked || !selected.size"
          @click="submit('apply')">
          {{ run ? '后台归类中…' : submitting ? '提交中…' : '确认归类并移动' }}
        </button>
        <button class="button subtle" type="button" data-classify-discard :disabled="locked || !selected.size"
          @click="submit('discard')">取消所选</button>
      </template>
    </div>
  </section>
</template>
