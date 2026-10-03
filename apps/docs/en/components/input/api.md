# Input API

`YueInput` exposes exactly one contract to the outside: one `Props` table, one event table, two slots, and one explicit attribute routing rule. Everything below is public API.

## Import

```ts
// Named export (recommended: the bundler keeps only the components you use)
import { YueInput } from '@yue-ui/vue'
import '@yue-ui/vue/style.css'

// Single-component entry
import YueInput from '@yue-ui/vue/input'
import '@yue-ui/vue/input.css'

// Global registration
import YueUI from '@yue-ui/vue/plugin'
import '@yue-ui/vue/style.css'
```

You can also use the named export from the root entry, or register globally through `@yue-ui/vue/plugin`. The plugin only registers components and provides the app-level `size` configuration; it does not pull in an icon library.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `modelValue` | `string` | `''` | Field value. Always a string; no implicit number conversion |
| `size` | `'sm' \| 'md' \| 'lg'` | `YueConfig.size`, defaults to `'md'` | Controls the size, sharing the same `ComponentSize` as `YueButton` |
| `type` | `'text' \| 'search' \| 'email' \| 'url' \| 'tel' \| 'password'` | `'text'` | Passed through to the native `type`. Note that `type="search"` also goes through the same appearance reset, see below |
| `disabled` | `boolean` | `false` | Native `disabled`: not focusable, not submitted |
| `readonly` | `boolean` | `false` | Native `readonly`: focusable, copyable, still submitted |
| `invalid` | `boolean` | `false` | Sets `aria-invalid="true"` and switches the error boundary; does not render error text |
| `placeholder` | `string` | — | Native placeholder. It cannot replace a label |
| `clearable` | `boolean` | `false` | Shows the clear button when the field is non-empty and editable. It is the **only** clear entry point, see below. The accessible name comes from the message table |

## There Is Only One Clear Entry Point

`clearable` is the **only** way to clear. `type="search"` goes through exactly the same appearance reset as `type="text"` (`appearance: none` on the native control), so Chromium's built-in search clear button is not preserved — it is engine-specific (Firefox / Safari do not have it), it cannot be customized with tokens, it has no accessible name, and when it coexists with `clearable` there would be two "Clear" buttons.

The `clearable` control is controllable in these respects: a real `<button type="button">`, a 24px hit area, independent hover / focus-visible / forced-colors styles, a translatable accessible name, and consistent behavior across engines.

::: tip This is a decision, not a side effect
Early versions wrote into a comment that "a search box without `clearable` keeps the browser's native clear control", and added a suppression rule for `clearable`. In Chromium neither state renders that button, which means the behavior the comment described was never verified. The contract is now explicit: if you want a clear control, use `clearable`; going back to the engine's native button must be a deliberate decision, not the incidental effect of some CSS reset.
:::

## Text and Localization

The strings the component renders itself (currently only the clear button's accessible name) come from Yue's locale catalog, not from a component prop.

```ts
import ZhCN from '@yue-ui/vue/locale/zh-CN'

// The whole application
app.use(YueUI, { locale: 'zh-CN', packs: { 'zh-CN': ZhCN } })

// Or switch languages in only one subtree: two regions on one page can each differ
import { provideLocale } from '@yue-ui/vue/locale'

provideLocale({ locale: 'zh-CN', packs: { 'zh-CN': ZhCN } })
```

| key | `en-US` | `zh-CN` | Purpose |
| --- | --- | --- | --- |
| `input.clear` | `'Clear'` | `'清空'` | The `aria-label` of the `YueInput` clear button |

`packs` and `messages` are both **partial overrides**: write only the keys you want to change, and the rest are filled in by the fallback chain and never cleared. The default (fallback) locale is `en-US`, and language packs are separate entries (`@yue-ui/vue/locale/zh-CN`); if you do not import them they are not bundled.

For the full explanation — the fallback chain, diagnostics for missing keys, `YueLocaleProvider`, external adapters, plurals and `Intl` formatting — see the [i18n guide](/en/guide/i18n).

::: tip Why not a prop such as `clearLabel`
One prop per string only serves the component that declares it, must be repeated at every call site, and turns "translating" into "editing markup" — every language means editing the template again. The locale catalog centralizes the strings in one place, and the component does not even know that it has been translated.
:::

## Emits

| Event | Payload | Description |
| --- | --- | --- |
| `update:modelValue` | `string` | The two-way binding payload for `v-model` |
| `input` | `Event` (`type` is always `'input'`) | Value changes caused by user input; not emitted during IME composition |
| `change` | `Event` | Native `change`, forwarded as is |
| `focus` | `FocusEvent` | Native `focus`, forwarded as is |
| `blur` | `FocusEvent` | Native `blur`, forwarded as is |
| `clear` | — | Emitted after the clear button clears the field, at the same time as `update:modelValue` |

`change`, `focus`, and `blur` forward the **original DOM event**, so `event.target`, `event.currentTarget`, and modifier keys all remain available.

`input` is the only one that does **not guarantee verbatim forwarding**, and that is deliberate: values produced through an input method are published when composition ends, and the event carrying it may be `compositionend` — which is not an input event at all. So the payload that `input` receives is **always a DOM event with `type === 'input'` and a real `target`**:

- If the browser emitted an `input` for the **final value** during composition → forward that real event (`data`, `inputType`, and `isComposing` all come from the browser);
- Otherwise → **dispatch** a synthetic `InputEvent` (`inputType: 'insertCompositionText'`). It is genuinely dispatched, so `target` / `currentTarget` is the internal `<input>`, rather than fabricating an object beside it that has no `target`.

**Never forward mid-composition events.** Under the Chrome / Safari ordering, when `compositionend` arrives the most recent `input` still carries the intermediate text (for example `zhong`), and forwarding it would make `data` describe a value that is already out of date. The criterion is "whether the value at the time that event was dispatched is still the control's current value".

The synthetic event's `data` is `null`: the component knows the final value but not the text segment the input method inserted, and inventing a delta would be worse than leaving it empty. `event.target.value` and `update:modelValue` are the final value in both cases.

::: tip No intermediate values are submitted during IME composition
The `input` events produced while an input method is composing carry a half-finished string. Submitting it would make the parent re-render the field with the intermediate value, interrupting candidate selection. `YueInput` does not emit `update:modelValue` between `compositionstart` and `compositionend`; it commits once, at `compositionend`.

**One composition commits exactly once**, regardless of the engine's ordering: Chrome / Safari fire `compositionend` before `input`, while Firefox (and CDP-driven Chromium) fire the final `input` first and `compositionend` afterwards, while composition is still open. Both paths can commit, and **if the value has not changed nothing is committed** — so the duplicate arrival is a no-op rather than a second event. The payload used for publication is also always an `input` event, see the table above.
:::

::: warning The field holds its own value
`YueInput` is not a "fully controlled" component: the field holds the current value itself, and `modelValue` is an **external** source of change. Specifically:

- User input → the component updates its own value and emits `update:modelValue`;
- The parent changes `modelValue` (and it differs from the field's current value) → the component adopts it and writes it into the control;
- The parent re-renders but `modelValue` has not changed → nothing happens; the old value is not written back.

Therefore the `clearable` button **does not need** the parent to respond to `update:modelValue` in order to disappear correctly: button visibility and the control's contents read the same value. This is also why the clear example below behaves correctly without two-way binding.

New values pushed by the parent during IME composition are deferred until composition ends — the user's input takes priority, consistent with Vue's built-in `v-model`.
:::

## Slots

| Slot | Position | Description |
| --- | --- | --- |
| `prefix` | Before the input, inside the border | Decorative content. Mark icons yourself with `aria-hidden="true"` |
| `suffix` | After the clear button, inside the border | Decorative content, or the consumer's own control (such as a show-password toggle) |

Slot content is sized uniformly by the component through `--input-icon-size-*`, so an inline SVG will not break the layout even without a `width`. Slots **do not create focus targets** and do not change the value, the selection, or keyboard behavior.

## Native Attribute Routing

`YueInput` uses `inheritAttrs: false` and dispatches attributes **explicitly** to one of two elements. This is part of the public contract:

| Attribute | Lands on | Reason |
| --- | --- | --- |
| `id`, `name`, `autocomplete`, `inputmode`, `required`, `maxlength`, `minlength`, `pattern`, `aria-*`, `role` | The internal `<input>` | Form control semantics; they have no effect on a `<div>` |
| `class`, `style`, `data-*` | The outer `.yue-input` | The component's overall identity, styles, and test hooks |
| `dir` | The outer `.yue-input` | It is a **layout** attribute: the outer element lays out the prefix and suffix content, and the control inherits direction from the outer element. If it were left on the `<input>`, the text inside the field would be mirrored while the prefix and suffix content still laid out in the original order — a "half RTL" field. `lang` is not in this list: it concerns the text itself, so it stays on the control |

Therefore all of the following work directly, without any Yue-specific prop:

```html
<label for="email">Email</label>
<YueInput
  id="email"
  name="email"
  type="email"
  autocomplete="email"
  inputmode="email"
  required
  maxlength="64"
  minlength="3"
  pattern=".+@.+"
  aria-describedby="email-hint"
  class="order-form__field"
  data-testid="email"
/>
<p id="email-hint">Used to receive sign-in links.</p>
```

## DOM Contract

```html
<div class="yue-input yue-input--md">          <!-- field: border, fill, padding, focus ring -->
  <span class="yue-input__prefix">…</span>
  <input class="yue-input__native" />           <!-- the real form control -->
  <button class="yue-input__clear" type="button" aria-label="Clear" />
  <span class="yue-input__suffix">…</span>
</div>
```

The outer `<div>` **is not a control**: it is not focusable, holds no value, does not participate in submission, and has no `role`. All native semantics are on `__native`, so `label for`, `form`, `:invalid`, and autofill work as usual.

The class list:

| Class | Appears when |
| --- | --- |
| `yue-input` | Always |
| `yue-input--sm` / `--lg` | The corresponding `size`; `md` is the base block and adds no modifier class |
| `yue-input__native` | Always |
| `yue-input__prefix` / `__suffix` | The corresponding slot has content |
| `yue-input__clear` | `clearable` and non-empty and editable |
| `is-disabled` / `is-readonly` / `is-invalid` | The corresponding prop is true |

## CSS Token

Component rules read only `--input-*` component tokens. To change the appearance, retarget the tokens; there is no need to override selectors:

| Token | Consumer | Gated |
| --- | --- | --- |
| `--input-background` / `-readonly` / `-disabled` | The fill of the three editability states | Readonly text ≥ 4.5:1 |
| `--input-color` / `--input-color-disabled` / `--input-placeholder-color` | Text, disabled text, placeholder | The first two are gated; the disabled state is exempt and only reported |
| `--input-border-color` / `-hover` / `-focus` / `-invalid` / `-disabled` | The five border states | All ≥ 3:1 |
| `--input-border-width` / `--input-border-radius` | Border geometry | — |
| `--input-height-*` / `--input-padding-inline-*` / `--input-font-size-*` | Size tiers | — |
| `--input-gap` / `--input-icon-size-*` / `--input-affix-color` | Prefix and suffix content | Prefix and suffix text ≥ 4.5:1 |
| `--input-focus-ring-color` / `-width` / `-offset` | Focus ring | Focus boundary ≥ 3:1 |
| `--input-clear-color` / `-color-hover` / `-hit-size` / `-border-radius` / `-glyph-width` | Clear control | Control ≥ 3:1 |
| `--input-duration` / `--input-ease` | Transition | Zeroed out by tokens under `prefers-reduced-motion` |

```css
/* Make the inputs in one form area more compact: retarget component tokens, do not write !important */
.checkout-form {
  --input-height-md: var(--size-28);
  --input-padding-inline-md: var(--space-8);
}
```

::: warning The disabled state makes no WCAG contrast promise
`disabled` controls are explicitly exempt under WCAG 1.4.3, and this design system's disabled state is deliberately quiet: measured at 2.20:1 in light and 3.19:1 in dark. The audit **measures and prints** this number but does not treat it as a gate — setting a threshold the system does not intend to meet is worse than not measuring at all.
:::

## The Single Source for the Size Type

`YueInputSize` is an alias of the package's only `ComponentSize`, and so is `YueButtonSize`:

```ts
import type { ComponentSize } from '@yue-ui/vue'
```

There is only one declaration in the package (`packages/vue/src/shared/size.ts`), and `size.test.ts` asserts at compile time that it matches `@yue-ui/hooks`'s `ComponentSize` and that no second union type has been written out.

## Accessibility Checklist

| Requirement | Implementation |
| --- | --- |
| Accessible name | Provided by `label for`, `aria-label`, or `aria-labelledby`; `id` lands on the real `<input>` |
| Description and error | `aria-describedby` is passed through; error text is `YueField`'s responsibility |
| Validation state | `invalid` → `aria-invalid="true"`; when valid the attribute is **absent** (not `"false"`) |
| Not editable | Native `disabled` / `readonly`, without additionally adding `aria-disabled` / `aria-readonly` and creating a second source of truth |
| Clear control | A real `<button type="button">`, with an `aria-label`, a 24px hit area, and independent hover / focus-visible / forced-colors styles |
| Visible focus | `:focus-visible` draws the focus ring; it does not rely on a color change as the only cue |
| Decorative icons | Marked `aria-hidden="true"` by the caller; interactive controls are not placed inside decorative spans |
| Forced colors mode | System colors replace tokens; the error state is also carried by `aria-invalid`, not by hue alone |
| Motion preference | Under `prefers-reduced-motion: reduce`, `--input-duration` resolves to `0ms` |
