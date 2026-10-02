/**
 * Single-component entry, published as `@yue-ui/vue/button`.
 *
 * A default export so the documented consumer snippet works verbatim:
 *
 * ```ts
 * import YueButton from '@yue-ui/vue/button'
 * import '@yue-ui/vue/button.css'
 * ```
 *
 * The named export is the same binding, for consistency with the root entry.
 */
import YueButton from './YueButton.vue'

export { YueButton }
export default YueButton

export type {
  YueButtonEmits,
  YueButtonProps,
  YueButtonShape,
  YueButtonSize,
  YueButtonSlots,
  YueButtonTag,
  YueButtonTheme,
  YueButtonVariant,
} from './types'
