import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../../..');
const releaseDir = path.join(repoRoot, 'app/desktop/src-tauri/target/release');
const packagedExe = path.join(releaseDir, 'zhiyue-desktop.exe');
const runtimeDir = path.join(releaseDir, 'resources/runtime');
const installerDir = path.join(releaseDir, 'bundle/nsis');
const fixtureScript = path.join(import.meta.dirname, 'fixtures/make_pdf.py');
const downloaderScript = path.join(runtimeDir, 'app/downloader/run.py');

const title = 'A synthetic end to end import test paper';
const doi = '10.5555/zhiyue.e2e';
const category = 'papers/09_情感综述调研/网站导入';
const batch = '20261117_e2e_import';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function executableOnPath(...names) {
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function resolveTestPython() {
  const venv = process.platform === 'win32'
    ? 'app/downloader/.venv/Scripts/python.exe'
    : 'app/downloader/.venv/bin/python';
  const candidates = [
    process.env.LITERATURE_PYTHON,
    path.join(repoRoot, venv),
    executableOnPath('python.exe', 'python'),
  ];
  return candidates.filter(Boolean).find(candidate => fs.existsSync(candidate)) ?? null;
}

function hasPypdf(python) {
  if (!python) return false;
  return spawnSync(python, ['-c', 'import pypdf'], { stdio: 'ignore' }).status === 0;
}

async function stageInstall(root) {
  const installDir = path.join(root, 'Zhiyue');
  await fsp.mkdir(installDir, { recursive: true });
  await fsp.copyFile(packagedExe, path.join(installDir, 'zhiyue-desktop.exe'));
  // 复制出独立安装目录：Node 会解析真实路径，目录联接会让主模块判定失败。
  await fsp.cp(path.join(releaseDir, 'resources'), path.join(installDir, 'resources'), {
    recursive: true,
  });
  return installDir;
}

function startServer(installDir, library, python, pdftoppm) {
  const runtime = path.join(installDir, 'resources/runtime');
  return spawn(path.join(runtime, 'node/node.exe'), [path.join(runtime, 'app/web/src/server.mjs')], {
    cwd: path.join(runtime, 'app'),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      LITERATURE_LIBRARY: library,
      ...(python ? { LITERATURE_PYTHON: python } : {}),
      ...(pdftoppm ? { PDFTOPPM: pdftoppm } : {}),
      PYTHONUTF8: '1',
      PYTHONIOENCODING: 'utf-8',
    },
  });
}

async function waitForServer(child, timeoutMs = 30000) {
  let output = '';
  const collect = chunk => { output += chunk; };
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = output.match(/^ZHIYUE_URL=(http:\/\/127\.0\.0\.1:\d+)\r?\n/m);
    if (match) return match[1];
    if (child.exitCode !== null) throw new Error(`应用服务提前退出（${child.exitCode}）：${output}`);
    await sleep(100);
  }
  throw new Error(`等待本地服务地址超时：${output}`);
}

async function terminate(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGKILL');
  }
  await Promise.race([
    new Promise(resolve => child.once('exit', resolve)),
    sleep(5000),
  ]);
}

async function api(base, route, init) {
  const response = await fetch(base + route, init);
  const text = await response.text();
  if (!response.ok) throw new Error(`请求 ${route} 失败（${response.status}）：${text}`);
  return text ? JSON.parse(text) : null;
}

async function waitForJob(base, jobId, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const data = await api(base, '/api/downloads');
    const job = data.jobs.find(item => item.id === jobId);
    if (job && ['completed', 'failed'].includes(job.status)) return job;
    await sleep(250);
  }
  throw new Error(`等待任务 ${jobId} 结束超时`);
}

async function waitForPapers(base, count, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let papers = [];
  while (Date.now() < deadline) {
    papers = (await api(base, '/api/library')).papers;
    if (papers.length === count) return papers;
    await sleep(200);
  }
  return papers;
}

test('安装布局首次启动自动创建文献库，并能离线导入一篇文献', {
  skip: process.platform !== 'win32' && '仅验证 Windows 安装布局',
  timeout: 180000,
}, async t => {
  const missing = [
    [packagedExe, '可执行文件'],
    [path.join(runtimeDir, 'node/node.exe'), '随包 Node'],
    [path.join(runtimeDir, 'app/web/src/server.mjs'), '本地服务'],
    [path.join(runtimeDir, 'app/downloader/run.py'), '下载器'],
    [path.join(runtimeDir, 'app/templates/library-README.md'), '文献库模板'],
    [path.join(runtimeDir, 'node_modules/@earendil-works/pi-coding-agent/dist/index.js'), '随包 Pi SDK'],
  ].filter(([file]) => !fs.existsSync(file));
  if (missing.length) {
    t.skip(`缺少打包产物（${missing.map(([, label]) => label).join('、')}），请先运行 npm run desktop:build`);
    return;
  }
  if (fs.existsSync(installerDir)) {
    const installers = (await fsp.readdir(installerDir)).filter(name => name.endsWith('-setup.exe'));
    if (installers.length) t.diagnostic(`安装包：${installers.join(', ')}`);
  } else {
    t.diagnostic('未找到 NSIS 安装包，仅验证安装目录布局');
  }

  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'zhiyue-e2e-'));
  const library = path.join(tmp, 'Documents/Zhiyue/library');
  let installDir = null;
  let child = null;
  t.after(async () => {
    await terminate(child);
    await fsp.rm(tmp, { recursive: true, force: true });
  });

  installDir = await stageInstall(tmp);
  assert.ok(fs.existsSync(path.join(installDir, 'zhiyue-desktop.exe')), '安装目录应包含可执行文件');
  assert.ok(fs.existsSync(path.join(installDir, 'resources/runtime/node/node.exe')), '安装目录应包含随包运行时');
  assert.equal(fs.existsSync(library), false, '文献库尚不存在，等待首次启动创建');

  const python = resolveTestPython();
  const pdftoppm = process.env.PDFTOPPM || executableOnPath('pdftoppm.exe', 'pdftoppm');
  child = startServer(installDir, library, python, pdftoppm);
  const base = await waitForServer(child);

  // 首次启动：本地服务创建完整库骨架、复制模板并写入空索引，没有单独的“新建文件夹”步骤。
  const directories = [
    'papers', 'notes', 'synthesis', 'outputs',
    '.zhiyue/catalog', '.zhiyue/batches', '.zhiyue/data/uploads', '.zhiyue/data/pi',
    '.zhiyue/data/pi-sessions', '.zhiyue/cache/pdf-preview', '.zhiyue/tmp', '.zhiyue/docs',
  ];
  for (const directory of directories) {
    assert.ok(fs.statSync(path.join(library, directory)).isDirectory(), `首次启动应创建 ${directory}`);
  }
  const readme = path.join(library, 'README.md');
  const agents = path.join(library, '.zhiyue/AGENTS.md');
  assert.deepEqual(
    await fsp.readFile(readme),
    await fsp.readFile(path.join(runtimeDir, 'app/templates/library-README.md')),
    'README.md 应来自打包模板',
  );
  assert.deepEqual(
    await fsp.readFile(agents),
    await fsp.readFile(path.join(runtimeDir, 'app/templates/library-AGENTS.md')),
    'AGENTS.md 应来自打包模板',
  );
  const catalogFile = path.join(library, '.zhiyue/catalog/文献索引.json');
  const placeholder = JSON.parse(await fsp.readFile(catalogFile, 'utf8'));
  assert.equal(placeholder.record_count, 0);
  assert.deepEqual(placeholder.records, []);

  const status = await api(base, '/api/status');
  assert.equal(path.resolve(status.root).toLowerCase(), path.resolve(library).toLowerCase());
  assert.deepEqual((await api(base, '/api/library')).papers, []);

  if (!hasPypdf(python) || !pdftoppm) {
    t.diagnostic(`跳过导入阶段：${!hasPypdf(python) ? '当前 Python 缺少 pypdf' : '未找到 Poppler pdftoppm'}`);
    return;
  }

  const pdf = path.join(tmp, 'fixture.pdf');
  const input = path.join(tmp, 'input.json');
  const fixture = spawnSync(python, [fixtureScript, pdf, input, title, 'Alice Example', doi, '2026'], {
    encoding: 'utf8',
  });
  assert.equal(fixture.status, 0, `生成测试 PDF 失败：${fixture.stderr}`);
  assert.ok(fs.statSync(pdf).size > 500, '测试 PDF 应有实际内容');

  const cli = (...args) => spawnSync(python, [downloaderScript, '--root', library, ...args], {
    encoding: 'utf8',
    env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
  });
  // 导入只接受已存在的分类；网站端会在提交前创建，直接调 CLI 时由调用方创建。
  await fsp.mkdir(path.join(library, category), { recursive: true });
  let result = cli('import', input, '--batch', batch, '--category', category);
  assert.equal(result.status, 0, `导入清单失败：${result.stderr}`);
  result = cli(
    'attach', '--batch', batch, '--item', 'I0001', '--file', pdf,
    '--source-url', `https://doi.org/${doi}`,
  );
  assert.equal(result.status, 0, `核验 PDF 失败：${result.stderr}`);

  const archiveJob = await api(base, '/api/downloads/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch, action: 'archive' }),
  });
  const job = await waitForJob(base, archiveJob.id);
  assert.equal(job.status, 'completed', `归档任务失败：${JSON.stringify(job)}`);

  const papers = await waitForPapers(base, 1);
  assert.equal(papers.length, 1, '归档后网站应能看到 1 篇文献');
  assert.equal(papers[0].id, 'L001');
  assert.equal(papers[0].title, title);
  assert.equal(papers[0].category, '09_情感综述调研');
  assert.equal(papers[0].subcategory, '网站导入');

  const importedDir = path.join(library, category);
  const imported = await fsp.readdir(importedDir);
  const archivedPdf = imported.find(name => name.toLowerCase().endsWith('.pdf'));
  const sidecarName = imported.find(name => name.endsWith('.来源.json'));
  assert.ok(archivedPdf, '归档目录应包含 PDF');
  assert.ok(sidecarName, '归档目录应包含来源记录');
  assert.deepEqual(
    await fsp.readFile(path.join(importedDir, archivedPdf)),
    await fsp.readFile(pdf),
    '归档应保留原始 PDF 字节',
  );
  const sidecar = JSON.parse(await fsp.readFile(path.join(importedDir, sidecarName), 'utf8'));
  assert.equal(sidecar['文献编号'], 'L001');
  assert.equal(sidecar['DOI'], doi);
  assert.match(await fsp.readFile(readme, 'utf8'), /\|\s*L001\s*\|/, 'README 应新增 L001 索引行');
  const rebuilt = JSON.parse(await fsp.readFile(catalogFile, 'utf8'));
  assert.equal(rebuilt.record_count, 1);
  assert.equal(rebuilt.records[0].title, title);

  // 再次启动：已有库不被覆盖，导入结果仍然可见。
  const readmeBefore = await fsp.readFile(readme);
  await terminate(child);
  child = startServer(installDir, library, python, pdftoppm);
  const secondBase = await waitForServer(child);
  const reopened = await waitForPapers(secondBase, 1);
  assert.equal(reopened.length, 1);
  assert.deepEqual(await fsp.readFile(readme), readmeBefore, '再次启动不应改写已有 README');
});
