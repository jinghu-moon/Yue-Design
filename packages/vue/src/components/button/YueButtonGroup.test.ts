import { mount } from '@vue/test-utils'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import YueButton from './YueButton.vue'
import YueButtonGroup from './YueButtonGroup.vue'

/**
 * The group's own stylesheet is the Button family sheet, so the class contract is read
 * from the same file the button's tests read. Same reasoning as there: Vitest stubs a CSS
 * import to `''`, and every assertion below would then pass against nothing.
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

function mountGroup(
  options: { props?: Record<string, unknown>; attrs?: Record<string, unknown>; slots?: Record<string, string> } = {},
) {
  return mount(YueButtonGroup, {
    ...options,
    slots: { default: '<button class="yue-button">A</button>', ...options.slots },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('YueButtonGroup', () => {
  describe('structure', () => {
    it('renders a div with the block class and role="group"', () => {
      const wrapper = mountGroup()
      expect(wrapper.element.tagName).toBe('DIV')
      expect(wrapper.classes()).toEqual(['yue-button-group'])
      expect(wrapper.attributes('role')).toBe('group')
    })

    it('adds the vertical modifier only when asked', () => {
      expect(mountGroup().classes()).not.toContain('yue-button-group--vertical')
      expect(mountGroup({ props: { vertical: true } }).classes()).toContain(
        'yue-button-group--vertical',
      )
    })

    it('lets the consumer override the role', () => {
      // `role` is a binding, not a hard-coded attribute: a toolbar that has to announce
      // itself as a toolbar can say so without a second component, and the component's own
      // binding losing to the caller's attribute is what makes that possible.
      expect(mountGroup({ attrs: { role: 'toolbar' } }).attributes('role')).toBe('toolbar')
    })

    it('forwards the accessible name and plain attributes', () => {
      const wrapper = mountGroup({ attrs: { 'aria-label': '对齐方式', id: 'align' } })
      expect(wrapper.attributes('aria-label')).toBe('对齐方式')
      expect(wrapper.attributes('id')).toBe('align')
    })

    it('merges a consumer class with the block class', () => {
      expect(mountGroup({ attrs: { class: 'mine' } }).classes()).toEqual([
        'yue-button-group',
        'mine',
      ])
    })
  })

  describe('scope', () => {
    it('is structure only: it does not restate the buttons colour, painting or size', () => {
      // The decision this pins is as important as the classes above. A group that
      // forwarded `theme`/`variant`/`size` to its children would be a ninth way to spell
      // "these buttons are small", and it would fight the documented mechanism for a dense
      // region — re-pointing the `--button-*` Component Tokens on a container.
      const wrapper = mount(YueButtonGroup, {
        slots: { default: () => h(YueButton, null, () => 'A') },
      })
      const button = wrapper.find('.yue-button')
      expect(button.classes()).toContain('yue-button--default')
      expect(button.classes()).toContain('yue-button--md')
      expect(button.classes()).toContain('yue-button--solid')
    })

    it('owns no selection state of its own', () => {
      // There is no `v-model` here: a group of buttons that merely sit together is a
      // different component from a group that agrees on one value, and mixing the two is
      // how every button grows a `value`.
      const wrapper = mountGroup()
      expect(wrapper.find('[aria-pressed]').exists()).toBe(false)
    })
  })

  describe('the emitted classes and the stylesheet agree', () => {
    const EMITTED = ['yue-button-group', 'yue-button-group--vertical']

    it('styles every emitted class', () => {
      expect(EMITTED.filter((className) => !STYLESHEET.includes(`.${className}`))).toEqual([])
    })

    it('joins corners by reading the radius of the button that owns them', () => {
      // Reading `--_radius` rather than writing a radius means a group of `round` buttons
      // keeps round ends: the button publishes the radius its own shape selected, and the
      // group only decides *which* corners keep it.
      expect(STYLESHEET).toMatch(/\.yue-button-group > \.yue-button \{[^}]*border-start-start-radius: 0/)
      expect(STYLESHEET).toMatch(/:first-child \{[^}]*border-start-start-radius: var\(--_radius\)/)
      expect(STYLESHEET).toMatch(/:last-child \{[^}]*border-end-end-radius: var\(--_radius\)/)
    })

    it('overlaps the shared edge from the border-width token', () => {
      // Two adjacent 1px borders would otherwise read as one 2px seam.
      expect(STYLESHEET).toMatch(
        /margin-inline-start: calc\(-1 \* var\(--button-border-width\)\)/,
      )
      expect(STYLESHEET).toMatch(/margin-block-start: calc\(-1 \* var\(--button-border-width\)\)/)
    })

    it('does not pull inline links into each other', () => {
      // `link` has no control box and no inline inset, so overlapping two of them would run
      // their text together. The exclusion has to be in the selector, not in a comment.
      expect(STYLESHEET).toMatch(/:not\(\.yue-button--link\)\s*\+\s*\.yue-button:not\(\.yue-button--link\)/)
    })

    it('lays the vertical variant out as a column', () => {
      const rule = /\.yue-button-group--vertical \{[^}]*\}/.exec(STYLESHEET)?.[0] ?? ''
      expect(rule).toContain('flex-direction: column')
    })
  })
})
