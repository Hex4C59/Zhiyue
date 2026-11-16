import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { redact } from './store.mjs';

// Resolve the SDK from Pi's managed installation, or a normal npm installation.
export function resolvePi(env=process.env) {
  if(env.LITERATURE_PI_SDK) {
    const entry=path.resolve(env.LITERATURE_PI_SDK);
    if(!fs.existsSync(entry))throw new Error('LITERATURE_PI_SDK 指向的 Pi SDK 不存在。');
    return entry;
  }
  const agentDir=env.PI_CODING_AGENT_DIR||path.join(os.homedir(),'.pi','agent');
  const candidates=[];
  const versionFile=path.join(agentDir,'install','current-version');
  if(fs.existsSync(versionFile)) {
    const version=fs.readFileSync(versionFile,'utf8').trim();
    if(/^[\w.+-]+$/.test(version)&&!['.','..'].includes(version))candidates.push(path.join(agentDir,'install','releases',version,'node_modules','@earendil-works','pi-coding-agent','dist','index.js'));
  }
  for(const directory of [path.dirname(process.execPath),path.join(os.homedir(),'AppData','Roaming','npm'),...(env.PATH||'').split(path.delimiter)]) {
    for(const scope of ['@earendil-works','@mariozechner'])candidates.push(path.join(directory,'node_modules',scope,'pi-coding-agent','dist','index.js'));
  }
  const entry=candidates.find(file=>fs.existsSync(file));
  if(!entry)throw new Error('未找到 Pi Agent SDK。请安装 Pi，或用 LITERATURE_PI_SDK 指定 dist/index.js。');
  return entry;
}

// 把 Pi 的会话事件转换为网站的聊天协议，使附件、工具和持久化共用 ChatService。
export class PiClient extends EventEmitter {
  constructor({root,stateDir,sdk,agentDir=process.env.PI_CODING_AGENT_DIR||path.join(os.homedir(),'.pi','agent')}={}) {
    super();Object.assign(this,{root,sdk,agentDir});
    this.sessionsDir=path.join(stateDir,'pi-sessions');
    this.provider='pi';this.displayName='Pi Agent';this.available=false;this.lastError=null;
    this.sessions=new Map();this.turns=new Map();this.pending=new Map();this.sequence=0;
  }
  async start() {
    if(this.available)return;
    if(this.starting)return this.starting;
    this.starting=(async()=>{
      try {
        this.sdk ||= await import(pathToFileURL(resolvePi()).href);
        if(!this.sdk.ModelRuntime)throw new Error('当前 Pi SDK 版本不兼容，请升级 Pi Agent。');
        this.runtime=await this.sdk.ModelRuntime.create({authPath:path.join(this.agentDir,'auth.json'),modelsPath:path.join(this.agentDir,'models.json')});
        this.settings=this.sdk.SettingsManager.create(this.root,this.agentDir).getGlobalSettings();
        this.models=await this.runtime.getAvailable();
        this.available=true;this.lastError=this.models.length?null:'Pi 尚无可用模型，请先在终端运行 pi 并配置模型或登录，然后重新检测。';
      }catch(error){this.lastError=redact(error.message);throw error;}
    })().finally(()=>{this.starting=null;});
    return this.starting;
  }
  pickModel(id) {
    if(id) {
      const model=this.models.find(m=>`${m.provider}/${m.id}`===id);
      if(!model)throw new Error('所选 Pi 模型不可用，请重新检测模型列表。');
      return model;
    }
    return this.models.find(m=>m.provider===this.settings.defaultProvider&&m.id===this.settings.defaultModel)||this.models[0];
  }
  async request(method,params={}) {
    if(method==='account/read') {
      // Recheck availability after the user has configured Pi in another terminal.
      this.models=await this.runtime.getAvailable();
      this.lastError=this.models.length?null:'Pi 尚无可用模型。请在终端运行 pi 并配置模型或登录，再点击重新检测。';
      return {account:this.models.length?{type:'pi',planType:'本机 Pi 配置'}:null,requiresOpenaiAuth:!this.models.length};
    }
    if(method==='model/list')return {data:this.models.map(m=>({id:`${m.provider}/${m.id}`,model:`${m.provider}/${m.id}`,displayName:`${m.name||m.id} · ${m.provider}`,isDefault:m===this.pickModel()}))};
    if(method==='account/login/start')throw new Error('请在终端运行 pi 完成登录或模型配置，然后回到网页点击重新检测。');
    if(method==='thread/start')return this.createSession(params);
    if(method==='thread/resume')return this.createSession(params,params.threadId);
    if(method==='turn/start') {
      const session=this.sessions.get(params.threadId);
      if(!session)throw new Error('Pi 会话尚未载入。');
      if(this.turns.has(params.threadId))throw new Error('Pi 当前回答尚未结束。');
      if(params.model)await session.setModel(this.pickModel(params.model),{persist:false});
      const turn={id:randomUUID(),cancelled:false};this.turns.set(params.threadId,turn);
      setImmediate(()=>this.runTurn(params,session,turn));
      return {turn:{id:turn.id}};
    }
    if(method==='turn/interrupt') {
      const turn=this.turns.get(params.threadId);if(turn)turn.cancelled=true;
      await this.sessions.get(params.threadId)?.abort();return {};
    }
    throw new Error(`Pi 不支持此请求：${method}`);
  }
  async createSession(params,file) {
    if(this.sessions.has(file))return {thread:{id:file}};
    fs.mkdirSync(this.sessionsDir,{recursive:true});
    if(file) {
      const target=fs.existsSync(file)?fs.realpathSync(file):path.join(fs.realpathSync(path.dirname(file)),path.basename(file));
      const relative=path.relative(fs.realpathSync(this.sessionsDir),target);
      if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('Pi 会话路径越界。');
    }
    const manager=file?this.sdk.SessionManager.open(file,this.sessionsDir,this.root):this.sdk.SessionManager.create(this.root,this.sessionsDir);
    const id=manager.getSessionFile();
    const instructions=params.developerInstructions||this.instructions||'你是文献研究助手，使用中文回答并核对原文证据。';
    this.instructions=instructions;
    const projectRules=path.join(this.root,'..','AGENTS.md');
    const rules=fs.existsSync(projectRules)?fs.readFileSync(projectRules,'utf8'):'';
    const loader={
      getExtensions:()=>({extensions:[],errors:[],runtime:this.sdk.createExtensionRuntime()}),
      getSkills:()=>({skills:[],diagnostics:[]}),getPrompts:()=>({prompts:[],diagnostics:[]}),getThemes:()=>({themes:[],diagnostics:[]}),
      getAgentsFiles:()=>({agentsFiles:[]}),getSystemPrompt:()=>`${instructions}\n\n${rules}`,
      getSystemPromptSource:()=>undefined,getAppendSystemPrompt:()=>[],getAppendSystemPromptSources:()=>[],extendResources:()=>{},reload:async()=>{}
    };
    const definitions=params.dynamicTools||this.toolDefinitions;
    if(!definitions)throw new Error('Pi 会话缺少文献工具定义。');
    this.toolDefinitions=definitions;
    const customTools=definitions.map(tool=>({name:tool.name,label:tool.name,description:tool.description,parameters:tool.inputSchema,
      execute:async(_callId,args,signal)=>{
        const reply=await this.callTool(id,tool.name,args,signal);
        if(!reply.success)throw new Error(reply.contentItems?.map(c=>c.text).join('\n')||'文献工具执行失败。');
        return {content:reply.contentItems.map(c=>({type:'text',text:c.text})),details:{}};
      }}));
    const {session}=await this.sdk.createAgentSession({cwd:this.root,agentDir:this.agentDir,modelRuntime:this.runtime,
      ...(params.model?{model:this.pickModel(params.model)}:{}),resourceLoader:loader,sessionManager:manager,
      settingsManager:this.sdk.SettingsManager.inMemory(this.settings),tools:customTools.map(t=>t.name),customTools});
    this.sessions.set(id,session);return {thread:{id}};
  }
  async runTurn(params,session,turn) {
    let itemId=randomUUID(),failure;
    const notify=(method,extra)=>this.emit('notification',{method,params:{threadId:params.threadId,turnId:turn.id,...extra}});
    const unsubscribe=session.subscribe(event=>{
      if(event.type==='message_start'&&event.message?.role==='assistant')itemId=randomUUID();
      if(event.type==='message_update'&&event.assistantMessageEvent?.type==='text_delta')notify('item/agentMessage/delta',{itemId,delta:event.assistantMessageEvent.delta});
      if(event.type==='message_end'&&event.message?.role==='assistant') {
        if(event.message.stopReason==='error')failure=event.message.errorMessage||'Pi 模型请求失败。';
        else if(event.message.stopReason!=='aborted')failure=undefined;
        notify('item/completed',{item:{id:itemId,type:'agentMessage',text:event.message.content.filter(c=>c.type==='text').map(c=>c.text).join('')}});
      }
      if(event.type==='tool_execution_start')notify('item/started',{item:{type:'dynamicToolCall',tool:event.toolName,status:'inProgress'}});
    });
    try {
      if(!turn.cancelled) {
        const images=params.input.filter(c=>c.type==='localImage').map(c=>({type:'image',data:fs.readFileSync(c.path).toString('base64'),mimeType:({'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif'})[path.extname(c.path).toLowerCase()]}));
        if(images.length&&!session.model?.input?.includes('image'))throw new Error('当前 Pi 模型不支持图片，请选择支持图片的模型。');
        await session.prompt(params.input.filter(c=>c.type==='text').map(c=>c.text).join('\n'),{images,expandPromptTemplates:false});
      }
    }catch(error){failure=redact(error.message);}
    finally {
      unsubscribe();this.turns.delete(params.threadId);
      notify('turn/completed',{turn:{id:turn.id,status:turn.cancelled?'interrupted':failure?'failed':'completed',...(failure?{error:{message:redact(failure)}}:{})}});
    }
  }
  callTool(threadId,tool,args,signal) {
    if(signal?.aborted)return Promise.reject(new Error('已停止。'));
    const id=++this.sequence;
    return new Promise((resolve,reject)=>{
      const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);this.pending.delete(id);};
      const abort=()=>{cleanup();reject(new Error('已停止。'));};
      const timer=setTimeout(()=>{cleanup();reject(new Error('文献工具响应超时。'));},120000);
      this.pending.set(id,{resolve:value=>{cleanup();resolve(value);},reject:error=>{cleanup();reject(error);}});
      signal?.addEventListener('abort',abort,{once:true});
      this.emit('request',{id,method:'item/tool/call',params:{threadId,tool,arguments:args}});
    });
  }
  respond(id,result){this.pending.get(id)?.resolve(result);}
  respondError(id,message){this.pending.get(id)?.reject(new Error(redact(message)));}
  async close() {
    for(const turn of this.turns.values())turn.cancelled=true;
    for(const pending of [...this.pending.values()])pending.reject(new Error('服务已关闭。'));
    for(const session of this.sessions.values())session.dispose();
    this.sessions.clear();this.available=false;
    await this.runtime?.settleCredentialWrites?.();
  }
}
