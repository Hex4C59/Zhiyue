import katex from 'katex';

// 模型与笔记中的数学公式用 LaTeX 书写，由 KaTeX 渲染成 HTML。
// 字体与样式由 /vendor/katex 提供（见 public/index.html 与 server.ts），
// 这里只负责把 TeX 源码转成带 katex 类名的 HTML 片段。

export function renderMath(tex: string, display: boolean): string {
  // throwOnError:false 让非法公式以红色原文呈现，而不是打断整条消息。
  return katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    output: 'html',
    strict: false,
    trust: false,
  });
}
