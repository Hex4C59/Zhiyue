import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, stat, rm, symlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { previewPaper } from '../src/lib/preview.mjs';
import { resolvePython } from '../src/lib/jobs.mjs';
import { createApp } from '../src/server.mjs';

const project = fileURLToPath(new URL('../../', import.meta.url));
const python = resolvePython(project);

test('real Poppler preview deduplicates concurrent requests, caches pages and validates bounds', { timeout: 30000 }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'literature-preview-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'tools/download'), { recursive: true });
  await mkdir(path.join(root, 'papers'), { recursive: true });
  // Reuse the project's real Poppler locator and dependencies, in an isolated fixture.
  for (const name of ['validation.py', 'common.py']) await copyFile(path.join(project, 'tools/download', name), path.join(root, 'tools/download', name));
  const file = path.join(root, 'papers', 'two-pages.pdf');
  await promisify(execFile)(python, ['-c', 'from pypdf import PdfWriter; import sys; w=PdfWriter(); w.add_blank_page(width=300,height=400); w.add_blank_page(width=400,height=300); w.write(sys.argv[1])', file], { windowsHide: true, timeout: 10000 });
  const original = await readFile(file);
  // Count actual renderer invocations while retaining real Python/Poppler behavior.
  await writeFile(path.join(root, 'tools/download/validation.py'), '\nwith open(__file__ + ".calls", "a") as counter: counter.write("render\\n")\n', { flag: 'a' });
  const results = await Promise.all(Array.from({ length: 5 }, () => previewPaper({ root, python, file, page: 1 })));
  assert.ok(results.every(r => r.file === results[0].file && r.totalPages === 2 && r.page === 1));
  assert.deepEqual((await readFile(path.join(root, 'tools/download/validation.py.calls'), 'utf8')).trim().split(/\r?\n/), ['render']);
  assert.match(results[0].file, /web_pdf_preview[/\\][a-f0-9]{64}[/\\]page\.png$/);
  const png = await readFile(results[0].file);
  assert.equal(Math.max(png.readUInt32BE(16), png.readUInt32BE(20)), 1600);
  const before = (await stat(results[0].file)).mtimeMs;
  assert.deepEqual(await previewPaper({ root, python: path.join(root, 'missing-python'), file, page: '1' }), results[0]);
  assert.equal((await stat(results[0].file)).mtimeMs, before);
  const second = await previewPaper({ root, python, file, page: 2 });
  assert.notEqual(second.file, results[0].file); assert.equal(second.page, 2);
  for (const page of [0, -1, 1.5, '1foo', '', null, 3]) {
    await assert.rejects(previewPaper({ root, python, file, page }), e => e.statusCode === 400);
  }
  assert.deepEqual(await readFile(file), original);
  // A truncated cached image must be replaced rather than served as a black/broken page.
  await writeFile(results[0].file, 'broken');
  await previewPaper({ root, python, file, page: 1 });
  assert.ok((await stat(results[0].file)).size > 100);
  // Even a valid cache must not be read through a symlinked metadata file.
  const externalMeta = path.join(root, 'metadata.json');
  const meta = path.join(path.dirname(results[0].file), 'meta.json');
  await copyFile(meta, externalMeta); await rm(meta);
  await symlink(externalMeta, meta);
  await assert.rejects(previewPaper({ root, python, file, page: 1 }), e => e.statusCode === 400 && /缓存/.test(e.message));
});

test('cache rejects external ancestors and internal aliases before mkdir or cache reads', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'literature-preview-path-'));
  const outside = await mkdtemp(path.join(os.tmpdir(), 'literature-preview-outside-'));
  t.after(async () => { await rm(root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); });
  const file = path.join(root, 'fixture.pdf'); await writeFile(file, '%PDF-fixture');
  const type = process.platform === 'win32' ? 'junction' : 'dir';
  await symlink(outside, path.join(root, 'tmp'), type);
  await assert.rejects(previewPaper({ root, python, file, page: 1 }), e => e.statusCode === 400 && /缓存/.test(e.message));
  assert.deepEqual(await readdir(outside), []);
  await rm(path.join(root, 'tmp'));
  await mkdir(path.join(root, 'tmp')); await mkdir(path.join(root, 'alias-target'));
  await symlink(path.join(root, 'alias-target'), path.join(root, 'tmp/web_pdf_preview'), type);
  await assert.rejects(previewPaper({ root, python, file, page: 1 }), e => e.statusCode === 400 && /缓存/.test(e.message));
  assert.deepEqual(await readdir(path.join(root, 'alias-target')), []);
});

test('PDF text boxes preserve selectable content, rotation, blank-page status and indexed HTTP boundaries', {timeout:30000}, async t=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'literature-text-layer-'));
  await mkdir(path.join(root,'papers'));await mkdir(path.join(root,'catalog'));
  const file=path.join(root,'papers','selectable.pdf');
  const fixture=`from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject
import sys
w=PdfWriter()
font=w._add_object(DictionaryObject({NameObject('/Type'):NameObject('/Font'),NameObject('/Subtype'):NameObject('/Type1'),NameObject('/BaseFont'):NameObject('/Helvetica')}))
for i in range(5):
    page=w.add_blank_page(width=300,height=400)
    if i!=2:
        page[NameObject('/Resources')]=DictionaryObject({NameObject('/Font'):DictionaryObject({NameObject('/F1'):font})})
        stream=DecodedStreamObject();stream.set_data(b'BT /F1 14 Tf 20 350 Td (Copy & select <PDF>) Tj 0 -24 Td (Second line.) Tj ET')
        page[NameObject('/Contents')]=w._add_object(stream)
    if i==1:page.rotate(90)
    if i==3:page.rotate(270)
    if i==4:page.rotate(180)
w.write(sys.argv[1])`;
  await promisify(execFile)(python,['-c',fixture,file],{windowsHide:true,timeout:10000});
  const original=await readFile(file);
  await writeFile(path.join(root,'catalog','文献索引.json'),JSON.stringify({records:[{literature_id:'L001',title:'Synthetic selection test',authors:[],year:2026,file:'papers/selectable.pdf',versions:[]}]}));
  const app=await createApp({root,stateDir:path.join(root,'web/data'),connectCodex:false});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await app.close();await rm(root,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${app.server.address().port}`;
  const response=await fetch(base+'/api/papers/L001/text-layer?page=1');assert.equal(response.status,200);
  const text=await response.json();assert.equal(text.hasText,true,text.error);assert.match(text.text,/Copy & select <PDF>/);assert.match(text.text,/\nSecond line\./);
  assert.equal(text.width,300);assert.equal(text.height,400);
  assert.ok(text.lines.flatMap(l=>l.words).every(w=>w.x>=0&&w.y>=0&&w.x+w.width<=text.width&&w.y+w.height<=text.height));
  const rotated=await previewPaper({root,python,file,page:2});
  assert.equal(rotated.textLayer.hasText,true);
  assert.match(rotated.textLayer.text.replace(/\s+/g,' '),/Copy & select <PDF> Second line\./);
  assert.ok(rotated.textLayer.lines.flatMap(l=>l.words).every(w=>w.rotation===90));
  const png=await readFile(rotated.file);
  assert.ok(Math.abs(rotated.textLayer.width/rotated.textLayer.height-png.readUInt32BE(16)/png.readUInt32BE(20))<0.002,'旋转页面的文字层应与图片方向一致');
  for(const [page,rotation] of [[4,270],[5,180]]) {
    const result=await previewPaper({root,python,file,page});
    assert.match(result.textLayer.text.replace(/\s+/g,' '),/Copy & select <PDF> Second line\./);
    assert.ok(result.textLayer.lines.flatMap(l=>l.words).every(w=>w.rotation===rotation));
  }
  const blank=await previewPaper({root,python,file,page:3});assert.equal(blank.textLayer.hasText,false);assert.equal(blank.textLayer.text,'');assert.equal(blank.textLayer.error,undefined);
  assert.equal((await fetch(base+'/api/papers/L999/text-layer?page=1')).status,404);
  assert.equal((await fetch(base+'/api/papers/L001/text-layer?page=0')).status,400);
  assert.equal((await fetch(base+'/api/papers/L001/text-layer?page=6')).status,400);
  const cached=await previewPaper({root,python,file,page:1});
  const meta=path.join(path.dirname(cached.file),'meta.json');const old=JSON.parse(await readFile(meta,'utf8'));delete old.textLayer;await writeFile(meta,JSON.stringify(old));
  const repaired=await previewPaper({root,python,file,page:1});assert.equal(repaired.textLayer.hasText,true);
  assert.deepEqual(await readFile(file),original);
});
