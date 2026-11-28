<script setup lang="ts">
import { computed, inject, nextTick, ref } from 'vue';
import Icon from './Icon.vue';
import type { WorkspaceApi } from '../lib/workspace';

const { state } = inject('workspace') as WorkspaceApi;
const label = (name: string) => name.replace(/^\d+_/, '').replaceAll('_', ' ');
const scope = computed(() => [state.category, state.subcategory].filter(Boolean).map(label).join(' / ') || '全部文献');
const dialog = ref<HTMLDialogElement>();
const trigger = ref<HTMLButtonElement>();
async function open(): Promise<void> {
  const el = dialog.value;
  if (!el) return;
  if (el.showModal) el.showModal();
  else el.setAttribute('open', '');
  await nextTick();
  el.querySelector<HTMLElement>('[aria-current="true"]')?.focus();
}
function close(): void {
  const el = dialog.value;
  if (el?.close) el.close();
  else el?.removeAttribute('open');
  trigger.value?.focus();
}
function choose(category = '', child = ''): void {
  state.category = category;
  state.subcategory = child;
  close();
}
</script>

<template>
  <button ref="trigger" type="button" class="button subtle folder-scope" aria-haspopup="dialog"
    :aria-label="`选择文件夹，当前为${scope}`" @click="open">
    <Icon name="folder" /><span>{{ scope }}</span><Icon name="chevron" />
  </button>
  <dialog ref="dialog" class="folder-drawer" aria-labelledby="folder-drawer-title" @cancel.prevent="close" @click.self="close">
    <header><h2 id="folder-drawer-title">选择文件夹</h2>
      <button class="icon-button" aria-label="关闭文件夹选择" @click="close"><Icon name="close" /></button>
    </header>
    <nav aria-label="文献文件夹">
      <button :aria-current="!state.category" @click="choose()">全部文献</button>
      <template v-for="category in state.categories" :key="category.id">
        <template v-if="category.id">
          <button :aria-current="state.category === category.id && !state.subcategory" @click="choose(category.id)">
            {{ label(category.name || category.id) }}</button>
          <button v-for="child in category.children" :key="child.name" class="child"
            :aria-current="state.category === category.id && state.subcategory === child.name"
            @click="choose(category.id, child.name)">{{ label(child.name || '') }}</button>
        </template>
      </template>
    </nav>
  </dialog>
</template>
