<script setup lang="ts">
import { computed } from 'vue'
import { YueButton } from '@yue-ui/vue'
import type { DocsDensity } from '../useTokenAppearance'
import { useDocsLocale } from '../useDocsLocale'

defineProps<{ modelValue: DocsDensity }>()
const emit = defineEmits<{ 'update:modelValue': [value: DocsDensity] }>()

const { strings } = useDocsLocale()

const OPTIONS = computed<ReadonlyArray<{ value: DocsDensity; label: string }>>(() => [
  { value: 'comfortable', label: strings.value.density.comfortable },
  { value: 'compact', label: strings.value.density.compact },
])
</script>

<template>
  <div class="appearance-switch" role="group" :aria-label="strings.density.label">
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
