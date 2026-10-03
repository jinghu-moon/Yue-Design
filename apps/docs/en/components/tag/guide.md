# Tag · Guide

This page covers the design decisions behind Tag. For live examples see [Examples](/en/components/tag); for the full interface see [API](./api).

## When to use Tag

Tag is for **non-interactive status labelling**: showing categories, state badges, property labels, or filter chips. It is not a button — a `@click` listener works, but the default root element is `<span>` with no interaction semantics.

When you need selectable state (for example a multi-select filter panel), use `YueCheckTag` instead. `YueCheckTag` carries `role="checkbox"` semantics to correctly declare what it does.

## Choosing theme and variant

**Theme** conveys meaning:

| Theme | When to use |
| --- | --- |
| `default` | Neutral label with no specific meaning |
| `primary` | Emphasis — highlighting a property or category |
| `success` | Passed, active, enabled |
| `warning` | Pending, needs attention |
| `danger` | Error, rejected, destructive |

**Variant** controls visual weight:

| Variant | Best for |
| --- | --- |
| `filled` | Highest weight; use for counts or critical states that need to stand out |
| `tint` | Good default when many tags appear together; subtle background, low distraction |
| `outline` | Lightweight, neutral; common for category labels |
| `tint-outline` | Slightly more color presence than outline alone; works well in tables or cards |

Mixing all four variants on one page creates visual noise. Pick one as the baseline and reach for a second only when you need to distinguish importance levels.

## Custom color (color prop)

The `color` prop accepts any valid CSS color (`#hex`, `rgb()`, `hsl()`, etc.), intended for **user-generated content tags** such as user-defined categories or repository labels.

Derivation logic:

1. Parse the color's RGB values via an off-screen canvas
2. Compute luminance L using the WCAG relative luminance formula
3. `filled`: background is the input color; text is dark when L > 0.179, white otherwise
4. `tint`: background is `rgba(r,g,b,0.12)`, text is the input color itself
5. `outline` / `tint-outline`: both border and text are the input color; `tint-outline` adds a tinted background

The current implementation is a simplified approximation; full APCA contrast is deferred as a follow-up. When dark mode support matters, the consumer is responsible for providing an appropriate `color` value per theme — `color` does not adapt automatically.

## Close behavior

The close button (`closable`) only fires a DOM event. **The tag is not removed from the DOM automatically.** Removal is the consumer's job — typically by updating an array so that `v-for` naturally removes the element.

```vue
<YueTag
  v-for="tag in tags"
  :key="tag.id"
  closable
  @close="removeTag(tag.id)"
>{{ tag.label }}</YueTag>
```

When `disabled`, the close button is not rendered at all — not just disabled visually. A disabled tag expresses "this property cannot be changed," and showing an unclickable close button would be confusing.

## CheckTag controlled vs. uncontrolled

| Mode | How | When |
| --- | --- | --- |
| Uncontrolled | No `modelValue`; use `defaultChecked` for initial state | Independent toggle; external code does not need to track the state |
| Controlled | Pass `v-model` (`modelValue` + `update:modelValue`) | Parent needs to read or reset the checked state |

In uncontrolled mode the component owns its state internally. The `change` event still fires, so the parent can observe but not control the value.

## Accessibility requirements

**YueTag**

- Default is `<span>` — no interaction semantics. If the tag is clickable (e.g. jumps to a filtered view), use `tag="a"` or `tag="button"`; otherwise keyboard users cannot reach it.
- `disabled` outputs `aria-disabled="true"`. Native `disabled` is not used because `<span>` does not support it.
- The close button's accessible name comes from the i18n key `tag.closeLabel` ("Remove tag" in English). Consumers can override this per subtree via `YueLocaleProvider`.
- Icon slot content is wrapped in an `aria-hidden="true"` container to prevent screen readers from announcing it twice.

**YueCheckTag**

- Uses `role="checkbox"` + `aria-checked`, not a toggle button + `aria-pressed`. The semantic question is "is this item selected?", which is what checkbox expresses.
- `tabindex="-1"` removes a disabled CheckTag from the tab order; focus ring style matches the close button.
- Both Space and Enter toggle the checked state, matching native checkbox behavior.
- Disabled state outputs `aria-disabled="true"` while keeping `role="checkbox"`, so the element remains discoverable but non-interactive.
- For a filter panel containing several CheckTags, wrap them in a `role="group"` with an `aria-label`:

  ```html
  <div role="group" aria-label="Filter by technology">
    <YueCheckTag v-model="...">Vue</YueCheckTag>
    <YueCheckTag v-model="...">React</YueCheckTag>
  </div>
  ```

## maxWidth truncation

Truncation uses CSS `overflow: hidden; text-overflow: ellipsis`. When active, a `title` attribute is added to the root element so the full text appears on hover. Pass a number (treated as px) or a string (`'8em'`).

Do not use truncation as a substitute for reasonable content length constraints. If tag text comes from user input, cap it at the storage or validation layer; truncation is visual protection, not a data contract.
