/**
 * Colour maths for the token audit.
 *
 * Deliberately dependency-free: the audit is a release gate, so it must keep
 * running even if the build toolchain changes underneath it.
 *
 * Colours are `{ r, g, b, a }` with channels in 0..255 (never premultiplied)
 * and alpha in 0..1.
 */

const NAMED_COLOURS = new Map([
  ['transparent', [0, 0, 0, 0]],
  ['black', [0, 0, 0, 1]],
  ['white', [255, 255, 255, 1]],
])

/** Parse a CSS colour value into `{ r, g, b, a }`. Throws on anything exotic. */
export function parseColor(input) {
  if (input === undefined || input === null) throw new Error('parseColor: no value given')
  const value = String(input).trim().toLowerCase()
  if (value === '') throw new Error('parseColor: empty value')

  const named = NAMED_COLOURS.get(value)
  if (named) return { r: named[0], g: named[1], b: named[2], a: named[3] }
  if (value.startsWith('#')) return parseHex(value)
  if (value.startsWith('rgb')) return parseRgbFunction(value)
  if (value.startsWith('color-mix(')) return parseColorMix(value)
  throw new Error(`parseColor: unsupported colour value "${input}"`)
}

function parseHex(value) {
  const digits = value.slice(1)
  if (!/^[0-9a-f]+$/.test(digits)) throw new Error(`parseColor: malformed hex "${value}"`)
  const expand = (char) => Number.parseInt(char + char, 16)
  if (digits.length === 3 || digits.length === 4) {
    return {
      r: expand(digits[0]),
      g: expand(digits[1]),
      b: expand(digits[2]),
      a: digits.length === 4 ? expand(digits[3]) / 255 : 1,
    }
  }
  if (digits.length === 6 || digits.length === 8) {
    return {
      r: Number.parseInt(digits.slice(0, 2), 16),
      g: Number.parseInt(digits.slice(2, 4), 16),
      b: Number.parseInt(digits.slice(4, 6), 16),
      a: digits.length === 8 ? Number.parseInt(digits.slice(6, 8), 16) / 255 : 1,
    }
  }
  throw new Error(`parseColor: malformed hex "${value}"`)
}

function parseRgbFunction(value) {
  const match = /^rgba?\(([\s\S]*)\)$/.exec(value)
  if (!match) throw new Error(`parseColor: malformed rgb() "${value}"`)
  let body = match[1].trim()
  let alphaText = null

  const slash = splitTopLevel(body, '/')
  if (slash.length === 2) {
    body = slash[0].trim()
    alphaText = slash[1].trim()
  } else if (slash.length > 2) {
    throw new Error(`parseColor: malformed rgb() "${value}"`)
  }

  let parts = body
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  if (parts.length === 1) parts = body.split(/\s+/).filter((part) => part.length > 0)
  if (parts.length < 3) throw new Error(`parseColor: rgb() needs three channels "${value}"`)

  const channel = (text) => (text.endsWith('%') ? (Number.parseFloat(text) / 100) * 255 : Number.parseFloat(text))
  const alpha = (text) => (text.endsWith('%') ? Number.parseFloat(text) / 100 : Number.parseFloat(text))

  const r = channel(parts[0])
  const g = channel(parts[1])
  const b = channel(parts[2])
  if (parts.length > 3) alphaText = parts[3]

  const a = alphaText === null ? 1 : alpha(alphaText)
  for (const [label, component] of [
    ['r', r],
    ['g', g],
    ['b', b],
    ['a', a],
  ]) {
    if (!Number.isFinite(component)) {
      throw new Error(`parseColor: rgb() channel ${label} is not a number in "${value}"`)
    }
  }
  return { r, g, b, a }
}

/**
 * `color-mix(in srgb, A p%, B q%)`, per CSS Color 5: premultiplied channels,
 * the unspecified percentage inferred as the complement, and alpha scaled down
 * when the weights sum to less than 100%.
 */
export function parseColorMix(value) {
  const match = /^color-mix\(([\s\S]*)\)$/.exec(value.trim())
  if (!match) throw new Error(`parseColor: malformed color-mix() "${value}"`)

  const parts = splitTopLevel(match[1], ',')
  if (parts.length !== 3) {
    throw new Error(`parseColor: color-mix() needs interpolation space and two colours in "${value}"`)
  }
  const space = parts[0].trim().replace(/\s+/g, ' ')
  if (space !== 'in srgb') {
    throw new Error(`parseColor: only "color-mix(in srgb, ...)" is supported, got "${space}" in "${value}"`)
  }

  const first = splitColorAndPercentage(parts[1])
  const second = splitColorAndPercentage(parts[2])
  return mixSrgb(
    parseColor(first.color),
    first.percentage,
    parseColor(second.color),
    second.percentage,
  )
}

export function mixSrgb(colorA, percentageA, colorB, percentageB) {
  let weightA = percentageA
  let weightB = percentageB
  if (weightA === null && weightB === null) {
    weightA = 0.5
    weightB = 0.5
  } else if (weightA === null) {
    weightA = 1 - weightB
  } else if (weightB === null) {
    weightB = 1 - weightA
  }

  let alphaScale = 1
  const sum = weightA + weightB
  if (sum > 1) {
    weightA /= sum
    weightB /= sum
  } else if (sum < 1) {
    alphaScale = sum
  }

  const alpha = colorA.a * weightA + colorB.a * weightB
  if (alpha <= 0) return { r: 0, g: 0, b: 0, a: 0 }
  const channel = (key) =>
    (colorA[key] * colorA.a * weightA + colorB[key] * colorB.a * weightB) / alpha
  return {
    r: channel('r'),
    g: channel('g'),
    b: channel('b'),
    a: alpha * alphaScale,
  }
}

export function formatColor(color) {
  const round = (value) => Math.round(value * 100) / 100
  const base = `rgb(${round(color.r)} ${round(color.g)} ${round(color.b)}`
  return color.a >= 1 ? `${base})` : `${base} / ${round(color.a)})`
}

export function toHex(color) {
  const hex = (value) =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
  return `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`
}

/* ------------------------------------------------------------------ *
 * helpers
 * ------------------------------------------------------------------ */

/** Split on `separator` at nesting depth zero, respecting quotes. */
export function splitTopLevel(text, separator) {
  const parts = []
  let current = ''
  let depth = 0
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"' || char === "'") {
      const quote = char
      current += char
      index += 1
      while (index < text.length && text[index] !== quote) {
        if (text[index] === '\\') {
          current += text[index]
          index += 1
        }
        current += text[index]
        index += 1
      }
      current += quote
      continue
    }
    if (char === '(') depth += 1
    else if (char === ')') depth -= 1
    if (char === separator && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += char
  }
  parts.push(current)
  return parts
}

/** `#abc 20%` -> { color: '#abc', percentage: 0.2 }; `rgb(0 0 0)` -> percentage null. */
export function splitColorAndPercentage(input) {
  const text = input.trim()
  const calc = /\s+(calc\([\s\S]*\))\s*$/.exec(text)
  if (calc) {
    return {
      color: text.slice(0, calc.index).trim(),
      percentage: evaluatePercentageCalc(calc[1]),
    }
  }
  const percent = /\s+(-?[\d.]+%)\s*$/.exec(text)
  if (percent) {
    return {
      color: text.slice(0, percent.index).trim(),
      percentage: Number.parseFloat(percent[1]) / 100,
    }
  }
  return { color: text, percentage: null }
}

/**
 * `calc(.08 * 100%)` -> 0.08. Only the multiplicative forms the token sources
 * use are supported; anything else fails loudly rather than guessing.
 * The result is a *fraction* (percent ÷ 100), matching `splitColorAndPercentage`.
 */
export function evaluatePercentageCalc(expression) {
  const match = /^calc\(([\s\S]*)\)$/.exec(expression.trim())
  if (!match) throw new Error(`calc(): malformed expression "${expression}"`)
  const inner = match[1]
  const percentCount = (inner.match(/%/g) ?? []).length
  if (percentCount !== 1) {
    throw new Error(`calc(): expected exactly one percentage term in "${expression}"`)
  }
  const cleaned = inner.replace(/%/g, '').trim()
  const tokens = cleaned
    .split(/([*/])/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
  if (tokens.length === 0 || tokens.length % 2 === 0) {
    throw new Error(`calc(): unsupported expression "${expression}"`)
  }
  const number = (text) => {
    const value = Number.parseFloat(text)
    if (!Number.isFinite(value) || !/^-?[\d.]+$/.test(text)) {
      throw new Error(
        `calc(): only "number * number" / "number / number" is supported, ` +
          `got "${text}" in "${expression}"`,
      )
    }
    return value
  }
  let accumulator = number(tokens[0])
  for (let index = 1; index < tokens.length; index += 2) {
    const operator = tokens[index]
    const operand = number(tokens[index + 1])
    accumulator = operator === '*' ? accumulator * operand : accumulator / operand
  }
  return accumulator / 100
}
