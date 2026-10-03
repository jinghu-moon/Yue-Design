# Input · Guide

This page answers "when to use it, when not to", together with the trade-offs around states, accessibility and composition boundaries. For API details see [Input · API](/en/components/input/api).

## When to use

- You need the user to enter **a single line of text**: a name, an email address, a search term, an amount, an ID;
- You need a native form control: one that takes part in form submission, can be associated with a `<label>`, and is validated by the browser;
- You need to hand the value to `v-model`, and want the input method, selection and autofill to all keep working as usual.

Where it does not fit:

- Multi-line text → `YueTextarea` (the line height, resize and height contracts are all different);
- Number steppers, dates, times, dropdown selects, tag inputs → each one is its own component;
- Read-only information display → use text; do not use a `disabled` input as a layout tool.

## The three boundaries to master

### 1. The input is not responsible for form layout

The label, helper text, error copy, required marker and the organization of `aria-describedby` belong to `YueField`. Squeezing form layout back into the input makes a single control carry both "input" and "layout" at the same time, so a change on either side drags the other along.

`invalid` therefore only does two things: it sets `aria-invalid="true"` and it switches the error boundary. **It does not render error copy** — what is wrong is business information, and the form layer should provide that single source of truth.

### 2. The input does not build in icons

`prefix` / `suffix` are slots. Decorative icons are written by the consumer itself with `aria-hidden="true"`, because only the consumer knows whether that icon is purely decorative. **Do not put interactive controls inside a decorative span**: that produces something which looks decorative but is actually a button, and both the tab order and the accessible name become hard to explain.

When you need a button there are two legitimate paths: `clearable` (the built-in, accessible one), or putting the control in `suffix` while keeping its own semantics — a password visibility toggle, for example.

`clearable` is also the **only** clear entry point: the browser's native search clear button is not kept, because it exists only in some engines, cannot be customized with Tokens, has no accessible name, and when it coexists with `clearable` two of them appear at once. For details see [Input · API](/en/components/input/api#there-is-only-one-clear-entry-point).

### 3. The input does not build in an icon library

The stylesheet shipped with the package contains no icon assets, and references no external fonts or CDN. The cross of `clearable` is drawn with two pseudo-element lines: nothing to download, it scales with Tokens, and it stays visible in forced colors mode.

## States and priority

Six visual states, each corresponding to a set of Tokens:

| State | Trigger | Rules |
| --- | --- | --- |
| resting | default | `--input-background`, `--input-border-color`, `--input-color` |
| hover | mouse hover, and **editable, not readonly, not invalid** | `--input-border-color-hover` |
| focus-visible | keyboard focus | focus ring `--input-focus-ring-*` (does not rely on a color change) |
| disabled | native `disabled` | disabled background, disabled text, `not-allowed` cursor |
| readonly | native `readonly` | `--input-background-readonly`, the text stays readable |
| invalid | the `invalid` Prop | `--input-border-color-invalid` |

Two priority rules are worth remembering on their own:

### Focus in an invalid state

Focus does not override the error boundary. An invalid field's border **stays the error color**, and the focus indication is carried by the focus ring — so keyboard users know both "I am in this field" and "this field has a problem".

If it were the other way round (focus swaps the border to the focus color), the error information would disappear exactly when the user needs it most; and if the two were distinguished only by how dark the color is, users with color vision deficiencies would lose both hints at the same time.

### Disabled wins over invalid

With `disabled` and `invalid` at the same time, the field looks disabled. A disabled field cannot be operated, and drawing an "attention here" error boundary only makes people click something that will not respond. Semantically `aria-invalid` is still there, and it takes effect again once the field becomes editable.

## Accessibility

### The semantics belong to the native control

The outer `<div>` is not the control: no `role`, no `tabindex`, and it does not hold the value. `id`, `name`, `aria-*` and `required` are all on the real `<input>` inside, so:

- `<label for="...">` associates correctly (clicking the label focuses the input);
- form submission, browser validation (`:invalid`) and autofill work the way the platform does it;
- what a screen reader reads is a standard text box, not "a div with an input inside it".

### Accessible name

The component does not provide a `label` Prop. The name comes from `label for`, `aria-label` or `aria-labelledby`, and all three pass straight through to the inner `<input>`. A placeholder is not a name — it disappears once something is typed, and screen reader support for it is inconsistent.

### The clear button

- It is a real `<button type="button">`: reachable by Tab, triggerable with Enter/Space;
- It has an `aria-label` taken from the `input.clear` key in the locale catalog (English `Clear` by default). It is not a component Prop — one string per Prop serves a single component, has to be repeated at every call site, and turns "translation" into "changing markup";
- Its hit area is 24px, larger than the cross it draws, satisfying the minimum target size;
- It has its own `:hover` and `:focus-visible`, because it is an independent Tab stop and the input's focus ring does not represent its focus;
- After clearing, focus returns to the input: clearing is the start of typing again;
- Appearing when the value is disabled, readonly or empty makes no sense, so it does not appear.

### Keyboard and input methods

- Tab order is DOM order: prefix content → input → clear button → suffix content;
- During input method composition the intermediate value is not handed to the parent component, avoiding a re-render that interrupts candidate selection;
- A readonly field can still receive focus, so its value can be selected and copied with the keyboard.

### Reduced motion

`--input-duration` points at `--motion-duration-interaction`, and the Token package zeroes it under `prefers-reduced-motion: reduce`. So the component stylesheet contains no second `prefers-reduced-motion` block — two declarations are two places that need to be kept in sync, and what verification asserts is the **computed transition duration**, not whether that media query appears in the source.

### Forced colors mode

Under `forced-colors: active` system colors replace Tokens: `Field` / `FieldText` for the field, `GrayText` for disabled, `Mark` for the error boundary, `Highlight` for the focus ring. Hue is unavailable here, so any state expressed by hue alone is unreliable — which is also why the error state is always carried by `aria-invalid`, and focus is always carried by the ring rather than by border color alone.

## Trade-offs with TDesign

The reference implementations are `refer/tdesign-common/style/web/components/input` and `refer/tdesign-vue-next/packages/components/input`. What is absorbed is the way things are organized, not the number of APIs.

### Adopted

| Reference implementation | What Yue does |
| --- | --- |
| The four status kinds: basic / disabled / invalid / tips | Treated as the status contract fixed in stage one, bound to `aria-invalid` |
| Large, medium and small sizes | Reuses the control size contract; no new `sm \| md \| lg` set is invented |
| Prefix / suffix content | `prefix` / `suffix` slots, not bound to an icon library |
| Clearable | Implemented in stage two as a real `<button type="button">`, preserving input focus |
| Native `maxlength` | Passed straight through, not wrapped |
| Outer wrapper + native input | The structure is adopted, but **the DOM contract is fixed before the styles are written** (see below) |
| A state × theme matrix for documentation and regression | Adopted: contrast is measured cell by cell in the browser, including every interaction state |

### Not adopted

| What the reference implementation does | Why it is not copied |
| --- | --- |
| `autoWidth` | Requires ResizeObserver, font measurement and SSR handling; the benefit does not justify the complexity |
| `format` / `formatter` | Formatting changes the relationship between the "displayed value" and the "edited value"; a separate formatter composable should come first |
| `maxcharacter` / `allowInputOverMax` | Counting by Chinese character weight involves an algorithm, a truncation strategy and internationalization, and should be its own RFC rather than a hidden capability in the first version |
| `showCount` | The first version passes `maxlength` through first; showing a count has to wait until the counting rules are settled |
| Password rule hints | Business-level strength rules are not part of a basic input control |
| A large number of icon Props (`prefixIcon` and so on) | Would tie the component to one icon library; slots are already enough and force no dependency |
| Injecting the visibility toggle inside Input | Composition is left to suffix or a later `YuePasswordInput`; no state is hidden inside the basic component |
| A built-in Label / helper text / error text | That is the responsibility of `YueField` |
| Concatenating several controls into a "composite input" | Left to a container or an Addon; `YueInput` is responsible for one input only |

### Why the outer wrapper needs the DOM contract first

Introducing a wrapper layer changes four things at once: where focus belongs, how disabled shows, the target of attribute passthrough, and form association. If the styles are written first and only then you decide whether `id` belongs on the `<div>` or on the `<input>`, every test and every piece of documentation written against those styles becomes invalid.

So the order is reversed: **fix the contract first, write the styles second**. The contract is "the outer layer only draws; the control is inside", `id` / `name` / `aria-*` all go to the inner `<input>`, and `class` / `style` / `data-*` stay on the outer layer. Each of those four things has exactly one clear answer, and only then do the styles have a stable place to land.

## What does not exist yet

The following capabilities are **deliberately not implemented**, because there is no real consumer, no test and no Token contract for them yet:

- `borderless`: requires defining surface levels and the corresponding focus rules first;
- `align`: has to wait for real numeric or code input scenarios;
- `YueField`: label, description, error, required, `aria-describedby` and layout;
- `YueTextarea`: reuses the state and size contracts, but has its own line height, resize and height Tokens.

The completion standard for `YueInput` is not "the API count is close to TDesign", but: **a native input control that keeps correct semantics, visuals and verifiable behavior across different themes, states, sizes and consumer bundling methods.**
