# Button 按钮指南

这一页描述按钮如何参与页面设计。API 和默认值见 [API](./api)，所有状态和变体的真实渲染见[示例](/components/button)。

## 何时使用

当用户需要触发一个明确的闭环操作时使用 Button，例如保存、提交、删除或确认。仅用于页面跳转的文字链接不要伪装成按钮；需要打开菜单的一组操作应考虑菜单或工具栏。

## 主次关系

- 一个页面或一个明确任务区域通常只保留一个最高优先级的 `primary + solid` 操作。
- 取消、返回或辅助操作使用 `default`、`outline` 或 `text`，避免和主操作争夺视觉焦点。
- 破坏性操作使用 `danger`，并在文案中明确后果；不要只依赖红色传达风险。
- `success` 表达完成或确认，`warning` 表达「需要注意但还没出错」；两者都不应代替所有普通操作，也不要用 `warning` 表示错误。

```vue
<div class="actions">
  <YueButton theme="primary">保存</YueButton>
  <YueButton variant="outline">取消</YueButton>
</div>
```

按钮之间保留 `--gap-control-group` 或 `--space-8` 的间距。不要把多个按钮无间隙拼成一条视觉色带，除非它们确实是同一组互斥控制。

## 变体选择

| 变体 | 适合场景 | 注意 |
| --- | --- | --- |
| `solid` | 区域内最主要的操作 | 同一区域不要放多个同等主操作 |
| `outline` | 次级操作，需要清晰边界 | 与 solid 搭配时降低视觉权重 |
| `dashed` | 「新增」「添加配置」等低频、可预期的动作 | 它读起来就是「这里还能加东西」；不要用于删除或提交 |
| `text` | 工具栏、密集区域、已有背景的容器 | 它保留完整点击区域，所以可以放心用于主要路径上的轻量操作；必须确认 hover/pressed 仍可识别 |
| `link` | 行内、表格或轻量导航操作 | 它**没有固定高度和横向内边距**，点击区域明显更小；文案应像链接，不要承载高风险操作，也不要拿它当「更轻的按钮」 |

## 图标和标签

图标只能增强识别，不能替代必须阅读的操作名称。图标通过 `leading` / `trailing` 插槽传入，并继承 Button 的 `currentColor`。

```vue
<YueButton theme="primary">
  <template #leading><SaveIcon aria-hidden="true" /></template>
  保存
</YueButton>
```

纯图标按钮使用 `shape="circle"`，必须提供可访问名称：

```vue
<YueButton shape="circle" aria-label="搜索" variant="outline">
  <template #leading><SearchIcon aria-hidden="true" /></template>
</YueButton>
```

## 状态

### Disabled

禁用表示当前条件下不可操作。它不能作为解释失败原因的唯一方式，应在附近提供说明。原生 `<button>` 使用平台 `disabled`；`a` 或自定义标签使用 `aria-disabled` 并阻止激活。

### Loading

loading 表示操作已经开始但结果尚未返回。它会阻止重复激活、设置 `aria-busy="true"`，但不设置原生 `disabled`，因此用户的焦点不会突然消失。文案可以从“提交”变为“提交中”，让状态不仅依赖 spinner。

### Block

`block` 用于窄屏表单、底部操作或需要明确占满容器的单一操作。不要在一个宽桌面工具栏中让所有按钮都 block。

## 响应式与主题

- Button 自身不绑定页面断点；页面通过容器布局和 `block` 决定排列。
- 小屏优先允许按钮组换行，不能用固定宽度造成横向滚动。
- 浅色/深色切换由 Token 语义角色完成，组件不在运行时分支判断主题。
- 主题化优先重指 `--button-*` Token，不要复制 `.yue-button` 的整套选择器。

## 自查清单

- 这个区域是否只有一个最高优先级操作？
- 文案是否说明了动作和结果？
- disabled 是否有附近的原因说明？
- loading 是否阻止重复提交且保留焦点？
- 图标是否装饰性地标记为 `aria-hidden`？纯图标按钮是否有名称？
- 浅色、深色、窄屏和键盘焦点是否都可读、可操作？
