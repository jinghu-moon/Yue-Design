# Yue component acceptance checklist

Use this after reading the routed module references. `N/A` is valid only when the handoff
explains why the concern does not exist for this component.

## Design contract

- [ ] Classification and reference implementation are recorded.
- [ ] Props, slots, emits, models, exposed methods, defaults, fallthrough attributes and
      deliberate non-features are frozen before CSS.
- [ ] Names follow `references/api-naming.md`; native semantics are preferred.
- [ ] Token/state matrix covers every implemented size, variant, theme and state in both color
      profiles; disabled exceptions are measured rather than falsely gated.

## Implementation

- [ ] `packages/vue/src/components/{name}/` has `types.ts`, SFC, test and unlayered CSS entry.
- [ ] Root and per-component entries, package exports and style aggregation are updated.
- [ ] SFC has no style block; CSS uses `useNamespace`, BEM and only `--{component}-*` tokens.
- [ ] JavaScript has no CSS import; native elements own native attributes and semantics.
- [ ] Compound state is parent-owned through typed context; shared hooks are justified by a
      second consumer; browser listeners/timers/observers are cleaned up.
- [ ] SSR setup does not touch browser globals; detached components have Teleport, positioning,
      stacking, outside interaction and focus restoration decisions.

## Interaction and accessibility

- [ ] Keyboard behavior matches the native or APG pattern and is tested as a table of cases.
- [ ] Focus-visible, disabled, readonly, loading, invalid, selected and busy states have
      semantic output, not only color.
- [ ] Icon-only content has an accessible name; decorative icons are hidden.
- [ ] Overlay focus is moved, trapped and restored by the chosen shared infrastructure.
- [ ] Locale-sensitive labels come from the locale catalog (`useLocale().t('…')`), never a one-off
      translation prop and never a hard-coded literal. See `yue-i18n`.

## Documentation and verification

- [ ] Example, API and Guide pages use the same real component and have no duplicated contract.
- [ ] Docs include DOM/attribute routing, tokens, accessibility output, limitations and breaking changes.
- [ ] Focused tests pass; applicable gates from `verification-matrix.md` pass.
- [ ] `corepack pnpm verify:all` passes before handoff, or the report explicitly lists the blocker.
- [ ] Diff contains no dead props, stale comments, probes, generated output or compatibility shim.
