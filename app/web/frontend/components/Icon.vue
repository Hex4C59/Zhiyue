<script setup>
import { paths } from '../lib/content.js';
defineProps({ name: { type: String, default: 'book' } });
</script>

<template>
  <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="paths[name] || paths.book" /></svg>
</template>
