import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, realpath, stat, lstat, open } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { libraryPaths } from './paths.mjs';

const script = fileURLToPath(new URL('./render.py', import.meta.url));
const inflight = new Map();
const waiting = [];
let running = 0;
const error = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const inside = (root, file) => { const rel = path.relative(root, file); return !path.isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${path.sep}`); };
function validTextLayer(layer) {
  if(!layer||![layer.width,layer.height].every(v=>Number.isFinite(v)&&v>0)||typeof layer.text!=='string'||layer.text.length>200000||typeof layer.hasText!=='boolean'||!Array.isArray(layer.lines)||layer.lines.length>20000)return false;
  let count=0;
  return layer.lines.every(line=>Array.isArray(line.words)&&line.words.every(word=>++count<=20000&&typeof word.text==='string'&&word.text.length<=200000&&[word.x,word.y,word.width,word.height].every(Number.isFinite)&&word.width>0&&word.height>0&&[0,90,180,270].includes(word.rotation)));
}

async function validateCachePath(root, target, file = false) {
  if (target === root || !inside(root, target)) throw error('预览缓存目录超出项目。');
  const parts = path.relative(root, target).split(path.sep);
  let current = root;
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    let info;
    try { info = await lstat(current); }
    catch (e) { if (e.code === 'ENOENT') return; throw e; }
    const resolved = await realpath(current);
    const same = process.platform === 'win32' ? current.toLowerCase() === resolved.toLowerCase() : current === resolved;
    const expectedType = file && i === parts.length - 1 ? info.isFile() : info.isDirectory();
    if (info.isSymbolicLink() || !same || !inside(root, resolved) || !expectedType) throw error('预览缓存不能包含符号链接、路径别名或非预期文件类型。');
  }
}

async function limited(work) {
  if (running >= 2) await new Promise(resolve => waiting.push(resolve));
  else running++;
  try { return await work(); }
  finally { if (waiting.length) waiting.shift()(); else running--; }
}

async function isPng(file) {
  let handle;
  try {
    handle = await open(file, 'r');
    const header = Buffer.alloc(24);
    const { bytesRead } = await handle.read(header, 0, 24, 0);
    return bytesRead === 24 && header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      header.toString('ascii', 12, 16) === 'IHDR' && header.readUInt32BE(16) > 0 && header.readUInt32BE(20) > 0;
  } catch { return false; }
  finally { await handle?.close(); }
}

function render(python, root, source, page, output) {
  return new Promise((resolve, reject) => {
    const proc = spawn(python, [script, '--root', root, '--file', source, '--page', String(page), '--output', output], {
      cwd: root, shell: false, windowsHide: true, detached: process.platform !== 'win32',
      env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = ''; let stderr = ''; let timedOut = false; let tooLarge = false;
    const stop = () => {
      if (!proc.pid || proc.exitCode !== null || proc.signalCode !== null) return;
      if (process.platform === 'win32') {
        const killer = spawn(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/taskkill.exe'), ['/PID', String(proc.pid), '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore', timeout: 5000 });
        killer.on('error', () => proc.kill());
      } else { try { process.kill(-proc.pid, 'SIGKILL'); } catch { proc.kill('SIGKILL'); } }
    };
    const timer = setTimeout(() => { timedOut = true; stop(); }, 45000);
    proc.stdout.on('data', data => {
      stdout += data.toString('utf8');
      if (stdout.length > 4_000_000) { tooLarge = true; stop(); }
    });
    proc.stderr.on('data', data => { stderr = (stderr + data.toString('utf8')).slice(-3000); });
    proc.once('error', e => { clearTimeout(timer); reject(error(`无法启动PDF预览：${e.message}`, 500)); });
    proc.once('close', code => {
      clearTimeout(timer);
      if (timedOut) return reject(error('PDF预览超过45秒，请稍后重试。', 500));
      if (tooLarge) return reject(error('PDF预览返回数据过大。', 500));
      try {
        const result = JSON.parse(stdout);
        if (code !== 0 || result.error) {
          const statusCode = result.code === 'invalid_request' ? 400 : 500;
          throw error(result.error || 'PDF渲染失败。', statusCode);
        }
        resolve(result);
      } catch (e) { reject(e.statusCode ? e : error(`PDF渲染失败：${stderr || e.message}`, 500)); }
    });
  });
}

// file must already have passed Library.safeFile. This module never modifies it.
export async function previewPaper({ root, python, file, page = 1 }) {
  try {
    if (typeof page === 'string' && /^[1-9]\d*$/.test(page)) page = Number(page);
    if (!Number.isSafeInteger(page) || page < 1) throw error('PDF页序必须是大于零的整数。');
    const [base, source] = await Promise.all([realpath(root), realpath(file)]);
    if (!inside(base, source) || path.extname(source).toLowerCase() !== '.pdf') throw error('只允许预览项目内已验证的PDF。');
    const info = await stat(source);
    if (!info.isFile()) throw error('PDF文件不存在。');
    const key = createHash('sha256').update(JSON.stringify([source, info.size, info.mtimeMs, page])).digest('hex');
    const directory = path.join(libraryPaths(base).pdfPreview, key);
    const png = path.join(directory, 'page.png');
    const metaFile = path.join(directory, 'meta.json');
    await validateCachePath(base, directory);
    const result = () => inflight.get(directory);
    if (result()) return await result();
    const work = limited(async () => {
      // Check again after waiting for a render slot, before reading even an existing cache.
      await validateCachePath(base, directory);
      await validateCachePath(base, metaFile, true);
      await validateCachePath(base, png, true);
      try {
        const meta = JSON.parse(await readFile(metaFile, 'utf8'));
        if (meta.page === page && Number.isSafeInteger(meta.totalPages) && meta.totalPages >= page && meta.key === key && validTextLayer(meta.textLayer) && !meta.textLayer.error && await isPng(png)) return { file: png, totalPages: meta.totalPages, page, textLayer:meta.textLayer };
      } catch { /* Incomplete caches are rendered again. */ }
      await validateCachePath(base, directory);
      await mkdir(directory, { recursive: true });
      await validateCachePath(base, directory);
      const data = await render(python, base, source, page, png);
      const invalid = data.page !== page || !Number.isSafeInteger(data.totalPages) || data.totalPages < page ||
        !validTextLayer(data.textLayer) || !await isPng(png);
      if (invalid) throw error('PDF预览输出无效。', 500);
      const after = await stat(source);
      const changed = after.size !== info.size || after.mtimeMs !== info.mtimeMs;
      if (changed) throw error('渲染过程中PDF已变化，请重新请求。', 409);
      const meta = { key, page, totalPages: data.totalPages, source, size: info.size, mtimeMs: info.mtimeMs, scale: 1600, textLayer:data.textLayer };
      const temp = `${metaFile}.${randomUUID()}.tmp`;
      await writeFile(temp, JSON.stringify(meta, null, 2)); await rename(temp, metaFile);
      return { file: png, totalPages: data.totalPages, page, textLayer:data.textLayer };
    });
    inflight.set(directory, work);
    try { return await work; }
    finally { inflight.delete(directory); }
  } catch (e) {
    if (e.statusCode) throw e;
    const statusCode = e.code === 'ENOENT' ? 404 : 500;
    throw Object.assign(new Error(`PDF预览失败：${e.message}`), { statusCode, cause: e });
  }
}
