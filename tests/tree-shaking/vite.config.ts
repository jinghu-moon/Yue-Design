import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import type { UserConfig } from 'vite'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

/** The halves of the tree-shaking claim, one build each. */
export const MODES = ['button', 'input', 'popover', 'dialog', 'plugin', 'locale'] as const
export type Mode = (typeof MODES)[number]

const SOURCE: Record<Mode, string> = {
  button: 'button-entry.ts',
  input: 'input-entry.ts',
  popover: 'popover-entry.ts',
  dialog: 'dialog-entry.ts',
  plugin: 'plugin-entry.ts',
  // One language pack, and nothing else: the consumer who wants Yue's components in another
  // language imports the pack from its own subpath.
  locale: 'locale-entry.ts',
}

/**
 * Build config for the temporary consumers in `tests/tree-shaking/`.
 *
 * `mode` selects which entry to build, so the CLI works too:
 *
 *   vite build --mode button
 *   vite build --mode plugin
 *
 * and `verify.mjs` loads this same file through Vite's own config loader, so the
 * assertions and the CLI can never disagree about what was built.
 *
 * `vue` is the only external — the host application owns the runtime. Everything
 * else, including `@yue-ui/hooks`, is bundled, because that is what shows whether
 * an entry pulled in more than it should.
 */
export function configFor(mode: string): UserConfig {
  if (!MODES.includes(mode as Mode)) {
    throw new Error(`unknown tree-shaking mode "${mode}"; expected ${MODES.join(' or ')}`)
  }

  return {
    root: here('.'),
    // Keep the output readable: the assertions below are about which identifiers
    // and class names survive, and a minifier would rename half of them.
    build: {
      target: 'es2022',
      minify: false,
      sourcemap: false,
      emptyOutDir: true,
      cssCodeSplit: false,
      outDir: here(`dist/${mode}`),
      lib: {
        entry: here(SOURCE[mode as Mode]),
        formats: ['es'],
        fileName: () => 'bundle.js',
        cssFileName: 'bundle',
      },
      rollupOptions: {
        external: ['vue'],
      },
    },
  }
}

export default defineConfig(({ mode }) => configFor(mode))
