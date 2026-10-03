/**
 * `zh-CN` — the Chinese language pack.
 *
 * Imported as `@yue-ui/vue/locale/zh-CN`, never from the root entry: an application that
 * shows English should not download Chinese strings, and the reverse is equally true.
 *
 * `satisfies YueLocaleMessages` keeps this pack structurally identical to `en-US`.
 */
import type { YueLocaleMessages } from './catalog'

export const zhCN = {
  input: {
    clear: '清空',
  },
} satisfies YueLocaleMessages

export default zhCN
