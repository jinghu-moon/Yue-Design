# Typography

Typography serves reading and information hierarchy first. Yue's typography tokens do not require consumers to install a specific font, but the package ships local font assets as the default visual baseline and does not depend on an external CDN.

## Font roles

| Role | Token | Usage |
| --- | --- | --- |
| UI font | `--font-ui` | Interface text, forms, and components |
| Monospace font | `--font-mono` | Code, token names, and logs |
| Numeric font | `--font-number` | Statistics and data that need stable digit widths |

## Type scale and line height

The current type scale runs from `--font-size-sm` to `--font-size-display`, and line height runs from `--line-height-sm` to `--line-height-display`. Components should prefer their own component token mappings of the type scale; only page titles use the base type scale directly.

- Body text uses at least `14px` and normal line height; dense controls may use `12px`, but cannot carry long-form explanations.
- Font weight is used to establish hierarchy; do not over-emphasize with color and bold at the same time.
- Letter spacing stays at `0` by default; only display titles or all-caps short labels should consider extra letter spacing.
- When font loading fails, it must fall back to system fonts; a failed font asset must not make the layout unusable.
