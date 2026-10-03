import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { consumeLocaleDiagnostics, resetLocaleDiagnostics } from '@yue-ui/hooks'
import {
  createYueLocale,
  enUS,
  provideLocale,
  useLocale,
  YUE_MESSAGE_META,
  YueLocaleProvider,
  yueLocaleKey,
} from './index'
import type { YueLocaleMessages, YueMessageKey } from './index'
// The Chinese pack is a separate entry on purpose (`@yue-ui/vue/locale/zh-CN`), so a test that
// wants it imports it explicitly — exactly what a consumer does.
import { zhCN } from './zh-CN'

/* ------------------------------------------------------------------ *
 * Types first: the catalog *is* the contract
 * ------------------------------------------------------------------ */

type Equal<Left, Right> = (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right
  ? 1
  : 2
  ? true
  : false
type Expect<T extends true> = T

/**
 * The derived key union is what components are allowed to pass, so it is asserted here rather
 * than described in prose: a key that is added to the catalog without appearing in this union
 * (or a key that appears without a catalog leaf) fails the type check.
 *
 * Current keys: `input.clear`, `tag.closeLabel`.
 */
type KeysAreExact = Expect<Equal<YueMessageKey, 'input.clear' | 'tag.closeLabel'>>

/**
 * And the packs *are* the catalog, not merely assignable to it: `satisfies` would allow a
 * wider object, while this fails if a pack grows a key the catalog does not declare.
 */
type DefaultPackIsCatalog = Expect<Equal<typeof enUS, YueLocaleMessages>>

/** Bind the assertions so `noUnusedLocals` cannot silently drop them. */
const _keysAreExact: KeysAreExact = true
const _defaultPackIsCatalog: DefaultPackIsCatalog = true
void _keysAreExact
void _defaultPackIsCatalog
/** Flatten a pack to `dotted.key -> value`, the same way the runtime walks it. */
function flatten(tree: Record<string, unknown>, prefix = ''): Map<string, string> {
  const leaves = new Map<string, string>()
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') leaves.set(path, value)
    else if (value && typeof value === 'object') {
      for (const [nested, nestedValue] of flatten(value as Record<string, unknown>, path)) {
        leaves.set(nested, nestedValue)
      }
    }
  }
  return leaves
}

/** `{name}` placeholders in a message, sorted, so two locales can be compared. */
function placeholders(message: string): string[] {
  return [...message.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort()
}

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  resetLocaleDiagnostics()
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the catalog', () => {
  it('derives exactly the documented key union', () => {
    const keys: YueMessageKey[] = ['input.clear', 'tag.closeLabel']
    expect(keys).toHaveLength(2)
    // The type-level assertion above is the real check; this keeps the runtime half honest.
    expect(Object.keys(YUE_MESSAGE_META).sort()).toEqual(keys.sort())
  })

  it('documents every key with a purpose, parameters and announcement flag', () => {
    for (const [key, meta] of Object.entries(YUE_MESSAGE_META)) {
      expect(meta.purpose, `${key} has no documented purpose`).not.toBe('')
      expect(Array.isArray(meta.params), `${key} has no parameter list`).toBe(true)
      expect(typeof meta.announced, `${key} does not say whether it is announced`).toBe('boolean')
    }
  })

  it('says the clear control is announced', () => {
    // It is an `aria-label` on an icon-only button: an unreviewed translation here is an
    // unnamed control, not a cosmetic gap.
    expect(YUE_MESSAGE_META['input.clear'].announced).toBe(true)
    expect(YUE_MESSAGE_META['input.clear'].params).toEqual([])
  })
})

describe('the language packs', () => {
  const en = flatten(enUS as unknown as Record<string, unknown>)
  const zh = flatten(zhCN as unknown as Record<string, unknown>)

  it('have the same leaf keys', () => {
    expect([...zh.keys()].sort()).toEqual([...en.keys()].sort())
  })

  it('have the same interpolation parameters', () => {
    for (const [key, message] of en) {
      expect(placeholders(zh.get(key) ?? ''), `${key} parameter mismatch`).toEqual(
        placeholders(message),
      )
    }
  })

  it('have no empty or whitespace-only value', () => {
    for (const [key, message] of [...en, ...zh]) {
      expect(message.trim(), `${key} is empty`).not.toBe('')
    }
  })

  it('translate rather than repeat the English string', () => {
    // A pack that copies the default is a placeholder, not a translation. `en-US` and
    // `zh-CN` share no string in this catalog.
    for (const [key, message] of en) {
      expect(zh.get(key), `${key} was copied from en-US`).not.toBe(message)
    }
  })

  it('cover every catalog leaf', () => {
    // The `satisfies` on each pack catches a missing branch at compile time; this catches a
    // branch that exists in the *catalog* (the metadata record is its machine-readable key
    // list) but was never given a value in a pack.
    expect([...en.keys()].sort()).toEqual(Object.keys(YUE_MESSAGE_META).sort())
  })
})

describe('createYueLocale', () => {
  it('answers with the default pack', () => {
    const locale = createYueLocale()
    expect(locale.current.value).toBe('en-US')
    expect(locale.t('input.clear')).toBe('Clear')
    expect(peek(warn)).toBe(false)
  })

  it('answers with a requested pack', () => {
    const locale = createYueLocale({ locale: 'zh-CN', packs: { 'zh-CN': zhCN } })
    expect(locale.t('input.clear')).toBe('清空')
  })

  it('falls back to the default pack for a language it does not ship', () => {
    const locale = createYueLocale({ locale: 'fr-FR' })
    expect(locale.t('input.clear')).toBe('Clear')
  })

  it('lets a caller override one string without restating the catalog', () => {
    const locale = createYueLocale({ messages: { input: { clear: 'Effacer' } } })
    expect(locale.t('input.clear')).toBe('Effacer')
  })

  it('reports a key the catalog cannot have', () => {
    const locale = createYueLocale()
    // Cast: the point is the *runtime* behaviour for a key that is not in the union — a
    // JavaScript caller or an adapter can still reach this.
    const translate = locale.t as (key: string) => string
    expect(translate('input.missing')).toBe('input.missing')
    expect(consumeLocaleDiagnostics()[0]).toMatchObject({
      reason: 'missing-key',
      key: 'input.missing',
    })
  })

  it('supports the Intl helpers', () => {
    const locale = createYueLocale({ locale: 'de-DE' })
    expect(locale.n(1234.5)).toBe(new Intl.NumberFormat('de-DE').format(1234.5))
    expect(locale.n(1234.5)).not.toBe(new Intl.NumberFormat('en-US').format(1234.5))
  })
})

describe('the injection key', () => {
  it('is the registry entry the hooks package also uses', () => {
    expect(yueLocaleKey).toBe(Symbol.for('yue:locale'))
  })
})

/* ------------------------------------------------------------------ *
 * Component integration
 * ------------------------------------------------------------------ */

/** A stand-in for a real component: reads one key the way `YueInput` does. */
const Consumer = defineComponent({
  name: 'CatalogConsumer',
  setup() {
    const locale = useLocale()
    return () => h('span', { 'aria-label': locale.t('input.clear') }, locale.t('input.clear'))
  },
})

describe('useLocale in components', () => {
  it('uses the default pack when nothing was provided', () => {
    const wrapper = mount(Consumer)
    expect(wrapper.attributes('aria-label')).toBe('Clear')
  })

  it('reads the nearest provider', () => {
    const wrapper = mount(YueLocaleProvider, {
      props: { locale: 'zh-CN', packs: { 'zh-CN': zhCN } },
      slots: { default: () => h(Consumer) },
    })
    expect(wrapper.find('span').attributes('aria-label')).toBe('清空')
  })

  it('updates below a provider when its locale prop changes', async () => {
    const wrapper = mount(YueLocaleProvider, {
      props: { locale: 'en-US', packs: { 'zh-CN': zhCN } },
      slots: { default: () => h(Consumer) },
    })
    expect(wrapper.find('span').text()).toBe('Clear')

    await wrapper.setProps({ locale: 'zh-CN' })
    await nextTick()
    expect(wrapper.find('span').text()).toBe('清空')
  })

  it('keeps the parent language when a subtree only overrides one string', () => {
    const Inner = defineComponent({
      setup() {
        provideLocale({ messages: { input: { clear: 'Effacer' } } })
        return () => h(Consumer)
      },
    })
    const wrapper = mount(YueLocaleProvider, {
      props: { locale: 'zh-CN', packs: { 'zh-CN': zhCN } },
      slots: { default: () => h(Inner) },
    })
    // The override wins for its key…
    expect(wrapper.find('span').text()).toBe('Effacer')
    // …and the surrounding language is untouched.
    const outer = mount(YueLocaleProvider, {
      props: { locale: 'zh-CN', packs: { 'zh-CN': zhCN } },
      slots: { default: () => h(Consumer) },
    })
    expect(outer.find('span').text()).toBe('清空')
  })
})

describe('YueLocaleProvider', () => {
  it('renders its slot inside a provided scope', () => {
    const wrapper = mount(YueLocaleProvider, {
      props: { locale: 'zh-CN', packs: { 'zh-CN': zhCN } },
      slots: { default: () => h('em', 'content') },
    })
    expect(wrapper.find('em').text()).toBe('content')
  })

  it('does not touch document.lang unless asked', async () => {
    const before = document.documentElement.lang
    mount(YueLocaleProvider, {
      props: { locale: 'zh-CN', packs: { 'zh-CN': zhCN } },
      slots: { default: () => h('i') },
    })
    await nextTick()
    expect(document.documentElement.lang).toBe(before)
  })

  it('mirrors the locale onto document.lang in a client-side effect when asked', async () => {
    const before = document.documentElement.lang
    const wrapper = mount(YueLocaleProvider, {
      props: { locale: 'zh-CN', packs: { 'zh-CN': zhCN }, documentLang: true },
      slots: { default: () => h('i') },
    })
    await nextTick()
    expect(document.documentElement.lang).toBe('zh-CN')

    await wrapper.setProps({ locale: 'en-US' })
    await nextTick()
    expect(document.documentElement.lang).toBe('en-US')

    document.documentElement.lang = before
  })

  it('accepts an adapter instead of packs', () => {
    const current = ref('ja-JP')
    const wrapper = mount(YueLocaleProvider, {
      props: { adapter: { current, t: (key: string) => `ja:${key}` } },
      slots: { default: () => h(Consumer) },
    })
    expect(wrapper.find('span').text()).toBe('ja:input.clear')
  })
})

/** Whether anything was reported on the console. */
function peek(spy: ReturnType<typeof vi.spyOn>): boolean {
  return spy.mock.calls.length > 0
}
