import { renderMath } from './math';

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
  archive: 'M3 4h18v4H3z M5 8v12h14V8 M10 12h4',
  restore: 'M3 11l4-4 4 4 M7 7v6a5 5 0 0 0 5 5h8',
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
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-3a8 8 0 0 1 16 0v3',
  settings: 'M20 7h-9 M14 17H5 M17 17a3 3 0 1 0 6 0 3 3 0 0 0-6 0 M7 7a3 3 0 1 0-6 0 3 3 0 0 0 6 0',
  panelLeft: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 3v18',
  panelRight: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M15 3v18',
  focus: 'M4 9V5a1 1 0 0 1 1-1h4 M15 4h4a1 1 0 0 1 1 1v4 M20 15v4a1 1 0 0 1-1 1h-4 M9 20H5a1 1 0 0 1-1-1v-4',
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
  if (/^\/api\/(file\?|uploads\/|papers\/L\d+\/translation\/asset\?)/.test(value)) return value;
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

const SAFE_INLINE_TAG = /<(sup|sub|strong|em|b|i)>([^<]*)<\/\1>/gi;

interface ReferenceIndex {
  byNumber: Map<number, string>;
  byAuthorYear: Map<string, number>;
}

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_match, entity: string) => {
      const code = /^[xX]/.test(entity) ? Number.parseInt(entity.slice(1), 16) : Number(entity);
      // PDF 提取结果可能含有无效码点。替换该字符，保留其余表格内容。
      return code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff) ? String.fromCodePoint(code) : '\ufffd';
    })
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (_m, name: string) => ({
      amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    })[name.toLowerCase()] ?? _m);
}

// 先转义原文再应用行内格式，仅放行无属性的简单排版标签（sup/sub/strong/em/b/i），其余原始 HTML 一律转义。
function inline(
  source: string,
  base = '',
  resolveAsset?: (raw: string) => string,
  refs?: ReferenceIndex,
): string {
  const slots: string[] = [];
  const token = (html: string): string => {
    const index = slots.push(html) - 1;
    return `\u0001${index}\u0002`;
  };
  let input = String(source).replace(/[\u0001\u0002]/g, '');
  input = input.replace(/`([^`]+)`/g, (_match, code: string) => token(`<code>${esc(code)}</code>`));
  // 定界符不跨已提取的代码片段，紧跟数字的美元符号不作为结束符。
  input = input.replace(
    /(?<!\\)\\\(([^\u0001\u0002]*?)\\\)|(?<![\\$])\$(?!\$)((?:\\[^\u0001\u0002]|[^\\$\u0001\u0002])+)\$(?![\d$])/g,
    (match, native: string | undefined, dollar: string | undefined) => {
      const tex = (native ?? dollar ?? '').trim();
      return tex ? token(renderMath(tex, false)) : match;
    },
  );
  // 未被公式匹配的转义美元符号还原为普通字符。
  input = input.replace(/\\\$/g, '$');
  // 从内到外放行 MinerU 输出的简单行内排版标签（如 <strong><sup>1</sup></strong>、<sup>†</sup>），内部文本仍走转义。
  for (let depth = 0; depth < 3 && SAFE_INLINE_TAG.test(input); depth++) {
    SAFE_INLINE_TAG.lastIndex = 0;
    input = input.replace(SAFE_INLINE_TAG, (_match, tag: string, inner: string) => {
      const lower = tag.toLowerCase();
      return token(`<${lower}>${esc(inner)}</${lower}>`);
    });
  }
  input = input.replace(/(!?)\[([^\]\n]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g,
    (_match, image: string, label: string, raw: string) => {
      const mapped = image && resolveAsset ? resolveAsset(raw) : raw;
      const url = safeURL(mapped, base);
      if (!url) return token(esc(label));
      if (image) {
        return token(`<img src="${esc(url)}" alt="${esc(label)}" loading="lazy" referrerpolicy="no-referrer">`);
      }
      return token(`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`);
    });
  // 1. 文内数字引用（如 [28]、[29, 27]、[1–3]）关联到文末对应参考文献。
  if (refs && refs.byNumber.size > 0) {
    input = input.replace(/\[(\d{1,3}(?:\s*[,;–—-]\s*\d{1,3})*)\](?!\()/g, (match, inner: string) => {
      let linked = false;
      const rendered = inner.replace(/\d{1,3}/g, (numText: string) => {
        const num = Number(numText);
        if (!refs.byNumber.has(num)) return esc(numText);
        linked = true;
        return `<a href="#ref-${num}" class="md-cite" data-ref="${num}" aria-label="参考文献 ${num}">${num}</a>`;
      });
      return linked ? token(`<span class="md-cite-group">[${rendered}]</span>`) : match;
    });
  }
  // 2. 文内作者-年份引用统一转为紧凑的 [N] 脚注形式（与数字引用一致，悬停预览文献、点击跳转）：
  //    - 括号引用（如 （Busso 等人, 2008）、(Chen 等人, 2022; Wang et al., 2021)）直接替换为 [N]；
  //    - 叙述性引用（如 Wang 等人 (2021)、Chen 等人 (2023a)）保留作者正文，将年份括号替换为 [N]。
  if (refs && refs.byAuthorYear.size > 0) {
    const lookupAuthorYear = (surname: string, rawYear: string): number | undefined => {
      const year = rawYear.toLowerCase();
      return refs.byAuthorYear.get(`${surname.toLowerCase()}|${year}`)
        ?? refs.byAuthorYear.get(`${surname.toLowerCase()}|${year.slice(0, 4)}`);
    };
    const citeLink = (id: number): string =>
      `<a href="#ref-${id}" class="md-cite" data-ref="${id}" aria-label="参考文献 ${id}">${id}</a>`;
    const authorEntry =
      /^([A-Z][A-Za-z'-]{1,24})(?:\s*(?:等人|等|et\s+al\.?|\s+(?:and|&|和)\s+[A-Z][A-Za-z'-]{1,24}))?\s*[,，]\s*((?:19|20)\d{2}[a-z]?)$/;

    // 2a. 括号引用：(Busso 等人, 2008) -> [8]
    input = input.replace(
      /\s*[(（]\s*([A-Z][^()（）\u0001\u0002]{3,160}?(?:19|20)\d{2}[a-z]?)\s*[)）]/g,
      (match, inner: string) => {
        const parts = inner.split(/\s*[;；]\s*/).filter(Boolean);
        const ids: number[] = [];
        for (const part of parts) {
          const m = authorEntry.exec(part.trim());
          if (!m) return match;
          const id = lookupAuthorYear(m[1] as string, m[2] as string);
          if (!id) return match;
          ids.push(id);
        }
        return ids.length ? token(` <span class="md-cite-group">[${ids.map(citeLink).join(', ')}]</span>`) : match;
      },
    );

    // 2b. 叙述性引用：Wang 等人 (2021) -> Wang 等人 [45]
    input = input.replace(
      /\b([A-Z][A-Za-z'-]{1,24})((?:\s*(?:等人|等|et\s+al\.?|\s+(?:and|&|和)\s+[A-Z][A-Za-z'-]{1,24}))?)\s*[(（]\s*((?:19|20)\d{2}[a-z]?)\s*[)）]/g,
      (match, surname: string, suffix: string, year: string) => {
        const id = lookupAuthorYear(surname, year);
        if (!id) return match;
        return `${surname}${suffix}${token(` <span class="md-cite-group">[${citeLink(id)}]</span>`)}`;
      },
    );
  }
  input = esc(input)
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
  for (let pass = 0; pass < 4 && input.includes('\u0001'); pass++) {
    input = input.replace(/\u0001(\d+)\u0002/g, (_match, index: string) => slots[Number(index)] || '');
  }
  return input;
}

/** 仅允许 MinerU 输出的安全表格结构，单元格内容解码实体后仍经 inline() 转义并渲染行内公式。 */
function renderSafeHtmlTable(raw: string, base: string, resolveAsset?: (raw: string) => string): string {
  const rows: string[] = [];
  for (const rowMatch of raw.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells: string[] = [];
    for (const cellMatch of (rowMatch[1] ?? '').matchAll(/<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
      const tag = (cellMatch[1] ?? 'td').toLowerCase();
      const attrs = cellMatch[2] ?? '';
      const colspan = /\bcolspan\s*=\s*["']?(\d{1,2})["']?/i.exec(attrs)?.[1];
      const rowspan = /\browspan\s*=\s*["']?(\d{1,2})["']?/i.exec(attrs)?.[1];
      const attrText = `${colspan ? ` colspan="${colspan}"` : ''}${rowspan ? ` rowspan="${rowspan}"` : ''}`;
      const plain = decodeHtmlEntities(
        (cellMatch[3] ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ''),
      ).trim();
      cells.push(`<${tag}${attrText}>${inline(plain, base, resolveAsset)}</${tag}>`);
    }
    if (cells.length) rows.push(`<tr>${cells.join('')}</tr>`);
  }
  return rows.length ? `<div class="table-wrap"><table><tbody>${rows.join('')}</tbody></table></div>` : '';
}

const STANDALONE_IMAGE = /^!\[[^\]]*\]\([^\s)]+(?:\s+"[^"]*")?\)$/;
const CAPTION_LINE =
  /^(?:(?:图|表)\s*(?:[IVXLCDM]+|\d+)(?:[.．:：\s]|$)|(?:Fig\.?|Figure|Table)\s*(?:[IVXLCDM]+|\d+)(?:[.．:：\s]|$)|\([a-z]\)\s+\S.{0,40}$)/;
const REFERENCES_HEADING = /^#{1,6}\s+(?:(?:\d+\.?|[IVX]+\.?)\s+)?(?:references|bibliography|works\s+cited)\s*$/i;
const REF_ITEM_LINE = /^\s*(?:(\d+)\.|\[(\d+)\])\s+(.+)$/;
const HEADER_STOP_LINE = /^(?:\*{0,2})(?:摘要|关键词|abstract|summary|keywords?|index\s+terms?)(?:\*{0,2})[\s.:：—–-]/i;
const DATE_META_LINE = /^(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{4}\s*年\s*\d{1,2}\s*月(?:\s*\d{1,2}\s*日)?|\d{4}-\d{2}-\d{2})$/i;

function indexAuthorYear(body: string, num: number, byAuthorYear: Map<string, number>): void {
  const yearMatch = /\b((?:19|20)\d{2}[a-z]?)\b/.exec(body);
  if (!yearMatch) return;
  const year = (yearMatch[1] as string).toLowerCase();
  // 第一作者片段（截断在第一个逗号、and 或年份前）
  const head = body.slice(0, yearMatch.index).split(/\s+and\s+/i)[0] ?? '';
  const commaParts = head.split(',');
  const firstSegment = (commaParts[0] ?? '').trim();
  let surname = '';
  if (commaParts.length >= 2 && /^[A-Z][A-Za-z'-]+$/.test(firstSegment)) {
    // 形如 "Busso, C."：逗号前即姓氏
    surname = firstSegment;
  } else {
    // 形如 "Carlos Busso"、"Li-Wei Chen"：取最后一个英文单词作为姓氏
    const words = firstSegment.match(/[A-Za-z][A-Za-z'-]*/g);
    surname = words?.[words.length - 1] ?? '';
  }
  if (!surname || surname.length < 2) return;
  const exactKey = `${surname.toLowerCase()}|${year}`;
  if (!byAuthorYear.has(exactKey)) byAuthorYear.set(exactKey, num);
  const baseKey = `${surname.toLowerCase()}|${year.slice(0, 4)}`;
  if (!byAuthorYear.has(baseKey)) byAuthorYear.set(baseKey, num);
}

function extractReferences(lines: string[]): ReferenceIndex {
  const byNumber = new Map<number, string>();
  const byAuthorYear = new Map<string, number>();
  let inRefs = false;
  let activeNum: number | null = null;
  let seq = 0;
  let pending: string[] = [];

  const flushUnnumbered = (): void => {
    if (!pending.length) return;
    const body = pending.join(' ').trim();
    pending = [];
    if (!body) return;
    seq += 1;
    byNumber.set(seq, body);
    indexAuthorYear(body, seq, byAuthorYear);
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#{1,6}\s+/.test(trimmed)) {
      flushUnnumbered();
      if (REFERENCES_HEADING.test(trimmed)) {
        inRefs = true;
        activeNum = null;
      } else if (inRefs && /^#{1,2}\s+/.test(trimmed)) {
        inRefs = false;
        activeNum = null;
      }
      continue;
    }
    if (!inRefs) continue;
    if (!trimmed) {
      flushUnnumbered();
      continue;
    }
    const match = REF_ITEM_LINE.exec(line);
    if (match) {
      flushUnnumbered();
      const num = Number(match[1] ?? match[2]);
      const body = (match[3] as string).trim();
      if (Number.isInteger(num) && num > 0 && body) {
        seq = Math.max(seq, num);
        byNumber.set(num, body);
        indexAuthorYear(body, num, byAuthorYear);
        activeNum = num;
      }
    } else if (activeNum !== null) {
      const merged = `${byNumber.get(activeNum)} ${trimmed}`;
      byNumber.set(activeNum, merged);
      indexAuthorYear(merged, activeNum, byAuthorYear);
    } else {
      pending.push(trimmed);
    }
  }
  flushUnnumbered();
  return { byNumber, byAuthorYear };
}

export function markdown(source: unknown, base = '', resolveAsset?: (raw: string) => string): string {
  const lines = String(source || '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const refs = extractReferences(lines);
  let html = '';
  let paragraph: string[] = [];
  let list = '';
  let inReferences = false;
  let refSeq = 0;
  let startIndex = 0;

  // 若文首为 H1 论文标题紧跟若干短元信息行（作者、单位、日期），合并为居中排版的 paper-header。
  while (startIndex < lines.length && !(lines[startIndex] as string).trim()) startIndex++;
  const firstHeading = startIndex < lines.length ? /^#\s+(.+)$/.exec(lines[startIndex] as string) : null;
  if (firstHeading) {
    const metaParagraphs: string[] = [];
    let scan = startIndex + 1;
    let current: string[] = [];
    const plainLen = (value: string): number => value.replace(/<[^>]+>/g, '').replace(/[*_`]/g, '').trim().length;
    const pushMeta = (): boolean => {
      if (!current.length) return true;
      const text = current.join(' ').trim();
      current = [];
      if (!text) return true;
      if (plainLen(text) > 420 || HEADER_STOP_LINE.test(text) || /[\u4e00-\u9fff]{12,}/.test(text)) {
        return false;
      }
      metaParagraphs.push(text);
      return metaParagraphs.length <= 8;
    };
    let endMeta = scan;
    for (; scan < lines.length; scan++) {
      const raw = lines[scan] as string;
      const trimmed = raw.trim();
      if (!trimmed) {
        if (!pushMeta()) break;
        endMeta = scan + 1;
        continue;
      }
      if (
        /^#{1,6}\s+/.test(trimmed) ||
        /^(`{3,}|~{3,})/.test(trimmed) ||
        /^(?:\$\$|\\\[|<table\b|!\[|>|[-+*]\s+|\d+\.\s+)/i.test(trimmed) ||
        HEADER_STOP_LINE.test(trimmed)
      ) {
        if (!pushMeta()) break;
        endMeta = scan;
        break;
      }
      current.push(trimmed);
      if (plainLen(current.join(' ')) > 420) break;
    }
    if (scan >= lines.length && pushMeta()) endMeta = scan;
    if (metaParagraphs.length > 0 && metaParagraphs.length <= 8) {
      const metaHtml = metaParagraphs.map((text, idx) => {
        const cls = idx === 0
          ? 'paper-authors'
          : DATE_META_LINE.test(text) ? 'paper-meta paper-date' : 'paper-meta';
        return `<p class="${cls}">${inline(text, base, resolveAsset)}</p>`;
      }).join('');
      html += `<header class="paper-header"><h1>${inline(firstHeading[1] as string, base, resolveAsset)}</h1>${metaHtml}</header>`;
      startIndex = endMeta;
    }
  }

  const nextNonBlankIsRef = (from: number): boolean => {
    for (let j = from + 1; j < lines.length; j++) {
      const t = (lines[j] as string).trim();
      if (!t) continue;
      if (/^#{1,6}\s+/.test(t) || /^(`{3,}|~{3,})/.test(t) || /^<table\b/i.test(t)) return false;
      return true;
    }
    return false;
  };

  const flushRefParagraph = (): void => {
    if (!paragraph.length) return;
    const body = paragraph.join(' ').trim();
    paragraph = [];
    if (!body) return;
    refSeq += 1;
    if (list && list !== 'ol') {
      html += `</${list}>`;
      list = '';
    }
    if (!list) {
      html += `<ol class="md-references"${refSeq !== 1 ? ` start="${refSeq}"` : ''}>`;
      list = 'ol';
    }
    html += `<li id="ref-${refSeq}" data-ref="${refSeq}" value="${refSeq}">${inline(body, base, resolveAsset)}</li>`;
  };

  const flush = (): void => {
    if (inReferences && paragraph.length) {
      flushRefParagraph();
    } else if (paragraph.length) {
      if (paragraph.length === 1) {
        const single = (paragraph[0] as string).trim();
        if (STANDALONE_IMAGE.test(single)) {
          html += `<figure class="md-figure">${inline(single, base, resolveAsset)}</figure>`;
          paragraph = [];
          if (list) { html += `</${list}>`; list = ''; }
          return;
        }
        if (CAPTION_LINE.test(single)) {
          html += `<p class="md-caption">${inline(single, base, resolveAsset, inReferences ? undefined : refs)}</p>`;
          paragraph = [];
          if (list) { html += `</${list}>`; list = ''; }
          return;
        }
      }
      html += `<p>${paragraph.map((line) => inline(line, base, resolveAsset, inReferences ? undefined : refs)).join('<br>')}</p>`;
      paragraph = [];
    }
    if (list) {
      html += `</${list}>`;
      list = '';
    }
  };
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i] as string;
    if (/^\s*<table\b/i.test(line)) {
      flush();
      const tableLines = [line];
      if (!/<\/table>/i.test(line)) {
        while (i + 1 < lines.length) {
          i++;
          tableLines.push(lines[i] as string);
          if (/<\/table>/i.test(lines[i] as string)) break;
        }
      }
      html += renderSafeHtmlTable(tableLines.join('\n'), base, resolveAsset);
      continue;
    }
    const delimiter = /^\s*(\$\$|\\\[)/.exec(line);
    const environment = /^\s*\\begin\{((?:equation|align|alignat|gather)\*?|CD)\}/.exec(line);
    if (delimiter || environment) {
      let rendered = false;
      const closing = delimiter ? (delimiter[1] === '$$' ? '$$' : '\\]') : '\\end{' + environment?.[1] + '}';
      const parts: string[] = [];
      for (let end = i; end < lines.length; end++) {
        const raw = lines[end] as string;
        const current = (end === i && delimiter ? raw.slice(delimiter[0].length) : raw).trimEnd();
        if (end !== i && (!current.trim() || /^\s*(?:~{3,}|\x60{3,}|#{1,6}\s)/.test(current))) break;
        if (current.endsWith(closing) && !current.slice(0, -closing.length).endsWith('\\')) {
          parts.push(delimiter ? current.slice(0, -closing.length) : current);
          const tex = parts.join('\n').trim();
          if (tex) {
            flush();
            html += `<div class="math-block">${renderMath(tex, true)}</div>`;
            i = end;
            rendered = true;
          }
          break;
        }
        parts.push(current);
      }
      // 未闭合的公式按普通 Markdown 显示，保留流式输出中的后续正文。
      if (rendered) continue;
    }
    // 代码围栏：语言标记为 math/latex/tex 时按公式渲染，其余保持代码块。
    const fence = /^\s*(`{3,}|~{3,})\s*([\w+-]*)\s*$/.exec(line);
    if (fence) {
      flush();
      const marker = fence[1] as string;
      const lang = (fence[2] as string).toLowerCase();
      const isMath = lang === 'math' || lang === 'latex' || lang === 'tex';
      const body: string[] = [];
      const closeRe = new RegExp(`^\\s*${marker[0]}{${marker.length},}\\s*$`);
      while (++i < lines.length && !closeRe.test(lines[i] as string)) body.push(lines[i] as string);
      if (isMath) {
        html += `<div class="math-block">${renderMath(body.join('\n'), true)}</div>`;
      } else {
        html += `<pre><code>${esc(body.join('\n'))}</code></pre>`;
      }
      continue;
    }
    const head = /^(#{1,6})\s+(.+)$/.exec(line);
    if (head) {
      flush();
      const level = (head[1] as string).length;
      if (REFERENCES_HEADING.test(line.trim())) {
        inReferences = true;
      } else if (inReferences && level <= 2) {
        inReferences = false;
      }
      html += `<h${level}>${inline(head[2] as string, base, resolveAsset)}</h${level}>`;
      continue;
    }
    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      flush();
      html += '<hr>';
      continue;
    }
    if (/^>\s?/.test(line)) {
      flush();
      html += `<blockquote>${inline(line.replace(/^>\s?/, ''), base, resolveAsset, inReferences ? undefined : refs)}</blockquote>`;
      continue;
    }
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[i + 1] as string)
    ) {
      flush();
      const cells = (text: string): string[] => text.trim().replace(/^\||\|$/g, '').split('|');
      html += `<div class="table-wrap"><table><thead><tr>${cells(line)
        .map((cell) => `<th>${inline(cell.trim(), base, resolveAsset)}</th>`)
        .join('')}</tr></thead><tbody>`;
      i++;
      while (i + 1 < lines.length && (lines[i + 1] as string).includes('|') && (lines[i + 1] as string).trim()) {
        i++;
        html += `<tr>${cells(lines[i] as string)
          .map((cell) => `<td>${inline(cell.trim(), base, resolveAsset)}</td>`)
          .join('')}</tr>`;
      }
      html += '</tbody></table></div>';
      continue;
    }
    if (inReferences) {
      const refMatch = REF_ITEM_LINE.exec(line);
      if (refMatch) {
        flushRefParagraph();
        const num = Number(refMatch[1] ?? refMatch[2]);
        const body = (refMatch[3] as string).trim();
        refSeq = Math.max(refSeq, num);
        if (list && list !== 'ol') flush();
        if (!list) {
          html += `<ol class="md-references"${num !== 1 ? ` start="${num}"` : ''}>`;
          list = 'ol';
        }
        html += `<li id="ref-${num}" data-ref="${num}" value="${num}">${inline(body, base, resolveAsset)}</li>`;
        continue;
      }
      if (!line.trim()) {
        flushRefParagraph();
        if (list === 'ol' && nextNonBlankIsRef(i)) continue;
        flush();
        continue;
      }
      paragraph.push(line);
      continue;
    }
    const item = /^\s*(?:([-+*])|(\d+)\.)\s+(.+)$/.exec(line);
    if (item) {
      const kind = item[1] ? 'ul' : 'ol';
      const num = item[2] ? Number(item[2]) : null;
      if (paragraph.length || (list && list !== kind)) flush();
      if (!list) {
        html += kind === 'ol' && num && num !== 1 ? `<ol start="${num}">` : `<${kind}>`;
        list = kind;
      }
      html += `<li${num ? ` value="${num}"` : ''}>${inline(item[3] as string, base, resolveAsset, inReferences ? undefined : refs)}</li>`;
      continue;
    }
    if (!line.trim()) {
      // 参考文献条目之间常有空行；保持在同一个 <ol class="md-references"> 内，避免编号重置。
      if (inReferences && list === 'ol' && nextNonBlankIsRef(i)) continue;
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
