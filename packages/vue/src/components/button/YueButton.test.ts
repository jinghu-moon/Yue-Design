import { mount } from '@vue/test-utils'
import type { MountingOptions } from '@vue/test-utils'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, markRaw, nextTick } from 'vue'
import { YUE_NAMESPACE, yueConfigKey } from '@yue-ui/hooks'
import type { YueButtonProps, YueButtonSize } from './types'
import YueButton from './YueButton.vue'

/**
 * Load the stylesheet this component ships with.
 *
 * Not `import ... from './style.css?raw'`: Vitest stubs CSS imports (including the
 * `?raw` query) to an empty string, which would make every assertion below pass
 * vacuously against `''`. Not `new URL('./style.css', import.meta.url)` either,
 * because under happy-dom `import.meta.url` is not a `file:` URL.
 *
 * The candidates cover running from the workspace root (the normal case) and from
 * the package directory; anything else throws rather than reading `''`.
 */
function readStylesheet(): string {
  for (const candidate of [
    resolve(process.cwd(), 'packages/vue/src/components/button/style.css'),
    resolve(process.cwd(), 'src/components/button/style.css'),
  ]) {
    if (existsSync(candidate)) return readFileSync(candidate, 'utf8')
  }
  throw new Error(`could not locate the Button stylesheet from ${process.cwd()}`)
}

const STYLESHEET = readStylesheet()

/**
 * `mount`'s own `slots` option declares `default` as optional, so spreading the
 * caller's options into a helper's defaults produces `Slot | undefined`, which no
 * longer satisfies the `SlotDictionary` index signature. Declaring the helper's
 * own narrow shape avoids that and documents exactly what a test may set.
 */
interface MountButtonOptions {
  props?: YueButtonProps
  attrs?: Record<string, unknown>
  slots?: Record<string, string>
  global?: MountingOptions<YueButtonProps>['global']
}

/**
 * Every mount supplies a label unless the test overrides it, so the `circle`
 * accessible-name warning can only fire in the test that asks for it.
 */
function mountButton(options: MountButtonOptions = {}) {
  return mount(YueButton, {
    ...options,
    slots: { default: '确定', ...options.slots },
  })
}

/** Provide the real (Symbol-keyed) configuration to a subtree. */
function withConfig(size: YueButtonSize) {
  return { provide: { [yueConfigKey]: { size } } }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('YueButton', () => {
  describe('the size prop', () => {
    it('is the shared control-size contract, not a local union', () => {
      // The union itself lives in `packages/vue/src/shared/size.ts` and is checked
      // against the hooks layer once, in `shared/size.test.ts`. This only pins that
      // the component still accepts the documented steps.
      expect(mountButton({ props: { size: 'sm' } }).classes()).toContain('yue-button--sm')
      expect(mountButton({ props: { size: 'md' } }).classes()).toContain('yue-button--md')
      expect(mountButton({ props: { size: 'lg' } }).classes()).toContain('yue-button--lg')
    })
  })

  describe('default rendering', () => {
    it('renders a native <button> with the documented class set', () => {
      const wrapper = mountButton()

      expect(wrapper.element.tagName).toBe('BUTTON')
      expect(wrapper.classes().sort()).toEqual([
        'yue-button',
        'yue-button--default',
        'yue-button--md',
        'yue-button--solid',
        'yue-button--square',
      ])
      expect(wrapper.text()).toBe('确定')
    })

    it('renders the label through the default slot', () => {
      const wrapper = mountButton({ slots: { default: '提交' } })
      expect(wrapper.find('.yue-button__label').text()).toBe('提交')
    })

    it('announces no pressed state until the caller asks for one', () => {
      // `active` is a toggle contract, not a visual state that happens to be off: an
      // ordinary button that reports `aria-pressed="false"` tells a screen reader it is a
      // toggle button, which it is not.
      expect(mountButton().attributes('aria-pressed')).toBeUndefined()
    })
  })

  describe('theme', () => {
    it.each(['default', 'primary', 'success', 'warning', 'danger'] as const)(
      'applies the %s theme class',
      (theme) => {
        expect(mountButton({ props: { theme } }).classes()).toContain(`yue-button--${theme}`)
      },
    )
  })

  describe('variant', () => {
    it.each(['solid', 'outline', 'dashed', 'text', 'link'] as const)(
      'applies the %s variant class',
      (variant) => {
        expect(mountButton({ props: { variant } }).classes()).toContain(`yue-button--${variant}`)
      },
    )
  })

  describe('size', () => {
    it.each(['sm', 'md', 'lg'] as const)('applies the %s size class', (size) => {
      expect(mountButton({ props: { size } }).classes()).toContain(`yue-button--${size}`)
    })

    it('falls back to the injected YueConfig size', () => {
      const wrapper = mountButton({ global: withConfig('lg') })
      expect(wrapper.classes()).toContain('yue-button--lg')
    })

    it('lets the size prop win over YueConfig', () => {
      const wrapper = mountButton({ props: { size: 'sm' }, global: withConfig('lg') })
      expect(wrapper.classes()).toContain('yue-button--sm')
      expect(wrapper.classes()).not.toContain('yue-button--lg')
    })

    it('cannot be given a different class namespace', () => {
      // A namespace the stylesheet does not match would render an unstyled button,
      // so the namespace is a constant rather than a configuration option. This
      // pins the decision from the component's side.
      expect(YUE_NAMESPACE).toBe('yue')
      const wrapper = mountButton({ global: withConfig('md') })
      expect(wrapper.classes()).toContain('yue-button')
      expect(wrapper.classes().some((name) => /^app-/.test(name))).toBe(false)
    })
  })

  describe('shape', () => {
    it.each(['square', 'round', 'circle'] as const)('applies the %s shape class', (shape) => {
      expect(mountButton({ props: { shape } }).classes()).toContain(`yue-button--${shape}`)
    })
  })

  describe('active (standalone toggle button)', () => {
    it('adds the is-active state class when selected', () => {
      const wrapper = mountButton({ props: { active: true } })
      expect(wrapper.classes()).toContain('is-active')
      expect(wrapper.attributes('aria-pressed')).toBe('true')
    })

    it('reports aria-pressed="false" without the state class when explicitly unselected', () => {
      // `active: false` is a different statement from "no `active`": it says "this is a
      // toggle button and it is currently off", which is exactly what `aria-pressed="false"`
      // means to a screen reader.
      const wrapper = mountButton({ props: { active: false } })
      expect(wrapper.classes()).not.toContain('is-active')
      expect(wrapper.attributes('aria-pressed')).toBe('false')
    })

    it('cannot have its pressed state forged through an attribute', () => {
      // Same reasoning as `aria-busy`: `inheritAttrs: false` is what makes the component's
      // own bindings win over a forwarded attribute.
      const wrapper = mountButton({ props: { active: true }, attrs: { 'aria-pressed': 'false' } })
      expect(wrapper.attributes('aria-pressed')).toBe('true')
    })

    it('still emits click while selected', async () => {
      const wrapper = mountButton({ props: { active: true } })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toHaveLength(1)
    })
  })

  describe('disabled', () => {
    it('sets the native disabled attribute on a <button>', () => {
      expect(mountButton({ props: { disabled: true } }).attributes('disabled')).toBeDefined()
    })

    it('adds the is-disabled state class', () => {
      expect(mountButton({ props: { disabled: true } }).classes()).toContain('is-disabled')
    })

    it('does not emit click', async () => {
      const wrapper = mountButton({ props: { disabled: true } })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toBeUndefined()
    })

    it('does not use aria-disabled on a native <button>', () => {
      // A native `<button>` is disabled by the platform; adding aria-disabled as
      // well would double-announce the state.
      expect(mountButton({ props: { disabled: true } }).attributes('aria-disabled')).toBeUndefined()
    })
  })

  /**
   * The aria and tab-order contract, as a matrix.
   *
   * Written out rather than asserted case by case because the defect it guards against is
   * *tag-dependent*: the same state has to be expressed the same way whether the component
   * rendered a `<button>`, an `<a>` or a consumer's component. The version this replaces got
   * that wrong in one direction only — `loading` off a native `<button>` was "busy, still
   * focusable", while `loading` on an `<a>` additionally claimed `aria-disabled="true"` and
   * pushed the element out of the tab order, which is the one thing `loading` must never do.
   */
  describe('the aria and tab-order contract', () => {
    interface AriaReading {
      disabled: string | undefined
      ariaDisabled: string | undefined
      ariaBusy: string | undefined
      tabindex: string | undefined
    }

    const CASES: Array<{
      label: string
      tag: 'button' | 'a'
      disabled?: boolean
      loading?: boolean
      expected: AriaReading
    }> = [
      {
        label: 'a plain native button',
        tag: 'button',
        expected: { disabled: undefined, ariaDisabled: undefined, ariaBusy: undefined, tabindex: undefined },
      },
      {
        label: 'a disabled native button',
        tag: 'button',
        disabled: true,
        // The platform removes it from the tab order, so no `tabindex` is written.
        expected: { disabled: '', ariaDisabled: undefined, ariaBusy: undefined, tabindex: undefined },
      },
      {
        label: 'a loading native button',
        tag: 'button',
        loading: true,
        expected: { disabled: undefined, ariaDisabled: undefined, ariaBusy: 'true', tabindex: undefined },
      },
      {
        label: 'a disabled and loading native button',
        tag: 'button',
        disabled: true,
        loading: true,
        expected: { disabled: '', ariaDisabled: undefined, ariaBusy: 'true', tabindex: undefined },
      },
      {
        label: 'a plain anchor',
        tag: 'a',
        expected: { disabled: undefined, ariaDisabled: undefined, ariaBusy: undefined, tabindex: undefined },
      },
      {
        label: 'a disabled anchor',
        tag: 'a',
        disabled: true,
        expected: { disabled: undefined, ariaDisabled: 'true', ariaBusy: undefined, tabindex: '-1' },
      },
      {
        label: 'a loading anchor',
        tag: 'a',
        loading: true,
        // The regression: loading is "busy, still focusable", on every tag. It is not
        // disabled — it is still reachable by Tab, still has its name, and the handler is
        // what refuses the activation.
        expected: { disabled: undefined, ariaDisabled: undefined, ariaBusy: 'true', tabindex: undefined },
      },
      {
        label: 'a disabled and loading anchor',
        tag: 'a',
        disabled: true,
        loading: true,
        expected: { disabled: undefined, ariaDisabled: 'true', ariaBusy: 'true', tabindex: '-1' },
      },
    ]

    it.each(CASES)('$label exposes exactly the documented attributes', ({ tag, disabled, loading, expected }) => {
      const wrapper = mountButton({ props: { tag, disabled, loading } })
      expect({
        disabled: wrapper.attributes('disabled'),
        ariaDisabled: wrapper.attributes('aria-disabled'),
        ariaBusy: wrapper.attributes('aria-busy'),
        tabindex: wrapper.attributes('tabindex'),
      }).toEqual(expected)
    })

    // Only the non-native rows: a native `<button>` is taken out of the tab order by the
    // platform, so `tabindex` is never written (asserted in the matrix above).
    it.each(CASES.filter((entry) => entry.loading && entry.tag !== 'button'))(
      '$label keeps its focus behaviour: only `disabled` leaves the tab order',
      ({ tag, disabled, loading }) => {
        const wrapper = mountButton({ props: { tag, disabled, loading } })
        if (disabled) {
          expect(wrapper.attributes('tabindex')).toBe('-1')
        } else {
          expect(wrapper.attributes('tabindex')).toBeUndefined()
        }
      },
    )

    it('applies the same contract to a custom component tag', () => {
      const CustomTag = markRaw(
        defineComponent({
          name: 'ContractTag',
          setup(_props, { slots }) {
            return () => h('span', { class: 'custom-tag' }, slots.default?.())
          },
        }),
      )
      const loading = mountButton({ props: { tag: CustomTag, loading: true } }).find('.custom-tag')
      expect(loading.attributes('aria-busy')).toBe('true')
      expect(loading.attributes('aria-disabled')).toBeUndefined()
      expect(loading.attributes('tabindex')).toBeUndefined()

      const disabled = mountButton({ props: { tag: CustomTag, disabled: true } }).find('.custom-tag')
      expect(disabled.attributes('aria-disabled')).toBe('true')
      expect(disabled.attributes('tabindex')).toBe('-1')
    })

    it('still refuses activation while loading on a non-native tag', async () => {
      // The other half of "loading keeps its tab order": the element stays reachable, so the
      // handler is what has to refuse the activation — including the anchor's default
      // navigation, which a keyboard Enter would otherwise trigger.
      const wrapper = mountButton({
        props: { tag: 'a', loading: true },
        attrs: { href: '/pricing' },
      })
      const event = new MouseEvent('click', { bubbles: true, cancelable: true })
      wrapper.element.dispatchEvent(event)

      expect(wrapper.attributes('href')).toBe('/pricing')
      expect(wrapper.emitted('click')).toBeUndefined()
      expect(event.defaultPrevented).toBe(true)
    })
  })

  describe('loading', () => {
    it('sets aria-busy', () => {
      expect(mountButton({ props: { loading: true } }).attributes('aria-busy')).toBe('true')
    })

    it('adds the is-loading state class and shows the default spinner in the loader layer', () => {
      const wrapper = mountButton({ props: { loading: true } })
      expect(wrapper.classes()).toContain('is-loading')
      expect(wrapper.find('.yue-button__loader .yue-button__spinner').exists()).toBe(true)
    })

    it('does not emit click', async () => {
      const wrapper = mountButton({ props: { loading: true } })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toBeUndefined()
    })

    it('keeps the label and both icons in place instead of replacing them', () => {
      // The regression this pins: the loader used to take the `leading` slot's place and
      // hide `trailing`, which resized the button in the middle of the request and made
      // "loading" a layout event. The content now stays where it is; the stylesheet only
      // paints it invisible.
      const wrapper = mountButton({
        props: { loading: true },
        slots: { default: '保存', leading: '<i class="icon" />', trailing: '<i class="caret" />' },
      })
      expect(wrapper.find('.yue-button__loader').exists()).toBe(true)
      expect(wrapper.find('.yue-button__label').text()).toBe('保存')
      expect(wrapper.find('.yue-button__icon--leading').exists()).toBe(true)
      expect(wrapper.find('.yue-button__icon--trailing').exists()).toBe(true)
      expect(wrapper.find('.is-loading > .yue-button__label').exists()).toBe(true)
    })

    it('does not render a loader layer when it is not loading', () => {
      const wrapper = mountButton()
      expect(wrapper.find('.yue-button__loader').exists()).toBe(false)
      expect(wrapper.find('.yue-button__spinner').exists()).toBe(false)
    })

    it('does not set the native disabled attribute', () => {
      // `disabled` is the platform's attribute; `loading` blocks activation in
      // the handler instead, so a mid-request button keeps focus and stays in the
      // tab order rather than being yanked out from under the user.
      expect(mountButton({ props: { loading: true } }).attributes('disabled')).toBeUndefined()
    })
  })

  describe('the loader slot', () => {
    it('replaces the default spinner', () => {
      const wrapper = mountButton({
        props: { loading: true },
        slots: { loader: '<i class="my-loader" />' },
      })
      const loader = wrapper.find('.yue-button__loader')
      expect(loader.exists()).toBe(true)
      expect(loader.find('.my-loader').exists()).toBe(true)
      expect(loader.find('.yue-button__spinner').exists()).toBe(false)
    })

    it('is not rendered when the button is not loading', () => {
      const wrapper = mountButton({ slots: { loader: '<i class="my-loader" />' } })
      expect(wrapper.find('.my-loader').exists()).toBe(false)
    })

    it('keeps the loader inside the button the consumer is describing', () => {
      // The slot must not imply an icon library or a second root: it renders in the same
      // absolutely positioned layer as the default spinner, so it cannot affect the
      // button's width either.
      const wrapper = mountButton({ props: { loading: true }, slots: { loader: '<b>…</b>' } })
      expect(wrapper.find('.yue-button__loader > b').exists()).toBe(true)
    })
  })

  describe('click', () => {
    it('emits the native MouseEvent when active', async () => {
      const wrapper = mountButton()
      await wrapper.trigger('click')
      const events = wrapper.emitted('click')
      expect(events).toHaveLength(1)
      expect(events?.[0]?.[0]).toBeInstanceOf(MouseEvent)
    })

    it('calls the consumer listener when active', async () => {
      const onClick = vi.fn()
      await mountButton({ attrs: { onClick } }).trigger('click')
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('does not call the consumer listener while loading', async () => {
      const onClick = vi.fn()
      await mountButton({ props: { loading: true }, attrs: { onClick } }).trigger('click')
      expect(onClick).not.toHaveBeenCalled()
    })

    it('does not call the consumer listener while disabled', async () => {
      const onClick = vi.fn()
      await mountButton({ props: { disabled: true }, attrs: { onClick } }).trigger('click')
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('nativeType', () => {
    it('defaults to type="button"', () => {
      expect(mountButton().attributes('type')).toBe('button')
    })

    it('forwards a custom native type', () => {
      expect(mountButton({ props: { nativeType: 'submit' } }).attributes('type')).toBe('submit')
    })

    it('is never applied off a native <button>', () => {
      expect(
        mountButton({ props: { tag: 'a', nativeType: 'submit' } }).attributes('type'),
      ).toBeUndefined()
    })
  })

  describe('slots', () => {
    it('renders leading content inside .yue-button__icon', () => {
      const leading = mountButton({ slots: { leading: '<i class="lead" />' } }).find(
        '.yue-button__icon--leading',
      )
      expect(leading.exists()).toBe(true)
      expect(leading.find('.lead').exists()).toBe(true)
    })

    it('renders trailing content inside .yue-button__icon', () => {
      const trailing = mountButton({ slots: { trailing: '<i class="caret" />' } }).find(
        '.yue-button__icon--trailing',
      )
      expect(trailing.exists()).toBe(true)
      expect(trailing.find('.caret').exists()).toBe(true)
    })

    it('omits the icon wrappers entirely when the slots are unused', () => {
      expect(mountButton().find('.yue-button__icon').exists()).toBe(false)
    })
  })

  describe('block', () => {
    it('adds the is-block state class', () => {
      expect(mountButton({ props: { block: true } }).classes()).toContain('is-block')
    })

    it('is absent by default', () => {
      expect(mountButton().classes()).not.toContain('is-block')
    })
  })

  describe('tag="a"', () => {
    it('renders an anchor and keeps the block classes', () => {
      const wrapper = mountButton({ props: { tag: 'a' } })
      expect(wrapper.element.tagName).toBe('A')
      expect(wrapper.classes()).toContain('yue-button')
    })

    it('uses aria-disabled instead of the native attribute', () => {
      const wrapper = mountButton({ props: { tag: 'a', disabled: true } })
      expect(wrapper.attributes('disabled')).toBeUndefined()
      expect(wrapper.attributes('aria-disabled')).toBe('true')
    })

    it('leaves the tab order while disabled', () => {
      expect(mountButton({ props: { tag: 'a', disabled: true } }).attributes('tabindex')).toBe('-1')
    })

    it('does not emit click while disabled', async () => {
      const wrapper = mountButton({ props: { tag: 'a', disabled: true } })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toBeUndefined()
    })

    it('emits click when active', async () => {
      const wrapper = mountButton({ props: { tag: 'a' } })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toHaveLength(1)
    })
  })

  describe('tag as a custom component', () => {
    // `markRaw` is Vue's documented remedy for a component definition held in a
    // reactive slot (here, the props object) — without it Vue warns about the
    // unnecessary reactive wrapper. Callers holding a component in reactive state
    // need the same, which is why `YueButtonTag` documents it.
    const CustomTag = markRaw(
      defineComponent({
        name: 'CustomTag',
        setup(_props, { slots }) {
          return () => h('span', { class: 'custom-tag' }, slots.default?.())
        },
      }),
    )

    it('renders through the component and marks it aria-disabled', () => {
      const custom = mountButton({ props: { tag: CustomTag, disabled: true } }).find('.custom-tag')
      expect(custom.exists()).toBe(true)
      expect(custom.attributes('aria-disabled')).toBe('true')
    })

    it('renders through the component when active', () => {
      const custom = mountButton({ props: { tag: CustomTag } }).find('.custom-tag')
      expect(custom.exists()).toBe(true)
      expect(custom.attributes('aria-disabled')).toBeUndefined()
      expect(custom.text()).toBe('确定')
    })
  })

  describe('attribute forwarding', () => {
    it('merges consumer class and style with the block classes', () => {
      const wrapper = mountButton({ attrs: { class: 'mine', style: 'margin: 4px' } })
      expect(wrapper.classes()).toContain('mine')
      expect(wrapper.classes()).toContain('yue-button')
      expect(wrapper.attributes('style')).toContain('margin')
    })

    it('forwards plain attributes', () => {
      expect(mountButton({ attrs: { id: 'save' } }).attributes('id')).toBe('save')
    })

    it('cannot be tricked out of aria-busy while loading', () => {
      // `inheritAttrs: false` is what makes this deterministic: the component's
      // own bindings always win over a forwarded attribute.
      const wrapper = mountButton({ props: { loading: true }, attrs: { 'aria-busy': 'false' } })
      expect(wrapper.attributes('aria-busy')).toBe('true')
    })
  })

  describe('circle accessibility', () => {
    it('warns when an icon-only button has no accessible name', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mount(YueButton, { props: { shape: 'circle' }, slots: { leading: '<i class="icon" />' } })
      await nextTick()
      await nextTick()

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible'))
    })

    it('stays quiet when an aria-label is supplied', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mount(YueButton, {
        props: { shape: 'circle' },
        attrs: { 'aria-label': '设置' },
        slots: { leading: '<i class="icon" />' },
      })
      await nextTick()
      await nextTick()

      expect(warn).not.toHaveBeenCalled()
    })

    it('stays quiet when the button has a visible label', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mountButton({ props: { shape: 'circle' } })
      await nextTick()
      await nextTick()

      expect(warn).not.toHaveBeenCalled()
    })
  })

  describe('design contracts', () => {
    it('keeps icon content inheriting the button color', () => {
      expect(STYLESHEET).toContain('.yue-button__icon > svg')
      expect(STYLESHEET).toContain('width: 100%')
      expect(STYLESHEET).toContain('height: 100%')
    })

    it('provides a static loading cue when reduced motion is requested', () => {
      expect(STYLESHEET).toContain('@media (prefers-reduced-motion: reduce)')
      expect(STYLESHEET).toContain('animation: none')
      expect(STYLESHEET).toContain('border-top-color: currentColor')
    })

    it('keeps a visible focus contract and forced-colors fallback', () => {
      expect(STYLESHEET).toContain('.yue-button:focus-visible')
      expect(STYLESHEET).toContain('@media (forced-colors: active)')
      expect(STYLESHEET).toContain('border-color: ButtonBorder')
    })

    it('takes the loader out of the layout so loading cannot resize the button', () => {
      const loader = /\.yue-button__loader \{[^}]*\}/.exec(STYLESHEET)?.[0] ?? ''
      expect(loader).not.toBe('')
      expect(loader).toContain('position: absolute')
      expect(loader).toContain('inset: 0')
      expect(loader).toContain('justify-content: center')
    })

    it('hides the loading content without deleting it from the accessibility tree', () => {
      // `opacity: 0` keeps the label and its text in the accessibility tree, so a button
      // that stays focusable while it works still has a name. `display: none`,
      // `visibility: hidden` and an unrendered `v-if` would all break that, and the first
      // two would also change the button's width mid-request.
      expect(STYLESHEET).toMatch(/\.yue-button\.is-loading > \.yue-button__label,/)
      expect(STYLESHEET).toMatch(/\.yue-button\.is-loading > \.yue-button__icon \{[^}]*opacity: 0/)
      expect(STYLESHEET).not.toMatch(
        /\.yue-button\.is-loading[^{]*\{[^}]*(display: none|visibility: hidden)/,
      )
    })

    it('paints the selected state from the migrated selected tokens', () => {
      for (const token of [
        '--button-selected-background',
        '--button-selected-color',
        '--button-selected-border-color',
        '--button-selected-background-hover',
        '--button-selected-background-pressed',
      ]) {
        expect(STYLESHEET).toContain(`var(${token})`)
      }
    })
  })

  /**
   * The styling contract, asserted against the real stylesheet.
   *
   * A component whose class names and stylesheet disagree renders markup that no
   * rule matches — and nothing else in the suite notices, because the classes look
   * right and the CSS looks right in isolation. That is exactly how a configurable
   * namespace was able to ship: the DOM produced `.app-button` while the stylesheet
   * only knew `.yue-button`.
   */
  describe('the emitted classes and the stylesheet agree', () => {
    /** Every class the component can emit, per its documented API. */
    const EMITTED = [
      'yue-button',
      'yue-button__label',
      'yue-button__icon',
      'yue-button__loader',
      'yue-button__spinner',
      'yue-button--default',
      'yue-button--primary',
      'yue-button--success',
      'yue-button--warning',
      'yue-button--danger',
      'yue-button--solid',
      'yue-button--outline',
      'yue-button--dashed',
      'yue-button--text',
      'yue-button--link',
      'yue-button--sm',
      'yue-button--md',
      'yue-button--lg',
      'yue-button--square',
      'yue-button--round',
      'yue-button--circle',
    ]

    /** The state markers the button can carry. Shared, unprefixed, and styled through the block. */
    const STATES = ['is-active', 'is-block', 'is-disabled', 'is-loading']

    /**
     * Classes that intentionally have no rule of their own: the base block already
     * carries the default theme, size and shape, so a redundant modifier rule would
     * write the same values twice.
     *
     * They are listed rather than skipped, so the exemption is asserted: a *new*
     * class that nothing styles fails the test below instead of blending in.
     */
    const BASE_DEFAULTS = ['yue-button--default', 'yue-button--md', 'yue-button--square']

    it('styles every emitted class, except the documented base defaults', () => {
      const unstyled = EMITTED.filter(
        (className) =>
          !BASE_DEFAULTS.includes(className) && !STYLESHEET.includes(`.${className}`),
      )
      expect(unstyled).toEqual([])
    })

    it('the base block really carries those defaults', () => {
      // The exemption above is only honest if the base block holds the default
      // values. Matching against a non-empty block is also what stops a namespace
      // change from emptying the sheet and making the check vacuous.
      const base = /\.yue-button \{[^}]*\}/.exec(STYLESHEET)?.[0] ?? ''
      expect(base).not.toBe('')
      expect(base).toContain('--_fill: var(--button-default-background)')
      expect(base).toContain('--_height: var(--button-height-md)')
      expect(base).toContain('--_radius: var(--button-border-radius)')
      expect(base).toContain('border-radius: var(--_radius)')
    })

    it('uses exactly one namespace, on both sides', () => {
      const inStylesheet = new Set(
        [...STYLESHEET.matchAll(/\.([a-z][a-z0-9]*)-button/g)].map((match) => match[1]),
      )
      const emitted = new Set(
        mountButton()
          .classes()
          .map((name) => /^([a-z][a-z0-9]*)-button/.exec(name)?.[1])
          .filter((namespace) => namespace !== undefined),
      )

      expect([...inStylesheet]).toEqual(['yue'])
      expect([...emitted]).toEqual(['yue'])
      expect(inStylesheet).toEqual(emitted)
    })

    it('emits only classes from the pinned roster', () => {
      // Adding a class to the component means adding it here, which means deciding
      // whether the stylesheet should rule it.
      const emitted = mountButton({
        props: {
          theme: 'danger',
          variant: 'text',
          size: 'lg',
          shape: 'round',
          block: true,
          active: true,
        },
      }).classes()

      for (const className of emitted) {
        if (className.startsWith('is-')) {
          expect(STATES, `${className} is not in the pinned state roster`).toContain(className)
          continue
        }
        expect(EMITTED, `${className} is not in the pinned roster`).toContain(className)
      }
    })

    /**
     * Interaction rules that are easy to lose in a rewrite and invisible to a
     * class-name assertion.
     */
    it('keeps the base interaction contract', () => {
      const base = /\.yue-button \{[^}]*\}/.exec(STYLESHEET)?.[0] ?? ''
      expect(base).not.toBe('')
      // Touch: removes the double-tap-zoom delay without disabling pinch zoom.
      expect(base).toContain('touch-action: manipulation')
      // Inline flow: a button inside a sentence or a table cell sits on the baseline.
      expect(base).toContain('vertical-align: middle')
      // Positioning context for in-button layers.
      expect(base).toContain('position: relative')
      // Deliberately NOT copied from the reference implementation, which pairs it
      // with a ripple effect Yue does not have.
      expect(base).not.toContain('overflow: hidden')
      // The transition stays narrow: `all` would animate layout properties too.
      expect(base).toMatch(/transition:\s*background-color/)
      expect(base).not.toMatch(/transition:\s*all/)
      // The focus ring must never be removed to imitate a reset.
      expect(STYLESHEET).not.toMatch(/outline:\s*none/)
    })

    it('shares one colour state between hover and focus-visible', () => {
      // A keyboard user has to see the same cue a pointer user does. The ring is a
      // separate declaration and is not replaced by the fill.
      const interactiveStates = [
        ...['solid', 'outline', 'dashed', 'text', 'link'].map(
          (variant) => `\\.yue-button--${variant}`,
        ),
        '\\.yue-button\\.is-active',
      ]
      for (const state of interactiveStates) {
        expect(STYLESHEET, `${state} has no hover rule`).toMatch(new RegExp(`${state}:hover`))
        expect(
          STYLESHEET,
          `${state} does not react to focus-visible`,
        ).toMatch(new RegExp(`${state}(:hover)?[^{]*:focus-visible`))
      }
      expect(STYLESHEET).toMatch(/\.yue-button:focus-visible \{/)
    })

    it('keeps every interaction state off disabled and loading buttons', () => {
      // A disabled button has no hover, and a loading one has no pressed state. This reads
      // real rule blocks rather than matching selector text, so it covers the standalone
      // modifiers *and* the `.is-active` state block that a `--`-prefixed pattern misses.
      const rules = [...STYLESHEET.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
        selector: match[1].trim(),
        body: match[2],
      }))
      const stateful = rules.filter(
        (rule) =>
          rule.selector.includes('.yue-button') &&
          /:(hover|active)\b/.test(rule.selector) &&
          !rule.selector.startsWith('@'),
      )
      expect(stateful.length).toBeGreaterThan(5)
      for (const rule of stateful) {
        expect(rule.selector, `${rule.selector} is not guarded`).toContain('.is-disabled')
        expect(rule.selector, `${rule.selector} is not guarded`).toContain('.is-loading')
      }
    })

    it('separates the quiet `text` box from the inline `link`', () => {
      const textRule = /\.yue-button--text \{[^}]*\}/.exec(STYLESHEET)?.[0] ?? ''
      const linkRule = /\.yue-button--link \{[^}]*\}/.exec(STYLESHEET)?.[0] ?? ''
      expect(textRule).not.toBe('')
      expect(linkRule).not.toBe('')

      // `text` keeps the control box, so its hit area matches every other variant.
      expect(textRule).not.toMatch(/height:\s*auto/)
      expect(textRule).not.toContain('padding-inline')
      // `link` drops it on purpose.
      expect(linkRule).toContain('height: auto')
      expect(linkRule).toContain('--button-padding-inline-flush')
    })

    it('builds `outline` and `dashed` from one rule set', () => {
      // They differ only in border style, so they must not be able to drift.
      expect(STYLESHEET).toMatch(/\.yue-button--outline,\s*\.yue-button--dashed \{/)
      // `.yue-button--dashed {` also appears as the second selector of that shared
      // list, so pick the block that actually carries the difference.
      const dashedBlocks = [...STYLESHEET.matchAll(/\.yue-button--dashed \{[^}]*\}/g)].map(
        (match) => match[0],
      )
      expect(
        dashedBlocks.some((block) => block.includes('border-style: var(--button-dashed-border-style)')),
        'no .yue-button--dashed block sets border-style from the token',
      ).toBe(true)
    })
  })
})
