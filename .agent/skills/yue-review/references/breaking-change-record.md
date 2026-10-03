# Breaking change record

Fill one table row per broken public API surface. Complete this before implementing the
change. See `yue-component-spec/references/breaking-change-process.md` for the full process.

| Surface | Old | New | Reason | Before-state test | After-state test |
| --- | --- | --- | --- | --- | --- |
| `[prop/emit/slot/token/class name]` | `[old value/type/behavior]` | `[new value/type/behavior]` | `[design rationale — not "cleanup"]` | `[test file:line]` | `[test file:line]` |

## Checklist

- [ ] Every broken surface has a row above.
- [ ] Every row has a concrete design rationale (not "cleanup" or "refactor").
- [ ] A before-state test was written and verified passing before the change was made.
- [ ] An after-state test asserts the new intended behavior.
- [ ] All affected language packs are updated in the same commit (if locale keys changed).
- [ ] The handoff Contract section lists every breaking change from this table.
- [ ] No compatibility shim was added to preserve the old behavior alongside the new one.

## Consumer migration note

Write one sentence per breaking change that tells a consumer what to update:

- `[Component]: rename prop \`[old]\` to \`[new]\` in all usages.`
- `[Component]: \`[emit]\` payload changed from \`[old type]\` to \`[new type]\`; update handlers.`
