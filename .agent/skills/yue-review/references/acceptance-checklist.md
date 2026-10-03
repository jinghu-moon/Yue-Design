# Acceptance checklist

Use this checklist at the end of any component task before producing the handoff report.
Every item either passes with evidence (command output, file path, test name) or is recorded
as a gap with a reason. `N/A` requires one sentence explaining why the concern does not apply.

---

## Phase 0 — Spec and design

- [ ] Component spec was written and API was frozen before implementation began.
      Evidence: spec document path or section in handoff.
- [ ] Intentional non-features are recorded and distinct from "not yet done."
- [ ] API naming follows `yue-component-design/references/api-naming.md`.
- [ ] Token/state matrix covers every size, variant, theme, and state in both color profiles.
      Disabled exceptions are measured, not assumed.
- [ ] Accessibility role, keyboard pattern, and APG reference are documented.

## Phase 1 — Implementation

- [ ] `packages/vue/src/components/{name}/` contains `types.ts`, SFC, test, and CSS entry.
- [ ] Root entry, per-component entry, plugin entry, and style aggregation are updated.
- [ ] SFC has no `<style>` block; no JavaScript file imports CSS.
- [ ] CSS uses `useNamespace`, BEM (`.yue-{name}`, `__part`, `--modifier`, `is-*`), and reads
      only `--{name}-*` or `--_*` tokens; no hard-coded colors; no other component's tokens.
- [ ] `inheritAttrs: false` is set where attribute routing is non-default.
- [ ] Compound state is parent-owned through typed context using `Symbol.for('yue:{family}')`.
- [ ] All browser listeners, timers, and observers are cleaned up on unmount.
- [ ] SSR setup does not read browser globals (`window`, `document`) outside `onMounted`.
- [ ] Detached components have: Teleport, positioning, stacking, outside-click, focus trap,
      and focus restoration decisions.

## Phase 2 — Accessibility

- [ ] Keyboard behavior matches the native or APG pattern; tested as a table of explicit cases.
- [ ] `focus-visible`, disabled, readonly, loading, invalid, selected, and busy states have
      semantic output, not only a color change.
- [ ] Icon-only controls have an accessible name; decorative icons use `aria-hidden="true"`.
- [ ] Focus is moved, trapped, and restored for overlay components via shared infrastructure.
- [ ] Locale-sensitive labels use `useLocale().t('…')`, never a hard-coded string.
- [ ] `forced-colors` overrides are present for all custom color roles.
- [ ] `prefers-reduced-motion` is honored for transitions and animations.

## Phase 3 — Testing

- [ ] Unit tests cover: render, props/models/slots/emits, attribute routing, controlled/uncontrolled,
      edge cases, and cleanup.
- [ ] Stylesheet assertions cover: single namespace, state classes, focus ring, logical properties.
- [ ] If IME input is part of the contract: Chromium and Firefox event orderings are both tested.
- [ ] Browser tests cover: keyboard, focus, geometry, contrast, motion, and IME (where relevant).
- [ ] SSR smoke test exists when the component can render server-side.
- [ ] No test was deleted, skipped, or assertion weakened to make the suite pass. Failures are
      fixed in the implementation.
- [ ] `corepack pnpm test` passes. Actual output pasted in Evidence section.

## Phase 4 — Documentation

- [ ] Example, API, and Guide pages exist and use the real component (no static mock).
- [ ] API page documents: props, emits, slots, expose, models, DOM/attribute routing, tokens,
      accessibility output, locale keys, limitations, and breaking changes.
- [ ] `corepack pnpm audit:docs` passes.
- [ ] If user-facing text was added or changed: `corepack pnpm audit:i18n` passes.

## Phase 5 — Verification gates

Run the applicable gate set from `references/verification-commands.md`. Paste actual results.

- [ ] `typecheck`: PASS / FAIL
- [ ] `build`: PASS / FAIL
- [ ] `test`: PASS / FAIL
- [ ] `audit:tokens`: PASS / FAIL
- [ ] `audit:docs`: PASS / FAIL
- [ ] `verify:dist`: PASS / FAIL
- [ ] `verify:treeshaking`: PASS / FAIL
- [ ] `verify:visual`: PASS / FAIL / BLOCKED (reason)
- [ ] `verify:tarball`: PASS / FAIL / N/A (reason)
- [ ] `verify:all`: PASS / FAIL / not run (reason)

A BLOCKED or FAIL gate is not hidden. It is recorded in the handoff and either resolved or
explicitly carried as a follow-up item with a tracking note.

## Phase 6 — Diff hygiene

- [ ] Diff contains no dead props, stale comments, generated probes, or compatibility shims.
- [ ] No `@ts-ignore` or `as any` was added to hide a type error caused by this change.
- [ ] No new third-party dependency was added to the core package to handle a single-consumer need.
