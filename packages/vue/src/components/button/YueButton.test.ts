import { mount } from '@vue/test-utils'
import type { MountingOptions } from '@vue/test-utils'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, markRaw, nextTick } from 'vue'
import { YUE_NAMESPACE, yueConfigKey } from '@yue-ui/hooks'
import type { ComponentSize } from '@yue-ui/hooks'
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

/**
 * Compile-time proof that the locally declared size union has not drifted from
 * the hooks layer's `ComponentSize`.
 *
 * `YueButtonSize` is deliberately declared in `types.ts` rather than re-exported,
 * so that the shipped declarations do not reference a package the consumer has not
 * installed. That duplication is only safe if it is checked — if the hooks layer
 * ever gains a fourth size, this annotation becomes `never` and the file stops
 * compiling.
 */
const sizeParity: [YueButtonSize] extends [ComponentSize]
  ? [ComponentSize] extends [YueButtonSize]
    ? true
    : never
  : never = true

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
  describe('the local size union', () => {
    it('still matches the hooks layer contract', () => {
      // `sizeParity` is the type-level assertion; this keeps it referenced so
      // `noUnusedLocals` stays on for the rest of the file.
      expect(sizeParity).toBe(true)
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
      // A native <button> is disabled by the platform; adding aria-disabled as
      // well would double-announce the state.
      expect(mountButton({ props: { disabled: true } }).attributes('aria-disabled')).toBeUndefined()
    })
  })

  describe('loading', () => {
    it('sets aria-busy', () => {
      expect(mountButton({ props: { loading: true } }).attributes('aria-busy')).toBe('true')
    })

    it('adds the is-loading state class and shows a spinner', () => {
      const wrapper = mountButton({ props: { loading: true } })
      expect(wrapper.classes()).toContain('is-loading')
      expect(wrapper.find('.yue-button__spinner').exists()).toBe(true)
    })

    it('does not emit click', async () => {
      const wrapper = mountButton({ props: { loading: true } })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toBeUndefined()
    })

    it('replaces the leading slot with the spinner and hides trailing', () => {
      const wrapper = mountButton({
        props: { loading: true },
        slots: { default: '保存', leading: '<i class="icon" />', trailing: '<i class="caret" />' },
      })
      expect(wrapper.find('.yue-button__spinner').exists()).toBe(true)
      expect(wrapper.find('.yue-button__icon--leading').exists()).toBe(false)
      expect(wrapper.find('.yue-button__icon--trailing').exists()).toBe(false)
    })

    it('does not set the native disabled attribute', () => {
      // `disabled` is the platform's attribute; `loading` blocks activation in
      // the handler instead, so a mid-request button keeps focus and stays in the
      // tab order rather than being yanked out from under the user.
      expect(mountButton({ props: { loading: true } }).attributes('disabled')).toBeUndefined()
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
      const stylesheet = readStylesheet()
      expect(stylesheet).toContain('.yue-button__icon > svg')
      expect(stylesheet).toContain('width: 100%')
      expect(stylesheet).toContain('height: 100%')
    })

    it('provides a static loading cue when reduced motion is requested', () => {
      const stylesheet = readStylesheet()
      expect(stylesheet).toContain('@media (prefers-reduced-motion: reduce)')
      expect(stylesheet).toContain('animation: none')
      expect(stylesheet).toContain('border-top-color: currentColor')
    })

    it('keeps a visible focus contract and forced-colors fallback', () => {
      const stylesheet = readStylesheet()
      expect(stylesheet).toContain('.yue-button:focus-visible')
      expect(stylesheet).toContain('@media (forced-colors: active)')
      expect(stylesheet).toContain('border-color: ButtonBorder')
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
    const STYLESHEET = readStylesheet()

    /** Every class the component can emit, per its documented API. */
    const EMITTED = [
      'yue-button',
      'yue-button__label',
      'yue-button__icon',
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
      expect(base).toContain('border-radius: var(--button-border-radius)')
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
        props: { theme: 'danger', variant: 'text', size: 'lg', shape: 'round', block: true },
      }).classes()

      for (const className of emitted) {
        if (className.startsWith('is-')) {
          // State markers are shared, unprefixed, and styled through the block.
          expect(['is-block', 'is-disabled', 'is-loading']).toContain(className)
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
      for (const variant of ['solid', 'outline', 'dashed', 'text', 'link']) {
        const hover = new RegExp(`\\.yue-button--${variant}:hover`)
        expect(STYLESHEET, `${variant} has no hover rule`).toMatch(hover)
        expect(STYLESHEET, `${variant} does not react to focus-visible`).toMatch(
          new RegExp(`\\.yue-button--${variant}(:hover)?[^{]*:focus-visible`),
        )
      }
      expect(STYLESHEET).toMatch(/\.yue-button:focus-visible \{/)
    })

    it('keeps every interaction state off disabled and loading buttons', () => {
      // A disabled button has no hover, and a loading one has no pressed state.
      for (const rule of STYLESHEET.matchAll(/\.yue-button--[a-z]+:[a-z-]+[^{]*\{/g)) {
        expect(rule[0], `${rule[0]} is not guarded`).toContain('.is-disabled')
        expect(rule[0], `${rule[0]} is not guarded`).toContain('.is-loading')
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
