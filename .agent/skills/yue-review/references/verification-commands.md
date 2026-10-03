# Verification commands

This is the single source of truth for required verification gates. Other skills reference this
file rather than maintaining their own command tables. Run commands from the repository root.

## Gate set by changed surface

| Changed surface | Required gates |
| --- | --- |
| CSS or token values only | `audit:tokens`, `verify:visual` when rendering changes |
| New component or public API | `typecheck`, `build`, focused `test`, `audit:docs`, `audit:tokens`, `verify:dist`, `verify:treeshaking` |
| Focus, geometry, keyboard, IME, motion, contrast, or responsive behavior | new-component set + `verify:visual` |
| Export, runtime, CSS entry, or consumer behavior | above + `verify:tarball` |
| Detached or SSR behavior | applicable set + SSR smoke test + real browser checks |
| User-facing text or locale keys | applicable set + `audit:i18n`, `audit:docs:i18n` |
| Handoff (any) | `corepack pnpm verify:all` — no exceptions hidden |

## Commands

```text
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm test --run
corepack pnpm audit:component <name>
corepack pnpm audit:tokens
corepack pnpm audit:docs
corepack pnpm audit:i18n
corepack pnpm audit:docs:i18n
corepack pnpm verify:dist
corepack pnpm verify:treeshaking
corepack pnpm verify:visual
corepack pnpm verify:tarball
corepack pnpm verify:all
```

## Reporting rules

- Run every command from the repository root with `corepack pnpm`.
- Report the actual exit status and a meaningful excerpt of the output — not "passed" inferred
  from a broader command.
- A gate that cannot run (missing script, missing binary, missing environment) is recorded as:
  `[BLOCKED] <gate> — <reason>`. Never write PASS or N/A for a gate you did not run.
- A failed gate is recorded as `[FAIL] <gate> — <error excerpt>`. Fix the implementation;
  do not adjust expected values or skip the gate.
- Before handoff, `verify:all` must pass or every blocker must be listed explicitly.

## Visual test prerequisite

Before running `verify:visual`, confirm that `tests/visual/verify.mjs` exists in the
repository. If it does not exist, record `[BLOCKED] verify:visual — tests/visual/verify.mjs
not present` and carry it as a follow-up item. Never infer a visual pass from unit tests.
