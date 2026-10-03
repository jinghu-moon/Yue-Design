#!/usr/bin/env node
/**
 * Emit `dist/style.css` for @yue-ui/vue.
 *
 * Why not let Vite handle it: the published contract is three explicit imports
 *
 *   import '@yue-ui/design-tokens/index.css'
 *   import '@yue-ui/vue'
 *   import '@yue-ui/vue/style.css'
 *
 * which means the JS entry must stay free of CSS side effects (so the library
 * can be imported in a Node/SSR context without CSS resolution). Vite only emits
 * a stylesheet for CSS that something imports, so the component stylesheet is
 * assembled here instead.
 *
 * `@import` is inlined so `src/style.css` can stay a declarative index that
 * lists one file per component, and so `@layer implementations { … }` survives
 * verbatim. Imports are resolved relative to the importing file; a missing
 * import is a build failure rather than a silently dropped rule.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const IMPORT_PATTERN =
  /@import\s+(?:url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]*))\s*\)|"([^"]*)"|'([^']*)')\s*(?:layer\(\s*([^)]*)\s*\))?\s*;/gi

/** Blank out comments while preserving length, so match indices stay aligned. */
function maskComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
}

/**
 * Recursively inline `@import` rules.
 * @returns {{ css: string, files: string[] }} the bundled CSS and every file it read.
 */
export function bundleStyle(entryFile, { read = (file) => readFileSync(file, 'utf8') } = {}) {
  const visited = new Set()
  const files = []

  const walk = (file) => {
    const absolute = resolve(file)
    if (visited.has(absolute)) return ''
    visited.add(absolute)
    files.push(absolute)

    let css
    try {
      css = read(absolute)
    } catch (error) {
      throw new Error(`style bundle: cannot read ${absolute}: ${error.message}`)
    }

    let out = ''
    let cursor = 0
    // Match against the comment-masked copy, but slice the original text, so a
    // documented `@import` inside a comment is never treated as a real import.
    // matchAll clones the pattern, so recursion cannot disturb this iteration.
    for (const match of maskComments(css).matchAll(IMPORT_PATTERN)) {
      out += css.slice(cursor, match.index)
      cursor = match.index + match[0].length
      const specifier = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5] ?? '').trim()
      const layer = match[6]?.trim()
      if (specifier === '') throw new Error(`style bundle: empty @import in ${absolute}`)
      const child = resolve(dirname(absolute), specifier)
      const body = walk(child)
      out += layer ? `@layer ${layer} {\n${body}\n}` : body
    }
    return out + css.slice(cursor)
  }

  return { css: walk(entryFile), files }
}

/**
 * Per-component stylesheets, published as `@yue-ui/vue/<component>.css`.
 *
 * Each one is bundled from the component's own source and emitted verbatim — the
 * same shape `src/style.css` produces — so a consumer who imports `button.css`
 * alone and one who imports `style.css` get rules with identical cascade
 * behaviour. In particular neither is wrapped in a layer: see the contract note in
 * `src/style.css` for why a layered component sheet loses to unlayered host CSS.
 */
const COMPONENT_ENTRIES = [
  { source: 'src/components/button/style.css', target: 'dist/components/button/style.css' },
  { source: 'src/components/input/style.css', target: 'dist/components/input/style.css' },
]

function writeEntry(packageRoot, source, target) {
  const { css, files } = bundleStyle(resolve(packageRoot, source))

  const absoluteTarget = resolve(packageRoot, target)
  mkdirSync(dirname(absoluteTarget), { recursive: true })
  writeFileSync(absoluteTarget, css, 'utf8')

  const listed = files
    .map((file) => relative(packageRoot, file).replaceAll('\\', '/'))
    .join(', ')
  process.stdout.write(`@yue-ui/vue: ${target} ← ${listed} (${css.length} bytes)\n`)
}

function main() {
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

  writeEntry(packageRoot, 'src/style.css', 'dist/style.css')

  for (const entry of COMPONENT_ENTRIES) {
    writeEntry(packageRoot, entry.source, entry.target)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  }
}
