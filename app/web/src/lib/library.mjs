import { readFile, writeFile, mkdir, rename, realpath, stat, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { libraryPaths } from './paths.mjs';

const statuses = new Set(['unread', 'reading', 'read']);
const images = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const extensions = new Set(['.pdf', '.md', '.txt', '.json', ...images]);
const copy = value => structuredClone(value);
const normalize = value => String(value).replaceAll('\\', '/');
const denied = parts => parts.some(p => p.startsWith('.') || /申请资料|凭据|credentials|secrets/i.test(p));
const inside = (base, target) => {
  const rel = path.relative(base, target);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
};
const failure = (message, statusCode = 403) => Object.assign(new Error(message), { statusCode });
const categoryName = value => String(value).replace(/^\d+_/, '');
const reservedCategory = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

export class Library {
  constructor({ root, stateDir, categoryCommand }) {
    this.root = path.resolve(root);
    this.stateDir = path.resolve(stateDir);
    this.cache = null;
    this.writes = Promise.resolve();
    // 分类改名由 Python 在库写锁下完成；Node 只做参数校验，新建分类只做 mkdir。
    this.categoryCommand = categoryCommand ?? (() => Promise.reject(failure('分类操作需要Python文献工具。', 500)));
  }

  // No PDF parsing: bibliography and explicitly associated JSON sidecars only.
  async _load() {
    const root = await realpath(this.root);
    const catalog = JSON.parse((await readFile(path.join(libraryPaths(root).catalog, '文献索引.json'), 'utf8')).replace(/^\uFEFF/, ''));
    const allowed = new Set();
    const add = value => {
      if (typeof value !== 'string') return;
      const rel = normalize(value);
      if (this._validRelative(rel)) allowed.add(rel);
    };
    const records = catalog.records ?? [];
    const indexRecord = r => {
      if (path.extname(r.file ?? '').toLowerCase() === '.pdf') add(r.file);
      if (path.extname(r.source_record ?? '').toLowerCase() === '.json') add(r.source_record);
      for (const version of r.versions ?? []) indexRecord(version);
    };
    records.forEach(indexRecord);
    const notes = new Map();
    const walk = async (dir, prefix) => {
      for (const item of await readdir(dir, { withFileTypes: true }).catch(e => { if (e.code === 'ENOENT') return []; throw e; })) {
        const rel = `${prefix}/${item.name}`;
        if (!this._validRelative(rel) || item.isSymbolicLink()) continue;
        if (item.isDirectory()) await walk(path.join(dir, item.name), rel);
        else if (item.isFile() && path.extname(item.name).toLowerCase() === '.md') {
          const id = item.name.match(/(?:^|[^A-Za-z0-9])(L\d+)(?=[^0-9]|$)/i)?.[1]?.toUpperCase();
          if (id) {
            const title = item.name.replace(/\.md$/i, '');
            if (!notes.has(id)) notes.set(id, []);
            notes.get(id).push({ path: rel, title });
          }
        }
      }
    };
    await walk(path.join(root, 'notes'), 'notes');
    const papers = await Promise.all(records.map(async record => {
      const file = normalize(record.file ?? '');
      const parts = file.split('/');
      const category = parts[0] === 'papers' ? parts[1] ?? '' : '';
      const subcategory = parts.length > 3 ? parts[2] : '';
      const id = record.literature_id;
      let titleZh = record.display_title_zh ?? '';
      if (record.source_record && allowed.has(normalize(record.source_record))) {
        try {
          const sourcePath = await this._resolve(normalize(record.source_record));
          const source = JSON.parse((await readFile(sourcePath, 'utf8')).replace(/^\uFEFF/, ''));
          titleZh = source.display_title_zh || titleZh;
        } catch { /* Missing or unsafe sidecar does not hide a catalog entry. */ }
      }
      const authors = Array.isArray(record.authors) ? record.authors.map(String) : String(record.authors ?? '').split(/[;；]/).map(s => s.trim()).filter(Boolean);
      return { ...record, id, file, authors, titleZh, category, subcategory, notes: notes.get(id) ?? [] };
    }));
    const categoryMap = new Map();
    for (const p of papers) {
      if (!categoryMap.has(p.category)) categoryMap.set(p.category, { id: p.category, name: p.category, count: 0, children: [] });
      const c = categoryMap.get(p.category);
      c.count++;
      if (p.subcategory) {
        const id = `${p.category}/${p.subcategory}`;
        let child = c.children.find(x => x.id === id);
        if (!child) c.children.push(child = { id, name: p.subcategory, count: 0 });
        child.count++;
      }
    }
    // 空文件夹也属于分类，需要和已归档文献一起出现在侧栏。
    for (const folder of await this._paperFolders()) {
      if (!categoryMap.has(folder.name)) {
        categoryMap.set(folder.name, { id: folder.name, name: folder.name, count: 0, children: [] });
      }
      const category = categoryMap.get(folder.name);
      for (const name of folder.children) {
        const id = `${folder.name}/${name}`;
        if (!category.children.some(child => child.id === id)) category.children.push({ id, name, count: 0 });
      }
    }
    const categories = [...categoryMap.values()].sort((a, b) => a.id.localeCompare(b.id));
    for (const category of categories) category.children.sort((a, b) => a.id.localeCompare(b.id));
    return { papers, allowed, categories };
  }

  async _paperFolders() {
    const base = path.join(this.root, 'papers');
    const folders = [];
    let entries;
    try { entries = await readdir(base, { withFileTypes: true }); }
    catch (e) { if (e.code === 'ENOENT') return folders; throw e; }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      if (!this._validRelative(`papers/${entry.name}`)) continue;
      const children = [];
      let inner;
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

  _validRelative(rel) {
    if (!rel || /[\\\x00-\x1f:%?#]/.test(rel) || path.posix.isAbsolute(rel)) return false;
    const parts = rel.split('/');
    return ['papers', 'notes', 'synthesis', 'outputs'].includes(parts[0]) && parts.length > 1 &&
      parts.every(p => p && p !== '..' && p !== '.') && !denied(parts);
  }

  async _resolve(rel) {
    if (!this._validRelative(rel)) throw failure('不允许访问此路径');
    const root = await realpath(this.root);
    const candidate = path.resolve(root, ...rel.split('/'));
    const resolved = await realpath(candidate);
    // Reject aliases too: a catalog entry must not lend access to an unindexed target.
    const equal = process.platform === 'win32' ? candidate.toLowerCase() === resolved.toLowerCase() : candidate === resolved;
    if (!inside(root, resolved) || !equal || !this._validRelative(normalize(path.relative(root, resolved)))) throw failure('不允许符号链接或目录逃逸');
    if (!(await stat(resolved)).isFile()) throw failure('仅允许普通文件');
    return resolved;
  }

  async _data() {
    if (!this.cache) this.cache = this._load().catch(e => { this.cache = null; throw e; });
    return this.cache;
  }

  async _reading() {
    try { return JSON.parse((await readFile(path.join(this.stateDir, 'reading.json'), 'utf8')).replace(/^\uFEFF/, '')); }
    catch (e) { if (e.code === 'ENOENT') return {}; throw e; }
  }

  async getLibrary() {
    const [data, reading] = await Promise.all([this._data(), this._reading()]);
    const papers = data.papers.map(p => ({ ...p, readStatus: statuses.has(reading[p.id]?.readStatus) ? reading[p.id].readStatus : 'unread', starred: reading[p.id]?.starred === true }));
    const stats = { total: papers.length, unread: 0, reading: 0, read: 0, starred: 0, withNotes: 0 };
    for (const p of papers) { stats[p.readStatus]++; if (p.starred) stats.starred++; if (p.notes.length) stats.withNotes++; }
    return copy({ papers, categories: data.categories, stats });
  }

  async getPaper(id) {
    return (await this.getLibrary()).papers.find(p => p.id === id) ?? null;
  }

  async updatePaper(id, patch) {
    if (!patch || typeof patch !== 'object' || Object.keys(patch).some(k => !['readStatus', 'starred'].includes(k)) ||
        ('readStatus' in patch && !statuses.has(patch.readStatus)) || ('starred' in patch && typeof patch.starred !== 'boolean')) throw failure('阅读状态或收藏字段无效', 400);
    if (!await this.getPaper(id)) throw failure('文献不存在', 404);
    const operation = this.writes.then(async () => {
      const reading = await this._reading();
      reading[id] = { readStatus: 'unread', starred: false, ...reading[id], ...patch };
      await mkdir(this.stateDir, { recursive: true });
      const target = path.join(this.stateDir, 'reading.json');
      const temp = `${target}.${randomUUID()}.tmp`;
      await writeFile(temp, JSON.stringify(reading, null, 2), { mode: 0o600 });
      await rename(temp, target);
      return this.getPaper(id);
    });
    this.writes = operation.catch(() => {});
    return operation;
  }

  async refresh() { this.cache = null; }

  _categoryName(value) {
    if (typeof value !== 'string') throw failure('文件夹名称无效。', 400);
    const name = value.trim().replace(/^\d+_/, '').trim().replace(/[. ]+$/, '');
    if (!name) throw failure('请输入文件夹名称。', 400);
    if (name.length > 60) throw failure('文件夹名称不能超过 60 个字符。', 400);
    if (name.startsWith('.') || /[\\/:*?"<>|\x00-\x1f]/.test(name)) throw failure('文件夹名称包含不允许的字符。', 400);
    if (reservedCategory.test(name)) throw failure('该名称不能用作文件夹。', 400);
    return name;
  }

  async _folderNames(dir) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch (e) { if (e.code === 'ENOENT') return []; throw e; }
    return entries.filter(entry => entry.isDirectory() && !entry.isSymbolicLink()).map(entry => entry.name);
  }

  async _createTopFolder(base, name) {
    const folders = await this._folderNames(base);
    if (folders.some(folder => categoryName(folder).toLocaleLowerCase() === name.toLocaleLowerCase())) {
      throw failure('同名文件夹已存在。', 409);
    }
    let last = 0;
    for (const folder of folders) {
      const match = /^(\d+)_/.exec(folder);
      if (match) last = Math.max(last, Number(match[1]));
    }
    const folder = `${String(last + 1).padStart(2, '0')}_${name}`;
    if (!this._validRelative(`papers/${folder}`)) throw failure('该名称不能用作文件夹。', 400);
    try { await mkdir(path.join(base, folder)); }
    catch (e) { if (e.code === 'EEXIST') throw failure('同名文件夹已存在。', 409); throw e; }
    return folder;
  }

  async createCategory(value) {
    const name = this._categoryName(value);
    const operation = this.writes.then(async () => {
      const base = path.join(this.root, 'papers');
      await mkdir(base, { recursive: true });
      const folder = await this._createTopFolder(base, name);
      this.cache = null;
      return { category: folder, subcategory: '' };
    });
    this.writes = operation.catch(() => {});
    return operation;
  }

  async ensureCategory(value) {
    const operation = this.writes.then(() => this._ensureCategory(value));
    this.writes = operation.catch(() => {});
    return operation;
  }

  // 导入前把用户选定的分类落到磁盘；顶层缺号时沿用新建分类的编号规则。
  async _ensureCategory(value) {
    if (typeof value !== 'string' || !value.startsWith('papers/')) throw failure('分类目录必须位于 papers/ 内。', 400);
    const parts = value.split('/');
    if (parts.length < 2 || parts.length > 3 || parts.slice(1).some(part =>
      !part || part === '.' || part === '..' || /[\\/]/.test(part))) throw failure('文件夹路径无效。', 400);
    const base = path.join(this.root, 'papers');
    await mkdir(base, { recursive: true });
    const topName = categoryName(parts[1]);
    if (!topName) throw failure('请输入文件夹名称。', 400);
    let folders = await this._folderNames(base);
    let folder = folders.find(name => categoryName(name).toLocaleLowerCase() === topName.toLocaleLowerCase());
    if (!folder) {
      try { folder = await this._createTopFolder(base, topName); }
      catch (e) {
        if (e.statusCode !== 409) throw e;
        folders = await this._folderNames(base);
        folder = folders.find(name => categoryName(name).toLocaleLowerCase() === topName.toLocaleLowerCase());
        if (!folder) throw e;
      }
    }
    let current = path.join(base, folder);
    for (const part of parts.slice(2)) {
      const next = path.join(current, part);
      try { await mkdir(next); }
      catch (e) { if (e.code !== 'EEXIST') throw e; }
      const info = await lstat(next).catch(() => null);
      if (!info?.isDirectory() || info.isSymbolicLink()) throw failure('分类路径不是普通目录。', 400);
      current = next;
    }
    const rel = path.relative(this.root, current).split(path.sep).join('/');
    if (!this._validRelative(rel)) throw failure('分类目录无效。', 400);
    this.cache = null;
    return rel;
  }

  async renameCategory(category, subcategory, value) {
    const name = this._categoryName(value);
    const parts = subcategory ? [category, subcategory] : [category];
    const plain = part => typeof part === 'string' && part && part !== '.' && part !== '..' && !/[\\/]/.test(part);
    if (parts.length > 2 || !parts.every(plain)) throw failure('文件夹路径无效。', 400);
    const rel = `papers/${parts.join('/')}`;
    if (!this._validRelative(rel)) throw failure('文件夹路径无效。', 400);
    const args = ['rename-category', '--category', category, '--name', name];
    if (subcategory) args.push('--subcategory', subcategory);
    const result = await this.categoryCommand(args);
    this.cache = null;
    return result;
  }

  async safeFile(relativePath) {
    if (typeof relativePath !== 'string' || !this._validRelative(relativePath)) throw failure('不允许访问此路径');
    const ext = path.posix.extname(relativePath).toLowerCase();
    if (!extensions.has(ext)) throw failure('文件类型不允许');
    const { allowed } = await this._data();
    const top = relativePath.split('/')[0];
    const indexed = allowed.has(relativePath);
    const readableNote = ['notes', 'synthesis'].includes(top) && ['.md', '.txt'].includes(ext);
    const readableImage = ['notes', 'synthesis', 'outputs'].includes(top) && images.has(ext);
    if (!(indexed && ['.pdf', '.json'].includes(ext)) && !readableNote && !readableImage) throw failure('文件未列入可访问资料');
    return this._resolve(relativePath);
  }
}
