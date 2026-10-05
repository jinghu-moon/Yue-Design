# Foundations

The `@yue-ui/design-tokens` package is pure CSS with no build step. It consists of three token layers and one implementation layer, totalling **638 unique token names**.

## Layers and scale

| Layer | File | Declarations | Contents |
| --- | --- | ---: | --- |
| `primitives` | `src/primitives/*.css` | 186 | Scales, fonts, motion, raw palettes and the control scale |
| `semantics` | `src/semantics/*.css` | 83 | Theme and interaction roles, Accent |
| `components` | `src/component-tokens/*.css` | 377 | Component geometry and visual contract, split by component namespace |
| `implementations` | `src/prototype/*.css` (via `src/implementations.css`) | — | Prototype-stage component selectors (`.btn` and others), an opt-in entry, progressively taken over by `@yue-ui/vue` |

Grouped by the first segment of the token name (its namespace), summing to 638:

| Category | Count |
| --- | ---: |
| Raw palette (`--neutral-*`, `--azure-*` …) | 68 |
| Component contracts (`--button-*`, `--input-*` …) | 380 |
| Semantic roles (`--surface`, `--text-*`, `--action-*` …) | 56 |
| Space / size / radius / stroke (`--space-*`, `--border-*` …) | 69 |
| Font / font size / line height | 26 |
| Motion / opacity / elevation | 23 |
| Accent roles | 16 |

The namespace view is not the layer view above: component contracts are counted by name, and three of them (`--list-row-*`) are declared in the `semantics` layer, which is why this row reads 380 rather than 377.

## Four modes

The token package supports four forms at once, all switched through `data-*` attributes or media queries, with no JS branching required:

```html
<html data-theme="dark" data-accent="neutral">
```

- **Light** — `:root`
- **Dark** — `[data-theme=dark]`, which also sets `color-scheme: dark`
- **Accent** — `[data-accent=neutral]` overrides the whole `--accent-*` set; the default azure needs no attribute
- **Forced colors** — under `forced-colors: active` it preserves hierarchy and state cues (see `src/component-tokens/box.css`, `src/prototype/overlay.css`)

## How to reference it

```css
/* Application entry: import all tokens at once */
@import '@yue-ui/design-tokens/index.css';
```

```js
// Or let the bundler handle it
import '@yue-ui/design-tokens/index.css'
```

The package exports these entries: `index.css` (the layer order plus the three token layers — **the only one you need to install**), `component-tokens/*.css` (the Component Token declarations, one file per namespace, already pulled in by `index.css`), and the optional `implementations.css` (the prototype-era selector archive, which `index.css` does not reference). The layer order is declared by `index.css`, so **tokens must load before component styles**.

Component Tokens are declared in exactly one place (`src/component-tokens/`, one file per namespace), enforced by the architecture check in `corepack pnpm audit:tokens`: a declaration in an unreachable file, a `var()` nobody declares, the same token declared twice, or a lower layer depending on a higher one all fail the audit.

## Design guidelines

For color, dark mode, typography, icons, layout and motion principles, see [Design guidelines](/en/design/). This page only covers
token hierarchy, load order and the CSS API; design decisions are not maintained in a second copy here.

## Coming soon

- A token browser (reading the CSS inside the package directly, rather than maintaining a second inventory)
