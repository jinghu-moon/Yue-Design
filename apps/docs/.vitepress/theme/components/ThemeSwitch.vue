<script setup lang="ts">
import { YueButton } from '@yue-ui/vue'
import type { DocsTheme } from '../useTokenAppearance'

defineProps<{ modelValue: DocsTheme }>()
const emit = defineEmits<{ 'update:modelValue': [value: DocsTheme] }>()

const OPTIONS: ReadonlyArray<{ value: DocsTheme; label: string }> = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]
</script>

<template>
  <!--
    A controlled radio group rather than a `v-model`-owning widget: the theme is
    document-wide state, so several frames on one page must all render the same
    value instead of each keeping its own copy.
  -->
  <div class="appearance-switch" role="group" aria-label="主题">
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
