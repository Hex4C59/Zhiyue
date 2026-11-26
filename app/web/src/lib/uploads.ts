import type { IncomingMessage } from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Store } from './store.js';
import { statusError } from './errors.js';
import { MIME, readBody } from './http.js';

const ALLOWED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.pdf', '.txt', '.md', '.csv', '.tsv', '.json', '.docx', '.pptx', '.xlsx',
]);

export interface UploadRecord {
  id: string;
  name: string;
  mime: string;
  size: number;
  path: string;
  createdAt: string;
}

interface UploadStore {
  files: UploadRecord[];
}

export class UploadService {
  private readonly store: Store<UploadStore>;

  constructor(private readonly stateDir: string) {
    this.store = new Store<UploadStore>(path.join(stateDir, 'uploads.json'), { files: [] });
  }

  validUploads(ids: unknown): UploadRecord[] {
    if (!Array.isArray(ids) || ids.length > 8) throw statusError('每次最多附加8个文件。');
    return ids.map((id) => {
      const file = this.store.data.files.find((f) => f.id === id);
      if (!file || !fs.existsSync(file.path)) throw statusError('附件不存在，请重新上传。');
      return file;
    });
  }

  findUpload(id: unknown): UploadRecord {
    if (typeof id !== 'string' || !id) throw statusError('请选择要导入的 PDF。');
    const file = this.store.data.files.find((f) => f.id === id);
    if (!file || !fs.existsSync(file.path)) throw statusError('附件不存在，请重新上传。');
    return file;
  }

  async saveFromRequest(req: IncomingMessage): Promise<{ id: string; name: string; mime: string; size: number }> {
    let name: string;
    const rawName = req.headers['x-filename'];
    try {
      name = decodeURIComponent(Array.isArray(rawName) ? rawName[0] ?? '' : rawName ?? '');
    } catch {
      throw statusError('文件名编码无效。');
    }
    name = path.basename(name.replaceAll('\\', '/')).replace(/[\x00-\x1f]/g, '').slice(0, 180);
    const ext = path.extname(name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw statusError('支持图片、PDF、文本、CSV、Word、Excel和PowerPoint文件。', 415);
    }
    const data = await readBody(req, 25 * 1024 * 1024);
    if (!data.length) throw statusError('文件为空。');
    const magic = data.subarray(0, 16);
    if (ext === '.pdf' && !data.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
      throw statusError('文件内容不是有效PDF。');
    }
    const mime = MIME[ext] || 'application/octet-stream';
    if (mime.startsWith('image/')) {
      const ok = ext === '.png'
        ? magic.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : ['.jpg', '.jpeg'].includes(ext)
          ? magic[0] === 255 && magic[1] === 216
          : ext === '.webp'
            ? magic.toString('ascii', 0, 4) === 'RIFF' && magic.toString('ascii', 8, 12) === 'WEBP'
            : magic.toString('ascii', 0, 3) === 'GIF';
      if (!ok) throw statusError('图片内容与扩展名不匹配。');
    }
    const id = randomUUID();
    const file = path.join(this.stateDir, 'uploads', id + ext);
    await fsp.writeFile(file, data, { flag: 'wx', mode: 0o600 });
    const record: UploadRecord = { id, name, mime, size: data.length, path: file, createdAt: new Date().toISOString() };
    this.store.data.files.push(record);
    this.store.save();
    return { id, name, mime, size: data.length };
  }
}
