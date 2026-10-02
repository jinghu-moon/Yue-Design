/**
 * Tree-shaking consumer — full-registration entry.
 *
 * The mirror image of `button-entry.ts`: everything is registered globally, so
 * this build is expected to contain the plugin's registry and the install path.
 */
import { createApp, h } from 'vue'
import YueUI from '@yue-ui/vue/plugin'
import '@yue-ui/vue/style.css'

createApp({ render: () => h('div') })
  .use(YueUI)
  .mount('#app')
