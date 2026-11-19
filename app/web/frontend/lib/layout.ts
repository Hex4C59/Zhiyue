type PanelKey = 'sidebar' | 'papers' | 'assistant';

interface DragState {
  handle: HTMLElement;
  key: PanelKey;
  pointerId: number;
  x: number;
  width: number;
  startWidths: Record<PanelKey, number>;
  previous: Partial<Record<PanelKey, number>>;
  bounds: [number, number];
  shield: HTMLElement;
}

const PANEL_KEYS: PanelKey[] = ['sidebar', 'papers', 'assistant'];

export interface PanelLayoutOptions {
  /** 从文献库读回的栏宽；缺省时按窗口宽度取默认值。 */
  widths?: Partial<Record<PanelKey, number>>;
  /** 用户调整栏宽时回调，由调用方决定持久化方式。 */
  onSave?: (widths: Record<PanelKey, number>) => void;
}

export interface PanelLayout {
  /** 写入外部读回的栏宽并重算布局；界面状态可能晚于挂载到达。 */
  setWidths(widths: Partial<Record<PanelKey, number>>): void;
  dispose(): void;
}

export function initializePanelResizing(document: Document, options: PanelLayoutOptions = {}): PanelLayout {
  const window = document.defaultView as Window;
  // 用所属 window 的 AbortController：jsdom 会拒绝来自其他 realm 的 signal。
  const lifecycle = new (window as unknown as { AbortController: typeof AbortController }).AbortController();
  const listen = (target: EventTarget, name: string, handler: (event: Event) => void): void => {
    target.addEventListener(name, handler, { signal: lifecycle.signal });
  };
  const $ = (selector: string): HTMLElement | null => document.querySelector<HTMLElement>(selector);
  const $$ = (selector: string): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(selector)];
  const shell = $('.shell') as HTMLElement;
  const root = document.documentElement;
  const handles = $$('[data-resize-panel]');
  const limits: Record<PanelKey, [number, number]> = {
    sidebar: [140, 360], papers: [200, 600], assistant: [260, 900],
  };
  const properties: Record<PanelKey, string> = {
    sidebar: '--sidebar-width',
    papers: '--paper-list-width',
    assistant: '--assistant-width',
  };
  let preferred: Partial<Record<PanelKey, number>> = {};
  let widths = {} as Record<PanelKey, number>;
  let drag: DragState | null = null;
  function setWidths(next: Partial<Record<PanelKey, number>>): void {
    for (const key of PANEL_KEYS) {
      const value = next[key];
      if (typeof value === 'number' && Number.isFinite(value)) preferred[key] = value;
    }
    apply();
  }
  // 初始栏宽只填 preferred，真正套用留给文件末尾的 apply()，避免在 clamp/defaults 初始化前调用。
  for (const key of PANEL_KEYS) {
    const value = options.widths?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) preferred[key] = value;
  }
  const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
  const defaults = (): Record<PanelKey, number> =>
    window.innerWidth >= 1700
      ? { sidebar: 208, papers: 320, assistant: 380 }
      : window.innerWidth <= 1250
        ? { sidebar: 176, papers: 250, assistant: 310 }
        : { sidebar: 196, papers: 300, assistant: 350 };
  const isWide = (): boolean => window.innerWidth > 1050;
  function bounds(key: PanelKey): [number, number] {
    const others = (Object.entries(widths) as Array<[PanelKey, number]>)
      .filter(([name]) => name !== key)
      .reduce((sum, [, value]) => sum + value, 0);
    return [
      limits[key][0],
      Math.max(limits[key][0], Math.min(limits[key][1], shell.clientWidth - 240 - others)),
    ];
  }
  function apply(): void {
    const base = defaults();
    widths = Object.fromEntries(
      PANEL_KEYS.map((key) => [key, clamp(preferred[key] ?? base[key], limits[key][0], limits[key][1])]),
    ) as Record<PanelKey, number>;
    // 切换到小屏时至少保留 240px 阅读宽度；保留偏好值，回到大屏再恢复。
    const budget = shell.clientWidth - 240;
    const minimum = PANEL_KEYS.reduce((sum, key) => sum + limits[key][0], 0);
    const requested = PANEL_KEYS.reduce((sum, key) => sum + widths[key], 0);
    if (isWide() && requested > budget) {
      const ratio = clamp((budget - minimum) / (requested - minimum || 1), 0, 1);
      for (const key of PANEL_KEYS) {
        widths[key] = limits[key][0] + Math.floor((widths[key] - limits[key][0]) * ratio);
      }
    }
    for (const [key, value] of Object.entries(widths) as Array<[PanelKey, number]>) {
      root.style.setProperty(properties[key], `${value}px`);
    }
    for (const handle of handles) {
      const key = handle.dataset.resizePanel as PanelKey;
      const [min, max] = bounds(key);
      handle.setAttribute('aria-valuemin', String(min));
      handle.setAttribute('aria-valuemax', String(Math.round(max)));
      handle.setAttribute('aria-valuenow', String(Math.round(widths[key])));
      handle.setAttribute('aria-valuetext', `${Math.round(widths[key])} 像素`);
    }
  }
  function save(): void {
    options.onSave?.({ ...widths });
  }
  function finish(cancel = false): void {
    if (!drag) return;
    const previous = drag;
    drag = null;
    if (cancel) preferred = previous.previous;
    previous.shield.remove();
    previous.handle.removeAttribute('data-dragging');
    document.body.classList.remove('resizing-panels');
    if (previous.handle.hasPointerCapture(previous.pointerId)) {
      previous.handle.releasePointerCapture(previous.pointerId);
    }
    apply();
    if (!cancel) save();
  }
  for (const handle of handles) {
    const key = handle.dataset.resizePanel as PanelKey;
    listen(handle, 'pointerdown', (event) => {
      const pointer = event as PointerEvent;
      if (pointer.button !== 0 || !isWide() || drag) return;
      pointer.preventDefault();
      handle.focus({ preventScroll: true });
      const shield = document.createElement('div');
      shield.className = 'layout-resize-shield';
      shield.setAttribute('aria-hidden', 'true');
      document.body.append(shield);
      drag = {
        handle,
        key,
        pointerId: pointer.pointerId,
        x: pointer.clientX,
        width: widths[key],
        startWidths: { ...widths },
        previous: { ...preferred },
        bounds: bounds(key),
        shield,
      };
      handle.setAttribute('data-dragging', '');
      document.body.classList.add('resizing-panels');
      handle.setPointerCapture(pointer.pointerId);
    });
    listen(handle, 'lostpointercapture', () => finish());
    listen(handle, 'dblclick', () => {
      if (!isWide()) return;
      finish();
      delete preferred[key];
      apply();
      save();
    });
    listen(handle, 'keydown', (event) => {
      const keyEvent = event as KeyboardEvent;
      if (!isWide() || drag || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(keyEvent.key)) return;
      keyEvent.preventDefault();
      const [min, max] = bounds(key);
      const step = keyEvent.shiftKey ? 48 : 16;
      const value = keyEvent.key === 'Home'
        ? min
        : keyEvent.key === 'End'
          ? max
          : widths[key] + (keyEvent.key === 'ArrowRight' ? step : -step);
      preferred = { ...widths, [key]: clamp(value, min, max) };
      apply();
      save();
    });
  }
  listen(document, 'pointermove', (event) => {
    const pointer = event as PointerEvent;
    if (!drag || pointer.pointerId !== drag.pointerId) return;
    const delta = (pointer.clientX - drag.x) * (drag.key === 'assistant' ? -1 : 1);
    preferred = { ...drag.startWidths, [drag.key]: clamp(drag.width + delta, drag.bounds[0], drag.bounds[1]) };
    apply();
  });
  listen(document, 'pointerup', (event) => {
    if ((event as PointerEvent).pointerId === drag?.pointerId) finish();
  });
  listen(document, 'pointercancel', (event) => {
    if ((event as PointerEvent).pointerId === drag?.pointerId) finish(true);
  });
  listen(document, 'keydown', (event) => {
    if ((event as KeyboardEvent).key === 'Escape' && drag) {
      event.preventDefault();
      finish(true);
    }
  });
  listen(window, 'blur', () => finish());
  listen(window, 'resize', () => {
    finish();
    apply();
  });
  listen(window, 'pagehide', () => finish());
  apply();
  return {
    setWidths,
    dispose: () => {
      finish();
      lifecycle.abort();
    },
  };
}
