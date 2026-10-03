# Token Audit

`tools/audit-tokens.mjs` is the gate for the Token package. It is a zero-dependency Node implementation that relies on no browser, PostCSS, or any build tooling — because it has to keep running no matter how the toolchain changes.

```bash
corepack pnpm audit:tokens
```

## It checks three things

1. **Contrast** — 32 foreground/background pairs × light/dark = 64 items per target; failing any single item below the threshold fails the run (4.5:1 for body text, 3:1 for borders and focus rings).
2. **Resolvability** — every Token must resolve successfully in every mode. Dangling references, circular references, selectors that cannot be modelled, or `!important` all raise an error directly instead of being skipped.
3. **Consistency** — when auditing multiple targets, all targets must resolve to exactly the same result in every mode.

## Why the auditor implements its own CSS parsing

The prototype's audit ran in the browser and read computed values with `getComputedStyle`. After the migration to Node, the easiest place to get things wrong is simplifying away the browser's behavior:

- **Layer order takes precedence over specificity.** The order of `@layer` comes before specificity: a later layer declaration with low specificity overrides an earlier layer declaration with high specificity.
- **Unlayered declarations take precedence over all layers.** The auditor gives unlayered declarations the highest layer number, following the real CSS rules.
- **`color-mix()` requires premultiplication and alpha scaling.** `color-mix(in srgb, #1f1f1f 8%, transparent)` must yield "the color unchanged, alpha 0.08", otherwise the contrast computed when it is stacked on a background colour would be completely distorted.
- **Transparency must be composited layer by layer.** Pairs such as ghost button hover are "a semi-transparent foreground stacked on the base surface", so they must be composited before the contrast is computed.
- **The luminance threshold keeps the prototype's legacy branch** (`0.03928 / 12.92`). The difference is far smaller than one contrast step, but "the audit still passes after the migration" is only a verifiable claim when both algorithms agree.

When it encounters a construct it cannot model, the auditor **fails directly** rather than ignoring it. That is exactly why it can serve as a gate: no Token can quietly escape this cascade model.

## Output example

```text
Yue Design · Token Audit
──────────────────────────────────────────────────────────────────────────────
contract: 32 contrast pairs × 2 profiles = 64 gating checks per target
gating profiles: light/azure, dark/azure

▌ prototype — design-tokens-generic-v4/tokens/index.css
  files: index.css ← primitives.css ← semantics.css ← components.css
  layers: primitives < semantics < components < implementations < demo
  tokens: light/azure 451, dark/azure 451 (declared 451)
  ...
  → 64/64 PASS (32 pairs × 2 profiles)

▌ parity prototype ↔ package
  profiles probed: light/azure, dark/azure, light/neutral, dark/neutral
  resolutions compared: 1804
  differences: 0
  → IDENTICAL

RESULT: PASS
```

## Where this set of pairs comes from

The 32 pairs in `tools/token-audit.pairs.mjs` were transcribed verbatim from the `const pairs` embedded in `design-tokens-generic-v4.html`. The tests re-extract that array from the HTML and compare it against the module, so it cannot quietly drift; the documentation and the gate also share the same definition.

## Why Accent mode is diagnostic only

The prototype never sampled the `[data-accent=neutral]` mode, so making neutral gating as well would make a "faithful migration" fail over something the prototype itself never checked. The audit reports the neutral results (currently 64/64 for both targets), but does not let them decide the exit code.

## Coming soon

- Contrast audit page: reads the Token package directly and renders the full matrix per mode
- Token browser: lists every Token's resolved value in all four modes
- Accent toggle and light/dark toggle controls
