<script setup lang="ts">
import { computed, inject, nextTick, ref } from 'vue';
import { titleOf } from '../lib/content';
import type { WorkspaceApi } from '../lib/workspace';
import Icon from './Icon.vue';
import VirtualList from './VirtualList.vue';

const workspace = inject('workspace') as WorkspaceApi;
const { state } = workspace;
const query = ref('');
const dialog = ref<HTMLDialogElement>();
const trigger = ref<HTMLButtonElement>();
const search = ref<HTMLInputElement>();
const opened = ref(false);
const title = (id: string) => titleOf(workspace.paperById.value.get(id) || { literature_id: id });
const choices = computed(() => {
  const term = query.value.trim().toLocaleLowerCase();
  return state.papers.filter(paper => !state.context.has(paper.literature_id) &&
    `${paper.literature_id} ${titleOf(paper)} ${paper.titleZh || ''}`.toLocaleLowerCase().includes(term));
});
async function open(): Promise<void> {
  opened.value = true;
  query.value = '';
  await nextTick();
  if (dialog.value?.showModal) dialog.value.showModal();
  else dialog.value?.setAttribute('open', '');
  search.value?.focus();
}
async function close(): Promise<void> {
  opened.value = false;
  await nextTick();
  (trigger.value?.disabled ? document.getElementById('chat-input') : trigger.value)?.focus();
}
function pin(id: string): void {
  if (state.context.size >= 5) return;
  state.context.add(id);
  void close();
}
</script>

<template>
  <div class="question-papers">
    <div v-if="workspace.currentPaper.value" class="question-current" :title="title(state.current!)">
      <span>当前文献</span><strong>{{ title(state.current!) }}</strong>
    </div>
    <div v-if="state.context.size" class="chat-context" aria-label="固定的对比文献">
      <span v-for="id in state.context" :key="id" class="comparison-chip" :title="title(id)">
        <span>{{ title(id) }}</span>
        <button type="button" :data-context-remove="id" :aria-label="`移除对比文献 ${title(id)}`"
          @click="state.context.delete(id)"><Icon name="close" /></button>
      </span>
    </div>
    <button v-if="state.papers.length" ref="trigger" class="comparison-add" type="button" aria-haspopup="dialog"
      :disabled="state.context.size >= 5" @click="open">
      <Icon name="plus" />{{ state.context.size >= 5 ? '已固定 5 篇对比文献' : '添加对比文献' }}
    </button>
    <dialog v-if="opened" ref="dialog" class="comparison-dialog" aria-labelledby="comparison-title"
      @cancel.prevent="close" @click.self="close">
      <header><h2 id="comparison-title">添加对比文献</h2>
        <button class="icon-button" type="button" aria-label="关闭" @click="close"><Icon name="close" /></button>
      </header>
      <input ref="search" v-model="query" type="search" aria-label="搜索对比文献" placeholder="搜索题名或编号" />
      <VirtualList class="comparison-options" :items="choices" :item-key="paper => paper.literature_id"
        :estimate="54" :gap="2" :reset-key="query" aria-label="可固定的文献">
        <template #default="{ item }"><button type="button" data-virtual-focus :data-pin-paper="item.literature_id"
          @click="pin(item.literature_id)"><small>{{ item.literature_id }}</small> {{ titleOf(item) }}</button></template>
        <template #empty><p>没有匹配的文献</p></template>
      </VirtualList>
    </dialog>
  </div>
</template>
