# YuePopover 指南

## 什么时候使用

当内容需要靠近某个 trigger 展示、又不应阻塞页面其余内容时使用 Popover，例如筛选面板、补充操作、可交互帮助内容。

如果内容是菜单项集合，请使用未来的 `YueMenu`；如果是必须完成的模态流程，请使用 `YueDialog`；如果只是非交互说明，请使用 `YueTooltip`。

## Trigger 与状态

默认 `trigger="click"`。需要父组件掌握状态时使用 `v-model`；简单场景省略 `modelValue`，组件会使用 `defaultOpen` 建立内部状态。`manual` 模式适合外部 anchor 或自定义事件控制。

```vue
<YuePopover v-model="open" trigger="manual" :anchor="anchorEl">
  <HelpPanel />
</YuePopover>
```

## 定位与 Teleport

`placement` 是首选位置，不是最终承诺：空间不足时组件会 flip/shift。内容默认 Teleport 到 `body`，也可以将 `teleport` 设为 `false` 或一个选择器/元素。定位由 Floating UI 的 DOM 核心负责，Yue 负责生命周期、语义和事件边界。

进入动画是一次 `clip-path` 展开：浮层沿解析后 `placement` 的主轴，从面向触发器的那条边开始生长并同时淡入——`bottom` 从上边缘向下展开，`top` 从下边缘向上展开，`left`/`right` 同理。发生 flip 时展开边跟随翻转后的结果。动画结束后不保留任何裁剪，因此阴影不会被切掉。

## 焦点和关闭

Popover 默认不抢焦点，也不锁焦点。Escape 只关闭最顶层实例；pointerdown 在 trigger 和 content 之外会按 `closeOnOutside` 关闭。关闭时如果用户已经把焦点移到外部，组件不会强行把焦点抢回 trigger。

## 不要把 Popover 当成通用 Dialog

Popover 的 `role` 可以表达基础语义，但改变 `role` 不会增加菜单导航或模态行为。专用组件应复用无语义 overlay hooks，并各自实现 APG 要求。

## 实现取舍

参考 Vuetify 的 composable 分层和 Floating UI 的定位边界；拒绝复制 ChengJing 的有限 viewport 算法，也不向 Yue 使用者暴露第三方定位类型。组件没有内置文案，因此无需新增 Yue locale key。
