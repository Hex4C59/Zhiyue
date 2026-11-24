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
// 下载、核验、归档与刷新索引共用 jobs.json；已结束的任务只在「历史任务」里保留最近若干条，
// 否则每次刷新索引都会在右栏留下一条常驻卡片。失败任务仍作为待处理项直接显示。
const finished = (job: JobRecord): boolean => job.status === 'completed';
const activeJobs = computed(() => jobs.value.filter((job) => !finished(job)));
const completedJobs = computed(() => jobs.value.filter(finished));
const historyJobs = computed(() => completedJobs.value.slice(0, 20));
const showHistory = ref(false);
const hasActiveWork = computed(
  () => Boolean(state.downloadsError) || activeJobs.value.length > 0 || state.batches.length > 0,
);
// 没有进行中任务与批次时收起整块区域，历史记录只在说明行点链接时才占右栏。
const showResults = computed(() => hasActiveWork.value || (showHistory.value && completedJobs.value.length > 0));
const showHistoryLink = computed(() => !hasActiveWork.value && completedJobs.value.length > 0);
const historyTime = (job: JobRecord): string => {
  const time = new Date(job.updatedAt || job.createdAt || '');
  return Number.isNaN(time.getTime())
    ? ''
    : time.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};
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
      <p>
        输入 DOI 或题名，查看下载、核验与归档进度。
        <button v-if="showHistoryLink" type="button" class="text-button history-link"
          @click="showHistory = !showHistory">
          {{ showHistory ? '收起历史任务' : `历史任务（${completedJobs.length}）` }}
        </button>
      </p>
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
      <div v-if="showResults" class="download-results">
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
          <template v-else>
            <article v-for="job in activeJobs" :key="job.id" class="job-card">
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
            <details v-if="completedJobs.length" class="job-history" data-job-history>
              <summary>
                已完成任务 <span class="muted">{{ completedJobs.length }} 条</span>
              </summary>
              <article v-for="job in historyJobs" :key="job.id" class="job-card compact">
                <div class="job-heading">
                  <h4>{{ job.title || job.batch || job.id }}</h4>
                  <span v-if="historyTime(job)" class="job-time">{{ historyTime(job) }}</span>
                  <span class="status-badge">{{ statusLabels[job.status] || job.status }}</span>
                </div>
                <p v-if="job.error" class="error-text">{{ errorText(job.error) }}</p>
                <details :data-job-details="job.id">
                  <summary>查看任务日志</summary>
                  <pre class="job-log">{{ logText(job.log) }}</pre>
                </details>
              </article>
            </details>
          </template>
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
