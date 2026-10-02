import type { InjectionKey } from 'vue'
import type { YueConfig } from './types.js'

/**
 * Injection key for the Yue configuration.
 *
 * A `Symbol`, not a string: two libraries can never collide on a plain
 * `'config'` key, and typing it as `InjectionKey<YueConfig>` makes `inject()`
 * return `YueConfig` instead of `unknown`. This is the only key the hooks layer
 * defines — components never inject by string.
 */
export const yueConfigKey: InjectionKey<YueConfig> = Symbol('yue:config')
