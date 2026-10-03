<script setup lang="ts">
import { computed, provide, useAttrs, watchPostEffect } from 'vue'
// Imported from its own module rather than from `./index`, which re-exports this file:
// a barrel import here would make the two components a cycle for no benefit.
import YueButtonGroup from './YueButtonGroup.vue'
import { yueButtonToggleKey } from './toggle-context'
import type { YueButtonToggleProps, YueButtonToggleValue } from './types'

/**
 * `YueButtonToggle` — the group that owns the value.
 *
 * It is a `YueButtonGroup` with a selection: the same joined corners, the same
 * `role="group"`, plus the `v-model` an item reads. Splitting the two is what keeps
 * `YueButton` a single button: nothing here is a prop on the button, and the button has
 * no idea a group exists.
 *
 * The selection is **mandatory** — activating the item that is already selected is a
 * no-op rather than a deselect. A segmented control answers "which one of these is
 * active?", and a state where none of them is active cannot answer it; a set of buttons
 * that can all be off is a set of independent toggle buttons, which is
 * `<YueButtonGroup>` plus `active` on each `YueButton`.
 *
 * Keyboard navigation inside the group is not implemented yet: Today the items are
 * ordinary tab stops. Roving tabindex and arrow keys are a follow-up, and are deliberately
 * not half-implemented here — a partial implementation changes the tab order without
 * providing the arrow-key navigation that is supposed to replace it.
 */
defineOptions({
  name: 'YueButtonToggle',
})

const props = withDefaults(defineProps<YueButtonToggleProps>(), {
  modelValue: null,
  disabled: false,
  vertical: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: YueButtonToggleValue]
}>()

const attrs = useAttrs()

/** `null` and `undefined` both mean "nothing selected yet". */
const selected = computed(() => props.modelValue ?? null)
const disabled = computed(() => props.disabled)

function select(value: YueButtonToggleValue) {
  if (disabled.value) return
  // Mandatory selection: the active item is already the answer.
  if (value === selected.value) return
  emit('update:modelValue', value)
}

provide(yueButtonToggleKey, { selected, disabled, select })

// A group of buttons has no text of its own, so its accessible name has to come from
// somewhere. Warn in development rather than ship a group a screen reader can only
// announce as "group"; Vite replaces `import.meta.env.DEV` with `false` in the production
// build, so rollup drops this block from `dist`.
if (import.meta.env.DEV) {
  watchPostEffect(() => {
    // Read the attributes before deciding, so the effect re-runs when they change.
    void attrs['aria-label']
    void attrs['aria-labelledby']
    if (!attrs['aria-label'] && !attrs['aria-labelledby']) {
      console.warn(
        '[YueButtonToggle] renders a group of toggle buttons, which needs an accessible ' +
          'name. Pass `aria-label`, or point `aria-labelledby` at visible text.',
      )
    }
  })
}
</script>

<template>
  <YueButtonGroup :vertical="props.vertical">
    <slot />
  </YueButtonGroup>
</template>
