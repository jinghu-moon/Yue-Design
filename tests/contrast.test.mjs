import { describe, expect, it } from 'vitest'
import {
  evaluatePercentageCalc,
  formatColor,
  mixSrgb,
  parseColor,
  splitColorAndPercentage,
} from '../tools/lib/color.mjs'
import { contrastRatio, flatten, relativeLuminance } from '../tools/lib/contrast.mjs'

const channel = (color) => [color.r, color.g, color.b]

describe('parseColor', () => {
  it('parses 3/4/6/8 digit hex', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    expect(parseColor('#0000')).toEqual({ r: 0, g: 0, b: 0, a: 0 })
    expect(parseColor('#1f75db')).toEqual({ r: 0x1f, g: 0x75, b: 0xdb, a: 1 })
    expect(parseColor('#1f75db80').a).toBeCloseTo(0x80 / 255, 10)
  })

  it('parses modern space/slash and legacy comma rgb syntax', () => {
    // `--scrim: rgb(0 0 0/.56)` from semantics.css — no spaces around the slash.
    expect(parseColor('rgb(0 0 0/.56)')).toEqual({ r: 0, g: 0, b: 0, a: 0.56 })
    expect(parseColor('rgba(31, 31, 31, 0.08)')).toEqual({ r: 31, g: 31, b: 31, a: 0.08 })
    expect(parseColor('rgb(100% 0% 0% / 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 })
  })

  it('parses transparent and rejects unmodelled colour syntaxes', () => {
    expect(parseColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 })
    expect(() => parseColor('hsl(200 50% 50%)')).toThrow(/unsupported colour value/)
    expect(() => parseColor('')).toThrow(/empty value/)
    expect(() => parseColor('#12345')).toThrow(/malformed hex/)
  })
})

describe('color-mix', () => {
  it('mixes two opaque colours by weight', () => {
    const mixed = mixSrgb(parseColor('#000'), 0.5, parseColor('#fff'), 0.5)
    expect(channel(mixed)).toEqual([127.5, 127.5, 127.5])
    expect(mixed.a).toBe(1)
  })

  it('infers the missing percentage as the complement', () => {
    const mixed = mixSrgb(parseColor('#1f1f1f'), 0.08, parseColor('#eee'), null)
    expect(mixed.r).toBeCloseTo(0.08 * 0x1f + 0.92 * 0xee, 6)
    expect(mixed.a).toBe(1)
  })

  it('keeps the source colour and only the weight as alpha when mixing with transparent', () => {
    // This is exactly how --button-ghost-background-hover is defined.
    const mixed = parseColor('color-mix(in srgb, #1f1f1f 8%, transparent)')
    expect(channel(mixed)).toEqual([0x1f, 0x1f, 0x1f])
    expect(mixed.a).toBeCloseTo(0.08, 10)
  })

  it('evaluates calc() percentages from tokens', () => {
    const mixed = parseColor('color-mix(in srgb, #ffffff calc(.08 * 100%), #1f1f1f)')
    expect(mixed.r).toBeCloseTo(0.08 * 255 + 0.92 * 0x1f, 6)
    expect(mixed.a).toBe(1)
  })

  it('rejects interpolation spaces it cannot model', () => {
    expect(() => parseColor('color-mix(in oklch, #fff 50%, #000)')).toThrow(/only "color-mix\(in srgb/)
    expect(() => parseColor('color-mix(#fff 50%, #000)')).toThrow(/interpolation space/)
  })
})

describe('percentage helpers', () => {
  it('returns a fraction, not a percentage', () => {
    expect(evaluatePercentageCalc('calc(.08*100%)')).toBeCloseTo(0.08, 10)
    expect(evaluatePercentageCalc('calc(100% * .08)')).toBeCloseTo(0.08, 10)
    expect(evaluatePercentageCalc('calc(16%/2)')).toBeCloseTo(0.08, 10)
  })

  it('fails loudly on expressions it was not taught', () => {
    expect(() => evaluatePercentageCalc('calc(8% + 2%)')).toThrow(/exactly one percentage/)
    expect(() => evaluatePercentageCalc('calc(.08*100%) ')).not.toThrow()
    expect(() => evaluatePercentageCalc('calc(2px)')).toThrow(/exactly one percentage/)
  })

  it('splits colour and percentage, leaving function colours intact', () => {
    expect(splitColorAndPercentage('#abc 20%')).toEqual({ color: '#abc', percentage: 0.2 })
    expect(splitColorAndPercentage('transparent')).toEqual({
      color: 'transparent',
      percentage: null,
    })
    expect(splitColorAndPercentage('color-mix(in srgb, #fff 10%, #000)')).toEqual({
      color: 'color-mix(in srgb, #fff 10%, #000)',
      percentage: null,
    })
  })
})

describe('flatten', () => {
  it('treats the first layer as the opaque base, ignoring its alpha', () => {
    // Single layer: alpha is dropped, exactly like the prototype's flat().
    expect(flatten(['rgba(0 0 0 0.5)'])).toEqual({ r: 0, g: 0, b: 0, a: 1 })
    // Later layers composite over that base.
    expect(channel(flatten(['rgba(255 0 0 1)', 'rgba(0 0 0 0.5)']))).toEqual([127.5, 0, 0])
  })

  it('composites translucent layers over the base', () => {
    expect(channel(flatten(['#ffffff', 'rgba(0 0 0 0.5)']))).toEqual([127.5, 127.5, 127.5])
    expect(channel(flatten(['#fff', 'rgba(31, 31, 31, 0.08)']))[0]).toBeCloseTo(
      0.08 * 31 + 0.92 * 255,
      6,
    )
  })

  it('returns an opaque colour so contrast is computed on the real result', () => {
    expect(flatten(['#fff', 'rgba(0 0 0 0.5)']).a).toBe(1)
  })
})

describe('WCAG contrast', () => {
  it('anchors on the known extremes', () => {
    expect(relativeLuminance(parseColor('#000'))).toBe(0)
    expect(relativeLuminance(parseColor('#fff'))).toBe(1)
    expect(contrastRatio(parseColor('#000'), parseColor('#fff'))).toBeCloseTo(21, 10)
    expect(contrastRatio(parseColor('#abc'), parseColor('#abc'))).toBeCloseTo(1, 10)
  })

  it('is symmetric', () => {
    const a = contrastRatio(parseColor('#1f75db'), parseColor('#ffffff'))
    const b = contrastRatio(parseColor('#ffffff'), parseColor('#1f75db'))
    expect(a).toBeCloseTo(b, 12)
  })

  it('reproduces the canonical #767676 / white example', () => {
    expect(contrastRatio(parseColor('#767676'), parseColor('#ffffff'))).toBeCloseTo(4.54, 2)
  })

  it('uses the prototype legacy luminance threshold, not 0.04045', () => {
    // The threshold 0.03928 sits at 10.02/255, so channel values up to 10 take
    // the linear branch and 11 is the first to take the power curve.
    expect(relativeLuminance({ r: 9, g: 9, b: 9, a: 1 })).toBeCloseTo((9 / 255) / 12.92, 12)
    expect(relativeLuminance({ r: 11, g: 11, b: 11, a: 1 })).toBeCloseTo(
      (((11 / 255) + 0.055) / 1.055) ** 2.4,
      12,
    )
  })

  it('formats colours for reports', () => {
    expect(formatColor({ r: 1, g: 2, b: 3, a: 1 })).toBe('rgb(1 2 3)')
    expect(formatColor({ r: 1, g: 2, b: 3, a: 0.5 })).toBe('rgb(1 2 3 / 0.5)')
  })
})
