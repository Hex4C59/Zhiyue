<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { endpoint, json } from '../lib/content';
import type { WorkspaceApi } from '../lib/workspace';
import type { PdfTranslationJob, PdfTranslationStatus } from '../../shared/pdfTranslation.js';

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
const startLabel = computed(() => {
  if (result.value) return '重新生成中文';
  return job.value?.status === 'failed' ? '重试翻译' : '翻译成中文';
});
const progressJob = computed(() => (active.value || submitted.value) ? job.value : null);
let version = 0;
let disposed = false;
let poll: ReturnType<typeof setInterval> | undefined;
const current = () => !disposed && state.current === props.paperId;

function apply(update: PdfTranslationStatus): void {
  const previous = status.value?.result;
  const watched = submitted.value;
  const ownJob = watched?.id === update.job?.id && watched?.key === update.job?.key ? update.job : null;
  const published = ownJob?.status === 'completed' && ownJob.key === update.result?.key;
  const next = isActive(ownJob) && previous && update.result?.key === watched?.key &&
    previous.sourceHash === update.result?.sourceHash ? previous : update.result;
  status.value = { ...update, result: next };
  if (next) {
    state.pdfTranslation = next.key;
    if (published && state.readerMode === 'pdf') state.readerMode = 'translation';
  } else if (state.pdfTranslation) {
    state.pdfTranslation = '';
    if (state.readerMode === 'translation' || state.readerMode === 'split') state.readerMode = 'pdf';
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
  const model = status.value?.model;
  if (busy.value || active.value || submitted.value || !status.value?.engineAvailable || !model) return;
  const request = result.value ? { model, regenerate: true } : { model };
  busy.value = true;
  failure.value = '';
  ++version;
  try {
    const update = await workspace.api<PdfTranslationStatus>(base.value, json('POST', request));
    if (current()) {
      submitted.value = update.job && { id: update.job.id, key: update.job.key };
      apply(update);
      if (!update.job && update.result) {
        state.pdfTranslation = update.result.key;
        if (state.readerMode === 'pdf') state.readerMode = 'translation';
      }
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
  <div class="pdf-translation-bar" role="group" aria-label="中文精读翻译">
    <template v-if="result">
      <a class="pdf-translation-download" :href="download" download>导出中文 Markdown</a>
    </template>
    <template v-if="progressJob">
      <progress :value="progressJob.percent" max="100" aria-label="论文翻译进度" />
      <span class="pdf-translation-detail" role="status">{{ progressJob.stage }} · {{ progressJob.percent }}%</span>
      <button v-if="progressJob.status === 'running'" type="button" class="button subtle" :disabled="busy"
        @click="cancel">取消</button>
    </template>
    <button v-else-if="status" type="button" class="button subtle"
      :disabled="busy || !status.engineAvailable || !status.model"
      @click="start">{{ busy ? '正在提交…' : startLabel }}</button>
    <template v-if="status && !progressJob">
      <span v-if="!status.engineAvailable" class="pdf-translation-detail">请按 README 安装 MinerU 解析环境</span>
      <span v-else-if="!status.model" class="pdf-translation-detail">请在「模型与密钥」中配置模型</span>
      <span v-else class="pdf-translation-detail" :title="`MinerU 解析后的英文正文将发送给 ${status.model}`">
        正文发送至 {{ status.model }}
      </span>
    </template>
    <span v-if="failure || job?.error" class="error-text pdf-translation-error" role="status">
      {{ failure || job?.error }}
    </span>
  </div>
</template>
