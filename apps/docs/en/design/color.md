# Color

Yue's colors are split into three layers: the raw palette, semantic roles, and component tokens. Applications and components consume the latter two layers first; only theme definitions and visualization tools read the raw palette directly.

## Semantic roles

| Purpose | Token | Rule |
| --- | --- | --- |
| Page background | `--page` | The lowest surface of the whole application |
| Content surface | `--surface` | Cards, input areas, and primary content containers |
| Subtle surface | `--surface-subtle` | Toolbars and supporting areas; not used to carry primary actions |
| Component surface | `--surface-component` | The default background of a control |
| Primary text | `--text-primary` | Headings, body text, and primary action text |
| Secondary text | `--text-secondary` | Supporting explanations and metadata |
| Placeholder text | `--text-placeholder` | Only for content that has not been filled in; it does not replace body text |
| Disabled text | `--text-disabled` | Disabled content; never the only channel that conveys information |
| Default border | `--border-default` | The ordinary border of controls and containers |
| Strong border | `--border-strong` | Borders that need an explicit group or emphasis |
| Focus ring | `--focus-ring` | Keyboard focus; it must not be removed by a visual reset |

## Usage rules

1. Adjacent elements are usually distinguished by surface, border, or spacing; state must not be conveyed by color difference alone.
2. Hover and pressed states prefer `--opacity-hover`, `--opacity-pressed`, and `color-mix()`, so that every component does not have to invent its own set of colors.
3. State colors must provide foreground, background, and border roles at the same time; color is not the only information channel, so add text, icons, or structural changes when needed.
4. Component styles may only consume their own component tokens; for example, Button uses `--button-*` and must not read `--input-*` across components.
5. Body text and ordinary control text are at least `4.5:1`; non-text borders, graphics, and focus are at least `3:1`. The correct notation here is `4.5:1`, not `1:4.5`.

## Validation

`corepack pnpm audit:tokens` runs 32 pairs against the light/dark Azure profiles, 64 gating checks in total; Neutral Accent runs as a diagnostic profile. A new semantic role must add a pair, or explicitly explain why it does not take part in the contrast computation.
