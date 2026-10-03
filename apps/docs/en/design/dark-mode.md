# Dark mode

Dark mode is not about replacing white with black, but about redistributing surfaces, text, borders, and status colors so that hierarchy and readability still hold in low-light environments.

## Four rules

1. **Content first**: body text and primary actions keep the highest recognizability, while backgrounds and decoration recede.
2. **Comfortable reading**: use near-black surfaces instead of pure black backgrounds, avoiding large areas of highly saturated color that cause visual vibration.
3. **Hierarchy does not invert**: `--page`, `--surface`, `--surface-subtle`, and `--surface-component` still express the hierarchy from the page down to controls.
4. **Verifiable**: every theme must pass the token contrast gate, and must keep a clear keyboard focus and disabled state.

## Usage

```html
<html data-theme="dark" data-accent="azure">
```

The token package overrides the semantic roles through `[data-theme=dark]` and sets `color-scheme: dark`. The documentation site syncs VitePress's `html.dark` to that attribute, so previews and the documentation shell never end up in a state where one is light and the other is dark.

## Current contract

| Level | Dark role |
| --- | --- |
| Page | `--page: #101010` |
| Content surface | `--surface: #181818` |
| Subtle surface | `--surface-subtle: #202020` |
| Control surface | `--surface-component: #2b2b2b` |
| Primary text | `--text-primary: #f5f5f5` |
| Secondary text | `--text-secondary: #b8b8b8` |
| Placeholder text | `--text-placeholder: #858585` |

These values are Yue's product contract; they do not require copying TDesign's color values or algorithms. When adding a theme, you must check the hierarchy order, contrast, and status colors at the same time, rather than only replacing the background color.

## Things to note

Theme attributes are usually placed on the application root node. Because CSS custom properties inherit, a nested `data-theme="light"` cannot automatically revoke an ancestor's dark tokens; when a local theme is needed, you should establish a complete theme scope instead of overriding a single background color.
