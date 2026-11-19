#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 构建前的网站构建与运行资源准备仍由 npm run desktop:build 完成，本脚本只负责按环境变量
// 叠加 Tauri 配置，避免把证书指纹或更新签名状态固定在仓库配置里。
function repoRoot(): string {
  let directory = path.dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const manifest = path.join(directory, 'package.json');
    if (existsSync(manifest)) {
      try {
        const parsed = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string };
        if (parsed.name === 'zhiyue') return directory;
      } catch { /* 非项目清单，继续向上查找。 */ }
    }
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error('无法定位项目根目录。');
    directory = parent;
  }
}

const root = repoRoot();
const desktopDir = path.join(root, 'app', 'desktop');
const cliEntry = path.join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js');
const overlayPath = path.join(desktopDir, 'src-tauri', 'target', 'desktop-build-config.json');

interface WindowsSigning {
  certificateThumbprint?: string;
  digestAlgorithm?: string;
  timestampUrl?: string;
  tsp?: boolean;
}

interface BundleConfig {
  createUpdaterArtifacts?: boolean;
  windows?: WindowsSigning;
}

function fail(message: string): never {
  console.error(`[desktop:build] ${message}`);
  process.exit(1);
}

const bundle: BundleConfig = {};
const windows: WindowsSigning = {};

const thumbprint = process.env.ZHIYUE_SIGN_THUMBPRINT?.trim();
if (thumbprint) {
  windows.certificateThumbprint = thumbprint;
  windows.digestAlgorithm = 'sha256';
  const timestampUrl = process.env.ZHIYUE_SIGN_TIMESTAMP_URL?.trim();
  if (timestampUrl) {
    // tsp=true 使用 RFC 3161 时间戳（/tr），否则沿用旧式 /t；两者都由 tauri-bundler 传给 signtool。
    windows.timestampUrl = timestampUrl;
    windows.tsp = true;
  }
}

if (process.env.TAURI_SIGNING_PRIVATE_KEY?.trim()) {
  bundle.createUpdaterArtifacts = true;
}

if (Object.keys(windows).length > 0) {
  bundle.windows = windows;
}

const args = ['build'];
if (Object.keys(bundle).length > 0) {
  const overlay = { bundle };
  mkdirSync(path.dirname(overlayPath), { recursive: true });
  writeFileSync(overlayPath, `${JSON.stringify(overlay, null, 2)}\n`, 'utf8');
  args.push('--config', overlayPath);
  const parts: string[] = [];
  if (thumbprint) parts.push('Authenticode 签名');
  if (bundle.createUpdaterArtifacts) parts.push('更新签名产物');
  console.log(`[desktop:build] 启用：${parts.join('、')}`);
}

const child = spawn(process.execPath, [cliEntry, ...args], {
  cwd: desktopDir,
  env: process.env,
  stdio: 'inherit',
});
child.on('error', (error: Error) => fail(`无法启动 Tauri CLI：${error.message}`));
child.on('exit', (code: number | null) => {
  process.exit(code ?? 1);
});
