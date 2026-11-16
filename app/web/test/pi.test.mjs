import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PiClient, resolvePi } from '../src/lib/pi.mjs';
import { AssistantService } from '../src/lib/assistants.mjs';
import { createApp } from '../src/server.mjs';

const wait=async predicate=>{for(let n=0;n<200;n++){if(predicate())return;await new Promise(r=>setTimeout(r,5));}throw new Error('condition timeout');};
function mockSDK() {
  const models=[{id:'test-model',provider:'test',name:'Test',input:['text','image']}];
  const created=[];let hold;
  const sdk={created,models,
    ModelRuntime:{create:async()=>({getAvailable:async()=>models,settleCredentialWrites:async()=>{}})},
    SettingsManager:{create:()=>({getGlobalSettings:()=>({defaultProvider:'test',defaultModel:'test-model'})}),inMemory:x=>x},
    createExtensionRuntime:()=>({}),
    SessionManager:{
      create:(_cwd,dir)=>{const file=path.join(dir,`${randomUUID()}.jsonl`);fs.writeFileSync(file,'{}');return {getSessionFile:()=>file};},
      open:file=>({getSessionFile:()=>file})
    },
    createAgentSession:async options=>{
      let listener;const session={model:models[0],options,subscribe:fn=>{listener=fn;return()=>{listener=null;};},setModel:async()=>{},
        prompt:async(text,promptOptions)=>{
          session.lastPrompt={text,...promptOptions};
          if(text.includes('等待停止')){await new Promise(r=>{hold=r;});return;}
          const tool=options.customTools.find(t=>t.name==='library_search');
          session.toolReply=await tool.execute('call-1',{query:'L001'},new AbortController().signal);
          listener?.({type:'message_start',message:{role:'assistant'}});
          for(const delta of ['Pi','已连接'])listener?.({type:'message_update',assistantMessageEvent:{type:'text_delta',delta}});
          listener?.({type:'message_end',message:{role:'assistant',stopReason:'stop',content:[{type:'text',text:'Pi已连接'}]}});
        },abort:async()=>{hold?.();},dispose:()=>{hold?.();}};
      created.push(session);return {session};
    }
  };return sdk;
}
function fixture(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'literature-pi-test-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const sdk=mockSDK(),events=[];
  const pi=new PiClient({root:dir,stateDir:dir,sdk});
  const options={root:dir,stateDir:dir,piClient:pi,emit:e=>events.push(structuredClone(e)),library:{getPaper:async()=>null,getLibrary:async()=>({papers:[{literature_id:'L001',title:'Test paper',authors:[]}]})},jobs:{},extract:async()=>({text:'附件内容'})};
  const chats=new AssistantService(options);t.after(()=>chats.client.close());
  return {chats,pi,sdk,dir,events,options};
}

test('Pi 复用流式消息、附件和文献工具',async t=>{
  const {chats,pi,sdk,dir,events}=fixture(t);
  await chats.connect();
  const c=chats.create();
  const image=path.join(dir,'test.png');fs.writeFileSync(image,'test-image');
  await chats.send(c.id,{text:'请解释附件',model:'test/test-model',attachments:[{id:'a',name:'test.png',path:image,mime:'image/png',size:10},{id:'b',name:'test.txt',path:'example.txt',mime:'text/plain',size:4}]});
  await wait(()=>chats.get(c.id).messages.at(-1).status==='completed');
  assert.equal(chats.get(c.id).messages.at(-1).text,'Pi已连接');
  assert.equal(events.filter(e=>e.type==='delta').map(e=>e.delta).join(''),'Pi已连接');
  assert.match(sdk.created[0].lastPrompt.text,/附件内容/);
  assert.equal(sdk.created[0].lastPrompt.images[0].data,Buffer.from('test-image').toString('base64'));
  assert.match(sdk.created[0].toolReply.content[0].text,/Test paper/);
  assert.deepEqual(sdk.created[0].options.tools,[
    'library_search','read_paper_pages','download_papers','continue_download_batch',
    'get_download_status','draft_note'
  ]);
  assert.equal(sdk.created[0].lastPrompt.expandPromptTemplates,false);
  assert.equal(pi.pending.size,0);
});

test('Pi 会话保存于独立目录，重建服务可恢复',async t=>{
  const {chats,dir,options,sdk}=fixture(t);
  await chats.connect();const c=chats.create({title:'Pi 会话'});
  await chats.send(c.id,{text:'问题'});await wait(()=>chats.get(c.id).messages.at(-1).status==='completed');
  await chats.client.close();
  const pi=new PiClient({root:dir,stateDir:dir,sdk});
  const restored=new AssistantService({...options,piClient:pi});t.after(()=>restored.client.close());
  assert.equal(restored.get(c.id).id,c.id);assert.equal(restored.get(c.id).messages.length,2);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'pi','chats.json'),'utf8')).chats.length,1);
  await restored.send(c.id,{text:'继续'});await wait(()=>restored.get(c.id).messages.at(-1).status==='completed');
  assert.equal(restored.get(c.id).messages.length,4);assert.equal(restored.list().length,1);
});

test('Pi 可停止正在生成的回答并继续新一轮，未知模型明确报错',async t=>{
  const {chats,pi,sdk}=fixture(t);await chats.connect();const c=chats.create();
  await chats.send(c.id,{text:'等待停止'});await wait(()=>sdk.created[0]?.lastPrompt);
  await chats.interrupt(c.id);await wait(()=>chats.get(c.id).messages.at(-1).status==='interrupted');
  assert.equal(pi.turns.size,0);
  await chats.send(c.id,{text:'新问题'});await wait(()=>chats.get(c.id).messages.at(-1).status==='completed');
  await assert.rejects(pi.request('turn/start',{threadId:chats.get(c.id).threadId,model:'test/missing'}),/不可用/);
});

test('Pi 恢复会话拒绝目录外文件，托管安装路径拒绝非法版本',async t=>{
  const {pi,dir}=fixture(t);await pi.start();
  pi.toolDefinitions=[];pi.instructions='test';
  const outside=path.join(dir,'outside.jsonl');fs.writeFileSync(outside,'{}');fs.mkdirSync(pi.sessionsDir,{recursive:true});
  await assert.rejects(pi.createSession({},outside),/越界/);
  const install=path.join(dir,'install');fs.mkdirSync(install);fs.writeFileSync(path.join(install,'current-version'),'../../outside');
  assert.throws(()=>resolvePi({PI_CODING_AGENT_DIR:dir,PATH:''}),/未找到/);
});

test('HTTP 提供 Pi 状态和连接接口',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'literature-pi-http-'));
  fs.mkdirSync(path.join(dir,'.zhiyue','catalog'),{recursive:true});fs.writeFileSync(path.join(dir,'.zhiyue','catalog','文献索引.json'),JSON.stringify({records:[]}));
  const stateDir=path.join(dir,'.zhiyue','data'),sdk=mockSDK();
  const piClient=new PiClient({root:dir,stateDir,sdk});
  const app=await createApp({root:dir,stateDir,connectPi:false,piClient});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await app.close();fs.rmSync(dir,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${app.server.address().port}`;
  const post=async(route,data={})=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const connected=await post('/api/agents/pi/connect');assert.equal(connected.status,200);
  const status=await connected.json();assert.equal(status.agents.pi.authenticated,true);assert.equal(status.agents.pi.models[0].model,'test/test-model');
  assert.deepEqual(Object.keys(status.agents),['pi']);
  const piChat=await (await post('/api/chats',{})).json();
  const sent=await post(`/api/chats/${piChat.id}/messages`,{text:'HTTP 问题'});assert.equal(sent.status,202);
  await wait(()=>app.chats.get(piChat.id).messages.at(-1).status!=='streaming');
  assert.equal(app.chats.get(piChat.id).messages.at(-1).status,'completed',app.chats.get(piChat.id).messages.at(-1).error);
  assert.equal((await (await fetch(base+`/api/chats/${piChat.id}`)).json()).messages.at(-1).text,'Pi已连接');
  const chats=await (await fetch(base+'/api/chats')).json();assert.equal(chats.length,1);
  assert.equal((await post('/api/agents/codex/connect')).status,404);
});
