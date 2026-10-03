/**
 * Single-component entry, published as `@yue-ui/vue/input`.
 *
 * A default export so the documented consumer snippet works verbatim:
 *
 * ```ts
 * import YueInput from '@yue-ui/vue/input'
 * import '@yue-ui/vue/input.css'
 * ```
 *
 * The named export is the same binding, for consistency with the root entry — and so a
 * consumer can import several components' named exports from their own entries without
 * inventing local aliases.
 *
 * Bundlers that resolve this entry pull in `YueInput` and the `useNamespace` /
 * `useConfig` helpers it needs, and nothing else: no plugin registry, no `YueButton`,
 * no shared "all components" module. `pnpm verify:treeshaking` asserts that, because a
 * barrel file re-exporting everything would silently undo it.
 *
 * Styles are a separate specifier (`@yue-ui/vue/input.css`) rather than an import here,
 * so this module stays resolvable in Node and SSR.
 */
import YueInput from './YueInput.vue'

export { YueInput }
export default YueInput

export type {
  YueInputEmits,
  YueInputProps,
  YueInputSize,
  YueInputSlots,
  YueInputType,
} from './types'
