export function initializePanelResizing(document) {
  const window = document.defaultView;
  const lifecycle = new window.AbortController();
  const listen = (target, name, handler) =>
    target.addEventListener(name, handler, { signal: lifecycle.signal });
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const shell = $('.shell'),
    root = document.documentElement,
    handles = $$('[data-resize-panel]');
  const storageKey = 'zhiyue.panel-widths.v1';
  const limits = { sidebar: [140, 360], papers: [200, 600], assistant: [260, 900] };
  const properties = {
    sidebar: '--sidebar-width',
    papers: '--paper-list-width',
    assistant: '--assistant-width',
  };
  let preferred = {},
    widths = {},
    drag = null;
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey));
    for (const key of Object.keys(limits))
      if (typeof stored?.[key] === 'number' && Number.isFinite(stored[key])) preferred[key] = stored[key];
  } catch {}
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const defaults = () =>
    window.innerWidth >= 1700
      ? { sidebar: 208, papers: 320, assistant: 380 }
      : window.innerWidth <= 1250
        ? { sidebar: 176, papers: 250, assistant: 310 }
        : { sidebar: 196, papers: 300, assistant: 350 };
  const isWide = () => window.innerWidth > 1050;
  function bounds(key) {
    const others = Object.entries(widths)
      .filter(([name]) => name !== key)
      .reduce((sum, [, value]) => sum + value, 0);
    return [
      limits[key][0],
      Math.max(limits[key][0], Math.min(limits[key][1], shell.clientWidth - 240 - others)),
    ];
  }
  function apply() {
    const base = defaults();
    widths = Object.fromEntries(
      Object.keys(limits).map((key) => [key, clamp(preferred[key] ?? base[key], ...limits[key])]),
    );
    // 切换到小屏时至少保留 240px 阅读宽度；保留偏好值，回到大屏再恢复。
    const budget = shell.clientWidth - 240;
    const minimum = Object.values(limits).reduce((sum, [min]) => sum + min, 0);
    const requested = Object.values(widths).reduce((sum, value) => sum + value, 0);
    if (isWide() && requested > budget) {
      const ratio = clamp((budget - minimum) / (requested - minimum || 1), 0, 1);
      for (const key of Object.keys(widths))
        widths[key] = limits[key][0] + Math.floor((widths[key] - limits[key][0]) * ratio);
    }
    for (const [key, value] of Object.entries(widths)) root.style.setProperty(properties[key], `${value}px`);
    for (const handle of handles) {
      const key = handle.dataset.resizePanel,
        [min, max] = bounds(key);
      handle.setAttribute('aria-valuemin', String(min));
      handle.setAttribute('aria-valuemax', String(Math.round(max)));
      handle.setAttribute('aria-valuenow', String(Math.round(widths[key])));
      handle.setAttribute('aria-valuetext', `${Math.round(widths[key])} 像素`);
    }
  }
  function save() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(preferred));
    } catch {}
  }
  function finish(cancel = false) {
    if (!drag) return;
    const previous = drag;
    drag = null;
    if (cancel) preferred = previous.previous;
    previous.shield.remove();
    previous.handle.removeAttribute('data-dragging');
    document.body.classList.remove('resizing-panels');
    if (previous.handle.hasPointerCapture(previous.pointerId))
      previous.handle.releasePointerCapture(previous.pointerId);
    apply();
    if (!cancel) save();
  }
  for (const handle of handles) {
    const key = handle.dataset.resizePanel;
    listen(handle, 'pointerdown', (event) => {
      if (event.button !== 0 || !isWide() || drag) return;
      event.preventDefault();
      handle.focus({ preventScroll: true });
      const shield = document.createElement('div');
      shield.className = 'layout-resize-shield';
      shield.setAttribute('aria-hidden', 'true');
      document.body.append(shield);
      drag = {
        handle,
        key,
        pointerId: event.pointerId,
        x: event.clientX,
        width: widths[key],
        startWidths: { ...widths },
        previous: { ...preferred },
        bounds: bounds(key),
        shield,
      };
      handle.setAttribute('data-dragging', '');
      document.body.classList.add('resizing-panels');
      handle.setPointerCapture(event.pointerId);
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
      if (!isWide() || drag || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const [min, max] = bounds(key),
        step = event.shiftKey ? 48 : 16;
      const value =
        event.key === 'Home'
          ? min
          : event.key === 'End'
            ? max
            : widths[key] + (event.key === 'ArrowRight' ? step : -step);
      preferred = { ...widths, [key]: clamp(value, min, max) };
      apply();
      save();
    });
  }
  listen(document, 'pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const delta = (event.clientX - drag.x) * (drag.key === 'assistant' ? -1 : 1);
    preferred = { ...drag.startWidths, [drag.key]: clamp(drag.width + delta, ...drag.bounds) };
    apply();
  });
  listen(document, 'pointerup', (event) => {
    if (event.pointerId === drag?.pointerId) finish();
  });
  listen(document, 'pointercancel', (event) => {
    if (event.pointerId === drag?.pointerId) finish(true);
  });
  listen(document, 'keydown', (event) => {
    if (event.key === 'Escape' && drag) {
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
  return () => {
    finish();
    lifecycle.abort();
  };
}
