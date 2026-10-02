import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * Library build for @snapclip/vue.
 *
 * Emits:
 *   dist/index.js     ESM, with `vue` external
 *   dist/index.d.ts   declarations, emitted by vue-tsc (see package.json)
 *   dist/style.css    the single stylesheet published as `@snapclip/vue/style.css`
 *
 * The stylesheet deliberately does NOT bundle `@snapclip/design-tokens`: tokens
 * and components stay in separate packages, so consumers load both explicitly.
 * The cascade contract is that the tokens sheet is imported first — it is what
 * declares the `@layer` order.
 */
export default defineConfig({
  plugins: [vue()],
  build: {
    target: 'es2022',
    sourcemap: true,
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'index.js',
      cssFileName: 'style',
    },
    rollupOptions: {
      external: ['vue'],
    },
  },
})
