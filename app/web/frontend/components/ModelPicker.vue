<script setup>
import { computed, inject, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import Icon from './Icon.vue';
const workspace = inject('workspace'),
  state = workspace.state;
const open = ref(false),
  query = ref(''),
  trigger = ref(null),
  search = ref(null),
  list = ref(null);
const options = computed(() => [{ id: '', label: '默认模型' }, ...workspace.models.value]);
const filtered = computed(() =>
  options.value.filter((model) =>
    `${model.label} ${model.id}`.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase()),
  ),
);
const selected = computed(() => options.value.find((model) => model.id === state.model) || options.value[0]);
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
function close(focus = false) {
  open.value = false;
  if (focus) trigger.value?.focus();
}
async function toggle() {
  if (open.value) return close();
  query.value = '';
  open.value = true;
  await nextTick();
  search.value?.focus();
}
function choose(id) {
  state.model = id;
  close();
  state.focusComposer++;
}
function keydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    close(true);
    return;
  }
  const buttons = [...(list.value?.querySelectorAll('[role="option"]') || [])];
  if (event.key === 'Enter' && event.target === search.value) {
    event.preventDefault();
    if (filtered.value[0]) choose(filtered.value[0].id);
    return;
  }
  if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    const index = buttons.indexOf(document.activeElement);
    const next =
      index < 0
        ? event.key === 'ArrowDown'
          ? 0
          : buttons.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }
  if (['Home', 'End'].includes(event.key) && event.target.getAttribute('role') === 'option') {
    event.preventDefault();
    buttons[event.key === 'Home' ? 0 : buttons.length - 1]?.focus();
  }
}
function outside(event) {
  if (!event.target.closest?.('#model-menu,#model-trigger')) close();
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
