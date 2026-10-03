# Handoff template

Copy this template into the final report. Replace every bracket. Do not claim an unchecked
item. Evidence must be actual command output — not inferred from a broader command.

---

## Identity

- **Component/family:** `[YueName]`
- **Classification:** drive `[template|imperative]`, position `[in-place|detached]`,
  lifecycle `[persistent|transient]`, composition `[atomic|compound]`
- **Reference implementation:** `[name]`; borrowed `[decisions]`; rejected `[decisions]`
- **Spec document:** `[path or inline if short]`

---

## Contract

- **API decisions:** `[props/models/emits/slots/expose/defaults/attribute routing summary]`
- **Intentional non-features:** `[what is absent and why — these are contractual, not omissions]`
- **Breaking changes:** `[none | list each: old API → new API, reason]`
- **Token/state matrix:** `[link or short table]`
- **Accessibility and keyboard:** `[roles, names, focus, disabled/loading/selected, APG pattern]`
- **Locale keys added or changed:** `[none | list each: key, languages updated]`

---

## Surface

- **Source, types, tests, CSS:** `[paths]`
- **Package/root/plugin/style entries:** `[paths]`
- **Docs:** `[example path]`, `[api path]`, `[guide path]`

---

## Evidence

Paste actual command output. Do not infer results from a broader command.

```text
typecheck:          [PASS/FAIL] — [one-line excerpt or "exit 0"]
build:              [PASS/FAIL] — [one-line excerpt]
test:               [PASS/FAIL] — [N tests passed, M failed]
audit:component:    [PASS/FAIL] — [excerpt or "0 errors"]
audit:tokens:       [PASS/FAIL] — [excerpt]
audit:docs:         [PASS/FAIL] — [excerpt]
audit:i18n:         [PASS/FAIL/N/A] — [excerpt or reason]
audit:docs:i18n:    [PASS/FAIL/N/A] — [excerpt or reason]
verify:dist:        [PASS/FAIL] — [excerpt]
verify:treeshaking: [PASS/FAIL] — [excerpt]
verify:visual:      [PASS/FAIL/BLOCKED] — [excerpt or "tests/visual/verify.mjs not present"]
verify:tarball:     [PASS/FAIL/N/A] — [excerpt or reason]
verify:all:         [PASS/FAIL/not run] — [excerpt or reason if not run]
```

---

## Regression and limits

- **Baseline and regression impact:** `[actual before/after behavior; which tests changed and why]`
- **Breaking change before/after tests:** `[which tests anchor the old behavior; which assert the new]`
- **Known limitations or untested environments:** `[list; "none" is a claim — be precise]`
- **Follow-up deliberately outside this slice:** `[list each with a reason; "none" if truly none]`

---

## Blocked items

List any gate that could not run, any acceptance-checklist item that failed and was not
fixed, and any test that was skipped. For each: state what it is, why it is blocked,
and what the follow-up plan is.

- `[BLOCKED] verify:visual — [reason] — follow-up: [action]`

If there are no blocked items, write: "No blocked items."
