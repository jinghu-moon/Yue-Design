# Reactivity, SSR and hydration

- Derived values belong in `computed`, not methods called from templates.
- Watch the smallest source and use `onCleanup`/`onWatcherCleanup` for abortable async work.
- Do not mutate injected objects directly; provide refs or actions from the owner and derive
  scoped overrides from the nearest provider.
- Browser-only work belongs in `onMounted` or a client guard. Setup must be safe under
  `renderToString`.
- The server and first client render must choose the same locale, random id strategy, and
  visibility state. A browser locale read during setup is a hydration mismatch.
- Teleport and transitions need an SSR output decision, focus restoration, and cleanup test.

Debug in this order: reproduce, inspect reactive ownership, inspect lifecycle timing, then inspect
the DOM/package boundary. Do not silence a warning or add `nextTick()` without identifying the
ordering contract it repairs.

Official references: [Vue SSR](https://vuejs.org/guide/scaling-up/ssr.html),
[hydration mismatch](https://vuejs.org/guide/scaling-up/ssr.html#hydration-mismatch),
[watchers](https://vuejs.org/guide/essentials/watchers).
