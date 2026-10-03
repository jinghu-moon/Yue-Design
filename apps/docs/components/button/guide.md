# Button 按钮指南

这一页描述按钮如何参与页面设计。API 和默认值见 [API](./api)，所有状态和变体的真实渲染见[示例](/components/button)，组件由哪些部分组成见示例页的[组件解剖](/components/button#组件解剖-anatomy)。

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

两条结构约定是硬性的，不是风格偏好：

- **不要为了 loading 把 `leading` / `trailing` 换成别的节点。** 内容留在原位、加载层盖在上面，按钮宽度才不会在请求前后跳动。需要别的指示器时用 `loader` 插槽，它会渲染在同一个加载层里。
- **不要用 `display: none` / `visibility: hidden` 隐藏内容。** 那会把文字移出无障碍树；组件用的是 `opacity: 0`。

还有一条语义边界：**`loading` 不等于 `disabled`**。[渲染成 `<a>` 或自定义组件](/components/button#渲染成-a-或自定义组件)时这一点最容易写错——loading 的链接仍然是可 Tab 到达的链接，组件只输出 `aria-busy`，不写 `aria-disabled`、不写 `tabindex="-1"`。真正不可操作请用 `disabled`；「正在处理、请稍等」请用 `loading`。

### 选中（active）

`active` 是**开关按钮**的语义：它输出 `aria-pressed`，因此读屏用户能听到「已按下 / 未按下」。三态是有意的 —— 不传 `active` 的普通按钮不会输出 `aria-pressed`，不会被读成开关按钮。

### 分组与分段控件

| 场景 | 用什么 | 理由 |
| --- | --- | --- |
| 几个选项必须有一个是当前项（视图切换、对齐方式） | `YueButtonToggle` + `YueButtonToggleItem` | 选择是强制的，组内每项输出 `aria-pressed`；再次点击当前项不会取消，因为「一个都没选中」回答不了「现在是哪一个」 |
| 一组互不相关的开关（粗体 / 斜体） | `YueButtonGroup` + 每个 `YueButton` 自己的 `active` | 语义上就是多个独立开关，可以全部关闭 |
| 只是视觉上排在一起 | `YueButtonGroup` | 它只合并圆角、给出 `role="group"`，不带任何状态 |

两条容易搞错的边界：

- **分组不是「一次设置八个 prop」。** `YueButtonGroup` 没有 `theme` / `variant` / `size`。要让一整片区域的按钮更紧凑，请在容器上重指 `--button-*` Component Token —— 这也是工具条里「紧凑」演示的做法。
- **分组的可访问名称是必须的。** 组本身没有文字，`aria-label` 或 `aria-labelledby` 缺一不可。

::: tip 键盘导航
方向键与 roving tabindex 尚未实现，组内项现在是普通的 Tab 停靠点。在这之前，请把分段控件当作「一组可点击的按钮」，不要依赖方向键在它们之间移动。
:::

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
- loading 是否阻止重复提交、保留焦点，并且没有改变按钮尺寸？
- 图标是否装饰性地标记为 `aria-hidden`？纯图标按钮是否有名称？
- 开关按钮是否只在真的可用时使用 `active`（普通按钮不该输出 `aria-pressed`）？
- 分段控件是否有 `aria-label`，且是否确认过「必须有一个选中项」？
- 浅色、深色、窄屏和键盘焦点是否都可读、可操作？
