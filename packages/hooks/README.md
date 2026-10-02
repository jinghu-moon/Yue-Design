# @snapclip/hooks

Vue composables shared by SnapClip components.

**Status: declared extension point, no public API yet.**

This package is deliberately empty. It is part of the workspace so the first
composable lands in a package that is already wired into `typecheck`, `build`
and the dependency graph.

## Why nothing is exported

Designing composables before a component needs them is API design by
guesswork. The planned first consumers are:

1. `DsButton` — loading/disabled state composition and slot plumbing.
2. Appearance synchronisation — mapping VitePress' `html.dark` (and any other
   host convention) onto the token contract's `[data-theme]` / `[data-accent]`
   attributes. Until that moves here, the docs site keeps a local copy in
   `apps/docs/.vitepress/theme/useTokenAppearance.ts`.

## Consuming it

```ts
import { something } from '@snapclip/hooks'
```

The package is consumed **as source** inside the workspace
(`exports["."]` → `./src/index.ts`), so there is no build step to run before
type-checking a consumer.
