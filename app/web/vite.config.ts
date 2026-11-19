import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Vue 以 MIT 许可随构建产物分发，许可证副本跟着产物一起生成；dist 不入库后不能靠手写文件。
async function copyVueLicense(): Promise<void> {
  // vue 的 exports 字段不导出 LICENSE，按包目录拼接而不是 require.resolve('vue/LICENSE')。
  const manifest = createRequire(import.meta.url).resolve('vue/package.json');
  const target = fileURLToPath(new URL('./dist/LICENSE.vue.txt', import.meta.url));
  await copyFile(join(dirname(manifest), 'LICENSE'), target);
}

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'zhiyue-vue-license',
      apply: 'build',
      // 等产物写入磁盘后再拷贝，避免 emptyOutDir 与插件顺序相互干扰。
      closeBundle: copyVueLicense,
    },
  ],
  define: {
    // 库模式保留 NODE_ENV，显式替换后才能直接在浏览器加载。
    'process.env.NODE_ENV': JSON.stringify('production'),
    __VUE_OPTIONS_API__: false,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: false,
    target: 'es2022',
    sourcemap: false,
    lib: {
      entry: fileURLToPath(new URL('./frontend/main.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'app.js',
    },
  },
});
