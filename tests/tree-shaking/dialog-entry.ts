import { createApp, h, ref } from 'vue'
import YueDialog from '@yue-ui/vue/dialog'
import '@yue-ui/vue/dialog.css'

const open = ref(true)

createApp({
  render: () =>
    h(
      YueDialog,
      {
        modelValue: open.value,
        'onUpdate:modelValue': (value: boolean) => (open.value = value),
        title: 'Sign out',
        description: 'Are you sure?',
      },
      { default: () => h('p', 'Body') },
    ),
}).mount('#app')
