<script setup>
import { computed, inject, markRaw, onMounted, reactive, ref } from 'vue';
import { categoryChoices, endpoint } from '../lib/content.js';
import Icon from './Icon.vue';
const workspace = inject('workspace'),
  state = workspace.state;
const emit = defineEmits(['close', 'imported']);
const MAX_FILES = 100;
const dialog = ref(null),
  fileInput = ref(null),
  folderInput = ref(null);
const form = reactive({
  category: 'papers/09_情感综述调研/网站导入',
  confirmed: false,
});
const items = reactive([]),
  openKey = ref(''),
  categoryTouched = ref(false),
  folderChoice = ref(null),
  dragging = ref(false),
  stage = ref('idle'),
  error = ref(''),
  uploading = ref(0),
  skipped = ref([]),
  result = ref(null),
  currentJob = ref(null);
let sequence = 0;
const categories = computed(() => {
  const choices = categoryChoices(state.categories);
  const extra = folderChoice.value;
  if (extra && !choices.some(([value]) => value === extra[0])) choices.push(extra);
  return choices;
});
const busy = computed(() => stage.value === 'uploading' || stage.value === 'processing');
const logText = computed(() => {
  const log = currentJob.value?.log;
  const text = Array.isArray(log) ? log.join('') : log || '';
  return text.slice(-4000);
});
const submittedCount = computed(() => items.length - skipped.value.length);
const processed = computed(() => {
  const steps = currentJob.value?.steps || [];
  const attached = steps.filter(
    (step) => step.action === 'attach' && step.status === 'completed',
  ).length;
  const archiving = steps.some((step) => step.action === 'archive');
  return Math.min(attached + (archiving ? 1 : 0), submittedCount.value);
});
const submitLabel = computed(() => {
  if (stage.value === 'uploading') return '正在上传…';
  if (stage.value === 'processing') return '正在归档…';
  if (stage.value === 'failed') return '重试';
  return items.length > 1 ? `导入并归档 ${items.length} 篇` : '导入并归档';
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
function sizeText(bytes) {
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
function resetPickers() {
  for (const input of [fileInput.value, folderInput.value]) {
    if (input) input.value = '';
  }
}
function chooseFiles(event) {
  acceptFiles(event.target.files);
  resetPickers();
}
function openPicker() {
  fileInput.value?.click();
}
function openFolder() {
  folderInput.value?.click();
}
function folderNameOf(files) {
  const names = new Set();
  for (const file of files) {
    const relative = file.webkitRelativePath || '';
    if (relative.includes('/')) names.add(relative.split('/')[0]);
  }
  return names.size === 1 ? [...names][0] : '';
}
// 把外部文件夹名对应到已有分类，忽略编号前缀和大小写差异。
function matchCategoryFolder(folder) {
  const normalize = (value) => String(value).replace(/^\d+_/, '').trim().toLocaleLowerCase();
  const choices = categories.value;
  const exact = choices.find(([value]) => value.split('/')[1] === folder);
  if (exact) return exact[0];
  const loose = choices.find(([value]) => normalize(value.split('/')[1]) === normalize(folder));
  return loose ? loose[0] : '';
}
// 与 jobs.mjs 的分类校验一致，只把可用作 Windows 文件夹名的名称带进归档路径。
function folderCategory(folder) {
  const name = String(folder || '').trim();
  if (
    !name ||
    name === '.' ||
    name === '..' ||
    name.includes('..') ||
    /[\\/:*?"<>|\x00-\x1f\x7f]/.test(name) ||
    /[. ]$/.test(name) ||
    /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)
  )
    return null;
  return {
    value: `papers/${name}/网站导入`,
    label: `${name.replace(/^\d+_/, '')} / 网站导入（新建）`,
  };
}
function acceptFiles(list, folderHint = '') {
  if (busy.value) return;
  error.value = '';
  const wasEmpty = !items.length;
  const folder = folderNameOf(list) || folderHint;
  const rejected = [];
  let added = 0;
  let capped = 0;
  for (const candidate of Array.from(list || [])) {
    if (!candidate) continue;
    // 选定文件夹时会带入来源记录等非 PDF 文件，直接忽略，不当作导入错误。
    if (!/\.pdf$/i.test(candidate.name)) continue;
    if (candidate.size > 25 * 1024 * 1024) {
      rejected.push(`${candidate.name} 超过 25 MB`);
      continue;
    }
    if (candidate.size === 0) {
      rejected.push(`${candidate.name} 为空`);
      continue;
    }
    if (items.length >= MAX_FILES) {
      capped += 1;
      continue;
    }
    const relative = candidate.webkitRelativePath || candidate.name;
    if (
      items.some(
        (item) =>
          item.relative === relative &&
          item.size === candidate.size &&
          item.lastModified === candidate.lastModified,
      )
    )
      continue;
    const key = `f${++sequence}`;
    const title = candidate.name
      .replace(/\.pdf$/i, '')
      .replace(/[_\s]+/g, ' ')
      .trim();
    items.push({
      key,
      file: markRaw(candidate),
      name: candidate.name,
      relative,
      size: candidate.size,
      lastModified: candidate.lastModified,
      title,
      authors: '',
      year: '',
      doi: '',
      uploadId: '',
      status: 'new',
      note: '',
    });
    added += 1;
  }
  if (wasEmpty && added && !categoryTouched.value && folder) {
    const matched = matchCategoryFolder(folder);
    if (matched) {
      folderChoice.value = null;
      form.category = matched;
    } else {
      const created = folderCategory(folder);
      if (created) {
        folderChoice.value = [created.value, created.label];
        form.category = created.value;
      }
    }
  }
  if (!openKey.value && items.length === 1) openKey.value = items[0].key;
  if (added) form.confirmed = false;
  if (capped) rejected.unshift(`每次最多导入 ${MAX_FILES} 个 PDF，其余 ${capped} 个未加入`);
  if (rejected.length) {
    const extra = rejected.length > 3 ? `；另有 ${rejected.length - 3} 个未加入` : '';
    error.value = `${rejected.slice(0, 3).join('；')}${extra}。`;
  } else if (!added) {
    error.value = '所选内容中没有可导入的 PDF。';
  }
}
async function collectEntry(entry, files) {
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    if (/\.pdf$/i.test(file.name)) files.push(file);
    return;
  }
  if (!entry.isDirectory) return;
  const reader = entry.createReader();
  for (;;) {
    const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    if (!batch.length) break;
    for (const child of batch) await collectEntry(child, files);
    if (files.length > MAX_FILES) break;
  }
}
async function drop(event) {
  dragging.value = false;
  if (busy.value) return;
  const transfer = event.dataTransfer;
  if (!transfer) return;
  const entries = [...(transfer.items || [])]
    .map((item) => (item.kind === 'file' ? item.webkitGetAsEntry?.() : null))
    .filter(Boolean);
  if (!entries.length) {
    acceptFiles(transfer.files);
    return;
  }
  const files = [];
  try {
    for (const entry of entries) await collectEntry(entry, files);
  } catch {
    error.value = '无法读取拖入的部分文件，请改用“选择文件”或“选择文件夹”。';
    return;
  }
  if (!files.length) return (error.value = '拖入的内容中没有可导入的 PDF。');
  // 只拖入一个文件夹时，用它作为归档分类的默认值。
  const folderHint = entries.length === 1 && entries[0].isDirectory ? entries[0].name : '';
  acceptFiles(files, folderHint);
}
function toggle(item) {
  openKey.value = openKey.value === item.key ? '' : item.key;
}
function removeItem(item) {
  if (busy.value) return;
  const index = items.indexOf(item);
  if (index < 0) return;
  items.splice(index, 1);
  if (openKey.value === item.key) openKey.value = '';
  if (!items.length) resetResult();
}
function clearItems() {
  if (busy.value || !items.length) return;
  if (!window.confirm('清空已选文件和已填信息？')) return;
  items.splice(0);
  openKey.value = '';
  categoryTouched.value = false;
  folderChoice.value = null;
  resetResult();
  resetPickers();
}
function resetResult() {
  form.confirmed = false;
  stage.value = 'idle';
  error.value = '';
  skipped.value = [];
  result.value = null;
  currentJob.value = null;
}
function validate() {
  if (!items.length) return '请选择要导入的 PDF。';
  for (const [index, item] of items.entries()) {
    if (!item.title.trim()) {
      openKey.value = item.key;
      return `第 ${index + 1} 个文件缺少题名。`;
    }
    if (item.year && !/^\d{4}$/.test(item.year.trim())) {
      openKey.value = item.key;
      return `第 ${index + 1} 个文件的年份需为四位数字。`;
    }
    const doi = item.doi.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
    if (doi && !/^10\.\d{4,9}\/\S+$/.test(doi)) {
      openKey.value = item.key;
      return `第 ${index + 1} 个文件的 DOI 格式不正确。`;
    }
  }
  if (!form.confirmed) return '请先核对题名与作者信息。';
  return '';
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
  const invalid = validate();
  if (invalid) return (error.value = invalid);
  const before = new Set(state.papers.map((paper) => paper.literature_id));
  skipped.value = [];
  result.value = null;
  stage.value = 'uploading';
  uploading.value = 0;
  let current = null;
  try {
    for (const [index, item] of items.entries()) {
      item.status = item.uploadId ? 'ready' : 'new';
      item.note = '';
      if (item.uploadId) continue;
      current = item;
      uploading.value = index + 1;
      item.status = 'uploading';
      const upload = await workspace.uploadFile(item.file);
      item.uploadId = upload.id;
      item.status = 'ready';
    }
    current = null;
    stage.value = 'processing';
    const { job, skipped: duplicates } = await workspace.importPdfs({
      uploads: items.map((item) => ({
        uploadId: item.uploadId,
        title: item.title.trim(),
        authors: item.authors.trim(),
        year: item.year.trim(),
        doi: item.doi.trim(),
      })),
      category: form.category,
    });
    skipped.value = duplicates || [];
    for (const skip of skipped.value) {
      const item = items[skip.index];
      if (!item) continue;
      item.status = 'skipped';
      item.note = skip.literature_id
        ? `已归档为 ${skip.literature_id}${skip.literature_title ? `：${skip.literature_title}` : ''}`
        : skip.reason;
    }
    currentJob.value = job;
    const finished = await waitForJob(job.id);
    await workspace.loadLibrary();
    const archived = Number(finished.result?.counts?.archived) || 0;
    const failed = Math.max(0, submittedCount.value - archived);
    const added = state.papers.filter((paper) => !before.has(paper.literature_id));
    result.value = { archived, skipped: skipped.value.length, failed };
    if (archived) {
      const ids = added
        .slice(0, 6)
        .map((paper) => paper.literature_id)
        .join('、');
      const more = added.length > 6 ? ` 等 ${added.length} 篇` : '';
      const skipText = skipped.value.length ? `，跳过 ${skipped.value.length} 个重复文件` : '';
      workspace.toast(`已归档 ${archived} 篇${ids ? `：${ids}${more}` : ''}${skipText}`);
      if (added[0]) {
        workspace.selectPaper(added[0].literature_id);
        emit('imported', added[0].literature_id);
      }
    }
    if (failed) {
      stage.value = 'failed';
      error.value = `${archived} 篇已归档，${failed} 篇未完成；可查看任务日志后重试。`;
      return;
    }
    if (!archived) {
      stage.value = 'failed';
      error.value = '导入流程结束，但没有新归档的文献；请查看任务日志。';
      return;
    }
    if (skipped.value.length) {
      stage.value = 'done';
      return;
    }
    emit('close');
  } catch (err) {
    if (current && current.status === 'uploading') {
      current.status = 'error';
      current.note = err.message;
      error.value = `${current.name} 上传失败：${err.message}`;
    } else error.value = err.message || '导入失败。';
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
          <p>可多选或添加文件夹，核对题名后批量归档。</p>
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
          multiple
          hidden
          @change="chooseFiles"
        />
        <input
          ref="folderInput"
          type="file"
          accept=".pdf,application/pdf"
          webkitdirectory
          directory
          multiple
          hidden
          @change="chooseFiles"
        />
        <div class="import-pick">
          <button
            type="button"
            class="import-file"
            :class="{ dragging, compact: items.length }"
            :disabled="busy"
            @click="openPicker"
            @dragover.prevent="dragging = true"
            @dragleave="dragging = false"
            @drop.prevent="drop"
          >
            <span class="import-file-icon"><Icon name="upload" /></span>
            <span class="import-file-text">
              <strong>{{ items.length ? '继续添加 PDF' : '选择 PDF 文件' }}</strong>
              <small>{{
                items.length
                  ? '可多选，或把文件、文件夹拖到这里'
                  : '可多选，或把文件、文件夹拖到这里，单个最大 25 MB'
              }}</small>
            </span>
          </button>
          <button
            type="button"
            class="import-folder"
            :disabled="busy"
            @click="openFolder"
          >
            <Icon name="folder" /><span>选择文件夹</span>
          </button>
        </div>
        <div v-if="items.length" class="import-list">
          <div class="import-list-head">
            <span>
              {{ items.length }} 个 PDF
              <template v-if="skipped.length"> · 跳过 {{ skipped.length }} 个</template>
            </span>
            <button
              type="button"
              class="text-button"
              :disabled="busy"
              @click="clearItems"
            >
              清空
            </button>
          </div>
          <div class="import-items">
            <article
              v-for="(item, index) in items"
              :key="item.key"
              class="import-item"
              :class="item.status"
            >
              <div class="import-item-head">
                <span class="import-item-index">{{ index + 1 }}</span>
                <div class="import-item-main">
                  <input
                    v-model="item.title"
                    class="import-item-title"
                    maxlength="300"
                    placeholder="题名（必填，与 PDF 首页一致）"
                    :aria-label="`第 ${index + 1} 个文件的题名`"
                    :disabled="busy"
                  />
                  <small class="import-item-file">
                    {{ item.relative }} · {{ sizeText(item.size)
                    }}<template v-if="item.note"> · {{ item.note }}</template>
                  </small>
                </div>
                <span v-if="item.status === 'skipped'" class="import-item-badge">已跳过</span>
                <span v-else-if="item.status === 'error'" class="import-item-badge failed"
                  >未完成</span
                >
                <button
                  type="button"
                  class="icon-button import-item-more"
                  :class="{ open: openKey === item.key }"
                  :title="openKey === item.key ? '收起作者、年份和 DOI' : '填写作者、年份和 DOI'"
                  :aria-label="openKey === item.key ? '收起书目信息' : '展开书目信息'"
                  :aria-expanded="openKey === item.key"
                  :disabled="busy"
                  @click="toggle(item)"
                >
                  <Icon name="chevron" />
                </button>
                <button
                  type="button"
                  class="icon-button"
                  title="移除"
                  aria-label="移除"
                  :disabled="busy"
                  @click="removeItem(item)"
                >
                  <Icon name="close" />
                </button>
              </div>
              <div v-if="openKey === item.key" class="import-item-extra">
                <label class="import-field wide">
                  <span>作者 <small>多位作者用分号隔开</small></span>
                  <input
                    v-model="item.authors"
                    maxlength="3000"
                    placeholder="例如：张三; 李四"
                    :aria-label="`第 ${index + 1} 个文件的作者`"
                    :disabled="busy"
                  />
                </label>
                <label class="import-field">
                  <span>年份</span>
                  <input
                    v-model="item.year"
                    inputmode="numeric"
                    maxlength="4"
                    placeholder="2024"
                    :aria-label="`第 ${index + 1} 个文件的年份`"
                    :disabled="busy"
                  />
                </label>
                <label class="import-field">
                  <span>DOI <small>可选</small></span>
                  <input
                    v-model="item.doi"
                    maxlength="300"
                    placeholder="10.xxxx/xxxxx"
                    :aria-label="`第 ${index + 1} 个文件的 DOI`"
                    :disabled="busy"
                  />
                </label>
              </div>
            </article>
          </div>
        </div>
        <div class="import-fields">
          <label class="import-field wide">
            <span>归档分类</span>
            <select
              v-model="form.category"
              :disabled="busy || stage === 'done'"
              @change="categoryTouched = true"
            >
              <option v-for="[value, label] in categories" :key="value" :value="value">
                {{ label }}
              </option>
            </select>
          </label>
        </div>
        <label v-if="stage !== 'done'" class="import-check">
          <input v-model="form.confirmed" type="checkbox" :disabled="busy" />
          <span>{{
            items.length > 1
              ? '我已核对以上文件的题名与作者信息，并有权保存这些文件。'
              : '我已核对题名与作者与 PDF 首页一致，并有权保存该文件。'
          }}</span>
        </label>
        <p v-if="error" class="import-error" role="alert">{{ error }}</p>
        <p v-if="stage === 'done'" class="import-summary" role="status">
          已归档 {{ result?.archived || 0 }} 篇<template v-if="result?.skipped"
            >，跳过 {{ result.skipped }} 个重复文件</template
          >。
        </p>
        <div v-if="busy" class="import-progress" role="status">
          <span class="busy-spinner" />
          <template v-if="stage === 'uploading'">
            正在上传第 {{ uploading }} / {{ items.length }} 个文件…
          </template>
          <template v-else> 正在核验并归档 {{ processed }} / {{ submittedCount }} 篇… </template>
        </div>
        <details v-if="(stage === 'failed' || stage === 'done') && logText" class="import-log-wrap">
          <summary>查看任务日志</summary>
          <pre class="import-log">{{ logText }}</pre>
        </details>
      </div>
      <footer class="import-actions">
        <template v-if="stage === 'done'">
          <button type="button" class="button primary" @click="close">完成</button>
        </template>
        <template v-else>
          <button type="button" class="button subtle" :disabled="busy" @click="close">
            取消
          </button>
          <button
            id="import-paper-submit"
            type="submit"
            class="button primary"
            :disabled="busy || !items.length"
          >
            <Icon name="upload" />{{ submitLabel }}
          </button>
        </template>
      </footer>
    </form>
  </dialog>
</template>
