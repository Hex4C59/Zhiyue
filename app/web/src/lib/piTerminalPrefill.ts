import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

export default function prefill(pi: ExtensionAPI): void {
  const command = process.env.ZHIYUE_PI_COMMAND;
  delete process.env.ZHIYUE_PI_COMMAND;
  if (!command) return;
  const off = pi.on('session_start', (_event, context) => {
    off();
    context.ui.setEditorText(command);
  });
}
