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
}
