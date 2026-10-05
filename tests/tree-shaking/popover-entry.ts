import { createApp, h } from 'vue'
import YuePopover from '@yue-ui/vue/popover'
import '@yue-ui/vue/popover.css'

createApp({
  render: () => h(YuePopover, { defaultOpen: true, 'aria-label': 'More actions' }, {
    trigger: ({ props }) => h('button', { ...props, type: 'button' }, 'Open'),
    default: () => h('div', 'Content'),
  }),
}).mount('#app')
