import DefaultTheme from 'vitepress/theme'
import { useTokenAppearance } from './useTokenAppearance'
import '@snapclip/design-tokens/index.css'
import './custom.css'

export default {
  extends: DefaultTheme,
  setup() {
    useTokenAppearance()
  },
}
