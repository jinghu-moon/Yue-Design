---
name: yue-component-spec
description: Clarify scope, run a design interview with the user, and freeze the API contract before any implementation begins. Trigger at the start of any component task — new component, existing component modification, or bug fix — before writing code (组件草案、组件设计、API 设计、组件边界、需求澄清、组件规格、缺陷复现、设计访谈、组件讨论).
metadata:
  short-description: Component design interview, draft, and API freeze
---

# Yue component spec

This skill runs before any implementation. Its job is to turn a loose idea into a frozen
component spec through a structured design interview. Do not write component code or CSS until
the interview is complete and the spec is written.

## How this works

You rarely arrive here with a complete, detailed spec. That is expected. The interview exists
to surface the decisions you haven't made yet, not to quiz you on ones you have. Bring a rough
idea, a screenshot, a reference component, or just a name — the interview will do the rest.

The Agent will:
1. Study the materials you provide (screenshots, HTML, reference library code in `refer/`).
2. Look up facts it can find itself (existing Yue components, tokens, patterns in the codebase).
3. Run a design interview in rounds, asking only decisions that are ready to be made.
4. Give a recommended answer for every question so you can respond quickly.
5. After the interview, write the component spec and freeze the API.

You will:
1. Answer the questions — agree, disagree, or say "I don't know" and mean it.
2. Push back on any question that feels wrong or off-scope.
3. Confirm when the understanding is shared and the spec is correct.

## Interview format

Each round asks the whole "frontier": every decision whose prerequisites are already settled.
Nothing in a round depends on another question in the same round. Later rounds build on your
answers from earlier rounds.

```
❓ Q1 - [Question title]: [Question body, with context and options]

➡️ [Recommended answer]

---

❓ Q2 - [Question title]: [Question body]

➡️ [Recommended answer]
```

You can respond by number: "1 agree, 2 I'd prefer option B because..., 3 I don't know yet."
Disagreement is more valuable than agreement. A session with no pushback is a session that
produced the Agent's opinion, not yours.

**Facts vs. decisions:** The Agent finds facts (reads files, checks existing components,
inspects `refer/` libraries). You make decisions. The Agent will not ask you something it
can look up itself, and it will not answer a decision for you.

**Ungrillable questions:** Some questions cannot be settled by talking. "How should this
feel visually?" or "which of these two layouts works better?" cannot be answered without
something to react to. When the interview hits one of those, the Agent will note it and
move on; you can settle it after seeing a prototype.

**When to stop:** The interview ends when the design tree is fully explored — every branch
visited, nothing left silently assumed. The Agent will ask you to confirm the understanding
is shared before writing the spec. Do not proceed to implementation without that confirmation.

## Interview panel

The interview runs as a browser panel, not in the terminal. Use
`references/interview-panel-template.html` as the base:

1. Create directory `interviews/{component-kebab}/`.
2. Copy `references/interview-panel-template.html` to `interviews/{component-kebab}/panel.html` — do not edit it.
3. Copy `references/data-template.js` to `interviews/{component-kebab}/data.js` and fill in
   `COMPONENT_NAME`, `SECTIONS`, and `QUESTIONS`. Use JS object syntax (trailing commas and
   `//` comments allowed); never hand-write JSON inside HTML.
4. Ask the user to open `panel.html` in a browser and answer the questions.
5. The user exports answers with the ↓ button; the file saves as `answers.json` in their
   Downloads folder. Ask them to move it to `interviews/{component-kebab}/answers.json`.
6. Read `answers.json` to collect decisions, then write the component spec.

### File layout

```
interviews/
  yue-button/
    panel.html     ← static shell, never edited (Agent copies from template)
    data.js        ← Agent writes this; questions defined as JS object literals
    answers.json   ← user exports from panel, then moves here
  yue-input/
    panel.html
    data.js
    answers.json
  ...
```

`data.js` is the source of truth for what was asked.
`answers.json` is the only input the Agent reads back — never re-read `data.js` to infer answers.

When multiple interviews exist simultaneously (two components being designed in
parallel), each pair is fully independent. Reference a specific pair by its
component prefix; never merge or cross-read answer files.

## When to use

| Task type | Interview scope |
| --- | --- |
| New component | Full interview: use cases, boundary, classification, API, tokens, a11y, non-features |
| Existing component change | Focused interview: what changes, why, breaking impact, affected surfaces |
| Bug fix | Defect interview: reproduce steps, root cause, correct behavior definition |

## Lightweight spec update (modifying an existing component)

When a component already has a frozen spec, do not re-run the full interview. Use this
shorter path instead:

1. **Locate the existing spec.** Find the spec document in `interviews/{component}/` or the
   handoff report. If neither exists, treat this as a new-component interview.
2. **State the delta.** Write one paragraph: what is changing, why, and what the correct
   behavior will be after the change. If the change is a bug fix, reproduce the defect first —
   confirm the bad behavior before describing the fix.
3. **Identify breaking changes.** For each changed prop, emit, slot, token name, or DOM
   contract, check whether existing consumers will silently break. If yes, follow
   `references/breaking-change-process.md` in full before writing any code.
4. **Update the spec document.** Edit the frozen spec in place — revise the affected sections,
   note the old value where it matters, and mark the change date. Do not create a parallel
   document; there must be one spec per component.
5. **Re-freeze.** The updated spec is the new contract. Confirm the understanding before
   touching implementation.

**Scale guide:**

| Change size | Path |
| --- | --- |
| Single new prop, no behavior change elsewhere | Lightweight update (steps 1–5) |
| New variant or visual state | Lightweight update; token matrix must cover the new surface |
| API rename or removal | Breaking-change process required; lightweight update after |
| New composition role (e.g. atomic → compound) | Full interview required |

Read only the reference needed:

| Concern | Read |
| --- | --- |
| New component or API redesign | `references/draft-template.md` |
| Any task with breaking changes | `references/breaking-change-process.md` |

## After the interview: writing the spec

Once the interview is complete and the understanding is confirmed, write the component spec
using `references/draft-template.md`. Every field must be filled. "TBD" is not allowed;
if something is genuinely unresolved, write "Not yet decided: [question to resolve]" so the
gap stays visible.

The API is frozen when the spec is written and you confirm it. From that point:
- The spec is the contract for `yue-component-design`, `yue-review`, and the handoff report.
- If the API changes after implementation starts, the spec must be updated and the change
  recorded as a breaking change (if public) or a correction (if still pre-freeze).
- Non-features are contractual. A deliberate non-feature cannot be added back silently.
- For any breaking change, follow `references/breaking-change-process.md` in full.

## Hard rules

- Do not start the interview and then answer your own questions. Decisions belong to the user.
- Do not rush to the spec. Run the full interview first; ask the next round before writing.
- Do not begin writing implementation code or CSS during this skill. This skill ends with a
  written, confirmed spec. Implementation happens in `yue-component-design`.
- If a question cannot be settled by talking, mark it as "needs prototype" and continue.
  Do not spend multiple rounds rephrasing an ungrillable question.

