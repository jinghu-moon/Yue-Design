# YuePopover API

这一页描述 `YuePopover` 的冻结公共契约。引入组件时需要先加载 Token CSS，再加载 Popover CSS。

```ts
import { YuePopover } from '@yue-ui/vue/popover'
import '@yue-ui/design-tokens/index.css'
import '@yue-ui/vue/popover.css'
```

## YuePopover

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | `boolean` | `undefined` | 受控 open 状态；存在时内部请求只通过 `update:modelValue` 通知父级 |
| `defaultOpen` | `boolean` | `false` | 非受控模式的初始 open 状态 |
| `trigger` | `'click' \| 'hover' \| 'focus' \| 'manual'` | `'click'` | trigger 插槽的自动触发策略 |
| `anchor` | `HTMLElement \| (() => HTMLElement \| null)` | `undefined` | 无 trigger 插槽时的外部定位锚点 |
| `placement` | `YuePopoverPlacement` | `'bottom'` | 首选位置；空间不足时实际位置可能翻转 |
| `offset` | `number` | `8` | 锚点与浮层之间的 CSS 像素间距 |
| `teleport` | `boolean \| string \| HTMLElement` | `'body'` | Teleport 目标；`false` 保持在原 DOM 位置 |
| `persistent` | `boolean` | `false` | 关闭后是否保留内容挂载 |
| `closeOnOutside` | `boolean` | `true` | pointerdown 在 trigger/content 外部时关闭 |
| `closeOnEscape` | `boolean` | `true` | 最顶层实例响应 Escape |
| `closeOnContentClick` | `boolean` | `false` | 点击 content 内部后关闭 |
| `restoreFocus` | `boolean` | `true` | 关闭时在条件满足时恢复打开它的 trigger 焦点 |
| `role` | `'dialog' \| 'tooltip' \| 'presentation'` | `'dialog'` | content 的 ARIA role；不会因此获得 Menu/Dialog 专用行为 |
| `disabled` | `boolean` | `false` | 阻止 trigger 打开并强制关闭 |

受控与非受控：传入 `modelValue` 时，父级是唯一状态来源；省略时组件使用 `defaultOpen` 建立内部状态。

### Events

| 事件 | 载荷 | 触发条件 |
| --- | --- | --- |
| `update:modelValue` | `boolean` | 用户或程序请求改变受控 open 状态 |
| `open` | `{ trigger: Event \| undefined }` | 状态被打开后 |
| `close` | `{ reason: YuePopoverCloseReason; event?: Event }` | 状态关闭或关闭请求被接受后 |
| `after-open` | — | 进入过渡完成后 |
| `after-close` | — | 离开过渡完成后；transient 内容随后卸载 |

事件顺序固定为：`update:modelValue`（受控时）→ `open`/`close` → 过渡 → `after-open`/`after-close`。重复请求不会重复触发事件。

`close.reason` 取值为 `trigger`、`outside`、`escape` 或 `programmatic`。

### Slots

| 插槽 | 作用域 | 说明 |
| --- | --- | --- |
| `trigger` | `{ props, isOpen, open, close, toggle }` | 可选触发器；`props` 含 id、`aria-expanded`、`aria-controls` 和触发事件 |
| `default` | `{ isOpen, close }` | detached 浮层内容 |

省略 `trigger` 时必须提供 `anchor`。`trigger="manual"` 不安装自动打开/关闭事件。

### Expose

| 方法 | 返回值 | 用途 |
| --- | --- | --- |
| `open()` | `void` | 打开实例 |
| `close(reason?)` | `void` | 以 `programmatic` 原因关闭 |
| `toggle()` | `void` | 切换状态 |
| `updatePosition()` | `Promise<void>` | 内容尺寸由外部改变时手动重定位 |

不暴露 DOM ref、Floating UI 对象或第三方 middleware。

### DOM 与属性透传

- 组件使用 `inheritAttrs: false`。
- `class`、`style`、`id`、`role`、`aria-*`、`data-*` 等属性默认进入浮层 content 根节点。
- trigger 插槽的 `props` 必须绑定到实际 trigger 元素；组件不会把事件猜测性地附加到其他元素。
- 默认 content `role="dialog"`，必须通过 `aria-label` 或 `aria-labelledby` 提供 accessible name。
- trigger 输出 `aria-expanded` 与 `aria-controls`；禁用时输出 `aria-disabled="true"`。

### Token

| 类别 | Token |
| --- | --- |
| 表面 | `--popover-background`、`--popover-color` |
| 边界 | `--popover-border-color`、`--popover-border-width` |
| 形状 | `--popover-border-radius` |
| 排版 | `--popover-font-size` |
| 间距 | `--popover-padding` |
| 层级 | `--popover-shadow`、`--popover-z-index` |
| 动效 | `--popover-duration-enter/exit`、`--popover-ease` |

### Accessibility

- 默认 `role="dialog"`，这是非模态 dialog；Popover 不实现 focus trap、scrim 或 inert background。
- 打开不强制移动焦点；关闭时仅在焦点仍属于本次交互时恢复 trigger。
- 最顶层实例处理 Escape；子浮层内部点击不会关闭父浮层。
- Tab 在 content 中自然流动；方向键不由 Popover 处理。
- `prefers-reduced-motion` 会移除进入/离开动画；`forced-colors` 使用系统颜色保留边界和焦点可见性。

### Limitations

Popover 不实现菜单方向键导航、type-ahead、roving tabindex、Dialog focus trap、模态遮罩、Tooltip 延迟策略、箭头或 imperative 创建 API。

### Breaking changes

这是新组件。API 在实现前冻结；任何 prop、event、slot、role 默认值、依赖边界或非目标变化都必须先更新规格。
