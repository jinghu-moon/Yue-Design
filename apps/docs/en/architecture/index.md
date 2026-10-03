# Repository and packages

## Package dependency graph

```
@yue-ui/design-tokens   (pure CSS, zero dependencies)
        │
        ├──────────────► @yue-ui/vue ──► @yue-ui/docs
        │                      │
@yue-ui/hooks ───────────────┘
```

- `@yue-ui/design-tokens` depends neither on Vue nor on any build tool.
- The styles of `@yue-ui/vue` **do not bundle** the Token package; the two keep independent releases and independent versions.
- `apps/docs` depends on all three, and references only the real packages — it does not copy a CSS copy into the documentation site.

## Cascade contract

The Token package entry declares the layer order, which gives the component styles a definite position:

```css
/* packages/tokens/src/index.css */
@layer primitives, semantics, components, implementations, demo;

@import url('./primitives/_index.css') layer(primitives);
@import url('./semantics/_index.css') layer(semantics);
@import url('./component-tokens/_index.css') layer(components);
```

**The loading order is part of the contract**: the Token entry must come before `@yue-ui/vue/style.css`.
The component stylesheets themselves no longer declare `@layer`, otherwise they could create
`implementations` before `primitives` and silently reverse the layer order.

## Why Tokens and components must be split

- The Token package can be used by any technology stack (Vue, React, plain HTML), while the component package only serves Vue.
- The theme and brand colors belong to the Token layer; changes to them should not trigger a release of the component package.
- Packing both packages into one tarball would duplicate assets such as fonts.

## Gate

| Gate | Command | Pass criteria |
| --- | --- | --- |
| Install | `corepack pnpm install` | Lockfile is reproducible, no network failures |
| Types | `corepack pnpm typecheck` | Every package passes independently |
| Build | `corepack pnpm build` | Topological order tokens → hooks → vue → docs |
| Test | `corepack pnpm test` | Token resolution, color math, audit, and API↔docs consistency all pass |
| Token audit | `corepack pnpm audit:tokens` | The migration contract is 64/64 in every target; the in-package extension contract brings the package target to 110/110, and multi-target resolution matches value by value |
| Docs consistency | `corepack pnpm audit:docs` | Type definitions, SFCs, API page tables, and example prop names align item by item; the numbers referenced in the docs match the contract files |
| Artifacts | `corepack pnpm verify:dist` | No external resources, all exports resolve, layer order and class-name namespace are consistent |
| Browser | `corepack pnpm verify:visual` | Contrast, layout, and state assertions on the documentation pages all pass in a real Chrome |
| Published artifact | `corepack pnpm verify:tarball` | After pack it is installed into a temporary project and consumed by both native ESM and the browser |

## Relationship to the archived project

`Design-System-archived/` is a previous attempt at the same goal; this repository deliberately does not reuse its directory structure:

- It copied the Token split directory three times (`packages/tokens/tokens/tokens/`)
- It uses the `@yue-ui/*` naming
- Its roadmap planned 73 components at once, yet rolled out i18n, SSR, and imperative Message before the first component

This repository inherits only what it got right: the strict configuration of `tsconfig.base.json`, the
`packages/*` + `apps/*` layout of `pnpm-workspace.yaml`, and the way the VitePress theme is organized.
