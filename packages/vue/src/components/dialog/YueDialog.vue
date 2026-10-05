<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useAttrs, useId, useSlots, watch } from 'vue'
import { useNamespace, isTopOverlay, registerOverlay } from '@yue-ui/hooks'
import { useLocale } from '../../locale/runtime'
import type {
  YueDialogCloseReason,
  YueDialogExposed,
  YueDialogProps,
  YueDialogSlots,
} from './types'

defineOptions({ name: 'YueDialog', inheritAttrs: false })

const props = withDefaults(defineProps<YueDialogProps>(), {
  // `undefined` stays observable so modelValue can tell controlled from uncontrolled;
  // Vue would otherwise Boolean-cast an omitted optional boolean to false.
  modelValue: undefined,
  title: undefined,
  description: undefined,
  variant: 'default',
  surface: 'modal',
  size: undefined,
  width: undefined,
  scrollable: false,
  persistent: false,
  closeOnEscape: undefined,
  closeOnScrim: undefined,
  beforeClose: undefined,
  confirmText: undefined,
  cancelText: undefined,
  close: true,
  teleport: 'body',
  trigger: undefined,
  restoreFocus: true,
  ariaLabel: undefined,
  modeless: false,
  loading: false,
  showConfirm: true,
  showCancel: true,
  lazy: false,
  classNames: undefined,
  styles: undefined,
})
defineSlots<YueDialogSlots>()
// Emitted events are declared inline (rather than `defineEmits<YueDialogEmits>()`) so the
// documentation gate can read the emitted names straight off the component. `YueDialogEmits`
// in `types.ts` stays the published source of truth and is kept in sync with this list.
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  open: []
  close: [payload: { reason: YueDialogCloseReason; event?: Event }]
  confirm: []
  closed: [payload: { reason: YueDialogCloseReason }]
  'after-open': []
  'after-close': []
}>()

const attrs = useAttrs()
const slots = useSlots()
const ns = useNamespace('dialog')
const locale = useLocale()
const uid = useId()

const panelEl = ref<HTMLElement | null>(null)
const overlayEl = ref<HTMLElement | null>(null)
const internalOpen = ref(false)
const openingElement = ref<HTMLElement | null>(null)
const unregisterOverlay = ref<(() => void) | undefined>()
const transformOrigin = ref('center')
const translateX = ref('0px')
const translateY = ref('0px')
const enterScale = ref('.96')
// Content is instantiated on first open when `lazy`; kept mounted across later closes (C4).
const hasOpened = ref(false)
// Set while an async `beforeClose` guard is in flight, so the confirm button shows a busy
// state and the ambient close channels are suppressed without a second `loading` prop (C1).
const guardPending = ref(false)

const isControlled = computed(() => props.modelValue !== undefined)
const isOpen = computed(() => (isControlled.value ? props.modelValue === true : internalOpen.value))

// danger derives the modal role and turns the two ambient close channels off unless the
// caller explicitly re-enables one — an alertdialog is answered through a button.
const isDanger = computed(() => props.variant === 'danger')
const role = computed(() => (isDanger.value ? 'alertdialog' : 'dialog'))
const closeOnEscape = computed(() => props.closeOnEscape ?? !isDanger.value)
const closeOnScrim = computed(() => props.closeOnScrim ?? !isDanger.value)
// Modality is its own axis, not a synonym for `surface === 'modal'` (B2): both the centred
// card and the fullscreen sheet are modal by default (aria-modal + background inert + scroll
// lock + focus trap); `modeless` opts out for a non-blocking surface, at which point a focus
// trap would be wrong because the page must stay reachable.
const isModal = computed(() => !props.modeless)
// A close is "busy" while an external `loading` flag or an in-flight guard holds it: the
// confirm button spins and both ambient channels are refused so the outcome is decided once.
const isBusy = computed(() => props.loading || guardPending.value)

const size = computed(() => props.size ?? 'md')
const resolvedWidth = computed(() => {
  if (props.width === undefined) return undefined
  return typeof props.width === 'number' ? `${props.width}px` : props.width
})

const titleId = computed(() => `${uid}-title`)
const descriptionId = computed(() => `${uid}-description`)
const hasTitle = computed(() => props.title !== undefined || slots.header !== undefined)
const hasDescription = computed(
  () => props.description !== undefined && props.description !== '',
)

// The footer only earns its padding when there is something to show: a slot, or at least one
// built-in action still switched on (C2 — a single-action or action-less dialog drops the row).
const hasFooter = computed(
  () => slots.footer !== undefined || props.showConfirm || props.showCancel,
)
// Mount window: transient by default (only while open), kept after first open when `lazy`,
// present from the start when `persistent` (C4 / Q24).
const mounted = computed(
  () => isOpen.value || props.persistent || (props.lazy && hasOpened.value),
)

// Panel classes are resolved in script so `props.surface` / `props.scrollable` are read
// through the props object (a template-only reference is invisible to the docs contract).
const panelClasses = computed(() => [
  ns.b(),
  ns.m(props.surface),
  { [ns.m('scrollable')]: props.scrollable, [ns.m('danger')]: isDanger.value },
])

const confirmLabel = computed(() => props.confirmText ?? locale.t('dialog.confirm'))
const cancelLabel = computed(() => props.cancelText ?? locale.t('dialog.cancel'))
const closeAriaLabel = computed(() => {
  if (props.close && typeof props.close === 'object' && props.close.ariaLabel) return props.close.ariaLabel
  return locale.t('dialog.closeLabel')
})

const teleportTarget = computed(() => {
  if (props.teleport === true || props.teleport === undefined || props.teleport === false) return 'body'
  return props.teleport
})
const teleportDisabled = computed(() => props.teleport === false)

const overlayStyle = computed(() => {
  const style: Record<string, string> = {}
  style['--_dialog-transform-origin'] = transformOrigin.value
  style['--_dialog-tx'] = translateX.value
  style['--_dialog-ty'] = translateY.value
  style['--_dialog-enter-scale'] = enterScale.value
  return style
})

// A raw `width` overrides the size ramp; the ramp itself is chosen by a `data-size`
// attribute so the CSS can read each `--dialog-width-*` token literally (a runtime-built
// var name would look unconsumed to the token-usage gate).
const panelStyle = computed(() => {
  if (resolvedWidth.value === undefined) return {}
  return { '--_dialog-width': resolvedWidth.value }
})

// Per-part class/style overrides (C3) are resolved through the props object so the docs
// contract can see them read (a template-only reference is invisible to it). Normalised to
// empty objects so each part binding stays a plain `partClass.overlay` lookup.
const partClass = computed(() => props.classNames ?? {})
const partStyle = computed(() => props.styles ?? {})

// Fly-in origin (Q25 revised to a Vuetify-style FLIP travel): with a trigger the card slides from
// the trigger's centre to the viewport centre (and back on close), so the motion names its source.
// The travel vector keeps its direction but its length is clamped to a fraction of the viewport so
// an edge trigger never throws a modal across the whole screen. With no trigger it falls back to
// growing in place from the centre. Durations/curve stay the frozen single source (Q30=A); only the
// mechanism and the origin rule are frozen, the concrete distance is a prototype value (Q16).
function resolveTrigger(): HTMLElement | null {
  if (!props.trigger) return null
  return typeof props.trigger === 'function' ? props.trigger() : props.trigger
}

function computeTransformOrigin() {
  const anchor = resolveTrigger()
  if (typeof document === 'undefined' || typeof window === 'undefined' || !anchor) {
    transformOrigin.value = 'center'
    translateX.value = '0px'
    translateY.value = '0px'
    enterScale.value = '.96'
    return
  }
  const rect = anchor.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  transformOrigin.value = `${(x / window.innerWidth) * 100}% ${(y / window.innerHeight) * 100}%`
  let dx = x - window.innerWidth / 2
  let dy = y - window.innerHeight / 2
  const length = Math.hypot(dx, dy)
  const cap = Math.min(window.innerWidth, window.innerHeight) * 0.18
  if (length > cap) {
    const k = cap / length
    dx *= k
    dy *= k
  }
  translateX.value = `${Math.round(dx)}px`
  translateY.value = `${Math.round(dy)}px`
  enterScale.value = '1'
}

const panelAttrs = computed(() => {
  const { class: _class, style: _style, id: _id, role: _role, ...rest } = attrs
  return rest
})

function updateState(next: boolean) {
  if (isControlled.value) emit('update:modelValue', next)
  else internalOpen.value = next
}

// ---- close pipeline -------------------------------------------------------------
// Fixed order per the spec: close (request) -> beforeClose -> update:modelValue ->
// animation -> after-close. A guard that rejects or returns false aborts before the
// controlled value is touched. Repeat requests while already closing/closed are swallowed.
let closing = false

async function runGuard(reason: YueDialogCloseReason): Promise<boolean> {
  if (!props.beforeClose) return true
  guardPending.value = true
  try {
    return await props.beforeClose(reason)
  } catch {
    return false
  } finally {
    guardPending.value = false
  }
}

async function requestClose(reason: YueDialogCloseReason, event?: Event) {
  if (!isOpen.value || closing) return
  closing = true
  try {
    emit('close', { reason, event })
    const allowed = await runGuard(reason)
    if (!allowed || !isOpen.value) return
    const shouldRestore = decideRestoreFocus(reason)
    updateState(false)
    emit('closed', { reason })
    if (shouldRestore) {
      await nextTick()
      restoreFocus()
    }
  } finally {
    closing = false
  }
}

// Conditional return focus (Q12=B): a keyboard- or program-triggered close returns to the
// pre-open element; a scrim click (pointer travelling into the page) does not grab focus.
function decideRestoreFocus(reason: YueDialogCloseReason): boolean {
  if (!props.restoreFocus) return false
  if (reason === 'scrim') return false
  if (typeof document === 'undefined') return false
  const active = document.activeElement
  const withinPanel = !!panelEl.value && !!active && panelEl.value.contains(active)
  const driftedToPage = !!active && active !== document.body && !withinPanel
  return !driftedToPage
}

function restoreFocus() {
  const target = resolveTrigger() ?? openingElement.value
  if (target?.isConnected) target.focus({ preventScroll: true })
}

function handleConfirm() {
  emit('confirm')
  void requestClose('confirm')
}

function cancelFromSlot() {
  void requestClose('cancel')
}

const closeFromSlot = (reason: YueDialogCloseReason = 'programmatic') => void requestClose(reason)

let scrimPressed = false
function handleOverlayMouseDown(event: MouseEvent) {
  // Same-target rule: the press must start on the scrim/overlay, not inside the panel.
  scrimPressed = event.target === overlayEl.value
}

function handleOverlayClick(event: MouseEvent) {
  if (!scrimPressed) return
  scrimPressed = false
  if (event.target !== overlayEl.value) return
  if (isBusy.value) return
  if (!closeOnScrim.value || props.persistent) return
  void requestClose('scrim', event)
}

// ---- keyboard -------------------------------------------------------------------
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    // IME composition owns Escape; never close mid-input (Q22=E).
    if (event.isComposing) return
    if (isBusy.value) return
    if (!closeOnEscape.value || props.persistent) return
    if (!overlayRecord || !isTopOverlay(overlayRecord)) return
    event.preventDefault()
    void requestClose('escape', event)
    return
  }
  // A modeless surface leaves the page reachable, so its focus must not be ringed in.
  if (event.key === 'Tab' && isModal.value) handleFocusTrap(event)
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

// A focusable node counts only when it is actually reachable: `offsetParent` alone reports a
// node still laid out but hidden via `visibility:hidden` as focusable, and returns null for a
// `position:fixed` control that is genuinely on screen. Combine a computed-style check with a
// layout-presence fallback so both real browsers and the happy-dom test env agree (B3).
function isFocusable(el: HTMLElement): boolean {
  if (el === document.activeElement) return true
  const style = typeof window !== 'undefined' ? window.getComputedStyle(el) : null
  if (style && (style.visibility === 'hidden' || style.display === 'none')) return false
  return el.offsetParent !== null || el.getClientRects().length > 0
}

function handleFocusTrap(event: KeyboardEvent) {
  const panel = panelEl.value
  if (!panel) return
  const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isFocusable)
  if (nodes.length === 0) {
    // Nothing to move to: pin the ring on the panel itself.
    event.preventDefault()
    panel.focus()
    return
  }
  const first = nodes[0]!
  const last = nodes[nodes.length - 1]!
  const active = document.activeElement as HTMLElement | null
  if (event.shiftKey && (active === first || active === panel)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

// ---- overlay stack registration (Esc / outside arbitration) ----------------------
const overlayRecord = {
  // A dialog consumes any pointer landing inside its own teleported subtree, so a child
  // popover's click never reaches the parent as an "outside" event.
  contains: (event: Event) => {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : []
    return (!!overlayEl.value && path.includes(overlayEl.value)) || !!overlayEl.value?.contains(event.target as Node)
  },
  // No "click anywhere outside closes me" channel — only the scrim closes — so the stack's
  // outside dispatch is a deliberate no-op here (Q6 excludes outside-anywhere).
  close: () => {},
}

// ---- background inert + scroll lock ---------------------------------------------
// inert is computed per the *modal chain*, never a blunt `#app` sweep: every direct child
// of <body> that is not a live overlay (marked `data-yue-overlay`) is made unreachable, so a
// popover or tooltip teleported beside this dialog stays reachable (Q10=C verification B).
const inertedNodes = new Map<Element, { inert: boolean; ariaHidden: string | null }>()

function applyBackgroundInert() {
  if (typeof document === 'undefined' || !isModal.value) return
  for (const child of Array.from(document.body.children)) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue
    // Never inert the dialog's own surface or any ancestor that contains it (a Transition
    // wrapper, a teleport container): that would trap the panel inside an unreachable node.
    if (child === overlayEl.value || child.contains(overlayEl.value)) continue
    if (child instanceof HTMLElement && child.hasAttribute('data-yue-overlay')) continue
    if (inertedNodes.has(child)) continue
    const element = child as HTMLElement
    inertedNodes.set(child, { inert: element.inert, ariaHidden: child.getAttribute('aria-hidden') })
    element.inert = true
    child.setAttribute('aria-hidden', 'true')
  }
}

function releaseBackgroundInert() {
  for (const [node, prev] of inertedNodes) {
    if (node instanceof HTMLElement) node.inert = prev.inert
    if (prev.ariaHidden === null) node.removeAttribute('aria-hidden')
    else node.setAttribute('aria-hidden', prev.ariaHidden)
  }
  inertedNodes.clear()
}

// overflow:clip + scrollbar-gutter:stable eliminates the scrollbar reflow at the source
// (Q20=B); browsers without the combination accept a minor shift. A module counter keeps
// nested dialogs from unlocking early.
let scrollLockCount = 0
let savedOverflow = ''
let savedGutter = ''

function lockScroll() {
  if (typeof document === 'undefined' || !isModal.value) return
  if (scrollLockCount === 0) {
    const root = document.documentElement
    savedOverflow = root.style.overflow
    savedGutter = root.style.scrollbarGutter
    root.style.overflow = 'clip'
    root.style.scrollbarGutter = 'stable'
  }
  scrollLockCount += 1
}

function unlockScroll() {
  if (typeof document === 'undefined' || !isModal.value) return
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0) {
    const root = document.documentElement
    root.style.overflow = savedOverflow
    root.style.scrollbarGutter = savedGutter
  }
}

// ---- lifecycle ------------------------------------------------------------------
// Activation is a named routine rather than a branch of the watcher, so the *initial* open
// state can run it too. A dialog mounted already-open (route/query-driven, or SSR-rendered
// open then hydrated) used to skip every side effect — no inert, no scroll lock, no focus
// trap, no `open` event — because a non-immediate watcher never fires for the first value.
// `onMounted` closes that gap on the client; SSR is unaffected because `onMounted` never runs
// on the server, where the markup-only render is all we want (B1).
async function activate() {
  if (typeof document === 'undefined') return
  if (!props.ariaLabel && !hasTitle.value && typeof console !== 'undefined') {
    console.warn('[YueDialog] no accessible name: set `title`, a `header` slot, or `aria-label`.')
  }
  hasOpened.value = true
  openingElement.value = document.activeElement as HTMLElement | null
  computeTransformOrigin()
  await nextTick()
  if (!overlayEl.value) return
  emit('open')
  unregisterOverlay.value?.()
  unregisterOverlay.value = registerOverlay(overlayRecord)
  applyBackgroundInert()
  lockScroll()
  // Initial focus lands on the container (tabindex=-1) so assistive tech reads the
  // accessible name and description before any control (Q11=A).
  panelEl.value?.focus({ preventScroll: true })
  if (typeof window !== 'undefined') window.addEventListener('keydown', handleKeydown)
}

function deactivate() {
  unregisterOverlay.value?.()
  unregisterOverlay.value = undefined
  releaseBackgroundInert()
  unlockScroll()
  if (typeof window !== 'undefined') window.removeEventListener('keydown', handleKeydown)
}

watch(
  isOpen,
  (open) => {
    if (open) void activate()
    else deactivate()
  },
  { flush: 'post' },
)

onMounted(() => {
  if (isOpen.value) void activate()
})

onBeforeUnmount(deactivate)

function open() {
  if (isOpen.value) return
  if (isControlled.value) emit('update:modelValue', true)
  else internalOpen.value = true
}

const exposed: YueDialogExposed = {
  open,
  close: (reason: YueDialogCloseReason = 'programmatic') => void requestClose(reason),
  updatePosition: computeTransformOrigin,
}
defineExpose(exposed)
</script>

<template>
  <Teleport :to="teleportTarget" :disabled="teleportDisabled">
    <Transition
      :name="ns.b()"
      @after-enter="emit('after-open')"
      @after-leave="emit('after-close')"
    >
      <div
        v-if="mounted"
        v-show="isOpen"
        ref="overlayEl"
        :class="[ns.e('overlay'), attrs.class, partClass.overlay]"
        :style="[attrs.style, overlayStyle, partStyle.overlay]"
        data-yue-overlay
        :data-state="isOpen ? 'open' : 'closed'"
        :data-surface="surface"
        @mousedown="handleOverlayMouseDown"
        @click="handleOverlayClick"
      >
        <div :class="[ns.e('scrim'), partClass.scrim]" :style="partStyle.scrim" aria-hidden="true" />
        <div
          ref="panelEl"
          :class="[...panelClasses, partClass.panel]"
          :style="[panelStyle, partStyle.panel]"
          :data-size="size"
          :role="role"
          tabindex="-1"
          :aria-modal="isModal ? 'true' : undefined"
          :aria-label="ariaLabel"
          :aria-labelledby="!ariaLabel && hasTitle ? titleId : undefined"
          :aria-describedby="hasDescription ? descriptionId : undefined"
          v-bind="panelAttrs"
        >
          <div
            v-if="hasTitle || close !== false"
            :class="[ns.e('header'), partClass.header]"
            :style="partStyle.header"
          >
            <h2 v-if="hasTitle" :id="titleId" :class="ns.e('title')">
              <slot name="header" :title-id="titleId">{{ title }}</slot>
            </h2>
            <button
              v-if="close !== false"
              type="button"
              :class="[ns.e('close'), partClass.close]"
              :style="partStyle.close"
              :aria-label="closeAriaLabel"
              @click="requestClose('close-btn', $event)"
            >
              <slot name="close-icon">
                <svg :class="ns.e('close-icon')" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                </svg>
              </slot>
            </button>
          </div>

          <p v-if="hasDescription" :id="descriptionId" :class="ns.e('description')">{{ description }}</p>

          <div :class="[ns.e('body'), partClass.body]" :style="partStyle.body">
            <slot :close="closeFromSlot" />
          </div>

          <div v-if="hasFooter" :class="[ns.e('footer'), partClass.footer]" :style="partStyle.footer">
            <slot name="footer" :close="closeFromSlot" :confirm="handleConfirm" :cancel="cancelFromSlot">
              <button
                v-if="showCancel"
                type="button"
                :class="[ns.e('action'), ns.m('cancel')]"
                :disabled="isBusy"
                @click="cancelFromSlot"
              >
                {{ cancelLabel }}
              </button>
              <button
                v-if="showConfirm"
                type="button"
                :class="[ns.e('action'), ns.m(isDanger ? 'danger' : 'confirm')]"
                :disabled="isBusy"
                :aria-busy="isBusy || undefined"
                @click="handleConfirm"
              >
                <span v-if="isBusy" :class="ns.e('spinner')" aria-hidden="true" />
                {{ confirmLabel }}
              </button>
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
