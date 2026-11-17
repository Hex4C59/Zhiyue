<script setup>
import { computed, inject, onMounted, reactive, ref } from 'vue';
import { categoryChoices, endpoint } from '../lib/content.js';
import Icon from './Icon.vue';
const workspace = inject('workspace'),
  state = workspace.state;
const emit = defineEmits(['close', 'imported']);
const dialog = ref(null),
  fileInput = ref(null);
const form = reactive({
  title: '',
  authors: '',
  year: '',
  doi: '',
  category: 'papers/09_情感综述调研/网站导入',
  confirmed: false,
});
const file = ref(null),
  titleTouched = ref(false),
  dragging = ref(false),
  stage = ref('idle'),
  error = ref(''),
  currentJob = ref(null);
const categories = computed(() => categoryChoices(state.categories));
const busy = computed(() => stage.value === 'submitting' || stage.value === 'processing');
const fileSize = computed(() => {
  if (!file.value) return '';
  const mb = file.value.size / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(file.value.size / 1024))} KB`;
});
const logText = computed(() => {
  const log = currentJob.value?.log;
  const text = Array.isArray(log) ? log.join('') : log || '';
  return text.slice(-4000);
});
onMounted(() => {
  const el = dialog.value;
  if (typeof el?.showModal === 'function') el.showModal();
  else el?.setAttribute('open', '');
});
function close() {
  if (busy.value) return;
  const el = dialog.value;
  if (typeof el?.close === 'function') el.close();
  emit('close');
}
function backdrop(event) {
  if (event.target === dialog.value && !busy.value) close();
}
function chooseFile(event) {
  acceptFile(event.target.files?.[0]);
}
function acceptFile(candidate) {
  error.value = '';
  if (!candidate) return;
  if (!/\.pdf$/i.test(candidate.name)) {
    error.value = '请选择 PDF 文件。';
    return;
  }
  if (candidate.size > 25 * 1024 * 1024) {
    error.value = 'PDF 超过 25 MB 上传限制。';
    return;
  }
  if (candidate.size === 0) {
    error.value = 'PDF 文件为空。';
    return;
  }
  file.value = candidate;
  if (!titleTouched.value)
    form.title = candidate.name.replace(/\.pdf$/i, '').replace(/[_\s]+/g, ' ').trim();
}
function drop(event) {
  dragging.value = false;
  acceptFile(event.dataTransfer?.files?.[0]);
}
function openPicker() {
  fileInput.value?.click();
}
function titleInput() {
  titleTouched.value = true;
}
async function waitForJob(id) {
  for (;;) {
    const job = await workspace.api(`/api/jobs/${endpoint(id)}`);
    state.jobs.set(job.id, job);
    currentJob.value = job;
    if (job.status === 'completed') return job;
    if (job.status === 'failed') throw new Error(job.error || '导入任务失败。');
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
}
async function submit() {
  if (busy.value) return;
  error.value = '';
  if (!file.value) return (error.value = '请选择要导入的 PDF。');
  if (!form.title.trim()) return (error.value = '请填写论文题名。');
  if (!form.confirmed) return (error.value = '请先核对题名与作者信息。');
  if (form.year && !/^\d{4}$/.test(form.year.trim()))
    return (error.value = '年份需为四位数字。');
  const before = new Set(state.papers.map((paper) => paper.literature_id));
  stage.value = 'submitting';
  try {
    const job = await workspace.importPdf({
      file: file.value,
      title: form.title.trim(),
      authors: form.authors.trim(),
      year: form.year.trim(),
      doi: form.doi.trim(),
      category: form.category,
    });
    currentJob.value = job;
    stage.value = 'processing';
    await waitForJob(job.id);
    await workspace.loadLibrary();
    const added =
      state.papers.find((paper) => !before.has(paper.literature_id)) ||
      state.papers.find(
        (paper) => paper.title && paper.title.trim() === form.title.trim(),
      );
    if (added) {
      workspace.toast(`已导入 ${added.literature_id}：${added.title}`);
      workspace.selectPaper(added.literature_id);
      emit('imported', added.literature_id);
    } else {
      workspace.toast('导入已完成；索引中暂未找到新增文献，可在下载任务中核对批次。', true);
    }
    emit('close');
  } catch (err) {
    error.value = err.message || '导入失败。';
    stage.value = 'failed';
  }
}
</script>

<template>
  <dialog
    ref="dialog"
    class="import-dialog"
    aria-labelledby="import-title"
    @cancel.prevent="close"
    @click="backdrop"
  >
    <form class="import-sheet" @submit.prevent="submit">
      <header class="import-head">
        <div>
          <h2 id="import-title">导入 PDF</h2>
          <p>从本机选择论文原文，核对题名与作者后归档。</p>
        </div>
        <button
          type="button"
          class="icon-button"
          title="关闭"
          aria-label="关闭"
          :disabled="busy"
          @click="close"
        >
          <Icon name="close" />
        </button>
      </header>
      <div class="import-body">
        <input
          ref="fileInput"
          type="file"
          accept=".pdf,application/pdf"
          hidden
          @change="chooseFile"
        />
        <button
          type="button"
          class="import-file"
          :class="{ dragging }"
          :disabled="busy"
          @click="openPicker"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="drop"
        >
          <span class="import-file-icon"><Icon name="upload" /></span>
          <span class="import-file-text">
            <strong>{{ file ? file.name : '选择 PDF 文件' }}</strong>
            <small>{{ file ? `${fileSize} · 点击更换` : '或将 PDF 拖到这里，最大 25 MB' }}</small>
          </span>
        </button>
        <div class="import-fields">
          <label class="import-field wide">
            <span>题名 <em>必填</em></span>
            <input
              id="import-paper-title"
              v-model="form.title"
              maxlength="300"
              placeholder="与 PDF 首页一致"
              :disabled="busy"
              @input="titleInput"
            />
          </label>
          <label class="import-field wide">
            <span>作者 <small>多位作者用分号隔开</small></span>
            <input
              id="import-paper-authors"
              v-model="form.authors"
              maxlength="3000"
              placeholder="例如：张三; 李四"
              :disabled="busy"
            />
          </label>
          <label class="import-field">
            <span>年份</span>
            <input
              id="import-paper-year"
              v-model="form.year"
              inputmode="numeric"
              maxlength="4"
              placeholder="2024"
              :disabled="busy"
            />
          </label>
          <label class="import-field">
            <span>DOI <small>可选</small></span>
            <input
              id="import-paper-doi"
              v-model="form.doi"
              maxlength="300"
              placeholder="10.xxxx/xxxxx"
              :disabled="busy"
            />
          </label>
          <label class="import-field wide">
            <span>归档分类</span>
            <select id="import-paper-category" v-model="form.category" :disabled="busy">
              <option v-for="[value, label] in categories" :key="value" :value="value">
                {{ label }}
              </option>
            </select>
          </label>
        </div>
        <label class="import-check">
          <input v-model="form.confirmed" type="checkbox" :disabled="busy" />
          <span>我已核对题名与作者与 PDF 首页一致，并有权保存该文件。</span>
        </label>
        <p v-if="error" class="import-error" role="alert">{{ error }}</p>
        <div v-if="busy" class="import-progress" role="status">
          <span class="busy-spinner" />
          {{ stage === 'submitting' ? '正在上传 PDF…' : '正在核验并归档…' }}
        </div>
        <details v-if="stage === 'failed' && logText" class="import-log-wrap">
          <summary>查看任务日志</summary>
          <pre class="import-log">{{ logText }}</pre>
        </details>
      </div>
      <footer class="import-actions">
        <button type="button" class="button subtle" :disabled="busy" @click="close">取消</button>
        <button id="import-paper-submit" type="submit" class="button primary" :disabled="busy">
          <Icon name="upload" />{{ busy ? '正在导入…' : '导入并归档' }}
        </button>
      </footer>
    </form>
  </dialog>
</template>
