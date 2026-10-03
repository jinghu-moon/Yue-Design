# Tag 标签 API

这一页只描述 Tag 组件族的可消费接口。可运行的真实示例见[示例](/components/tag)；使用场景和无障碍决策见[指南](./guide)。

Tag 族有两个组件：

| 组件 | 作用 |
| --- | --- |
| `YueTag` | 只读标签，用于展示状态、属性或分类。支持关闭按钮 |
| `YueCheckTag` | 可选中标签，实现 `role="checkbox"` 语义，适合多选筛选 |

## 引入

```ts
// 单组件入口
import { YueTag, YueCheckTag } from '@yue-ui/vue/tag'
import '@yue-ui/design-tokens/index.css'
import '@yue-ui/vue/tag.css'

// 或者从根入口按名导入
import { YueTag, YueCheckTag } from '@yue-ui/vue'
```

也可以使用 `@yue-ui/vue/plugin` 全局注册。

## YueTag

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `theme` | `'default' \| 'primary' \| 'success' \| 'warning' \| 'danger'` | `'default'` | 语义色角色 |
| `variant` | `'filled' \| 'tint' \| 'outline' \| 'tint-outline'` | `'filled'` | 绘制方式：实色填充 / 淡色填充 / 描边 / 淡色+描边 |
| `size` | `'sm' \| 'md' \| 'lg'` | `YueConfig.size`，默认 `'md'` | 尺寸 |
| `shape` | `'square' \| 'round'` | `'square'` | 圆角形态 |
| `disabled` | `boolean` | `false` | 禁用：降低不透明度，阻止点击，隐藏关闭按钮 |
| `closable` | `boolean` | `false` | 显示关闭按钮；禁用时关闭按钮不渲染 |
| `tag` | `string \| Component` | `'span'` | 自定义根元素标签或组件 |
| `color` | `string` | — | 任意 CSS 颜色；覆盖 `theme` 的调色板，颜色自动推导 |
| `maxWidth` | `number \| string` | — | 标签文本最大宽度；超出截断并加 `title`。数字单位为 px |

`color` 与 `theme` 互斥：传入 `color` 时组件根据亮度自动计算 `filled` 的文字色（白色或深色），并为其他变体推导背景色和边框色。

### Emits

| 事件 | 载荷 | 触发条件 |
| --- | --- | --- |
| `click` | `MouseEvent` | 点击根元素，`disabled` 时不触发 |
| `close` | `MouseEvent` | 点击关闭按钮，`disabled` 时不触发 |

### Slots

| 插槽 | 说明 |
| --- | --- |
| `default` | 标签文本 |
| `icon` | 前置图标，渲染在 `.yue-tag__icon` 内，自动添加 `aria-hidden="true"` |
| `close-icon` | 自定义关闭图标，替代默认的 `IconX` |

### 透传属性

`class`、`style`、`id`、`aria-*`、`data-*` 等非 prop 属性透传到根元素。`class` 会与组件自身的 class 合并，不会被覆盖。

## YueCheckTag

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | `boolean \| undefined` | `undefined` | 受控选中态；`undefined` 表示非受控模式 |
| `defaultChecked` | `boolean` | `false` | 非受控模式的初始选中态 |
| `value` | `string \| number` | — | 该标签代表的值，通过 `change` 事件透出，用于外部 Set 管理 |
| `disabled` | `boolean` | `false` | 禁用：降低不透明度，移出 Tab 顺序，阻止交互 |
| `size` | `'sm' \| 'md' \| 'lg'` | `YueConfig.size`，默认 `'md'` | 尺寸 |

受控与非受控：

- 不传 `modelValue`（或传 `undefined`）＝非受控：组件自己维护选中态，`defaultChecked` 设置初始值；
- 传入 `modelValue`（`true` 或 `false`）＝受控：选中态由父组件完全控制。

### Emits

| 事件 | 载荷 | 触发条件 |
| --- | --- | --- |
| `update:modelValue` | `boolean` | 用户切换选中态（含键盘 Space / Enter） |
| `change` | `{ checked: boolean; value?: string \| number; e: MouseEvent \| KeyboardEvent }` | 同上，携带完整状态 |
| `click` | `MouseEvent` | 点击时触发，`disabled` 时不触发 |

### Slots

| 插槽 | 说明 |
| --- | --- |
| `default` | 标签文本 |

### 透传属性

同 `YueTag`。`class` 合并，其他属性透传到根 `<span>`。

## 应用级配置

```ts
import YueUI from '@yue-ui/vue/plugin'
app.use(YueUI, { size: 'sm' })
```

| 配置项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 组件未传 `size` 时的回落值 |

## CSS 入口

```ts
import '@yue-ui/design-tokens/index.css' // 必须先加载
import '@yue-ui/vue/tag.css'             // 只加载 Tag 族
// 或：import '@yue-ui/vue/style.css'    // 加载全部组件样式
```

## Token 映射

| 类别 | Token |
| --- | --- |
| 尺寸 | `--tag-height-{sm/md/lg}`、`--tag-padding-inline-{sm/md/lg}`、`--tag-font-size-{sm/md/lg}` |
| 间距 | `--tag-gap`、`--tag-padding-block` |
| 字重 | `--tag-font-weight` |
| 形状 | `--tag-border-radius`、`--tag-border-radius-round` |
| 边框 | `--tag-border-width` |
| 关闭图标 | `--tag-close-icon-size` |
| 禁用 | `--tag-opacity-disabled` |
| 焦点 | `--tag-focus-ring-color`、`--tag-focus-ring-width`、`--tag-focus-ring-offset` |
| 动效 | `--tag-duration`、`--tag-ease` |
| 配色 | `--tag-{theme}-{variant}-background/color/border-color`（5 主题 × 4 变体 = 20 组） |

## 无障碍输出

- `YueTag` 根元素默认是 `<span>`，不具备交互语义；监听了 `@click` 的标签应配合 `tag` prop 改用语义化元素（如 `<button>` 或 `<a>`）并提供可访问名称。
- 关闭按钮是原生 `<button type="button">`，可访问名称取自 i18n key `tag.closeLabel`（中文：「移除标签」，英文：「Remove tag」）。
- `disabled` 时根元素输出 `aria-disabled="true"`，关闭按钮不渲染。
- `YueCheckTag` 使用 `role="checkbox"` + `aria-checked` 表达选中态；`aria-disabled="true"` + `tabindex="-1"` 表达禁用；Space / Enter 键触发切换。
- 图标插槽内容自动包裹 `aria-hidden="true"` 的容器，避免重复朗读。
