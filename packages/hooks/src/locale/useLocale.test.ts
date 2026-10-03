import { mount } from '@vue/test-utils'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import type { App, PropType } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  consumeLocaleDiagnostics,
  createLocale,
  installYueLocale,
  peekLocaleDiagnostics,
  provideLocale,
  resetLocaleDiagnostics,
  useLocale,
  yueLocaleKey,
} from './index.js'
import type {
  DeepPartial,
  YueLocaleAdapter,
  YueLocaleInstance,
  YueLocaleOptions,
  YueMessageTree,
} from './index.js'
import { DEFAULT_LOCALE } from './normalize.js'

/**
 * The catalog the runtime is exercised with.
 *
 * Deliberately *not* Yue's real catalog: this suite is about the mechanism, and a test that
 * used the shipped keys would fail for the wrong reason the first time a component renames
 * one. `@yue-ui/vue`'s own tests cover the concrete catalog.
 */
interface TestMessages extends YueMessageTree {
  input: { clear: string }
  pagination: { page: string; next: string }
}

type TestKey = 'input.clear' | 'pagination.page' | 'pagination.next'

const EN: TestMessages = {
  input: { clear: 'Clear' },
  pagination: { page: 'Page {page}', next: 'Next' },
}

const ZH: TestMessages = {
  input: { clear: '清空' },
  pagination: { page: '第 {page} 页', next: '下一页' },
}

function testLocale(
  options: YueLocaleOptions<TestMessages> = {},
): YueLocaleInstance<TestMessages, TestKey> {
  return createLocale<TestMessages, TestKey>({
    packs: { 'en-US': EN, 'zh-CN': ZH },
    ...options,
  })
}

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  resetLocaleDiagnostics()
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createLocale', () => {
  it('normalises the locale it was given', () => {
    expect(testLocale({ locale: 'EN_us' }).current.value).toBe('en-US')
    expect(testLocale({ locale: 'zh-hans-cn' }).current.value).toBe('zh-Hans-CN')
  })

  it('defaults to en-US with an en-US fallback', () => {
    const locale = createLocale<TestMessages, TestKey>()
    expect(locale.current.value).toBe(DEFAULT_LOCALE)
    expect(locale.fallback.value).toBe(DEFAULT_LOCALE)
  })

  it('translates through the requested pack', () => {
    expect(testLocale({ locale: 'zh-CN' }).t('input.clear')).toBe('清空')
    expect(testLocale({ locale: 'en-US' }).t('input.clear')).toBe('Clear')
  })

  it('re-resolves on every read, so switching language needs no new provider', () => {
    const locale = testLocale({ locale: 'en-US' })
    expect(locale.t('input.clear')).toBe('Clear')
    locale.current.value = 'zh-CN'
    expect(locale.t('input.clear')).toBe('清空')
    expect(locale.messages.value).toEqual(ZH)
  })

  it('interpolates parameters', () => {
    expect(testLocale({ locale: 'zh-CN' }).t('pagination.page', { page: 3 })).toBe('第 3 页')
  })

  it('exposes the resolved tree for the active locale', () => {
    expect(testLocale({ locale: 'zh-CN' }).messages.value).toEqual(ZH)
  })

  it('derives direction from the locale and honours an override', () => {
    expect(testLocale({ locale: 'en-US' }).direction.value).toBe('ltr')
    expect(testLocale({ locale: 'ar' }).direction.value).toBe('rtl')
    expect(testLocale({ locale: 'ar', direction: 'ltr' }).direction.value).toBe('ltr')
  })

  it('formats numbers and dates through Intl', () => {
    const locale = testLocale({ locale: 'en-US' })
    expect(locale.n(1234567.891)).toBe(new Intl.NumberFormat('en-US').format(1234567.891))
    expect(locale.n(1234, { style: 'currency', currency: 'EUR' })).toBe(
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(1234),
    )

    const date = new Date(Date.UTC(2024, 0, 2))
    expect(locale.d(date, { timeZone: 'UTC' })).toBe(
      new Intl.DateTimeFormat('en-US', { timeZone: 'UTC' }).format(date),
    )
  })

  it('formats the same number differently per locale', () => {
    // The formatter cache is keyed by locale and options; caching the *string* would make
    // this impossible.
    const locale = testLocale({ locale: 'en-US' })
    const english = locale.n(1234567.89)
    locale.current.value = 'de-DE'
    expect(locale.n(1234567.89)).not.toBe(english)
  })

  it('exposes a `provide()` that derives a child scope', () => {
    const parent = testLocale({ locale: 'en-US' })
    const child = parent.provide({ locale: 'zh-CN' })
    expect(child.t('input.clear')).toBe('清空')
    expect(parent.t('input.clear')).toBe('Clear')
  })
})

describe('missing keys and malformed messages', () => {
  it('returns the key rather than an empty string, and records why', () => {
    const locale = testLocale({ locale: 'zh-CN' })
    expect(locale.t('input.nothing' as TestKey)).toBe('input.nothing')

    const diagnostics = consumeLocaleDiagnostics()
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]).toMatchObject({
      reason: 'missing-key',
      key: 'input.nothing',
      locale: 'zh-CN',
    })
    expect(diagnostics[0].message).toContain('en-US')
  })

  it('reports a missing key once, not once per render', () => {
    const locale = testLocale({ locale: 'en-US' })
    locale.t('gone' as TestKey)
    locale.t('gone' as TestKey)
    expect(peekLocaleDiagnostics()).toHaveLength(2)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('reports an empty translation instead of rendering nothing', () => {
    const locale = testLocale({ locale: 'en-US', messages: { input: { clear: '   ' } } })
    expect(locale.t('input.clear')).toBe('input.clear')
    expect(consumeLocaleDiagnostics()[0]).toMatchObject({ reason: 'empty-value' })
  })

  it('reports an interpolation parameter that was not passed', () => {
    const locale = testLocale({ locale: 'en-US' })
    expect(locale.t('pagination.page')).toBe('Page {page}')
    expect(consumeLocaleDiagnostics()[0]).toMatchObject({
      reason: 'missing-param',
      param: 'page',
    })
  })

  it('reports an invalid locale tag while still working', () => {
    const locale = testLocale({ locale: 'en_USA' })
    expect(consumeLocaleDiagnostics()[0]).toMatchObject({ reason: 'invalid-locale' })
    // Recovery: the tag is not silently replaced, and the fallback pack still answers.
    expect(locale.t('input.clear')).toBe('Clear')
  })

  it('records nothing for a clean translation', () => {
    testLocale({ locale: 'zh-CN' }).t('input.clear')
    expect(peekLocaleDiagnostics()).toEqual([])
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('plurals', () => {
  interface PluralMessages extends YueMessageTree {
    items: { one: string; other: string }
  }
  type PluralKey = 'items'

  const packs = {
    'en-US': { items: { one: '{count} item', other: '{count} items' } } as PluralMessages,
    'ru': { items: { one: '{count} item', few: '{count} items', many: '{count} items', other: '{count} items' } } as PluralMessages,
  }

  const items = (locale: string) =>
    createLocale<PluralMessages, PluralKey>({ locale, packs })

  it('selects the form with Intl.PluralRules', () => {
    expect(items('en-US').t('items', { count: 1 })).toBe('1 item')
    expect(items('en-US').t('items', { count: 3 })).toBe('3 items')
  })

  it('uses each language’s own categories', () => {
    // Russian `few` covers 2–4: a component branching on English grammar renders `other`.
    expect(items('ru').t('items', { count: 2 })).toBe('2 items')
    expect(items('ru').t('items', { count: 5 })).toBe('5 items')
  })

  it('reports a plural message used without a count', () => {
    expect(items('en-US').t('items')).toBe('{count} items')
    expect(consumeLocaleDiagnostics()[0]).toMatchObject({
      reason: 'missing-param',
      param: 'count',
    })
  })

  it('reports a category the pack does not define', () => {
    const sparse = {
      'en-US': { items: { one: '{count} item', other: '{count} items' } } as PluralMessages,
    }
    const locale = createLocale<PluralMessages, PluralKey>({ locale: 'ru', packs: sparse })
    // `ru` selects `many`, which the en-US pack does not have — the fallback form is used
    // (and still interpolated), and the gap is reported rather than treated as translated.
    expect(locale.t('items', { count: 5 })).toBe('5 items')
    expect(consumeLocaleDiagnostics().map((entry) => entry.reason)).toContain('missing-plural-form')
  })
})

describe('subtree inheritance', () => {
  const READ = { input: { clear: 'Effacer' } } as const

  it('inherits the parent locale, packs and overrides', () => {
    const app = testLocale({ locale: 'zh-CN', messages: READ })
    const child = app.provide({})
    expect(child.current.value).toBe('zh-CN')
    expect(child.t('input.clear')).toBe('Effacer')
    expect(child.t('pagination.next')).toBe('下一页')
  })

  it('lets a child switch language without losing the parent’s packs', () => {
    const app = testLocale({ locale: 'zh-CN' })
    const child = app.provide({ locale: 'en-US' })
    expect(child.t('input.clear')).toBe('Clear')
    expect(app.t('input.clear')).toBe('清空')
  })

  it('keeps the override when a grandchild only changes one key', () => {
    const app = testLocale({ locale: 'en-US' })
    const child = app.provide({ messages: { input: { clear: 'Effacer' } } })
    const grandchild = child.provide({ messages: { pagination: { next: 'Suivant' } } })
    expect(grandchild.t('input.clear')).toBe('Effacer')
    expect(grandchild.t('pagination.next')).toBe('Suivant')
    // …and the app scope is untouched by both.
    expect(app.t('input.clear')).toBe('Clear')
  })

  it('does not inherit through a sibling scope', () => {
    const app = testLocale({ locale: 'en-US' })
    app.provide({ locale: 'zh-CN' })
    expect(app.provide({}).current.value).toBe('en-US')
  })
})

/* ------------------------------------------------------------------ *
 * Component integration
 * ------------------------------------------------------------------ */

/** The smallest possible consumer: the exact shape `YueInput` uses. */
const Consumer = defineComponent({
  name: 'LocaleConsumer',
  setup() {
    const locale = useLocale<TestMessages, TestKey>()
    return () =>
      h('button', { type: 'button', 'aria-label': locale.t('input.clear') }, locale.t('pagination.next'))
  },
})

const Provider = defineComponent({
  name: 'LocaleProviderProbe',
  props: {
    locale: { type: String as PropType<string | undefined>, default: undefined },
    messages: {
      type: Object as PropType<DeepPartial<TestMessages> | undefined>,
      default: undefined,
    },
  },
  setup(props, { slots, expose }) {
    const instance = provideLocale<TestMessages, TestKey>({
      locale: props.locale,
      packs: { 'en-US': EN, 'zh-CN': ZH },
      messages: props.messages,
    })
    expose({ instance })
    return () => h('div', slots.default?.())
  },
})

/** The instance a mounted `Provider` provided, for tests that switch language afterwards. */
function providedInstance(wrapper: { vm: unknown }): YueLocaleInstance<TestMessages, TestKey> {
  return (wrapper.vm as unknown as { instance: YueLocaleInstance<TestMessages, TestKey> }).instance
}

function mountApp(setup: (app: App) => void, component = Provider) {
  const app = createApp({
    render: () => h(component as never, null, { default: () => h(Consumer) }),
  })
  setup(app)
  const host = document.createElement('div')
  return { app, host }
}

describe('useLocale inside components', () => {
  it('reads the instance provided above it', () => {
    const { app, host } = mountApp(() => {})
    app.mount(host)
    expect(host.querySelector('button')?.getAttribute('aria-label')).toBe('Clear')
  })

  it('falls back to a shared instance when nothing was provided', () => {
    const Bare = defineComponent({
      setup() {
        const locale = useLocale<TestMessages, TestKey>(testLocale({ locale: 'zh-CN' }))
        return () => h('button', { type: 'button', 'aria-label': locale.t('input.clear') })
      },
    })
    const wrapper = mount(Bare)
    expect(wrapper.attributes('aria-label')).toBe('清空')
  })

  it('provides a per-subtree language through the component tree', () => {
    const wrapper = mount(Provider, {
      props: { locale: 'zh-CN' },
      slots: { default: () => h(Consumer) },
    })
    expect(wrapper.find('button').attributes('aria-label')).toBe('清空')
    expect(wrapper.find('button').text()).toBe('下一页')
  })

  it('updates a mounted component reactively when the language switches', async () => {
    // The contract the roadmap calls out: after a locale switch, already-mounted components
    // must show the new language, not just the ones rendered afterwards.
    const wrapper = mount(Provider, {
      props: { locale: 'en-US' },
      slots: { default: () => h(Consumer) },
    })
    const instance = providedInstance(wrapper)

    expect(wrapper.find('button').attributes('aria-label')).toBe('Clear')
    instance.current.value = 'zh-CN'
    await nextTick()
    expect(wrapper.find('button').attributes('aria-label')).toBe('清空')
    expect(wrapper.find('button').text()).toBe('下一页')
  })

  it('keeps the application locale when a subtree translates one string', () => {
    const wrapper = mount(Provider, {
      props: { locale: 'zh-CN', messages: { input: { clear: 'Effacer' } } },
      slots: { default: () => h(Consumer) },
    })
    // The subtree's own key wins…
    expect(wrapper.find('button').attributes('aria-label')).toBe('Effacer')
    // …and everything else stays in the application's language.
    expect(wrapper.find('button').text()).toBe('下一页')
  })
})

describe('installYueLocale', () => {
  it('installs the instance for the whole application', () => {
    const { app, host } = mountApp((instance) => {
      installYueLocale<TestMessages, TestKey>(instance, {
        locale: 'zh-CN',
        packs: { 'en-US': EN, 'zh-CN': ZH },
      })
    })
    app.mount(host)
    expect(host.querySelector('button')?.getAttribute('aria-label')).toBe('清空')
  })

  it('returns the instance so the application can switch language later', () => {
    const app = createApp({ render: () => null })
    const locale = installYueLocale<TestMessages, TestKey>(app, {
      locale: 'en-US',
      packs: { 'en-US': EN },
    })
    expect(locale.current.value).toBe('en-US')

    // Switching to a language with no pack is served by the fallback chain rather than
    // blanking the UI: `zh-CN → zh → en-US` still reaches the only pack there is.
    locale.current.value = 'zh-CN'
    expect(locale.t('input.clear')).toBe('Clear')
    expect(peekLocaleDiagnostics()).toEqual([])

    // A key no pack has is still reported, whatever the locale.
    expect(locale.t('nothing.here' as TestKey)).toBe('nothing.here')
    expect(consumeLocaleDiagnostics()[0]).toMatchObject({ reason: 'missing-key' })
  })
})

describe('the injection key', () => {
  it('is the global registry entry both packages look for', () => {
    // Two copies of `@yue-ui/hooks` (one inside `@yue-ui/vue`'s bundle, one installed) must
    // produce the same key, or a consumer configures the locale and the components never
    // see it — silently, because `inject(key, fallback)` cannot tell the difference.
    expect(yueLocaleKey).toBe(Symbol.for('yue:locale'))
    expect(Symbol.keyFor(yueLocaleKey)).toBe('yue:locale')
  })
})

describe('adapters', () => {
  function adapterFixture() {
    const current = ref('ja-JP')
    const translate = vi.fn((key: string) => `ja:${key}`)
    const adapter: YueLocaleAdapter = {
      current,
      t: translate,
      n: (value) => `num:${value}`,
      d: (value) => `date:${String(value)}`,
    }
    return { adapter, current, translate }
  }

  it('delegates t/n/d to the engine', () => {
    const { adapter } = adapterFixture()
    const locale = createLocale<TestMessages, TestKey>({ adapter })
    expect(locale.t('input.clear')).toBe('ja:input.clear')
    expect(locale.n(5)).toBe('num:5')
    expect(locale.d(0)).toBe('date:0')
  })

  it('uses the engine’s locale ref, so switching there switches here', () => {
    const { adapter, current } = adapterFixture()
    const locale = createLocale<TestMessages, TestKey>({ adapter })
    expect(locale.current).toBe(current)
    current.value = 'ko-KR'
    expect(locale.current.value).toBe('ko-KR')
  })

  it('keeps Yue’s Intl formatting when the engine only translates', () => {
    const current = ref('en-US')
    const locale = createLocale<TestMessages, TestKey>({
      adapter: { current, t: (key) => `x:${key}` },
    })
    expect(locale.n(1234)).toBe(new Intl.NumberFormat('en-US').format(1234))
  })

  it('is inherited by a child scope', () => {
    const { adapter } = adapterFixture()
    const parent = createLocale<TestMessages, TestKey>({ adapter })
    const child = parent.provide({ locale: 'fr-FR' })
    expect(child.t('input.clear')).toBe('ja:input.clear')
  })
})
