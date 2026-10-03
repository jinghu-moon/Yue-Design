<script setup lang="ts">
/**
 * Documentation-only wrapper that provides a locale instance to a subtree.
 *
 * It exists so the Input page's localisation example is a *real* subtree scope rather than a
 * claim: the field inside reads the provided language, and `verify:visual` asserts the
 * rendered `aria-label` matches what this component was given. Nothing about it is part of
 * the library — it wraps `provideLocale()`, which is library API.
 *
 * `provide()` reaches descendants through the component instance tree, so this works even
 * though the slot content is compiled in the page that uses the wrapper.
 *
 * A locale and a pack are two different things, and the props keep them apart:
 * `locale` says which language this subtree is in, `messages` overrides individual strings.
 * Passing only `messages` is the "translate one string" case, and it deliberately keeps the
 * surrounding language — the same inheritance rule `provideYueConfig()` has for `size`.
 */
import { provideLocale } from '@yue-ui/vue/locale'
import type { YueLocaleMessages } from '@yue-ui/vue/locale'

const props = withDefaults(
  defineProps<{
    /** BCP 47 tag for this subtree. Falls back to the page's locale. */
    locale?: string
    /** Language packs, by tag, for this subtree. */
    packs?: Record<string, Partial<YueLocaleMessages>>
    /** A one-string override. */
    clear?: string
  }>(),
  { locale: undefined, packs: undefined, clear: undefined },
)

provideLocale({
  locale: props.locale,
  packs: props.packs,
  ...(props.clear === undefined ? {} : { messages: { input: { clear: props.clear } } }),
})
</script>

<template>
  <slot />
</template>
