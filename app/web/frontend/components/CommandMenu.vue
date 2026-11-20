<script setup lang="ts">
import { computed, inject, nextTick, ref, watch } from 'vue';
import type { CommandInfo } from '../lib/types';
import type { WorkspaceApi } from '../lib/workspace';

const props = defineProps<{ draft: string; canSend: boolean }>();
const workspace = inject('workspace') as WorkspaceApi;
const state = workspace.state;
const active = ref(0);
const list = ref<HTMLElement | null>(null);
// 插入命令后收起菜单，直到用户再次改动输入；避免菜单遮住刚插入的命令。
const inserted = ref<string | null>(null);

// 只有第一行以斜杠开头且还没有换行时才当作命令输入，参数里的斜杠正常输入。
const query = computed<string | null>(() => {
  const text = props.draft;
  if (text === inserted.value) return null;
  if (!text.startsWith('/') || text.includes('\n')) return null;
  if (/\s/.test(text)) {
    // 已输入参数时保持菜单收起，避免遮住正文。
    return null;
  }
  return text.slice(1).toLocaleLowerCase();
});

const matches = computed<CommandInfo[]>(() => {
  const value = query.value;
  if (value === null) return [];
  const items = state.commands;
  if (!value) return items;
  return items.filter((command) => {
    const name = command.name.toLocaleLowerCase();
    return name.startsWith(value) || name.includes(`:${value}`) || command.description.includes(value);
  });
});

const open = computed(() => query.value !== null && matches.value.length > 0 && props.canSend);

// jsdom 等测试环境没有 scrollIntoView；滚动只是提示，缺失时忽略。
function scrollActiveIntoView(): void {
  const option = list.value?.querySelector<HTMLElement>('[aria-selected="true"]');
  if (typeof option?.scrollIntoView === 'function') option.scrollIntoView({ block: 'nearest' });
}

watch(matches, () => { active.value = 0; });
watch(open, async (value) => {
  if (!value) return;
  await nextTick();
  scrollActiveIntoView();
});

function label(command: CommandInfo): string {
  return `/${command.name}`;
}

function choose(command: CommandInfo): void {
  const next = `${label(command)}${command.argumentHint ? ' ' : ''}`;
  inserted.value = next;
  state.draft = next;
  active.value = 0;
  nextTick(() => {
    state.focusComposer++;
  });
}

// 由 Composer 在输入框内转发上下键与回车；返回 true 表示已处理。
function keydown(event: KeyboardEvent): boolean {
  if (!open.value) return false;
  const count = matches.value.length;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const step = event.key === 'ArrowDown' ? 1 : -1;
    active.value = (active.value + step + count) % count;
    nextTick(scrollActiveIntoView);
    return true;
  }
  if (event.key === 'Tab' || (event.key === 'Enter' && !event.shiftKey)) {
    const command = matches.value[active.value];
    if (!command) return false;
    event.preventDefault();
    choose(command);
    return true;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    inserted.value = '';
    state.draft = '';
    return true;
  }
  return false;
}

defineExpose({ keydown });</script>

<template>
  <div v-if="open" id="command-menu" class="command-menu" role="listbox" aria-label="斜杠命令">
    <div class="command-menu-head">斜杠命令</div>
    <div ref="list" class="command-list">
      <button
        v-for="(command, index) in matches"
        :key="command.name"
        type="button"
        role="option"
        tabindex="-1"
        class="command-option"
        :data-command="command.name"
        :aria-selected="index === active"
        :title="command.description"
        @mouseenter="active = index"
        @click="choose(command)"
      >
        <span class="command-name">{{ label(command) }}</span>
        <span class="command-source">{{ command.target === 'terminal' ? 'Pi 终端' : command.source === 'skill' ? '技能' : '本地' }}</span>
        <span class="command-desc">{{ command.description }}</span>
      </button>
    </div>
  </div>
</template>
