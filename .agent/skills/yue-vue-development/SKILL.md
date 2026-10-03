---
name: yue-vue-development
description: Implement or debug Vue 3 code in Yue Design, including SFCs, composables, provide/inject, SSR, hydration, and runtime reactivity. Trigger for Vue or TypeScript component internals, hooks, watchers, attrs, emits, expose, Teleport, or hydration issues; do not use for component design acceptance, testing-only work, docs-only work, or release tasks.
metadata:
  short-description: Yue-specific Vue 3 implementation and debugging
---

# Yue Vue development

Use Composition API with `<script setup lang="ts">` and preserve Yue's package boundaries.
Read only the routed reference needed for the task:

| Task | Read |
| --- | --- |
| SFC/API/attrs/emits/expose | `references/vue-contracts.md` |
| reactivity, watcher, SSR or hydration | `references/reactivity-ssr.md` |
| a new composable or hook | `references/composables.md` |

## Yue constraints

- Inspect the nearest existing component and its tests before changing implementation.
- Native semantics and native behavior come first; wrappers must not become fake controls.
- Declare emits so native listeners cannot fall through and fire twice. Route `$attrs` explicitly
  when there are multiple roots or a visual wrapper plus a native control.
- Do not import CSS from JavaScript. Do not put a `<style>` block in library SFCs.
- Keep shared runtime code in `packages/hooks` only after a second consumer justifies it.
- Use `Symbol.for('yue:*')` for contexts that cross the separately built hooks/vue packages.
- Do not read browser globals during SSR setup. Clean every listener, timer, observer and async
  task on unmount or invalidation.
- Do not add compatibility branches in the pre-release repository to preserve a wrong design.

## Workflow

1. Establish the current behavior with a focused test or reproduction.
2. Identify ownership: prop, local state, parent context, or consumer-provided slot.
3. Implement the smallest correct Vue contract; avoid implementation-derived public APIs.
4. Add or update black-box tests, then run the relevant Yue gates.
5. Report actual behavior, SSR/browser assumptions and any deliberate breaking change.

Use `corepack pnpm typecheck` for every implementation change. Component work also follows
`yue-component-design`; user-facing strings additionally follow `yue-i18n`.
