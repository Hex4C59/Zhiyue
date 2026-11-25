<script setup lang="ts">
import { computed } from 'vue';
import type { JobRecord } from '../lib/types';

const props = defineProps<{ result: NonNullable<JobRecord['moveResult']> }>();
const labels = { moved: '已移动', unchanged: '已在目标', blocked: '未移动', failed: '失败' };
const counts = computed(() => {
  const byStatus = { moved: 0, unchanged: 0, blocked: 0, failed: 0 };
  for (const { status } of props.result.items) byStatus[status]++;
  return Object.entries(byStatus).map(([status, count]) => `${labels[status as keyof typeof labels]} ${count}`).join(' · ');
});
</script>

<template>
  <p class="job-counts">{{ counts }}</p>
  <details class="paper-move-details">
    <summary>查看移动明细</summary>
    <ul>
      <li v-for="item in result.items" :key="item.paperId">
        <strong>{{ item.paperId }}</strong> · {{ labels[item.status] }} · {{ item.category }}
        <span v-if="item.error" class="error-text">{{ item.error }}</span>
        <span v-if="item.otherLocations?.length" class="muted">其他目录中的版本保留在原位。</span>
      </li>
    </ul>
  </details>
</template>
