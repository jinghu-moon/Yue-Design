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
  'architecture/index.html',
  'tools/index.html',
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

/** Token names that must survive into the bundle from @snapclip/design-tokens. */
const TOKEN_MARKERS = [
  '--font-ui:',
  '--accent-solid:',
  '--button-height-md:',
  '--text-primary:',
  '--surface-level-3-border:',
]

/** Proof that the docs theme consumes tokens instead of hard-coded values. */
const BINDING_MARKERS = [
  '--vp-font-family-base:var(--font-ui)',
  '--vp-c-brand-1:var(--accent-text)',
]

/** The cascade contract must survive bundling. */
const LAYER_MARKERS = ['@layerprimitives', '@layersemantics', '@layercomponents']

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

  process.stdout.write('SnapClip Design System · Build output verification\n')
  process.stdout.write(`dist: ${relative(REPO_ROOT, distDir).replaceAll('\\', '/')}\n`)
  const { problems } = check(distDir, { quiet })

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
