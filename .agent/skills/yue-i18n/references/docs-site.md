# Bilingual VitePress site

The current docs site is VitePress 1.x with Chinese content at the root. Do not switch to
VitePress 2-only APIs without first upgrading the project. The safest migration keeps Chinese at
`/` and mirrors English under `/en/`; a full `/zh/` and `/en/` split is also valid but requires a
redirect decision and a larger move.

## Required structure

```text
apps/docs/
├── .vitepress/config.ts       # locales + locale-specific themeConfig
├── index.md                   # root locale content
├── guide/ ...                 # root locale
└── en/                        # English mirrors with matching relative paths
    ├── index.md
    ├── guide/ ...
    └── components/ ...
```

Configure `locales.root` and `locales.en` with labels, `lang`, title/description and complete
locale-specific `nav`/`sidebar`. VitePress shallow-merges theme config, so each locale must provide
its own translated navigation instead of relying on a Chinese array. Use the built-in language
switcher or a documented `i18nRouting` function that preserves the current relative path/hash.

## Content rules

- Every public Chinese page has an English counterpart before the bilingual phase is marked complete.
- Component example/API/Guide pages are translated as a unit; do not expose an English API page
  with Chinese examples or headings.
- Docs-only UI strings (search labels, copy button, preview toolbar, theme controls) have a docs
  locale source; they are not Yue component messages.
- Interactive examples install the same Yue locale instance as the page and demonstrate both
  `en-US` and `zh-CN` where the component renders internal text.
- Set `html lang` through VitePress locale config. Use logical CSS properties so future RTL pages
  do not need a second layout implementation.

## Acceptance

Build both locale trees and test direct navigation, refresh, back/forward, locale switch,
component examples, search, dark mode and mobile width. Verify there are no untranslated page
titles, broken cross-locale links, duplicate canonical URLs or Chinese strings in English-only
theme chrome.

Official reference: [VitePress i18n guide](https://vitepress.dev/guide/i18n) and
[default theme i18n routing](https://vitepress.dev/reference/default-theme-config#i18nrouting).
