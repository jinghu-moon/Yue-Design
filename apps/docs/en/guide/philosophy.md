# Design philosophy

These principles are not a manifesto; they are constraints already written into the Token source code. Each one points to code that really exists in the repository.

## 1. Layers, not stacking

The cascade layer order is declared once in `packages/tokens/src/index.css`:

```
primitives < semantics < components < implementations < demo
```

- **primitives** — stable scales and raw palettes (`--space-*`, `--neutral-*`, `--azure-*`, fonts, motion)
- **semantics** — themes and interaction roles (`--surface`, `--text-primary`, `--border-control`, Accent)
- **components** — component geometry and visual contracts (`--button-height-md`, `--input-border-color`)
- **implementations** — concrete component selectors (`.btn`), published in `@yue-ui/vue/style.css`

Components consume only semantic and component roles, and never read the raw palettes directly. So swapping a set of Accent values requires touching no component selector.

## 2. Hierarchy does not rely on shadows

In light mode the hierarchy surfaces are all white, so shadows cannot carry the job of expressing hierarchy. Hierarchy is therefore marked by **border roles**:

```css
--surface-level-2-border: var(--border-divider);
--surface-level-3-border: var(--border-default);
```

Even with shadows fully disabled, Level 3 can still be told apart from Level 2. This is also the only hierarchy cue that survives in forced-colors mode.

## 3. Interaction states use opacity, not new colors

The visual strength of hover, pressed and dragging states is expressed by the opacity scale plus `color-mix()`:

```css
--opacity-hover: .08;
--button-ghost-background-hover:
  color-mix(in srgb, var(--button-ghost-color) calc(var(--opacity-hover) * 100%), transparent);
```

The benefit is that state colors always follow the background and foreground they sit on, so there is no need to hand-write a set of state colors for every theme and every Accent.

## 4. Contrast is a gate, not a suggestion

32 foreground/background pairs × light/dark = 64 checks, and if any single one falls below the threshold the build fails. This set of pairs was not reinvented: it was extracted verbatim from the audit embedded in the prototype HTML and is verified in reverse by tests, ensuring it does not quietly drift during migration. See [Token audit](/en/tools/).

## 5. The theme switch is an attribute, not a branch

Both the theme and the Accent are switched through `data-*` attributes, and neither components nor JS need to know which color scheme is currently active:

```html
<html data-theme="dark" data-accent="neutral">
```

The documentation site maps VitePress's `html.dark` onto this contract (see `.vitepress/theme/useTokenAppearance.ts`), so the docs' dark-mode switch and the components consume the same set of Tokens.

## 6. Icons do not go into the Token package

For the complete sizing, slots, `currentColor` and accessibility rules, see [Design / Icon](/en/design/icon).

The Tabler icon font appears only in the prototype and has never been referenced by `tokens/` or `components/*.css`. Components receive icons through slots and are bound to no icon library:

```vue
<YueButton>
  <template #leading><IconSearch /></template>
  Search
</YueButton>
```

## 7. Component rules do not go into layers

The Token layer order (`primitives < semantics < components < implementations < demo`) solves the priority between Tokens, which is why Token values are written inside layers.

Component rules are the opposite: unlayered styles take priority over every layer, so once component rules are put into `@layer`, the host's unlayered resets (VitePress's `button` reset, Tailwind Preflight, normalize.css) will beat them — button fill colors will quietly disappear in real projects. So `@yue-ui/vue/style.css` is **unlayered**, and overrides take the path of re-pointing Component Tokens.
