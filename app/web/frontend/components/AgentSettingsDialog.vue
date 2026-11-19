<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue';
import { json } from '../lib/content';
import Icon from './Icon.vue';
import type { WorkspaceApi } from '../lib/workspace';

interface ProviderInfo {
  id: string;
  name: string;
  configured?: boolean;
  source?: string | null;
  sourceLabel?: string | null;
  credentialType?: string | null;
  supportsApiKey?: boolean;
  supportsOAuth?: boolean;
  availableModels?: number;
}

interface SettingsInfo {
  defaultModel: string;
  providers: ProviderInfo[];
  thinking?: { level?: string; available?: string[] };
  compaction?: { enabled?: boolean; reserveTokens?: number; keepRecentTokens?: number };
}

const workspace = inject('workspace') as WorkspaceApi;
const emit = defineEmits<{ close: [] }>();
const levelLabels: Record<string, string> = {
  off: '关闭',
  minimal: '极简',
  low: '低',
  medium: '中',
  high: '高',
  xhigh: '很高',
  max: '最高',
};
const dialog = ref<HTMLDialogElement | null>(null);
const info = ref<SettingsInfo>({ defaultModel: '', providers: [] });
const defaultModel = ref('');
const providerId = ref('');
const key = ref('');
const thinkingLevel = ref('');
const compactionEnabled = ref(true);
const reserveTokens = ref<string | number>('');
const keepRecentTokens = ref<string | number>('');
const loading = ref(true);
const busy = ref('');
const error = ref('');
const modelOptions = computed(() => workspace.models.value);
const thinkingOptions = computed(() =>
  (info.value.thinking?.available || []).map((level) => ({ value: level, label: levelLabels[level] || level })),
);
const providers = computed(() => info.value.providers.filter((provider) => provider.supportsApiKey));
const current = computed(() => providers.value.find((provider) => provider.id === providerId.value) || null);
const statusText = computed(() => {
  const provider = current.value;
  if (!provider) return '';
  if (provider.credentialType === 'api_key') return '已保存 API 密钥';
  if (provider.credentialType === 'oauth') return '已通过账号登录';
  if (provider.configured && provider.source === 'environment')
    return `已由环境变量配置${provider.sourceLabel ? `：${provider.sourceLabel}` : ''}`;
  if (provider.configured) return '已配置';
  return '尚未配置';
});
const canRemove = computed(() => current.value?.credentialType === 'api_key');
const canEditKey = computed(() => Boolean(current.value) && current.value?.credentialType !== 'oauth');
onMounted(() => {
  const element = dialog.value;
  if (typeof element?.showModal === 'function') element.showModal();
  else element?.setAttribute('open', '');
  void load();
});
function close(): void {
  if (busy.value) return;
  const element = dialog.value;
  if (typeof element?.close === 'function') element.close();
  emit('close');
}
function backdrop(event: MouseEvent): void {
  if (event.target === dialog.value && !busy.value) close();
}
async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    apply(await workspace.api<SettingsInfo>('/api/agents/pi/settings'));
  } catch (err) {
    error.value = (err as Error).message || '无法读取 Pi 配置。';
  } finally {
    loading.value = false;
  }
}
function apply(data: SettingsInfo): void {
  info.value = data;
  defaultModel.value = modelOptions.value.some((model) => model.id === data.defaultModel)
    ? data.defaultModel
    : '';
  thinkingLevel.value = data.thinking?.level || '';
  compactionEnabled.value = data.compaction?.enabled !== false;
  reserveTokens.value = data.compaction?.reserveTokens ?? '';
  keepRecentTokens.value = data.compaction?.keepRecentTokens ?? '';
  if (!providers.value.some((provider) => provider.id === providerId.value)) {
    const fromDefault = String(data.defaultModel || '').split('/')[0];
    providerId.value =
      providers.value.find((provider) => provider.id === fromDefault)?.id ||
      providers.value[0]?.id ||
      '';
  }
  key.value = '';
}
async function saveKey(): Promise<void> {
  if (!current.value || busy.value) return;
  const value = key.value.trim();
  if (!value) {
    error.value = '请输入 API 密钥。';
    return;
  }
  const name = current.value.name;
  busy.value = 'save';
  error.value = '';
  try {
    apply(await workspace.api<SettingsInfo>('/api/agents/pi/settings/key', json('POST', {
      provider: current.value.id,
      key: value,
    })));
    workspace.toast(`已保存 ${name} 的 API 密钥。`);
  } catch (err) {
    error.value = (err as Error).message || '无法保存 API 密钥。';
  } finally {
    busy.value = '';
  }
}
async function removeKey(): Promise<void> {
  if (!current.value || busy.value) return;
  const name = current.value.name;
  if (!window.confirm(`清除 ${name} 已保存的 API 密钥？`)) return;
  busy.value = 'remove';
  error.value = '';
  try {
    apply(await workspace.api<SettingsInfo>('/api/agents/pi/settings/key/remove', json('POST', {
      provider: current.value.id,
    })));
    workspace.toast(`已清除 ${name} 的 API 密钥。`);
  } catch (err) {
    error.value = (err as Error).message || '无法清除 API 密钥。';
  } finally {
    busy.value = '';
  }
}
async function saveModel(): Promise<void> {
  if (busy.value) return;
  busy.value = 'model';
  error.value = '';
  try {
    apply(await workspace.api<SettingsInfo>('/api/agents/pi/settings/model', json('POST', {
      model: defaultModel.value,
    })));
    workspace.toast('默认模型已更新。');
  } catch (err) {
    error.value = (err as Error).message || '无法保存默认模型。';
    defaultModel.value = info.value.defaultModel || '';
  } finally {
    busy.value = '';
  }
}
function tokenValue(value: unknown): number {
  const text = String(value ?? '').trim();
  return /^\d+$/.test(text) ? Number(text) : NaN;
}
async function saveThinking(): Promise<void> {
  if (busy.value || !thinkingLevel.value) return;
  const level = thinkingLevel.value;
  busy.value = 'thinking';
  error.value = '';
  try {
    apply(await workspace.api<SettingsInfo>('/api/agents/pi/settings/thinking', json('POST', {
      level,
      ...(defaultModel.value ? { model: defaultModel.value } : {}),
    })));
    workspace.toast('思考强度已更新。');
  } catch (err) {
    error.value = (err as Error).message || '无法保存思考强度。';
    thinkingLevel.value = info.value.thinking?.level || '';
  } finally {
    busy.value = '';
  }
}
async function toggleCompaction(enabled: boolean): Promise<void> {
  compactionEnabled.value = enabled;
  await saveCompaction();
}
async function saveCompaction(): Promise<void> {
  if (busy.value) return;
  const reserve = tokenValue(reserveTokens.value);
  const keep = tokenValue(keepRecentTokens.value);
  if (!Number.isSafeInteger(reserve) || reserve < 1000 || reserve > 2000000) {
    error.value = '预留 token 需为 1000 到 2000000 之间的整数。';
    return;
  }
  if (!Number.isSafeInteger(keep) || keep < 1000 || keep > 2000000) {
    error.value = '保留近期 token 需为 1000 到 2000000 之间的整数。';
    return;
  }
  busy.value = 'compaction';
  error.value = '';
  try {
    apply(await workspace.api<SettingsInfo>('/api/agents/pi/settings/compaction', json('POST', {
      enabled: compactionEnabled.value,
      reserveTokens: reserve,
      keepRecentTokens: keep,
    })));
    workspace.toast('上下文压缩设置已更新。');
  } catch (err) {
    error.value = (err as Error).message || '无法保存上下文压缩设置。';
    reserveTokens.value = info.value.compaction?.reserveTokens ?? '';
    keepRecentTokens.value = info.value.compaction?.keepRecentTokens ?? '';
  } finally {
    busy.value = '';
  }
}
async function reload(): Promise<void> {
  if (busy.value) return;
  busy.value = 'reload';
  await workspace.reconnectAgent();
  busy.value = '';
  await load();
}
</script>

<template>
  <dialog
    ref="dialog"
    class="settings-dialog"
    aria-labelledby="settings-title"
    @cancel.prevent="close"
    @click="backdrop"
  >
    <div class="settings-sheet">
      <header class="settings-head">
        <div>
          <h2 id="settings-title">模型与密钥</h2>
          <p>网站与终端 Pi 共用本机配置。</p>
        </div>
        <button
          type="button"
          class="icon-button"
          title="关闭"
          aria-label="关闭"
          :disabled="!!busy"
          @click="close"
        >
          <Icon name="close" />
        </button>
      </header>
      <div class="settings-body">
        <div v-if="loading" class="settings-loading" role="status">
          <span class="busy-spinner" />正在读取本机 Pi 配置…
        </div>
        <template v-else>
          <section class="settings-section">
            <label class="settings-label" for="settings-model">默认模型</label>
            <select
              id="settings-model"
              v-model="defaultModel"
              :disabled="!modelOptions.length || !!busy"
              @change="saveModel"
            >
              <option value="" disabled>
                {{ modelOptions.length ? '选择模型' : '尚无可用模型' }}
              </option>
              <option v-for="model in modelOptions" :key="model.id" :value="model.id">
                {{ model.label }}
              </option>
            </select>
            <p class="settings-hint">
              {{
                modelOptions.length
                  ? '用于网站新会话，也会成为终端 Pi 的默认模型。'
                  : '尚无可用模型，请先在下方配置 API 密钥或登录账号。'
              }}
            </p>
          </section>
          <section class="settings-section">
            <label class="settings-label" for="settings-thinking">思考强度</label>
            <select
              id="settings-thinking"
              v-model="thinkingLevel"
              :disabled="!thinkingOptions.length || !!busy"
              @change="saveThinking"
            >
              <option v-for="option in thinkingOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <p class="settings-hint">
              {{
                thinkingOptions.length
                  ? '对当前会话立即生效，并成为终端 Pi 的默认档位；模型不支持的档位不会出现。'
                  : '当前模型没有可用的思考档位。'
              }}
            </p>
          </section>
          <section class="settings-section">
            <span class="settings-label">上下文压缩</span>
            <label class="settings-check">
              <input
                type="checkbox"
                :checked="compactionEnabled"
                :disabled="!!busy"
                @change="toggleCompaction(($event.target as HTMLInputElement).checked)"
              />
              长会话自动摘要历史
            </label>
            <div class="settings-token-row">
              <label class="settings-token-field">
                <span>预留 token</span>
                <input
                  v-model="reserveTokens"
                  type="number"
                  min="1000"
                  max="2000000"
                  step="1000"
                  :disabled="!!busy"
                  @change="saveCompaction"
                />
              </label>
              <label class="settings-token-field">
                <span>保留近期 token</span>
                <input
                  v-model="keepRecentTokens"
                  type="number"
                  min="1000"
                  max="2000000"
                  step="1000"
                  :disabled="!!busy"
                  @change="saveCompaction"
                />
              </label>
            </div>
            <p class="settings-hint">
              预留越大越早压缩；保留量决定压缩后仍原样保留的近期对话长度。修改后对当前会话生效。
            </p>
          </section>
          <section class="settings-section">
            <label class="settings-label" for="settings-provider">API 密钥</label>
            <select
              id="settings-provider"
              v-model="providerId"
              :disabled="!providers.length || !!busy"
              @change="key = ''"
            >
              <option v-if="!providers.length" value="">没有支持 API 密钥的服务商</option>
              <option v-for="provider in providers" :key="provider.id" :value="provider.id">
                {{ provider.name }}{{ provider.configured ? ' · 已配置' : '' }}
              </option>
            </select>
            <p v-if="current" class="settings-provider-status">{{ statusText }}</p>
            <div v-if="canEditKey" class="settings-key-row">
              <input
                v-model="key"
                type="password"
                autocomplete="off"
                spellcheck="false"
                :placeholder="canRemove ? '输入新密钥以替换' : '粘贴 API 密钥'"
                aria-label="API 密钥"
                :disabled="!!busy"
                @keydown.enter.prevent="saveKey"
              />
              <button
                type="button"
                class="button primary"
                :disabled="!!busy || !key.trim()"
                @click="saveKey"
              >
                {{ busy === 'save' ? '保存中…' : '保存' }}
              </button>
            </div>
            <div v-if="current" class="settings-key-foot">
              <button
                v-if="canRemove"
                type="button"
                class="text-button"
                :disabled="!!busy"
                @click="removeKey"
              >
                {{ busy === 'remove' ? '正在清除…' : '清除已保存密钥' }}
              </button>
              <span v-if="current.credentialType === 'oauth'" class="settings-hint">
                该服务商已通过账号登录；如需改用 API 密钥，请先在终端 Pi 中退出登录。
              </span>
            </div>
          </section>
          <p v-if="error" class="settings-error" role="alert">{{ error }}</p>
        </template>
      </div>
      <footer class="settings-actions">
        <button type="button" class="button subtle" :disabled="!!busy" @click="reload">
          <Icon name="refresh" />重新检测
        </button>
        <button type="button" class="button primary" :disabled="!!busy" @click="close">完成</button>
      </footer>
    </div>
  </dialog>
</template>
