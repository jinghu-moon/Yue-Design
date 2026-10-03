/**
 * Configuration contracts shared by every Yue component.
 *
 * The config object is deliberately tiny. It holds only the one value a component
 * cannot decide for itself: how large it should render by default.
 */

/** The three supported control sizes. */
export type ComponentSize = 'sm' | 'md' | 'lg'

/**
 * The class-name namespace, and the only place it is written down.
 *
 * `YueButton` renders `.yue-button`, `.yue-button--primary`, `.yue-button__icon`.
 * Those names are public API: the documentation tells consumers to override
 * `.yue-button--primary`, the design-system naming decision fixes them, and
 * `verify:dist` asserts them against the built artefacts.
 *
 * The namespace is therefore a **constant, not a configuration option**. A
 * stylesheet selector cannot be assembled from a runtime value, so a configurable
 * prefix would have to be honoured by the CSS to mean anything — and the CSS ships
 * prebuilt, for one namespace. A `prefix` option could only ever produce a button
 * whose classes no rule matches, i.e. an unstyled button. Making the namespace
 * customisable is a *build-time* feature (rewrite the selectors while generating
 * the stylesheet), never a runtime one.
 */
export const YUE_NAMESPACE = 'yue'

/**
 * Application-level configuration.
 *
 * A component always wins over the config: `size` is only consulted when the
 * component's own `size` prop is unset.
 *
 * It holds exactly one thing, and that is the design: anything that is *state* rather than
 * an application-wide default — the active language, a translated string, formatted output —
 * belongs to the locale instance (`provideLocale()` / `useLocale()`), and anything that is
 * per-call belongs to a prop. Text used to live here; it moved to the locale contract in
 * `docs/04-yue-i18n-rfc.md`, because a language is not a component option.
 */
export interface YueConfig {
  /** Fallback size for components that expose a `size` prop. */
  size: ComponentSize
}

/**
 * What a caller is allowed to pass.
 *
 * Distinct from `YueConfig`, which is the *resolved* shape: every key present. A caller may
 * name one option and the library fills in the rest.
 */
export interface YueConfigInput {
  size?: ComponentSize
}

/** Used when no configuration is provided anywhere in the application. */
export const DEFAULT_YUE_CONFIG: YueConfig = Object.freeze({
  size: 'md',
})

/**
 * BEM class-name factory returned by `useNamespace()`.
 *
 * Every accessor is a plain function so callers can compose freely:
 *
 * ```ts
 * const ns = useNamespace('button')
 * ns.b()              // yue-button
 * ns.e('icon')        // yue-button__icon
 * ns.m('primary')     // yue-button--primary
 * ns.em('icon', 'sm') // yue-button__icon--sm
 * ns.is('loading')    // is-loading
 * ```
 *
 * `is-*` is intentionally unnamespaced: it is a state marker shared by every
 * component, and it reads as a state rather than as part of the block name.
 */
export interface Namespace {
  /** The namespace every block is prefixed with, e.g. `yue`. */
  readonly namespace: string
  /** The full block name, e.g. `yue-button`. */
  readonly block: string
  /** Block — `yue-button`. */
  b: () => string
  /** Element — `yue-button__icon`. */
  e: (element: string) => string
  /** Modifier — `yue-button--primary`. */
  m: (modifier: string) => string
  /** Element with modifier — `yue-button__icon--sm`. */
  em: (element: string, modifier: string) => string
  /** State — `is-loading`. */
  is: (state: string) => string
}
