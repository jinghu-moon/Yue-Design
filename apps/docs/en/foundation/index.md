# Foundations

The `@yue-ui/design-tokens` package is pure CSS with no build step. It consists of three token layers and one implementation layer, totalling **451 unique token names** (568 declarations, including dark and Accent overrides).

## Layers and scale

| Layer | File | Declarations | Contents |
| --- | --- | ---: | --- |
| `primitives` | `src/primitives.css` | 212 | Scales, fonts, motion, raw palette |
| `semantics` | `src/semantics.css` | 134 | Theme and interaction roles, Accent |
| `components` | `src/components.css` | 222 | Component geometry and visual contract |
| `implementations` | `src/components/*.css` | — | Prototype-stage component selectors (`.btn` and others), progressively taken over by `@yue-ui/vue` |

Grouped by token name:

| Category | Count |
| --- | ---: |
| Raw palette (`--neutral-*`, `--azure-*` …) | 68 |
| Component contracts (`--button-*`, `--input-*` …) | 216 |
| Semantic roles (`--surface`, `--text-*`, `--border-*` …) | 61 |
| Space / size / radius / stroke | 36 |
| Font / font size / line height | 26 |
| Motion / opacity / elevation | 18 |
| Accent roles | 18 |

## Four modes

The token package supports four forms at once, all switched through `data-*` attributes or media queries, with no JS branching required:

```html
<html data-theme="dark" data-accent="neutral">
```

- **Light** — `:root`
- **Dark** — `[data-theme=dark]`, which also sets `color-scheme: dark`
- **Accent** — `[data-accent=neutral]` overrides the whole `--accent-*` set; the default azure needs no attribute
- **Forced colors** — under `forced-colors: active` it preserves hierarchy and state cues (see `src/components/box.css`, `overlay.css`)

## How to reference it

```css
/* Application entry: import all tokens at once */
@import '@yue-ui/design-tokens/index.css';
```

```js
// Or let the bundler handle it
import '@yue-ui/design-tokens/index.css'
```

The package exports two entries, `index.css` (token layers) and `components.css` (implementation layer); the layer order is
declared by `index.css`, so **tokens must load before component styles**.

## Design guidelines

For color, dark mode, typography, icons, layout and motion principles, see [Design guidelines](/en/design/). This page only covers
token hierarchy, load order and the CSS API; design decisions are not maintained in a second copy here.

## Coming soon

- A token browser (reading the CSS inside the package directly, rather than maintaining a second inventory)
