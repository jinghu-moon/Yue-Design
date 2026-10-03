<script setup lang="ts">
import { computed, inject, useAttrs } from 'vue'
import YueButton from './YueButton.vue'
import { yueButtonToggleKey } from './toggle-context'
import type { YueButtonToggleItemProps } from './types'

/**
 * `YueButtonToggleItem` — a button that *is* a value.
 *
 * This is the only component that knows about both halves: it reads the group's
 * selection and it renders a `YueButton`. That is the point of the split — the button
 * stays a button (no `value`, no group, no injected state), and the group stays a
 * container (no markup of its own), so neither has to grow a branch for the other.
 *
 * The item renders a `<button>` through `YueButton`, so it accepts everything a button
 * accepts — `theme`, `variant`, `size`, `shape`, `loading`, `block`, `disabled` — plus the
 * one prop that makes it an item: `value`.
 *
 * Its slots are forwarded to that button *conditionally*. An always-present slot would make
 * `YueButton` render an empty `.yue-button__icon` wrapper for every item, which is exactly
 * the markup noise the button avoids when a slot is unused — and the condition has to be
 * `$slots.x`, because a comment placeholder is content: `$slots.default` would exist and the
 * button would render a label span containing nothing but that comment.
 */
defineOptions({
  name: 'YueButtonToggleItem',
  // Attributes are routed by hand. `aria-pressed`, `active` and `disabled` are derived
  // from the group, and Vue's automatic merging appends `$attrs` *after* the component's
  // own bindings, which would let a stray attribute say a button is not pressed while the
  // group says it is selected.
  inheritAttrs: false,
})

const props = withDefaults(defineProps<YueButtonToggleItemProps>(), {
  disabled: false,
})

const attrs = useAttrs()
const group = inject(yueButtonToggleKey, null)

if (import.meta.env.DEV && !group) {
  console.warn(
    '[YueButtonToggleItem] has no <YueButtonToggle> above it, so it can never become ' +
      'selected. Render it inside a group, or use `<YueButton :active="…">` for a toggle ' +
      'button that stands on its own.',
  )
}

const selected = computed(() => group !== null && group.selected.value === props.value)
/** A disabled group disables every item; a disabled item disables only itself. */
const inactive = computed(() => props.disabled || group?.disabled.value === true)

/**
 * Every prop except `value` belongs to the button underneath, so it is forwarded as-is
 * rather than listed again — the shared props interface is the single place that decides
 * what a button accepts.
 */
const forwarded = computed(() => {
  const { value: _value, ...rest } = props
  return { ...rest, ...attrs }
})

function onClick() {
  // The button already refuses to emit while it is disabled or loading; this keeps the
  // group from being told about an activation that was never allowed to happen.
  if (inactive.value) return
  group?.select(props.value)
}
</script>

<template>
  <YueButton
    v-bind="forwarded"
    :active="selected"
    :disabled="inactive"
    :aria-pressed="selected ? 'true' : 'false'"
    @click="onClick"
  >
    <template v-if="$slots.leading" #leading><slot name="leading" /></template>
    <template v-if="$slots.trailing" #trailing><slot name="trailing" /></template>
    <template v-if="$slots.loader" #loader><slot name="loader" /></template>
    <template v-if="$slots.default"><slot /></template>
  </YueButton>
</template>
