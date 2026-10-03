<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'
import { useConfig, useNamespace } from '@yue-ui/hooks'
import type { YueCheckTagProps, YueCheckTagEmits, YueCheckTagSlots } from './types'

defineOptions({
  name: 'YueCheckTag',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<YueCheckTagProps>(), {
  disabled:       false,
  defaultChecked: false,
  modelValue:     undefined,
})

const emit  = defineEmits<YueCheckTagEmits>()
defineSlots<YueCheckTagSlots>()

const ns     = useNamespace('tag')
const config = useConfig()
const attrs  = useAttrs()

const resolvedSize = computed(() => props.size ?? config.size)

// Internal checked state for uncontrolled usage.
const internalChecked = ref(props.defaultChecked)

const isControlled = computed(() => props.modelValue !== undefined)

const checked = computed(() =>
  isControlled.value ? props.modelValue! : internalChecked.value,
)

function setChecked(value: boolean, e: MouseEvent | KeyboardEvent) {
  if (props.disabled) return
  if (!isControlled.value) {
    internalChecked.value = value
  }
  emit('update:modelValue', value)
  emit('change', { checked: value, value: props.value, e })
}

const rootClass = computed(() => [
  ns.b(),
  ns.m(resolvedSize.value),
  ns.m('check'),
  {
    [ns.is('checked')]:  checked.value,
    [ns.is('disabled')]: props.disabled,
  },
  attrs.class,
])

const forwardedAttrs = computed(() => {
  const { class: _c, style, ...rest } = attrs
  return style ? { ...rest, style } : rest
})

function onClick(e: MouseEvent) {
  if (props.disabled) {
    e.preventDefault()
    e.stopPropagation()
    return
  }
  emit('click', e)
  setChecked(!checked.value, e)
}

function onKeydown(e: KeyboardEvent) {
  if (props.disabled) return
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    setChecked(!checked.value, e)
  }
}
</script>

<template>
  <span
    v-bind="forwardedAttrs"
    :class="rootClass"
    role="checkbox"
    :aria-checked="checked"
    :aria-disabled="props.disabled ? 'true' : undefined"
    :tabindex="props.disabled ? -1 : 0"
    @click="onClick"
    @keydown="onKeydown"
  >
    <slot />
  </span>
</template>
