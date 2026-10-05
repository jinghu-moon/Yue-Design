# YuePopover Handoff

## Identity

- **Component/family:** `YuePopover`
- **Classification:** drive `template`, position `detached`, lifecycle `transient` (optional `persistent`), composition `atomic`
- **Reference implementation:** Vuetify overlay composables and Floating UI DOM; borrowed detached lifecycle, stack/focus coordination, collision positioning, and `autoUpdate`; rejected Vuetify's menu/dialog/scrim/router behavior and third-party types in the public API.
- **Spec:** `.spec-workflow/yue-popover/spec.md`

## Contract

- **API:** controlled `modelValue` or uncontrolled `defaultOpen`; `click|hover|focus|manual` triggers; external `anchor`; Floating UI placement/offset; body/selector/element Teleport; persistent/transient mounting; outside/Escape/content close policies; dialog/tooltip/presentation roles; typed `open`, `close`, `after-open`, `after-close`, and `update:modelValue`; trigger/default slots; exposed `open`, `close`, `toggle`, `updatePosition`.
- **Intentional non-features:** no imperative create API, public compound children, menu keyboard navigation, roving tabindex, dialog focus trap/scrim/inert background, tooltip delay policy, arrow, or Floating UI types.
- **Breaking changes:** none; this is a new pre-release component.
- **Token matrix:** `.spec-workflow/yue-popover/spec.md` Token intent; `packages/tokens/src/component-tokens/popover.css` owns 11 component tokens.
- **Accessibility:** default `role="dialog"` requires consumer-provided accessible name; tooltip uses `aria-describedby`; trigger receives relationship/state attributes; Escape is topmost-only; focus restores conditionally; content has no focus trap; reduced-motion and forced-colors CSS are present.
- **Locale keys:** none. Popover renders no built-in user-facing text.

## Surface

- **Source:** `packages/vue/src/components/popover/{YuePopover.vue,types.ts,index.ts,style.css,overlay-stack.ts,useFloatingPosition.ts,YuePopover.test.ts}`
- **Package entries:** root `packages/vue/src/index.ts`, plugin `packages/vue/src/plugin.ts`, Vite entry and `@yue-ui/vue/popover` / `popover.css` exports.
- **Tokens:** `packages/tokens/src/component-tokens/popover.css` and component index.
- **Docs:** `apps/docs/components/popover.md`, `apps/docs/components/popover/api.md`, `apps/docs/components/popover/guide.md` and mirrored English pages; navigation/config updated.
- **Dependency:** `@floating-ui/dom@^1.8.0`.

## Evidence

```text
typecheck:          PASS — workspace typecheck completed
build:              PASS — Vue/Vite/VitePress build completed
test:               PASS — 31 files, 661 tests
audit:component:    PASS — popover, 5 source files, 3 docs contracts
audit:tokens:       PASS — 110/110; architecture 602 tokens, 0 unresolved/duplicates/layer violations
audit:docs:         PASS — button and popover contracts consistent
audit:i18n:         PASS — 2 keys / 2 packs; 24 component files, no hard-coded UI text
audit:docs:i18n:    PASS — 27 page pairs, 94 links, 18 verified hashes
verify:dist:        PASS — 55 pages, 0 external resources; Popover CSS export present
verify:treeshaking: PASS — popover 31,030B JS / 1,565B CSS; plugin budget 57,400B / 43,932B
verify:visual:      PASS — Edge; Teleport, bottom placement, outside/Escape, focus restore; existing component matrix also green
verify:tarball:     PASS — installed Popover fixed box, role dialog, aria-controls, CSS; real IME still passes
verify:all:         PASS — exit 0
```

## Regression and limits

- **Baseline/regression:** initial focused Popover suite had 7 failures because the default trigger handler read the raw optional prop; the implementation was corrected to use normalized defaults. Browser verification then caught two additional real defects: optional Boolean `teleport` was implicitly `false`, and SSR/client Teleport branching caused hydration mismatch. Both were fixed and covered by unit/SSR/Edge checks.
- **Coverage:** 13 Popover unit tests cover ownership, defaults, trigger modes, disabled, attributes, close policies, nested stack, persistent mounting, focus restore, external anchor, and SSR. Edge visual checks cover actual detached rendering and focus/close behavior. Tarball checks cover installed entry/CSS/ARIA/geometry.
- **Known limits:** visual coverage currently exercises the documented default `bottom` placement rather than a full viewport-edge matrix for every placement/flip/shift combination; no axe runner is installed in the existing browser harness. These are follow-ups, not claimed passes.

## Follow-up

- Add a dedicated Popover browser fixture for all 12 placements, viewport-edge flip/shift, scroll/resize/content-resize, reduced-motion and forced-colors pixel assertions.
- Add axe integration once the repository browser harness has an approved axe dependency.
- Extract neutral overlay/focus/stack hooks only when a second component (Menu/Dialog/Tooltip) justifies the shared package boundary.

## Blocked items

No blocked items. The limits above are explicit coverage expansions, not skipped gates.
