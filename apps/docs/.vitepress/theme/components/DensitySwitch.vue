<script setup lang="ts">
import { YueButton } from '@yue-ui/vue'
import type { DocsDensity } from '../useTokenAppearance'

defineProps<{ modelValue: DocsDensity }>()
const emit = defineEmits<{ 'update:modelValue': [value: DocsDensity] }>()

const OPTIONS: ReadonlyArray<{ value: DocsDensity; label: string }> = [
  { value: 'comfortable', label: '标准' },
  { value: 'compact', label: '紧凑' },
]
</script>

<template>
  <div class="appearance-switch" role="group" aria-label="密度">
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
