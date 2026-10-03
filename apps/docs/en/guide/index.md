# Guide

Yue Design is a monorepo that splits the design system into three packages that can be **built and released independently**, plus a set of executable gates.

## Repository structure

```
Yue-Design/
├─ packages/
│  ├─ tokens/     @yue-ui/design-tokens   Pure CSS, no build step
│  ├─ hooks/      @yue-ui/hooks           Vue composables (currently empty, see the README in the package)
│  └─ vue/        @yue-ui/vue             Vue 3 component package
├─ apps/
│  └─ docs/       @yue-ui/docs            VitePress documentation site
├─ tools/         Zero-dependency tools such as the Token auditor
└─ tests/         Gate tests for Token parsing, color math, and auditing
```

`design-tokens-generic-v4/` is the pre-migration HTML prototype, **kept byte-for-byte unchanged** as the visual baseline.

## Commands

All pnpm commands are invoked through corepack with a pinned version (`pnpm@10.30.1`):

```bash
corepack pnpm install       # install workspace dependencies
corepack pnpm typecheck     # per-package type checking
corepack pnpm build         # build in dependency topology order: tokens → hooks → vue → docs
corepack pnpm test          # 55 tests, including the Token audit
corepack pnpm audit:tokens  # Token contrast audit (standalone CLI)
corepack pnpm verify        # run the four steps above in sequence
```

## Current status

| Area | Status |
| --- | --- |
| Monorepo skeleton | ✅ 5 workspace projects, `install` / `typecheck` / `build` / `test` / `audit:tokens` all green |
| Token package | ✅ 483 Tokens, light + dark + Accent + forced-colors; audit 64/64 passing |
| Token auditor | ✅ Zero-dependency Node implementation, value-for-value consistent with the prototype's embedded audit (1804 parsed entries, zero differences) |
| Hooks package | ✅ `useNamespace` / `useConfig` / `provideYueConfig` and other contracts plus Symbol injection keys |
| Vue component package | ✅ `YueButton` complete, three JS entries + two CSS entries + type declarations |
| Documentation site | ✅ 9 pages, including the Button component page with live previews; light / dark / Accent / density switching |

The first vertical slice `YueButton` has already gone through the whole pipeline. See [Components overview](/en/components/).
