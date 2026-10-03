<script setup lang="ts">
import { useNamespace } from '@yue-ui/hooks'
import type { YueButtonGroupProps } from './types'

/**
 * `YueButtonGroup` — structure, and nothing else.
 *
 * It joins the corners of the buttons it contains and gives them a `role="group"` so
 * assistive technology can announce the set as a set. It deliberately has no `theme`,
 * `variant` or `size`: a group is not a way to set eight props at once, and the design
 * system already has a mechanism for "this whole region uses a smaller, denser button" —
 * re-point the `--button-*` Component Tokens on a container (the documentation's density
 * switch does exactly that). A prop that forwards other props would be a second, worse
 * spelling of that.
 *
 * Selection is *not* part of a group: `YueButtonGroup` has no `v-model` and no value.
 * That is `YueButtonToggle`.
 */
defineOptions({
  name: 'YueButtonGroup',
})

const props = withDefaults(defineProps<YueButtonGroupProps>(), {
  vertical: false,
})

const ns = useNamespace('button-group')

/**
 * Why `role` is a binding and not a plain attribute: an attribute the consumer passes falls
 * through and wins, so a toolbar that needs a different role can say so without a second
 * component.
 *
 * (The note lives here rather than in the template: an HTML comment in a template is a real
 * node, and one at the top level turns a single-root component into a fragment — which
 * `mount().element` and, more importantly, an attribute-fallthrough contract both notice.)
 */
</script>

<template>
  <div :class="[ns.b(), { [ns.m('vertical')]: props.vertical }]" role="group">
    <slot />
  </div>
</template>
