# Components

Components are delivered one by one along the same template: component source → package entry → documentation page → tree-shaking verification → tarball consumption verification. Button was the first to go through the whole chain, and Input was the second — it also verified that "single-component entries are isolated from each other", something that cannot be checked when there is only one component.

## Implemented

| Component | Status | Docs |
| --- | --- | --- |
| Button family: `YueButton`, `YueButtonGroup`, `YueButtonToggle`, `YueButtonToggleItem` | Done | [Examples](./button) · [API](./button/api) · [Guide](./button/guide) |
| `YueInput` | Done | [Examples](./input) · [API](./input/api) · [Guide](./input/guide) |

Button is **a component family**: a single button, a group that puts buttons together, a segmented control that holds a `v-model`, and a button where "one is a certain value". All four components share one stylesheet (`@yue-ui/vue/button.css`) and the same package entry (`@yue-ui/vue/button`), but the selection logic exists only in `YueButtonToggle` — `YueButton` does not know that a "group" exists.

## The three contracts of component documentation

Every mature component is split across three pages:

- **Examples**: real, runnable components that verify styles, states and interactions.
- **API**: Props, Slots, Events, entries and Tokens compiled from the TypeScript public types.
- **Guide**: when to use it, how to choose a variant, how to compose it, and accessibility considerations.

The three pages serve trying things out, development and design decisions respectively, avoiding a single long page carrying three reading tasks at once.

## Unified requirements for component development

Before adding a component, read the [Yue Component Design Skill](https://github.com/jinghu-moon/Yue-Design/blob/main/.agent/skills/yue-component-design/SKILL.md).
It sets unified rules for component classification, API freezing, the Token matrix, accessibility, three-page documentation, tree-shaking and real-browser acceptance,
so that every component does not reinvent its own set of design and testing standards. The detailed checklist is in the repository at
[`.agent/skills/yue-component-design/references/acceptance-checklist.md`](https://github.com/jinghu-moon/Yue-Design/blob/main/.agent/skills/yue-component-design/references/acceptance-checklist.md).

## Why vertical slices first

The prototype HTML contains a batch of components: buttons, forms, tags, lists, states, overlays, boxes and so on. Rewriting them all as Vue in one go would produce a large change with no way back, and until then there would be no way to verify whether "the packaged output can be consumed by an external project".

So the order is: **first take one component all the way from component source to documentation page to tarball consumption**, then replicate it horizontally.

## Fixed conventions for every component

- Class names use BEM: `.yue-button`, `.yue-button--primary`, `.yue-button__icon`
- Only consume its own Component Tokens (`--button-*`, `--input-*`); never write raw colour values, never read primitive Tokens directly
- **Do not use `<style scoped>`** — styles apply globally, which is the only way the outside can override and theme them
- **Component styles do not go into any `@layer`**. Unlayered styles take precedence over all layers, so once component rules are written into a layer, the host environment's unlayered reset (VitePress's `button { background-color: transparent }`, Tailwind Preflight, normalize.css) will win over it — a component placed in a layer will silently lose its fill colour in a real project. Layer order is declared exclusively by the Token package, to manage Tokens
- Component JS does not import CSS; styles are imported explicitly through `@yue-ui/vue/style.css` or `@yue-ui/vue/<component>.css`
- The root entry only does named exports; full registration only happens in `@yue-ui/vue/plugin`

## Hard requirements of this documentation

Component pages must **reference the real `@yue-ui/vue` components**, not hand-written HTML examples. The example code and what the page renders must be the same component and the same styles, otherwise the documentation will drift ahead of the implementation.

The documentation tables are not hand-written snapshots either: `corepack pnpm audit:docs` checks the type definitions, the `defineProps` / `defineEmits` / `<slot>` in the SFCs, the API page tables and the attribute names used in the examples item by item. Renaming a prop without updating the table will make this command fail, rather than leaving behind a plausible-looking but wrong description.

Subsequent components (`YueTag`, `YuePopover`, `YueDialog`) follow the same template. Of these, only `YuePopover` and `YueDialog` start to introduce Reka UI.
