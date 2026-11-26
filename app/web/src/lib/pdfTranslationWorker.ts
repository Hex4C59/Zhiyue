import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { statusError } from './errors.js';

export const PDF_TRANSLATION_REVISION = 'babeldoc-0.7.1-zh-CN-4';
const BATCH_INPUT = '\n## Here is the input:\n';
const PROMPTED_PARAGRAPH_INPUT = '\n## Output\n\n' +
  'Output ONLY the translated zh-CN text. No explanations, no backticks, no extra text.\n\n' +
  'Now translate the following text:\n\n';

const ENGLISH_MONTH = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|' +
  'Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';
const MONTH_ABBREVIATIONS = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');
const ORDINAL_DAY = /(\d{1,2})(?:st|nd|rd|th)?/.source;
const DATE_YEAR = /(?:,\s*|\s+)(\d{4})\b/.source;
const MONTH_FIRST_DATE = new RegExp(String.raw`\b(${ENGLISH_MONTH})\.?\s+${ORDINAL_DAY}${DATE_YEAR}`, 'giu');
const DAY_FIRST_DATE = new RegExp(String.raw`\b${ORDINAL_DAY}\s+(${ENGLISH_MONTH})\.?${DATE_YEAR}`, 'giu');
const CHINESE_DATE = /(?<!\d)(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/gu;

function replaceCalendarDates(text: string, replace: (literal: string, key: string) => string): string {
  const replaceDate = (literal: string, year: string, month: number, day: string): string => {
    const lastDay = new Date(0);
    lastDay.setUTCFullYear(Number(year), month, 0);
    if (Number(year) < 1 || month < 1 || month > 12 || Number(day) < 1 || Number(day) > lastDay.getUTCDate()) {
      return literal;
    }
    return replace(literal, `date:${year}-${month}-${Number(day)}`);
  };
  const monthNumber = (name: string): number => MONTH_ABBREVIATIONS.indexOf(name.slice(0, 3).toLowerCase()) + 1;
  return text.replace(MONTH_FIRST_DATE, (date, month, day, year) => replaceDate(date, year, monthNumber(month), day))
    .replace(DAY_FIRST_DATE, (date, day, month, year) => replaceDate(date, year, monthNumber(month), day))
    .replace(CHINESE_DATE, (date, year, month, day) => replaceDate(date, year, Number(month), day));
}

function preservesMarkers(before: string, after: string): boolean {
  const marks = (text: string): string[] => {
    const dates: string[] = [];
    // 英文月份译为数字时，按完整日期核对，避免把月份误报为新增数值或放过交换的月和日。
    const body = replaceCalendarDates(text.normalize('NFKC').replaceAll('−', '-'), (_literal, date) => {
      dates.push(date);
      return ' ';
    });
    const other = body.match(/<\/?b\d+>|\[[\d\s,;\-–]+\]|\{[A-Za-z_]\w*\}|[-+]?\d+(?:[.,]\d+)*%?/gu) ?? [];
    return dates.concat(other.map((mark) => mark.replace(/\s+/g, ''))).sort();
  };
  return JSON.stringify(marks(before)) === JSON.stringify(marks(after));
}

class InvalidTranslationReply extends Error {
  readonly statusCode = 502;

  constructor() {
    super('模型译文的段落、公式占位符、数字或引用不一致，请重试。');
  }
}

interface BatchParagraph {
  id: number;
  input: string;
}

type ModelPrompt =
  | { kind: 'paragraph'; header: string; input: string }
  | { kind: 'batch'; header: string; input: BatchParagraph[] };

// BabelDOC 0.7.1 的 LLM 回调既发送批量 JSON，也发送带标题和公式提示的单段请求。
function parsePrompt(mode: 'paragraph' | 'batch', source: string): ModelPrompt {
  if (mode === 'paragraph') return { kind: 'paragraph', header: '', input: source };
  const paragraph = source.indexOf(PROMPTED_PARAGRAPH_INPUT);
  if (paragraph >= 0) {
    // 公式提示里的示例数字和占位符不属于待译正文。
    const offset = paragraph + PROMPTED_PARAGRAPH_INPUT.length;
    return { kind: 'paragraph', header: source.slice(0, offset), input: source.slice(offset) };
  }
  const batch = source.lastIndexOf(BATCH_INPUT);
  if (batch >= 0) {
    const header = source.slice(0, batch + BATCH_INPUT.length);
    let input: unknown;
    try {
      input = JSON.parse(source.slice(header.length));
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
    if (Array.isArray(input) && input.every((entry) => Number.isSafeInteger(entry?.id) &&
        typeof entry.input === 'string') && new Set(input.map((entry) => entry.id)).size === input.length) {
      return { kind: 'batch', header, input };
    }
  }
  throw statusError('PDF 翻译引擎返回了无法识别的提示格式。', 500);
}

const NUMERIC_LITERAL = new RegExp([
  `(${/\{[A-Za-z_]\w*\}|\[\[[^\]\r\n]*\]\]|%%[^%\r\n]*%%/.source})`,
  /<\/?b\d+>|\[[\d\s,;\-–]+\]/.source,
  /(?:\b[A-Z][A-Z\d]*[-‐‑–][ \t]*)?[-+−]?\d+(?:[.,]\d+)*%?/.source,
].join('|'), 'gu');

function protectNumbers(prompt: ModelPrompt) {
  const prefix = `ZHIYUE_KEEP_${randomBytes(4).toString('hex')}_`;
  const values = new Map<string, string>();
  const protect = (value: string): string => {
    const key = `[[${prefix}${values.size}]]`;
    values.set(key, value);
    return key;
  };
  // 重试时用同一个占位符保护完整日期，避免模型补写月份或年份。
  const protectInput = (input: string): string => replaceCalendarDates(input, protect)
    .replace(NUMERIC_LITERAL, (value, existingPlaceholder) => existingPlaceholder ? value : protect(value));
  // 只替换待译正文。原有段落编号和引擎提示不变，所有临时标记在回填前还原。
  const input = prompt.kind === 'paragraph' ? protectInput(prompt.input) : JSON.stringify(
    prompt.input.map((entry) => ({ ...entry, input: protectInput(entry.input) })),
  );
  const token = `\\[\\[${prefix}\\d+\\]\\]`;
  const marker = new RegExp(token, 'gu');
  const joined = new RegExp(`(${token})([.,．，]?)(?=(${token}))`, 'gu');
  return {
    text: prompt.header + input,
    restore: (output: string) => output.replace(joined, (match, left, _punctuation, right) => (
      // 译文可能删去逗号后的空格。两个独立数字还原后不能合并成同一个数值。
      /\d$/.test(values.get(left) ?? '') && /^\d/.test(values.get(right) ?? '') ? `${match} ` : match
    )).replace(marker, (key) => {
      const value = values.get(key);
      if (value === undefined) throw new InvalidTranslationReply();
      values.delete(key);
      return value;
    }),
    complete: () => values.size === 0,
  };
}

function validParagraph(input: string, output: string): boolean {
  return !!output.trim() && preservesMarkers(input, output);
}

function batchOutputs(input: BatchParagraph[], answer: string): Map<number, string> {
  let result: unknown;
  try {
    result = JSON.parse(answer.trim().replace(/^```(?:json)?\s*|\s*```$/gi, ''));
  } catch (error) {
    if (error instanceof SyntaxError) throw new InvalidTranslationReply();
    throw error;
  }
  if (!Array.isArray(result) || input.length !== result.length) throw new InvalidTranslationReply();
  const ids = new Set(input.map(({ id }) => id));
  const outputs = new Map<number, string>();
  for (const entry of result) {
    if (!ids.delete(entry?.id) || typeof entry.output !== 'string') throw new InvalidTranslationReply();
    outputs.set(entry.id, entry.output);
  }
  return outputs;
}

function checkedOutput(prompt: ModelPrompt, answer: string, restore = (text: string) => text): string {
  const check = (input: string, reply: string): string => {
    const output = restore(reply);
    if (!validParagraph(input, output)) throw new InvalidTranslationReply();
    return output;
  };
  if (prompt.kind === 'paragraph') return check(prompt.input, answer);
  const outputs = batchOutputs(prompt.input, answer);
  return JSON.stringify(prompt.input.map(({ id, input }) => ({ id, output: check(input, outputs.get(id)!) })));
}

function validBatchParagraphs(input: BatchParagraph[], answer: string): Map<number, string> {
  let outputs: Map<number, string>;
  try {
    outputs = batchOutputs(input, answer);
  } catch (error) {
    if (!(error instanceof InvalidTranslationReply)) throw error;
    return new Map();
  }
  for (const paragraph of input) {
    if (!validParagraph(paragraph.input, outputs.get(paragraph.id)!)) outputs.delete(paragraph.id);
  }
  return outputs;
}

async function translateRequest(
  mode: 'paragraph' | 'batch', source: string, model: TranslationModel, signal: AbortSignal,
): Promise<string> {
  const prompt = parsePrompt(mode, source);
  const answer = await model.complete(mode, source, signal);
  signal.throwIfAborted();
  try {
    return checkedOutput(prompt, answer);
  } catch (error) {
    if (!(error instanceof InvalidTranslationReply)) throw error;
  }
  // 段落编号能对齐时，只重试校验失败的段落；后续按原编号合并已核对的译文。
  const accepted = prompt.kind === 'batch' ? validBatchParagraphs(prompt.input, answer) : new Map<number, string>();
  const pending = prompt.kind === 'batch' ? { ...prompt, input: prompt.input.filter(({ id }) => !accepted.has(id)) }
    : prompt;
  const protectedInput = protectNumbers(pending);
  const retry = await model.complete(mode, protectedInput.text, signal, true);
  signal.throwIfAborted();
  const checked = checkedOutput(pending, retry, protectedInput.restore);
  if (!protectedInput.complete()) throw new InvalidTranslationReply();
  if (prompt.kind !== 'batch' || pending.kind !== 'batch' || !accepted.size) return checked;
  const repaired = batchOutputs(pending.input, checked);
  return JSON.stringify(prompt.input.map(({ id }) => ({ id, output: accepted.get(id) ?? repaired.get(id)! })));
}

export interface TranslationModel {
  id: string;
  fingerprint: string;
  complete(mode: 'paragraph' | 'batch', text: string, signal: AbortSignal, retry?: boolean): Promise<string>;
}

export interface TranslationOutput {
  pages: number;
  reviewPages: number[];
}

export interface TranslationWorkerOptions {
  python: string;
  script: string;
  source: string;
  work: string;
  sourceHash: string;
  model: TranslationModel;
  signal: AbortSignal;
  progress(percent: number, stage: string): void;
}

export function validTranslationPages(value: unknown): value is TranslationOutput {
  if (!value || typeof value !== 'object') return false;
  const { pages, reviewPages } = value as Partial<TranslationOutput>;
  return typeof pages === 'number' && Number.isSafeInteger(pages) && pages >= 1 && pages <= 200 &&
    Array.isArray(reviewPages) && reviewPages.length <= pages &&
    reviewPages.every((page) => Number.isSafeInteger(page) && page >= 1 && page <= pages);
}

export async function runTranslationWorker(options: TranslationWorkerOptions): Promise<TranslationOutput> {
  const { python, script, source, work, sourceHash, model, signal, progress } = options;
  signal.throwIfAborted();
  const child = spawn(python, [script, 'translate', '--source', source, '--work', work, '--source-hash', sourceHash], {
    shell: false, windowsHide: true, detached: process.platform !== 'win32', cwd: work,
    env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  // 第三方诊断可能含原文片段，生产任务只消费约定的结构化事件。
  child.stderr.resume();
  child.stdin.on('error', () => {});
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
  const timeout = AbortSignal.timeout(30 * 60_000);
  const runSignal = AbortSignal.any([signal, timeout]);
  runSignal.addEventListener('abort', stop, { once: true });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  let output: TranslationOutput | undefined;
  let workerError: string | undefined;
  let lastRequestId = 0;
  try {
    for await (const line of lines) {
      if (line.length > 512_000) throw statusError('翻译进程返回的数据过大。', 500);
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(line) as Record<string, unknown>;
        if (!event || typeof event !== 'object') throw new Error();
      } catch {
        throw statusError('PDF 翻译进程返回了无效事件。', 500);
      }
      if (event.type === 'progress' && typeof event.percent === 'number' && Number.isFinite(event.percent) &&
        typeof event.stage === 'string' && event.stage.length <= 60) {
        progress(Math.max(0, Math.min(98, event.percent)), event.stage);
      } else if (event.type === 'finish' && validTranslationPages(event)) {
        output = { pages: event.pages, reviewPages: event.reviewPages };
      } else if (event.type === 'error' && typeof event.error === 'string' && event.error.length <= 300) {
        workerError = event.error;
      } else if (event.type === 'request' && (event.mode === 'paragraph' || event.mode === 'batch') &&
        event.id === lastRequestId + 1 && typeof event.text === 'string' && event.text.length <= 128_000) {
        lastRequestId++;
        const requestSignal = AbortSignal.any([runSignal, AbortSignal.timeout(120_000)]);
        const text = await translateRequest(event.mode, event.text, model, requestSignal);
        child.stdin.write(`${JSON.stringify({ id: event.id, text })}\n`);
      } else {
        throw statusError('PDF 翻译进程返回了无效事件。', 500);
      }
    }
    const code = await exited;
    signal.throwIfAborted();
    if (timeout.aborted) throw statusError('PDF 翻译超时，请重试。', 504);
    if (spawnFailed) throw statusError('无法启动 PDF 翻译运行环境。', 503);
    if (workerError) throw statusError(workerError, 422);
    if (code !== 0 || !output) throw statusError('PDF 翻译进程意外结束，请检查运行环境。', 500);
    return output;
  } finally {
    lines.close();
    child.stdin.end();
    stop();
    await exited;
    runSignal.removeEventListener('abort', stop);
  }
}
