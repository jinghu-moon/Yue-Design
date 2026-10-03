import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import YueUI from '@yue-ui/vue/plugin'
import enUS from '@yue-ui/vue/locale/en-US'
import zhCN from '@yue-ui/vue/locale/zh-CN'
import Layout from './Layout.vue'
import { useTokenAppearance } from './useTokenAppearance'
import AccentSwitch from './components/AccentSwitch.vue'
import ButtonAnatomy from './components/ButtonAnatomy.vue'
import DensitySwitch from './components/DensitySwitch.vue'
import LocaleScope from './components/LocaleScope.vue'
import PreviewFrame from './components/PreviewFrame.vue'
import ThemeSwitch from './components/ThemeSwitch.vue'

/**
 * Stylesheet order IS the cascade contract, and it is why these are three
 * separate imports rather than one:
 *
 *   1. the token sheet declares `@layer primitives, semantics, components,
 *      implementations, demo` and the token values themselves;
 *   2. the component sheet carries the `.yue-button` rules and is deliberately
 *      unlayered — a component inside a layer loses to any unlayered host rule,
 *      and VitePress' own `button { background-color: transparent }` reset would
 *      otherwise erase the Button fill;
 *   3. this theme's own rules come last, so the docs chrome can override the
 *      component sheet it is built on.
 *
 * Both package specifiers are the real published entry points — the docs site is
 * the first consumer of exactly what a user would install.
 */
import '@yue-ui/design-tokens/index.css'
import '@yue-ui/vue/style.css'
import './custom.css'

export default {
  extends: DefaultTheme,
  // The layout wraps VitePress' own so the language switcher can be injected into the nav
  // bar and the component locale can follow the page language.
  Layout,
  enhanceApp({ app }) {
    // The docs site registers the library through its plugin entry, so the
    // component pages can write `<YueButton>` straight from markdown. That also
    // makes this site a live consumer of `@yue-ui/vue/plugin`: if the entry stops
    // registering components, every example on every component page turns into a
    // comment and the build output check fails.
    //
    // Both language packs are installed here, because a bilingual site needs both; which one
    // a given page reads is decided by `Layout.vue` from the VitePress locale. Starting in
    // Chinese matches the root tree — the browser gate asserts `/` renders 清空 and `/en/`
    // renders Clear.
    app.use(YueUI, {
      locale: 'zh-CN',
      fallbackLocale: 'en-US',
      packs: { 'zh-CN': zhCN, 'en-US': enUS },
    })

    // The preview widgets are docs infrastructure, not part of the library.
    app.component('PreviewFrame', PreviewFrame)
    app.component('ButtonAnatomy', ButtonAnatomy)
    app.component('ThemeSwitch', ThemeSwitch)
    app.component('AccentSwitch', AccentSwitch)
    app.component('DensitySwitch', DensitySwitch)
    // Scopes a locale to a subtree, so the localisation example on the Input page
    // demonstrates the real mechanism instead of describing it.
    app.component('LocaleScope', LocaleScope)
  },
  setup() {
    useTokenAppearance()
  },
} satisfies Theme
