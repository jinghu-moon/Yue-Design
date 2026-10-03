<script setup lang="ts">
import { computed } from 'vue'
import { YueButton } from '@yue-ui/vue'
import type { DocsTheme } from '../useTokenAppearance'
import { useDocsLocale } from '../useDocsLocale'

defineProps<{ modelValue: DocsTheme }>()
const emit = defineEmits<{ 'update:modelValue': [value: DocsTheme] }>()

const { strings } = useDocsLocale()

// Labels come from the docs locale catalog rather than literals: this control is docs
// chrome, and an English page must not show a Chinese button.
const OPTIONS = computed<ReadonlyArray<{ value: DocsTheme; label: string }>>(() => [
  { value: 'light', label: strings.value.theme.light },
  { value: 'dark', label: strings.value.theme.dark },
])
</script>

<template>
  <!--
    A controlled radio group rather than a `v-model`-owning widget: the theme is
    document-wide state, so several frames on one page must all render the same
    value instead of each keeping its own copy.
  -->
  <div class="appearance-switch" role="group" :aria-label="strings.theme.label">
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
