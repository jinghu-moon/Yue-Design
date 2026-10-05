import {
  autoUpdate,
  computePosition,
  flip,
  offset as offsetMiddleware,
  shift,
  size,
  type Placement,
} from '@floating-ui/dom'
import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'

interface FloatingPositionOptions {
  open: Readonly<Ref<boolean>>
  placement: Readonly<Ref<Placement>>
  offset: Readonly<Ref<number>>
}

export function useFloatingPosition(
  reference: Readonly<Ref<HTMLElement | null>>,
  floating: Readonly<Ref<HTMLElement | null>>,
  options: FloatingPositionOptions,
) {
  const actualPlacement = ref<Placement>(options.placement.value)
  const isPositioned = ref(false)
  let cleanup: (() => void) | undefined
  let updateVersion = 0

  const stopAutoUpdate = () => {
    cleanup?.()
    cleanup = undefined
  }

  async function updatePosition(): Promise<void> {
    if (typeof window === 'undefined') return
    const referenceEl = reference.value
    const floatingEl = floating.value
    if (!options.open.value || !referenceEl || !floatingEl) return

    const version = ++updateVersion
    const result = await computePosition(referenceEl, floatingEl, {
      strategy: 'fixed',
      placement: options.placement.value,
      middleware: [
        offsetMiddleware(options.offset.value),
        flip({ padding: 8 }),
        shift({ padding: 8 }),
        size({
          padding: 8,
          apply({ availableHeight, elements }) {
            elements.floating.style.setProperty('--_available-height', `${Math.max(0, availableHeight)}px`)
          },
        }),
      ],
    })

    if (version !== updateVersion || !floating.value) return
    actualPlacement.value = result.placement
    // Rounded to whole pixels so the surface does not paint on a half-pixel boundary;
    // the clip-path reveal is resolved against this same rendered box.
    const appliedX = Math.round(result.x)
    const appliedY = Math.round(result.y)
    floating.value.style.left = '0px'
    floating.value.style.top = '0px'
    floating.value.style.transform = `translate3d(${appliedX}px, ${appliedY}px, 0)`
    floating.value.style.visibility = 'visible'
    isPositioned.value = true
  }

  async function attach() {
    stopAutoUpdate()
    isPositioned.value = false
    if (!options.open.value) return
    await nextTick()
    if (!options.open.value || !reference.value || !floating.value) return
    cleanup = autoUpdate(reference.value, floating.value, updatePosition, {
      ancestorScroll: true,
      ancestorResize: true,
      elementResize: true,
      layoutShift: true,
      animationFrame: false,
    })
    await updatePosition()
  }

  watch(
    [options.open, reference, floating, options.placement, options.offset],
    () => void attach(),
    { flush: 'post', immediate: true },
  )

  onBeforeUnmount(() => {
    stopAutoUpdate()
    updateVersion += 1
  })

  return { actualPlacement, isPositioned, updatePosition }
}
