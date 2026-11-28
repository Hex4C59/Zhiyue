import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { BinaryLike } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { Chat, ChatMessage } from './chatTypes.js';
import { activeClassifyRun } from '../../shared/contracts.js';
import { chatMessagePreview } from '../../shared/chatPreview.js';

export interface ChatRecord {
  version: 1;
  position: number;
  chat: Chat;
}
interface MigrationEntry { id: string; file: string; position: number; hash: string }
interface MigrationManifest { version: 1; legacyHash: string; backup: string; records: MigrationEntry[] }
type Validator = (value: unknown) => boolean;
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const string: Validator = (value) => typeof value === 'string';
const strings: Validator = (value) => Array.isArray(value) && value.every(string);
const number: Validator = (value) => typeof value === 'number' && Number.isFinite(value);
const integer: Validator = (value) => Number.isSafeInteger(value) && Number(value) >= 0;
const boolean: Validator = (value) => typeof value === 'boolean';
const nullableString: Validator = (value) => value === null || string(value);
const oneOf = (...values: string[]): Validator => (value) => values.includes(value as string);
const arrayOf = (valid: Validator): Validator => (value) => Array.isArray(value) && value.every(valid);
function fields(value: unknown, required: Record<string, Validator>, optional: Record<string, Validator> = {}): boolean {
  return object(value) && Object.entries(required).every(([key, valid]) => valid(value[key])) &&
    Object.entries(optional).every(([key, valid]) => value[key] === undefined || valid(value[key]));
}
const attachment: Validator = (value) => fields(value, { id: string, name: string, mime: string, size: integer });
const message: Validator = (value) => fields(value, {
  id: string, role: oneOf('user', 'assistant', 'tool', 'system'), text: string, createdAt: string,
  status: oneOf('streaming', 'completed', 'interrupted', 'failed', 'error', 'cancelled'),
}, { thinking: string, error: string, attachments: arrayOf(attachment) });
const draft: Validator = (value) => fields(value, {
  id: string, paperId: string, title: string, content: string, source: string, path: string, createdAt: string,
}, { paperIds: strings, target: oneOf('notes', 'synthesis', 'outputs') });
const folder: Validator = (value) => fields(value, {
  id: string, kind: oneOf('delete'), category: string, path: string, papers: number, createdAt: string,
}, { subcategory: string, error: string });
const proposal: Validator = (value) => fields(value, {
  id: string, paperId: string, title: string, fromPath: string, targetCategory: string, targetPath: string,
  willCreateCategory: boolean, willCreateSubcategory: boolean, basis: oneOf('notes', 'translation', 'notes+translation', 'pdf'),
  reason: string, createdAt: string,
}, { targetSubcategory: string, error: string });
const runItem: Validator = (value) => fields(value, {
  proposalId: string, paperId: string, category: string,
  status: oneOf('pending', 'moved', 'unchanged', 'blocked', 'failed', 'interrupted'),
}, { error: string });
const run: Validator = (value) => fields(value, {
  id: string, requestId: string, proposalIds: strings, proposals: arrayOf(proposal), jobId: nullableString,
  status: oneOf('queued', 'preparing', 'moving', 'completed', 'partial', 'failed', 'interrupted'),
  stage: string, revision: integer, createdFolders: strings, items: arrayOf(runItem), messageId: string,
  createdAt: string, updatedAt: string,
}, { repair: string });

function fail(message: string): never { throw new Error(`聊天存储初始化失败：${message}`); }
function validateChat(value: unknown): asserts value is Chat {
  if (!fields(value, {
    id: (id) => typeof id === 'string' && id.length > 0,
    title: string, paperIds: strings, messages: arrayOf(message), createdAt: string, threadId: nullableString,
  }, {
    provider: string, noteDrafts: arrayOf(draft), folderActions: arrayOf(folder),
    classifyProposals: arrayOf(proposal), classifyRuns: arrayOf(run), classifyRevision: integer,
    lastContextOperationId: string, historyState: oneOf('active', 'archived', 'trashed'),
  })) fail('会话内容损坏，已保留原记录。');
}
const hash = (bytes: BinaryLike): string => createHash('sha256').update(bytes).digest('hex');
const recordName = (id: string): string => `${hash(id)}.json`;
const digest = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{64}$/.test(value);

function stat(file: string): fs.Stats | null {
  try { return fs.lstatSync(file); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
function directoryExists(directory: string): boolean {
  const info = stat(directory);
  if (!info) return false;
  if (!info.isDirectory() || info.isSymbolicLink()) fail(`目录不是普通目录：${directory}`);
  return true;
}
function bytes(file: string): Buffer {
  const info = stat(file);
  if (!info?.isFile() || info.isSymbolicLink()) fail(`记录不是普通文件：${file}`);
  return fs.readFileSync(file);
}
function parse(content: Buffer, file: string): unknown {
  try { return JSON.parse(content.toString('utf8')) as unknown; }
  catch (cause) { throw new Error(`聊天记录 JSON 损坏：${file}`, { cause }); }
}

/** 临时文件只写一篇会话；同步 rename 成功才算提交，失败清理临时文件并向调用方抛错。 */
function atomicWrite(file: string, content: string): void {
  const temp = `${file}.${randomUUID()}.writing`;
  let failure: unknown;
  let committed = false;
  try {
    fs.writeFileSync(temp, content, { flag: 'wx', mode: 0o600 });
    fs.renameSync(temp, file);
    committed = true;
  } catch (error) { failure = error; throw error; }
  finally {
    if (!committed) {
      try { fs.unlinkSync(temp); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          if (failure) throw new AggregateError([failure, error], '聊天保存失败，且无法清理临时文件。');
          throw error;
        }
      }
    }
  }
}

function readRecord(directory: string, file: string): ChatRecord {
  const record = parse(bytes(path.join(directory, file)), file);
  if (!object(record) || record.version !== 1 || !integer(record.position)) fail(`记录版本或位置无效：${file}`);
  validateChat(record.chat);
  if (file !== recordName(record.chat.id)) fail(`文件名与会话编号不一致：${file}`);
  return record as unknown as ChatRecord;
}
function legacyChats(content: Buffer, file: string): Chat[] {
  const value = parse(content, file);
  if (!object(value) || value.version !== undefined || !Array.isArray(value.chats)) fail('旧聊天文件结构无效。');
  const ids = new Set<string>();
  for (const chat of value.chats) {
    validateChat(chat);
    if (ids.has(chat.id)) fail(`旧聊天文件包含重复会话编号：${chat.id}`);
    ids.add(chat.id);
  }
  return value.chats as Chat[];
}
function readManifest(file: string): MigrationManifest {
  const value = parse(bytes(file), file);
  if (!object(value) || value.version !== 1 || !digest(value.legacyHash) ||
    typeof value.backup !== 'string' || !/^chats-[\w-]+\.json$/.test(value.backup) ||
    !Array.isArray(value.records)) fail('迁移标记损坏或版本不受支持。');
  const ids = new Set<string>();
  value.records.forEach((entry, index) => {
    if (!object(entry) || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id) ||
      entry.file !== recordName(entry.id) || entry.position !== index || !digest(entry.hash)) {
      fail('迁移标记中的会话清单不一致。');
    }
    ids.add(entry.id);
  });
  return value as unknown as MigrationManifest;
}
function verifyBackup(backups: string, manifest: MigrationManifest): Buffer {
  if (!directoryExists(backups)) fail('找不到迁移备份目录。');
  const file = path.join(backups, manifest.backup);
  const content = bytes(file);
  if (hash(content) !== manifest.legacyHash || bytes(`${file}.sha256`).toString('utf8').trim() !== manifest.legacyHash) {
    fail('迁移备份哈希不一致。');
  }
  return content;
}
function verifyMigration(directory: string, manifest: MigrationManifest, source: Buffer): void {
  const chats = legacyChats(source, manifest.backup);
  const names = fs.readdirSync(directory).sort();
  const expected = manifest.records.map(({ file }) => file).sort();
  if (chats.length !== manifest.records.length || !isDeepStrictEqual(names, expected)) fail('迁移会话数量不一致。');
  for (const entry of manifest.records) {
    const record = readRecord(directory, entry.file);
    if (hash(bytes(path.join(directory, entry.file))) !== entry.hash || record.chat.id !== entry.id ||
      record.position !== entry.position || !isDeepStrictEqual(record.chat, chats[entry.position])) {
      fail(`迁移会话内容或哈希不一致：${entry.id}`);
    }
  }
}

/** 旧入口只用于一次性迁移；正式目录发布前旧文件始终是权威来源，发布后只核验并完成清理。 */
function migrateChatStore(stateDir: string, directory: string): void {
  const legacy = path.join(stateDir, 'chats.json');
  const staging = path.join(stateDir, 'chat-store-migrating');
  const marker = path.join(stateDir, 'chat-store-migration.json');
  const backups = path.join(stateDir, 'chat-store-backups');
  const published = directoryExists(directory);
  const staged = directoryExists(staging);
  const marked = stat(marker) !== null;
  const old = stat(legacy) !== null;
  if (published) {
    if (staged) fail('正式目录与迁移暂存目录同时存在，无法核实迁移阶段。');
    if (!marked) { if (old) fail('新旧聊天记录同时存在但缺少迁移标记。'); return; }
    const manifest = readManifest(marker);
    const source = verifyBackup(backups, manifest);
    if (old && hash(bytes(legacy)) !== manifest.legacyHash) fail('旧聊天文件在迁移后发生变化。');
    verifyMigration(directory, manifest, source);
    if (old) fs.unlinkSync(legacy);
    fs.unlinkSync(marker);
    return;
  }
  if (!old) {
    if (marked || staged) fail('迁移未完成且旧聊天文件缺失，不能初始化为空会话。');
    return;
  }
  const source = bytes(legacy);
  const sourceHash = hash(source);
  let backup: string;
  if (marked) {
    const manifest = readManifest(marker);
    if (manifest.legacyHash !== sourceHash) fail('旧聊天文件与未完成迁移的哈希不一致。');
    verifyBackup(backups, manifest);
    backup = manifest.backup;
  } else {
    if (!directoryExists(backups)) fs.mkdirSync(backups);
    backup = `chats-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.json`;
    const file = path.join(backups, backup);
    fs.writeFileSync(file, source, { flag: 'wx', mode: 0o600 });
    fs.writeFileSync(`${file}.sha256`, `${sourceHash}\n`, { flag: 'wx', mode: 0o600 });
    if (hash(bytes(file)) !== sourceHash) fail('迁移备份复核失败。');
  }
  // 完整旧文件及备份均已验证后，才可丢弃上次未发布的暂存内容。
  const chats = legacyChats(source, legacy);
  if (staged) fs.rmSync(staging, { recursive: true });
  fs.mkdirSync(staging);
  const manifest: MigrationManifest = { version: 1, legacyHash: sourceHash, backup, records: [] };
  chats.forEach((chat, position) => {
    const file = recordName(chat.id);
    const content = JSON.stringify({ version: 1, position, chat } satisfies ChatRecord, null, 2);
    atomicWrite(path.join(staging, file), content);
    manifest.records.push({ id: chat.id, file, position, hash: hash(content) });
  });
  verifyMigration(staging, manifest, source);
  atomicWrite(marker, JSON.stringify(manifest, null, 2));
  fs.renameSync(staging, directory);
  verifyMigration(directory, manifest, verifyBackup(backups, manifest));
  // 先清理旧文件，再清理标记；任一步失败都可通过正式目录、标记与备份恢复。
  if (hash(bytes(legacy)) !== sourceHash) fail('旧聊天文件在迁移期间发生变化。');
  fs.unlinkSync(legacy);
  fs.unlinkSync(marker);
}

export interface ChatSummary extends Pick<Chat, 'id' | 'title' | 'createdAt' | 'historyState' | 'paperIds'> {
  classifyRunning: boolean;
  messages: Array<Pick<ChatMessage, 'id' | 'role' | 'status' | 'text'>>;
}
interface ChatIndex {
  position: number;
  summary: ChatSummary;
  drafts: string[];
  streaming: boolean;
  reconcile: boolean;
}

function indexRecord({ chat, position }: ChatRecord): ChatIndex {
  const { id, title, createdAt, historyState, paperIds } = chat;
  const runs = chat.classifyRuns ?? [];
  const classifyRunning = runs.some(activeClassifyRun);
  const last = chat.messages.at(-1);
  // JSON.parse 可能让短字段引用整篇 JSON 的底层字符串。只复制索引字段，让正文可被独立回收。
  const receipts = runs.length ? new Set(chat.messages.map((message) => message.id)) : undefined;
  const reconcile = classifyRunning || runs.some((run) => !receipts?.has(run.messageId));
  return structuredClone({
    position,
    summary: {
      id, title, createdAt, historyState, paperIds, classifyRunning,
      messages: last && historyState !== 'trashed' ? [chatMessagePreview(last)] : [],
    },
    drafts: (chat.noteDrafts ?? []).map((item) => item.id),
    streaming: chat.messages.some((message) => message.status === 'streaming'),
    reconcile,
  });
}

/** 启动逐篇校验并建立轻量索引；完整正文按需加载，只有空闲正文参与淘汰。 */
export class ChatStore {
  readonly directory: string;
  private readonly index = new Map<string, ChatIndex>();
  private readonly resident = new Map<string, Chat>();
  private readonly unsaved = new Set<string>();
  private readonly pins = new Map<string, number>();
  private nextPosition = 0;

  constructor(stateDir: string, private readonly idleLimit = 4) {
    if (!Number.isSafeInteger(idleLimit) || idleLimit < 1) throw new Error('聊天缓存容量无效。');
    fs.mkdirSync(stateDir, { recursive: true });
    this.directory = path.join(stateDir, 'chats');
    migrateChatStore(stateDir, this.directory);
    if (!directoryExists(this.directory)) fs.mkdirSync(this.directory);
    const records: ChatIndex[] = [];
    const stale: string[] = [];
    for (const name of fs.readdirSync(this.directory)) {
      if (/^[a-f\d]{64}\.json\.[a-f\d-]{36}\.writing$/.test(name)) {
        const file = path.join(this.directory, name);
        const info = stat(file);
        if (!info?.isFile() || info.isSymbolicLink()) fail(`临时记录不是普通文件：${name}`);
        stale.push(file);
      } else {
        if (!/^[a-f\d]{64}\.json$/.test(name)) fail(`无法识别的会话记录：${name}`);
        records.push(indexRecord(readRecord(this.directory, name)));
      }
    }
    records.sort((a, b) => a.position - b.position);
    const used = new Set<number>();
    for (const entry of records) {
      const { position, summary: { id } } = entry;
      if (this.index.has(id) || used.has(position)) fail('会话编号或原数组位置重复。');
      this.index.set(id, entry);
      used.add(position);
      this.nextPosition = Math.max(this.nextPosition, position + 1);
    }
    for (const file of stale) fs.unlinkSync(file);
  }

  summaries(): ChatSummary[] { return structuredClone(Array.from(this.index.values(), ({ summary }) => summary)); }
  get residentCount(): number { return this.resident.size; }

  candidates(kind: 'streaming' | 'reconcile'): string[] {
    return [...this.index.values()].filter((entry) => entry[kind]).map(({ summary }) => summary.id);
  }

  draftOwner(draftId: string): string | undefined {
    for (const { summary, drafts } of this.index.values()) if (drafts.includes(draftId)) return summary.id;
    return undefined;
  }

  get(id: string): Chat | undefined {
    const entry = this.index.get(id);
    if (!entry) return undefined;
    let chat = this.resident.get(id);
    if (chat) this.resident.delete(id);
    else {
      const record = readRecord(this.directory, recordName(id));
      if (record.position !== entry.position) fail('会话位置已发生变化。');
      chat = record.chat;
    }
    this.resident.set(id, chat);
    this.trim();
    return chat;
  }

  /** 异步操作可能重叠（例如回答结束后工具仍在收尾），须等最后一个持有方释放。 */
  pin(id: string): () => void {
    this.pins.set(id, (this.pins.get(id) ?? 0) + 1);
    return () => {
      const count = this.pins.get(id)! - 1;
      if (count) this.pins.set(id, count);
      else this.pins.delete(id);
      this.trim();
    };
  }

  async withPin<T>(id: string, work: () => Promise<T>): Promise<T> {
    const release = this.pin(id);
    try { return await work(); }
    finally { release(); }
  }

  private trim(): void {
    if (this.resident.size <= this.idleLimit) return;
    const idle = [...this.resident.keys()].filter((id) =>
      !this.pins.has(id) && !this.unsaved.has(id) && !this.index.get(id)?.summary.classifyRunning);
    for (const id of idle.slice(0, Math.max(0, idle.length - this.idleLimit))) this.resident.delete(id);
  }

  create(chat: Chat): void {
    if (this.index.has(chat.id)) throw new Error('会话编号重复。');
    this.resident.set(chat.id, chat);
    try { this.save(chat.id); }
    catch (error) {
      this.resident.delete(chat.id);
      this.unsaved.delete(chat.id);
      throw error;
    }
  }

  fileFor(chatId: string): string { return path.join(this.directory, recordName(chatId)); }

  save(chatId: string): void {
    const chat = this.resident.get(chatId);
    if (!chat) throw new Error(`无法保存未加载或不存在的会话：${chatId}`);
    const position = this.index.get(chatId)?.position ?? this.nextPosition;
    if (!Number.isSafeInteger(position)) throw new Error('会话顺序超出可保存范围。');
    // 只有成功替换磁盘记录才更新摘要并允许淘汰；失败保留唯一正文，以供回滚和重试。
    this.unsaved.add(chatId);
    const record: ChatRecord = { version: 1, position, chat };
    const entry = indexRecord(record);
    atomicWrite(this.fileFor(chatId), JSON.stringify(record, null, 2));
    this.index.set(entry.summary.id, entry);
    this.unsaved.delete(chatId);
    this.nextPosition = Math.max(this.nextPosition, position + 1);
    this.trim();
  }
}
