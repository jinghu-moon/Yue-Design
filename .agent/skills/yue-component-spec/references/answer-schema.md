# Interview answer schema

The interview panel writes schema version `2`. `answers.json` is a snapshot of the
current interview state; immutable round snapshots belong in `history/`.

## Decision status

```text
decided          the user made a design decision
unknown          the user explicitly does not know yet
needs-research   an agent fact-finding task is required
needs-prototype  the decision requires a runnable prototype
question         the user raised a question instead of deciding
not-applicable   the question does not apply, with an explanatory note
```

Only `decided` and `not-applicable` (with a non-empty note) satisfy a required
decision. A note alone never makes a question decided.

## Answer entry

```json
{
  "type": "choice",
  "status": "decided",
  "letters": ["A"],
  "value": null,
  "note": "",
  "round": 1,
  "introducedBy": null,
  "supersedes": [],
  "updatedAt": "2026-10-04T00:00:00.000Z"
}
```

`letters` is used only by `choice` and `multi-choice`. `value` is used by `open`
and `fact-question`. `introducedBy` identifies a user question or finding that
caused a later question. `supersedes` records replaced decisions without deleting
history.

## Snapshot envelope

```json
{
  "schemaVersion": 2,
  "component": "YuePopover",
  "templateVersion": "2.0.0",
  "dataHash": "sha256:...",
  "exportedAt": "2026-10-04T00:00:00.000Z",
  "round": 2,
  "answers": {},
  "userQuestions": [],
  "findings": [],
  "freezeGate": { "choice": "continue", "updatedAt": null }
}
```

The panel may import schema v1 for migration, but it exports only schema v2. Unknown
question IDs are reported and never silently applied.
