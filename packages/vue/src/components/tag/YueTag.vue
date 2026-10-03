<script setup lang="ts">
import { computed, useAttrs, useSlots } from 'vue'
import { IconX } from '@tabler/icons-vue'
import { useConfig, useNamespace } from '@yue-ui/hooks'
import { useLocale } from '../../locale/runtime'
import type { YueTagProps, YueTagEmits, YueTagSlots } from './types'

defineOptions({
  name: 'YueTag',
  // Attrs are forwarded by hand so we control exactly which element they land on.
  inheritAttrs: false,
})

const props = withDefaults(defineProps<YueTagProps>(), {
  theme:    'default',
  variant:  'filled',
  shape:    'square',
  disabled: false,
  closable: false,
  tag:      'span',
})

const emit  = defineEmits<YueTagEmits>()
defineSlots<YueTagSlots>()

const ns     = useNamespace('tag')
const config = useConfig()
const attrs  = useAttrs()
const locale = useLocale()

const closeLabel = computed(() => locale.t('tag.closeLabel'))

const resolvedSize = computed(() => props.size ?? config.size)

// When a `color` prop is supplied the palette is overridden in JS.
// We derive background, border, and text from the single color value using a
// simple luminance threshold: dark colour → white text; light colour → the
// colour itself as text (keeps things readable without a full algorithm).
const colorStyle = computed(() => {
  const c = props.color
  if (!c) return undefined

  const variant = props.variant

  // Parse a single CSS colour into r/g/b via an off-screen canvas.
  // This is a best-effort approximation; full APCA is deferred to the
  // Open Question noted in the spec.
  let r = 128, g = 128, b = 128
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = c
      ctx.fillRect(0, 0, 1, 1)
      ;[r, g, b] = ctx.getImageData(0, 0, 1, 1).data as unknown as [number, number, number, number]
    }
  }

  // WCAG relative luminance
  const toLinear = (v: number) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  const onFill = L > 0.179 ? '#111' : '#fff'

  // TODO(dark-mode): `color` does not adapt automatically to dark mode. The consumer
  // is responsible for providing an appropriate color value per theme. Full APCA contrast
  // and automatic dark-mode adaptation are deferred to the dark-mode iteration.
  // See: docs/en/components/tag/guide.md — "Custom color (color prop)"

  const tintBg = `rgba(${r},${g},${b},0.12)`

  if (variant === 'filled') {
    return { backgroundColor: c, borderColor: 'transparent', color: onFill }
  }
  if (variant === 'tint') {
    return { backgroundColor: tintBg, borderColor: 'transparent', color: c }
  }
  if (variant === 'outline') {
    return { backgroundColor: 'transparent', borderColor: c, color: c }
  }
  // tint-outline
  return { backgroundColor: tintBg, borderColor: c, color: c }
})

// maxWidth truncation: the label gets a capped width; the root gets `title`.
// Extracted to a computed so the template `:title` binding contains no `>` characters,
// which confuse the i18n audit tool's template-text regex.
const slots = useSlots()
const rootTitle = computed(() => {
  if (!maxWidthPx.value) return undefined
  return slots.default?.()
    .map((v) => (typeof v.children === 'string' ? v.children : ''))
    .join('') || undefined
})

const maxWidthPx = computed(() => {
  const mw = props.maxWidth
  if (mw === undefined) return undefined
  return typeof mw === 'number' ? `${mw}px` : mw
})

const rootClass = computed(() => [
  ns.b(),
  ns.m(props.theme),
  ns.m(props.variant),
  ns.m(resolvedSize.value),
  ns.m(props.shape),
  { [ns.is('disabled')]: props.disabled },
  attrs.class,
])

// Forward attrs to the root element (attrs.class is merged via rootClass above).
const forwardedAttrs = computed(() => {
  const { class: _c, style, ...rest } = attrs
  return style ? { ...rest, style } : rest
})

function onRootClick(e: MouseEvent) {
  if (props.disabled) {
    e.preventDefault()
    e.stopPropagation()
    return
  }
  emit('click', e)
}

function onCloseClick(e: MouseEvent) {
  // Prevent the root onClick from also firing.
  e.stopPropagation()
  if (props.disabled) return
  emit('close', e)
}
</script>

<template>
  <component
    :is="props.tag"
    v-bind="forwardedAttrs"
    :class="rootClass"
    :style="colorStyle"
    :aria-disabled="props.disabled ? 'true' : undefined"
    :title="rootTitle"
    @click="onRootClick"
  >
    <!-- Leading icon slot -->
    <span v-if="$slots.icon" :class="ns.e('icon')" aria-hidden="true">
      <slot name="icon" />
    </span>

    <!-- Label — wrapped in a truncation span only when maxWidth is set -->
    <span v-if="maxWidthPx" :class="ns.e('label')" :style="{ maxWidth: maxWidthPx }">
      <slot />
    </span>
    <slot v-else />

    <!-- Close button — only rendered when closable and not disabled -->
    <button
      v-if="props.closable && !props.disabled"
      type="button"
      :class="ns.e('close')"
      :aria-label="closeLabel"
      @click="onCloseClick"
    >
      <slot name="close-icon">
        <IconX :size="12" :stroke-width="2" aria-hidden="true" />
      </slot>
    </button>
  </component>
</template>
