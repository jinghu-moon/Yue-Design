import type { Component } from 'vue'
import type { ComponentSize } from '../../shared/size'

/**
 * What the button is *for* — the semantic role that supplies its colours.
 *
 * `default` is neutral, `primary` is the brand accent, and `success` / `warning` /
 * `danger` are the three status roles, ordered by severity. The role and the variant
 * are independent axes: every theme can be painted by every variant, and the
 * token audit gates the contrast of every resulting combination.
 */
export type YueButtonTheme = 'default' | 'primary' | 'success' | 'warning' | 'danger'

/**
 * How the theme is painted.
 *
 * The five variants answer two different questions, which is what keeps them from
 * being interchangeable:
 *
 * - **how much chrome** — `solid` fills, `outline` and `dashed` draw a border,
 *   `text` draws none;
 * - **how much box** — everything except `link` keeps the full control box (fixed
 *   height and inline inset), so its hit area matches every other button. `link`
 *   drops the box on purpose, because it is meant to sit inline in a sentence.
 *
 * `text` is the quiet button: full hit area, no fill, no border, hover shows the
 * shared subtle overlay. `link` is not a quieter `text` — it is an inline action,
 * and the two exist separately so neither has to compromise.
 */
export type YueButtonVariant = 'solid' | 'outline' | 'dashed' | 'text' | 'link'

/**
 * The three supported control sizes.
 *
 * An alias of the package's single `ComponentSize`, not a restated union: `YueButtonSize`
 * is the name this component's consumers use, and it must not be a second definition
 * that can drift from `YueInputSize`. See `packages/vue/src/shared/size.ts`.
 */
export type YueButtonSize = ComponentSize

/**
 * Corner treatment.
 *
 * `circle` is icon-only. It carries no visible label, so it is only meaningful
 * with an accessible name — see `YueButton.vue`, which warns in development when
 * one is missing.
 */
export type YueButtonShape = 'square' | 'round' | 'circle'

/**
 * What the button renders as.
 *
 * `button` and `a` get their native semantics: a `<button>` is natively
 * `disabled`, while an `<a>` cannot be and therefore gets `aria-disabled`. Any
 * other string or Vue component is rendered as-is through `<component :is>`, in
 * which case it is treated like the `<a>` case.
 *
 * A component kept in reactive state must be `markRaw`'d by the caller, or Vue
 * will wrap the definition in a reactive proxy and warn about the overhead.
 */
export type YueButtonTag = string | Component

/**
 * The props that describe the *button substance*: the orthogonal axes of role,
 * painting, size, corner, interaction state and box.
 *
 * Split out from `YueButtonProps` because these are exactly the props a toggle item
 * also accepts — a segmented control is a row of buttons that differ in one thing
 * only (which value each one *is*), and restating the eight axes in a second
 * interface is how two spellings of the same contract start to drift.
 */
export interface YueButtonSharedProps {
  /** Semantic colour role. Default: `'default'`. */
  theme?: YueButtonTheme
  /** Painting style. Default: `'solid'`. */
  variant?: YueButtonVariant
  /** Falls back to `YueConfig.size` (default `'md'`) when omitted. */
  size?: YueButtonSize
  /** Corner treatment. Default: `'square'`. */
  shape?: YueButtonShape
  /** Sets the native `disabled` attribute, or `aria-disabled` off a `<button>`. */
  disabled?: boolean
  /** Blocks activation, shows the loader and sets `aria-busy="true"`. */
  loading?: boolean
  /** Fills the inline size of the container. */
  block?: boolean
  /** Native `type`. Only applied when `tag` renders a `<button>`. */
  nativeType?: 'button' | 'submit' | 'reset'
}

/** Public props of `YueButton`. */
export interface YueButtonProps extends YueButtonSharedProps {
  /**
   * Selected state of a toggle button.
   *
   * Undefined means "this is not a toggle button", and is the default: a plain button
   * has no pressed state to announce, so it renders no `aria-pressed` at all. Setting
   * it — either value — turns the button into a toggle button and emits
   * `aria-pressed="true|false"`, which is what a screen reader needs to hear "pressed".
   *
   * This is the *standalone* toggle. A set of mutually exclusive buttons that has to
   * agree on one value is `YueButtonToggle`, not a hand-wired `active` on each button.
   */
  active?: boolean
  /** Element or component to render. Default: `'button'`. */
  tag?: YueButtonTag
}

/** Public events of `YueButton`. */
export interface YueButtonEmits {
  /** Fires only when the button is neither `disabled` nor `loading`. */
  (event: 'click', payload: MouseEvent): void
}

/** Public slots of `YueButton`. */
export interface YueButtonSlots {
  /** The label. Omit it only when an accessible name is supplied another way. */
  default?: () => unknown
  /** Content before the label — normally an icon. */
  leading?: () => unknown
  /** Content after the label — normally an icon. */
  trailing?: () => unknown
  /**
   * Replaces the default spinner while `loading` is true.
   *
   * The slot renders inside the absolutely positioned loader layer, so a custom
   * loading indicator never changes the button's width — the label and icons keep
   * their place and are only made invisible. No icon library is implied.
   */
  loader?: () => unknown
}

/**
 * Public props of `YueButtonGroup`.
 *
 * One prop, on purpose. The group is structure: it joins corners and names the set. The
 * colour, painting and size of the buttons inside it stay their own props, and "this
 * whole region is denser" is expressed the way the design system already expresses it —
 * by re-pointing the `--button-*` Component Tokens on a container.
 */
export interface YueButtonGroupProps {
  /** Stacks the buttons instead of laying them out in a row. Default: `false`. */
  vertical?: boolean
}

/** Public slots of `YueButtonGroup`. */
export interface YueButtonGroupSlots {
  /** The buttons. Only `YueButton` and `YueButtonToggleItem` are laid out as group items. */
  default?: () => unknown
}

/**
 * A value a toggle item can carry.
 *
 * Deliberately not `unknown`: the group compares values by identity, so a value type
 * that cannot be compared cheaply (an object rebuilt every render) is a bug the type
 * should refuse rather than a feature.
 */
export type YueButtonToggleValue = string | number

/** Public props of `YueButtonToggle`. */
export interface YueButtonToggleProps {
  /** The selected value, or `null` for "nothing selected yet". */
  modelValue?: YueButtonToggleValue | null
  /** Disables every item in the group. */
  disabled?: boolean
  /** Stacks the items instead of laying them out in a row. Default: `false`. */
  vertical?: boolean
}

/** Public events of `YueButtonToggle`. */
export interface YueButtonToggleEmits {
  /** Fires with the value of the item that was activated. */
  (event: 'update:modelValue', payload: YueButtonToggleValue): void
}

/** Public slots of `YueButtonToggle`. */
export interface YueButtonToggleSlots {
  /** The `YueButtonToggleItem`s. */
  default?: () => unknown
}

/**
 * Public props of `YueButtonToggleItem`.
 *
 * Extends the shared button props rather than re-listing them: an item accepts
 * everything a button accepts — `theme`, `variant`, `size`, `shape`, `loading`,
 * `block`, `disabled`, `nativeType` — and adds the one thing that makes it an item.
 *
 * `active` is omitted because selection is derived from the group, and `tag` is omitted
 * because the item has to render a control the platform can press: it is always a
 * `<button>`.
 */
export interface YueButtonToggleItemProps extends YueButtonSharedProps {
  /** The value this item selects. Required. */
  value: YueButtonToggleValue
}

/**
 * Public slots of `YueButtonToggleItem` — the same set a `YueButton` exposes, because
 * the item *is* a button with a value.
 */
export type YueButtonToggleItemSlots = YueButtonSlots
