export type YuePopoverPlacement = 'top' | 'top-start' | 'top-end' | 'right' | 'right-start' | 'right-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end'
export type YuePopoverTrigger = 'click' | 'hover' | 'focus' | 'manual'
export type YuePopoverCloseReason = 'trigger' | 'outside' | 'escape' | 'programmatic'
export type YuePopoverRole = 'dialog' | 'tooltip' | 'presentation'
export type YuePopoverAnchor = HTMLElement | (() => HTMLElement | null)

export interface YuePopoverTriggerSlot {
  props: Record<string, unknown>
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export interface YuePopoverContentSlot {
  isOpen: boolean
  close: () => void
}

export interface YuePopoverProps {
  modelValue?: boolean
  defaultOpen?: boolean
  trigger?: YuePopoverTrigger
  anchor?: YuePopoverAnchor
  placement?: YuePopoverPlacement
  offset?: number
  teleport?: boolean | string | HTMLElement
  persistent?: boolean
  closeOnOutside?: boolean
  closeOnEscape?: boolean
  closeOnContentClick?: boolean
  restoreFocus?: boolean
  role?: YuePopoverRole
  disabled?: boolean
}

export interface YuePopoverEmits {
  (event: 'update:modelValue', value: boolean): void
  (event: 'open', payload: { trigger: Event | undefined }): void
  (event: 'close', payload: { reason: YuePopoverCloseReason; event?: Event }): void
  (event: 'after-open'): void
  (event: 'after-close'): void
}

export interface YuePopoverSlots {
  trigger?: (scope: YuePopoverTriggerSlot) => unknown
  default?: (scope: YuePopoverContentSlot) => unknown
}

export interface YuePopoverExposed {
  open: () => void
  close: (reason?: 'programmatic') => void
  toggle: () => void
  updatePosition: () => Promise<void>
}
