# Input 输入框 · API

`YueInput` 对外只有一份契约：一个 `Props`、一个事件表、两个插槽，以及一条明确的属性路由规则。下面所有内容都是公开 API。

## 导入

```ts
// 命名导出（推荐：打包器只保留用到的组件）
import { YueInput } from '@yue-ui/vue'
import '@yue-ui/vue/style.css'

// 单组件入口
import YueInput from '@yue-ui/vue/input'
import '@yue-ui/vue/input.css'

// 全局注册
import YueUI from '@yue-ui/vue/plugin'
import '@yue-ui/vue/style.css'
```

也可以使用根入口的命名导出，或通过 `@yue-ui/vue/plugin` 全局注册。插件只负责注册组件和提供应用级 `size` 配置，不会引入图标库。

## Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | `string` | `''` | 字段值。始终是字符串，不做隐式数字转换 |
| `size` | `'sm' \| 'md' \| 'lg'` | `YueConfig.size`，默认为 `'md'` | 控制尺寸，与 `YueButton` 共用同一份 `ComponentSize` |
| `type` | `'text' \| 'search' \| 'email' \| 'url' \| 'tel' \| 'password'` | `'text'` | 透传给原生 `type`。注意 `type="search"` 也会走同一套外观重置，见下 |
| `disabled` | `boolean` | `false` | 原生 `disabled`：不可聚焦、不提交 |
| `readonly` | `boolean` | `false` | 原生 `readonly`：可聚焦、可复制、仍会提交 |
| `invalid` | `boolean` | `false` | 设置 `aria-invalid="true"` 并切换错误边界；不渲染错误文案 |
| `placeholder` | `string` | — | 原生占位符。它不能替代 label |
| `clearable` | `boolean` | `false` | 非空且可编辑时显示清空按钮。它是**唯一**的清空入口，见下。无障碍名称来自消息表 |

## 清空入口只有一个

`clearable` 是**唯一**的清空方式。`type="search"` 会走和 `type="text"` 完全相同的外观重置（原生控件上的 `appearance: none`），所以 Chromium 自带的搜索清空按钮不会被保留——它是引擎特有的（Firefox / Safari 没有），无法用 Token 定制，也不会有可访问名称，与 `clearable` 并存时还会出现两个「清空」按钮。

`clearable` 的控件在这几方面是可控的：真 `<button type="button">`、24px 命中区域、独立 hover / focus-visible / forced-colors 样式、可翻译的无障碍名称，以及各引擎一致的行为。

::: tip 这是一条决定，不是副作用
早期版本把「非 `clearable` 的搜索框保留浏览器原生清除控件」写进了注释，并为 `clearable` 加了一条抑制规则。在 Chromium 里两种状态都渲染不出那个按钮，也就是说注释描述的行为并未被验证过。现在契约是明确的：想要清空控件就用 `clearable`；要改回引擎原生按钮，那必须是一次有意的决定，而不是某条 CSS 重置顺带产生的效果。
:::

## 文案与本地化

组件自己渲染的字符串（目前只有清空按钮的无障碍名称）来自 Yue 的 locale catalog，不是组件 Prop。

```ts
import ZhCN from '@yue-ui/vue/locale/zh-CN'

// 整个应用
app.use(YueUI, { locale: 'zh-CN', packs: { 'zh-CN': ZhCN } })

// 或只在某个子树里换语言：一个页面上的两块区域可以各自不同
import { provideLocale } from '@yue-ui/vue/locale'

provideLocale({ locale: 'zh-CN', packs: { 'zh-CN': ZhCN } })
```

| key | `en-US` | `zh-CN` | 用途 |
| --- | --- | --- | --- |
| `input.clear` | `'Clear'` | `'清空'` | `YueInput` 清空按钮的 `aria-label` |

`packs` 与 `messages` 都是**部分覆盖**：只写你要改的键，其余由 fallback 链补齐，不会被清空。默认（fallback）语言是 `en-US`，语言包是独立入口（`@yue-ui/vue/locale/zh-CN`），不导入就不会被打包。

完整说明——fallback 链、缺失 key 的诊断、`YueLocaleProvider`、外部 adapter、复数与 `Intl` 格式化——见[国际化指南](/guide/i18n)。

::: tip 为什么不是 `clearLabel` 这样的 Prop
一条文案一个 Prop 只服务声明它的那个组件，必须在每个调用点重复一次，而且把「翻译」变成了「改标记」——每种语言都要改一遍模板。locale catalog 把文案集中到一处，组件也就不知道自己被翻译了。
:::

## Emits

| 事件 | 载荷 | 说明 |
| --- | --- | --- |
| `update:modelValue` | `string` | `v-model` 的双向绑定载荷 |
| `input` | `Event`（`type` 恒为 `'input'`） | 用户输入造成的值变化；输入法组合期间不触发 |
| `change` | `Event` | 原生 `change`，原样转发 |
| `focus` | `FocusEvent` | 原生 `focus`，原样转发 |
| `blur` | `FocusEvent` | 原生 `blur`，原样转发 |
| `clear` | — | 清空按钮清空字段后触发，与 `update:modelValue` 同时发出 |

`change`、`focus`、`blur` 转发的是**原始 DOM 事件**，所以 `event.target`、`event.currentTarget` 和修饰键都仍然可用。

`input` 是唯一一个**不保证逐字转发**的，这是刻意的：通过输入法产生的值在组合结束时发布，而携带它的那个事件可能是 `compositionend`——那根本不是输入事件。所以 `input` 收到的载荷**永远是 `type === 'input'`、且有真实 `target` 的 DOM 事件**：

- 组合期间浏览器为**最终值**发过 `input` → 转发那一个真实事件（`data`、`inputType`、`isComposing` 都来自浏览器）；
- 否则 → **派发**一个合成的 `InputEvent`（`inputType: 'insertCompositionText'`）。它是真正 dispatch 出去的，所以 `target` / `currentTarget` 就是内部 `<input>`，而不是在旁边造一个没有 `target` 的对象。

**绝不转发组合中途的事件。** Chrome / Safari 的顺序下，`compositionend` 到来时最近的那个 `input` 携带的还是中间文本（比如 `zhong`），转发它会让 `data` 描述一个已经过时的值。判断依据是「那个事件被派发时的值是否仍是控件当前的值」。

合成事件的 `data` 是 `null`：组件知道最终值，但不知道输入法插入的那一段文本，编一个 delta 比留空更糟。`event.target.value` 与 `update:modelValue` 在两种情况下都是最终值。

::: tip 组合输入（IME）期间不提交中间值
输入法组合过程中的 `input` 事件带的是半成品字符串。提交它会让父组件用中间值重渲染字段，从而打断候选词选择。`YueInput` 在 `compositionstart` 与 `compositionend` 之间不发出 `update:modelValue`，在 `compositionend` 时一次性提交。

**一次组合只提交一次**，无论引擎的先后顺序如何：Chrome / Safari 先 `compositionend` 再 `input`，Firefox（以及 CDP 驱动的 Chromium）则在组合仍然打开时先发最终 `input`、再发 `compositionend`。两条路径都能提交，而**值没变就不提交**——所以重复到达的那一次是空操作，而不是第二次事件。发布用的载荷也始终是 `input` 事件，见上表。
:::

::: warning 字段持有自己的值
`YueInput` 不是「完全受控」组件：字段自己持有当前值，`modelValue` 是**外部**的变化来源。具体来说：

- 用户输入 → 组件更新自身值并发 `update:modelValue`；
- 父组件改了 `modelValue`（且与字段当前值不同）→ 组件采用它并写入控件；
- 父组件重渲染但 `modelValue` 没变 → 什么都不做，不会把旧值写回。

因此 `clearable` 的按钮**不需要**父组件响应 `update:modelValue` 也会正确消失：按钮可见性和控件内容读的是同一个值。这也是为什么下面的清空示例在没有双向绑定时依然表现正常。

组合输入期间父组件推来的新值会被推迟到组合结束——用户的输入优先，与 Vue 自带的 `v-model` 一致。
:::

## Slots

| 插槽 | 位置 | 说明 |
| --- | --- | --- |
| `prefix` | 输入框之前，边框之内 | 装饰内容。图标请自行标记 `aria-hidden="true"` |
| `suffix` | 清空按钮之后，边框之内 | 装饰内容，或消费者自己的控件（如明文切换） |

插槽内容由组件按 `--input-icon-size-*` 统一尺寸，所以内联 SVG 不写 `width` 也不会撑破布局。插槽**不产生焦点目标**，也不改变值、选区或键盘行为。

## 原生属性路由

`YueInput` 使用 `inheritAttrs: false`，把属性**显式**分派到两个元素之一。这是公开契约的一部分：

| 属性 | 落在 | 原因 |
| --- | --- | --- |
| `id`、`name`、`autocomplete`、`inputmode`、`required`、`maxlength`、`minlength`、`pattern`、`aria-*`、`role` | 内部 `<input>` | 表单控件语义；放在 `<div>` 上不生效 |
| `class`、`style`、`data-*` | 外层 `.yue-input` | 组件整体的身份、样式和测试钩子 |
| `dir` | 外层 `.yue-input` | 它是**布局**属性：排布前后置内容的是外层，控件从外层继承方向。若把它留在 `<input>` 上，字段里的文字会镜像而前后置内容仍按原顺序排列——一个「半个 RTL」的字段。`lang` 不在此列：它关系到文字本身，因此留在控件上 |

因此下面这些都直接可用，不需要任何 Yue 专有 Prop：

```html
<label for="email">邮箱</label>
<YueInput
  id="email"
  name="email"
  type="email"
  autocomplete="email"
  inputmode="email"
  required
  maxlength="64"
  minlength="3"
  pattern=".+@.+"
  aria-describedby="email-hint"
  class="order-form__field"
  data-testid="email"
/>
<p id="email-hint">用于接收登录链接。</p>
```

## DOM 契约

```html
<div class="yue-input yue-input--md">          <!-- 字段：边框、填充、内边距、焦点环 -->
  <span class="yue-input__prefix">…</span>
  <input class="yue-input__native" />           <!-- 真正的表单控件 -->
  <button class="yue-input__clear" type="button" aria-label="清空" />
  <span class="yue-input__suffix">…</span>
</div>
```

外层 `<div>` **不是控件**：它不可聚焦、不持有值、不参与提交，也没有 `role`。所有原生语义都在 `__native` 上，`label for`、`form`、`:invalid` 和自动填充因此照常工作。

类名清单：

| 类名 | 出现条件 |
| --- | --- |
| `yue-input` | 始终 |
| `yue-input--sm` / `--lg` | 对应 `size`；`md` 是基础块，不加修饰类 |
| `yue-input__native` | 始终 |
| `yue-input__prefix` / `__suffix` | 对应插槽有内容时 |
| `yue-input__clear` | `clearable` 且非空且可编辑时 |
| `is-disabled` / `is-readonly` / `is-invalid` | 对应 Prop 为真时 |

## CSS Token

组件规则只读取 `--input-*` 组件 Token。想改外观就重指 Token，不必覆盖选择器：

| Token | 消费者 | 是否门禁 |
| --- | --- | --- |
| `--input-background` / `-readonly` / `-disabled` | 三种可编辑性状态的填充 | 只读文字 ≥ 4.5:1 |
| `--input-color` / `--input-color-disabled` / `--input-placeholder-color` | 文字、禁用文字、占位符 | 前两者门禁；禁用态豁免，仅报告 |
| `--input-border-color` / `-hover` / `-focus` / `-invalid` / `-disabled` | 边框的五个状态 | 全部 ≥ 3:1 |
| `--input-border-width` / `--input-border-radius` | 边框几何 | — |
| `--input-height-*` / `--input-padding-inline-*` / `--input-font-size-*` | 尺寸档位 | — |
| `--input-gap` / `--input-icon-size-*` / `--input-affix-color` | 前后置内容 | 前置后置文字 ≥ 4.5:1 |
| `--input-focus-ring-color` / `-width` / `-offset` | 焦点环 | 焦点边界 ≥ 3:1 |
| `--input-clear-color` / `-color-hover` / `-hit-size` / `-border-radius` / `-glyph-width` | 清空控件 | 控件 ≥ 3:1 |
| `--input-duration` / `--input-ease` | 过渡 | `prefers-reduced-motion` 下由 Token 归零 |

```css
/* 让某个表单区域里的输入框更紧凑：重指组件 Token，不要写 !important */
.checkout-form {
  --input-height-md: var(--size-28);
  --input-padding-inline-md: var(--space-8);
}
```

::: warning 禁用态不承诺 WCAG 对比度
`disabled` 控件在 WCAG 1.4.3 里是明确豁免的，本设计系统的禁用态也是刻意安静的：实测浅色 2.20:1、深色 3.19:1。审计**测量并打印**这个数字，但不把它当门禁——定一个体系并不打算满足的阈值，比不测更糟。
:::

## 尺寸类型的唯一来源

`YueInputSize` 是包内唯一 `ComponentSize` 的别名，`YueButtonSize` 也是：

```ts
import type { ComponentSize } from '@yue-ui/vue'
```

包内只有一处声明（`packages/vue/src/shared/size.ts`），并由 `size.test.ts` 在编译期断言它与 `@yue-ui/hooks` 的 `ComponentSize` 一致、且没有第二个联合类型被写出来。

## 无障碍清单

| 要求 | 实现 |
| --- | --- |
| 可访问名称 | 由 `label for`、`aria-label` 或 `aria-labelledby` 提供；`id` 落在真正的 `<input>` 上 |
| 描述与错误 | `aria-describedby` 透传；错误文案由 `YueField` 负责 |
| 校验状态 | `invalid` → `aria-invalid="true"`；有效时该属性**不存在**（不是 `"false"`） |
| 不可编辑 | 原生 `disabled` / `readonly`，不额外添加 `aria-disabled` / `aria-readonly` 造成第二真相 |
| 清空控件 | 真 `<button type="button">`，有 `aria-label`，24px 命中区域，独立 hover / focus-visible / forced-colors 样式 |
| 焦点可见 | `:focus-visible` 画焦点环，不依赖颜色变化作为唯一提示 |
| 装饰图标 | 由调用方标记 `aria-hidden="true"`；交互控件不放进装饰 span |
| 强制颜色模式 | 系统颜色替换 Token；错误状态同时由 `aria-invalid` 承载，不只靠色相 |
| 动效偏好 | `prefers-reduced-motion: reduce` 下 `--input-duration` 解析为 `0ms` |
