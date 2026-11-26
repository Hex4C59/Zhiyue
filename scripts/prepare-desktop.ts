import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
const SHARED_BUILD = path.join(ROOT, 'build/app/web/shared');
const EXCLUDED = new Set(['.venv', 'tests', '__pycache__', '.pytest_cache']);
const PYTHON_VERSION = '3.13.11';
const PYTHON_URL = `https://www.python.org/ftp/python/${PYTHON_VERSION}/python-${PYTHON_VERSION}-embed-amd64.zip`;
const PYTHON_SHA256 = '1ec066fb61ba5e8c73e29e048cd07c26850f74585e3a116005135b31b8004890';
const PYTHON_CACHE = path.join(APP, 'desktop/src-tauri/target/python-runtime');
const PYTHON_OUT = path.join(OUT, 'python');

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

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw new Error(`无法执行 ${command}：${result.error.message}`);
  if (result.status !== 0) throw new Error(`${command} 退出码 ${result.status ?? 'unknown'}。`);
}

async function downloadPython(): Promise<string> {
  await mkdir(PYTHON_CACHE, { recursive: true });
  const archive = path.join(PYTHON_CACHE, path.basename(PYTHON_URL));
  const valid = async (): Promise<boolean> => {
    if (!existsSync(archive)) return false;
    const digest = createHash('sha256').update(await readFile(archive)).digest('hex');
    return digest === PYTHON_SHA256;
  };
  if (await valid()) return archive;
  const response = await fetch(PYTHON_URL);
  if (!response.ok) throw new Error(`下载便携 Python 失败：HTTP ${response.status}`);
  const temp = `${archive}.${process.pid}.tmp`;
  await writeFile(temp, Buffer.from(await response.arrayBuffer()));
  const digest = createHash('sha256').update(await readFile(temp)).digest('hex');
  if (digest !== PYTHON_SHA256) throw new Error(`便携 Python 校验失败：${digest}`);
  await cp(temp, archive);
  await rm(temp, { force: true });
  return archive;
}

function hostPython(): string {
  const candidates = [
    process.env.LITERATURE_PYTHON,
    path.join(APP, 'downloader', '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'),
    'python',
  ].filter((value): value is string => !!value);
  for (const candidate of candidates) {
    if (candidate !== 'python' && !existsSync(candidate)) continue;
    const result = spawnSync(candidate, ['-c', 'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}")'], {
      encoding: 'utf8',
    });
    if (result.status === 0 && result.stdout.trim() === '3.13') return candidate;
  }
  throw new Error('打包便携 Python 需要 Python 3.13（LITERATURE_PYTHON 或 app/downloader/.venv）。');
}

async function preparePython(): Promise<void> {
  if (process.platform !== 'win32') throw new Error('桌面版便携 Python 目前只支持 Windows。');
  const archive = await downloadPython();
  await rm(PYTHON_OUT, { recursive: true, force: true });
  await mkdir(PYTHON_OUT, { recursive: true });
  // Windows 自带的 bsdtar 可以直接解压 ZIP；避免 PowerShell 7 的 Expand-Archive 兼容问题。
  run(process.platform === 'win32' ? 'tar.exe' : 'unzip', ['-xf', archive, '-C', PYTHON_OUT]);
  const pth = path.join(PYTHON_OUT, 'python313._pth');
  // _pth 的相对条目按 python.exe 所在目录解析，且不做转义；这里必须写入字面量反斜杠，
  // 否则会得到无效的 Libsite-packages 目录，site-packages 只能依赖 site 模块的隐式推断。
  const siteEntry = String.raw`Lib\site-packages`;
  const entries = (value: string): string[] => value.split(/\r?\n/).map((line) => line.trim());
  let content = await readFile(pth, 'utf8');
  if (!entries(content).includes(siteEntry)) {
    content = /^#?\s*import site\s*$/m.test(content)
      ? content.replace(/^#?\s*import site\s*$/m, `${siteEntry}\nimport site`)
      : `${content.trimEnd()}\n${siteEntry}\nimport site\n`;
    await writeFile(pth, content, 'utf8');
    if (!entries(content).includes(siteEntry)) throw new Error(`未能把 ${siteEntry} 写入 python313._pth。`);
  }
  const site = path.join(PYTHON_OUT, 'Lib', 'site-packages');
  await mkdir(site, { recursive: true });
  const requirements = path.join(APP, 'downloader/requirements.txt');
  run(hostPython(), [
    '-m', 'pip', 'install', '--disable-pip-version-check', '--no-compile',
    '--only-binary=:all:', '--target', site, '-r', requirements,
  ]);
  run(path.join(PYTHON_OUT, 'python.exe'), [
    '-c',
    'import importlib.metadata as m, pypdf, pdfplumber; print(pypdf.__version__, pdfplumber.__version__, m.version("pypdfium2"))',
  ]);
  // 确认 site-packages 由 _pth 直接登记，而不是靠 site 模块从解释器前缀推断。
  run(path.join(PYTHON_OUT, 'python.exe'), [
    '-c',
    'import sys; from pathlib import Path; wanted = Path(sys.executable).parent / "Lib/site-packages"; '
      + 'assert wanted in [Path(p) for p in sys.path], sys.path',
  ]);
  console.log('便携 Python 已准备：python/（含 pypdf、pdfplumber、pypdfium2）');
}

await rm(OUT, { recursive: true, force: true });
const nodeDirectory = path.join(OUT, 'node');
await mkdir(nodeDirectory, { recursive: true });
const nodeName = process.platform === 'win32' ? 'node.exe' : 'node';
await cp(process.execPath, path.join(nodeDirectory, nodeName));
const nodeLicense = path.join(path.dirname(process.execPath), 'LICENSE');
if (existsSync(nodeLicense)) await cp(nodeLicense, path.join(nodeDirectory, 'LICENSE'));

await preparePython();

// 服务端与共享模块随包分发 tsc 产物，源码目录里的 .ts 不进入安装包。
if (!existsSync(path.join(SERVER_BUILD, 'server.js')) || !existsSync(path.join(SHARED_BUILD, 'pdfScales.js'))) {
  throw new Error('缺少服务端或共享模块构建产物，请先运行 npm run build:node。');
}
await cp(SERVER_BUILD, path.join(OUT, 'app/web/src'), { recursive: true });
await cp(SHARED_BUILD, path.join(OUT, 'app/web/shared'), { recursive: true });
// Python 辅助脚本集中在 app/web/python，随编译产物整目录放入运行时。
const webPythonDir = path.join(APP, 'web/python');
await cp(webPythonDir, path.join(OUT, 'app/web/python'), {
  recursive: true,
  filter: filter(webPythonDir),
});
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
  'python/python.exe',
  'python/Lib/site-packages/pypdf/__init__.py',
  'python/Lib/site-packages/pdfplumber/__init__.py',
  'python/Lib/site-packages/pypdfium2/__init__.py',
  'app/web/src/server.js',
  'app/web/shared/pdfScales.js',
  'app/web/python/extract.py',
  'app/web/python/render.py',
  'app/web/python/parse_pdf_mineru.py',
  'app/web/src/lib/piTerminalPrefill.js',
  'app/web/dist/app.js',
  'app/web/public/index.html',
  'app/downloader/run.py',
  'app/templates/library-README.md',
  'app/templates/library-AGENTS.md',
  'app/templates/skills/paper-experiments/SKILL.md',
  'app/templates/skills/paper-reading/SKILL.md',
  'app/templates/skills/paper-translation/SKILL.md',
  'node_modules/@earendil-works/pi-coding-agent/dist/index.js',
  'node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js',
];
for (const relative of requiredFiles) {
  const info = await stat(path.join(OUT, relative)).catch(() => null);
  if (!info?.isFile()) throw new Error('桌面资源缺少文件：' + relative);
}

// 用随包解释器真正跑一次下载器入口：便携 Python 的 _pth 接管 sys.path，
// 脚本目录不会自动加入，这一步能拦住“模板可导入但安装版缺模块”的回归。
{
  // 帮助文本含中文：Windows 默认控制台编码（cp1252/gbk）下 Python 会报 charmap 编码错误，
  // 用 -X utf8 与 PYTHONIOENCODING 固定输出编码后再执行。
  const result = spawnSync(
    path.join(PYTHON_OUT, 'python.exe'),
    ['-X', 'utf8', path.join(OUT, 'app/downloader/run.py'), '--help'],
    { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' } },
  );
  if (result.status !== 0) {
    const detail = (result.stderr || result.error?.message || '').trim().split(/\r?\n/).slice(-6).join('\n');
    throw new Error(`随包 Python 无法启动下载器入口（exit=${result.status ?? 'unknown'}）：\n${detail}`);
  }
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

// 未打包的 Tauri 构建（target/debug 或 target/release 下的 exe）按 resource_dir() 从 exe
// 同级目录读取 resources/runtime，而不是 src-tauri/resources/runtime。已构建过 exe 时，把新
// 产物同步一份到 exe 旁边，让 desktop:prepare 后无需重新打包即可生效。目录被运行中的
// 实例占用会失败，此时提示用户关闭窗口后重试（不阻断主流程）。
const SRC_TAURI = path.join(APP, 'desktop', 'src-tauri');
for (const profile of ['release', 'debug']) {
  const targetRuntime = path.join(SRC_TAURI, 'target', profile, 'resources', 'runtime');
  if (!existsSync(targetRuntime)) continue;
  try {
    await rm(targetRuntime, { recursive: true, force: true });
    await cp(OUT, targetRuntime, { recursive: true });
    console.log(`已同步到已构建的 ${profile} exe 资源目录：app/desktop/src-tauri/target/${profile}/resources/runtime`);
  } catch (error) {
    console.warn(`未能同步到 ${profile} exe 资源目录（可能被运行中的实例占用）：${error}`);
  }
}
