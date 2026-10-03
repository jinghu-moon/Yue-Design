/**
 * The reference adapter: `vue-i18n` as Yue's locale source.
 *
 * This file is documentation as much as it is code — it is shown verbatim on the I18N guide page —
 * and it exists to prove the adapter contract is *sufficient*: an application that already has a
 * translation system does not have to adopt Yue's packs, and Yue does not have to depend on that
 * system.
 *
 * Three properties make it an adapter rather than a wrapper:
 *
 *   1. `current` **is** `vue-i18n`'s own `locale` ref, not a copy. Two refs would drift the first
 *      time the application switched language through its own UI.
 *   2. `t` forwards the Yue key unchanged. Yue's catalog is namespaced (`input.clear`), so the
 *      application's message files are the same shape whether a string is consumed by Yue or by
 *      the application's own template.
 *   3. `n` and `d` are omitted, so Yue keeps its own `Intl` formatting. Supplying them is how an
 *      application with its own number/date policy takes those over as well — both are valid, and
 *      the adapter decides which.
 */
import type { Composer } from 'vue-i18n'
import type { YueLocaleAdapter, YueMessageParams } from '@yue-ui/vue/locale'

/**
 * Wrap a `vue-i18n` composer as a Yue locale adapter.
 *
 * @param composer a `legacy: false` composer — `useI18n()`'s return value, or `i18n.global`
 */
export function vueI18nAdapter(composer: Composer): YueLocaleAdapter {
  return {
    // Read-only from Yue's side: `vue-i18n` owns the language, and Yue switching it directly is
    // what the application expects when it changes locale through its own controls.
    current: composer.locale as unknown as YueLocaleAdapter['current'],
    t: (key: string, params?: YueMessageParams) =>
      params === undefined
        ? composer.t(key)
        : // `vue-i18n` names its interpolation parameters; passing the table through means a Yue
          // message and an application message interpolate identically.
          composer.t(key, params as Record<string, unknown>),
  }
}
