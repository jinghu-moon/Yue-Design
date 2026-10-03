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

## Stylesheet string assertions — anti-pattern

Tests that read the CSS file as a string and call `toContain('.yue-tag')` are **file-presence
checks, not behavior checks**. They tell you the text exists in a file; they say nothing about
whether the browser applies it, whether the selector matches rendered markup, or whether the
token chain resolves correctly.

```ts
// ❌ ANTI-PATTERN — confirms text in a file, not rendered behavior
it('defines base .yue-tag rule', () => {
  expect(STYLESHEET).toContain('.yue-tag')
})

// ✅ CORRECT — asserts what the component actually renders
it('renders with the yue-tag class', () => {
  const wrapper = mount(YueTag, { slots: { default: 'label' } })
  expect(wrapper.classes()).toContain('yue-tag')
})
```

Stylesheet string assertions are acceptable only as a last-resort guard for non-renderable
CSS constructs (e.g. confirming `@media` blocks or `@keyframes` names exist in the shipped
file). They do not count as behavioral coverage and must not substitute for mount-based
assertions. A passing stylesheet string test with no mount-based counterpart is a gap, not
a pass.

## IME event sequences

## Browser tests vs. visual regression tests

These are two different gate types. Confusing them creates false coverage claims.

| Gate | Tool | What it proves |
| --- | --- | --- |
| Visual regression (`verify:visual`) | Screenshot diff | Pixel output did not change between commits |
| Browser behavior | Playwright / Vitest browser mode | Keyboard interaction, focus order, ARIA output, contrast, IME event ordering |

`verify:visual` passing does **not** mean keyboard navigation works. Browser behavior tests
must be written and run separately when the component contract includes keyboard interaction,
focus management, ARIA state transitions, or platform event ordering. "No visual regression"
and "keyboard accessible" are independent claims that require independent evidence.

## IME event sequences

Components that handle text input must cover both browser event orderings as separate test cases:

- **Chromium order**: `compositionstart` → input events during composition → `compositionend` →
  one trailing `input` event with the final value. The final commit comes from that trailing input.
- **Firefox/CDP order**: `compositionstart` → input events during composition → one final `input`
  event (still mid-composition) → `compositionend`. The final commit comes from compositionend
  re-dispatching through the control.

For each ordering, assert:
- `update:modelValue` is emitted exactly once with the final composed value.
- No partial/interim value is emitted during composition.
- The emitted `input` event always has `type === 'input'` (even for synthetic dispatches).
- The dispatched synthetic event has a real `target` (not null).
