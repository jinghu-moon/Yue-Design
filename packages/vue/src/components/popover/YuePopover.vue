<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useAttrs, useId, watch, type ComponentPublicInstance } from 'vue'
import { useNamespace, isTopOverlay, registerOverlay } from '@yue-ui/hooks'
import type {
  YuePopoverCloseReason,
  YuePopoverExposed,
  YuePopoverProps,
  YuePopoverRole,
  YuePopoverSlots,
} from './types'
import { useFloatingPosition } from './useFloatingPosition'

defineOptions({ name: 'YuePopover', inheritAttrs: false })

const props = withDefaults(defineProps<YuePopoverProps>(), {
  // Keep `undefined` observable so modelValue can distinguish controlled from uncontrolled.
  // Vue otherwise Boolean-casts an omitted optional boolean to false.
  modelValue: undefined,
  defaultOpen: false,
  trigger: 'click',
  placement: 'bottom',
  offset: 8,
  teleport: undefined,
  persistent: false,
  closeOnOutside: true,
  closeOnEscape: true,
  closeOnContentClick: false,
  restoreFocus: true,
  role: 'dialog',
  disabled: false,
})
defineSlots<YuePopoverSlots>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  open: [payload: { trigger: Event | undefined }]
  close: [payload: { reason: YuePopoverCloseReason; event?: Event }]
  'after-open': []
  'after-close': []
}>()

const attrs = useAttrs()
const ns = useNamespace('popover')
const uid = useId()
const triggerEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)
const internalOpen = ref(props.defaultOpen ?? false)
const openingTrigger = ref<HTMLElement | null>(null)
const hoverCloseTimer = ref<ReturnType<typeof setTimeout> | undefined>()
const unregisterOverlay = ref<(() => void) | undefined>()

const isControlled = computed(() => props.modelValue !== undefined)
const isOpen = computed(() => isControlled.value ? props.modelValue === true : internalOpen.value)
const contentId = computed(() => typeof attrs.id === 'string' ? attrs.id : `${uid}-content`)
const trigger = computed(() => props.trigger)
const placement = computed(() => props.placement)
const offset = computed(() => props.offset)
const role = computed<YuePopoverRole>(() => props.role)
const referenceEl = computed(() => {
  if (props.anchor) {
    return typeof props.anchor === 'function' ? props.anchor() : props.anchor
  }
  return triggerEl.value
})
const referenceRef = computed(() => referenceEl.value)
const floatingRef = computed(() => contentEl.value)
const position = useFloatingPosition(referenceRef, floatingRef, {
  open: isOpen,
  placement,
  offset,
})
// Expose the composable refs at setup scope so the template unwraps their values.
// Accessing `position.actualPlacement` through a plain object would bind the Ref
// object itself and render `[object Object]` into the public data attribute.
const actualPlacement = position.actualPlacement
const isPositioned = position.isPositioned
const teleportTarget = computed(() => {
  if (props.teleport === false) return 'body'
  if (props.teleport === true || props.teleport === undefined) return 'body'
  return props.teleport
})
// Do not branch on `document` here: SSR and hydration must choose the same
// Teleport path. Vue's server renderer records enabled teleports separately;
// an environment-dependent `disabled` flag creates a hydration mismatch.
const teleportDisabled = computed(() => props.teleport === false)
const contentAttrs = computed(() => {
  const { class: _class, style: _style, id: _id, role: _role, ...rest } = attrs
  return rest
})

function clearHoverClose() {
  if (hoverCloseTimer.value !== undefined) {
    clearTimeout(hoverCloseTimer.value)
    hoverCloseTimer.value = undefined
  }
}

function scheduleHoverClose(event?: Event) {
  clearHoverClose()
  hoverCloseTimer.value = setTimeout(() => {
    hoverCloseTimer.value = undefined
    if (trigger.value === 'hover' && !triggerEl.value?.matches(':hover') && !contentEl.value?.matches(':hover')) {
      requestClose('trigger', event)
    }
  }, 80)
}

function updateState(next: boolean) {
  if (isControlled.value) emit('update:modelValue', next)
  else internalOpen.value = next
}

function requestOpen(event?: Event) {
  if (props.disabled || isOpen.value) return
  openingTrigger.value = triggerEl.value
  updateState(true)
  emit('open', { trigger: event })
}

const openFromSlot = () => requestOpen()
const closeFromSlot = () => requestClose('programmatic')

function shouldRestoreFocus(reason: YuePopoverCloseReason) {
  if (!props.restoreFocus || reason === 'outside' || typeof document === 'undefined') return false
  const active = document.activeElement
  return !!openingTrigger.value && (active === openingTrigger.value || active === document.body || !!contentEl.value?.contains(active))
}

async function requestClose(reason: YuePopoverCloseReason, event?: Event) {
  if (!isOpen.value) return
  clearHoverClose()
  const restore = shouldRestoreFocus(reason)
  updateState(false)
  emit('close', { reason, event })
  if (restore) {
    await nextTick()
    if (openingTrigger.value?.isConnected) openingTrigger.value.focus({ preventScroll: true })
  }
}

function toggle(event?: Event) {
  if (isOpen.value) void requestClose('trigger', event)
  else requestOpen(event)
}

function handleTriggerClick(event: MouseEvent) {
  if (trigger.value === 'click') toggle(event)
}

function handleTriggerEnter(event: MouseEvent) {
  if (trigger.value === 'hover') {
    clearHoverClose()
    requestOpen(event)
  }
}

function handleTriggerLeave(event: MouseEvent) {
  if (trigger.value === 'hover') scheduleHoverClose(event)
}

function handleTriggerFocus(event: FocusEvent) {
  if (trigger.value === 'focus') requestOpen(event)
}

function handleTriggerBlur(event: FocusEvent) {
  if (trigger.value !== 'focus') return
  const next = event.relatedTarget as Node | null
  if (!next || (!triggerEl.value?.contains(next) && !contentEl.value?.contains(next))) {
    void requestClose('trigger', event)
  }
}

function handleContentClick(event: MouseEvent) {
  if (props.closeOnContentClick) void requestClose('trigger', event)
}

function handleContentEnter() {
  if (trigger.value === 'hover') clearHoverClose()
}

function handleContentLeave(event: MouseEvent) {
  if (trigger.value === 'hover') scheduleHoverClose(event)
}

function setTriggerElement(value: Element | ComponentPublicInstance | null) {
  if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) {
    triggerEl.value = value
    return
  }
  const element = value && '$el' in value ? value.$el : null
  triggerEl.value = typeof HTMLElement !== 'undefined' && element instanceof HTMLElement ? element : null
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !props.closeOnEscape || !isOpen.value || !overlayRecord || !isTopOverlay(overlayRecord)) return
  event.preventDefault()
  void requestClose('escape', event)
}

const overlayRecord = {
  contains: (event: Event) => {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : []
    return (!!triggerEl.value && path.includes(triggerEl.value)) || (!!contentEl.value && path.includes(contentEl.value))
      || !!triggerEl.value?.contains(event.target as Node)
      || !!contentEl.value?.contains(event.target as Node)
      || !!(props.anchor !== undefined && referenceEl.value?.contains(event.target as Node))
  },
  close: (event: Event) => {
    if (props.closeOnOutside) void requestClose('outside', event)
  },
}

watch([isOpen, contentEl], async ([open, content]) => {
  unregisterOverlay.value?.()
  unregisterOverlay.value = undefined
  if (!open || !content) return
  unregisterOverlay.value = registerOverlay(overlayRecord)
  await nextTick()
  if (typeof window !== 'undefined') window.addEventListener('keydown', handleKeydown)
}, { flush: 'post' })

watch(isOpen, (open) => {
  if (!open && typeof window !== 'undefined') window.removeEventListener('keydown', handleKeydown)
})

watch(() => props.disabled, (disabled) => {
  if (disabled && isOpen.value) void requestClose('programmatic')
})

onBeforeUnmount(() => {
  clearHoverClose()
  unregisterOverlay.value?.()
  if (typeof window !== 'undefined') window.removeEventListener('keydown', handleKeydown)
})

const triggerProps = computed(() => ({
  ref: setTriggerElement,
  'aria-expanded': isOpen.value,
  'aria-controls': role.value === 'tooltip' ? undefined : contentId.value,
  'aria-haspopup': role.value === 'dialog' ? 'dialog' : undefined,
  'aria-describedby': role.value === 'tooltip' ? contentId.value : undefined,
  'aria-disabled': props.disabled ? 'true' : undefined,
  onClick: handleTriggerClick,
  onMouseenter: handleTriggerEnter,
  onMouseleave: handleTriggerLeave,
  onFocusin: handleTriggerFocus,
  onFocusout: handleTriggerBlur,
}))

const exposed: YuePopoverExposed = {
  open: requestOpen,
  close: (reason = 'programmatic') => void requestClose(reason),
  toggle: () => toggle(),
  updatePosition: position.updatePosition,
}
defineExpose(exposed)
</script>

<template>
  <span :class="ns.e('anchor')">
    <slot
      name="trigger"
      :props="triggerProps"
      :is-open="isOpen"
      :open="openFromSlot"
      :close="closeFromSlot"
      :toggle="toggle"
    />
  </span>

  <Teleport :to="teleportTarget" :disabled="teleportDisabled">
    <Transition
      :name="ns.b()"
      @after-enter="emit('after-open')"
      @after-leave="emit('after-close')"
    >
      <div
        v-if="isOpen || props.persistent"
        v-show="isOpen"
        ref="contentEl"
        v-bind="contentAttrs"
        :id="contentId"
        :class="[ns.b(), attrs.class]"
        :role="role"
        data-yue-overlay
        :data-state="isOpen ? 'open' : 'closed'"
        :data-placement="actualPlacement"
        :style="[attrs.style, { visibility: isPositioned ? 'visible' : 'hidden' }]"
        @click="handleContentClick"
        @mouseenter="handleContentEnter"
        @mouseleave="handleContentLeave"
      >
        <slot :is-open="isOpen" :close="closeFromSlot" />
      </div>
    </Transition>
  </Teleport>
</template>
