/**
 * Measure the dark-mode opacity proposal (plan §6) by sampling the pixels a user actually sees.
 *
 * The first attempt read `getComputedStyle(...).backgroundColor` and produced `separation 1.000` for every
 * cell — i.e. "the state fill never changes" — while the visual matrix gate measures those same states
 * successfully. That is the signature of reading the wrong observable: when a fill is composed through
 * several layers, custom properties or pseudo-elements, the computed style of the element can stay constant
 * while the painted result changes. So this version screenshots each cell in each state and analyses the
 * pixels.
 *
 * `fast-png` is a pure-JavaScript decoder chosen deliberately: `sharp` is a native module and
 * `@jsquash/png` is a WASM package, and this tool sits next to release gates that must keep running when the
 * toolchain underneath changes (`tools/lib/color.mjs` states that rule). The input is a lossless 8-bit RGBA
 * screenshot of a single element, so decode speed is irrelevant and zero-native-code is not.
 *
 * Measurement only: it overrides two tokens in the page and writes no token.
 *
 * Usage: `node tools/measure-dark-opacity.mjs` (requires a built docs site: `corepack pnpm build`).
 */
import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { decode } from 'fast-png'
import { chromium } from 'playwright-core'
import { contrastRatio } from './lib/contrast.mjs'

const SITE = resolve('apps/docs/.vitepress/dist')
const OUT = '.spec-workflow/token-architecture/dark-opacity-measurement.md'
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.png': 'image/png',
}

const CASES = [
  { label: 'current', hover: null, pressed: null },
  { label: 'proposed', hover: '0.12', pressed: '0.18' },
]

function serve() {
  const server = createServer((request, response) => {
    const clean = decodeURIComponent((request.url ?? '/').split('?')[0])
    for (const candidate of [join(SITE, clean), join(SITE, `${clean}.html`), join(SITE, clean, 'index.html')]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        response.writeHead(200, { 'content-type': MIME[extname(candidate)] ?? 'text/plain' })
        response.end(readFileSync(candidate))
        return
      }
    }
    response.writeHead(404)
    response.end('not found')
  })
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)))
}

/**
 * The fill and the text colour of one element, read from its pixels.
 *
 * Pixels are quantised to 16 levels per channel before counting: anti-aliasing spreads text across thousands
 * of subtly different colours, and the exact values are not what matters — which colour dominates (the fill)
 * and which frequent colour differs most from it (the text) are.
 */
export function analysePixels(buffer) {
  const image = decode(buffer)
  const { data, channels } = image
  const histogram = new Map()
  let opaque = 0
  for (let index = 0; index < data.length; index += channels) {
    const alpha = channels === 4 ? data[index + 3] : 255
    if (alpha < 200) continue
    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]
    const key = `${r >> 4},${g >> 4},${b >> 4}`
    const entry = histogram.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
    entry.count += 1
    entry.r += r
    entry.g += g
    entry.b += b
    histogram.set(key, entry)
    opaque += 1
  }
  if (opaque === 0) throw new Error('analysePixels: every pixel was transparent')

  const colours = [...histogram.values()]
    .map((entry) => ({
      count: entry.count,
      colour: { r: entry.r / entry.count, g: entry.g / entry.count, b: entry.b / entry.count, a: 1 },
    }))
    .sort((a, b) => b.count - a.count)
  const fill = colours[0].colour

  // The text colour: the frequent colour that differs from the fill the most. A cell with no text keeps the
  // fill, and its contrast is 1:1 by construction — the summary reports that rather than inventing a number.
  let text = fill
  let best = 1
  for (const candidate of colours) {
    if (candidate.count < opaque * 0.01) break
    const ratio = contrastRatio(candidate.colour, fill)
    if (ratio > best) {
      best = ratio
      text = candidate.colour
    }
  }

  return { fill, text, textContrast: best, opaque }
}

const toHex = (colour) =>
  `#${[colour.r, colour.g, colour.b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0'))
    .join('')}`

/** Screenshot one element in one state and read its pixels. */
async function sample(page, selector, state) {
  await page.$eval(selector, (element) => element.scrollIntoView({ block: 'center' }))
  await page.mouse.move(0, 0)
  if (state === 'hover') await page.hover(selector)
  if (state === 'pressed') {
    await page.hover(selector)
    await page.mouse.down()
  }
  // Let the transition settle: an early read is the previous state, which is how the first attempt produced
  // a uniform "no change".
  await page.waitForTimeout(300)

  const box = await page.$eval(selector, (element) => {
    const rect = element.getBoundingClientRect()
    return {
      x: Math.max(0, Math.round(rect.x)),
      y: Math.max(0, Math.round(rect.y)),
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
    }
  })
  const shot = await page.screenshot({ clip: box })
  if (state === 'pressed') await page.mouse.up()
  await page.mouse.move(0, 0)
  return analysePixels(shot)
}

async function measure(browser, origin, testCase) {
  const page = await browser.newPage({
    colorScheme: 'dark',
    viewport: { width: 1400, height: 1000 },
    deviceScaleFactor: 1,
  })
  await page.goto(`${origin}/components/button`, { waitUntil: 'load' })
  // VitePress marks dark with a class; the package's dark values key off the media query, which
  // `colorScheme: 'dark'` covers. Both are set so the run cannot silently measure light values.
  await page.evaluate(() => {
    document.documentElement.classList.add('dark')
    document.documentElement.setAttribute('data-theme', 'dark')
  })
  await page.waitForSelector('[data-matrix]', { timeout: 15_000 })

  const tokens = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    return {
      page: root.getPropertyValue('--page').trim(),
      hover: root.getPropertyValue('--opacity-hover').trim(),
      pressed: root.getPropertyValue('--opacity-pressed').trim(),
    }
  })
  if (tokens.page.toLowerCase() === '#ffffff' || tokens.page.toLowerCase() === 'white') {
    throw new Error(`dark mode did not take effect (--page: ${tokens.page})`)
  }

  if (testCase.hover !== null) {
    await page.evaluate((css) => {
      const style = document.createElement('style')
      style.id = 'opacity-probe'
      style.textContent = css
      document.head.append(style)
    }, `:root, [data-theme='dark'] { --opacity-hover: ${testCase.hover}; --opacity-pressed: ${testCase.pressed}; }`)
  }

  const keys = await page.$$eval('[data-matrix]', (cells) => cells.map((cell) => cell.dataset.matrix))
  const readings = {}
  for (const key of keys) {
    const selector = `[data-matrix="${key}"]`
    readings[key] = {
      resting: await sample(page, selector, 'resting'),
      hover: await sample(page, selector, 'hover'),
      pressed: await sample(page, selector, 'pressed'),
    }
  }
  await page.close()
  return { tokens, readings }
}

/** Gate mode: the shipped dark values must keep their states visible and their text legible. */
async function assertShipped(browser, origin) {
  const shipped = await measure(browser, origin, CASES[0])
  const problems = []
  let checked = 0
  for (const [key, states] of Object.entries(shipped.readings)) {
    for (const state of ['hover', 'pressed']) {
      const separation = contrastRatio(states[state].fill, states.resting.fill)
      const textContrast = states[state].textContrast
      checked += 1
      // A state the user cannot see is the failure this gate exists for: with the light opacities in dark,
      // these separations were ~1.2 and the point of the change was to raise them.
      if (separation <= 1.0) {
        problems.push(`${key} / ${state}: the fill does not change from resting (separation ${separation.toFixed(3)})`)
      }
      if (textContrast > 1.01 && textContrast < 4.5) {
        problems.push(`${key} / ${state}: text contrast ${textContrast.toFixed(2)}:1 is below AA`)
      }
    }
  }
  if (problems.length > 0) {
    for (const problem of problems) process.stderr.write(`dark-opacity: ${problem}\n`)
    process.exit(1)
  }
  process.stdout.write(
    `dark-opacity: ${checked} dark state(s) render a visible fill and keep their text at \u2265 4.5:1 ` +
      `(\u03c4-hover ${shipped.tokens.hover}, \u03c4-pressed ${shipped.tokens.pressed})\n`,
  )
}

async function main() {
  if (!existsSync(SITE)) {
    process.stderr.write('measure-dark-opacity: build the docs first (`corepack pnpm build`)\n')
    process.exit(1)
  }

  const server = await serve()
  const origin = `http://127.0.0.1:${server.address().port}`
  const browser = await chromium.launch({ channel: 'chrome', headless: true })

  try {
    if (process.argv.includes('--assert')) {
      await assertShipped(browser, origin)
      return
    }
    const current = await measure(browser, origin, CASES[0])
    const proposed = await measure(browser, origin, CASES[1])

    // A probe that cannot see the variable it measures must fail instead of printing a reassuring table.
    const moved = Object.keys(current.readings).filter((key) => {
      const a = current.readings[key]
      const b = proposed.readings[key]
      return toHex(a.hover.fill) !== toHex(b.hover.fill) || toHex(a.pressed.fill) !== toHex(b.pressed.fill)
    })
    if (moved.length === 0) {
      process.stderr.write(
        'measure-dark-opacity: overriding --opacity-hover/--opacity-pressed changed no sampled pixel, so ' +
          'this table would be meaningless.\n',
      )
      process.exit(1)
    }

    const keys = Object.keys(current.readings)
    const lines = [
      '# dark 模式 hover / pressed 透明度：现值 vs 提案值（像素采样）',
      '',
      '测量方式：`node tools/measure-dark-opacity.mjs` —— 真实 Chrome（dark 配色）加载 docs 构建产物，',
      '对每个 `[data-matrix]` 单元格在静止 / hover / pressed 三种状态下**截图并解码像素**，',
      '从像素里取主导色（填充）与对比最强的常见色（文字）。状态按用户方式进入（真实指针 hover、真实按下）。',
      '两个透明度只通过页面覆盖注入，**未修改任何 Token**。',
      '',
      `Token：\`--opacity-hover\` ${current.tokens.hover} → ${proposed.tokens.hover}，` +
        `\`--opacity-pressed\` ${current.tokens.pressed} → ${proposed.tokens.pressed}`,
      '',
      `采样到变化的单元格：${moved.length} / ${keys.length}（未变化者说明该变体不经过这两个 Token）`,
      '',
      '> 状态可辨度 = 该状态填充色与静止填充色的对比度。它是"这个反馈看不看得见"的代理指标；',
      '> 文字对比度用 AA 阈值 4.5:1 判定。无文字的单元格（如纯色块）对比度恒为 1.00，不代表缺陷。',
      '',
      '| 单元格 | 状态 | 填充（现 → 提案） | 文字对比度（现 → 提案） | 状态可辨度（现 → 提案） | 判定 |',
      '| --- | --- | --- | --- | --- | --- |',
    ]

    let worstSeparationCurrent = Infinity
    let worstSeparationProposed = Infinity
    let improved = 0
    let degraded = 0
    let broken = 0
    const textCells = []

    for (const key of keys) {
      for (const state of ['hover', 'pressed']) {
        const a = current.readings[key]
        const b = proposed.readings[key]
        const textCurrent = a[state].textContrast
        const textProposed = b[state].textContrast
        const sepCurrent = contrastRatio(a[state].fill, a.resting.fill)
        const sepProposed = contrastRatio(b[state].fill, b.resting.fill)
        if (textCurrent > 1.01) textCells.push({ key, state, textCurrent, textProposed })
        worstSeparationCurrent = Math.min(worstSeparationCurrent, sepCurrent)
        worstSeparationProposed = Math.min(worstSeparationProposed, sepProposed)
        let verdict = '无变化'
        if (textProposed < 4.5 && textCurrent >= 4.5) {
          verdict = '**提案击穿 AA**'
          broken += 1
        } else if (sepProposed > sepCurrent + 0.01) {
          verdict = '可辨度提升'
          improved += 1
        } else if (sepProposed < sepCurrent - 0.01) {
          verdict = '可辨度下降'
          degraded += 1
        }
        lines.push(
          `| \`${key}\` | ${state} | ${toHex(a[state].fill)} → ${toHex(b[state].fill)} | ` +
            `${textCurrent.toFixed(2)} → ${textProposed.toFixed(2)} | ` +
            `${sepCurrent.toFixed(3)} → ${sepProposed.toFixed(3)} | ${verdict} |`,
        )
      }
    }

    const worst = textCells.reduce(
      (accumulator, entry) =>
        entry.textProposed < accumulator.textProposed ? entry : accumulator,
      textCells[0] ?? null,
    )
    lines.push(
      '',
      '## 汇总',
      '',
      `- 参与测量的单元格：${keys.length}（其中 ${moved.length} 个受这两个 Token 影响）`,
      `- 状态可辨度最低值：现 ${worstSeparationCurrent.toFixed(3)} → 提案 ${worstSeparationProposed.toFixed(3)}`,
      worst === null
        ? '- 文字对比度：没有含文字的单元格'
        : `- 文字对比度最低者：\`${worst.key}\` / ${worst.state} —— 现 ${worst.textCurrent.toFixed(2)}:1 → ` +
          `提案 ${worst.textProposed.toFixed(2)}:1`,
      `- 判定计数：可辨度提升 ${improved}、下降 ${degraded}、击穿 AA ${broken}`,
      '',
    )
    writeFileSync(OUT, `${lines.join('\n')}\n`, 'utf8')
    console.log(lines.slice(8).join('\n'))
    console.log(`\nwritten: ${OUT}`)
  } finally {
    await browser.close()
    await new Promise((done) => server.close(done))
  }
}

await main()
