import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, realpath, stat, lstat, open } from 'node:fs/promises';
import path from 'node:path';
import { libraryPaths } from './paths.js';
import { appPaths } from './appPaths.js';
import { statusError } from './errors.js';
import { DEFAULT_PDF_PREVIEW_SCALE, PDF_PREVIEW_SCALES } from '../../shared/pdfScales.js';
import type { PDFPreviewScale } from '../../shared/pdfScales.js';
import type { TextLayer, TextLine, TextWord } from '../../shared/contracts.js';

export type { TextLayer, TextLine, TextWord };

interface RenderResult {
  page: number;
  totalPages: number;
  textLayer?: TextLayer;
  error?: string;
  code?: string;
}

interface CacheMeta {
  key: string;
  page: number;
  totalPages: number;
  source: string;
  size: number;
  mtimeMs: number;
  textLayer: TextLayer;
}

export interface PreviewResult {
  file: string;
  totalPages: number;
  page: number;
  textLayer: TextLayer;
}

const script = (): string => path.join(appPaths().pythonDir, 'render.py');
const sourceChanged = Symbol('source-changed');
type PreviewWork = PreviewResult | typeof sourceChanged;
const inflight = new Map<string, Promise<PreviewWork>>();
const waiting: Array<() => void> = [];
let running = 0;
const inside = (root: string, file: string): boolean => {
  const rel = path.relative(root, file);
  return !path.isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${path.sep}`);
};

function validTextLayer(layer: unknown): layer is TextLayer {
  if (!layer || typeof layer !== 'object') return false;
  const candidate = layer as Partial<TextLayer> & { lines?: unknown };
  const numbers = [candidate.width, candidate.height];
  if (!numbers.every((v) => typeof v === 'number' && Number.isFinite(v) && v > 0)) return false;
  if (typeof candidate.text !== 'string' || candidate.text.length > 200000) return false;
  if (typeof candidate.hasText !== 'boolean' || !Array.isArray(candidate.lines) || candidate.lines.length > 20000) return false;
  let count = 0;
  return (candidate.lines as unknown[]).every((line) => {
    if (!line || typeof line !== 'object') return false;
    const words = (line as { words?: unknown }).words;
    if (!Array.isArray(words)) return false;
    return words.every((word) => {
      if (!word || typeof word !== 'object') return false;
      const item = word as Partial<TextWord>;
      count++;
      return count <= 20000 && typeof item.text === 'string' && item.text.length <= 200000 &&
        [item.x, item.y, item.width, item.height].every((v) => typeof v === 'number' && Number.isFinite(v)) &&
        (item.width ?? 0) > 0 && (item.height ?? 0) > 0 && [0, 90, 180, 270].includes(item.rotation ?? -1);
    });
  });
}

async function validateCachePath(root: string, target: string, file = false): Promise<void> {
  if (target === root || !inside(root, target)) throw statusError('预览缓存目录超出项目。');
  const parts = path.relative(root, target).split(path.sep);
  let current = root;
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i] as string);
    let info;
    try { info = await lstat(current); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    const resolved = await realpath(current);
    const same = process.platform === 'win32'
      ? current.toLowerCase() === resolved.toLowerCase()
      : current === resolved;
    const expectedType = file && i === parts.length - 1 ? info.isFile() : info.isDirectory();
    if (info.isSymbolicLink() || !same || !inside(root, resolved) || !expectedType) {
      throw statusError('预览缓存不能包含符号链接、路径别名或非预期文件类型。');
    }
  }
}

async function limited<T>(work: () => Promise<T>): Promise<T> {
  if (running >= 2) await new Promise<void>((resolve) => waiting.push(resolve));
  else running++;
  try { return await work(); }
  finally {
    const next = waiting.shift();
    if (next) next();
    else running--;
  }
}

async function isPng(file: string, scale: number): Promise<boolean> {
  let handle;
  try {
    handle = await open(file, 'r');
    const header = Buffer.alloc(24);
    const { bytesRead } = await handle.read(header, 0, 24, 0);
    const width = header.readUInt32BE(16);
    const height = header.readUInt32BE(20);
    return bytesRead === 24 && header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      header.toString('ascii', 12, 16) === 'IHDR' && width > 0 && height > 0 &&
      Math.abs(Math.max(width, height) - scale) <= 1;
  } catch { return false; }
  finally { await handle?.close(); }
}

function render(
  python: string, root: string, source: string, page: number, output: string,
  scale: PDFPreviewScale, reuseText: boolean,
): Promise<RenderResult> {
  return new Promise<RenderResult>((resolve, reject) => {
    const args = [
      script(), '--root', root, '--file', source, '--page', String(page), '--output', output, '--scale-to', String(scale),
    ];
    if (reuseText) args.push('--skip-text');
    const proc = spawn(python, args, {
      cwd: root, shell: false, windowsHide: true, detached: process.platform !== 'win32',
      env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let tooLarge = false;
    const stop = (): void => {
      if (!proc.pid || proc.exitCode !== null || proc.signalCode !== null) return;
      if (process.platform === 'win32') {
        const killer = spawn(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/taskkill.exe'),
          ['/PID', String(proc.pid), '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore', timeout: 5000 });
        killer.on('error', () => proc.kill());
      } else {
        try { process.kill(-proc.pid, 'SIGKILL'); } catch { proc.kill('SIGKILL'); }
      }
    };
    const timer = setTimeout(() => { timedOut = true; stop(); }, 45000);
    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString('utf8');
      if (stdout.length > 4_000_000) { tooLarge = true; stop(); }
    });
    proc.stderr.on('data', (data: Buffer) => { stderr = (stderr + data.toString('utf8')).slice(-3000); });
    proc.once('error', (e: Error) => { clearTimeout(timer); reject(statusError(`无法启动PDF预览：${e.message}`, 500)); });
    proc.once('close', (code: number | null) => {
      clearTimeout(timer);
      if (timedOut) return reject(statusError('PDF预览超过45秒，请稍后重试。', 500));
      if (tooLarge) return reject(statusError('PDF预览返回数据过大。', 500));
      try {
        const result = JSON.parse(stdout) as RenderResult;
        if (code !== 0 || result.error) {
          const statusCode = result.code === 'invalid_request' ? 400 : 500;
          throw statusError(result.error || 'PDF渲染失败。', statusCode);
        }
        resolve(result);
      } catch (e) {
        reject(e instanceof Error && 'statusCode' in e
          ? e
          : statusError(`PDF渲染失败：${stderr || (e as Error).message}`, 500));
      }
    });
  });
}

interface CacheLocation {
  base: string;
  source: string;
  size: number;
  mtimeMs: number;
  key: string;
  directory: string;
  png: string;
  metaFile: string;
  page: number;
  scale: PDFPreviewScale;
}

async function readCache(location: CacheLocation): Promise<{ meta?: CacheMeta; result?: PreviewResult }> {
  const { base, directory, metaFile, png, page, scale, key, source, size, mtimeMs } = location;
  await validateCachePath(base, directory);
  await validateCachePath(base, metaFile, true);
  await validateCachePath(base, png, true);
  let meta: CacheMeta | undefined;
  try {
    const value = JSON.parse(await readFile(metaFile, 'utf8')) as CacheMeta | null;
    if (value && value.page === page && Number.isSafeInteger(value.totalPages) && value.totalPages >= page &&
      value.key === key && value.source === source && value.size === size && value.mtimeMs === mtimeMs &&
      validTextLayer(value.textLayer)) meta = value;
  } catch (error) {
    // 缺失或损坏的元数据可重建；权限、设备等未知故障保留给调用方。
    if (!(error instanceof SyntaxError) && (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return meta && await isPng(png, scale)
    ? { meta, result: { file: png, totalPages: meta.totalPages, page, textLayer: meta.textLayer } }
    : { meta };
}

async function sourceInfo(base: string, source: string) {
  const resolved = await realpath(source);
  const same = process.platform === 'win32'
    ? resolved.toLowerCase() === source.toLowerCase()
    : resolved === source;
  // 排队和重试期间目录可能被替换为链接，不能仅凭 stat 接受新的路径目标。
  if (!same || !inside(base, resolved)) throw statusError('PDF原文路径已变化，请重新打开文献。', 403);
  return stat(resolved);
}

async function sourceMatches(location: CacheLocation): Promise<boolean> {
  const current = await sourceInfo(location.base, location.source);
  return current.isFile() && current.size === location.size && current.mtimeMs === location.mtimeMs;
}

async function renderMissing(location: CacheLocation, python: string): Promise<PreviewWork> {
  const { base, source, directory, metaFile, png, page, scale, key, size, mtimeMs } = location;
  // 等待名额期间可能有人替换原文；先释放旧请求的名额，再由外层用新签名重试。
  if (!await sourceMatches(location)) return sourceChanged;
  const cached = await readCache(location);
  if (cached.result) return await sourceMatches(location) ? cached.result : sourceChanged;
  await mkdir(directory, { recursive: true });
  await validateCachePath(base, directory);
  const data = await render(python, base, source, page, png, scale, !!cached.meta);
  const textLayer = cached.meta?.textLayer ?? data.textLayer;
  const invalid = data.page !== page || !Number.isSafeInteger(data.totalPages) || data.totalPages < page ||
    !validTextLayer(textLayer) || !await isPng(png, scale);
  if (invalid) throw statusError('PDF预览输出无效。', 500);
  if (!await sourceMatches(location)) return sourceChanged;
  if (!cached.meta) {
    const meta: CacheMeta = { key, page, totalPages: data.totalPages, source, size, mtimeMs, textLayer };
    const temp = `${metaFile}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(meta, null, 2));
    await rename(temp, metaFile);
  }
  return { file: png, totalPages: data.totalPages, page, textLayer };
}

// file 必须先经过 Library.safeFile 校验，预览只写派生缓存。
export async function previewPaper({
  root, python, file, page: requestedPage = 1, scale: requestedScale = DEFAULT_PDF_PREVIEW_SCALE,
}: {
  root: string;
  python: string;
  file: string;
  page?: number | string;
  scale?: number | string;
}): Promise<PreviewResult> {
  try {
    const page = typeof requestedPage === 'string' && /^[1-9]\d*$/.test(requestedPage)
      ? Number(requestedPage)
      : requestedPage;
    if (typeof page !== 'number' || !Number.isSafeInteger(page) || page < 1) throw statusError('PDF页序必须是大于零的整数。');
    const scale = PDF_PREVIEW_SCALES.find((value) => value === requestedScale || String(value) === requestedScale);
    if (!scale) throw statusError('不支持的 PDF 预览分辨率。');
    const [base, source] = await Promise.all([realpath(root), realpath(file)]);
    if (!inside(base, source) || path.extname(source).toLowerCase() !== '.pdf') throw statusError('只允许预览项目内已验证的PDF。');
    for (let attempt = 0; attempt < 2; attempt++) {
      const info = await sourceInfo(base, source);
      if (!info.isFile()) throw statusError('PDF文件不存在。');
      const key = createHash('sha256').update(JSON.stringify([source, info.size, info.mtimeMs, page])).digest('hex');
      const directory = path.join(libraryPaths(base).pdfPreview, key);
      const png = path.join(directory, scale === DEFAULT_PDF_PREVIEW_SCALE ? 'page.png' : `page-${scale}.png`);
      const location: CacheLocation = {
        base, source, key, directory, png, metaFile: path.join(directory, 'meta.json'),
        size: info.size, mtimeMs: info.mtimeMs, page, scale,
      };
      // 有效缓存只做文件与内容校验，不等待两个慢渲染名额。
      const cached = await readCache(location);
      if (cached.result) {
        if (await sourceMatches(location)) return cached.result;
        continue;
      }
      let work = inflight.get(png);
      const ownsWork = !work;
      if (!work) {
        work = limited(() => renderMissing(location, python));
        inflight.set(png, work);
      }
      try {
        const result = await work;
        if (result !== sourceChanged) return result;
      } finally {
        if (ownsWork && inflight.get(png) === work) inflight.delete(png);
      }
    }
    throw statusError('PDF原文正在变化，请稍后重新打开。', 409);
  } catch (e) {
    if (e && typeof e === 'object' && 'statusCode' in e) throw e;
    const statusCode = (e as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 500;
    throw Object.assign(new Error(`PDF预览失败：${(e as Error).message}`), { statusCode, cause: e });
  }
}

/**
 * 只取一页的文字层，命中缓存时不碰 PNG。
 * 阅读器打开一页会同时请求预览图和文字层；两者走同一份 meta.json，但文字层不需要
 * 重新校验整条路径、也不需要渲染名额。命中返回，未命中返回 null 由调用方回退到 previewPaper。
 */
export async function previewTextLayer({
  root, file, page: requestedPage = 1,
}: { root: string; file: string; page?: number | string }): Promise<{ totalPages: number; textLayer: TextLayer } | null> {
  try {
    const page = typeof requestedPage === 'string' && /^[1-9]\d*$/.test(requestedPage)
      ? Number(requestedPage)
      : requestedPage;
    if (typeof page !== 'number' || !Number.isSafeInteger(page) || page < 1) return null;
    const [base, source] = await Promise.all([realpath(root), realpath(file)]);
    if (!inside(base, source) || path.extname(source).toLowerCase() !== '.pdf') return null;
    const info = await stat(source);
    if (!info.isFile()) return null;
    const key = createHash('sha256').update(JSON.stringify([source, info.size, info.mtimeMs, page])).digest('hex');
    const directory = path.join(libraryPaths(base).pdfPreview, key);
    const metaFile = path.join(directory, 'meta.json');
    let meta: CacheMeta;
    try {
      meta = JSON.parse(await readFile(metaFile, 'utf8')) as CacheMeta;
    } catch {
      // 尚未渲染或缓存被清理：返回 null，让调用方走完整预览流程。
      return null;
    }
    if (!meta || meta.page !== page || meta.key !== key || meta.source !== source ||
      meta.size !== info.size || meta.mtimeMs !== info.mtimeMs || !validTextLayer(meta.textLayer)) return null;
    return { totalPages: meta.totalPages, textLayer: meta.textLayer };
  } catch {
    return null;
  }
}
