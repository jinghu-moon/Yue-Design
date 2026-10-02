import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'SnapClip Design System',
  description: '纯 CSS Design Token、Vue 3 组件与文档站',
  appearance: true,

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/' },
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
      '/components/': [
        {
          text: '组件',
          items: [{ text: '总览', link: '/components/' }],
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
