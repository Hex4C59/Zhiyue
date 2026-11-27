interface MessageSnapshot {
  id: string;
  text: string;
  thinking?: string;
  status: string;
  error?: unknown;
}

function equal(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = left as Record<string, unknown>;
  const b = right as Record<string, unknown>;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) =>
    Object.hasOwn(b, key) && equal(a[key], b[key]));
}

/** 请求起点仅复制消息字段；不能持有会被后续 SSE 原地修改的对象引用。 */
export function messageSnapshot<T extends MessageSnapshot>(messages: readonly T[]): Map<string, T> {
  return new Map(messages.map((message) => [message.id, { ...message }]));
}

/** 按 ID 合并补查，不使慢响应回退 SSE 内容和终态；未改变的消息保留对象及正文选择范围。 */
export function mergeMessages<T extends MessageSnapshot>(
  incoming: readonly T[], live: readonly T[], started: ReadonlyMap<string, T>, active: (status: string) => boolean,
): T[] {
  const existing = new Map(live.map((message) => [message.id, message]));
  const result = incoming.map((message) => {
    const current = existing.get(message.id);
    existing.delete(message.id);
    if (!current) return message;
    const next = { ...message };
    if (current.text.length > next.text.length) next.text = current.text;
    if ((current.thinking?.length ?? 0) > (next.thinking?.length ?? 0)) next.thinking = current.thinking;
    const before = started.get(message.id);
    const terminalChanged = before && current.status !== before.status && !active(current.status);
    if (!active(current.status) && (active(next.status) || terminalChanged)) {
      next.status = current.status;
      next.text = current.text;
      if (current.thinking === undefined) delete next.thinking;
      else next.thinking = current.thinking;
      if (current.error === undefined) delete next.error;
      else next.error = current.error;
    }
    return equal(current, next) ? current : next;
  });
  result.push(...existing.values());
  return result;
}
