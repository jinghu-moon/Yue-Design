/**
 * Single-component entry, published as `@yue-ui/vue/tag`.
 *
 * Exports the tag family: the standard display tag and the selectable check tag.
 * Both share one stylesheet (`@yue-ui/vue/tag.css`).
 *
 * ```ts
 * import YueTag from '@yue-ui/vue/tag'
 * import '@yue-ui/vue/tag.css'
 * ```
 */
import YueTag from './YueTag.vue'
import YueCheckTag from './YueCheckTag.vue'

export { YueTag, YueCheckTag }
export default YueTag

export type {
  YueCheckTagEmits,
  YueCheckTagProps,
  YueCheckTagSlots,
  YueTagEmits,
  YueTagProps,
  YueTagShape,
  YueTagSize,
  YueTagSlots,
  YueTagTheme,
  YueTagVariant,
} from './types'
