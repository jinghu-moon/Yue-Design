import type { ComputedRef, InjectionKey } from 'vue'
import type { YueButtonToggleValue } from './types'

/**
 * What a `YueButtonToggleItem` needs from the `YueButtonToggle` above it.
 *
 * Read-only on purpose. An item never keeps selection state of its own: it asks the
 * group to select a value and then renders whatever the group says, so two items can
 * never both believe they are selected.
 */
export interface YueButtonToggleContext {
  /** The value the group currently has selected, or `null`. */
  readonly selected: ComputedRef<YueButtonToggleValue | null>
  /** True when the group itself is disabled, which disables every item. */
  readonly disabled: ComputedRef<boolean>
  /** Ask the group to select `value`. No-op when it is already selected. */
  select: (value: YueButtonToggleValue) => void
}

/**
 * Injection key for the toggle group.
 *
 * `Symbol.for`, for the same reason `yueConfigKey` uses it: `@yue-ui/vue` is published as
 * several entry points, and a consumer whose bundler ends up with a component and its item
 * from two different chunks — or with two copies of the library — must still have them
 * agree on the key. `Symbol('…')` would create a different symbol per copy, and
 * `inject(key, null)` reports "wrong key" exactly like "nothing provided": every item
 * would render as unselected inside a group that does have a selection.
 */
export const yueButtonToggleKey: InjectionKey<YueButtonToggleContext> = Symbol.for(
  'yue:button-toggle',
)
