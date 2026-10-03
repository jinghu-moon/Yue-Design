# YueTag / YueCheckTag 组件规格

> 状态：草稿 · 日期：2026-10-03
> 访谈来源：`interviews/yue-tag/answers.json`

---

## Reference materials

**参考库**：TDesign Vue Next (`refer/tdesign-vue-next/packages/components/tag/`)、Ant Design (`refer/ant-design/components/tag/`)

| 来源 | 借鉴内容 | 拒绝内容 |
| --- | --- | --- |
| TDesign | variant 四档概念（filled/tint/outline/tint-outline 对应 dark/light/outline/light-outline）；closable 纯受控设计（只 emit close，不自行隐藏）；maxWidth 截断 + title tooltip；CheckTag 的键盘处理（Space/Enter 切换） | `checkedProps`/`uncheckedProps` 双向透传 prop（过于灵活，Yue 的 theme+variant 已足够表达）；mark 形状 |
| Ant Design | CheckableTagGroup 的 `options` 数据驱动接口思路（后续 YueCheckTagGroup 参考）；color prop 对任意色值的支持 | React 的 `classNames`/`styles` 语义化结构 API（Vue slot 已解决）；`href`/`target` 导航能力 |

---

## Identity

- **组件名**：`YueTag`、`YueCheckTag`
- **包入口**：`@yue-ui/vue`
- **分类**：
  - Drive: `template`
  - Position: `in-place`
  - Lifecycle: `persistent`
  - Composition: `atomic`（YueCheckTag 基于 YueTag 构建，属于 compound 边界）
- **最近已有 Yue 组件**：无 Tag 类；YueButton 提供了 theme/variant/size/shape 的命名参考
- **参考实现**：TDesign（closable 行为、CheckTag 键盘交互）+ Ant Design（color prop）

---

## Problem and use cases

**YueTag** 解决"给内容打标注"的需求——在列表、详情页、筛选区展示只读或可删除的标签，用语义色（theme）和视觉重量（variant）传达分类信息或状态。

**YueCheckTag** 解决"标签式多选/单选"需求——替代复选框/单选框，在视觉上更轻，常见于筛选面板、标签云、属性选择。

```vue
<!-- Use case 1: 只读标注标签 -->
<YueTag theme="primary">前端</YueTag>
<YueTag theme="success" variant="tint">已完成</YueTag>

<!-- Use case 2: 可关闭标签（受控） -->
<YueTag
  v-for="tag in tags"
  :key="tag"
  closable
  @close="removeTag(tag)"
>{{ tag }}</YueTag>

<!-- Use case 3: 带图标的状态标签 -->
<YueTag theme="danger" variant="tint-outline">
  <template #icon><IconAlertTriangle :size="12" /></template>
  异常
</YueTag>

<!-- Use case 4: 自定义颜色 -->
<YueTag color="#8b5cf6">设计</YueTag>

<!-- Use case 5: 可选择标签（受控） -->
<YueCheckTag v-model="selected" value="vue">Vue</YueCheckTag>
<YueCheckTag v-model="selected" value="react">React</YueCheckTag>

<!-- Use case 6: 文字超长截断 -->
<YueTag :max-width="120">这是一段很长的标签文字内容</YueTag>
```

---

## Explicit non-features

- [ ] **导航（href/target）** — 链接场景用 YueButton variant=link 替代
- [ ] **mark 标记形状** — 后续立项
- [ ] **TagInput（标签输入框）** — 后续立项，是独立组件
- [ ] **YueCheckTagGroup** — 后续立项，数据驱动的多选组
- [ ] **全局 closeIcon 替换（配置级）** — 当前通过 close-icon slot 组件级替换；全局配置后续考虑

---

## API draft

### YueTag Props

| Prop | Type | Default | Controlled? | Governs |
| --- | --- | --- | --- | --- |
| `theme` | `YueTagTheme` | `'default'` | no | 语义色角色 |
| `variant` | `YueTagVariant` | `'filled'` | no | 视觉涂色方式 |
| `size` | `ComponentSize` | config 或 `'md'` | no | 高度、内边距、字号 |
| `shape` | `YueTagShape` | `'square'` | no | 圆角处理 |
| `color` | `string` | `undefined` | no | 覆盖 theme 的任意色值，同时派生背景/边框/文字色 |
| `closable` | `boolean` | `false` | no | 是否显示关闭按钮 |
| `disabled` | `boolean` | `false` | no | 禁用所有交互，降低 opacity |
| `maxWidth` | `string \| number` | `undefined` | no | 最大宽度，超出截断 + title tooltip（数字按 px 处理） |
| `tag` | `string \| Component` | `'span'` | no | 渲染元素/组件（与 YueButton 对齐） |

### YueTag Emits

| Event | Payload | When |
| --- | --- | --- |
| `click` | `MouseEvent` | 点击标签且非 disabled 时 |
| `close` | `MouseEvent` | 点击关闭按钮且非 disabled 时 |

### YueTag Slots

| Slot | Fallback | Purpose |
| --- | --- | --- |
| `default` | — | 标签文字内容 |
| `icon` | — | 前置图标（通常 12-14px 图标组件） |
| `close-icon` | 内置 SVG × | 替换默认关闭图标 |

### YueTag Expose

无。标签是纯展示组件，不暴露方法。

### YueTag Attribute routing

- **默认**：attrs 透传到根元素（由 `tag` prop 决定，默认 `<span>`）
- **无重定向**：class/style/data-* 全部落根元素

---

### YueCheckTag Props

| Prop | Type | Default | Controlled? | Governs |
| --- | --- | --- | --- | --- |
| `modelValue` | `boolean` | `undefined` | yes | 选中状态（受控） |
| `defaultChecked` | `boolean` | `false` | no | 非受控初始值 |
| `value` | `string \| number` | `undefined` | no | 标签值，供 CheckTagGroup 使用 |
| `size` | `ComponentSize` | config 或 `'md'` | no | 高度、内边距、字号 |
| `disabled` | `boolean` | `false` | no | 禁用切换 |

`YueCheckTag` 不接受 `theme`/`variant`/`color`——选中态固定为 `theme=primary variant=filled`，未选中态固定为 `theme=default variant=outline`。这是设计决策，不是遗漏。

### YueCheckTag Emits

| Event | Payload | When |
| --- | --- | --- |
| `update:modelValue` | `boolean` | 切换选中状态时 |
| `change` | `{ checked: boolean; value: string \| number \| undefined; e: MouseEvent \| KeyboardEvent }` | 同上，携带完整上下文 |
| `click` | `MouseEvent` | 点击时（disabled 时不触发） |

### YueCheckTag Slots

| Slot | Fallback | Purpose |
| --- | --- | --- |
| `default` | — | 标签文字 |

### YueCheckTag Expose

无。

### YueCheckTag Attribute routing

- 透传到根元素（内部基于 YueTag 渲染，根元素即 YueTag 的根 `<span>`）

---

## Accessibility

### YueTag

- **Role**：`<span>` 的默认 role（无显式 role）；带 `onClick` 时**不**加 `role="button"`——可点击的标签应由消费者决定语义，Tag 本身是标注
- **APG pattern**：N/A
- **Keyboard behavior**：Tag 本身不可聚焦，除非消费者传 `tabindex`；关闭按钮独立可聚焦

| Key | Action |
| --- | --- |
| `Enter` / `Space`（关闭按钮聚焦时） | 触发 close 事件 |

- **关闭按钮**：`<button type="button">` 原生按钮，`aria-label` 从 locale 读取（`tag.closeLabel`，默认 "移除标签" / "Remove tag"）
- **States**：`aria-disabled="true"` 当 disabled（根元素）；关闭按钮在 disabled 时不渲染
- **maxWidth 截断**：截断时根元素加 `title` 属性（文字内容），tooltip 由浏览器原生提供

### YueCheckTag

- **Role**：`role="checkbox"` + `aria-checked`（独立使用时）；在 CheckTagGroup 中改为 `role="option"` + `aria-selected`（后续）
- **APG pattern**：[Checkbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)
- **Keyboard behavior**：

| Key | Action |
| --- | --- |
| `Tab` | 聚焦到标签 |
| `Space` / `Enter` | 切换选中状态 |

- **tabindex**：`0`（可聚焦）；disabled 时 `tabindex="-1"` 且 `aria-disabled="true"`
- **States**：`aria-checked="true|false"`；disabled 时 `aria-disabled="true"`
- **偏差说明**：用 `Enter` 触发是偏差于标准 checkbox（只有 Space），但与 TDesign 一致且符合用户直觉

---

## Token intent

### YueTag tokens

| Axis | Token consumed | Notes |
| --- | --- | --- |
| 高度 | `--tag-height-sm/md/lg` | → `--size-control-sm/md/lg` |
| 内边距 | `--tag-padding-inline-sm/md/lg` | |
| 字号 | `--tag-font-size-sm/md/lg` | |
| 填充色 | `--tag-fill-{theme}` | → semantic color token |
| 填充色（tint） | `--tag-fill-tint-{theme}` | 透明度叠加版本 |
| 文字色 | `--tag-color-{theme}` | |
| 文字色（tint/outline） | `--tag-color-tint-{theme}` | |
| 边框色 | `--tag-border-{theme}` | |
| 圆角 | `--tag-radius` / `--tag-radius-round` | round = `999px` |
| 禁用 opacity | `--tag-opacity-disabled` | → `--opacity-disabled` |
| 关闭图标尺寸 | `--tag-close-icon-size` | |
| 关闭图标间距 | `--tag-close-icon-gap` | 与文字的间距 |

`color` prop 传入时，背景/边框/文字色由 JS 计算（参考 TDesign 的 tinycolor 方案），不走 token。

### YueCheckTag tokens

复用 YueTag 的 token 体系。选中态等同于 `theme=primary variant=filled`，未选中态等同于 `theme=default variant=outline`。额外：

| Axis | Token consumed |
| --- | --- |
| 焦点环 | `--tag-focus-ring-color` → `--color-focus-ring` |
| 焦点环宽度 | `--tag-focus-ring-width` → `--border-width-focus` |

---

## i18n

在 `zh-CN.ts` / `en-US.ts` 各注册：

```ts
// zh-CN
tag: {
  closeLabel: '移除标签',
}

// en-US
tag: {
  closeLabel: 'Remove tag',
}
```

---

## 图标库

引入 `@tabler/icons-vue`。关闭按钮默认使用 `<IconX :size="12" :stroke-width="2" />`，可通过 `close-icon` slot 替换。
这是设计系统级决策，不只影响 Tag——后续所有组件的内置图标统一使用 tabler。

---

## 文件结构

```
packages/vue/src/components/tag/
  YueTag.vue
  YueCheckTag.vue        ← 基于 YueTag 实现
  style.css
  types.ts
  index.ts
```

---

## Breaking changes

N/A — 新组件。

---

## Open questions

- [ ] **color prop 的文字色算法**：用 luminance 阈值（TDesign 方案）还是 APCA？需在实现时验证对比度
- [ ] **CheckTag 在 disabled 时是否渲染 tabindex="-1"**：需确认 NVDA/VoiceOver 行为，可能需要原型验证
