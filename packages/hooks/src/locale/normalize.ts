/**
 * Locale tag normalisation and the fallback chain.
 *
 * Pure functions, no state: the chain decides *which pack* answers a request, and it has to
 * be testable without creating an instance.
 */
import type { YueLocaleDirection } from './types.js'

/** The locale used when nothing is configured. */
export const DEFAULT_LOCALE = 'en-US'

/**
 * Language subtags written right to left.
 *
 * A closed list rather than a dependency: `Intl` answers the *formatting* questions but not
 * this one, and the alternative — asking a data package — would be a runtime dependency for
 * a lookup that changes about once a decade. Anything unlisted is left-to-right, and a
 * consumer whose language is missing can pass `direction` explicitly.
 */
const RTL_LANGUAGES = new Set([
  'ar',
  'arc',
  'ckb',
  'dv',
  'fa',
  'he',
  'ku',
  'ps',
  'sd',
  'ug',
  'ur',
  'yi',
])

/**
 * Canonicalise a BCP 47 tag.
 *
 * `Intl.getCanonicalLocales()` does the real work — it knows the aliases (`iw` → `he`,
 * `zh-hans-cn` → `zh-Hans-CN`) that a hand-written parser would get wrong. An
 * unparseable tag is returned trimmed rather than rejected: the honest response to
 * "someone passed `en_USA`" is to keep their string and let `t()` report missing keys
 * against it, not to silently substitute a different language.
 *
 * Underscores are folded to dashes first. `en_US` is not valid BCP 47, but it is what
 * people write, and turning it into `en-US` is a strictly better outcome than a
 * `RangeError` that produces no messages at all.
 */
export function normalizeLocale(tag: string | undefined | null): string {
  if (typeof tag !== 'string') return DEFAULT_LOCALE
  const candidate = tag.trim().replace(/_/g, '-')
  if (candidate === '') return DEFAULT_LOCALE
  try {
    const [canonical] = Intl.getCanonicalLocales(candidate)
    return canonical ?? candidate
  } catch {
    return candidate
  }
}

/** The language subtag of a tag: `zh-Hans-CN` → `zh`. */
export function languageOf(tag: string): string {
  return normalizeLocale(tag).split('-')[0]?.toLowerCase() ?? ''
}

/**
 * Whether a tag is valid BCP 47.
 *
 * `en_US` is *not*: underscores are a common spelling in other ecosystems, and the locale
 * instance recovers from it (see `normalizeLocale`) while still reporting it, because a tag
 * nobody can reproduce in `Intl` is a bug worth seeing.
 */
export function isValidLocale(tag: string): boolean {
  if (typeof tag !== 'string' || tag.trim() === '') return false
  try {
    Intl.getCanonicalLocales(tag.trim())
    return true
  } catch {
    return false
  }
}

/**
 * The ordered chain of tags to try, most specific first.
 *
 * `zh-Hans-CN` → `zh-Hans-CN`, `zh-CN`, `zh`, fallback, `en-US`.
 *
 * Each step drops one thing a pack is unlikely to be keyed by: first the script (a pack for
 * `zh-CN` serves a `zh-Hans-CN` request), then the region, then the language itself. The
 * fallback and `en-US` close the chain, so the last step always has an answer if any pack
 * exists at all.
 */
export function localeCandidates(tag: string, fallback: string = DEFAULT_LOCALE): string[] {
  const normalized = normalizeLocale(tag)
  const parts = normalized.split('-')
  const language = parts[0]

  const chain: string[] = [normalized]
  if (parts.length > 2) {
    // Keep the region, drop the script: zh-Hans-CN → zh-CN.
    chain.push([language, ...parts.slice(2)].join('-'))
  }
  if (parts.length > 1) chain.push(language)
  chain.push(normalizeLocale(fallback), DEFAULT_LOCALE)

  return [...new Set(chain.filter((entry) => entry !== ''))]
}

/**
 * Text direction for a locale.
 *
 * Derived from the language subtag, never guessed from the region: `ar-EG` and `ar-SA` are
 * both right-to-left, while `fr-CA` is not.
 */
export function localeDirection(tag: string): YueLocaleDirection {
  return RTL_LANGUAGES.has(languageOf(tag)) ? 'rtl' : 'ltr'
}
