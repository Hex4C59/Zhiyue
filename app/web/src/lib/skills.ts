import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { statusError } from './errors.js';

export interface SkillInfo {
  name: string;
  description: string;
  filePath: string;
  baseDir: string;
  /** 为 true 时只出现在 /skill:名称 命令中，不进入系统提示的能力清单。 */
  disableModelInvocation: boolean;
}

// 命令系统、read_skill 与系统提示共用同一份扫描结果和读取规则，避免三处校验分叉。
export interface SkillRuntime {
  list(): SkillInfo[];
  diagnostics(): string[];
  read(name: unknown, file?: unknown): { name: string; file: string; text: string };
  /** 以 Pi 技能命令块格式展开技能说明，参数按用户输入原样追加。 */
  expand(name: string, args?: string): string;
  /** 重新扫描技能目录；失败时保留上次结果并记录诊断。 */
  reload(): void;
}

export interface SkillScan {
  skills: SkillInfo[];
  diagnostics: string[];
}

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_DESCRIPTION = 1024;
const MAX_SKILL_FILE = 256 * 1024;
const TEXT_EXTENSIONS = new Set(['.md', '.txt']);
const SKILL_FILE = 'SKILL.md';

export function skillsDirectory(root: string): string {
  return path.join(root, '.zhiyue', 'skills');
}

// 只解析 SKILL.md 的简单 frontmatter：单行值、引号值与 |/> 折叠块，足够兼容常见技能。
function parseFrontmatter(source: string): Record<string, string> | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source.replace(/^\uFEFF/, ''));
  if (!match) return null;
  const lines = (match[1] as string).split(/\r?\n/);
  const values: Record<string, string> = {};
  for (let index = 0; index < lines.length; index++) {
    const pair = /^([A-Za-z0-9_-]+):(.*)$/.exec(lines[index] as string);
    if (!pair) continue;
    const key = pair[1] as string;
    const rest = (pair[2] as string).trim();
    if (['|', '>', '|-', '>-'].includes(rest)) {
      const parts: string[] = [];
      let cursor = index + 1;
      while (cursor < lines.length && (/^\s/.test(lines[cursor] as string) || !(lines[cursor] as string).trim())) {
        parts.push((lines[cursor] as string).trim());
        cursor++;
      }
      values[key] = rest.startsWith('>') ? parts.join(' ').trim() : parts.join('\n').trim();
      index = cursor - 1;
    } else {
      values[key] = rest.replace(/^["']|["']$/g, '').trim();
    }
  }
  return values;
}

function inside(base: string, target: string): boolean {
  const relative = path.relative(base, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/** 扫描文献库内的指令型技能；只接受普通目录中的 SKILL.md，忽略符号链接。 */
export function scanSkills(root: string): SkillScan {
  const directory = skillsDirectory(root);
  const result: SkillScan = { skills: [], diagnostics: [] };
  if (!existsSync(directory)) return result;
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    result.diagnostics.push(`无法读取技能目录：${(error as Error).message}`);
    return result;
  }
  const seen = new Set<string>();
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink() || !entry.isDirectory()) continue;
    const baseDir = path.join(directory, entry.name);
    const filePath = path.join(baseDir, SKILL_FILE);
    try {
      if (!lstatSync(filePath).isFile() || lstatSync(filePath).isSymbolicLink()) continue;
      if (statSync(filePath).size > MAX_SKILL_FILE) {
        result.diagnostics.push(`${entry.name}：${SKILL_FILE} 超过 ${MAX_SKILL_FILE / 1024} KB`);
        continue;
      }
      const frontmatter = parseFrontmatter(readFileSync(filePath, 'utf8'));
      if (!frontmatter) {
        result.diagnostics.push(`${entry.name}：缺少 frontmatter`);
        continue;
      }
      const name = frontmatter.name || entry.name;
      const description = (frontmatter.description || '').replace(/\s+/g, ' ').trim();
      const disableModelInvocation = (frontmatter['disable-model-invocation'] ?? '').toLowerCase() === 'true';
      if (!NAME_PATTERN.test(name) || name.length > 64) {
        result.diagnostics.push(`${entry.name}：技能名只能是小写字母、数字和连字符（不超过 64 字符）`);
        continue;
      }
      if (!description) {
        result.diagnostics.push(`${name}：缺少 description，未加载`);
        continue;
      }
      if (description.length > MAX_DESCRIPTION) {
        result.diagnostics.push(`${name}：description 超过 ${MAX_DESCRIPTION} 字符`);
        continue;
      }
      if (seen.has(name)) {
        result.diagnostics.push(`${name}：同名技能重复，保留先发现的一个`);
        continue;
      }
      seen.add(name);
      result.skills.push({ name, description, filePath, baseDir, disableModelInvocation });
    } catch (error) {
      result.diagnostics.push(`${entry.name}：${(error as Error).message}`);
    }
  }
  result.skills.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 生成系统提示中的技能清单；完整说明由 read_skill 工具按需读取。 */
export function formatSkillsPrompt(skills: SkillInfo[]): string {
  const listed = skills.filter((skill) => !skill.disableModelInvocation);
  if (!listed.length) return '';
  return [
    '',
    '以下技能提供特定任务的专门说明。当任务与某个技能描述匹配时，先调用 read_skill 读取该技能，再按其中的步骤执行；不要在执行前猜测内容。',
    '技能内的相对路径以该技能目录（SKILL.md 所在目录）为基准；read_skill 只允许读取技能目录内的 .md 与 .txt。',
    '<available_skills>',
    ...listed.flatMap((skill) => [
      '  <skill>',
      `    <name>${escapeXml(skill.name)}</name>`,
      `    <description>${escapeXml(skill.description)}</description>`,
      `    <location>${escapeXml(skill.filePath)}</location>`,
      '  </skill>',
    ]),
    '</available_skills>',
  ].join('\n');
}

/** 读取技能说明或技能目录内的文本附件；拒绝路径穿越、符号链接和非文本文件。 */
export function readSkillText(root: string, name: unknown, file: unknown = SKILL_FILE): { name: string; file: string; text: string } {
  if (typeof name !== 'string' || !NAME_PATTERN.test(name)) throw statusError('技能名称无效。', 400);
  if (typeof file !== 'string' || !file.trim()) throw statusError('技能文件路径无效。', 400);
  const relative = file.trim().replace(/\\/g, '/');
  const extension = path.posix.extname(relative).toLowerCase();
  if (!TEXT_EXTENSIONS.has(extension)) throw statusError('只允许读取技能目录内的 .md 与 .txt 文件。', 400);
  if (relative.startsWith('/') || relative.split('/').some((part) => part === '..' || part === '.')) {
    throw statusError('技能文件路径无效。', 400);
  }
  const skill = scanSkills(root).skills.find((item) => item.name === name);
  if (!skill) throw statusError('技能不存在或未加载。', 404);
  const candidate = path.resolve(skill.baseDir, ...relative.split('/'));
  let resolved: string;
  try {
    resolved = realpathSync(candidate);
  } catch {
    throw statusError('技能文件不存在。', 404);
  }
  let base: string;
  try {
    base = realpathSync(skill.baseDir);
  } catch {
    throw statusError('技能目录不存在。', 404);
  }
  if (!inside(base, resolved)) throw statusError('不允许读取技能目录之外的文件。', 403);
  const info = statSync(resolved);
  if (!info.isFile()) throw statusError('技能路径不是普通文件。', 400);
  if (info.size > MAX_SKILL_FILE) throw statusError('技能文件过大。', 413);
  return { name: skill.name, file: relative, text: readFileSync(resolved, 'utf8') };
}

function stripFrontmatter(source: string): string {
  return source.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
}

/**
 * 库内技能注册表：持有最近一次扫描结果，系统提示、`read_skill` 与斜杠命令共用。
 * 扫描失败时保留上次结果并记录诊断，避免一次读盘错误就让会话丢失全部技能。
 */
export class SkillRegistry implements SkillRuntime {
  readonly root: string;
  private cached: SkillInfo[] = [];
  private problems: string[] = [];

  constructor(root: string) {
    this.root = root;
    this.reload();
  }

  list(): SkillInfo[] {
    return this.cached;
  }

  diagnostics(): string[] {
    return this.problems;
  }

  reload(): void {
    try {
      const scan = scanSkills(this.root);
      this.cached = scan.skills;
      this.problems = scan.diagnostics;
    } catch (error) {
      this.problems = [`技能扫描失败：${(error as Error).message}`];
    }
  }

  read(name: unknown, file?: unknown): { name: string; file: string; text: string } {
    return readSkillText(this.root, name, file);
  }

  /** 展开为与 SDK `_expandSkillCommand` 一致的技能命令块。 */
  expand(name: string, args = ''): string {
    const skill = this.cached.find((item) => item.name === name);
    if (!skill) throw statusError('技能不存在或未加载。', 404);
    const body = stripFrontmatter(readFileSync(skill.filePath, 'utf8')).trim();
    const block = `<skill name="${skill.name}" location="${skill.filePath}">\n`
      + `References are relative to ${skill.baseDir}.\n\n${body}\n</skill>`;
    return args ? `${block}\n\n${args}` : block;
  }
}
