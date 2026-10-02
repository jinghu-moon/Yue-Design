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
export type { ComponentSize, Namespace, YueConfig } from './config/types.js'

export { yueConfigKey } from './config/injection.js'

export { installYueConfig, provideYueConfig, useConfig } from './config/useConfig.js'

export { useNamespace } from './namespace/useNamespace.js'
