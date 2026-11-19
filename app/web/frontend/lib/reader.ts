import { markRaw } from 'vue';
import { authorText, endpoint, esc, fileURL, icon, markdown, readKey, readLabels, titleOf } from './content';
import type { Paper, PDFPageData, PDFSession, TextLayerData, WorkspaceState } from './types';
import type { ApiFn } from './workspace';

export interface ReaderOptions {
  state: WorkspaceState;
  api: ApiFn;
  toast: (message: string, error?: boolean) => void;
  patchPaper: (id: string, update: Record<string, unknown>) => Promise<boolean>;
  deleteNote: (relativePath: string) => Promise<boolean>;
  setPanel: (panel: 'list' | 'reader' | 'chat') => void;
  setDraft: (text: string) => void;
  scope: HTMLElement;
}

export interface ReaderController {
  render: () => void;
  dispose: () => void;
}

export function createReader({
  state, api, toast, patchPaper, deleteNote, setPanel, setDraft, scope,
}: ReaderOptions): ReaderController {
  const $ = (selector: string): HTMLElement => scope.querySelector(selector) as HTMLElement;
  const $$ = (selector: string): HTMLElement[] => [...scope.querySelectorAll<HTMLElement>(selector)];
  const currentPaper = (): Paper | undefined =>
    state.papers.find((paper) => paper.literature_id === state.current);
  const view = scope.ownerDocument.defaultView as Window;
  // 使用文档所在窗口的 AbortController，事件监听才能接受同一 realm 的 signal。
  const lifecycle = new (view as unknown as { AbortController: typeof AbortController }).AbortController();
  function releasePreview(): void {
    const session = state.pdfSession;
    if (session) {
      session.disposed = true;
      session.observer?.disconnect();
      session.resizeObserver?.disconnect();
      session.root.removeEventListener('scroll', session.onScroll as EventListener);
      document.removeEventListener('copy', session.onCopy as EventListener);
      for (const name of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
        session.root.removeEventListener(name, session.onUserScroll as EventListener);
      }
      session.root.removeEventListener('wheel', session.onZoomWheel as EventListener);
      if (session.frame) cancelAnimationFrame(session.frame);
      for (const controller of session.controllers.values()) controller.abort();
      for (const url of session.urls.values()) URL.revokeObjectURL(url);
      session.queue = [];
    }
    state.pdfSession = null;
    state.previewLoading = false;
  }
  function renderPDFControls(): void {
    const controls = $('#pdf-controls');
    if (!controls) return;
    const textInfo = state.pdfSession?.textLayers.get(state.pdfPage)?.data;
    const textStatus = !textInfo
      ? '正在加载文字层…'
      : textInfo.error
        ? '文字层不可用'
        : textInfo.hasText
          ? '可选中文字并按 Ctrl+C'
          : '本页无文字层';
    controls.innerHTML = `<button class="icon-button" data-pdf-step="-1" aria-label="上一页" title="上一页" ${state.pdfPage <= 1 || state.previewLoading ? 'disabled' : ''}>‹</button><label class="pdf-page-label">PDF 物理页 <input id="pdf-page" type="number" min="1" ${state.pdfTotal ? `max="${state.pdfTotal}"` : ''} value="${state.pdfPage}" aria-label="PDF物理页序"></label><span class="pdf-total">/ ${state.pdfTotal || '…'}</span><button class="icon-button" data-pdf-step="1" aria-label="下一页" title="下一页" ${!state.pdfTotal || state.pdfPage >= state.pdfTotal || state.previewLoading ? 'disabled' : ''}>›</button><span class="pdf-control-divider"></span><button class="icon-button" data-pdf-zoom="-50" aria-label="缩小" title="缩小" ${state.pdfZoom <= 100 ? 'disabled' : ''}>−</button><button class="text-button pdf-zoom" id="pdf-fit" title="适合宽度">${state.pdfZoom === 100 ? '适宽 100%' : state.pdfZoom + '%'}</button><button class="icon-button" data-pdf-zoom="50" aria-label="放大" title="放大" ${state.pdfZoom >= 200 ? 'disabled' : ''}>＋</button><button class="button subtle pdf-copy-page" id="copy-pdf-page" ${!textInfo?.hasText ? 'disabled' : ''}>复制本页文字</button><span class="pdf-text-status" title="${esc(textInfo?.error || (!textInfo?.hasText ? '扫描页或无文字内容的页面需要 OCR 才能复制。' : ''))}">${esc(textStatus)}</span>`;
  }

  /**
   * 删除当前笔记。服务端只移到 `.zhiyue/trash/notes/`，所以确认文案说明可以手动找回；
   * 删除后重新渲染工具栏与正文，笔记选择框自动落到剩下的第一项。
   */
  async function confirmDeleteNote(): Promise<void> {
    const paper = currentPaper();
    const notes = Array.isArray(paper?.notes) ? paper.notes : [];
    const target = notes.find((note) => note.path === state.notePath) ?? notes[0];
    if (!paper || !target) return;
    const label = target.title || target.path.split(/[\\/]/).pop() || target.path;
    const confirmed = view.confirm(`删除笔记“${label}”？\n\n文件会移到文献库的 .zhiyue/trash/notes/，需要时可以手动找回。`);
    if (!confirmed) return;
    if (await deleteNote(target.path)) renderReader();
  }

  async function copyPDFPageText(): Promise<void> {
    const text = state.pdfSession?.textLayers.get(state.pdfPage)?.data.text;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast('本页文字已复制');
    } catch {
      toast('无法访问剪贴板，请在页面选中文字后按 Ctrl+C。', true);
    }
  }
  function goPDFPage(value: unknown): void {
    const page = Number(value);
    if (!Number.isInteger(page) || page < 1 || (state.pdfTotal && page > state.pdfTotal)) {
      toast('请输入有效的 PDF 物理页序。');
      renderPDFControls();
      return;
    }
    const session = state.pdfSession;
    const sheet = session?.pages.get(page);
    if (session && sheet) {
      state.pdfPage = page;
      session.root.scrollTop = Math.max(0, sheet.offsetTop - 24);
      session.manualPage = { page, scrollTop: session.root.scrollTop };
      renderPDFControls();
      schedulePDFScroll(session);
      requestPDFPage(session, page, true);
    } else if (page !== state.pdfPage) {
      state.pdfPage = page;
      renderReader();
    }
  }
  function zoomPDF(step: number): void {
    const session = state.pdfSession;
    const anchor = session?.pages.get(state.pdfPage);
    const offset = session && anchor ? (session.root.scrollTop - anchor.offsetTop) / anchor.offsetHeight : 0;
    state.pdfZoom = Math.max(100, Math.min(200, state.pdfZoom + step));
    for (const page of $$('.pdf-page-sheet')) {
      page.style.width = `${state.pdfZoom}%`;
      page.style.setProperty('--pdf-zoom', String(state.pdfZoom / 100));
    }
    if (session) updatePDFTextScale(session);
    if (session && anchor) {
      session.root.scrollTop = anchor.offsetTop + offset * anchor.offsetHeight;
      if (session.manualPage) session.manualPage.scrollTop = session.root.scrollTop;
      schedulePDFScroll(session);
    }
    renderPDFControls();
  }
  function livePDF(session: PDFSession): boolean {
    return !session.disposed && state.pdfSession === session && state.noteEpoch === session.epoch;
  }
  async function fetchPDFPage(session: PDFSession, page: number): Promise<PDFPageData> {
    const controller = new AbortController();
    session.controllers.set(page, controller);
    const timer = setTimeout(() => controller.abort(), 45000);
    let url = '';
    try {
      const textPromise = api<TextLayerData>(
        `/api/papers/${endpoint(session.paper.literature_id)}/text-layer?page=${page}`,
        { signal: controller.signal },
      ).catch((error: unknown) => ({ hasText: false, text: '', lines: [], width: 0, height: 0, error: (error as Error).message }));
      const response = await fetch(
        `/api/papers/${endpoint(session.paper.literature_id)}/preview?page=${page}`,
        { signal: controller.signal },
      );
      if (!response.ok) {
        let detail = `预览加载失败 (${response.status})`;
        if ((response.headers.get('content-type') || '').includes('json')) {
          const data = await response.json() as { error?: string | { message?: string }; message?: string };
          detail = (typeof data.error === 'object' ? data.error?.message : data.error) || data.message || detail;
        }
        throw new Error(detail);
      }
      if (!(response.headers.get('content-type') || '').startsWith('image/png')) {
        throw new Error('预览接口未返回 PNG 页面图片。');
      }
      const total = Number(response.headers.get('X-PDF-Pages'));
      const blob = await response.blob();
      if (!livePDF(session) || controller.signal.aborted) throw new DOMException('已停止加载', 'AbortError');
      url = URL.createObjectURL(blob);
      const img = new Image();
      img.className = 'pdf-page-image';
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.draggable = false;
      img.src = url;
      await img.decode();
      if (!livePDF(session) || controller.signal.aborted) throw new DOMException('已停止加载', 'AbortError');
      if (!Number.isSafeInteger(total) || total < page) throw new Error('PDF总页数无效。');
      return { img, url, total, textLayer: await textPromise };
    } catch (error) {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
      throw error;
    } finally {
      clearTimeout(timer);
      session.controllers.delete(page);
    }
  }
  function updatePDFTextScale(session: PDFSession): void {
    for (const [page, { data, element }] of session.textLayers) {
      const sheet = session.pages.get(page);
      if (element && sheet) {
        element.style.transform = `scale(${sheet.clientWidth / data.width},${sheet.clientHeight / data.height})`;
      }
    }
  }
  function mountPDFTextLayer(session: PDFSession, page: number, data: TextLayerData): void {
    const sheet = session.pages.get(page);
    if (!sheet) return;
    session.textLayers.set(page, { data, element: null });
    if (!data?.hasText || data.error) return;
    const layer = document.createElement('div');
    layer.className = 'pdf-text-layer';
    layer.setAttribute('aria-label', `第 ${page} 页可选文字`);
    layer.style.width = `${data.width}px`;
    layer.style.height = `${data.height}px`;
    const context = document.createElement('canvas').getContext('2d');
    for (const line of data.lines) {
      const row = document.createElement('div');
      row.className = 'pdf-text-line';
      const top = Math.min(...line.words.map((word) => word.y));
      row.style.top = `${top}px`;
      for (const [index, word] of line.words.entries()) {
        const span = document.createElement('span');
        span.textContent = word.text + (index === line.words.length - 1 ? '\n' : ' ');
        span.dir = 'auto';
        const rotation = word.rotation || 0;
        const vertical = rotation === 90 || rotation === 270;
        const fontSize = vertical ? word.width : word.height;
        const family = word.fontFamily && ['serif', 'sans-serif', 'monospace'].includes(word.fontFamily)
          ? word.fontFamily
          : 'serif';
        span.style.fontFamily = family;
        span.style.fontWeight = word.bold ? '700' : '400';
        span.style.fontStyle = word.italic ? 'italic' : 'normal';
        const left = word.x + ([90, 180].includes(rotation) ? word.width : 0);
        const y = word.y - top + ([180, 270].includes(rotation) ? word.height : 0);
        span.style.left = `${left}px`;
        span.style.top = `${y}px`;
        span.style.fontSize = `${fontSize}px`;
        span.style.height = `${fontSize}px`;
        let scale = 1;
        if (context) {
          const style = `${word.italic ? 'italic ' : ''}${word.bold ? 'bold ' : ''}${fontSize}px ${family}`;
          context.font = style;
          const measured = context.measureText(word.text).width;
          if (measured > 0) scale = (vertical ? word.height : word.width) / measured;
        }
        span.style.transform = `rotate(${rotation}deg) scaleX(${scale})`;
        row.append(span);
      }
      layer.append(row);
    }
    sheet.append(layer);
    session.textLayers.set(page, { data, element: layer });
    updatePDFTextScale(session);
  }
  function pdfSelectionIntersects(sheet: HTMLElement | undefined): boolean {
    if (!sheet) return false;
    const selection = document.getSelection();
    if (!selection || selection.isCollapsed) return false;
    for (let i = 0; i < selection.rangeCount; i++) {
      if (selection.getRangeAt(i).intersectsNode(sheet)) return true;
    }
    return false;
  }
  function mountPDFPage(session: PDFSession, page: number, { img, url, textLayer }: PDFPageData): void {
    if (!livePDF(session)) {
      URL.revokeObjectURL(url);
      return;
    }
    const sheet = session.pages.get(page);
    if (!sheet) {
      URL.revokeObjectURL(url);
      return;
    }
    const priorHeight = sheet.offsetHeight;
    const above = sheet.offsetTop + priorHeight < session.root.scrollTop;
    sheet.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
    sheet.replaceChildren(img);
    sheet.dataset.loaded = 'true';
    mountPDFTextLayer(session, page, textLayer);
    session.urls.set(page, url);
    session.errors.delete(page);
    if (above) {
      session.root.scrollTop += sheet.offsetHeight - priorHeight;
      if (session.manualPage) session.manualPage.scrollTop = session.root.scrollTop;
    }
    if (page === state.pdfPage) renderPDFControls();
    schedulePDFScroll(session);
  }
  function requestPDFPage(session: PDFSession, page: number, priority = false): void {
    if (
      !livePDF(session) ||
      !session.pages.has(page) ||
      session.urls.has(page) ||
      session.controllers.has(page) ||
      session.errors.has(page)
    ) return;
    if (!session.queue.includes(page)) {
      if (priority) session.queue.unshift(page);
      else session.queue.push(page);
    }
    pumpPDFPages(session);
  }
  function pumpPDFPages(session: PDFSession): void {
    if (!livePDF(session)) return;
    session.queue = session.queue.filter((p) => Math.abs(p - state.pdfPage) <= 3);
    session.queue.sort((a, b) => Math.abs(a - state.pdfPage) - Math.abs(b - state.pdfPage));
    while (session.running < 2 && session.queue.length) {
      const page = session.queue.shift() as number;
      if (session.urls.has(page) || session.controllers.has(page)) continue;
      session.running++;
      fetchPDFPage(session, page)
        .then((data) => mountPDFPage(session, page, data))
        .catch((error: Error) => {
          if (!livePDF(session) || error.name === 'AbortError') return;
          session.errors.add(page);
          const sheet = session.pages.get(page);
          if (sheet) {
            sheet.innerHTML =
              `<div class="pdf-page-placeholder"><span>第 ${page} 页加载失败</span><small>${esc(error.message)}</small><button class="button subtle" data-pdf-retry="${page}">重试第 ${page} 页</button></div>`;
          }
        })
        .finally(() => {
          session.running--;
          if (livePDF(session)) {
            pumpPDFPages(session);
            schedulePDFScroll(session);
          }
        });
    }
  }
  function schedulePDFScroll(session: PDFSession): void {
    if (!livePDF(session) || session.frame) return;
    session.frame = requestAnimationFrame(() => {
      session.frame = null;
      if (!livePDF(session) || !session.pages.size || !session.root.clientHeight || !session.root.clientWidth) return;
      const marker = session.root.scrollTop + Math.min(session.root.clientHeight * 0.3, 200);
      let lo = 1;
      let hi = session.pages.size;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        const sheet = session.pages.get(mid);
        if (!sheet || sheet.offsetTop + sheet.offsetHeight < marker) lo = mid + 1;
        else hi = mid;
      }
      if (session.manualPage && Math.abs(session.root.scrollTop - session.manualPage.scrollTop) < 2) {
        lo = session.manualPage.page;
      } else {
        session.manualPage = null;
        if (
          session.root.scrollTop > 0 &&
          session.root.scrollTop + session.root.clientHeight >= session.root.scrollHeight - 2
        ) lo = session.pages.size;
      }
      const pageChanged = state.pdfPage !== lo;
      state.pdfPage = lo;
      if (pageChanged) renderPDFControls();
      const input = scope.querySelector<HTMLInputElement>('#pdf-page');
      if (input && document.activeElement !== input) input.value = String(lo);
      for (const button of $$('[data-pdf-step]')) {
        (button as HTMLButtonElement).disabled =
          Number(button.dataset.pdfStep) < 0 ? lo <= 1 : lo >= (state.pdfTotal as number);
      }
      const sheet = session.pages.get(lo);
      if (sheet) session.anchor = { page: lo, offset: (session.root.scrollTop - sheet.offsetTop) / sheet.offsetHeight };
      // 预加载相邻页并释放远处的已解码图片，限制长文档的内存占用。
      for (const page of [lo, lo + 1, lo - 1]) requestPDFPage(session, page, true);
      for (const [page, url] of session.urls) {
        if (Math.abs(page - lo) > 3) {
          const target = session.pages.get(page);
          if (!target || pdfSelectionIntersects(target)) continue;
          target.innerHTML = `<div class="pdf-page-placeholder">第 ${page} 页</div>`;
          delete target.dataset.loaded;
          URL.revokeObjectURL(url);
          session.urls.delete(page);
          session.textLayers.delete(page);
        }
      }
      for (const [page, controller] of session.controllers) {
        if (Math.abs(page - lo) > 3) controller.abort();
      }
    });
  }
  async function loadPDFPreview(paper: Paper, epoch: number): Promise<void> {
    const root = $('#reader-content');
    const session: PDFSession = {
      paper,
      epoch,
      root,
      disposed: false,
      pages: new Map(),
      urls: new Map(),
      controllers: new Map(),
      errors: new Set(),
      textLayers: new Map(),
      queue: [],
      running: 0,
      frame: null,
      manualPage: null,
      zoomDelta: 0,
    };
    state.pdfSession = markRaw(session) as PDFSession;
    state.previewLoading = true;
    const page = state.pdfPage;
    renderPDFControls();
    root.innerHTML = `<div class="loading"><span class="busy-spinner"></span>正在加载 PDF 第 ${page} 页…</div>`;
    try {
      const first = await fetchPDFPage(session, page);
      if (!livePDF(session)) {
        URL.revokeObjectURL(first.url);
        return;
      }
      state.pdfTotal = first.total;
      const viewport = document.createElement('div');
      viewport.className = 'pdf-page-viewport';
      viewport.setAttribute('aria-label', 'PDF连续阅读');
      for (let n = 1; n <= first.total; n++) {
        const sheet = document.createElement('div');
        sheet.className = 'pdf-page-sheet';
        sheet.dataset.pdfPage = String(n);
        sheet.style.width = `${state.pdfZoom}%`;
        sheet.style.setProperty('--pdf-zoom', String(state.pdfZoom / 100));
        sheet.style.aspectRatio = `${first.img.naturalWidth} / ${first.img.naturalHeight}`;
        sheet.setAttribute('role', 'group');
        sheet.setAttribute('aria-label', `PDF物理页序 ${n}`);
        sheet.innerHTML = `<div class="pdf-page-placeholder">第 ${n} 页</div>`;
        viewport.append(sheet);
        session.pages.set(n, sheet);
      }
      root.replaceChildren(viewport);
      root.scrollLeft = 0;
      mountPDFPage(session, page, first);
      root.scrollTop = Math.max(0, (session.pages.get(page) as HTMLElement).offsetTop - 24);
      session.manualPage = { page, scrollTop: root.scrollTop };
      session.onScroll = () => schedulePDFScroll(session);
      root.addEventListener('scroll', session.onScroll, { passive: true });
      session.onCopy = (event: ClipboardEvent) => {
        const target = event.target as HTMLElement | null;
        if (
          event.defaultPrevented ||
          target?.isContentEditable ||
          target?.closest?.('input,textarea')
        ) return;
        const selection = document.getSelection();
        if (!selection?.rangeCount || selection.isCollapsed || !event.clipboardData) return;
        const range = selection.getRangeAt(0);
        if (!root.contains(range.commonAncestorContainer)) return;
        if (![...session.textLayers.values()].some(({ element }) => element && range.intersectsNode(element))) return;
        event.clipboardData.setData('text/plain', range.cloneContents().textContent ?? '');
        event.preventDefault();
      };
      document.addEventListener('copy', session.onCopy as EventListener);
      session.onUserScroll = (event: Event) => {
        if (
          event.type === 'keydown' &&
          !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes((event as KeyboardEvent).key)
        ) return;
        if (event.type === 'pointerdown' && event.target !== root) return;
        session.manualPage = null;
        schedulePDFScroll(session);
      };
      for (const name of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
        root.addEventListener(name, session.onUserScroll as EventListener, { passive: true });
      }
      // Ctrl+滚轮（触控板捏合同样以 ctrlKey 上报）缩放页面，阻止 WebView 整体缩放。
      // 按累计滚动量每满 100 步进 10%，避免捏合的高频小增量瞬间放大到上限。
      session.zoomDelta = 0;
      session.onZoomWheel = (event: WheelEvent) => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        session.zoomDelta += event.deltaY;
        const steps = Math.trunc(session.zoomDelta / 100);
        if (!steps) return;
        session.zoomDelta -= steps * 100;
        zoomPDF(steps < 0 ? 10 * -steps : -10 * steps);
      };
      root.addEventListener('wheel', session.onZoomWheel as EventListener, { passive: false });
      session.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) requestPDFPage(session, Number((entry.target as HTMLElement).dataset.pdfPage));
          }
        },
        { root, rootMargin: '100% 0px', threshold: 0 },
      );
      for (const sheet of session.pages.values()) session.observer.observe(sheet);
      let priorWidth = root.clientWidth;
      let wasHidden = false;
      session.resizeObserver = new ResizeObserver(() => {
        const width = root.clientWidth;
        if (!width || !root.clientHeight) {
          wasHidden = true;
          return;
        }
        updatePDFTextScale(session);
        if ((wasHidden || width !== priorWidth) && session.anchor) {
          const anchor = session.pages.get(session.anchor.page);
          if (anchor) root.scrollTop = anchor.offsetTop + session.anchor.offset * anchor.offsetHeight;
          if (session.manualPage) session.manualPage.scrollTop = root.scrollTop;
        }
        wasHidden = false;
        priorWidth = width;
        schedulePDFScroll(session);
      });
      session.resizeObserver.observe(root);
      schedulePDFScroll(session);
    } catch (error) {
      if (!livePDF(session)) return;
      const err = error as Error;
      root.innerHTML = `<div class="empty"><h2>页面预览暂不可用</h2><p class="error-text">${esc(err.name === 'AbortError' ? '预览请求超时，请重试。' : err.message)}</p><button id="retry-preview" class="button subtle">重新加载第 ${page} 页</button><p>也可使用工具栏的“单独打开”查看原 PDF。</p></div>`;
    } finally {
      if (livePDF(session)) {
        state.previewLoading = false;
        renderPDFControls();
      }
    }
  }
  function renderReader(): void {
    const paper = currentPaper();
    if (!paper) {
      releasePreview();
      $('#reader-header').innerHTML = '<span class="muted">阅读</span>';
      $('#reader-toolbar').hidden = true;
      $('#reader-content').innerHTML =
        `<div class="empty reader-empty"><span class="empty-art">${icon('book')}</span><h2>选择论文</h2><p>从左侧选择，查看原文或笔记。</p></div>`;
      return;
    }
    const epoch = ++state.noteEpoch;
    releasePreview();
    $('#reader-header').innerHTML =
      `<div class="reader-heading"><h2>${esc(titleOf(paper))}</h2><div class="reader-meta">${esc(paper.literature_id)} · ${esc(paper.year || '年份待核实')} · ${esc(paper.pages ? paper.pages + ' 页' : '页数待核实')}<br>${esc(authorText(paper))}</div></div><select id="paper-read-status" aria-label="标记阅读进度">${Object.entries(
        readLabels,
      )
        .map(
          ([key, label]) =>
            `<option value="${key}" ${readKey(paper.readStatus) === key ? 'selected' : ''}>${label}</option>`,
        )
        .join('')}</select>`;
    const notes = Array.isArray(paper.notes) ? paper.notes : [];
    const noteSelected = notes.some((note) => note.path === state.notePath) ? state.notePath : notes[0]?.path ?? '';
    const deleteNote = state.readerMode === 'note' && noteSelected
      ? `<button id="delete-note" class="icon-button danger" aria-label="删除当前笔记" title="删除当前笔记" ${state.noteDeleting ? 'disabled' : ''}>${icon('trash')}</button>`
      : '';
    $('#reader-toolbar').hidden = false;
    $('#reader-toolbar').innerHTML =
      `<div class="segmented"><button data-reader-mode="pdf" class="${state.readerMode === 'pdf' ? 'active' : ''}">原文 PDF</button><button data-reader-mode="note" class="${state.readerMode === 'note' ? 'active' : ''}">阅读笔记 <small>${notes.length}</small></button></div>${state.readerMode === 'pdf' && paper.file ? `<select id="pdf-renderer" aria-label="PDF显示方式"><option value="preview" ${!state.pdfBrowser ? 'selected' : ''}>连续阅读</option><option value="browser" ${state.pdfBrowser ? 'selected' : ''}>浏览器阅读器</option></select>` : ''}${state.readerMode === 'note' && notes.length ? `<select id="note-select" aria-label="选择笔记">${notes.map((note) => `<option value="${esc(note.path)}" ${note.path === noteSelected ? 'selected' : ''}>${esc(note.title || note.path.split(/[\\/]/).pop())}</option>`).join('')}</select>${deleteNote}` : ''}${paper.file ? `<a class="open-original" href="${esc(fileURL(paper.file))}" target="_blank" rel="noopener noreferrer">单独打开${icon('external')}</a>` : ''}${state.readerMode === 'pdf' && paper.file && !state.pdfBrowser ? '<div id="pdf-controls" class="pdf-controls" role="group" aria-label="PDF翻页与缩放"></div>' : ''}`;
    if (state.readerMode === 'pdf') {
      if (!paper.file) {
        $('#reader-content').innerHTML = '<div class="empty"><p>该条目尚无可用原文文件。</p></div>';
      } else if (state.pdfBrowser) {
        $('#reader-content').innerHTML =
          `<iframe class="pdf-frame" title="${esc(titleOf(paper))} PDF原文" src="${esc(fileURL(paper.file))}"></iframe>`;
      } else loadPDFPreview(paper, epoch);
    } else if (!notes.length) {
      $('#reader-content').innerHTML =
        '<div class="empty"><h2>阅读笔记尚待积累</h2><p>可以向研究助手提问，整理阅读笔记。</p><button id="ask-note" class="button subtle">请助手帮我精读</button></div>';
    } else {
      state.notePath = notes.some((note) => note.path === state.notePath) ? state.notePath : notes[0]?.path ?? '';
      $('#reader-content').innerHTML =
        '<div class="loading"><span class="busy-spinner"></span>正在读取笔记…</div>';
      api<{ text?: string }>(`/api/text?path=${encodeURIComponent(state.notePath)}`)
        .then((data) => {
          if (epoch !== state.noteEpoch) return;
          $('#reader-content').innerHTML =
            `<article class="note-document markdown">${markdown(data.text, state.notePath)}</article>`;
        })
        .catch((error: Error) => {
          if (epoch === state.noteEpoch) {
            $('#reader-content').innerHTML =
              `<div class="empty"><p class="error-text">${esc(error.message)}</p><button id="retry-note" class="button subtle">重试</button></div>`;
          }
        });
    }
  }

  scope.addEventListener(
    'click',
    (event) => {
      const button = (event.target as HTMLElement).closest('button');
      if (!button) return;
      if (button.dataset.readerMode) state.readerMode = button.dataset.readerMode as WorkspaceState['readerMode'];
      if (button.dataset.pdfStep) goPDFPage(state.pdfPage + Number(button.dataset.pdfStep));
      if (button.dataset.pdfZoom) zoomPDF(Number(button.dataset.pdfZoom));
      if (button.id === 'pdf-fit') zoomPDF(100 - state.pdfZoom);
      if (button.id === 'copy-pdf-page') copyPDFPageText();
      if (button.id === 'delete-note') void confirmDeleteNote();
      if (['retry-preview', 'retry-note'].includes(button.id)) renderReader();
      if (button.dataset.pdfRetry && state.pdfSession) {
        const page = Number(button.dataset.pdfRetry);
        state.pdfSession.errors.delete(page);
        requestPDFPage(state.pdfSession, page, true);
      }
      if (button.id === 'ask-note') {
        setDraft('请精读当前论文，解释核心方法、证据和局限，给出原文定位，并整理阅读笔记。');
        setPanel('chat');
      }
    },
    { signal: lifecycle.signal },
  );
  scope.addEventListener(
    'change',
    (event) => {
      const target = event.target as HTMLInputElement | HTMLSelectElement;
      if (target.id === 'paper-read-status') {
        const id = state.current;
        if (!id) return;
        target.disabled = true;
        void patchPaper(id, { readStatus: target.value }).then((saved) => {
          if (!saved && state.current === id) target.value = readKey(currentPaper()?.readStatus);
          target.disabled = false;
        });
      }
      if (target.id === 'note-select') state.notePath = target.value;
      if (target.id === 'pdf-renderer') state.pdfBrowser = target.value === 'browser';
      if (target.id === 'pdf-page') goPDFPage(target.value);
    },
    { signal: lifecycle.signal },
  );
  scope.addEventListener(
    'keydown',
    (event) => {
      const target = event.target as HTMLInputElement;
      if (target.id === 'pdf-page' && (event as KeyboardEvent).key === 'Enter') {
        event.preventDefault();
        goPDFPage(target.value);
      }
    },
    { signal: lifecycle.signal },
  );
  view.addEventListener(
    'pagehide',
    () => {
      ++state.noteEpoch;
      releasePreview();
    },
    { signal: lifecycle.signal },
  );
  view.addEventListener(
    'pageshow',
    (event) => {
      if ((event as PageTransitionEvent).persisted && currentPaper() && state.readerMode === 'pdf') renderReader();
    },
    { signal: lifecycle.signal },
  );
  return {
    render: renderReader,
    dispose: () => {
      ++state.noteEpoch;
      releasePreview();
      lifecycle.abort();
    },
  };
}
