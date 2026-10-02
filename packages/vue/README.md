# @yue-ui/vue

Yue 的 Vue 3 组件包。当前包含 `YueButton`。

## 消费方式

三个入口，各管一件事：

```ts
// 单组件入口：default 就是 YueButton，不引入插件
import YueButton from '@yue-ui/vue/button'
import '@yue-ui/vue/button.css'

// 根入口：只做命名导出，不注册任何组件
import { YueButton } from '@yue-ui/vue'
import '@yue-ui/vue/style.css'

// 全量注册：唯一会调用 app.component() 的入口
import { createApp } from 'vue'
import YueUI from '@yue-ui/vue/plugin'
import '@yue-ui/vue/style.css'

createApp(App).use(YueUI, { size: 'md' }).mount('#app')
```

样式必须显式引入，并且在 Token 之后：

```js
import '@yue-ui/design-tokens/index.css' // 先：声明层顺序与 Token 值
import '@yue-ui/vue/style.css'           // 后：组件规则
```

组件 JS 不导入任何 CSS，所以 ESM 入口在 Node / SSR 下也能直接解析，级联顺序留在你自己的源码里可见。

## 构建产物

| 文件 | 发布为 | 说明 |
| --- | --- | --- |
| `dist/index.js` | `@yue-ui/vue` | ESM，命名导出 |
| `dist/plugin.js` | `@yue-ui/vue/plugin` | 全量注册插件 |
| `dist/components/button/index.js` | `@yue-ui/vue/button` | 单组件入口，`default` 导出 |
| `dist/*.d.ts` | 同上（`types` 条件） | 由 `vue-tsc` 生成，与入口路径一一对应 |
| `dist/style.css` | `@yue-ui/vue/style.css` | 全部组件样式 |
| `dist/components/button/style.css` | `@yue-ui/vue/button.css` | 只有 Button 的样式 |

- `vue` 是唯一 external：宿主提供运行时，包不重复打包框架。
- `@yue-ui/hooks` 在构建时编译进来，并作为 `devDependency`，因此发布物除了 `vue` 之外没有运行时依赖 —— 消费 `@yue-ui/vue` 不需要额外安装任何 `@yue-ui/*` 包。
- 样式表**不打包** `@yue-ui/design-tokens`：Token 与组件是两个独立发布的包，消费方各自显式引入。

## 组件约定

- BEM 类名：`.yue-button`、`.yue-button--primary`、`.yue-button__icon`
- 只消费自己的 Component Token（`--button-*`），不写裸色值，不直接读 primitive Token
- **不使用 `<style scoped>`**：样式全局生效，外部才能覆写和主题化
- **组件规则不放进任何 `@layer`**。无层样式优先于所有层，把组件放进层里，宿主的无层重置（VitePress 的 `button` 重置、Tailwind Preflight、normalize.css）就会赢过它。Token 的层顺序仍然有效，覆写请重指 Component Token
- 图标通过 `#leading` / `#trailing` 插槽传入，不绑定图标库
