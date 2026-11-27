<script setup lang="ts">
import { computed } from 'vue';
import { activeTranslationJob, type PdfTranslationJob } from '../../shared/pdfTranslation';
import { titleOf } from '../lib/content';
import { useWorkspace } from '../lib/workspace';

const props = defineProps<{ job: PdfTranslationJob }>();
const w = useWorkspace();
const paper = computed(() => w.paperById.value.get(props.job.paperId));
const title = computed(() => paper.value ? titleOf(paper.value) : '文献已不在当前索引中');
</script>

<template>
  <div class="translation-job" :class="{ failed: job.status === 'failed' }" :data-translation-job="job.id"
    tabindex="0" data-virtual-focus :aria-label="`${job.paperId} ${title}`">
    <div class="translation-job-heading">
      <span class="paper-id">{{ job.paperId }}</span>
      <span class="translation-job-title" :title="title">{{ title }}</span>
    </div>
    <div class="translation-job-stage">
      <span>{{ job.stage }}</span>
      <span v-if="job.status === 'queued' && job.queuePosition">第 {{ job.queuePosition }} 位</span>
      <span v-else-if="activeTranslationJob(job)">{{ Math.round(job.percent) }}%</span>
    </div>
    <progress
      v-if="job.status !== 'queued' && activeTranslationJob(job)"
      :value="job.percent" max="100" :aria-label="`${job.paperId} 翻译进度`"
    />
    <p v-if="job.error || job.reason" :class="job.error ? 'error-text' : 'muted'">{{ job.error || job.reason }}</p>
  </div>
</template>
