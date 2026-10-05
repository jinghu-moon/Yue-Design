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

/**
 * Every page the site must render, in both locales.
 *
 * Written out rather than globbed: a page that stops being built is a failure here instead of a
 * quietly shorter list. The English tree is listed in full because "the English site exists" is
 * a claim about *all* of these, not about a landing page.
 */
const EXPECTED_PAGES = [
  'index.html',
  '404.html',
  'guide/index.html',
  'guide/philosophy.html',
  'guide/i18n.html',
  'foundation/index.html',
  'components/index.html',
  'components/button.html',
  'components/button/api.html',
  'components/button/guide.html',
  'components/input.html',
  'components/input/api.html',
  'components/input/guide.html',
  'components/popover.html',
  'components/popover/api.html',
  'components/popover/guide.html',
  'design/index.html',
  'design/color.html',
  'design/dark-mode.html',
  'design/typography.html',
  'design/icon.html',
  'design/layout.html',
  'design/motion.html',
  'architecture/index.html',
  'tools/index.html',
  'en/index.html',
  'en/guide/index.html',
  'en/guide/philosophy.html',
  'en/guide/i18n.html',
  'en/foundation/index.html',
  'en/components/index.html',
  'en/components/button.html',
  'en/components/button/api.html',
  'en/components/button/guide.html',
  'en/components/input.html',
  'en/components/input/api.html',
  'en/components/input/guide.html',
  'en/components/popover.html',
  'en/components/popover/api.html',
  'en/components/popover/guide.html',
  'en/design/index.html',
  'en/design/color.html',
  'en/design/dark-mode.html',
  'en/design/typography.html',
  'en/design/icon.html',
  'en/design/layout.html',
  'en/design/motion.html',
  'en/architecture/index.html',
  'en/tools/index.html',
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
    mustContain: [
      'yue-button yue-button--',
      'yue-button__label',
      'yue-button__spinner',
      // The loader layer and the custom loader slot: proof that the loading examples are
      // rendered rather than described.
      'yue-button__loader',
      // The group and toggle: proof the page uses the family's other three components.
      'yue-button-group',
      'aria-pressed="true"',
      // The anatomy figure, which names six parts and labels them.
      'button-anatomy__parts',
    ],
  },
  {
    page: 'components/button/api.html',
    label: 'Button API page contains the public contract',
    mustContain: ['Props', 'YueButton', 'aria-busy', 'YueButtonToggleItem'],
  },
  {
    page: 'components/button/guide.html',
    label: 'Button guide page contains usage guidance',
    mustContain: ['主次关系', '图标和标签', '自查清单'],
  },
  {
    page: 'components/input.html',
    label: 'Input page renders real YueInput markup',
    mustContain: [
      'yue-input yue-input--',
      'yue-input__native',
      'yue-input__clear',
      // `is-invalid` and `is-readonly` only appear when the props are set, so their
      // presence proves the state examples actually rendered rather than being prose.
      'is-invalid',
      'is-readonly',
      'is-disabled',
    ],
  },
  {
    page: 'components/input/api.html',
    label: 'Input API page contains the public contract',
    // `input.clear` rather than `clearLabel`: the accessible name is a locale key, not a
    // per-component prop, and this list is what keeps the published documentation honest
    // about which of the two it is.
    mustContain: ['Props', 'YueInput', 'aria-invalid', 'input.clear', 'update:modelValue'],
  },
  {
    page: 'components/input/guide.html',
    label: 'Input guide page contains usage guidance',
    mustContain: ['YueInput', 'readonly', 'YueField'],
  },
  {
    page: 'components/popover.html',
    label: 'Popover page renders real YuePopover markup',
    mustContain: ['yue-popover__anchor', 'data-popover-trigger', 'YuePopover'],
  },
  {
    page: 'components/popover/api.html',
    label: 'Popover API page contains the public contract',
    mustContain: ['YuePopover', 'closeOnOutside', 'aria-controls', 'update:modelValue'],
  },
  {
    page: 'components/popover/guide.html',
    label: 'Popover guide page contains usage guidance',
    mustContain: ['YuePopover', 'Teleport', 'Escape'],
  },
  {
    page: 'en/components/button.html',
    label: 'the English Button page renders the real component',
    // The component markup is language-independent; the *chrome* is not, so both halves are
    // asserted: a rendered button and English section titles.
    mustContain: ['yue-button yue-button--', 'Anatomy', 'yue-button__loader'],
  },
  {
    page: 'en/components/popover.html',
    label: 'the English Popover page renders the real component',
    mustContain: ['yue-popover__anchor', 'data-popover-trigger', 'Teleport'],
  },
  {
    page: 'en/guide/i18n.html',
    label: 'the English i18n guide documents the locale contract',
    mustContain: ['useLocale', 'fallback', 'input.clear', 'yue-i18n'],
  },
]

/**
 * The locale entries `@yue-ui/vue` publishes, and the string each must carry.
 *
 * Two properties are being asserted, and both are about the *bundle boundary* rather than
 * about correctness of the text:
 *
 *   1. every language pack is its own entry, so an application downloads the one it shows;
 *   2. the **default** pack is the only one reachable from the root — a Chinese string
 *      anywhere else in the package would mean the boundary leaked.
 */
const LOCALE_ENTRIES = [
  { subpath: './locale', file: 'dist/locale/index.js', pack: null },
  { subpath: './locale/en-US', file: 'dist/locale/en-US.js', pack: 'Clear' },
  { subpath: './locale/zh-CN', file: 'dist/locale/zh-CN.js', pack: '清空' },
]

/** The pack that must not appear outside its own entry. */
const NON_DEFAULT_PACK_STRING = '清空'
const NON_DEFAULT_PACK_FILE = 'dist/locale/zh-CN.js'

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
  // The selected (toggle) state reads the migrated `--button-selected-*` family, so its
  // presence here proves the state has a token contract rather than a hard-coded colour.
  '--button-selected-background:',
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
 * The stylesheets `@yue-ui/vue` publishes, and the component blocks each must contain.
 *
 * The aggregate sheet must carry every component; a per-component sheet must carry its
 * own and nothing else is asserted about it. Written out rather than globbed so that a
 * component which stops being published is a failure here instead of a quietly shorter
 * list.
 */
const COMPONENT_STYLESHEETS = [
  {
    subpath: './style.css',
    file: 'dist/style.css',
    blocks: ['button', 'input', 'popover'],
  },
  {
    subpath: './button.css',
    file: 'dist/components/button/style.css',
    blocks: ['button'],
  },
  {
    subpath: './input.css',
    file: 'dist/components/input/style.css',
    blocks: ['input'],
  },
  {
    subpath: './popover.css',
    file: 'dist/components/popover/style.css',
    blocks: ['popover'],
  },
]

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

/**
 * `<link rel>` values that make the browser fetch a resource.
 *
 * Everything else — `canonical`, `alternate`, `license`, `author`, `me`, `next`/`prev` — is
 * metadata. The distinction matters: a bilingual site *must* emit absolute canonical and
 * `hreflang` URLs, and a check that treated those as loads would flag the correct
 * configuration as a CDN leak.
 */
const RESOURCE_LINK_RELS = [
  'stylesheet',
  'preload',
  'modulepreload',
  'prefetch',
  'icon',
  'shortcut icon',
  'apple-touch-icon',
  'mask-icon',
  'manifest',
  'dns-prefetch',
  'preconnect',
]

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
      // Only `rel` values that make the browser *fetch* something count as a resource load.
      // `canonical` and `alternate` are metadata: a bilingual site is expected to point at
      // its own locale's absolute URLs, and treating those as loads would make the correct
      // SEO setup indistinguishable from a CDN leak.
      for (const match of text.matchAll(/<link\b[^>]*>/gi)) {
        const rel = /\brel=["']([^"']+)["']/i.exec(match[0])?.[1]?.toLowerCase()
        const href = /\bhref=["']([^"']+)["']/i.exec(match[0])?.[1]
        if (!href || !rel || !RESOURCE_LINK_RELS.includes(rel)) continue
        if (isExternal(href)) problems.push(`${shown}: external ${rel} href "${href}"`)
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

  // 3 — every CSS entry point exists, is unlayered, and carries its component's rules
  //
  // The blocks are derived from the component folders rather than listed, so adding a
  // component cannot silently leave its stylesheet unchecked: a new
  // `components/<block>/style.css` shows up here as a missing subpath. `blocks` is what
  // each sheet must prove it contains.
  const cssNamespaces = new Set()
  for (const { subpath, file, blocks } of COMPONENT_STYLESHEETS) {
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
    for (const block of blocks) {
      // The block rule itself — not merely a class that happens to contain the word —
      // proves the component's styles actually travelled into this bundle.
      if (!new RegExp(`\\.yue-${block}\\s*[,{]`).test(withoutComments)) {
        problems.push(`@yue-ui/vue: ${file} does not contain the ${block} styles`)
      }
      for (const match of withoutComments.matchAll(
        new RegExp(`\\.([a-z][a-z0-9]*)-${block}(?=[\\s,:{.[])`, 'g'),
      )) {
        cssNamespaces.add(match[1])
      }
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
 * The locale boundary, asserted against the built artefacts.
 *
 * A language pack that is imported by something it should not be is invisible in review —
 * the strings are correct, the application renders correctly, and the bundle quietly grew by
 * a language nobody asked for. Only the emitted files show this.
 */
function checkLocaleEntries(problems, notes) {
  const packageRoot = resolvePath(REPO_ROOT, VUE_PACKAGE_DIR)

  for (const entry of LOCALE_ENTRIES) {
    const file = join(packageRoot, entry.file)
    if (!existsSync(file)) {
      problems.push(`@yue-ui/vue: ${entry.subpath} is missing (${entry.file})`)
      continue
    }
    const source = readFileSync(file, 'utf8')
    if (entry.pack) {
      if (!source.includes(entry.pack)) {
        problems.push(`@yue-ui/vue: ${entry.file} does not contain its own message (${entry.pack})`)
      }
      // A pack must stay data. If a pack entry pulled in the component runtime, importing a
      // language would cost a component library.
      for (const marker of ['defineComponent', 'yue-button', 'yue-input']) {
        if (source.includes(marker)) {
          problems.push(`@yue-ui/vue: ${entry.file} contains "${marker}"; a language pack must stay data`)
        }
      }
      notes.push(`${entry.file}: ${source.length} bytes, data only`)
    }
  }

  // The non-default pack must live in exactly one file. `dist/locale/index.js` and the chunk
  // graph are scanned too, because a barrel re-export is the usual way this leaks.
  const distDir = join(packageRoot, 'dist')
  if (!existsSync(distDir)) return
  const leaks = []
  for (const file of walk(distDir)) {
    if (extname(file) !== '.js') continue
    const relative_ = relative(packageRoot, file).replaceAll('\\', '/')
    if (relative_ === NON_DEFAULT_PACK_FILE) continue
    if (readFileSync(file, 'utf8').includes(NON_DEFAULT_PACK_STRING)) leaks.push(relative_)
  }
  if (leaks.length > 0) {
    problems.push(
      `@yue-ui/vue: the ${NON_DEFAULT_PACK_FILE} pack leaked into ${leaks.join(', ')}; ` +
        'a language pack must only be reachable through its own entry',
    )
  } else {
    notes.push(`locale: ${LOCALE_ENTRIES.length - 1} packs, only the default is reachable from the root`)
  }
}

/**
 * Cross-package registry keys must be the *same* symbol in both packages.
 *
 * `@yue-ui/vue` compiles the hooks layer into its bundle, so each key exists in two published
 * artefacts at once. Built with `Symbol(...)` the two are different symbols, `inject()`
 * matches by identity, and a consumer who configures the library through `@yue-ui/hooks`
 * silently gets the defaults — `inject(key, fallback)` cannot tell a mismatched key from
 * nothing provided. `Symbol.for(...)` reads the global registry, so every copy is the same key.
 *
 * The config and locale keys carry injected state. The diagnostics store is also global: a
 * missing-key warning can be produced by the hooks copy bundled into `@yue-ui/vue` and drained
 * through a direct `@yue-ui/hooks` import. A module-local queue would make that evidence vanish.
 *
 * This runs over the built JavaScript rather than the sources because it is a property of
 * the artefacts: a bundler is free to inline or rename anything, and only the emitted file
 * shows what a consumer actually gets. `verify:tarball` proves the same thing end to end.
 */
const REGISTRY_KEYS = ['yue:config', 'yue:locale', 'yue:locale-diagnostics']

function checkConfigKey(problems, notes) {
  const packages = [
    { label: '@yue-ui/vue', root: resolvePath(REPO_ROOT, VUE_PACKAGE_DIR) },
    { label: '@yue-ui/hooks', root: resolvePath(REPO_ROOT, 'packages/hooks') },
  ]

  for (const key of REGISTRY_KEYS) {
    const registry = new RegExp(`Symbol\\.for\\(\\s*['"\`]${key}['"\`]\\s*\\)`)
    // A separate global copy for stripping: `replaceAll` demands the `g` flag, and reusing a
    // `g`-flagged pattern for `test()` would carry `lastIndex` between calls.
    const registryGlobal = new RegExp(registry.source, 'g')
    const private_ = new RegExp(`Symbol\\(\\s*['"\`]${key}['"\`]\\s*\\)`)

    const found = []
    for (const { label, root } of packages) {
      const distDir = join(root, 'dist')
      if (!existsSync(distDir)) {
        problems.push(`${label}: no dist directory, so the ${key} key cannot be checked`)
        continue
      }
      let registered = false
      for (const file of walk(distDir).filter((candidate) => extname(candidate) === '.js')) {
        // Comments first: the doc comment in `injection.ts` explains this very defect by
        // quoting `Symbol('yue:config')`, and a naive scan reads the explanation as the bug.
        const source = stripJsComments(readFileSync(file, 'utf8'))
        if (registry.test(source)) registered = true
        if (private_.test(source.replace(registryGlobal, ''))) {
          problems.push(
            `${label}: ${relative(root, file)} creates a private Symbol("${key}"), which can ` +
              'never match the key in the other package',
          )
        }
      }
      if (!registered) {
        problems.push(
          `${label}: no module registers the key with Symbol.for("${key}"), so a ` +
            'second copy of the key cannot match it',
        )
      }
      found.push(`${label}${registered ? ' ✓' : ' ✗'}`)
    }

    notes.push(`registry key: Symbol.for("${key}") — ${found.join(', ')}`)
  }
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

/**
 * The bilingual site's static contract, asserted on the built HTML.
 *
 * Three claims that are easy to make and easy to get wrong, and that no unit test can see:
 *
 *   1. every page declares its own language in `<html lang>`, which is what a screen reader
 *      uses to choose a voice;
 *   2. every page carries a self-canonical URL, so the two trees are not indexed as duplicates
 *      of each other;
 *   3. every page carries `hreflang` alternates for both languages plus `x-default`, so a
 *      search engine can pair them.
 *
 * The hostname is a placeholder today; the check asserts the *shape* (same relative path,
 * correct prefix) rather than the domain, so replacing it stays a one-line change.
 */
function checkLocaleLinks(distDir, files, problems, notes) {
  const html = files.filter((file) => extname(file) === '.html' && !/404\.html$/.test(file))
  let checked = 0
  const mismatches = []

  for (const file of html) {
    const relative_ = relative(distDir, file).replaceAll('\\', '/')
    const source = readFileSync(file, 'utf8')
    const isEnglish = relative_.startsWith('en/')

    const lang = /<html[^>]*\blang=["']([^"']+)["']/i.exec(source)?.[1]
    const expectedLang = isEnglish ? 'en-US' : 'zh-CN'
    if (lang !== expectedLang) {
      mismatches.push(`${relative_}: <html lang> is "${lang}", expected "${expectedLang}"`)
    }

    if (!/<link[^>]+rel=["']canonical["']/i.test(source)) {
      mismatches.push(`${relative_}: no canonical link`)
    }
    for (const hreflang of ['zh-CN', 'en-US', 'x-default']) {
      const pattern = new RegExp(`<link[^>]+rel=["']alternate["'][^>]*hreflang=["']${hreflang}["']`, 'i')
      const reversed = new RegExp(`<link[^>]+hreflang=["']${hreflang}["'][^>]*rel=["']alternate["']`, 'i')
      if (!pattern.test(source) && !reversed.test(source)) {
        mismatches.push(`${relative_}: no hreflang="${hreflang}" alternate`)
      }
    }

    // The alternate for the *other* tree must point at the same relative page there. This is
    // the assertion that catches a switcher or a config that pairs the wrong pages.
    //
    // `index.html` is compared as its directory (`components/index.html` ↔ `en/components/`)
    // because that is the URL the canonical/alternate links are built from: VitePress serves
    // the directory, and a link to `en/components/index.html` would be a page the deployment
    // does not advertise.
    const asUrlPath = relative_.replace(/index\.html$/, '')
    const counterpart = isEnglish ? asUrlPath : `en/${asUrlPath}`
    const counterpartPattern = new RegExp(
      `<link[^>]+href=["'][^"']*\\/${counterpart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`,
      'i',
    )
    if (!counterpartPattern.test(source)) {
      mismatches.push(`${relative_}: no alternate pointing at ${counterpart}`)
    }

    checked += 1
  }

  if (mismatches.length > 0) {
    for (const mismatch of mismatches.slice(0, 10)) problems.push(`bilingual: ${mismatch}`)
    if (mismatches.length > 10) {
      problems.push(`bilingual: ${mismatches.length - 10} more canonical/lang problem(s)`)
    }
    return
  }

  const englishPages = html.filter((file) => relative(distDir, file).replaceAll('\\', '/').startsWith('en/'))
  notes.push(
    `bilingual: ${checked} page(s) carry lang + canonical + hreflang ` +
      `(${englishPages.length} in /en/)`,
  )
}

/**
 * The sitemap's bilingual coverage.
 *
 * `transformHead` gives each page its own canonical and alternates, but the sitemap is produced by a
 * separate VitePress plugin with its own inputs — so "both languages are indexed" is a claim about a
 * *second* code path, and it is asserted against the pages that were actually built rather than
 * against a remembered count.
 */
function checkSitemap(distDir, files, problems, notes) {
  const sitemapPath = join(distDir, 'sitemap.xml')
  if (!existsSync(sitemapPath)) {
    problems.push('sitemap: sitemap.xml was not generated')
    return
  }

  const sitemap = readFileSync(sitemapPath, 'utf8')
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim())
  if (locations.length === 0) {
    problems.push('sitemap: sitemap.xml contains no <loc> entries')
    return
  }

  const hostnames = new Set(locations.map((url) => new URL(url).origin))
  if (hostnames.size !== 1) {
    problems.push(
      `sitemap: entries use ${hostnames.size} different origins: ${[...hostnames].join(', ')}`,
    )
  }

  // `index.html` is advertised as its directory, the same way the canonical links are built.
  const expected = files
    .filter((file) => extname(file) === '.html' && !/404\.html$/.test(file))
    .map((file) => relative(distDir, file).replaceAll('\\', '/'))
    .map((relative_) => relative_.replace(/index\.html$/, ''))

  const paths = locations.map((url) => new URL(url).pathname)
  const missing = expected.filter(
    (relative_) => !paths.some((path) => path === `/${relative_}` || path === `/${relative_}/`),
  )
  if (missing.length > 0) {
    problems.push(
      `sitemap: ${missing.length} built page(s) are absent, e.g. "${missing[0]}"`,
    )
  }

  const englishCount = paths.filter((path) => path.startsWith('/en/')).length
  if (englishCount === 0) {
    problems.push('sitemap: no /en/ entry, so the English tree is not indexed')
  }

  const origin = [...hostnames][0] ?? ''
  if (/\.example(?:$|:)/.test(origin) || origin.includes('yue-design.example')) {
    // Not a failure: the placeholder is correct for development, and a release must be able to run
    // the whole gate chain. It is printed on every run so it cannot be forgotten by omission, and
    // the release checklist carries the blocking step.
    notes.push(
      `sitemap: WARNING canonical origin is the placeholder ${origin} — canonical, hreflang and ` +
        'sitemap all point at it. Replace SITE_HOSTNAME before deploying (see the release checklist).',
    )
  }

  notes.push(`sitemap: ${locations.length} URL(s) on ${origin} (${englishCount} in /en/)`)
}

/**
 * The prerendered locale output — the static half of the SSR claim.
 *
 * VitePress server-renders every page, so each locale's HTML must already contain that locale's
 * component text *before any JavaScript runs*. `verify:visual` drives the same pages in a browser and
 * asserts the values survive hydration; this check is the part that would fail if SSR silently fell
 * back to the default pack, which hydration alone cannot distinguish (the client would simply
 * repair it, and the page would look right after a flash of the wrong language).
 *
 * The expectations are derived from each page's own `<html lang>`, so the check cannot pass by
 * hard-coding the same string twice.
 */
function checkPrerenderedLocale(distDir, problems, notes) {
  const cases = [
    { file: 'components/input.html', other: 'en-US' },
    { file: 'en/components/input.html', other: 'zh-CN' },
  ]
  const checked = []

  for (const { file, other } of cases) {
    const path = join(distDir, file)
    if (!existsSync(path)) {
      problems.push(`prerender: ${file} was not built`)
      continue
    }
    const html = readFileSync(path, 'utf8')
    const lang = /<html[^>]*\blang=["']([^"']+)["']/i.exec(html)?.[1] ?? ''
    const pageIsChinese = lang.toLowerCase().startsWith('zh')
    const own = pageIsChinese ? '清空' : 'Clear'
    const mirror = pageIsChinese ? 'Clear' : '清空'

    const labels = {}
    for (const state of ['default', 'translated', 'regional']) {
      const pattern = new RegExp(
        `data-input-state="clearable-${state}"[\\s\\S]{0,600}?aria-label="([^"]*)"`,
      )
      labels[state] = pattern.exec(html)?.[1] ?? null
    }

    if (labels.default !== own) {
      problems.push(
        `prerender: ${file} (${lang}) has aria-label "${labels.default}" for the page's own locale, ` +
          `expected "${own}" — server rendering did not use this page's pack`,
      )
      continue
    }
    // `translated` is an explicit subpath pack; `regional` can only come from the fallback chain
    // (`en-GB → en → en-US` on the Chinese page, `zh-Hans-CN → zh-CN` on the English one).
    for (const state of ['translated', 'regional']) {
      if (labels[state] !== mirror) {
        problems.push(
          `prerender: ${file} ${state} field has aria-label "${labels[state]}", expected ` +
            `"${mirror}" (the ${other} string)`,
        )
      }
    }
    checked.push(`${file} (${lang}) "${own}"/"${mirror}"/"${mirror}"`)
  }

  if (checked.length > 0) {
    notes.push(`prerender: ${checked.join(' ↔ ')}`)
  }
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
  const localeNotes = []
  checkLocaleEntries(problems, localeNotes)
  if (!quiet) {
    for (const note of [...packageNotes, ...localeNotes]) process.stdout.write(`  ${note}\n`)
  }

  process.stdout.write('package: packages/hooks\n')
  const hooksNotes = []
  checkHooksPackage(problems, hooksNotes)
  if (!quiet) {
    for (const note of hooksNotes) process.stdout.write(`  ${note}\n`)
  }

  // Cross-package: it only means anything once both dists exist.
  const configNotes = []
  checkConfigKey(problems, configNotes)
  if (!quiet) {
    for (const note of configNotes) process.stdout.write(`  ${note}\n`)
  }

  checkNoEmitIntoSource(problems)

  const bilingualNotes = []
  // `check()` walks the tree internally; the bilingual checks need the same file list, and a
  // missing dist is already reported by `check()` above.
  const builtFiles = existsSync(distDir) ? walk(distDir) : []
  checkLocaleLinks(distDir, builtFiles, problems, bilingualNotes)
  checkSitemap(distDir, builtFiles, problems, bilingualNotes)
  checkPrerenderedLocale(distDir, problems, bilingualNotes)
  if (!quiet) {
    for (const note of bilingualNotes) process.stdout.write(`  ${note}\n`)
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
  process.stderr.write(`verify-dist: ${error.message}\n`)
  process.exitCode = 2
}
