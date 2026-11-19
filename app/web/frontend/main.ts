import { createApp, version } from 'vue';
import Workspace from './Workspace.vue';
import { createWorkspace } from './lib/workspace';
import type { CreateWorkspaceOptions, WorkspaceApi } from './lib/workspace';

export { createWorkspace } from './lib/workspace';
export type { CreateWorkspaceOptions, WorkspaceApi } from './lib/workspace';

export interface MountedWorkspace {
  app: ReturnType<typeof createApp>;
  workspace: WorkspaceApi;
  ready: Promise<void>;
  version: string;
  unmount: () => void;
}

export function mountWorkspace(target: Element | string, options: CreateWorkspaceOptions = {}): MountedWorkspace {
  const workspace = createWorkspace(options);
  const app = createApp(Workspace, { workspace });
  app.mount(target as Element);
  const ready = workspace.start();
  return { app, workspace, ready, version, unmount: () => app.unmount() };
}

if (typeof document !== 'undefined' && document.querySelector('#app')) mountWorkspace('#app');
