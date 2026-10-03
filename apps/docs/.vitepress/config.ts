import { defineConfig } from 'vitepress'
import type { HeadConfig } from 'vitepress'

/**
 * The deployment hostname, in one place.
 *
 * Canonical URLs, `hreflang` alternates and the sitemap all need an absolute origin, and
 * inventing one per file is how a site ends up with three different canonical hosts. It is a
 * This is the Pages hostname until a custom domain is bound. Keep the origin in one place so a
 * custom-domain migration updates canonical links, alternates and the sitemap together.
 */
const SITE_HOSTNAME = 'https://yue-design.pages.dev'

/** The locale keys VitePress uses: the Chinese tree is the root, English lives under `/en/`. */
const LOCALE_ROOT = 'root'
const LOCALE_EN = 'en'

/**
 * The absolute URL of a page, from its source path.
 *
 * `index.md` collapses to the directory, everything else keeps its `.html` — VitePress builds
 * `/components/button.html` (not a clean URL), so a canonical link without the extension
 * would point at a page the deployment does not serve.
 */
function pageUrl(relativePath: string): string {
  const clean = relativePath.replace(/index\.md$/, '').replace(/\.md$/, '.html')
  return `${SITE_HOSTNAME}/${clean}`
}

/** The same page in the other locale, for `hreflang`. */
function counterpartUrl(relativePath: string, target: typeof LOCALE_ROOT | typeof LOCALE_EN): string {
  const isEnglish = relativePath.startsWith(`${LOCALE_EN}/`)
  const bare = isEnglish ? relativePath.slice(LOCALE_EN.length + 1) : relativePath
  return pageUrl(target === LOCALE_EN ? `${LOCALE_EN}/${bare}` : bare)
}

/** Shared footer labels, so the two locales cannot drift in structure. */
const docFooter = { prev: '上一页', next: '下一页' }
const docFooterEn = { prev: 'Previous page', next: 'Next page' }

const zhNav = [
  { text: '指南', link: '/guide/' },
  { text: '设计', link: '/design/' },
  { text: '基础', link: '/foundation/' },
  { text: '组件', link: '/components/' },
  { text: '架构', link: '/architecture/' },
  { text: '工具', link: '/tools/' },
]

const enNav = [
  { text: 'Guide', link: '/en/guide/' },
  { text: 'Design', link: '/en/design/' },
  { text: 'Foundation', link: '/en/foundation/' },
  { text: 'Components', link: '/en/components/' },
  { text: 'Architecture', link: '/en/architecture/' },
  { text: 'Tools', link: '/en/tools/' },
]

const zhSidebar = {
  '/guide/': [
    {
      text: '指南',
      items: [
        { text: '概览', link: '/guide/' },
        { text: '设计哲学', link: '/guide/philosophy' },
        { text: '国际化', link: '/guide/i18n' },
      ],
    },
  ],
  '/foundation/': [
    { text: '基础', items: [{ text: '总览', link: '/foundation/' }] },
  ],
  '/design/': [
    {
      text: '设计',
      items: [
        { text: '总览', link: '/design/' },
        { text: '色彩', link: '/design/color' },
        { text: '深色模式', link: '/design/dark-mode' },
        { text: '字体', link: '/design/typography' },
        { text: '图标', link: '/design/icon' },
        { text: '布局', link: '/design/layout' },
        { text: '动效', link: '/design/motion' },
      ],
    },
  ],
  '/components/': [
    {
      text: '组件',
      items: [
        { text: '总览', link: '/components/' },
        { text: 'Button 按钮 · 示例', link: '/components/button' },
        { text: 'Button 按钮 · API', link: '/components/button/api' },
        { text: 'Button 按钮 · 指南', link: '/components/button/guide' },
        { text: 'Input 输入框 · 示例', link: '/components/input' },
        { text: 'Input 输入框 · API', link: '/components/input/api' },
        { text: 'Input 输入框 · 指南', link: '/components/input/guide' },
        { text: 'Tag 标签 · 示例', link: '/components/tag' },
        { text: 'Tag 标签 · API', link: '/components/tag/api' },
        { text: 'Tag 标签 · 指南', link: '/components/tag/guide' },
      ],
    },
  ],
  '/architecture/': [
    { text: '架构', items: [{ text: '仓库与包', link: '/architecture/' }] },
  ],
  '/tools/': [{ text: '工具', items: [{ text: 'Token 审计', link: '/tools/' }] }],
}

const enSidebar = {
  '/en/guide/': [
    {
      text: 'Guide',
      items: [
        { text: 'Overview', link: '/en/guide/' },
        { text: 'Design philosophy', link: '/en/guide/philosophy' },
        { text: 'Internationalization', link: '/en/guide/i18n' },
      ],
    },
  ],
  '/en/foundation/': [
    { text: 'Foundation', items: [{ text: 'Overview', link: '/en/foundation/' }] },
  ],
  '/en/design/': [
    {
      text: 'Design',
      items: [
        { text: 'Overview', link: '/en/design/' },
        { text: 'Color', link: '/en/design/color' },
        { text: 'Dark mode', link: '/en/design/dark-mode' },
        { text: 'Typography', link: '/en/design/typography' },
        { text: 'Icons', link: '/en/design/icon' },
        { text: 'Layout', link: '/en/design/layout' },
        { text: 'Motion', link: '/en/design/motion' },
      ],
    },
  ],
  '/en/components/': [
    {
      text: 'Components',
      items: [
        { text: 'Overview', link: '/en/components/' },
        { text: 'Button · Examples', link: '/en/components/button' },
        { text: 'Button · API', link: '/en/components/button/api' },
        { text: 'Button · Guide', link: '/en/components/button/guide' },
        { text: 'Input · Examples', link: '/en/components/input' },
        { text: 'Input · API', link: '/en/components/input/api' },
        { text: 'Input · Guide', link: '/en/components/input/guide' },
        { text: 'Tag · Examples', link: '/en/components/tag' },
        { text: 'Tag · API', link: '/en/components/tag/api' },
        { text: 'Tag · Guide', link: '/en/components/tag/guide' },
      ],
    },
  ],
  '/en/architecture/': [
    { text: 'Architecture', items: [{ text: 'Repository and packages', link: '/en/architecture/' }] },
  ],
  '/en/tools/': [{ text: 'Tools', items: [{ text: 'Token audit', link: '/en/tools/' }] }],
}

export default defineConfig({
  // `lang` lives per locale: VitePress writes it onto `<html lang>`, which is the value the
  // browser gate asserts and the one assistive technology uses to pick a voice.
  title: 'Yue Design',
  description: '纯 CSS Design Token、Vue 3 组件与文档站',
  appearance: true,

  // A declared icon stops the browser from guessing at /favicon.ico and logging a
  // 404 on every page. Served from `apps/docs/public/`, so it stays same-origin.
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]],

  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'Yue Design',
      description: '纯 CSS Design Token、Vue 3 组件与文档站',
    },
    en: {
      label: 'English',
      lang: 'en-US',
      title: 'Yue Design',
      description: 'Pure-CSS design tokens, Vue 3 components and documentation',
      // A locale-level theme override is what keeps an English page from rendering Chinese
      // navigation: VitePress shallow-merges the theme config, so a shared `nav` array would
      // be inherited verbatim.
      themeConfig: {
        nav: enNav,
        sidebar: enSidebar,
        outline: { level: [2, 3], label: 'On this page' },
        docFooter: docFooterEn,
        returnToTopLabel: 'Return to top',
        sidebarMenuLabel: 'Menu',
        // The built-in locale menu's accessible name. Left unset it stays VitePress' English
        // default, which is wrong on the Chinese page.
        langMenuLabel: 'Language',
        darkModeSwitchLabel: 'Appearance',
        lightModeSwitchTitle: 'Switch to light mode',
        darkModeSwitchTitle: 'Switch to dark mode',
      },
    },
  },

  /**
   * Canonical URLs and `hreflang` alternates.
   *
   * Both matter for a two-tree site: without a canonical link the same page is indexed twice,
   * and without an alternate a search engine has no way to know the English page is the same
   * document as the Chinese one. `x-default` points at the root (Chinese) tree, which is what
   * the deployment serves at `/`.
   */
  transformHead({ pageData }): HeadConfig[] {
    const relative = pageData.relativePath
    const isEnglish = relative.startsWith(`${LOCALE_EN}/`)
    return [
      ['link', { rel: 'canonical', href: pageUrl(relative) }],
      ['link', { rel: 'alternate', hreflang: 'zh-CN', href: counterpartUrl(relative, LOCALE_ROOT) }],
      ['link', { rel: 'alternate', hreflang: 'en-US', href: counterpartUrl(relative, LOCALE_EN) }],
      ['link', { rel: 'alternate', hreflang: 'x-default', href: counterpartUrl(relative, LOCALE_ROOT) }],
      ['meta', { name: 'yue-locale', content: isEnglish ? LOCALE_EN : LOCALE_ROOT }],
    ]
  },

  sitemap: { hostname: SITE_HOSTNAME },

  themeConfig: {
    nav: zhNav,
    sidebar: zhSidebar,

    outline: { level: [2, 3], label: '本页目录' },
    docFooter,
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    // The built-in locale menu: localized here, and relied on rather than reimplemented —
    // VitePress maps it to the counterpart page and carries the URL hash across, which the
    // browser gate asserts.
    langMenuLabel: '语言',
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',

    // Local search builds one index per locale, with its own translations: an English visitor
    // must not be offered Chinese placeholders, and the index must not mix the two trees.
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: '搜索', buttonAriaLabel: '搜索文档' },
              modal: {
                displayDetails: '显示详情',
                resetButtonTitle: '重置搜索',
                backButtonTitle: '关闭搜索',
                noResultsText: '没有找到结果',
                footer: {
                  selectText: '选择',
                  selectKeyAriaLabel: '回车',
                  navigateText: '切换',
                  navigateUpKeyAriaLabel: '上箭头',
                  navigateDownKeyAriaLabel: '下箭头',
                  closeText: '关闭',
                  closeKeyAriaLabel: 'Esc',
                },
              },
            },
          },
          en: {
            translations: {
              button: { buttonText: 'Search', buttonAriaLabel: 'Search documentation' },
              modal: {
                displayDetails: 'Display detailed list',
                resetButtonTitle: 'Reset search',
                backButtonTitle: 'Close search',
                noResultsText: 'No results found',
                footer: {
                  selectText: 'Select',
                  selectKeyAriaLabel: 'Enter',
                  navigateText: 'Navigate',
                  navigateUpKeyAriaLabel: 'Arrow up',
                  navigateDownKeyAriaLabel: 'Arrow down',
                  closeText: 'Close',
                  closeKeyAriaLabel: 'Escape',
                },
              },
            },
          },
        },
      },
    },
  },
})
