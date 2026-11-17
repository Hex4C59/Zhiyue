<script setup>
import { computed, inject, onMounted, ref } from 'vue';
import { json } from '../lib/content.js';
import Icon from './Icon.vue';
const workspace = inject('workspace');
const emit = defineEmits(['close']);
const dialog = ref(null),
  info = ref({ defaultModel: '', providers: [] }),
  defaultModel = ref(''),
  providerId = ref(''),
  key = ref(''),
  loading = ref(true),
  busy = ref(''),
  error = ref('');
const modelOptions = computed(() => workspace.models.value);
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
const canEditKey = computed(() => current.value && current.value.credentialType !== 'oauth');
onMounted(() => {
  const element = dialog.value;
  if (typeof element?.showModal === 'function') element.showModal();
  else element?.setAttribute('open', '');
  load();
});
function close() {
  if (busy.value) return;
  const element = dialog.value;
  if (typeof element?.close === 'function') element.close();
  emit('close');
}
function backdrop(event) {
  if (event.target === dialog.value && !busy.value) close();
}
async function load() {
  loading.value = true;
  error.value = '';
  try {
    apply(await workspace.api('/api/agents/pi/settings'));
  } catch (err) {
    error.value = err.message || '无法读取 Pi 配置。';
  } finally {
    loading.value = false;
  }
}
function apply(data) {
  info.value = data;
  defaultModel.value = modelOptions.value.some((model) => model.id === data.defaultModel)
    ? data.defaultModel
    : '';
  if (!providers.value.some((provider) => provider.id === providerId.value)) {
    const fromDefault = String(data.defaultModel || '').split('/')[0];
    providerId.value =
      providers.value.find((provider) => provider.id === fromDefault)?.id ||
      providers.value[0]?.id ||
      '';
  }
  key.value = '';
}
async function saveKey() {
  if (!current.value || busy.value) return;
  const value = key.value.trim();
  if (!value) return (error.value = '请输入 API 密钥。');
  const name = current.value.name;
  busy.value = 'save';
  error.value = '';
  try {
    apply(await workspace.api('/api/agents/pi/settings/key', json('POST', {
      provider: current.value.id,
      key: value,
    })));
    workspace.toast(`已保存 ${name} 的 API 密钥。`);
  } catch (err) {
    error.value = err.message || '无法保存 API 密钥。';
  } finally {
    busy.value = '';
  }
}
async function removeKey() {
  if (!current.value || busy.value) return;
  const name = current.value.name;
  if (!window.confirm(`清除 ${name} 已保存的 API 密钥？`)) return;
  busy.value = 'remove';
  error.value = '';
  try {
    apply(await workspace.api('/api/agents/pi/settings/key/remove', json('POST', {
      provider: current.value.id,
    })));
    workspace.toast(`已清除 ${name} 的 API 密钥。`);
  } catch (err) {
    error.value = err.message || '无法清除 API 密钥。';
  } finally {
    busy.value = '';
  }
}
async function saveModel() {
  if (busy.value) return;
  busy.value = 'model';
  error.value = '';
  try {
    apply(await workspace.api('/api/agents/pi/settings/model', json('POST', {
      model: defaultModel.value,
    })));
    workspace.toast('默认模型已更新。');
  } catch (err) {
    error.value = err.message || '无法保存默认模型。';
    defaultModel.value = info.value.defaultModel || '';
  } finally {
    busy.value = '';
  }
}
async function reload() {
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
