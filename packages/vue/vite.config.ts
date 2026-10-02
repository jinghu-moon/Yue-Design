import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url))

/**
 * Library build for @yue-ui/vue.
 *
 * Three entries, matching the three public import paths exactly:
 *
 *   src/index.ts                    → dist/index.js                    @yue-ui/vue
 *   src/plugin.ts                   → dist/plugin.js                   @yue-ui/vue/plugin
 *   src/components/button/index.ts  → dist/components/button/index.js  @yue-ui/vue/button
 *
 * Multi-entry rather than one bundle plus re-exports, because the entry points
 * *are* the tree-shaking boundary: a consumer importing `@yue-ui/vue/button` gets
 * a graph that never reaches `plugin.ts`'s registry, and rollup proves it by
 * keeping the shared component in its own chunk.
 *
 * The declaration emit (vue-tsc, see package.json) mirrors this layout 1:1 from
 * `src/` to `dist/`, which is why the plugin is `src/plugin.ts` and not
 * `src/plugin/index.ts`.
 *
 * `vue` is the only external, so the published package has no runtime dependency
 * beyond the framework the host already provides. `@yue-ui/hooks` is workspace
 * TypeScript and is compiled in: making it external would turn a build-time
 * source of truth into an install-time dependency that a consumer of
 * `@yue-ui/vue` alone would have to know about. Its declarations are still what
 * the declaration emit reads (see tsconfig.build.json), so the two cannot drift.
 *
 * Styles are NOT emitted here — see scripts/build-style.mjs for why the JS entry
 * must stay free of CSS side effects.
 */
export default defineConfig({
  plugins: [vue()],
  build: {
    target: 'es2022',
    sourcemap: true,
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: {
        index: src('./src/index.ts'),
        plugin: src('./src/plugin.ts'),
        'components/button/index': src('./src/components/button/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
})
