/**
 * Yue's own message catalog: the strings the library renders or announces itself.
 *
 * This file is the single source of truth for the *shape*. Every language pack is checked
 * against it with `satisfies`, so a pack that misses a key or invents one fails the build
 * rather than shipping a hole. `LeafMessageKeys` turns the shape into the exact key union
 * components may pass to `t()`.
 *
 * What belongs here: component chrome. What does not: page copy, field labels, business
 * errors and anything the consumer writes in a slot. A string owned by the consumer is not
 * a translation problem, it is their content.
 */
import type { LeafMessageKeys } from '@yue-ui/hooks'

/**
 * The catalog. Add a branch per component, a leaf per sentence.
 *
 * A type alias rather than an interface, and that is load-bearing: TypeScript gives an
 * object *literal type* an implicit index signature and gives an interface none, so
 * `interface YueLocaleMessages` would not satisfy the generic `YueMessageTree` constraint
 * the runtime is written against.
 */
export type YueLocaleMessages = {
  input: {
    /**
     * Accessible name of `YueInput`'s clear control.
     *
     * The control is icon-only, so this string is its *only* name — a missing translation
     * is not a cosmetic gap, it is an unnamed button.
     */
    clear: string
  }
}

/** Every key a Yue component may pass to `t()`. Derived, never hand-written. */
export type YueMessageKey = LeafMessageKeys<YueLocaleMessages>

/**
 * What a reviewer (and `audit:i18n`) needs to know about a key.
 *
 * Kept next to the catalog rather than in the docs so the two cannot disagree: a key
 * without metadata, or metadata without a key, fails the audit.
 */
export interface YueMessageMeta {
  /** What the string is for, and where it appears. */
  readonly purpose: string
  /** Interpolation parameters the message expects, by name. */
  readonly params: readonly string[]
  /** Whether assistive technology announces it (`aria-label`, live region, …). */
  readonly announced: boolean
  /**
   * Set when the shipped value is deliberately not a real translation yet.
   *
   * `audit:i18n` prints these instead of counting them as complete, which is the difference
   * between "translated" and "looks translated because it falls back to English".
   */
  readonly untranslated?: boolean
}

/** Metadata for every key in the catalog. */
export const YUE_MESSAGE_META: Readonly<Record<YueMessageKey, YueMessageMeta>> = {
  'input.clear': {
    purpose: "Accessible name of YueInput's clear control.",
    params: [],
    announced: true,
  },
}
