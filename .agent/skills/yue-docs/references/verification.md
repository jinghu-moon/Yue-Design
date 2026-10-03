# Documentation verification

| Surface | Evidence |
| --- | --- |
| Markdown/Vue/TypeScript | `corepack pnpm -C apps/docs typecheck` |
| Static output | `corepack pnpm -C apps/docs build` |
| API contract | `corepack pnpm audit:docs` |
| Component rendering/style | `corepack pnpm verify:visual` |
| Published consumer behavior | `corepack pnpm verify:tarball` |
| Handoff | `corepack pnpm verify:all` |

Build checks must include direct `/` and `/en/` pages when bilingual content exists. Browser
checks should verify `<html lang>`, locale links, navigation/search labels, real component output,
dark mode and mobile overflow. A missing translation or broken link is not a documentation pass.
