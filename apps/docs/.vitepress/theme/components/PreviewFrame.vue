<script setup lang="ts">
import { computed, ref, useSlots } from 'vue'
import { YueButton } from '@yue-ui/vue'
import AccentSwitch from './AccentSwitch.vue'
import DensitySwitch from './DensitySwitch.vue'
import ThemeSwitch from './ThemeSwitch.vue'
import { DOCS_DENSITY_DEFAULT, usePreviewAppearance } from '../useTokenAppearance'
import type { DocsDensity } from '../useTokenAppearance'
import { useDocsLocale } from '../useDocsLocale'

/**
 * A live preview surface with the controls a component page needs: light/dark,
 * accent, density, and reset — plus the source that produced what you are looking
 * at.
 *
 * The important property is that the child is the *real* component from
 * `@yue-ui/vue`, rendered by the same stylesheet a consumer loads — not a
 * screenshot, and not a hand-written copy of the markup. If the library breaks,
 * the documentation page breaks, which is the point.
 */
const props = withDefaults(
  defineProps<{
    /** Short heading for the example, e.g. 基础示例. */
    title?: string
    /** One line explaining what the example demonstrates. */
    description?: string
    /** Source shown in the code panel. Takes precedence over the `#code` slot. */
    code?: string
    /**
     * Whether the code panel starts open.
     *
     * Closed by default: a page with a dozen examples stays scannable, and the
     * source is one click away instead of pushing the next example off-screen.
     */
    codeOpen?: boolean
    /** Extra class names for the preview surface, for per-example layout. */
    surfaceClass?: string
  }>(),
  { codeOpen: false },
)

const slots = useSlots()
const { strings } = useDocsLocale()

// Destructured at the top level so the template unwraps the refs. These two are
// document-wide, so every frame on the page renders the same value.
const { theme, accent, setTheme, setAccent, reset: resetAppearance } = usePreviewAppearance()

// Density is frame-local: it re-points Component Tokens on this frame's surface
// only, so a page can show standard and compact side by side.
const density = ref<DocsDensity>(DOCS_DENSITY_DEFAULT)

const hasCode = computed(() => Boolean(props.code) || Boolean(slots.code))
const open = ref(props.codeOpen)

function reset() {
  resetAppearance()
  density.value = DOCS_DENSITY_DEFAULT
}
</script>

<template>
  <figure class="preview-frame">
    <figcaption v-if="props.title || props.description" class="preview-frame__caption">
      <strong v-if="props.title" class="preview-frame__title">{{ props.title }}</strong>
      <span v-if="props.description" class="preview-frame__description">
        {{ props.description }}
      </span>
    </figcaption>

    <div class="preview-frame__toolbar">
      <ThemeSwitch :model-value="theme" @update:model-value="setTheme" />
      <AccentSwitch :model-value="accent" @update:model-value="setAccent" />
      <DensitySwitch v-model="density" />
      <YueButton class="preview-frame__reset" size="sm" variant="outline" @click="reset">
        {{ strings.preview.reset }}
      </YueButton>
    </div>

    <!--
      The surface is what density and the preview background apply to, and it is
      the element that carries the token overrides — so the example inside it
      never has to know density exists.
    -->
    <div class="preview-frame__surface" :data-density="density" :class="props.surfaceClass">
      <slot />
    </div>

    <div v-if="hasCode" class="preview-frame__code">
      <button
        type="button"
        class="preview-frame__code-toggle"
        :aria-expanded="open"
        @click="open = !open"
      >
        {{ open ? strings.preview.hideCode : strings.preview.showCode }}
      </button>
      <div v-show="open" class="preview-frame__code-body">
        <slot name="code">
          <pre class="preview-frame__pre"><code>{{ props.code }}</code></pre>
        </slot>
      </div>
    </div>
  </figure>
</template>
