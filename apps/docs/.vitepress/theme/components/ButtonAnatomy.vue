<script setup lang="ts">
import { computed } from 'vue'
import { YueButton } from '@yue-ui/vue'
import { useDocsLocale } from '../useDocsLocale'

/**
 * The anatomy of a Button, drawn with the real component.
 *
 * Not an SVG diagram and not a screenshot: the two buttons in the stage are rendered by the
 * same `YueButton` a consumer imports, so an anatomy figure cannot keep describing a
 * component that changed shape underneath it. The stage shows the assembled button and the
 * loading variant side by side, because "the loader sits on top of the content" is the one
 * part of the anatomy that is easier to see than to read.
 *
 * The prose comes from the docs locale catalog, so an English reader gets English labels
 * while the *selectors* stay what they are — class names do not translate.
 */
const { strings } = useDocsLocale()

const parts = computed(() => [
  { index: 1, selector: '.yue-button', text: strings.value.anatomy.partBox },
  { index: 2, selector: '.yue-button__icon--leading', text: strings.value.anatomy.partLeading },
  { index: 3, selector: '.yue-button__label', text: strings.value.anatomy.partLabel },
  { index: 4, selector: '.yue-button__icon--trailing', text: strings.value.anatomy.partTrailing },
  { index: 5, selector: '.yue-button__loader', text: strings.value.anatomy.partLoader },
  { index: 6, selector: '.yue-button:focus-visible', text: strings.value.anatomy.partFocus },
])
</script>

<template>
  <figure class="button-anatomy">
    <div class="button-anatomy__stage">
      <YueButton size="lg" data-anatomy="assembled">
        <template #leading>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </template>
        {{ strings.anatomy.sampleLabel }}
        <template #trailing>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </template>
      </YueButton>

      <YueButton size="lg" loading data-anatomy="loading">
        {{ strings.anatomy.sampleLabel }}
      </YueButton>
    </div>

    <figcaption class="button-anatomy__caption">
      {{ strings.anatomy.captions.assembled }} · {{ strings.anatomy.captions.loading }} ——
      {{ strings.anatomy.note }}
    </figcaption>

    <ol class="button-anatomy__parts">
      <li v-for="part in parts" :key="part.index" class="button-anatomy__part">
        <span class="button-anatomy__index" aria-hidden="true">{{ part.index }}</span>
        <span>
          <span class="button-anatomy__name">{{ part.text.name }}</span>
          <code class="button-anatomy__selector">{{ part.selector }}</code>
          <span class="button-anatomy__note">{{ part.text.note }}</span>
        </span>
      </li>
    </ol>
  </figure>
</template>
