<script setup lang="ts">
import { YueButton } from '@yue-ui/vue'
import type { DocsAccent } from '../useTokenAppearance'

defineProps<{ modelValue: DocsAccent }>()
const emit = defineEmits<{ 'update:modelValue': [value: DocsAccent] }>()

/**
 * The token contract ships two accents. `azure` is the default scope and needs no
 * `[data-accent]` rule; `neutral` is an override block, which is why switching to
 * it is what proves the accent axis is wired up at all.
 */
const OPTIONS: ReadonlyArray<{ value: DocsAccent; label: string }> = [
  { value: 'azure', label: '天蓝' },
  { value: 'neutral', label: '中性' },
]
</script>

<template>
  <div class="appearance-switch" role="group" aria-label="主题色">
    <YueButton
      v-for="option in OPTIONS"
      :key="option.value"
      size="sm"
      :variant="modelValue === option.value ? 'solid' : 'text'"
      :aria-pressed="modelValue === option.value"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </YueButton>
  </div>
</template>
