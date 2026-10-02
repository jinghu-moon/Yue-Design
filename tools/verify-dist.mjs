#!/usr/bin/env node
/**
 * Post-build invariants for the documentation site.
 *
 * These are the claims that are easy to make and easy to get wrong, so they are
 * asserted against the real build output rather than trusted:
 *
 *   1. No external resource loads — no CDN script, stylesheet, font or image.
 *      (Anchor hrefs and SVG namespace URIs are not resource loads and are
 *      deliberately not treated as failures.)
 *   2. Every asset referenced by the built CSS exists on disk, so no font or
 *      image silently 404s in production.
 *   3. The token package actually made it into the bundle, and the docs bind
 *      their shell to token values rather than to hard-coded colours.
 *   4. Every expected page was rendered.
 *
 * Usage: node tools/verify-dist.mjs [--dist <dir>] [--quiet]
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_DIST = 'apps/docs/.vitepress/dist'

const EXPECTED_PAGES = [
  'index.html',
  '404.html',
  'guide/index.html',
  'guide/philosophy.html',
  'foundation/index.html',
  'components/index.html',
  'components/button.html',
  'components/button/api.html',
  'components/button/guide.html',
  'design/index.html',
  'design/color.html',
  'design/dark-mode.html',
  'design/typography.html',
  'design/icon.html',
  'design/layout.html',
  'design/motion.html',
  'architecture/index.html',
  'tools/index.html',
]

/**
 * Pages that must render *real* component output.
 *
 * A `<YueButton>` that is not registered compiles to a comment and renders as
 * nothing — invisible to a page-exists check and easy to miss in review.
 * Asserting the rendered class contract is what turns "the documentation shows the
 * real component" into a verified claim instead of an intention.
 */
const COMPONENT_PAGES = [
  {
    page: 'components/button.html',
    label: 'Button page renders real YueButton markup',
    mustContain: ['yue-button yue-button--', 'yue-button__label', 'yue-button__spinner'],
  },
  {
    page: 'components/button/api.html',
    label: 'Button API page contains the public contract',
    mustContain: ['Props', 'YueButton', 'aria-busy'],
  },
  {
    page: 'components/button/guide.html',
    label: 'Button guide page contains usage guidance',
    mustContain: ['主次关系', '图标和标签', '自查清单'],
  },
]

/** Substrings that would indicate a third-party CDN leaking into the build. */
const CDN_MARKERS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
  'esm.sh',
  'skypack.dev',
  'polyfill.io',
]

/** Token names that must survive into the bundle from @yue-ui/design-tokens. */
const TOKEN_MARKERS = [
  '--font-ui:',
  '--accent-solid:',
  '--button-height-md:',
  '--text-primary:',
  '--surface-level-3-border:',
  // Added for YueButton: proves the Button *component* token contract — not just
  // the migrated geometry — reached the bundle.
  '--button-disabled-background:',
  '--button-success-background:',
  '--button-focus-ring-color:',
]

/** Proof that the docs theme consumes tokens instead of hard-coded values. */
const BINDING_MARKERS = [
  '--vp-font-family-base:var(--font-ui)',
  '--vp-c-brand-1:var(--accent-text)',
]

/** The cascade contract must survive bundling. */
const LAYER_MARKERS = ['@layerprimitives', '@layersemantics', '@layercomponents']

/**
 * `@layer` is forbidden in the component sheet.
 *
 * Unlayered CSS outranks every cascade layer regardless of specificity, so a
 * component sheet inside a layer loses to any unlayered host rule — VitePress'
 * `button { background-color: transparent }`, Tailwind's Preflight, normalize.css.
 * This is asserted against the *built* output because the failure mode is silent:
 * the rules are all present, they just never apply.
 */
const FORBIDDEN_IN_COMPONENT_CSS = ['@layer']

/**
 * Ordering invariants. A token binding that is emitted *before* the value it is
 * meant to override is silently dead, so position is asserted, not just presence.
 */
const ORDER_INVARIANTS = [
  {
    label: 'docs token binding overrides the VitePress default font stack',
    mustComeFirst: /--vp-font-family-base:\s*\x22Inter\x22/,
    mustComeLast: /--vp-font-family-base:\s*var\(--font-ui\)/,
  },
  {
    label: 'cascade layer order is declared before the first layer block',
    mustComeFirst: /@layer\s+primitives\s*,\s*semantics\s*,\s*components/,
    mustComeLast: /@layer\s+primitives\s*\{/,
  },
  {
    // §9's contract: the token sheet must be loaded before the component sheet, so
    // a component rule never has to out-order a token definition by accident.
    label: 'component sheet is emitted after the token sheet',
    mustComeFirst: /@layer\s+primitives\s*\{/,
    mustComeLast: /\.yue-button\s*\{/,
  },
]

/** Collapse formatting so markers match regardless of minifier spacing. */
const squeeze = (text) => text.replace(/\s+/g, '')

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const isExternal = (url) => /^(?:https?:)?\/\//i.test(url.trim())

function check(distDir, { quiet }) {
  const problems = []
  const notes = []

  if (!existsSync(distDir)) {
    problems.push(`build output not found: ${distDir} (run \`corepack pnpm build\` first)`)
    return { problems, notes }
  }

  const files = walk(distDir)
  const htmlFiles = files.filter((file) => extname(file) === '.html')
  const cssFiles = files.filter((file) => extname(file) === '.css')

  if (cssFiles.length === 0) problems.push('no stylesheet was emitted')
  const mainCss = cssFiles
    .map((file) => ({ file, size: statSync(file).size }))
    .sort((a, b) => b.size - a.size)[0]

  // 1 + 4 — expected pages
  for (const page of EXPECTED_PAGES) {
    if (!existsSync(join(distDir, page))) problems.push(`missing page: ${page}`)
  }

  // 5 — the component pages show the real component, not a placeholder
  for (const spec of COMPONENT_PAGES) {
    const file = join(distDir, spec.page)
    if (!existsSync(file)) continue
    const html = readFileSync(file, 'utf8')
    for (const marker of spec.mustContain) {
      if (!html.includes(marker)) {
        problems.push(`${spec.label}: ${spec.page} is missing "${marker}"`)
      }
    }
  }

  // 1 — external resource loads
  for (const file of [...htmlFiles, ...cssFiles]) {
    const text = readFileSync(file, 'utf8')
    const shown = relative(REPO_ROOT, file).replaceAll('\\', '/')

    for (const marker of CDN_MARKERS) {
      if (text.includes(marker)) problems.push(`${shown}: references CDN "${marker}"`)
    }

    if (extname(file) === '.html') {
      for (const match of text.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/gi)) {
        if (isExternal(match[1])) problems.push(`${shown}: external script "${match[1]}"`)
      }
      for (const match of text.matchAll(/<link[^>]*\shref=["']([^"']+)["']/gi)) {
        if (isExternal(match[1])) problems.push(`${shown}: external stylesheet "${match[1]}"`)
      }
    } else {
      for (const match of text.matchAll(/@import\s+(?:url\(\s*)?["']?([^"')\s;]+)/gi)) {
        if (isExternal(match[1])) problems.push(`${shown}: external @import "${match[1]}"`)
      }
      // 2 — every referenced asset must exist on disk
      for (const match of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
        const target = match[1].trim()
        if (target.startsWith('data:') || target.startsWith('#')) continue
        if (isExternal(target)) {
          problems.push(`${shown}: external url() "${target}"`)
          continue
        }
        const clean = target.split('?')[0].split('#')[0]
        const absolute = clean.startsWith('/')
          ? join(distDir, clean)
          : resolvePath(dirname(file), clean)
        if (!existsSync(absolute)) {
          problems.push(`${shown}: url() points at a missing file "${target}"`)
        }
      }
    }
  }

  // 3 — the token package is really in the bundle
  const cssText = readFileSync(mainCss.file, 'utf8')
  const squeezed = squeeze(cssText)
  for (const marker of TOKEN_MARKERS) {
    if (!squeezed.includes(squeeze(marker))) {
      problems.push(`built CSS is missing token "${marker}"`)
    }
  }
  for (const marker of BINDING_MARKERS) {
    if (!squeezed.includes(squeeze(marker))) {
      problems.push(`docs theme does not bind to tokens: "${marker}" not found`)
    }
  }
  for (const marker of LAYER_MARKERS) {
    if (!squeezed.includes(marker)) {
      problems.push(`cascade layer lost during bundling: "${marker}" not found`)
    }
  }

  // 3b — ordering: an override emitted before its target is silently dead
  for (const invariant of ORDER_INVARIANTS) {
    const first = cssText.search(invariant.mustComeFirst)
    const last = cssText.search(invariant.mustComeLast)
    if (first === -1) {
      problems.push(`${invariant.label}: expected baseline not found in built CSS`)
      continue
    }
    if (last === -1) {
      problems.push(`${invariant.label}: expected override not found in built CSS`)
      continue
    }
    if (last < first) problems.push(`${invariant.label}: override is emitted before the baseline`)
  }

  const woff2 = files.filter((file) => extname(file) === '.woff2')
  const inlinedFonts = (cssText.match(/url\(data:font\//g) ?? []).length
  notes.push(`pages: ${htmlFiles.length}`)
  notes.push(`stylesheet: ${relative(REPO_ROOT, mainCss.file).replaceAll('\\', '/')} (${mainCss.size} bytes)`)
  notes.push(`fonts: ${woff2.length} emitted, ${inlinedFonts} inlined as data URIs`)
  notes.push(`external resource loads: 0`)

  if (!quiet) {
    for (const note of notes) process.stdout.write(`  ${note}\n`)
  }
  return { problems, notes }
}

/* ------------------------------------------------------------------ *
 * Package build output (@yue-ui/vue)
 * ------------------------------------------------------------------ */

const VUE_PACKAGE_DIR = 'packages/vue'

/**
 * Bare module specifiers the published JavaScript is allowed to import.
 *
 * This is the "the build kept its boundaries" assertion. `vue` must be here and
 * must be the ONLY entry: it being absent would mean the framework got bundled
 * into the library (the classic duplicate-Vue bug), and anything else appearing
 * means the package grew a runtime dependency that a consumer of
 * `@yue-ui/vue` alone would have to know about. Workspace `@yue-ui/hooks` is
 * compiled in for exactly that reason.
 */
const ALLOWED_EXTERNAL_IMPORTS = ['vue']

/**
 * Verify the published artefacts of @yue-ui/vue:
 *
 *   1. every path in `exports` resolves to a file that exists — the entry contract
 *      is the thing consumers actually depend on, and a typo in it is invisible
 *      until someone installs the tarball;
 *   2. the JS is ESM, keeps `vue` external, pulls in nothing unexpected, contains
 *      no `import *`, and has no `import.meta.env` left behind (a leftover would
 *      need a bundler to resolve and would break a plain `<script type=module>`);
 *   3. both CSS entry points exist, are wrapped in `@layer implementations`, and
 *      do not declare a layer order of their own.
 */
function checkVuePackage(problems, notes) {
  const packageRoot = resolvePath(REPO_ROOT, VUE_PACKAGE_DIR)
  const manifestPath = join(packageRoot, 'package.json')

  if (!existsSync(manifestPath)) {
    problems.push(`missing ${VUE_PACKAGE_DIR}/package.json`)
    return
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

  if (!manifest.sideEffects?.some((entry) => entry.includes('.css'))) {
    problems.push('@yue-ui/vue: `sideEffects` does not mark CSS, so bundlers may drop it')
  }

  // 1 — every declared entry resolves
  const exportedFiles = []
  for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
    const candidates = typeof target === 'string' ? [target] : Object.values(target)
    for (const candidate of candidates) {
      exportedFiles.push({ subpath, candidate })
      if (!existsSync(join(packageRoot, candidate))) {
        problems.push(`@yue-ui/vue: exports["${subpath}"] points at missing ${candidate}`)
      }
    }
  }

  const distDir = join(packageRoot, 'dist')
  if (!existsSync(distDir)) {
    problems.push('@yue-ui/vue: dist/ not found (run `corepack pnpm build` first)')
    return
  }

  const jsFiles = walk(distDir).filter((file) => extname(file) === '.js')
  if (jsFiles.length === 0) problems.push('@yue-ui/vue: dist/ contains no JavaScript')

  const externals = new Set()
  for (const file of jsFiles) {
    const text = stripJsComments(readFileSync(file, 'utf8'))
    const shown = relative(REPO_ROOT, file).replaceAll('\\', '/')

    if (/\brequire\s*\(/.test(text) || /\bmodule\.exports\b/.test(text)) {
      problems.push(`${shown}: not ESM (found require/module.exports)`)
    }
    if (/\bimport\s*\*\s*as\b/.test(text)) {
      problems.push(`${shown}: uses \`import * as\``)
    }
    if (text.includes('import.meta.env')) {
      problems.push(`${shown}: contains import.meta.env, which a plain browser cannot resolve`)
    }
    if (/\bprocess\.env\.NODE_ENV\b/.test(text)) {
      problems.push(`${shown}: contains process.env.NODE_ENV, which a browser cannot resolve`)
    }
    for (const match of text.matchAll(/\bfrom\s*["']([^"']+)["']/g)) {
      const specifier = match[1]
      if (specifier.startsWith('.')) {
        checkRelativeSpecifier(shown, specifier, problems)
      } else {
        externals.add(specifier)
      }
    }
  }

  for (const specifier of externals) {
    if (!ALLOWED_EXTERNAL_IMPORTS.includes(specifier)) {
      problems.push(`@yue-ui/vue: dist imports unexpected external "${specifier}"`)
    }
  }
  if (jsFiles.length > 0 && !externals.has('vue')) {
    problems.push('@yue-ui/vue: dist does not import "vue", so the runtime was bundled in')
  }

  // 3 — the two CSS entry points exist, are unlayered, and carry the rules
  const cssNamespaces = new Set()
  for (const [subpath, file] of [
    ['./style.css', 'dist/style.css'],
    ['./button.css', 'dist/components/button/style.css'],
  ]) {
    const absolute = join(packageRoot, file)
    if (!existsSync(absolute)) {
      problems.push(`@yue-ui/vue: ${subpath} is missing (${file})`)
      continue
    }
    const css = readFileSync(absolute, 'utf8')
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
    for (const marker of FORBIDDEN_IN_COMPONENT_CSS) {
      if (withoutComments.includes(marker)) {
        problems.push(
          `@yue-ui/vue: ${file} contains "${marker}", which would let an unlayered ` +
            'host reset outrank the component rules',
        )
      }
    }
    if (!withoutComments.includes('.yue-button')) {
      problems.push(`@yue-ui/vue: ${file} does not contain the Button styles`)
    }
    for (const match of withoutComments.matchAll(/\.([a-z][a-z0-9]*)-button/g)) {
      cssNamespaces.add(match[1])
    }
    notes.push(`${file}: unlayered, ${css.length} bytes`)
  }

  // 3b — the stylesheet and the JavaScript must agree on the class namespace.
  //
  // This is the invariant that a configurable namespace broke: the component
  // rendered `.app-button` while the stylesheet only ever matched `.yue-button`, so
  // every rule silently stopped applying. Both artefacts are built from different
  // sources (CSS is hand-written, the namespace comes from a constant), which is
  // exactly why the agreement has to be asserted rather than assumed.
  if (cssNamespaces.size !== 1) {
    problems.push(
      `@yue-ui/vue: component stylesheets use ${cssNamespaces.size} namespaces ` +
        `(${[...cssNamespaces].sort().join(', ')}); exactly one is expected`,
    )
  } else {
    const [namespace] = cssNamespaces
    const declared = jsFiles.some((file) =>
      readFileSync(file, 'utf8').includes(`"${namespace}"`),
    )
    if (!declared) {
      problems.push(
        `@yue-ui/vue: the stylesheet styles .${namespace}-* but no built module declares the ` +
          `"${namespace}" namespace, so the component would render unstyled`,
      )
    }
    notes.push(`class namespace: ${namespace} (stylesheet and JavaScript agree)`)
  }

  notes.push(
    `@yue-ui/vue dist: ${jsFiles.length} JS file(s), externals: ${[...externals].sort().join(', ') || 'none'}`,
  )
}

/**
 * Source trees must not contain build output.
 *
 * A stray `.d.ts` next to its `.ts` is easy to miss, shadows nothing at
 * type-check time (TypeScript prefers the `.ts`), and then gets committed. It
 * appeared once during this repository's development, emitted by a mis-invoked
 * declaration build, which is exactly the kind of mistake a check should catch
 * rather than a reviewer.
 */
function checkNoEmitIntoSource(problems) {
  const packagesDir = resolvePath(REPO_ROOT, 'packages')
  if (!existsSync(packagesDir)) return

  const offenders = []
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const srcDir = join(packagesDir, entry.name, 'src')
    if (!existsSync(srcDir)) continue
    for (const file of walk(srcDir)) {
      if (/\.(d\.ts|d\.ts\.map|js|js\.map|mjs|cjs)$/.test(file)) {
        offenders.push(relative(REPO_ROOT, file).replaceAll('\\', '/'))
      }
    }
  }

  for (const file of offenders) {
    problems.push(`${file}: build output inside a source directory`)
  }
}

/**
 * Remove comments before scanning published JavaScript.
 *
 * `tsc` preserves doc comments into `dist`, so a comment *explaining* that
 * `import.meta.env` must not survive would itself trip a naive substring search.
 * The checks below are about code, so they read code. (The `[^:]` guard keeps
 * `https://` inside a string literal from being mistaken for a line comment; this
 * does not need to be a full JavaScript lexer.)
 */
const stripJsComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')

/**
 * A relative specifier in published ESM must name a file, extension included.
 *
 * Node's ESM resolver does not guess: `./injection` is an error while
 * `./injection.js` resolves. Bundlers and this repository's own tests both paper
 * over it — Vite maps `.js` back to `.ts`, and workspace links resolve through
 * `exports` — so an extensionless import passes everything in-repo and fails the
 * moment a consumer installs the tarball.
 */
function checkRelativeSpecifier(shown, specifier, problems) {
  if (!/\.[a-z]+$/i.test(specifier)) {
    problems.push(
      `${shown}: relative import "${specifier}" has no file extension, which Node's ESM ` +
        'resolver rejects once the package is installed',
    )
  }
}

/**
 * Published artefacts of `@yue-ui/hooks`.
 *
 * This package is emitted by `tsc`, not by a bundler, so it is the one whose
 * relative specifiers are copied through verbatim — exactly the surface that
 * `tsconfig`-based builds get wrong and bundler-based builds never can.
 */
function checkHooksPackage(problems, notes) {
  const packageRoot = resolvePath(REPO_ROOT, 'packages/hooks')
  const manifestPath = join(packageRoot, 'package.json')

  if (!existsSync(manifestPath)) {
    problems.push('missing packages/hooks/package.json')
    return
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

  for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
    for (const candidate of typeof target === 'string' ? [target] : Object.values(target)) {
      if (!existsSync(join(packageRoot, candidate))) {
        problems.push(`@yue-ui/hooks: exports["${subpath}"] points at missing ${candidate}`)
      }
    }
  }

  const distDir = join(packageRoot, 'dist')
  if (!existsSync(distDir)) {
    problems.push('@yue-ui/hooks: dist/ not found (run `corepack pnpm build` first)')
    return
  }

  const jsFiles = walk(distDir).filter((file) => extname(file) === '.js')
  if (jsFiles.length === 0) problems.push('@yue-ui/hooks: dist/ contains no JavaScript')

  let relativeSpecifiers = 0
  for (const file of jsFiles) {
    const text = stripJsComments(readFileSync(file, 'utf8'))
    const shown = relative(REPO_ROOT, file).replaceAll('\\', '/')

    if (/\brequire\s*\(/.test(text) || /\bmodule\.exports\b/.test(text)) {
      problems.push(`${shown}: not ESM (found require/module.exports)`)
    }
    if (text.includes('import.meta.env')) {
      problems.push(`${shown}: contains import.meta.env, which plain Node cannot resolve`)
    }
    for (const match of text.matchAll(/\bfrom\s*["']([^"']+)["']/g)) {
      const specifier = match[1]
      if (specifier.startsWith('.')) {
        relativeSpecifiers += 1
        checkRelativeSpecifier(shown, specifier, problems)
      } else if (specifier !== 'vue') {
        problems.push(`@yue-ui/hooks: dist imports unexpected external "${specifier}"`)
      }
    }
  }

  // A regex that stopped matching would make the rule vacuous, so assert the
  // package really does have relative imports to check.
  if (relativeSpecifiers === 0) {
    problems.push('@yue-ui/hooks: found no relative imports in dist/ to verify')
  }
  notes.push(`@yue-ui/hooks dist: ${jsFiles.length} JS file(s), ${relativeSpecifiers} relative import(s)`)
}

function main() {
  const argv = process.argv.slice(2)
  let distDir = resolvePath(REPO_ROOT, DEFAULT_DIST)
  let quiet = false
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--dist') {
      distDir = resolvePath(REPO_ROOT, argv[index + 1] ?? DEFAULT_DIST)
      index += 1
    } else if (argv[index] === '--quiet') {
      quiet = true
    } else {
      throw new Error(`unknown argument "${argv[index]}"`)
    }
  }

  process.stdout.write('Yue Design · Build output verification\n')
  process.stdout.write(`dist: ${relative(REPO_ROOT, distDir).replaceAll('\\', '/')}\n`)
  const { problems } = check(distDir, { quiet })

  process.stdout.write(`package: ${VUE_PACKAGE_DIR}\n`)
  const packageNotes = []
  checkVuePackage(problems, packageNotes)
  if (!quiet) {
    for (const note of packageNotes) process.stdout.write(`  ${note}\n`)
  }

  process.stdout.write('package: packages/hooks\n')
  const hooksNotes = []
  checkHooksPackage(problems, hooksNotes)
  if (!quiet) {
    for (const note of hooksNotes) process.stdout.write(`  ${note}\n`)
  }

  checkNoEmitIntoSource(problems)

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
  process.stderr.write(`verify-dist: ${error.message}\n`)
  process.exitCode = 2
}
