/**
 * The documentation site's own UI strings.
 *
 * These are **not** Yue component messages and do not belong in `packages/vue/src/locale`:
 * the library never renders a "Reset" button or a "View code" toggle — the docs chrome does.
 * Keeping them here means the site can be bilingual without pretending that documentation
 * controls are part of the component contract.
 *
 * A `Record` keyed by the VitePress locale, not a lookup that falls back silently: a missing
 * key is a type error at build time, and the browser gate asserts that an English page shows
 * English chrome.
 */
export type DocsLang = 'zh-CN' | 'en-US'

/** One labelled part of the anatomy figure: a name and the sentence that explains it. */
export interface AnatomyPart {
  name: string
  note: string
}

export interface DocsStrings {
  /** The docs-only text inside component previews. */
  preview: {
    reset: string
    showCode: string
    hideCode: string
  }
  theme: { label: string; light: string; dark: string }
  accent: { label: string; azure: string; neutral: string }
  density: { label: string; comfortable: string; compact: string }
  /** The Button anatomy figure on the Button page. */
  anatomy: {
    captions: { assembled: string; loading: string }
    note: string
    /** The label rendered inside the two sample buttons. */
    sampleLabel: string
    partBox: AnatomyPart
    partLeading: AnatomyPart
    partLabel: AnatomyPart
    partTrailing: AnatomyPart
    partLoader: AnatomyPart
    partFocus: AnatomyPart
  }
  /** The 404 page, which is a single document for both locales. */
  notFound: {
    title: string
    quote: string
    hint: string
    backHome: string
  }
}

const ZH: DocsStrings = {
  preview: {
    reset: '重置',
    showCode: '查看代码',
    hideCode: '收起代码',
  },
  theme: { label: '主题', light: '浅色', dark: '深色' },
  accent: { label: '主题色', azure: '天蓝', neutral: '中性' },
  density: { label: '密度', comfortable: '标准', compact: '紧凑' },
  anatomy: {
    captions: {
      assembled: '装配完成的按钮',
      loading: 'loading 时的同一个按钮',
    },
    note: '文字与图标留在原位，加载层盖在上面',
    sampleLabel: '保存',
    partBox: { name: '外层按钮盒', note: '高度、内边距、边框、圆角；也是盒内定位的上下文' },
    partLeading: { name: '前置内容', note: 'leading 插槽，图标尺寸随 size' },
    partLabel: { name: '文本区域', note: '默认插槽；通常也是可访问名称的来源' },
    partTrailing: { name: '后置内容', note: 'trailing 插槽' },
    partLoader: { name: '加载层', note: '绝对定位覆盖在内容之上；默认 spinner 或 loader 插槽' },
    partFocus: {
      name: '焦点环与点击区域',
      note: 'outline 来自焦点环 Token；点击区域是控件盒本身，link 例外',
    },
  },
  notFound: {
    title: '页面不存在',
    quote: '这个地址没有对应的页面：它可能被移动过，也可能从未存在。',
    hint: '两种语言都可以从下面的入口重新开始。',
    backHome: '回到首页',
  },
}

const EN: DocsStrings = {
  preview: {
    reset: 'Reset',
    showCode: 'View code',
    hideCode: 'Hide code',
  },
  theme: { label: 'Theme', light: 'Light', dark: 'Dark' },
  accent: { label: 'Accent', azure: 'Azure', neutral: 'Neutral' },
  density: { label: 'Density', comfortable: 'Standard', compact: 'Compact' },
  anatomy: {
    captions: {
      assembled: 'Assembled',
      loading: 'The same button while loading',
    },
    note: 'the label and icons keep their place and the loader covers them',
    sampleLabel: 'Save',
    partBox: {
      name: 'Control box',
      note: 'height, inset, border and radius; also the positioning context inside the box',
    },
    partLeading: { name: 'Leading content', note: 'the leading slot; icon size follows `size`' },
    partLabel: { name: 'Label', note: 'the default slot; usually the accessible name as well' },
    partTrailing: { name: 'Trailing content', note: 'the trailing slot' },
    partLoader: {
      name: 'Loader layer',
      note: 'absolutely positioned over the content; the default spinner or the loader slot',
    },
    partFocus: {
      name: 'Focus ring and hit area',
      note: 'the outline comes from focus-ring tokens; the hit area is the control box, except for `link`',
    },
  },
  notFound: {
    title: 'Page not found',
    quote: 'There is no page at this address: it may have moved, or it may never have existed.',
    hint: 'Both languages are one click away.',
    backHome: 'Back to home',
  },
}

export const DOCS_STRINGS: Readonly<Record<DocsLang, DocsStrings>> = Object.freeze({
  'zh-CN': ZH,
  'en-US': EN,
})

/**
 * Resolve the docs strings for a VitePress `lang`.
 *
 * Anything that is not English is treated as the Chinese tree rather than falling back to
 * English: the root locale *is* the Chinese site, so an unrecognised tag landing on English
 * chrome inside the Chinese tree would be the more surprising failure.
 */
export function docsStringsFor(lang: string | undefined): DocsStrings {
  return lang !== undefined && lang.toLowerCase().startsWith('en') ? EN : ZH
}

/** The Yue locale that matches the page language. */
export function yueLocaleFor(lang: string | undefined): DocsLang {
  return lang !== undefined && lang.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN'
}
