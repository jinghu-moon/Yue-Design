# YuePopover API

This page describes the frozen public contract. Load the token sheet before the Popover stylesheet.

```ts
import { YuePopover } from '@yue-ui/vue/popover'
import '@yue-ui/design-tokens/index.css'
import '@yue-ui/vue/popover.css'
```

## YuePopover

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `modelValue` | `boolean` | `undefined` | Controlled open state; requests emit `update:modelValue` |
| `defaultOpen` | `boolean` | `false` | Initial state in uncontrolled mode |
| `trigger` | `'click' \| 'hover' \| 'focus' \| 'manual'` | `'click'` | Automatic trigger policy |
| `anchor` | `HTMLElement \| (() => HTMLElement \| null)` | `undefined` | External reference when no trigger slot is used |
| `placement` | `YuePopoverPlacement` | `'bottom'` | Preferred placement; the actual placement may flip |
| `offset` | `number` | `8` | CSS pixel gap between reference and content |
| `teleport` | `boolean \| string \| HTMLElement` | `'body'` | Teleport target; `false` keeps content in place |
| `persistent` | `boolean` | `false` | Keep content mounted while closed |
| `closeOnOutside` | `boolean` | `true` | Close on pointerdown outside trigger/content |
| `closeOnEscape` | `boolean` | `true` | Close the topmost instance on Escape |
| `closeOnContentClick` | `boolean` | `false` | Close after a click inside content |
| `restoreFocus` | `boolean` | `true` | Conditionally restore the opening trigger |
| `role` | `'dialog' \| 'tooltip' \| 'presentation'` | `'dialog'` | Content ARIA role; it does not add Menu/Dialog behavior |
| `disabled` | `boolean` | `false` | Prevent trigger opening and force closed |

When `modelValue` is present, the parent owns the state. When omitted, the component owns a ref initialized from `defaultOpen`.

### Events

| Event | Payload | When |
| --- | --- | --- |
| `update:modelValue` | `boolean` | A request changes controlled state |
| `open` | `{ trigger: Event \| undefined }` | After opening is accepted |
| `close` | `{ reason: YuePopoverCloseReason; event?: Event }` | After close is accepted |
| `after-open` | — | Enter transition completes |
| `after-close` | — | Leave transition completes; transient content then unmounts |

Event order is `update:modelValue` (controlled) → `open`/`close` → transition → `after-open`/`after-close`. Duplicate requests emit nothing. Close reasons are `trigger`, `outside`, `escape`, and `programmatic`.

### Slots

| Slot | Scope | Description |
| --- | --- | --- |
| `trigger` | `{ props, isOpen, open, close, toggle }` | Optional reference; bind `props` to the real trigger |
| `default` | `{ isOpen, close }` | Detached content |

Without a trigger slot, `anchor` is required. `trigger="manual"` installs no automatic open/close handlers.

### Expose

| Method | Return | Purpose |
| --- | --- | --- |
| `open()` | `void` | Open |
| `close(reason?)` | `void` | Close with `programmatic` reason |
| `toggle()` | `void` | Toggle |
| `updatePosition()` | `Promise<void>` | Reposition after external content-size changes |

DOM refs, Floating UI objects, and third-party middleware are not exposed.

### DOM and attributes

- `inheritAttrs: false`.
- `class`, `style`, `id`, `role`, `aria-*`, and `data-*` fall through to the content root.
- Trigger attributes and handlers come from the trigger slot's `props`.
- Content defaults to `role="dialog"` and requires `aria-label` or `aria-labelledby`.
- The trigger receives `aria-expanded` and `aria-controls`; disabled triggers receive `aria-disabled="true"`.

### Tokens

| Category | Tokens |
| --- | --- |
| Surface | `--popover-background`, `--popover-color` |
| Boundary | `--popover-border-color`, `--popover-border-width` |
| Shape | `--popover-border-radius` |
| Type | `--popover-font-size` |
| Spacing | `--popover-padding` |
| Layer | `--popover-shadow`, `--popover-z-index` |
| Motion | `--popover-duration-enter/exit`, `--popover-ease` |

### Accessibility

- Default `role="dialog"` is non-modal; there is no focus trap, scrim, or inert background.
- Opening does not move focus. Closing restores focus only while focus still belongs to this interaction.
- Escape targets the topmost instance; child content does not close its parent.
- Tab follows the natural document order; direction keys are not handled.
- Reduced motion removes enter/leave animation, and forced colors preserve boundaries and focus with system colors.

### Limitations

No menu navigation, type-ahead, roving tabindex, dialog focus trap, modal scrim, tooltip delays, arrow, or imperative create API.

### Breaking changes

This is a new component. The API is frozen before implementation; changes require a spec amendment.
