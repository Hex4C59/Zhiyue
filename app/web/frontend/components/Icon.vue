<script setup lang="ts">
import { paths } from '../lib/content';
defineProps<{ name?: string }>();
</script>

<template>
  <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="paths[name ?? 'book'] || paths.book" /></svg>
</template>
