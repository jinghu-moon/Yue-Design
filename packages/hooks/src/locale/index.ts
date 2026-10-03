/**
 * `@yue-ui/hooks` locale module — the mechanism, without any concrete message.
 *
 * The catalog of Yue's own strings is a component concern and lives in `@yue-ui/vue`
 * (`packages/vue/src/locale/`). Nothing here knows a single key, which is what keeps the
 * dependency direction (`tokens → hooks → vue`) intact and lets an application consume the
 * runtime without the components.
 */
export { DEFAULT_LOCALE, isValidLocale, languageOf, localeCandidates, localeDirection, normalizeLocale } from './normalize.js'
export {
  hasPluralForm,
  interpolate,
  isMessageLeaf,
  isPlainObject,
  isPluralMessage,
  lookupMessage,
  mergeMessages,
  resolveMessages,
  selectPluralForm,
} from './messages.js'
export {
  consumeLocaleDiagnostics,
  peekLocaleDiagnostics,
  resetLocaleDiagnostics,
} from './diagnostics.js'
export { yueLocaleKey } from './injection.js'
export { createLocale, installYueLocale, provideLocale, useLocale } from './useLocale.js'
export type {
  DeepPartial,
  LeafMessageKeys,
  YueLocaleAdapter,
  YueLocaleDiagnostic,
  YueLocaleDiagnosticReason,
  YueLocaleDirection,
  YueLocaleInstance,
  YueLocaleOptions,
  YueMessageLeaf,
  YueMessageParams,
  YueMessageTree,
  YuePluralMessage,
} from './types.js'
