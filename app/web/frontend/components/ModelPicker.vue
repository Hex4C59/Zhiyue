<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Icon from './Icon.vue';
import type { WorkspaceApi } from '../lib/workspace';

interface ModelOption {
  id: string;
  label: string;
}

const workspace = inject('workspace') as WorkspaceApi;
const state = workspace.state;
const open = ref(false);
const query = ref('');
const trigger = ref<HTMLButtonElement | null>(null);
const search = ref<HTMLInputElement | null>(null);
const list = ref<HTMLElement | null>(null);
const options = computed<ModelOption[]>(() => [{ id: '', label: '默认模型' }, ...workspace.models.value]);
const filtered = computed(() =>
  options.value.filter((model) =>
    `${model.label} ${model.id}`.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase()),
  ),
);
const selected = computed(() => options.value.find((model) => model.id === state.model) || options.value[0] as ModelOption);
const disabled = computed(
  () =>
    workspace.busy.value ||
    state.creating ||
    workspace.agent.value.available !== true ||
    !workspace.models.value.length,
);
watch(options, () => {
  if (!options.value.some((model) => model.id === state.model)) state.model = '';
});
watch(disabled, (value) => {
  if (value) open.value = false;
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
  query.value = '';
  open.value = true;
  await nextTick();
  search.value?.focus();
}
function choose(id: string): void {
  state.model = id;
  close();
  state.focusComposer++;
}
function keydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    close(true);
    return;
  }
  const buttons = [...(list.value?.querySelectorAll<HTMLElement>('[role="option"]') || [])];
  if (event.key === 'Enter' && event.target === search.value) {
    event.preventDefault();
    const first = filtered.value[0];
    if (first) choose(first.id);
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
  if (['Home', 'End'].includes(event.key) && (event.target as HTMLElement).getAttribute('role') === 'option') {
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
    aria-haspopup="listbox"
    :aria-expanded="open"
    aria-controls="model-list"
    :title="selected.label"
    @click="toggle"
  >
    <span id="model-name">{{ selected.label.replace(/ · 默认$/, '').split(' · ')[0] }}</span
    ><Icon name="chevron" />
  </button>
  <div v-if="open" id="model-menu" class="model-menu" @keydown="keydown">
    <div class="model-search">
      <Icon name="search" /><input
        id="model-search"
        ref="search"
        v-model="query"
        type="search"
        placeholder="搜索模型"
        aria-label="搜索模型"
        aria-controls="model-list"
        autocomplete="off"
      />
    </div>
    <div id="model-list" ref="list" class="model-list" role="listbox" aria-label="模型">
      <button
        v-for="model in filtered"
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
        <span>{{ model.label.replace(/ · 默认$/, '') }}</span
        ><Icon v-if="model.id === state.model" name="check" />
      </button>
      <div v-if="!filtered.length" class="model-empty">未找到模型</div>
    </div>
  </div>
</template>
