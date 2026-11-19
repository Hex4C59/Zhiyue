export const esc = (value: unknown): string =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

export const paths: Record<string, string> = {
  book: 'M4 4h6a3 3 0 0 1 2 2 3 3 0 0 1 2-2h6v15h-6a3 3 0 0 0-2 2 3 3 0 0 0-2-2H4z M12 6v15',
  library: 'M4 4h4v16H4z M10 4h4v16h-4z M17 4l4 15-3 1-4-15z',
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
  upload: 'M12 16V4 M7 9l5-5 5 5 M4 20h16',
  refresh: 'M20 7a8 8 0 1 0 1 8 M20 3v5h-5',
  shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
  star: 'M12 3l2.8 5.8 6.4.9-4.6 4.5 1.1 6.4-5.7-3-5.7 3 1.1-6.4-4.6-4.5 6.4-.9z',
  spark: 'M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z',
  plus: 'M12 5v14 M5 12h14',
  history: 'M4 4v6h6 M4 10a8 8 0 1 1 1 7 M12 7v5l3 2',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
  attach: 'M8 13l6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9a7 7 0 0 1 10 10l-9 9',
  arrow: 'M12 20V4 M5 11l7-7 7 7',
  stop: 'M6 6h12v12H6z',
  chevron: 'M6 9l6 6 6-6',
  close: 'M6 6l12 12 M18 6L6 18',
  check: 'M5 12l4 4L19 6',
  external: 'M14 3h7v7 M21 3L10 14 M10 4H4v16h16v-6',
  folder: 'M3 5h7l2 3h9v12H3z',
  edit: 'M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-3a8 8 0 0 1 16 0v3',
  settings: 'M20 7h-9 M14 17H5 M17 17a3 3 0 1 0 6 0 3 3 0 0 0-6 0 M7 7a3 3 0 1 0-6 0 3 3 0 0 0 6 0',
};

export const icon = (name: string): string =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.book}"/></svg>`;

export const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const endpoint = (id: unknown): string => encodeURIComponent(String(id));

export const fileURL = (file: string): string => `/api/file?path=${encodeURIComponent(file)}`;

export interface PaperLike extends Record<string, unknown> {
  title?: string;
  literature_id?: string;
  authors?: string[] | Array<string | { name?: string }> | string;
}

export const titleOf = (paper: PaperLike): string =>
  paper.title || paper.literature_id || '未命名文献';

export const authorText = (paper: PaperLike): string =>
  Array.isArray(paper.authors)
    ? paper.authors.map((author) => (typeof author === 'string' ? author : author.name || '')).join(', ')
    : typeof paper.authors === 'string' && paper.authors ? paper.authors : '作者待核实';

export interface CategoryLike {
  id?: string;
  name?: string;
}

export function categoryChoices(
  categories: Array<string | CategoryLike>,
  fallback = 'papers/09_情感综述调研/网站导入',
): Array<[string, string]> {
  const choices = new Map<string, string>([[fallback, '情感综述调研 / 网站导入（默认）']]);
  for (const category of categories) {
    const id = typeof category === 'string' ? category : category.id || category.name;
    if (!id) continue;
    const parent = String(id)
      .replace(/\\/g, '/')
      .replace(/^papers\//, '')
      .split('/')[0] as string;
    const value = `papers/${parent}/网站导入`;
    if (!choices.has(value)) {
      const label = String(typeof category === 'string' ? category : category.name || parent)
        .replace(/^\d+_/, '');
      choices.set(value, `${label} / 网站导入`);
    }
  }
  return [...choices];
}

export function safeURL(raw: unknown, basePath = ''): string {
  const value = String(raw || '').trim();
  if (!value || /[\u0000-\u001f\u007f]/.test(value) || value.startsWith('//')) return '';
  if (/^https?:\/\//i.test(value)) {
    try { return new URL(value).href; }
    catch { return ''; }
  }
  if (value.startsWith('#')) return value;
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) return '';
  if (/^\/api\/(file\?|uploads\/)/.test(value)) return value;
  // Markdown 相对资源仍通过后端路径校验读取。
  const dir = basePath.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
  const local = value.replace(/\\/g, '/');
  if (local.startsWith('//')) return '';
  const segments = (local.startsWith('/') ? local : `${dir ? dir + '/' : ''}${local}`).split('/');
  const normalized: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (!normalized.length) return '';
      normalized.pop();
    } else normalized.push(segment);
  }
  return normalized.length ? fileURL(normalized.join('/')) : '';
}

// 先转义原文再应用行内格式，不接受笔记或模型输出中的原始 HTML。
function inline(source: string, base = ''): string {
  const slots: string[] = [];
  const token = (html: string): string => {
    const index = slots.push(html) - 1;
    return `\u0001${index}\u0002`;
  };
  let input = String(source).replace(/[\u0001\u0002]/g, '');
  input = input.replace(/`([^`]+)`/g, (_match, code: string) => token(`<code>${esc(code)}</code>`));
  input = input.replace(/(!?)\[([^\]\n]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g,
    (_match, image: string, label: string, raw: string) => {
      const url = safeURL(raw, base);
      if (!url) return token(esc(label));
      if (image) {
        return token(`<img src="${esc(url)}" alt="${esc(label)}" loading="lazy" referrerpolicy="no-referrer">`);
      }
      return token(`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`);
    });
  input = esc(input)
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
  return input.replace(/\u0001(\d+)\u0002/g, (_match, index: string) => slots[Number(index)] || '');
}

export function markdown(source: unknown, base = ''): string {
  const lines = String(source || '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  let html = '';
  let paragraph: string[] = [];
  let list = '';
  const flush = (): void => {
    if (paragraph.length) {
      html += `<p>${paragraph.map((line) => inline(line, base)).join('<br>')}</p>`;
      paragraph = [];
    }
    if (list) {
      html += `</${list}>`;
      list = '';
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    if (/^\s*```/.test(line)) {
      flush();
      const code: string[] = [];
      while (++i < lines.length && !/^\s*```/.test(lines[i] as string)) code.push(lines[i] as string);
      html += `<pre><code>${esc(code.join('\n'))}</code></pre>`;
      continue;
    }
    const head = /^(#{1,6})\s+(.+)$/.exec(line);
    if (head) {
      flush();
      const level = (head[1] as string).length;
      html += `<h${level}>${inline(head[2] as string, base)}</h${level}>`;
      continue;
    }
    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      flush();
      html += '<hr>';
      continue;
    }
    if (/^>\s?/.test(line)) {
      flush();
      html += `<blockquote>${inline(line.replace(/^>\s?/, ''), base)}</blockquote>`;
      continue;
    }
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[i + 1] as string)
    ) {
      flush();
      const cells = (text: string): string[] => text.trim().replace(/^\||\|$/g, '').split('|');
      html += `<table><thead><tr>${cells(line)
        .map((cell) => `<th>${inline(cell.trim(), base)}</th>`)
        .join('')}</tr></thead><tbody>`;
      i++;
      while (i + 1 < lines.length && (lines[i + 1] as string).includes('|') && (lines[i + 1] as string).trim()) {
        i++;
        html += `<tr>${cells(lines[i] as string)
          .map((cell) => `<td>${inline(cell.trim(), base)}</td>`)
          .join('')}</tr>`;
      }
      html += '</tbody></table>';
      continue;
    }
    const item = /^\s*(?:([-+*])|\d+\.)\s+(.+)$/.exec(line);
    if (item) {
      const kind = item[1] ? 'ul' : 'ol';
      if (paragraph.length || (list && list !== kind)) flush();
      if (!list) {
        html += `<${kind}>`;
        list = kind;
      }
      html += `<li>${inline(item[2] as string, base)}</li>`;
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    if (list) flush();
    paragraph.push(line);
  }
  flush();
  return html;
}

export type ReadStatus = 'unread' | 'reading' | 'read';

export const readLabels: Record<ReadStatus, string> = { unread: '未读', reading: '在读', read: '已读' };

export function readKey(value: unknown): ReadStatus {
  const labels: Record<string, ReadStatus> = {
    未读: 'unread', 待标记: 'unread', 在读: 'reading', 阅读中: 'reading', 已读: 'read', 已读完: 'read', completed: 'read',
  };
  const key = String(value ?? '');
  if (labels[key]) return labels[key] as ReadStatus;
  return key in readLabels ? key as ReadStatus : 'unread';
}
