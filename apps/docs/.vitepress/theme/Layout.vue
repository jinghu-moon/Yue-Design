<script setup lang="ts">
import { watchEffect } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { useLocale } from '@yue-ui/vue/locale'
import DocsNotFound from './components/DocsNotFound.vue'
import { yueLocaleFor } from './docs-locale'

/**
 * The docs layout: VitePress' own layout, plus the two things the docs need injected.
 *
 *   1. the bilingual 404 page, through the default theme's `not-found` slot (`theme.NotFound` is
 *      deprecated in favour of exactly this);
 *   2. the bridge that makes the *component* locale follow the *page* language.
 *
 * The language switcher is deliberately **not** injected here. VitePress' built-in locale menu
 * already does the three things a switcher has to do — it maps to the counterpart page, it
 * carries the URL hash across, and it stays correct as the site grows — and reimplementing it put
 * two switchers in one nav bar. The browser gate drives the built-in menu instead.
 *
 * The bridge lives here rather than in `enhanceApp` because it needs a component instance to read
 * page data reactively, and it writes to the app-level locale instance `enhanceApp` installed.
 * Because it is a `watchEffect` inside a component setup, nothing is shared between two server
 * renders — which is what keeps the SSR output deterministic.
 */
const { lang } = useData()
const locale = useLocale()

watchEffect(() => {
  const next = yueLocaleFor(lang.value)
  if (locale.current.value !== next) locale.current.value = next
})

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <!-- The 404 page is one document for both trees, so it shows both languages and both links. -->
    <template #not-found>
      <DocsNotFound />
    </template>
  </Layout>
</template>
