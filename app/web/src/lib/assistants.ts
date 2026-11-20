import path from 'node:path';
import { ChatService, dynamicTools } from './chat.js';
import { statusError } from './errors.js';
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
      // 技能注册表、read_skill 与 /skill:名称 共用 PiClient 的同一份扫描结果。
      skills: client.skills,
      readSkill: (name, file) => client.readSkill(name, file),
      compact: (chatId, instructions) => this.compactThread(chatId, instructions),
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

  async reloadSkills(): Promise<PiSettingsInfo> {
    await this.connect();
    this.pi.refreshSkills();
    return this.pi.settingsInfo();
  }

  async reloadConfiguration(): Promise<AssistantSnapshot & ChatStatusSnapshot> {
    await this.pi.reloadConfiguration();
    return this.connect();
  }

  /** `/compact`：把压缩请求交给已载入的 Pi 会话；未开始的会话先报错。 */
  async compactThread(
    chatId: string, instructions?: string,
  ): Promise<{ tokensBefore: number; estimatedTokensAfter?: number }> {
    const chat = this.get(chatId);
    if (!chat.threadId) throw statusError('当前会话还没有上下文，先提问再压缩。', 409);
    return await this.pi.request<{ tokensBefore: number; estimatedTokensAfter?: number }>('thread/compact', {
      threadId: chat.threadId, ...(instructions ? { instructions } : {}),
    }, 120000);
  }
}
