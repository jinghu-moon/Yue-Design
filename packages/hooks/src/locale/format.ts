/**
 * `Intl` formatting for the locale instance.
 *
 * The whole point of this module is what it does *not* do: no hand-written thousands
 * separators, no `DD/MM` string building, no timezone arithmetic. `Intl` already knows every
 * locale's conventions, and a hand-rolled approximation cannot be verified.
 *
 * Formatters are expensive to construct and cheap to reuse, so they are cached — keyed by
 * locale *and* options. The formatted *strings* are never cached: the same number under two
 * locales must not be able to collide.
 */

const numberFormats = new Map<string, Intl.NumberFormat>()
const dateFormats = new Map<string, Intl.DateTimeFormat>()

/** A stable cache key for `locale` + options. */
function cacheKey(locale: string, options: object | undefined): string {
  if (!options) return locale
  const entries = Object.entries(options)
    .filter(([, value]) => value !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : 1))
  return `${locale}|${JSON.stringify(entries)}`
}

/** Format a number with `Intl.NumberFormat`. */
export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  const key = cacheKey(locale, options)
  let formatter = numberFormats.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options)
    numberFormats.set(key, formatter)
  }
  return formatter.format(value)
}

/** Format a date (or epoch milliseconds) with `Intl.DateTimeFormat`. */
export function formatDate(
  value: Date | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const key = cacheKey(locale, options)
  let formatter = dateFormats.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options)
    dateFormats.set(key, formatter)
  }
  return formatter.format(value)
}
