import { renderToString } from 'vue/server-renderer'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetLocaleDiagnostics } from '@yue-ui/hooks'
// Source, not `@yue-ui/vue/...`: the suite runs before any build in a clean checkout.
import { createYueLocale, provideLocale } from '../../packages/vue/src/locale/index'
import YueLocaleProvider from '../../packages/vue/src/locale/YueLocaleProvider.vue'
import YueInput from '../../packages/vue/src/components/input/YueInput.vue'

/**
 * SSR output and client hydration.
 *
 * The roadmap lists SSR/hydration under phase 7 acceptance, and the Node test that only *imports*
 * the locale module does not establish it: a component can be import-safe and still render
 * differently on the server than on the client, which is exactly the failure hydration reports as a
 * mismatch. So this suite does the real thing:
 *
 *   1. `renderToString` produces HTML for a given locale — including through the fallback chain;
 *   2. that HTML is put into a container and the same app is mounted over it with `createSSRApp`,
 *      which hydrates rather than re-renders;
 *   3. **the DOM nodes survive** — the identity of the server-rendered element is checked after
 *      mounting, because "the text is right" would also be true of a fresh client render that
 *      replaced everything;
 *   4. Vue logs no hydration mismatch, and a locale switch after hydration updates the text.
 */
const PACKS = { 'zh-CN': { input: { clear: '清空' } }, 'en-US': { input: { clear: 'Clear' } } }

const zhCN = PACKS['zh-CN']

/** The locale instance under test, so a case can switch language after hydration. */
function makeLocale(locale = 'zh-CN') {
  return createYueLocale({ locale, fallback: 'en-US', packs: PACKS as never })
}

/** A page-shaped component: the locale is provided at the root, exactly as an app would. */
function makeApp({ locale = 'zh-CN', useProvider = false, localeRef }: { locale?: string; useProvider?: boolean; localeRef?: { value: string } } = {}) {
  const Root = defineComponent({
    name: 'SsrRoot',
    setup() {
      if (useProvider || localeRef) {
        // The documented application path: the provider component owns the scope, so a `v-model`-like
        // binding on `locale` is what a real app switches.
        return () =>
          h(
            YueLocaleProvider,
            { locale: localeRef ? localeRef.value : locale, packs: PACKS },
            () => h(YueInput, { modelValue: 'value', clearable: true }),
          )
      }
      provideLocale({ locale, fallback: 'en-US', packs: PACKS })
      return () => h(YueInput, { modelValue: 'value', clearable: true })
    },
  })
  return { app: createSSRApp(Root) }
}

const clearLabel = (html: string) => /aria-label="([^"]*)"/.exec(html)?.[1] ?? null

let warnings: string[]
let errors: string[]
let warn: ReturnType<typeof vi.spyOn>
let error: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  resetLocaleDiagnostics()
  warnings = []
  errors = []
  warn = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    warnings.push(args.map(String).join(' '))
  })
  error = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(' '))
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  // Containers this suite appended must not leak into the next test's document.
  document.body.replaceChildren()
  document.documentElement.removeAttribute('lang')
})

/** Anything Vue said about hydration, from either console channel. */
const hydrationWarnings = () =>
  [...warnings, ...errors].filter((message) => /hydrat|mismatch/i.test(message))

describe('server rendering', () => {
  it('renders a component with the locale’s text', async () => {
    const { app } = makeApp({ locale: 'zh-CN' })
    const html = await renderToString(app)
    expect(clearLabel(html)).toBe('清空')
    expect(html).toContain('yue-input')
    expect(html).toContain('value="value"')
  })

  it('renders the default pack for an unprovided locale', async () => {
    const { app } = makeApp({ locale: 'en-US' })
    expect(clearLabel(await renderToString(app))).toBe('Clear')
  })

  it('resolves a regional locale through the fallback chain on the server', async () => {
    // `zh-Hans-CN` has no pack of its own. An exact-match lookup would fall through to `en-US`.
    const { app } = makeApp({ locale: 'zh-Hans-CN' })
    expect(clearLabel(await renderToString(app))).toBe('清空')
  })

  it('renders through the provider component, which is the path an application uses', async () => {
    const { app } = makeApp({ locale: 'zh-CN', useProvider: true })
    expect(clearLabel(await renderToString(app))).toBe('清空')
  })

  it('does not touch the DOM globals while rendering', async () => {
    // `document` exists in this environment, so the assertion is about *use*, not availability:
    // the locale module and the component must not read or write the document during SSR.
    const documentSpy = vi.spyOn(globalThis.document.documentElement, 'setAttribute' as never)
    const { app } = makeApp({ locale: 'zh-CN' })
    await renderToString(app)
    expect(documentSpy).not.toHaveBeenCalled()
    documentSpy.mockRestore()
  })

  it('reports nothing to the console: no mismatch can exist yet, and no diagnostic should', async () => {
    const { app } = makeApp({ locale: 'zh-CN' })
    await renderToString(app)
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })
})

describe('client hydration over server output', () => {
  /** Server-render, then hydrate the same markup the way a browser would receive it. */
  async function serverThenHydrate({ locale = 'zh-CN', useProvider = false, localeRef }: { locale?: string; useProvider?: boolean; localeRef?: { value: string } } = {}) {
    const server = makeApp({ locale, useProvider, localeRef })
    const html = await renderToString(server.app)

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)
    // Captured before hydration: if these nodes are gone afterwards, mounting *replaced* the server
    // markup instead of reusing it, and "hydration" would be a fiction.
    const inputBefore = container.querySelector('input')
    const clearBefore = container.querySelector('button')

    const client = makeApp({ locale, useProvider, localeRef })
    client.app.mount(container)
    await nextTick()

    return { container, inputBefore, clearBefore }
  }

  it('reuses the server-rendered nodes instead of re-rendering them', async () => {
    const { container, inputBefore, clearBefore } = await serverThenHydrate()
    expect(container.querySelector('input')).toBe(inputBefore)
    expect(container.querySelector('button')).toBe(clearBefore)
    expect(container.querySelector('.yue-input__clear')?.getAttribute('aria-label')).toBe('清空')
  })

  it('logs no hydration mismatch', async () => {
    await serverThenHydrate()
    expect(hydrationWarnings()).toEqual([])
    expect(error).not.toHaveBeenCalled()
  })

  it('hydrates a locale provided by the provider component', async () => {
    const { container, clearBefore } = await serverThenHydrate({ locale: 'zh-CN', useProvider: true })
    expect(container.querySelector('button')).toBe(clearBefore)
    expect(container.querySelector('.yue-input__clear')?.getAttribute('aria-label')).toBe('清空')
    expect(hydrationWarnings()).toEqual([])
  })

  it('updates an already-hydrated component when the locale changes', async () => {
    const locale = ref('zh-CN')
    const { container } = await serverThenHydrate({ localeRef: locale as unknown as { value: string } })
    const clear = () => container.querySelector('.yue-input__clear')
    const input = container.querySelector('input')
    expect(clear()?.getAttribute('aria-label')).toBe('清空')

    locale.value = 'en-US'
    await nextTick()
    expect(clear()?.getAttribute('aria-label')).toBe('Clear')
    // Still the same element: a language change is a text update, not a remount.
    expect(container.querySelector('input')).toBe(input)
    expect(hydrationWarnings()).toEqual([])
  })

  it('hydrates the fallback chain the same way the server resolved it', async () => {
    const { container } = await serverThenHydrate({ locale: 'zh-Hans-CN' })
    expect(container.querySelector('.yue-input__clear')?.getAttribute('aria-label')).toBe('清空')
    expect(hydrationWarnings()).toEqual([])
  })
})

describe('the locale provider’s own SSR contract', () => {
  it('writes the element’s lang attribute on the client only', async () => {
    const Root = defineComponent({
      setup() {
        return () =>
          h(
            YueLocaleProvider,
            { locale: 'zh-CN', packs: PACKS, documentLang: true },
            () => h('span', 'x'),
          )
      },
    })

    // Server: the markup must not depend on `document`, and the host document's language is the
    // host's business.
    const html = await renderToString(createSSRApp(Root))
    expect(html).toContain('<span>x</span>')
    expect(document.documentElement.getAttribute('lang')).toBe(null)

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)
    createSSRApp(Root).mount(container)
    await nextTick()
    expect(document.documentElement.getAttribute('lang')).toBe('zh-CN')
    expect(hydrationWarnings()).toEqual([])
  })
})
