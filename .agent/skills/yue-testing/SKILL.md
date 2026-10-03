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

Run the matrix in `yue-component-design/references/verification-matrix.md` and report actual
commands. The final handoff requires `corepack pnpm verify:all` plus any new I18N gates.
