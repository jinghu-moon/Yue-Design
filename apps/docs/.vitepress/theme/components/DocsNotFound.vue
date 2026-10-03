<script setup lang="ts">
import { withBase } from 'vitepress'
import { DOCS_STRINGS } from '../docs-locale'

/**
 * The 404 page, in both languages at once.
 *
 * VitePress builds exactly one `404.html` for the whole site, so a "localized" 404 would be a
 * lie for whichever tree did not generate it. Showing both languages, each with its own link
 * home, is the honest version: whichever tree the reader came from, they can read the sentence
 * and click through to where they meant to be.
 *
 * The strings come from the docs locale catalog rather than from the theme's `notFound`
 * configuration, because they are the *same* two sentences a bilingual page needs — and because
 * a single document with two languages is exactly the case `themeConfig.notFound` cannot express.
 */
const zh = DOCS_STRINGS['zh-CN'].notFound
const en = DOCS_STRINGS['en-US'].notFound
</script>

<template>
  <div class="docs-not-found">
    <p class="docs-not-found__code">404</p>
    <h1 class="docs-not-found__title">{{ zh.title }} · {{ en.title }}</h1>
    <div class="docs-not-found__divider" />
    <blockquote class="docs-not-found__quote">
      <span lang="zh-CN">{{ zh.quote }}</span>
      <span lang="en-US">{{ en.quote }}</span>
    </blockquote>
    <p class="docs-not-found__hint">
      <span lang="zh-CN">{{ zh.hint }}</span>
      <span lang="en-US">{{ en.hint }}</span>
    </p>
    <div class="docs-not-found__actions">
      <a class="docs-not-found__link" :href="withBase('/')" hreflang="zh-CN">{{ zh.backHome }}</a>
      <a class="docs-not-found__link" :href="withBase('/en/')" hreflang="en-US">{{ en.backHome }}</a>
    </div>
  </div>
</template>
