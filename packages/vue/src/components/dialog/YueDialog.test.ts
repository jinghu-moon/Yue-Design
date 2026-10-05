import { h, ref, createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import YueDialog from './YueDialog.vue'

const mounted: Array<{ unmount: () => void }> = []

/**
 * Open a controlled dialog by flipping `modelValue` rather than mounting it already open:
 * the register/inert/scroll-lock/open-emit side effects live in the `watch(isOpen)` block,
 * which does not run for the initial value. Mounting closed and then setting it true is what
 * a real parent does, so the test exercises the same path.
 */
async function mountOpen(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  const open = ref(false)
  const wrapper = mount(YueDialog, {
    attachTo: document.body,
    props: { modelValue: open.value, ...props },
    slots: { default: () => h('p', { 'data-body': 'true' }, 'body'), ...slots },
  })
  mounted.push(wrapper)
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
  return { wrapper, open }
}

function overlay() {
  return document.body.querySelector<HTMLElement>('.yue-dialog__overlay')!
}
function panel() {
  return document.body.querySelector<HTMLElement>('.yue-dialog')!
}

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

describe('YueDialog', () => {
  it('renders an accessible modal card with the built-in labels when open', async () => {
    const { wrapper } = await mountOpen({ title: 'Sign out', description: 'Are you sure?' })

    expect(panel().getAttribute('role')).toBe('dialog')
    expect(panel().getAttribute('aria-modal')).toBe('true')
    const labelledBy = panel().getAttribute('aria-labelledby')!
    expect(document.getElementById(labelledBy)?.textContent).toBe('Sign out')
    expect(panel().getAttribute('aria-describedby')).not.toBeNull()
    // en-US is the fallback pack, so the built-in actions are real words, not keys.
    expect(panel().textContent).toContain('OK')
    expect(panel().textContent).toContain('Cancel')
    expect(document.body.querySelector('.yue-dialog__close')?.getAttribute('aria-label')).toBe(
      'Close dialog',
    )
    expect(wrapper.emitted('open')).toHaveLength(1)
  })

  it('focuses the card container on open so assistive tech reads it first', async () => {
    await mountOpen({ title: 'Focus' })
    expect(document.activeElement).toBe(panel())
    // The panel is teleported to document.body, so the slot content is asserted against the
    // live DOM (a wrapper.find cannot see past the teleport boundary).
    expect(panel().querySelector('[data-body]')).not.toBeNull()
  })

  it('traps Tab inside the card, wrapping from the last control to the first', async () => {
    await mountOpen({ title: 'Trapped' })
    // Read the focusable ring in the same DOM order the component's trap walks. In happy-dom
    // every built-in control reports a non-null offsetParent, so close/cancel/confirm are all
    // live and no visibility forcing is needed. The observable is the wrapped focus itself: a
    // happy-dom KeyboardEvent does not reliably report defaultPrevented, but it does move
    // document.activeElement, which is what the focus trap guarantees to a keyboard user.
    const nodes = Array.from(
      panel().querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
      ),
    )
    const first = nodes[0]!
    const last = nodes[nodes.length - 1]!

    last.focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(first)

    first.focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    expect(document.activeElement).toBe(last)

    // A Tab from the container itself (shift) is also trapped onto the last control.
    panel().focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    expect(document.activeElement).toBe(last)
  })

  it('routes class to the overlay and every remaining attribute to the card', async () => {
    await mountOpen({ title: 'Routed', class: 'custom-shell', 'data-probe': 'card' })
    // The documented split: host classes decorate the whole surface (overlay), everything
    // else — selectors, test hooks, ARIA extras — lands on the dialog card itself.
    expect(overlay().classList.contains('custom-shell')).toBe(true)
    expect(panel().getAttribute('data-probe')).toBe('card')
    expect(overlay().getAttribute('data-probe')).toBeNull()
  })

  it('exposes open/close/updatePosition and closes with the programmatic reason', async () => {
    const { wrapper } = await mountOpen({ title: 'Exposed' })

    await wrapper.vm.close()
    await flushPromises()
    expect(wrapper.emitted('close')?.at(-1)?.[0]).toMatchObject({ reason: 'programmatic' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])

    // A controlled parent has not flipped the value yet; opening again is a request, not a force.
    await wrapper.setProps({ modelValue: false })
    await flushPromises()
    wrapper.vm.open()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([true])
    expect(typeof wrapper.vm.updatePosition).toBe('function')
    expect(() => wrapper.vm.updatePosition()).not.toThrow()
  })

  it('closes on Escape and routes the reason through the close pipeline', async () => {
    const { wrapper } = await mountOpen({ title: 'By Escape' })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('close')?.at(-1)?.[0]).toEqual({
      reason: 'escape',
      event: expect.any(KeyboardEvent),
    })
    expect(wrapper.emitted('closed')?.at(-1)?.[0]).toEqual({ reason: 'escape' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
  })

  it('never closes on Escape while an IME composition is active', async () => {
    const { wrapper } = await mountOpen({ title: 'Composing' })
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    Object.defineProperty(event, 'isComposing', { value: true })
    window.dispatchEvent(event)
    await flushPromises()

    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('closes on a scrim click (same-target press and release)', async () => {
    const { wrapper } = await mountOpen({ title: 'By scrim' })
    overlay().dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    overlay().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('close')?.at(-1)?.[0]).toMatchObject({ reason: 'scrim' })
  })

  it('does not close when the press starts inside the card', async () => {
    const { wrapper } = await mountOpen({ title: 'Inside press' })
    panel().dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    panel().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('emits confirm and closes with the confirm reason', async () => {
    const { wrapper } = await mountOpen({ title: 'Confirm' })
    const confirmButton = [...panel().querySelectorAll('.yue-dialog__action')].at(-1)!
    confirmButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('close')?.at(-1)?.[0]).toMatchObject({ reason: 'confirm' })
  })

  it('lets beforeClose abort a close before the controlled value changes', async () => {
    const { wrapper } = await mountOpen({ title: 'Guarded', beforeClose: () => false })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    // The request is reported, but the guard rejects it, so nothing is committed.
    expect(wrapper.emitted('close')?.at(-1)?.[0]).toMatchObject({ reason: 'escape' })
    expect(wrapper.emitted('closed')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('promotes the danger variant to alertdialog and disables Esc and scrim by default', async () => {
    const { wrapper } = await mountOpen({ title: 'Delete', variant: 'danger' })
    expect(panel().getAttribute('role')).toBe('alertdialog')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    overlay().dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    overlay().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('re-enables Escape for a danger dialog when closeOnEscape is explicit', async () => {
    const { wrapper } = await mountOpen({ title: 'Delete', variant: 'danger', closeOnEscape: true })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('close')?.at(-1)?.[0]).toMatchObject({ reason: 'escape' })
  })

  it('suppresses the locale labels when a footer slot is supplied', async () => {
    await mountOpen(
      { title: 'Custom actions' },
      { footer: () => h('button', { type: 'button', 'data-custom': 'true' }, 'Do it') },
    )
    expect(panel().textContent).not.toContain('Cancel')
    expect(panel().textContent).not.toContain('OK')
    expect(document.body.querySelector('[data-custom]')).not.toBeNull()
  })

  it('inerts background siblings but leaves a marked overlay reachable', async () => {
    const plain = document.createElement('div')
    plain.id = 'page-content'
    document.body.append(plain)
    const sibling = document.createElement('div')
    sibling.setAttribute('data-yue-overlay', '')
    sibling.id = 'sibling-overlay'
    document.body.append(sibling)

    await mountOpen({ title: 'Inert' })
    await flushPromises()

    expect(plain.getAttribute('aria-hidden')).toBe('true')
    expect(document.getElementById('sibling-overlay')?.hasAttribute('aria-hidden')).toBe(false)
  })

  it('keeps content mounted while closed when persistent', async () => {
    const open = ref(true)
    const wrapper = mount(YueDialog, {
      attachTo: document.body,
      props: { modelValue: open.value, title: 'Persistent', persistent: true },
      slots: { default: () => h('p', { 'data-body': 'true' }, 'body') },
    })
    mounted.push(wrapper)
    await flushPromises()

    await wrapper.setProps({ modelValue: false })
    await flushPromises()
    expect(document.body.querySelector('.yue-dialog__overlay')).not.toBeNull()
    expect(overlay().getAttribute('data-state')).toBe('closed')
  })

  it('ignores Escape and scrim while persistent, so only a button can close it', async () => {
    const { wrapper } = await mountOpen({ title: 'Persistent', persistent: true })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    overlay().dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    overlay().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('locks background scrolling while open and releases it on close', async () => {
    const { wrapper } = await mountOpen({ title: 'Scroll lock' })
    expect(document.documentElement.style.overflow).toBe('clip')
    expect(document.documentElement.style.scrollbarGutter).toBe('stable')

    await wrapper.setProps({ modelValue: false })
    await flushPromises()
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('renders on SSR without touching browser globals during setup', async () => {
    const app = createSSRApp({
      render: () =>
        h(
          YueDialog,
          { modelValue: true, title: 'Server rendered', 'aria-label': 'Server' },
          { default: () => h('p', { 'data-body': 'ssr-body' }, 'content') },
        ),
    })
    const context: { teleports?: Record<string, string> } = {}
    await renderToString(app, context)
    const teleported = context.teleports?.body ?? ''

    expect(teleported).toContain('role="dialog"')
    expect(teleported).toContain('aria-modal="true"')
    expect(teleported).toContain('data-body="ssr-body"')
  })

  it('flies in from the trigger: a clamped translate toward the anchor, pure (no scale)', async () => {
    // happy-dom reports a fixed viewport; assert the mechanism against it rather than a real
    // browser rect. The anchor centre (120, 90) sits up-left of the viewport centre, so the
    // travel vector points up-left and its length is clamped to 18% of the smaller dimension.
    const vw = window.innerWidth
    const vh = window.innerHeight
    const anchor = {
      getBoundingClientRect: () => ({ left: 100, top: 80, width: 40, height: 20 }),
    } as unknown as HTMLElement
    await mountOpen({ title: 'Fly', trigger: () => anchor })

    const tx = Number.parseFloat(overlay().style.getPropertyValue('--_dialog-tx'))
    const ty = Number.parseFloat(overlay().style.getPropertyValue('--_dialog-ty'))
    const scale = overlay().style.getPropertyValue('--_dialog-enter-scale')

    expect(tx).toBeLessThan(0)
    expect(ty).toBeLessThan(0)
    // Clamped: the raw distance (~490px) is far larger than the cap, so the result sits at it.
    expect(Math.hypot(tx, ty)).toBeLessThanOrEqual(Math.min(vw, vh) * 0.18 + 2)
    // Direction preserved: dx/dy = -392/-294.
    expect(tx / ty).toBeCloseTo(392 / 294, 1)
    // With a trigger the entrance is a pure translate, not a scale.
    expect(scale).toBe('1')
  })

  it('falls back to growing in place when there is no trigger', async () => {
    await mountOpen({ title: 'No trigger' })
    expect(overlay().style.getPropertyValue('--_dialog-tx')).toBe('0px')
    expect(overlay().style.getPropertyValue('--_dialog-ty')).toBe('0px')
    expect(overlay().style.getPropertyValue('--_dialog-enter-scale')).toBe('.96')
  })

  // ---- B1: a dialog that is already open on mount must still be a real modal --------------
  it('activates modality when mounted already open (route/SSR-restored dialog)', async () => {
    // The regression: activation lived only in a non-immediate watch, so an open-on-mount
    // dialog rendered but never locked scroll, never inert-ed the page, never took focus
    // and never emitted `open`. onMounted now runs the same activation the watch would.
    const wrapper = mount(YueDialog, {
      attachTo: document.body,
      props: { modelValue: true, title: 'Open on mount' },
      slots: { default: () => h('p', { 'data-body': 'true' }, 'body') },
    })
    mounted.push(wrapper)
    await flushPromises()
    expect(wrapper.emitted('open')).toHaveLength(1)
    expect(panel().getAttribute('aria-modal')).toBe('true')
    expect(document.documentElement.style.overflow).toBe('clip')
    expect(document.activeElement).toBe(panel())
  })

  // ---- B2 / C5: modality is its own axis, no longer a synonym for surface === 'modal' ------
  it('treats fullscreen as modal: aria-modal and scroll lock engage', async () => {
    await mountOpen({ title: 'Full', surface: 'fullscreen' })
    expect(panel().getAttribute('aria-modal')).toBe('true')
    expect(document.documentElement.style.overflow).toBe('clip')
  })

  it('leaves the page reachable when modeless: no aria-modal, no inert, no scroll lock', async () => {
    const page = document.createElement('div')
    page.id = 'modeless-page'
    document.body.append(page)
    await mountOpen({ title: 'Palette', modeless: true })
    expect(panel().getAttribute('aria-modal')).toBeNull()
    expect(document.documentElement.style.overflow).toBe('')
    expect(page.hasAttribute('aria-hidden')).toBe(false)
  })

  // ---- B3: a laid-out-but-invisible control must not be treated as part of the Tab ring ----
  it('pins the Tab ring on the container when every control is hidden', async () => {
    await mountOpen(
      { title: undefined, ariaLabel: 'Hidden only', close: false },
      {
        default: () => h('button', { type: 'button', style: 'visibility:hidden', 'data-h': '1' }, 'hidden'),
        footer: () => null,
      },
    )
    panel().focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    // The only focusable is visibility:hidden; the ring is empty, so focus is pinned to the panel.
    expect(document.activeElement).toBe(panel())
  })

  // ---- C1: a busy close disables the confirm button and refuses the ambient channels --------
  it('shows a busy confirm button and blocks Esc/scrim while loading', async () => {
    const { wrapper } = await mountOpen({ title: 'Busy', loading: true })
    const confirm = [...panel().querySelectorAll<HTMLButtonElement>('.yue-dialog__action')].at(-1)!
    expect(confirm.disabled).toBe(true)
    expect(confirm.getAttribute('aria-busy')).toBe('true')
    expect(panel().querySelector('.yue-dialog__spinner')).not.toBeNull()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    overlay().dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    overlay().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('goes busy while an async beforeClose guard is in flight, then settles', async () => {
    let resolve!: (value: boolean) => void
    const { wrapper } = await mountOpen({
      title: 'Guard',
      beforeClose: () => new Promise<boolean>((r) => { resolve = r }),
    })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    const confirm = [...panel().querySelectorAll<HTMLButtonElement>('.yue-dialog__action')].at(-1)!
    expect(confirm.disabled).toBe(true)
    resolve(true)
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    expect(confirm.disabled).toBe(false)
  })

  // ---- C2: the built-in actions are individually switchable --------------------------------
  it('renders a single-action dialog when cancel is hidden', async () => {
    await mountOpen({ title: 'Notice', showCancel: false })
    expect(panel().querySelectorAll('.yue-dialog__action')).toHaveLength(1)
    expect(panel().textContent).not.toContain('Cancel')
    expect(panel().textContent).toContain('OK')
  })

  it('drops the footer entirely when both actions are hidden and no footer slot', async () => {
    await mountOpen({ title: 'View', showCancel: false, showConfirm: false })
    expect(document.body.querySelector('.yue-dialog__footer')).toBeNull()
  })

  // ---- C3: per-part class / style hooks ------------------------------------------------------
  it('merges per-part classNames and styles onto the structural elements', async () => {
    await mountOpen({
      title: 'Styled',
      classNames: { body: 'my-body', footer: 'my-footer' },
      styles: { panel: { padding: '42px' } },
    })
    expect(document.body.querySelector('.yue-dialog__body.my-body')).not.toBeNull()
    expect(document.body.querySelector('.yue-dialog__footer.my-footer')).not.toBeNull()
    expect(panel().style.padding).toBe('42px')
  })

  // ---- C4: lazy defers first render, then keeps the content mounted -------------------------
  it('defers content until first open, then keeps it mounted when lazy', async () => {
    const open = ref(false)
    const wrapper = mount(YueDialog, {
      attachTo: document.body,
      props: { modelValue: open.value, title: 'Lazy', lazy: true },
      slots: { default: () => h('p', { 'data-body': 'true' }, 'body') },
    })
    mounted.push(wrapper)
    await flushPromises()
    expect(document.body.querySelector('.yue-dialog__overlay')).toBeNull()
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    expect(document.body.querySelector('[data-body]')).not.toBeNull()
    await wrapper.setProps({ modelValue: false })
    await flushPromises()
    expect(document.body.querySelector('.yue-dialog__overlay')).not.toBeNull()
    expect(overlay().style.display).toBe('none')
  })

  // ---- C6: the close glyph is replaceable without losing the accessible name -----------------
  it('lets a close-icon slot replace the built-in glyph', async () => {
    await mountOpen({ title: 'Icon' }, { 'close-icon': () => h('span', { 'data-x': 'glyph' }, 'X') })
    const close = document.body.querySelector('.yue-dialog__close')!
    expect(close.querySelector('[data-x]')).not.toBeNull()
    expect(close.querySelector('svg')).toBeNull()
    expect(close.getAttribute('aria-label')).toBe('Close dialog')
  })
})
