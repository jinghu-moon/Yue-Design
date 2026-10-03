/**
 * The locale runtime with no DOM at all.
 *
 * This file runs in the `tokens` project — Node environment, no `happy-dom` — because that is
 * the only way to test the SSR claim: a module that reads `window` at import time or during a
 * lookup throws here, and a happy-dom test would never notice. The roadmap asks for exactly
 * this ("SSR 无浏览器对象"), and `verify:tarball` repeats it against the built artefact.
 *
 * It also documents the contract for a server render: a locale must be *passed in*, never
 * inferred from a browser API, or the server and the client disagree about the first HTML.
 */
import { describe, expect, it } from 'vitest'
import {
  createLocale,
  DEFAULT_LOCALE,
  localeCandidates,
  localeDirection,
  normalizeLocale,
  resolveMessages,
  useLocale,
} from '../packages/hooks/src/locale/index'

const packs = {
  'en-US': { input: { clear: 'Clear' } },
  'zh-CN': { input: { clear: '清空' } },
}

describe('the locale runtime on a server', () => {
  it('has no browser globals to fall back on', () => {
    // If this ever stops being true the rest of the file proves nothing.
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
  })

  it('creates an instance and translates without a DOM', () => {
    const locale = createLocale({ locale: 'zh-CN', packs })
    expect(locale.t('input.clear')).toBe('清空')
    expect(locale.messages.value).toEqual(packs['zh-CN'])
  })

  it('formats numbers and dates with Intl, which Node has', () => {
    const locale = createLocale({ locale: 'de-DE' })
    expect(locale.n(1234.5)).toBe(new Intl.NumberFormat('de-DE').format(1234.5))
    expect(locale.d(new Date(Date.UTC(2024, 0, 2)), { timeZone: 'UTC' })).toBe(
      new Intl.DateTimeFormat('de-DE', { timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 2))),
    )
  })

  it('selects a locale deterministically when nothing is passed', () => {
    // No `navigator.language`: the server cannot know the browser's language, and guessing
    // would make the first HTML differ from what the client renders.
    expect(createLocale().current.value).toBe(DEFAULT_LOCALE)
    expect(useLocale().current.value).toBe(DEFAULT_LOCALE)
  })

  it('resolves the fallback chain without a browser', () => {
    expect(localeCandidates('zh-Hans-CN')).toEqual(['zh-Hans-CN', 'zh-CN', 'zh', 'en-US'])
    const resolved = resolveMessages(packs, localeCandidates('zh-Hans-CN'))
    expect(resolved).toEqual({ input: { clear: '清空' } })
  })

  it('derives direction from the locale alone', () => {
    expect(localeDirection('ar-EG')).toBe('rtl')
    expect(normalizeLocale('ar_eg')).toBe('ar-EG')
    expect(createLocale({ locale: 'he-IL' }).direction.value).toBe('rtl')
  })

  it('survives a module re-import, so a second copy shares the injection key', async () => {
    // `@yue-ui/vue` bundles this package, so in a real install there are two copies of the
    // module. `Symbol.for` is what makes them agree; a private symbol would make
    // `inject(key, fallback)` return the fallback forever, silently.
    const reloaded = await import('../packages/hooks/src/locale/index')
    expect(reloaded.yueLocaleKey).toBe(Symbol.for('yue:locale'))
    expect(reloaded.DEFAULT_LOCALE).toBe(DEFAULT_LOCALE)
  })
})
