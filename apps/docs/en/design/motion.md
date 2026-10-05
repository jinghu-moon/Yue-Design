# Motion

The job of motion is to explain state changes, establish spatial relationships, and give feedback that something is in progress — not to decorate the page.

## Token

| Purpose | Token |
| --- | --- |
| Fast interaction | `--motion-duration-interaction` |
| Enter | `--motion-duration-enter` |
| Exit | `--motion-duration-exit` |
| Standard easing | `--motion-ease-standard` |

The duration primitives form a 50ms-stepped ladder, `--duration-100` / `--duration-150` / `--duration-200` / `--duration-250` / `--duration-300` / `--duration-350` / `--duration-400`; `--duration-fast/normal/slow` alias the 100/200/300 rungs, and the semantic roles in the table above compose from those aliases. When a component's motion character clearly differs from the default enter/exit roles — a modal dialog is more deliberate than a transient popover, for example — its Component Token may name a specific rung on the ladder directly (e.g. `--dialog-duration-enter: var(--duration-250)`, `--dialog-duration-exit: var(--duration-150)`) rather than scattering a raw value.

Components may keep using their own Component Token (for example `--button-duration`), but they should map to a named token — a semantic alias or a rung on the duration ladder — rather than scattering `100ms` or custom cubic-bezier values directly.

## Tradeoff rules

- Color, borders, and short-distance displacement suit fast motion; only complex container transitions use longer durations.
- Keep a single dominant direction of movement per sequence, and avoid orchestrating several elements at once for no reason.
- Loading feedback must stay understandable with motion turned off. Button stops spinning under `prefers-reduced-motion: reduce` and keeps the static spinner shape.
- Page transitions and dismissible overlays should support reduced motion; motion cannot be the only cue for discovering a feature.
- Under `forced-colors: active`, prioritize borders, focus, and text, and do not rely on shadows or gradients to express state.

## Self-check

Before adding motion, ask three questions: what change does it explain? Is it still usable without it? When the user asks for reduced motion, is there still equivalent feedback? If you cannot answer any of them, you should not add that motion.
