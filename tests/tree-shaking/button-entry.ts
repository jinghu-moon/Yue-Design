/**
 * Tree-shaking consumer — single-component entry.
 *
 * This is the path a consumer takes when they want one component and nothing
 * else. Mounting (rather than re-exporting) is what forces the bundler to keep
 * the component: a bare `export { YueButton }` would be dropped as unused even
 * when the entry is correct, and the test would then pass for the wrong reason.
 *
 * The whole Button *family* is mounted, not just the button: `@yue-ui/vue/button` is one
 * entry, one graph and one stylesheet, and a check that only ever used `YueButton` would
 * pass even if the group, the toggle and the item had been dropped from the entry.
 */
import { createApp, h, ref } from 'vue'
import YueButton, {
  YueButtonGroup,
  YueButtonToggle,
  YueButtonToggleItem,
} from '@yue-ui/vue/button'
import '@yue-ui/vue/button.css'

createApp({
  setup() {
    const align = ref('left')
    return () =>
      h('div', [
        h(YueButton, { theme: 'primary' }, { default: () => '保存' }),
        h(YueButtonGroup, { 'aria-label': '对齐方式' }, {
          default: () => h(YueButton, { variant: 'outline' }, { default: () => '左' }),
        }),
        h(
          YueButtonToggle,
          {
            'aria-label': '对齐方式',
            modelValue: align.value,
            'onUpdate:modelValue': (value) => {
              align.value = value
            },
          },
          {
            default: () =>
              h(YueButtonToggleItem, { value: 'left', variant: 'outline' }, { default: () => '左' }),
          },
        ),
      ])
  },
}).mount('#app')
