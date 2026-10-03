/**
 * @yue-ui/vue — the Yue Vue 3 component library.
 *
 * This root entry does one thing: it re-exports every component by name. It does
 * NOT install them. Registering globally is a decision the consumer has to make
 * explicitly, and they make it by importing a different entry:
 *
 * ```ts
 * // named import — nothing is registered, bundlers drop what you do not use
 * import { YueButton } from '@yue-ui/vue'
 * import '@yue-ui/vue/style.css'
 *
 * // global registration — one deliberate import
 * import YueUI from '@yue-ui/vue/plugin'
 * import '@yue-ui/vue/style.css'
 * ```
 *
 * Styles are never imported from JavaScript. The ESM entry therefore stays
 * resolvable in a Node or SSR context, and the cascade contract — token sheet
 * first, component sheet second — stays visible in the consumer's own source.
 */
export { default as YueButton } from './components/button/YueButton.vue'
export { default as YueButtonGroup } from './components/button/YueButtonGroup.vue'
export { default as YueButtonToggle } from './components/button/YueButtonToggle.vue'
export { default as YueButtonToggleItem } from './components/button/YueButtonToggleItem.vue'
export { default as YueInput } from './components/input/YueInput.vue'

export type {
  YueButtonEmits,
  YueButtonGroupProps,
  YueButtonGroupSlots,
  YueButtonProps,
  YueButtonShape,
  YueButtonSharedProps,
  YueButtonSize,
  YueButtonSlots,
  YueButtonTag,
  YueButtonTheme,
  YueButtonToggleEmits,
  YueButtonToggleItemProps,
  YueButtonToggleItemSlots,
  YueButtonToggleProps,
  YueButtonToggleSlots,
  YueButtonToggleValue,
  YueButtonVariant,
} from './components/button/types'

export type {
  YueInputEmits,
  YueInputProps,
  YueInputSize,
  YueInputSlots,
  YueInputType,
} from './components/input/types'

/**
 * The shared control-size contract, re-exported so a consumer can name the type their
 * `size` variable holds without reaching into a component's module — and so
 * `YueButtonSize` and `YueInputSize` are visibly the same type rather than two
 * coincidentally identical unions.
 */
export type { ComponentSize } from './shared/size'

/**
 * Locale, from the root entry as well.
 *
 * `@yue-ui/vue/locale` is the documented import path, but a consumer who already names
 * components from the root should not have to learn a second one to read or set the
 * language. Only the *default* `en-US` pack travels with the root; every other language is
 * an explicit subpath import (`@yue-ui/vue/locale/zh-CN`), which is what keeps an English
 * application from downloading Chinese strings.
 */
export {
  bareYueLocale,
  createYueLocale,
  installYueLocale,
  provideLocale,
  useLocale,
  YUE_MESSAGE_META,
  YueLocaleProvider,
} from './locale/index'
export type {
  DeepPartial,
  YueLocale,
  YueLocaleAdapter,
  YueLocaleDiagnostic,
  YueLocaleDirection,
  YueLocaleInstance,
  YueLocaleMessages,
  YueLocaleOptions,
  YueMessageParams,
  YueMessageKey,
  YueMessageMeta,
} from './locale/index'

/** The default language pack, for consumers who install it explicitly. */
export { enUS } from './locale/en-US'
