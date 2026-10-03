# Yue VitePress site

The current site uses VitePress 1.6.4. Do not copy VitePress 2-only APIs without an explicit
upgrade. The current bilingual plan keeps Chinese at `/` and English under `/en/`; follow
`docs/03-yue-i18n-roadmap.md` and `.agent/skills/yue-i18n/references/docs-site.md` for locale work.

The theme registers `@yue-ui/vue/plugin`, design tokens, component CSS and docs-only components.
Keep package CSS imports explicit and in the documented cascade order. Theme components belong in
`.vitepress/theme`; they are not library components and must not be exported from `@yue-ui/vue`.

Locale-specific nav/sidebar/search/title/description must be complete for each locale. VitePress
theme config is shallow-merged, so a Chinese navigation array cannot safely be reused for English.
Use stable relative-path locale links and preserve hashes when customizing `i18nRouting`.

Official references: [VitePress i18n](https://vitepress.dev/guide/i18n),
[default theme config](https://vitepress.dev/reference/default-theme-config),
[Vue in Markdown](https://vitepress.dev/guide/using-vue).
