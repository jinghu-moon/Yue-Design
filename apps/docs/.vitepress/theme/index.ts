import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import YueUI from '@yue-ui/vue/plugin'
import { useTokenAppearance } from './useTokenAppearance'
import AccentSwitch from './components/AccentSwitch.vue'
import DensitySwitch from './components/DensitySwitch.vue'
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
  enhanceApp({ app }) {
    // The docs site registers the library through its plugin entry, so the
    // component pages can write `<YueButton>` straight from markdown. That also
    // makes this site a live consumer of `@yue-ui/vue/plugin`: if the entry stops
    // registering components, every example on every component page turns into a
    // comment and the build output check fails.
    app.use(YueUI)

    // The preview widgets are docs infrastructure, not part of the library.
    app.component('PreviewFrame', PreviewFrame)
    app.component('ThemeSwitch', ThemeSwitch)
    app.component('AccentSwitch', AccentSwitch)
    app.component('DensitySwitch', DensitySwitch)
  },
  setup() {
    useTokenAppearance()
  },
} satisfies Theme
