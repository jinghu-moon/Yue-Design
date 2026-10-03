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
 * The named exports are the Button *family*: the button itself, the group that joins
 * corners, the group that owns a selection, and the item that turns a button into one
 * option of that selection. They ship from one entry because they are one stylesheet and
 * one subject — a consumer importing `button.css` gets the rules for all four.
 *
 * The root entry (`@yue-ui/vue`) re-exports the same four names.
 */
import YueButton from './YueButton.vue'
import YueButtonGroup from './YueButtonGroup.vue'
import YueButtonToggle from './YueButtonToggle.vue'
import YueButtonToggleItem from './YueButtonToggleItem.vue'

export { YueButton, YueButtonGroup, YueButtonToggle, YueButtonToggleItem }
export default YueButton

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
} from './types'
