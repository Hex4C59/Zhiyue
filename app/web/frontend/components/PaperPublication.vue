<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Paper } from '../lib/types';
import { authorText, titleOf } from '../lib/content';
import { paperPublication, rememberPublication, venueLabel } from '../lib/publication';
import { useWorkspace } from '../lib/workspace';
import { paperDoi, type Publication } from '../../shared/publication.js';

const props = defineProps<{ paper: Paper }>();
const w = useWorkspace();
const busy = ref(false);
const error = ref('');
const doi = computed(() => paperDoi(props.paper.doi));
const record = computed(() => paperPublication(props.paper));
const citation = computed(() => {
  const info = record.value;
  const authors = info?.authors.join(', ') || authorText(props.paper);
  const volume = [info?.volume, info?.issue && `(${info.issue})`].filter(Boolean).join('');
  const details = [venueLabel(props.paper), info?.year || props.paper.year, volume, info?.pages].filter(Boolean).join(', ');
  return [authors, info?.title || props.paper.title || titleOf(props.paper), details,
    doi.value && `https://doi.org/${doi.value}`].filter(Boolean).join('. ');
});
async function lookup(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    const data = await w.api<Publication>(`/api/papers/${encodeURIComponent(props.paper.literature_id)}/publication`);
    rememberPublication(data);
  } catch (cause) { error.value = (cause as Error).message; }
  finally { busy.value = false; }
}
async function copy(): Promise<void> {
  try { await navigator.clipboard.writeText(citation.value); w.toast('已复制引用'); }
  catch { w.toast('请选择引文文本后复制。', true); }
}
</script>
<template>
  <details class="paper-publication">
    <summary>出版信息与引用</summary>
    <p>{{ citation }}</p>
    <p v-if="record">Crossref 被引 {{ record.citedBy ?? '未知' }} · 参考文献 {{ record.references ?? '未知' }}
      · 查询于 {{ record.checkedAt.slice(0, 10) }}</p>
    <p v-else-if="paper.publicationNote" class="muted">出版信息待查 · {{ paper.publicationNote }}</p>
    <button class="button subtle" type="button" @click="copy">复制引用</button>
    <button v-if="doi" class="button subtle" type="button" :disabled="busy" @click="lookup">
      {{ busy ? '查询中…' : record ? '刷新 Crossref 数据' : '从 Crossref 补充信息' }}
    </button>
    <span v-else>补充来源记录中的 DOI 后可联网查询。</span>
    <p v-if="error" role="status" class="error-text">{{ error }}</p>
  </details>
</template>
