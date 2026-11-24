<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Icon from './Icon.vue';
import type { ModelOption } from '../lib/types';
import type { WorkspaceApi } from '../lib/workspace';

const workspace = inject('workspace') as WorkspaceApi;
const state = workspace.state;
const open = ref(false);
const activeProvider = ref<string | null>(null);
const providerQuery = ref('');
const modelQuery = ref('');
const trigger = ref<HTMLButtonElement | null>(null);
const search = ref<HTMLInputElement | null>(null);
const list = ref<HTMLElement | null>(null);
const defaultModel: ModelOption = { id: '', label: '默认模型' };
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

const providers = computed(() => {
  const groups = new Map<string, ModelOption[]>();
  for (const model of workspace.models.value) {
    const provider = providerOf(model.id);
    const models = groups.get(provider);
    if (models) models.push(model);
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
const selected = computed(() => workspace.models.value.find((model) => model.id === state.model) ?? defaultModel);
// 生成中不锁住选择器：当前回合仍用发出时的模型，新模型从下一条消息开始生效。
const running = computed(() => workspace.busy.value);
const disabled = computed(
  () =>
    state.creating ||
    workspace.agent.value.available !== true ||
    !workspace.models.value.length,
);
watch(providers, (groups) => {
  if (state.model && !workspace.models.value.some((model) => model.id === state.model)) state.model = '';
  if (activeProvider.value !== null && !groups.some(({ id }) => id === activeProvider.value)) void goBack();
});
watch(disabled, (value) => {
  if (value) open.value = false;
});
watch(() => state.focusModelPicker, () => {
  if (!disabled.value && !open.value) void toggle();
});
function close(focus = false): void {
  open.value = false;
  if (focus) trigger.value?.focus();
}
async function toggle(): Promise<void> {
  if (open.value) {
    close();
    return;
  }
  activeProvider.value = null;
  providerQuery.value = '';
  open.value = true;
  await nextTick();
  search.value?.focus();
}
async function openProvider(id: string): Promise<void> {
  activeProvider.value = id;
  modelQuery.value = '';
  await nextTick();
  if (list.value) list.value.scrollTop = 0;
  search.value?.focus();
}
async function goBack(): Promise<void> {
  const previous = activeProvider.value;
  activeProvider.value = null;
  await nextTick();
  if (!open.value) return;
  const button = [...(list.value?.querySelectorAll<HTMLElement>('[data-provider-value]') ?? [])]
    .find((option) => option.dataset.providerValue === previous);
  (button ?? search.value)?.focus();
}
function choose(id: string): void {
  const changed = id !== state.model;
  const option = workspace.models.value.find((model) => model.id === id);
  state.model = id;
  close();
  state.focusComposer++;
  // 生成中重选同一个模型不提示；换了模型只影响下一条消息。
  if (running.value && changed) {
    workspace.toast(option ? `已切换为 ${modelLabel(option)}，下一条消息生效` : '已恢复默认模型，下一条消息生效');
  }
}
function keydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    if (activeProvider.value === null) close(true);
    else void goBack();
    return;
  }
  const target = event.target as HTMLElement;
  const buttons = [...(list.value?.querySelectorAll<HTMLElement>('button') ?? [])];
  if (event.key === 'Enter' && event.target === search.value) {
    event.preventDefault();
    buttons[0]?.click();
    return;
  }
  if (event.key === 'ArrowRight' && target.hasAttribute('data-provider-value')) {
    event.preventDefault();
    target.click();
    return;
  }
  if (event.key === 'ArrowLeft' && target.hasAttribute('data-model-value') && activeProvider.value !== null) {
    event.preventDefault();
    void goBack();
    return;
  }
  if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    const index = buttons.indexOf(document.activeElement as HTMLElement);
    const next =
      index < 0
        ? event.key === 'ArrowDown'
          ? 0
          : buttons.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }
  if (['Home', 'End'].includes(event.key) && buttons.includes(target)) {
    event.preventDefault();
    buttons[event.key === 'Home' ? 0 : buttons.length - 1]?.focus();
  }
}
function outside(event: Event): void {
  const target = event.target as HTMLElement | null;
  if (!target?.closest?.('#model-menu,#model-trigger')) close();
}
onMounted(() => {
  document.addEventListener('pointerdown', outside);
  document.addEventListener('focusin', outside);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside);
  document.removeEventListener('focusin', outside);
});
</script>

<template>
  <button
    id="model-trigger"
    ref="trigger"
    type="button"
    class="model-trigger"
    :disabled="disabled"
    :aria-label="`选择模型：${selected.label}`"
    aria-haspopup="dialog"
    :aria-expanded="open"
    aria-controls="model-menu"
    :title="running ? `${selected.label}（任务进行中，切换后从下一条消息生效）` : selected.label"
    @click="toggle"
  >
    <span id="model-name">{{ modelLabel(selected) }}</span
    ><Icon name="chevron" />
  </button>
  <div v-if="open" id="model-menu" class="model-menu" role="dialog" aria-label="选择模型" @keydown="keydown">
    <div v-if="activeProvider !== null" class="model-provider-heading">
      <button
        type="button"
        class="icon-button compact model-back"
        title="返回服务商列表"
        aria-label="返回服务商列表"
        @click="goBack"
      ><Icon name="chevron" /></button>
      <span :title="providerLabel(activeProvider)">{{ providerLabel(activeProvider) }}</span>
    </div>
    <div class="model-search">
      <Icon name="search" /><input
        id="model-search"
        ref="search"
        v-model="query"
        type="search"
        :placeholder="searchLabel"
        :aria-label="searchLabel"
        aria-controls="model-list"
        autocomplete="off"
      />
    </div>
    <div v-if="activeProvider === null" id="model-list" ref="list" class="model-list" role="group" aria-label="服务商">
      <button
        v-for="provider in visibleProviders"
        :key="provider.id"
        type="button"
        tabindex="-1"
        class="model-option model-provider-option"
        :data-provider-value="provider.id"
        @click="openProvider(provider.id)"
      >
        <span>{{ providerLabel(provider.id) }}</span><Icon name="chevron" />
      </button>
      <div v-if="!visibleProviders.length" class="model-empty">未找到服务商</div>
    </div>
    <div v-else id="model-list" ref="list" class="model-list" role="listbox" aria-label="模型">
      <button
        v-for="model in visibleModels"
        :key="model.id"
        type="button"
        role="option"
        tabindex="-1"
        class="model-option"
        :data-model-value="model.id"
        :aria-selected="model.id === state.model"
        :title="model.id || model.label"
        @click="choose(model.id)"
      >
        <span>{{ modelLabel(model) }}</span
        ><Icon v-if="model.id === state.model" name="check" />
      </button>
      <div v-if="!visibleModels.length" class="model-empty">未找到模型</div>
    </div>
    <div v-if="activeProvider === null" class="model-default">
      <button type="button" class="model-option" data-model-value="" @click="choose('')">
        <span>{{ defaultModel.label }}</span><Icon v-if="!state.model" name="check" />
      </button>
    </div>
  </div>
</template>
