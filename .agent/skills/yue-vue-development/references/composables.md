# Composables and hooks

Before creating a composable, search `packages/hooks`, VueUse's approved surface and the native
platform API. Do not add a dependency for a one-line helper. Promote logic to `packages/hooks`
only when a second Yue consumer has the same contract.

A reusable composable should state:

- accepted plain/ref/getter inputs and normalization with `toValue`/`toRef`;
- returned refs/actions and ownership of mutations;
- SSR behavior and browser prerequisites;
- cleanup for listeners, observers, timers and async work;
- whether it is safe outside a component instance.

Do not return an object whose fields silently change between setup and event callbacks. Test plain,
ref and getter inputs when the composable claims to support all three.

Official reference: [Vue composables](https://vuejs.org/guide/reusability/composables).
