# Yue component acceptance checklist

> This checklist has moved to `.agent/skills/yue-review/references/acceptance-checklist.md`.
> Use the `yue-review` skill to run the full acceptance workflow and produce the handoff report.
>
> The checklist below is kept here as a quick reference summary only.
> The authoritative, complete version is in `yue-review`.

---

**Quick reference (not a substitute for yue-review):**

- API frozen before CSS; token matrix covers all states and profiles.
- `types.ts`, SFC, test, CSS entry present; no `<style>` block; no CSS import in JS.
- BEM + `useNamespace`; only `--{name}-*` tokens; no hard-coded colors.
- Keyboard matches APG pattern; all states have semantic output, not only color.
- Icon-only controls have accessible names; locale labels use `useLocale().t('…')`.
- Example, API, and Guide docs complete; DOM routing documented.
- All applicable gates from `yue-review/references/verification-commands.md` pass.
- `corepack pnpm verify:all` passes before handoff, or every blocker is explicitly recorded.
