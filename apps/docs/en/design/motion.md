# Motion

The job of motion is to explain state changes, establish spatial relationships, and give feedback that something is in progress — not to decorate the page.

## Token

| Purpose | Token |
| --- | --- |
| Fast interaction | `--motion-duration-interaction` |
| Enter | `--motion-duration-enter` |
| Exit | `--motion-duration-exit` |
| Standard easing | `--motion-ease-standard` |

Components may keep using their own Component Token (for example `--button-duration`), but they should map to these semantic aliases rather than scattering `100ms` or custom cubic-bezier values directly.

## Tradeoff rules

- Color, borders, and short-distance displacement suit fast motion; only complex container transitions use longer durations.
- Keep a single dominant direction of movement per sequence, and avoid orchestrating several elements at once for no reason.
- Loading feedback must stay understandable with motion turned off. Button stops spinning under `prefers-reduced-motion: reduce` and keeps the static spinner shape.
- Page transitions and dismissible overlays should support reduced motion; motion cannot be the only cue for discovering a feature.
- Under `forced-colors: active`, prioritize borders, focus, and text, and do not rely on shadows or gradients to express state.

## Self-check

Before adding motion, ask three questions: what change does it explain? Is it still usable without it? When the user asks for reduced motion, is there still equivalent feedback? If you cannot answer any of them, you should not add that motion.
