import fs from 'node:fs';
import path from 'node:path';

export class Store {
  constructor(file, fallback) {
    this.file = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try { this.data = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; this.data = fallback; }
  }
  save() {
    const temp = `${this.file}.${process.pid}.writing`;
    fs.writeFileSync(temp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    fs.renameSync(temp, this.file);
  }
}

export function redact(value) {
  return String(value ?? '')
    .replace(/\bsk-[\w-]{8,}/g, '[已隐藏密钥]')
    .replace(/(Bearer\s+)[\w.+/=-]+/gi, '$1[已隐藏]')
    .replace(/([?&](?:api[_-]?key|token|access_token|key|HMAC|SrcAppSID)=)[^&\s]+/gi, '$1[已隐藏]');
}
