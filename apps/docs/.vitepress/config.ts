import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'Yue Design',
  description: '纯 CSS Design Token、Vue 3 组件与文档站',
  appearance: true,

  // A declared icon stops the browser from guessing at /favicon.ico and logging a
  // 404 on every page. Served from `apps/docs/public/`, so it stays same-origin.
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]],

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/' },
      { text: '设计', link: '/design/' },
      { text: '基础', link: '/foundation/' },
      { text: '组件', link: '/components/' },
      { text: '架构', link: '/architecture/' },
      { text: '工具', link: '/tools/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '概览', link: '/guide/' },
            { text: '设计哲学', link: '/guide/philosophy' },
          ],
        },
      ],
      '/foundation/': [
        {
          text: '基础',
          items: [{ text: '总览', link: '/foundation/' }],
        },
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
          ],
        },
      ],
      '/architecture/': [
        {
          text: '架构',
          items: [{ text: '仓库与包', link: '/architecture/' }],
        },
      ],
      '/tools/': [
        {
          text: '工具',
          items: [{ text: 'Token 审计', link: '/tools/' }],
        },
      ],
    },

    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一页', next: '下一页' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',

    // Local search builds its own index at build time; no Algolia, no CDN.
    search: { provider: 'local' },
  },
})
