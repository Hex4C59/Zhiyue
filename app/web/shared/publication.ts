export interface Publication {
  doi: string;
  title: string;
  venue: string;
  authors: string[];
  year: string;
  volume: string;
  issue: string;
  pages: string;
  citedBy: number | null;
  references: number | null;
  checkedAt: string;
}

export function paperDoi(value: unknown): string {
  if (typeof value !== 'string') return '';
  const doi = value.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').toLowerCase();
  return doi.length <= 255 && /^10\.\d{4,9}\/[^\s<>]+$/.test(doi) ? doi : '';
}
