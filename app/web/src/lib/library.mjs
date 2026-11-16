import { readFile, writeFile, mkdir, rename, realpath, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

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

export class Library {
  constructor({ root, stateDir }) {
    this.root = path.resolve(root);
    this.stateDir = path.resolve(stateDir);
    this.cache = null;
    this.writes = Promise.resolve();
  }

  // No PDF parsing: bibliography and explicitly associated JSON sidecars only.
  async _load() {
    const root = await realpath(this.root);
    const catalog = JSON.parse((await readFile(path.join(root, 'catalog', '文献索引.json'), 'utf8')).replace(/^\uFEFF/, ''));
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
    return { papers, allowed, categories: [...categoryMap.values()].sort((a, b) => a.id.localeCompare(b.id)) };
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
