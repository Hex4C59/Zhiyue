<script setup lang="ts">
import { computed, inject, reactive } from 'vue';
import type { ApprovalRecord } from '../lib/types';
import type { WorkspaceApi } from '../lib/workspace';

interface ApprovalQuestion {
  id: string;
  text: string;
  options?: Array<string | { label?: string; title?: string; value?: string; description?: string }>;
}

const props = defineProps<{ approval: ApprovalRecord }>();
const workspace = inject('workspace') as WorkspaceApi;
const answers = reactive<Record<string, string>>({});
const questions = computed<ApprovalQuestion[]>(() => {
  const list = props.approval.params.questions;
  if (!Array.isArray(list)) return [];
  return list.map((question, index) => {
    const item = question as Record<string, unknown>;
    return {
      ...item,
      id: String(item.id ?? item.questionId ?? index),
      text: String(item.question || item.text || item.label || '请补充信息'),
      options: Array.isArray(item.options) ? item.options as ApprovalQuestion['options'] : undefined,
    };
  });
});
const optionLabel = (option: string | { label?: string; title?: string; value?: string }): string =>
  typeof option === 'string' ? option : option.label || option.title || option.value || '';
function submit(): void {
  const response = Object.fromEntries(
    questions.value.map((question) => [question.id, { answers: [(answers[question.id] || '').trim()] }]),
  );
  void workspace.decideApproval(props.approval.id, 'accept', response);
}
</script>

<template>
  <form class="approval" :data-approval="approval.id" @submit.prevent="submit">
    <h4>{{ questions.length ? '需要你的回答' : '等待你的审批' }}</h4>
    <template v-if="questions.length">
      <div v-for="question in questions" :key="question.id">
        <label class="approval-question"
          ><strong>{{ question.text }}</strong>
          <textarea
            v-model="answers[question.id]"
            :data-answer="question.id"
            rows="2"
            required
            :aria-label="question.text"
            placeholder="输入你的回答…"
          />
        </label>
        <div v-if="question.options?.length" class="question-options">
          <button
            v-for="(option, index) in question.options"
            :key="index"
            type="button"
            class="button subtle"
            :title="typeof option === 'string' ? '' : option.description || ''"
            @click="answers[question.id] = optionLabel(option)"
          >
            {{ optionLabel(option) }}
          </button>
        </div>
      </div>
    </template>
    <pre v-else>{{ JSON.stringify(approval.params || {}, null, 2) }}</pre>
    <div class="approval-actions">
      <button class="button primary" type="submit" :disabled="approval.submitting">
        {{ questions.length ? '提交回答' : '允许本次' }}
      </button>
      <button
        class="button subtle"
        type="button"
        :disabled="approval.submitting"
        @click="workspace.decideApproval(approval.id, 'decline')"
      >
        拒绝
      </button>
    </div>
  </form>
</template>
