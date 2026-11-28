/** 历史列表与 SSE 共用正文预览。复制短字符串，避免切片继续引用整篇长回答。 */
export function chatMessagePreview<R extends string, S extends string>(message: {
  id: string; role: R; status: S; text: string;
}): { id: string; role: R; status: S; text: string } {
  let text = message.text.slice(0, 160);
  if (/[\uD800-\uDBFF]$/.test(text)) text = text.slice(0, -1);
  return structuredClone({ id: message.id, role: message.role, status: message.status, text });
}
