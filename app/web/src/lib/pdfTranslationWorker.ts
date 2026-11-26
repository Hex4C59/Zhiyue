import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { statusError } from './errors.js';

export const PDF_TRANSLATION_REVISION = 'mineru-md-zh-CN-2';

export type MarkdownBlockKind = 'heading' | 'meta' | 'reference' | 'table' | 'math' | 'code' | 'image' | 'prose';

export interface MarkdownBlock {
  kind: MarkdownBlockKind;
  text: string;
}

export interface TranslationModel {
  id: string;
  fingerprint: string;
  complete(
    mode: 'paragraph' | 'batch',
    text: string,
    signal: AbortSignal,
    retry?: boolean,
    context?: string,
  ): Promise<string>;
}

export interface TranslationOutput {
  sections: number;
  images: number;
}

export interface TranslationWorkerOptions {
  python: string;
  mineru: string;
  script: string;
  source: string;
  work: string;
  sourceHash: string;
  model: TranslationModel;
  signal: AbortSignal;
  progress(percent: number, stage: string): void;
}

const MAX_BATCH_CHARS = 2800;
const MAX_BATCH_ITEMS = 6;
const CONCURRENCY = 2;

export function validTranslationOutput(value: unknown): value is TranslationOutput {
  if (!value || typeof value !== 'object') return false;
  const { sections, images } = value as Partial<TranslationOutput>;
  return typeof sections === 'number' && Number.isSafeInteger(sections) && sections >= 0 &&
    typeof images === 'number' && Number.isSafeInteger(images) && images >= 0;
}

const DOCVORTEX_PAGE_NOISE =
  /(?:<small>\s*)?<span\b[^>]*class="[^"]*docvortex-page-(?:header|footer|number|footnote)[^"]*"[^>]*>[\s\S]*?<\/span>(?:\s*<\/small>)?/gi;
const REFERENCES_HEADING = /^#{1,6}\s+(?:(?:\d+\.?|[IVX]+\.?)\s+)?(?:references|bibliography|works\s+cited)\s*$/i;
const POST_REFERENCES_HEADING =
  /^#{1,2}\s+(?:(?:appendix|appendices|supplementary|acknowledg|about\s+the\s+authors|biography)\b|[A-Z]\.\s+)/i;
const ABSTRACT_OR_KEYWORDS = /^(?:\*{0,2})(?:abstract|summary|keywords?|index\s+terms?)(?:\*{0,2})[\s.:—–-]/i;
const RUNNING_HEADER_AUTHOR = /^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3}\s+et\s+al\.?$/;

function normalizeHeadingLevel(line: string): string {
  const trimmed = line.trimEnd();
  const match = /^(#{2,3})\s+(\d+\.\d+(?:\.\d+)?)\.?(?:\s+(.*))$/.exec(trimmed);
  if (!match) return trimmed;
  const num = match[2] as string;
  const rest = match[3] as string;
  const depth = num.split('.').length;
  const hashes = depth >= 3 ? '####' : '###';
  return `${hashes} ${num}. ${rest}`;
}

function isRunningHeaderNoise(text: string): boolean {
  const single = text.trim();
  if (!single || single.includes('\n') || single.length > 80) return false;
  return RUNNING_HEADER_AUTHOR.test(single);
}

/**
 * 将 MinerU 输出的 Markdown 切分为结构块：
 * - 论文大标题与章节标题（heading）、头部作者/机构元信息（meta）、参考文献区（reference）、
 *   表格（table）、独立公式（math）、代码块（code）、纯图片（image）原样保留不翻译；
 * - 正文段落与图表说明（prose）送入模型翻译。
 */
export function splitMarkdownBlocks(source: string): MarkdownBlock[] {
  const cleaned = source.replace(DOCVORTEX_PAGE_NOISE, '').replace(/\r\n?/g, '\n');
  const lines = cleaned.split('\n');
  const blocks: MarkdownBlock[] = [];
  let prose: string[] = [];
  let inFrontMatter = false;
  let seenBodyHeading = false;
  let inReferences = false;

  const pushMeta = (text: string): void => {
    const prev = blocks[blocks.length - 1];
    // 合并被 PDF 换行拆断的作者名单行（上一行以逗号或 and 结尾）
    if (prev?.kind === 'meta' && /(?:,|(?:\s+and))\s*$/i.test(prev.text)) {
      prev.text = `${prev.text} ${text}`;
      return;
    }
    blocks.push({ kind: 'meta', text });
  };

  const flushProse = (): void => {
    const text = prose.join('\n').trim();
    prose = [];
    if (!text) return;
    if (inReferences) {
      blocks.push({ kind: 'reference', text });
      return;
    }
    if (inFrontMatter) {
      const plainLen = text.replace(/<[^>]+>/g, '').replace(/[*_`]/g, '').trim().length;
      if (ABSTRACT_OR_KEYWORDS.test(text) || plainLen > 420) {
        inFrontMatter = false;
      } else {
        pushMeta(text);
        return;
      }
    }
    if (isRunningHeaderNoise(text)) return;
    blocks.push({ kind: 'prose', text });
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] as string;
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushProse();
      continue;
    }

    // 1. 标题（论文大标题与所有章节标题均保留英文原文，并按编号深度规范 H2/H3/H4 层级）
    if (/^#{1,6}\s+/.test(trimmed)) {
      flushProse();
      const normalized = normalizeHeadingLevel(rawLine);
      if (/^#\s+/.test(normalized) && !seenBodyHeading && blocks.length === 0) {
        inFrontMatter = true;
      } else {
        inFrontMatter = false;
        seenBodyHeading = true;
      }
      if (REFERENCES_HEADING.test(normalized)) {
        inReferences = true;
      } else if (inReferences && POST_REFERENCES_HEADING.test(normalized)) {
        inReferences = false;
      }
      blocks.push({ kind: 'heading', text: normalized });
      continue;
    }

    // 2. 代码围栏
    const fence = /^(`{3,}|~{3,})/.exec(trimmed);
    if (fence) {
      flushProse();
      const marker = fence[1] as string;
      const closeRe = new RegExp(`^\\s*${marker[0]}{${marker.length},}\\s*$`);
      const chunk = [rawLine];
      while (i + 1 < lines.length) {
        i++;
        chunk.push(lines[i] as string);
        if (closeRe.test(lines[i] as string)) break;
      }
      blocks.push({ kind: 'code', text: chunk.join('\n') });
      continue;
    }

    // 3. 独立块级公式 $$...$$ 或 \[...\]
    if (trimmed.startsWith('$$') || trimmed.startsWith('\\[')) {
      flushProse();
      const isDollar = trimmed.startsWith('$$');
      const closing = isDollar ? '$$' : '\\]';
      const rest = trimmed.slice(2);
      const chunk = [rawLine];
      if (!(rest.length > 0 && rest.endsWith(closing))) {
        while (i + 1 < lines.length) {
          i++;
          chunk.push(lines[i] as string);
          if ((lines[i] as string).trimEnd().endsWith(closing)) break;
        }
      }
      blocks.push({ kind: 'math', text: chunk.join('\n') });
      continue;
    }

    // 4. HTML 表格（MinerU 默认输出 <table>...</table>）
    if (/^<table\b/i.test(trimmed)) {
      flushProse();
      const chunk = [rawLine];
      if (!/<\/table>/i.test(trimmed)) {
        while (i + 1 < lines.length) {
          i++;
          chunk.push(lines[i] as string);
          if (/<\/table>/i.test(lines[i] as string)) break;
        }
      }
      blocks.push({ kind: 'table', text: chunk.join('\n') });
      continue;
    }

    // 5. Markdown 管道表格
    if (
      rawLine.includes('|') &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[i + 1] as string)
    ) {
      flushProse();
      const chunk = [rawLine, lines[++i] as string];
      while (i + 1 < lines.length && (lines[i + 1] as string).includes('|') && (lines[i + 1] as string).trim()) {
        chunk.push(lines[++i] as string);
      }
      blocks.push({ kind: 'table', text: chunk.join('\n') });
      continue;
    }

    // 6. 独立图片行
    if (/^!\[[^\]]*\]\([^)]+\)$/.test(trimmed)) {
      flushProse();
      blocks.push({ kind: 'image', text: trimmed });
      continue;
    }

    // 将 MinerU 输出的 Unicode 列表符（如 − / •）转为标准 Markdown 列表
    const normalizedLine = rawLine.replace(/^([ \t]*)[•·▪●◦−]\s+(?=\S)/, '$1- ');
    prose.push(normalizedLine);
  }
  flushProse();
  return blocks;
}

function shouldTranslateProse(text: string): boolean {
  return /[A-Za-z]{2,}/.test(text);
}

function buildBatchPrompt(items: Array<{ id: number; text: string }>): string {
  const payload = items.map(({ id, text }) => ({ id, text }));
  return [
    'Translate each item in the following JSON array into Simplified Chinese.',
    'Return ONLY a JSON array of objects with the exact same `id` values and `output` string fields.',
    'Preserve all LaTeX formulas ($...$, $$...$$), Markdown syntax, citations, numbers, URLs, and image links.',
    '',
    JSON.stringify(payload),
  ].join('\n');
}

function parseBatchReply(expectedIds: number[], reply: string): Map<number, string> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(reply.trim().replace(/^```(?:json)?\s*|\s*```$/gi, ''));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length !== expectedIds.length) return null;
  const remaining = new Set(expectedIds);
  const outputs = new Map<number, string>();
  for (const item of parsed) {
    if (!item || typeof item !== 'object') return null;
    const id = (item as { id?: unknown }).id;
    const output = (item as { output?: unknown }).output;
    if (typeof id !== 'number' || !remaining.delete(id) || typeof output !== 'string' || !output.trim()) {
      return null;
    }
    outputs.set(id, output.trim());
  }
  return remaining.size === 0 ? outputs : null;
}

function buildDocumentContext(blocks: MarkdownBlock[]): string | undefined {
  const title = blocks.find((b) => b.kind === 'heading' && /^#\s+/.test(b.text))?.text.replace(/^#\s+/, '').trim();
  const abstractBlock = blocks.find((b) => b.kind === 'prose' && ABSTRACT_OR_KEYWORDS.test(b.text))?.text.trim()
    ?? blocks.find((b) => b.kind === 'prose' && b.text.length >= 120)?.text.trim();
  const parts: string[] = [];
  if (title) parts.push(`Title: ${title.slice(0, 240)}`);
  if (abstractBlock) parts.push(`Excerpt: ${abstractBlock.slice(0, 700)}`);
  return parts.length ? parts.join('\n') : undefined;
}

async function translateSingle(
  text: string,
  model: TranslationModel,
  signal: AbortSignal,
  context?: string,
  onError?: (message: string) => void,
): Promise<string> {
  try {
    const reply = await model.complete('paragraph', text, signal, false, context);
    signal.throwIfAborted();
    return reply.trim() || text;
  } catch (error) {
    if (signal.aborted) throw error;
    // 单段重试一次；仍失败时保留原文，不拖垮整篇翻译，同时记录具体错误供全篇失败时提示。
    try {
      const retry = await model.complete('paragraph', text, signal, true, context);
      signal.throwIfAborted();
      return retry.trim() || text;
    } catch (retryError) {
      if (signal.aborted) throw retryError;
      if (retryError instanceof Error && retryError.message) onError?.(retryError.message);
      return text;
    }
  }
}

export async function translateMarkdownBlocks(
  blocks: MarkdownBlock[],
  model: TranslationModel,
  signal: AbortSignal,
  onProgress?: (done: number, total: number) => void,
): Promise<{ markdown: string; translatedCount: number }> {
  const targets: Array<{ index: number; text: string }> = [];
  blocks.forEach((block, index) => {
    if (block.kind === 'prose' && shouldTranslateProse(block.text)) {
      targets.push({ index, text: block.text });
    }
  });

  if (!targets.length) {
    return { markdown: blocks.map((b) => b.text).join('\n\n') + '\n', translatedCount: 0 };
  }

  const docContext = buildDocumentContext(blocks);

  // 按字符与条数预算组装批次
  const batches: Array<Array<{ id: number; index: number; text: string }>> = [];
  let current: Array<{ id: number; index: number; text: string }> = [];
  let chars = 0;
  for (const target of targets) {
    if (current.length && (current.length >= MAX_BATCH_ITEMS || chars + target.text.length > MAX_BATCH_CHARS)) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push({ id: current.length + 1, ...target });
    chars += target.text.length;
  }
  if (current.length) batches.push(current);

  const results = blocks.map((b) => b.text);
  let completed = 0;
  let translatedCount = 0;
  let cursor = 0;
  let lastError = '';
  const recordError = (message: string): void => { if (message) lastError = message; };

  const runWorker = async (): Promise<void> => {
    while (cursor < batches.length) {
      signal.throwIfAborted();
      const batch = batches[cursor++]!;
      if (batch.length === 1) {
        const item = batch[0]!;
        const translated = await translateSingle(item.text, model, signal, docContext, recordError);
        results[item.index] = translated;
        if (translated !== item.text) translatedCount++;
        completed += 1;
        onProgress?.(completed, targets.length);
        continue;
      }
      let mapped: Map<number, string> | null = null;
      try {
        const reply = await model.complete('batch', buildBatchPrompt(batch), signal, false, docContext);
        signal.throwIfAborted();
        mapped = parseBatchReply(batch.map((item) => item.id), reply);
      } catch (error) {
        if (signal.aborted) throw error;
        if (error instanceof Error && error.message) recordError(error.message);
      }
      if (mapped) {
        for (const item of batch) {
          const translated = mapped.get(item.id) ?? item.text;
          results[item.index] = translated;
          if (translated !== item.text) translatedCount++;
        }
        completed += batch.length;
        onProgress?.(completed, targets.length);
      } else {
        // 批量 JSON 未对齐时降级为逐段独立翻译，单段异常回退原文。
        for (const item of batch) {
          signal.throwIfAborted();
          const translated = await translateSingle(item.text, model, signal, docContext, recordError);
          results[item.index] = translated;
          if (translated !== item.text) translatedCount++;
          completed += 1;
          onProgress?.(completed, targets.length);
        }
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, () => runWorker()));
  if (translatedCount === 0) {
    throw statusError(lastError || '模型未能返回有效中文译文，请检查模型配置后重试。', 502);
  }
  return { markdown: results.join('\n\n') + '\n', translatedCount };
}

async function runMineruParser(options: TranslationWorkerOptions): Promise<{ markdownPath: string; images: number }> {
  const { python, mineru, script, source, work, sourceHash, signal, progress } = options;
  signal.throwIfAborted();
  const child = spawn(
    python,
    [script, 'parse', '--source', source, '--work', work, '--source-hash', sourceHash, '--mineru', mineru],
    {
      shell: false, windowsHide: true, detached: process.platform !== 'win32', cwd: work,
      env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  child.stderr.resume();
  let spawnFailed = false;
  const exited = new Promise<number | null>((resolve) => {
    child.once('error', () => { spawnFailed = true; });
    child.once('close', resolve);
  });
  let stopping = false;
  const stop = (): void => {
    if (stopping || !child.pid || child.exitCode !== null || child.signalCode !== null) return;
    stopping = true;
    if (process.platform === 'win32') {
      const taskkill = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/taskkill.exe');
      const killer = spawn(taskkill, ['/PID', String(child.pid), '/T', '/F'], {
        windowsHide: true, stdio: 'ignore', shell: false,
      });
      killer.once('error', () => child.kill());
      killer.once('exit', (code) => { if (code !== 0) child.kill(); });
    } else {
      try { process.kill(-child.pid, 'SIGKILL'); }
      catch { child.kill(); }
    }
  };
  const timeout = AbortSignal.timeout(20 * 60_000);
  const runSignal = AbortSignal.any([signal, timeout]);
  runSignal.addEventListener('abort', stop, { once: true });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  let parsed: { markdownPath: string; images: number } | undefined;
  let workerError: string | undefined;
  try {
    for await (const line of lines) {
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(line) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (event.type === 'progress' && typeof event.percent === 'number' && typeof event.stage === 'string') {
        progress(Math.max(0, Math.min(30, event.percent)), event.stage);
      } else if (event.type === 'parsed' && typeof event.markdown === 'string' && typeof event.images === 'number') {
        parsed = { markdownPath: event.markdown, images: event.images };
      } else if (event.type === 'error' && typeof event.error === 'string') {
        workerError = event.error;
      }
    }
    const code = await exited;
    signal.throwIfAborted();
    if (timeout.aborted) throw statusError('MinerU 解析 PDF 超时，请重试。', 504);
    if (spawnFailed) throw statusError('无法启动 MinerU 解析环境，请检查配置。', 503);
    if (workerError) throw statusError(workerError, 422);
    if (code !== 0 || !parsed) throw statusError('MinerU 解析进程意外结束，请检查环境。', 500);
    return parsed;
  } finally {
    lines.close();
    stop();
    await exited;
    runSignal.removeEventListener('abort', stop);
  }
}

export async function runTranslationWorker(options: TranslationWorkerOptions): Promise<TranslationOutput> {
  const { work, model, signal, progress } = options;
  const parsed = await runMineruParser(options);
  signal.throwIfAborted();
  progress(32, '切分章节、公式与表格');
  const rawMarkdown = await readFile(parsed.markdownPath, 'utf8');
  const blocks = splitMarkdownBlocks(rawMarkdown);
  progress(35, '翻译学术正文与图表标题');
  const { markdown, translatedCount } = await translateMarkdownBlocks(blocks, model, signal, (done, total) => {
    const pct = total ? Math.round(35 + (done / total) * 60) : 95;
    progress(Math.min(95, pct), `翻译正文 (${done}/${total})`);
  });
  signal.throwIfAborted();
  progress(97, '组装中文精读文稿与插图');
  const resultDir = path.join(work, 'result');
  await mkdir(resultDir, { recursive: true });
  await writeFile(path.join(resultDir, 'zh.md'), markdown, 'utf8');
  const parsedImages = path.join(path.dirname(parsed.markdownPath), 'images');
  if (existsSync(parsedImages)) {
    await cp(parsedImages, path.join(resultDir, 'images'), { recursive: true });
  }
  return { sections: translatedCount, images: parsed.images };
}
