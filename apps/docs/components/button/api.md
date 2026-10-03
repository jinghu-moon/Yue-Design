# Button 按钮 API

这一页只描述 Button 组件族的可消费接口。可运行的真实组件示例见[示例](/components/button)；结构解剖见示例页的[组件解剖](/components/button#组件解剖-anatomy)；使用场景、主次关系和无障碍决策见[指南](./guide)。

Button 族有四个组件，各自只负责一件事：

| 组件 | 作用 |
| --- | --- |
| `YueButton` | 单个按钮。**不认识任何分组** |
| `YueButtonGroup` | 把若干按钮拼成一组：合并圆角、给出 `role="group"` |
| `YueButtonToggle` | 在分组之上持有 `v-model`，负责「选中了哪一个」 |
| `YueButtonToggleItem` | 一个**就是某个值**的按钮：读分组的选择，渲染成一个按钮 |

## 引入

```ts
// 单组件入口：default 就是 YueButton，其余三个是命名导出
import YueButton, { YueButtonGroup, YueButtonToggle, YueButtonToggleItem } from '@yue-ui/vue/button'
import '@yue-ui/design-tokens/index.css'
import '@yue-ui/vue/button.css'

// 或者从根入口按名导入
import { YueButton, YueButtonGroup, YueButtonToggle, YueButtonToggleItem } from '@yue-ui/vue'
```

也可以使用 `@yue-ui/vue/plugin` 全局注册。插件负责注册组件、提供应用级配置，并且不会引入图标库。

## YueButton

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `theme` | `'default' \| 'primary' \| 'success' \| 'warning' \| 'danger'` | `'default'` | 语义色角色 |
| `variant` | `'solid' \| 'outline' \| 'dashed' \| 'text' \| 'link'` | `'solid'` | 绘制方式和强调级别 |
| `size` | `'sm' \| 'md' \| 'lg'` | `YueConfig.size`，默认为 `'md'` | 当前按钮的尺寸 |
| `shape` | `'square' \| 'round' \| 'circle'` | `'square'` | 圆角形态；`circle` 用于图标按钮 |
| `disabled` | `boolean` | `false` | 真正禁用：原生按钮用 `disabled`，其他标签用 `aria-disabled="true"` + `tabindex="-1"` |
| `loading` | `boolean` | `false` | 阻止激活、设置 `aria-busy="true"`；**不改** `aria-disabled`、**不改** Tab 顺序，内容保持原位，加载层覆盖在上面 |
| `block` | `boolean` | `false` | 填满父容器的行内宽度 |
| `nativeType` | `'button' \| 'submit' \| 'reset'` | `'button'` | 仅在 `tag="button"` 时应用 |
| `active` | `boolean \| undefined` | `undefined` | 独立开关按钮的选中态：写 `aria-pressed`，并加上 `is-active` 视觉状态 |
| `tag` | `string \| Component` | `'button'` | 自定义渲染标签或组件 |

`theme` / `variant` / `size` / `shape` / `disabled` / `loading` / `block` / `nativeType` 这八项定义在 `YueButtonSharedProps` 里：它们是「按钮」这件事本身，`YueButtonToggleItem` 继承同一份声明，因此两者的名字和含义不可能各自漂移。`active` 与 `tag` 只属于 `YueButton`。

`active` 的三态是有意的：

- 不传（`undefined`）＝「这不是开关按钮」，**不输出任何 `aria-pressed`**；
- `false` ＝「这是一个开关按钮，当前未选中」，输出 `aria-pressed="false"`；
- `true` ＝ 选中，输出 `aria-pressed="true"` 并加上 `is-active`。

只有「几个按钮必须对一个值达成一致」时才需要 `YueButtonToggle`；一组互不相关的开关按钮用 `YueButtonGroup` + 各自的 `active` 即可。

### Slots

| 插槽 | 内容 | 行为 |
| --- | --- | --- |
| `default` | 按钮标签 | 渲染到 `.yue-button__label` |
| `leading` | 前置内容，通常是图标 | loading 时留在原位并被隐藏，不会被顶替 |
| `trailing` | 后置内容，通常是图标 | loading 时留在原位并被隐藏 |
| `loader` | 自定义加载指示器 | 替代默认 spinner，渲染在固定的加载层里 |

图标资源由消费方提供。Yue 不打包图标字体、SVG 集合或 CDN；尺寸和可访问性规则见[图标指南](/design/icon)。

### Events

| 事件 | 载荷 | 触发条件 |
| --- | --- | --- |
| `click` | `MouseEvent` | 仅当 `disabled` 和 `loading` 都为 `false` |

### 透传属性

`class`、`style`、`id`、`aria-*`、`data-*` 等非 prop 属性一律透传到根元素。`inheritAttrs: false` 是刻意的：Vue 默认把 `$attrs` 追加在组件自身绑定**之后**，一个随手写下的 `aria-busy="false"` 就能覆盖组件正在表达的状态，所以这里由组件自己决定谁优先。

## YueButtonGroup

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `vertical` | `boolean` | `false` | 纵向排列，而不是横向一行 |

分组只做结构：合并圆角、压掉相邻边框的重叠、给出一层 `role="group"`。它**没有** `theme` / `variant` / `size`：把八个 prop 一次转发的「分组」是同一件事的第二种、更差的写法，而「这一片区域的按钮更紧凑」在 Yue 里已有机制——在容器上重指 `--button-*` Component Token（示例页的**紧凑**密度就是这么做的）。

根元素默认 `role="group"`，但它是绑定而不是写死的属性，因此消费方传入的 `role` 会覆盖它（工具栏可以写 `role="toolbar"`）。

### Slots

| 插槽 | 内容 | 行为 |
| --- | --- | --- |
| `default` | 组内按钮 | 只有 `.yue-button` 会被当作组内项合并圆角 |

## YueButtonToggle

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | `string \| number \| null` | `null` | 当前选中的值；`null` 表示尚未选择 |
| `disabled` | `boolean` | `false` | 禁用组内所有项 |
| `vertical` | `boolean` | `false` | 纵向排列，透传给内部的 `YueButtonGroup` |

选择是**强制**的：再次点击已经选中的项不会取消选择。分段控件回答的是「这几个里哪一个是当前」，没有选中项的状态回答不了这个问题；「可以全部关掉」的一组按钮应该用 `YueButtonGroup` + 每个 `YueButton` 自己的 `active`。

分组本身没有文字，可访问名称必须由消费方提供：请传 `aria-label`，或用 `aria-labelledby` 指向可见文字。开发模式下缺失会收到一条解释性警告。

键盘上的方向键导航与 roving tabindex **尚未实现**，项当前是普通的 Tab 停靠点。这是有意的半成品边界：只改 tab 顺序而不提供方向键，比不做更糟。

### Slots

| 插槽 | 内容 | 行为 |
| --- | --- | --- |
| `default` | `YueButtonToggleItem` | 渲染进内部分组 |

### Events

| 事件 | 载荷 | 触发条件 |
| --- | --- | --- |
| `update:modelValue` | `string \| number` | 激活了另一个未被选中的项 |

## YueButtonToggleItem

`YueButtonToggleItem` 接受 `YueButtonSharedProps` 的全部 props——`theme`、`variant`、`size`、`shape`、`disabled`、`loading`、`block`、`nativeType`——再加上下面这一项。它不重复声明这些名字，而是 `extends` 同一份接口，因此「按钮能接受的，项也能接受」是类型层面的事实，而不是需要人工同步的清单。

`active` 与 `tag` 被有意排除：选中态由分组推导，而项必须渲染一个平台能按下的控件，所以它始终是 `<button>`。

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `value` | `string \| number` | —（必填） | 这一项代表的值 |
| `theme` | `'default' \| 'primary' \| 'success' \| 'warning' \| 'danger'` | `'default'` | 语义色角色，来自 `YueButtonSharedProps` |
| `variant` | `'solid' \| 'outline' \| 'dashed' \| 'text' \| 'link'` | `'solid'` | 绘制方式，来自 `YueButtonSharedProps` |
| `size` | `'sm' \| 'md' \| 'lg'` | `YueConfig.size` | 尺寸，来自 `YueButtonSharedProps` |
| `shape` | `'square' \| 'round' \| 'circle'` | `'square'` | 圆角形态，来自 `YueButtonSharedProps` |
| `disabled` | `boolean` | `false` | 只禁用这一项；分组 `disabled` 会禁用全部 |
| `loading` | `boolean` | `false` | 该项加载中：阻止激活，但不改变选中态 |
| `block` | `boolean` | `false` | 填满容器宽度 |
| `nativeType` | `'button' \| 'submit' \| 'reset'` | `'button'` | 原生 `type` |

### Slots

| 插槽 | 内容 | 行为 |
| --- | --- | --- |
| `default` | 标签 | 渲染到 `.yue-button__label` |
| `leading` | 前置内容，通常是图标 | 透传给内部按钮 |
| `trailing` | 后置内容，通常是图标 | 透传给内部按钮 |
| `loader` | 自定义加载指示器 | 透传给内部按钮 |

`click` 等事件来自内部 `YueButton`：监听器通过属性透传到达它，因此 `@click` 仍然有效。声明的事件只有分组上的 `update:modelValue`。

## 应用级配置

```ts
import YueUI from '@yue-ui/vue/plugin'
import ZhCN from '@yue-ui/vue/locale/zh-CN'

app.use(YueUI, { size: 'sm', locale: 'zh-CN', packs: { 'zh-CN': ZhCN } })
```

| 配置项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 组件未传 `size` 时的回落值 |

`YueConfig` 只有这一项：**尺寸是组件选项，语言不是。** 语言（`locale`、`packs`、`messages`、`adapter`）由插件转交给 locale 实例，与尺寸各自独立——子树换语言不会顺手改掉尺寸，反之亦然。

优先级永远是：应用默认值 → 子树 `provideYueConfig()` / `provideLocale()` 覆盖 → 组件自己的 prop。

不支持运行时 `prefix` 或 `namespace`，因为类名和预构建 CSS 必须保持一致。

语言的完整契约（语言包子路径、fallback 链、缺失 key 诊断、外部 adapter）见[国际化指南](/guide/i18n)；key 清单见该页的 `input.clear`。

## CSS 入口

```ts
import '@yue-ui/design-tokens/index.css' // 必须先加载
import '@yue-ui/vue/button.css'           // 只加载 Button 族（四个组件共用这一份）
// 或：import '@yue-ui/vue/style.css'      // 加载全部组件样式
```

组件 CSS 使用公开 BEM 类名：`.yue-button`、`.yue-button--primary`、`.yue-button__icon`、`.yue-button__loader`、`.yue-button-group`。组件不使用 `scoped` 样式，主题化应优先重指 `--button-*` Component Token。

## Token 映射

| 类别 | Token |
| --- | --- |
| 尺寸 | `--button-height-*`、`--button-padding-inline-*`、`--button-font-size-*` |
| 图标与加载 | `--button-icon-size-*`、`--button-spinner-border-width`、`--button-spinner-duration` |
| 选中态 | `--button-selected-background`、`--button-selected-color`、`--button-selected-border-color`、`--button-selected-background-hover`、`--button-selected-background-pressed` |
| 分组 | `--button-border-radius`、`--button-border-width` |
| 焦点 | `--button-focus-ring-color`、`--button-focus-ring-width`、`--button-focus-ring-offset` |
| 禁用 | `--button-disabled-background`、`--button-disabled-color`、`--button-disabled-border-color` |
| 动效 | `--button-duration`、`--button-ease` |

## 无障碍输出

- 默认输出 `<button type="button">`，保留平台键盘和表单语义。
- 非原生标签在 `disabled` 时输出 `aria-disabled="true"` 和 `tabindex="-1"`，并阻止点击。
- `loading` 输出 `aria-busy="true"`，不设置原生 `disabled`，以保留焦点；内容用 `opacity: 0` 隐藏而不是移除，所以按钮在加载期间**仍然有可访问名称**。
- **`loading` 在任何标签上都只表达为 `aria-busy`。** 它不写 `aria-disabled`、不写 `tabindex`：`<button loading>` 与 `<a loading>` 的可访问输出一致，`<a loading>` 也仍然留在 Tab 顺序里。激活由点击处理器拦下（含 `preventDefault()`，所以键盘 Enter 不会跳转）——这正是「忙但仍然可达」可以成立的原因。
- `disabled` 与 `loading` 同时为真时，禁用语义优先：非原生标签仍然输出 `aria-disabled="true"` 与 `tabindex="-1"`，同时保留 `aria-busy="true"`。
- `shape="circle"` 必须提供 `aria-label` 或 `aria-labelledby`。
- `active` 只在被显式设置时输出 `aria-pressed`：普通按钮不会假扮成开关按钮。
- `YueButtonToggle` 渲染 `role="group"`，组内项输出 `aria-pressed="true|false"`；分组必须提供 `aria-label` 或 `aria-labelledby`。
- `prefers-reduced-motion: reduce` 下停止 spinner 旋转，但保留静态加载提示。
