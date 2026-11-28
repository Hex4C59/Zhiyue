<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { PdfTranslationBatch, PdfTranslationJob } from '../../shared/pdfTranslation';
import { useWorkspace } from '../lib/workspace';
import TranslationJobRow from './TranslationJobRow.vue';
import VirtualList from './VirtualList.vue';

const props = defineProps<{ batch: PdfTranslationBatch }>();
const w = useWorkspace();
const state = w.state;
const jobs = computed(() => w.batchJobs(props.batch));
const counts = computed(() => props.batch.counts);
const expanded = ref(state.translationBatchId === props.batch.id);
const jobKey = (job: PdfTranslationJob): string => job.id;
const labels: Record<PdfTranslationBatch['status'], string> = {
  queued: '排队中', running: '处理中', cancelling: '正在取消', completed: '处理完成',
  partial: '部分完成', failed: '处理失败', cancelled: '已取消',
};

watch(() => state.translationBatchId, (id) => {
  if (id === props.batch.id) expanded.value = true;
});
</script>

<template>
  <section class="translation-batch" :data-translation-batch="batch.id">
    <div class="translation-batch-heading">
      <strong>已处理 {{ counts.processed }} / {{ counts.total }}</strong>
      <span>{{ labels[batch.status] }}</span>
    </div>
    <p class="translation-batch-model">{{ batch.model }}</p>
    <progress :value="counts.processed" :max="counts.total" aria-label="批次处理进度" />
    <div class="translation-counts">
      <span>已生成 {{ counts.completed }}</span><span>已跳过 {{ counts.skipped }}</span>
      <span>失败 {{ counts.failed }}</span><span>已取消 {{ counts.cancelled }}</span>
    </div>
    <div class="translation-batch-actions">
      <button v-if="counts.queued || counts.running" type="button" class="button subtle"
        :disabled="state.translationCancelling.has(batch.id) || batch.status === 'cancelling'"
        :data-translation-cancel="batch.id" @click="w.cancelTranslationBatch(batch.id)">
        {{ batch.status === 'cancelling' ? '正在取消…' : '取消本批次' }}
      </button>
      <button v-else-if="counts.failed || counts.cancelled" type="button" class="button subtle"
        :disabled="state.translationSubmitting" :data-translation-retry="batch.id"
        @click="w.retryTranslationBatch(batch)">重试未完成</button>
    </div>
    <details :open="expanded" class="translation-batch-details"
      @toggle="expanded = ($event.target as HTMLDetailsElement).open">
      <summary>逐篇进度</summary>
      <VirtualList v-if="expanded" class="translation-job-list" :items="jobs" :item-key="jobKey"
        :estimate="108" :aria-label="`批次 ${batch.id} 逐篇进度`">
        <template #default="{ item: job }"><TranslationJobRow :job="job" /></template>
      </VirtualList>
    </details>
  </section>
</template>
