import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp,checkRequest } from '../server.mjs';

test('本地HTTP服务提供目录、PDF范围读取和上传，拒绝跨站与越界资料',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'literature-http-'));
  await fs.mkdir(path.join(root,'catalog'));await fs.mkdir(path.join(root,'papers'));
  await fs.writeFile(path.join(root,'papers','论文.pdf'),'%PDF-1.4\nexample-bytes');
  await fs.writeFile(path.join(root,'catalog','文献索引.json'),JSON.stringify({records:[{literature_id:'L001',title:'测试论文',authors:['作者'],year:2001,file:'papers/论文.pdf',versions:[]}]}));
  const app=await createApp({root,stateDir:path.join(root,'web/data'),connectPi:false});
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
  t.after(async()=>{await app.close();await fs.rm(root,{recursive:true,force:true});});
  const index = await fetch(base + '/');
  assert.equal(index.status, 200); assert.match(await index.text(), /id="app"/);
  for (const route of ['/js/app.js', '/app.js']) {
    const script = await fetch(base + route);
    assert.equal(script.status, 200); assert.match(script.headers.get('content-type'), /javascript/);
    const source = await script.text();
    assert.match(source, /mountWorkspace/); assert.doesNotMatch(source, /process\.env|new Function\(/);
  }
  assert.equal((await fetch(base + '/dist/../frontend/main.js')).status, 404);
  let response=await fetch(base+'/api/library');assert.equal(response.status,200);assert.equal((await response.json()).papers[0].readStatus,'unread');
  response=await fetch(base+'/api/file?path='+encodeURIComponent('papers/论文.pdf'),{headers:{Range:'bytes=0-3'}});assert.equal(response.status,206);assert.equal(await response.text(),'%PDF');assert.match(response.headers.get('content-range'),/^bytes 0-3\//);
  response=await fetch(base+'/api/file?path='+encodeURIComponent('papers/../catalog/文献索引.json'));assert.equal(response.status,403);
  response=await fetch(base+'/api/chats',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.example'},body:'{}'});assert.equal(response.status,403);
  response=await fetch(base+'/api/chats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'问题'})});assert.equal(response.status,201);
  const filename=encodeURIComponent('附件.txt');response=await fetch(base+'/api/uploads',{method:'POST',headers:{'X-Filename':filename,'Content-Type':'application/octet-stream'},body:'待解释的文字'});assert.equal(response.status,201);const attachment=await response.json();assert.equal(attachment.name,'附件.txt');assert.equal(attachment.path,undefined);
  response=await fetch(base+'/api/uploads/'+attachment.id);assert.equal(await response.text(),'待解释的文字');
  response=await fetch(base+'/api/uploads',{method:'POST',headers:{'X-Filename':'fake.png','Content-Type':'application/octet-stream'},body:'<script>attack</script>'});assert.equal(response.status,400);
  response=await fetch(base+'/api/uploads',{method:'POST',headers:{'X-Filename':'test.html','Content-Type':'application/octet-stream'},body:'html'});assert.equal(response.status,415);
  response=await fetch(base+'/api/downloads/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({batch:'../x',action:'delete'})});assert.equal(response.status,400);
  assert.throws(()=>checkRequest({headers:{host:'evil.example'},method:'GET',url:'/api/library'}),/本机/);
});
