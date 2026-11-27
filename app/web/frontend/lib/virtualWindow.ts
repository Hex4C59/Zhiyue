export interface VirtualAnchor {
  key: string;
  /** 相对于首个可见行顶端的 CSS 像素；列表顶部留白可使其为负。 */
  offset: number;
}

/** 行高包含行间留白。尺寸按稳定键保存，前缀偏移只在顺序或测量值改变时重建。 */
export class VirtualWindow {
  private keys: readonly string[] = [];
  private positions = new Map<string, number>();
  private heights = new Map<string, number>();
  private offsets: number[] = [0];

  constructor(private readonly estimate: number) {}

  get length(): number { return this.keys.length; }
  get total(): number { return this.offsets[this.keys.length] ?? 0; }
  key(index: number): string | undefined { return this.keys[index]; }
  index(key: string): number | undefined { return this.positions.get(key); }
  offset(index: number): number { return this.offsets[index] ?? this.total; }
  height(index: number): number { return this.offset(index + 1) - this.offset(index); }

  setKeys(keys: readonly string[]): boolean {
    if (keys.length === this.keys.length && keys.every((key, index) => key === this.keys[index])) return false;
    this.keys = [...keys];
    this.positions = new Map(keys.map((key, index) => [key, index]));
    for (const key of this.heights.keys()) {
      if (!this.positions.has(key)) this.heights.delete(key);
    }
    this.rebuild();
    return true;
  }

  clearMeasurements(): void {
    this.heights.clear();
    this.rebuild();
  }

  measure(heights: ReadonlyMap<string, number>): boolean {
    let changed = false;
    for (const [key, height] of heights) {
      if (!this.positions.has(key) || !Number.isFinite(height) || height <= 0) continue;
      // 忽略布局的小数抖动，避免 ResizeObserver 与滚动锚点之间反复修正。
      if (Math.abs((this.heights.get(key) ?? this.estimate) - height) < 0.5) continue;
      this.heights.set(key, height);
      changed = true;
    }
    if (changed) this.rebuild();
    return changed;
  }

  indexAt(offset: number): number {
    if (!this.keys.length) return -1;
    let low = 0;
    let high = this.keys.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (this.offset(middle + 1) <= offset) low = middle + 1;
      else high = middle;
    }
    return Math.min(low, this.keys.length - 1);
  }

  range(top: number, height: number, focusedKey: string | null = null, overscan = 6): number[] {
    if (!this.keys.length) return [];
    const start = Math.max(0, this.indexAt(top) - overscan);
    const bottom = top + Math.max(0, height);
    const last = this.indexAt(bottom);
    const boundary = height > 0 && this.offset(last) === bottom;
    const end = Math.min(this.keys.length, last + overscan + (boundary ? 0 : 1));
    const result = Array.from({ length: end - start }, (_, index) => start + index);
    const focused = focusedKey === null ? undefined : this.positions.get(focusedKey);
    if (focused !== undefined && (focused < start || focused >= end)) result.push(focused);
    return result.sort((a, b) => a - b);
  }

  anchor(top: number): VirtualAnchor | null {
    const index = this.indexAt(top);
    const key = this.keys[index];
    return key === undefined ? null : { key, offset: top - this.offset(index) };
  }

  restore(anchor: VirtualAnchor | null, fallback = 0): number {
    const index = anchor ? this.positions.get(anchor.key) : undefined;
    if (index === undefined || !anchor) return fallback;
    return this.offset(index) + Math.min(anchor.offset, Math.max(0, this.height(index) - 1));
  }

  scrollTo(index: number, top: number, height: number, align: 'start' | 'end' | 'nearest' = 'nearest'): number {
    if (index < 0 || index >= this.keys.length) return top;
    const start = this.offset(index);
    const end = this.offset(index + 1);
    if (align === 'start' || end - start > height) return start;
    if (align === 'end') return Math.max(0, end - height);
    if (start < top) return start;
    if (end > top + height) return Math.max(0, end - height);
    return top;
  }

  private rebuild(): void {
    const offsets = [0];
    for (const key of this.keys) offsets.push(offsets[offsets.length - 1]! + (this.heights.get(key) ?? this.estimate));
    this.offsets = offsets;
  }
}
