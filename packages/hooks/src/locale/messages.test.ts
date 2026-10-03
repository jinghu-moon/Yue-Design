import { describe, expect, it } from 'vitest'
import {
  interpolate,
  isMessageLeaf,
  isPluralMessage,
  lookupMessage,
  mergeMessages,
  resolveMessages,
  selectPluralForm,
} from './messages.js'
import type { YueMessageTree } from './types.js'

/** A two-language fixture: enough structure to exercise every branch rule. */
const EN: YueMessageTree = {
  input: { clear: 'Clear' },
  pagination: { page: 'Page {page}', next: 'Next' },
}

const ZH: YueMessageTree = {
  input: { clear: '清空' },
  pagination: { next: '下一页', page: '第 {page} 页' },
}

describe('isPluralMessage', () => {
  it('recognises a plural map by its Intl category keys', () => {
    expect(isPluralMessage({ one: '{count} item', other: '{count} items' })).toBe(true)
    expect(isPluralMessage({ other: 'items' })).toBe(true)
  })

  it('does not mistake a nested branch for a plural leaf', () => {
    // The structural rule that removes the ambiguity: a branch is not allowed to look
    // exactly like a plural map, so `{ other: { … } }` is a branch, not a message.
    expect(isPluralMessage({ other: { nested: 'x' } })).toBe(false)
    expect(isPluralMessage({ clear: 'Clear' })).toBe(false)
    expect(isPluralMessage('just a string')).toBe(false)
    expect(isPluralMessage({ other: 'x', extra: 'y' })).toBe(false)
  })

  it('classifies leaves', () => {
    expect(isMessageLeaf('Clear')).toBe(true)
    expect(isMessageLeaf({ one: 'a', other: 'b' })).toBe(true)
    expect(isMessageLeaf({ input: { clear: 'Clear' } })).toBe(false)
  })
})

describe('lookupMessage', () => {
  it('walks a dotted key', () => {
    expect(lookupMessage(EN, 'input.clear')).toBe('Clear')
    expect(lookupMessage(EN, 'pagination.page')).toBe('Page {page}')
  })

  it('returns undefined for a branch, never a partial object', () => {
    // `t('input')` must not render `[object Object]`, and it must not be silently treated
    // as "found" either.
    expect(lookupMessage(EN, 'input')).toBeUndefined()
  })

  it('returns undefined for a missing key or a missing path', () => {
    expect(lookupMessage(EN, 'input.missing')).toBeUndefined()
    expect(lookupMessage(EN, 'nope.nope')).toBeUndefined()
    expect(lookupMessage(EN, 'input.clear.deeper')).toBeUndefined()
    expect(lookupMessage(EN, '')).toBeUndefined()
  })
})

describe('interpolate', () => {
  it('fills placeholders with strings and numbers', () => {
    expect(interpolate('Page {page} of {total}', { page: 2, total: 10 }).value).toBe('Page 2 of 10')
  })

  it('leaves a placeholder intact and reports it', () => {
    // Replacing an unfilled placeholder with an empty string produces a sentence that reads
    // as finished, which is how a missing parameter survives review.
    const { value, missing } = interpolate('Hello {name}!', {})
    expect(value).toBe('Hello {name}!')
    expect(missing).toEqual(['name'])
  })

  it('reports every missing parameter once', () => {
    expect(interpolate('{a} and {b} and {a}', { a: 'x' }).missing).toEqual(['b'])
  })

  it('ignores placeholders that are not identifiers', () => {
    expect(interpolate('{ } {a-b}', {}).value).toBe('{ } {a-b}')
  })
})

describe('mergeMessages', () => {
  it('merges branch by branch and replaces leaves', () => {
    const merged = mergeMessages(EN, { input: { clear: 'Effacer' } })
    expect(merged).toEqual({
      input: { clear: 'Effacer' },
      pagination: { page: 'Page {page}', next: 'Next' },
    })
  })

  it('keeps the base untouched', () => {
    mergeMessages(EN, { input: { clear: 'Effacer' } })
    expect(EN.input).toEqual({ clear: 'Clear' })
  })

  it('merges the forms of a plural message rather than dropping them', () => {
    // A pack that only translates `other` must keep the `one` form the base language had;
    // replacing the whole leaf would silently delete a plural category.
    const merged = mergeMessages(
      { items: { one: '{count} item', other: '{count} items' } },
      { items: { other: '{count} Elemente' } },
    )
    expect(merged.items).toEqual({ one: '{count} item', other: '{count} Elemente' })
  })

  it('replaces a branch with a leaf when the override says so', () => {
    expect(mergeMessages(EN, { input: 'Flat' }).input).toBe('Flat')
  })

  it('ignores undefined values instead of deleting the key', () => {
    expect(mergeMessages(EN, { input: undefined }).input).toEqual({ clear: 'Clear' })
  })

  it('returns the base when there is no override', () => {
    expect(mergeMessages(EN, undefined)).toBe(EN)
  })
})

describe('resolveMessages', () => {
  const packs = { 'zh-CN': ZH, 'en-US': EN }

  it('merges the chain from least to most specific', () => {
    const resolved = resolveMessages(packs, ['zh-Hans-CN', 'zh-CN', 'zh', 'en-US'])
    // zh-CN wins where it has a translation…
    expect(lookupMessage(resolved, 'input.clear')).toBe('清空')
    // …and en-US fills the gap it does not.
    expect(lookupMessage(resolved, 'pagination.next')).toBe('下一页')
  })

  it('takes the whole tree from the fallback pack when the language has no pack', () => {
    const resolved = resolveMessages(packs, ['fr-FR', 'fr', 'en-US'])
    expect(lookupMessage(resolved, 'input.clear')).toBe('Clear')
  })

  it('leaves a key missing when no pack on the chain has it', () => {
    const resolved = resolveMessages(packs, ['zh-CN', 'zh', 'en-US'], undefined)
    expect(lookupMessage(resolved, 'nothing.here')).toBeUndefined()
  })

  it('applies the scope override last', () => {
    const resolved = resolveMessages(packs, ['zh-CN', 'zh', 'en-US'], {
      input: { clear: 'Effacer' },
    })
    expect(lookupMessage(resolved, 'input.clear')).toBe('Effacer')
    expect(lookupMessage(resolved, 'pagination.page')).toBe('第 {page} 页')
  })

  it('resolves to an empty tree when nothing on the chain has a pack', () => {
    expect(resolveMessages({}, ['fr', 'en-US'], undefined)).toEqual({})
  })
})

describe('selectPluralForm', () => {
  const items = {
    one: '{count} item',
    other: '{count} items',
  }

  it('selects through Intl.PluralRules, not through `count === 1`', () => {
    expect(selectPluralForm(items, 1, 'en-US')).toBe('{count} item')
    expect(selectPluralForm(items, 0, 'en-US')).toBe('{count} items')
    expect(selectPluralForm(items, 2, 'en-US')).toBe('{count} items')
  })

  it('uses the language’s own categories', () => {
    // Russian distinguishes `one`, `few` and `many`; a component that branched on English
    // grammar would render the wrong form for 2 and 5.
    const ru = { one: 'one', few: 'few', many: 'many', other: 'other' }
    expect(selectPluralForm(ru, 1, 'ru')).toBe('one')
    expect(selectPluralForm(ru, 2, 'ru')).toBe('few')
    expect(selectPluralForm(ru, 5, 'ru')).toBe('many')
  })

  it('falls back to `other` when the category has no form', () => {
    expect(selectPluralForm({ other: 'items' }, 1, 'en-US')).toBe('items')
  })
})
