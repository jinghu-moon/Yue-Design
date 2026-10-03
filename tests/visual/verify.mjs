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
 *      survives;
 *  12. the Input page's eight states, in light, dark and the neutral accent: value
 *      contrast on the composited fill, hover that must and must not fire, the error
 *      border surviving focus, `label for` reaching the native control, the real tab
 *      order, readonly being copyable while disabled is not, clearing that keeps the
 *      caret, and the computed `forced-colors` / `prefers-reduced-motion` results;
 *  13. a long value at 390px widens nothing: the control scrolls instead of the page.
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

/**
 * The Input states the documentation renders, and what each one must be.
 *
 * `data-input-state` lands on the wrapper, because `data-*` is routed there by the
 * component's documented attribute contract — so these selectors are also a live check
 * that the routing did not change.
 */
const INPUT_STATES = {
  resting: { editable: true },
  placeholder: { editable: true },
  disabled: { disabled: true },
  readonly: { readonly: true },
  invalid: { invalid: true },
  'readonly-invalid': { readonly: true, invalid: true },
  clearable: { clearable: true },
  affixed: { editable: true, affixed: true },
}

/**
 * Check every Input state where it matters: the rendered pixels and the real platform
 * behaviour.
 *
 * A jsdom/happy-dom unit test cannot make most of these claims. It cannot tell whether
 * `:focus-visible` matched, whether Tab skipped a disabled control, whether a label's
 * `for` reached the real `<input>` rather than a wrapper, or whether the focus ring was
 * actually drawn — and `mount()` without `attachTo` cannot even focus an element. So the
 * authoritative assertions for those live here.
 */
async function checkInputs(page, theme) {
  const selectors = Object.keys(INPUT_STATES)
  const missing = []
  for (const id of selectors) {
    if ((await page.locator(`[data-input-state="${id}"]`).count()) === 0) missing.push(id)
  }
  if (missing.length > 0) {
    fail(`${theme}: the Input page is missing state(s): ${missing.join(', ')}`)
    return
  }

  // Every hook must be unique. `querySelector` silently returns the first match, so a
  // duplicated value makes the assertions below read one element while the reader assumes
  // another — this actually happened: the state matrix binds its values at runtime, so
  // `disabled` existed both there and in the prose example, and the contrast probe was
  // measuring the four-character example field rather than the matrix cell.
  const duplicateHooks = await page.evaluate(
    (ids) =>
      ids
        .map((id) => ({ id, count: document.querySelectorAll(`[data-input-state="${id}"]`).length }))
        .filter((entry) => entry.count !== 1),
    selectors,
  )
  if (duplicateHooks.length > 0) {
    fail(
      `${theme}: data-input-state hooks are not unique — ` +
        duplicateHooks.map((entry) => `${entry.id}×${entry.count}`).join(', '),
    )
  }

  const readState = (id) =>
    page.$eval(
      `[data-input-state="${id}"]`,
      (element, normalizeName) => {
        const normalize = window[normalizeName]
        const control = element.querySelector('input')
        const style = getComputedStyle(element)
        // The opaque colour the field is painted on. Several Input tokens are
        // `color-mix(…, transparent)`, so a fill read on its own is not a colour a user
        // ever sees — and `flatten()` treats its first layer as opaque, which would turn
        // a translucent fill into a wrong-but-plausible number.
        let node = element.parentElement
        let backdrop = 'rgb(255, 255, 255)'
        while (node) {
          const background = getComputedStyle(node).backgroundColor
          if (background && !/rgba\(0, 0, 0, 0\)|transparent/.test(background)) {
            backdrop = background
            break
          }
          node = node.parentElement
        }
        return {
          background: normalize(style.backgroundColor),
          backdrop: normalize(backdrop),
          borderColor: normalize(style.borderTopColor),
          borderWidth: style.borderTopWidth,
          color: normalize(style.color),
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
          outlineColor: normalize(style.outlineColor),
          disabled: control.disabled,
          readOnly: control.readOnly,
          ariaInvalid: control.getAttribute('aria-invalid'),
          value: control.value,
          focusVisible: control.matches(':focus-visible'),
          focused: document.activeElement === control,
          // Distinguishes a real readonly from a disabled-by-other-means field.
          selectable: style.userSelect !== 'none',
          clearCount: element.querySelectorAll('.yue-input__clear').length,
          classes: [element.className, control.className],
        }
      },
      NORMALIZE_FN,
    )

  const readings = {}
  for (const id of selectors) readings[id] = await readState(id)

  // 1 — the three "cannot edit" states must be three different things, not one look.
  for (const [id, expected] of Object.entries(INPUT_STATES)) {
    const reading = readings[id]
    if (Boolean(expected.disabled) !== reading.disabled) {
      fail(`${theme} ${id}: native disabled is ${reading.disabled}, expected ${Boolean(expected.disabled)}`)
    }
    if (Boolean(expected.readonly) !== reading.readOnly) {
      fail(`${theme} ${id}: native readonly is ${reading.readOnly}, expected ${Boolean(expected.readonly)}`)
    }
    if (Boolean(expected.invalid) !== (reading.ariaInvalid === 'true')) {
      fail(`${theme} ${id}: aria-invalid is ${reading.ariaInvalid}`)
    }
    if (!expected.invalid && reading.ariaInvalid !== null) {
      fail(`${theme} ${id}: a valid field carries aria-invalid="${reading.ariaInvalid}"`)
    }
  }

  if (readings.disabled.background === readings.resting.background) {
    fail(`${theme}: the disabled field shares the resting fill`)
  }
  if (readings.readonly.background === readings.resting.background) {
    fail(`${theme}: the readonly field shares the resting fill`)
  }
  if (readings.disabled.background === readings.readonly.background) {
    fail(`${theme}: readonly and disabled are visually the same state`)
  }
  if (readings.disabled.color === readings.resting.color) {
    fail(`${theme}: disabled text is not distinguished from resting text`)
  }
  if (readings.readonly.color !== readings.resting.color) {
    fail(`${theme}: readonly text colour changed; it must stay readable like any value`)
  }
  if (readings.invalid.borderColor === readings.resting.borderColor) {
    fail(`${theme}: the invalid field's border is not distinguished from resting`)
  }
  if (readings['readonly-invalid'].borderColor !== readings.invalid.borderColor) {
    fail(`${theme}: readonly dropped the error border`)
  }

  // 2 — contrast of the value in each state, measured on the composited result.
  //
  // Both the fill and (for the disabled state) the text are `color-mix(…, transparent)`,
  // so the only honest measurement paints the fill onto the surface behind it and then
  // the text onto that. Comparing either one raw reports a number nobody experiences: an
  // earlier version of this check compared two translucent values and announced
  // 1.01:1 for a state that is really about 2.2:1.
  const contrastOf = (reading) => {
    const backdrop = flatten([parseColor(reading.backdrop), parseColor(reading.background)])
    const text = flatten([
      parseColor(reading.backdrop),
      parseColor(reading.background),
      parseColor(reading.color),
    ])
    return contrastRatio(text, backdrop)
  }
  const ratios = []
  for (const id of selectors) {
    const ratio = contrastOf(readings[id])
    ratios.push({ id, ratio })
    // Disabled is exempt from WCAG and deliberately quiet, so it is reported rather
    // than gated — the same boundary the token audit draws.
    if (!INPUT_STATES[id].disabled && ratio < 4.5) {
      fail(`${theme} ${id}: value contrast ${ratio.toFixed(2)}:1 is below AA`)
    }
  }
  const worst = ratios.reduce((low, entry) => (entry.ratio < low.ratio ? entry : low), ratios[0])
  const gating = ratios.filter((entry) => !INPUT_STATES[entry.id].disabled)
  const worstGating = gating.reduce((low, entry) => (entry.ratio < low.ratio ? entry : low), gating[0])
  notes.push(
    `${theme} inputs: ${selectors.length} states, lowest gated value contrast ` +
      `${worstGating.ratio.toFixed(2)}:1 (${worstGating.id}); ` +
      `disabled ${ratios.find((entry) => entry.id === 'disabled').ratio.toFixed(2)}:1 ` +
      '(exempt, reported only)',
  )

  // 2b — readonly is copyable and disabled is not.
  //
  // This is the behavioural half of "readonly is not disabled", and it is the reason the
  // two states get different fills: a readonly value exists to be selected and copied, so
  // it has to be reachable by the keyboard and its text has to be selectable. Only a real
  // browser can answer either question — `mount()` without `attachTo` cannot focus, and
  // jsdom does not implement text selection.
  const copyable = await page.evaluate(() => {
    const probe = (state) => {
      const control = document.querySelector(`[data-input-state="${state}"] input`)
      control.focus()
      control.select()
      const focused = document.activeElement === control
      return {
        focused,
        // `window.getSelection()` deliberately not used: an `<input>`'s selection is not
        // part of the document selection, so it always reports ''. The control's own
        // selection range is the honest signal.
        selectedAll:
          control.selectionStart === 0 && control.selectionEnd === control.value.length,
        selectedLength: control.selectionEnd - control.selectionStart,
        valueLength: control.value.length,
      }
    }
    const result = { readonly: probe('readonly'), disabled: probe('disabled') }
    document.activeElement?.blur?.()
    return result
  })
  if (!copyable.readonly.focused) {
    fail(`${theme}: the readonly field could not take focus, so its value cannot be copied`)
  }
  if (!copyable.readonly.selectedAll) {
    fail(
      `${theme}: selecting the readonly field selected ${copyable.readonly.selectedLength} of ` +
        `${copyable.readonly.valueLength} characters, so the value is not fully copyable`,
    )
  }
  if (copyable.disabled.focused) {
    fail(`${theme}: the disabled field took focus, which a native disabled control must not`)
  }
  // Deliberately *not* asserted: that `selectionStart/End` stay at zero for the disabled
  // field. `select()` sets the range even on a disabled input — the API does not consult
  // the disabled state — so a range-based check reports "selectable" for something a user
  // cannot reach. The honest evidence for "not copyable" is that the control cannot take
  // focus and is skipped by Tab, both asserted above and below.

  // 3 — hover changes the border, but not on a field the user cannot edit.
  for (const id of ['resting', 'affixed']) {
    await page.mouse.move(0, 0)
    await page.hover(`[data-input-state="${id}"]`)
    await page.waitForTimeout(250)
    const hovered = await readState(id)
    if (hovered.borderColor === readings[id].borderColor) {
      fail(`${theme} ${id}: hover did not change the border colour`)
    }
    await page.mouse.move(0, 0)
    await page.waitForTimeout(250)
  }
  for (const id of ['disabled', 'readonly', 'invalid']) {
    await page.mouse.move(0, 0)
    await page.hover(`[data-input-state="${id}"]`)
    await page.waitForTimeout(250)
    const hovered = await readState(id)
    if (hovered.borderColor !== readings[id].borderColor) {
      // disabled/readonly must not react to hover; invalid must keep its error border.
      fail(`${theme} ${id}: hover changed the border, which it must not`)
    }
    await page.mouse.move(0, 0)
    await page.waitForTimeout(250)
  }

  // 4 — keyboard focus draws a ring, and the error border survives it.
  await page.keyboard.press('Tab')
  await page.$eval('[data-input-state="invalid"] input', (element) => element.focus())
  await page.waitForTimeout(250)
  const invalidFocused = await readState('invalid')
  if (!invalidFocused.focusVisible) {
    fail(`${theme}: the invalid field did not match :focus-visible when focused by keyboard`)
  }
  if (invalidFocused.borderColor !== readings.invalid.borderColor) {
    fail(
      `${theme}: focusing the invalid field replaced its error border with ` +
        `${invalidFocused.borderColor} — focus must not erase the error`,
    )
  }
  if (
    invalidFocused.outlineStyle === 'none' ||
    Number.parseFloat(invalidFocused.outlineWidth) <= 0
  ) {
    fail(
      `${theme}: an invalid field shows no focus ring ` +
        `(${invalidFocused.outlineWidth} ${invalidFocused.outlineStyle})`,
    )
  }
  await page.$eval('[data-input-state="invalid"] input', (element) => element.blur())

  // 4b — the locale is scoped to a subtree, and the page language drives the default.
  //
  // The two assertions together are what makes this real: the first field must speak the
  // *page* language (proving the docs site installed the component locale at all), and the
  // second must speak the other one (proving a subtree provider overrides it without the
  // component knowing a language exists).
  const locale = await page.evaluate(() => {
    const label = (state) =>
      document
        .querySelector(`[data-input-state="${state}"] .yue-input__clear`)
        ?.getAttribute('aria-label') ?? null
    return {
      lang: document.documentElement.lang,
      page: label('clearable-default'),
      scoped: label('clearable-translated'),
    }
  })
  const expectedLabels = locale.lang.toLowerCase().startsWith('zh')
    ? { page: '清空', scoped: 'Clear', other: 'en-US' }
    : { page: 'Clear', scoped: '清空', other: 'zh-CN' }
  if (locale.page === null || locale.scoped === null) {
    fail(`${theme}: the localisation example did not render both clear controls`)
  } else {
    if (locale.page !== expectedLabels.page) {
      fail(
        `${theme}: a field on a "${locale.lang}" page reads "${locale.page}" instead of ` +
          `"${expectedLabels.page}" — the page language did not reach the component`,
      )
    }
    if (locale.scoped !== expectedLabels.scoped) {
      fail(
        `${theme}: the scoped field reads "${locale.scoped}" instead of ` +
          `"${expectedLabels.scoped}" — the subtree locale did not override the page`,
      )
    }
    if (locale.page === locale.scoped) {
      fail(`${theme}: the scoped locale had no effect — both fields read "${locale.page}"`)
    }
    notes.push(
      `${theme} locale: page "${locale.lang}" reads "${locale.page}", subtree (${expectedLabels.other}) ` +
        `reads "${locale.scoped}"`,
    )
  }

  // 5 — a real `<label for>` reaches the real control, not the wrapper.
  const label = page.locator('label[for="email-field"]')
  if ((await label.count()) === 0) {
    fail(`${theme}: the page renders no <label for> bound to a YueInput`)
  } else {
    await label.first().click()
    await page.waitForTimeout(120)
    const focusedByLabel = await page.$eval(
      '[data-input-state="native-attrs"] input',
      (element) => document.activeElement === element,
    )
    if (!focusedByLabel) {
      fail(`${theme}: clicking the label did not focus the native input`)
    }
    // If the id had landed on the wrapper, the label would point at a non-focusable div
    // and this would silently do nothing — which is the whole reason to check it here.
    const idOnControl = await page.$eval(
      '[data-input-state="native-attrs"] input',
      (element) => element.id,
    )
    if (idOnControl !== 'email-field') fail(`${theme}: the id is on the wrong element`)
    await page.$eval('[data-input-state="native-attrs"] input', (element) => element.blur())
  }

  // 6 — the real tab order, walked with real key presses.
  //
  // Not `element.tabIndex >= 0`: a disabled `<input>` still reports `tabIndex === 0`,
  // because that property reflects the attribute, not whether focus navigation will
  // reach it. The only way to know that Tab skips it is to press Tab and look.
  const tabOrder = await page.evaluate(() => {
    const clear = document.querySelector('[data-input-state="clearable"] .yue-input__clear')
    return {
      clearType: clear.type,
      clearLabel: clear.getAttribute('aria-label'),
      clearTabIndex: clear.tabIndex,
    }
  })
  if (tabOrder.clearType !== 'button') {
    fail(`${theme}: the clear control is type="${tabOrder.clearType}", not "button"`)
  }
  if (tabOrder.clearTabIndex < 0) fail(`${theme}: the clear control is not reachable by Tab`)
  if (tabOrder.clearLabel === null || tabOrder.clearLabel === '') {
    fail(`${theme}: the clear control has no accessible name`)
  }

  await page.$eval('[data-input-state="resting"] input', (element) => element.focus())
  const walk = []
  for (let step = 0; step < 20; step += 1) {
    await page.keyboard.press('Tab')
    const landed = await page.evaluate(() => {
      const active = document.activeElement
      if (!active) return null
      const wrapper = active.closest('[data-input-state]')
      return {
        state: wrapper?.dataset.inputState ?? null,
        tag: active.tagName.toLowerCase(),
        className: active.className,
      }
    })
    if (landed) walk.push(landed)
    if (landed && landed.state === 'affixed') break
  }
  const landedOnDisabled = walk.some(
    (entry) => entry.state === 'disabled',
  )
  if (landedOnDisabled) {
    fail(`${theme}: Tab reached the disabled field, so it is still in the tab order`)
  }
  const reachedClear = walk.some((entry) => entry.tag === 'button' && entry.state === 'clearable')
  if (!reachedClear) {
    fail(
      `${theme}: Tab never reached the clear control, so the walk proves nothing about ` +
        `the fields it did visit (${walk.map((entry) => `${entry.state}:${entry.tag}`).join(' → ')})`,
    )
  }
  const reachedReadonly = walk.some((entry) => entry.state === 'readonly' && entry.tag === 'input')
  if (!reachedReadonly) {
    fail(`${theme}: Tab skipped the readonly field, which must stay focusable`)
  }

  // 7 — clearing empties the field and keeps the caret in it. This is the assertion the
  // unit test deliberately deferred: only a real browser has focus.
  await page.$eval('[data-input-state="clearable"] input', (element) => {
    element.focus()
    element.value = 'typed by the test'
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(120)
  await page.click('[data-input-state="clearable"] .yue-input__clear')
  await page.waitForTimeout(200)
  const afterClear = await page.$eval(
    '[data-input-state="clearable"] input',
    (element) => ({ value: element.value, focused: document.activeElement === element }),
  )
  if (afterClear.value !== '') {
    fail(`${theme}: the clear control did not empty the field (value "${afterClear.value}")`)
  }
  if (!afterClear.focused) {
    fail(`${theme}: clearing moved focus out of the input instead of leaving it there`)
  }

  // 8 — every class the component rendered is matched by a rule the page loaded. A
  // renamed class, or a sheet that failed to load, would leave the field unstyled while
  // the markup still looked right.
  const classAudit = await page.evaluate(
    ({ ids, defaults }) => {
      const all = []
      for (const sheet of document.styleSheets) {
        let rules
        try {
          rules = sheet.cssRules
        } catch {
          continue
        }
        const walk = (list) => {
          for (const rule of list) {
            if (rule.selectorText) all.push(rule.selectorText)
            else if (rule.cssRules) walk(rule.cssRules)
          }
        }
        walk(rules)
      }

      /**
       * `element.matches()` cannot evaluate a selector containing a pseudo-element, so
       * the pseudo-element tail is removed before matching. This keeps the check about
       * what it is for — "a loaded rule names this class on this element" — without
       * pretending the audit can tell whether a vendor pseudo-element applies.
       */
      const withoutPseudo = (selector) => selector.replace(/::[a-z-]+(\([^)]*\))?/gi, '')

      const unmatched = []
      for (const id of ids) {
        const wrapper = document.querySelector(`[data-input-state="${id}"]`)
        for (const node of [wrapper, ...wrapper.querySelectorAll('*')]) {
          for (const className of node.classList) {
            // Documented base defaults carry no rule of their own: the base block
            // already declares their values. Registering them here is what keeps the
            // check from being satisfied by an accident.
            if (defaults.includes(className)) continue
            const matched = all.some((selector) => {
              if (!selector.includes(`.${className}`)) return false
              const candidate = withoutPseudo(selector)
              try {
                // The element itself, an ancestor carrying the class
                // (`.yue-input.is-invalid`), or a descendant selector that the class
                // scopes (`.yue-input.is-clearable .yue-input__native`). All three are
                // real ways a rendered class earns its place in the sheet.
                return (
                  node.matches(candidate) ||
                  node.closest(candidate) !== null ||
                  node.querySelector(candidate) !== null
                )
              } catch {
                return false
              }
            })
            if (!matched) unmatched.push(`${node.tagName.toLowerCase()}.${className}`)
          }
        }
      }
      return [...new Set(unmatched)]
    },
    // `yue-input--md` is the base size block, exactly like `yue-button--md`.
    { ids: selectors, defaults: ['yue-input--md'] },
  )
  if (classAudit.length > 0) {
    fail(`${theme}: rendered Input class(es) matched by no loaded rule: ${classAudit.join(', ')}`)
  }

  // 9 — reduced motion comes from the token, not from a second media query in the
  // component sheet. Asserting the computed duration is the only way to know the token
  // path still works.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await page.$eval('[data-input-state="resting"]', (element) => {
    const style = getComputedStyle(element)
    return { duration: style.transitionDuration, delay: style.transitionDelay }
  })
  const durations = reduced.duration.split(',').map((value) => Number.parseFloat(value))
  if (durations.some((value) => Number.isFinite(value) && value > 0)) {
    fail(`${theme}: prefers-reduced-motion still transitions for ${reduced.duration}`)
  }
  await page.emulateMedia({ reducedMotion: null })

  // 9b — RTL. The roadmap lists it as a candidate scenario, and "candidate" is exactly
  // when a layout claim needs a measurement: `dir` has to reach the element that lays the
  // affix row out, or the text mirrors while the icons do not.
  if ((await page.locator('[data-input-state="rtl"]').count()) > 0) {
    const rtl = await page.$eval('[data-input-state="rtl"]', (element) => {
      const control = element.querySelector('input')
      const prefix = element.querySelector('.yue-input__prefix')
      const clear = element.querySelector('.yue-input__clear')
      const box = (node) => (node ? node.getBoundingClientRect() : null)
      return {
        wrapperDir: element.getAttribute('dir'),
        // If `dir` had been routed to the control, this would be null and the wrapper
        // would still be laying out left-to-right.
        wrapperDirection: getComputedStyle(element).direction,
        controlDirection: getComputedStyle(control).direction,
        prefixRight: box(prefix)?.right ?? null,
        controlLeft: box(control)?.left ?? null,
        clearLeft: box(clear)?.left ?? null,
        controlRight: box(control)?.right ?? null,
      }
    })

    if (rtl.wrapperDir !== 'rtl') fail(`${theme}: the RTL example's dir did not reach the field`)
    if (rtl.wrapperDirection !== 'rtl') {
      fail(`${theme}: the RTL field's computed direction is "${rtl.wrapperDirection}"`)
    }
    if (rtl.controlDirection !== 'rtl') {
      fail(
        `${theme}: the control did not inherit the field's direction ` +
          `("${rtl.controlDirection}")`,
      )
    }
    // The prefix must sit to the *right* of the control's left edge: that is what
    // "mirrored" means for a row, and it is the assertion a text-only check cannot make.
    if (rtl.prefixRight === null || rtl.controlLeft === null || rtl.prefixRight <= rtl.controlLeft) {
      fail(
        `${theme}: the prefix is not on the right-hand side in RTL ` +
          `(prefix right ${rtl.prefixRight}, control left ${rtl.controlLeft})`,
      )
    }
    if (rtl.clearLeft === null || rtl.controlRight === null || rtl.clearLeft >= rtl.controlRight) {
      fail(
        `${theme}: the clear control did not move to the left in RTL ` +
          `(clear left ${rtl.clearLeft}, control right ${rtl.controlRight})`,
      )
    }
    notes.push(
      `${theme} rtl: field direction ${rtl.wrapperDirection}, control inherits ` +
        `${rtl.controlDirection}, prefix right of the control, clear control on the left`,
    )
  }

  // 10 — forced colours replaces the palette with system colours.
  await page.emulateMedia({ forcedColors: 'active' })
  await page.waitForTimeout(120)
  const forced = await readState('disabled')
  const forcedResting = await readState('resting')
  if (forcedResting.borderColor === readings.resting.borderColor) {
    fail(`${theme}: forced-colors did not replace the field's border colour`)
  }
  if (forced.color === readings.disabled.color) {
    fail(`${theme}: forced-colors did not replace the disabled text colour`)
  }
  await page.emulateMedia({ forcedColors: null })

  await page.mouse.move(0, 0)
}

/**
 * The loading contract, measured on the rendered page.
 *
 * "Loading must not resize the button" is a layout claim, and a unit test cannot make it:
 * happy-dom has no layout engine, so every width is zero and the assertion would pass for
 * any markup at all. The honest measurement is two real buttons with identical content,
 * one loading and one not, in a real browser.
 */
async function checkLoadingLayout(page, theme) {
  const reading = await page.evaluate(() => {
    const idle = document.querySelector('[data-loading-idle]')
    const active = document.querySelector('[data-loading-active]')
    if (!idle || !active) return null

    const box = (node) => {
      const rect = node?.getBoundingClientRect()
      return rect ? { width: rect.width, height: rect.height, left: rect.left, right: rect.right } : null
    }
    const layer = active.querySelector('.yue-button__loader')
    const layerStyle = layer ? getComputedStyle(layer) : null
    const label = active.querySelector('.yue-button__label')

    return {
      idle: box(idle),
      active: box(active),
      layer: box(layer),
      spinner: box(active.querySelector('.yue-button__spinner')),
      // The loader is `inset: 0`, so it fills the button's *padding* box: the border is
      // outside it by definition, which is why the comparison below subtracts it.
      borderWidth: Number.parseFloat(getComputedStyle(active).borderTopWidth) || 0,
      labelText: label?.textContent?.trim() ?? null,
      labelOpacity: label ? getComputedStyle(label).opacity : null,
      leadingPresent: Boolean(active.querySelector('.yue-button__icon--leading')),
      layerPosition: layerStyle?.position ?? null,
      layerInset: layerStyle
        ? [layerStyle.top, layerStyle.right, layerStyle.bottom, layerStyle.left]
        : null,
      busy: active.getAttribute('aria-busy'),
      nativeDisabled: active.hasAttribute('disabled'),
      tabIndex: active.tabIndex,
    }
  })

  if (!reading) {
    fail(`${theme}: the page has no [data-loading-idle] / [data-loading-active] pair`)
    return
  }

  // The claim under test: the same content renders the same box, loading or not.
  if (reading.idle.width !== reading.active.width || reading.idle.height !== reading.active.height) {
    fail(
      `${theme}: loading changed the button box — idle ${reading.idle.width}×${reading.idle.height}, ` +
        `loading ${reading.active.width}×${reading.active.height}`,
    )
  }
  // The mechanism: the content is still there (so the width is still decided by it) and is
  // painted invisible rather than removed.
  if (reading.labelText !== '保存更改' || reading.labelOpacity !== '0') {
    fail(
      `${theme}: the loading label is "${reading.labelText}" at opacity ${reading.labelOpacity}, ` +
        'so loading either removed the text or left it visible',
    )
  }
  if (!reading.leadingPresent) {
    fail(`${theme}: loading removed the leading icon instead of keeping it in place`)
  }
  // The loader sits on top and covers the control box.
  if (reading.layerPosition !== 'absolute' || reading.layerInset?.join(',') !== '0px,0px,0px,0px') {
    fail(
      `${theme}: the loader layer is ${reading.layerPosition} with inset ${reading.layerInset?.join(',')}`,
    )
  }
  if (
    !reading.layer ||
    Math.abs(reading.layer.width - (reading.active.width - 2 * reading.borderWidth)) > 1 ||
    Math.abs(reading.layer.height - (reading.active.height - 2 * reading.borderWidth)) > 1
  ) {
    fail(
      `${theme}: the loader layer (${reading.layer?.width}×${reading.layer?.height}) does not ` +
        `cover the button's padding box (${reading.active.width}×${reading.active.height} ` +
        `minus ${reading.borderWidth}px of border)`,
    )
  }
  if (!reading.spinner || reading.spinner.width < 8 || reading.spinner.height < 8) {
    fail(`${theme}: the default spinner has no visible box`)
  }
  // Centred, not offset: the spinner's mid-line is the button's mid-line.
  const spinnerCentre = reading.spinner.left + reading.spinner.width / 2
  const buttonCentre = reading.active.left + reading.active.width / 2
  if (Math.abs(spinnerCentre - buttonCentre) > 1.5) {
    fail(
      `${theme}: the spinner is not centred in the button (spinner ${spinnerCentre}, ` +
        `button ${buttonCentre})`,
    )
  }
  // Loading keeps the button focusable and out of the native `disabled` state.
  if (reading.busy !== 'true' || reading.nativeDisabled) {
    fail(`${theme}: a loading button is busy="${reading.busy}" disabled=${reading.nativeDisabled}`)
  }
  if (reading.tabIndex < 0) fail(`${theme}: a loading button left the tab order`)

  const focusKept = await page.evaluate(() => {
    const active = document.querySelector('[data-loading-active]')
    active.focus()
    const kept = document.activeElement === active
    active.blur()
    return kept
  })
  if (!focusKept) fail(`${theme}: a loading button could not take focus, so it steals it back mid-request`)

  // The `loader` slot replaces the indicator, not the layout.
  const custom = await page.evaluate(() => {
    const button = document.querySelector('[data-loader-custom]')
    const layer = button?.querySelector('.yue-button__loader')
    const box = layer?.querySelector('.docs-loader')?.getBoundingClientRect()
    return {
      hasCustom: Boolean(layer?.querySelector('.docs-loader')),
      hasSpinner: Boolean(layer?.querySelector('.yue-button__spinner')),
      labelText: button?.querySelector('.yue-button__label')?.textContent?.trim() ?? null,
      customBox: box ? { width: box.width, height: box.height } : null,
    }
  })
  if (!custom.hasCustom || custom.hasSpinner) {
    fail(
      `${theme}: the loader slot rendered custom=${custom.hasCustom} and the default spinner=${custom.hasSpinner}`,
    )
  }
  if (!custom.customBox || custom.customBox.width < 4) {
    fail(`${theme}: the custom loader has no visible box: ${JSON.stringify(custom.customBox)}`)
  }
  if (custom.labelText !== '自定义加载') {
    fail(`${theme}: a custom loader replaced the label ("${custom.labelText}") instead of layering over it`)
  }

  notes.push(
    `${theme} loading: idle ${reading.idle.width}×${reading.idle.height} = loading ` +
      `${reading.active.width}×${reading.active.height}, label kept at opacity 0, ` +
      `custom loader ${custom.customBox.width}×${custom.customBox.height}`,
  )
}

/**
 * The anatomy figure's own claim: every part it labels exists in the DOM.
 *
 * A diagram that names a class nobody renders is worse than no diagram — it teaches a
 * structure the component does not have. The selectors are read out of the figure and
 * resolved against the live page, including the focus ring, which is primed with a real
 * key press because `:focus-visible` cannot be forced from script.
 */
async function checkAnatomy(page, theme) {
  const selector = '[data-anatomy="assembled"]'
  if ((await page.locator('.button-anatomy').count()) === 0) {
    fail(`${theme}: the Button page renders no anatomy figure`)
    return
  }

  // Prime `:focus-visible`, so the ring — one of the six parts — can be resolved.
  await page.keyboard.press('Tab')
  await page.$eval(selector, (element) => element.focus())
  await page.waitForTimeout(120)

  const reading = await page.evaluate(() => {
    const root = document.querySelector('.button-anatomy')
    const selectors = [...root.querySelectorAll('.button-anatomy__selector')].map((node) =>
      node.textContent.trim(),
    )
    const assembled = root.querySelector('[data-anatomy="assembled"]')
    const loading = root.querySelector('[data-anatomy="loading"]')
    const loadingLabel = loading?.querySelector('.yue-button__label')
    return {
      parts: root.querySelectorAll('.button-anatomy__part').length,
      selectors,
      resolved: selectors.map((entry) => ({ entry, count: document.querySelectorAll(entry).length })),
      assembled: {
        leading: Boolean(assembled?.querySelector('.yue-button__icon--leading')),
        label: assembled?.querySelector('.yue-button__label')?.textContent.trim() ?? null,
        trailing: Boolean(assembled?.querySelector('.yue-button__icon--trailing')),
      },
      loading: {
        layer: Boolean(loading?.querySelector('.yue-button__loader')),
        labelOpacity: loadingLabel ? getComputedStyle(loadingLabel).opacity : null,
        labelText: loadingLabel?.textContent.trim() ?? null,
      },
    }
  })

  await page.$eval(selector, (element) => element.blur())

  if (reading.parts !== reading.selectors.length || reading.parts < 6) {
    fail(
      `${theme}: the anatomy figure labels ${reading.parts} part(s) and names ` +
        `${reading.selectors.length} selector(s); six are expected`,
    )
  }
  const unresolved = reading.resolved.filter((entry) => entry.count === 0)
  if (unresolved.length > 0) {
    fail(
      `${theme}: the anatomy figure names selector(s) nothing on the page matches: ` +
        unresolved.map((entry) => entry.entry).join(', '),
    )
  }
  if (!reading.assembled.leading || !reading.assembled.trailing || reading.assembled.label !== '保存') {
    fail(`theme: the assembled anatomy button is missing a part: ${JSON.stringify(reading.assembled)}`)
  }
  if (!reading.loading.layer || reading.loading.labelOpacity !== '0') {
    fail(
      `${theme}: the anatomy's loading button does not show the layered loader ` +
        `(layer ${reading.loading.layer}, label opacity ${reading.loading.labelOpacity})`,
    )
  }

  notes.push(
    `${theme} anatomy: ${reading.parts} parts, ${reading.selectors.length} selectors all resolved ` +
      `(including ${reading.selectors.at(-1)})`,
  )
}

/**
 * Toggle selection, in the browser, on the rendered pixels.
 *
 * Three things cannot be checked from a unit test and are exactly the ones worth checking:
 * that the joined corners are produced by the stylesheet the page loaded, that the selected
 * item is distinguishable from its neighbours, and that its label is still readable in both
 * themes and while hovered.
 */
async function checkToggle(page, theme) {
  const group = '[data-toggle="align"]'
  if ((await page.locator(group).count()) === 0) {
    fail(`${theme}: the page renders no [data-toggle] group`)
    return
  }

  const structure = await page.$eval(group, (element) => {
    const items = [...element.querySelectorAll('.yue-button')]
    const rect = (node) => node.getBoundingClientRect()
    return {
      role: element.getAttribute('role'),
      name: element.getAttribute('aria-label'),
      count: items.length,
      pressed: items.map((item) => item.getAttribute('aria-pressed')),
      activeCount: items.filter((item) => item.classList.contains('is-active')).length,
      radii: items.map((item) => ({
        topLeft: getComputedStyle(item).borderTopLeftRadius,
        topRight: getComputedStyle(item).borderTopRightRadius,
      })),
      firstRight: rect(items[0]).right,
      secondLeft: rect(items[1]).left,
      classes: items.map((item) => item.className),
    }
  })

  if (structure.role !== 'group') fail(`${theme}: the toggle renders role="${structure.role}"`)
  if (!structure.name) fail(`${theme}: the toggle group has no accessible name`)
  if (structure.count !== 3) fail(`${theme}: expected 3 toggle items, saw ${structure.count}`)
  if (structure.activeCount !== 1) {
    fail(`${theme}: ${structure.activeCount} items look selected, expected exactly 1`)
  }
  if (structure.pressed.join(',') !== 'false,true,false') {
    fail(`${theme}: aria-pressed is [${structure.pressed.join(', ')}], expected the middle item`)
  }
  // Joined corners come from the stylesheet, not from the markup: the outer edges keep the
  // button's radius, the inner ones are square, and the shared edge is overlapped.
  const [first, middle, last] = structure.radii
  if (first.topLeft === '0px' || first.topRight !== '0px') {
    fail(`${theme}: the first toggle item's corners are wrong: ${JSON.stringify(first)}`)
  }
  if (middle.topLeft !== '0px' || middle.topRight !== '0px') {
    fail(`${theme}: the middle toggle item kept a corner radius: ${JSON.stringify(middle)}`)
  }
  if (last.topLeft !== '0px' || last.topRight === '0px') {
    fail(`${theme}: the last toggle item's corners are wrong: ${JSON.stringify(last)}`)
  }
  // …and the shared edge is overlapped rather than doubled.
  if (Math.abs(structure.firstRight - structure.secondLeft) > 1.5) {
    fail(
      `${theme}: toggle items are not joined (first ends at ${structure.firstRight}, ` +
        `second starts at ${structure.secondLeft})`,
    )
  }

  // The selected fill has to be a real colour state, not the resting fill of its variant.
  const unselected = await readCell(page, '[data-toggle-item="left"]')
  const selected = await readCell(page, '[data-toggle-item="center"]')
  if (selected.background === unselected.background) {
    fail(`${theme}: the selected item has the same fill as its unselected neighbour`)
  }
  const ratio = cellContrast(selected)
  if (ratio < 4.5) {
    fail(`${theme}: the selected toggle label is ${ratio.toFixed(2)}:1 against its fill`)
  }

  await page.hover('[data-toggle-item="center"]')
  await page.waitForTimeout(250)
  const hovered = await readCell(page, '[data-toggle-item="center"]')
  const hoverRatio = cellContrast(hovered)
  if (hoverRatio < 4.5) {
    fail(`${theme}: the selected toggle label is ${hoverRatio.toFixed(2)}:1 while hovered`)
  }
  await page.mouse.move(0, 0)

  // Activating another item moves the selection, and only the selection.
  await page.click('[data-toggle-item="left"]')
  await page.waitForTimeout(150)
  const afterClick = await page.$eval(group, (element) => {
    const items = [...element.querySelectorAll('.yue-button')]
    return {
      pressed: items.map((item) => item.getAttribute('aria-pressed')),
      activeCount: items.filter((item) => item.classList.contains('is-active')).length,
    }
  })
  if (afterClick.pressed.join(',') !== 'true,false,false' || afterClick.activeCount !== 1) {
    fail(
      `${theme}: activating another item produced [${afterClick.pressed.join(', ')}] with ` +
        `${afterClick.activeCount} active`,
    )
  }

  // Mandatory selection: activating the active item again changes nothing.
  await page.click('[data-toggle-item="left"]')
  await page.waitForTimeout(150)
  const afterRepeat = await page.$eval(`${group} [data-toggle-item="left"]`, (element) =>
    element.getAttribute('aria-pressed'),
  )
  if (afterRepeat !== 'true') {
    fail(`${theme}: clicking the selected item again deselected it (aria-pressed="${afterRepeat}")`)
  }

  // A disabled item is disabled, and a disabled item cannot change the selection.
  const viewGroup = '[data-toggle="view"]'
  const beforeDisabled = await page.$eval(
    `${viewGroup} [data-toggle-item="list"]`,
    (element) => element.getAttribute('aria-pressed'),
  )
  const disabledNative = await page.$eval(`${viewGroup} [data-toggle-item="board"]`, (element) => ({
    disabled: element.hasAttribute('disabled'),
    pressed: element.getAttribute('aria-pressed'),
  }))
  await page.$eval(`${viewGroup} [data-toggle-item="board"]`, (element) => element.click())
  await page.waitForTimeout(150)
  const afterDisabled = await page.$eval(
    `${viewGroup} [data-toggle-item="list"]`,
    (element) => element.getAttribute('aria-pressed'),
  )
  if (!disabledNative.disabled) fail(`${theme}: the disabled toggle item is not natively disabled`)
  if (disabledNative.pressed !== 'false') {
    fail(`${theme}: the disabled toggle item reports aria-pressed="${disabledNative.pressed}"`)
  }
  if (beforeDisabled !== 'true' || afterDisabled !== 'true') {
    fail(
      `${theme}: clicking a disabled item moved the selection (${beforeDisabled} → ${afterDisabled})`,
    )
  }

  // A standalone toggle button (`active` without a group) reports its own state and toggles.
  const standaloneBefore = await page.$eval(
    '[data-standalone="italic"]',
    (element) => element.getAttribute('aria-pressed'),
  )
  await page.click('[data-standalone="italic"]')
  await page.waitForTimeout(150)
  const standaloneAfter = await page.$eval(
    '[data-standalone="italic"]',
    (element) => element.getAttribute('aria-pressed'),
  )
  if (standaloneBefore !== 'false' || standaloneAfter !== 'true') {
    fail(`${theme}: a standalone toggle went ${standaloneBefore} → ${standaloneAfter}`)
  }
  await page.click('[data-standalone="italic"]')
  await page.waitForTimeout(150)

  notes.push(
    `${theme} toggle: 3 items joined (radius ${first.topLeft} / ${middle.topLeft} / ` +
      `${last.topRight}), selected ${ratio.toFixed(2)}:1 resting and ${hoverRatio.toFixed(2)}:1 ` +
      'hovered, mandatory selection held',
  )
}

/**
 * The aria and tab-order contract for the non-native `tag` path, walked with real key presses.
 *
 * `loading` has to mean the same thing on an `<a>` as it does on a `<button>`: busy, still
 * reachable. A unit test can assert the attributes; only a browser can answer whether Tab
 * actually lands on the element — a disabled control still reports `tabIndex >= 0` from
 * script, and a `tabindex="-1"` element looks identical in the markup either way.
 */
async function checkAnchorTabOrder(page, theme) {
  const hooks = ['plain', 'loading', 'disabled']
  const missing = []
  for (const hook of hooks) {
    if ((await page.locator(`[data-anchor="${hook}"]`).count()) !== 1) missing.push(hook)
  }
  if (missing.length > 0) {
    fail(`${theme}: the tag example is missing anchor(s): ${missing.join(', ')}`)
    return
  }

  const reading = await page.evaluate((names) => {
    const out = {}
    for (const name of names) {
      const element = document.querySelector(`[data-anchor="${name}"]`)
      out[name] = {
        tag: element.tagName.toLowerCase(),
        loading: element.classList.contains('is-loading'),
        labelOpacity: (() => {
          const label = element.querySelector('.yue-button__label')
          return label ? getComputedStyle(label).opacity : null
        })(),
        nativeDisabled: element.hasAttribute('disabled'),
        ariaDisabled: element.getAttribute('aria-disabled'),
        ariaBusy: element.getAttribute('aria-busy'),
        tabindex: element.getAttribute('tabindex'),
      }
    }
    return out
  }, hooks)

  for (const [name, state] of Object.entries(reading)) {
    if (state.tag !== 'a') fail(`${theme}: [data-anchor="${name}"] rendered a <${state.tag}>, not an <a>`)
    if (state.nativeDisabled) {
      fail(`${theme}: [data-anchor="${name}"] carries the native disabled attribute, which an <a> cannot honour`)
    }
  }

  // The three states, spelled out — this is the matrix the unit test asserts, re-checked on
  // the rendered page so a stale build cannot make the unit test look right.
  if (reading.plain.ariaDisabled !== null || reading.plain.ariaBusy !== null || reading.plain.tabindex !== null) {
    fail(`${theme}: a plain anchor exposes state: ${JSON.stringify(reading.plain)}`)
  }
  if (reading.loading.ariaBusy !== 'true' || !reading.loading.loading) {
    fail(`${theme}: the loading anchor does not announce aria-busy: ${JSON.stringify(reading.loading)}`)
  }
  if (reading.loading.ariaDisabled !== null || reading.loading.tabindex !== null) {
    fail(
      `${theme}: the loading anchor claims to be disabled ` +
        `(aria-disabled=${reading.loading.ariaDisabled}, tabindex=${reading.loading.tabindex})`,
    )
  }
  if (reading.loading.labelOpacity !== '0') {
    fail(`${theme}: the loading anchor's label is at opacity ${reading.loading.labelOpacity}`)
  }
  if (reading.disabled.ariaDisabled !== 'true' || reading.disabled.tabindex !== '-1') {
    fail(`${theme}: the disabled anchor is not taken out of the tab order: ${JSON.stringify(reading.disabled)}`)
  }
  if (reading.disabled.ariaBusy !== null) {
    fail(`${theme}: the disabled anchor announces aria-busy without loading`)
  }

  // The walk: from the plain anchor, one Tab must land on the loading one, and the next must
  // leave the disabled one behind.
  const describeActive = () =>
    page.evaluate(() => {
      const active = document.activeElement
      if (!active || active === document.body) return null
      return {
        anchor: active.dataset?.anchor ?? null,
        description: `${active.tagName.toLowerCase()}.${(active.className || '').split(' ')[0] || '—'}`,
      }
    })

  await page.$eval('[data-anchor="plain"]', (element) => element.focus())
  await page.keyboard.press('Tab')
  const afterFirst = await describeActive()
  await page.keyboard.press('Tab')
  const afterSecond = await describeActive()

  if (afterFirst?.anchor !== 'loading') {
    fail(`${theme}: Tab skipped the loading anchor (landed on ${afterFirst?.description ?? 'nothing'})`)
  }
  if (afterSecond?.anchor === 'disabled') {
    fail(`${theme}: Tab reached the disabled anchor, so it is still in the tab order`)
  }
  // The walk only proves something about the disabled anchor if the second Tab really did
  // move somewhere else — a landing of `null` could also mean the page ended.
  if (afterSecond === null) {
    fail(`${theme}: the anchor walk left the document, so nothing proves the disabled anchor was skipped`)
  }

  notes.push(
    `${theme} anchors: loading is reachable by Tab (${afterFirst.description}) with no aria-disabled ` +
      `and no tabindex; the disabled one is skipped (next stop: ${afterSecond.description})`,
  )

  await page.$eval('[data-anchor="plain"]', (element) => element.blur())
}

/**
 * The bilingual site, driven the way a reader drives it.
 *
 * Every claim here is one a static check cannot make: that clicking the language switch lands on
 * the *same* page in the other tree, that `html[lang]` follows, that the examples' component
 * text follows the page language (and that a subtree can still disagree on purpose), and that
 * the docs chrome is in the language the page claims.
 */
async function checkBilingualSite(page, origin) {
  /** The observable state of one page: language, chrome, and what the examples render. */
  const readPage = () =>
    page.evaluate(() => {
      const label = (state) =>
        document
          .querySelector(`[data-input-state="${state}"] .yue-input__clear`)
          ?.getAttribute('aria-label') ?? null
      const toolbar = document.querySelector('.preview-frame__toolbar')
      const langMenu = document.querySelector('.VPNavBarTranslations button')
      return {
        lang: document.documentElement.lang,
        // The switcher is VitePress' own locale menu; its accessible name is localized through
        // `langMenuLabel`, and its link must point at the counterpart page.
        langMenuLabel: langMenu?.getAttribute('aria-label') ?? null,
        // The preview toolbar is the second piece of docs chrome on a component page.
        resetLabel: toolbar?.querySelector('.preview-frame__reset')?.textContent?.trim() ?? null,
        codeToggle: document.querySelector('.preview-frame__code-toggle')?.textContent?.trim() ?? null,
        clearDefault: label('clearable-default'),
        clearScoped: label('clearable-translated'),
        clearRegional: label('clearable-regional'),
      }
    })

  /** Click through the built-in locale menu, the way a reader does. */
  async function switchLocale(hrefPart) {
    await page.click('.VPNavBarTranslations button')
    await page.waitForSelector('.VPNavBarTranslations a', { timeout: 5_000 })
    await page.click(`.VPNavBarTranslations a[href*="${hrefPart}"]`)
    await page.waitForLoadState('load')
  }

  await page.goto(`${origin}/components/input`, { waitUntil: 'load' })
  await page.waitForSelector('[data-input-state="clearable-default"]', { timeout: 15_000 })
  const chinese = await readPage()

  if (chinese.lang !== 'zh-CN') fail(`bilingual: the Chinese tree reports lang="${chinese.lang}"`)
  if (chinese.langMenuLabel !== '语言') {
    fail(`bilingual: the Chinese language menu is labelled "${chinese.langMenuLabel}"`)
  }
  if (chinese.resetLabel !== '重置') {
    fail(`bilingual: the Chinese preview toolbar says "${chinese.resetLabel}"`)
  }
  if (chinese.clearDefault !== '清空') {
    // The page language has to reach the *component*: this is the claim that the docs site
    // installed the locale contract rather than only translating its own chrome.
    fail(`bilingual: a field on a Chinese page reads "${chinese.clearDefault}"`)
  }
  if (chinese.clearScoped !== 'Clear') {
    fail(`bilingual: the subtree override on the Chinese page reads "${chinese.clearScoped}"`)
  }
  // `en-GB` has no pack anywhere in the repository, so this value can only come from the fallback
  // chain; an exact-match lookup would have to render the key or an empty string.
  if (chinese.clearRegional !== 'Clear') {
    fail(
      `bilingual: the regional-locale field on the Chinese page reads "${chinese.clearRegional}" ` +
        '— the fallback chain did not reach the en-US pack',
    )
  }

  // Through the menu, not by typing a URL: the reader's path. The hash proves the switcher
  // carries it, which is the reason VitePress' own menu is used instead of a custom link.
  await page.goto(`${origin}/components/input#clearable`, { waitUntil: 'load' })
  await page.waitForSelector('[data-input-state="clearable-default"]', { timeout: 15_000 })
  await switchLocale('/en/')
  await page.waitForSelector('[data-input-state="clearable-default"]', { timeout: 15_000 })
  const english = await readPage()

  if (!page.url().includes('/en/components/input')) {
    fail(`bilingual: the language switch landed on ${page.url()} instead of the same page in /en/`)
  }
  if (!page.url().includes('#clearable')) {
    fail(`bilingual: the language switch dropped the URL hash (${page.url()})`)
  }
  if (english.lang !== 'en-US') {
    fail(`bilingual: after switching, html lang is "${english.lang}"`)
  }
  if (english.langMenuLabel !== 'Language') {
    fail(`bilingual: the English language menu is labelled "${english.langMenuLabel}"`)
  }
  if (english.resetLabel !== 'Reset') {
    fail(`bilingual: the English preview toolbar says "${english.resetLabel}"`)
  }
  if (!/View code|Hide code/.test(english.codeToggle ?? '')) {
    fail(`bilingual: the English code toggle says "${english.codeToggle}"`)
  }
  if (english.clearDefault !== 'Clear') {
    fail(`bilingual: a field on an English page reads "${english.clearDefault}"`)
  }
  if (english.clearScoped !== '清空') {
    // The mirror of the Chinese page: the subtree demonstrates the *other* language.
    fail(`bilingual: the subtree override on the English page reads "${english.clearScoped}"`)
  }
  // The distinguishing assertion of the fallback chain: `zh-Hans-CN` has no pack of its own, so an
  // exact-match lookup would fall through to `en-US` and read "Clear" — the page default.
  if (english.clearRegional !== '清空') {
    fail(
      `bilingual: the regional-locale field on the English page reads "${english.clearRegional}" ` +
        'instead of "清空" — a regional tag did not resolve through the fallback chain to zh-CN',
    )
  }
  if (english.clearRegional === english.clearDefault) {
    fail('bilingual: the regional field matches the page default, so the fallback proved nothing')
  }

  // Reload: the language must come from the route, not from a client-side toggle that resets.
  await page.reload({ waitUntil: 'load' })
  await page.waitForSelector('[data-input-state="clearable-default"]', { timeout: 15_000 })
  const reloaded = await readPage()
  if (reloaded.lang !== 'en-US' || reloaded.clearDefault !== 'Clear') {
    fail(
      `bilingual: after a reload the English page reports lang="${reloaded.lang}" and ` +
        `"${reloaded.clearDefault}"`,
    )
  }

  // Back: the SPA router must restore the Chinese page *and* its component language.
  await page.goBack({ waitUntil: 'load' })
  await page.waitForSelector('[data-input-state="clearable-default"]', { timeout: 15_000 })
  const back = await readPage()
  if (back.lang !== 'zh-CN' || back.clearDefault !== '清空') {
    fail(
      `bilingual: going back reported lang="${back.lang}" and "${back.clearDefault}" instead of ` +
        'the Chinese page',
    )
  }

  // Dark mode survives the language switch: appearance and language are independent axes.
  await switchLocale('/en/')
  await page.waitForSelector('[data-input-state="clearable-default"]', { timeout: 15_000 })
  await page.getByRole('button', { name: 'Dark' }).first().click()
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
  const darkEnglish = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    lang: document.documentElement.lang,
    label:
      document
        .querySelector('[data-input-state="clearable-default"] .yue-input__clear')
        ?.getAttribute('aria-label') ?? null,
  }))
  if (darkEnglish.theme !== 'dark' || darkEnglish.lang !== 'en-US' || darkEnglish.label !== 'Clear') {
    fail(`bilingual: dark mode in English reported ${JSON.stringify(darkEnglish)}`)
  }
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.dataset.theme = 'light'
  })

  // The one document that serves both trees: the 404 page names both languages and links both.
  await page.goto(`${origin}/404.html`, { waitUntil: 'load' })
  await page.waitForTimeout(300)
  const notFound = await page.evaluate(() => ({
    rendered: Boolean(document.querySelector('.docs-not-found__actions')),
    links: [...document.querySelectorAll('.docs-not-found__actions a')].map((link) =>
      link.getAttribute('href'),
    ),
    text: document.querySelector('.docs-not-found')?.textContent ?? '',
  }))
  if (!notFound.rendered) fail('bilingual: the 404 page did not render its bilingual content')
  else if (!notFound.links.includes('/') || !notFound.links.includes('/en/')) {
    fail(`bilingual: the 404 page links to ${JSON.stringify(notFound.links)}`)
  } else if (!/页面不存在/.test(notFound.text) || !/Page not found/.test(notFound.text)) {
    fail('bilingual: the 404 page does not name both languages')
  }

  // No Chinese anywhere in the English chrome: the defect a translated *page* can still have.
  await page.goto(`${origin}/en/components/button`, { waitUntil: 'load' })
  await page.waitForSelector('.yue-button', { state: 'visible', timeout: 15_000 })
  const chrome = await page.evaluate(() => {
    // `innerText`, not `textContent`: the language menu's items are in the DOM even while the
    // flyout is closed, and one of them is *supposed* to say "简体中文" — it names each language in
    // its own language. Only text the reader can actually see is under test here.
    return {
      nav: document.querySelector('.VPNavBar')?.innerText ?? '',
      sidebar: document.querySelector('.VPSidebar')?.innerText ?? '',
      // Local search is configured per locale; its button label is the visible half of that.
      search: document.querySelector('.VPNavBarSearch')?.innerText?.trim() ?? '',
      searchLabel:
        document.querySelector('.DocSearch-Button, .VPNavBarSearchButton')?.getAttribute('aria-label') ??
        null,
    }
  })
  const cjk = /[\u4e00-\u9fff]/
  if (cjk.test(chrome.nav)) {
    fail(`bilingual: the English nav bar contains Chinese text: ${chrome.nav.slice(0, 120)}`)
  }
  if (cjk.test(chrome.sidebar)) {
    fail(`bilingual: the English sidebar contains Chinese text: ${chrome.sidebar.slice(0, 120)}`)
  }
  if (!/Search/.test(`${chrome.search} ${chrome.searchLabel ?? ''}`)) {
    fail(
      `bilingual: the English search control is not labelled in English ` +
        `("${chrome.search}" / "${chrome.searchLabel}")`,
    )
  }

  notes.push(
    `bilingual: / zh-CN "${chinese.clearDefault}"/"${chinese.clearScoped}"/"${chinese.clearRegional}" ↔ ` +
      `/en en-US "${english.clearDefault}"/"${english.clearScoped}"/"${english.clearRegional}" ` +
      '(page, subtree, fallback chain), switch + reload + back + dark mode, 404 bilingual, ' +
      'English chrome clean',
  )
}

/**
 * Phase 3 of the token refactor: the semantic tokens must *drive* what renders.
 *
 * A contrast number proves a state is legible; it does not prove the number came from the token. Every
 * one of these checks overrides a semantic token at runtime and asserts the rendered result follows —
 * which is the difference between "the focus ring looks right" and "the focus ring is the token".
 * Restoring the override afterwards keeps the rest of the run measuring the shipped values.
 *
 * The three surfaces are exactly the ones `docs/05-yue-token-refactor-plan.md` §7 Phase 3 requires:
 * the focus ring, disabled opacity, and the hover/pressed tint.
 */
async function checkTokenDrivenStates(page, origin) {
  const read = (selector, properties) =>
    page.$eval(
      selector,
      (element, names) => {
        const style = getComputedStyle(element)
        return Object.fromEntries(names.map((name) => [name, style[name]]))
      },
      properties,
    )

  const withOverride = async (declaration, run) => {
    await page.evaluate((css) => {
      const style = document.createElement('style')
      style.id = 'token-override-probe'
      style.textContent = `:root { ${css} }`
      document.head.append(style)
    }, declaration)
    try {
      return await run()
    } finally {
      await page.evaluate(() => document.getElementById('token-override-probe')?.remove())
      await page.waitForTimeout(80)
    }
  }

  await page.goto(`${origin}/components/button`, { waitUntil: 'load' })
  await page.waitForSelector('.yue-button', { state: 'visible', timeout: 15_000 })

  // Matrix keys are ${variant}- — see `apps/docs/components/button.md`.
  const focusSelector = '[data-matrix="solid-primary"]'
  const ringProperties = ['outlineWidth', 'outlineColor', 'outlineOffset']

  // Enter `:focus-visible` the way a keyboard user does, then read the ring.
  await page.keyboard.press('Tab')
  await page.$eval(focusSelector, (element) => element.focus())
  const ring = await read(focusSelector, ringProperties)
  if (ring.outlineWidth === '0px') {
    fail(`token-driven: the focused button renders no outline (${JSON.stringify(ring)})`)
  }

  // 1 — the ring's width comes from `--focus-ring-width`.
  const widerRing = await withOverride('--focus-ring-width: 6px', () =>
    read(focusSelector, ringProperties),
  )
  if (widerRing.outlineWidth !== '6px') {
    fail(
      `token-driven: overriding --focus-ring-width to 6px rendered ` +
        `"${widerRing.outlineWidth}" — the component is not reading the token`,
    )
  } else {
    notes.push(`token-driven: --focus-ring-width 2px→6px moved the rendered outline to 6px`)
  }

  // 2 — the ring's colour comes from `--focus-ring-color`.
  const recoloured = await withOverride('--focus-ring-color: rgb(1, 2, 3)', () =>
    read(focusSelector, ringProperties),
  )
  if (recoloured.outlineColor !== 'rgb(1, 2, 3)') {
    fail(
      `token-driven: overriding --focus-ring-color rendered "${recoloured.outlineColor}" — the ` +
        'component is not reading the token',
    )
  }

  // 3 — the offset comes from `--focus-ring-offset`.
  const offsetRing = await withOverride('--focus-ring-offset: 5px', () =>
    read(focusSelector, ringProperties),
  )
  if (offsetRing.outlineOffset !== '5px') {
    fail(
      `token-driven: overriding --focus-ring-offset rendered "${offsetRing.outlineOffset}" — the ` +
        'component is not reading the token',
    )
  } else {
    notes.push('token-driven: the focus trio (colour, width, offset) all reach the rendered outline')
  }
  await page.$eval(focusSelector, (element) => element.blur())

  // 4 — disabled opacity comes from `--opacity-disabled-content`.
  //
  // The probe target is the element that actually consumes it: the Tag's disabled rule sets
  // `opacity: var(--tag-opacity-disabled)` → `--opacity-disabled-content`. The Input's disabled state
  // is expressed through the `--disabled-content` *colour* mix instead, so reading its `opacity` would
  // assert the wrong thing — the first version of this check did exactly that and reported a failure
  // that was really a mis-targeted probe.
  const disabledSelector = '.yue-tag.is-disabled'
  await page.goto(`${origin}/components/tag`, { waitUntil: 'load' })
  await page.waitForSelector('.yue-tag', { state: 'visible', timeout: 15_000 })
  if ((await page.locator(disabledSelector).count()) > 0) {
    const shipped = await read(disabledSelector, ['opacity'])
    // The shipped value must be the token's value, not a magic number: this is the claim the plan asks
    // for on disabled opacity, and it holds (0.38 = `--opacity-disabled-content`).
    const declared = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--opacity-disabled-content').trim(),
    )
    if (Number.parseFloat(shipped.opacity) !== Number.parseFloat(declared)) {
      fail(
        `token-driven: the disabled control renders opacity ${shipped.opacity} while ` +
          `--opacity-disabled-content is ${declared} — the component is not using the token`,
      )
    } else {
      notes.push(
        `token-driven: disabled rendering takes its opacity from --opacity-disabled-content (${shipped.opacity})`,
      )
    }

    // The override has to wait for the element's `transition: opacity` to settle. Reading immediately
    // after the style landed returned the pre-transition value and looked exactly like "the component
    // ignores the token" — the finding recorded in round 1 was this timing artifact, not a defect.
    const dimmer = await withOverride('--opacity-disabled-content: 0.1', async () => {
      await page.waitForTimeout(400)
      return read(disabledSelector, ['opacity'])
    })
    if (Number.parseFloat(dimmer.opacity) >= Number.parseFloat(shipped.opacity)) {
      fail(
        `token-driven: lowering --opacity-disabled-content did not dim the disabled control ` +
          `(${shipped.opacity} → ${dimmer.opacity}) — the disabled state is not token-driven`,
      )
    } else {
      notes.push(
        `token-driven: --opacity-disabled-content drives disabled rendering (${shipped.opacity} → ${dimmer.opacity})`,
      )
    }
  } else {
    fail(`token-driven: no disabled control on the page (${disabledSelector} matched nothing)`)
  }

  // 5 — the hover tint comes from `--opacity-hover`: a text button's hover background is a
  // `color-mix` of that opacity, so raising it must visibly move the composited colour.
  await page.goto(`${origin}/components/button`, { waitUntil: 'load' })
  await page.waitForSelector('.yue-button', { state: 'visible', timeout: 15_000 })
  const textSelector = '[data-matrix="text-default"]'
  if ((await page.locator(textSelector).count()) > 0) {
    await page.mouse.move(0, 0)
    await page.hover(textSelector)
    await page.waitForTimeout(250)
    const hovered = await read(textSelector, ['backgroundColor', 'color'])
    const strong = await withOverride('--opacity-hover: 0.9', async () => {
      await page.mouse.move(0, 0)
      await page.hover(textSelector)
      await page.waitForTimeout(250)
      return read(textSelector, ['backgroundColor', 'color'])
    })
    if (strong.backgroundColor === hovered.backgroundColor) {
      fail(
        `token-driven: raising --opacity-hover did not change the hover tint ` +
          `(${hovered.backgroundColor}) — the hover state is not token-driven`,
      )
    } else {
      notes.push(
        `token-driven: --opacity-hover drives the hover tint (${hovered.backgroundColor} → ${strong.backgroundColor})`,
      )
    }
    // Contrast of the shipped hover state is measured by the theme × variant matrix earlier in this
    // file (which composites the colour the way the browser paints it). This block's job is the claim
    // the matrix cannot make: that the value comes from the token at all.
  }
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

    // The parts of the Button that are not a colour: the anatomy figure, the loading layer
    // and the toggle. Run after the matrix sweep so their interactions cannot disturb it.
    await checkAnatomy(page, 'light')
    await checkLoadingLayout(page, 'light')
    await checkToggle(page, 'light')
    // Tag-level, not colour-level: the `tag="a"` path is walked once, with real key presses.
    await checkAnchorTabOrder(page, 'light')

    // The Input page in light. Its six states are a different axis from the Button's
    // theme x variant matrix, so they get their own pass rather than being folded in.
    await page.goto(`${origin}/components/input`, { waitUntil: 'load' })
    await page.waitForSelector('[data-input-state="resting"]', { timeout: 15_000 })
    await checkInputs(page, 'light')
    await page.screenshot({ path: join(HERE, 'input-light.png'), fullPage: true })

    // Back to the Button page: everything below this point — the dark switch, the
    // screenshots, the second matrix pass — assumes the Button page is loaded.
    await page.goto(`${origin}/components/button`, { waitUntil: 'load' })
    await page.waitForSelector('.yue-button', { state: 'visible', timeout: 15_000 })

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

    // The toggle's selected fill is a token pair that flips with the theme, so the
    // selection sweep is a different measurement in dark, not a repeat of the light one.
    await checkLoadingLayout(page, 'dark')
    await checkToggle(page, 'dark')

    // The Input page, in dark. Same states, same assertions, different token values.
    await page.goto(`${origin}/components/input`, { waitUntil: 'load' })
    await page.waitForSelector('[data-input-state="resting"]', { timeout: 15_000 })
    await checkInputs(page, 'dark')
    await page.screenshot({ path: join(HERE, 'input-dark.png'), fullPage: true })
    await page.goto(`${origin}/components/button`, { waitUntil: 'load' })
    await page.waitForSelector('.yue-button', { state: 'visible', timeout: 15_000 })

    // 4 — accent switching.
    await page.getByRole('button', { name: '中性' }).first().click()
    await page.waitForFunction(() => document.documentElement.dataset.accent === 'neutral')
    const neutralAccent = await page.evaluate(TOKEN_PROBE, ['--accent-solid'])
    if (neutralAccent['--accent-solid'] === lightTokens['--accent-solid']) {
      fail('--accent-solid did not change when switching to the neutral accent')
    }
    notes.push(`neutral accent: --accent-solid = ${neutralAccent['--accent-solid']}`)

    // The same Input states under the neutral accent. This is the profile where a
    // hard-coded brand hue in a focus or error border would go unnoticed, because the
    // resting colours barely move.
    await page.goto(`${origin}/components/input`, { waitUntil: 'load' })
    await page.waitForSelector('[data-input-state="resting"]', { timeout: 15_000 })
    const neutralTheme = await page.evaluate(() => document.documentElement.dataset.theme)
    await checkInputs(page, `neutral-accent/${neutralTheme}`)
    await page.screenshot({ path: join(HERE, 'input-neutral.png'), fullPage: true })
    await page.goto(`${origin}/components/button`, { waitUntil: 'load' })
    await page.waitForSelector('.yue-button', { state: 'visible', timeout: 15_000 })

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

    // 6 — Phase 3 of the token refactor: the semantic tokens must drive what renders. It loads its own
    // pages, so it runs before the bilingual pass moves away from them.
    await checkTokenDrivenStates(page, origin)

    // 7 — the bilingual site, driven through the switcher rather than by URL.
    // Runs with the wide viewport, because it reads nav chrome; the mobile pass below is a
    // separate concern.
    await checkBilingualSite(page, origin)

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

    // 5b — the Input page at the same width, with a long value in the field.
    //
    // The roadmap calls this out separately from the page-level check: a single-line
    // field holding a long value is the classic way a form forces a document wider than
    // the viewport, because an `<input>`'s intrinsic width follows its content unless
    // something stops it.
    await page.goto(`${origin}/components/input`, { waitUntil: 'load' })
    await page.waitForSelector('[data-input-state="resting"]', { timeout: 15_000 })
    const longValue = await page.evaluate(() => {
      const control = document.querySelector('[data-input-state="resting"] input')
      control.value = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.repeat(4)
      control.dispatchEvent(new Event('input', { bubbles: true }))
      return control.value.length
    })
    await page.waitForTimeout(200)
    const inputOverflow = await page.evaluate(() => {
      const wrapper = document.querySelector('[data-input-state="resting"]')
      const control = wrapper.querySelector('input')
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        controlScrolls: control.scrollWidth > control.clientWidth,
        wrapperWidth: Math.round(wrapper.getBoundingClientRect().width),
        viewport: document.documentElement.clientWidth,
      }
    })
    notes.push(
      `390px input page: scrollWidth ${inputOverflow.scrollWidth} / ${inputOverflow.clientWidth}, ` +
        `field ${inputOverflow.wrapperWidth}px with a ${longValue}-character value`,
    )
    if (inputOverflow.scrollWidth > inputOverflow.clientWidth) {
      fail(
        `horizontal overflow on the Input page at 390px: ${inputOverflow.scrollWidth} > ` +
          `${inputOverflow.clientWidth}`,
      )
    }
    if (inputOverflow.wrapperWidth > inputOverflow.viewport) {
      fail(
        `the field is ${inputOverflow.wrapperWidth}px wide in a ${inputOverflow.viewport}px ` +
          'viewport',
      )
    }
    if (!inputOverflow.controlScrolls) {
      fail(
        'a long value did not make the control itself scroll, so the value is widening the ' +
          'field instead of scrolling inside it',
      )
    }
    await page.screenshot({ path: join(HERE, 'input-mobile.png'), fullPage: true })

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
  'input-light.png',
  'input-dark.png',
  'input-neutral.png',
  'input-mobile.png',
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
