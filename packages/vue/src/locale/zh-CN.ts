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
  tag: {
    closeLabel: '移除标签',
  },
  dialog: {
    confirm: '确定',
    cancel: '取消',
    closeLabel: '关闭对话框',
  },
} satisfies YueLocaleMessages

export default zhCN
