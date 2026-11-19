<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ kind: 'sidebar' | 'papers' | 'assistant' }>();
const panels = {
  sidebar: ['navigation-panel', '分类栏'],
  papers: ['paper-panel', '文献列表'],
  assistant: ['assistant-panel', '助手栏'],
} as const;
const panel = computed(() => panels[props.kind]);
</script>

<template>
  <div
    class="panel-resizer"
    :class="{ 'panel-resizer-left': props.kind === 'assistant' }"
    :data-resize-panel="props.kind"
    role="separator"
    aria-orientation="vertical"
    :aria-label="`调整${panel[1]}宽度`"
    :aria-controls="panel[0]"
    tabindex="0"
    :title="`拖动调整${panel[1]}宽度；双击恢复默认；方向键微调`"
  />
</template>
