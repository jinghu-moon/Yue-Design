# YueDialog Guide

## When to use it

Use a Dialog when the user must finish or confirm something before continuing: delete confirmations, required forms, settings that cannot be skipped. A Dialog blocks the rest of the page, so a page should only ever have one dialog that genuinely demands an answer at a time.

For supplementary content near a trigger, use `YuePopover`; for a set of menu items, use the future `YueMenu`.

## Controlled state and close channels

Prefer `v-model` so the parent owns the open state. There are exactly three close channels: an explicit button, Escape, and a scrim click; the `danger` variant disables the last two by default so it must be answered through a button. Every close first passes through the `beforeClose(reason)` guard, and returning `false` or rejecting aborts it.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { YueDialog } from '@yue-ui/vue/dialog'

const open = ref(false)
async function guard(reason) {
  if (reason === 'scrim') return confirm('Unsaved changes — leave anyway?')
  return true
}
</script>

<YueDialog v-model="open" title="Edit profile" :before-close="guard">
  <p>Put the form inside the default slot.</p>
</YueDialog>
```

## Focus, layering, and scroll

On open, focus lands on the dialog container, Tab wraps inside the card, and the background is set `inert` per the modal chain — sibling teleported overlays are not accidentally blocked. On close, focus is returned only when the close was keyboard- or program-triggered. The scrim and card sit at `--layer-modal`, above the transient overlay ramp. Background scrolling is locked with `overflow: clip` plus `scrollbar-gutter: stable` to avoid layout shift.

## Surfaces and motion

`surface="modal"` is a centred card; `surface="fullscreen"` suits a full-screen mobile flow. The enter animation flies from the trigger's centre to the viewport centre (travel clamped to a fraction of the viewport), and grows in place when there is no trigger. The concrete duration and easing are prototype values; the mechanism (a single duration source per phase plus the real `transitionend`) is frozen.

## Modality and modeless

`surface` only decides shape (a centred card or full viewport), not modality — both `modal` and `fullscreen` are modal. To keep the page interactive (a find-and-replace you can keep working alongside, a side confirmation), set `modeless`: no `aria-modal`, no background `inert`, no scroll lock, no focus trap, while the Escape and scrim channels still follow `variant` and `closeOn*`.

## Busy state and async close

When `beforeClose` returns a pending Promise the component enters a busy state automatically: the confirm button shows a spinner and is disabled, and Esc and scrim close are suppressed so the user cannot re-trigger before the guard settles. `loading` forces the same state from the outside (for example while a submit request is in flight). Once the busy state clears, the close proceeds per the guard’s result.

## Action trimming and per-part customization

`showConfirm`/`showCancel` decide whether the built-in buttons render; with both `false` the entire footer disappears, yielding a no-action or single-action dialog. The `close-icon` slot replaces the corner glyph without touching the close button or its accessible name. `classNames`/`styles` merge per structural part (`overlay`/`scrim`/`panel`/`header`/`body`/`footer`/`close`) to tune one part without overriding the built-in classes. `lazy` defers content instantiation until first open and then keeps it mounted across closes, suited to an expensive body.

## Built-in labels and i18n

The confirm, cancel, and close-icon labels come from the `dialog.confirm`, `dialog.cancel`, and `dialog.closeLabel` locale keys and switch with the language pack. Override them with `confirmText`/`cancelText`, or take over the whole action area with the `footer` slot (which renders no built-in text).

## Design decisions

The design borrows Vuetify's overlay/stack/focusTrap layering, Ant Design's title `useId` binding and mask/panel animation split, and TDesign's five-layer DOM responsibilities. It rejects pushing modal semantics down into the shared hooks: teleport, the stack, return focus, and scroll lock belong to the neutral overlay base in `packages/hooks`, while the focus trap, `inert`, and `aria-modal` are consumed only by Dialog and never flow back into Popover.
