import type { PDFSession, TextLayerData, TextWord } from './types';

interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Caret {
  node: Text;
  offset: number;
}

const lineBounds = new WeakMap<TextLayerData, Bounds[]>();

function measureLines(data: TextLayerData): Bounds[] {
  const previous = lineBounds.get(data);
  if (previous) return previous;
  const bounds = data.lines.map(({ words }) => {
    const box = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    for (const { x, y, width, height } of words) {
      box.left = Math.min(box.left, x);
      box.top = Math.min(box.top, y);
      box.right = Math.max(box.right, x + width);
      box.bottom = Math.max(box.bottom, y + height);
    }
    return box;
  });
  lineBounds.set(data, bounds);
  return bounds;
}

const gap = (value: number, start: number, end: number): number => Math.max(0, start - value, value - end);

function locateCaret(
  document: Document, layers: PDFSession['textLayers'], x: number, y: number, starting: boolean,
): Caret | null {
  let page: { data: TextLayerData; layer: HTMLElement; bounds: DOMRect } | undefined;
  let distance = Infinity;
  for (const { data, element } of layers.values()) {
    if (!element) continue;
    const bounds = element.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) continue;
    const proximity = Math.hypot(gap(x, bounds.left, bounds.right), gap(y, bounds.top, bounds.bottom));
    if (proximity < distance) {
      page = { data, layer: element, bounds };
      distance = proximity;
    }
  }
  if (!page || (starting && distance > 0)) return null;
  const { data, layer, bounds } = page;
  // PDF 坐标用于找行和词，拖选容差使用屏幕像素，避免缩放后手感变化。
  const scaleX = bounds.width / data.width;
  const scaleY = bounds.height / data.height;
  const px = (x - bounds.left) / scaleX;
  const py = (y - bounds.top) / scaleY;
  let lineIndex = -1;
  let best = Infinity;
  for (const [index, box] of measureLines(data).entries()) {
    const first = data.lines[index]?.words[0];
    if (!first) continue;
    const dx = gap(px, box.left, box.right) * scaleX;
    const dy = gap(py, box.top, box.bottom) * scaleY;
    const vertical = first.rotation === 90 || first.rotation === 270;
    // 拖到一行末尾右边的空白时，优先留在同一行。
    const cross = vertical ? dx : dy;
    const along = vertical ? dy : dx;
    const score = starting ? Math.hypot(dx, dy) : cross + Math.min(4, along / 12);
    if (score < best) {
      lineIndex = index;
      best = score;
    }
  }
  if (lineIndex < 0) return null;
  let word: TextWord | undefined;
  let wordIndex = -1;
  best = Infinity;
  for (const [index, candidate] of (data.lines[lineIndex]?.words ?? []).entries()) {
    const dx = gap(px, candidate.x, candidate.x + candidate.width) * scaleX;
    const dy = gap(py, candidate.y, candidate.y + candidate.height) * scaleY;
    const score = Math.hypot(dx, dy);
    if (score < best) {
      word = candidate;
      wordIndex = index;
      best = score;
    }
  }
  if (!word || (starting && best > 12)) return null;
  const span = layer.children[lineIndex]?.children[wordIndex];
  const node = span?.firstChild as Text | undefined;
  if (!span || !node) return null;
  const length = word.text.length;
  const vertical = word.rotation === 90 || word.rotation === 270;
  const reversed = word.rotation === 180 || word.rotation === 270;
  const fraction = vertical ? (py - word.y) / word.height : (px - word.x) / word.width;
  if (best === 0) {
    const native = document.caretRangeFromPoint?.(x, y);
    if (native?.startContainer === node) return { node, offset: Math.min(native.startOffset, length) };
  }
  const rtl = document.defaultView?.getComputedStyle(span).direction === 'rtl';
  const position = Math.min(1, Math.max(0, fraction));
  return { node, offset: Math.round((reversed !== rtl ? 1 - position : position) * length) };
}

/** 用 PDF 的词框设置浏览器选区，保留原生高亮及复制格式。 */
export function bindPDFSelection(root: HTMLElement, layers: PDFSession['textLayers']): () => void {
  const document = root.ownerDocument;
  const view = document.defaultView as Window & typeof globalThis;
  const controller = new view.AbortController();
  const options = { signal: controller.signal, capture: true };
  let drag: { anchor: Caret; x: number; y: number; startX: number; startY: number } | undefined;
  let frame = 0;
  const stop = (): void => {
    drag = undefined;
    if (frame) view.cancelAnimationFrame(frame);
    frame = 0;
  };
  const update = (): void => {
    if (!drag || Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 2) return;
    if (!root.contains(drag.anchor.node)) return stop();
    const viewport = root.getBoundingClientRect();
    const x = Math.max(viewport.left, Math.min(viewport.right, drag.x));
    const y = Math.max(viewport.top, Math.min(viewport.bottom, drag.y));
    const focus = locateCaret(document, layers, x, y, false);
    if (focus) document.getSelection()?.setBaseAndExtent(drag.anchor.node, drag.anchor.offset, focus.node, focus.offset);
  };
  const scrollAtEdge = (): void => {
    frame = 0;
    if (!drag) return;
    const box = root.getBoundingClientRect();
    const step = (value: number, start: number, end: number): number => {
      if (value < start + 18) return Math.max(-24, value - start - 18);
      if (value > end - 18) return Math.min(24, value - end + 18);
      return 0;
    };
    const left = root.scrollLeft;
    const top = root.scrollTop;
    root.scrollLeft += step(drag.x, box.left, box.right);
    root.scrollTop += step(drag.y, box.top, box.bottom);
    if (root.scrollLeft !== left || root.scrollTop !== top) {
      update();
      frame = view.requestAnimationFrame(scrollAtEdge);
    }
  };

  root.addEventListener('mousedown', (event) => {
    if (event.button !== 0 || event.detail > 1 || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!(event.target as HTMLElement | null)?.closest('.pdf-page-sheet[data-loaded]') ||
      (event.target as HTMLElement).closest('button')) return;
    stop();
    const { clientX: x, clientY: y } = event;
    const anchor = locateCaret(document, layers, x, y, true);
    event.preventDefault();
    root.focus({ preventScroll: true });
    if (!anchor) {
      document.getSelection()?.removeAllRanges();
      return;
    }
    document.getSelection()?.collapse(anchor.node, anchor.offset);
    drag = { anchor, x, y, startX: x, startY: y };
  }, options);
  document.addEventListener('mousemove', (event) => {
    if (!drag) return;
    if (!(event.buttons & 1)) return stop();
    drag.x = event.clientX;
    drag.y = event.clientY;
    update();
    if (!frame) frame = view.requestAnimationFrame(scrollAtEdge);
  }, options);
  document.addEventListener('mouseup', (event) => {
    if (!drag || event.button !== 0) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    update();
    stop();
  }, options);
  view.addEventListener('blur', stop, options);
  return () => {
    stop();
    controller.abort();
  };
}
