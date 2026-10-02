/**
 * Full-registration entry, published as `@yue-ui/vue/plugin`.
 *
 * This is the only entry that touches the app, and importing it is how a consumer
 * opts in. Keeping it separate is what makes the root entry tree-shakeable: a
 * consumer who imports one component by name never pulls this file in.
 *
 * ```ts
 * import { createApp } from 'vue'
 * import YueUI from '@yue-ui/vue/plugin'
 * import '@yue-ui/design-tokens/index.css'
 * import '@yue-ui/vue/style.css'
 *
 * createApp(App).use(YueUI, { size: 'sm' }).mount('#app')
 * ```
 *
 * Configuration is optional and applied through `installYueConfig`, so
 * `provideYueConfig()` in a subtree can still narrow it further.
 */
import type { App, Plugin } from 'vue'
import { installYueConfig } from '@yue-ui/hooks'
import YueButton from './components/button/YueButton.vue'
import type { YueButtonSize } from './components/button/types'

/**
 * The registry is a plain object written out by hand rather than a directory
 * scan: a scan is invisible to bundlers and would pull every component into the
 * graph even for a consumer who imports one.
 */
const components = { YueButton }

/**
 * Options accepted by `.use(YueUI, options)`.
 *
 * Spelled out here instead of re-exporting `YueConfig` from `@yue-ui/hooks` for
 * the same reason as `YueButtonSize`: the shipped declarations must not send a
 * consumer looking for a package they have not installed.
 *
 * There is deliberately no `prefix`/`namespace` option. The stylesheet that
 * matches the component classes ships prebuilt for the `yue` namespace, so a
 * runtime namespace would produce classes no rule matches — an unstyled button.
 * Customising the namespace is a build-time change to the stylesheet.
 */
export interface YueUIPluginOptions {
  /** Fallback size for components that expose a `size` prop. */
  size?: YueButtonSize
}

const plugin: Plugin<[YueUIPluginOptions?]> = {
  install(app: App, options: YueUIPluginOptions = {}) {
    installYueConfig(app, options)
    for (const [name, component] of Object.entries(components)) {
      app.component(name, component)
    }
  },
}

export default plugin
export { components as YueUIComponents, plugin as YueUI }
