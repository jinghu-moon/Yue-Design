# Component handoff

Copy this template into the final report. Replace every bracket; do not claim an unchecked item.

## Identity

- Component/family: `[YueName]`
- Classification: drive `[template|imperative]`, position `[in-place|detached]`, lifecycle `[persistent|transient]`, composition `[atomic|compound]`
- Reference implementation: `[name]`; borrowed `[decisions]`; rejected `[decisions]`

## Contract

- API decisions: `[props/models/emits/slots/expose/defaults/attribute routing]`
- Intentional non-features: `[what is absent and why]`
- Breaking changes: `[none or exact changes]`
- Token/state matrix: `[link or short table]`
- Accessibility and keyboard: `[roles, names, focus, disabled/loading/selected, APG pattern]`

## Surface

- Source, types, tests and CSS: `[paths]`
- Package/root/plugin/style entries: `[paths]`
- Docs: `[example]`, `[api]`, `[guide]`

## Evidence

```text
typecheck: [PASS/FAIL + result]
build: [PASS/FAIL + result]
test: [PASS/FAIL + focused result]
audit:tokens: [PASS/FAIL]
audit:docs: [PASS/FAIL]
verify:dist: [PASS/FAIL]
verify:treeshaking: [PASS/FAIL]
verify:visual: [PASS/FAIL/N/A + reason]
verify:tarball: [PASS/FAIL/N/A + reason]
verify:all: [PASS/FAIL/not run + reason]
```

## Regression and limits

- Baseline and regression impact: `[actual before/after behavior]`
- Known limitations or untested environments: `[list]`
- Follow-up deliberately outside this slice: `[list]`
