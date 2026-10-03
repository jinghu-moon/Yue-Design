# Yue Design Agent Instructions

For any new component or component family, read and follow:

- [`.agent/skills/yue-component-design/SKILL.md`](.agent/skills/yue-component-design/SKILL.md)
- [`.agent/skills/yue-component-design/references/acceptance-checklist.md`](.agent/skills/yue-component-design/references/acceptance-checklist.md)
- [`.agent/skills/yue-i18n/SKILL.md`](.agent/skills/yue-i18n/SKILL.md) for user-facing strings,
  locale messages, language packs, adapters, or bilingual documentation.

The skill is the canonical workflow for component classification, API and Token design,
implementation, documentation, accessibility, testing, and acceptance. Existing component
changes should preserve the same contracts and use the same verification gates where relevant.
For any change to user-visible strings, locale messages, language packs, adapters, RTL or
translated documentation, also read [`.agent/skills/yue-i18n/SKILL.md`](.agent/skills/yue-i18n/SKILL.md)
and follow [the I18N roadmap](docs/03-yue-i18n-roadmap.md). The component and I18N skills both
apply when a component change introduces or modifies user-facing text.

Use [`.agent/skills/yue-vue-development/SKILL.md`](.agent/skills/yue-vue-development/SKILL.md)
for Vue internals and hooks, [`.agent/skills/yue-testing/SKILL.md`](.agent/skills/yue-testing/SKILL.md)
for test design and verification layers, [`.agent/skills/yue-docs/SKILL.md`](.agent/skills/yue-docs/SKILL.md)
for VitePress and component documentation, and [`.agent/skills/yue-release/SKILL.md`](.agent/skills/yue-release/SKILL.md)
for release or GitHub/npm distribution work.
