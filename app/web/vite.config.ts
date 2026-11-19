import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [vue()],
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
