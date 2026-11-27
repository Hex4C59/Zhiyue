<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import TranslationModelPicker from './TranslationModelPicker.vue';
import { endpoint, json } from '../lib/content';
import { useWorkspace } from '../lib/workspace';
import { activeTranslationJob, type PdfTranslationStatus } from '../../shared/pdfTranslation.js';

const props = defineProps<{ paperId: string; file: string }>();
const w = useWorkspace();
const state = w.state;
const status = ref<PdfTranslationStatus | null>(null);
const busy = ref(false);
const failure = ref('');
const availableModels = computed(() => w.models.value);
const activeModel = computed(() => state.translationModel || status.value?.model || '');
const base = computed(() => `/api/papers/${endpoint(props.paperId)}/translation`);
const result = computed(() => status.value?.result);
const job = computed(() => status.value?.job);
const active = computed(() => activeTranslationJob(job.value));
const cancellable = computed(() => job.value?.status === 'queued' || job.value?.status === 'running');
// 排队时 key 可以为空，准备生成后也可能变化；提交与完成始终按稳定的任务编号关联。
const submitted = ref<string | null>(null);
const download = computed(() => result.value ? `${base.value}/file?key=${result.value.key}&download=1` : '');
const startLabel = computed(() => {
  if (result.value) return '重新生成中文';
  return job.value?.status === 'failed' ? '重试翻译' : '翻译成中文';
});
const progressJob = computed(() => (active.value || submitted.value) ? job.value : null);
let version = 0;
let disposed = false;
let poll: ReturnType<typeof setInterval> | undefined;
const current = (paperId = props.paperId) => !disposed && props.paperId === paperId && state.current === paperId;

function apply(update: PdfTranslationStatus): void {
  const previous = status.value?.result;
  const ownJob = submitted.value === update.job?.id ? update.job : null;
  const published = ownJob?.status === 'completed' && ownJob.key === update.result?.key;
  // 文件可能已发布，但任务仍在保存或收尾；确认完成前继续展示同一原文的旧译本。
  const unpublished = update.job && update.job.status !== 'completed' && previous &&
    update.result?.key === update.job.key && previous.sourceHash === update.result?.sourceHash;
  const next = unpublished ? previous : update.result;
  status.value = { ...update, result: next };
  if (next) {
    state.pdfTranslation = next.key;
    if (published && state.readerMode === 'pdf') state.readerMode = 'translation';
  } else if (state.pdfTranslation) {
    state.pdfTranslation = '';
    if (state.readerMode === 'translation' || state.readerMode === 'split') state.readerMode = 'pdf';
  }
  // 完成事件与成品状态可能先后到达，直到译本键匹配才结束本次提交的跟踪。
  if (!ownJob || (!activeTranslationJob(ownJob) && (ownJob.status !== 'completed' || published))) {
    submitted.value = null;
  }
}

async function refresh(): Promise<void> {
  const sequence = ++version;
  const paperId = props.paperId;
  try {
    const update = await w.api<PdfTranslationStatus>(base.value);
    if (current(paperId) && sequence === version) apply(update);
  } catch (error) {
    if (current(paperId) && sequence === version && !status.value) failure.value = (error as Error).message;
  }
}

async function start(): Promise<void> {
  const model = activeModel.value;
  if (busy.value || active.value || submitted.value || !status.value?.engineAvailable || !model) return;
  const paperId = props.paperId;
  const request = result.value ? { model, regenerate: true } : { model };
  busy.value = true;
  failure.value = '';
  ++version;
  try {
    const update = await w.api<PdfTranslationStatus>(base.value, json('POST', request));
    if (current(paperId)) {
      submitted.value = update.job?.id ?? null;
      apply(update);
    }
  } catch (error) {
    if (current(paperId)) failure.value = (error as Error).message;
  } finally {
    busy.value = false;
    if (current(paperId)) void refresh();
  }
}

async function cancel(): Promise<void> {
  const running = job.value;
  if (!running || !cancellable.value || busy.value) return;
  const paperId = props.paperId;
  busy.value = true;
  failure.value = '';
  ++version;
  try {
    const update = await w.api<PdfTranslationStatus>(`${base.value}/cancel`, json('POST', { jobId: running.id }));
    if (current(paperId)) apply(update);
  } catch (error) {
    if (current(paperId)) failure.value = (error as Error).message;
  } finally {
    busy.value = false;
    if (current(paperId)) void refresh();
  }
}

watch(() => state.pdfTranslationEvent, (event) => {
  if (!event || event.job.paperId !== props.paperId || !current() || busy.value) return;
  if (submitted.value && event.job.id !== submitted.value) return;
  ++version;
  if (status.value) status.value = { ...status.value, job: event.job };
  if (!activeTranslationJob(event.job) || !status.value) void refresh();
});
watch([() => props.file, () => state.eventsOpen, () => w.models.value.find((model) => model.isDefault)?.id],
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
      <button v-if="cancellable" type="button" class="button subtle" data-translation-cancel :disabled="busy"
        @click="cancel">取消</button>
    </template>
    <button v-else-if="status" type="button" class="button subtle" data-translation-start
      :disabled="busy || !status.engineAvailable || !activeModel"
      @click="start">{{ busy ? '正在提交…' : startLabel }}</button>
    <template v-if="status && !progressJob">
      <span v-if="!status.engineAvailable" class="pdf-translation-detail">请按 README 安装 MinerU 解析环境</span>
      <span v-else-if="!activeModel" class="pdf-translation-detail">请在「模型与密钥」中配置模型</span>
      <TranslationModelPicker v-else-if="availableModels.length" :model-value="state.translationModel"
        :default-model="status.model" :disabled="busy" @update:model-value="w.setTranslationModel" />
      <span v-else class="pdf-translation-detail" :title="`MinerU 解析后的英文正文将发送给 ${activeModel}`">
        正文发送至 {{ activeModel }}
      </span>
    </template>
    <span v-if="failure || job?.error" class="error-text pdf-translation-error" role="status">
      {{ failure || job?.error }}
    </span>
  </div>
</template>
