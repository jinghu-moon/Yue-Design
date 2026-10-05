#!/usr/bin/env node
/**
 * Tree-shaking verification for @yue-ui/vue.
 *
 * Three temporary consumers, three builds, and assertions on the real output:
 *
 *   1. `@yue-ui/vue/button` + `@yue-ui/vue/button.css` must contain the Button and
 *      its CSS, and must NOT contain the plugin's registry, the install helper,
 *      the other components, the Dialog, or a Reka UI primitive.
 *   2. `@yue-ui/vue/input` + `@yue-ui/vue/input.css` must contain the Input and its
 *      CSS, and must NOT contain the registry, the install helper, or the Button.
 *   3. `@yue-ui/vue/plugin` + `@yue-ui/vue/style.css` must contain all of it.
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

/** The single-component entries must each be self-sufficient… */
const BUTTON_JS_MUST = [
  'YueButton',
  // The Button entry is the Button *family*: the group, the toggle and the item ship from
  // the same module and the same stylesheet, so the consumer who imports `button` gets all
  // four and the consumer who imports nothing else gets no more than these.
  'YueButtonGroup',
  'YueButtonToggle',
  'YueButtonToggleItem',
]
const BUTTON_CSS_MUST = [
  '.yue-button',
  'yue-button--primary',
  'yue-button__spinner',
  'yue-button__loader',
  'yue-button-group',
  'is-active',
]

const INPUT_JS_MUST = ['YueInput']
const INPUT_CSS_MUST = [
  '.yue-input',
  'yue-input__native',
  // `--md` has no rule of its own: it is the base block, like `yue-button--md`. The
  // size ramp is asserted through the two modifiers that do have rules.
  'yue-input--sm',
  'yue-input--lg',
  'yue-input__clear',
  'is-invalid',
]

// Rolldown inlines and minifies Floating UI's named exports; its collision engine is
// identified by the stable algorithm marker that survives that transform.
const POPOVER_JS_MUST = ['YuePopover', 'detectOverflow']
const POPOVER_CSS_MUST = ['.yue-popover', '--popover-background', 'prefers-reduced-motion', 'forced-colors']

// Dialog is a hand-written modal, so its entry is identified by the `defineOptions` name
// (a JS string literal that survives bundling) and its stylesheet by the composed class.
// Floating UI must not appear: the dialog is centred by CSS; the Q25 fly-in is a hand-computed
// translate delta from the trigger's bounding rect, not a Floating UI anchor/positioning dependency.
const DIALOG_JS_MUST = ['YueDialog']
const DIALOG_CSS_MUST = ['.yue-dialog', '--dialog-width-md', 'prefers-reduced-motion', 'forced-colors']
/**
 * …and must not drag in the registration path, nor the other component.
 *
 * The cross-component assertions are the ones that needed a second component to exist
 * at all: they are what proves `@yue-ui/vue/button` and `@yue-ui/vue/input` are two
 * graphs rather than one barrel with two names.
 *
 * These are property and method accesses, not local function names: `@yue-ui/hooks`
 * is bundled (not external), so rollup is free to rename its bindings, and an
 * assertion on a name would either be brittle or quietly vacuous. `.component(` and
 * `.provide(` survive any rename and exist only on the plugin's install path.
 *
 * `Object.entries(` used to be on this list, and had to come off: `YueInput` routes its
 * attributes with `Object.entries(attrs)`, so the marker stopped being plugin-only the
 * moment a second component existed. It was a marker over-fitted to one component's
 * implementation, which is precisely the failure mode a "must not contain" list is
 * supposed to avoid — hence the positive cross-check below, which cannot be renamed or
 * coincidentally satisfied: the plugin bundle must contain *both* component names while
 * each single entry contains exactly one.
 */
const PLUGIN_ONLY_JS = [
  '.component(',
  '.provide(',
  // Dialog exists now as its own entry, so these are the live cross-contamination guards they
  // were written to become: `YueDialog` reaches a bundle only through its subpath or the plugin,
  // never through the graph of an unrelated single-component consumer.
  'YueDialog',
  'yue-dialog',
  // Reka UI is reserved for Popover/Dialog and must never appear in the graph of
  // a hand-written component.
  'reka-ui',
  'RekaPortal',
]

const BUTTON_JS_MUST_NOT = [...PLUGIN_ONLY_JS, 'YueInput', 'yue-input']
const INPUT_JS_MUST_NOT = [...PLUGIN_ONLY_JS, 'YueButton', 'yue-button']
const INPUT_CSS_MUST_NOT = ['.yue-button']
const POPOVER_JS_MUST_NOT = [...PLUGIN_ONLY_JS, 'YueButton', 'YueInput', 'YueButtonGroup']
const POPOVER_CSS_MUST_NOT = ['.yue-button', '.yue-input']
// The Dialog entry is a single-component graph of its own: it must carry the plugin registry
// nothing, and must not reach into any other component. `YueDialog`/`yue-dialog` are excluded
// from the must-not list because they are this entry's own payload.
const DIALOG_JS_MUST_NOT = [
  '.component(',
  '.provide(',
  'reka-ui',
  'RekaPortal',
  'YueButton',
  'YueInput',
  'YuePopover',
  // The Q25 fly-in is a hand-computed translate delta from getBoundingClientRect, not a positioning
  // problem: a modal is centred by CSS and its trigger cannot move while the background is scroll-
  // locked + inert. Floating UI stays quarantined to Popover, so it is now an explicit ban (was
  // previously implied by the size budget + intent comment only).
  '@floating-ui',
  'computePosition',
]
const DIALOG_CSS_MUST_NOT = ['.yue-button', '.yue-input', '.yue-popover', '--popover-background']

const PLUGIN_JS_MUST = [
  'YueButton',
  'YueButtonGroup',
  'YueButtonToggle',
  'YueButtonToggleItem',
  'YueInput',
  'YuePopover',
  'YueDialog',
  '.component(',
  '.provide(',
  'Object.entries(',
]
const PLUGIN_CSS_MUST = ['.yue-button', '.yue-button-group', '.yue-input', '.yue-popover', '.yue-dialog']

/**
 * A single language pack, imported on its own.
 *
 * `清空` is the zh-CN value of `input.clear`, so its presence proves the pack reached the bundle.
 * The `must not` list is the other half of the claim: a pack is data, so the component runtime,
 * the buttons' class namespace and the catalog's other locale must all be absent.
 */
const LOCALE_JS_MUST = ['清空']
const LOCALE_JS_MUST_NOT = [
  'defineComponent',
  'yue-button',
  'yue-input',
  // The default pack, which only travels with the components that need a default.
  'Clear',
]

/**
 * Recorded size budget, in bytes.
 *
 * Measured sizes, plus roughly 20% headroom: the point is to catch a graph that grew in kind — a
 * dependency pulled in, a runtime duplicated, all locales preloaded — not to fail on a renamed
 * variable. The ceiling is written down rather than derived from the last run, because a budget
 * that follows the code never fails.
 *
 * The single-locale entry is the interesting one: 90 bytes of data with no CSS. A pack that started
 * importing the component runtime, or a component entry that started carrying the catalog and both
 * packs, would blow past these numbers immediately.
 */
const BUDGET = {
  button: { js: 10_000, css: 20_000 },
  input: { js: 15_000, css: 14_000 },
  popover: { js: 45_000, css: 3_000 },
  // Dialog is a hand-written modal: no Floating UI, so its JS is the component plus the shared
  // overlay stack and the en-US default pack, inlined and un-minified in this consumer build
  // (measured 19376B js / 6924B css). Ceiling is set just above the measurement.
  // CSS ceiling raised 7_500 -> 8_000 when the fullscreen surface got its own sheet entrance
  // (translateY instead of the viewport-wide scale, Q16), then 8_000 -> 8_500 and js 20_000 ->
  // 21_000 for the Q25 fly-in (a hand-computed translate delta in the component + the enter-from
  // transform rule). Raised again 21_000 -> 22_500 js / 8_500 -> 9_000 css for the review-phase
  // modal capability set (B1 activate/deactivate + onMounted, B2 isModal decoupled from surface,
  // B3 visibility focus test, C1 busy/spinner guard, C2 show* actions, C3 per-part classNames/
  // styles, C4 lazy mount, C5 modeless, C6 close-icon slot): measured now 21834B js / 8755B css.
  // Reviewed feature additions, not graph growth — still no Floating UI, no duplicated runtime.
  dialog: { js: 22_500, css: 9_000 },
  // plugin budget raised when YueTag + YueCheckTag were added (Tag family: +775B js, +3822B css).
  // The CheckTag theme support adds per-theme selected palettes: the plugin stylesheet measures 42378B,
  // and the budget is set just above that measurement rather than leaving room to grow into.
  // Popover is part of the full plugin graph and carries Floating UI's positioning engine.
  // The graph grew again when Dialog joined it (measured 69023B js / 52804B css), and with the
  // Dialog review-phase capability set (see the dialog budget note): measured now 71550B js /
  // 54635B css, so the plugin ceiling follows to 72_500 js / 55_500 css.
  plugin: { js: 72_500, css: 55_500 },
  // Rolldown preserves fixture comments in this unminified consumer build; 750B
  // covers the measured output without making the budget follow future growth.
  // Raised to 800B after the dialog.* labels (confirm/cancel/closeLabel) were added to every
  // pack in the i18n stage; the zh-CN bundle now measures 763B (still data only, no components).
  locale: { js: 800, css: 0 },
}

const problems = []
const notes = []

const fail = (message) => problems.push(message)

/**
 * Fail when a build exceeds its recorded budget.
 *
 * @param {string} mode
 * @param {{ js: string, css: string } | null} output
 */
function checkBudget(mode, output) {
  if (!output) return
  const budget = BUDGET[mode]
  if (!budget) {
    fail(`${mode}: no size budget is recorded for this mode`)
    return
  }
  if (output.js.length > budget.js) {
    fail(
      `${mode}: bundle.js is ${output.js.length}B, over the recorded budget of ${budget.js}B — ` +
        'if the growth is intended, raise the budget in the same change and say why',
    )
  }
  if (output.css.length > budget.css) {
    fail(
      `${mode}: bundle.css is ${output.css.length}B, over the recorded budget of ${budget.css}B`,
    )
  }
  notes.push(
    `${mode} budget: js ${output.js.length}/${budget.js}B, css ${output.css.length}/${budget.css}B`,
  )
}

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

const stripJsComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')

/**
 * Read one mode's build output.
 *
 * `requireCss` is false for the language-pack consumer: a pack imports no stylesheet, and its
 * *absence* is part of what that mode asserts — data must not drag CSS along.
 */
function readOutputs(mode, { requireCss = true } = {}) {
  const dir = join(DIST, mode)
  const jsPath = join(dir, 'bundle.js')
  const cssPath = join(dir, 'bundle.css')
  if (!existsSync(jsPath)) {
    fail(`${mode}: expected ${relative(REPO_ROOT, jsPath)} to exist`)
    return null
  }
  if (requireCss && !existsSync(cssPath)) {
    fail(`${mode}: expected ${relative(REPO_ROOT, cssPath)} to exist (CSS was not emitted)`)
    return null
  }
  return {
    js: readFileSync(jsPath, 'utf8'),
    css: existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '',
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

  for (const mode of ['button', 'input', 'popover', 'dialog', 'plugin', 'locale']) {
    process.stdout.write(`building ${mode} consumer…\n`)
    await buildMode(mode)
  }

  const button = readOutputs('button')
  if (button) {
    const code = stripJsComments(button.js)
    expectContains('button js', code, BUTTON_JS_MUST)
    expectContains('button css', button.css, BUTTON_CSS_MUST)
    expectAbsent('button js', code, BUTTON_JS_MUST_NOT)
    notes.push(`button: bundle.js ${button.js.length}B, bundle.css ${button.css.length}B`)
  }

  const input = readOutputs('input')
  if (input) {
    const code = stripJsComments(input.js)
    expectContains('input js', code, INPUT_JS_MUST)
    expectContains('input css', input.css, INPUT_CSS_MUST)
    expectAbsent('input js', code, INPUT_JS_MUST_NOT)
    expectAbsent('input css', input.css, INPUT_CSS_MUST_NOT)
    notes.push(`input: bundle.js ${input.js.length}B, bundle.css ${input.css.length}B`)
  }

  const popover = readOutputs('popover')
  if (popover) {
    const code = stripJsComments(popover.js)
    expectContains('popover js', code, POPOVER_JS_MUST)
    expectContains('popover css', popover.css, POPOVER_CSS_MUST)
    expectAbsent('popover js', code, POPOVER_JS_MUST_NOT)
    expectAbsent('popover css', popover.css, POPOVER_CSS_MUST_NOT)
    notes.push(`popover: bundle.js ${popover.js.length}B, bundle.css ${popover.css.length}B`)
  }

  const dialog = readOutputs('dialog')
  if (dialog) {
    const code = stripJsComments(dialog.js)
    expectContains('dialog js', code, DIALOG_JS_MUST)
    expectContains('dialog css', dialog.css, DIALOG_CSS_MUST)
    expectAbsent('dialog js', code, DIALOG_JS_MUST_NOT)
    expectAbsent('dialog css', dialog.css, DIALOG_CSS_MUST_NOT)
    notes.push(`dialog: bundle.js ${dialog.js.length}B, bundle.css ${dialog.css.length}B`)
  }

  // A language pack is data: importing `@yue-ui/vue/locale/zh-CN` must not pull the component
  // library, and the pack itself must survive into the bundle. Both halves matter — without the
  // first the subpath is pointless, and without the second the module could have been dropped and
  // the assertion would pass for the wrong reason.
  const locale = readOutputs('locale', { requireCss: false })
  if (locale) {
    const code = stripJsComments(locale.js)
    expectContains('locale js', code, LOCALE_JS_MUST)
    expectAbsent('locale js', code, LOCALE_JS_MUST_NOT)
    if (locale.css !== '') {
      fail('locale: the pack entry emitted CSS, so importing a language pulls a stylesheet')
    }
    notes.push(`locale: bundle.js ${locale.js.length}B (one pack, no components, no CSS)`)
  }

  // The default language pack must not travel with the component entries: an English application
  // downloads English strings and no Chinese ones, and vice versa.
  if (button && stripJsComments(button.js).includes('清空')) {
    fail('button js: contains the zh-CN pack, so a language pack leaked into the component entry')
  }
  if (input && stripJsComments(input.js).includes('清空')) {
    fail('input js: contains the zh-CN pack, which only the pack subpath should carry')
  }

  const plugin = readOutputs('plugin')
  if (plugin) {
    expectContains('plugin js', stripJsComments(plugin.js), PLUGIN_JS_MUST)
    expectContains('plugin css', plugin.css, PLUGIN_CSS_MUST)
    notes.push(`plugin: bundle.js ${plugin.js.length}B, bundle.css ${plugin.css.length}B`)
  }

  // The entries must genuinely differ, or the split is decorative.
  for (const single of [['button', button], ['input', input]]) {
    const [label, output] = single
    if (!output || !plugin) continue
    if (plugin.js.length <= output.js.length) {
      fail(
        `plugin: bundle is not larger than the ${label} bundle, so the two ` +
          'entries are not actually different graphs',
      )
    }
    if (plugin.css.length <= output.css.length) {
      fail(
        `plugin: stylesheet is not larger than the ${label} stylesheet, so ` +
          `\`style.css\` is not aggregating more than \`${label}.css\``,
      )
    }
  }

  // Neither single-component bundle may contain the other component. Unlike the marker
  // list above, these names are string literals from `defineOptions({ name })`, so a
  // rename by the bundler cannot make the assertion vacuous.
  for (const [label, output, other] of [
    ['button', button, 'YueInput'],
    ['input', input, 'YueButton'],
  ]) {
    if (output && stripJsComments(output.js).includes(other)) {
      fail(`${label} js: contains ${other}, so the entry is not a single-component graph`)
    }
  }

  // Neither single-component sheet may contain the other component's rules. This is
  // the CSS half of the cross-contamination check: `style.css` is assembled by
  // `scripts/build-style.mjs`, and a mistake there (an over-eager glob) would be
  // invisible to the JS assertions above.
  if (button && input) {
    if (button.css.includes('.yue-input')) {
      fail('button css: contains Input rules, so `button.css` is not the Button sheet alone')
    }
    if (input.css.includes('.yue-button')) {
      fail('input css: contains Button rules, so `input.css` is not the Input sheet alone')
    }
  }

  // The recorded budget, checked for every mode: a graph that grew in kind rather than in detail
  // fails here even when every marker assertion above still passes.
  for (const [mode, output] of [
    ['button', button],
    ['input', input],
    ['plugin', plugin],
    ['dialog', dialog],
    ['locale', locale],
  ]) {
    checkBudget(mode, output)
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
