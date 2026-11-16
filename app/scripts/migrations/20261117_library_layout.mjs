import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, rename, rmdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const LIBRARY = path.resolve(argument('--library') ?? path.join(REPO, 'library'));
const BACKUP = path.resolve(argument('--backup') ?? path.join(REPO, 'releases/backups/20261117_library_layout/library'));
const DRY_RUN = process.argv.includes('--dry-run');
const REPAIR = process.argv.includes('--repair');

const moves = [
  { from: 'catalog', to: '.zhiyue/catalog', label: '书目索引' },
  { from: 'batches', to: '.zhiyue/batches', label: '下载批次' },
  { from: 'web/data', to: '.zhiyue/data', label: '网站状态与 Pi 会话' },
  { from: 'docs', to: '.zhiyue/docs', label: '内部文档' },
  { from: 'tmp/web_pdf_preview', to: '.zhiyue/cache/pdf-preview', label: 'PDF 预览缓存' },
  { from: 'tmp', to: '.zhiyue/tmp', label: '临时文件' },
];

// 这些目录/文件同时改名，迁移脚本顺带修复跨目录链接。
const externalMoves = [
  { from: path.join(REPO, 'app/tools/download'), to: path.join(REPO, 'app/downloader') },
  { from: path.join(REPO, 'app/web/server.mjs'), to: path.join(REPO, 'app/web/src/server.mjs') },
];

const pathKeys = new Set([
  'file', 'source_record', 'input_file', 'legacy_ledger', 'ledger', 'path', 'image',
  'queue', 'output', 'directory', 'evidence', 'record', 'threadId', 'cwd',
]);

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function relativeFromRepo(target) {
  return path.relative(REPO, target).split(path.sep).join('/');
}

function normalizeSlashes(value) {
  return value.replaceAll('\\', '/');
}

function mapPath(target) {
  const absolute = path.resolve(target);
  for (const move of moves) {
    const from = path.resolve(LIBRARY, move.from);
    if (absolute === from || absolute.startsWith(from + path.sep)) {
      return path.join(LIBRARY, move.to, path.relative(from, absolute));
    }
  }
  for (const move of externalMoves) {
    const from = path.resolve(move.from);
    if (absolute === from || absolute.startsWith(from + path.sep)) {
      return path.join(move.to, path.relative(from, absolute));
    }
  }
  return absolute;
}

async function exists(target) {
  try { await stat(target); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function isEmptyDirectory(target) {
  try { return (await readdir(target)).length === 0; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function walkFiles(directory, extension, filter = () => true) {
  const found = [];
  const visit = async current => {
    let entries;
    try { entries = await readdir(current, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink()) continue;
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.zhiyue' || entry.name === 'node_modules') continue;
        await visit(target);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(extension) && filter(target)) {
        found.push(target);
      }
    }
  };
  await visit(directory);
  return found;
}

async function directoryStats(directory) {
  let files = 0;
  let bytes = 0;
  const visit = async current => {
    let entries;
    try { entries = await readdir(current, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile()) { files++; bytes += (await stat(target)).size; }
    }
  };
  await visit(directory);
  return { files, bytes };
}

function rewritePathValue(raw, oldFile, newFile, { bracket = false } = {}) {
  const leading = raw.match(/^\s*/)[0];
  const trailing = raw.match(/\s*$/)[0];
  const core = raw.slice(leading.length, raw.length - trailing.length);
  if (!core || core.startsWith('#') || core.startsWith('/') || core.startsWith('\\')) return null;
  if (core.startsWith('//') || /^www\./i.test(core)) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(core) || /^[A-Za-z]:[\\/]/.test(core)) return null;
  const suffixAt = core.search(/[?#]/);
  const pathPart = suffixAt >= 0 ? core.slice(0, suffixAt) : core;
  const suffix = suffixAt >= 0 ? core.slice(suffixAt) : '';
  if (!pathPart || pathPart === './' || pathPart === '../') return null;
  const repoRelative = /^library[\\/]/i.test(pathPart);
  const oldTarget = repoRelative ? path.resolve(REPO, pathPart) : path.resolve(path.dirname(oldFile), pathPart);
  const mapped = mapPath(oldTarget);
  let next = path.relative(path.dirname(newFile), mapped).split(path.sep).join('/');
  if (!next) next = '.';
  if (pathPart.endsWith('/') && !next.endsWith('/')) next += '/';
  const oldValue = normalizeSlashes(pathPart);
  if (next === oldValue || (oldValue.startsWith('./') && next === oldValue.slice(2))) return null;
  if (pathPart.startsWith('./') && !next.startsWith('.')) next = `./${next}`;
  return { leading, trailing, value: next + suffix, bracket, from: core, to: next + suffix };
}

function rewriteInlineLinks(text, oldFile, newFile, state) {
  const pattern = /(!?\[[^\]\n]*\]\()(\s*)(<[^>\n]*>|[^)\s]+)(\s*(?:"[^"\n]*")?\s*\))/g;
  return text.replace(pattern, (match, head, space, raw, tail) => {
    const bracketed = raw.startsWith('<') && raw.endsWith('>');
    const result = rewritePathValue(bracketed ? raw.slice(1, -1) : raw, oldFile, newFile, { bracket: bracketed });
    if (!result) return match;
    state.links++;
    state.samples?.push({ from: result.from, to: result.to });
    let value = result.value;
    if (!bracketed && /[ ()]/.test(value)) value = `<${value}>`;
    return head + space + value + tail;
  });
}

function rewriteReferenceLinks(text, oldFile, newFile, state) {
  const pattern = /^(\s*\[[^\]]+\]:\s*)(<[^>\n]*>|\S+)(\s*)$/gm;
  return text.replace(pattern, (match, head, raw, tail) => {
    const bracketed = raw.startsWith('<') && raw.endsWith('>');
    const result = rewritePathValue(bracketed ? raw.slice(1, -1) : raw, oldFile, newFile, { bracket: bracketed });
    if (!result) return match;
    state.links++;
    state.samples?.push({ from: result.from, to: result.to });
    let value = result.value;
    if (!bracketed && /[ ()]/.test(value)) value = `<${value}>`;
    return head + value + tail;
  });
}

function rewriteCodeSpans(text, oldFile, newFile, state) {
  return text.replace(/`([^`\n]+)`/g, (match, raw) => {
    if (/^\s*\.zhiyue[\\/]/.test(raw)) return match;
    const result = rewritePathValue(raw, oldFile, newFile);
    if (!result) return match;
    state.links++;
    state.samples?.push({ from: result.from, to: result.to });
    return '`' + result.leading + result.value + result.trailing + '`';
  });
}

function rewriteMarkdown(text, oldFile, newFile, state) {
  const parts = text.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) return part;
    const linked = rewriteReferenceLinks(rewriteInlineLinks(part, oldFile, newFile, state), oldFile, newFile, state);
    return rewriteCodeSpans(linked, oldFile, newFile, state);
  }).join('');
}

async function rewriteMarkdownFiles() {
  const files = await walkFiles(LIBRARY, '.md');
  const changed = [];
  let links = 0;
  for (const file of files) {
    const oldText = await readFile(file, 'utf8');
    const bom = oldText.startsWith('﻿');
    const body = bom ? oldText.slice(1) : oldText;
    const state = { links: 0, samples: [] };
    const next = rewriteMarkdown(body, file, mapPath(file), state);
    if (next !== body) {
      changed.push({
        file: path.relative(LIBRARY, file).split(path.sep).join('/'),
        links: state.links,
        samples: state.samples.slice(0, 5),
      });
      links += state.links;
      if (!DRY_RUN) await writeFile(file, (bom ? '﻿' : '') + next, 'utf8');
    }
  }
  return { files: files.length, changed, links };
}

function rewriteString(value, key) {
  if (key === 'cwd') {
    if (typeof value !== 'string' || !path.isAbsolute(value)) return value;
    const base = path.basename(value.replaceAll('/', path.sep));
    return base.toLowerCase() === 'library' ? LIBRARY : value;
  }
  if (key === 'threadId') {
    if (typeof value !== 'string' || !path.isAbsolute(value)) return value;
    const name = path.basename(value);
    const oldSessions = path.join(LIBRARY, 'web/data/pi-sessions');
    const nextSessions = path.join(LIBRARY, '.zhiyue/data/pi-sessions');
    if (name && (existsSync(path.join(oldSessions, name)) || existsSync(path.join(nextSessions, name)))) {
      return path.join(nextSessions, name);
    }
    return value;
  }
  if (typeof value !== 'string' || !value) return value;
  if (value.startsWith('#')) return value;
  // Windows 盘符也符合「字母加冒号」，必须先按绝对路径处理，否则会误判为 URL 协议。
  if (/^[A-Za-z]:[\\/]/.test(value)) {
    const mapped = mapPath(value);
    return mapped === path.resolve(value) ? value : mapped;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  if (path.isAbsolute(value)) {
    const mapped = mapPath(value);
    return mapped === path.resolve(value) ? value : mapped;
  }
  const normalized = normalizeSlashes(value);
  if (/^\.zhiyue\//.test(normalized)) return value;
  if (/^web\/data(?:\/|$)/.test(normalized)) return '.zhiyue/data' + normalized.slice('web/data'.length);
  if (/^tmp\/web_pdf_preview(?:\/|$)/.test(normalized)) {
    return '.zhiyue/cache/pdf-preview' + normalized.slice('tmp/web_pdf_preview'.length);
  }
  if (/^(catalog|batches|docs|tmp)(?:\/|$)/.test(normalized)) return '.zhiyue/' + normalized;
  return value;
}

function rewriteJsonValue(value, key, state) {
  if (Array.isArray(value)) return value.map(item => rewriteJsonValue(item, key, state));
  if (value && typeof value === 'object') {
    const next = {};
    for (const [childKey, child] of Object.entries(value)) next[childKey] = rewriteJsonValue(child, childKey, state);
    return next;
  }
  if (typeof value !== 'string' || !pathKeys.has(key)) return value;
  const next = rewriteString(value, key);
  if (next !== value) {
    state.keys.add(key);
    state.changes++;
    state.samples?.push({ key, from: value, to: next });
  }
  return next;
}

async function rewriteJsonRoots(roots) {
  const changed = [];
  let changes = 0;
  for (const root of roots) {
    for (const file of await walkFiles(root, '.json')) {
      const text = await readFile(file, 'utf8');
      const bom = text.startsWith('﻿');
      let data;
      try { data = JSON.parse(bom ? text.slice(1) : text); }
      catch (error) { throw new Error(`无法解析JSON：${relativeFromRepo(file)}：${error.message}`); }
      const state = { changes: 0, keys: new Set(), samples: [] };
      const next = rewriteJsonValue(data, '', state);
      if (state.changes) {
        changed.push({
          file: path.relative(LIBRARY, file).split(path.sep).join('/'),
          changes: state.changes,
          keys: [...state.keys],
          samples: state.samples.slice(0, 5),
        });
        changes += state.changes;
        if (!DRY_RUN) await writeFile(file, (bom ? '﻿' : '') + JSON.stringify(next, null, 2) + '\n', 'utf8');
      }
    }
  }
  return { changed, changes };
}

async function rewriteJsonFiles() {
  return rewriteJsonRoots(['catalog', 'batches', 'web/data', 'docs'].map(name => path.join(LIBRARY, name)));
}

// 迁移后补修：只扫描仍由程序读取的状态目录，不改 .zhiyue/tmp 中的历史证据。
async function repairMigratedJson() {
  return rewriteJsonRoots(['data', 'catalog', 'batches', 'docs'].map(name => path.join(LIBRARY, '.zhiyue', name)));
}

async function rewritePiSessions() {
  const directory = path.join(LIBRARY, 'web/data/pi-sessions');
  const files = await walkFiles(directory, '.jsonl');
  const changed = [];
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    const lines = text.split('\n');
    let first;
    try { first = JSON.parse(lines[0]); }
    catch { continue; }
    if (first?.type !== 'session' || typeof first.cwd !== 'string') continue;
    if (path.resolve(first.cwd) === LIBRARY) continue;
    if (path.basename(first.cwd.replaceAll('/', path.sep)).toLowerCase() !== 'library') continue;
    first.cwd = LIBRARY;
    lines[0] = JSON.stringify(first);
    changed.push(path.relative(LIBRARY, file).split(path.sep).join('/'));
    if (!DRY_RUN) await writeFile(file, lines.join('\n'), 'utf8');
  }
  return changed;
}

async function planMoves() {
  const plan = [];
  for (const move of moves) {
    const source = path.join(LIBRARY, move.from);
    const target = path.join(LIBRARY, move.to);
    const sourceExists = await exists(source);
    const targetExists = await exists(target);
    let action;
    let stats = null;
    if (sourceExists) {
      stats = await directoryStats(source);
      if (targetExists) {
        if (!(await isEmptyDirectory(target))) throw new Error(`迁移目标已存在且非空：${relativeFromRepo(target)}`);
        action = 'replace-empty';
      } else action = 'move';
    } else if (targetExists) action = 'already';
    else action = 'missing';
    plan.push({ ...move, source, target, sourceExists, targetExists, action, ...stats });
  }
  return plan;
}

async function checkBackup() {
  if (DRY_RUN) return;
  if (!(await exists(BACKUP)) || !(await exists(path.join(BACKUP, 'README.md')))) {
    throw new Error(`未找到完整备份：${relativeFromRepo(BACKUP)}。先用 cp -a 备份文献库，或传 --backup。`);
  }
}

async function applyMoves(plan) {
  for (const move of plan) {
    if (move.action === 'replace-empty') await rmdir(move.target);
    if (move.action === 'move' || move.action === 'replace-empty') {
      await mkdir(path.dirname(move.target), { recursive: true });
      await rename(move.source, move.target);
    }
  }
  const web = path.join(LIBRARY, 'web');
  if (await exists(web) && (await readdir(web)).length === 0) await rmdir(web);
  await mkdir(path.join(LIBRARY, '.zhiyue/docs'), { recursive: true });
  const agents = path.join(LIBRARY, '.zhiyue/AGENTS.md');
  if (!(await exists(agents))) {
    await copyFile(path.join(REPO, 'app/templates/library-AGENTS.md'), agents);
  }
  const readme = path.join(LIBRARY, 'README.md');
  if (!(await exists(readme))) {
    await copyFile(path.join(REPO, 'app/templates/library-README.md'), readme);
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

async function writeRecord(plan, markdown, json, sessions) {
  const stamp = '2026-11-17';
  const lines = [
    '# 文献库目录迁移记录（2026-11-17）',
    '',
    `- 文献库：\`${relativeFromRepo(LIBRARY)}\``,
    `- 完整备份：\`${relativeFromRepo(BACKUP)}\``,
    `- 一次性迁移脚本：\`app/scripts/migrations/20261117_library_layout.mjs\``,
    `- 状态：${DRY_RUN ? '试运行，未改动文件' : '已执行'}`,
    '',
    '## 移动结果',
    '',
    '| 原位置 | 新位置 | 文件数 | 大小 | 结果 |',
    '| --- | --- | ---: | ---: | --- |',
    ...plan.map(move => `| \`${move.from}/\` | \`${move.to}/\` | ${move.files ?? 0} | ${formatBytes(move.bytes ?? 0)} | ${move.action} |`),
    '',
    '## 引用与状态',
    '',
    `- Markdown：检查 ${markdown.files} 个文件，修改 ${markdown.changed.length} 个，重写 ${markdown.links} 处路径。`,
    `- JSON：修改 ${json.changed.length} 个文件，更新 ${json.changes} 个路径字段。`,
    `- Pi 会话：更新 ${sessions.length} 个会话的 \`cwd\`。`,
    '',
    '## 未覆盖项',
    '',
    '- `papers/`、`notes/`、`synthesis/`、`outputs/` 的内容目录未移动；只按新位置重写了 Markdown 链接和代码块中的纯路径。',
    '- 原始 PDF、分享包、第三方工具和 `releases/` 未改动。',
    '- 历史记录中若仍有已失效的旧路径文字，按本记录和备份核对；程序运行只读取 `.zhiyue/` 新结构。',
    '',
  ];
  const record = path.join(LIBRARY, '.zhiyue/docs/迁移记录_20261117.md');
  if (!DRY_RUN) {
    await mkdir(path.dirname(record), { recursive: true });
    await writeFile(record, lines.join('\n'), 'utf8');
    const reportPlan = plan.map(({ from, to, files, bytes, action }) => ({ from, to, files, bytes, action }));
    await writeFile(
      path.join(BACKUP, 'migration-report.json'),
      JSON.stringify(
        { date: stamp, library: relativeFromRepo(LIBRARY), backup: relativeFromRepo(BACKUP), plan: reportPlan, markdown, json, sessions },
        null,
        2,
      ) + '\n',
      'utf8',
    );
  }
  return record;
}

async function writeRepairRecord(repair) {
  const record = path.join(LIBRARY, '.zhiyue/docs/迁移记录_20261117.md');
  const section = [
    '## 迁移后修正',
    '',
    '- 2026-11-17：修复迁移脚本把 Windows 盘符误判为 URL 协议的问题，补扫 `.zhiyue/{data,catalog,batches,docs}` 的 JSON。',
    `- 修改 ${repair.changed.length} 个文件、${repair.changes} 个路径字段。`,
    ...repair.changed.flatMap(item => [
      `- \`${item.file}\`：${item.keys.join(', ')}（${item.changes}）`,
      ...item.samples.map(sample => `  - \`${sample.key}\`：\`${sample.from}\` → \`${sample.to}\``),
    ]),
    '- `.zhiyue/tmp` 中的历史记录保留原样，未参与本次补修。',
    '',
  ].join('\n');
  let existing = '';
  try { existing = await readFile(record, 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const marker = '## 迁移后修正';
  const index = existing.indexOf(marker);
  const base = (index >= 0 ? existing.slice(0, index) : existing).trimEnd();
  await writeFile(record, (base ? base + '\n\n' : '') + section, 'utf8');
  return record;
}

async function main() {
  if (!(await exists(LIBRARY)) || !(await exists(path.join(LIBRARY, 'README.md')))) {
    throw new Error(`文献库不存在或缺少README：${relativeFromRepo(LIBRARY)}`);
  }
  await checkBackup();
  if (REPAIR) {
    const repair = await repairMigratedJson();
    console.log(`补修模式：${repair.changed.length} 个文件，${repair.changes} 个路径字段`);
    for (const item of repair.changed) {
      console.log(`  ${item.file}: ${item.keys.join(', ')} (${item.changes})`);
      for (const sample of item.samples) console.log(`    ${sample.key}: ${sample.from} -> ${sample.to}`);
    }
    if (!DRY_RUN && repair.changes) {
      const record = await writeRepairRecord(repair);
      console.log(`迁移记录已补充：${relativeFromRepo(record)}`);
    } else if (!repair.changes) {
      console.log('没有需要补修的路径字段。');
    }
    return;
  }
  const plan = await planMoves();
  const moving = plan.filter(move => move.action === 'move' || move.action === 'replace-empty');
  const already = plan.filter(move => move.action === 'already');
  if (already.length && moving.length) {
    throw new Error('检测到部分目录已经迁移。为避免链接与状态不一致，请先从备份恢复完整旧结构后重试。');
  }
  const web = path.join(LIBRARY, 'web');
  if (await exists(web) && moving.length && (await readdir(web)).some(name => name !== 'data')) {
    throw new Error(`library/web 含有未计划的内容：${(await readdir(web)).join(', ')}`);
  }

  console.log(`文献库：${relativeFromRepo(LIBRARY)}`);
  console.log(`模式：${DRY_RUN ? '试运行' : '执行迁移'}`);
  for (const move of plan) {
    const action = { move: '移动', 'replace-empty': '替换空目录', already: '已迁移', missing: '不存在' }[move.action];
    console.log(`  ${move.from}/ -> ${move.to}/  ${action}${move.action === 'move' ? `  (${move.files} 个文件, ${formatBytes(move.bytes)})` : ''}`);
  }
  if (already.length) {
    console.log('所有源目录均已迁移，未重复移动。');
    return;
  }

  const markdown = await rewriteMarkdownFiles();
  const json = await rewriteJsonFiles();
  const sessions = await rewritePiSessions();
  console.log(`Markdown：${markdown.changed.length}/${markdown.files} 个文件，${markdown.links} 处路径`);
  for (const item of markdown.changed.slice(0, 8)) {
    console.log(`  ${item.file} (${item.links})`);
    for (const sample of item.samples) console.log(`    ${sample.from} -> ${sample.to}`);
  }
  if (markdown.changed.length > 8) console.log(`  …另有 ${markdown.changed.length - 8} 个文件`);
  console.log(`JSON：${json.changed.length} 个文件，${json.changes} 个字段`);
  for (const item of json.changed.slice(0, 8)) {
    console.log(`  ${item.file}: ${item.keys.join(', ')} (${item.changes})`);
    for (const sample of item.samples) console.log(`    ${sample.key}: ${sample.from} -> ${sample.to}`);
  }
  if (json.changed.length > 8) console.log(`  …另有 ${json.changed.length - 8} 个文件`);
  console.log(`Pi 会话 cwd：${sessions.length} 个`);
  for (const session of sessions) console.log(`  ${session}`);

  if (!DRY_RUN) {
    await applyMoves(plan);
    const record = await writeRecord(plan, markdown, json, sessions);
    console.log(`迁移记录：${relativeFromRepo(record)}`);
  } else {
    console.log('试运行完成，未移动目录、未写入文件。');
  }
}

await main();
