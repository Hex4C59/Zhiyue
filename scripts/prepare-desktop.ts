import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 编译后的脚本位于 build/scripts；从自身位置向上找到项目的 package.json，兼容源码与构建产物。
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

const ROOT = repoRoot();
const APP = path.join(ROOT, 'app');
const OUT = path.join(APP, 'desktop/src-tauri/resources/runtime');
const SERVER_BUILD = path.join(ROOT, 'build/app/web/src');
const EXCLUDED = new Set(['.venv', 'tests', '__pycache__', '.pytest_cache']);

interface Manifest {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
}

const major = Number(process.versions.node.split('.')[0]);
if (!Number.isInteger(major) || major < 22) {
  throw new Error(`需要 Node.js 22 或更高版本，当前为 ${process.version}。`);
}

const filter = (base: string) => (source: string): boolean => {
  const relative = path.relative(base, source);
  if (!relative) return true;
  return !relative
    .split(path.sep)
    .some((part) => EXCLUDED.has(part) || path.extname(part) === '.pyc');
};

// 按 Node 的查找顺序定位包：先看传入目录下的 node_modules，再逐级向上。
function locatePackage(name: string, from: string): string | null {
  let directory = from;
  for (;;) {
    const candidate = path.join(directory, 'node_modules', ...name.split('/'));
    if (existsSync(path.join(candidate, 'package.json'))) return candidate;
    const parent = path.dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

await rm(OUT, { recursive: true, force: true });
const nodeDirectory = path.join(OUT, 'node');
await mkdir(nodeDirectory, { recursive: true });
const nodeName = process.platform === 'win32' ? 'node.exe' : 'node';
await cp(process.execPath, path.join(nodeDirectory, nodeName));
const nodeLicense = path.join(path.dirname(process.execPath), 'LICENSE');
if (existsSync(nodeLicense)) await cp(nodeLicense, path.join(nodeDirectory, 'LICENSE'));

// 服务端随包分发 tsc 产物，源码目录里的 .ts 不进入安装包。
if (!existsSync(path.join(SERVER_BUILD, 'server.js'))) {
  throw new Error('缺少服务端构建产物，请先运行 npm run build:node。');
}
await cp(SERVER_BUILD, path.join(OUT, 'app/web/src'), { recursive: true });
// 只读的 Python 辅助脚本不参与 tsc，随编译产物一起放入运行时目录。
for (const helper of ['extract.py', 'render.py']) {
  await cp(path.join(APP, 'web/src/lib', helper), path.join(OUT, 'app/web/src/lib', helper));
}
for (const entry of ['dist', 'public']) {
  const source = path.join(APP, 'web', entry);
  await cp(source, path.join(OUT, 'app/web', entry), { recursive: true });
}
await cp(path.join(APP, 'web/package.json'), path.join(OUT, 'app/web/package.json'));
await cp(path.join(APP, 'downloader'), path.join(OUT, 'app/downloader'), {
  recursive: true,
  filter: filter(path.join(APP, 'downloader')),
});
await cp(path.join(APP, 'templates'), path.join(OUT, 'app/templates'), { recursive: true });

// 运行时的 npm 依赖（含项目自带的官方 Pi SDK）随桌面资源分发，安装后无需联网安装。
const rootManifest = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8')) as Manifest;
interface PendingPackage { name: string; from: string; required: boolean }
const pending: PendingPackage[] = Object.keys(rootManifest.dependencies || {})
  .map((name) => ({ name, from: ROOT, required: true }));
const copied = new Set<string>();
while (pending.length) {
  const { name, from, required } = pending.pop() as PendingPackage;
  const source = locatePackage(name, from);
  if (!source) {
    if (required) throw new Error('缺少运行依赖：' + name);
    continue;
  }
  const relative = path.relative(ROOT, source);
  if (copied.has(relative)) continue;
  copied.add(relative);
  await cp(source, path.join(OUT, relative), { recursive: true });
  const dependency = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8')) as Manifest;
  for (const item of Object.keys(dependency.dependencies || {})) pending.push({ name: item, from: source, required: true });
  for (const item of Object.keys((dependency as { optionalDependencies?: Record<string, string> }).optionalDependencies || {})) {
    pending.push({ name: item, from: source, required: false });
  }
  for (const item of Object.keys((dependency as { peerDependencies?: Record<string, string> }).peerDependencies || {})) {
    pending.push({ name: item, from: source, required: false });
  }
}

const requiredFiles = [
  'node/' + nodeName,
  'app/web/src/server.js',
  'app/web/src/lib/extract.py',
  'app/web/src/lib/render.py',
  'app/web/dist/app.js',
  'app/web/public/index.html',
  'app/downloader/run.py',
  'app/templates/library-README.md',
  'app/templates/library-AGENTS.md',
  'node_modules/@earendil-works/pi-coding-agent/dist/index.js',
];
for (const relative of requiredFiles) {
  const info = await stat(path.join(OUT, relative)).catch(() => null);
  if (!info?.isFile()) throw new Error('桌面资源缺少文件：' + relative);
}

const piManifest = JSON.parse(
  await readFile(path.join(OUT, 'node_modules/@earendil-works/pi-coding-agent/package.json'), 'utf8'),
) as Manifest;

await writeFile(
  path.join(OUT, 'manifest.json'),
  JSON.stringify(
    {
      formatVersion: 1,
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      pi: piManifest.version,
      preparedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);

console.log('桌面运行资源已准备：app/desktop/src-tauri/resources/runtime');
console.log(`Node ${process.version}，${process.platform}/${process.arch}`);
