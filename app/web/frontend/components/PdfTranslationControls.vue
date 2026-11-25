<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { endpoint, json } from '../lib/content';
import type { WorkspaceApi } from '../lib/workspace';
import type { PdfTranslationJob, PdfTranslationStatus } from '../../src/lib/pdfTranslationTypes.js';

const props = defineProps<{ paperId: string; file: string }>();
const workspace = inject('workspace') as WorkspaceApi;
const state = workspace.state;
const status = ref<PdfTranslationStatus | null>(null);
const busy = ref(false);
const failure = ref('');
const base = computed(() => `/api/papers/${endpoint(props.paperId)}/translation`);
const result = computed(() => status.value?.result);
const job = computed(() => status.value?.job);
const isActive = (task?: PdfTranslationJob | null): boolean =>
  task?.status === 'running' || task?.status === 'cancelling' || task?.status === 'saving';
const active = computed(() => isActive(job.value));
const submitted = ref<Pick<PdfTranslationJob, 'id' | 'key'> | null>(null);
const download = computed(() => result.value ? `${base.value}/file?key=${result.value.key}&download=1` : '');
const reviewPages = computed(() => result.value?.reviewPages ?? []);
const startLabel = computed(() => result.value ? '更新译本' : job.value?.status === 'failed' ? '重试翻译' : '翻译成中文');
let version = 0;
let disposed = false;
let poll: ReturnType<typeof setInterval> | undefined;
const current = () => !disposed && state.current === props.paperId;

function apply(update: PdfTranslationStatus): void {
  const previous = status.value?.result;
  const watched = submitted.value;
  const ownJob = watched?.id === update.job?.id && watched?.key === update.job?.key ? update.job : null;
  const published = ownJob?.status === 'completed' && ownJob.key === update.result?.key;
  // 发布与任务状态是两个快照，等到本次任务完成后再切换。
  const next = isActive(ownJob) && previous && update.result?.key === watched?.key &&
    previous.sourceHash === update.result?.sourceHash ? previous : update.result;
  status.value = { ...update, result: next };
  if (published && next) {
    state.pdfTranslation = next.key;
  } else if (state.pdfTranslation && state.pdfTranslation !== next?.key) {
    state.pdfTranslation = next && next.sourceHash === previous?.sourceHash ? next.key : '';
  }
  if (!isActive(ownJob)) submitted.value = null;
}

async function refresh(): Promise<void> {
  const sequence = ++version;
  try {
    const update = await workspace.api<PdfTranslationStatus>(base.value);
    if (current() && sequence === version) apply(update);
  } catch (error) {
    if (current() && sequence === version && !status.value) failure.value = (error as Error).message;
  }
}

async function start(): Promise<void> {
  if (busy.value || active.value || submitted.value || !status.value?.engineAvailable || !status.value.model) return;
  busy.value = true;
  failure.value = '';
  ++version;
  try {
    const update = await workspace.api<PdfTranslationStatus>(base.value, json('POST', { model: status.value.model }));
    if (current()) {
      submitted.value = update.job && { id: update.job.id, key: update.job.key };
      apply(update);
      if (!update.job && update.result) state.pdfTranslation = update.result.key;
    }
  } catch (error) {
    if (current()) failure.value = (error as Error).message;
  } finally {
    busy.value = false;
    if (current()) void refresh();
  }
}

async function cancel(): Promise<void> {
  const running = job.value;
  if (running?.status !== 'running' || busy.value) return;
  busy.value = true;
  failure.value = '';
  ++version;
  try {
    const update = await workspace.api<PdfTranslationStatus>(`${base.value}/cancel`,
      json('POST', { jobId: running.id }));
    if (current()) apply(update);
  } catch (error) {
    if (current()) failure.value = (error as Error).message;
  } finally {
    busy.value = false;
    if (current()) void refresh();
  }
}

watch(() => state.pdfTranslationEvent, (event) => {
  if (!event || event.job.paperId !== props.paperId || !current() || busy.value) return;
  if (submitted.value && event.job.id !== submitted.value.id) return;
  ++version;
  if (status.value) status.value = { ...status.value, job: event.job };
  if (!isActive(event.job) || !status.value) void refresh();
});
watch([() => props.file, () => state.eventsOpen, () => workspace.models.value.find((model) => model.isDefault)?.id],
  () => { if (!busy.value) void refresh(); });
onMounted(() => {
  void refresh();
  poll = setInterval(() => { if ((active.value || submitted.value) && !busy.value) void refresh(); }, 3000);
});
onBeforeUnmount(() => {
  disposed = true;
  clearInterval(poll);
});
</script>

<template>
  <div class="pdf-translation-bar" role="group" aria-label="PDF 翻译">
    <template v-if="result">
      <div class="segmented" aria-label="PDF 语言" role="group">
        <button type="button" :class="{ active: !state.pdfTranslation }" :aria-pressed="!state.pdfTranslation"
          @click="state.pdfTranslation = ''">原文</button>
        <button type="button" :class="{ active: !!state.pdfTranslation }" :aria-pressed="!!state.pdfTranslation"
          @click="state.pdfTranslation = result.key">中文</button>
      </div>
      <a class="pdf-translation-download" :href="download" download>导出中文 PDF</a>
      <span v-if="state.pdfTranslation && reviewPages.length" class="pdf-translation-detail"
        :title="`需核对的物理页：${reviewPages.join('、')}`">
        {{ reviewPages.includes(state.pdfPage) ? '本页需核对' : `${reviewPages.length} 页需核对` }}
      </span>
    </template>
    <template v-if="(active || submitted) && job">
      <progress :value="job.percent" max="100" aria-label="PDF 翻译进度" />
      <span class="pdf-translation-detail" role="status">{{ job.stage }} · {{ job.percent }}%</span>
      <button v-if="job.status === 'running'" type="button" class="button subtle" :disabled="busy"
        @click="cancel">取消</button>
    </template>
    <template v-else-if="status && (!result || status.updateAvailable)">
      <button type="button" class="button subtle" :disabled="busy || !status.engineAvailable || !status.model"
        @click="start">{{ busy ? '正在提交…' : startLabel }}</button>
      <span v-if="!status.engineAvailable" class="pdf-translation-detail">请按 README 安装翻译运行环境</span>
      <span v-else-if="!status.model" class="pdf-translation-detail">请在「模型与密钥」中配置模型</span>
      <span v-else class="pdf-translation-detail" :title="`可提取的英文正文将发送给 ${status.model}`">
        正文发送至 {{ status.model }}
      </span>
    </template>
    <span v-if="failure || job?.error" class="error-text pdf-translation-error" role="status">
      {{ failure || job?.error }}
    </span>
  </div>
</template>
