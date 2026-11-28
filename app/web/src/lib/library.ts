import { readFile, writeFile, mkdir, rename, realpath, stat, readdir, lstat } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { libraryPaths } from './paths.js';
import { statusError } from './errors.js';

export type ReadStatus = 'unread' | 'reading' | 'read';

export interface NoteRef {
  path: string;
  title: string;
}

/** 索引记录只保证 literature_id；其余字段按索引实际内容原样透传。 */
export interface CatalogRecord {
  literature_id?: unknown;
  file?: unknown;
  source_record?: unknown;
  display_title_zh?: unknown;
  authors?: unknown;
  versions?: unknown;
  [key: string]: unknown;
}

export interface Paper extends Record<string, unknown> {
  id: string;
  file: string;
  authors: string[];
  titleZh: string;
  category: string;
  subcategory: string;
  relatedFolders?: string[];
  notes: NoteRef[];
}

export interface LibraryPaper extends Paper {
  readStatus: ReadStatus;
  starred: boolean;
}

export interface CategoryChild {
  id: string;
  name: string;
  count: number;
}

export interface Category {
  id: string;
  name: string;
  count: number;
  children: CategoryChild[];
}

export interface LibraryStats {
  total: number;
  unread: number;
  reading: number;
  read: number;
  starred: number;
  withNotes: number;
}

export interface LibraryPayload {
  papers: LibraryPaper[];
  categories: Category[];
  stats: LibraryStats;
}

export interface PaperPatch {
  readStatus?: ReadStatus;
  starred?: boolean;
}

interface LibraryData {
  papers: Paper[];
  paperById: Map<string, Paper>;
  allowed: Set<string>;
  categories: Category[];
}

interface ReadingEntry {
  readStatus?: unknown;
  starred?: unknown;
}

type ReadingState = Record<string, ReadingEntry>;

export interface LibraryOptions {
  root: string;
  stateDir: string;
  categoryCommand?: (args: string[]) => Promise<unknown>;
}

const statuses = new Set<string>(['unread', 'reading', 'read']);
const images = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const extensions = new Set(['.pdf', '.md', '.txt', '.json', ...images]);
const copy = <T>(value: T): T => structuredClone(value);
const normalize = (value: unknown): string => String(value).replaceAll('\\', '/');
const denied = (parts: string[]): boolean => parts.some((p) => p.startsWith('.') || /申请资料|凭据|credentials|secrets/i.test(p));
const inside = (base: string, target: string): boolean => {
  const rel = path.relative(base, target);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
};
const categoryName = (value: string): string => String(value).replace(/^\d+_/, '');
const reservedCategory = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

function withReading(paper: Paper, reading: ReadingState): LibraryPaper {
  const entry = reading[paper.id];
  const readStatus = typeof entry?.readStatus === 'string' && statuses.has(entry.readStatus)
    ? entry.readStatus as ReadStatus
    : 'unread';
  return { ...paper, readStatus, starred: entry?.starred === true };
}

export class Library {
  readonly root: string;
  readonly stateDir: string;
  cache: Promise<LibraryData> | null;
  writes: Promise<unknown>;
  private reading: Promise<ReadingState> | null = null;
  categoryCommand: (args: string[]) => Promise<unknown>;

  constructor({ root, stateDir, categoryCommand }: LibraryOptions) {
    this.root = path.resolve(root);
    this.stateDir = path.resolve(stateDir);
    this.cache = null;
    this.writes = Promise.resolve();
    // 分类改名由 Python 在库写锁下完成；Node 只做参数校验，新建分类只做 mkdir。
    this.categoryCommand = categoryCommand ?? (() => Promise.reject(statusError('分类操作需要Python文献工具。', 500)));
  }

  // No PDF parsing: bibliography and explicitly associated JSON sidecars only.
  async _load(): Promise<LibraryData> {
    const root = await realpath(this.root);
    const catalogText = (await readFile(path.join(libraryPaths(root).catalog, '文献索引.json'), 'utf8')).replace(/^\uFEFF/, '');
    const catalog = JSON.parse(catalogText) as { records?: CatalogRecord[] };
    const allowed = new Set<string>();
    const add = (value: unknown): void => {
      if (typeof value !== 'string') return;
      const rel = normalize(value);
      if (this._validRelative(rel)) allowed.add(rel);
    };
    const records = catalog.records ?? [];
    const indexRecord = (record: CatalogRecord, folders: Set<string>): void => {
      for (const value of [record.file, record.source_record]) {
        if (typeof value !== 'string') continue;
        const rel = normalize(value);
        if (!rel.startsWith('papers/') || !this._validRelative(rel)) continue;
        const parts = rel.split('/');
        if (parts.length >= 3) folders.add(parts.slice(1, Math.min(3, parts.length - 1)).join('/'));
      }
      if (path.extname(typeof record.file === 'string' ? record.file : '').toLowerCase() === '.pdf') add(record.file);
      if (path.extname(typeof record.source_record === 'string' ? record.source_record : '').toLowerCase() === '.json') {
        add(record.source_record);
      }
      for (const version of Array.isArray(record.versions) ? record.versions : []) {
        if (version && typeof version === 'object') indexRecord(version as CatalogRecord, folders);
      }
    };
    const notes = new Map<string, NoteRef[]>();
    const walk = async (dir: string, prefix: string): Promise<void> => {
      const entries = await readdir(dir, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return [];
        throw error;
      });
      for (const item of entries) {
        const rel = `${prefix}/${item.name}`;
        if (!this._validRelative(rel) || item.isSymbolicLink()) continue;
        if (item.isDirectory()) await walk(path.join(dir, item.name), rel);
        else if (item.isFile() && path.extname(item.name).toLowerCase() === '.md') {
          const id = item.name.match(/(?:^|[^A-Za-z0-9])(L\d+)(?=[^0-9]|$)/i)?.[1]?.toUpperCase();
          if (id) {
            const title = item.name.replace(/\.md$/i, '');
            const list = notes.get(id) ?? [];
            if (!notes.has(id)) notes.set(id, list);
            list.push({ path: rel, title });
          }
        }
      }
    };
    await walk(path.join(root, 'notes'), 'notes');
    const papers: Paper[] = await Promise.all(records.map(async (record) => {
      const file = normalize(record.file ?? '');
      const parts = file.split('/');
      const category = parts[0] === 'papers' ? parts[1] ?? '' : '';
      const subcategory = parts.length > 3 ? parts[2] ?? '' : '';
      const folders = new Set<string>();
      indexRecord(record, folders);
      folders.delete(subcategory ? `${category}/${subcategory}` : category);
      const id = String(record.literature_id ?? '');
      let titleZh = typeof record.display_title_zh === 'string' ? record.display_title_zh : '';
      if (record.source_record && allowed.has(normalize(record.source_record))) {
        // 侧车已在索引且路径合法，直接拼接即可：为 860 份侧车各多跑两次 realpath 会让冷加载
        // 多出几十毫秒。链接仍然拒绝，但只用一次 lstat 判断，比 getfinalpathname 便宜。
        try {
          const sourcePath = path.resolve(root, ...normalize(record.source_record).split('/'));
          if ((await lstat(sourcePath)).isSymbolicLink()) throw statusError('侧车不能是链接', 403);
          const source = JSON.parse((await readFile(sourcePath, 'utf8')).replace(/^\uFEFF/, '')) as {
            display_title_zh?: unknown;
          };
          titleZh = typeof source.display_title_zh === 'string' && source.display_title_zh
            ? source.display_title_zh
            : titleZh;
        } catch { /* Missing or unsafe sidecar does not hide a catalog entry. */ }
      }
      const authors = Array.isArray(record.authors)
        ? record.authors.map(String)
        : String(record.authors ?? '').split(/[;；]/).map((s) => s.trim()).filter(Boolean);
      // 界面只需额外关联的目录，不必下发整份版本元数据。
      const { versions: _versions, relatedFolders: _derived, ...rest } = record;
      return { ...rest, id, file, authors, titleZh, category, subcategory, notes: notes.get(id) ?? [],
        ...(folders.size ? { relatedFolders: [...folders] } : {}) };
    }));
    const categoryMap = new Map<string, Category>();
    for (const paper of papers) {
      const primary = paper.subcategory ? `${paper.category}/${paper.subcategory}` : paper.category;
      const countedParents = new Set<string>();
      for (const id of [primary, ...(paper.relatedFolders ?? [])]) {
        const [parent = '', name] = id.split('/');
        let category = categoryMap.get(parent);
        if (!category) {
          category = { id: parent, name: parent, count: 0, children: [] };
          categoryMap.set(parent, category);
        }
        if (!countedParents.has(parent)) {
          category.count++;
          countedParents.add(parent);
        }
        if (name) {
          const child = category.children.find((item) => item.id === id);
          if (child) child.count++;
          else category.children.push({ id, name, count: 1 });
        }
      }
    }
    // 空文件夹也属于分类，需要和已归档文献一起出现在侧栏。
    for (const folder of await this._paperFolders()) {
      if (!categoryMap.has(folder.name)) {
        categoryMap.set(folder.name, { id: folder.name, name: folder.name, count: 0, children: [] });
      }
      const category = categoryMap.get(folder.name) as Category;
      for (const name of folder.children) {
        const id = `${folder.name}/${name}`;
        if (!category.children.some((child) => child.id === id)) category.children.push({ id, name, count: 0 });
      }
    }
    const categories = [...categoryMap.values()].sort((a, b) => a.id.localeCompare(b.id));
    for (const category of categories) category.children.sort((a, b) => a.id.localeCompare(b.id));
    const paperById = new Map<string, Paper>();
    for (const paper of papers) {
      // 与原先 find 的行为一致；索引出现重复编号时优先使用首条记录。
      if (!paperById.has(paper.id)) paperById.set(paper.id, paper);
    }
    return { papers, paperById, allowed, categories };
  }

  async _paperFolders(): Promise<Array<{ name: string; children: string[] }>> {
    const base = path.join(this.root, 'papers');
    const folders: Array<{ name: string; children: string[] }> = [];
    let entries;
    try { entries = await readdir(base, { withFileTypes: true }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return folders;
      throw error;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      if (!this._validRelative(`papers/${entry.name}`)) continue;
      const children: string[] = [];
      let inner: Dirent<string>[] = [];
      try { inner = await readdir(path.join(base, entry.name), { withFileTypes: true }); }
      catch { inner = []; }
      for (const child of inner) {
        if (!child.isDirectory() || child.isSymbolicLink()) continue;
        if (!this._validRelative(`papers/${entry.name}/${child.name}`)) continue;
        children.push(child.name);
      }
      folders.push({ name: entry.name, children });
    }
    return folders;
  }

  _validRelative(rel: string): boolean {
    if (!rel || /[\\\x00-\x1f:%?#]/.test(rel) || path.posix.isAbsolute(rel)) return false;
    const parts = rel.split('/');
    return ['papers', 'notes', 'synthesis', 'outputs'].includes(parts[0] as string) && parts.length > 1 &&
      parts.every((p) => p && p !== '..' && p !== '.') && !denied(parts);
  }

  async _resolve(rel: string): Promise<string> {
    if (!this._validRelative(rel)) throw statusError('不允许访问此路径', 403);
    const root = await realpath(this.root);
    const candidate = path.resolve(root, ...rel.split('/'));
    const resolved = await realpath(candidate);
    // Reject aliases too: a catalog entry must not lend access to an unindexed target.
    const equal = process.platform === 'win32'
      ? candidate.toLowerCase() === resolved.toLowerCase()
      : candidate === resolved;
    if (!inside(root, resolved) || !equal || !this._validRelative(normalize(path.relative(root, resolved)))) {
      throw statusError('不允许符号链接或目录逃逸', 403);
    }
    if (!(await stat(resolved)).isFile()) throw statusError('仅允许普通文件', 403);
    return resolved;
  }

  async _data(): Promise<LibraryData> {
    if (!this.cache) {
      this.cache = this._load().catch((error: unknown) => {
        this.cache = null;
        throw error;
      });
    }
    return this.cache;
  }

  _reading(): Promise<ReadingState> {
    if (this.reading) return this.reading;
    // 只合并重叠读取；完成后清除引用，下一次查询仍能看到外部文件更新。
    const operation = readFile(path.join(this.stateDir, 'reading.json'), 'utf8')
      .then((text) => JSON.parse(text.replace(/^\uFEFF/, '')) as ReadingState)
      .catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return {};
        throw error;
      }).finally(() => { if (this.reading === operation) this.reading = null; });
    this.reading = operation;
    return operation;
  }

  async getLibrary(): Promise<LibraryPayload> {
    const [data, reading] = await Promise.all([this._data(), this._reading()]);
    const papers = data.papers.map((paper) => withReading(paper, reading));
    const stats: LibraryStats = { total: papers.length, unread: 0, reading: 0, read: 0, starred: 0, withNotes: 0 };
    for (const paper of papers) {
      stats[paper.readStatus]++;
      if (paper.starred) stats.starred++;
      if (paper.notes.length) stats.withNotes++;
    }
    return copy({ papers, categories: data.categories, stats });
  }

  async getPaper(id: string): Promise<LibraryPaper | null> {
    const [data, reading] = await Promise.all([this._data(), this._reading()]);
    const paper = data.paperById.get(id);
    return paper ? copy(withReading(paper, reading)) : null;
  }

  async updatePaper(id: string, patch: unknown): Promise<LibraryPaper | null> {
    const fields = patch && typeof patch === 'object' ? patch as Record<string, unknown> : null;
    const validRead = fields?.readStatus === undefined || (typeof fields.readStatus === 'string' && statuses.has(fields.readStatus));
    const validStar = fields?.starred === undefined || typeof fields.starred === 'boolean';
    if (!fields || Object.keys(fields).some((key) => !['readStatus', 'starred'].includes(key)) || !validRead || !validStar) {
      throw statusError('阅读状态或收藏字段无效', 400);
    }
    const change = fields as PaperPatch;
    const operation = this.writes.then(async () => {
      const data = await this._data();
      const paper = data.paperById.get(id);
      if (!paper) throw statusError('文献不存在', 404);
      const reading = await this._reading();
      // 读取可能与只读查询合并；新状态独立构造，不能提前修改其他查询正在使用的对象。
      const updated = { ...reading, [id]: { readStatus: 'unread', starred: false, ...reading[id], ...change } };
      await mkdir(this.stateDir, { recursive: true });
      const target = path.join(this.stateDir, 'reading.json');
      const temp = `${target}.${randomUUID()}.tmp`;
      await writeFile(temp, JSON.stringify(updated, null, 2), { mode: 0o600 });
      await rename(temp, target);
      // 提交前发起的只读查询仍可完成，但后续写入必须重新读取已提交的状态。
      this.reading = null;
      return copy(withReading(paper, updated));
    });
    this.writes = operation.catch(() => {});
    return operation;
  }

  async refresh(): Promise<void> { this.cache = null; }

  _categoryName(value: unknown): string {
    if (typeof value !== 'string') throw statusError('文件夹名称无效。', 400);
    const name = value.trim().replace(/^\d+_/, '').trim().replace(/[. ]+$/, '');
    if (!name) throw statusError('请输入文件夹名称。', 400);
    if (name.length > 60) throw statusError('文件夹名称不能超过 60 个字符。', 400);
    if (name.startsWith('.') || /[\\/:*?"<>|\x00-\x1f]/.test(name)) throw statusError('文件夹名称包含不允许的字符。', 400);
    if (reservedCategory.test(name)) throw statusError('该名称不能用作文件夹。', 400);
    return name;
  }

  async _folderNames(dir: string): Promise<string[]> {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    return entries.filter((entry) => entry.isDirectory() && !entry.isSymbolicLink()).map((entry) => entry.name);
  }

  async _createFolder(base: string, name: string, relativePrefix: string): Promise<string> {
    const folders = await this._folderNames(base);
    if (folders.some((folder) => categoryName(folder).toLocaleLowerCase() === name.toLocaleLowerCase())) {
      throw statusError('同名文件夹已存在。', 409);
    }
    let last = 0;
    for (const folder of folders) {
      const match = /^(\d+)_/.exec(folder);
      if (match) last = Math.max(last, Number(match[1]));
    }
    const folder = `${String(last + 1).padStart(2, '0')}_${name}`;
    if (!this._validRelative(`${relativePrefix}/${folder}`)) throw statusError('该名称不能用作文件夹。', 400);
    try { await mkdir(path.join(base, folder)); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw statusError('同名文件夹已存在。', 409);
      throw error;
    }
    return folder;
  }

  async _createTopFolder(base: string, name: string): Promise<string> {
    return this._createFolder(base, name, 'papers');
  }

  async createCategory(value: unknown, parent?: unknown): Promise<{ category: string; subcategory: string }> {
    const name = this._categoryName(value);
    const parentName = parent === undefined || parent === null ? '' : parent;
    if (parentName !== '' && (typeof parentName !== 'string' || !parentName || parentName.includes('/'))) {
      throw statusError('父文件夹无效。', 400);
    }
    const operation = this.writes.then(async () => {
      const base = path.join(this.root, 'papers');
      await mkdir(base, { recursive: true });
      if (parentName) {
        if (!this._validRelative(`papers/${parentName}`)) throw statusError('父文件夹无效。', 400);
        const parentDir = path.join(base, parentName);
        const info = await lstat(parentDir).catch(() => null);
        if (!info?.isDirectory() || info.isSymbolicLink()) throw statusError('父文件夹不存在。', 404);
        const folder = await this._createFolder(parentDir, name, `papers/${parentName}`);
        this.cache = null;
        return { category: parentName, subcategory: folder };
      }
      const folder = await this._createTopFolder(base, name);
      this.cache = null;
      return { category: folder, subcategory: '' };
    });
    this.writes = operation.catch(() => {});
    return operation;
  }

  async ensureCategory(value: unknown): Promise<string> {
    const operation = this.writes.then(() => this._ensureCategory(value));
    this.writes = operation.catch(() => {});
    return operation;
  }

  // 导入前把用户选定的分类落到磁盘；顶层缺号时沿用新建分类的编号规则。
  async _ensureCategory(value: unknown): Promise<string> {
    if (typeof value !== 'string' || !value.startsWith('papers/')) throw statusError('分类目录必须位于 papers/ 内。', 400);
    const parts = value.split('/');
    if (parts.length < 2 || parts.length > 3 || parts.slice(1).some((part) =>
      !part || part === '.' || part === '..' || /[\\/]/.test(part))) throw statusError('文件夹路径无效。', 400);
    const base = path.join(this.root, 'papers');
    await mkdir(base, { recursive: true });
    const topName = categoryName(parts[1] as string);
    if (!topName) throw statusError('请输入文件夹名称。', 400);
    let folders = await this._folderNames(base);
    let folder = folders.find((name) => categoryName(name).toLocaleLowerCase() === topName.toLocaleLowerCase());
    if (!folder) {
      try { folder = await this._createTopFolder(base, topName); }
      catch (error) {
        if ((error as { statusCode?: number }).statusCode !== 409) throw error;
        folders = await this._folderNames(base);
        folder = folders.find((name) => categoryName(name).toLocaleLowerCase() === topName.toLocaleLowerCase());
        if (!folder) throw error;
      }
    }
    let current = path.join(base, folder);
    for (const part of parts.slice(2)) {
      const next = path.join(current, part);
      try { await mkdir(next); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
      const info = await lstat(next).catch(() => null);
      if (!info?.isDirectory() || info.isSymbolicLink()) throw statusError('分类路径不是普通目录。', 400);
      current = next;
    }
    const rel = path.relative(this.root, current).split(path.sep).join('/');
    if (!this._validRelative(rel)) throw statusError('分类目录无效。', 400);
    this.cache = null;
    return rel;
  }

  async renameCategory(category: unknown, subcategory: unknown, value: unknown): Promise<unknown> {
    const name = this._categoryName(value);
    const parts = subcategory ? [category, subcategory] : [category];
    const plain = (part: unknown): part is string =>
      typeof part === 'string' && part !== '' && part !== '.' && part !== '..' && !/[\\/]/.test(part);
    if (parts.length > 2 || !parts.every(plain)) throw statusError('文件夹路径无效。', 400);
    const [top, child] = parts as string[];
    const rel = `papers/${[top, child].filter(Boolean).join('/')}`;
    if (!this._validRelative(rel)) throw statusError('文件夹路径无效。', 400);
    const args = ['rename-category', '--category', top as string, '--name', name];
    if (child) args.push('--subcategory', child);
    const result = await this.categoryCommand(args);
    this.cache = null;
    return result;
  }

  async deleteCategory(category: unknown, subcategory: unknown): Promise<unknown> {
    const parts = subcategory ? [category, subcategory] : [category];
    const plain = (part: unknown): part is string =>
      typeof part === 'string' && part !== '' && part !== '.' && part !== '..' && !/[\/]/.test(part);
    if (parts.length > 2 || !parts.every(plain)) throw statusError('文件夹路径无效。', 400);
    const [top, child] = parts as string[];
    const rel = `papers/${[top, child].filter(Boolean).join('/')}`;
    if (!this._validRelative(rel)) throw statusError('文件夹路径无效。', 400);
    const args = ['delete-category', '--category', top as string];
    if (child) args.push('--subcategory', child);
    const result = await this.categoryCommand(args);
    this.cache = null;
    return result;
  }

  /**
   * 解析界面或助手传入的分类名称：接受带编号的目录名（08_SER）或显示名（SER），大小写不敏感，
   * 返回磁盘上的真实目录名。只做匹配，不创建目录；找不到或有歧义时列出候选。
   */
  async resolveCategory(value: unknown): Promise<{ category: string; subcategory: string; path: string }> {
    if (typeof value !== 'string') throw statusError('分类目录无效。', 400);
    const trimmed = value.trim().replace(/^papers\//i, '');
    const parts = trimmed.split('/');
    if (!trimmed || parts.length > 2 || parts.some((part) =>
      !part || part === '.' || part === '..' || /[\\:*?"<>|\x00-\x1f]/.test(part))) {
      throw statusError('分类目录无效。', 400);
    }
    const { categories } = await this.getLibrary();
    const key = (name: string): string => name.replace(/^\d+_/, '').toLocaleLowerCase();
    const pick = <T extends { id: string }>(items: T[], wanted: string, label: string): T => {
      const matches = items.filter((item) => item.id.toLocaleLowerCase() === wanted.toLocaleLowerCase() ||
        key(item.id) === key(wanted));
      if (!matches.length) {
        const known = items.map((item) => item.id).join('、') || '无';
        throw statusError(`没有找到${label}「${wanted}」。现有：${known}`, 404);
      }
      if (matches.length > 1) {
        throw statusError(`${label}「${wanted}」不唯一：${matches.map((item) => item.id).join('、')}`, 409);
      }
      return matches[0] as T;
    };
    const top = pick(categories, parts[0] as string, '分类');
    if (parts.length === 1) return { category: top.id, subcategory: '', path: `papers/${top.id}` };
    const children = top.children.map((child) => ({ id: child.id.split('/').pop() as string, name: child.name }));
    const child = pick(children, parts[1] as string, '子文件夹');
    const rel = `papers/${top.id}/${child.id}`;
    if (!this._validRelative(rel)) throw statusError('分类目录无效。', 400);
    return { category: top.id, subcategory: child.id, path: rel };
  }

  // 单篇文献移动由 Python 在库写锁下搬文件并修复 README、来源记录、台账和索引；Node 只校验编号与目标。
  async movePaper(paperId: unknown, category: unknown): Promise<unknown> {
    const id = typeof paperId === 'string' ? paperId.trim().toUpperCase() : '';
    if (!/^L\d+$/.test(id)) throw statusError('请指定 L 编号，例如 L003。', 400);
    const target = await this.resolveCategory(category);
    const result = await this.categoryCommand([
      'move-paper', '--literature-id', id, '--category', target.path,
    ]);
    this.cache = null;
    return result;
  }

  /**
   * 删除一篇阅读笔记：只接受 notes/ 下的 Markdown/文本，移动到 `.zhiyue/trash/notes/` 而不是直接抹掉，
   * 以便误删后可手动找回。返回回收站内的相对路径与新的文献索引数据。
   */
  async deleteNote(relativePath: unknown): Promise<{ trashed: string; library: LibraryPayload }> {
    if (typeof relativePath !== 'string' || !this._validRelative(relativePath)) {
      throw statusError('笔记路径无效。', 400);
    }
    const parts = relativePath.split('/');
    const ext = path.posix.extname(relativePath).toLowerCase();
    if (parts[0] !== 'notes' || !['.md', '.txt'].includes(ext)) throw statusError('只能删除 notes/ 下的笔记文件。', 400);
    const operation = this.writes.then(async () => {
      const file = await this._resolve(relativePath);
      const root = await realpath(this.root);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const trashDir = path.join(root, '.zhiyue', 'trash', 'notes');
      const trashFile = path.join(trashDir, `${stamp}_${path.basename(file)}`);
      await mkdir(trashDir, { recursive: true });
      await rename(file, trashFile);
      this.cache = null;
      return {
        trashed: `.zhiyue/trash/notes/${path.basename(trashFile)}`,
        library: await this.getLibrary(),
      };
    });
    this.writes = operation.catch(() => {});
    return operation;
  }

  async readDocument(relativePath: unknown, offset: unknown = 0, limit: unknown = 60000): Promise<{
    path: string; offset: number; totalChars: number; text: string; truncated: boolean;
  }> {
    if (typeof relativePath !== 'string') throw statusError('请指定文档路径。', 400);
    const rel = normalize(relativePath);
    const start = typeof offset === 'number' && Number.isSafeInteger(offset) && offset >= 0 ? offset : null;
    const count = typeof limit === 'number' && Number.isSafeInteger(limit) && limit > 0 && limit <= 120000
      ? limit : null;
    if (start === null || count === null) throw statusError('文档读取偏移或长度无效。', 400);
    if (rel !== 'README.md' && !['notes/', 'synthesis/', 'outputs/'].some((prefix) => rel.startsWith(prefix))) {
      throw statusError('只允许读取 README、笔记、综述和成果文档。', 403);
    }
    if (!['.md', '.txt'].includes(path.posix.extname(rel).toLowerCase())) {
      throw statusError('文档读取只支持 Markdown 或文本文件。', 403);
    }
    const file = rel === 'README.md'
      ? await this._rootFile('README.md').catch((error: unknown) => {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw statusError('文档不存在。', 404);
        throw error;
      })
      : await this._resolve(rel).catch((error: unknown) => {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw statusError('文档不存在。', 404);
        throw error;
      });
    const info = await stat(file);
    if (!info.isFile()) throw statusError('文档不存在。', 404);
    if (info.size > 3_000_000) throw statusError('文档过大，请改用检索或分段读取。', 413);
    const text = (await readFile(file, 'utf8')).replace(/^\uFEFF/, '');
    const slice = text.slice(start, start + count);
    return {
      path: rel, offset: start, totalChars: text.length, text: slice,
      truncated: start + slice.length < text.length,
    };
  }

  async _rootFile(name: string): Promise<string> {
    const root = await realpath(this.root);
    const candidate = path.join(root, name);
    const info = await lstat(candidate);
    if (info.isSymbolicLink() || !info.isFile()) throw statusError('不允许访问此文件。', 403);
    const resolved = await realpath(candidate);
    const equal = process.platform === 'win32'
      ? candidate.toLowerCase() === resolved.toLowerCase()
      : candidate === resolved;
    if (!inside(root, resolved) || !equal) throw statusError('不允许符号链接或目录逃逸。', 403);
    return resolved;
  }

  async safeFile(relativePath: unknown): Promise<string> {
    if (typeof relativePath !== 'string' || !this._validRelative(relativePath)) throw statusError('不允许访问此路径', 403);
    const ext = path.posix.extname(relativePath).toLowerCase();
    if (!extensions.has(ext)) throw statusError('文件类型不允许', 403);
    const { allowed } = await this._data();
    const top = relativePath.split('/')[0] as string;
    const indexed = allowed.has(relativePath);
    const readableNote = ['notes', 'synthesis'].includes(top) && ['.md', '.txt'].includes(ext);
    const readableImage = ['notes', 'synthesis', 'outputs'].includes(top) && images.has(ext);
    if (!(indexed && ['.pdf', '.json'].includes(ext)) && !readableNote && !readableImage) {
      throw statusError('文件未列入可访问资料', 403);
    }
    return this._resolve(relativePath);
  }
}
