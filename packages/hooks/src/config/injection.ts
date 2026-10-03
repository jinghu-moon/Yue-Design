import type { InjectionKey } from 'vue'
import type { YueConfig } from './types.js'

/**
 * Injection key for the Yue configuration.
 *
 * `Symbol.for`, not `Symbol`, and the distinction is load-bearing rather than stylistic.
 *
 * `@yue-ui/vue` compiles this package into its own bundle, so the key exists in two
 * published artefacts at once: once inside `@yue-ui/vue`'s JavaScript, and once inside the
 * separately-installed `@yue-ui/hooks`. `Symbol('yue:config')` would create a *different*
 * symbol in each, and `inject()` matches by identity — so a consumer calling
 * `provideYueConfig()` or `app.use(YueUI, …)` through the hooks package would provide
 * under one symbol while the components looked for another. The failure mode is the worst
 * kind: no error, no warning, just the defaults, because `inject(key, fallback)` treats
 * "wrong key" exactly like "nothing provided".
 *
 * `Symbol.for` reads the global symbol registry, so every copy of this line — in any
 * package, in any bundle, even in two copies of the same package — yields the same symbol.
 * That is the property the key needs, and `useConfig.test.ts` asserts it directly by
 * asking the registry for the key back.
 *
 * Still a symbol rather than a string: a plain `'config'` key could collide with any other
 * library's, and typing it as `InjectionKey<YueConfig>` makes `inject()` return `YueConfig`
 * instead of `unknown`.
 */
export const yueConfigKey: InjectionKey<YueConfig> = Symbol.for('yue:config')
