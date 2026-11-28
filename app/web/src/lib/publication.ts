import { paperDoi, type Publication } from '../../shared/publication.js';
import { statusError } from './errors.js';

const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const count = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;

export async function lookupPublication(value: unknown, request = fetch): Promise<Publication> {
  const doi = paperDoi(value);
  if (!doi) throw statusError('请先在来源记录中补充 DOI。', 400);
  let response: Response;
  try {
    response = await request(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      signal: AbortSignal.timeout(12_000), headers: { Accept: 'application/json' },
    });
  } catch {
    throw statusError('暂时无法连接 Crossref，请稍后重试。', 502);
  }
  if (response.status === 404) throw statusError('Crossref 尚未收录此 DOI。', 404);
  if (!response.ok) throw statusError(`Crossref 查询失败（HTTP ${response.status}），请稍后重试。`, 502);
  const body = await response.json();
  const record = body?.message;
  if (!record || paperDoi(record.DOI) !== doi) throw statusError('Crossref 返回的 DOI 与论文不符。', 502);
  const year = record.issued?.['date-parts']?.[0]?.[0];
  const authors = Array.isArray(record.author) ? record.author.flatMap((author: Record<string, unknown> | null) => {
    const name = text(author?.name) || [text(author?.given), text(author?.family)].filter(Boolean).join(' ');
    return name ? [name] : [];
  }) : [];
  return {
    doi, title: text(record.title?.[0]), venue: text(record['container-title']?.[0]) || text(record.event?.name),
    authors, year: Number.isInteger(year) ? String(year) : '', volume: text(record.volume), issue: text(record.issue),
    pages: text(record.page) || text(record['article-number']), citedBy: count(record['is-referenced-by-count']),
    references: count(record['reference-count']), checkedAt: new Date().toISOString(),
  };
}
