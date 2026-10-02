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

export type {
  YueButtonEmits,
  YueButtonProps,
  YueButtonShape,
  YueButtonSize,
  YueButtonSlots,
  YueButtonTag,
  YueButtonTheme,
  YueButtonVariant,
} from './components/button/types'
