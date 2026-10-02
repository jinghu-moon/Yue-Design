import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))

/**
 * Packages whose published JavaScript is emitted by `tsc`/`vue-tsc` rather than
 * assembled by a bundler.
 *
 * A bundler resolves `./types` to `./types.ts` and rewrites the specifier in its
 * output, so extensionless relative imports are harmless there. `tsc` copies them
 * through verbatim, and Node's ESM resolver requires the extension — so once such
 * a package is installed, `import '@yue-ui/hooks'` throws `ERR_MODULE_NOT_FOUND`
 * while every in-repo test still passes, because the repo resolves through
 * bundlers and workspace links.
 *
 * `@yue-ui/vue` is built by Vite and its output already carries extensions, so it
 * is deliberately not listed here. It is covered instead by the built-artefact
 * checks in `tools/verify-dist.mjs`.
 */
const TSC_EMITTED_PACKAGES = ['packages/hooks']

/** Matches `from './x'`, `from "./x"`, `import('./x')` and `export ... from './x'`. */
const RELATIVE_SPECIFIER = /(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

describe('published ESM specifiers', () => {
  it.each(TSC_EMITTED_PACKAGES)(
    '%s spells out .js on every relative import',
    (packageDir) => {
      const sourceDir = join(REPO_ROOT, packageDir, 'src')
      expect(statSync(sourceDir).isDirectory()).toBe(true)

      const offenders = []
      let inspected = 0

      for (const file of walk(sourceDir)) {
        if (!file.endsWith('.ts')) continue
        const text = readFileSync(file, 'utf8')
        for (const match of text.matchAll(RELATIVE_SPECIFIER)) {
          inspected += 1
          const specifier = match[1]
          if (!specifier.endsWith('.js')) {
            offenders.push(`${relative(REPO_ROOT, file).replaceAll('\\', '/')} → "${specifier}"`)
          }
        }
      }

      // A regex that stopped matching would make this check pass for the wrong
      // reason, so assert it actually looked at something.
      expect(inspected).toBeGreaterThan(0)
      expect(
        offenders,
        'these specifiers would be copied verbatim by tsc and fail Node\'s ESM resolver',
      ).toEqual([])
    },
  )
})
