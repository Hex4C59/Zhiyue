// Optional live verification. Sends only generated fixtures to the configured Pi model.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { deflateSync, crc32 } from 'node:zlib';
import { createApp } from '../app/web/src/server.js';
import { PiClient } from '../app/web/src/lib/pi.js';
import type { App } from '../app/web/src/server.js';
import type { ChatMessage } from '../app/web/src/lib/chat.js';
import type { AttachmentInput } from '../app/web/src/lib/chat.js';

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'literature-pi-synthetic-'));
const root = path.join(dir, 'library');
const stateDir = path.join(root, '.zhiyue', 'data');
let app: App | undefined;
try {
  await fs.mkdir(path.join(root, '.zhiyue', 'catalog'), { recursive: true });
  await fs.mkdir(path.join(root, 'papers'));
  await fs.writeFile(path.join(root, 'README.md'), 'Synthetic public integration fixture. No real papers or private data.');
  await fs.writeFile(path.join(root, '.zhiyue', 'catalog', '文献索引.json'), JSON.stringify({
    records: [{
      literature_id: 'L001', title: 'Synthetic Pi Integration Sample', authors: ['Test Author'],
      year: 2026, file: 'papers/sample.pdf', versions: [],
    }],
  }));
  const stream = 'BT /F1 12 Tf 30 100 Td (This is a synthetic Pi integration test PDF. Sample value: 42.) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  await fs.writeFile(path.join(root, 'papers', 'sample.pdf'), pdf);
  const pi = new PiClient({ root, stateDir });
  app = await createApp({ root, stateDir, connectPi: false, piClient: pi });
  const activeApp = app;
  const waitFor = async (id: string): Promise<ChatMessage> => {
    const deadline = Date.now() + 100000;
    while (Date.now() < deadline) {
      const message = activeApp.chats.get(id).messages.at(-1);
      if (message && message.status !== 'streaming') return message;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    await activeApp.chats.interrupt(id);
    throw new Error('Pi test timed out');
  };
  await app.chats.connect();
  pi.settings.defaultThinkingLevel = 'off';
  const chat = app.chats.create({ title: 'Synthetic Pi test' });
  await app.chats.send(chat.id, { text: 'This is a synthetic integration test. Reply only: Pi connected.' });
  const first = await waitFor(chat.id);
  console.log(JSON.stringify({ step: 'real-model', status: first.status, text: first.text, error: first.error }));
  if (first.status !== 'completed') throw new Error('Real model test failed');
  const chunk = (type: string, data: Buffer): Buffer => {
    const tag = Buffer.from(type);
    const body = Buffer.alloc(12 + data.length);
    body.writeUInt32BE(data.length);
    tag.copy(body, 4);
    data.copy(body, 8);
    body.writeUInt32BE(crc32(Buffer.concat([tag, data])) >>> 0, 8 + data.length);
    return body;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(32);
  ihdr.writeUInt32BE(32, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc(32 * 97);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) raw[y * 97 + 1 + x * 3] = 255;
  }
  const image = path.join(dir, 'red-square.png');
  await fs.writeFile(image, Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]));
  const textFile = path.join(dir, 'sample.txt');
  await fs.writeFile(textFile, 'This attachment is generated test data. Sample animal: giraffe.');
  const tools: string[] = [];
  const original = pi.callTool.bind(pi);
  pi.callTool = (thread: string, tool: string, args: Record<string, unknown>, signal?: AbortSignal) => { tools.push(tool); return original(thread, tool, args, signal); };
  const attachments: AttachmentInput[] = [
    { id: 'test-text', name: 'sample.txt', path: textFile, mime: 'text/plain', size: 80 },
    { id: 'test-image', name: 'red-square.png', path: image, mime: 'image/png', size: 200 },
  ];
  await app.chats.send(chat.id, {
    text: 'This is an entirely synthetic fixture, not a real paper. Call library_search for L001, then read_paper_pages for page 1 of L001. Reply in at most four short sentences with the title, the PDF sample value, the animal in the text attachment, and the image color. Use the tools; do not guess.',
    paperIds: ['L001'],
    attachments,
  });
  const second = await waitFor(chat.id);
  console.log(JSON.stringify({ step: 'synthetic-tools-images-attachments', status: second.status, tools, text: second.text, error: second.error }));
  if (second.status !== 'completed' || !tools.includes('read_paper_pages') || !tools.includes('library_search')) {
    throw new Error('Synthetic tool test failed');
  }
} finally {
  await app?.close();
  await fs.rm(dir, { recursive: true, force: true });
}
