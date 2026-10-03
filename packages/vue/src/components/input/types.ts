import type { ComponentSize } from '../../shared/size'

/**
 * The three supported control sizes.
 *
 * An alias of the package's single `ComponentSize`, exactly like `YueButtonSize`, so
 * the two components cannot drift apart. See `packages/vue/src/shared/size.ts`.
 */
export type YueInputSize = ComponentSize

/**
 * The native input types `YueInput` forwards.
 *
 * Deliberately a closed list rather than `string`: the component styles and tests each
 * of these, and `type` is the one native attribute that changes the control's
 * *behaviour* rather than its presentation. Anything outside it (including the
 * date/number/range family, which the roadmap keeps out of `YueInput`) is intended to
 * become its own component, not a passthrough.
 */
export type YueInputType = 'text' | 'search' | 'email' | 'url' | 'tel' | 'password'

export interface YueInputProps {
  /**
   * The field's value. A string, always: the roadmap keeps this component from
   * guessing whether `'42'` means a number, and any conversion belongs to the
   * consumer or a future typed field.
   */
  modelValue?: string
  /** Control size; falls back to the application-level `size` from `YueConfig`. */
  size?: YueInputSize
  /** Forwarded to the native `type`. */
  type?: YueInputType
  /** Native `disabled`: not focusable, not submitted, not read by AT as editable. */
  disabled?: boolean
  /**
   * Native `readonly`: the value stays readable, selectable, focusable and submitted,
   * but cannot be edited. Deliberately *not* the same state as `disabled`, and not
   * styled as one.
   */
  readonly?: boolean
  /**
   * Marks the field as failing validation: sets `aria-invalid="true"` and switches the
   * border to the error role.
   *
   * It does **not** render an error message. Explaining *what* is wrong is `YueField`'s
   * job, and a component that invented its own error text would be a second, competing
   * source of truth for a form's validation state.
   */
  invalid?: boolean
  /** Native placeholder. Never a substitute for a label. */
  placeholder?: string
  /**
   * Shows a clear control while the field is non-empty.
   *
   * The control is a real `<button type="button">` so it is reachable by keyboard and
   * announced by assistive technology, and it is never rendered when the field is
   * disabled or readonly — clearing a field the user cannot edit is not an action.
   *
   * Its accessible name comes from Yue's locale catalog (`input.clear`), not from a prop
   * here. One prop per string would serve one component, have to be repeated at every call
   * site, and turn a translation into a change to the markup. Configure the language once
   * with `app.use(YueUI, { locale: 'zh-CN', packs: { 'zh-CN': ZhCN } })`, or per subtree with
   * `provideLocale()` / `<YueLocaleProvider>`.
   */
  clearable?: boolean
}

/**
 * The event contract.
 *
 * `update:modelValue` carries the string. `change`, `focus` and `blur` are re-emitted
 * unchanged, so a consumer can reach `event.target` and the modifier keys the way they would
 * on a bare `<input>`.
 *
 * `input` is the one that is *not* always verbatim, and the difference is deliberate. A
 * value that arrives through an IME is published when the composition ends, and the event
 * carrying it may be a `compositionend` — which is not an input event at all. Forwarding
 * that would break any handler that switches on `event.type` or reads `InputEvent.data`.
 *
 * So `input` always receives an event whose `type` is `'input'` **with a real `target`**:
 * the browser's own event when it sent one that already carried the final value, and
 * otherwise a synthesised `InputEvent` that is dispatched through the control — never a
 * mid-composition event, whose `data` would describe an earlier value, and never a
 * hand-built event left undispatched, whose `target` would be `null`.
 */
export interface YueInputEmits {
  (name: 'update:modelValue', value: string): void
  /** Always an event of type `'input'`, even when the value came from an IME. */
  (name: 'input', event: Event): void
  (name: 'change', event: Event): void
  (name: 'focus', event: FocusEvent): void
  (name: 'blur', event: FocusEvent): void
  /** Emitted after the clear control empties the field, alongside `update:modelValue`. */
  (name: 'clear'): void
}

/**
 * Content either side of the input.
 *
 * No icon library and no default glyphs: whatever a consumer puts here is rendered
 * as-is and sized by the stylesheet, so the package ships no icon assets.
 */
export interface YueInputSlots {
  /** Rendered before the input, inside the field's border. */
  prefix?: () => unknown
  /**
   * Rendered after the input and after the clear control, inside the field's border —
   * so a unit or an action stays the outermost thing in the row.
   */
  suffix?: () => unknown
}
