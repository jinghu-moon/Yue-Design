# Button guide

This page describes how the button takes part in page design. See [API](./api) for the API and default values, see [examples](/en/components/button) for the real rendering of all states and variants, and see [anatomy](/en/components/button#anatomy) on the examples page for what the component is made of.

## When to use

Use Button when the user needs to trigger a clear, closed-loop action, such as save, submit, delete or confirm. Do not disguise text links that only navigate to another page as buttons; a set of actions that needs to open a menu should consider a menu or a toolbar.

## Hierarchy

- A page or one clearly defined task area usually keeps only one highest-priority `primary + solid` action.
- Cancel, back or secondary actions use `default`, `outline` or `text`, so they do not compete with the primary action for visual focus.
- Destructive actions use `danger`, and the copy states the consequence explicitly; do not rely on red alone to convey risk.
- `success` expresses completion or confirmation, `warning` expresses "needs attention but nothing has gone wrong yet"; neither should replace all ordinary actions, and do not use `warning` to mean an error.

```vue
<div class="actions">
  <YueButton theme="primary">Save</YueButton>
  <YueButton variant="outline">Cancel</YueButton>
</div>
```

Keep a gap of `--gap-control-group` or `--space-8` between buttons. Do not jam multiple buttons together with no gap into a single visual colour band, unless they really are one group of mutually exclusive controls.

## Choosing a variant

| Variant | Suitable scenario | Notes |
| --- | --- | --- |
| `solid` | The primary action in an area | Do not place several equally primary actions in the same area |
| `outline` | Secondary actions that need a clear boundary | Lower the visual weight when paired with solid |
| `dashed` | Low-frequency, expected actions such as "New" or "Add configuration" | It reads as "something more can be added here"; do not use it for delete or submit |
| `text` | Toolbars, dense areas, containers that already have a background | It keeps the full click area, so it is safe for lightweight actions on the main path; you must confirm that hover/pressed are still recognisable |
| `link` | Inline, table or lightweight navigation actions | It has **no fixed height and no horizontal padding**, so the click area is noticeably smaller; the copy should read like a link, it should not carry high-risk actions, and do not treat it as a "lighter button" |

## Icons and labels

Icons can only reinforce recognition; they cannot replace an action name that must be read. Icons are passed through the `leading` / `trailing` slots and inherit the Button's `currentColor`.

```vue
<YueButton theme="primary">
  <template #leading><SaveIcon aria-hidden="true" /></template>
  Save
</YueButton>
```

Icon-only buttons use `shape="circle"` and must provide an accessible name:

```vue
<YueButton shape="circle" aria-label="Search" variant="outline">
  <template #leading><SearchIcon aria-hidden="true" /></template>
</YueButton>
```

## States

### Disabled

Disabled means the action cannot be performed under the current conditions. It cannot be the only way of explaining why something failed; provide an explanation nearby. A native `<button>` uses the platform `disabled`; an `a` or a custom tag uses `aria-disabled` and prevents activation.

### Loading

loading means the action has started but the result has not come back yet. It prevents repeated activation and sets `aria-busy="true"`, but it does not set the native `disabled`, so the user's focus does not suddenly disappear. The copy can change from "Submit" to "Submitting", so the state does not depend on the spinner alone.

Two structural conventions are hard requirements, not style preferences:

- **Do not swap `leading` / `trailing` for other nodes just because of loading.** The content stays in place and the loading layer covers it, so the button width does not jump before and after the request. When you need another indicator, use the `loader` slot, which renders inside the same loading layer.
- **Do not hide the content with `display: none` / `visibility: hidden`.** That moves the text out of the accessibility tree; the component uses `opacity: 0`.

There is one more semantic boundary: **`loading` is not the same as `disabled`**. This is easiest to get wrong when [rendering as `<a>` or a custom component](/en/components/button#rendered-as-a-or-a-custom-component) — a loading link is still a link reachable by Tab, and the component only outputs `aria-busy`: it writes neither `aria-disabled` nor `tabindex="-1"`. For a genuinely unavailable action use `disabled`; for "being processed, please wait" use `loading`.

### Selected (active)

`active` is the semantics of a **toggle button**: it outputs `aria-pressed`, so screen reader users hear "pressed / not pressed". The three states are intentional — an ordinary button that does not receive `active` outputs no `aria-pressed` and is not read as a toggle button.

### Groups and segmented controls

| Scenario | What to use | Rationale |
| --- | --- | --- |
| Several options where one must be the current one (view switching, alignment) | `YueButtonToggle` + `YueButtonToggleItem` | The choice is mandatory, every item in the group outputs `aria-pressed`; clicking the current item again does not deselect it, because "nothing is selected" cannot answer "which one is it now" |
| A set of unrelated toggles (bold / italic) | `YueButtonGroup` + each `YueButton`'s own `active` | Semantically these are several independent toggles, and all of them can be off |
| Only visually lined up together | `YueButtonGroup` | It only merges the border radius and provides `role="group"`, with no state of its own |

Two boundaries that are easy to get wrong:

- **A group is not "set eight props at once".** `YueButtonGroup` has no `theme` / `variant` / `size`. To make the buttons of a whole area more compact, re-point the `--button-*` Component Token on the container — that is exactly what the "compact" demo in the toolbar does.
- **The accessible name of a group is mandatory.** The group itself has no text, so `aria-label` or `aria-labelledby` is required.

::: tip Keyboard navigation
Arrow keys and roving tabindex are not implemented yet, so items in a group are ordinary Tab stops for now. Until then, treat a segmented control as "a group of clickable buttons" and do not rely on arrow keys to move between them.
:::

### Block

`block` is for narrow-screen forms, bottom actions, or a single action that must clearly fill the container. Do not make every button block inside a wide desktop toolbar.

## Responsive design and theming

- Button itself binds to no page breakpoint; the page decides the arrangement through container layout and `block`.
- On small screens prefer letting button groups wrap; do not cause horizontal scrolling with fixed widths.
- Light/dark switching is done by Token semantic roles; the component does not branch on the theme at runtime.
- For theming, prefer re-pointing the `--button-*` tokens; do not copy the whole set of `.yue-button` selectors.

## Self-check list

- Does this area have only one highest-priority action?
- Does the copy state the action and the result?
- Does disabled have a nearby explanation of the reason?
- Does loading prevent repeated submission, preserve focus, and leave the button size unchanged?
- Is an icon marked decoratively with `aria-hidden`? Does an icon-only button have a name?
- Is `active` used only where a toggle button is genuinely available (an ordinary button should not output `aria-pressed`)?
- Does the segmented control have an `aria-label`, and have you confirmed that "one item must be selected"?
- Are light mode, dark mode, narrow screens and keyboard focus all readable and operable?
