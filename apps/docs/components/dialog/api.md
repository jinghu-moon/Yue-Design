# YueDialog API

这一页描述 `YueDialog` 的冻结公共契约。引入组件时需要先加载 Token CSS，再加载 Dialog CSS。

```ts
import { YueDialog } from '@yue-ui/vue/dialog'
import '@yue-ui/design-tokens/index.css'
import '@yue-ui/vue/dialog.css'
```

## YueDialog

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | `boolean` | `undefined` | 受控 open 状态；存在时内部关闭请求只通过 `update:modelValue` 通知父级 |
| `title` | `string` | `undefined` | 内置标题文本，自动接入 `aria-labelledby` |
| `description` | `string` | `undefined` | 辅助说明文本，参与 `aria-describedby` |
| `variant` | `'default' \| 'danger'` | `'default'` | `danger` 将 role 提升为 `alertdialog`，并默认关闭 Esc 与遮罩关闭 |
| `surface` | `'modal' \| 'fullscreen'` | `'modal'` | `modal` 为遮罩上的居中卡片；`fullscreen` 为整屏表面。两者默认都是模态，模态性由 `modeless` 单独控制 |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | 宽度档位；`width` 存在时被覆盖 |
| `width` | `string \| number` | `undefined` | 显式宽度覆盖，数字按 CSS 像素处理，仍受视口安全边距约束 |
| `scrollable` | `boolean` | `false` | 固定 header/footer、仅正文滚动；关闭时整卡滚动 |
| `persistent` | `boolean` | `false` | 关闭除按钮外的所有关闭渠道（Esc + 遮罩）并保持内容挂载 |
| `closeOnEscape` | `boolean` | 由 `variant` 推导 | 显式传入时始终优先；`danger` 默认 `false` |
| `closeOnScrim` | `boolean` | 由 `variant` 推导 | 显式传入时始终优先；`danger` 默认 `false` |
| `beforeClose` | `(reason: YueDialogCloseReason) => boolean \| Promise<boolean>` | `undefined` | 关闭提交前的守卫，返回 `false`、Promise resolve `false` 或 reject 均中止关闭 |
| `confirmText` | `string` | `dialog.confirm` | 内置确认按钮文案，省略时取 locale 键 |
| `cancelText` | `string` | `dialog.cancel` | 内置取消按钮文案，省略时取 locale 键 |
| `close` | `boolean \| { ariaLabel?: string }` | `true` | 右上角图标关闭控件；`false` 移除，对象可覆盖 accessible name |
| `teleport` | `boolean \| string \| HTMLElement` | `'body'` | 分离表面的挂载目标；`false` 保持在原 DOM 位置 |
| `trigger` | `YueDialogTrigger` | `undefined` | 入场飞入原点与条件回焦的锚点，可为元素或返回元素的 getter |
| `restoreFocus` | `boolean` | `true` | 仅在关闭由键盘或程序触发时回焦 |
| `ariaLabel` | `string` | `undefined` | 显式 accessible name，优先于自动 `aria-labelledby` |
| `modeless` | `boolean` | `false` | 非模态表面：不加 `aria-modal`、不 inert 背景、不锁滚、不 trap 焦点，背景保持可交互 |
| `loading` | `boolean` | `false` | 强制确认按钮进入忙态（spinner + 禁用）并屏蔽 Esc 与遮罩关闭；`beforeClose` 返回 pending Promise 时自动进入该态 |
| `showConfirm` | `boolean` | `true` | 是否渲染内置确认按钮；`false` 得到单动作对话框 |
| `showCancel` | `boolean` | `true` | 是否渲染内置取消按钮；`false` 得到单动作对话框 |
| `lazy` | `boolean` | `false` | 首次打开前不实例化内容，之后跨关闭保持挂载 |
| `classNames` | `Partial<Record<'overlay' \| 'scrim' \| 'panel' \| 'header' \| 'body' \| 'footer' \| 'close', string>>` | `undefined` | 合并到各结构部件的类名 |
| `styles` | `Partial<Record<'overlay' \| 'scrim' \| 'panel' \| 'header' \| 'body' \| 'footer' \| 'close', CSSProperties>>` | `undefined` | 合并到各结构部件的内联样式 |

受控与非受控：传入 `modelValue` 时父级是唯一状态来源；省略时组件维护内部状态。

### Events

| 事件 | 载荷 | 触发条件 |
| --- | --- | --- |
| `update:modelValue` | `boolean` | 受控 open 状态被请求改变 |
| `open` | — | 打开被接受后 |
| `close` | `{ reason: YueDialogCloseReason; event?: Event }` | 关闭请求发起时（守卫之前） |
| `confirm` | — | 用户触发确认动作 |
| `closed` | `{ reason: YueDialogCloseReason }` | 守卫放行且状态关闭后 |
| `after-open` | — | 进入过渡完成后 |
| `after-close` | — | 离开过渡完成后；内容随后卸载 |

`close.reason` 取值为 `confirm`、`cancel`、`close-btn`、`escape`、`scrim` 或 `programmatic`。关闭管线顺序固定为：`close` → `beforeClose` → `update:modelValue` → 过渡 → `after-close`。

### Slots

| 插槽 | 作用域 | 说明 |
| --- | --- | --- |
| `header` | `{ titleId }` | 自定义标题，需把 `titleId` 绑到标题元素的 `id` |
| `default` | `{ close }` | 对话框正文内容 |
| `footer` | `{ close, confirm, cancel }` | 自定义动作区；提供该插槽会完全替代内置确认/取消按钮 |
| `close-icon` | — | 替换内置关闭图标；关闭按钮本体与其 accessible name 保持不变 |

`footer` 插槽存在时不渲染内置按钮，因此不会输出任何 `dialog.*` locale 文案。

### Expose

| 方法 | 返回值 | 用途 |
| --- | --- | --- |
| `open()` | `void` | 打开实例 |
| `close(reason?)` | `void` | 以指定原因（默认 `programmatic`）关闭，仍经过 `beforeClose` |
| `updatePosition()` | `void` | 重新计算入场飞入原点 |

不暴露 DOM ref 或 overlay 内部类型。

### DOM 与属性透传

- 组件使用 `inheritAttrs: false`。
- `class`、`style` 落到 overlay 根节点，其余属性透传到 dialog 卡片根节点。
- `classNames` / `styles` 按结构部件（`overlay`/`scrim`/`panel`/`header`/`body`/`footer`/`close`）分别合并，用于在不覆盖内置类的前提下定制单个部件。
- 卡片默认 `role="dialog"`，`variant="danger"` 时为 `role="alertdialog"`。
- 遮罩与卡片都带 `data-yue-overlay` 标记，供模态链的 `inert` 计算排除同级浮层。

### Token

| 类别 | Token |
| --- | --- |
| 表面 | 直接读取 `--box-background-dialog`、`--box-color-dialog` 等 Box 契约 |
| 宽度 | `--dialog-width-sm`、`--dialog-width-md`、`--dialog-width-lg`、`--dialog-width-xl` |
| 几何 | `--dialog-header-height`、`--dialog-footer-gap`、`--dialog-section-padding` |
| 动效 | `--dialog-duration-enter`、`--dialog-duration-exit`、`--dialog-ease` |
| 层级 | `--layer-modal`（遮罩与卡片所在层级） |

### Accessibility

- 焦点陷阱：Tab 在卡片内环回，背景按模态链设置 `inert`，不会屏蔽同级 teleport 浮层。
- 初始焦点落在 `tabindex="-1"` 的卡片容器，使辅助技术先读到名称与描述。
- 关闭时按条件回焦：键盘或程序触发的关闭回焦锚点，遮罩点击不抢焦点。
- Escape 受 IME `isComposing` 保护；多实例并存时仅顶层实例响应。
- `prefers-reduced-motion` 移除进入/离开动画；`forced-colors` 用系统颜色恢复边界与焦点可见性。

### Limitations

Dialog 不实现命令式 `open()` 工厂、返回键拦截、拖拽移动、可调整大小、内建多层通知栈。确认/取消之外的领域文案由调用方通过 `footer` 插槽或 `confirmText`/`cancelText` 提供。

### Breaking changes

这是新组件。API 在实现前冻结；任何 prop、event、slot、role 默认值或依赖边界变化都必须先更新规格。
