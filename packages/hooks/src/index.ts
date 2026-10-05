/**
 * @yue-ui/hooks — the contracts and composables shared by Yue components.
 *
 * Architecture position: `tokens → hooks → vue → docs`. This package may not
 * depend on `@yue-ui/vue`; components depend on it, never the other way round.
 *
 * Exports are named and explicit rather than `export *`, so the public surface is
 * greppable and stays friendly to bundlers.
 *
 * Relative specifiers carry a `.js` extension: TypeScript maps it back to the
 * `.ts` source when compiling, and the emitted ESM stays valid for a runtime that
 * resolves modules the Node way, not just for a bundler.
 */
export { DEFAULT_YUE_CONFIG, YUE_NAMESPACE } from './config/types.js'
export type { ComponentSize, Namespace, YueConfig, YueConfigInput } from './config/types.js'

export { yueConfigKey } from './config/injection.js'

export { installYueConfig, provideYueConfig, useConfig } from './config/useConfig.js'

export { useNamespace } from './namespace/useNamespace.js'

/**
 * Overlay: the ordering runtime two detached surfaces have to share.
 *
 * Only the stack lives here, because only the stack has more than one consumer today
 * (`YuePopover` and `YueDialog` both need cross-surface topmost arbitration). Modal
 * semantics — focus trap, background inert, scroll lock — stay in the component that owns
 * them; they are not shared runtime, they are a single component's behaviour.
 */
export { isTopOverlay, registerOverlay } from './overlay/stack.js'
export type { OverlayRecord } from './overlay/stack.js'

/**
 * Locale: the mechanism, without a single concrete message.
 *
 * The catalog of strings Yue renders itself lives in `@yue-ui/vue`, because it is a
 * component concern. Keeping the runtime here means a consumer can use the locale contract
 * — `t`, `n`, `d`, subtree inheritance, an adapter — without the components, and it keeps
 * the dependency direction intact.
 */
export {
  DEFAULT_LOCALE,
  createLocale,
  consumeLocaleDiagnostics,
  hasPluralForm,
  installYueLocale,
  interpolate,
  isMessageLeaf,
  isPlainObject,
  isPluralMessage,
  isValidLocale,
  languageOf,
  localeCandidates,
  localeDirection,
  lookupMessage,
  mergeMessages,
  normalizeLocale,
  peekLocaleDiagnostics,
  provideLocale,
  resetLocaleDiagnostics,
  resolveMessages,
  selectPluralForm,
  useLocale,
  yueLocaleKey,
} from './locale/index.js'
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
} from './locale/index.js'
