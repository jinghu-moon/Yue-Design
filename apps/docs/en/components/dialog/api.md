# YueDialog API

This page describes the frozen public contract. Load the token sheet before the Dialog stylesheet.

```ts
import { YueDialog } from '@yue-ui/vue/dialog'
import '@yue-ui/design-tokens/index.css'
import '@yue-ui/vue/dialog.css'
```

## YueDialog

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `modelValue` | `boolean` | `undefined` | Controlled open state; when present, internal close requests only notify the parent via `update:modelValue` |
| `title` | `string` | `undefined` | Built-in heading text, automatically wired to `aria-labelledby` |
| `description` | `string` | `undefined` | Supporting copy, participates in `aria-describedby` |
| `variant` | `'default' \| 'danger'` | `'default'` | `danger` promotes the role to `alertdialog` and turns off Esc and scrim close by default |
| `surface` | `'modal' \| 'fullscreen'` | `'modal'` | `modal` is a centred card over a scrim; `fullscreen` is a full-viewport surface. Both are modal by default; modality is controlled separately by `modeless` |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Width preset; overridden when `width` is set |
| `width` | `string \| number` | `undefined` | Explicit width override; numbers are CSS pixels, still bounded by the viewport safe margin |
| `scrollable` | `boolean` | `false` | Pin header/footer and scroll only the body; otherwise the whole card scrolls |
| `persistent` | `boolean` | `false` | Suppress every non-button close (Esc + scrim) and keep content mounted |
| `closeOnEscape` | `boolean` | Derived from `variant` | An explicit value always wins; `danger` defaults to `false` |
| `closeOnScrim` | `boolean` | Derived from `variant` | An explicit value always wins; `danger` defaults to `false` |
| `beforeClose` | `(reason: YueDialogCloseReason) => boolean \| Promise<boolean>` | `undefined` | Guard before a close is committed; returning `false`, a Promise resolving `false`, or rejecting aborts the close |
| `confirmText` | `string` | `dialog.confirm` | Built-in confirm button label, falls back to the locale key |
| `cancelText` | `string` | `dialog.cancel` | Built-in cancel button label, falls back to the locale key |
| `close` | `boolean \| { ariaLabel?: string }` | `true` | Icon-only corner close control; `false` removes it, an object overrides the accessible name |
| `teleport` | `boolean \| string \| HTMLElement` | `'body'` | Mount target for the detached surface; `false` keeps it in place |
| `trigger` | `YueDialogTrigger` | `undefined` | Anchor for the fly-in origin and conditional return focus; an element or a getter returning one |
| `restoreFocus` | `boolean` | `true` | Return focus only when the close was keyboard- or program-triggered |
| `ariaLabel` | `string` | `undefined` | Explicit accessible name; takes precedence over the auto `aria-labelledby` |
| `modeless` | `boolean` | `false` | Non-modal surface: no `aria-modal`, no background inert, no scroll lock, no focus trap; the page stays interactive |
| `loading` | `boolean` | `false` | Force the confirm button into a busy state (spinner + disabled) and suppress Esc and scrim close; entered automatically while `beforeClose` returns a pending Promise |
| `showConfirm` | `boolean` | `true` | Whether the built-in confirm button renders; `false` yields a single-action dialog |
| `showCancel` | `boolean` | `true` | Whether the built-in cancel button renders; `false` yields a single-action dialog |
| `lazy` | `boolean` | `false` | Defer content instantiation until first open, then keep it mounted across closes |
| `classNames` | `Partial<Record<'overlay' \| 'scrim' \| 'panel' \| 'header' \| 'body' \| 'footer' \| 'close', string>>` | `undefined` | Classes merged onto each structural part |
| `styles` | `Partial<Record<'overlay' \| 'scrim' \| 'panel' \| 'header' \| 'body' \| 'footer' \| 'close', CSSProperties>>` | `undefined` | Inline styles merged onto each structural part |

Controlled versus uncontrolled: when `modelValue` is present the parent owns the state; when omitted the component maintains internal state.

### Events

| Event | Payload | When |
| --- | --- | --- |
| `update:modelValue` | `boolean` | Controlled open state is requested to change |
| `open` | — | After opening is accepted |
| `close` | `{ reason: YueDialogCloseReason; event?: Event }` | When a close is requested (before the guard) |
| `confirm` | — | The user triggers the confirm action |
| `closed` | `{ reason: YueDialogCloseReason }` | After the guard allows the close and state closes |
| `after-open` | — | Enter transition completes |
| `after-close` | — | Leave transition completes; content then unmounts |

`close.reason` is one of `confirm`, `cancel`, `close-btn`, `escape`, `scrim`, or `programmatic`. The close pipeline order is fixed: `close` → `beforeClose` → `update:modelValue` → transition → `after-close`.

### Slots

| Slot | Scope | Description |
| --- | --- | --- |
| `header` | `{ titleId }` | Custom heading; bind `titleId` to the heading element's `id` |
| `default` | `{ close }` | Dialog body content |
| `footer` | `{ close, confirm, cancel }` | Custom action area; supplying this slot fully replaces the built-in confirm/cancel buttons |
| `close-icon` | — | Replaces the built-in close glyph; the button and its accessible name stay intact |

When the `footer` slot is present no built-in buttons render, so no `dialog.*` locale text is emitted.

### Expose

| Method | Return | Purpose |
| --- | --- | --- |
| `open()` | `void` | Open the instance |
| `close(reason?)` | `void` | Close with the given reason (default `programmatic`), still routed through `beforeClose` |
| `updatePosition()` | `void` | Recompute the fly-in origin |

DOM refs and overlay internals are not exposed.

### DOM and attributes

- The component uses `inheritAttrs: false`.
- `class` and `style` land on the overlay root; remaining attributes fall through to the dialog card root.
- `classNames` / `styles` merge per structural part (`overlay`/`scrim`/`panel`/`header`/`body`/`footer`/`close`), letting a caller customise one part without replacing the built-in classes.
- The card defaults to `role="dialog"` and uses `role="alertdialog"` for `variant="danger"`.
- Both scrim and card carry a `data-yue-overlay` marker so the modal-chain `inert` computation excludes sibling overlays.

### Tokens

| Category | Tokens |
| --- | --- |
| Surface | Reads the Box contract directly: `--box-background-dialog`, `--box-color-dialog`, and siblings |
| Width | `--dialog-width-sm`, `--dialog-width-md`, `--dialog-width-lg`, `--dialog-width-xl` |
| Geometry | `--dialog-header-height`, `--dialog-footer-gap`, `--dialog-section-padding` |
| Motion | `--dialog-duration-enter`, `--dialog-duration-exit`, `--dialog-ease` |
| Layer | `--layer-modal` (the level the scrim and card occupy) |

### Accessibility

- Focus trap: Tab wraps inside the card, and the background is set `inert` per the modal chain without blocking sibling teleported overlays.
- Initial focus lands on the `tabindex="-1"` card container so assistive tech reads the name and description first.
- Conditional return focus on close: keyboard- or program-triggered closes return to the anchor; a scrim click does not steal focus.
- Escape is protected by IME `isComposing`; with several instances only the topmost responds.
- Reduced motion removes enter/leave animation, and forced colors restore boundaries and focus visibility with system colors.

### Limitations

Dialog does not implement an imperative `open()` factory, back-button interception, dragging, resizing, or a built-in multi-layer notification stack. Domain copy beyond confirm/cancel is supplied by the consumer through the `footer` slot or `confirmText`/`cancelText`.

### Breaking changes

This is a new component. The API is frozen before implementation; changes require a spec amendment.
