# Detached and transient components

Use for popovers, dialogs, menus, tooltips and other content rendered outside its trigger.
Read the relevant WAI-ARIA APG pattern and the chosen positioning/focus infrastructure before
coding. Do not hand-roll a second focus trap or floating-position algorithm.

Decide and test:

- `open` ownership, trigger modes, close reasons and event ordering;
- Teleport target, SSR output and hydration-safe ids;
- placement, collision handling, stacking and scroll/resize cleanup;
- outside pointer interaction and Escape behavior;
- initial focus, focus trap (when required), restore target and inert background semantics;
- transient enter/leave cancellation and unmount cleanup.

The component must remain usable with reduced motion and without color. Geometry belongs in the
browser gate, not a jsdom snapshot.

Useful official references: [Vue Teleport](https://vuejs.org/guide/built-ins/teleport),
[Vue SSR](https://vuejs.org/guide/scaling-up/ssr.html), and the
[WAI-ARIA dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
