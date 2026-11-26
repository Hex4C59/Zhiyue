import { spawn } from 'node:child_process';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { appPaths } from './appPaths.js';
import { redact } from './store.js';

export interface ExtractFileOptions {
  pages?: number[];
  search?: string;
  maxHits?: number;
  outline?: boolean;
}

export function extractFile(python: string, file: string, options: ExtractFileOptions = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const args = [path.join(appPaths().pythonDir, 'extract.py'), file];
    if (options.pages) args.push('--pages', options.pages.join(','));
    if (options.search !== undefined) args.push(`--search=${options.search}`);
    if (options.maxHits !== undefined) args.push('--max-hits', String(options.maxHits));
    if (options.outline) args.push('--outline');
    const proc = spawn(python, args, {
      shell: false, windowsHide: true, env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
    });
    let output = '';
    let stderr = '';
    let overflow = false;
    let bytes = 0;
    const decoder = new StringDecoder('utf8');
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('文件解析超过45秒，请缩小页范围。'));
    }, 45000);
    proc.stdout.on('data', (buffer: Buffer) => {
      bytes += buffer.length;
      if (bytes > 800000) { overflow = true; proc.kill(); return; }
      output += decoder.write(buffer);
    });
    proc.stdout.on('end', () => { output += decoder.end(); });
    proc.stderr.on('data', (buffer: Buffer) => { stderr = (stderr + buffer.toString('utf8')).slice(-3000); });
    proc.on('error', (e: Error) => { clearTimeout(timer); reject(e); });
    proc.on('close', (code: number | null) => {
      clearTimeout(timer);
      if (overflow) return reject(new Error('文件提取结果超过限制。'));
      try {
        const data = JSON.parse(output) as { error?: string };
        if (code !== 0 || data.error) throw new Error(data.error || redact(stderr) || '文件解析失败。');
        resolve(data);
      } catch (e) {
        reject(e);
      }
    });
  });
}
