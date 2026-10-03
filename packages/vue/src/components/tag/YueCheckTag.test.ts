import { mount } from '@vue/test-utils'
import type { MountingOptions } from '@vue/test-utils'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { yueConfigKey } from '@yue-ui/hooks'
import type { YueCheckTagProps, YueTagSize } from './types'
import YueCheckTag from './YueCheckTag.vue'

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

interface MountCheckTagOptions {
  props?: YueCheckTagProps
  attrs?: Record<string, unknown>
  slots?: Record<string, string>
  global?: MountingOptions<YueCheckTagProps>['global']
}

function mountCheckTag(options: MountCheckTagOptions = {}) {
  return mount(YueCheckTag, {
    ...options,
    slots: { default: '选项', ...options.slots },
  })
}

function withConfig(size: YueTagSize) {
  return { provide: { [yueConfigKey]: { size } } }
}

describe('YueCheckTag', () => {
  describe('default rendering', () => {
    it('renders a <span> with role="checkbox"', () => {
      const wrapper = mountCheckTag()
      expect(wrapper.element.tagName).toBe('SPAN')
      expect(wrapper.attributes('role')).toBe('checkbox')
    })

    it('has the documented class set', () => {
      const wrapper = mountCheckTag()
      expect(wrapper.classes()).toContain('yue-tag')
      expect(wrapper.classes()).toContain('yue-tag--check')
      expect(wrapper.classes()).toContain('yue-tag--md')
    })

    it('starts unchecked by default', () => {
      const wrapper = mountCheckTag()
      expect(wrapper.attributes('aria-checked')).toBe('false')
    })

    it('is in the tab order by default', () => {
      const wrapper = mountCheckTag()
      expect(wrapper.attributes('tabindex')).toBe('0')
    })
  })

  describe('uncontrolled mode', () => {
    it('starts checked when defaultChecked is true', () => {
      const wrapper = mountCheckTag({ props: { defaultChecked: true } })
      expect(wrapper.attributes('aria-checked')).toBe('true')
    })

    it('toggles checked state on click', async () => {
      const wrapper = mountCheckTag()
      expect(wrapper.attributes('aria-checked')).toBe('false')
      await wrapper.trigger('click')
      expect(wrapper.attributes('aria-checked')).toBe('true')
      await wrapper.trigger('click')
      expect(wrapper.attributes('aria-checked')).toBe('false')
    })

    it('adds is-checked class when checked', async () => {
      const wrapper = mountCheckTag()
      await wrapper.trigger('click')
      expect(wrapper.classes()).toContain('is-checked')
    })

    it('emits update:modelValue on toggle', async () => {
      const wrapper = mountCheckTag()
      await wrapper.trigger('click')
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
    })

    it('emits change on toggle with checked value', async () => {
      const wrapper = mountCheckTag({ props: { value: 'vue' } })
      await wrapper.trigger('click')
      const changePayload = wrapper.emitted('change')?.[0]?.[0] as Record<string, unknown>
      expect(changePayload.checked).toBe(true)
      expect(changePayload.value).toBe('vue')
    })
  })

  describe('controlled mode', () => {
    it('respects modelValue for checked state', () => {
      const wrapper = mountCheckTag({ props: { modelValue: true } })
      expect(wrapper.attributes('aria-checked')).toBe('true')
    })

    it('does not update internal state when controlled', async () => {
      // In controlled mode, checking is reflected via modelValue, not internal state.
      // The component emits update:modelValue but does not update itself.
      const wrapper = mountCheckTag({ props: { modelValue: false } })
      await wrapper.trigger('click')
      // Still false because the parent has not updated modelValue
      expect(wrapper.attributes('aria-checked')).toBe('false')
    })

    it('reflects parent modelValue update', async () => {
      const wrapper = mountCheckTag({ props: { modelValue: false } })
      await wrapper.setProps({ modelValue: true })
      expect(wrapper.attributes('aria-checked')).toBe('true')
    })

    it('emits update:modelValue with new value', async () => {
      const wrapper = mountCheckTag({ props: { modelValue: false } })
      await wrapper.trigger('click')
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
    })
  })

  describe('keyboard interaction', () => {
    it('toggles on Space key', async () => {
      const wrapper = mountCheckTag()
      await wrapper.trigger('keydown', { key: ' ' })
      expect(wrapper.attributes('aria-checked')).toBe('true')
    })

    it('toggles on Enter key', async () => {
      const wrapper = mountCheckTag()
      await wrapper.trigger('keydown', { key: 'Enter' })
      expect(wrapper.attributes('aria-checked')).toBe('true')
    })

    it('does not toggle on other keys', async () => {
      const wrapper = mountCheckTag()
      await wrapper.trigger('keydown', { key: 'Tab' })
      expect(wrapper.attributes('aria-checked')).toBe('false')
    })
  })

  describe('disabled', () => {
    it('adds the is-disabled class', () => {
      expect(mountCheckTag({ props: { disabled: true } }).classes()).toContain('is-disabled')
    })

    it('outputs aria-disabled="true"', () => {
      expect(mountCheckTag({ props: { disabled: true } }).attributes('aria-disabled')).toBe('true')
    })

    it('sets tabindex="-1" when disabled', () => {
      expect(mountCheckTag({ props: { disabled: true } }).attributes('tabindex')).toBe('-1')
    })

    it('does not toggle on click when disabled', async () => {
      const wrapper = mountCheckTag({ props: { disabled: true } })
      await wrapper.trigger('click')
      expect(wrapper.attributes('aria-checked')).toBe('false')
    })

    it('does not toggle on Space when disabled', async () => {
      const wrapper = mountCheckTag({ props: { disabled: true } })
      await wrapper.trigger('keydown', { key: ' ' })
      expect(wrapper.attributes('aria-checked')).toBe('false')
    })

    it('does not emit click when disabled', async () => {
      const wrapper = mountCheckTag({ props: { disabled: true } })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toBeUndefined()
    })
  })

  describe('size', () => {
    it.each(['sm', 'md', 'lg'] as const)('applies the %s size class', (size) => {
      expect(mountCheckTag({ props: { size } }).classes()).toContain(`yue-tag--${size}`)
    })

    it('falls back to the injected YueConfig size', () => {
      const wrapper = mountCheckTag({ global: withConfig('lg') })
      expect(wrapper.classes()).toContain('yue-tag--lg')
    })
  })

  describe('click event', () => {
    it('emits click when not disabled', async () => {
      const wrapper = mountCheckTag()
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toHaveLength(1)
    })
  })

  describe('attr forwarding', () => {
    it('forwards data-* attributes to the root element', () => {
      const wrapper = mountCheckTag({ attrs: { 'data-testid': 'check-tag' } })
      expect(wrapper.attributes('data-testid')).toBe('check-tag')
    })

    it('merges extra class with component class', () => {
      const wrapper = mountCheckTag({ attrs: { class: 'my-filter-tag' } })
      expect(wrapper.classes()).toContain('yue-tag--check')
      expect(wrapper.classes()).toContain('my-filter-tag')
    })
  })

  describe('stylesheet', () => {
    it('defines the check modifier class', () => {
      expect(STYLESHEET).toContain('.yue-tag--check')
    })

    it('defines the is-checked state', () => {
      expect(STYLESHEET).toContain('.is-checked')
    })
  })
})
