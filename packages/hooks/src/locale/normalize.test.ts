import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCALE,
  isValidLocale,
  languageOf,
  localeCandidates,
  localeDirection,
  normalizeLocale,
} from './normalize.js'

describe('normalizeLocale', () => {
  it('canonicalises case and script subtags through Intl', () => {
    // Not a hand-written parser: `Intl` knows the aliases and the canonical casing, and a
    // second implementation of BCP 47 would be wrong in ways nobody tests.
    expect(normalizeLocale('zh-hans-cn')).toBe('zh-Hans-CN')
    expect(normalizeLocale('EN-us')).toBe('en-US')
  })

  it('resolves deprecated language aliases', () => {
    expect(normalizeLocale('iw')).toBe('he')
    expect(normalizeLocale('in')).toBe('id')
  })

  it('folds the underscore spelling instead of throwing', () => {
    // `en_US` is what people write. Turning it into `en-US` is a strictly better outcome
    // than a RangeError that leaves the application with no messages at all — the mistake
    // is still reported, by `isValidLocale` and the instance's diagnostic.
    expect(normalizeLocale('en_US')).toBe('en-US')
    expect(isValidLocale('en_US')).toBe(false)
  })

  it('keeps an unparseable tag verbatim', () => {
    // Substituting a different language would hide the bug; keeping the string lets every
    // lookup miss loudly. Only the underscore is folded — an unknown *region* is left alone.
    expect(normalizeLocale('en_USA')).toBe('en-USA')
    expect(isValidLocale('en_USA')).toBe(false)
    expect(isValidLocale('en-US')).toBe(true)
  })

  it('falls back to the default for missing or empty input', () => {
    expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE)
    expect(normalizeLocale(null)).toBe(DEFAULT_LOCALE)
    expect(normalizeLocale('   ')).toBe(DEFAULT_LOCALE)
    expect(DEFAULT_LOCALE).toBe('en-US')
  })
})

describe('localeCandidates', () => {
  it('drops the script, then the region, then the language', () => {
    expect(localeCandidates('zh-Hans-CN')).toEqual(['zh-Hans-CN', 'zh-CN', 'zh', 'en-US'])
  })

  it('keeps the requested tag first when it is already a pack-shaped tag', () => {
    expect(localeCandidates('zh-CN')).toEqual(['zh-CN', 'zh', 'en-US'])
  })

  it('appends a custom fallback before the built-in default', () => {
    expect(localeCandidates('zh-Hans-CN', 'ja-JP')).toEqual([
      'zh-Hans-CN',
      'zh-CN',
      'zh',
      'ja-JP',
      'en-US',
    ])
  })

  it('never repeats a tag', () => {
    // `en-US` as the active locale ends the chain with the same tag twice otherwise, and a
    // duplicated candidate would merge a pack onto itself.
    expect(localeCandidates('en-US')).toEqual(['en-US', 'en'])
    expect(new Set(localeCandidates('en-US')).size).toBe(localeCandidates('en-US').length)
  })

  it('starts from the default for an empty tag', () => {
    expect(localeCandidates('')).toEqual(['en-US', 'en'])
  })
})

describe('localeDirection', () => {
  it('is derived from the language, not the region', () => {
    // `ar-EG` and `ar-SA` are both right-to-left; a region-based rule would get one wrong.
    expect(localeDirection('ar')).toBe('rtl')
    expect(localeDirection('ar-EG')).toBe('rtl')
    expect(localeDirection('he-IL')).toBe('rtl')
    expect(localeDirection('fa')).toBe('rtl')
    expect(localeDirection('fr-CA')).toBe('ltr')
    expect(localeDirection('zh-Hans-CN')).toBe('ltr')
  })

  it('reads through the canonical form', () => {
    expect(localeDirection('IW')).toBe('rtl')
  })
})

describe('languageOf', () => {
  it('returns the primary subtag, lower-cased', () => {
    expect(languageOf('zh-Hans-CN')).toBe('zh')
    expect(languageOf('EN-us')).toBe('en')
  })
})
