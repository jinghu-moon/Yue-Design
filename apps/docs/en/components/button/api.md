# Button API

This page describes only the consumable interface of the Button component family. For runnable, real component examples, see [Examples](/en/components/button); for structural anatomy, see [Anatomy](/en/components/button#anatomy) on the examples page; for usage scenarios, hierarchy, and accessibility decisions, see the [Guide](./guide).

The Button family has four components, each responsible for exactly one thing:

| Component | Role |
| --- | --- |
| `YueButton` | A single button. **Knows nothing about any group** |
| `YueButtonGroup` | Joins several buttons into one group: merges corner radii, provides `role="group"` |
| `YueButtonToggle` | Holds the `v-model` on top of a group, responsible for "which one is selected" |
| `YueButtonToggleItem` | A button that **is a certain value**: reads the group's selection and renders as a button |

## Import

```ts
// Single-component entry: default is YueButton, the other three are named exports
import YueButton, { YueButtonGroup, YueButtonToggle, YueButtonToggleItem } from '@yue-ui/vue/button'
import '@yue-ui/design-tokens/index.css'
import '@yue-ui/vue/button.css'

// Or import by name from the root entry
import { YueButton, YueButtonGroup, YueButtonToggle, YueButtonToggleItem } from '@yue-ui/vue'
```

You can also register globally with `@yue-ui/vue/plugin`. The plugin registers components and provides application-level configuration, and it does not pull in an icon library.

## YueButton

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `theme` | `'default' \| 'primary' \| 'success' \| 'warning' \| 'danger'` | `'default'` | Semantic color role |
| `variant` | `'solid' \| 'outline' \| 'dashed' \| 'text' \| 'link'` | `'solid'` | Drawing style and emphasis level |
| `size` | `'sm' \| 'md' \| 'lg'` | `YueConfig.size`, which defaults to `'md'` | Size of the current button |
| `shape` | `'square' \| 'round' \| 'circle'` | `'square'` | Corner shape; `circle` is used for icon buttons |
| `disabled` | `boolean` | `false` | Truly disabled: native buttons use `disabled`, other tags use `aria-disabled="true"` + `tabindex="-1"` |
| `loading` | `boolean` | `false` | Prevents activation, sets `aria-busy="true"`; it does **not** change `aria-disabled` and does **not** change the tab order, the content stays in place, and the loading layer covers it |
| `block` | `boolean` | `false` | Fills the inline width of the parent container |
| `nativeType` | `'button' \| 'submit' \| 'reset'` | `'button'` | Applied only when `tag="button"` |
| `active` | `boolean \| undefined` | `undefined` | Selected state of a standalone toggle button: writes `aria-pressed` and adds the `is-active` visual state |
| `tag` | `string \| Component` | `'button'` | Custom render tag or component |

These eight — `theme` / `variant` / `size` / `shape` / `disabled` / `loading` / `block` / `nativeType` — are defined in `YueButtonSharedProps`: they are the thing "button" itself, and `YueButtonToggleItem` inherits the same declaration, so the two can never drift apart in name or meaning. `active` and `tag` belong only to `YueButton`.

The three states of `active` are intentional:

- Not passed (`undefined`) = "this is not a toggle button", **no `aria-pressed` is output**;
- `false` = "this is a toggle button, currently unselected", outputs `aria-pressed="false"`;
- `true` = selected, outputs `aria-pressed="true"` and adds `is-active`.

`YueButtonToggle` is needed only when "several buttons must agree on one value"; a set of unrelated toggle buttons can just use `YueButtonGroup` + each one's own `active`.

### Slots

| Slot | Content | Behavior |
| --- | --- | --- |
| `default` | Button label | Rendered into `.yue-button__label` |
| `leading` | Leading content, usually an icon | While loading it stays in place and is hidden, and is not replaced |
| `trailing` | Trailing content, usually an icon | While loading it stays in place and is hidden |
| `loader` | Custom loading indicator | Replaces the default spinner, rendered in a fixed loading layer |

Icon assets are provided by the consumer. Yue does not bundle an icon font, an SVG collection, or a CDN; for sizing and accessibility rules, see the [Icon guide](/en/design/icon).

### Events

| Event | Payload | Trigger condition |
| --- | --- | --- |
| `click` | `MouseEvent` | Only when both `disabled` and `loading` are `false` |

### Fallthrough attributes

Non-prop attributes such as `class`, `style`, `id`, `aria-*`, and `data-*` are always passed through to the root element. `inheritAttrs: false` is deliberate: by default Vue appends `$attrs` **after** the component's own bindings, so a casually written `aria-busy="false"` could override the state the component is expressing, so here the component itself decides who takes precedence.

## YueButtonGroup

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `vertical` | `boolean` | `false` | Stacks vertically instead of a single horizontal row |

A group does only structure: it merges corner radii, collapses overlapping adjacent borders, and provides one layer of `role="group"`. It has **no** `theme` / `variant` / `size`: a "group" that forwards eight props at once is a second, worse way of writing the same thing, and "the buttons in this area are more compact" already has a mechanism in Yue — retarget the `--button-*` Component Tokens on the container (that is exactly how the **compact** density on the examples page does it).

The root element defaults to `role="group"`, but that is a binding rather than a hardcoded attribute, so a `role` passed by the consumer overrides it (a toolbar can use `role="toolbar"`).

### Slots

| Slot | Content | Behavior |
| --- | --- | --- |
| `default` | Buttons in the group | Only `.yue-button` is treated as a group item and gets merged corner radii |

## YueButtonToggle

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `modelValue` | `string \| number \| null` | `null` | The currently selected value; `null` means nothing has been selected yet |
| `disabled` | `boolean` | `false` | Disables every item in the group |
| `vertical` | `boolean` | `false` | Stacks vertically, passed through to the internal `YueButtonGroup` |

Selection is **mandatory**: clicking an already selected item again does not deselect it. A segmented control answers "which one of these is current", and a state with no selected item cannot answer that question; a set of buttons that "can all be turned off" should use `YueButtonGroup` + each `YueButton`'s own `active`.

The group itself has no text, so the accessible name must be provided by the consumer: pass `aria-label`, or point `aria-labelledby` at visible text. In development mode, a missing one produces an explanatory warning.

Arrow-key navigation and roving tabindex are **not implemented yet**; items are currently ordinary Tab stops. This is a deliberate half-finished boundary: changing only the tab order without providing arrow keys is worse than doing nothing.

### Slots

| Slot | Content | Behavior |
| --- | --- | --- |
| `default` | `YueButtonToggleItem` | Rendered into the internal group |

### Events

| Event | Payload | Trigger condition |
| --- | --- | --- |
| `update:modelValue` | `string \| number` | Another item that was not selected got activated |

## YueButtonToggleItem

`YueButtonToggleItem` accepts all props of `YueButtonSharedProps` — `theme`, `variant`, `size`, `shape`, `disabled`, `loading`, `block`, `nativeType` — plus the single item below. It does not redeclare these names; instead it `extends` the same interface, so "whatever the button accepts, the item accepts" is a fact at the type level rather than a list that must be kept in sync by hand.

`active` and `tag` are deliberately excluded: the selected state is derived from the group, and an item must render a control the platform can press, so it is always `<button>`.

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string \| number` | — (required) | The value this item represents |
| `theme` | `'default' \| 'primary' \| 'success' \| 'warning' \| 'danger'` | `'default'` | Semantic color role, from `YueButtonSharedProps` |
| `variant` | `'solid' \| 'outline' \| 'dashed' \| 'text' \| 'link'` | `'solid'` | Drawing style, from `YueButtonSharedProps` |
| `size` | `'sm' \| 'md' \| 'lg'` | `YueConfig.size` | Size, from `YueButtonSharedProps` |
| `shape` | `'square' \| 'round' \| 'circle'` | `'square'` | Corner shape, from `YueButtonSharedProps` |
| `disabled` | `boolean` | `false` | Disables only this item; a group `disabled` disables all of them |
| `loading` | `boolean` | `false` | This item is loading: prevents activation but does not change the selected state |
| `block` | `boolean` | `false` | Fills the container width |
| `nativeType` | `'button' \| 'submit' \| 'reset'` | `'button'` | Native `type` |

### Slots

| Slot | Content | Behavior |
| --- | --- | --- |
| `default` | Label | Rendered into `.yue-button__label` |
| `leading` | Leading content, usually an icon | Passed through to the internal button |
| `trailing` | Trailing content, usually an icon | Passed through to the internal button |
| `loader` | Custom loading indicator | Passed through to the internal button |

Events such as `click` come from the internal `YueButton`: listeners reach it through attribute fallthrough, so `@click` still works. The only declared event is `update:modelValue` on the group.

## Application-level configuration

```ts
import YueUI from '@yue-ui/vue/plugin'
import ZhCN from '@yue-ui/vue/locale/zh-CN'

app.use(YueUI, { size: 'sm', locale: 'zh-CN', packs: { 'zh-CN': ZhCN } })
```

| Config key | Type | Default | Description |
| --- | --- | --- | --- |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | The value it falls back to when a component does not pass `size` |

`YueConfig` has only this one entry: **size is a component option, language is not.** Language (`locale`, `packs`, `messages`, `adapter`) is handed by the plugin to the locale instance and is independent of size — switching the language in a subtree will not incidentally change the size, and vice versa.

The precedence is always: application default → subtree `provideYueConfig()` / `provideLocale()` override → the component's own prop.

A runtime `prefix` or `namespace` is not supported, because class names and prebuilt CSS must stay consistent.

For the full contract of language (language pack subpaths, the fallback chain, missing-key diagnostics, external adapters), see the [Internationalization guide](/en/guide/i18n); for the key list see `input.clear` on that page.

## CSS entry

```ts
import '@yue-ui/design-tokens/index.css' // must be loaded first
import '@yue-ui/vue/button.css'           // loads only the Button family (all four components share this one file)
// Or: import '@yue-ui/vue/style.css'    // loads styles for all components
```

The component CSS uses public BEM class names: `.yue-button`, `.yue-button--primary`, `.yue-button__icon`, `.yue-button__loader`, `.yue-button-group`. The components do not use `scoped` styles; for theming, retarget the `--button-*` Component Tokens first.

## Token mapping

| Category | Token |
| --- | --- |
| Size | `--button-height-*`, `--button-padding-inline-*`, `--button-font-size-*` |
| Icon and loading | `--button-icon-size-*`, `--button-spinner-border-width`, `--button-spinner-duration` |
| Selected state | `--button-selected-background`, `--button-selected-color`, `--button-selected-border-color`, `--button-selected-background-hover`, `--button-selected-background-pressed` |
| Group | `--button-border-radius`, `--button-border-width` |
| Focus | `--button-focus-ring-color`, `--button-focus-ring-width`, `--button-focus-ring-offset` |
| Disabled | `--button-disabled-background`, `--button-disabled-color`, `--button-disabled-border-color` |
| Motion | `--button-duration`, `--button-ease` |

## Accessibility output

- By default it outputs `<button type="button">`, preserving platform keyboard and form semantics.
- Non-native tags output `aria-disabled="true"` and `tabindex="-1"` when `disabled`, and block clicks.
- `loading` outputs `aria-busy="true"` and does not set the native `disabled`, in order to keep focus; the content is hidden with `opacity: 0` instead of being removed, so the button **still has an accessible name** while it is loading.
- **On every tag, `loading` is expressed only as `aria-busy`.** It writes no `aria-disabled` and no `tabindex`: the accessible output of `<button loading>` and `<a loading>` is the same, and `<a loading>` also stays in the tab order. Activation is intercepted by the click handler (including `preventDefault()`, so pressing Enter on the keyboard does not navigate) — this is exactly why "busy but still reachable" can hold.
- When `disabled` and `loading` are both true, disabled semantics take precedence: non-native tags still output `aria-disabled="true"` and `tabindex="-1"` while retaining `aria-busy="true"`.
- `shape="circle"` must provide `aria-label` or `aria-labelledby`.
- `active` outputs `aria-pressed` only when it is explicitly set: an ordinary button does not masquerade as a toggle button.
- `YueButtonToggle` renders `role="group"`, and items in the group output `aria-pressed="true|false"`; the group must provide `aria-label` or `aria-labelledby`.
- Under `prefers-reduced-motion: reduce`, the spinner stops rotating, but the static loading indication is retained.
