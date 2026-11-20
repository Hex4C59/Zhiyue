import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, realpath, stat, lstat, open } from 'node:fs/promises';
import path from 'node:path';
import { libraryPaths } from './paths.js';
import { appPaths } from './appPaths.js';
import { statusError } from './errors.js';
import { DEFAULT_PDF_PREVIEW_SCALE, PDF_PREVIEW_SCALES } from './pdfScales.js';
import type { PDFPreviewScale } from './pdfScales.js';

export interface TextWord {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface TextLine {
  words: TextWord[];
}

export interface TextLayer {
  width: number;
  height: number;
  hasText: boolean;
  text: string;
  lines: TextLine[];
}

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

const script = (): string => path.join(appPaths().sourceLibDir, 'render.py');
const inflight = new Map<string, Promise<PreviewResult>>();
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
    const info = await stat(source);
    if (!info.isFile()) throw statusError('PDF文件不存在。');
    const key = createHash('sha256').update(JSON.stringify([source, info.size, info.mtimeMs, page])).digest('hex');
    const directory = path.join(libraryPaths(base).pdfPreview, key);
    const png = path.join(directory, scale === DEFAULT_PDF_PREVIEW_SCALE ? 'page.png' : `page-${scale}.png`);
    const metaFile = path.join(directory, 'meta.json');
    await validateCachePath(base, directory);
    const existing = inflight.get(png);
    if (existing) return await existing;
    const work = limited(async (): Promise<PreviewResult> => {
      // 等到渲染名额后，再校验目录和即将读取的缓存。
      await validateCachePath(base, directory);
      await validateCachePath(base, metaFile, true);
      await validateCachePath(base, png, true);
      let cached: CacheMeta | undefined;
      try {
        const meta = JSON.parse(await readFile(metaFile, 'utf8')) as CacheMeta;
        if (meta.page === page && Number.isSafeInteger(meta.totalPages) && meta.totalPages >= page &&
          meta.key === key && validTextLayer(meta.textLayer)) {
          cached = meta;
        }
      } catch { /* 元数据不完整时重新生成。 */ }
      if (cached && await isPng(png, scale)) {
        return { file: png, totalPages: cached.totalPages, page, textLayer: cached.textLayer };
      }
      await validateCachePath(base, directory);
      await mkdir(directory, { recursive: true });
      await validateCachePath(base, directory);
      const data = await render(python, base, source, page, png, scale, !!cached);
      const textLayer = cached?.textLayer ?? data.textLayer;
      const invalid = data.page !== page || !Number.isSafeInteger(data.totalPages) || data.totalPages < page ||
        !validTextLayer(textLayer) || !await isPng(png, scale);
      if (invalid) throw statusError('PDF预览输出无效。', 500);
      const after = await stat(source);
      const changed = after.size !== info.size || after.mtimeMs !== info.mtimeMs;
      if (changed) throw statusError('渲染过程中PDF已变化，请重新请求。', 409);
      if (!cached) {
        const meta: CacheMeta = {
          key, page, totalPages: data.totalPages, source, size: info.size,
          mtimeMs: info.mtimeMs, textLayer,
        };
        const temp = `${metaFile}.${randomUUID()}.tmp`;
        await writeFile(temp, JSON.stringify(meta, null, 2));
        await rename(temp, metaFile);
      }
      return { file: png, totalPages: data.totalPages, page, textLayer };
    });
    inflight.set(png, work);
    try { return await work; }
    finally { inflight.delete(png); }
  } catch (e) {
    if (e && typeof e === 'object' && 'statusCode' in e) throw e;
    const statusCode = (e as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 500;
    throw Object.assign(new Error(`PDF预览失败：${(e as Error).message}`), { statusCode, cause: e });
  }
}
