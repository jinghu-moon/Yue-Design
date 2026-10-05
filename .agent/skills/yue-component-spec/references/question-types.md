# Interview question types

`data.js` defines what can be asked. The panel renders behavior from `type`; an
agent must not encode fact finding as a fake multiple-choice decision.

| Type | Meaning | User input | Counts as decision |
|---|---|---|---|
| `choice` | one design decision | one letter; rendered as `radiogroup` | yes when decided |
| `multi-choice` | several compatible decisions | one or more letters; rendered as a multiselectable `group` | yes when decided |
| `open` | unconstrained user response | text value | yes when decided |
| `fact-question` | question for agent research | text/status | no; requires finding |
| `prototype-gate` | cannot settle in prose | status/note | no; requires prototype result |

Use `recommended: ['A', 'C']` for multi-choice. A single string is accepted only
for legacy data and is normalized to a one-element array. `freeze-gate` is not a
question type in `QUESTIONS`; it is fixed by the template.

Every question should declare `required: true` unless it is explicitly optional.
Facts belong in `FINDINGS`, and the follow-up design choice should be a separate
`choice` question linked with `introducedBy`.
