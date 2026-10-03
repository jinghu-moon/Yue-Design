# @yue-ui/vue

Yue 的 Vue 3 组件包。当前包含 Button 族（`YueButton`、`YueButtonGroup`、`YueButtonToggle`、`YueButtonToggleItem`）和 `YueInput`。

## 消费方式

三个入口，各管一件事：

```ts
// 单组件入口：default 就是组件本身，不引入插件
import YueButton from '@yue-ui/vue/button'
import { YueButtonGroup, YueButtonToggle, YueButtonToggleItem } from '@yue-ui/vue/button'
import '@yue-ui/vue/button.css' // Button 族四个组件共用这一份样式

import YueInput from '@yue-ui/vue/input'
import '@yue-ui/vue/input.css'

// 根入口：只做命名导出，不注册任何组件
import { YueButton, YueButtonGroup, YueButtonToggle, YueButtonToggleItem, YueInput } from '@yue-ui/vue'
import '@yue-ui/vue/style.css'

// 全量注册：唯一会调用 app.component() 的入口
import { createApp } from 'vue'
import YueUI from '@yue-ui/vue/plugin'
import '@yue-ui/vue/style.css'

createApp(App).use(YueUI, { size: 'md' }).mount('#app')
```

单组件入口之间互相隔离：引入 `@yue-ui/vue/input` 不会带进 Button 族，反之亦然。
`pnpm verify:treeshaking` 在两个方向上都会断言这一点，`pnpm verify:tarball` 则在真实
安装产物上再验证一次。

样式必须显式引入，并且在 Token 之后：

```js
import '@yue-ui/design-tokens/index.css' // 先：声明层顺序与 Token 值
import '@yue-ui/vue/style.css'           // 后：组件规则
```

组件 JS 不导入任何 CSS，所以 ESM 入口在 Node / SSR 下也能直接解析，级联顺序留在你自己的源码里可见。

## 语言（locale）

组件的用户可见文案来自 locale catalog，而不是组件 Prop。默认只有一套英文包随根入口发布，
其它语言按子路径单独引入：

```ts
import { createApp } from 'vue'
import YueUI from '@yue-ui/vue/plugin'
import zhCN from '@yue-ui/vue/locale/zh-CN' // 语言包是数据入口，不带任何组件代码

createApp(App).use(YueUI, { locale: 'zh-CN', packs: { 'zh-CN': zhCN } }).mount('#app')
```

局部切换用 `provideLocale()` 包住子树即可（`YueLocaleProvider` 是它的组件形式）；`useLocale()`
给应用自己的代码读同一份 locale。`fallback` 默认 `en-US`，缺失 key 会走
`zh-Hans-CN → zh-CN → zh → en-US` 这条链，并留下一条可排空的诊断。

已装 `vue-i18n` 的应用不必改用这套机制：把 composer 适配成 `{ current, t }` 传给
`provideLocale({ adapter })` 即可，`@yue-ui/vue` 的基础导出里不会出现 `vue-i18n`。参考实现见仓库
`apps/docs/.vitepress/theme/adapters/vue-i18n.ts`。

## 构建产物

| 文件 | 发布为 | 说明 |
| --- | --- | --- |
| `dist/index.js` | `@yue-ui/vue` | ESM，命名导出 |
| `dist/plugin.js` | `@yue-ui/vue/plugin` | 全量注册插件 |
| `dist/components/button/index.js` | `@yue-ui/vue/button` | 单组件入口（Button 族），`default` 是 `YueButton` |
| `dist/components/input/index.js` | `@yue-ui/vue/input` | 单组件入口，`default` 导出 |
| `dist/*.d.ts` | 同上（`types` 条件） | 由 `vue-tsc` 生成，与入口路径一一对应 |
| `dist/style.css` | `@yue-ui/vue/style.css` | 全部组件样式 |
| `dist/components/button/style.css` | `@yue-ui/vue/button.css` | Button 族的全部样式（含分组） |
| `dist/components/input/style.css` | `@yue-ui/vue/input.css` | 只有 Input 的样式 |
| `dist/locale/index.js` | `@yue-ui/vue/locale` | locale 运行时（`useLocale` / `provideLocale` / `createYueLocale` / `YueLocaleProvider`） |
| `dist/locale/en-US.js` | `@yue-ui/vue/locale/en-US` | 默认语言包（根入口只带这一份） |
| `dist/locale/zh-CN.js` | `@yue-ui/vue/locale/zh-CN` | 中文语言包，纯数据 |

- `vue` 是唯一 external：宿主提供运行时，包不重复打包框架。
- `@yue-ui/hooks` 在构建时编译进来，并作为 `devDependency`，因此发布物除了 `vue` 之外没有运行时依赖 —— 消费 `@yue-ui/vue` 不需要额外安装任何 `@yue-ui/*` 包。
- 样式表**不打包** `@yue-ui/design-tokens`：Token 与组件是两个独立发布的包，消费方各自显式引入。

## 组件约定

- BEM 类名：`.yue-button`、`.yue-button--primary`、`.yue-button__icon`、`.yue-button__loader`、`.yue-button-group`、`.yue-input__native`
- 只消费自己的 Component Token（`--button-*`、`--input-*`），不写裸色值，不直接读 primitive Token
- **不使用 `<style scoped>`**：样式全局生效，外部才能覆写和主题化
- **组件规则不放进任何 `@layer`**。无层样式优先于所有层，把组件放进层里，宿主的无层重置（VitePress 的 `button` 重置、Tailwind Preflight、normalize.css）就会赢过它。Token 的层顺序仍然有效，覆写请重指 Component Token
- 尺寸只使用 `packages/vue/src/shared/size.ts` 里唯一的 `ComponentSize`；各组件用 `YueButtonSize` / `YueInputSize` 这样的别名，不再写第二份 `'sm' | 'md' | 'lg'`
- 图标通过插槽传入（Button 是 `#leading` / `#trailing` / `#loader`，Input 是 `#prefix` / `#suffix`），不绑定图标库
- 分组与选择分开建模：`YueButtonGroup` 只合并圆角并给出 `role="group"`，`YueButtonToggle` 持有 `v-model`，`YueButtonToggleItem` 负责「一个值 = 一个按钮」。选择逻辑不在 `YueButton` 里
- `YueInput` 用 `inheritAttrs: false` 把属性显式分派：`class` / `style` / `data-*` 落在组件根（外层 `div`），其余原生属性落在真正的 `<input>` 上
- 用户可见文案只走 locale catalog（`useLocale().t('input.clear')`），组件里不出现硬编码文案，也不为某个字符串开一个 Prop；`corepack pnpm audit:i18n` 会检查这一点
