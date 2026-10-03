#!/usr/bin/env node
/**
 * The locale catalog gate.
 *
 * Asserts that every language pack agrees with the catalog, that no translation is an empty string
 * or a silent copy of the default, that each key documents itself, and that no component carries
 * hard-coded user-facing text. The rules, and the reasoning behind each of them, live in
 * `tools/lib/locale-catalog.mjs`.
 *
 * Usage: node tools/audit-i18n.mjs [--quiet]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkCatalog } from './lib/locale-catalog.mjs'

const REPO_ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..')
const LOCALE_DIR = resolvePath(REPO_ROOT, 'packages/vue/src/locale')
const SOURCE_DIR = resolvePath(REPO_ROOT, 'packages/vue/src')

/** The packs the package ships, and the one that is the default. */
const PACKS = [
  { locale: 'en-US', file: 'en-US.ts', isDefault: true },
  { locale: 'zh-CN', file: 'zh-CN.ts', isDefault: false },
]

/**
 * The shipped sources that are scanned for hard-coded text.
 *
 * The whole `packages/vue/src` tree, not only `components/`: a string that escapes the catalog is
 * just as unreachable from `shared/` or the locale provider. The catalog itself is excluded — those
 * three files are *where* the text is supposed to live — as are tests, which legitimately spell out
 * expected strings.
 */
const CATALOG_FILES = new Set(['catalog.ts', 'en-US.ts', 'zh-CN.ts', 'index.ts'])

function componentSources() {
  const files = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (!/\.(vue|ts)$/.test(entry.name)) continue
      if (/\.test\.ts$/.test(entry.name)) continue
      const relativePath = relative(REPO_ROOT, full).replaceAll('\\', '/')
      if (relativePath.startsWith('packages/vue/src/locale/') && CATALOG_FILES.has(entry.name)) {
        continue
      }
      files.push({ path: relativePath, source: readFileSync(full, 'utf8') })
    }
  }
  if (statSync(SOURCE_DIR, { throwIfNoEntry: false })) walk(SOURCE_DIR)
  return files
}

function main() {
  const quiet = process.argv.includes('--quiet')

  const { problems, notes } = checkCatalog({
    catalogSource: readFileSync(join(LOCALE_DIR, 'catalog.ts'), 'utf8'),
    packs: PACKS.map((pack) => ({
      ...pack,
      source: readFileSync(join(LOCALE_DIR, pack.file), 'utf8'),
    })),
    components: componentSources(),
  })

  if (!quiet) {
    for (const note of notes) process.stdout.write(`  ${note}\n`)
  }

  if (problems.length > 0) {
    process.stdout.write(`\n${problems.length} problem(s):\n`)
    for (const problem of problems) process.stdout.write(`  ✗ ${problem}\n`)
    process.stdout.write('\nRESULT: FAIL\n')
    return 1
  }
  process.stdout.write('\nRESULT: PASS\n')
  return 0
}

try {
  process.exitCode = main()
} catch (error) {
  process.stderr.write(`audit-i18n: ${error.message}\n`)
  process.exitCode = 2
}
