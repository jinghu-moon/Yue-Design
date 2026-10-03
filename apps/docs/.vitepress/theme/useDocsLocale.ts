import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useData } from 'vitepress'
import { docsStringsFor, yueLocaleFor } from './docs-locale'
import type { DocsStrings } from './docs-locale'

/** What every piece of docs chrome needs: its own strings, and the Yue locale to demonstrate. */
export interface DocsLocaleContext {
  /** Localised docs UI text. */
  strings: ComputedRef<DocsStrings>
  /** `zh-CN` or `en-US`, matching the page language. */
  yueLocale: ComputedRef<string>
}

/**
 * The docs chrome's strings for the current page.
 *
 * `useData().lang` is the VitePress locale's `lang` (`zh-CN` at the root, `en-US` under
 * `/en/`). Reading it here — rather than checking `window.location` — keeps every component
 * SSR-safe and reactive: on a locale switch VitePress replaces the page data, the computed
 * re-evaluates, and the chrome re-renders.
 *
 * The docs UI language and the Yue component language come from the same value on purpose:
 * a page about localization is a poor demonstration if its own examples speak a different
 * language than its chrome.
 */
export function useDocsLocale(): DocsLocaleContext {
  const { lang } = useData()
  return {
    strings: computed(() => docsStringsFor(lang.value)),
    yueLocale: computed(() => yueLocaleFor(lang.value)),
  }
}
