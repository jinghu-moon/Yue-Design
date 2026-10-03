# Design

Yue Design's design specification answers one question: **when no component can be reused directly, how should the interface still stay consistent, readable, and accessible?**

This specification absorbs the TDesign principles of content first, stable hierarchy, comfortable reading, and verifiable accessibility, but it does not copy any product's brand colors, icon assets, or page structure. Yue's rules must be able to land on tokens, CSS, or component tests.

## Design principles

| Principle | How Yue puts it into practice |
| --- | --- |
| Content first | Text, data, and primary actions carry the highest visual weight; decoration must not seize interaction focus |
| Stable hierarchy | Pages, surfaces, component surfaces, borders, and text use semantic tokens; no raw color values inside components |
| Low distraction | Dark mode lowers background brightness and shadow interference; interaction states prefer a unified opacity scale |
| Verifiable | Body text contrast is at least `4.5:1`, non-text borders and focus at least `3:1`; the gate runs on every build |
| Respect preferences | `prefers-reduced-motion`, `forced-colors`, and keyboard focus are all part of the component contract |
| Composable | Yue provides tokens, layout, and slot contracts; it does not monopolize an application's icon library, routing, or business visuals |

## The boundary between design and code

- `@yue-ui/design-tokens` provides color, typography, size, layout, and motion tokens across technology stacks.
- `@yue-ui/vue` provides component structure, interaction states, and accessibility behavior.
- The preview controls on the documentation site are only consumer examples, not a new source of design tokens.
- Reference pages live in `refer/design-refer/` and serve only as research material; the specification is governed by this directory and the CSS inside the packages.

## Page index

- [Color](./color): semantic roles, state colors, and contrast boundaries.
- [Dark mode](./dark-mode): mode switching, hierarchy, and reading comfort.
- [Typography](./typography): type scale, line height, font weight, and numeric/code fonts.
- [Icon](./icon): slot, size, and accessibility contracts when there is no built-in icon library.
- [Layout](./layout): containers, spacing, breakpoints, and responsive behavior.
- [Motion](./motion): duration, easing, reduced motion, and motion tradeoffs.
