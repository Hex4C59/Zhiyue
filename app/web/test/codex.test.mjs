import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ChatService } from '../src/lib/codex.mjs';

class FakeCodex extends EventEmitter {
  constructor(){super();this.available=true;this.calls=[];this.responses=[];}
  async start(){}
  async request(method,params){this.calls.push({method,params});if(method==='account/read')return {account:{type:'apiKey'},requiresOpenaiAuth:true};if(method==='model/list')return {data:[]};if(method==='thread/start')return {thread:{id:'thread-1'}};if(method==='turn/start')return {turn:{id:'turn-1'}};return {};}
  respond(id,result){this.responses.push({id,result});}
  respondError(id,message){this.responses.push({id,error:message});}
}

async function fixture(t){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'literature-chat-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const client=new FakeCodex();const events=[];
  const chats=new ChatService({root:dir,stateDir:dir,client,emit:e=>events.push(structuredClone(e)),library:{getPaper:async()=>null},jobs:{startDownload:async x=>({id:'job-1',status:'queued',input:x.input})},extract:async()=>({text:'文件内容'})});
  chats.authenticated=true;
  return {chats,client,events,dir};
}
const until=async f=>{for(let i=0;i<40;i++){if(f())return;await new Promise(r=>setTimeout(r,5));}throw new Error('condition timeout');};

test('会话接入真实协议形状，图片以localImage输入，文件提取为有范围的文本',async t=>{
  const {chats,client}=await fixture(t);const c=chats.create();
  await chats.send(c.id,{text:'解释附件',attachments:[{id:'a',name:'图.png',mime:'image/png',path:'/chosen/image.png',size:10},{id:'b',name:'文档.txt',mime:'text/plain',path:'/chosen/file.txt',size:10}]});
  await until(()=>client.calls.some(x=>x.method==='turn/start'));
  const turn=client.calls.find(x=>x.method==='turn/start').params;
  assert.equal(turn.threadId,'thread-1');assert.equal(turn.input[1].type,'localImage');assert.match(turn.input[0].text,/文件内容/);
  assert.equal(client.calls[0].params.sandbox,'workspace-write');
});

test('多条agent消息流可拼接并在turn完成后持久化',async t=>{
  const {chats,events,dir}=await fixture(t);const c=chats.create();await chats.send(c.id,{text:'问题'});await until(()=>c.threadId);
  for(const [itemId,delta] of [['1','第一段'],['2','第二段']])chats.notification({method:'item/agentMessage/delta',params:{threadId:c.threadId,itemId,delta}});
  chats.notification({method:'turn/completed',params:{threadId:c.threadId,turn:{status:'completed'}}});
  assert.equal(c.messages.at(-1).text,'第一段\n\n第二段');assert.equal(c.messages.at(-1).status,'completed');
  assert.equal(events.filter(e=>e.type==='delta').map(e=>e.delta).join(''),'第一段\n\n第二段');
  assert.equal(JSON.parse(await fs.readFile(path.join(dir,'chats.json'),'utf8')).chats[0].messages.at(-1).text,'第一段\n\n第二段');
});

test('下载请求必须通过命名工具，审批只响应明确点击',async t=>{
  const {chats,client,events}=await fixture(t);const c=chats.create();await chats.send(c.id,{text:'下载'});await until(()=>c.threadId);
  await chats.serverRequest({id:88,method:'item/tool/call',params:{threadId:c.threadId,tool:'download_papers',arguments:{input:'10.1234/example'}}});
  assert.equal(client.responses.at(-1).result.success,true);assert.match(client.responses.at(-1).result.contentItems[0].text,/queued/);
  await chats.serverRequest({id:89,method:'item/commandExecution/requestApproval',params:{threadId:c.threadId,command:'a command'}});
  assert.equal(client.responses.length,1);const a=events.find(x=>x.type==='approval');
  chats.approve(a.approval.id,{decision:'decline'});assert.equal(client.responses.at(-1).result.decision,'decline');
  assert.throws(()=>chats.approve(a.approval.id,{decision:'accept'}));
});

test('附件解析期间停止并重发，旧请求不会发送或结束新一轮',async t=>{
  const {chats,client}=await fixture(t);const c=chats.create();
  let release,extracting=false;
  chats.extract=()=>{extracting=true;return new Promise(r=>{release=r;});};
  await chats.send(c.id,{text:'旧问题',attachments:[{id:'a',name:'资料.txt',mime:'text/plain',path:'/old.txt',size:4}]});
  await until(()=>extracting);
  await chats.interrupt(c.id);
  assert.equal(c.messages.at(-1).status,'interrupted');
  await chats.send(c.id,{text:'新问题'});
  await until(()=>client.calls.some(x=>x.method==='turn/start'));
  release({text:'过期附件'});
  await new Promise(r=>setImmediate(r));
  const starts=client.calls.filter(x=>x.method==='turn/start');
  assert.equal(starts.length,1);assert.match(starts[0].params.input[0].text,/新问题/);
  assert.equal(c.messages.at(-1).status,'streaming');
});

test('启动turn的请求尚未返回时，停止会等待真实turn ID再中断',async t=>{
  const {chats,client}=await fixture(t);const c=chats.create();let release;
  const original=client.request.bind(client);
  client.request=async(method,params)=>{
    if(method==='turn/start'){client.calls.push({method,params});return new Promise(r=>{release=r;});}
    return original(method,params);
  };
  await chats.send(c.id,{text:'启动期间停止'});await until(()=>release);
  await chats.interrupt(c.id);
  assert.ok(chats.active.has(c.id));
  await assert.rejects(chats.send(c.id,{text:'此时尚不能发新轮次'}),/尚未完成/);
  release({turn:{id:'starting-turn'}});
  await until(()=>client.calls.some(x=>x.method==='turn/interrupt'));
  assert.equal(client.calls.find(x=>x.method==='turn/interrupt').params.turnId,'starting-turn');
  chats.notification({method:'turn/completed',params:{threadId:c.threadId,turn:{id:'starting-turn',status:'interrupted'}}});
  assert.equal(c.messages.at(-1).status,'interrupted');
});
