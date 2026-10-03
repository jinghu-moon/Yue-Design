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

Official references: [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/),
[ARIA Authoring Practices patterns](https://www.w3.org/WAI/ARIA/apg/patterns/),
[WCAG 2.2 contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
