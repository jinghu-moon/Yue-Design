import { mount } from '@vue/test-utils'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import YueButtonGroup from './YueButtonGroup.vue'
import YueButtonToggle from './YueButtonToggle.vue'
import YueButtonToggleItem from './YueButtonToggleItem.vue'

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

/** The three-item group almost every test below mounts. */
const VALUES = ['left', 'center', 'right'] as const

interface MountToggleOptions {
  /** The group's `modelValue`. */
  modelValue?: string | number | null
  props?: Record<string, unknown>
  attrs?: Record<string, unknown>
  /** Per-item props, by index. */
  items?: Array<Record<string, unknown>>
  /** Per-item slot content. Defaults to the upper-cased value. */
  labels?: string[]
}

/**
 * Mount a real group with real items, not a stub.
 *
 * The subject of this file is the contract *between* two components — a stubbed item would
 * assert that the stub is wired up, which is exactly the part that is not in question.
 */
function mountToggle(options: MountToggleOptions = {}) {
  const items = options.items ?? VALUES.map(() => ({}))
  return mount(YueButtonToggle, {
    props: { modelValue: 'center', ...options.props, ...('modelValue' in options ? { modelValue: options.modelValue } : {}) },
    // A group always needs an accessible name; the one test that wants the warning omits it.
    attrs: { 'aria-label': '对齐方式', ...options.attrs },
    slots: {
      default: () =>
        VALUES.map((value, index) =>
          h(
            YueButtonToggleItem,
            { value, ...items[index] },
            () => options.labels?.[index] ?? value,
          ),
        ),
    },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('YueButtonToggle', () => {
  describe('structure', () => {
    it('renders the shared group markup', () => {
      const wrapper = mountToggle()
      expect(wrapper.find('.yue-button-group').exists()).toBe(true)
      expect(wrapper.attributes('role')).toBe('group')
    })

    it('is a YueButtonGroup, not a copy of it', () => {
      // The group is the component that knows how to join corners; the toggle adds
      // selection. Rendering a second div with the group's class would be two
      // implementations of one contract.
      expect(mountToggle().findComponent(YueButtonGroup).exists()).toBe(true)
    })

    it('passes vertical through to the group', () => {
      expect(mountToggle({ props: { vertical: true } }).find('.yue-button-group--vertical').exists()).toBe(
        true,
      )
    })
  })

  describe('selection', () => {
    it('marks the item whose value is selected, and only that one', () => {
      const items = mountToggle().findAll('.yue-button')
      expect(items).toHaveLength(VALUES.length)
      expect(items.map((item) => item.attributes('aria-pressed'))).toEqual([
        'false',
        'true',
        'false',
      ])
      expect(items[1].classes()).toContain('is-active')
      expect(items[0].classes()).not.toContain('is-active')
    })

    it('reports every item as a toggle button, pressed or not', () => {
      // Unlike a standalone button, an item always answers "are you pressed?" — that is
      // what makes the set readable as a set.
      for (const item of mountToggle().findAll('.yue-button')) {
        expect(item.attributes('aria-pressed')).not.toBeUndefined()
      }
    })

    it('treats null as nothing selected', () => {
      const items = mountToggle({ modelValue: null }).findAll('.yue-button')
      expect(items.map((item) => item.attributes('aria-pressed'))).toEqual(['false', 'false', 'false'])
    })

    it('accepts numeric values', async () => {
      const wrapper = mount(YueButtonToggle, {
        props: { modelValue: 0 },
        attrs: { 'aria-label': '列数' },
        slots: {
          default: () => [
            h(YueButtonToggleItem, { value: 0 }, () => '0'),
            h(YueButtonToggleItem, { value: 1 }, () => '1'),
          ],
        },
      })
      expect(wrapper.findAll('.yue-button')[0].attributes('aria-pressed')).toBe('true')
      await wrapper.findAll('.yue-button')[1].trigger('click')
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1])
    })

    it('updates the DOM when the value changes from outside', async () => {
      const wrapper = mountToggle({ modelValue: 'left' })
      expect(wrapper.findAll('.yue-button')[0].attributes('aria-pressed')).toBe('true')

      await wrapper.setProps({ modelValue: 'right' })
      const items = wrapper.findAll('.yue-button')
      expect(items[0].attributes('aria-pressed')).toBe('false')
      expect(items[2].attributes('aria-pressed')).toBe('true')
      expect(items[2].classes()).toContain('is-active')
    })
  })

  describe('activation', () => {
    it('emits the value of the item that was activated', async () => {
      const wrapper = mountToggle()
      await wrapper.findAll('.yue-button')[2].trigger('click')
      expect(wrapper.emitted('update:modelValue')).toEqual([['right']])
    })

    it('does not emit for the item that is already selected', async () => {
      // Mandatory selection: the active item is the answer to "which one is active?", and
      // a segmented control with nothing active cannot answer it. A set of buttons that can
      // all be off is `<YueButtonGroup>` plus `active` on each button.
      const wrapper = mountToggle()
      await wrapper.findAll('.yue-button')[1].trigger('click')
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('works with v-model, without the consumer wiring selection by hand', async () => {
      const wrapper = mount({
        components: { YueButtonToggle, YueButtonToggleItem },
        data: () => ({ align: 'left' as string | null }),
        template: `
          <YueButtonToggle v-model="align" aria-label="对齐方式">
            <YueButtonToggleItem value="left">左</YueButtonToggleItem>
            <YueButtonToggleItem value="right">右</YueButtonToggleItem>
          </YueButtonToggle>`,
      })

      await wrapper.findAll('.yue-button')[1].trigger('click')
      await nextTick()
      expect(wrapper.vm.align).toBe('right')
      expect(wrapper.findAll('.yue-button')[1].attributes('aria-pressed')).toBe('true')
    })

    it('still fires a consumer click listener on the item', async () => {
      const onClick = vi.fn()
      const wrapper = mountToggle({ items: [{}, { onClick }, {}] })
      await wrapper.findAll('.yue-button')[1].trigger('click')
      expect(onClick).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
  })

  describe('disabled', () => {
    it('disables every item when the group is disabled', async () => {
      const wrapper = mountToggle({ props: { disabled: true } })
      for (const item of wrapper.findAll('.yue-button')) {
        expect(item.attributes('disabled')).toBeDefined()
      }
      await wrapper.findAll('.yue-button')[2].trigger('click')
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('disables only the item that asked for it', async () => {
      const wrapper = mountToggle({ items: [{}, { disabled: true }, {}] })
      const items = wrapper.findAll('.yue-button')
      expect(items[0].attributes('disabled')).toBeUndefined()
      expect(items[1].attributes('disabled')).toBeDefined()
      expect(items[2].attributes('disabled')).toBeUndefined()
    })

    it('never disables, through the group, an item that a value alone did not select', () => {
      // Guard against the flip side: "inactive" must not leak into `disabled` for a
      // selected-but-enabled item.
      const items = mountToggle().findAll('.yue-button')
      expect(items[1].attributes('disabled')).toBeUndefined()
    })
  })

  describe('passing button props through an item', () => {
    it('forwards the visual axes to the button underneath', () => {
      const wrapper = mountToggle({
        items: [{ theme: 'primary', variant: 'outline', size: 'sm', block: true, loading: true }],
      })
      const first = wrapper.findAll('.yue-button')[0]
      expect(first.classes()).toContain('yue-button--primary')
      expect(first.classes()).toContain('yue-button--outline')
      expect(first.classes()).toContain('yue-button--sm')
      expect(first.classes()).toContain('is-block')
      expect(first.classes()).toContain('is-loading')
      expect(first.attributes('aria-busy')).toBe('true')
    })

    it('renders the loader layer of the button it wraps', () => {
      const wrapper = mountToggle({ items: [{ loading: true }, {}, {}] })
      const first = wrapper.findAll('.yue-button')[0]
      expect(first.find('.yue-button__loader .yue-button__spinner').exists()).toBe(true)
      // The label is still there: loading is a paint state, not a markup state.
      expect(first.find('.yue-button__label').text()).toBe('left')
    })

    it('forwards plain attributes and a consumer class', () => {
      const wrapper = mountToggle({ items: [{ 'data-testid': 'center', class: 'mine' }, {}, {}] })
      const first = wrapper.findAll('.yue-button')[0]
      expect(first.attributes('data-testid')).toBe('center')
      expect(first.classes()).toContain('mine')
    })

    it('cannot be told it is not selected by an attribute', () => {
      const wrapper = mountToggle({ items: [{}, { 'aria-pressed': 'false' }, {}] })
      // The middle item is the selected one; a forwarded attribute must not be able to
      // contradict the group.
      expect(wrapper.findAll('.yue-button')[1].attributes('aria-pressed')).toBe('true')
    })
  })

  describe('slots on an item', () => {
    it('passes leading, trailing and loader content through to the button', () => {
      const wrapper = mount(YueButtonToggle, {
        props: { modelValue: 'a' },
        attrs: { 'aria-label': '视图' },
        slots: {
          default: () =>
            h(YueButtonToggleItem, { value: 'a', loading: true }, {
              default: () => '列表',
              leading: () => h('i', { class: 'lead' }),
              trailing: () => h('i', { class: 'caret' }),
              loader: () => h('i', { class: 'my-loader' }),
            }),
        },
      })

      const button = wrapper.find('.yue-button')
      expect(button.find('.yue-button__label').text()).toBe('列表')
      expect(button.find('.yue-button__icon--leading .lead').exists()).toBe(true)
      expect(button.find('.yue-button__icon--trailing .caret').exists()).toBe(true)
      expect(button.find('.yue-button__loader .my-loader').exists()).toBe(true)
      expect(button.find('.yue-button__spinner').exists()).toBe(false)
    })

    it('omits every wrapper for the slots it was not given', () => {
      const wrapper = mountToggle()
      const first = wrapper.findAll('.yue-button')[0]
      expect(first.find('.yue-button__icon').exists()).toBe(false)
      expect(first.find('.yue-button__loader').exists()).toBe(false)
    })
  })

  describe('development warnings', () => {
    it('warns about an item that has no group above it', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mount(YueButtonToggleItem, { props: { value: 'a' }, slots: { default: 'A' } })
      await nextTick()

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('YueButtonToggle'))
    })

    it('warns about a group with no accessible name', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mountToggle({ attrs: { 'aria-label': undefined } })
      await nextTick()
      await nextTick()

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible'))
    })

    it('stays quiet when the group is named', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mountToggle()
      await nextTick()
      await nextTick()

      expect(warn).not.toHaveBeenCalled()
    })
  })

  describe('the selected state and the stylesheet agree', () => {
    it('paints selection from the token family, not from a hard-coded colour', () => {
      const block = /\.yue-button\.is-active \{[^}]*\}/.exec(STYLESHEET)?.[0] ?? ''
      expect(block).not.toBe('')
      expect(block).toContain('background-color: var(--button-selected-background)')
      expect(block).toContain('color: var(--button-selected-color)')
      expect(block).not.toMatch(/#[0-9a-f]{3,8}/i)
    })

    it('keeps the selected state off disabled and loading items', () => {
      const hover = /\.yue-button\.is-active:hover[^{]*\{/.exec(STYLESHEET)?.[0] ?? ''
      expect(hover).toContain('.is-disabled')
      expect(hover).toContain('.is-loading')
    })
  })
})
