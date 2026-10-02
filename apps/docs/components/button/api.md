# Button 按钮 API

这一页只描述 `YueButton` 的可消费接口。可运行的真实组件示例见[示例](/components/button)；使用场景、主次关系和无障碍决策见[指南](./guide)。

## 引入

```ts
import YueButton from '@yue-ui/vue/button'
import '@yue-ui/design-tokens/index.css'
import '@yue-ui/vue/button.css'
```

也可以使用根入口的命名导出，或通过 `@yue-ui/vue/plugin` 全局注册。插件只负责注册组件和提供应用级 `size` 配置，不会引入图标库。

## Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `theme` | `'default' \| 'primary' \| 'success' \| 'warning' \| 'danger'` | `'default'` | 语义色角色 |
| `variant` | `'solid' \| 'outline' \| 'dashed' \| 'text' \| 'link'` | `'solid'` | 绘制方式和强调级别 |
| `size` | `'sm' \| 'md' \| 'lg'` | `YueConfig.size`，默认为 `'md'` | 当前按钮的尺寸 |
| `shape` | `'square' \| 'round' \| 'circle'` | `'square'` | 圆角形态；`circle` 用于图标按钮 |
| `disabled` | `boolean` | `false` | 原生按钮使用 `disabled`，其他标签使用 `aria-disabled` |
| `loading` | `boolean` | `false` | 阻止激活、设置 `aria-busy`，但不移除焦点 |
| `block` | `boolean` | `false` | 填满父容器的行内宽度 |
| `nativeType` | `'button' \| 'submit' \| 'reset'` | `'button'` | 仅在 `tag="button"` 时应用 |
| `tag` | `string \| Component` | `'button'` | 自定义渲染标签或组件 |

## Slots

| 插槽 | 内容 | 行为 |
| --- | --- | --- |
| `default` | 按钮标签 | 渲染到 `.yue-button__label` |
| `leading` | 前置内容，通常是图标 | loading 时由 spinner 顶替 |
| `trailing` | 后置内容，通常是图标 | loading 时隐藏 |

图标资源由消费方提供。Yue 不打包图标字体、SVG 集合或 CDN；尺寸和可访问性规则见[图标指南](/design/icon)。

## Events

| 事件 | 载荷 | 触发条件 |
| --- | --- | --- |
| `click` | `MouseEvent` | 仅当 `disabled` 和 `loading` 都为 `false` |

## 应用级配置

```ts
import YueUI from '@yue-ui/vue/plugin'

app.use(YueUI, { size: 'sm' })
```

`YueConfig` 目前只有 `size`。组件显式传入的 `size` 永远优先；不支持运行时 `prefix` 或 `namespace`，因为类名和预构建 CSS 必须保持一致。

## CSS 入口

```ts
import '@yue-ui/design-tokens/index.css' // 必须先加载
import '@yue-ui/vue/button.css'           // 只加载 Button
// 或：import '@yue-ui/vue/style.css'      // 加载全部组件样式
```

组件 CSS 使用公开 BEM 类名：`.yue-button`、`.yue-button--primary`、`.yue-button__icon`。组件不使用 `scoped` 样式，主题化应优先重指 `--button-*` Component Token。

## Token 映射

| 类别 | Token |
| --- | --- |
| 尺寸 | `--button-height-*`、`--button-padding-inline-*`、`--button-font-size-*` |
| 图标 | `--button-icon-size-*` |
| 焦点 | `--button-focus-ring-color`、`--button-focus-ring-width`、`--button-focus-ring-offset` |
| 禁用 | `--button-disabled-background`、`--button-disabled-color`、`--button-disabled-border-color` |
| 动效 | `--button-duration`、`--button-ease` |

## 无障碍输出

- 默认输出 `<button type="button">`，保留平台键盘和表单语义。
- 非原生标签在禁用时输出 `aria-disabled="true"` 和 `tabindex="-1"`，并阻止点击。
- loading 输出 `aria-busy="true"`，不设置原生 `disabled`，以保留焦点。
- `shape="circle"` 必须提供 `aria-label` 或 `aria-labelledby`。
- `prefers-reduced-motion: reduce` 下停止 spinner 旋转，但保留静态加载提示。
