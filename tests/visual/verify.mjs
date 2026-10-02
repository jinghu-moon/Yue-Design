#!/usr/bin/env node
/**
 * Visual and behavioural verification of the Button documentation page.
 *
 * It runs against the *built* site served over HTTP — the same artefacts a user
 * would deploy — not against a dev server. That matters: prerendering, hydration,
 * CSS bundling order and asset URLs are all part of what is being checked, and a
 * dev server hides every one of them.
 *
 * Checks:
 *   1. the page opens and renders real `.yue-button` markup after hydration;
 *   2. light theme resolves the Button tokens the way the token sheet says;
 *   3. the dark switch changes `data-theme` and therefore the resolved tokens;
 *   4. the accent switch changes `data-accent` and `--accent-solid`;
 *   5. a 390px viewport has no horizontal overflow;
 *   6. no request leaves the origin (no CDN, no font host);
 *   7. no console error and no uncaught page error;
 *   8. the disabled and loading states are correct in the DOM and on screen;
 *   9. every theme x variant cell in the documentation matrix clears AA against the
 *      surface it is actually drawn on, in both themes — measured in the browser,
 *      with the same colour maths the token audit uses;
 *  10. the variant semantics hold in the rendered box: `solid`/`outline`/`dashed`/
 *      `text` share the control box, `link` does not;
 *  11. hover and `:focus-visible` land on the same colour state, and the focus ring
 *      survives.
 *
 * Screenshots are written to `tests/visual/button-{light,dark,mobile}.png`, plus
 * element crops of the theme x variant matrix.
 *
 * Usage: node tests/visual/verify.mjs
 */
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
// The same colour maths the token audit gates with, so a ratio measured here and a
// ratio measured in `pnpm audit:tokens` can never disagree.
import { parseColor } from '../../tools/lib/color.mjs'
import { contrastRatio, flatten } from '../../tools/lib/contrast.mjs'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url))
const SITE_DIR = resolve(REPO_ROOT, 'apps/docs/.vitepress/dist')

const problems = []
const notes = []
const fail = (message) => problems.push(message)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
}

/** Resolve a URL path to a file the way a static host would. */
function resolveRequest(pathname) {
  const clean = decodeURIComponent(pathname.split('?')[0].split('#')[0])
  const candidates = []
  if (clean.endsWith('/')) candidates.push(join(SITE_DIR, `${clean}index.html`))
  else {
    candidates.push(join(SITE_DIR, clean))
    if (extname(clean) === '') {
      candidates.push(join(SITE_DIR, `${clean}.html`))
      candidates.push(join(SITE_DIR, clean, 'index.html'))
    }
  }
  for (const candidate of candidates) {
    // Never serve outside the site directory.
    if (!candidate.startsWith(SITE_DIR)) continue
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

function startServer() {
  const server = createServer((request, response) => {
    const file = resolveRequest(request.url ?? '/')
    if (!file) {
      response.writeHead(404, { 'content-type': 'text/plain' })
      response.end('not found')
      return
    }
    response.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    response.end(readFileSync(file))
  })
  return new Promise((resolvePromise) => {
    server.listen(0, '127.0.0.1', () => resolvePromise(server))
  })
}

/**
 * Launch an installed browser.
 *
 * `playwright-core` ships no browser download, so this uses a browser that is
 * already on the machine. Chrome first, then Edge, then an explicit path from the
 * environment — each reported clearly instead of failing with a stack trace.
 */
async function launchBrowser() {
  const attempts = [
    { label: 'channel chrome', options: { channel: 'chrome' } },
    { label: 'channel msedge', options: { channel: 'msedge' } },
  ]
  if (process.env.YUE_BROWSER_PATH) {
    attempts.unshift({
      label: `YUE_BROWSER_PATH (${process.env.YUE_BROWSER_PATH})`,
      options: { executablePath: process.env.YUE_BROWSER_PATH },
    })
  }

  const failures = []
  for (const attempt of attempts) {
    try {
      const browser = await chromium.launch({ ...attempt.options, headless: true })
      notes.push(`browser: ${attempt.label}`)
      return browser
    } catch (error) {
      failures.push(`${attempt.label}: ${error.message.split('\n')[0]}`)
    }
  }
  throw new Error(
    'could not launch a browser. Tried:\n' +
      failures.map((line) => `    ${line}`).join('\n') +
      '\nInstall Chrome or Edge, or set YUE_BROWSER_PATH.',
  )
}

/** Resolve a token the way the browser does, by asking a probe element. */
const TOKEN_PROBE = (names) => {
  const probe = document.createElement('div')
  document.body.appendChild(probe)
  const out = {}
  for (const name of names) {
    probe.style.backgroundColor = ''
    probe.style.backgroundColor = `var(${name})`
    out[name] = getComputedStyle(probe).backgroundColor
  }
  probe.remove()
  return out
}

/** Variants that keep the full control box, and the one that deliberately does not. */
const BOXED_VARIANTS = ['solid', 'outline', 'dashed', 'text']

/**
 * A canonical colour reader, installed into every page before any script runs.
 *
 * `getComputedStyle` reports the same colour differently depending on where it came
 * from: a custom property holding `#1f1f1f` comes back as `rgb(31, 31, 31)`, while a
 * `color-mix()` result comes back as `oklab(...)`, and `canvas.fillStyle` preserves
 * whichever space it was given. String comparison would then call two identical
 * colours different — and, worse, could call an unchanged colour *changed*.
 *
 * So paint one pixel and read it back: canvas pixel data is always sRGB 8-bit, which
 * is exactly the common denominator `tools/lib/color.mjs` parses.
 *
 * Installed as an init script rather than passed into each `evaluate`, because a
 * serialised function cannot close over a page-side canvas, and duplicating it in
 * every probe is how the two copies drift.
 */
const NORMALIZE_FN = '__yueVisualNormalizeColor'

const NORMALIZE_INIT_SCRIPT = `
window.${NORMALIZE_FN} = (() => {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d', { willReadFrequently: true })
  return (value) => {
    if (!value) return value
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = '#000'
    context.fillStyle = value
    context.fillRect(0, 0, 1, 1)
    const data = context.getImageData(0, 0, 1, 1).data
    return 'rgba(' + data[0] + ', ' + data[1] + ', ' + data[2] + ', ' + (data[3] / 255) + ')'
  }
})()
`

/**
 * The interaction states every matrix cell must stay readable in.
 *
 * Resting alone is not enough: `--opacity-hover` / `--opacity-pressed` feed the
 * shared overlay, so changing either — or a theme colour — can push a state below AA
 * while the resting measurement still passes.
 */
const CELL_STATES = ['resting', 'hover', 'focus-visible', 'pressed']

/**
 * Read a cell's effective colours, whatever state it is in.
 *
 * `matches()` is reported alongside the colours so the caller can prove the state was
 * actually entered: a `mouse.down()` that never produced `:active` would otherwise
 * report the resting colour and pass as a "pressed" measurement.
 */
function readCell(page, selector) {
  return page.$eval(
    selector,
    (element, normalizeName) => {
      const normalize = window[normalizeName]
      const style = getComputedStyle(element)
      const surface = element.closest('.preview-frame__surface')
      const declared = style.transitionDuration.split(',')[0].trim()
      return {
        color: normalize(style.color),
        background: normalize(style.backgroundColor),
        borderStyle: style.borderTopStyle,
        surfaceColor: surface ? normalize(getComputedStyle(surface).backgroundColor) : null,
        height: style.height,
        touchAction: style.touchAction,
        verticalAlign: style.verticalAlign,
        position: style.position,
        overflow: style.overflow,
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
        transitionMs: declared.endsWith('ms')
          ? Number.parseFloat(declared)
          : Number.parseFloat(declared) * 1000,
        hovered: element.matches(':hover'),
        active: element.matches(':active'),
        focusVisible: element.matches(':focus-visible'),
      }
    },
    NORMALIZE_FN,
  )
}

/**
 * Drive a cell into one interaction state and read it there.
 *
 * Every state is entered the way a user enters it — the real pointer for hover and
 * press, a real key press to prime `:focus-visible` — because none of them can be
 * forced from script, and a state that was never entered would silently measure the
 * resting colour.
 */
async function measureCell(page, key, state) {
  const selector = `[data-matrix="${key}"]`

  // Reset: pointer away from every button, nothing focused.
  await page.mouse.move(0, 0)
  await page.$eval(selector, (element) => element.blur())

  if (state === 'hover') {
    await page.hover(selector)
  } else if (state === 'pressed') {
    // `mouse.down()` presses wherever the pointer already is, so hover first.
    await page.hover(selector)
    await page.mouse.down()
  } else if (state === 'focus-visible') {
    // Chrome only matches `:focus-visible` on a programmatically focused element when
    // the last interaction was keyboard-ish, so prime it with a real key press.
    await page.keyboard.press('Tab')
    await page.$eval(selector, (element) => element.focus())
  }

  const reading = await readCell(page, selector)
  // Let the transition finish before sampling the colour.
  await page.waitForTimeout(Number.isFinite(reading.transitionMs) ? reading.transitionMs + 150 : 250)
  const settled = await readCell(page, selector)

  if (state === 'pressed') await page.mouse.up()
  if (state === 'focus-visible') await page.$eval(selector, (element) => element.blur())

  return settled
}

/** Contrast of a cell's text against the fill it is actually drawn on. */
function cellContrast(reading) {
  // Composite the cell's own fill over the surface underneath it. For a filled
  // variant that is just the fill; for the unfilled variants the overlay is
  // translucent, so this is what resolves to the real backdrop. `link` and `text`
  // rest on the surface, which is the colour they are read against.
  const backdrop = flatten([parseColor(reading.surfaceColor), parseColor(reading.background)])
  return contrastRatio(parseColor(reading.color), backdrop)
}

/**
 * Walk the documentation's theme x variant matrix and check it where it matters: the
 * rendered pixels, in every interaction state.
 *
 * Two things make this worth doing in a browser rather than in the token audit:
 *
 *   - the audit can only resolve tokens it knows how to parse. `color-mix(...,
 *     currentColor, ...)` — the shared hover and pressed overlay the `outline`,
 *     `dashed` and `text` variants use — is not one of them, so the audit cannot see
 *     those states at all. That is the stated boundary: the audit gates the opaque,
 *     statically resolvable fills; this sweep gates everything that depends on what
 *     is underneath or on `currentColor`.
 *   - the effective backdrop depends on the page. An unfilled variant is drawn on
 *     whatever surface it sits on, and that is only knowable once it is rendered.
 *
 * The arithmetic is imported from `tools/lib`, so a ratio here and a ratio in
 * `pnpm audit:tokens` are the same number by construction.
 */
async function checkMatrix(page, theme) {
  const keys = await page.$$eval('[data-matrix]', (elements) =>
    elements.map((element) => element.dataset.matrix),
  )

  if (keys.length === 0) {
    fail(`${theme}: the documentation has no [data-matrix] cells to check`)
    return
  }

  const resting = await readCell(page, '[data-matrix]')
  const expectedBox = await page.evaluate(() => {
    const probe = document.createElement('div')
    probe.style.height = 'var(--button-height-md)'
    document.body.appendChild(probe)
    const height = getComputedStyle(probe).height
    probe.remove()
    return height
  })

  const failures = []
  const ratios = []
  let measurements = 0

  for (const key of keys) {
    const variant = key.slice(0, key.lastIndexOf('-'))
    if (!BOXED_VARIANTS.includes(variant) && variant !== 'link') {
      fail(`${theme}: unparseable matrix key "${key}"`)
      continue
    }

    const readings = {}
    for (const state of CELL_STATES) {
      readings[state] = await measureCell(page, key, state)
      measurements += 1
    }

    // The state must have been entered, or the measurement is really the resting one.
    if (!readings.hover.hovered) fail(`${theme} ${key}: hover was never entered`)
    if (!readings.pressed.active) fail(`${theme} ${key}: the pressed state was never entered`)
    if (!readings['focus-visible'].focusVisible) {
      fail(`${theme} ${key}: :focus-visible never matched, so a keyboard user sees no cue`)
    }

    // Every state must clear AA on its own.
    for (const state of CELL_STATES) {
      const ratio = cellContrast(readings[state])
      ratios.push({ key, state, ratio })
      if (ratio < 4.5) failures.push(`${key} @${state} ${ratio.toFixed(2)}:1`)
    }

    // Hover and keyboard focus have to land on the same colour state.
    if (readings['focus-visible'].background !== readings.hover.background) {
      fail(
        `${theme} ${key}: focus-visible fill ${readings['focus-visible'].background} differs ` +
          `from the hover fill ${readings.hover.background}`,
      )
    }

    // A variant that paints on interaction must actually change: otherwise the
    // "hover" and "pressed" measurements above are just the resting colour twice.
    // `link` is exempt — it signals interaction with an underline, not a fill.
    if (variant !== 'link') {
      if (readings.hover.background === readings.resting.background) {
        fail(`${theme} ${key}: hover changed nothing`)
      }
      if (readings.pressed.background === readings.resting.background) {
        fail(`${theme} ${key}: pressed changed nothing`)
      }
      if (readings.pressed.background === readings.hover.background) {
        fail(`${theme} ${key}: pressed and hover are the same state`)
      }
    }

    // The box contract: `link` is the only variant without a fixed height.
    const boxed = BOXED_VARIANTS.includes(variant)
    if (boxed && readings.resting.height !== expectedBox) {
      fail(`${theme} ${key}: boxed variant height ${readings.resting.height} != ${expectedBox}`)
    }
    if (!boxed && readings.resting.height === expectedBox) {
      fail(`${theme} ${key}: link kept the control box (${readings.resting.height})`)
    }

    // The base interaction contract, on the rendered element rather than in the source.
    for (const property of ['touchAction', 'verticalAlign', 'position']) {
      const expected = { touchAction: 'manipulation', verticalAlign: 'middle', position: 'relative' }
      if (readings.resting[property] !== expected[property]) {
        fail(`${theme} ${key}: ${property} is "${readings.resting[property]}"`)
      }
    }
    if (readings.resting.overflow === 'hidden') {
      fail(`${theme} ${key}: overflow is hidden, which we deliberately do not copy`)
    }
    // `dashed` must actually be dashed, in both themes; the other boxed variants solid.
    if (variant === 'dashed' && readings.resting.borderStyle !== 'dashed') {
      fail(`${theme} ${key}: border-style is "${readings.resting.borderStyle}"`)
    }
    if (variant !== 'dashed' && boxed && variant !== 'solid' && readings.resting.borderStyle !== 'solid') {
      fail(`${theme} ${key}: border-style is "${readings.resting.borderStyle}"`)
    }

    // The focus ring has to survive the shared colour state.
    if (
      readings['focus-visible'].outlineStyle === 'none' ||
      Number.parseFloat(readings['focus-visible'].outlineWidth) <= 0
    ) {
      fail(
        `${theme} ${key}: focus ring missing ` +
          `(${readings['focus-visible'].outlineWidth} ${readings['focus-visible'].outlineStyle})`,
      )
    }
  }

  // Leave the page as we found it.
  await page.mouse.move(0, 0)
  await page.keyboard.press('Escape')

  const worst = ratios.reduce((low, entry) => (entry.ratio < low.ratio ? entry : low), ratios[0])
  notes.push(
    `${theme} matrix: ${keys.length} cells × ${CELL_STATES.length} states ` +
      `(${measurements} measurements), lowest contrast ${worst.ratio.toFixed(2)}:1 ` +
      `(${worst.key} @${worst.state})`,
  )

  if (failures.length > 0) {
    fail(
      `${theme}: ${failures.length} state measurement(s) below AA — ${failures.join('; ')}. ` +
        'The opaque fills are gated by PACKAGE_CONTRAST_PAIRS in the token audit; the ' +
        'translucent `currentColor` overlays can only be measured here.',
    )
  }

  if (theme === 'light') {
    // A phone-width matrix is a different layout, not a different colour system, so
    // the interaction sweep runs at the desktop width only.
    await checkFocusRingSurvives(page)
  }
}

/**
 * The focus ring must be drawn from its own tokens and must not be replaced by the
 * shared hover fill.
 */
async function checkFocusRingSurvives(page) {
  const selector = '[data-matrix="solid-primary"]'
  await page.keyboard.press('Tab')
  await page.$eval(selector, (element) => element.focus())
  await page.waitForTimeout(250)

  const ring = await page.$eval(
    selector,
    (element) => {
      const style = getComputedStyle(element)
      return {
        width: style.outlineWidth,
        style: style.outlineStyle,
        color: style.outlineColor,
        offset: style.outlineOffset,
        focusVisible: element.matches(':focus-visible'),
      }
    },
    undefined,
  )
  await page.$eval(selector, (element) => element.blur())

  if (!ring.focusVisible) fail('focus ring probe: the button did not match :focus-visible')
  if (ring.style === 'none' || Number.parseFloat(ring.width) <= 0) {
    fail(`focus ring probe: ${ring.width} ${ring.style}`)
  }
  if (ring.offset === '0px') {
    fail('focus ring probe: outline-offset is 0, so the ring touches the fill')
  }
  notes.push(
    `focus ring: ${ring.width} ${ring.style} ${ring.color}, offset ${ring.offset}`,
  )
}

async function main() {
  if (!existsSync(SITE_DIR)) {
    process.stderr.write(
      `visual: ${relative(REPO_ROOT, SITE_DIR)} not found — run \`corepack pnpm build\` first.\n`,
    )
    return 2
  }
  mkdirSync(HERE, { recursive: true })

  const server = await startServer()
  const origin = `http://127.0.0.1:${server.address().port}`
  const browser = await launchBrowser()

  const consoleErrors = []
  const pageErrors = []
  const externalRequests = []
  const badResponses = []

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('request', (request) => {
      const url = request.url()
      if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:')) {
        externalRequests.push(url)
      }
    })
    page.on('response', (response) => {
      if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`)
    })

    // Before any navigation, so every probe below can read a canonical colour.
    await page.addInitScript(NORMALIZE_INIT_SCRIPT)

    // 1 — the page opens and hydration produced real component markup.
    const response = await page.goto(`${origin}/components/button`, { waitUntil: 'load' })
    if (!response || !response.ok()) {
      fail(`page did not load: HTTP ${response?.status() ?? 'no response'}`)
    }
    await page.waitForSelector('.yue-button', { state: 'visible', timeout: 15_000 })
    const buttonCount = await page.locator('.yue-button').count()
    notes.push(`rendered .yue-button elements: ${buttonCount}`)
    if (buttonCount < 20) fail(`expected the page to render many buttons, saw ${buttonCount}`)

    // 2 — light theme resolves the Button tokens.
    const theme = await page.evaluate(() => document.documentElement.dataset.theme)
    if (theme !== 'light') fail(`expected data-theme="light" on first load, saw "${theme}"`)

    const lightTokens = await page.evaluate(TOKEN_PROBE, [
      '--button-primary-background',
      '--button-disabled-color',
      '--button-success-background',
      '--accent-solid',
    ])
    const primaryBackground = await page
      .locator('.yue-button--primary.yue-button--solid')
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          className: element.className,
          backgroundColor: style.backgroundColor,
          // `--_fill` and its sources: if a custom property is unresolvable the
          // declaration using it is dropped, and background-color silently becomes
          // transparent — so report the chain, not just the result.
          fill: style.getPropertyValue('--_fill').trim(),
          fillToken: style.getPropertyValue('--button-primary-background').trim(),
          onFill: style.getPropertyValue('--_on-fill').trim(),
          color: style.color,
        }
      })
    if (primaryBackground.backgroundColor !== lightTokens['--button-primary-background']) {
      fail(
        `primary solid button background ${primaryBackground.backgroundColor} does not match ` +
          `--button-primary-background ${lightTokens['--button-primary-background']} ` +
          `[${JSON.stringify(primaryBackground)}]`,
      )
    }
    notes.push(`light: --button-primary-background = ${lightTokens['--button-primary-background']}`)

    // 2b — the class the component renders is matched by a rule the page loaded,
    // and the rule that matched is the one the token contract describes.
    //
    // This is the browser-level version of the namespace defect: the DOM said
    // `.app-button` while the stylesheet only knew `.yue-button`, so every class
    // looked right and nothing was styled. Asserting the computed values is not
    // enough on its own — a host reset could supply them — so this also proves the
    // selector matched by scanning the loaded stylesheets.
    const styleMatch = await page.evaluate(() => {
      // A button from inside a preview *surface*, not the first `.yue-button` on the
      // page: the first one is a toolbar switch at `size="sm"`, so anchoring on it
      // would compare a 28px button against the `md` token.
      const element = document.querySelector('.preview-frame__surface .yue-button')
      const blockClass = [...element.classList].find((name) => /^[a-z][a-z0-9]*-button$/.test(name))
      const sizeClass = [...element.classList].find((name) => /-button--(sm|md|lg)$/.test(name))

      const matchedSelectors = []
      let ruleCount = 0
      for (const sheet of document.styleSheets) {
        let rules
        try {
          rules = sheet.cssRules
        } catch {
          continue // cross-origin sheet; the page is same-origin, so this is not expected
        }
        const walk = (list) => {
          for (const rule of list) {
            if (rule.cssRules && !rule.selectorText) {
              walk(rule.cssRules)
              continue
            }
            if (!rule.selectorText) continue
            ruleCount += 1
            try {
              if (element.matches(rule.selectorText)) matchedSelectors.push(rule.selectorText)
            } catch {
              /* unparseable selector for matches(); ignore */
            }
          }
        }
        walk(rules)
      }

      const style = getComputedStyle(element)
      // Resolve the token for the size this button actually declares, so the
      // expectation tracks the component's own class rather than a guess.
      const sizeToken = style.getPropertyValue(`--button-height-${sizeClass?.split('--')[1]}`).trim()
      const probe = document.createElement('div')
      probe.style.height = sizeToken
      document.body.appendChild(probe)
      const expectedHeight = getComputedStyle(probe).height
      probe.remove()

      return {
        blockClass,
        sizeClass,
        sizeToken,
        ruleCount,
        matched: matchedSelectors.filter((selector) => selector.includes(blockClass)),
        height: style.height,
        expectedHeight,
        borderRadius: style.borderRadius,
      }
    })

    if (!styleMatch.blockClass) {
      fail('the sampled button has no `<namespace>-button` block class')
    }
    if (!styleMatch.sizeClass) {
      fail('the sampled button declares no size class')
    }
    if (styleMatch.matched.length === 0) {
      fail(
        `no loaded stylesheet rule matches .${styleMatch.blockClass} ` +
          `(scanned ${styleMatch.ruleCount} rules) — the component's class namespace and the ` +
          'stylesheet disagree, so the button renders unstyled',
      )
    }
    if (styleMatch.height !== styleMatch.expectedHeight) {
      fail(
        `button height ${styleMatch.height} does not match ${styleMatch.sizeToken} ` +
          `(--button-height-${styleMatch.sizeClass?.split('--')[1]} = ${styleMatch.expectedHeight})`,
      )
    }
    if (styleMatch.borderRadius === '0px') {
      fail('the button has no border radius, so the base rule did not apply')
    }
    notes.push(
      `class ${styleMatch.blockClass} (${styleMatch.sizeClass}): height ${styleMatch.height} ` +
        `= ${styleMatch.expectedHeight}, ${styleMatch.matched.length} loaded rule(s) match`,
    )

    await page.screenshot({ path: join(HERE, 'button-light.png'), fullPage: true })

    // 9-11 — the theme x variant matrix, in light.
    const matrixFigure = page.locator('figure.preview-frame', { has: page.locator('[data-matrix]') })
    await checkMatrix(page, 'light')
    await matrixFigure.screenshot({ path: join(HERE, 'button-matrix-light.png') })

    // 3 — the dark switch really re-themes the tokens.
    await page.getByRole('button', { name: '深色' }).first().click()
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
    const darkTokens = await page.evaluate(TOKEN_PROBE, [
      '--button-primary-background',
      '--button-success-background',
      '--text-primary',
    ])
    if (darkTokens['--button-primary-background'] === lightTokens['--button-primary-background']) {
      fail('--button-primary-background did not change in dark mode')
    }
    if (
      await page.evaluate(
        // `html` is legitimately transparent — VitePress paints `body`. Check the
        // element that actually carries the page colour.
        () => getComputedStyle(document.body).backgroundColor === 'rgba(0, 0, 0, 0)',
      )
    ) {
      fail('body background is transparent in dark mode')
    }
    notes.push(`dark: --button-primary-background = ${darkTokens['--button-primary-background']}`)
    await page.screenshot({ path: join(HERE, 'button-dark.png'), fullPage: true })

    // The same matrix in dark: the whole point is that the saturated fills flip and
    // the text has to flip with them, which is exactly where a hand-picked colour
    // would have gone wrong.
    await checkMatrix(page, 'dark')
    await matrixFigure.screenshot({ path: join(HERE, 'button-matrix-dark.png') })

    // 4 — accent switching.
    await page.getByRole('button', { name: '中性' }).first().click()
    await page.waitForFunction(() => document.documentElement.dataset.accent === 'neutral')
    const neutralAccent = await page.evaluate(TOKEN_PROBE, ['--accent-solid'])
    if (neutralAccent['--accent-solid'] === lightTokens['--accent-solid']) {
      fail('--accent-solid did not change when switching to the neutral accent')
    }
    notes.push(`neutral accent: --accent-solid = ${neutralAccent['--accent-solid']}`)

    // Back to the documented defaults, and prove reset works.
    await page.getByRole('button', { name: '重置' }).first().click()
    await page.waitForFunction(
      () =>
        document.documentElement.dataset.theme === 'light' &&
        document.documentElement.dataset.accent === 'azure',
    )

    // 8 — disabled and loading states.
    const disabledNative = page.locator('button.yue-button[disabled]').first()
    if ((await disabledNative.count()) === 0) fail('no natively disabled button was rendered')
    const linkDisabled = page.locator('a.yue-button[aria-disabled="true"]').first()
    if ((await linkDisabled.count()) === 0) {
      fail('no aria-disabled anchor button was rendered')
    } else if ((await linkDisabled.getAttribute('disabled')) !== null) {
      fail('an anchor button got the native disabled attribute')
    }
    const busy = page.locator('.yue-button[aria-busy="true"]').first()
    if ((await busy.count()) === 0) fail('no button exposed aria-busy="true" while loading')
    const spinnerBox = await page
      .locator('.yue-button__spinner')
      .first()
      .boundingBox()
    if (!spinnerBox || spinnerBox.width < 8 || spinnerBox.height < 8) {
      fail(`the loading spinner has no visible box: ${JSON.stringify(spinnerBox)}`)
    }
    const busyDisabled = await busy.getAttribute('disabled')
    if (busyDisabled !== null) {
      fail('a loading button set the native disabled attribute, which would drop focus')
    }

    // 8 — the code panel is collapsed by default and opens on demand.
    const codeBody = page.locator('.preview-frame__code-body').first()
    if (await codeBody.isVisible()) fail('the code panel starts open; it should be collapsed')
    const codeToggle = page.getByRole('button', { name: '查看代码' }).first()
    if ((await codeToggle.count()) === 0) fail('no code panel toggle was rendered')
    await codeToggle.click()
    await page.waitForFunction(
      () => document.querySelector('.preview-frame__code-body')?.offsetHeight > 0,
    )
    const codeText = (await codeBody.innerText()).trim()
    if (codeText.length === 0) fail('the first code panel is empty after opening it')
    // The first example documents the entry points (imports); a template snippet
    // lives further down. Assert both, so neither kind can silently disappear.
    const templatePanels = await page
      .locator('.preview-frame__code-body', { hasText: '<YueButton' })
      .count()
    if (templatePanels === 0) fail('no code panel shows a <YueButton> template snippet')
    notes.push(`code panels: first is ${codeText.split('\n')[0].trim().slice(0, 40)}…`)
    await codeToggle.click()

    // 5 — no horizontal overflow at 390px.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(150)
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      widest: (() => {
        let worst = { tag: '', right: 0 }
        for (const element of document.querySelectorAll('body *')) {
          const rect = element.getBoundingClientRect()
          if (rect.width === 0) continue
          if (rect.right > worst.right) worst = { tag: element.className || element.tagName, right: rect.right }
        }
        return worst
      })(),
    }))
    notes.push(`390px: scrollWidth ${overflow.scrollWidth} / clientWidth ${overflow.clientWidth}`)
    if (overflow.scrollWidth > overflow.clientWidth) {
      fail(
        `horizontal overflow at 390px: scrollWidth ${overflow.scrollWidth} > ` +
          `clientWidth ${overflow.clientWidth} (widest: ${overflow.widest.tag} at ${Math.round(overflow.widest.right)}px)`,
      )
    }
    await page.screenshot({ path: join(HERE, 'button-mobile.png'), fullPage: true })

    // 6 + 7 — the page must be self-contained and silent.
    if (externalRequests.length > 0) {
      fail(
        `page requested ${externalRequests.length} external resource(s): ` +
          [...new Set(externalRequests)].slice(0, 5).join(', '),
      )
    }
    if (badResponses.length > 0) {
      fail(`page requested ${badResponses.length} missing resource(s): ${badResponses.join(', ')}`)
    }
    if (consoleErrors.length > 0) {
      fail(`console errors: ${consoleErrors.slice(0, 5).join(' | ')}`)
    }
    if (pageErrors.length > 0) {
      fail(`page errors: ${pageErrors.slice(0, 5).join(' | ')}`)
    }

    await context.close()
  } finally {
    await browser.close()
    await new Promise((resolvePromise) => server.close(resolvePromise))
  }

  for (const note of notes) process.stdout.write(`  ${note}\n`)
  for (const shot of [
  'button-light.png',
  'button-dark.png',
  'button-mobile.png',
  'button-matrix-light.png',
  'button-matrix-dark.png',
]) {
    const file = join(HERE, shot)
    if (existsSync(file)) process.stdout.write(`  screenshot: ${relative(REPO_ROOT, file).replaceAll('\\', '/')}\n`)
    else fail(`screenshot was not written: ${shot}`)
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
  process.exitCode = await main()
} catch (error) {
  process.stderr.write(`visual: ${error.message}\n`)
  process.exitCode = 2
}
