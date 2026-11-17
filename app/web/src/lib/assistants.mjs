import path from 'node:path';
import { ChatService, dynamicTools } from './chat.mjs';
import { PiClient } from './pi.mjs';

export class AssistantService extends ChatService {
  constructor(options) {
    const client=options.piClient||new PiClient(options);
    super({...options,client,stateDir:path.join(options.stateDir,'pi'),
      emit:event=>options.emit(event.type==='status'&&event.status
        ?{type:'status',agents:{pi:{...event.status,models:event.models}}}
        :event)});
    client.toolDefinitions=dynamicTools;
    client.instructions=this.instructions();
  }
  snapshot(){return {defaultProvider:'pi',agents:{pi:{...this.status(),models:this.models}},models:this.models};}
  async connect(){const result=await super.connect();return {...result,...this.snapshot()};}
  async settings(){await this.connect();return this.client.settingsInfo();}
  async saveKey(provider,key){await this.connect();await this.client.saveProviderKey(provider,key);await this.connect();return this.client.settingsInfo();}
  async removeKey(provider){await this.connect();await this.client.removeProviderKey(provider);await this.connect();return this.client.settingsInfo();}
  async setDefaultModel(model){await this.connect();await this.client.setDefaultModel(model);await this.connect();return this.client.settingsInfo();}
}
