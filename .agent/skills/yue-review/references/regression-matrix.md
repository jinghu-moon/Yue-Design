# Regression matrix

Use this matrix after implementation is complete to verify that all surfaces touched by the
change have adequate regression coverage. A gap is recorded in the handoff; it is not hidden.

## How to use

For each row that applies to your change, confirm:
1. A test exists that covers this surface.
2. The test ran in this task and passed.
3. The test result is included in the handoff Evidence section.

If a row applies but no test exists and you cannot add one in this task, record it as an
explicit gap in the handoff Regression section with a reason.

---

## Component surface matrix

| Surface | Minimum coverage required | Gate |
| --- | --- | --- |
| Props (new or changed) | Unit: each prop combination tested explicitly; default value verified | `test` |
| Emits (new or changed) | Unit: payload type, timing, and non-emission cases | `test` |
| Slots (new or changed) | Unit: renders correctly; absent slot has no wrapper markup | `test` |
| Expose (new or changed) | Unit: method can be called via template ref; return value correct | `test` |
| Attribute routing (changed) | Unit: target element receives correct attrs; source does not duplicate | `test` |
| CSS state class (new or changed) | Unit: class present/absent on correct state | `test` |
| Token (new or changed) | `audit:tokens`; visual assertion for rendering change | `audit:tokens`, `verify:visual` |
| Keyboard / focus | Browser: exact key sequence tested; focus order verified | `verify:visual` |
| IME input | Unit: Chromium and Firefox event orders both tested | `test` |
| Locale key (new or renamed) | Unit: key resolves; fallback behavior; all language packs updated | `test`, `audit:i18n` |
| Accessible name / ARIA state | Browser: output verified via axe or direct DOM assertion | `verify:visual` |
| SSR / hydration | Package: `renderToString` smoke test; no hydration mismatch | `test` |
| Package exports | Package: native ESM import; single component no extra bundle | `verify:dist`, `verify:treeshaking` |
| Installed tarball | Package: consumer can import and use from tarball | `verify:tarball` |
| Docs (new or changed page) | `audit:docs`; both locales when bilingual | `audit:docs`, `audit:docs:i18n` |

---

## Existing behavior check

When a change touches a shared code path (e.g. `useNamespace`, `useConfig`, `useLocale`,
a shared composable, or a compound context), confirm that:

- [ ] Adjacent components using the same code path still pass their own tests.
- [ ] The shared code path has at least one test that exercises the behavior the change relies on.

If you cannot verify adjacent behavior in this task, record the unverified surface explicitly.

---

## Breaking change regression anchor

If the change is breaking, a before-state test must have been written and verified before
the change was made. Confirm:

- [ ] Before-state test was written and passed on the pre-change code.
- [ ] After-state test asserts the new intended behavior.
- [ ] Test file diff shows only the expected test updates — no assertion weakening.
