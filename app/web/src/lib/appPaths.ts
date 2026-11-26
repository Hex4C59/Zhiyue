import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface AppPaths {
  webRoot: string;
  publicDir: string;
  distDir: string;
  pythonDir: string;
  templatesDir: string;
}

// 编译后服务位于 build/app/web/src（源码开发）或 runtime/app/web/src（安装版），
// 静态资源、Python 辅助脚本和文献库模板按 web 根目录定位，避免依赖编译输出的相对层级。
function findWebRoot(): string {
  let directory = path.dirname(fileURLToPath(import.meta.url));
  for (;;) {
    for (const candidate of [path.join(directory, 'web'), path.join(directory, 'app', 'web')]) {
      if (existsSync(path.join(candidate, 'public', 'index.html'))) return candidate;
    }
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error('无法定位前端静态资源目录。');
    directory = parent;
  }
}

let cached: AppPaths | undefined;

export function appPaths(): AppPaths {
  if (!cached) {
    const webRoot = findWebRoot();
    cached = {
      webRoot,
      publicDir: path.join(webRoot, 'public'),
      distDir: path.join(webRoot, 'dist'),
      pythonDir: path.join(webRoot, 'python'),
      templatesDir: path.join(path.dirname(webRoot), 'templates'),
    };
  }
  return cached;
}
