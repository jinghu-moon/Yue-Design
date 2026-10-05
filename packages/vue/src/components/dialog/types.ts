/**
 * YueDialog — the frozen public contract (`.spec-workflow/yue-dialog/spec.md`).
 *
 * These types are the single source of truth for the component's surface. Per the design
 * workflow they are written and reviewed *before* the SFC stylesheet or template, so the
 * API is a decision rather than something the implementation drifted into. A change here
 * is a change to the spec: props / emits / slots / expose / role defaults may not move
 * without amending the spec first.
 */

import type { CSSProperties } from 'vue'

/** `danger` promotes the role to `alertdialog` and defaults Esc / scrim close to off (Q26=B). */
export type YueDialogVariant = 'default' | 'danger'
/** `modal` centres a card over a scrim; `fullscreen` is the mobile sheet-style surface (Q2=C). */
export type YueDialogSurface = 'modal' | 'fullscreen'
/** Width preset ramp; a raw `width` prop overrides it, still bounded by the safe margin (Q17=C). */
export type YueDialogSize = 'sm' | 'md' | 'lg' | 'xl'
/** Every channel that can request a close, carried on the `close` / `closed` payloads (Q6, Q7). */
export type YueDialogCloseReason =
  | 'confirm'
  | 'cancel'
  | 'close-btn'
  | 'escape'
  | 'scrim'
  | 'programmatic'
/**
 * Guard invoked before any close is committed. Returning `false`, or a Promise that
 * resolves `false` or rejects, aborts the close; the controlled `modelValue` is never
 * touched until the guard settles truthy (Q7=B).
 */
export type YueDialogBeforeClose = (reason: YueDialogCloseReason) => boolean | Promise<boolean>

/** Resolved by `trigger` — an element, or a getter for one not yet in the DOM (Q3=C, Q25=A). */
export type YueDialogTrigger = HTMLElement | (() => HTMLElement | null)

/** Scope handed to the `default` slot: a programmatic close that still routes through `beforeClose`. */
export interface YueDialogDefaultSlot {
  close: (reason?: YueDialogCloseReason) => void
}

/** Scope handed to the `header` slot: the generated id so a custom heading can bind `aria-labelledby`. */
export interface YueDialogHeaderSlot {
  titleId: string
}

/** Scope handed to the `footer` slot. Supplying this slot suppresses the built-in
 * confirm / cancel buttons entirely, so no `dialog.*` locale key is rendered (Q14=C). */
export interface YueDialogFooterSlot {
  close: (reason?: YueDialogCloseReason) => void
  confirm: () => void
  cancel: () => void
}

/** The structural parts a caller may attach extra classes / inline styles to (C3). */
export interface YueDialogParts {
  overlay: string
  scrim: string
  panel: string
  header: string
  body: string
  footer: string
  close: string
}
/** Per-part class map merged onto each structural element (C3). */
export type YueDialogClassNames = Partial<Record<keyof YueDialogParts, string>>
/** Per-part inline-style map merged onto each structural element (C3). */
export type YueDialogStyles = Partial<Record<keyof YueDialogParts, CSSProperties>>

export interface YueDialogProps {
  /** Controlled open state — the single source of truth when present; closes only emit (Q4=A). */
  modelValue?: boolean
  /** Built-in heading text; auto-wired to `aria-labelledby` (Q13=B). */
  title?: string
  /** Optional supporting copy; participates in `aria-describedby` (Q13=B). */
  description?: string
  variant?: YueDialogVariant
  surface?: YueDialogSurface
  size?: YueDialogSize
  /** Explicit width override; clamped by the viewport safe margin regardless of `size`. */
  width?: string | number
  /** Body scrolls with a fixed header/footer; otherwise the whole card scrolls (Q19=C). */
  scrollable?: boolean
  /** Suppress every non-button close (Esc + scrim) and keep the content mounted (Q24=A). */
  persistent?: boolean
  /** Default derived from `variant` (off for `danger`); an explicit value always wins (Q6=B). */
  closeOnEscape?: boolean
  /** Default derived from `variant` (off for `danger`); an explicit value always wins (Q6=C). */
  closeOnScrim?: boolean
  beforeClose?: YueDialogBeforeClose
  /** Falls back to the `dialog.confirm` locale key (Q14=C). */
  confirmText?: string
  /** Falls back to the `dialog.cancel` locale key (Q14=C). */
  cancelText?: string
  /** Icon-only corner close control; `false` removes it, `{ ariaLabel }` overrides `dialog.closeLabel` (Q15=B). */
  close?: boolean | { ariaLabel?: string }
  /** Mount target for the detached surface; `body` by default (shared overlay runtime). */
  teleport?: boolean | string | HTMLElement
  /** Anchor for animation origin and conditional return focus (Q3=C, Q12=B, Q25=A). */
  trigger?: YueDialogTrigger
  /** Return focus on close only when the close was keyboard- or program-triggered (Q12=B). */
  restoreFocus?: boolean
  /** Explicit accessible name; takes precedence over the auto `aria-labelledby` (Q13=B). */
  ariaLabel?: string
  /** Non-modal surface: no `aria-modal`, background inert, scroll lock or focus trap; the
   * page stays interactive. Modality is now its own axis, independent of `surface` (B2/C5). */
  modeless?: boolean
  /** Force the confirm button into a busy state (spinner + disabled, Esc/scrim suppressed).
   * Also driven automatically while `beforeClose` returns a pending Promise (C1). */
  loading?: boolean
  /** Render the built-in confirm button; `false` yields a single-action dialog (C2). */
  showConfirm?: boolean
  /** Render the built-in cancel button; `false` yields a single-action dialog (C2). */
  showCancel?: boolean
  /** Defer content instantiation until first open, then keep it mounted across closes (C4). */
  lazy?: boolean
  /** Extra classes merged onto each structural part (C3). */
  classNames?: YueDialogClassNames
  /** Inline styles merged onto each structural part (C3). */
  styles?: YueDialogStyles
}

export interface YueDialogEmits {
  (event: 'update:modelValue', value: boolean): void
  (event: 'open'): void
  (event: 'close', payload: { reason: YueDialogCloseReason; event?: Event }): void
  (event: 'confirm'): void
  (event: 'closed', payload: { reason: YueDialogCloseReason }): void
  (event: 'after-open'): void
  (event: 'after-close'): void
}

export interface YueDialogSlots {
  header?: (scope: YueDialogHeaderSlot) => unknown
  default?: (scope: YueDialogDefaultSlot) => unknown
  footer?: (scope: YueDialogFooterSlot) => unknown
  /** Replaces the built-in close glyph; the button and its accessible name stay intact (C6). */
  'close-icon'?: () => unknown
}

/** Imperative handle. No DOM node or overlay-internals type is exposed (Q21=B, Q27=B). */
export interface YueDialogExposed {
  open: () => void
  close: (reason?: YueDialogCloseReason) => void
  updatePosition: () => void
}
