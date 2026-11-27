<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { PDF_TRANSLATION_MAX_BATCH, type PdfTranslationJob } from '../../shared/pdfTranslation';
import { titleOf } from '../lib/content';
import { translatablePaper } from '../lib/workspaceTranslations';
import { useWorkspace } from '../lib/workspace';
import Icon from './Icon.vue';
import TranslationBatchCard from './TranslationBatchCard.vue';
import TranslationJobRow from './TranslationJobRow.vue';
import TranslationModelPicker from './TranslationModelPicker.vue';
import VirtualList from './VirtualList.vue';

const w = useWorkspace();
const state = w.state;
const dialog = ref<HTMLDialogElement>();
const candidates = computed(() => state.translationCandidates.map((id) => ({
  id, paper: w.paperById.value.get(id),
})));
const candidateKey = (candidate: { id: string }): string => candidate.id;
const jobKey = (job: PdfTranslationJob): string => job.id;
const batches = computed(() => state.translationSnapshot.batches);
const singles = w.translationSingles;
const validModel = computed(() => !state.translationModel ||
  w.models.value.some(({ id }) => id === state.translationModel));
const canSubmit = computed(() => state.translationReady && state.translationSnapshot.engineAvailable &&
  !!w.translationModelOption.value && validModel.value && state.translationSelected.size > 0 &&
  !state.translationSubmitting);
let opener: HTMLElement | null = null;

function close(): void { state.translationOpen = false; }
function keydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
  if (event.key !== 'Tab' || !dialog.value) return;
  const controls = [...dialog.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]),input:not([disabled]),summary,[tabindex="0"]',
  )];
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
function backdrop(event: MouseEvent): void {
  if (event.target !== dialog.value) return;
  const box = dialog.value!.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) {
    close();
  }
}
onMounted(async () => {
  opener = document.activeElement as HTMLElement | null;
  if (dialog.value?.showModal) dialog.value.showModal();
  else dialog.value?.setAttribute('open', '');
  await nextTick();
  dialog.value?.querySelector<HTMLElement>('button')?.focus();
});
onBeforeUnmount(() => { if (opener?.isConnected) opener.focus(); });
</script>

<template>
  <dialog
    ref="dialog" class="translation-dialog" aria-labelledby="translation-dialog-title"
    @cancel.prevent="close" @keydown="keydown" @click="backdrop"
  >
    <header class="translation-dialog-header">
      <h2 id="translation-dialog-title">中文精读翻译</h2>
      <button type="button" class="icon-button" aria-label="关闭翻译窗口" title="关闭翻译窗口" @click="close">
        <Icon name="close" />
      </button>
    </header>
    <div class="translation-dialog-tabs" role="group" aria-label="翻译任务视图">
      <button type="button" class="button subtle" :class="{ active: state.translationMode === 'new' }"
        :aria-pressed="state.translationMode === 'new'" data-translation-new
        @click="state.translationMode = 'new'">新建批次</button>
      <button type="button" class="button subtle" :class="{ active: state.translationMode === 'tasks' }"
        :aria-pressed="state.translationMode === 'tasks'" data-translation-history
        @click="state.translationMode = 'tasks'">翻译任务</button>
    </div>
    <p v-if="state.translationError || state.translationLoadError"
      class="error-text translation-dialog-error" role="alert">
      {{ state.translationError || state.translationLoadError }}
    </p>
    <form v-if="state.translationMode === 'new'" class="translation-form" @submit.prevent="w.submitTranslations">
      <div class="translation-model-row">
        <span>翻译模型</span>
        <TranslationModelPicker
          :model-value="state.translationModel" :default-model="state.translationSnapshot.model"
          :disabled="state.translationSubmitting" @update:model-value="w.setTranslationModel"
        />
      </div>
      <p class="translation-permission">PDF 在本机解析，正文发送给所选模型。</p>
      <p v-if="!state.translationReady" class="muted">正在读取翻译环境…</p>
      <p v-else-if="!state.translationSnapshot.engineAvailable" class="error-text">请先安装 MinerU 解析环境，详见项目 README。</p>
      <p v-else-if="!w.translationModelOption.value || !validModel" class="error-text">所选模型不可用，请重新选择翻译模型。</p>
      <label class="translation-regenerate">
        <input v-model="state.translationRegenerate" type="checkbox" :disabled="state.translationSubmitting" />
        重新生成已有译本
      </label>
      <p class="translation-help">默认跳过与当前原文匹配的已完成译本；重新生成时仍可阅读旧译本。</p>
      <div class="translation-selection-tools">
        <span data-translation-selected>已选 {{ state.translationSelected.size }} / {{ candidates.length }} 篇</span>
        <button type="button" class="text-button" data-translation-select-all :disabled="state.translationSubmitting"
          @click="w.selectAllTranslations">全选</button>
        <button type="button" class="text-button" data-translation-clear :disabled="state.translationSubmitting"
          @click="state.translationSelected.clear()">清空</button>
        <span class="muted">每批最多 {{ PDF_TRANSLATION_MAX_BATCH }} 篇</span>
      </div>
      <VirtualList class="translation-candidates" aria-label="选择翻译文献"
        :items="candidates" :item-key="candidateKey" :estimate="64">
        <template #default="{ item: { id, paper } }">
        <div class="translation-candidate" :data-translation-candidate="id">
          <label>
            <input type="checkbox" :checked="state.translationSelected.has(id)" :aria-label="`选择 ${id}`"
              data-virtual-focus :disabled="state.translationSubmitting || !translatablePaper(paper)"
              @keydown.enter.prevent="w.toggleTranslation(id, !state.translationSelected.has(id))"
              @change="w.toggleTranslation(id, ($event.target as HTMLInputElement).checked)" />
            <span class="paper-id">{{ id }}</span>
            <span class="translation-candidate-title">{{ paper ? titleOf(paper) : '文献已不在当前索引中' }}</span>
          </label>
          <span v-if="!translatablePaper(paper)" class="muted">原文 PDF 不可用</span>
        </div>
        </template>
        <template #empty>
          <div class="empty">当前范围没有可翻译的文献，请先在文献列表筛选。</div>
        </template>
      </VirtualList>
      <footer class="translation-dialog-footer">
        <button type="button" class="button subtle" @click="close">关闭</button>
        <button type="submit" class="button primary" data-translation-submit :disabled="!canSubmit">
          {{ state.translationSubmitting ? '正在加入队列…' : `开始翻译 ${state.translationSelected.size} 篇` }}
        </button>
      </footer>
    </form>
    <div v-else class="translation-task-body" aria-label="翻译批次与逐篇进度">
      <p v-if="state.translationLoading" class="muted translation-refreshing">正在更新任务…</p>
      <TranslationBatchCard v-for="batch in batches" :key="batch.id" :batch="batch" />
      <section v-if="singles.length" class="translation-batch">
        <h3>单篇翻译</h3>
        <VirtualList class="translation-job-list" aria-label="单篇翻译进度"
          :items="singles" :item-key="jobKey" :estimate="108">
          <template #default="{ item: job }"><TranslationJobRow :job="job" /></template>
        </VirtualList>
      </section>
      <div v-if="!batches.length && !singles.length && !state.translationLoading" class="empty">暂无翻译任务</div>
      <p class="translation-help">关闭此窗口后，队列仍会继续处理。</p>
    </div>
  </dialog>
</template>
