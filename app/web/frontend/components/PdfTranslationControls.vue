<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Icon from './Icon.vue';
import { endpoint, json } from '../lib/content';
import type { ModelOption } from '../lib/types';
import type { WorkspaceApi } from '../lib/workspace';
import type { PdfTranslationJob, PdfTranslationStatus } from '../../shared/pdfTranslation.js';

const STORAGE_KEY = 'zhiyue.translationModel';
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const providerOf = (id: string): string => {
  const separator = id.indexOf('/');
  return separator > 0 ? id.slice(0, separator) : '';
};
const providerLabel = (id: string): string => id || '其他服务商';
const searchTerm = (value: string): string => value.trim().toLocaleLowerCase();

function modelLabel(model: ModelOption): string {
  const label = model.label.replace(/ · 默认$/, '');
  const provider = providerOf(model.id);
  if (!provider) return label;
  const suffix = ` · ${provider}`;
  if (label.endsWith(suffix)) return label.slice(0, -suffix.length);
  return label === model.id ? label.slice(provider.length + 1) : label;
}

const props = defineProps<{ paperId: string; file: string }>();
const workspace = inject('workspace') as WorkspaceApi;
const state = workspace.state;
const status = ref<PdfTranslationStatus | null>(null);
const busy = ref(false);
const failure = ref('');
const pickerOpen = ref(false);
const activeProvider = ref<string | null>(null);
const providerQuery = ref('');
const modelQuery = ref('');
const pickerRoot = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLElement | null>(null);

function readSavedModel(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function saveModel(id: string): void {
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch { /* 存储不可用时仅在当前会话生效。 */ }
}

const preferredModel = ref(readSavedModel());
const availableModels = computed(() => workspace.models.value);
const activeModel = computed(() => {
  if (preferredModel.value && availableModels.value.some((m) => m.id === preferredModel.value)) {
    return preferredModel.value;
  }
  return status.value?.model ?? '';
});
const providers = computed(() => {
  const groups = new Map<string, ModelOption[]>();
  for (const model of availableModels.value) {
    const provider = providerOf(model.id);
    const list = groups.get(provider);
    if (list) list.push(model);
    else groups.set(provider, [model]);
  }
  return [...groups].map(([id, models]) => ({ id, models })).sort((a, b) => {
    if (!a.id || !b.id) return Number(!a.id) - Number(!b.id);
    return collator.compare(a.id, b.id);
  });
});
const visibleProviders = computed(() => providers.value.filter(({ id }) =>
  searchTerm(providerLabel(id)).includes(searchTerm(providerQuery.value)),
));
const visibleModels = computed(() => providers.value.find(({ id }) => id === activeProvider.value)?.models
  .filter((model) => searchTerm(`${modelLabel(model)} ${model.id}`).includes(searchTerm(modelQuery.value))) ?? []);
const query = computed({
  get: () => activeProvider.value === null ? providerQuery.value : modelQuery.value,
  set: (value: string) => {
    if (activeProvider.value === null) providerQuery.value = value;
    else modelQuery.value = value;
  },
});
const searchLabel = computed(() => activeProvider.value === null ? '搜索服务商' : '搜索模型');
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

async function togglePicker(): Promise<void> {
  if (!availableModels.value.length) return;
  pickerOpen.value = !pickerOpen.value;
  if (pickerOpen.value) {
    activeProvider.value = null;
    providerQuery.value = '';
    modelQuery.value = '';
    await nextTick();
    searchInput.value?.focus();
  }
}

async function openProvider(id: string): Promise<void> {
  activeProvider.value = id;
  modelQuery.value = '';
  await nextTick();
  if (listEl.value) listEl.value.scrollTop = 0;
  searchInput.value?.focus();
}

async function goBackProvider(): Promise<void> {
  activeProvider.value = null;
  await nextTick();
  if (pickerOpen.value) searchInput.value?.focus();
}

function handlePickerEscape(): void {
  if (activeProvider.value === null) pickerOpen.value = false;
  else void goBackProvider();
}

function chooseModel(id: string): void {
  preferredModel.value = id;
  saveModel(id);
  pickerOpen.value = false;
}

function handleOutside(event: Event): void {
  const target = event.target as Node | null;
  if (pickerOpen.value && target && pickerRoot.value && !pickerRoot.value.contains(target)) {
    pickerOpen.value = false;
  }
}

async function start(): Promise<void> {
  const model = activeModel.value;
  if (busy.value || active.value || submitted.value || !status.value?.engineAvailable || !model) return;
  pickerOpen.value = false;
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
  document.addEventListener('pointerdown', handleOutside);
  poll = setInterval(() => { if ((active.value || submitted.value) && !busy.value) void refresh(); }, 3000);
});
onBeforeUnmount(() => {
  disposed = true;
  document.removeEventListener('pointerdown', handleOutside);
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
      :disabled="busy || !status.engineAvailable || !activeModel"
      @click="start">{{ busy ? '正在提交…' : startLabel }}</button>
    <template v-if="status && !progressJob">
      <span v-if="!status.engineAvailable" class="pdf-translation-detail">请按 README 安装 MinerU 解析环境</span>
      <span v-else-if="!activeModel" class="pdf-translation-detail">请在「模型与密钥」中配置模型</span>
      <div v-else-if="availableModels.length" ref="pickerRoot" class="pdf-translation-model-picker">
        <button
          type="button"
          class="pdf-translation-model-trigger"
          :aria-expanded="pickerOpen"
          aria-haspopup="listbox"
          :title="`点击切换中文翻译模型（当前：${activeModel}）`"
          @click="togglePicker"
        >
          <span>正文发送至 {{ activeModel }}</span>
          <Icon name="chevron" />
        </button>
        <div
          v-if="pickerOpen"
          class="pdf-translation-model-menu"
          role="dialog"
          aria-label="选择翻译模型"
          @keydown.escape.prevent="handlePickerEscape"
        >
          <div v-if="activeProvider !== null" class="model-provider-heading">
            <button
              type="button"
              class="icon-button compact model-back"
              title="返回服务商列表"
              aria-label="返回服务商列表"
              @click="goBackProvider"
            ><Icon name="chevron" /></button>
            <span :title="providerLabel(activeProvider)">{{ providerLabel(activeProvider) }}</span>
          </div>
          <div class="model-search">
            <Icon name="search" />
            <input
              ref="searchInput"
              v-model="query"
              type="search"
              :placeholder="searchLabel"
              :aria-label="searchLabel"
              autocomplete="off"
            />
          </div>
          <div v-if="activeProvider === null" ref="listEl" class="model-list" role="group" aria-label="服务商">
            <button
              v-for="provider in visibleProviders"
              :key="provider.id"
              type="button"
              class="model-option model-provider-option"
              @click="openProvider(provider.id)"
            >
              <span>{{ providerLabel(provider.id) }}</span>
              <Icon name="chevron" />
            </button>
            <div v-if="!visibleProviders.length" class="model-empty">未找到服务商</div>
          </div>
          <div v-else ref="listEl" class="model-list" role="listbox" aria-label="翻译模型列表">
            <button
              v-for="model in visibleModels"
              :key="model.id"
              type="button"
              role="option"
              class="model-option"
              :aria-selected="preferredModel === model.id"
              :title="model.id"
              @click="chooseModel(model.id)"
            >
              <span>{{ modelLabel(model) }}</span>
              <Icon v-if="preferredModel === model.id" name="check" />
            </button>
            <div v-if="!visibleModels.length" class="model-empty">未找到模型</div>
          </div>
          <div v-if="activeProvider === null && status.model" class="model-default">
            <button
              type="button"
              class="model-option"
              :aria-selected="!preferredModel"
              @click="chooseModel('')"
            >
              <span>跟随默认模型（{{ status.model }}）</span>
              <Icon v-if="!preferredModel" name="check" />
            </button>
          </div>
        </div>
      </div>
      <span v-else class="pdf-translation-detail" :title="`MinerU 解析后的英文正文将发送给 ${activeModel}`">
        正文发送至 {{ activeModel }}
      </span>
    </template>
    <span v-if="failure || job?.error" class="error-text pdf-translation-error" role="status">
      {{ failure || job?.error }}
    </span>
  </div>
</template>
