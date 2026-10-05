#!/usr/bin/env node
/**
 * Tarball consumption verification.
 *
 * Everything else in this repository resolves `@yue-ui/*` through workspace
 * links, which can hide a broken `exports` map, a missing declaration file, or a
 * CSS path that only exists inside the monorepo. This check installs the *packed*
 * tarballs into a throwaway project outside the workspace and uses them the way a
 * stranger would.
 *
 * The consumer deliberately lives in the OS temp directory. Inside the repository
 * tree a bare `@yue-ui/vue` would still resolve to the root's workspace link if
 * the tarball install failed, and the check would pass for the wrong reason — so
 * every resolved path is also asserted to be inside the consumer.
 *
 * Verified:
 *   1. `packages/tokens`, `packages/hooks` and `packages/vue` produce tarballs;
 *   2. installing them with plain pnpm (no workspace, no `link:`) succeeds;
 *   3. every documented subpath resolves — from Node — to a file inside the
 *      consumer's own `node_modules`, and the ESM entries are importable without
 *      a bundler;
 *   4. the shipped declarations type-check a normal TypeScript consumer;
 *   5. each CSS entry point exists and pulls in nothing external;
 *   6. a real Vite build of the consumer renders a real `YueButton` in a browser,
 *      with the token-driven fill and font applied.
 *
 * Usage: node tools/verify-tarball.mjs [--keep]
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import { chromium } from 'playwright-core'

const REPO_ROOT = fileURLToPath(new URL('../', import.meta.url))
const KEEP = process.argv.includes('--keep')

const problems = []
const notes = []
const fail = (message) => problems.push(message)

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...options,
  })
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed (${result.status})\n${result.stdout ?? ''}${result.stderr ?? ''}`,
    )
  }
  return result
}

/* ------------------------------------------------------------------ *
 * 1 — pack
 * ------------------------------------------------------------------ */

function packPackages(destination) {
  const tarballs = {}
  // The two packages §15 names, plus `@yue-ui/hooks`.
  //
  // Hooks is packed even though `@yue-ui/vue` compiles it in, because it is also
  // published in its own right — and that artefact is emitted by `tsc`, not by a
  // bundler. A missing `.js` on a relative import therefore passes every in-repo
  // test (they all resolve through Vite or workspace links) and then fails the
  // moment a consumer installs it. It is only reachable by installing it.
  const packages = [
    ['design-tokens', 'packages/tokens'],
    ['hooks', 'packages/hooks'],
    ['vue', 'packages/vue'],
  ]

  for (const [stem, dir] of packages) {
    run('corepack', ['pnpm', '-C', dir, 'pack', '--pack-destination', destination], {
      cwd: REPO_ROOT,
    })
    const match = readdirSync(destination)
      .filter((file) => file.endsWith('.tgz'))
      .find((file) => file.startsWith(`yue-ui-${stem}-`))
    if (!match) throw new Error(`pnpm pack produced no tarball for ${dir}`)
    tarballs[stem] = join(destination, match)
    notes.push(`packed ${dir} → ${match}`)
  }
  return tarballs
}

/* ------------------------------------------------------------------ *
 * 2 — a real consumer project
 * ------------------------------------------------------------------ */

function writeConsumer(consumer) {
  const write = (name, contents) => writeFileSync(join(consumer, name), contents, 'utf8')

  write(
    'package.json',
    `${JSON.stringify({ name: 'yue-tarball-consumer', private: true, version: '0.0.0', type: 'module' }, null, 2)}\n`,
  )

  write(
    'index.html',
    '<!doctype html><html><head>' +
      // A declared icon stops the browser from probing /favicon.ico, which would
      // otherwise 404 against the throwaway static server and show up as a
      // console error that has nothing to do with the packages.
      '<link rel="icon" href="data:,">' +
      '</head><body><div id="app"></div>' +
      '<script type="module" src="/entry.ts"></script></body></html>\n',
  )

  // Exactly the documented consumer surface, and nothing else. The one addition
  // is applying the type token to the page, which is the host's job: the Button
  // itself only inherits `font-family`.
  //
  // Two buttons are mounted on purpose: one through the single-component entry, and
  // one registered globally by the plugin *with options*. That covers the plugin's
  // runtime path end to end — registration, configuration and styling together —
  // which is where a class namespace that disagreed with the stylesheet would show
  // up as an unstyled button.
  write(
    'consumer.css',
    `body {
  font-family: var(--font-ui);
  background: var(--page);
  color: var(--text-primary);
}
`,
  )

  // A second page for the prototype-era selector archive (`implementations.css`). The audit of the
  // Phase 6 handoff found that nothing rendered this file: it was asserted to be parseable and
  // declaration-free, but no browser ever proved the archive produces the styles it promises — and the
  // archive is an opt-in entry precisely so that a consumer can rely on it deliberately.
  write(
    'prototype.html',
    '<!doctype html><html><head><link rel="icon" href="data:,"></head><body>' +
      '<button class="btn" id="archive-btn" data-size="md">Save</button>' +
      '<div class="field" id="archive-field"><label for="archive-input">Name</label>' +
      '<input class="input" id="archive-input" /></div>' +
      '<div class="list"><div class="list-row" id="archive-list">Row</div></div>' +
      '<div class="overlay" id="archive-overlay"></div>' +
      '<div class="box" id="archive-box" data-tone="subtle"></div>' +
      '<div class="status" id="archive-status"><span>OK</span></div>' +
      '<a class="link" id="archive-link" href="#">Link</a>' +
      '<button class="btn" id="archive-hover-btn">Hover</button>' +
      '<button class="btn" id="archive-disabled-btn" disabled>Disabled</button>' +
      '<div class="box" id="archive-bordered-box" data-bordered></div>' +
      '<script type="module" src="/prototype-entry.ts"></script></body></html>\n',
  )

  write(
    'prototype-entry.ts',
    `import '@yue-ui/design-tokens/index.css'
import '@yue-ui/design-tokens/implementations.css'
`,
  )

  write(
    'entry.ts',
    `import { createApp, h, resolveComponent } from 'vue'
import YueButton from '@yue-ui/vue/button'
import YueInput from '@yue-ui/vue/input'
import YuePopover from '@yue-ui/vue/popover'
import YueDialog from '@yue-ui/vue/dialog'
import YueUI from '@yue-ui/vue/plugin'
// Imported from the *hooks* tarball, not from @yue-ui/vue, on purpose: this is the
// cross-package path. @yue-ui/vue compiles hooks into its bundle, so the locale injection
// key exists twice in this install, and it only works if both copies ask the global symbol
// registry for it. With a private Symbol() the key would differ, inject() would find nothing,
// and this subtree would quietly render the default language instead.
import { provideLocale } from '@yue-ui/hooks'
// A language pack is its own entry: importing it is the only way it reaches the bundle.
import ZhCN from '@yue-ui/vue/locale/zh-CN'
// The engine Yue does *not* depend on. It is installed here because the adapter contract is a
// published promise: an application's own translation system must be able to own Yue's text.
import { createI18n } from 'vue-i18n'
import '@yue-ui/design-tokens/index.css'
import '@yue-ui/vue/button.css'
import '@yue-ui/vue/input.css'
import '@yue-ui/vue/popover.css'
import '@yue-ui/vue/dialog.css'
import './consumer.css'

/**
 * The vue-i18n adapter, inline.
 *
 * Byte-for-byte the shape the documentation shows: "current" is the engine's own ref, "t"
 * forwards the Yue key unchanged, and "n"/"d" are omitted so Yue keeps its own Intl formatting.
 * It lives here rather than in a published package because phase 5 of the I18N roadmap says to
 * prove the contract with a real consumer before adding an entry point and a peer dependency.
 */
function vueI18nAdapter(composer) {
  return {
    current: composer.locale,
    t: (key, params) => (params === undefined ? composer.t(key) : composer.t(key, params)),
  }
}

const engine = createI18n({
  legacy: false,
  locale: 'en-US',
  fallbackLocale: 'en-US',
  messages: {
    'en-US': { input: { clear: 'Clear' } },
    'zh-CN': { input: { clear: '清空' } },
  },
})

// The browser check drives the *engine's* language, not Yue's, to prove the two share one ref.
globalThis.__setEngineLocale = (locale) => {
  engine.global.locale.value = locale
}

/** A subtree whose locale comes from the application's engine rather than from Yue's packs. */
const EngineScoped = {
  setup(_, { slots }) {
    provideLocale({ adapter: vueI18nAdapter(engine.global) })
    return () => slots.default?.()
  },
}

/**
 * A wrapper that scopes a language through the separately-installed hooks package.
 *
 * Deliberately a component rather than a top-level call, so it exercises provide/inject
 * across the package boundary the way a consumer's locale wrapper would. It overrides one
 * string *and* keeps the application's language, which is the inheritance rule.
 */
const Scoped = {
  setup(_, { slots }) {
    provideLocale({ messages: { input: { clear: 'Effacer' } } })
    return () => slots.default?.()
  },
}

/**
 * A subtree in another language, through the vue facade rather than the hooks package.
 *
 * Both paths are exercised because they are different entry points of the same contract:
 * the plugin installs one at the app level, a provider scopes another.
 */
const Chinese = {
  setup(_, { slots }) {
    provideLocale({ locale: 'zh-CN', packs: { 'zh-CN': ZhCN } })
    return () => slots.default?.()
  },
}

globalThis.__imeEmits = []
globalThis.__imeInputs = []

const app = createApp({
  render() {
    // Resolved at render time: this is what proves the plugin actually registered
    // the component globally.
    const RegisteredButton = resolveComponent('YueButton')
    const RegisteredInput = resolveComponent('YueInput')
    return h('div', [
      h(YueButton, { theme: 'primary' }, { default: () => '保存' }),
      h(RegisteredButton, { size: 'sm', 'data-probe': 'plugin' }, { default: () => '取消' }),
      // From the single-component entry, with an id so the attribute-routing contract
      // is observable: the id must land on the native control, not on the wrapper.
      h(YueInput, {
        id: 'tarball-input',
        modelValue: 'installed from a tarball',
        clearable: true,
        'data-probe': 'input',
      }),
      // Through the plugin, to prove it registers both components.
      h(RegisteredInput, { 'data-probe': 'input-plugin', placeholder: 'plugin input' }),
      h(YuePopover, {
        defaultOpen: true,
        'data-probe': 'popover',
        'aria-label': 'Tarball popover',
      }, {
        trigger: ({ props }) => h('button', { ...props, type: 'button', 'data-popover-trigger': true }, 'Open'),
        default: () => h('div', { 'data-popover-content': true }, 'Tarball content'),
      }),
      // Mounted open: the modal contract (role, aria-modal, fixed overlay, the locale close
      // label) must be observable in the first paint from the dialog subpath entry. The IME
      // probe lives inside the dialog body on purpose: a mounted-open modal activates and sets
      // the background inert (B1/B2 — the fix that makes an already-open instance build its
      // modal environment on mount), so the only field a real composition can reach is one on
      // the active surface. This doubles as proof that the modal's own content stays
      // interactive while everything behind it is inert.
      h(YueDialog, {
        modelValue: true,
        title: 'Tarball dialog',
        'data-probe': 'dialog',
      }, {
        default: () => [
          h('div', { 'data-dialog-body': true }, 'Tarball dialog content'),
          // Records every published value and every input payload so the IME check can verify
          // both the count and the shape. Driven by a real composition through CDP, not by
          // hand-dispatched events, so the event order is the browser's rather than the test's.
          h(YueInput, {
            modelValue: '',
            'data-probe': 'ime',
            'onUpdate:modelValue': (value) => {
              globalThis.__imeEmits.push(value)
            },
            onInput: (event) => {
              globalThis.__imeInputs.push({
                type: event.type,
                value: event.target?.value ?? null,
                // Only present on a real InputEvent, so this is what distinguishes the browser's
                // event from a bare Event standing in for one.
                inputType: event.inputType ?? null,
                // What a stale payload gets wrong: reusing the last mid-composition event reports
                // the intermediate text here instead of the final text.
                data: event.data ?? null,
                // A hand-built-but-never-dispatched event has neither of these.
                targetTag: event.target?.tagName ?? null,
                targetValue: event.target?.value ?? null,
              })
            },
          }),
        ],
      }),
      // Inside a subtree whose locale came from the hooks package.
      h(Scoped, null, {
        default: () =>
          h(YueInput, {
            modelValue: 'scoped config',
            clearable: true,
            'data-probe': 'input-scoped',
          }),
      }),
      // Inside a subtree that installed the Chinese pack from its own entry.
      h(Chinese, null, {
        default: () =>
          h(YueInput, {
            modelValue: 'chinese pack',
            clearable: true,
            'data-probe': 'input-chinese',
          }),
      }),
      // Inside a subtree whose text comes from the application's own translation engine.
      h(EngineScoped, null, {
        default: () =>
          h(YueInput, {
            modelValue: 'engine',
            clearable: true,
            'data-probe': 'input-engine',
          }),
      }),
    ])
  },
})

// Registers every component globally, applies the documented options, and scopes languages.
// The locale contract is part of the published surface, so it is exercised here and not only
// in the workspace.
//
// The app-level size is 'lg' rather than the default on purpose: it gives the subtree below
// something *observable* to inherit. A subtree that merged onto the defaults instead of onto
// what it already saw would drop back to 'md', and the class assertion catches exactly that.
// The app-level locale is en-US (the default), so the two subtrees demonstrate both routes:
// one overrides a single string through the hooks package, the other switches language
// through a pack imported from its own subpath.
app.use(YueUI, { size: 'lg', locale: 'en-US' })
app.mount('#app')
`,
  )

  // Proves the shipped declarations are usable by a normal TypeScript project.
  write(
    'types.ts',
    `import YueButton from '@yue-ui/vue/button'
import YueInput from '@yue-ui/vue/input'
import YueDialog from '@yue-ui/vue/dialog'
import { YueButton as Named, YueInput as NamedInput, YueDialog as NamedDialog, useLocale } from '@yue-ui/vue'
import type {
  ComponentSize,
  YueButtonProps,
  YueButtonTheme,
  YueDialogCloseReason,
  YueDialogExposed,
  YueDialogProps,
  YueInputProps,
  YueInputType,
  YueLocale,
  YueMessageKey,
} from '@yue-ui/vue'
import { createYueLocale } from '@yue-ui/vue/locale'
import ZhCN from '@yue-ui/vue/locale/zh-CN'
import YueUI from '@yue-ui/vue/plugin'

const theme: YueButtonTheme = 'primary'
const props: YueButtonProps = { theme, variant: 'outline', size: 'lg', loading: false }

// The shared size contract is one type, so a variable of it satisfies both components.
const size: ComponentSize = 'md'
const inputProps: YueInputProps = { size, clearable: true, invalid: false, readonly: false }
const inputType: YueInputType = 'search'

// The locale surface, typed: the key union comes from the shipped catalog, so a key that does
// not exist is a compile error rather than a string that renders itself.
const key: YueMessageKey = 'dialog.confirm'
const locale: YueLocale = createYueLocale({ locale: 'zh-CN', packs: { 'zh-CN': ZhCN } })
const translated: string = locale.t(key)
const fromComponent: YueLocale = useLocale()

// The Dialog surface, typed from the shipped declarations: the controlled prop set, the close
// reason union, and the expose shape a template ref receives. A renamed union member would be
// a compile error here rather than a runtime surprise for a consumer.
const dialogProps: YueDialogProps = { modelValue: true, title: 'Tarball', variant: 'danger', size: 'md' }
const closeReason: YueDialogCloseReason = 'close-btn'
const dialogRef: YueDialogExposed | null = null

export const same: typeof YueButton = Named
export const sameInput: typeof YueInput = NamedInput
export const sameDialog: typeof YueDialog = NamedDialog
export const plugin = YueUI
export const used = props
export const usedInput = { inputProps, inputType }
export const usedLocale = { locale, translated, fromComponent }
export const usedDialog = { dialogProps, closeReason, dialogRef }
`,
  )

  // Runs under plain Node: proves the ESM entries resolve and import without a
  // bundler, which is what "the package exports are correct" actually means.
  //
  // `import.meta.resolve` rather than `require.resolve`: these packages are
  // ESM-only, so they deliberately have no `require` condition, and asking the
  // CommonJS resolver would report ERR_PACKAGE_PATH_NOT_EXPORTED for a package
  // that is perfectly correct.
  //
  // `@yue-ui/hooks` is imported *statically and directly* — not through any
  // bundler, and not through `@yue-ui/vue`, which compiles it in. That is the only
  // way to observe the artefact `tsc` actually emits: a relative import missing its
  // `.js` extension loads fine everywhere in this repository and throws
  // ERR_MODULE_NOT_FOUND here.
  write(
    'node-check.mjs',
    `import { fileURLToPath } from 'node:url'
import YueButton from '@yue-ui/vue/button'
import YueInput from '@yue-ui/vue/input'
import { YueButton as NamedButton, YueInput as NamedInput, YueDialog as NamedDialog } from '@yue-ui/vue'
import YueDialog from '@yue-ui/vue/dialog'
import YueUI from '@yue-ui/vue/plugin'
import { createYueLocale } from '@yue-ui/vue/locale'
import EnUS from '@yue-ui/vue/locale/en-US'
import ZhCN from '@yue-ui/vue/locale/zh-CN'
import {
  DEFAULT_YUE_CONFIG,
  YUE_NAMESPACE,
  consumeLocaleDiagnostics,
  useConfig,
  useNamespace,
} from '@yue-ui/hooks'

const specifiers = {
  root: '@yue-ui/vue',
  button: '@yue-ui/vue/button',
  input: '@yue-ui/vue/input',
  popover: '@yue-ui/vue/popover',
  dialog: '@yue-ui/vue/dialog',
  plugin: '@yue-ui/vue/plugin',
  locale: '@yue-ui/vue/locale',
  localeEnUS: '@yue-ui/vue/locale/en-US',
  localeZhCN: '@yue-ui/vue/locale/zh-CN',
  engine: 'vue-i18n',
  style: '@yue-ui/vue/style.css',
  buttonCss: '@yue-ui/vue/button.css',
  inputCss: '@yue-ui/vue/input.css',
  popoverCss: '@yue-ui/vue/popover.css',
  dialogCss: '@yue-ui/vue/dialog.css',
  hooks: '@yue-ui/hooks',
  hooksPackageJson: '@yue-ui/hooks/package.json',
  tokens: '@yue-ui/design-tokens/index.css',
  tokenComponents: '@yue-ui/design-tokens/component-tokens/button.css',
  tokenImplementations: '@yue-ui/design-tokens/implementations.css',
}

const paths = {}
for (const [key, specifier] of Object.entries(specifiers)) {
  try {
    paths[key] = fileURLToPath(import.meta.resolve(specifier))
  } catch (error) {
    paths[key] = 'UNRESOLVED: ' + (error.code ?? error.message)
  }
}

// Exercise the hooks package, not just load it: a module whose imports are broken
// throws before this runs.
const ns = useNamespace('button')

// Exercise the locale contract with no DOM at all. This is the SSR claim, checked against the
// published artefact rather than the workspace: a module that touched \`window\` would throw
// here, and nothing in this file defines one.
const zhLocale = createYueLocale({ locale: 'zh-Hans-CN', packs: { 'zh-CN': ZhCN, 'en-US': EnUS } })
const explicit = createYueLocale({ messages: { input: { clear: 'Effacer' } } })
const translator = createYueLocale({ locale: 'fr-FR', packs: { 'en-US': EnUS } })
const missing = translator.t('input.missing')

process.stdout.write(
  'NODE-CHECK ' +
    JSON.stringify({
      same: YueButton === NamedButton,
      sameInput: YueInput === NamedInput,
      sameDialog: YueDialog === NamedDialog,
      name: YueButton?.name ?? null,
      inputName: YueInput?.name ?? null,
      dialogName: YueDialog?.name ?? null,
      block: useNamespace('input').b(),
      hasInstall: typeof YueUI?.install === 'function',
      hasBrowserGlobals: typeof window !== 'undefined' || typeof document !== 'undefined',
      locale: {
        defaultPack: EnUS.input.clear,
        chinesePack: ZhCN.input.clear,
        // \`zh-Hans-CN\` must resolve through the chain to the \`zh-CN\` pack.
        chained: zhLocale.t('input.clear'),
        current: zhLocale.current.value,
        // A one-string override keeps the surrounding language.
        overridden: explicit.t('input.clear'),
        overrideKeepsDefaultLanguage: explicit.current.value,
        // A language with no pack falls back rather than blanking the label.
        fallback: translator.t('input.clear'),
        // A key nobody has renders as the key, and is diagnosable.
        missing,
        diagnostics: consumeLocaleDiagnostics().map((entry) => entry.reason),
        number: translator.n(1234.5),
      },
      hooks: {
        namespace: YUE_NAMESPACE,
        block: ns.b(),
        element: ns.e('icon'),
        modifier: ns.m('primary'),
        state: ns.is('loading'),
        defaultSize: useConfig().size,
        configKeys: Object.keys(DEFAULT_YUE_CONFIG),
      },
      paths,
    }) +
    '\\n',
)
`,
  )

  // A plain object config: the consumer has no `vite` dependency of its own, so
  // importing `defineConfig` here would fail to resolve.
  write(
    'vite.config.mjs',
    `export default {
  root: ${JSON.stringify(consumer.replaceAll('\\', '/'))},
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    rollupOptions: { input: { main: 'index.html', archive: 'prototype.html' } },
  },
}
`,
  )
}

function install(consumer, tarballs) {
  run(
    'corepack',
    [
      'pnpm',
      'add',
      '--prefer-offline',
      '--store-dir',
      process.env.YUE_PNPM_STORE ?? 'D:\\.pnpm-store\\v10',
      '--registry',
      'https://mirrors.tencent.com/npm/',
      tarballs.vue,
      tarballs['design-tokens'],
      tarballs.hooks,
      'vue@3.5.43',
      // The application's engine, installed by the *consumer*: Yue's core has no dependency on it,
      // and this is what proves the adapter boundary is real rather than aspirational.
      'vue-i18n@11',
    ],
    { cwd: consumer },
  )
}

/* ------------------------------------------------------------------ *
 * 6 — serve and render the built consumer
 * ------------------------------------------------------------------ */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
}

async function renderBuiltConsumer(dist) {
  const server = createServer((request, response) => {
    const url = (request.url ?? '/').split('?')[0]
    const file = url === '/' ? join(dist, 'index.html') : join(dist, url)
    if (!file.startsWith(dist) || !existsSync(file)) {
      response.writeHead(404)
      response.end('not found')
      return
    }
    response.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    response.end(readFileSync(file))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  let browser
  try {
    browser = await chromium.launch({
      ...(process.env.YUE_BROWSER_PATH
        ? { executablePath: process.env.YUE_BROWSER_PATH }
        : { channel: 'msedge' }),
      headless: true,
    })
    const page = await browser.newPage()
    const consoleErrors = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'load' })
    await page.waitForSelector('.yue-button', { timeout: 15_000 })

    const rendered = await page.evaluate(async () => {
      const element = document.querySelector('.yue-button')
      // Ask the browser to resolve the token, so the expectation is the token
      // contract rather than a hard-coded colour.
      const probe = document.createElement('div')
      probe.style.backgroundColor = 'var(--button-primary-background)'
      document.body.appendChild(probe)
      const expected = getComputedStyle(probe).backgroundColor
      probe.remove()

      /** Collect every selector the loaded stylesheets declare. */
      const selectors = []
      for (const sheet of document.styleSheets) {
        let rules
        try {
          rules = sheet.cssRules
        } catch {
          continue
        }
        const walk = (list) => {
          for (const rule of list) {
            if (rule.cssRules && !rule.selectorText) walk(rule.cssRules)
            else if (rule.selectorText) selectors.push(rule.selectorText)
          }
        }
        walk(rules)
      }
      const styledBy = (node) =>
        selectors.some((selector) => {
          try {
            return node.matches(selector)
          } catch {
            return false
          }
        })

      const resolveLength = (token) => {
        const ruler = document.createElement('div')
        ruler.style.height = `var(${token})`
        document.body.appendChild(ruler)
        const value = getComputedStyle(ruler).height
        ruler.remove()
        return value
      }

      // The button registered by the plugin, with a `size` prop, in a real browser.
      const pluginButton = document.querySelector('[data-probe="plugin"]')

      // The input, from a tarball, in a real browser — including the attribute-routing
      // contract, which is the part a tarball can plausibly break (a wrong `exports`
      // entry would give a component whose `id` landed on the wrapper, and `label for`
      // would silently stop working).
      const input = document.querySelector('[data-probe="input"]')
      const inputProbe = input
        ? (() => {
            const control = input.querySelector('input')
            const ruler = document.createElement('div')
            ruler.style.backgroundColor = 'var(--input-background)'
            document.body.appendChild(ruler)
            const expectedBackground = getComputedStyle(ruler).backgroundColor
            ruler.remove()
            return {
              className: input.className,
              height: getComputedStyle(input).height,
              // The app-level size is `lg` in this consumer, so this doubles as the check
              // that the height really came from configuration and not from a coincidence.
              expectedHeight: resolveLength('--input-height-lg'),
              background: getComputedStyle(input).backgroundColor,
              expectedBackground,
              styled: styledBy(input),
              controlTag: control?.tagName ?? null,
              controlId: control?.id ?? null,
              wrapperId: input.getAttribute('id'),
              controlValue: control?.value ?? null,
              clearRendered: input.querySelectorAll('.yue-input__clear').length,
              clearIsButton: input.querySelector('.yue-input__clear')?.tagName ?? null,
              clearLabel: input.querySelector('.yue-input__clear')?.getAttribute('aria-label') ?? null,
              nativeClasses: control?.className ?? null,
            }
          })()
        : null

      const pluginInput = document.querySelector('[data-probe="input-plugin"]')

      // The field inside a subtree configured through the separately-installed hooks
      // package. `aria-label` is the observable: it can only be 'Effacer' if the injection
      // key in @yue-ui/vue's bundle is the same symbol as the one in @yue-ui/hooks.
      const scopedInput = document.querySelector('[data-probe="input-scoped"]')

      // The token sheet only *declares* `--font-ui`; the host applies it. Waiting
      // for the font set proves the `@font-face` sources inside the tarball
      // resolve — a relative `../assets/*.woff2` path is exactly the kind of thing
      // that survives a monorepo and dies in a tarball.
      await document.fonts.ready
      const harmonyFaces = [...document.fonts].filter((face) =>
        face.family.includes('HarmonyOS'),
      )

      return {
        className: element.className,
        backgroundColor: getComputedStyle(element).backgroundColor,
        expected,
        text: element.textContent.trim(),
        fontFamily: getComputedStyle(element).fontFamily,
        loadedFaces: harmonyFaces.filter((face) => face.status === 'loaded').length,
        totalFaces: harmonyFaces.length,
        height: Math.round(element.getBoundingClientRect().height),
        styled: styledBy(element),
        input: inputProbe,
        popover: (() => {
          const content = document.querySelector('[data-probe="popover"]')
          if (!content) return null
          const style = getComputedStyle(content)
          const rect = content.getBoundingClientRect()
          return {
            trigger: document.querySelector(`[aria-controls="${content.id}"]`)?.getAttribute('aria-controls') ?? null,
            contentId: content.id,
            role: content.getAttribute('role') ?? null,
            position: style.position,
            width: rect.width,
            height: rect.height,
            styled: styledBy(content),
          }
        })(),
        dialog: (() => {
          const panel = document.querySelector('[data-probe="dialog"]')
          if (!panel) return null
          const overlay = panel.closest('.yue-dialog__overlay')
          const overlayStyle = overlay ? getComputedStyle(overlay) : null
          const titleId = panel.getAttribute('aria-labelledby')
          return {
            role: panel.getAttribute('role') ?? null,
            ariaModal: panel.getAttribute('aria-modal') ?? null,
            title: titleId ? (document.getElementById(titleId)?.textContent ?? null) : null,
            body: !!panel.querySelector('[data-dialog-body]'),
            closeLabel: panel.querySelector('.yue-dialog__close')?.getAttribute('aria-label') ?? null,
            overlayPosition: overlayStyle?.position ?? null,
            overlayZIndex: overlayStyle?.zIndex ?? null,
            layerModal: getComputedStyle(document.documentElement).getPropertyValue('--layer-modal').trim(),
            styled: styledBy(panel),
            teleportedToBody: overlay ? overlay.parentElement === document.body : false,
          }
        })(),
        pluginInput: pluginInput
          ? {
              className: pluginInput.className,
              controlTag: pluginInput.querySelector('input')?.tagName ?? null,
              styled: styledBy(pluginInput),
            }
          : null,
        scopedInput: scopedInput
          ? {
              className: scopedInput.className,
              clearLabel:
                scopedInput.querySelector('.yue-input__clear')?.getAttribute('aria-label') ?? null,
              styled: styledBy(scopedInput),
            }
          : null,
        // The field inside a subtree that switched language with the pack from its own
        // subpath entry. Its label is the observable: it can only be Chinese if the pack
        // travelled from `@yue-ui/vue/locale/zh-CN` into the bundle.
        chineseInput: (() => {
          const chinese = document.querySelector('[data-probe="input-chinese"]')
          if (!chinese) return null
          return {
            className: chinese.className,
            clearLabel:
              chinese.querySelector('.yue-input__clear')?.getAttribute('aria-label') ?? null,
            styled: styledBy(chinese),
          }
        })(),
        // The field whose text comes from the application's own engine. `vue-i18n` owns the
        // language here, so both directions are observable: Yue's string is the engine's, and
        // switching the engine updates an already-mounted component.
        engineInput: await (async () => {
          const input = document.querySelector('[data-probe="input-engine"]')
          if (!input) return null
          const read = () =>
            input.querySelector('.yue-input__clear')?.getAttribute('aria-label') ?? null
          const before = read()
          globalThis.__setEngineLocale?.('zh-CN')
          // Two frames: one for the ref write, one for the re-render to reach the DOM.
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
          return { before, after: read(), styled: styledBy(input) }
        })(),
        plugin: pluginButton
          ? {
              className: pluginButton.className,
              text: pluginButton.textContent.trim(),
              height: getComputedStyle(pluginButton).height,
              expectedSmHeight: resolveLength('--button-height-sm'),
              styled: styledBy(pluginButton),
            }
          : null,
      }
    })

    // The prototype-era archive, rendered by a browser from the installed tarball. Its values are
    // compared against the tokens the browser itself resolves, so this is the token contract rather
    // than a colour copied into the test.
    await page.goto(`http://127.0.0.1:${server.address().port}/prototype.html`, { waitUntil: 'load' })
    await page.waitForSelector('#archive-btn', { timeout: 15_000 })
    const archive = await page.evaluate(() => {
      const button = document.querySelector('#archive-btn')
      const resolve = (token, property) => {
        const probe = document.createElement('div')
        probe.style[property] = `var(${token})`
        document.body.appendChild(probe)
        const value = getComputedStyle(probe)[property]
        probe.remove()
        return value
      }
      const style = getComputedStyle(button)
      // Each archive namespace exposes at least one token-driven property. Comparing against the value
      // the browser resolves for that token is what makes this about the contract rather than a copy.
      const probes = {
        // Each pair is "the property the rule sets" → "the token the rule sets it from", taken from the
        // archive's own declarations. Guessing these is how the first version of this check failed:
        // `.field` sets `gap`, not a border, and `--overlay-bg` was never a token.
        field: { gap: '--gap-form-field' },
        // `.list-row` deliberately reuses the Button's control scale for its row height.
        list: { minHeight: '--button-height-md' },
        overlay: { background: '--surface-level-2' },
        box: { background: '--box-background-subtle' },
        status: { gap: '--status-gap' },
        link: { color: '--link-color' },
      }
      const measure = (selector, entries) => {
        const element = document.querySelector(selector)
        if (element === null) return { selector, missing: true }
        const computed = getComputedStyle(element)
        const readings = {}
        for (const [property, token] of Object.entries(entries)) {
          readings[property] = {
            actual: computed[property],
            expected: resolve(token, property),
          }
        }
        return { selector, readings }
      }
      return {
        button: {
          height: style.height,
          expectedHeight: resolve('--button-height-md', 'height'),
          background: style.backgroundColor,
          expectedBackground: resolve('--button-default-background', 'backgroundColor'),
          borderColor: style.borderTopColor,
          expectedBorderColor: resolve('--button-default-border-color', 'borderTopColor'),
        },
        archive: {
          field: measure('#archive-field', probes.field),
          list: measure('#archive-list', probes.list),
          overlay: measure('#archive-overlay', probes.overlay),
          box: measure('#archive-box', probes.box),
          status: measure('#archive-status', probes.status),
          link: measure('#archive-link', probes.link),
        },
      }
    })

    if (archive.button.height !== archive.button.expectedHeight) {
      fail(
        `implementations.css: .btn rendered height ${archive.button.height} but --button-height-md is ` +
          `${archive.button.expectedHeight} — the archive is not reading the component tokens`,
      )
    }
    if (archive.button.background !== archive.button.expectedBackground) {
      fail(
        `implementations.css: .btn rendered background ${archive.button.background} but ` +
          `--button-default-background is ${archive.button.expectedBackground}`,
      )
    }
    if (archive.button.borderColor !== archive.button.expectedBorderColor) {
      fail(
        `implementations.css: .btn rendered border ${archive.button.borderColor} but ` +
          `--button-default-border-color is ${archive.button.expectedBorderColor}`,
      )
    }
    notes.push(
      `implementations.css: .btn renders from the tokens (height ${archive.button.height}, ` +
        `background ${archive.button.background}, border ${archive.button.borderColor})`,
    )

    // Every other archive namespace: one element, one token-driven property each. A namespace whose
    // property did not resolve to the token value fails here rather than silently rendering unstyled.
    const covered = []
    for (const [namespace, result] of Object.entries(archive.archive)) {
      if (result.missing) {
        fail(`implementations.css: no ${namespace} element on the archive page (${result.selector})`)
        continue
      }
      for (const [property, reading] of Object.entries(result.readings)) {
        if (reading.actual !== reading.expected) {
          fail(
            `implementations.css: ${namespace} ${property} is ${reading.actual} but the token resolves ` +
              `to ${reading.expected} — that archive rule is not reading the tokens`,
          )
        }
      }
      covered.push(namespace)
    }
    if (covered.length > 0) {
      notes.push(`implementations.css: ${covered.length} further namespace(s) render from tokens (${covered.join(', ')})`)
    }

    // Rule families rather than base rules: hover and disabled are where a token is most likely to be
    // wired to the wrong variable, and they are the states the audit asked to cover.
    await page.hover('#archive-hover-btn')
    await page.waitForTimeout(250)
    const states = await page.evaluate(() => {
      const resolve = (token, property) => {
        const probe = document.createElement('div')
        probe.style[property] = `var(${token})`
        document.body.appendChild(probe)
        const value = getComputedStyle(probe)[property]
        probe.remove()
        return value
      }
      const hovered = getComputedStyle(document.querySelector('#archive-hover-btn'))
      const disabled = getComputedStyle(document.querySelector('#archive-disabled-btn'))
      const bordered = getComputedStyle(document.querySelector('#archive-bordered-box'))
      return {
        hover: { actual: hovered.backgroundColor, expected: resolve('--button-default-background-hover', 'backgroundColor') },
        disabledBackground: { actual: disabled.backgroundColor, expected: resolve('--disabled-container', 'backgroundColor') },
        disabledColor: { actual: disabled.color, expected: resolve('--disabled-content', 'color') },
        bordered: {
          actual: bordered.borderTopWidth,
          expected: getComputedStyle(document.documentElement).getPropertyValue('--border-1').trim(),
        },
      }
    })
    for (const [name, reading] of Object.entries(states)) {
      if (reading.actual !== reading.expected) {
        fail(
          `implementations.css: ${name} is ${reading.actual} but its token resolves to ${reading.expected} ` +
            '— that archive rule is not reading the token it names',
        )
      }
    }
    notes.push(
      `implementations.css: state families render from tokens (hover ${states.hover.actual}, ` +
        `disabled ${states.disabledBackground.actual}/${states.disabledColor.actual}, bordered ${states.bordered.actual})`,
    )

    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'load' })
    await page.waitForSelector('.yue-button', { timeout: 15_000 })

    if (consoleErrors.length > 0) fail(`consumer console errors: ${consoleErrors.join(' | ')}`)

    // A real IME composition, driven through CDP so the event order is Chromium's own rather
    // than one the test chose.
    //
    // This matters because CDP's emulation (like Firefox, and unlike the trailing-`input`
    // behaviour some Chromium builds show with a real IME) delivers the final value *before*
    // `compositionend`, with `isComposing: true`, and never fires an `input` afterwards. An
    // implementation that waited for that trailing event would publish nothing at all here,
    // and one that published on both paths would publish twice.
    const ime = { supported: true, emits: [], inputs: [], value: null }
    try {
      // `browser.newPage()` below makes its own context, so ask the page for it rather than
      // assuming one is in scope.
      const cdp = await page.context().newCDPSession(page)
      await page.focus('[data-probe="ime"] input')
      await cdp.send('Input.imeSetComposition', {
        text: 'zhong',
        selectionStart: 5,
        selectionEnd: 5,
      })
      await page.waitForTimeout(60)
      await cdp.send('Input.imeSetComposition', { text: '中文', selectionStart: 2, selectionEnd: 2 })
      await page.waitForTimeout(60)
      await cdp.send('Input.insertText', { text: '中文' })
      await page.waitForTimeout(150)
      const observed = await page.evaluate(() => ({
        emits: globalThis.__imeEmits ?? [],
        inputs: globalThis.__imeInputs ?? [],
        value: document.querySelector('[data-probe="ime"] input')?.value ?? null,
      }))
      ime.emits = observed.emits
      ime.inputs = observed.inputs
      ime.value = observed.value
    } catch (error) {
      ime.supported = false
      ime.error = error.message.split('\n')[0]
    }

    return { ...rendered, ime }
  } finally {
    if (browser) await browser.close()
    await new Promise((resolve) => server.close(resolve))
  }
}

/* ------------------------------------------------------------------ *
 * main
 * ------------------------------------------------------------------ */

async function main() {
  const workDir = mkdtempSync(join(tmpdir(), 'yue-tarball-'))
  const tarballDir = join(workDir, 'tarballs')
  const consumer = join(workDir, 'consumer')
  mkdirSync(tarballDir, { recursive: true })
  mkdirSync(consumer, { recursive: true })
  process.stdout.write(`consumer: ${consumer}\n`)

  try {
    const tarballs = packPackages(tarballDir)
    writeConsumer(consumer)
    install(consumer, tarballs)
    notes.push('installed the tokens, hooks and vue tarballs plus vue itself, with plain pnpm')

    // 3 — resolution, from Node, through the real `exports` maps.
    const nodeCheck = run('node', ['node-check.mjs'], { cwd: consumer })
    const line = nodeCheck.stdout.split('\n').find((l) => l.startsWith('NODE-CHECK '))
    if (!line) fail('node-check.mjs produced no report')
    else {
      const report = JSON.parse(line.slice('NODE-CHECK '.length))
      const consumerModules = join(consumer, 'node_modules')
      for (const [key, resolved] of Object.entries(report.paths)) {
        if (resolved.startsWith('UNRESOLVED')) fail(`${key}: ${resolved}`)
        else if (!resolved.startsWith(consumerModules)) {
          fail(`${key} resolved outside the consumer: ${resolved}`)
        }
      }
      if (!report.same) fail('`@yue-ui/vue/button` default and `@yue-ui/vue` named export differ')
      if (!report.sameInput) fail('`@yue-ui/vue/input` default and `@yue-ui/vue` named export differ')
      if (!report.sameDialog) fail('`@yue-ui/vue/dialog` default and `@yue-ui/vue` named export differ')
      if (report.name !== 'YueButton') {
        fail(`component name is "${report.name}", expected "YueButton"`)
      }
      if (report.inputName !== 'YueInput') {
        fail(`component name is "${report.inputName}", expected "YueInput"`)
      }
      if (report.dialogName !== 'YueDialog') {
        fail(`component name is "${report.dialogName}", expected "YueDialog"`)
      }
      if (report.block !== 'yue-input') {
        fail(`@yue-ui/hooks namespaced the input as "${report.block}"`)
      }
      if (!report.hasInstall) fail('`@yue-ui/vue/plugin` has no install function')

      // `@yue-ui/hooks`, loaded natively by Node from its own tarball. This is the
      // only check that can see the artefact `tsc` emits rather than a bundled one.
      const expectedHooks = {
        namespace: 'yue',
        block: 'yue-button',
        element: 'yue-button__icon',
        modifier: 'yue-button--primary',
        state: 'is-loading',
        defaultSize: 'md',
        // `size` is the *whole* configuration surface now: text moved to the locale instance,
        // and a `messages` key reappearing here would mean the two mechanisms were merged
        // again. Asserted as a literal rather than imported, so this tool does not depend on
        // the workspace build it is checking.
        configKeys: ['size'],
      }
      for (const [key, expected] of Object.entries(expectedHooks)) {
        const actual = report.hooks?.[key]
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          fail(
            `@yue-ui/hooks ${key}: expected ${JSON.stringify(expected)}, ` +
              `got ${JSON.stringify(actual)}`,
          )
        }
      }
      notes.push(
        `@yue-ui/hooks loaded natively by Node: ${report.hooks?.block}, ` +
          `${report.hooks?.modifier}, config keys [${report.hooks?.configKeys?.join(', ')}]`,
      )

      /* The locale contract, against the installed artefacts and with no DOM. */
      const expectedLocale = {
        // The published packs, read from their own entries.
        defaultPack: 'Clear',
        chinesePack: '清空',
        // `zh-Hans-CN` resolves to the `zh-CN` pack through the documented chain.
        chained: '清空',
        current: 'zh-Hans-CN',
        // A one-string override wins for its key and leaves the language alone.
        overridden: 'Effacer',
        overrideKeepsDefaultLanguage: 'en-US',
        // French has no pack here: the fallback chain answers instead of blanking the UI.
        fallback: 'Clear',
        // A key nobody has renders as the key, and is reported.
        missing: 'input.missing',
        diagnostics: ['missing-key'],
        // `n()` must be the platform formatter for the *active* locale, not English.
        number: new Intl.NumberFormat('fr-FR').format(1234.5),
      }
      for (const [key, expected] of Object.entries(expectedLocale)) {
        const actual = report.locale?.[key]
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          fail(
            `locale ${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
          )
        }
      }
      if (report.hasBrowserGlobals) {
        fail('the locale check ran with browser globals present, so it proves nothing about SSR')
      }
      notes.push(
        `locale loaded by Node with no DOM: ${report.locale?.chained} from the chain, ` +
          `${report.locale?.diagnostics?.length} diagnostic(s) for a missing key`,
      )

      notes.push(`node resolved ${Object.keys(report.paths).length} subpaths inside the consumer`)
    }

    // 4 — the shipped declarations type-check a real consumer.
    run(
      'node',
      [
        join(REPO_ROOT, 'node_modules/typescript/lib/tsc.js'),
        '--noEmit',
        '--strict',
        '--skipLibCheck',
        '--target',
        'es2022',
        '--module',
        'esnext',
        '--moduleResolution',
        'bundler',
        'types.ts',
      ],
      { cwd: consumer },
    )
    notes.push('consumer type-checked against the shipped .d.ts')

    // 5 — CSS entry points exist and pull in nothing external.
    for (const [label, file] of [
      ['@yue-ui/vue/style.css', join(consumer, 'node_modules/@yue-ui/vue/dist/style.css')],
      [
        '@yue-ui/vue/button.css',
        join(consumer, 'node_modules/@yue-ui/vue/dist/components/button/style.css'),
      ],
      [
        '@yue-ui/vue/input.css',
        join(consumer, 'node_modules/@yue-ui/vue/dist/components/input/style.css'),
      ],
      [
        '@yue-ui/vue/popover.css',
        join(consumer, 'node_modules/@yue-ui/vue/dist/components/popover/style.css'),
      ],
      [
        '@yue-ui/vue/dialog.css',
        join(consumer, 'node_modules/@yue-ui/vue/dist/components/dialog/style.css'),
      ],
      [
        '@yue-ui/design-tokens/index.css',
        join(consumer, 'node_modules/@yue-ui/design-tokens/src/index.css'),
      ],
      [
        // Component tokens are a directory now, addressed by the export subpath rather than by the
        // single-sheet name that used to exist. This entry also proves the new export is installed.
        '@yue-ui/design-tokens/component-tokens/button.css',
        join(consumer, 'node_modules/@yue-ui/design-tokens/src/component-tokens/button.css'),
      ],
      [
        // The prototype archive is opt-in and honestly named; it must still ship, and it must not
        // be reachable from the entry a consumer installs.
        '@yue-ui/design-tokens/implementations.css',
        join(consumer, 'node_modules/@yue-ui/design-tokens/src/implementations.css'),
      ],
    ]) {
      if (!existsSync(file)) {
        fail(`${label} is missing from the installed package`)
        continue
      }
      const css = readFileSync(file, 'utf8')
      if (/https?:\/\//.test(css.replace(/\/\*[\s\S]*?\*\//g, ''))) {
        fail(`${label} references an external URL`)
      }
      notes.push(`${label}: ${css.length} bytes`)
    }

    // 6 — build and render the consumer.
    run('node', [join(REPO_ROOT, 'node_modules/vite/bin/vite.js'), 'build'], { cwd: consumer })
    const dist = join(consumer, 'dist')
    const html = readFileSync(join(dist, 'index.html'), 'utf8')
    if (/https?:\/\//.test(html.replace(/<!--[\s\S]*?-->/g, ''))) {
      fail('the built consumer HTML references an external URL')
    }
    const assets = join(dist, 'assets')
    const cssFiles = readdirSync(assets).filter((file) => file.endsWith('.css'))
    const jsFiles = readdirSync(assets).filter((file) => file.endsWith('.js'))
    if (cssFiles.length === 0) fail('the consumer build emitted no CSS')
    else {
      const css = cssFiles.map((file) => readFileSync(join(assets, file), 'utf8')).join('\n')
      for (const marker of [
        '.yue-button',
        'yue-button--primary',
        '--button-primary-background',
        '.yue-input',
        'yue-input__native',
        '--input-border-radius',
      ]) {
        if (!css.includes(marker)) fail(`consumer CSS is missing "${marker}"`)
      }
      if (/https?:\/\//.test(css.replace(/\/\*[\s\S]*?\*\//g, ''))) {
        fail('consumer CSS references an external URL')
      }
    }
    const js = jsFiles.map((file) => readFileSync(join(assets, file), 'utf8')).join('\n')
    if (!js.includes('YueButton')) fail('the consumer bundle does not contain YueButton')

    const rendered = await renderBuiltConsumer(dist)
    if (!rendered.className.includes('yue-button--primary')) {
      fail(`rendered class contract is wrong: ${rendered.className}`)
    }
    if (rendered.backgroundColor !== rendered.expected) {
      fail(
        `rendered fill ${rendered.backgroundColor} does not match the token ` +
          `${rendered.expected} — the tarball CSS is not taking effect`,
      )
    }
    if (rendered.text !== '保存') fail(`rendered label is "${rendered.text}"`)
    if (!/HarmonyOS/.test(rendered.fontFamily)) {
      fail(
        `the token font did not reach the button: font-family is ` +
          `"${rendered.fontFamily}" — is the token sheet actually loaded?`,
      )
    }
    if (rendered.totalFaces === 0) {
      fail('the token sheet declared no HarmonyOS @font-face')
    } else if (rendered.loadedFaces === 0) {
      fail(
        `none of the ${rendered.totalFaces} HarmonyOS @font-face sources loaded — ` +
          'the woff2 assets are missing from the tarball',
      )
    }
    if (rendered.height <= 0) fail('the rendered button has no height')
    if (!rendered.popover) {
      fail('the Popover from the installed tarball was not rendered')
    } else {
      if (rendered.popover.role !== 'dialog') fail(`tarball Popover role is ${rendered.popover.role}`)
      if (rendered.popover.position !== 'fixed') fail(`tarball Popover position is ${rendered.popover.position}`)
      if (rendered.popover.width <= 0 || rendered.popover.height <= 0) fail('tarball Popover has no measurable box')
      if (rendered.popover.trigger !== rendered.popover.contentId) fail('tarball Popover aria-controls does not name its content')
      if (!rendered.popover.styled) fail('tarball Popover content is not matched by its CSS entry')
      notes.push(`tarball Popover: fixed ${rendered.popover.width}×${rendered.popover.height}, role ${rendered.popover.role}`)
    }
    if (!rendered.dialog) {
      fail('the Dialog from the installed tarball was not rendered')
    } else {
      const dialog = rendered.dialog
      if (dialog.role !== 'dialog') fail(`tarball Dialog role is ${dialog.role}, expected dialog`)
      if (dialog.ariaModal !== 'true') fail(`tarball Dialog aria-modal is ${dialog.ariaModal}`)
      if (dialog.title !== 'Tarball dialog') fail(`tarball Dialog aria-labelledby does not name the title (${dialog.title})`)
      if (!dialog.body) fail('tarball Dialog default slot content is missing')
      if (dialog.closeLabel !== 'Close dialog') {
        fail(`tarball Dialog close control label is "${dialog.closeLabel}", expected the shipped en-US dialog.closeLabel`)
      }
      if (dialog.overlayPosition !== 'fixed') fail(`tarball Dialog overlay position is ${dialog.overlayPosition}`)
      if (!dialog.layerModal) fail('--layer-modal did not resolve from the shipped token sheets')
      if (dialog.overlayZIndex !== dialog.layerModal) {
        fail(`tarball Dialog overlay z-index ${dialog.overlayZIndex} != --layer-modal ${dialog.layerModal}`)
      }
      if (!dialog.styled) fail('tarball Dialog card is not matched by its CSS entry')
      if (!dialog.teleportedToBody) fail('tarball Dialog overlay did not teleport under body')
      notes.push(
        `tarball Dialog: role ${dialog.role}, aria-modal ${dialog.ariaModal}, fixed at --layer-modal ${dialog.layerModal}, ` +
          'close label from the shipped en-US pack',
      )
    }
    // The namespace contract, checked where it actually matters: on the rendered
    // element, against the stylesheets the page loaded. A class the stylesheet does
    // not match means the button is unstyled no matter how right the markup looks.
    if (!rendered.styled) {
      fail(
        `no loaded stylesheet rule matches .${rendered.className.split(' ')[0]} — the ` +
          'component class namespace and the shipped stylesheet disagree',
      )
    }
    if (!rendered.plugin) {
      fail('the plugin-registered button was not rendered')
    } else {
      if (!rendered.plugin.className.includes('yue-button--sm')) {
        fail(`the plugin button ignored its size prop: ${rendered.plugin.className}`)
      }
      if (rendered.plugin.height !== rendered.plugin.expectedSmHeight) {
        fail(
          `plugin button height ${rendered.plugin.height} does not match ` +
            `--button-height-sm ${rendered.plugin.expectedSmHeight}`,
        )
      }
      if (!rendered.plugin.styled) {
        fail('the plugin-registered button is not matched by any loaded stylesheet rule')
      }
      if (rendered.plugin.text !== '取消') fail(`plugin button label is "${rendered.plugin.text}"`)
    }
    // 8 — a real IME composition publishes the final value exactly once.
    if (!rendered.ime?.supported) {
      notes.push(
        `real IME check skipped: CDP input emulation unavailable ` +
          `(${rendered.ime?.error ?? 'unknown reason'})`,
      )
    } else {
      const { emits, inputs, value } = rendered.ime
      if (emits.length !== 1) {
        fail(
          `a real IME composition published ${emits.length} value(s) ` +
            `(${JSON.stringify(emits)}); exactly one is correct — twice means the trailing ` +
            'event was not de-duplicated, zero means the composition end was ignored',
        )
      } else if (emits[0] !== '中文') {
        fail(`a real IME composition published "${emits[0]}", expected "中文"`)
      } else if (value !== '中文') {
        fail(`the field holds "${value}" after composing, expected "中文"`)
      } else if (inputs.length !== 1) {
        fail(`a real IME composition emitted ${inputs.length} input event(s), expected 1`)
      } else if (inputs[0].type !== 'input') {
        // The payload contract: an `@input` handler must never receive a `compositionend`.
        fail(
          `the emitted input event has type "${inputs[0].type}", so the payload is the ` +
            'composition event rather than an input event',
        )
      } else if (inputs[0].inputType === null) {
        // A real InputEvent carries `inputType`; the synthesised fallback deliberately does
        // not. Getting here means the browser's own event was not the one forwarded.
        fail('the emitted input event is not an InputEvent (no inputType), so the payload was fabricated')
      } else if (inputs[0].targetTag !== 'INPUT') {
        fail(
          `the emitted input event has no usable target (${inputs[0].targetTag}), so the ` +
            'documented `event.target.value` would throw for a consumer',
        )
      } else if (inputs[0].targetValue !== '中文') {
        fail(`the emitted input event's target holds "${inputs[0].targetValue}", expected "中文"`)
      } else if (inputs[0].data !== '中文') {
        // The stale-payload check. CDP delivers the final value *before* `compositionend`, so
        // the browser's own event for it exists and must be the one forwarded; a cached
        // earlier event would report the intermediate text here instead.
        fail(
          `the emitted input event carries data "${inputs[0].data}", expected "中文" — the ` +
            'payload describes an earlier value than the one published',
        )
      } else {
        notes.push(
          `real IME: composed "中文", published once as an InputEvent ` +
            `(inputType "${inputs[0].inputType}", data "${inputs[0].data}", ` +
            `target <${String(inputs[0].targetTag).toLowerCase()}> holds "${inputs[0].targetValue}")`,
        )
      }
    }

    notes.push(
      `rendered in a browser: ${rendered.className}, fill ${rendered.backgroundColor}, ` +
        `height ${rendered.height}px, ${rendered.loadedFaces}/${rendered.totalFaces} token fonts loaded`,
    )
    notes.push(
      `plugin-registered button: ${rendered.plugin?.className ?? 'missing'} ` +
        `(height ${rendered.plugin?.height ?? '?'} vs token ${rendered.plugin?.expectedSmHeight ?? '?'})`,
    )

    // 7 — the Input, from its own tarball subpaths, in the same consumer.
    if (!rendered.input) {
      fail('the single-component Input was not rendered from the tarball')
    } else {
      const input = rendered.input
      if (!input.className.includes('yue-input')) {
        fail(`rendered Input class contract is wrong: ${input.className}`)
      }
      // The attribute-routing contract, checked on the shipped artefact: the id has to
      // be on the native control or `label for` silently stops working.
      if (input.controlTag !== 'INPUT') {
        fail(`the Input rendered no native control (saw ${input.controlTag})`)
      }
      if (input.controlId !== 'tarball-input') {
        fail(
          `the id landed on "${input.controlId === null ? 'the wrapper' : input.controlId}" ` +
            'instead of the native control',
        )
      }
      if (input.wrapperId !== null) {
        fail('the wrapper carries the id as well, so label association is ambiguous')
      }
      if (input.controlValue !== 'installed from a tarball') {
        fail(`the Input value did not render: "${input.controlValue}"`)
      }
      if (input.height !== input.expectedHeight) {
        fail(
          `Input height ${input.height} does not match --input-height-lg (the app-level ` +
            `configuration) = ${input.expectedHeight}`,
        )
      }
      if (!input.className.includes('yue-input--lg')) {
        fail(`the Input did not take the app-level size: ${input.className}`)
      }
      if (input.background !== input.expectedBackground) {
        fail(
          `Input fill ${input.background} does not match --input-background ` +
            `${input.expectedBackground} — the tarball CSS is not taking effect`,
        )
      }
      if (!input.styled) {
        fail(
          `no loaded stylesheet rule matches .${input.className.split(' ')[0]} — the ` +
            'Input class namespace and the shipped stylesheet disagree',
        )
      }
      if (input.clearRendered !== 1) {
        fail(`expected exactly one clear control, saw ${input.clearRendered}`)
      }
      if (input.clearIsButton !== 'BUTTON') {
        fail(`the clear control is a <${input.clearIsButton}>, not a <button>`)
      }
      if (!input.clearLabel) fail('the clear control has no accessible name')
      else if (input.clearLabel !== 'Clear') {
        // Proves the *default* language pack travelled through the published tarball and
        // reached the component: this consumer installed `en-US` (the app-level locale) and
        // never imported the Chinese pack for this subtree.
        fail(
          `the clear control reads "${input.clearLabel}", but the app-level locale is ` +
            '`en-US`, whose `input.clear` is "Clear" — the default pack did not reach the ' +
            'component',
        )
      }
      if (!rendered.pluginInput || rendered.pluginInput.controlTag !== 'INPUT') {
        fail('the plugin-registered Input was not rendered')
      } else if (!rendered.pluginInput.styled) {
        fail('the plugin-registered Input is not matched by any loaded stylesheet rule')
      }
      notes.push(
        `Input from a tarball: ${input.className}, id on <${input.controlTag.toLowerCase()}>, ` +
          `height ${input.height} vs token ${input.expectedHeight}, clear <${String(input.clearIsButton).toLowerCase()}>`,
      )

      // The cross-package locale path, proved end to end. This is the assertion that a
      // private `Symbol('yue:locale')` would fail: `provideLocale` came from the hooks
      // tarball and the component came from the vue tarball.
      if (!rendered.scopedInput) {
        fail('the subtree wrapped with provideLocale() from @yue-ui/hooks did not render')
      } else if (rendered.scopedInput.clearLabel !== 'Effacer') {
        fail(
          `a subtree scoped through @yue-ui/hooks reads ` +
            `"${rendered.scopedInput.clearLabel}" instead of "Effacer" — the locale ` +
            'injection key differs between @yue-ui/vue and @yue-ui/hooks',
        )
      } else if (!rendered.scopedInput.className.includes('yue-input--lg')) {
        // The subtree named only a string, so the app-level size has to survive. A provider
        // that merged onto the *defaults* would have dropped it back to `md`.
        fail(
          `the scoped Input lost the inherited app-level size: ` +
            `"${rendered.scopedInput.className}" does not carry yue-input--lg`,
        )
      } else if (!rendered.scopedInput.styled) {
        fail('the scoped Input is not matched by any loaded stylesheet rule')
      } else {
        notes.push(
          'cross-package locale: provideLocale() from @yue-ui/hooks reached a @yue-ui/vue ' +
            'component (clear label "Effacer") and kept the inherited size (lg)',
        )
      }

      // The language-pack subpath, proved end to end: a subtree that installed the pack it
      // imported must read that pack's string, while the rest of the page stays in en-US.
      if (!rendered.chineseInput) {
        fail('the subtree that installed @yue-ui/vue/locale/zh-CN did not render')
      } else if (rendered.chineseInput.clearLabel !== '清空') {
        fail(
          `a subtree speaking zh-CN reads "${rendered.chineseInput.clearLabel}" instead of ` +
            '"清空" — the language pack subpath did not travel with the tarball',
        )
      } else if (rendered.chineseInput.clearLabel === input.clearLabel) {
        fail('the Chinese subtree and the English page read the same label, so nothing switched')
      } else {
        notes.push(
          'language pack: @yue-ui/vue/locale/zh-CN reached a component (' +
            `"${rendered.chineseInput.clearLabel}") while the page stayed "${input.clearLabel}"`,
        )
      }

      // The adapter contract, proved against the *installed* engine rather than a mock: the
      // application's own `vue-i18n` supplies Yue's text, and switching the engine re-renders a
      // component that is already mounted.
      if (!rendered.engineInput) {
        fail('the subtree driven by vue-i18n did not render')
      } else if (rendered.engineInput.before !== 'Clear') {
        fail(
          `the vue-i18n-driven field read "${rendered.engineInput.before}" instead of the ` +
            'engine\'s own "Clear"',
        )
      } else if (rendered.engineInput.after !== '清空') {
        fail(
          `after switching the vue-i18n locale the field read "${rendered.engineInput.after}" ` +
            'instead of "清空" — the adapter is not sharing the engine\'s locale ref',
        )
      } else {
        notes.push(
          'vue-i18n adapter: an installed engine supplied a component\'s text ' +
            `("${rendered.engineInput.before}" → "${rendered.engineInput.after}" without remounting)`,
        )
      }
    }
  } finally {
    if (KEEP) process.stdout.write(`kept: ${workDir}\n`)
    else rmSync(workDir, { recursive: true, force: true })
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
  process.stderr.write(`tarball: ${error.message}\n`)
  process.exitCode = 2
}
