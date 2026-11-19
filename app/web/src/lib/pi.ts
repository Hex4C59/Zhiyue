import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { redact } from './store.js';
import { SkillRegistry, formatSkillsPrompt } from './skills.js';
import type { SkillRuntime } from './skills.js';
import type {
  AccountResult, AssistantClient, ChatModel, ModelListResult, ThreadResult, TurnResult,
} from './chat.js';

export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export const THINKING_LEVELS: ThinkingLevel[] = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];

export interface PiModel {
  id: string;
  provider: string;
  name?: string;
  input?: string[];
  reasoning?: boolean;
  thinkingLevelMap?: Partial<Record<ThinkingLevel, string | null>>;
  contextWindow?: number;
  [key: string]: unknown;
}

interface PiProvider {
  id: string;
  name?: string;
  auth?: { apiKey?: unknown; oauth?: unknown };
}

interface PiCredential {
  providerId: string;
  type: string;
}

interface PiAuthStatus {
  configured?: boolean;
  source?: string;
  label?: string;
}

export interface CompactionSettings {
  enabled: boolean;
  reserveTokens: number;
  keepRecentTokens: number;
}

export interface PiSettings extends Record<string, unknown> {
  defaultProvider?: string;
  defaultModel?: string;
  defaultThinkingLevel?: ThinkingLevel;
  modelThinkingLevels?: Record<string, ThinkingLevel>;
  compaction?: Record<string, unknown> & Partial<CompactionSettings>;
}

export interface PiProviderInfo {
  id: string;
  name: string;
  configured: boolean;
  source: string | null;
  sourceLabel: string | null;
  credentialType: string | null;
  supportsApiKey: boolean;
  supportsOAuth: boolean;
  availableModels: number;
}

export interface PiSettingsInfo {
  defaultModel: string;
  providers: PiProviderInfo[];
  thinking: {
    level: ThinkingLevel;
    available: ThinkingLevel[];
    default: ThinkingLevel | null;
    perModel: Record<string, ThinkingLevel>;
  };
  compaction: CompactionSettings;
  skills: {
    count: number;
    items: Array<{ name: string; description: string }>;
    diagnostics: string[];
  };
}

interface SettingsManager {
  getGlobalSettings(): PiSettings;
  setDefaultModelAndProvider(provider: string, model: string): void;
  getDefaultThinkingLevel(): ThinkingLevel | undefined;
  setDefaultThinkingLevel(level: ThinkingLevel): void;
  getModelThinkingLevel(provider: string, modelId: string): ThinkingLevel | undefined;
  getAllModelThinkingLevels(): Record<string, ThinkingLevel>;
  setModelThinkingLevel(provider: string, modelId: string, level: ThinkingLevel): void;
  removeModelThinkingLevel(provider: string, modelId: string): void;
  getCompactionSettings(model?: { provider: string; id: string }): CompactionSettings;
  getCompactionEnabled(): boolean;
  setCompactionEnabled(enabled: boolean): void;
  flush?(): Promise<void>;
  reload(): Promise<void>;
  applyOverrides(overrides: Record<string, unknown>): void;
}

interface PiSessionManager {
  getSessionFile(): string;
}

interface CustomTool {
  name: string;
  label: string;
  description: string;
  parameters: unknown;
  execute(callId: string, args: Record<string, unknown>, signal: AbortSignal): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    details: Record<string, unknown>;
  }>;
}

interface ResourceLoader {
  getExtensions(): unknown;
  getSkills(): unknown;
  getPrompts(): unknown;
  getThemes(): unknown;
  getAgentsFiles(): unknown;
  getSystemPrompt(): string;
  getSystemPromptSource(): undefined;
  getAppendSystemPrompt(): string[];
  getAppendSystemPromptSources(): string[];
  extendResources(): void;
  reload(): Promise<void>;
}

interface SessionOptions {
  cwd: string;
  agentDir: string;
  modelRuntime: PiRuntime;
  model?: PiModel;
  resourceLoader: ResourceLoader;
  sessionManager: PiSessionManager;
  settingsManager: SettingsManager;
  tools: string[];
  customTools: CustomTool[];
}

interface PiMessageEvent {
  message?: {
    role?: string;
    stopReason?: string;
    errorMessage?: string;
    content?: Array<{ type: string; text?: string; thinking?: string }>;
  };
  assistantMessageEvent?: { type: string; delta?: string };
}

interface PiEvent extends PiMessageEvent {
  type: string;
  toolName?: string;
}

export interface PiSession {
  model?: PiModel;
  thinkingLevel?: ThinkingLevel;
  subscribe(listener: (event: PiEvent) => void): () => void;
  setModel(model: PiModel, options?: { persist?: boolean }): Promise<void>;
  setThinkingLevel(level: ThinkingLevel, options?: { persist?: boolean }): void;
  getAvailableThinkingLevels(): ThinkingLevel[];
  prompt(text: string, options?: { images?: Array<Record<string, string>>; expandPromptTemplates?: boolean }): Promise<void>;
  abort(): Promise<void>;
  dispose(): void;
  /** 手动压缩上下文；SDK 会先中止当前回答。 */
  compact?(instructions?: string): Promise<{ tokensBefore: number; estimatedTokensAfter?: number }>;
}

interface PiRuntime {
  getAvailable(): Promise<PiModel[]>;
  listCredentials(): Promise<PiCredential[]>;
  getProviders(): PiProvider[];
  getProvider(id: string): PiProvider | undefined;
  getProviderAuthStatus(id: string): PiAuthStatus;
  login(providerId: string, type: 'api_key', interaction: {
    prompt(input: { type: string; message?: string }): Promise<string>;
    notify(message: unknown): void;
  }): Promise<void>;
  logout(providerId: string): Promise<void>;
  settleCredentialWrites?(): Promise<void>;
}

export interface PiSdk {
  ModelRuntime: { create(options: { authPath: string; modelsPath: string }): Promise<PiRuntime> };
  SettingsManager: {
    create(cwd: string, agentDir?: string): SettingsManager;
    inMemory(settings?: Record<string, unknown>): SettingsManager;
  };
  SessionManager: {
    create(cwd: string, directory: string): PiSessionManager;
    open(file: string, directory: string, cwd: string): PiSessionManager;
  };
  createExtensionRuntime(): unknown;
  createAgentSession(options: SessionOptions): Promise<{ session: PiSession }>;
}

interface ToolReply {
  success: boolean;
  contentItems?: Array<{ type: string; text: string }>;
}

interface Turn {
  id: string;
  cancelled: boolean;
}

export interface PiClientOptions {
  root: string;
  stateDir: string;
  sdk?: PiSdk;
  agentDir?: string;
}

export interface CreateSessionParams {
  developerInstructions?: string;
  dynamicTools?: unknown;
  model?: string;
  thinking?: ThinkingLevel;
}

export interface TurnStartParams {
  threadId: string;
  model?: string;
  input: Array<{ type: string; text?: string; path?: string }>;
}

export interface CompactionPatch {
  enabled?: boolean;
  reserveTokens?: number;
  keepRecentTokens?: number;
}

// 与 Pi SDK 的 getSupportedThinkingLevels 一致：不支持推理的模型只有 off；
// xhigh、max 只在模型显式映射时开放，thinkingLevelMap 中为 null 表示不支持。
function supportedThinkingLevels(model?: PiModel): ThinkingLevel[] {
  if (!model) return [...THINKING_LEVELS];
  if (!model.reasoning) return ['off'];
  return THINKING_LEVELS.filter((level) => {
    const mapped = model.thinkingLevelMap?.[level];
    if (mapped === null) return false;
    return level === 'xhigh' || level === 'max' ? mapped !== undefined : true;
  });
}

// SDK 在创建会话和切换模型时按同一顺序收窄档位：先向上找，再向下找。
function clampThinking(level: ThinkingLevel, available: ThinkingLevel[]): ThinkingLevel {
  if (available.includes(level)) return level;
  const from = THINKING_LEVELS.indexOf(level);
  for (let index = Math.max(from, 0); index < THINKING_LEVELS.length; index++) {
    const candidate = THINKING_LEVELS[index] as ThinkingLevel;
    if (available.includes(candidate)) return candidate;
  }
  for (let index = from - 1; index >= 0; index--) {
    const candidate = THINKING_LEVELS[index] as ThinkingLevel;
    if (available.includes(candidate)) return candidate;
  }
  return available[0] || 'off';
}

// 使用项目依赖里的官方 Pi SDK；桌面版随包分发同一份依赖。
export function resolvePi(): string {
  try {
    return fileURLToPath(import.meta.resolve('@earendil-works/pi-coding-agent'));
  } catch {
    throw new Error('未找到项目自带的 Pi Agent SDK，请在项目根目录执行 npm install。');
  }
}

// 把 Pi 的会话事件转换为网站的聊天协议，使附件、工具和持久化共用 ChatService。
export class PiClient extends EventEmitter implements AssistantClient {
  readonly root: string;
  readonly agentDir: string;
  readonly sessionsDir: string;
  readonly provider = 'pi';
  readonly displayName = 'Pi Agent';
  sdk?: PiSdk;
  runtime!: PiRuntime;
  settingsManager!: SettingsManager;
  settings!: PiSettings;
  models: PiModel[] = [];
  available = false;
  lastError: string | null = null;
  sessions: Map<string, PiSession>;
  sessionSettings: Map<string, SettingsManager>;
  turns: Map<string, Turn>;
  pending: Map<number, { resolve(value: ToolReply): void; reject(error: Error): void }>;
  sequence: number;
  instructions?: string;
  toolDefinitions?: unknown;
  skills: SkillRuntime;
  private starting?: Promise<void>;

  constructor({ root, stateDir, sdk, agentDir = process.env.PI_CODING_AGENT_DIR || path.join(os.homedir(), '.pi', 'agent') }: PiClientOptions) {
    super();
    this.root = root;
    this.sdk = sdk;
    this.agentDir = agentDir;
    this.sessionsDir = path.join(stateDir, 'pi-sessions');
    this.sessions = new Map();
    this.sessionSettings = new Map();
    this.turns = new Map();
    this.pending = new Map();
    this.sequence = 0;
    this.skills = new SkillRegistry(root);
  }

  async start(): Promise<void> {
    if (this.available) return;
    if (this.starting) return this.starting;
    this.starting = (async () => {
      try {
        this.sdk ||= await import(pathToFileURL(resolvePi()).href) as unknown as PiSdk;
        if (!this.sdk.ModelRuntime) throw new Error('当前 Pi SDK 版本不兼容，请升级 Pi Agent。');
        this.runtime = await this.sdk.ModelRuntime.create({
          authPath: path.join(this.agentDir, 'auth.json'),
          modelsPath: path.join(this.agentDir, 'models.json'),
        });
        this.settingsManager = this.sdk.SettingsManager.create(this.root, this.agentDir);
        this.settings = this.settingsManager.getGlobalSettings();
        this.models = await this.runtime.getAvailable();
        this.refreshSkills();
        this.available = true;
        this.lastError = this.models.length ? null : 'Pi 尚无可用模型。请检查模型与密钥配置，然后重新检测。';
      } catch (error) {
        this.lastError = redact((error as Error).message);
        throw error;
      }
    })().finally(() => { this.starting = undefined; });
    return this.starting;
  }

  pickModel(id?: string): PiModel | undefined {
    if (id) {
      const model = this.models.find((item) => `${item.provider}/${item.id}` === id);
      if (!model) throw new Error('所选 Pi 模型不可用，请重新检测模型列表。');
      return model;
    }
    return this.models.find((item) => item.provider === this.settings.defaultProvider && item.id === this.settings.defaultModel)
      || this.models[0];
  }

  // 第三个参数由聊天层的 RPC 形状保留；Pi SDK 是进程内调用，忽略超时值。
  async request<R = unknown>(method: string, params: Record<string, unknown> = {}, _timeout?: number): Promise<R> {
    if (method === 'account/read') {
      // Recheck availability after the user has configured Pi in another terminal or in the settings panel.
      this.models = await this.runtime.getAvailable();
      this.lastError = this.models.length ? null : 'Pi 尚无可用模型。请检查模型与密钥配置，然后重新检测。';
      return {
        account: this.models.length ? { type: 'pi', planType: '本机 Pi 配置' } : null,
        requiresOpenaiAuth: !this.models.length,
      } as AccountResult as R;
    }
    if (method === 'model/list') {
      return {
        data: this.models.map((model) => ({
          id: `${model.provider}/${model.id}`,
          model: `${model.provider}/${model.id}`,
          displayName: `${model.name || model.id} · ${model.provider}`,
          isDefault: model === this.pickModel(),
        })),
      } as ModelListResult as R;
    }
    if (method === 'account/login/start') throw new Error('请在终端运行 pi 完成登录，然后回到网页点击重新检测。');
    if (method === 'thread/start') return await this.createSession(params as unknown as CreateSessionParams) as ThreadResult as R;
    if (method === 'thread/resume') {
      return await this.createSession({}, params.threadId as string) as ThreadResult as R;
    }
    if (method === 'turn/start') {
      const turnParams = params as unknown as TurnStartParams;
      const session = this.sessions.get(turnParams.threadId);
      if (!session) throw new Error('Pi 会话尚未载入。');
      if (this.turns.has(turnParams.threadId)) throw new Error('Pi 当前回答尚未结束。');
      if (turnParams.model) {
        const model = this.pickModel(turnParams.model);
        if (model) await session.setModel(model, { persist: false });
      }
      const turn: Turn = { id: randomUUID(), cancelled: false };
      this.turns.set(turnParams.threadId, turn);
      setImmediate(() => this.runTurn(turnParams, session, turn));
      return { turn: { id: turn.id } } as TurnResult as R;
    }
    if (method === 'turn/interrupt') {
      const turn = this.turns.get(params.threadId as string);
      if (turn) turn.cancelled = true;
      await this.sessions.get(params.threadId as string)?.abort();
      return {} as R;
    }
    if (method === 'thread/compact') {
      const threadId = params.threadId as string;
      if (this.turns.has(threadId)) throw new Error('当前回答尚未结束，请先停止后再压缩上下文。');
      // 服务重启后会话文件尚未载入，先按路径恢复再压缩；摘要写回同一个会话文件。
      if (!this.sessions.has(threadId)) await this.createSession({}, threadId);
      const session = this.sessions.get(threadId);
      if (!session) throw new Error('Pi 会话尚未载入，无法压缩上下文。');
      if (!session.compact) throw new Error('当前 Pi SDK 不支持手动压缩上下文。');
      const instructions = typeof params.instructions === 'string' ? params.instructions.trim() : '';
      const result = await session.compact(instructions || undefined);
      return { tokensBefore: result.tokensBefore, estimatedTokensAfter: result.estimatedTokensAfter } as R;
    }
    throw new Error(`Pi 不支持此请求：${method}`);
  }

  async refreshModels(): Promise<void> {
    this.models = await this.runtime.getAvailable();
    this.lastError = this.models.length ? null : 'Pi 尚无可用模型。请检查模型与密钥配置，然后重新检测。';
  }

  // 只返回服务商、凭据类型和配置来源，密钥本身不进入网页。
  async settingsInfo(): Promise<PiSettingsInfo> {
    const stored = new Map((await this.runtime.listCredentials()).map((item) => [item.providerId, item]));
    const providers: PiProviderInfo[] = this.runtime.getProviders().map((provider) => {
      const auth = this.runtime.getProviderAuthStatus(provider.id);
      const credential = stored.get(provider.id);
      return {
        id: provider.id, name: provider.name || provider.id,
        configured: !!auth.configured, source: auth.source || null, sourceLabel: auth.label || null,
        credentialType: credential?.type || null,
        supportsApiKey: !!provider.auth?.apiKey, supportsOAuth: !!provider.auth?.oauth,
        availableModels: this.models.filter((model) => model.provider === provider.id).length,
      };
    });
    providers.sort((a, b) => Number(b.configured) - Number(a.configured) || a.name.localeCompare(b.name, 'en'));
    const settings = this.settingsManager.getGlobalSettings();
    const defaultModel = settings.defaultProvider && settings.defaultModel
      ? `${settings.defaultProvider}/${settings.defaultModel}` : '';
    const model = defaultModel
      ? this.models.find((item) => `${item.provider}/${item.id}` === defaultModel)
      : this.models[0];
    // 压缩阈值只提供读取接口，网页需要展示实际生效值；未设置时 SDK 返回内置默认。
    const compaction = this.settingsManager.getCompactionSettings(model);
    return {
      defaultModel, providers,
      thinking: {
        level: this.thinkingLevel(model), available: supportedThinkingLevels(model),
        default: this.settingsManager.getDefaultThinkingLevel() || null,
        perModel: this.settingsManager.getAllModelThinkingLevels(),
      },
      compaction: {
        enabled: compaction.enabled, reserveTokens: compaction.reserveTokens,
        keepRecentTokens: compaction.keepRecentTokens,
      },
      skills: {
        count: this.skills.list().length,
        items: this.skills.list().map((skill) => ({ name: skill.name, description: skill.description })),
        diagnostics: this.skills.diagnostics(),
      },
    };
  }

  /** 重新扫描文献库内的技能目录；失败时保留上次结果并记录诊断。 */
  refreshSkills(): void {
    this.skills.reload();
  }

  /** 供 read_skill 工具调用：只读取技能目录内的 Markdown/文本。 */
  async readSkill(name: unknown, file?: unknown): Promise<{ name: string; file: string; text: string }> {
    return this.skills.read(name, file);
  }

  /** 当前生效档位：模型档位优先，其次全局默认，再按模型能力收窄。 */
  thinkingLevel(model?: PiModel): ThinkingLevel {
    if (!model) return 'off';
    const level = this.settingsManager.getModelThinkingLevel(model.provider, model.id)
      ?? this.settingsManager.getDefaultThinkingLevel() ?? 'medium';
    return clampThinking(level, supportedThinkingLevels(model));
  }

  /** 保存思考强度并同步到已载入的会话：内存储存的设置随全局改动更新，当前模型立即切换档位。 */
  async setThinking(level: ThinkingLevel, modelId?: string): Promise<PiSettingsInfo> {
    if (!THINKING_LEVELS.includes(level)) throw new Error('未知的思考强度。');
    const model = this.pickModel(modelId || undefined);
    // 不支持的档位按模型能力收窄后再保存，避免配置里留下该模型用不了的档位。
    const target = model ? clampThinking(level, supportedThinkingLevels(model)) : level;
    this.settingsManager.setDefaultThinkingLevel(target);
    if (model) this.settingsManager.setModelThinkingLevel(model.provider, model.id, target);
    this.settings = this.settingsManager.getGlobalSettings();
    const key = model ? `${model.provider}/${model.id}` : '';
    for (const [id, session] of this.sessions) {
      this.sessionSettings.get(id)?.applyOverrides({
        defaultThinkingLevel: target, ...(key ? { modelThinkingLevels: { [key]: target } } : {}),
      });
      if (key && model && session.model?.provider === model.provider && session.model?.id === model.id) {
        session.setThinkingLevel(target, { persist: false });
      }
    }
    return this.settingsInfo();
  }

  /** 保存上下文压缩设置；阈值写入全局 settings.json，对当前会话即时生效。 */
  async setCompaction({ enabled, reserveTokens, keepRecentTokens }: CompactionPatch = {}): Promise<PiSettingsInfo> {
    const patch: CompactionPatch = {};
    if (enabled !== undefined) {
      if (typeof enabled !== 'boolean') throw new Error('自动压缩开关必须是布尔值。');
      patch.enabled = enabled;
    }
    if (reserveTokens !== undefined) patch.reserveTokens = this.checkTokens(reserveTokens, '预留');
    if (keepRecentTokens !== undefined) patch.keepRecentTokens = this.checkTokens(keepRecentTokens, '保留');
    if (!Object.keys(patch).length) throw new Error('没有需要保存的上下文设置。');
    // 先排空 SDK 的待写入队列，避免它稍后覆盖本次直接写入的阈值。
    await this.settingsManager.flush?.();
    // SDK 未提供阈值写接口，这里合并写入与终端 Pi 共用的全局设置后重新载入。
    this.writeGlobalSettings(patch);
    await this.settingsManager.reload();
    this.settings = this.settingsManager.getGlobalSettings();
    // 会话设置持有快照，这里补上最新的压缩配置，使阈值对当前会话立即生效。
    for (const manager of this.sessionSettings.values()) {
      manager.applyOverrides({ compaction: { ...(this.settings.compaction || {}) } });
    }
    return this.settingsInfo();
  }

  checkTokens(value: unknown, label: string): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1000 || value > 2000000) {
      throw new Error(`${label} token 需为 1000 到 2000000 之间的整数。`);
    }
    return value;
  }

  // 先读后写并原子替换，保留 settings.json 中其他字段与已有压缩配置。
  writeGlobalSettings(patch: CompactionPatch): void {
    const file = path.join(this.agentDir, 'settings.json');
    let current: Record<string, unknown> = {};
    try {
      current = JSON.parse(fs.readFileSync(file, 'utf8') || '{}') as Record<string, unknown>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`无法读取 Pi 设置文件：${(error as Error).message}`);
      }
    }
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      throw new Error('Pi 设置文件格式不正确，请先手工修复。');
    }
    const previous = (current.compaction && typeof current.compaction === 'object')
      ? current.compaction as Record<string, unknown> : {};
    const next = { ...current, compaction: { ...previous, ...patch } };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    try {
      fs.writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`);
      fs.renameSync(temp, file);
    } catch (error) {
      // 写入失败时不要留下临时文件，原设置文件保持未修改。
      fs.rmSync(temp, { force: true });
      throw error;
    }
  }

  async saveProviderKey(providerId: string, key: string): Promise<void> {
    const provider = this.runtime.getProvider(providerId);
    if (!provider) throw new Error('未知的 Pi 服务商。');
    if (!provider.auth?.apiKey) throw new Error('该服务商不支持 API 密钥，请在终端 Pi 中登录。');
    // Some providers ask for extra text or selections during login; those flows stay in the Pi CLI.
    await this.runtime.login(providerId, 'api_key', {
      prompt: async (prompt) => {
        if (prompt.type === 'secret') return key;
        throw new Error(`该服务商还需要填写${prompt.message || '额外信息'}，请在终端 Pi 中完成配置。`);
      },
      notify: () => {},
    });
    await this.refreshModels();
  }

  async removeProviderKey(providerId: string): Promise<void> {
    const credential = (await this.runtime.listCredentials()).find((item) => item.providerId === providerId);
    if (!credential) throw new Error('该服务商没有已保存的凭据。');
    if (credential.type !== 'api_key') throw new Error('该服务商使用账号登录，请在终端 Pi 中管理。');
    await this.runtime.logout(providerId);
    await this.refreshModels();
  }

  async setDefaultModel(modelId: string): Promise<void> {
    const model = this.models.find((item) => `${item.provider}/${item.id}` === modelId);
    if (!model) throw new Error('所选模型当前不可用，请重新检测模型列表。');
    this.settingsManager.setDefaultModelAndProvider(model.provider, model.id);
    this.settings = this.settingsManager.getGlobalSettings();
  }

  async createSession(params: CreateSessionParams, file?: string): Promise<{ thread: { id: string } }> {
    if (file && this.sessions.has(file)) return { thread: { id: file } };
    fs.mkdirSync(this.sessionsDir, { recursive: true });
    if (file) {
      const target = fs.existsSync(file)
        ? fs.realpathSync(file)
        : path.join(fs.realpathSync(path.dirname(file)), path.basename(file));
      const relative = path.relative(fs.realpathSync(this.sessionsDir), target);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Pi 会话路径越界。');
    }
    const sdk = this.sdk as PiSdk;
    const manager = file
      ? sdk.SessionManager.open(file, this.sessionsDir, this.root)
      : sdk.SessionManager.create(this.root, this.sessionsDir);
    const id = manager.getSessionFile();
    const instructions = params.developerInstructions || this.instructions || '你是文献研究助手，使用中文回答并核对原文证据。';
    this.instructions = instructions;
    const projectRules = path.join(this.root, '.zhiyue', 'AGENTS.md');
    const rules = fs.existsSync(projectRules) ? fs.readFileSync(projectRules, 'utf8') : '';
    this.refreshSkills();
    const loader: ResourceLoader = {
      getExtensions: () => ({ extensions: [], errors: [], runtime: sdk.createExtensionRuntime() }),
      getSkills: () => ({ skills: [], diagnostics: [] }),
      getPrompts: () => ({ prompts: [], diagnostics: [] }),
      getThemes: () => ({ themes: [], diagnostics: [] }),
      getAgentsFiles: () => ({ agentsFiles: [] }),
      getSystemPrompt: () => `${instructions}\n\n${rules}${formatSkillsPrompt(this.skills.list())}`,
      getSystemPromptSource: () => undefined,
      getAppendSystemPrompt: () => [],
      getAppendSystemPromptSources: () => [],
      extendResources: () => {},
      reload: async () => {},
    };
    const definitions = (params.dynamicTools || this.toolDefinitions) as Array<{
      name: string;
      description: string;
      inputSchema: unknown;
    }>;
    if (!definitions) throw new Error('Pi 会话缺少文献工具定义。');
    this.toolDefinitions = definitions;
    const customTools: CustomTool[] = definitions.map((tool) => ({
      name: tool.name,
      label: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
      execute: async (_callId, args, signal) => {
        const reply = await this.callTool(id, tool.name, args, signal);
        if (!reply.success) throw new Error(reply.contentItems?.map((c) => c.text).join('\n') || '文献工具执行失败。');
        return { content: (reply.contentItems ?? []).map((c) => ({ type: 'text' as const, text: c.text })), details: {} };
      },
    }));
    // 每个会话持有设置快照，思考强度与压缩阈值的改动通过 applyOverrides 同步。
    const sessionSettings = sdk.SettingsManager.inMemory(this.settings);
    const { session } = await sdk.createAgentSession({
      cwd: this.root,
      agentDir: this.agentDir,
      modelRuntime: this.runtime,
      ...(params.model ? { model: this.pickModel(params.model) } : {}),
      resourceLoader: loader,
      sessionManager: manager,
      settingsManager: sessionSettings,
      tools: customTools.map((t) => t.name),
      customTools,
    });
    this.sessions.set(id, session);
    this.sessionSettings.set(id, sessionSettings);
    return { thread: { id } };
  }

  async runTurn(params: TurnStartParams, session: PiSession, turn: Turn): Promise<void> {
    let itemId = randomUUID();
    let failure: string | undefined;
    const notify = (method: string, extra: Record<string, unknown>): void => {
      this.emit('notification', { method, params: { threadId: params.threadId, turnId: turn.id, ...extra } });
    };
    const unsubscribe = session.subscribe((event) => {
      if (event.type === 'message_start' && event.message?.role === 'assistant') itemId = randomUUID();
      if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
        notify('item/agentMessage/delta', { itemId, delta: event.assistantMessageEvent.delta });
      }
      // 思考过程单独转发，正文和推理在界面上分别展示。
      if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'thinking_delta') {
        notify('item/agentMessage/thinking', { itemId, delta: event.assistantMessageEvent.delta });
      }
      if (event.type === 'message_end' && event.message?.role === 'assistant') {
        if (event.message.stopReason === 'error') failure = event.message.errorMessage || 'Pi 模型请求失败。';
        else if (event.message.stopReason !== 'aborted') failure = undefined;
        const content = event.message.content ?? [];
        const thinking = content.filter((c) => c.type === 'thinking').map((c) => c.thinking ?? '').join('');
        const text = content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
        notify('item/completed', { item: { id: itemId, type: 'agentMessage', text, ...(thinking ? { thinking } : {}) } });
      }
      if (event.type === 'tool_execution_start') {
        notify('item/started', { item: { type: 'dynamicToolCall', tool: event.toolName, status: 'inProgress' } });
      }
    });
    try {
      if (!turn.cancelled) {
        const images = params.input.filter((c) => c.type === 'localImage' && c.path).map((c) => ({
          type: 'image',
          data: fs.readFileSync(c.path as string).toString('base64'),
          mimeType: ({
            '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
          } as Record<string, string>)[path.extname(c.path as string).toLowerCase()],
        })) as Array<Record<string, string>>;
        if (images.length && !session.model?.input?.includes('image')) {
          throw new Error('当前 Pi 模型不支持图片，请选择支持图片的模型。');
        }
        await session.prompt(params.input.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n'), {
          images, expandPromptTemplates: false,
        });
      }
    } catch (error) {
      failure = redact((error as Error).message);
    } finally {
      unsubscribe();
      this.turns.delete(params.threadId);
      notify('turn/completed', {
        turn: {
          id: turn.id, status: turn.cancelled ? 'interrupted' : failure ? 'failed' : 'completed',
          ...(failure ? { error: { message: redact(failure) } } : {}),
        },
      });
    }
  }

  callTool(threadId: string, tool: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolReply> {
    if (signal?.aborted) return Promise.reject(new Error('已停止。'));
    const id = ++this.sequence;
    return new Promise<ToolReply>((resolve, reject) => {
      const cleanup = (): void => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        this.pending.delete(id);
      };
      const abort = (): void => { cleanup(); reject(new Error('已停止。')); };
      const timer = setTimeout(() => { cleanup(); reject(new Error('文献工具响应超时。')); }, 120000);
      this.pending.set(id, { resolve: (value) => { cleanup(); resolve(value); }, reject: (error) => { cleanup(); reject(error); } });
      signal?.addEventListener('abort', abort, { once: true });
      this.emit('request', { id, method: 'item/tool/call', params: { threadId, tool, arguments: args } });
    });
  }

  respond(id: number, result: unknown): void { this.pending.get(id)?.resolve(result as ToolReply); }

  respondError(id: number, message: string): void { this.pending.get(id)?.reject(new Error(redact(message))); }

  async close(): Promise<void> {
    for (const turn of this.turns.values()) turn.cancelled = true;
    for (const pending of [...this.pending.values()]) pending.reject(new Error('服务已关闭。'));
    for (const session of this.sessions.values()) session.dispose();
    this.sessions.clear();
    this.sessionSettings.clear();
    this.available = false;
    await this.runtime?.settleCredentialWrites?.();
  }
}

export type { ChatModel };
export type { PiRuntime };
// PROBE2
