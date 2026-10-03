# Unit and component tests

Use the repository's Vitest projects: token tests run in Node; Vue tests run in happy-dom with
the Vue plugin and source aliases. Keep tests deterministic and independent of a prior build.

Cover the contract in this order:

1. render and default/config inheritance;
2. public props, models, slots and emitted payloads;
3. native attribute routing and semantic states;
4. controlled/uncontrolled updates and parent re-render behavior;
5. edge cases, cleanup and errors.

Use `await nextTick()` or a targeted flush for Vue updates. Use `flushPromises()` for promises.
Do not use arbitrary sleeps in unit tests. Mount a real consumer wrapper when parent ownership,
provide/inject or v-model behavior matters.

The assertion should survive an internal refactor. If a test needs a private class or ref, first
ask whether that detail is actually a public DOM contract; if yes, document it and test it through
the rendered output.
