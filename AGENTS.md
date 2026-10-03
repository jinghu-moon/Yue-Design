# Yue Design Agent Instructions

## Skill routing

### New component or component family

Read and follow in order:

1. [`.agent/skills/yue-component-spec/SKILL.md`](.agent/skills/yue-component-spec/SKILL.md) —
   clarify scope, freeze the draft API, and produce a component spec before writing any code.
2. [`.agent/skills/yue-component-design/SKILL.md`](.agent/skills/yue-component-design/SKILL.md) —
   classify, design tokens, implement, document, and test.
3. [`.agent/skills/yue-review/SKILL.md`](.agent/skills/yue-review/SKILL.md) — self-review,
   run acceptance checklist, and produce a handoff report before marking the task complete.

### Modifying an existing component (API, style, behavior, accessibility, or slots)

Read and follow:

1. [`.agent/skills/yue-component-spec/SKILL.md`](.agent/skills/yue-component-spec/SKILL.md) —
   record what is changing and why; identify breaking changes before touching code.
2. [`.agent/skills/yue-component-design/SKILL.md`](.agent/skills/yue-component-design/SKILL.md) —
   apply the change using the same classification, token, and constraint rules.
3. [`.agent/skills/yue-review/SKILL.md`](.agent/skills/yue-review/SKILL.md) — verify regression
   coverage and produce a handoff report.

### Fixing a bug (behavior, accessibility, i18n, visual, or browser-specific)

Read and follow:

1. [`.agent/skills/yue-component-spec/SKILL.md`](.agent/skills/yue-component-spec/SKILL.md) —
   reproduce and document the defect; define the correct behavior before changing code.
2. The skill(s) that own the broken surface:
   - Vue/reactivity/composables → [`.agent/skills/yue-vue-development/SKILL.md`](.agent/skills/yue-vue-development/SKILL.md)
   - CSS/token/visual → [`.agent/skills/yue-component-design/SKILL.md`](.agent/skills/yue-component-design/SKILL.md)
   - Test failure → [`.agent/skills/yue-testing/SKILL.md`](.agent/skills/yue-testing/SKILL.md)
   - i18n/locale → [`.agent/skills/yue-i18n/SKILL.md`](.agent/skills/yue-i18n/SKILL.md)
3. [`.agent/skills/yue-review/SKILL.md`](.agent/skills/yue-review/SKILL.md) — confirm the fix,
   add a regression test, and report honestly what was verified and what was not.

### Other routing rules

- **User-facing strings, locale messages, language packs, adapters, RTL, or bilingual docs** —
  also read [`.agent/skills/yue-i18n/SKILL.md`](.agent/skills/yue-i18n/SKILL.md) and follow
  [the I18N roadmap](docs/03-yue-i18n-roadmap.md). Required whenever a component change
  introduces or modifies user-facing text, even if i18n is not the primary task.
- **Vue internals, SFC patterns, composables, SSR, or reactivity** —
  [`.agent/skills/yue-vue-development/SKILL.md`](.agent/skills/yue-vue-development/SKILL.md)
- **Test design, Vitest, browser tests, visual regression, or package boundary** —
  [`.agent/skills/yue-testing/SKILL.md`](.agent/skills/yue-testing/SKILL.md)
- **VitePress docs, component pages, or docs site build** —
  [`.agent/skills/yue-docs/SKILL.md`](.agent/skills/yue-docs/SKILL.md)
- **Release, versioning, changelog, or npm publishing** —
  [`.agent/skills/yue-release/SKILL.md`](.agent/skills/yue-release/SKILL.md)

## Reference materials

`refer/` at the repository root contains reference component libraries and design samples
for use during component spec and design work. When a task provides screenshots, HTML, or
asks you to consult TDesign, Vuetify, Ant Design, Reka, shadcn, or similar libraries, read
the relevant files in `refer/` as supporting material. Extract design intent — API surface,
interaction patterns, ARIA decisions, visual axes — but do not copy class names, token names,
prop names, or internal implementation. Record what was borrowed and what was rejected in the
component spec. See `yue-component-spec/references/draft-template.md` → Reference materials
for the exact extraction rules.

## Project-wide rules

This project is pre-release. Correctness and a clean design outrank backward compatibility.

- Remove wrong abstractions instead of layering compatibility shims over them.
- Breaking changes are allowed; they must be documented and covered by before/after tests.
- Do not delete tests, weaken assertions, or modify expected values to manufacture a pass.
  A failing test means the implementation is wrong; fix the implementation.
- Report verification results honestly. A skipped or failing gate is stated as such, never
  described as complete.
