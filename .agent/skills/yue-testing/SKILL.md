---
name: yue-testing
description: Test or review Yue Design Vue components, hooks, tokens, browser behavior, SSR, or package consumption. Trigger for Vitest, Vue Test Utils, Playwright/browser checks, visual regression, IME/focus/Teleport testing, tree shaking, tarball checks, or test failures; do not use for implementation-only or documentation-only changes.
metadata:
  short-description: Yue unit, browser, SSR, and package-boundary testing
---

# Yue testing

Testing is layered evidence, not a single green command. Read the routed reference:

| Task | Read |
| --- | --- |
| Vue unit/component tests | `references/unit.md` |
| focus, keyboard, geometry, IME, visual or accessibility | `references/browser.md` |
| SSR, exports, tree shaking or installed package | `references/package-boundary.md` |

## Test ownership

- Unit tests (Vitest + Vue Test Utils) prove state transitions, props, slots, emits, attribute
  routing and deterministic edge cases.
- Browser tests prove computed layout, CSS cascade, focus order, keyboard behavior, IME event
  ordering, responsive overflow, motion, contrast and real accessibility output.
- Package checks prove public exports, CSS entries, tree shaking, Node ESM, SSR importability and
  installed tarball behavior.
- Snapshots may document stable markup but never replace behavioral assertions.

## Yue rules

- Test the public contract black-box first; do not assert private refs or implementation names.
- A failing browser/provider test is a failure or explicit blocker, never a pass by omission.
- Add a negative probe for fragile guards when practical: restore the defect, confirm failure,
  restore the code, then rerun the real gate.
- Test both light/dark profiles and mobile constraints when CSS or responsive behavior changes.
- Test locale, long text, ARIA and RTL when a user-facing string or direction can change.
- For components with IME input behavior (text fields, search, textarea): cover both the
  Chromium event order (compositionend → trailing input) and the Firefox/CDP order (final
  input while composing → compositionend) as separate test cases.

## When tests fail

A failing test means the implementation is wrong. Fix the implementation.

**Never do any of the following to make a test pass:**
- Delete or comment out a failing test.
- Weaken an assertion (e.g. changing `toBe('exact')` to `toContain` or removing the assertion).
- Change the expected value to match broken behavior without understanding why the behavior changed.
- Skip a test with `test.skip` or `describe.skip` without leaving an explicit `TODO` comment
  and a corresponding tracking note in the handoff.

**When a test fails, diagnose in this order:**
1. Reproduce the failure in isolation; confirm the test itself is correctly written.
2. Identify which change caused the regression (use `git bisect` or incremental revert).
3. Fix the implementation to restore the intended behavior.
4. If the intended behavior genuinely changed (requirement change), update the test expectation
   AND document the change in the handoff breaking-changes section.

Run the gate set from `.agent/skills/yue-review/references/verification-commands.md` —
that file is the single authoritative source for required commands and reporting format.
Use `yue-component-design/references/verification-matrix.md` to determine which gate row
applies to the changed surface. The final handoff requires `corepack pnpm verify:all` plus
any I18N gates; run it through the `yue-review` skill.
