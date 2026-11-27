<script setup lang="ts">
import { inject } from 'vue';
import Icon from './Icon.vue';
import type { WorkspaceApi } from '../lib/workspace';

const workspace = inject('workspace') as WorkspaceApi;
const actions = [
  {
    skill: 'paper-reading', icon: 'search', label: '值得读吗？', title: '判断当前论文是否值得精读',
    instruction: '根据本次阅读目的和文献库偏好，快速判断当前论文值得精读、略读还是跳过。'
      + '给出理由、原文定位和优先阅读位置，证据不足时标为待判断。只在聊天中回答，不生成笔记。',
  },
  {
    skill: 'paper-experiments', icon: 'book', label: '总结全文', title: '总结当前论文并生成笔记草稿',
    instruction: '按当前论文的类型总结全文，重点讲清方法或论证、关键证据、结果及直接相关工作。'
      + '算法论文要展开模型、实验设置和结果可比性。注明阅读范围和原文定位，并调用 draft_note 生成完整笔记草稿。',
  },
  {
    skill: 'paper-organize', icon: 'folder', label: '智能归类', title: '根据笔记或中文翻译把当前论文归入合适的分类',
    instruction: '先调用 library_categories 核对现有分类，再优先用 read_library_doc 读关联笔记、必要时用'
      + 'read_paper_translation 读已完成中文翻译判断主题。优先匹配已有分类；确无合适分类时拟定简洁的新分类名。'
      + '然后调用 propose_paper_classification 提交归类确认卡片，并在聊天中说明依据与目标目录。'
      + '用户确认前不得声称已新建文件夹或已移动论文。',
  },
] as const;

function skillLoaded(name: string): boolean {
  return workspace.state.commands.some((command) => command.source === 'skill' && command.name === `skill:${name}`);
}

function actionTitle(action: (typeof actions)[number]): string {
  if (!workspace.currentPaper.value) return '请先打开一篇论文';
  if (!skillLoaded(action.skill)) return '技能尚未加载，请在设置中重新扫描技能';
  if (workspace.state.chat?.historyState === 'archived') return '请先恢复会话或新建会话';
  return action.title;
}

function run(action: (typeof actions)[number]): void {
  workspace.setPanel('chat');
  void workspace.runPaperSkill(action.skill, action.instruction);
}
</script>

<template>
  <div class="paper-actions" role="group" aria-label="当前论文操作">
    <button
      v-for="action in actions"
      :key="action.skill"
      type="button"
      class="button subtle"
      :title="actionTitle(action)"
      :disabled="!workspace.canRunPaperSkill.value || !skillLoaded(action.skill)"
      @click="run(action)"
    ><Icon :name="action.icon" />{{ action.label }}</button>
  </div>
</template>
