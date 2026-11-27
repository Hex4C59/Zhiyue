import { createRequire } from 'node:module';
import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { appPaths } from './appPaths.js';
import { statusError } from './errors.js';

export const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.pdf': 'application/pdf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.csv': 'text/csv; charset=utf-8', '.tsv': 'text/tab-separated-values; charset=utf-8',
};

// KaTeX 随包分发，前端通过 /vendor/katex 加载其样式与字体；按 Node 解析规则定位安装目录。
const KATEX_DIST = (() => {
  try {
    const manifest = createRequire(import.meta.url).resolve('katex/package.json');
    return path.join(path.dirname(manifest), 'dist');
  } catch {
    return '';
  }
})();

export function checkRequest(req: IncomingMessage): void {
  const host = req.headers.host || '';
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)) throw statusError('仅允许通过本机地址访问。', 403);
  const origin = req.headers.origin;
  if (origin && origin !== `http://${host}`) throw statusError('不接受其他网站发起的请求。', 403);
  if (req.headers['sec-fetch-site'] === 'cross-site') throw statusError('不接受跨站请求。', 403);
  if (!['GET', 'HEAD'].includes(req.method ?? '') && req.url !== '/api/uploads' &&
    !String(req.headers['content-type']).startsWith('application/json')) {
    throw statusError('请使用JSON请求。', 415);
  }
}

export async function readBody(req: IncomingMessage, max = 2_000_000): Promise<Buffer> {
  if (Number(req.headers['content-length']) > max) throw statusError('文件或请求过大。', 413);
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > max) throw statusError('文件或请求过大。', 413);
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const body = await readBody(req);
  try {
    const value = JSON.parse(body.toString('utf8') || '{}') as unknown;
    if (!value || typeof value !== 'object') throw new Error('JSON格式不正确。');
    return value as Record<string, unknown>;
  } catch {
    throw statusError('JSON格式不正确。');
  }
}

export function json(res: ServerResponse, value: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

export async function serveFile(
  req: IncomingMessage,
  res: ServerResponse,
  file: string,
  { download = false, filename, cache = 'private, no-cache' }: {
    download?: boolean; filename?: string; cache?: string;
  } = {},
): Promise<void> {
  const info = await fsp.stat(file);
  if (!info.isFile()) throw statusError('文件不存在。', 404);
  const mime = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const encoded = encodeURIComponent(filename || path.basename(file));
  // ETag 由大小与修改时间组成：内容一变就换值，未变时客户端用 If-None-Match 换 304
  // 可省掉 app.js（约 700KB）的重复传输。ETag 参与比较，不用再读一遍文件头。
  const etag = `"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
  const headers: Record<string, string | number> = {
    'Content-Type': mime,
    'Accept-Ranges': 'bytes',
    'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encoded}`,
    'Cache-Control': cache,
    ETag: etag,
  };
  const inm = req.headers['if-none-match'];
  if (typeof inm === 'string' && inm.split(',').some((tag) => tag.trim() === etag)) {
    // 304 必须实体头一致：内容协商已通过，但 Range 请求不能用 304 回应。
    if (!req.headers.range) {
      res.writeHead(304, headers);
      res.end();
      return;
    }
  }
  const range = req.headers.range;
  let start = 0;
  let end = info.size - 1;
  let status = 200;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      res.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
      res.end();
      return;
    }
    if (!match[1]) start = Math.max(0, info.size - Number(match[2]));
    else {
      start = Number(match[1]);
      if (match[2]) end = Math.min(end, Number(match[2]));
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
      res.end();
      return;
    }
    status = 206;
    headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
  }
  headers['Content-Length'] = info.size ? end - start + 1 : 0;
  res.writeHead(status, headers);
  if (req.method === 'HEAD' || !info.size) {
    res.end();
    return;
  }
  const stream = fs.createReadStream(file, { start, end });
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}

export async function serveStatic(req: IncomingMessage, res: ServerResponse, route: string): Promise<void> {
  // KaTeX 样式与字体：路径形如 /vendor/katex/katex.min.css 与 /vendor/katex/fonts/...woff2。
  if (route.startsWith('/vendor/katex/') && KATEX_DIST) {
    const relative = route.slice('/vendor/katex/'.length);
    const file = path.normalize(path.join(KATEX_DIST, relative));
    if (!file.startsWith(KATEX_DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      throw statusError('页面不存在。', 404);
    }
    return await serveFile(req, res, file, { cache: 'private, max-age=0, must-revalidate' });
  }
  const staticFiles: Record<string, string> = {
    '/': 'index.html', '/index.html': 'index.html',
    '/js/app.js': path.join(appPaths().distDir, 'app.js'),
    '/css/styles.css': 'css/styles.css',
  };
  const entry = staticFiles[route];
  if (!entry) throw statusError('页面不存在。', 404);
  const file = path.isAbsolute(entry) ? entry : path.join(appPaths().publicDir, entry);
  // 入口文件名固定不带内容哈希，只能每次重验证；带上 ETag 后未变更时只付一次 304。
  return await serveFile(req, res, file, { cache: 'private, max-age=0, must-revalidate' });
}
