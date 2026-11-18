import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const downloaderScript = fileURLToPath(new URL('../../../downloader/run.py', import.meta.url));

// Honor an explicit interpreter override before the installed runtimes/PATH.
export function resolvePython() {
  if (process.env.LITERATURE_PYTHON) return process.env.LITERATURE_PYTHON;
  const candidates = [path.join(path.dirname(downloaderScript), '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')];
  for (const candidate of candidates) if (existsSync(candidate)) return candidate;
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    const candidate = path.join(dir, process.platform === 'win32' ? 'python.exe' : 'python');
    if (existsSync(candidate)) return candidate;
  }
  return 'python';
}

const CLI_STATUS = { 2: 400, 3: 404, 4: 409, 5: 409 };

function cliError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

// run.py prints one JSON document on success and a 错误： line on failure.
// Exit codes separate user input (2), missing state (3), conflict (4) and busy (5).
export function runCli({ python, root, script = downloaderScript, args, timeout = 60000 }) {
  return new Promise((resolve, reject) => {
    const child = spawn(python, [script, '--root', root, ...args], {
      cwd: root, shell: false, windowsHide: true,
      env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(cliError('文献工具执行超时，请稍后重试。', 504));
    }, timeout);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', error => finish(cliError(`无法启动Python文献工具：${error.message}`, 500)));
    child.once('close', code => {
      if (code === 0) {
        try { finish(null, JSON.parse(stdout)); }
        catch { finish(cliError('文献工具返回了无效结果。', 500)); }
        return;
      }
      const detail = stderr.trim().replace(/^错误：/, '').trim();
      finish(cliError(detail || `文献工具执行失败（exit=${code}）。`, CLI_STATUS[code] ?? 500));
    });
  });
}
