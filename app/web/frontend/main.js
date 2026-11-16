import { createApp, version } from 'vue';
import Workspace from './Workspace.vue';
import { createWorkspace } from './lib/workspace.js';

export { createWorkspace } from './lib/workspace.js';

export function mountWorkspace(target, options = {}) {
  const workspace = createWorkspace(options);
  const app = createApp(Workspace, { workspace });
  app.mount(target);
  const ready = workspace.start();
  return { app, workspace, ready, version, unmount: () => app.unmount() };
}

if (typeof document !== 'undefined' && document.querySelector('#app')) mountWorkspace('#app');
