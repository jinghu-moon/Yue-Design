# Tag 标签 · 指南

这一页记录 Tag 设计决策：为什么这么选，什么时候用哪个，以及无障碍要求。可运行示例见[示例](/components/tag)；完整接口见 [API](./api)。

## 何时使用 Tag

Tag 适合**非交互式状态标注**：展示分类、状态徽章、属性标签、过滤标记。它不是按钮——点击事件通过 `@click` 监听，但默认根元素是 `<span>`，没有交互语义。

需要表达可选中状态时（比如多选筛选面板）改用 `YueCheckTag`。`YueCheckTag` 是 `role="checkbox"` 元素，正确地声明了它所承担的交互语义。

## 主题与变体的选择

**主题（theme）** 传达语义：

| 主题 | 场景 |
| --- | --- |
| `default` | 中性标签，不携带特定含义 |
| `primary` | 强调，突出某一属性 |
| `success` | 成功、通过、激活 |
| `warning` | 待处理、需注意 |
| `danger` | 错误、危险、拒绝 |

**变体（variant）** 控制视觉权重：

| 变体 | 适用场景 |
| --- | --- |
| `filled` | 最高权重，用于需要强调的状态或计数 |
| `tint` | 大量标签时的默认选择，背景淡，不抢视觉注意力 |
| `outline` | 边框风格，轻量中性，常用于分类标签 |
| `tint-outline` | 比纯描边稍有色彩感，适合在表格或卡片中标注状态 |

一个页面里同时用四种变体会造成噪音。通常选定一种变体，仅在需要区分重要程度时混用两种。

## 自定义颜色（color prop）

`color` prop 接受任意合法 CSS 颜色值（`#hex`、`rgb()`、`hsl()` 等），适合**用户生成内容的标签**，比如用户自定义分类、Git 仓库 label。

颜色派生逻辑：

1. 通过 canvas 解析颜色的 RGB 值
2. 用 WCAG 相对亮度公式计算亮度 L
3. `filled`：背景为输入色，文字色在 L > 0.179 时用深色，否则用白色
4. `tint`：背景为 `rgba(r,g,b,0.12)`，文字色为输入色本身
5. `outline` / `tint-outline`：边框和文字均为输入色，`tint-outline` 加淡色背景

当前实现是简化版；完整的 APCA 对比度算法作为后续优化项保留。在深浅主题切换时，`color` 不自动适配——如果需要，由消费方在深色模式下覆盖 `color` 值。

## 关闭行为

关闭按钮（`closable`）只渲染一个 DOM 事件，**不自动从 DOM 里删除 Tag**。删除是消费方的职责：通常是更新数组，让 `v-for` 自然地把 Tag 移出。

```vue
<YueTag
  v-for="tag in tags"
  :key="tag.id"
  closable
  @close="removeTag(tag.id)"
>{{ tag.label }}</YueTag>
```

禁用（`disabled`）时关闭按钮不渲染——不是显示但禁用，而是完全消失。理由：禁用标签表达的是「这个属性不可变更」，出现一个点不了的关闭按钮会制造困惑。

## CheckTag 的受控与非受控

| 模式 | 怎么用 | 适合场景 |
| --- | --- | --- |
| 非受控 | 不传 `modelValue`，用 `defaultChecked` 设初始值 | 独立开关，外部不需要感知选中态 |
| 受控 | 传 `v-model`（即 `modelValue` + `update:modelValue`） | 父组件需要读取或重置选中态 |

非受控模式下组件内部维护状态，`change` 事件仍然会触发，所以外部仍然可以观察但不控制。

## 无障碍要求

**YueTag**

- 默认是 `<span>`，不声明任何交互语义。如果 Tag 是可点击的（比如跳转到某个筛选视图），必须改用 `tag="a"` 或 `tag="button"`，否则键盘用户无法触达。
- `disabled` 时输出 `aria-disabled="true"`，不使用原生 `disabled`（`<span>` 不支持）。
- 关闭按钮可访问名称取自 i18n key `tag.closeLabel`，中文是「移除标签」，英文是「Remove tag」。如果标签文本对上下文有意义（比如「移除 Vue 标签」），消费方可通过 `closeLabel` i18n override 在 `YueLocaleProvider` 级别定制。
- 图标插槽包裹在 `aria-hidden="true"` 容器内，避免图标被屏幕阅读器重复朗读。

**YueCheckTag**

- 使用 `role="checkbox"` + `aria-checked`，而不是按钮 + `aria-pressed`。理由：CheckTag 的语义是「这一项是否选中」，这是 checkbox 的语义，不是 toggle button 的语义。
- `tabindex="-1"` 在 `disabled` 时移出 Tab 顺序；聚焦时的 focus ring 样式与 Tag 关闭按钮一致。
- Space 和 Enter 均可触发切换，与原生 checkbox 行为对齐。
- 禁用时输出 `aria-disabled="true"`，保持 `role="checkbox"` 不变，让屏幕阅读器仍能发现这个元素但知道它不可操作。
- 一组 CheckTag 作为筛选面板时，建议用 `role="group"` 容器加 `aria-label` 描述这组标签的含义：

  ```html
  <div role="group" aria-label="筛选技术栈">
    <YueCheckTag v-model="...">Vue</YueCheckTag>
    <YueCheckTag v-model="...">React</YueCheckTag>
  </div>
  ```

## maxWidth 截断

截断通过 CSS `overflow: hidden; text-overflow: ellipsis` 实现，截断后根元素自动加上 `title` 属性（值为 slot 内容的文本），鼠标悬停时显示完整文本。`maxWidth` 可传数字（px）或字符串（如 `'8em'`）。

不要用截断代替合理的内容长度控制。如果标签文本来自用户输入，应在存储层就做长度限制；截断是视觉保护，不是数据约束。
