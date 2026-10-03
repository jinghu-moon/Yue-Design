# In-place and atomic components

Use for controls that stay in normal flow and do not coordinate sibling state. Start with the
native element (`button`, `input`, `a`, `progress`, etc.); add a wrapper only when the wrapper
owns layout or visual state. Keep the native element as the single semantic control.

Checklist:

- Route fallthrough attributes deliberately to the native element.
- Define controlled/uncontrolled value behavior before implementation.
- Keep visual state on the wrapper only when it paints; mirror semantic state on the native node.
- Test long content, narrow containers, focus-visible, disabled/readonly and forced colors where applicable.
- Promote logic to `packages/hooks` only after another component consumes the same contract.

Do not add group context, a generalized field wrapper, or an icon registry to make one atomic
component look complete.
