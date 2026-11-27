import { onScopeDispose, ref, watch } from 'vue';

interface MessageText {
  id: string;
  text: string;
  thinking?: string;
  status: string;
}

/** 只合并显示更新，原始 SSE 内容仍立即保存在工作区；终态与切换消息立即刷新。 */
export function useMessageText(source: () => MessageText, active: (status: string) => boolean) {
  const text = ref(source().text || '');
  const thinking = ref(source().thinking || '');
  let timer: ReturnType<typeof setTimeout> | undefined;
  function flush(): void {
    clearTimeout(timer);
    timer = undefined;
    text.value = source().text || '';
    thinking.value = source().thinking || '';
  }
  watch(() => [source().id, source().text, source().thinking, source().status], (value, previous) => {
    if (value[0] !== previous[0] || !active(source().status)) flush();
    else if (timer === undefined) timer = setTimeout(flush, 50);
  }, { flush: 'sync' });
  onScopeDispose(() => { clearTimeout(timer); timer = undefined; });
  return { text, thinking, flush };
}
