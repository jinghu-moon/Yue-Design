<script setup lang="ts">
import { computed } from 'vue'
import { YueButton } from '@yue-ui/vue'
import type { DocsAccent } from '../useTokenAppearance'
import { useDocsLocale } from '../useDocsLocale'

defineProps<{ modelValue: DocsAccent }>()
const emit = defineEmits<{ 'update:modelValue': [value: DocsAccent] }>()

const { strings } = useDocsLocale()

/**
 * The token contract ships two accents. `azure` is the default scope and needs no
 * `[data-accent]` rule; `neutral` is an override block, which is why switching to
 * it is what proves the accent axis is wired up at all.
 */
const OPTIONS = computed<ReadonlyArray<{ value: DocsAccent; label: string }>>(() => [
  { value: 'azure', label: strings.value.accent.azure },
  { value: 'neutral', label: strings.value.accent.neutral },
])
</script>

<template>
  <div class="appearance-switch" role="group" :aria-label="strings.accent.label">
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
