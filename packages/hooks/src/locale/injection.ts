import type { InjectionKey } from 'vue'
import type { YueLocaleInstance } from './types.js'

/**
 * The value stored behind the key.
 *
 * Deliberately widened to `any`: the *catalog type* belongs to whoever installs the
 * instance, while injection identity is the symbol. A precise
 * `InjectionKey<YueLocaleInstance<YueMessageTree, string>>` cannot be both provided by a
 * consumer's narrowed instance and read by another, because `t`'s key parameter is
 * contravariant — every call site would need a double cast, and the type would be lying
 * about a relationship the runtime does not have.
 *
 * Consumers never see this type: they see `YueLocale` (`@yue-ui/vue/locale`), which *is*
 * narrowed to Yue's catalog.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InjectedYueLocale = YueLocaleInstance<any, any>

/**
 * Injection key for the Yue locale instance.
 *
 * `Symbol.for`, for the same reason `yueConfigKey` uses it: `@yue-ui/vue` compiles this
 * package into its own bundle, so the key exists in two published artefacts at once.
 * `Symbol('yue:locale')` would create a *different* symbol in each, and `inject()` matches
 * by identity — so a consumer calling `provideLocale()` through `@yue-ui/hooks` would
 * provide under one symbol while the components looked for another. The failure mode is the
 * worst kind: no error, no warning, just `en-US` forever, because `inject(key, fallback)`
 * treats "wrong key" exactly like "nothing provided".
 *
 * `verify:dist` asserts that both packages register this exact registry entry.
 */
export const yueLocaleKey: InjectionKey<InjectedYueLocale> = Symbol.for('yue:locale')
