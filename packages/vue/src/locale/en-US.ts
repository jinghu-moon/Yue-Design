/**
 * `en-US` — Yue's default and fallback language pack.
 *
 * This is the one pack the root entry carries: a component used on its own must render real
 * words, not keys. Every other locale is a separate import path so it does not have to be
 * downloaded by applications that will never show it.
 *
 * `satisfies YueLocaleMessages` is the parity gate: a missing leaf, a stray key or a
 * non-string value is a compile error.
 */
import type { YueLocaleMessages } from './catalog'

export const enUS = {
  input: {
    clear: 'Clear',
  },
} satisfies YueLocaleMessages

export default enUS
