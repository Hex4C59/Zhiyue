import fs from 'node:fs';
import path from 'node:path';

/** 简单 JSON 存储：整文件原子替换，读取失败时使用调用方提供的初始值。 */
export class Store<T> {
  readonly file: string;
  data: T;

  constructor(file: string, fallback: T) {
    this.file = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try {
      this.data = JSON.parse(fs.readFileSync(file, 'utf8')) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      this.data = fallback;
    }
  }

  save(): void {
    const temp = `${this.file}.${process.pid}.writing`;
    fs.writeFileSync(temp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    fs.renameSync(temp, this.file);
  }
}

export function redact(value: unknown): string {
  return String(value ?? '')
    .replace(/\bsk-[\w-]{8,}/g, '[已隐藏密钥]')
    .replace(/(Bearer\s+)[\w.+/=-]+/gi, '$1[已隐藏]')
    .replace(/([?&](?:api[_-]?key|token|access_token|key|HMAC|SrcAppSID)=)[^&\s]+/gi, '$1[已隐藏]');
}
