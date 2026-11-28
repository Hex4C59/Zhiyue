import { shallowReactive } from 'vue';
import { paperDoi, type Publication } from '../../shared/publication.js';

const known = shallowReactive(new Map<string, Publication | null>());
const key = (doi: string) => `zhiyue:publication:v1:${doi}`;

function isPublication(value: unknown, doi: string): value is Publication {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return item.doi === doi && ['title', 'venue', 'year', 'volume', 'issue', 'pages', 'checkedAt']
    .every(field => typeof item[field] === 'string') && Number.isFinite(Date.parse(String(item.checkedAt))) &&
    Array.isArray(item.authors) && item.authors.every(author => typeof author === 'string') &&
    [item.citedBy, item.references].every(n => n === null || typeof n === 'number' && Number.isSafeInteger(n) && n >= 0);
}

export function cachedPublication(value: unknown): Publication | null {
  const doi = paperDoi(value);
  if (!doi) return null;
  if (known.has(doi)) return known.get(doi) ?? null;
  let data: Publication | null = null;
  try {
    const item = JSON.parse(localStorage.getItem(key(doi)) || 'null');
    if (isPublication(item, doi)) data = item;
  } catch { /* 本地缓存不可读时仍可手动联网查询。 */ }
  known.set(doi, data);
  return data;
}

export function rememberPublication(data: Publication): void {
  known.set(data.doi, data);
  try { localStorage.setItem(key(data.doi), JSON.stringify(data)); } catch { /* 当前窗口仍可使用查询结果。 */ }
}

export function paperPublication(paper: { doi?: unknown; publication?: unknown }): Publication | null {
  const doi = paperDoi(paper.doi);
  const local = cachedPublication(doi);
  if (!doi || !isPublication(paper.publication, doi)) return local;
  return local && Date.parse(local.checkedAt) >= Date.parse(paper.publication.checkedAt) ? local : paper.publication;
}

export function venueLabel(paper: { doi?: unknown; venue?: unknown; publication?: unknown }): string {
  const venue = paperPublication(paper)?.venue || paper.venue;
  return typeof venue === 'string' && venue.trim() ? venue.trim() : '待核实';
}
