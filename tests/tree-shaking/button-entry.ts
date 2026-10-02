/**
 * Tree-shaking consumer — single-component entry.
 *
 * This is the path a consumer takes when they want one component and nothing
 * else. Mounting (rather than re-exporting) is what forces the bundler to keep
 * the component: a bare `export { YueButton }` would be dropped as unused even
 * when the entry is correct, and the test would then pass for the wrong reason.
 */
import { createApp, h } from 'vue'
import YueButton from '@yue-ui/vue/button'
import '@yue-ui/vue/button.css'

createApp({
  render: () => h(YueButton, { theme: 'primary' }, { default: () => '保存' }),
}).mount('#app')
