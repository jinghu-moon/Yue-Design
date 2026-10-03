/**
 * The locale instance: creation, subtree inheritance, translation and formatting.
 *
 * One rule explains most of this file: **a scope inherits, it does not reset.** A subtree
 * that translates one string must keep the application's language, language packs and
 * every other key. That is the same contract `provideYueConfig()` already has for `size`,
 * and it is why `provideLocale({ messages })` merges onto what the subtree already sees
 * instead of onto the built-in defaults.
 */
import { computed, getCurrentInstance, inject, provide, ref, shallowRef } from 'vue'
import type { App, Ref } from 'vue'
import {
  DEFAULT_LOCALE,
  isValidLocale,
  localeCandidates,
  localeDirection,
  normalizeLocale,
} from './normalize.js'
import {
  hasPluralForm,
  interpolate,
  isPluralMessage,
  lookupMessage,
  mergeMessages,
  resolveMessages,
  selectPluralForm,
} from './messages.js'
import { diagnose } from './diagnostics.js'
import { formatDate, formatNumber } from './format.js'
import { yueLocaleKey } from './injection.js'
import type {
  DeepPartial,
  YueLocaleInstance,
  YueLocaleOptions,
  YueMessageParams,
  YueMessageTree,
} from './types.js'

/**
 * The effective options of every instance, kept out of the public shape.
 *
 * The documented instance has exactly the fields the roadmap froze; "what this scope was
 * configured with" is an implementation detail that children need in order to inherit. A
 * `WeakMap` keeps it that way and cannot leak.
 */
const scopeOptions = new WeakMap<object, YueLocaleOptions<YueMessageTree>>()

/**
 * What inheriting actually needs from a parent scope.
 *
 * Structural, not `YueLocaleInstance<TTree, TKey>`: the `t` method is contravariant in its key
 * union, so an instance narrowed to a catalog is *not* assignable to one parameterised by
 * `string` — and inheriting a scope has nothing to do with translating.
 */
interface LocaleScope {
  readonly current: Ref<string>
  readonly fallback: Ref<string>
}

/** Fold a child's options onto its parent's, without resetting anything the parent set. */
function resolveOptions<TTree extends YueMessageTree>(
  parent: LocaleScope | undefined,
  options: YueLocaleOptions<TTree>,
): YueLocaleOptions<TTree> {
  const inherited = (parent ? scopeOptions.get(parent) : undefined) ?? {}

  const messages =
    inherited.messages || options.messages
      ? mergeMessages(
          (inherited.messages ?? {}) as YueMessageTree,
          options.messages as DeepPartial<YueMessageTree> | undefined,
        )
      : undefined

  return {
    locale: options.locale ?? parent?.current.value ?? inherited.locale ?? DEFAULT_LOCALE,
    fallback: options.fallback ?? parent?.fallback.value ?? inherited.fallback ?? DEFAULT_LOCALE,
    packs: { ...(inherited.packs ?? {}), ...(options.packs ?? {}) } as Record<
      string,
      DeepPartial<TTree>
    >,
    messages: messages as DeepPartial<TTree> | undefined,
    adapter: options.adapter ?? inherited.adapter,
    direction: options.direction ?? inherited.direction,
  }
}

/** Build an instance from already-inherited options. */
function buildInstance<TTree extends YueMessageTree, TKey extends string>(
  options: YueLocaleOptions<TTree>,
): YueLocaleInstance<TTree, TKey> {
  const adapter = options.adapter

  if (options.locale !== undefined && !isValidLocale(options.locale)) {
    diagnose({
      reason: 'invalid-locale',
      locale: String(options.locale),
      message:
        `"${String(options.locale)}" is not a valid BCP 47 tag, so it was used verbatim. ` +
        'Use the dashed form (`en-US`, `zh-CN`): underscores and unknown subtags cannot be ' +
        'reproduced in `Intl`, so formatting and fallback both suffer.',
    })
  }

  // An adapter owns the active locale: `vue-i18n`'s `locale` ref is already exactly this,
  // and copying it into a second ref is how one of the two ends up stale.
  const current = adapter ? adapter.current : ref(normalizeLocale(options.locale))
  const fallback = adapter?.fallback ?? ref(normalizeLocale(options.fallback ?? DEFAULT_LOCALE))
  // Packs are static per scope on purpose: a language pack is a module import, not state.
  // `shallowRef` leaves the door open without making every lookup traverse a reactive tree.
  const packs = shallowRef<Record<string, DeepPartial<TTree>>>(options.packs ?? {})

  const messages = computed<TTree>(() =>
    resolveMessages(
      packs.value,
      localeCandidates(current.value, fallback.value),
      options.messages,
    ),
  )

  const direction = computed(() => options.direction ?? localeDirection(current.value))

  const t = (key: TKey, params?: YueMessageParams): string => {
    if (adapter) return adapter.t(key, params)

    const locale = current.value
    const leaf = lookupMessage(messages.value, key)
    if (leaf === undefined) {
      diagnose({
        reason: 'missing-key',
        key,
        locale,
        message:
          `missing message key "${key}" for locale "${locale}" (tried ` +
          `${localeCandidates(current.value, fallback.value).join(' → ')}). The key is ` +
          'returned unchanged so the gap is visible rather than rendered as an empty string.',
      })
      return key
    }

    let template: string | undefined
    if (typeof leaf === 'string') {
      template = leaf
    } else if (isPluralMessage(leaf)) {
      const count = params?.count
      if (typeof count !== 'number' || !Number.isFinite(count)) {
        diagnose({
          reason: 'missing-param',
          key,
          locale,
          param: 'count',
          message:
            `"${key}" is a plural message but no numeric \`count\` was passed, so its ` +
            '`other` form was used. Plural grammar belongs to the locale, not to the caller.',
        })
        template = leaf.other
      } else {
        if (!hasPluralForm(leaf, count, locale)) {
          diagnose({
            reason: 'missing-plural-form',
            key,
            locale,
            message:
              `"${key}" has no "${new Intl.PluralRules(locale).select(count)}" form for ` +
              `locale "${locale}" (count ${count}); the \`other\` form was used.`,
          })
        }
        template = selectPluralForm(leaf, count, locale)
      }
    }

    if (template === undefined || template.trim() === '') {
      diagnose({
        reason: 'empty-value',
        key,
        locale,
        message:
          `message "${key}" for locale "${locale}" is empty. An empty translation is not a ` +
          'translation: the key is returned instead.',
      })
      return key
    }

    const { value, missing } = interpolate(template, params)
    for (const param of missing) {
      diagnose({
        reason: 'missing-param',
        key,
        locale,
        param,
        message: `message "${key}" interpolates {${param}}, which was not passed.`,
      })
    }
    return value
  }

  const n = (value: number, formatOptions?: Intl.NumberFormatOptions): string =>
    adapter?.n ? adapter.n(value, formatOptions) : formatNumber(value, current.value, formatOptions)

  const d = (value: Date | number, formatOptions?: Intl.DateTimeFormatOptions): string =>
    adapter?.d ? adapter.d(value, formatOptions) : formatDate(value, current.value, formatOptions)

  const instance: YueLocaleInstance<TTree, TKey> = {
    current,
    fallback,
    messages,
    direction,
    t,
    n,
    d,
    provide: (childOptions) => buildInstance<TTree, TKey>(resolveOptions(instance, childOptions)),
  }

  scopeOptions.set(instance, options as YueLocaleOptions<YueMessageTree>)
  return instance
}

/**
 * Create a locale instance that starts from the built-in defaults.
 *
 * Use this when the instance is *not* scoped to a component tree — a server render, a
 * module-level helper, the application install path.
 */
export function createLocale<
  TTree extends YueMessageTree = YueMessageTree,
  TKey extends string = string,
>(options: YueLocaleOptions<TTree> = {}): YueLocaleInstance<TTree, TKey> {
  return buildInstance<TTree, TKey>(resolveOptions(undefined, options))
}

/** A shared instance for callers that are outside any provider. */
let fallbackInstance: YueLocaleInstance | undefined

/**
 * Read the locale instance the current component sees.
 *
 * Outside any provider this returns `fallback` when one was supplied (that is how
 * `@yue-ui/vue` guarantees the built-in language pack is available to a component used on
 * its own), otherwise a shared instance with no packs at all — every key is then reported
 * as missing rather than silently rendered empty.
 */
export function useLocale<
  TTree extends YueMessageTree = YueMessageTree,
  TKey extends string = string,
>(fallback?: YueLocaleInstance<TTree, TKey>): YueLocaleInstance<TTree, TKey> {
  const injected = getCurrentInstance() ? inject(yueLocaleKey, null) : null
  // The key's stored value is widened (see `InjectedYueLocale`): the catalog type is the
  // consumer's, the identity is the symbol, and only the caller knows which catalog it asked
  // for. This is the one place that knowledge is re-attached.
  if (injected) return injected as YueLocaleInstance<TTree, TKey>
  if (fallback) return fallback
  fallbackInstance ??= createLocale()
  return fallbackInstance as unknown as YueLocaleInstance<TTree, TKey>
}

/**
 * Provide a locale to a component subtree.
 *
 * The base is the instance the subtree *already* sees, so this is an override rather than a
 * reset — `provideLocale({ messages: { input: { clear: 'Effacer' } } })` keeps the
 * application's locale, packs and every other key.
 *
 * Called outside a component there is no parent to inherit from and nothing to provide; the
 * returned instance is still resolved, which keeps this usable from a plain helper.
 */
export function provideLocale<
  TTree extends YueMessageTree = YueMessageTree,
  TKey extends string = string,
>(options: YueLocaleOptions<TTree> = {}): YueLocaleInstance<TTree, TKey> {
  const instance = getCurrentInstance()
  const parent = instance ? (inject(yueLocaleKey, null) as LocaleScope | null) : null
  const child = buildInstance<TTree, TKey>(resolveOptions(parent ?? undefined, options))
  // `provide()` also warns outside `setup()`, which is why it is guarded.
  if (instance) provide(yueLocaleKey, child)
  return child
}

/**
 * Install a locale for an entire application.
 *
 * The base is the defaults, not the current instance: an application is the outermost
 * scope, there is nothing above it to inherit from, and this runs during `app.use()` where
 * no component instance exists to inject from.
 */
export function installYueLocale<
  TTree extends YueMessageTree = YueMessageTree,
  TKey extends string = string,
>(app: App, options: YueLocaleOptions<TTree> = {}): YueLocaleInstance<TTree, TKey> {
  const instance = buildInstance<TTree, TKey>(resolveOptions(undefined, options))
  app.provide(yueLocaleKey, instance)
  return instance
}
