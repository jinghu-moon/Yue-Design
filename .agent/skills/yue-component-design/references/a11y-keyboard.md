# Accessibility and keyboard routing

Start with native HTML semantics; use ARIA only to express a state or relationship the native
element cannot. Follow the WAI-ARIA Authoring Practices pattern for custom composites.

Record a table of key, target state, prevented default and emitted event. Typical patterns:

| Pattern | Required keys |
| --- | --- |
| button/link | native Enter/Space behavior; Tab focus |
| input | native editing and Tab order |
| checkbox/switch | Space toggles |
| radio/tabs/menu | APG arrow/Home/End pattern for the chosen manual/automatic mode |
| dialog/drawer | initial focus, Escape, Tab trap and focus restore |
| tooltip | focus/hover show, Escape close when interactive |

An icon-only control needs an accessible name. Decorative icons are `aria-hidden="true"`;
interactive icons remain real controls. Disabled, loading, readonly, invalid and selected must
be distinguishable semantically, not by hue alone. A focus ring is independent from hover color.

Run axe in the browser harness for meaningful pages, but treat it as a supplement: axe cannot
prove event ordering, focus restoration, contrast in every dynamic state or correct business
semantics. Add real browser assertions for those.

## forced-colors (Windows High Contrast)

`@media (forced-colors: active)` replaces most custom colors with system keywords. Any
component that paints state purely through a CSS custom property background or border will
lose that state signal unless you add an explicit override.

**Required for every component:** add a `forced-colors` block that restores all visual states
using only the system color keywords. Use `ButtonText`/`ButtonFace` for interactive controls,
`Highlight`/`HighlightText` for selected/checked states, `GrayText` for disabled text, and
`transparent` to remove decorative fills that would otherwise clash.

```css
@media (forced-colors: active) {
  .yue-tag {
    /* Let the OS border carry the boundary — remove the custom fill entirely */
    forced-color-adjust: none; /* opt out only if you are painting everything yourself */
    border-color: ButtonText;
    background-color: ButtonFace;
    color: ButtonText;
  }

  .yue-tag.is-disabled {
    color: GrayText;
    border-color: GrayText;
  }

  /* Checked/selected state must be distinguishable without color */
  .yue-tag--check.is-checked {
    background-color: Highlight;
    color: HighlightText;
    border-color: Highlight;
  }

  /* Focus ring: the OS draws its own when forced-color-adjust is auto,
     but if you opted out above you must draw it yourself */
  .yue-tag__close:focus-visible,
  .yue-tag--check:focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }
}
```

The default `forced-color-adjust: auto` lets the browser remap your tokens automatically.
Use `forced-color-adjust: none` only when the automatic remapping breaks a critical state
distinction — and then paint all states explicitly. Never use `forced-color-adjust: none`
without a complete set of keyword overrides.

## prefers-reduced-motion

Every `transition` and `animation` declaration must be suppressed or replaced when the user
has requested reduced motion. Suppressing means setting `transition: none` or
`animation: none`, not just slowing down. A component may retain non-motion feedback (e.g.
an instant opacity change for disabled state) when the transition only conveys aesthetics.

```css
/* Inside the component's CSS, after the transition declarations: */
@media (prefers-reduced-motion: reduce) {
  .yue-tag {
    transition: none;
  }

  .yue-tag__close {
    transition: none;
  }
}
```

If a transition carries functional feedback (e.g. a loading spinner or an expanding panel
that communicates progress), replace it with an instant-snap equivalent, not with `none`:

```css
@media (prefers-reduced-motion: reduce) {
  .yue-panel {
    /* Still shows open/closed; removes the motion */
    transition: visibility 0s;
  }
}
```

**Checklist:** every `transition` and `@keyframes` in the component CSS has a corresponding
`prefers-reduced-motion` block. Missing one is a review failure.

Official references: [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/),
[ARIA Authoring Practices patterns](https://www.w3.org/WAI/ARIA/apg/patterns/),
[WCAG 2.2 contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
[CSS forced-colors](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors),
[prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion).
