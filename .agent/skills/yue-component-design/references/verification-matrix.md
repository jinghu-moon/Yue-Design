# Verification matrix

> **Authoritative command list:** `.agent/skills/yue-review/references/verification-commands.md`
> The table below defines which gates are required; that file defines the actual commands,
> reporting format, and visual-test prerequisites.

Use the smallest row that covers the changed surface during development; before handoff always
run the final row via `yue-review`.

| Changed surface | Required gates |
| --- | --- |
| CSS or token values only | `audit:tokens`, `verify:visual` when rendering changes |
| New component or public API | `typecheck`, `build`, focused `test`, `audit:docs`, `audit:tokens`, `verify:dist`, `verify:treeshaking` |
| Focus, geometry, keyboard, IME, motion, contrast or responsive behavior | the row above + `verify:visual` |
| Export, runtime, CSS entry or consumer behavior | the row above + `verify:tarball` |
| Detached/SSR behavior | the applicable row + an SSR smoke test and real browser checks |
| Handoff | `corepack pnpm verify:all` (no exceptions hidden) |

Evidence rules:

- Run commands from the repository root and report the actual exit/result.
- A browser or provider unavailable on the machine is a blocker or an explicit untested risk,
  never a pass.
- Negative probes are useful for fragile gates: restore the suspected defect, confirm failure,
  then restore and rerun. Never weaken an assertion or delete a failing test.
- Unit tests should be black-box and deterministic. Browser tests own layout, focus, CSS and
  platform event ordering; snapshots are supplementary, not the contract.
- Use APG keyboard tables for keyboard-heavy components and add axe checks where the browser
  harness supports them. Add `renderToString` smoke coverage when setup can be rendered on SSR.

Tool references: [Vitest browser mode](https://vitest.dev/guide/browser/),
[Vue Test Utils](https://test-utils.vuejs.org/), and
[Playwright](https://playwright.dev/docs/intro).
