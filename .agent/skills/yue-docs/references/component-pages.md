# Component documentation pages

## Example page

Show default usage, supported variants/sizes, states, slots, interaction, dark mode and the
relevant mobile constraint. Use executable Vue examples and expose meaningful controls; do not
write explanatory text that the rendered example contradicts.

## API page

Document imports and CSS entry, Props, Slots, Emits, models, exposed methods, DOM/attribute
routing, component tokens, accessibility output, locale keys and intentional limitations. The
table is a public contract; keep it synchronized with `types.ts` and the SFC.

## Guide page

Explain when to use the component, when not to use it, composition patterns, reference/design
decisions, accessibility, and deliberate non-features. Link to API instead of duplicating tables.

For a breaking development-stage redesign, state the old and new behavior and why the cleaner
contract wins. Do not add compatibility prose for an API that no longer exists.
