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

  write(
    'entry.ts',
    `import { createApp, h, resolveComponent } from 'vue'
import YueButton from '@yue-ui/vue/button'
import YueUI from '@yue-ui/vue/plugin'
import '@yue-ui/design-tokens/index.css'
import '@yue-ui/vue/button.css'
import './consumer.css'

const app = createApp({
  render() {
    // Resolved at render time: this is what proves the plugin actually registered
    // the component globally.
    const RegisteredButton = resolveComponent('YueButton')
    return h('div', [
      h(YueButton, { theme: 'primary' }, { default: () => '保存' }),
      h(RegisteredButton, { size: 'sm', 'data-probe': 'plugin' }, { default: () => '取消' }),
    ])
  },
})

// Registers YueButton globally and applies the documented option.
app.use(YueUI, { size: 'md' })
app.mount('#app')
`,
  )

  // Proves the shipped declarations are usable by a normal TypeScript project.
  write(
    'types.ts',
    `import YueButton from '@yue-ui/vue/button'
import { YueButton as Named } from '@yue-ui/vue'
import type { YueButtonProps, YueButtonTheme } from '@yue-ui/vue'
import YueUI from '@yue-ui/vue/plugin'

const theme: YueButtonTheme = 'primary'
const props: YueButtonProps = { theme, variant: 'outline', size: 'lg', loading: false }

export const same: typeof YueButton = Named
export const plugin = YueUI
export const used = props
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
import { YueButton as NamedButton } from '@yue-ui/vue'
import YueUI from '@yue-ui/vue/plugin'
import { DEFAULT_YUE_CONFIG, YUE_NAMESPACE, useConfig, useNamespace } from '@yue-ui/hooks'

const specifiers = {
  root: '@yue-ui/vue',
  button: '@yue-ui/vue/button',
  plugin: '@yue-ui/vue/plugin',
  style: '@yue-ui/vue/style.css',
  buttonCss: '@yue-ui/vue/button.css',
  hooks: '@yue-ui/hooks',
  hooksPackageJson: '@yue-ui/hooks/package.json',
  tokens: '@yue-ui/design-tokens/index.css',
  tokenComponents: '@yue-ui/design-tokens/components.css',
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

process.stdout.write(
  'NODE-CHECK ' +
    JSON.stringify({
      same: YueButton === NamedButton,
      name: YueButton?.name ?? null,
      hasInstall: typeof YueUI?.install === 'function',
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
  build: { outDir: 'dist', emptyOutDir: true, minify: false },
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
      'vue@3.5.28',
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
    browser = await chromium.launch({ channel: 'chrome', headless: true })
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

    if (consoleErrors.length > 0) fail(`consumer console errors: ${consoleErrors.join(' | ')}`)
    return rendered
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
      if (report.name !== 'YueButton') {
        fail(`component name is "${report.name}", expected "YueButton"`)
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
        '@yue-ui/design-tokens/index.css',
        join(consumer, 'node_modules/@yue-ui/design-tokens/src/index.css'),
      ],
      [
        '@yue-ui/design-tokens/components.css',
        join(consumer, 'node_modules/@yue-ui/design-tokens/src/components/index.css'),
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
      for (const marker of ['.yue-button', 'yue-button--primary', '--button-primary-background']) {
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
    notes.push(
      `rendered in a browser: ${rendered.className}, fill ${rendered.backgroundColor}, ` +
        `height ${rendered.height}px, ${rendered.loadedFaces}/${rendered.totalFaces} token fonts loaded`,
    )
    notes.push(
      `plugin-registered button: ${rendered.plugin?.className ?? 'missing'} ` +
        `(height ${rendered.plugin?.height ?? '?'} vs token ${rendered.plugin?.expectedSmHeight ?? '?'})`,
    )
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
