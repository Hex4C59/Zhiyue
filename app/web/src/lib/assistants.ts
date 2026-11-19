import path from 'node:path';
import { ChatService, dynamicTools } from './chat.js';
import type { ChatEvent, ChatModel, ChatServiceOptions, ChatStatusSnapshot } from './chat.js';
import { PiClient } from './pi.js';
import type { CompactionPatch, PiSettingsInfo, ThinkingLevel } from './pi.js';

export interface AssistantServiceOptions {
  root: string;
  stateDir: string;
  library: ChatServiceOptions['library'];
  jobs: ChatServiceOptions['jobs'];
  emit: (event: ChatEvent) => unknown;
  extract: ChatServiceOptions['extract'];
  piClient?: PiClient;
}

export interface AssistantSnapshot {
  defaultProvider: 'pi';
  agents: { pi: ChatStatusSnapshot & { models: ChatModel[] } };
  models: ChatModel[];
}

export class AssistantService extends ChatService {
  readonly pi: PiClient;

  constructor(options: AssistantServiceOptions) {
    const client = options.piClient ?? new PiClient({ root: options.root, stateDir: options.stateDir });
    super({
      ...options,
      client,
      stateDir: path.join(options.stateDir, 'pi'),
      emit: (event) => options.emit(event.type === 'status' && event.status
        ? { type: 'status', agents: { pi: { ...(event.status as ChatStatusSnapshot), models: event.models as ChatModel[] } } }
        : event),
    });
    this.pi = client;
    client.toolDefinitions = dynamicTools;
    client.instructions = this.instructions();
  }

  snapshot(): AssistantSnapshot {
    return {
      defaultProvider: 'pi',
      agents: { pi: { ...this.status(), models: this.models } },
      models: this.models,
    };
  }

  override async connect(): Promise<AssistantSnapshot & ChatStatusSnapshot> {
    const result = await super.connect();
    return { ...result, ...this.snapshot() };
  }

  async settings(): Promise<PiSettingsInfo> {
    await this.connect();
    return this.pi.settingsInfo();
  }

  async saveKey(provider: string, key: string): Promise<PiSettingsInfo> {
    await this.connect();
    await this.pi.saveProviderKey(provider, key);
    await this.connect();
    return this.pi.settingsInfo();
  }

  async removeKey(provider: string): Promise<PiSettingsInfo> {
    await this.connect();
    await this.pi.removeProviderKey(provider);
    await this.connect();
    return this.pi.settingsInfo();
  }

  async setDefaultModel(model: string): Promise<PiSettingsInfo> {
    await this.connect();
    await this.pi.setDefaultModel(model);
    await this.connect();
    return this.pi.settingsInfo();
  }

  async setThinking(level: ThinkingLevel, model?: string): Promise<PiSettingsInfo> {
    await this.connect();
    return this.pi.setThinking(level, model);
  }

  async setCompaction(values: CompactionPatch): Promise<PiSettingsInfo> {
    await this.connect();
    return this.pi.setCompaction(values);
  }
}
