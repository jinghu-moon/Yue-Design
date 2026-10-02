/**
 * WCAG contrast maths, kept bit-for-bit compatible with the browser prototype.
 *
 * The prototype used the legacy sRGB threshold (0.03928 / 12.92) rather than
 * the current 0.04045 / 12.92. That difference is far below one contrast step,
 * but "the audit still passes after migration" is only a meaningful claim if
 * both implementations compute the same number, so the legacy branch is kept
 * deliberately and documented here.
 */
import { parseColor } from './color.mjs'

/** Composite a stack of colours bottom-up, exactly like the prototype's flat(). */
export function flatten(layers) {
  const list = Array.isArray(layers) ? layers : [layers]
  if (list.length === 0) throw new Error('flatten: no layers given')
  const out = [0, 0, 0]
  let first = true
  for (const layer of list) {
    const color = typeof layer === 'string' ? parseColor(layer) : layer
    for (let index = 0; index < 3; index += 1) {
      const key = ['r', 'g', 'b'][index]
      out[index] = first ? color[key] : color[key] * color.a + out[index] * (1 - color.a)
    }
    first = false
  }
  return { r: out[0], g: out[1], b: out[2], a: 1 }
}

/** Relative luminance of an opaque colour (0..1). */
export function relativeLuminance(color) {
  const channel = (value) => {
    const scaled = value / 255
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
  }
  return (
    0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
  )
}

/** Contrast ratio between two colours, 1..21. */
export function contrastRatio(a, b) {
  const luminanceA = relativeLuminance(a)
  const luminanceB = relativeLuminance(b)
  const lighter = Math.max(luminanceA, luminanceB)
  const darker = Math.min(luminanceA, luminanceB)
  return (lighter + 0.05) / (darker + 0.05)
}
