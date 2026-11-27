<script setup lang="ts" generic="T">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { VirtualWindow } from '../lib/virtualWindow';

const props = withDefaults(defineProps<{
  items: readonly T[];
  itemKey: (item: T) => string;
  estimate: number;
  gap?: number;
  resetKey?: string;
}>(), { gap: 0, resetKey: '' });

const viewport = ref<HTMLElement>();
const revision = ref(0);
const top = ref(0);
const height = ref(480);
const focusedKey = ref<string | null>(null);
const model = new VirtualWindow(props.estimate);
const rows = new Map<string, HTMLElement>();
let observer: ResizeObserver | undefined;
let frame: number | null = null;
let mounted = false;
let disposed = false;
let width = 0;
let inset = 0;
let resetVersion = 0;
let scrollTarget: { key: string; align: 'start' | 'end' | 'nearest' } | null = null;
const keys = computed(() => props.items.map(props.itemKey));
const visible = computed(() => {
  revision.value;
  return model.range(top.value, height.value, focusedKey.value).map((index) => ({
    index, key: model.key(index)!, item: props.items[index]!, offset: model.offset(index),
  }));
});
const total = computed(() => { revision.value; return model.total; });

function updateViewport(): void {
  if (!viewport.value) return;
  top.value = viewport.value.scrollTop - inset;
  height.value = viewport.value.clientHeight || 480;
}

function scheduleMeasurement(): void {
  if (!mounted || disposed || frame !== null) return;
  frame = requestAnimationFrame(measure);
}

function measure(): void {
  frame = null;
  const element = viewport.value;
  if (disposed || !element) return;
  const anchor = model.anchor(element.scrollTop - inset);
  const started = resetVersion;
  const nextWidth = element.clientWidth;
  const resized = nextWidth > 0 && width > 0 && Math.abs(nextWidth - width) >= 0.5;
  if (nextWidth > 0) width = nextWidth;
  inset = Number.parseFloat(getComputedStyle(element).paddingTop) || 0;
  if (resized) model.clearMeasurements();
  const sizes = new Map<string, number>();
  for (const [key, row] of rows) sizes.set(key, row.getBoundingClientRect().height);
  const changed = model.measure(sizes) || resized;
  updateViewport();
  if (changed) revision.value++;
  // 占位高度先提交到 DOM，再恢复锚点，避免浏览器按旧高度截断 scrollTop。
  void nextTick(() => {
    if (disposed || !viewport.value) return;
    if (changed) {
      viewport.value.scrollTop = started === resetVersion ? Math.max(0, model.restore(anchor, top.value) + inset) : 0;
    }
    updateViewport();
    if (scrollTarget) {
      const index = model.index(scrollTarget.key);
      if (index !== undefined) scrollToIndex(index, scrollTarget.align);
      if (!changed) scrollTarget = null;
    }
    if (changed) scheduleMeasurement();
  });
}

function setRow(key: string, element: Element | ComponentPublicInstance | null): void {
  const previous = rows.get(key);
  if (element === previous) return;
  if (previous) observer?.unobserve(previous);
  if (element instanceof HTMLElement) {
    rows.set(key, element);
    observer?.observe(element);
    scheduleMeasurement();
  } else rows.delete(key);
}

function scrollToIndex(index: number, align: 'start' | 'end' | 'nearest' = 'nearest'): void {
  const element = viewport.value;
  if (!element) return;
  const next = model.scrollTo(index, element.scrollTop - inset, element.clientHeight || height.value, align);
  element.scrollTop = Math.max(0, next + inset);
  updateViewport();
  scheduleMeasurement();
}

async function focusIndex(index: number): Promise<void> {
  const key = model.key(index);
  if (key === undefined) return;
  focusedKey.value = key;
  scrollTarget = { key, align: 'nearest' };
  scrollToIndex(index);
  await nextTick();
  if (disposed) return;
  const row = rows.get(key);
  const target = row?.querySelector<HTMLElement>('[data-virtual-focus]:not(:disabled)') ?? row;
  target?.focus({ preventScroll: true });
}

function rowOf(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement) || target.closest('.virtual-list') !== viewport.value) return null;
  return target.closest<HTMLElement>('[data-virtual-key]');
}

function focusIn(event: FocusEvent): void {
  const row = rowOf(event.target);
  focusedKey.value = row?.dataset.virtualKey ?? null;
}

function focusOut(event: FocusEvent): void {
  if (event.relatedTarget instanceof Node && viewport.value?.contains(event.relatedTarget)) return;
  void nextTick(() => {
    if (!viewport.value?.contains(document.activeElement)) focusedKey.value = null;
  });
}

function keydown(event: KeyboardEvent): void {
  const target = event.target;
  if (!(target instanceof HTMLElement) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const row = rowOf(target);
  if (target !== viewport.value && target !== row && !target.hasAttribute('data-virtual-focus')) return;
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !model.length) return;
  event.preventDefault();
  event.stopPropagation();
  const current = row ? model.index(row.dataset.virtualKey ?? '') : undefined;
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? model.length - 1
    : current === undefined ? event.key === 'ArrowUp' ? model.length - 1 : 0
      : Math.max(0, Math.min(model.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)));
  void focusIndex(index);
}

function scroll(): void {
  updateViewport();
  scheduleMeasurement();
}

watch(keys, (next) => {
  const anchor = model.anchor(top.value);
  const started = resetVersion;
  if (!model.setKeys(next)) return;
  if (focusedKey.value !== null && model.index(focusedKey.value) === undefined) focusedKey.value = null;
  revision.value++;
  void nextTick(() => {
    if (disposed || !viewport.value) return;
    viewport.value.scrollTop = started === resetVersion ? Math.max(0, model.restore(anchor, top.value) + inset) : 0;
    updateViewport();
    scheduleMeasurement();
  });
}, { immediate: true });

watch(() => props.resetKey, () => {
  resetVersion++;
  scrollTarget = null;
  focusedKey.value = null;
  if (viewport.value) viewport.value.scrollTop = 0;
  updateViewport();
  scheduleMeasurement();
});

onMounted(() => {
  mounted = true;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(scheduleMeasurement);
    if (viewport.value) observer.observe(viewport.value);
    for (const row of rows.values()) observer.observe(row);
  }
  inset = Number.parseFloat(getComputedStyle(viewport.value!).paddingTop) || 0;
  updateViewport();
  scheduleMeasurement();
});
onBeforeUnmount(() => {
  disposed = true;
  observer?.disconnect();
  if (frame !== null) cancelAnimationFrame(frame);
  rows.clear();
});

defineExpose({ scrollToIndex, focusIndex });
</script>

<template>
  <div ref="viewport" class="virtual-list" role="list" tabindex="0"
    @scroll.passive="scroll" @focusin="focusIn" @focusout="focusOut" @keydown="keydown"
    @wheel.passive="scrollTarget = null" @touchstart.passive="scrollTarget = null">
    <div v-if="items.length" class="virtual-spacer" role="presentation" :style="{ height: `${total}px` }">
      <div v-for="row in visible" :key="row.key" :ref="element => setRow(row.key, element)"
        class="virtual-row" role="listitem" tabindex="-1" :data-virtual-key="row.key"
        :aria-posinset="row.index + 1" :aria-setsize="items.length"
        :style="{ transform: `translateY(${row.offset}px)`, paddingBottom: `${gap}px` }">
        <slot :item="row.item" :index="row.index" />
      </div>
    </div>
    <slot v-else name="empty" />
  </div>
</template>
