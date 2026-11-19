import { mkdir } from 'node:fs/promises';
import path from 'node:path';

export interface LibraryPaths {
  root: string;
  meta: string;
  readme: string;
  agents: string;
  papers: string;
  notes: string;
  synthesis: string;
  outputs: string;
  catalog: string;
  batches: string;
  data: string;
  uploads: string;
  pi: string;
  piSessions: string;
  cache: string;
  pdfPreview: string;
  tmp: string;
  docs: string;
}

// 文献库对用户只暴露四个内容目录；程序状态、索引、批次和缓存统一放在隐藏的 .zhiyue 下。
export function libraryPaths(root: string): LibraryPaths {
  const base = path.resolve(root);
  const meta = path.join(base, '.zhiyue');
  const data = path.join(meta, 'data');
  const cache = path.join(meta, 'cache');
  return {
    root: base,
    meta,
    readme: path.join(base, 'README.md'),
    agents: path.join(meta, 'AGENTS.md'),
    papers: path.join(base, 'papers'),
    notes: path.join(base, 'notes'),
    synthesis: path.join(base, 'synthesis'),
    outputs: path.join(base, 'outputs'),
    catalog: path.join(meta, 'catalog'),
    batches: path.join(meta, 'batches'),
    data,
    uploads: path.join(data, 'uploads'),
    pi: path.join(data, 'pi'),
    piSessions: path.join(data, 'pi-sessions'),
    cache,
    pdfPreview: path.join(cache, 'pdf-preview'),
    tmp: path.join(meta, 'tmp'),
    docs: path.join(meta, 'docs'),
  };
}

export function resolveLibraryRoot(fromDirectory: string): string {
  const configured = process.env.LITERATURE_LIBRARY;
  return configured ? path.resolve(configured) : path.resolve(fromDirectory, '../../../library');
}

export async function ensureLibrary(paths: LibraryPaths): Promise<void> {
  const directories = [
    paths.root, paths.papers, paths.notes, paths.synthesis, paths.outputs,
    paths.meta, paths.catalog, paths.batches, paths.data, paths.uploads,
    paths.pi, paths.piSessions, paths.cache, paths.pdfPreview, paths.tmp, paths.docs,
  ];
  await Promise.all(directories.map((directory) => mkdir(directory, { recursive: true })));
}
