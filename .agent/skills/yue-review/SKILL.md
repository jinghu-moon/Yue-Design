---
name: yue-review
description: Self-review a completed component slice, run the acceptance checklist, verify all gates pass, and produce a handoff report. Trigger at the end of any component task before marking it complete (组件审查、组件验收、组件交接、验收清单、组件完成确认、handoff).
metadata:
  short-description: Component acceptance, verification gates, and handoff report
---

# Yue component review

This skill runs after implementation and testing are complete. It is a structured self-audit,
not a rubber stamp. Every item on the checklist either passes with evidence or is recorded as
a known gap. Do not mark a task complete without producing a handoff report.

## Route the review

| Changed surface | Read |
| --- | --- |
| Any component review | `references/acceptance-checklist.md` |
| API or behavior change | `references/regression-matrix.md` |
| Breaking changes present | `references/breaking-change-record.md` |
| Handoff report | `references/handoff-template.md` |
| Verification commands | `references/verification-commands.md` |

## Review workflow

1. Read `references/verification-commands.md`. Determine the required gate set for this
   change surface (do not invent a smaller set).
2. Run every required gate from the project root. Record the actual command and its exit
   status or output excerpt. Do not infer a pass from a broader command.
3. Read `references/acceptance-checklist.md`. Work through every item.
   - Items that pass: note the evidence (command output, file path, test name).
   - Items that fail: stop and fix the implementation. Do not proceed to handoff with a
     known failing item unless it is explicitly recorded as a blocker with a follow-up plan.
   - Items marked N/A: write one sentence explaining why the concern does not apply.
4. Read `references/regression-matrix.md`. Confirm that all surfaces touched by this change
   have regression coverage. If a surface is not covered, either add a test or record the
   gap explicitly.
5. If any breaking change is present, read `references/breaking-change-record.md` and
   verify every field is filled.
6. Produce the handoff report using `references/handoff-template.md`. The Evidence section
   must contain actual command output, not inferred results.

## Hard rules

- A failing acceptance item is not a reason to weaken the checklist. Fix the implementation.
- "Tests pass" is not evidence unless you ran the tests and saw the output. Paste the output.
- A gate skipped because a script or tool is unavailable is a blocker. Record it as:
  `[BLOCKED] verify:visual — tests/visual/verify.mjs not present; visual behavior untested.`
  Do not write `[PASS]` or `[N/A]` for a gate you did not run.
- Do not delete tests, skip them with `.skip`, weaken assertions, or change expected values
  to manufacture a pass. If a test fails, fix the implementation.
- Intentionally unimplemented features must appear in the "Follow-up" section of the handoff
  report. Silence about a known gap is a false claim of completeness.
