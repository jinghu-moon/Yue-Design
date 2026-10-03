# Reactivity, SSR and hydration

- Derived values belong in `computed`, not methods called from templates.
- Watch the smallest source and use `onCleanup`/`onWatcherCleanup` for abortable async work.
- Do not mutate injected objects directly; provide refs or actions from the owner and derive
  scoped overrides from the nearest provider.
- Browser-only work belongs in `onMounted` or a client guard. Setup must be safe under
  `renderToString`.
- A `computed` that reads browser APIs runs during SSR. Guard with `typeof document !== 'undefined'`
  inside the computed body, or defer to `onMounted`. Do not put a browser-dependent `computed`
  value in the initial return of `setup` without a guard — it will throw on the server.

**Pattern — browser API inside `computed` (e.g. canvas color parsing):**

```ts
// ✅ Correct: guarded computed — SSR-safe, runs on client without an extra tick
const colorStyle = computed(() => {
  const c = props.color
  if (!c) return undefined

  let r = 128, g = 128, b = 128
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = c
      ctx.fillRect(0, 0, 1, 1)
      ;[r, g, b] = ctx.getImageData(0, 0, 1, 1).data as unknown as [number, number, number, number]
    }
  }
  // ... derive styles from r, g, b
})

// ❌ Wrong: unguarded — throws on server
const colorStyle = computed(() => {
  const canvas = document.createElement('canvas') // ReferenceError: document is not defined
  // ...
})

// ⚠️ Works but wrong timing: value is undefined on first render, computed on next tick
// Only use onMounted when a first-render approximation is genuinely acceptable.
const colorStyle = ref<object | undefined>(undefined)
onMounted(() => {
  // this is fine for a transition or progressive-enhancement,
  // not fine when the value must be correct on mount
  colorStyle.value = deriveColorStyle(props.color)
})
```

The guarded `computed` pattern is preferred for visual props (color, size derived from DOM)
because the value is always current as props change. `onMounted` is correct for side effects
(observers, event listeners, third-party integrations) that must not run at all on the server.
- The server and first client render must choose the same locale, random id strategy, and
  visibility state. A browser locale read during setup is a hydration mismatch.
- Teleport and transitions need an SSR output decision, focus restoration, and cleanup test.

Debug in this order: reproduce, inspect reactive ownership, inspect lifecycle timing, then inspect
the DOM/package boundary. Do not silence a warning or add `nextTick()` without identifying the
ordering contract it repairs.

Official references: [Vue SSR](https://vuejs.org/guide/scaling-up/ssr.html),
[hydration mismatch](https://vuejs.org/guide/scaling-up/ssr.html#hydration-mismatch),
[watchers](https://vuejs.org/guide/essentials/watchers).
