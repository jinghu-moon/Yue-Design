/**
 * Locale contracts shared by every Yue component.
 *
 * This module is the *mechanism*: how a locale is selected, how a message is looked up,
 * how numbers and dates are formatted. It deliberately knows no concrete key — the catalog
 * of Yue's own strings lives in `@yue-ui/vue` (`packages/vue/src/locale/`), because it is a
 * component concern and `hooks` must never depend on `vue`.
 *
 * Read `docs/04-yue-i18n-rfc.md` for the decisions these types implement.
 */
import type { ComputedRef, Ref } from 'vue'

/* ------------------------------------------------------------------ *
 * Messages
 * ------------------------------------------------------------------ */

/**
 * A plural message: one sentence per `Intl.PluralRules` category.
 *
 * `other` is required because it is the category every locale is guaranteed to have — a
 * plural message without it is a translation that fails silently for the languages that do
 * not use `one`.
 */
export interface YuePluralMessage {
  readonly zero?: string
  readonly one?: string
  readonly two?: string
  readonly few?: string
  readonly many?: string
  readonly other: string
}

/** One message: a sentence, or a plural map. */
export type YueMessageLeaf = string | YuePluralMessage

/**
 * A nested message tree: branches are trees, leaves are messages.
 *
 * Nested rather than flat-dotted on purpose. A tree makes a language pack a plain object a
 * translator can read, makes "merge this one string" a real deep merge, and lets
 * `LeafMessageKeys` derive an exact key union from the catalog instead of from a string
 * convention.
 */
export interface YueMessageTree {
  readonly [key: string]: YueMessageLeaf | YueMessageTree
}

/** Values a message may interpolate. */
export type YueMessageParams = Readonly<Record<string, string | number>>

/**
 * Every leaf key of a concrete catalog, as a dotted union.
 *
 * `string extends keyof TTree` catches a tree that *has* an index signature (the base
 * `YueMessageTree`, or a `Record<string, …>` pack): those genuinely accept any key, and
 * recursing into them would either lie or exhaust the type checker.
 */
export type LeafMessageKeys<TTree> = string extends keyof TTree
  ? string
  : {
      [K in keyof TTree & string]: TTree[K] extends YueMessageLeaf
        ? K
        : TTree[K] extends object
          ? `${K}.${LeafMessageKeys<TTree[K]>}`
          : never
    }[keyof TTree & string]

/**
 * A partial message tree, one level per branch.
 *
 * The point is the leaf: `messages: { input: { clear: 'Effacer' } }` must not require the
 * caller to restate the whole table, and `{ input: 'Effacer' }` must not compile.
 *
 * A plural message is *also* partial, so a pack may translate only the `other` form and keep
 * the categories the base language already had. That is the one place where "a leaf is
 * atomic" would be wrong: dropping a plural category is a silent language regression.
 */
export type DeepPartial<TTree> = {
  readonly [K in keyof TTree]?: TTree[K] extends string
    ? string
    : TTree[K] extends YuePluralMessage
      ? Partial<YuePluralMessage>
      : DeepPartial<TTree[K]>
}

/** Text direction, derived from the locale unless overridden. */
export type YueLocaleDirection = 'ltr' | 'rtl'

/* ------------------------------------------------------------------ *
 * Diagnostics
 * ------------------------------------------------------------------ */

/** Why a translation did not produce a real sentence. */
export type YueLocaleDiagnosticReason =
  /** No pack on the fallback chain has the key. */
  | 'missing-key'
  /** The key exists but the value is an empty/whitespace-only string. */
  | 'empty-value'
  /** A plural message has no form for the selected category and no `other`. */
  | 'missing-plural-form'
  /** `{name}` appeared in the message and `name` was not passed. */
  | 'missing-param'
  /** `normalizeLocale()` could not canonicalise the tag. */
  | 'invalid-locale'

/** One recorded problem, with enough context to reproduce it. */
export interface YueLocaleDiagnostic {
  readonly reason: YueLocaleDiagnosticReason
  readonly key?: string
  readonly locale: string
  readonly param?: string
  readonly message: string
}

/* ------------------------------------------------------------------ *
 * Adapters
 * ------------------------------------------------------------------ */

/**
 * What a third-party translation engine has to supply to become Yue's locale source.
 *
 * The shape is intentionally the same three methods the instance exposes, so an adapter is
 * a *delegation* rather than a translation layer: Yue never wraps a foreign message format.
 * `n` and `d` are optional — an engine that only translates text still gets Yue's `Intl`
 * formatting for numbers and dates.
 *
 * No third-party type may appear here. `@yue-ui/vue`'s public declarations must not send a
 * consumer looking for `vue-i18n`.
 */
export interface YueLocaleAdapter {
  /** Reactive BCP 47 tag of the active locale — `vue-i18n`'s `locale` is exactly this. */
  readonly current: Ref<string>
  /** Reactive fallback tag. Optional: the instance keeps its own when omitted. */
  readonly fallback?: Ref<string>
  /** Translate one Yue message key. */
  readonly t: (key: string, params?: YueMessageParams) => string
  /** Format a number. Omitted → Yue's own `Intl.NumberFormat` implementation. */
  readonly n?: (value: number, options?: Intl.NumberFormatOptions) => string
  /** Format a date. Omitted → Yue's own `Intl.DateTimeFormat` implementation. */
  readonly d?: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string
}

/* ------------------------------------------------------------------ *
 * Options and instance
 * ------------------------------------------------------------------ */

/**
 * What a caller may pass to `createLocale()` / `provideLocale()` / `installYueLocale()`.
 *
 * Every key is optional, and the base is always the *current scope* rather than the
 * built-in defaults: a subtree that translates one string must not lose the application's
 * language. Same rule as `YueConfig`.
 */
export interface YueLocaleOptions<TTree extends YueMessageTree = YueMessageTree> {
  /** BCP 47 tag. Normalised through `Intl.getCanonicalLocales()`. */
  locale?: string
  /** BCP 47 tag used when the active locale has no pack. Default `en-US`. */
  fallback?: string
  /**
   * Language packs by locale tag. A pack is a *partial* override of what came before, so a
   * pack that omits a key falls through the chain instead of blanking it.
   */
  packs?: Record<string, DeepPartial<TTree>>
  /**
   * The one-string case: a partial tree merged on top of whatever the chain resolved.
   *
   * This is what `provideLocale({ messages: { input: { clear: 'Effacer' } } })` uses, and
   * it stays per-scope — it never edits a language pack.
   */
  messages?: DeepPartial<TTree>
  /** Delegate translation (and optionally formatting) to an application engine. */
  adapter?: YueLocaleAdapter
  /** Override the direction derived from the locale. */
  direction?: YueLocaleDirection
}

/**
 * The runtime contract every Yue component reads.
 *
 * `TTree` is the catalog's shape and `TKey` its leaf-key union, so a component written
 * against Yue's catalog cannot call `t()` with a key nobody defined.
 */
export interface YueLocaleInstance<
  TTree extends YueMessageTree = YueMessageTree,
  TKey extends string = string,
> {
  /** Active locale, normalised. Writable: setting it switches languages. */
  readonly current: Ref<string>
  /** Fallback locale, normalised. Writable. */
  readonly fallback: Ref<string>
  /** The fully resolved tree: the pack chain merged with this scope's overrides. */
  readonly messages: ComputedRef<TTree>
  /** Text direction, from the locale (or the explicit override). */
  readonly direction: ComputedRef<YueLocaleDirection>
  /** Translate one key. Never returns an empty string; a missing key returns the key. */
  readonly t: (key: TKey, params?: YueMessageParams) => string
  /** Format a number with `Intl.NumberFormat`. */
  readonly n: (value: number, options?: Intl.NumberFormatOptions) => string
  /** Format a date with `Intl.DateTimeFormat`. */
  readonly d: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string
  /** Derive a child instance for a subtree. */
  readonly provide: (options: YueLocaleOptions<TTree>) => YueLocaleInstance<TTree, TKey>
}
