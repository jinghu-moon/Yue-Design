---
name: yue-docs
description: Build, edit, review, or verify the Yue Design VitePress documentation site, component examples, API/Guide pages, navigation, search, or bilingual docs. Trigger for docs site work, VitePress config, component documentation, examples, or documentation build failures; do not use for library implementation without docs impact or release publishing.
metadata:
  short-description: Yue VitePress documentation and component docs
---

# Yue documentation

The docs site is a real consumer of `@yue-ui/vue`, not a static mock. Read the routed reference:

| Task | Read |
| --- | --- |
| VitePress config/theme/i18n | `references/site.md` |
| component Example/API/Guide | `references/component-pages.md` |
| docs acceptance/review | `references/verification.md` |

## Yue documentation contracts

- Every mature component has three pages: runnable Example, API, and Guide.
- Examples render the real package component and use the same source for code snippets and output.
- API tables, Props, Slots, Emits and config keys must agree with TypeScript/SFC contracts; run
  `corepack pnpm audit:docs` after public API changes.
- Do not duplicate a contract table across pages. Put the authoritative table in API and link to it.
- Docs UI has its own locale strings; Yue component messages use `yue-i18n` and must not be mixed.
- Use real package/style imports and explicit CSS order. Do not introduce CDN dependencies or fake
  HTML in place of the library component.

## Workflow

1. Inspect `.vitepress/config.ts`, theme components and the nearest component's three pages.
2. Update the smallest content/config surface, keeping navigation, links and locale trees aligned.
3. Run docs typecheck/build and the relevant package/browser gates.
4. Inspect direct locale URLs, mobile width, dark mode, search, examples and broken links.

Current commands: `corepack pnpm -C apps/docs dev`, `corepack pnpm -C apps/docs build`,
`corepack pnpm -C apps/docs typecheck`, `corepack pnpm audit:docs`,
`corepack pnpm audit:docs:i18n`, and `corepack pnpm verify:all`.
