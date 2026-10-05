# YueDialog — Review Handoff

Produced with the `yue-review` skill. Every acceptance item is either PASS with actual command
output, or recorded as a gap/N-A with a one-sentence reason. Evidence is pasted output, not inferred.

## Identity

- **Component/family:** `YueDialog` (atomic; single SFC with `header`/`default`/`footer` slots)
- **Classification:** drive `imperative` (`v-model` + `expose`), position `detached` (Teleport to
  `body`), lifecycle `transient` (unmounts on close unless `persistent`), composition `atomic`
- **Reference implementation:** TDesign Dialog / antd Modal / Vuetify `v-dialog`.
  Borrowed: modal-over-scrim geometry, `alertdialog` promotion for destructive actions, focus trap +
  conditional return focus, single-duration-source motion. Rejected: compound sub-components
  (`Dialog.Header` etc.), a `--layer-dialog` tier of its own, draggable/resizable handles, and
  "click anywhere outside closes" (only the scrim closes).
- **Spec document:** `.spec-workflow/yue-dialog/spec.md`; frozen API in
  `packages/vue/src/components/dialog/types.ts` (written before the SFC/CSS per the design gate)

## Contract

- **Props:** `modelValue, title, description, variant('default'|'danger'), surface('modal'|'fullscreen'),
  size('sm'|'md'|'lg'|'xl'), width, scrollable, persistent, closeOnEscape, closeOnScrim, beforeClose,
  confirmText, cancelText, close(bool|{ariaLabel}), teleport, trigger, restoreFocus, ariaLabel`.
  `closeOnEscape`/`closeOnScrim` default from `variant` (off for `danger`); an explicit value wins.
- **Model:** `v-model` = `modelValue`/`update:modelValue`.
- **Emits:** `update:modelValue, open, close({reason,event}), confirm, closed({reason}), after-open, after-close`.
  Close reasons: `confirm | cancel | close-btn | escape | scrim | programmatic`.
- **Slots:** `header` (scope `titleId`), `default` (scope `close`), `footer` (scope `close/confirm/cancel`);
  supplying `footer` suppresses the built-in confirm/cancel and renders no `dialog.*` key.
- **Expose:** `open()`, `close(reason='programmatic')`, `updatePosition()`. No DOM node or overlay
  internals exposed.
- **DOM/attribute routing:** `class` → overlay; `style`/`id`/`role` reserved; every other attr → card panel.
  `inheritAttrs:false` set on the SFC.
- **Intentional non-features (contractual):** no `--layer-dialog` (reads `--layer-modal` via
  `--dialog-z-index`); no outside-anywhere click close; no stacking beyond the shared overlay stack;
  no drag. These are decisions, not omissions.
- **Breaking changes:** none — pre-release, first landing of the component.
- **Token/state matrix:** `.spec-workflow/yue-dialog/spec.md` § Token intent. Surface axes are
  pass-through aliases in `packages/tokens/src/component-tokens/dialog.css` forwarding the frozen
  `--box-*-dialog` contract; `--dialog-*` also carries width ramp, header/footer geometry, scrim, action
  buttons, and motion. `--dialog-*` namespace = 33 tokens.
- **Accessibility & keyboard:** `role=dialog` (danger→`alertdialog`), `aria-modal`, title→`aria-labelledby`,
  description→`aria-describedby`; APG Dialog pattern — Esc (unless `persistent`/danger default-off, unless
  IME composing), Tab wrapped inside the card, initial focus on the container (`tabindex=-1`), conditional
  return focus (keyboard/programmatic restore; scrim does not), background switched to `inert`.
  `forced-colors` restores a system border; `prefers-reduced-motion` zeroes the transition.
- **Locale keys added:** `dialog.confirm`, `dialog.cancel`, `dialog.closeLabel` — in the catalog, the
  `en-US` and `zh-CN` packs, and the key union test (4 places kept in sync).

## Review-triggered fix (this session)

`audit:component dialog` initially **FAILed**: `dialog/style.css` read ~26 cross-namespace tokens
directly (`--box-*-dialog`, `--scrim`, `--layer-modal`, `--space-*`, `--text-*`, `--action-*`,
`--surface-component`, `--border-*`, `--radius-md`, `--box-color-inverse`), violating the library-wide
"component CSS reads only `--{name}-*` / `--_*`" rule that the gate enforces mechanically
(`.agent/skills/yue-component-design/scripts/audit-component.mjs`: `var\(--(?:dialog-|_)`).

Resolution and rationale (recorded in spec.md → Q29=B conflict note): the spec had read Q29=B as
"surface colour reads `--box-*-dialog` directly, no `--dialog-*` re-alias", but that predates the
isolation rule. The in-repo precedent `--popover-background: var(--box-background-popover)` shows the
two are not in conflict — a **pass-through alias forwards the Box contract without re-typing its value**.
Fix (implementation, not gate-weakening): added `--dialog-*` pass-through aliases in
`component-tokens/dialog.css`, rewrote `style.css` to read only `--dialog-*`/`--_*`, extended
`PHRASES.dialog`, re-pinned `PACKAGE_ONLY_TOKENS`, and re-computed the inventory/doc counts
(615→638 tokens, components 354→377, component-contract 357→380, dialog namespace 10→33).

Also added a real-browser focus-return assertion to `verify:visual` (see Regression) and two unit
tests (attribute routing; expose) plus a Tab-trap test.

## Surface

- **Source / types / test / CSS:** `packages/vue/src/components/dialog/{YueDialog.vue, types.ts, YueDialog.test.ts, style.css, index.ts}`
- **Token sheet:** `packages/tokens/src/component-tokens/dialog.css`; `packages/tokens/src/semantics/modal-layer.css`
- **Entries:** root `packages/vue/src/index.ts`; plugin `packages/vue/src/plugin.ts`; style `packages/vue/src/style.css`;
  exports `./dialog`, `./dialog.css` in `packages/vue/package.json`; shared overlay runtime `packages/hooks/src/overlay/`
- **Docs:** example `apps/docs/components/dialog.md` (+ `dialog/`), API `apps/docs/components/dialog/api.md`,
  guide `apps/docs/components/dialog/guide.md`; EN mirrors under `apps/docs/en/components/`

## Evidence

Actual output from `corepack pnpm verify:all` (and targeted reruns) after all changes:

```text
typecheck:          PASS — vue-tsc --noEmit -p tsconfig.json → exit 0 (packages/vue)
build:              PASS — dist/components/dialog/style.css ← src/components/dialog/style.css (7340 bytes)
test:               PASS — Test Files 33 passed (33) / Tests 683 passed (683); TEST_EXIT=0
audit:component:    PASS — audit:component dialog: PASS (5 source files, 3 docs contracts)
                       (popover and button also PASS)
audit:tokens:       PASS — architecture: 638 declared token(s) across 40 reachable file(s),
                            19 catalogue group(s) in 19 file(s); RESULT: PASS
audit:docs:         PASS — RESULT: PASS (inside verify, exit 0)
audit:i18n:         PASS — RESULT: PASS (dialog keys present in both packs)
audit:docs:i18n:    PASS — bilingual: 60 page(s) carry lang + canonical + hreflang (30 in /en/)
verify:dist:        PASS — @yue-ui/vue/dialog.css: 7340 bytes; unlayered; RESULT: PASS
verify:treeshaking: PASS — dialog: bundle.js 19376B, bundle.css 7352B (budget 20000/7500);
                            cross-contamination guards clean; RESULT: PASS
verify:visual:      PASS — light Dialog: fixed modal at --layer-modal=1000, centred card, inert
                            background, scroll lock, Escape reason, focus return and danger guard passed
verify:tarball:     PASS — "tarball Dialog: role dialog, aria-modal true, fixed at --layer-modal 1000,
                            close label from the shipped en-US pack"; RESULT: PASS
verify:all:         PASS — 8× RESULT: PASS, exit 0
```

## Acceptance checklist walkthrough

Phase 0 — Spec/design:
- Spec written + API frozen before implementation: PASS (`types.ts` header cites the spec; design gate forbids CSS before types+API draft).
- Intentional non-features recorded: PASS (spec + Contract above).
- API naming follows `api-naming.md`: PASS (`Yue*Props/Emits/Slots/Exposed`, `yue` namespace via `useNamespace`).
- Token/state matrix covers axes in both profiles: PASS (`dialog.css` values are semantic/primitive refs, no raw hex; dark handled at the semantic layer).
- Role/keyboard/APG documented: PASS (spec Accessibility; Contract above).

Phase 1 — Implementation:
- `types.ts`/SFC/test/CSS present: PASS (dir listing).
- Root/per-component/plugin/style entries updated: PASS.
- No `<style>` block; no JS imports CSS: PASS (`audit:component dialog` checks this; style.css is a separate unlayered entry).
- CSS reads only `--dialog-*`/`--_*`, BEM, no hard-coded colours: PASS (`audit:component dialog` PASS after alias fix).
- `inheritAttrs:false` where routing is non-default: PASS (SFC line 12).
- Compound state via typed `Symbol.for`: N/A — atomic component, no parent/child compound.
- Browser listeners/timers/observers cleaned on unmount: PASS (`onBeforeUnmount` removes keydown, releases inert, unlocks scroll, unregisters overlay).
- SSR setup does not read browser globals: PASS (`typeof document/window` guards; SSR smoke test renders via `renderToString`).
- Detached decisions (Teleport/positioning/stacking/outside-click/focus trap/restore): PASS.

Phase 2 — Accessibility:
- Keyboard matches APG, tested as explicit cases: PASS (unit: Esc close + reason, IME-Esc suppressed, scrim same-target, press-inside no-close, danger Esc resistance, Tab trap wrap; visual: real Escape + focus return).
- focus-visible/disabled/etc. semantic output: PASS for the surfaces this component owns (built-in buttons inherit YueButton/Button semantics; card focus ring via `--focus-ring-*`).
- Icon-only control has accessible name; decorative icon `aria-hidden`: PASS (close button `aria-label` from `dialog.closeLabel`; the SVG is `aria-hidden="true"`).
- Focus moved/trapped/restored for overlays: PASS (initial focus unit; trap unit; restore verified in real browser).
- Locale labels via `useLocale().t`: PASS (`confirmLabel`/`cancelLabel`/`closeAriaLabel`).
- `forced-colors` overrides present: PASS (`@media (forced-colors: active)` block).
- `prefers-reduced-motion` honored: PASS (zero-duration block, matches Popover Q31=A).

Phase 3 — Testing:
- Unit covers render/props/models/slots/emits/routing/controlled-uncontrolled/edge/cleanup: PASS (19 tests).
- Stylesheet assertions (namespace, state, focus, logical props): PASS via `audit:component` + token gates.
- IME event ordering (Chromium+Firefox): N/A for Dialog — Dialog only consumes `Escape.isComposing`, covered by a unit test; IME event ordering is the Input contract.
- Browser tests (keyboard/focus/geometry/contrast/motion/IME): PASS (visual dialog: geometry, inert, scroll lock, Escape reason, focus return, danger).
- SSR smoke test exists: PASS (`renders on SSR without touching browser globals`).
- No test deleted/skipped/weakened: PASS — the earlier JS focus-restore assertion was moved to the real-browser gate because happy-dom cannot observe cross-element `activeElement` return; it was **not** deleted but relocated to a stronger layer, and the Tab trap keeps its observable (`activeElement`) assertions.
- `corepack pnpm test` passes: PASS — 683 passed (683).

Phase 4 — Documentation:
- Example/API/Guide pages exist and use the real component: PASS (`apps/docs/components/dialog*`).
- API page documents props/emits/slots/expose/models/routing/tokens/a11y/locale/limits: PASS.
- `corepack pnpm audit:docs` passes: PASS.
- `corepack pnpm audit:i18n` passes (user-facing text added): PASS.

Phase 5 — Verification gates: all PASS (see Evidence).

Phase 6 — Diff hygiene:
- No dead props/stale comments/probes/shims: PASS for the slice (the temporary `__debug_tab.test.ts`/`__dbg.test.ts` probes were deleted before finalization).
- No `@ts-ignore`/`as any` added: PASS.
- No new third-party core dependency for a single consumer: PASS (shared overlay stack lives in `@yue-ui/hooks`, a first-party package with a second consumer, Popover).

## Regression and limits

- **Baseline/regression impact:** `verify:all` was green before this session's audit fix and remains
  green after. Changing the component CSS to the alias layer grew `--dialog-*` from 10→33 tokens
  (total 615→638); the token-parity, grammar, architecture and docs-consistency gates were updated to
  the measured values via `node tools/token-inventory.mjs --write`, not by editing assertions.
- **Breaking before/after tests:** none (first landing). `audit:component dialog` now anchors the
  namespace-isolation contract for this component; the tree-shaking `DIALOG_CSS_MUST_NOT` (no
  `--popover-*`/other namespaces in the dialog bundle) is a live cross-contamination guard and drove
  rewording a comment that literally mentioned `--popover-background`.
- **Known limitations / untested environments:** focus restoration to the pre-open trigger is asserted
  only in real Chromium (`verify:visual`); happy-dom does not move `document.activeElement` onto a
  body-level trigger, so it is deliberately not unit-tested rather than faked. Firefox-specific
  behaviour is not exercised for Dialog (no IME event ordering in its contract). Dark-profile visual for
  Dialog was not screenshotted (light only); dark correctness rests on the shared semantic tokens.
- **Follow-up outside this slice:** the untracked `tests/visual/tmp-manual-anchor.png` and
  `docs/Temp/log2.txt` are unrelated scratch files (not referenced by any gate); left for their owning
  sessions to remove. Motion numbers were subsequently triaged in a Q16 follow-up (see Addendum):
  durations/curve and the fullscreen displacement are decided, while scrim strength and the width-tier
  feel remain a prototype-eyeball call enabled by `dialog-prototype.html`.

## Blocked items

No blocked items. `audit:component dialog` was FAIL at the start of this review and was fixed in the
implementation (alias layer), not carried as a gap.

## Addendum — Q16 motion follow-up

Adopted after the initial handoff; supersedes the `dialog.css` size / budget figures in Evidence above
(7340B / 7352B / budget 7500).

- **fullscreen mis-scale fixed (implementation):** a viewport-filling surface no longer plays the
  card `scale(0.96)` entrance; it keeps the same opacity fade and rises as a sheet with
  `translateY(16px)` (`style.css`, later + equal-specificity rule; reduced-motion still resets to none).
- **durations / curve closed as "keep":** enter 200ms, exit 100ms, `--motion-ease-standard` retained —
  inside the TDesign(~240)/Vuetify(225–125)/antd(~200) consensus band and consistent with the frozen
  Q30 single-duration-source mechanism. No evidence to change, so no change made.
- **displacement amount stays a CSS literal** (scale % / slide px): not a semantic value, so it was
  deliberately not added to the `--dialog-*` vocabulary.
- **budget adjusted for the real rule, not to fake a pass:** the added fullscreen entrance grew
  `dialog.css` to 7601B, past the 7500 ceiling that had been pinned to the earlier 6924B measurement.
  Ceiling raised to 8000 with the measured delta and rationale recorded inline in
  `tests/tree-shaking/verify.mjs` (mirrors the Tag/plugin budget-raise precedent). No assertion weakened.
- **was pending the eye, now resolved:** scrim alpha and the width question were decided by opening
  `dialog-prototype.html` and reading the values back; the concrete numbers and their token representation
  are finalized in the *Q16 numeric finalization* section below (third follow-up).

### Q25 fly-in (second follow-up — reverses frozen Q25=A)

- **Mechanism changed:** the modal entrance is no longer "scale from a trigger-facing origin". It is now a
  Vuetify-style FLIP **translate from the trigger's centre to the viewport centre** (and back on close), so
  the motion names its source. Verified against `refer/tdesign-common/.../dialog/_animate.less`: TDesign's
  `tDialogZoomIn` is a centred `scale(.01)+opacity` zoom with **no** travel — the fly-from-trigger idiom is
  Vuetify's, not TDesign's; the user's request was kept, the attribution corrected.
- **Implementation:** `computeTransformOrigin()` now also emits `--_dialog-tx/ty` (px) and `--_dialog-enter-scale`
  from `getBoundingClientRect`, with the travel vector **clamped to `min(vw,vh)×0.18`** so an edge trigger never
  throws a modal across the whole screen. No trigger → tx/ty=0 + `scale(.96)` (grows in place). Fullscreen keeps
  the `translateY(16px)` sheet (does not fly). Hand-computed delta only — **no Floating UI** (the tree-shaking
  hard assertions are unchanged; the intent comment was reworded to stay truthful). reduced-motion still resets all
  transforms to none. Docs (zh+en dialog/api/guide) updated to describe the fly-in.
- **Tests:** two unit tests added (fly vector points at the anchor, is clamped, and is pure translate; and the
  no-trigger in-place fallback). Mid-animation travel is not asserted in `verify:visual` (timing-flaky); the
  mechanism is covered deterministically at the unit layer instead.
- **Budget:** fly-in grew dialog js 19376→19874 and css 7601→7900. Ceilings raised js 20_000→21_000 and
  css 8_000→8_500 to restore a just-above margin, with the measured delta recorded inline (reviewed feature
  growth, not graph bloat). No assertion weakened.

Fresh gate run after both follow-ups: `verify:all` EXIT=0, 8× RESULT: PASS —
```
verify:treeshaking: PASS — dialog: bundle.js 19874B, bundle.css 7900B (budget 21000/8500)
verify:visual:      PASS — light Dialog: fixed modal, centred card, inert background, scroll lock,
                            Escape reason, focus return and danger guard passed
```
Unit suite: 685 passed (33 files) — the 683 baseline plus the two new fly-in tests.

### Q16 numeric finalization (third follow-up — prototype values baked)

The user eyeballed `dialog-prototype.html` and chose enter 240→250, exit 150, ease standard, scrim 0.5/0.5,
width md 480 / lg 560. Landing them without scattering raw literals or polluting shared scales:

- **Duration ladder:** the primitive scale went from three tiers to a 50ms-stepped ladder `--duration-100 …
  --duration-400`; `--duration-fast/normal/slow` are now aliases onto the 100/200/300 rungs, so button, spinner,
  tag and the shared `--motion-duration-*` roles resolve exactly as before (zero behaviour change). `--dialog-duration-enter`
  names `--duration-250` and `--dialog-duration-exit` names `--duration-150` — a modal is more deliberate than a
  transient popover, which keeps the shared 200/100 roles. Ease stays `--motion-ease-standard`.
- **Scrim:** a new semantic `--scrim-modal: rgb(0 0 0/.5)` (mode-invariant — declared once, no dark override) carries
  the dialog's backdrop; `--dialog-scrim-color` points at it. The shared `--scrim` (.56 light / .64 dark, in the frozen
  prototype) is left untouched, so no parity divergence is registered and no raw colour literal enters the component layer.
  Caveat noted for the user: this makes the dialog scrim *lighter in dark mode* than the old per-theme `--scrim` — intentional
  per the 0.5/0.5 pick, flagged for veto.
- **Width:** no token change. The `width` prop already exists (`YueDialog.vue`) and overrides the size ramp, so off-scale
  widths like 560 are caller data, not a rung to add to `--width-*`.
- **Gate touchpoints:** 8 new package-only tokens registered in `PACKAGE_ONLY_TOKENS` (7 duration rungs + `--scrim-modal`);
  the frozen grammar in `token-vocabulary.mjs` extended (`primitives.duration` numerics, `semantics.scrim` → `modal`);
  `inventory.json` / `token-usage.json` regenerated (needsDecision stays 0 — the unused 350/400 rungs classify as
  `scale-step`, the aliases as `same-file-composition`). Docs `design/motion.md` (zh+en) now describe the ladder and the
  dialog's deliberate timing.
- **Budget unchanged:** token *values* moved but the dialog `style.css`/`YueDialog.vue` bytes did not, so dialog stays
  bundle.js 19874 / bundle.css 7900 against the 21000/8500 ceilings. No budget edit this round.
