---
name: yue-component-design
description: Design, implement, document, test, and review Yue Design Vue components or component families. Trigger for adding a component, building a component family, redesigning component API/Token/CSS, or reviewing component quality (新增组件、组件族、组件设计、组件重构、组件验收); do not trigger for documentation-only edits, isolated token maintenance, or release publishing.
metadata:
  short-description: Yue component design and acceptance workflow
---

# Yue component design

Use this skill for a complete component vertical slice. It is an operating guide, not a
request to imitate TDesign, Vuetify, Ant, or Reka APIs. The repository is pre-release:
correctness and a clean design outrank compatibility, but existing unrelated behavior must
still be regression-tested.

## Repository map

```text
packages/vue/                         Vue components and public entries
packages/tokens/                      pure CSS primitive/semantic/component tokens
packages/hooks/                       shared runtime hooks, only after reuse is real
apps/docs/components/{name}.md        runnable examples
apps/docs/components/{name}/api.md    public API and DOM contract
apps/docs/components/{name}/guide.md  usage, decisions, limitations
```

## First route: classify and choose a reference

Before writing API or CSS, record both classification axes:

| Axis | Values | Read when |
| --- | --- | --- |
| Drive | `template`, `imperative` | imperative needs mount, queue, app-context and cleanup rules |
| Position | `in-place`, `detached` | detached needs Teleport, positioning, outside interaction and SSR rules |
| Lifecycle | `persistent`, `transient` | transient needs timing, cancellation and unmount cleanup |
| Composition | `atomic`, `compound` | compound needs typed parent-owned state and child registration |

Choose one reference implementation (existing Yue component first; otherwise Reka for
complex interaction, or Vuetify/Ant/Nuxt UI/shadcn for a design comparison). In the handoff
write what was borrowed and what was deliberately rejected. Do not copy an API count.

Read only the routed references needed by the classification:

| Concern | Read |
| --- | --- |
| Every component | `references/api-naming.md`, `references/token-matrix.md`, `references/verification-matrix.md` |
| In-place or atomic | `references/module-in-place.md` |
| Detached or transient | `references/module-detached.md` |
| Compound | `references/module-compound.md` |
| Imperative | `references/module-imperative.md` |
| Keyboard/focus/roles | `references/a11y-keyboard.md` |
| Handoff | `references/handoff-template.md` |

## Delivery workflow

1. Establish a baseline with focused tests and `git status`; inspect the nearest Yue
   component, its tokens, three docs pages, package entry, and consumer tests.
2. Freeze Props, Slots, Emits, models, exposed methods, defaults, attribute routing, and
   intentional non-features in `types.ts` and the API page before writing CSS.
3. Design a token/state matrix. Keep `component token -> semantic token -> primitive token`;
   component CSS never reads primitives, hard-codes colors, or reads another component's tokens.
4. Implement the smallest correct architecture. Vue SFCs use `<script setup lang="ts">`; CSS
   is a separate unlayered BEM entry using the fixed `yue` namespace and `useNamespace`.
5. Add the three docs pages from the real component, package entry and CSS entry. Do not
   duplicate API tables across pages.
6. Test from the black-box contract outward. Unit tests cover state, events, slots, DOM
   routing and edge cases; browser tests cover geometry/focus/keyboard/IME/Teleport/contrast
   whenever those are part of the contract. Add SSR coverage when setup can touch the browser.
7. Run the smallest applicable matrix while iterating, then `corepack pnpm verify:all` before
   handoff. A skipped or failing gate is reported as such, never as complete.
8. Review the diff for dead props, stale docs, duplicate contracts, generated probes and
   compatibility branches that are not part of the final design.

## Yue hard constraints

- Public classes are global BEM (`.yue-{component}`, `__part`, `--modifier`, `is-*` state).
- Namespace is fixed to `yue`; runtime prefix configuration is not an API because CSS is prebuilt.
- No `<style>` or `<style scoped>` in component SFCs; component CSS is unlayered and explicit.
- JavaScript does not import CSS. Consumers choose `@yue-ui/vue/style.css` or a component CSS entry.
- Root entry uses named exports; full registration exists only in the plugin entry.
- Prefer native semantics. Reka is for genuinely complex detached primitives, not basic inputs/buttons.
- Consumers own icons through slots; Yue does not ship an icon library by default.
- `YueConfig` owns component defaults such as `size`; locale text is governed by `yue-i18n`,
  not by a component-local message table.
- Shared logic enters `packages/hooks` only when a second consumer justifies it.
- Before writing a new composable, check existing Yue hooks and the approved VueUse surface;
  do not add a dependency or a one-off abstraction for a single consumer.
- When a component adds or changes user-facing text, also use the `yue-i18n` skill and its
  catalog/docs gates; do not create a local translation mechanism inside the component.
- During development, remove wrong abstractions instead of adding compatibility layers.

## Commands

```text
corepack pnpm new:component <name> [--position in-place|detached] [--drive template|imperative] [--lifecycle persistent|transient] [--composition atomic|compound]
corepack pnpm audit:component <name>
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm audit:tokens
corepack pnpm audit:docs
corepack pnpm verify:dist
corepack pnpm verify:treeshaking
corepack pnpm verify:visual
corepack pnpm verify:tarball
corepack pnpm verify:all
```

The scaffold is optional; it creates a reviewable skeleton and never overwrites an existing
component. The audit is a structural check, not a substitute for design judgment.

## Handoff

Use [references/handoff-template.md](references/handoff-template.md) as the single report
format. It must include classification, reference decisions, API and non-features, token and
accessibility matrices, changed entries/docs, actual command results, regression impact,
limitations and deliberate breaking changes. Use
[references/verification-matrix.md](references/verification-matrix.md) as the single source
for which gates are required. Release/versioning belongs to a separate release workflow.
