import path from 'node:path';
import { ChatService, dynamicTools } from './codex.mjs';
import { PiClient } from './pi.mjs';

export class AssistantService {
  constructor(options) {
    this.defaultProvider=process.env.LITERATURE_AGENT==='codex'?'codex':'pi';
    this.services={};
    for(const provider of ['codex','pi']) {
      const client=provider==='codex'?options.codexClient:options.piClient||new PiClient(options);
      const service=new ChatService({...options,client,stateDir:provider==='codex'?options.stateDir:path.join(options.stateDir,'pi'),
        emit:event=>options.emit(event.type==='status'?{type:'status',agents:{[provider]:{...service.status(),models:service.models}}}:{...event,provider})});
      if(provider==='pi') {client.toolDefinitions=dynamicTools;client.instructions=service.instructions();}
      this.services[provider]=service;
    }
    this.client={close:()=>Promise.all(Object.values(this.services).map(s=>s.client.close()))};
  }
  service(provider=this.defaultProvider){const service=this.services[provider];if(!service)throw new Error('未知的助手，请选择 Pi Agent 或 Codex。');return service;}
  owner(id){return Object.values(this.services).find(s=>s.store.data.chats.some(c=>c.id===id))||this.missing();}
  missing(){throw Object.assign(new Error('会话不存在。'),{status:404});}
  snapshot(){return {defaultProvider:this.defaultProvider,agents:Object.fromEntries(Object.entries(this.services).map(([id,s])=>[id,{...s.status(),models:s.models}])),codex:this.services.codex.status(),models:this.service().models};}
  async connect(provider){const result=await this.service(provider).connect();return {...result,...this.snapshot()};}
  login(provider){return this.service(provider).login();}
  list(){return Object.entries(this.services).flatMap(([provider,s])=>s.list().map(c=>({...c,provider}))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
  get(id){const service=this.owner(id);return {...service.get(id),provider:service===this.services.pi?'pi':'codex'};}
  create({provider=this.defaultProvider,...data}={}){return {...this.service(provider).create(data),provider};}
  send(id,data){return this.owner(id).send(id,data);}
  interrupt(id){return this.owner(id).interrupt(id);}
  get approvals(){return new Map(Object.values(this.services).flatMap(s=>[...s.approvals]));}
  approve(id,data){const service=Object.values(this.services).find(s=>s.approvals.has(id));if(!service)throw Object.assign(new Error('该请求已失效。'),{status:404});return service.approve(id,data);}
}
