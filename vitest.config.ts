import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

/**
 * Two test projects, because the suite has two genuinely different subjects.
 *
 *   tokens      the dependency-free auditing tooling. Pure Node: it reads CSS
 *               from disk and must never need a DOM.
 *   components  the Vue components and composables. Needs a DOM (happy-dom) and
 *               the SFC compiler.
 *
 * Splitting them keeps `environment` honest per subject instead of forcing a DOM
 * on the token audits, and keeps each include list explicit — a component test
 * cannot be silently skipped by a glob that no longer matches.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'tokens',
          environment: 'node',
          include: ['tests/**/*.test.mjs'],
          testTimeout: 30_000,
        },
      },
      {
        plugins: [vue()],
        resolve: {
          alias: {
            // Point the composables at their TypeScript source rather than the
            // built artefact, so a component test never depends on `pnpm build`
            // having run first — and so a change to the hooks source is picked up
            // without a rebuild.
            '@yue-ui/hooks': fileURLToPath(
              new URL('./packages/hooks/src/index.ts', import.meta.url),
            ),
          },
        },
        test: {
          name: 'components',
          environment: 'happy-dom',
          include: [
            'packages/hooks/src/**/*.test.ts',
            'packages/vue/src/**/*.test.ts',
            // Adapter tests: they mount real components and therefore need a DOM and the SFC
            // compiler, but they test an integration whose code lives in the docs theme — the
            // adapter is deliberately not a package yet (see the I18N roadmap, phase 5).
            'tests/i18n/**/*.test.ts',
          ],
          testTimeout: 30_000,
        },
      },
    ],
  },
})
