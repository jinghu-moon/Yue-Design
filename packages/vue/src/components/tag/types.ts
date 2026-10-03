import type { Component } from 'vue'
import type { ComponentSize } from '../../shared/size'

/**
 * Semantic colour role — what the tag *means*.
 *
 * Deliberately the same union as `YueButtonTheme` so the two components cannot
 * drift; the names are not copied, they are shared through `ComponentSize` and
 * the same design-token namespace.
 */
export type YueTagTheme = 'default' | 'primary' | 'success' | 'warning' | 'danger'

/**
 * Visual weight — how the theme is painted.
 *
 * `filled`       — solid fill, high visual weight; for status tags that must stand out.
 * `tint`         — light background derived from the theme; quieter, common default.
 * `outline`      — border only, no fill; the lightest weight.
 * `tint-outline` — light background plus matching border; between tint and outline.
 */
export type YueTagVariant = 'filled' | 'tint' | 'outline' | 'tint-outline'

/**
 * Corner treatment.
 *
 * `square` — rounded-rectangle (uses `--tag-border-radius`).
 * `round`  — full pill (radius = 999px).
 */
export type YueTagShape = 'square' | 'round'

/**
 * An alias of the shared `ComponentSize` so tag consumers can import a focused
 * type without reaching into the shared module directly.
 */
export type YueTagSize = ComponentSize

/**
 * What element or component the tag renders as.
 *
 * Mirrors `YueButtonTag` so the pattern is familiar. A component kept in
 * reactive state must be `markRaw`'d by the caller.
 */
export type YueTagTag = string | Component

/** Public props of `YueTag`. */
export interface YueTagProps {
  /** Semantic colour role. Default: `'default'`. */
  theme?: YueTagTheme
  /**
   * Visual weight. Default: `'filled'`.
   *
   * When `color` is supplied this prop is still applied: `color` overrides the
   * palette but `variant` still governs whether a border and/or background
   * are drawn.
   */
  variant?: YueTagVariant
  /** Control size; falls back to the application-level `size` from `YueConfig`. */
  size?: YueTagSize
  /** Corner treatment. Default: `'square'`. */
  shape?: YueTagShape
  /**
   * Override the theme's palette with an arbitrary CSS colour value.
   *
   * Background, border, and text are derived from this value. The luminance of
   * the supplied colour governs whether black or white text is used on a
   * `filled` tag.
   */
  color?: string
  /** Renders a close button and emits `close` when clicked. Default: `false`. */
  closable?: boolean
  /**
   * Disables all interaction.
   *
   * Sets `aria-disabled="true"` on the root element and prevents `click` and
   * `close` from firing. Applies a reduced-opacity style on all themes.
   */
  disabled?: boolean
  /**
   * Maximum inline size before the label is truncated with an ellipsis.
   *
   * A bare number is treated as pixels. The root element gains a `title`
   * attribute equal to the text content so a browser tooltip exposes the full
   * string. Default: `undefined` (no truncation).
   */
  maxWidth?: string | number
  /**
   * Element or component to render. Default: `'span'`.
   *
   * Follows the same contract as `YueButtonTag`. Any tag that is not a native
   * `<span>` or `<div>` is treated as if it were an anchor for the purposes of
   * `aria-disabled` (i.e. the attribute rather than the native attribute).
   */
  tag?: YueTagTag
}

/** Public events of `YueTag`. */
export interface YueTagEmits {
  /** Fires when the tag is clicked and is neither disabled nor loading. */
  (event: 'click', payload: MouseEvent): void
  /**
   * Fires when the close button is clicked and the tag is not disabled.
   *
   * The component does **not** hide itself; the consumer is responsible for
   * removing the tag from the list.
   */
  (event: 'close', payload: MouseEvent): void
}

/** Public slots of `YueTag`. */
export interface YueTagSlots {
  /** The tag label. */
  default?: () => unknown
  /** Leading icon — normally a 12–14 px icon component. */
  icon?: () => unknown
  /** Replaces the built-in × SVG close icon. */
  'close-icon'?: () => unknown
}

// ─── YueCheckTag ───────────────────────────────────────────────────────────

/**
 * A value a check-tag can carry.
 *
 * Intentionally the same constraint as `YueButtonToggleValue`: the group
 * compares by identity, so object values rebuilt on every render are a bug.
 */
export type YueCheckTagValue = string | number

/** Public props of `YueCheckTag`. */
export interface YueCheckTagProps {
  /**
   * Controlled checked state.
   *
   * `undefined` means uncontrolled (the component owns its own state).
   * Setting it turns the component fully controlled; the consumer must update
   * it in response to `update:modelValue`.
   */
  modelValue?: boolean
  /** Uncontrolled initial value. Ignored when `modelValue` is set. */
  defaultChecked?: boolean
  /**
   * The value this tag represents.
   *
   * Passed through in the `change` event payload. Required when used inside a
   * future `YueCheckTagGroup`; optional for a standalone tag.
   */
  value?: YueCheckTagValue
  /** Control size; falls back to the application-level `size` from `YueConfig`. */
  size?: YueTagSize
  /** Disables toggling. Default: `false`. */
  disabled?: boolean
}

/** Public events of `YueCheckTag`. */
export interface YueCheckTagEmits {
  (event: 'update:modelValue', payload: boolean): void
  (
    event: 'change',
    payload: { checked: boolean; value: YueCheckTagValue | undefined; e: MouseEvent | KeyboardEvent },
  ): void
  (event: 'click', payload: MouseEvent): void
}

/** Public slots of `YueCheckTag`. */
export interface YueCheckTagSlots {
  default?: () => unknown
}
