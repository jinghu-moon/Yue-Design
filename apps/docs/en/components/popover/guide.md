# YuePopover Guide

## When to use it

Use Popover for interactive content near a trigger without blocking the rest of the page: filters, secondary actions, and contextual forms are good examples.

Use a future `YueMenu` for a set of menu items, `YueDialog` for a required modal flow, and `YueTooltip` for non-interactive explanation.

## Trigger and state

The default is `trigger="click"`. Use `v-model` when the parent owns state; omit `modelValue` for the uncontrolled mode. `manual` is useful with an external anchor or custom event source.

```vue
<YuePopover v-model="open" trigger="manual" :anchor="anchorEl">
  <HelpPanel />
</YuePopover>
```

## Positioning and Teleport

`placement` is a preference, not a hard promise: the surface flips and shifts when space is limited. Content is teleported to `body` by default, and can be kept in place with `teleport="false"` or sent to another target. Floating UI supplies the DOM positioning core; Yue owns lifecycle, semantics, and event boundaries.

The enter animation is a `clip-path` reveal: the surface grows out of the edge that faces its trigger, along the resolved `placement`'s main axis, while it fades in — a `bottom` surface unfolds downward from its top edge, a `top` surface upward from its bottom edge, and `left`/`right` likewise. When the placement flips, the reveal edge follows the resolved result. Nothing stays clipped once the animation ends, so the shadow is not trimmed.

## Focus and closing

Popover does not steal focus or trap it. Escape closes only the topmost instance. A pointerdown outside the trigger and content closes it when `closeOnOutside` is enabled. If the user has moved focus elsewhere, closing does not steal it back.

## Not a universal Dialog

Changing `role` does not add menu navigation or modal behavior. Dedicated components should reuse the neutral overlay hooks and implement their own APG pattern.

## Design decisions

The design borrows Vuetify's composable layering and Floating UI's positioning boundaries. It rejects copying ChengJing's limited viewport algorithm and keeps third-party positioning types out of the Yue public API. No built-in text means no locale key is needed.
