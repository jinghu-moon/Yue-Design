#!/usr/bin/env node
/**
 * Bilingual documentation gate.
 *
 * Asserts that the Chinese tree and the English tree are the same documentation: same pages,
 * same structure, same examples, translated prose, links that stay inside their own locale and
 * anchors that resolve in the built site. The reasoning and the rules live in
 * `tools/lib/docs-i18n.mjs`.
 *
 * Usage: node tools/check-docs-i18n.mjs [--quiet]
 */
import { existsSync } from 'node:fs'
import { dirname, relative, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkDocsI18n } from './lib/docs-i18n.mjs'

const REPO_ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..')
const DOCS_DIR = resolvePath(REPO_ROOT, 'apps/docs')
const DIST_DIR = resolvePath(REPO_ROOT, 'apps/docs/.vitepress/dist')

function main() {
  const quiet = process.argv.includes('--quiet')

  process.stdout.write('Yue Design · Bilingual documentation\n')
  process.stdout.write(`source: ${relative(REPO_ROOT, DOCS_DIR).replaceAll('\\', '/')}\n`)

  if (!existsSync(DIST_DIR)) {
    // Anchor validation reads the *built* ids. Without a build there is nothing to compare
    // against, and silently skipping it would report "no problems" for a check that never ran.
    process.stdout.write(
      'built site not found: apps/docs/.vitepress/dist (run `corepack pnpm build` first)\n' +
        '\nRESULT: FAIL\n',
    )
    return 1
  }

  const { problems, notes } = checkDocsI18n({ docsDir: DOCS_DIR, distDir: DIST_DIR })

  if (!quiet) {
    for (const note of notes) process.stdout.write(`  ${note}\n`)
  }

  if (problems.length > 0) {
    process.stdout.write(`\n${problems.length} problem(s):\n`)
    for (const problem of problems.slice(0, 40)) process.stdout.write(`  ✗ ${problem}\n`)
    if (problems.length > 40) {
      process.stdout.write(`  … and ${problems.length - 40} more\n`)
    }
    process.stdout.write(
      '\nThe English tree is the same documentation in another language: a missing page, a\n' +
        'dropped code sample or an untranslated sentence is a defect, not a draft.\n',
    )
    process.stdout.write('\nRESULT: FAIL\n')
    return 1
  }

  process.stdout.write('\nRESULT: PASS\n')
  return 0
}

try {
  process.exitCode = main()
} catch (error) {
  process.stderr.write(`docs-i18n: ${error.message}\n`)
  process.exitCode = 2
}
