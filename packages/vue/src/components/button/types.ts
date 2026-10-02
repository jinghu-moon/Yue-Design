import type { Component } from 'vue'

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
 * Declared here rather than re-exported from `@yue-ui/hooks` so the shipped
 * declarations stand alone: `@yue-ui/vue` bundles the hooks layer at build time
 * and has no runtime dependency beyond `vue`, and a `.d.ts` that imported a
 * package the consumer never installed would undo that.
 *
 * The union is therefore duplicated, and `YueButton.test.ts` carries a
 * compile-time assertion that it still matches the hooks layer's `ComponentSize`.
 * A drift becomes a test failure rather than a silent divergence.
 */
export type YueButtonSize = 'sm' | 'md' | 'lg'

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

/** Public props of `YueButton`. */
export interface YueButtonProps {
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
  /** Blocks activation, shows a spinner and sets `aria-busy="true"`. */
  loading?: boolean
  /** Fills the inline size of the container. */
  block?: boolean
  /** Native `type`. Only applied when `tag` renders a `<button>`. */
  nativeType?: 'button' | 'submit' | 'reset'
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
  /** Content before the label — normally an icon. Replaced by the spinner while loading. */
  leading?: () => unknown
  /** Content after the label — normally an icon. */
  trailing?: () => unknown
}
