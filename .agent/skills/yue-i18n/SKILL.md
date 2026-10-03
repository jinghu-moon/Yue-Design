---
name: yue-i18n
description: Design, implement, review, or audit internationalization in Yue Design Vue components and its VitePress documentation site. Trigger for adding or changing user-facing text, locale messages, language packs, adapters, locale switching, RTL, translated component docs, or bilingual docs (国际化、I18N、语言包、翻译、locale、双语文档); do not trigger for internal logs, identifiers, comments, or unrelated CSS/token-only work.
metadata:
  short-description: Yue locale contracts, language packs, adapters, and bilingual docs
---

# Yue I18N

Use this skill when a change can be seen or announced by a user. The goal is one locale
contract shared by Yue components and the docs site, while keeping application translation
engines optional. Read [references/architecture.md](references/architecture.md) before changing
the runtime contract; read [references/catalogs.md](references/catalogs.md) when adding keys or
language packs; read [references/docs-site.md](references/docs-site.md) for VitePress work;
read [references/review-checklist.md](references/review-checklist.md) for review-only tasks.

## Non-negotiable decisions

- `@yue-ui/vue` must not import or require `vue-i18n`, Intlayer, Paraglide, Tolgee, or another
  application i18n engine. Use Yue's adapter boundary instead.
- Every user-facing string, placeholder, tooltip, toast, error, empty state, and `aria-label`
  is either a Yue message key or explicitly owned by the consumer through a prop/slot.
- Never concatenate translated fragments, put HTML/Vue templates in messages, or hand-format
  locale-sensitive dates/numbers. Use one message with interpolation and the platform `Intl` API.
- Locale keys are namespaced and typed. Adding, renaming, or deleting a key updates every
  supported language and its tests in the same change.
- Locale context is inherited by subtree and remains SSR-safe. Cross-package injection uses
  `Symbol.for('yue:locale')`; a missing key is diagnosable and never silently becomes an empty string.
- Language packs are separate import paths. The root entry must not preload every locale.
- Docs translations are real pages, not a translated navbar over untranslated content. The
  Chinese and English trees, locale-specific nav/sidebar/search strings, and component examples
  must stay aligned.

## Route the task

| Task | Read | Main evidence | Minimum work |
| --- | --- | --- | --- |
| Runtime/types/provider | `architecture.md` | hooks unit + SSR + cross-package tests | Full workflow |
| New/changed message or language pack | `catalogs.md` | key/parameter parity + one-locale tree shaking | Full workflow |
| Adding, renaming, or removing a locale key | `catalogs.md`, `key-change-process.md` | typecheck + audit:i18n | Full workflow |
| **Single new aria-label or tooltip text** | `catalogs.md` | typecheck + audit:i18n | Add key to catalog + all locales; run `audit:i18n` |
| Component consumes internal text | `architecture.md`, `catalogs.md` | component unit + browser locale switch | Full workflow |
| vue-i18n/Intlayer/Paraglide/Tolgee integration | `architecture.md` | optional adapter and tarball test | Full workflow |
| VitePress English/Chinese site | `docs-site.md` | static build + deep links + browser switch | Full workflow |
| Review or acceptance | `review-checklist.md`, `verification-matrix.md` | actual gate results | Full workflow |

**Single aria-label / tooltip path** (e.g. adding one `aria-label` like `tag.closeLabel`):
1. Add the key to the typed catalog in `packages/vue/src/locale/catalog.ts`.
2. Add the value to every supported language pack (`zh-CN.ts`, `en-US.ts`, …) in the same commit.
3. Use `useLocale().t('ns.key')` in the component — never a hard-coded string.
4. Run `corepack pnpm audit:i18n` and confirm it passes.
5. No docs-site update needed unless the label is public API (documented in the API page).

This path is the minimum. If the component adds more than one key, or if it also changes
user-visible example text or guide copy, use the full workflow instead.

## Workflow

1. Inventory the visible text and decide whether it belongs to Yue or the consumer.
2. Choose/record the namespaced key, interpolation variables, plural behavior, fallback, and
   locale direction before editing a component.
3. Update the typed catalog and all supported language packs together.
4. Implement the runtime/provider or component consumer without adding a third-party dependency
   to the core package.
5. Update examples, API/Guide docs, and both docs locales if the text is public.
6. Test missing keys, fallback, locale switching, long translations, ARIA output, SSR and the
   package boundary in proportion to the changed surface.
7. Run the matrix in `references/verification-matrix.md`; report skipped or failed gates honestly.

## Current Yue commands

```text
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm audit:tokens
corepack pnpm audit:docs
corepack pnpm audit:i18n
corepack pnpm audit:docs:i18n
corepack pnpm verify:dist
corepack pnpm verify:treeshaking
corepack pnpm verify:visual
corepack pnpm verify:tarball
corepack pnpm verify:all
```

Both locale audits are implemented and run by `verify` / `verify:all`. Run them directly while
iterating on catalogs or translated pages; report their actual results rather than inferring
success from the broader command.

## Handoff

Report message keys and locales changed, ownership decisions, fallback/adapter behavior, docs
paths, actual commands/results, bundle impact, SSR/RTL risks, and intentionally untranslated or
unsupported surfaces. Use [docs/03-yue-i18n-roadmap.md](../../../docs/03-yue-i18n-roadmap.md) as
the project plan; do not copy the plan into every component report.
