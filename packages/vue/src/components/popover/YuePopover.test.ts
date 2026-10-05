import { h, nextTick, ref, createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import YuePopover from './YuePopover.vue'

const TriggerConsumer = (props: Record<string, unknown>, label = 'Open') =>
  h('button', { ...props, type: 'button', 'data-trigger': 'true' }, label)

const mounted: Array<{ unmount: () => void }> = []

function mountPopover(options: Record<string, unknown> = {}) {
  const slots = options.slots as Record<string, unknown> | undefined
  const wrapper = mount(YuePopover, {
    attachTo: document.body,
    ...options,
    slots: {
      ...(options.withoutTrigger ? {} : {
        trigger: ({ props }: { props: Record<string, unknown> }) => TriggerConsumer(props),
      }),
      default: ({ close }: { close: () => void }) => h('div', { 'data-content': 'true' }, [
        h('button', { type: 'button', onClick: close }, 'Close'),
      ]),
      ...slots,
    },
  })
  mounted.push(wrapper)
  return wrapper
}

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

describe('YuePopover', () => {
  it('renders trigger relationship attributes and opens in uncontrolled mode', async () => {
    const wrapper = mountPopover()
    const trigger = wrapper.get('[data-trigger]')

    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(trigger.attributes('aria-controls')).toMatch(/-content$/)
    await trigger.trigger('click')

    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(document.body.querySelector('[data-content]')).not.toBeNull()
    expect(document.body.querySelector('.yue-popover')?.getAttribute('role')).toBe('dialog')
    expect(wrapper.emitted('open')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('keeps the parent as the source of truth in controlled mode', async () => {
    const open = ref(false)
    const wrapper = mount(YuePopover, {
      props: { modelValue: open.value },
      slots: {
        trigger: ({ props }: { props: Record<string, unknown> }) => TriggerConsumer(props),
        default: () => h('div', { 'data-content': 'true' }, 'content'),
      },
      attachTo: document.body,
    })
    mounted.push(wrapper)

    await wrapper.get('[data-trigger]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    expect(wrapper.find('[data-content]').exists()).toBe(false)

    await wrapper.setProps({ modelValue: true })
    expect(document.body.querySelector('[data-content]')).not.toBeNull()
    open.value = true
  })

  it('supports hover, focus, and manual trigger policies', async () => {
    const hover = mountPopover({ props: { trigger: 'hover' } })
    await hover.get('[data-trigger]').trigger('mouseenter')
    expect(hover.get('[data-trigger]').attributes('aria-expanded')).toBe('true')

    const focus = mountPopover({ props: { trigger: 'focus' } })
    await focus.get('[data-trigger]').trigger('focusin')
    expect(focus.get('[data-trigger]').attributes('aria-expanded')).toBe('true')

    const manual = mountPopover({ props: { trigger: 'manual' } })
    await manual.get('[data-trigger]').trigger('click')
    expect(manual.get('[data-trigger]').attributes('aria-expanded')).toBe('false')
    ;(manual.vm as unknown as { open: () => void }).open()
    await nextTick()
    expect(manual.get('[data-trigger]').attributes('aria-expanded')).toBe('true')
  })

  it('does not open when disabled and can start open in uncontrolled mode', async () => {
    const disabled = mountPopover({ props: { disabled: true } })
    await disabled.get('[data-trigger]').trigger('click')
    expect(disabled.get('[data-trigger]').attributes('aria-expanded')).toBe('false')
    expect(disabled.emitted('open')).toBeUndefined()

    const initiallyOpen = mountPopover({ props: { defaultOpen: true } })
    await nextTick()
    expect(initiallyOpen.get('[data-trigger]').attributes('aria-expanded')).toBe('true')
    expect(document.body.querySelector('[data-content]')).not.toBeNull()
  })

  it('routes content attributes and uses tooltip relationships for tooltip role', async () => {
    const wrapper = mountPopover({
      attrs: {
        id: 'help-popover',
        class: 'consumer-class',
        'aria-label': 'Helpful information',
        'data-owner': 'form',
      },
      props: { role: 'tooltip' },
    })
    const trigger = wrapper.get('[data-trigger]')
    expect(trigger.attributes('aria-controls')).toBeUndefined()
    expect(trigger.attributes('aria-haspopup')).toBeUndefined()
    expect(trigger.attributes('aria-describedby')).toBe('help-popover')
    await trigger.trigger('click')
    const root = document.body.querySelector('#help-popover') as HTMLElement
    expect(root).not.toBeNull()
    expect(root.classList.contains('consumer-class')).toBe(true)
    expect(root.getAttribute('aria-label')).toBe('Helpful information')
    expect(root.getAttribute('data-owner')).toBe('form')
    expect(root.getAttribute('role')).toBe('tooltip')
  })

  it('honours close policy props and suppresses duplicate requests', async () => {
    const wrapper = mountPopover({ props: { closeOnOutside: false, closeOnContentClick: true } })
    const trigger = wrapper.get('[data-trigger]')
    await trigger.trigger('click')
    await trigger.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    await wrapper.vm.$nextTick()
    expect(trigger.attributes('aria-expanded')).toBe('false')

    await trigger.trigger('click')
    document.body.querySelector<HTMLElement>('[data-content]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(trigger.attributes('aria-expanded')).toBe('false')
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('closes on Escape and reports the close reason', async () => {
    const wrapper = mountPopover()
    await wrapper.get('[data-trigger]').trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(wrapper.get('[data-trigger]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.emitted('close')).toEqual([[{ reason: 'escape', event: expect.any(KeyboardEvent) }]])
  })

  it('only closes the topmost nested popover on Escape', async () => {
    const outer = mountPopover()
    await outer.get('[data-trigger]').trigger('click')

    const inner = mountPopover({
      props: { trigger: 'manual' },
      slots: {
        default: () => h('div', { 'data-content': 'inner-content' }, 'inner'),
      },
    })
    ;(inner.vm as unknown as { open: () => void }).open()
    await nextTick()
    await nextTick()
    expect(document.body.querySelector('[data-content="inner-content"]')).not.toBeNull()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(inner.get('[data-trigger]').attributes('aria-expanded')).toBe('false')
    expect(outer.get('[data-trigger]').attributes('aria-expanded')).toBe('true')
  })

  it('closes on outside pointerdown but keeps content clicks open by default', async () => {
    const wrapper = mountPopover()
    await wrapper.get('[data-trigger]').trigger('click')
    document.body.querySelector<HTMLElement>('[data-content]')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(wrapper.get('[data-trigger]').attributes('aria-expanded')).toBe('true')

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()
    expect(wrapper.get('[data-trigger]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.emitted('close')?.at(-1)?.[0]).toEqual({ reason: 'outside', event: expect.any(Event) })
  })

  it('keeps persistent content mounted while closed', async () => {
    const wrapper = mountPopover({ props: { persistent: true } })
    await wrapper.get('[data-trigger]').trigger('click')
    await wrapper.get('[data-trigger]').trigger('click')
    expect(document.body.querySelector('[data-content]')).not.toBeNull()
    expect(document.body.querySelector('.yue-popover')?.getAttribute('data-state')).toBe('closed')
  })

  it('restores focus to the trigger when Escape closes the surface', async () => {
    const wrapper = mountPopover()
    const trigger = wrapper.get('[data-trigger]')
    await trigger.trigger('focus')
    await trigger.trigger('click')
    ;(document.body.querySelector('[data-content] button') as HTMLElement).focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(document.activeElement).toBe(trigger.element)
  })

  it('supports an external anchor without rendering a trigger', async () => {
    const anchor = document.createElement('button')
    document.body.append(anchor)
    const wrapper = mountPopover({ props: { trigger: 'manual', anchor }, withoutTrigger: true })
    expect(wrapper.find('[data-trigger]').exists()).toBe(false)
    await (wrapper.vm as unknown as { open: () => void }).open()
    await nextTick()
    expect(document.body.querySelector('[data-content]')).not.toBeNull()
  })

  it('renders on SSR without reading browser globals during setup', async () => {
    const app = createSSRApp({
      render: () => h(YuePopover, {
        defaultOpen: true,
        'aria-label': 'Server-rendered popover',
      }, {
        trigger: ({ props }: { props: Record<string, unknown> }) => TriggerConsumer(props),
        default: () => h('div', { 'data-content': 'ssr-content' }, 'content'),
      }),
    })
    const context: { teleports?: Record<string, string> } = {}
    const html = await renderToString(app, context)
    const teleported = context.teleports?.body ?? ''
    expect(html).toContain('aria-expanded="true"')
    expect(teleported).toContain('data-content="ssr-content"')
    expect(teleported).toContain('role="dialog"')
  })
})
