import { execFile } from 'node:child_process';
import { constants, existsSync } from 'node:fs';
import { copyFile, mkdir, realpath } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { statusError } from './errors.js';
import { resolvePi } from './pi.js';

const run = promisify(execFile);

export function desktopCommandsAvailable(): boolean {
  return process.platform === 'win32' && process.env.ZHIYUE_DESKTOP === '1';
}

// 用独立终端运行官方 CLI。PowerShell 只接收固定程序与参数，命令文本由 Pi 编辑器读取。
const launchScript = Buffer.from([
  "$ErrorActionPreference = 'Stop'",
  '$zhiyuePiArguments = ConvertFrom-Json -InputObject $env:ZHIYUE_PI_ARGUMENTS',
  '$zhiyuePiQuotedArguments = @($zhiyuePiArguments | ForEach-Object { \'"\' + $_ + \'"\' })',
  'Start-Process -FilePath $env:ZHIYUE_PI_NODE -ArgumentList $zhiyuePiQuotedArguments ' +
    '-WorkingDirectory $env:ZHIYUE_PI_DIRECTORY -WindowStyle Normal',
].join('\n'), 'utf16le').toString('base64');

export async function openPiTerminal(options: {
  root: string;
  stateDir: string;
  sessionsDir: string;
  command: string;
  threadId?: string;
}): Promise<void> {
  if (!desktopCommandsAvailable()) throw statusError('此命令需要在 Zhiyue 桌面版运行。', 409);
  const { root, stateDir, sessionsDir, threadId, command } = options;
  const cli = path.join(path.dirname(resolvePi()), 'bundle', 'cli.js');
  const extension = fileURLToPath(new URL('./piTerminalPrefill.js', import.meta.url));
  if (!existsSync(cli) || !existsSync(extension)) throw statusError('缺少随包的 Pi 终端资源。', 500);
  const terminalDir = path.join(stateDir, 'pi-terminal');
  await mkdir(terminalDir, { recursive: true });
  const args = [cli, '-e', extension, '--session-dir', terminalDir];
  if (threadId) {
    const file = await realpath(threadId).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
      throw statusError('找不到当前会话的 Pi 上下文文件。', 409);
    });
    if (path.relative(await realpath(sessionsDir), path.dirname(file)) || path.extname(file) !== '.jsonl') {
      throw statusError('当前会话的 Pi 上下文路径无效。', 409);
    }
    // 会话副本由 Pi 终端独立管理，避免两个进程同时追加同一份 JSONL。
    const snapshot = path.join(terminalDir, `zhiyue-${randomUUID()}.jsonl`);
    await copyFile(file, snapshot, constants.COPYFILE_EXCL);
    args.push('--session', snapshot);
  }
  const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32',
    'WindowsPowerShell', 'v1.0', 'powershell.exe');
  await run(powershell, ['-NoProfile', '-NonInteractive', '-EncodedCommand', launchScript], {
    windowsHide: true,
    env: {
      ...process.env,
      ZHIYUE_PI_NODE: process.execPath,
      ZHIYUE_PI_DIRECTORY: root,
      ZHIYUE_PI_ARGUMENTS: JSON.stringify(args),
      ZHIYUE_PI_COMMAND: command,
    },
  });
}
