/**
 * `@yue-ui/vue/locale` — the locale entry every consumer imports.
 *
 * ```ts
 * import ZhCN from '@yue-ui/vue/locale/zh-CN'
 * import YueUI from '@yue-ui/vue/plugin'
 *
 * createApp(App).use(YueUI, { locale: 'zh-CN', packs: { 'zh-CN': ZhCN } }).mount('#app')
 * ```
 *
 * Nothing here is a translation engine. `t`, `n` and `d` come from `@yue-ui/hooks`, which
 * has no idea this catalog exists; this module only binds the two together and supplies the
 * default `en-US` pack.
 */
export {
  bareYueLocale,
  createYueLocale,
  installYueLocale,
  provideLocale,
  useLocale,
} from './runtime'
export type { YueLocale } from './runtime'

export { default as YueLocaleProvider } from './YueLocaleProvider.vue'

export { YUE_MESSAGE_META } from './catalog'
export type { YueLocaleMessages, YueMessageKey, YueMessageMeta } from './catalog'
export { enUS } from './en-US'

export { consumeLocaleDiagnostics, yueLocaleKey } from '@yue-ui/hooks'
export type {
  DeepPartial,
  YueLocaleAdapter,
  YueLocaleDiagnostic,
  YueLocaleDirection,
  YueLocaleInstance,
  YueLocaleOptions,
  YueMessageParams,
} from '@yue-ui/hooks'
