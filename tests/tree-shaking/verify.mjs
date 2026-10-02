#!/usr/bin/env node
/**
 * Tree-shaking verification for @yue-ui/vue.
 *
 * Two temporary consumers, two builds, and assertions on the real output:
 *
 *   1. `@yue-ui/vue/button` + `@yue-ui/vue/button.css` must contain the Button and
 *      its CSS, and must NOT contain the plugin's registry, the install helper,
 *      any Dialog (there is none yet — that assertion is the guard for when there
 *      is), or a Reka UI primitive.
 *   2. `@yue-ui/vue/plugin` + `@yue-ui/vue/style.css` must contain all of it.
 *
 * Two details make this a statement about what a consumer installs rather than
 * about workspace source:
 *
 *   - the specifiers resolve through the packages' real `exports` maps, because
 *     the root declares them as workspace dependencies;
 *   - `vue` is the only external, so everything `@yue-ui/*` ships is inlined and
 *     therefore inspectable.
 *
 * Class names are asserted against the CSS and identifiers against the JS:
 * `.yue-button` is composed at runtime from the fixed namespace constant, so the
 * literal never appears in JavaScript.
 *
 * Usage: node tests/tree-shaking/verify.mjs
 */
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, loadConfigFromFile } from 'vite'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url))
const DIST = join(HERE, 'dist')

/** The single-component entry must be self-sufficient… */
const BUTTON_JS_MUST = ['YueButton']
const BUTTON_CSS_MUST = ['.yue-button', 'yue-button--primary', 'yue-button__spinner']
/**
 * …and must not drag in the registration path, nor another component.
 *
 * These are property and method accesses, not local function names: `@yue-ui/hooks`
 * is bundled (not external), so rollup is free to rename its bindings, and an
 * assertion on a name would either be brittle or quietly vacuous. `.component(`,
 * `.provide(` and `Object.entries(` survive any rename and exist only on the
 * plugin's install path.
 */
const BUTTON_JS_MUST_NOT = [
  '.component(',
  '.provide(',
  'Object.entries(',
  // Dialog does not exist yet. These keep the assertion meaningful for when it
  // does, so adding one to the plugin cannot silently leak into every entry.
  'YueDialog',
  'yue-dialog',
  // Reka UI is reserved for Popover/Dialog and must never appear in the graph of
  // a hand-written component.
  'reka-ui',
  'RekaPortal',
]

const PLUGIN_JS_MUST = ['YueButton', '.component(', '.provide(', 'Object.entries(']
const PLUGIN_CSS_MUST = ['.yue-button']

const problems = []
const notes = []

const fail = (message) => problems.push(message)

function expectContains(label, text, markers) {
  for (const marker of markers) {
    if (!text.includes(marker)) fail(`${label}: output is missing "${marker}"`)
  }
}

function expectAbsent(label, text, markers) {
  for (const marker of markers) {
    if (text.includes(marker)) fail(`${label}: output unexpectedly contains "${marker}"`)
  }
}

function readOutputs(mode) {
  const dir = join(DIST, mode)
  const jsPath = join(dir, 'bundle.js')
  const cssPath = join(dir, 'bundle.css')
  if (!existsSync(jsPath)) {
    fail(`${mode}: expected ${relative(REPO_ROOT, jsPath)} to exist`)
    return null
  }
  if (!existsSync(cssPath)) {
    fail(`${mode}: expected ${relative(REPO_ROOT, cssPath)} to exist (CSS was not emitted)`)
    return null
  }
  return {
    js: readFileSync(jsPath, 'utf8'),
    css: readFileSync(cssPath, 'utf8'),
  }
}

async function buildMode(mode) {
  const loaded = await loadConfigFromFile(
    { command: 'build', mode },
    join(HERE, 'vite.config.ts'),
    HERE,
  )
  if (!loaded) throw new Error(`could not load vite.config.ts for mode "${mode}"`)
  // `configFile: false` because the loader already resolved it; letting Vite load
  // it again would re-run the same config.
  await build({ ...loaded.config, configFile: false, logLevel: 'warn' })
}

async function main() {
  // Start from nothing, so a stale artefact can never make a build look like it
  // produced something it did not.
  rmSync(DIST, { recursive: true, force: true })

  // This check reads the built packages, so a missing dist must be an error with
  // instructions rather than a confusing resolution failure inside Vite.
  for (const dir of ['packages/vue/dist', 'packages/hooks/dist']) {
    if (!existsSync(join(REPO_ROOT, dir))) {
      process.stderr.write(
        `tree-shaking: ${dir} is missing.\n` +
          'This check reads the built packages through their `exports` map, so run\n' +
          '`corepack pnpm build` first.\n',
      )
      return 2
    }
  }

  for (const mode of ['button', 'plugin']) {
    process.stdout.write(`building ${mode} consumer…\n`)
    await buildMode(mode)
  }

  const button = readOutputs('button')
  if (button) {
    expectContains('button js', button.js, BUTTON_JS_MUST)
    expectContains('button css', button.css, BUTTON_CSS_MUST)
    expectAbsent('button js', button.js, BUTTON_JS_MUST_NOT)
    notes.push(`button: bundle.js ${button.js.length}B, bundle.css ${button.css.length}B`)
  }

  const plugin = readOutputs('plugin')
  if (plugin) {
    expectContains('plugin js', plugin.js, PLUGIN_JS_MUST)
    expectContains('plugin css', plugin.css, PLUGIN_CSS_MUST)
    notes.push(`plugin: bundle.js ${plugin.js.length}B, bundle.css ${plugin.css.length}B`)
  }

  // The two entries must genuinely differ, or the split is decorative.
  if (button && plugin && plugin.js.length <= button.js.length) {
    fail(
      'plugin: bundle is not larger than the single-component bundle, so the two ' +
        'entries are not actually different graphs',
    )
  }
  if (button && plugin && plugin.css.length <= button.css.length) {
    fail(
      'plugin: stylesheet is not larger than the single-component stylesheet, so ' +
        '`style.css` is not aggregating more than `button.css`',
    )
  }

  for (const note of notes) process.stdout.write(`  ${note}\n`)

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
  process.exitCode = await main()
} catch (error) {
  process.stderr.write(`tree-shaking: ${error.message}\n`)
  process.exitCode = 2
}
