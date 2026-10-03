/**
 * Tree-shaking consumer — single-component entry, second component.
 *
 * The mirror of `button-entry.ts`, and the half of the claim that only becomes
 * checkable once there are two components: importing `@yue-ui/vue/input` must not pull
 * `YueButton` in, and importing `@yue-ui/vue/button` must not pull `YueInput` in. With
 * one component, "the single-component entry is minimal" was untestable — there was
 * nothing else it could have dragged along.
 */
import { createApp, h } from 'vue'
import YueInput from '@yue-ui/vue/input'
import '@yue-ui/vue/input.css'

createApp({
  render: () => h(YueInput, { placeholder: '搜索', clearable: true }),
}).mount('#app')
