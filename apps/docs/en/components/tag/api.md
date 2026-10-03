# Tag API

This page describes the public interface for the Tag component family. For live examples see [Examples](/en/components/tag); for design decisions see [Guide](./guide).

| Component | Role |
| --- | --- |
| `YueTag` | Read-only label for status, category, or attribute display. Supports a close button |
| `YueCheckTag` | Selectable tag with `role="checkbox"` semantics, suited for multi-select filter panels |

## Import

```ts
// Per-component entry
import { YueTag, YueCheckTag } from '@yue-ui/vue/tag'
import '@yue-ui/design-tokens/index.css'
import '@yue-ui/vue/tag.css'

// Or from the root entry
import { YueTag, YueCheckTag } from '@yue-ui/vue'
```

Global registration is also available via `@yue-ui/vue/plugin`.

## YueTag

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `theme` | `'default' \| 'primary' \| 'success' \| 'warning' \| 'danger'` | `'default'` | Semantic color role |
| `variant` | `'filled' \| 'tint' \| 'outline' \| 'tint-outline'` | `'filled'` | Visual weight: solid fill / tinted fill / outline / tinted+outline |
| `size` | `'sm' \| 'md' \| 'lg'` | `YueConfig.size`, default `'md'` | Tag size |
| `shape` | `'square' \| 'round'` | `'square'` | Corner radius style |
| `disabled` | `boolean` | `false` | Reduces opacity, blocks clicks, hides the close button |
| `closable` | `boolean` | `false` | Shows the close button. Hidden (not just disabled) when `disabled` is true |
| `tag` | `string \| Component` | `'span'` | Custom root element or component |
| `color` | `string` | — | Any CSS color value. Overrides the `theme` palette; text/background are auto-derived |
| `maxWidth` | `number \| string` | — | Maximum label width; overflows are truncated and `title` is added. Numbers are in px |

`color` and `theme` are mutually exclusive: when `color` is provided the component derives `filled` text color via WCAG luminance (dark or white), and adjusts background and border for other variants.

### Emits

| Event | Payload | When |
| --- | --- | --- |
| `click` | `MouseEvent` | Root element clicked; not fired when `disabled` |
| `close` | `MouseEvent` | Close button clicked; not fired when `disabled` |

### Slots

| Slot | Description |
| --- | --- |
| `default` | Tag label text |
| `icon` | Leading icon, rendered inside `.yue-tag__icon` with automatic `aria-hidden="true"` wrapper |
| `close-icon` | Custom close icon, replaces the default `IconX` |

### Forwarded attributes

`class`, `style`, `id`, `aria-*`, `data-*`, and other non-prop attributes are forwarded to the root element. `class` is merged with the component's own classes.

## YueCheckTag

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `modelValue` | `boolean \| undefined` | `undefined` | Controlled checked state. `undefined` means uncontrolled |
| `defaultChecked` | `boolean` | `false` | Initial checked state for uncontrolled mode |
| `value` | `string \| number` | — | Value this tag represents, passed through the `change` event payload |
| `disabled` | `boolean` | `false` | Reduces opacity, removes from tab order, blocks interaction |
| `size` | `'sm' \| 'md' \| 'lg'` | `YueConfig.size`, default `'md'` | Tag size |

Controlled vs. uncontrolled:

- No `modelValue` (or `undefined`) → uncontrolled: the component owns its state; `defaultChecked` sets the initial value.
- `modelValue` set to `true` or `false` → controlled: the parent fully owns the checked state.

### Emits

| Event | Payload | When |
| --- | --- | --- |
| `update:modelValue` | `boolean` | User toggles checked state (click or Space/Enter) |
| `change` | `{ checked: boolean; value?: string \| number; e: MouseEvent \| KeyboardEvent }` | Same as above, with full context |
| `click` | `MouseEvent` | Click; not fired when `disabled` |

### Slots

| Slot | Description |
| --- | --- |
| `default` | Tag label text |

### Forwarded attributes

Same as `YueTag`. `class` merges; other attributes forward to the root `<span>`.

## Application-level config

```ts
import YueUI from '@yue-ui/vue/plugin'
app.use(YueUI, { size: 'sm' })
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Fallback size when no `size` prop is passed |

## CSS entry

```ts
import '@yue-ui/design-tokens/index.css' // must load first
import '@yue-ui/vue/tag.css'             // Tag family only
// or: import '@yue-ui/vue/style.css'    // all component styles
```

## Token map

| Category | Tokens |
| --- | --- |
| Size | `--tag-height-{sm/md/lg}`, `--tag-padding-inline-{sm/md/lg}`, `--tag-font-size-{sm/md/lg}` |
| Spacing | `--tag-gap`, `--tag-padding-block` |
| Weight | `--tag-font-weight` |
| Shape | `--tag-border-radius`, `--tag-border-radius-round` |
| Border | `--tag-border-width` |
| Close icon | `--tag-close-icon-size` |
| Disabled | `--tag-opacity-disabled` |
| Focus | `--tag-focus-ring-color`, `--tag-focus-ring-width`, `--tag-focus-ring-offset` |
| Motion | `--tag-duration`, `--tag-ease` |
| Color | `--tag-{theme}-{variant}-background/color/border-color` (5 themes × 4 variants = 20 sets) |

## Accessibility

- `YueTag` renders a `<span>` by default — no interaction semantics. If the tag is clickable, pass `tag="button"` or `tag="a"` and provide an accessible name.
- The close button is a native `<button type="button">` with its label from the i18n key `tag.closeLabel` ("Remove tag" in English).
- `disabled` produces `aria-disabled="true"` on the root element; the close button is not rendered.
- `YueCheckTag` uses `role="checkbox"` + `aria-checked`; disabled state uses `aria-disabled="true"` + `tabindex="-1"`; Space and Enter toggle the checked state.
- The icon slot content is wrapped in an `aria-hidden="true"` container to prevent duplicate announcements.
