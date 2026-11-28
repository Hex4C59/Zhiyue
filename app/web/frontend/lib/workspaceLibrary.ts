import { nextTick } from 'vue';
import { endpoint, json, readKey } from './content';
import type { Category, JobRecord, Paper, UiState, WorkspaceState } from './types';

export type ApiFn = <T = unknown>(path: string, options?: RequestInit) => Promise<T>;

export interface LibraryResponse {
  papers?: Paper[];
  categories?: Category[];
  stats?: Record<string, number>;
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export interface LibraryActionsDeps {
  state: WorkspaceState;
  api: ApiFn;
  toast: (message: string, error?: boolean) => void;
  setPanel: (panel: WorkspaceState['panel']) => void;
}

export function createWorkspaceLibraryActions({ state, api, toast, setPanel }: LibraryActionsDeps) {
  /**
   * 读取文献库里的界面状态（会话、当前文献、栏宽）。
   * 本地服务每次启动会换端口，浏览器存储因此按端口隔离而不可靠；失败时保持默认值，不阻断启动。
   */
  async function loadUiState(): Promise<void> {
    try {
      const data = await api<UiState>('/api/ui');
      state.ui = { chatId: data.chatId ?? null, paperId: data.paperId ?? null };
      // 用户已经拖过栏宽时不再用服务端旧值覆盖，避免慢返回把刚调好的宽度弹回去。
      if (!state.uiDirty) state.panelWidths = { ...(data.panelWidths || {}) };
      state.uiError = '';
    } catch (error) {
      state.uiError = messageOf(error);
    }
  }

  /** 保存局部界面状态；偏好写失败只记下来，不回滚也不打断阅读。 */
  function saveUiState(patch: Partial<UiState>): void {
    if (patch.chatId !== undefined) state.ui.chatId = patch.chatId;
    if (patch.paperId !== undefined) state.ui.paperId = patch.paperId;
    if (patch.panelWidths) state.panelWidths = { ...state.panelWidths, ...patch.panelWidths };
    state.uiDirty = true;
    api('/api/ui', json('PATCH', patch)).catch((error: unknown) => {
      state.uiError = messageOf(error);
    });
  }

  function selectPaper(id: string): void {
    if (state.current === id) {
      setPanel('reader');
      void nextTick(() => document.getElementById('reader-content')?.focus({ preventScroll: true }));
      return;
    }
    state.current = id;
    // 重启后恢复到上次阅读的那篇：助手靠 state.current 判断“当前打开”的是哪一篇。
    saveUiState({ paperId: id });
    state.readerMode = 'pdf';
    state.notePath = '';
    state.pdfPage = 1;
    state.pdfTotal = null;
    state.pdfZoom = 100;
    state.pdfBrowser = false;
    state.pdfTranslation = '';
    if (window.matchMedia('(max-width:1050px)').matches) setPanel('reader');
  }

  function resetFilters(): void {
    Object.assign(state, { query: '', year: '', read: '', starred: false });
  }

  async function loadLibrary(): Promise<void> {
    try {
      const data = await api<LibraryResponse>('/api/library');
      state.papers = Array.isArray(data.papers) ? data.papers : [];
      state.categories = data.categories || [];
      state.stats = data.stats || {};
      state.libraryError = '';
    } catch (error) {
      state.libraryError = messageOf(error);
    }
  }

  async function createCategory(name: string, parent = ''): Promise<unknown> {
    try {
      const result = await api('/api/categories', json('POST', { name, ...(parent ? { parent } : {}) }));
      await loadLibrary();
      return result;
    } catch (error) {
      toast(messageOf(error), true);
      return null;
    }
  }

  async function renameCategory(category: string, subcategory: string, name: string): Promise<unknown> {
    try {
      const result = await api('/api/categories/rename', json('POST', { category, subcategory, name }));
      await loadLibrary();
      return result;
    } catch (error) {
      toast(messageOf(error), true);
      return null;
    }
  }

  async function deleteCategory(category: string, subcategory = ''): Promise<unknown> {
    try {
      const result = await api(
        '/api/categories/delete',
        json('POST', { category, ...(subcategory ? { subcategory } : {}) }),
      );
      await loadLibrary();
      return result;
    } catch (error) {
      toast(messageOf(error), true);
      return null;
    }
  }

  async function patchPaper(id: string, update: Record<string, unknown>): Promise<boolean> {
    if (state.pendingPatches.has(id)) return false;
    state.pendingPatches.add(id);
    try {
      const updated = await api<Paper>(`/api/papers/${endpoint(id)}`, json('PATCH', update));
      const paper = state.papers.find((item) => item.literature_id === id);
      if (paper) {
        const previousRead = readKey(paper.readStatus);
        const previousStarred = !!paper.starred;
        Object.assign(paper, updated);
        const nextRead = readKey(paper.readStatus);
        if (previousRead !== nextRead) {
          state.stats[previousRead] = Math.max(0, (state.stats[previousRead] ?? 0) - 1);
          state.stats[nextRead] = (state.stats[nextRead] ?? 0) + 1;
        }
        if (previousStarred !== !!paper.starred) {
          state.stats.starred = Math.max(0, (state.stats.starred ?? 0) + (paper.starred ? 1 : -1));
        }
      }
      return true;
    } catch (error) {
      toast(messageOf(error), true);
      return false;
    } finally {
      state.pendingPatches.delete(id);
    }
  }

  // 拖动只记录来源，真正的搬文件、改引用和加锁由 Python move-paper 完成。
  function beginPaperDrag(id: string): boolean {
    if (!id || state.movingPaper) return false;
    state.draggingPaper = id;
    return true;
  }

  function endPaperDrag(): void {
    state.draggingPaper = '';
  }

  async function movePaper(id: string, category: string, subcategory = ''): Promise<boolean> {
    if (!id || state.movingPaper) return false;
    const paper = state.papers.find((item) => item.literature_id === id);
    if (paper && paper.category === category && (paper.subcategory ?? '') === subcategory) {
      toast('这篇文献已在这个文件夹');
      return false;
    }
    state.movingPaper = id;
    try {
      await api(`/api/papers/${endpoint(id)}/move`, json('POST', {
        category, ...(subcategory ? { subcategory } : {}),
      }));
      const target = (subcategory || category).replace(/^\d+_/, '');
      toast(`已移到「${target}」`);
      await loadLibrary();
      return true;
    } catch (error) {
      toast(messageOf(error), true);
      return false;
    } finally {
      state.movingPaper = '';
    }
  }

  /**
   * 删除已保存的阅读笔记。服务端只把文件移到 `.zhiyue/trash/notes/`，所以确认文案要说明可以找回；
   * 删除后回到笔记列表第一项，没有剩余笔记时清空选中路径。
   */
  async function deleteNote(relativePath: string): Promise<boolean> {
    if (!relativePath || state.noteDeleting) return false;
    state.noteDeleting = true;
    try {
      const result = await api<{ trashed: string; library?: LibraryResponse }>(
        '/api/notes/delete',
        json('POST', { path: relativePath }),
      );
      state.papers = Array.isArray(result.library?.papers) ? result.library.papers : state.papers;
      const paper = state.papers.find((item) => item.literature_id === state.current);
      const remaining = Array.isArray(paper?.notes) ? paper.notes : [];
      state.notePath = remaining[0]?.path ?? '';
      toast(`笔记已移入回收站：${result.trashed}`);
      return true;
    } catch (error) {
      toast(messageOf(error), true);
      return false;
    } finally {
      state.noteDeleting = false;
    }
  }

  async function importPdfs({ uploads, category }: { uploads: unknown; category: string }): Promise<{
    job: JobRecord; skipped: Array<Record<string, unknown>>;
  }> {
    const { job, skipped } = await api<{ job: JobRecord; skipped: Array<Record<string, unknown>> }>(
      '/api/library/import',
      json('POST', { uploads, category }),
    );
    state.jobs.set(job.id, job);
    return { job, skipped };
  }

  async function loadDownloads(): Promise<void> {
    try {
      const data = await api<{ jobs?: JobRecord[]; batches?: WorkspaceState['batches'] }>('/api/downloads');
      for (const job of data.jobs || []) state.jobs.set(job.id, job);
      state.batches = data.batches || [];
      state.downloadsError = '';
    } catch (error) {
      state.downloadsError = messageOf(error);
    }
  }

  async function createDownload(data: unknown): Promise<boolean> {
    try {
      const job = await api<JobRecord>('/api/downloads', json('POST', data));
      state.jobs.set(job.id, job);
      toast('下载任务已创建');
      return true;
    } catch (error) {
      toast(messageOf(error), true);
      return false;
    }
  }

  async function batchAction(batch: string, action: string): Promise<boolean> {
    try {
      const body = { batch, action, ...(action === 'ieee' ? { submit: true } : {}) };
      const job = await api<JobRecord>('/api/downloads/action', json('POST', body));
      state.jobs.set(job.id, job);
      toast('批次操作已提交');
      return true;
    } catch (error) {
      toast(messageOf(error), true);
      return false;
    }
  }

  async function refreshCatalog(): Promise<void> {
    state.refreshing = true;
    try {
      const job = await api<JobRecord>('/api/catalog/refresh', json('POST', {}));
      state.jobs.set(job.id, job);
      toast('索引刷新任务已提交，可在“下载任务”页查看');
    } catch (error) {
      toast(messageOf(error), true);
    } finally {
      state.refreshing = false;
    }
  }

  return {
    loadUiState,
    saveUiState,
    selectPaper,
    resetFilters,
    loadLibrary,
    createCategory,
    renameCategory,
    deleteCategory,
    patchPaper,
    beginPaperDrag,
    endPaperDrag,
    movePaper,
    deleteNote,
    importPdfs,
    loadDownloads,
    createDownload,
    batchAction,
    refreshCatalog,
  };
}
