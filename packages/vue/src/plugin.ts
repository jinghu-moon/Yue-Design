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
 * import ZhCN from '@yue-ui/vue/locale/zh-CN'
 * import '@yue-ui/design-tokens/index.css'
 * import '@yue-ui/vue/style.css'
 *
 * createApp(App)
 *   .use(YueUI, { size: 'sm', locale: 'zh-CN', packs: { 'zh-CN': ZhCN } })
 *   .mount('#app')
 * ```
 *
 * Two independent mechanisms, deliberately: `size` is application configuration
 * (`installYueConfig`), the language is a locale instance (`installYueLocale`). A subtree
 * can narrow either one — `provideYueConfig()` and `provideLocale()` — without touching the
 * other.
 */
import type { App, Plugin } from 'vue'
import { installYueConfig } from '@yue-ui/hooks'
import type { ComponentSize } from './shared/size'
import { installYueLocale } from './locale/runtime'
import type { YueLocaleMessages } from './locale/catalog'
import type { DeepPartial, YueLocaleAdapter, YueLocaleDirection } from '@yue-ui/hooks'
import YueButton from './components/button/YueButton.vue'
import YueButtonGroup from './components/button/YueButtonGroup.vue'
import YueButtonToggle from './components/button/YueButtonToggle.vue'
import YueButtonToggleItem from './components/button/YueButtonToggleItem.vue'
import YueInput from './components/input/YueInput.vue'
import YueTag from './components/tag/YueTag.vue'
import YueCheckTag from './components/tag/YueCheckTag.vue'
import YueLocaleProvider from './locale/YueLocaleProvider.vue'

/**
 * The registry is a plain object written out by hand rather than a directory
 * scan: a scan is invisible to bundlers and would pull every component into the
 * graph even for a consumer who imports one.
 */
const components = {
  YueButton,
  YueButtonGroup,
  YueButtonToggle,
  YueButtonToggleItem,
  YueInput,
  YueTag,
  YueCheckTag,
  YueLocaleProvider,
}

/**
 * Options accepted by `.use(YueUI, options)`.
 *
 * Spelled out here instead of re-exporting `YueConfig` from `@yue-ui/hooks` for
 * the same reason as `ComponentSize` below: the shipped declarations must not send a
 * consumer looking for a package they have not installed.
 *
 * There is deliberately no `prefix`/`namespace` option. The stylesheet that
 * matches the component classes ships prebuilt for the `yue` namespace, so a
 * runtime namespace would produce classes no rule matches — an unstyled button.
 * Customising the namespace is a build-time change to the stylesheet.
 */
export interface YueUIPluginOptions {
  /** Fallback size for components that expose a `size` prop. */
  size?: ComponentSize
  /** Active language, as a BCP 47 tag. Defaults to `en-US`. */
  locale?: string
  /** Fallback language. Defaults to `en-US`. */
  fallbackLocale?: string
  /**
   * Language packs by locale tag.
   *
   * Each pack is a partial override, so an application that translates a handful of keys
   * does not have to restate the whole catalog. `en-US` is always available underneath.
   */
  packs?: Record<string, DeepPartial<YueLocaleMessages>>
  /** A one-string (or one-branch) override for the whole application. */
  messages?: DeepPartial<YueLocaleMessages>
  /** Delegate translation to an application engine instead of Yue's packs. */
  adapter?: YueLocaleAdapter
  /** Override the direction derived from the locale. */
  direction?: YueLocaleDirection
}

const plugin: Plugin<[YueUIPluginOptions?]> = {
  install(app: App, options: YueUIPluginOptions = {}) {
    const { size, locale, fallbackLocale, packs, messages, adapter, direction } = options
    installYueConfig(app, { size })
    installYueLocale(app, { locale, fallback: fallbackLocale, packs, messages, adapter, direction })
    for (const [name, component] of Object.entries(components)) {
      app.component(name, component)
    }
  },
}

export default plugin
export { components as YueUIComponents, plugin as YueUI }
