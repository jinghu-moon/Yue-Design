import { mount } from '@vue/test-utils'
import type { MountingOptions } from '@vue/test-utils'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { yueConfigKey } from '@yue-ui/hooks'
import type { YueTagProps, YueTagSize } from './types'
import YueTag from './YueTag.vue'

function readStylesheet(): string {
  for (const candidate of [
    resolve(process.cwd(), 'packages/vue/src/components/tag/style.css'),
    resolve(process.cwd(), 'src/components/tag/style.css'),
  ]) {
    if (existsSync(candidate)) return readFileSync(candidate, 'utf8')
  }
  throw new Error(`could not locate the Tag stylesheet from ${process.cwd()}`)
}

const STYLESHEET = readStylesheet()

interface MountTagOptions {
  props?: YueTagProps
  attrs?: Record<string, unknown>
  slots?: Record<string, string>
  global?: MountingOptions<YueTagProps>['global']
}

function mountTag(options: MountTagOptions = {}) {
  return mount(YueTag, {
    ...options,
    slots: { default: '标签', ...options.slots },
  })
}

function withConfig(size: YueTagSize) {
  return { provide: { [yueConfigKey]: { size } } }
}

describe('YueTag', () => {
  describe('default rendering', () => {
    it('renders a <span> with the documented class set', () => {
      const wrapper = mountTag()
      expect(wrapper.element.tagName).toBe('SPAN')
      expect(wrapper.classes()).toContain('yue-tag')
      expect(wrapper.classes()).toContain('yue-tag--default')
      expect(wrapper.classes()).toContain('yue-tag--filled')
      expect(wrapper.classes()).toContain('yue-tag--md')
      expect(wrapper.classes()).toContain('yue-tag--square')
    })

    it('renders the label through the default slot', () => {
      const wrapper = mountTag({ slots: { default: '自定义文字' } })
      expect(wrapper.text()).toContain('自定义文字')
    })

    it('does not render a close button by default', () => {
      const wrapper = mountTag()
      expect(wrapper.find('.yue-tag__close').exists()).toBe(false)
    })

    it('does not render an icon slot wrapper by default', () => {
      const wrapper = mountTag()
      expect(wrapper.find('.yue-tag__icon').exists()).toBe(false)
    })
  })

  describe('theme', () => {
    it.each(['default', 'primary', 'success', 'warning', 'danger'] as const)(
      'applies the %s theme class',
      (theme) => {
        expect(mountTag({ props: { theme } }).classes()).toContain(`yue-tag--${theme}`)
      },
    )
  })

  describe('variant', () => {
    it.each(['filled', 'tint', 'outline', 'tint-outline'] as const)(
      'applies the %s variant class',
      (variant) => {
        expect(mountTag({ props: { variant } }).classes()).toContain(`yue-tag--${variant}`)
      },
    )
  })

  describe('size', () => {
    it.each(['sm', 'md', 'lg'] as const)('applies the %s size class', (size) => {
      expect(mountTag({ props: { size } }).classes()).toContain(`yue-tag--${size}`)
    })

    it('falls back to the injected YueConfig size', () => {
      const wrapper = mountTag({ global: withConfig('lg') })
      expect(wrapper.classes()).toContain('yue-tag--lg')
    })

    it('lets the size prop win over YueConfig', () => {
      const wrapper = mountTag({ props: { size: 'sm' }, global: withConfig('lg') })
      expect(wrapper.classes()).toContain('yue-tag--sm')
      expect(wrapper.classes()).not.toContain('yue-tag--lg')
    })
  })

  describe('shape', () => {
    it.each(['square', 'round'] as const)('applies the %s shape class', (shape) => {
      expect(mountTag({ props: { shape } }).classes()).toContain(`yue-tag--${shape}`)
    })
  })

  describe('disabled', () => {
    it('adds the is-disabled state class', () => {
      expect(mountTag({ props: { disabled: true } }).classes()).toContain('is-disabled')
    })

    it('outputs aria-disabled="true"', () => {
      expect(mountTag({ props: { disabled: true } }).attributes('aria-disabled')).toBe('true')
    })

    it('does not output aria-disabled when not disabled', () => {
      expect(mountTag().attributes('aria-disabled')).toBeUndefined()
    })

    it('does not emit click when disabled', async () => {
      const wrapper = mountTag({ props: { disabled: true } })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toBeUndefined()
    })

    it('hides the close button when disabled', () => {
      const wrapper = mountTag({ props: { disabled: true, closable: true } })
      expect(wrapper.find('.yue-tag__close').exists()).toBe(false)
    })
  })

  describe('closable', () => {
    it('renders the close button when closable is true', () => {
      const wrapper = mountTag({ props: { closable: true } })
      expect(wrapper.find('.yue-tag__close').exists()).toBe(true)
    })

    it('emits close when the close button is clicked', async () => {
      const wrapper = mountTag({ props: { closable: true } })
      await wrapper.find('.yue-tag__close').trigger('click')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('does not emit click when close button is clicked', async () => {
      const wrapper = mountTag({ props: { closable: true } })
      await wrapper.find('.yue-tag__close').trigger('click')
      expect(wrapper.emitted('click')).toBeUndefined()
    })
  })

  describe('click', () => {
    it('emits click on root element interaction', async () => {
      const wrapper = mountTag()
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toHaveLength(1)
    })
  })

  describe('tag prop', () => {
    it('renders the root as a <div> when tag="div"', () => {
      const wrapper = mountTag({ props: { tag: 'div' } })
      expect(wrapper.element.tagName).toBe('DIV')
    })

    it('renders the root as a <button> when tag="button"', () => {
      const wrapper = mountTag({ props: { tag: 'button' } })
      expect(wrapper.element.tagName).toBe('BUTTON')
    })
  })

  describe('icon slot', () => {
    it('renders the icon wrapper when the icon slot is provided', () => {
      const wrapper = mount(YueTag, {
        slots: { icon: '<svg aria-hidden="true" />', default: '图标标签' },
      })
      expect(wrapper.find('.yue-tag__icon').exists()).toBe(true)
    })
  })

  describe('maxWidth', () => {
    it('renders the label wrapper when maxWidth is set', () => {
      const wrapper = mountTag({ props: { maxWidth: 100 } })
      expect(wrapper.find('.yue-tag__label').exists()).toBe(true)
    })

    it('applies max-width style as px when given a number', () => {
      const wrapper = mountTag({ props: { maxWidth: 80 } })
      const label = wrapper.find('.yue-tag__label')
      expect(label.attributes('style')).toContain('max-width: 80px')
    })

    it('does not render the label wrapper when maxWidth is not set', () => {
      const wrapper = mountTag()
      expect(wrapper.find('.yue-tag__label').exists()).toBe(false)
    })
  })

  describe('attr forwarding', () => {
    it('forwards data-* attributes to the root element', () => {
      const wrapper = mountTag({ attrs: { 'data-testid': 'my-tag' } })
      expect(wrapper.attributes('data-testid')).toBe('my-tag')
    })

    it('merges extra class with component class', () => {
      const wrapper = mountTag({ attrs: { class: 'extra-class' } })
      expect(wrapper.classes()).toContain('yue-tag')
      expect(wrapper.classes()).toContain('extra-class')
    })
  })

  describe('stylesheet', () => {
    it('defines base .yue-tag rule', () => {
      expect(STYLESHEET).toContain('.yue-tag')
    })

    it('defines variant modifier classes', () => {
      expect(STYLESHEET).toContain('.yue-tag--tint')
      expect(STYLESHEET).toContain('.yue-tag--outline')
      expect(STYLESHEET).toContain('.yue-tag--tint-outline')
    })

    it('defines theme modifier classes', () => {
      expect(STYLESHEET).toContain('.yue-tag--primary')
      expect(STYLESHEET).toContain('.yue-tag--success')
      expect(STYLESHEET).toContain('.yue-tag--warning')
      expect(STYLESHEET).toContain('.yue-tag--danger')
    })

    it('defines size modifier classes', () => {
      expect(STYLESHEET).toContain('.yue-tag--sm')
      expect(STYLESHEET).toContain('.yue-tag--lg')
    })

    it('defines the is-disabled state', () => {
      expect(STYLESHEET).toContain('.is-disabled')
    })

    it('defines the close button', () => {
      expect(STYLESHEET).toContain('.yue-tag__close')
    })
  })
})
