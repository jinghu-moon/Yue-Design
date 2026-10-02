# @snapclip/vue

SnapClip 的 Vue 3 组件包。

**状态：构建管线与包导出已就绪，组件尚未开始迁移。** 第一个组件是 `DsButton`。

## 消费方式

```ts
import { DsButton } from '@snapclip/vue'
import '@snapclip/vue/style.css'
```

```js
// Token 必须先加载：它声明了 @layer 顺序
import '@snapclip/design-tokens/index.css'
import '@snapclip/vue/style.css'
```

## 构建产物

| 文件 | 说明 |
| --- | --- |
| `dist/index.js` | ESM，`vue` 为 external |
| `dist/index.d.ts` | 由 `vue-tsc` 生成（`tsconfig.build.json`） |
| `dist/style.css` | 发布为 `@snapclip/vue/style.css` |

样式表**不打包** `@snapclip/design-tokens`：Token 与组件是两个独立发布的包，
消费方各自显式引入。

## 组件约定

- BEM 类名：`.ds-button`、`.ds-button--primary`、`.ds-button__leading`
- 只消费 Component Token（`--button-*`），不写原始色板
- **不使用 `scoped`**：样式全局生效，外部才能覆写和主题化
- 所有规则写在 `@layer implementations { … }` 内
- 图标通过 `#leading` / `#trailing` 插槽传入，不绑定图标库
