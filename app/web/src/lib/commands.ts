import { statusError } from './errors.js';
import type { SkillInfo, SkillRuntime } from './skills.js';

// 斜杠命令来源：本地命令由服务端直接执行，技能命令展开为技能说明后作为用户回合发送。
export type CommandSource = 'local' | 'skill';
export type CommandScope = 'composer' | 'chat';

export interface CommandInfo {
  name: string;
  description: string;
  source: CommandSource;
  /** 需要已有会话才能执行的命令标为 chat。 */
  scope: CommandScope;
  argumentHint?: string;
}

export interface ParsedCommand {
  name: string;
  args: string;
}

export interface LocalCommandResult {
  kind: 'local';
  command: string;
  /** 回执正文，直接写入助手消息。 */
  text: string;
  /** 需要前端刷新会话或状态。 */
  refresh?: boolean;
}

const MAX_ARGS = 4000;
const SKILL_PREFIX = 'skill:';

// 本地命令是网站自己的能力，不交给模型执行；文案集中在此，界面与测试都从这里取。
const LOCAL: CommandInfo[] = [
  { name: 'help', description: '列出可用的斜杠命令与技能。', source: 'local', scope: 'composer' },
  { name: 'skills', description: '列出当前文献库已加载的技能。', source: 'local', scope: 'composer' },
  {
    name: 'compact', description: '手动压缩当前会话上下文。', source: 'local', scope: 'chat',
    argumentHint: '[压缩说明]',
  },
];

export function localCommands(): CommandInfo[] {
  return LOCAL.map((command) => ({ ...command }));
}

export function skillCommandName(name: string): string {
  return `${SKILL_PREFIX}${name}`;
}

/** 组装命令目录：本地命令在前，技能命令按扫描顺序排列。 */
export function buildCommands(skills: SkillInfo[]): CommandInfo[] {
  return [
    ...localCommands(),
    ...skills.map((skill) => ({
      name: skillCommandName(skill.name),
      description: skill.description,
      source: 'skill' as const,
      scope: 'composer' as const,
    })),
  ];
}

/** 解析以斜杠开头的一行输入；不是命令时返回 null。 */
export function parseCommand(text: string): ParsedCommand | null {
  const trimmed = String(text ?? '').trimStart();
  if (!trimmed.startsWith('/')) return null;
  const match = /^\/([^\s/]+)(?:\s+([\s\S]*))?$/.exec(trimmed);
  if (!match) return null;
  const name = match[1] as string;
  const args = (match[2] ?? '').trim();
  if (args.length > MAX_ARGS) throw statusError(`命令参数不能超过 ${MAX_ARGS} 个字符。`, 413);
  return { name, args };
}

export function findCommand(commands: CommandInfo[], name: string): CommandInfo | undefined {
  return commands.find((command) => command.name === name);
}

export interface SkillCommand {
  kind: 'skill';
  command: string;
  name: string;
  args: string;
  /** 技能正文，用于回执与日志；实际发送给模型的内容是 `prompt`。 */
  text: string;
  /** 展开后的技能说明块，作为本轮用户要求发送。 */
  prompt: string;
}

export interface CommandContext {
  skills: SkillRuntime;
  /** 手动压缩当前会话上下文。 */
  compact(args: string): Promise<{ tokensBefore: number; estimatedTokensAfter?: number }>;
}

export type CommandOutcome =
  | { kind: 'local'; result: LocalCommandResult }
  | { kind: 'skill'; result: SkillCommand };

/**
 * 执行一条斜杠命令。
 * 技能命令只做校验与展开，交由调用方作为用户回合发给模型；
 * 本地命令在这里完成，`/help` 与 `/skills` 依赖当前技能清单。
 */
export async function runCommand(
  command: CommandInfo, args: string, context: CommandContext,
): Promise<CommandOutcome> {
  if (command.source === 'skill') {
    const name = command.name.slice(SKILL_PREFIX.length);
    const skill = context.skills.list().find((item) => item.name === name);
    if (!skill) throw statusError(`技能 ${name} 未加载，请先在设置中重新扫描技能。`, 404);
    const loaded = context.skills.read(name, 'SKILL.md');
    return {
      kind: 'skill',
      result: {
        kind: 'skill', command: command.name, name, args,
        text: loaded.text, prompt: context.skills.expand(name, args),
      },
    };
  }
  if (command.name === 'help') {
    return { kind: 'local', result: { kind: 'local', command: 'help', text: helpText(context.skills) } };
  }
  if (command.name === 'skills') {
    return { kind: 'local', result: { kind: 'local', command: 'skills', text: skillsText(context.skills) } };
  }
  if (command.name === 'compact') {
    const result = await context.compact(args);
    const before = Number.isFinite(result.tokensBefore) ? result.tokensBefore : 0;
    const after = typeof result.estimatedTokensAfter === 'number' ? result.estimatedTokensAfter : undefined;
    const detail = after === undefined
      ? `压缩前约 ${before} token。`
      : `压缩前约 ${before} token，压缩后约 ${after} token。`;
    return {
      kind: 'local',
      result: {
        kind: 'local', command: 'compact', refresh: true,
        text: `上下文已压缩。${detail}手动压缩不会重试被中断的回答。`,
      },
    };
  }
  throw statusError(`未知命令：/${command.name}`, 404);
}

function helpText(skills: SkillRuntime): string {
  const lines = [
    '## 斜杠命令',
    '',
    ...localCommands().map((command) => {
      const hint = command.argumentHint ? ` ${command.argumentHint}` : '';
      return `- \`/${command.name}\`${hint}：${command.description}`;
    }),
  ];
  const items = skills.list();
  if (items.length) {
    lines.push('', '## 技能命令', '', ...items.map((skill) => `- \`/skill:${skill.name}\`：${skill.description}`));
  } else {
    lines.push('', '当前没有已加载的技能。把 `SKILL.md` 放入 `.zhiyue/skills/<名称>/` 后重新扫描。');
  }
  lines.push('', '技能命令会把技能说明作为本轮要求发给模型；不带斜杠时，模型也会按技能描述自行决定是否读取。');
  return lines.join('\n');
}

function skillsText(skills: SkillRuntime): string {
  const items = skills.list();
  const diagnostics = skills.diagnostics();
  const lines = items.length
    ? ['## 已加载技能', '', ...items.map((skill) => `- \`${skill.name}\`：${skill.description}`)]
    : ['当前没有已加载的技能。', '', '把 `SKILL.md` 放入 `.zhiyue/skills/<名称>/` 后重新扫描。'];
  if (diagnostics.length) lines.push('', '## 未加载项', '', ...diagnostics.map((item) => `- ${item}`));
  return lines.join('\n');
}
