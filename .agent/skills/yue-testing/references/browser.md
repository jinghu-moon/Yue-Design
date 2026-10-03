# Browser and visual tests

Use the existing `tests/visual/verify.mjs` harness and real Chromium for behavior that jsdom or
happy-dom cannot model. Prefer semantic and numeric assertions over screenshot-only comparison.

Required probes when applicable:

- keyboard Tab/Shift+Tab/Enter/Space/Arrow/Escape and focus restoration;
- `getComputedStyle`, bounding boxes, scroll width, page overflow and stable loading geometry;
- light/dark/accent/neutral profiles, WCAG contrast and forced colors;
- `prefers-reduced-motion` with a static, still-visible state;
- IME composition event order and payload identity/target;
- long translations and narrow mobile widths;
- Teleport, outside click, stacking and SSR-generated ids;
- axe scan as a supplement to semantic assertions.

Wait for the actual transition duration or a deterministic state signal. “Read twice until equal”
can sample a transition mid-flight and falsely pass. Do not compare browser color serialization
strings; sample pixels or normalize through the same color math as the audit.
