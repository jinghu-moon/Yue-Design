# YueInput 输入框分阶段实现路线图

> 状态：阶段 0–4、6 已完成；阶段 5 按真实消费场景保留（未实现，理由见阶段 5 与 README）
>
> 目标：在不复制 TDesign API 的前提下，完成一个 Token 驱动、原生语义优先、可按需打包、支持浅色/深色模式的 `YueInput`。

## 1. 研究结论

本路线图参考了以下 TDesign 资料：

- `refer/tdesign-common/docs/web/_design/输入框 Input.md`
- `refer/tdesign-common/docs/web/api/input.md`
- `refer/tdesign-common/docs/web/design/input.md`
- `refer/tdesign-vue-next/packages/components/input/input.md`
- `refer/tdesign-vue-next/packages/components/input/props.ts`

TDesign Input 值得吸收的核心不是完整 API 数量，而是以下组织方式：

| 参考能力 | Yue 的采用方式 |
| --- | --- |
| 基础输入、禁用、异常、提示 | 作为第一阶段的核心状态，并绑定 `aria-invalid`、`aria-describedby` |
| 大中小尺寸 | 复用 Button 的控制尺寸契约，避免每个组件重新定义尺寸体系 |
| 前置 / 后置内容 | 使用 `prefix`、`suffix` 插槽，不绑定任何图标库 |
| 可清空 | 第二阶段实现为真正的 `type="button"` 清空控制，保留输入焦点 |
| 密码输入 | 先支持原生 `type="password"`；显示/隐藏按钮作为后续可组合能力 |
| 字数限制 | 优先透传原生 `maxlength`；复杂中文字符计数另立阶段，不塞进核心输入框 |
| 无边框模式 | 作为视觉变体候选，先验证是否与 Yue 的 Token 层级和焦点契约一致 |
| 组合输入框 | 交给容器、Addon 或后续 Field 组件，不在 `YueInput` 内部拼接多个控件 |
| Label、帮助文本、错误文本 | 不内置在 Input；由后续 `YueField` 负责，避免一个组件同时承担控件和表单布局 |

TDesign 的 `autoWidth`、`format`、`maxcharacter`、`allowInputOverMax`、复杂密码规则提示和大量图标 Props 暂不进入第一版。它们会显著扩大状态机、国际化和无障碍测试面，且不是一个基础文本输入控件的必要契约。

## 2. Yue 的目标边界

### 2.1 组件职责

`YueInput` 只负责一个原生单行 `<input>` 及其可组合的前后内容：

- 保持原生输入、键盘、表单提交和浏览器校验语义；
- 提供 `v-model`、尺寸、状态和只读/禁用行为；
- 提供 prefix/suffix 插槽；
- 通过 Token 处理浅色、深色、Accent、forced-colors 和动效偏好；
- 把可访问名称、描述和错误关联交给原生属性及 `YueField`。

### 2.2 明确不负责

第一版不负责：

- 表单布局、Label、帮助文案和校验编排；
- 数字增减、日期选择、Select、TagInput 等复合输入；
- 内置图标字体或默认图标 SVG；
- 自动宽度测量和 formatter；
- 业务级密码强度规则；
- 通过 JS 判断浅色/深色主题。

## 3. 分阶段路线

### 阶段 0：建立基线与 Token 缺口审计

目标是确认现有 Token 能支撑组件，而不是先写 CSS 再补 Token。

工作项：

1. 记录当前基线：`typecheck`、`build`、`test`、`audit:tokens`、`verify:dist`、`verify:all`。
2. 审计 `packages/tokens/src/components.css` 中已有的 `--input-*`、控制尺寸、禁用、焦点和错误 Token。
3. 判断是否需要补充以下组件 Token：
   - `--input-background-readonly`；
   - `--input-border-color-invalid-hover`；
   - `--input-border-color-invalid-focus`；
   - prefix/suffix 间距与图标尺寸；
   - clear 控制的命中区域和颜色。
4. 统一 Button 与 Input 的尺寸类型来源。不要再创建一套无法同步的 `sm | md | lg` 联合类型；优先抽取公共 `ComponentSize` 或明确的控制尺寸契约。
5. 为每个新增 Token 建立浅色/深色对比度配对；没有实际消费方的 Token 不提前添加。

验收：

- Token 审计没有未登记 Token；
- 原型基线 `design-tokens-generic-v4/` 不被修改；
- 新增 Token 都能说明消费者、模式和对比度阈值。

### 阶段 1：最小可用 `YueInput`

先完成一个可发布的单行原生输入，不实现复杂装饰。

建议文件：

```text
packages/vue/src/components/input/
├─ YueInput.vue
├─ index.ts
├─ types.ts
├─ style.css
└─ YueInput.test.ts
```

第一版 API 草案：

```ts
interface YueInputProps {
  modelValue?: string
  size?: ComponentSize
  type?: 'text' | 'search' | 'email' | 'url' | 'tel' | 'password'
  disabled?: boolean
  readonly?: boolean
  invalid?: boolean
  placeholder?: string
}
```

以下原生属性必须透传，而不是重复包装成 Yue Props：`name`、`autocomplete`、`inputmode`、`required`、`maxlength`、`minlength`、`pattern`、`aria-*`、`data-*`、`id`、`class` 和 `style`。

事件契约：

```ts
interface YueInputEmits {
  (event: 'update:modelValue', value: string): void
  (event: 'input', event: Event): void
  (event: 'change', event: Event): void
  (event: 'focus', event: FocusEvent): void
  (event: 'blur', event: FocusEvent): void
}
```

实现约束：

- 默认渲染 `<input type="text">`；不使用自定义 div 模拟输入框；
- `disabled` 使用原生 `disabled`，`readonly` 使用原生 `readonly`；
- `invalid` 设置 `aria-invalid="true"`，但不代替错误说明；
- `v-model` 只以字符串为基础，不在基础组件内隐式转换数字；
- 使用 `inheritAttrs: false` 时，像 Button 一样明确管理属性，防止 `$attrs` 覆盖受控属性；
- CSS 使用 `.yue-input` BEM 类名和 `--input-*` Component Token，不复用原型 `.input` 选择器；
- 不使用 `<style scoped>`，组件 CSS 作为独立入口发布。

阶段 1 不提供 `clearable`、`prefix`、`suffix`，先验证最小输入链路和原生行为。

验收：

- `@yue-ui/vue/input`、`@yue-ui/vue/input.css` 可独立导入；
- 根入口命名导出和 plugin 入口行为正确；
- `v-model`、原生属性、禁用、只读、异常、焦点和事件测试通过；
- 单组件树摇产物不包含未使用组件。

### 阶段 2：状态、主题与可访问性契约

这一阶段解决“看起来像输入框”之外的状态正确性。

视觉状态：

| 状态 | 规则 |
| --- | --- |
| resting | 使用 `--input-background`、`--input-border-color`、`--input-color` |
| hover | 使用 `--input-border-color-hover`；disabled/readonly 不误触发 hover |
| focus-visible | 使用焦点 Token 和清晰边界；不依赖颜色变化作为唯一焦点提示 |
| disabled | 原生 disabled、禁用背景、禁用文字和不可操作光标 |
| readonly | 保留可聚焦和可复制行为，与 disabled 使用不同视觉语义 |
| invalid | `aria-invalid="true"`、错误边界；focus-visible 不得覆盖错误语义 |
| forced-colors | 使用系统颜色，不能依赖背景色表达状态 |

测试必须覆盖：

- 浅色、深色、neutral Accent；
- resting、hover、focus-visible、disabled、readonly、invalid；
- 错误状态下 focus-visible 的优先级；
- 键盘 Tab 顺序、原生 disabled 行为和 readonly 可复制行为；
- 390px 页面无横向溢出；
- `prefers-reduced-motion` 下没有强制动画；
- DOM 生成的每个类都能被已加载 CSS 规则命中。

### 阶段 3：前后置内容与可组合能力

参考 TDesign 的前后置标签、prefixIcon、suffixIcon，但结合 Yue“不内置图标库”的边界，采用插槽：

```ts
interface YueInputSlots {
  prefix?: () => unknown
  suffix?: () => unknown
}
```

建议结构：

```html
<div class="yue-input">
  <span class="yue-input__prefix">...</span>
  <input class="yue-input__native" />
  <span class="yue-input__suffix">...</span>
</div>
```

注意：外层包裹会改变焦点、禁用、属性透传和表单关联方式，必须先确定公共 DOM 契约，再写样式。prefix/suffix 中的装饰图标默认应由调用方标记 `aria-hidden="true"`；交互控件不能放在装饰 span 中伪装成图标。

验收：

- prefix/suffix 不改变输入值、选择和键盘行为；
- 长文本、窄屏和 RTL 候选场景不造成溢出；
- 输入框高度、图标尺寸、间距全部由 Token 控制；
- 插槽内容不引入外部图标 CDN 或字体依赖。

### 阶段 4：清空、密码和长度反馈

把 TDesign 示例中高频、可独立验证的能力拆开实现。

#### 4.1 `clearable`

建议 API：

```ts
clearable?: boolean
```

清空控件必须是真正的 `<button type="button">`，而不是可点击的 span；需要：

- `aria-label`，默认文案可通过文档约定或后续 locale 机制提供；
- 清空后发出 `update:modelValue` 和 `clear` 事件；
- 清空不让输入框失焦；
- disabled、readonly、空值时不显示或不可操作；
- 清空控件有独立 hover/focus-visible/forced-colors 样式。

#### 4.2 密码

第一版只要求 `type="password"` 正确透传。显示/隐藏明文按钮应作为可组合 suffix 控件，或在后续 `YuePasswordInput` 中实现，不在基础 Input 内偷偷注入图标和状态。

#### 4.3 长度反馈

优先透传原生 `maxlength`，再决定是否增加 `show-count`。TDesign 的 `maxcharacter` 是按中文字符权重计数的额外规则，涉及计数算法、输入截断、超限策略和国际化，应作为独立 RFC，不作为第一版隐藏能力。

### 阶段 5：可选变体与表单边界

这一阶段只有在真实消费场景出现后才实现：

- `borderless`：只在明确的表面层级和焦点规则定义后加入；
- `align`：若确实有数字或代码输入场景，再加入 `left | center | right`；
- `autoWidth`：需要 ResizeObserver、字体测量和 SSR 处理，默认不加入；
- `format`：格式化会改变展示值和编辑值的关系，应优先建设独立 formatter composable；
- `YueField`：负责 label、description、error、required、`aria-describedby` 和布局，不把这些职责塞回 Input；
- `YueTextarea`：复用状态和尺寸契约，但拥有独立的行高、resize 和高度 Token。

禁止为了对齐 TDesign API 数量而加入没有消费方、没有测试和没有 Token 契约的 Props。

### 阶段 6：文档、构建与发布验证

沿用 Button 的三页文档结构：

```text
apps/docs/components/input.md          # 示例
apps/docs/components/input/api.md      # Props / Emits / Slots / 原生属性
apps/docs/components/input/guide.md    # 何时使用、状态、无障碍和组合边界
```

示例页至少包含：

1. 基础输入和 v-model；
2. 尺寸；
3. disabled / readonly / invalid；
4. placeholder 与原生属性；
5. prefix / suffix；
6. clearable；
7. password；
8. 浅色 / 深色 / Accent；
9. 主题 × 状态矩阵；
10. 移动端窄宽度。

不得直接引用 TDesign 的远程图片或 CDN 资源。文档示例必须渲染真实 `YueInput`，代码片段与实际组件保持同源。

## 4. 最终验收门禁

实现完成后，必须按以下顺序验证：

```bash
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm audit:tokens
corepack pnpm verify:dist
corepack pnpm verify:treeshaking
corepack pnpm verify:visual
corepack pnpm verify:tarball
corepack pnpm verify:all
```

新增门禁要求：

- `@yue-ui/vue/input` 的 JavaScript 和 CSS 入口存在且 exports 指向真实文件；
- Button 既有测试和原有视觉基线不回归；
- Input 所有公开类名都有 CSS 规则，只有明确登记的默认类可以例外；
- Token 包与冻结原型的共享解析值没有漂移；
- 新增对比度配对在浅色/深色 profile 全部通过；
- 真实浏览器逐格验证至少覆盖 resting、hover、focus-visible、disabled、readonly、invalid；
- tarball 安装后可以在独立消费者中加载、类型检查和真实渲染；
- 单组件入口不包含 plugin 注册路径和未使用组件代码；
- docs 构建无外部资源请求、无控制台错误、无移动端横向溢出。

## 5. 推荐实施顺序

```text
阶段 0  Token 缺口与公共尺寸契约
  ↓
阶段 1  最小原生 YueInput
  ↓
阶段 2  状态、主题、可访问性
  ↓
阶段 3  prefix / suffix 插槽
  ↓
阶段 4  clearable、password、maxlength 展示
  ↓
阶段 5  真实需求驱动的 borderless / align / YueField / YueTextarea
  ↓
阶段 6  三页文档、视觉矩阵、树摇、tarball、全量回归
```

第一阶段完成标准不是“API 数量接近 TDesign”，而是：

> 一个原生输入控件，在不同主题、状态、尺寸和消费者打包方式下，都保持正确的语义、视觉和可验证行为。
