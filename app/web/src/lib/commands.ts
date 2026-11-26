import { statusError } from './errors.js';
import type { SkillInfo, SkillRuntime } from './skills.js';
import type { CommandInfo, CommandScope, CommandSource, CommandTarget } from '../../shared/contracts.js';

// 斜杠命令来源：本地命令由服务端直接执行，技能命令展开为技能说明后作为用户回合发送。
export type { CommandInfo, CommandScope, CommandSource, CommandTarget };

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
  { name: 'name', description: '查看或修改会话名称。', source: 'local', scope: 'chat', argumentHint: '[名称]' },
  { name: 'session', description: '查看会话信息。', source: 'local', scope: 'chat' },
  { name: 'hotkeys', description: '查看工作区键盘快捷键。', source: 'local', scope: 'composer' },
];

type PiCommand = [name: string, description: string, argumentHint?: string, scope?: CommandScope];

const WORKSPACE: PiCommand[] = [
  ['settings', '打开模型与密钥设置。'],
  ['model', '打开模型选择器，或按名称为本次工作区选中模型。', '[服务商/模型]'],
  ['thinking', '打开推理设置，或设置推理强度。', '[强度]'],
  ['new', '开始新会话。'],
  ['resume', '打开历史会话，或按编号切换。', '[会话编号]'],
  ['copy', '复制最后一条助手消息。', undefined, 'chat'],
  ['reload', '重新检测模型和文献库技能。'],
  ['quit', '退出 Zhiyue 桌面应用。'],
];

const TERMINAL: PiCommand[] = [
  ['scoped-models', '设置 Pi 终端循环切换的模型。'],
  ['tree', '浏览和切换 Pi 会话树的分支。', undefined, 'chat'],
  ['fork', '从较早的消息创建 Pi 会话分支。', undefined, 'chat'],
  ['clone', '在 Pi 终端复制当前会话。', undefined, 'chat'],
  ['export', '从 Pi 导出 HTML 或 JSONL。', '[路径]', 'chat'],
  ['import', '导入 JSONL 到 Pi 终端。', '<路径>'],
  ['share', '在 Pi 终端审核和分享会话。', undefined, 'chat'],
  ['bug', '在 Pi 终端准备问题报告。', '[说明]'],
  ['trust', '在 Pi 终端管理项目的信任状态。'],
  ['login', '在 Pi 终端登录模型服务商。', '[服务商]'],
  ['logout', '在 Pi 终端移除服务商认证。'],
  ['changelog', '查看随包 Pi 的更新记录。'],
  ['mcp', '在 Pi 终端管理已配置的 MCP 服务。'],
  ['llama', '在 Pi 终端管理 llama.cpp 模型。'],
];

function withTarget(target: CommandTarget, entries: PiCommand[]): CommandInfo[] {
  return entries.map(([name, description, argumentHint, scope = 'composer']) => ({
    name, description, argumentHint, scope, source: 'local', target,
  }));
}

const PI_LOCAL = [
  ...LOCAL,
  ...withTarget('workspace', WORKSPACE),
  ...withTarget('terminal', TERMINAL),
];

export function localCommands(): CommandInfo[] {
  return PI_LOCAL.map((command) => ({ ...command }));
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
  name(args: string): string;
  session(): string;
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
  if (command.name === 'hotkeys') {
    const text = [
      '## 工作区快捷键', '', '- Enter 发送，Shift+Enter 换行。',
      '- 斜杠菜单使用上下键选择，Enter 或 Tab 插入，Esc 关闭。',
      '- 连续阅读时用 Ctrl+滚轮缩放 PDF 页面。',
    ].join('\n');
    return { kind: 'local', result: { kind: 'local', command: command.name, text } };
  }
  if (command.name === 'name' || command.name === 'session') {
    const text = command.name === 'name' ? context.name(args) : context.session();
    return { kind: 'local', result: { kind: 'local', command: command.name, text } };
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
      const terminal = command.target === 'terminal' ? '（Pi 终端）' : '';
      return `- \`/${command.name}\`${hint}${terminal} ${command.description}`;
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
