# Freeze gate

The final gate is rendered by the panel and is never authored as a normal question
in `data.js`:

1. **Freeze** — generate `spec.md` and enter implementation design.
2. **Prototype** — do not freeze; create an HTML prototype and return with evidence.
3. **Continue** — do not freeze; run another interview round.

Freeze is permitted only when:

- the user selected `freeze`;
- every required decision is `decided`, or `not-applicable` with an explanation;
- every required fact has a linked finding;
- no user question remains open;
- no item is `needs-prototype` or `needs-research`.

The panel must show the blocking items. The agent must still confirm shared
understanding before writing the spec.
