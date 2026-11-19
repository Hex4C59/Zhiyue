<script setup lang="ts">
import { computed, inject, reactive, ref } from 'vue';
import { categoryChoices } from '../lib/content';
import { statusLabels } from '../lib/workspace';
import Icon from './Icon.vue';
import type { WorkspaceApi } from '../lib/workspace';
import type { JobRecord } from '../lib/types';

const workspace = inject('workspace') as WorkspaceApi;
const state = workspace.state;
const defaultCategory = 'papers/09_情感综述调研/网站导入';
const form = reactive({
  title: '',
  input: '',
  category: defaultCategory,
  channel: 'public',
  autoArchive: false,
});
const submitting = ref(false);
const pendingActions = reactive(new Set<string>());
const categories = computed(() => categoryChoices(state.categories, defaultCategory));
const jobs = computed(() => [...state.jobs.values()].reverse());
const resultCounts = (job: JobRecord): unknown => {
  const result = job.result;
  return result && typeof result === 'object' ? (result as { counts?: unknown }).counts : undefined;
};
const counts = (value: unknown): string =>
  Object.entries((value && typeof value === 'object' ? value : {}) as Record<string, unknown>)
    .map(([key, count]) => `${statusLabels[key] || key} ${String(count)}`)
    .join(' · ');
const errorText = (error: unknown): string => (typeof error === 'string' ? error : JSON.stringify(error));
const logText = (log: unknown): string =>
  Array.isArray(log)
    ? log.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).join('\n')
    : typeof log === 'string' && log ? log : '暂无日志';
const actions: Array<[string, string]> = [
  ['download', '继续下载'],
  ['verify', '核验文件'],
  ['archive', '归档入库'],
  ['ieee', '提交IEEE获取'],
  ['collect', '收集机构下载'],
];
async function submit(): Promise<void> {
  if (!form.input.trim() || submitting.value) return;
  submitting.value = true;
  try {
    await workspace.createDownload({ ...form, title: form.title.trim(), input: form.input.trim() });
  } finally {
    submitting.value = false;
  }
}
async function act(batch: string, action: string): Promise<void> {
  const key = `${batch}:${action}`;
  if (pendingActions.has(key)) return;
  pendingActions.add(key);
  try {
    await workspace.batchAction(batch, action);
  } finally {
    pendingActions.delete(key);
  }
}
</script>

<template>
  <section id="downloads-view" class="downloads-view">
    <div class="download-intro">
      <h2>添加论文</h2>
      <p>输入 DOI 或题名，查看下载、核验与归档进度。</p>
    </div>
    <div class="download-columns">
      <form id="download-form" class="surface download-form" @submit.prevent="submit">
        <div class="surface-heading">
          <Icon name="download" />
          <h3>新建下载任务</h3>
        </div>
        <label for="download-title">任务名称 <span class="muted">可选</span></label>
        <input id="download-title" v-model="form.title" placeholder="例如：语音情感识别 · 经典文献" />
        <label for="download-input">论文信息</label>
        <textarea
          id="download-input"
          v-model="form.input"
          rows="7"
          required
          placeholder="粘贴 DOI、论文题名或 JSON 清单&#10;每行一项"
        />
        <label for="download-category">归档分类</label>
        <select id="download-category" v-model="form.category">
          <option v-for="[value, label] in categories" :key="value" :value="value">{{ label }}</option>
        </select>
        <div class="download-options">
          <label
            >获取渠道<select id="download-channel" v-model="form.channel">
              <option value="public">公开来源</option>
              <option value="auto">自动选择</option>
              <option value="ieee">IEEE / 机构渠道</option>
            </select></label
          >
          <label class="check-label"
            ><input id="auto-archive" v-model="form.autoArchive" type="checkbox" />核验后自动归档</label
          >
        </div>
        <button id="start-download" type="submit" class="button primary" :disabled="submitting">
          <Icon name="plus" />创建下载任务
        </button>
        <p class="muted form-note">机构认证与需要确认的操作，由后端工具返回状态。</p>
      </form>
      <div class="download-results">
        <div class="section-heading">
          <h3>任务与批次</h3>
          <button id="refresh-downloads" class="button subtle" @click="workspace.loadDownloads">
            <Icon name="refresh" />刷新
          </button>
        </div>
        <div id="download-jobs">
          <div v-if="state.downloadsError" class="surface empty">
            <p>{{ state.downloadsError }}</p>
            <button class="button subtle" @click="workspace.loadDownloads">重试</button>
          </div>
          <article v-for="job in jobs" v-else :key="job.id" class="job-card">
            <div class="job-heading">
              <h4>{{ job.title || job.batch || job.id }}</h4>
              <span class="status-badge" :class="{ failed: ['error', 'failed'].includes(job.status) }">
                {{ statusLabels[job.status] || job.status || '状态待确认' }}</span
              >
            </div>
            <p v-if="job.error" class="error-text">{{ errorText(job.error) }}</p>
            <p>{{ job.message || job.action || '' }}</p>
            <p v-if="resultCounts(job)" class="job-counts">
              批次结果：{{ counts(resultCounts(job)) || '暂无计数' }}
            </p>
            <details :data-job-details="job.id">
              <summary>查看任务日志</summary>
              <pre class="job-log">{{ logText(job.log) }}</pre>
            </details>
          </article>
          <div v-if="!state.downloadsError && !jobs.length" class="surface empty">
            <span class="empty-art"><Icon name="download" /></span>
            <p>暂无下载任务</p>
          </div>
        </div>
        <div id="download-batches">
          <div v-if="state.batches.length" class="section-heading"><h3>已有下载批次</h3></div>
          <article v-for="batch in state.batches" :key="batch.batch" class="batch-card">
            <div class="job-heading">
              <h4>{{ batch.batch }}</h4>
              <span class="status-badge">
                {{ batch.entries }} 条</span
              >
            </div>
            <p>{{ counts(batch.counts) }}</p>
            <div class="batch-actions">
              <button
                v-for="[action, label] in actions"
                :key="action"
                class="button subtle"
                :disabled="pendingActions.has(`${batch.batch}:${action}`)"
                @click="act(batch.batch, action)"
              >
                {{ label }}
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>
