import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetLocaleDiagnostics } from '@yue-ui/hooks'
// Source, not `@yue-ui/vue/...`: the test suite runs before any build in a clean checkout, and a
// test that needs `dist` to exist cannot fail for the reason it claims to check.
import { createYueLocale, provideLocale, useLocale } from '../../packages/vue/src/locale/index'
import YueInput from '../../packages/vue/src/components/input/YueInput.vue'
import { vueI18nAdapter } from '../../apps/docs/.vitepress/theme/adapters/vue-i18n'

/**
 * The adapter contract, exercised against the real engine.
 *
 * The claim being tested is not "vue-i18n works" — it is that **Yue's components read their text
 * from an application engine without Yue depending on it**. So the test wires the real
 * `vue-i18n` composer through the documented adapter, mounts the real `YueInput`, and asserts the
 * accessible name comes from the application's message files.
 *
 * The adapter itself lives in the docs theme rather than in a package, which is the roadmap's
 * deliberate first step: prove the contract with a real consumer before publishing an entry point
 * and a peer dependency for it.
 */
function createAdapterI18n() {
  return createI18n({
    legacy: false,
    locale: 'en-US',
    fallbackLocale: 'en-US',
    messages: {
      // The application's own copy lives in the same message files as the library's string: one
      // table, one translator, no special case for the component library.
      'en-US': { input: { clear: 'Clear' }, application: { title: 'Yue Design' } },
      'zh-CN': { input: { clear: '清空' } },
    },
  })
}

/** A consumer that reads Yue's locale through the adapter. */
const Consumer = defineComponent({
  name: 'AdapterConsumer',
  setup() {
    const locale = useLocale()
    return () => h('span', { 'data-label': locale.t('input.clear') }, locale.t('input.clear'))
  },
})

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  resetLocaleDiagnostics()
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the vue-i18n adapter', () => {
  it('translates Yue keys through the application engine', () => {
    const i18n = createAdapterI18n()
    const locale = createYueLocale({ adapter: vueI18nAdapter(i18n.global) })

    expect(locale.t('input.clear')).toBe('Clear')
    expect(i18n.global.t('application.title')).toBe('Yue Design')
    expect(warn).not.toHaveBeenCalled()
  })

  it('shares the engine’s locale ref instead of copying it', () => {
    const i18n = createAdapterI18n()
    const locale = createYueLocale({ adapter: vueI18nAdapter(i18n.global) })

    // The application switches language through its own API…
    i18n.global.locale.value = 'zh-CN'
    // …and Yue is already there, because there is only one ref.
    expect(locale.current.value).toBe('zh-CN')
    expect(locale.t('input.clear')).toBe('清空')
  })

  it('lets Yue switch the language the application sees', () => {
    // The reverse direction matters as much: a Yue component that renders its own language
    // control must not leave the rest of the application behind.
    const i18n = createAdapterI18n()
    const locale = createYueLocale({ adapter: vueI18nAdapter(i18n.global) })

    locale.current.value = 'zh-CN'
    expect(i18n.global.locale.value).toBe('zh-CN')
    expect(i18n.global.t('input.clear')).toBe('清空')
  })

  it('keeps Yue’s Intl formatting when the engine only translates', () => {
    const i18n = createAdapterI18n()
    const locale = createYueLocale({ adapter: vueI18nAdapter(i18n.global) })

    // The adapter omits `n`/`d`, so the number is formatted by Yue for the engine's locale.
    expect(locale.n(1234.5)).toBe(new Intl.NumberFormat('en-US').format(1234.5))
    i18n.global.locale.value = 'de-DE'
    expect(locale.n(1234.5)).toBe(new Intl.NumberFormat('de-DE').format(1234.5))
  })

  it('carries interpolation parameters through', () => {
    const i18n = createI18n({
      legacy: false,
      locale: 'en-US',
      messages: { 'en-US': { pagination: { page: 'Page {page}' } } },
    })
    const locale = createYueLocale({ adapter: vueI18nAdapter(i18n.global) })
    expect(locale.t('pagination.page' as never, { page: 3 })).toBe('Page 3')
  })

  it('reaches a component’s accessible name through provide/inject', async () => {
    const i18n = createAdapterI18n()

    const Provider = defineComponent({
      setup(_, { slots }) {
        provideLocale({ adapter: vueI18nAdapter(i18n.global) })
        return () => slots.default?.()
      },
    })

    const wrapper = mount(Provider, {
      slots: {
        default: () => h(YueInput, { modelValue: 'value', clearable: true }),
      },
    })
    const name = () => wrapper.find('.yue-input__clear').attributes('aria-label')
    expect(name()).toBe('Clear')

    // Switching the *application's* language updates an already-mounted component.
    i18n.global.locale.value = 'zh-CN'
    await nextTick()
    expect(name()).toBe('清空')

    // And Yue's own diagnostics stay quiet: an adapter means no missing-key reports, because the
    // engine owns the messages.
    expect(warn).not.toHaveBeenCalled()
  })

  it('still renders the real component around the translated name', () => {
    const i18n = createAdapterI18n()
    const Provider = defineComponent({
      setup(_, { slots }) {
        provideLocale({ adapter: vueI18nAdapter(i18n.global) })
        return () => slots.default?.()
      },
    })
    const wrapper = mount(Provider, {
      slots: { default: () => h(YueInput, { modelValue: 'value', clearable: true }) },
    })
    expect(wrapper.find('.yue-input__native').exists()).toBe(true)
    expect(wrapper.find('.yue-input__clear').element.tagName).toBe('BUTTON')
    // The consumer's own consumer-side string is untouched by the adapter.
    expect(i18n.global.t('application.title')).toBe('Yue Design')
  })

  it('reports a key the engine does not know, rather than rendering nothing', () => {
    const i18n = createAdapterI18n()
    const locale = createYueLocale({ adapter: vueI18nAdapter(i18n.global) })

    // `vue-i18n` renders the key for a missing message and warns; the value is never empty, which
    // is the property Yue's contract requires of an adapter.
    const value = locale.t('input.missing' as never)
    expect(value).not.toBe('')
  })
})
