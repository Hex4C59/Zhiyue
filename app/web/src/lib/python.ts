import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { statusError } from './errors.js';

// 编译产物位于 build/app/web/src/lib 或 runtime/app/web/src/lib；
// 用向上查找定位 app/downloader，源码构建与安装版布局都能找到同一份 Python 工具。
function findDownloaderScript(): string {
  let directory = path.dirname(fileURLToPath(import.meta.url));
  for (;;) {
    for (const candidate of [
      path.join(directory, 'downloader', 'run.py'),
      path.join(directory, 'app', 'downloader', 'run.py'),
    ]) {
      if (existsSync(candidate)) return candidate;
    }
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error('无法定位文献下载工具 app/downloader/run.py。');
    directory = parent;
  }
}

export const downloaderScript = findDownloaderScript();

export interface CliOptions {
  python: string;
  root: string;
  script?: string;
  args: string[];
  timeout?: number;
}

// Honor an explicit interpreter override before the installed runtimes/PATH.
export function resolvePython(): string {
  if (process.env.LITERATURE_PYTHON) return process.env.LITERATURE_PYTHON;
  const candidates = [
    path.join(path.dirname(downloaderScript), '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'),
  ];
  for (const candidate of candidates) if (existsSync(candidate)) return candidate;
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    const candidate = path.join(dir, process.platform === 'win32' ? 'python.exe' : 'python');
    if (existsSync(candidate)) return candidate;
  }
  return 'python';
}

const CLI_STATUS: Record<number, number> = { 2: 400, 3: 404, 4: 409, 5: 409 };

// run.py prints one JSON document on success and a 错误： line on failure.
// Exit codes separate user input (2), missing state (3), conflict (4) and busy (5).
export function runCli<T = unknown>({ python, root, script = downloaderScript, args, timeout = 60000 }: CliOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const child = spawn(python, [script, '--root', root, ...args], {
      cwd: root, shell: false, windowsHide: true,
      env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (error?: Error | null, value?: T): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value as T);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(statusError('文献工具执行超时，请稍后重试。', 504));
    }, timeout);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.on('data', (chunk: string) => { stderr += chunk; });
    child.once('error', (error: Error) => finish(statusError(`无法启动Python文献工具：${error.message}`, 500)));
    child.once('close', (code: number | null) => {
      if (code === 0) {
        try { finish(null, JSON.parse(stdout) as T); }
        catch { finish(statusError('文献工具返回了无效结果。', 500)); }
        return;
      }
      const detail = stderr.trim().replace(/^错误：/, '').trim();
      finish(statusError(detail || `文献工具执行失败（exit=${code}）。`, CLI_STATUS[code ?? 0] ?? 500));
    });
  });
}
