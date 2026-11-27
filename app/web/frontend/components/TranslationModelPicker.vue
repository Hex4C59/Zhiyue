<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Icon from './Icon.vue';
import type { ModelOption } from '../lib/types';
import { useWorkspace } from '../lib/workspace';

const props = defineProps<{ modelValue: string; defaultModel: string | null; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const workspace = useWorkspace();
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

const pickerOpen = ref(false);
const activeProvider = ref<string | null>(null);
const providerQuery = ref('');
const modelQuery = ref('');
const pickerRoot = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLElement | null>(null);
const availableModels = computed(() => workspace.models.value);
const activeModel = computed(() => props.modelValue || props.defaultModel || '');
const disabled = computed(() => props.disabled || !availableModels.value.length);
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

async function togglePicker(): Promise<void> {
  if (disabled.value) return;
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
  if (activeProvider.value === null) {
    pickerOpen.value = false;
    trigger.value?.focus();
  } else void goBackProvider();
}

function chooseModel(id: string): void {
  emit('update:modelValue', id);
  pickerOpen.value = false;
  trigger.value?.focus();
}

function handleOutside(event: Event): void {
  const target = event.target as Node | null;
  if (pickerOpen.value && target && pickerRoot.value && !pickerRoot.value.contains(target)) {
    pickerOpen.value = false;
  }
}

watch(disabled, (value) => {
  if (value) pickerOpen.value = false;
});
watch(providers, (groups) => {
  if (activeProvider.value !== null && !groups.some(({ id }) => id === activeProvider.value)) void goBackProvider();
});
onMounted(() => document.addEventListener('pointerdown', handleOutside));
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleOutside));
</script>

<template>
  <div ref="pickerRoot" class="pdf-translation-model-picker" data-translation-model-picker>
    <button
      ref="trigger"
      type="button"
      class="pdf-translation-model-trigger"
      data-translation-model-trigger
      :disabled="disabled"
      :aria-expanded="pickerOpen"
      aria-haspopup="dialog"
      :aria-label="activeModel ? `选择翻译模型：${activeModel}` : '选择翻译模型'"
      :title="activeModel ? `点击切换中文翻译模型（当前：${activeModel}）` : '选择翻译模型'"
      @click="togglePicker"
    >
      <span>{{ activeModel ? `正文发送至 ${activeModel}` : '选择翻译模型' }}</span>
      <Icon name="chevron" />
    </button>
    <div
      v-if="pickerOpen"
      class="pdf-translation-model-menu"
      data-translation-model-menu
      role="dialog"
      aria-label="选择翻译模型"
      @keydown.escape.stop.prevent="handlePickerEscape"
    >
      <div v-if="activeProvider !== null" class="model-provider-heading">
        <button
          type="button"
          class="icon-button compact model-back"
          data-translation-model-back
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
          data-translation-model-search
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
          :data-translation-provider-value="provider.id"
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
          :data-translation-model-value="model.id"
          :aria-selected="modelValue === model.id"
          :title="model.id"
          @click="chooseModel(model.id)"
        >
          <span>{{ modelLabel(model) }}</span>
          <Icon v-if="modelValue === model.id" name="check" />
        </button>
        <div v-if="!visibleModels.length" class="model-empty">未找到模型</div>
      </div>
      <div v-if="activeProvider === null" class="model-default">
        <button
          type="button"
          class="model-option"
          data-translation-model-value=""
          :aria-selected="!modelValue"
          @click="chooseModel('')"
        >
          <span>{{ defaultModel ? `跟随默认模型（${defaultModel}）` : '跟随默认模型' }}</span>
          <Icon v-if="!modelValue" name="check" />
        </button>
      </div>
    </div>
  </div>
</template>
