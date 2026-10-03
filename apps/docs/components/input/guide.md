# Input 输入框 · 指南

这一页回答的是「什么时候用它、什么时候不用」，以及状态、无障碍和组合边界上的取舍。API 细节见 [Input · API](/components/input/api)。

## 何时使用

- 需要用户输入**一行文本**：姓名、邮箱、搜索词、金额、编号；
- 需要一个原生表单控件：要参与表单提交、要能被 `<label>` 关联、要被浏览器校验；
- 需要把值交给 `v-model`，并希望输入法、选区、自动填充全部照常工作。

不适合的场合：

- 多行文本 → `YueTextarea`（行高、resize 和高度契约都不同）；
- 数字增减、日期、时间、下拉选择、标签输入 → 各自独立组件；
- 只读信息展示 → 用文本，不要用 `disabled` 输入框当排版工具。

## 掌握三条边界

### 1. 输入框不负责表单布局

label、帮助文本、错误文案、必填标记和 `aria-describedby` 的组织方式属于 `YueField`。把表单布局塞回输入框，会让一个控件同时承担「输入」和「排版」两件事，两边的改动都会牵动对方。

`invalid` 因此只做两件事：设 `aria-invalid="true"`、切换错误边界。**它不渲染错误文案**——错在哪里是业务信息，应该由表单层提供同一个真相来源。

### 2. 输入框不内置图标

`prefix` / `suffix` 是插槽。装饰图标由调用方自己写 `aria-hidden="true"`，因为调用方才知道那个图标是不是纯装饰。**交互控件不要放进装饰 span 里**：那会造出一个看起来像装饰、实际是按钮的东西，键盘顺序和无障碍名称都会变得难以解释。

需要按钮时用两条正路：`clearable`（内置、可访问的那一个），或者把控件放进 `suffix` 但保持它自己的语义——比如密码明文切换。

`clearable` 也是**唯一**的清空入口：浏览器的原生搜索清空按钮不会被保留，因为它只在部分引擎存在、无法用 Token 定制、没有可访问名称，与 `clearable` 并存时还会同时出现两个。细节见 [Input · API](/components/input/api#清空入口只有一个)。

### 3. 输入框不内置图标库

随包发布的样式表不含任何图标资产，也不引用外部字体或 CDN。`clearable` 的叉号是两条伪元素横线画的：没有下载、随 Token 缩放、在强制颜色模式下依然可见。

## 状态与优先级

六个视觉状态各自对应一组 Token：

| 状态 | 触发 | 规则 |
| --- | --- | --- |
| resting | 默认 | `--input-background`、`--input-border-color`、`--input-color` |
| hover | 鼠标悬停，且**可编辑、非只读、非异常** | `--input-border-color-hover` |
| focus-visible | 键盘聚焦 | 焦点环 `--input-focus-ring-*`（不依赖颜色变化） |
| disabled | 原生 `disabled` | 禁用背景、禁用文字、`not-allowed` 光标 |
| readonly | 原生 `readonly` | `--input-background-readonly`，文字保持可读 |
| invalid | `invalid` Prop | `--input-border-color-invalid` |

两条优先级规则值得单独记住：

### 异常状态下的焦点

聚焦不会覆盖错误边界。异常字段的边框**保持错误色**，焦点提示由焦点环承担——于是键盘用户既知道「我在这个字段里」，也知道「这个字段有问题」。

如果反过来（聚焦就把边框换成焦点色），错误信息会在用户最需要它的时候消失；而如果只靠颜色深浅区分两者，色觉障碍用户就同时失去了两个提示。

### 禁用优先于异常

同时 `disabled` 和 `invalid` 时，字段看起来是禁用的。禁用字段不可操作，画一个「注意这里」的错误边界只会让人去点一个点不动的东西。语义上 `aria-invalid` 仍然存在，等它恢复可编辑时会重新起作用。

## 无障碍

### 语义属于原生控件

外层 `<div>` 不是控件：没有 `role`、没有 `tabindex`、不持有值。`id`、`name`、`aria-*` 和 `required` 全都在内部真正的 `<input>` 上，所以：

- `<label for="...">` 能正确关联（点击 label 聚焦输入框）；
- 表单提交、浏览器校验（`:invalid`）、自动填充按平台方式工作；
- 屏幕阅读器读到的是一个标准文本框，而不是「一个 div，里面有个 input」。

### 可访问名称

组件不提供 `label` Prop。名称来自 `label for`、`aria-label` 或 `aria-labelledby`，三者都直接透传到内部 `<input>`。placeholder 不是名称——它在输入后消失，读屏支持也不一致。

### 清空按钮

- 是真正的 `<button type="button">`：可 Tab 到达、可回车/空格触发；
- 有 `aria-label`，取自 locale catalog 的 `input.clear`（默认英文 `Clear`）。它不是组件 Prop——一条文案一个 Prop 只服务一个组件、要在每个调用点重复，还会把「翻译」变成「改标记」；
- 命中区域 24px，大于它画的叉号，满足最小目标尺寸；
- 有自己的 `:hover` 和 `:focus-visible`，因为它是一个独立的 Tab 停靠点，输入框的焦点环不代表它的焦点；
- 清空后焦点回到输入框：清空是重新输入的开始；
- 出现在禁用、只读或空值时是不合理的，所以它不出现。

### 键盘与输入法

- Tab 顺序就是 DOM 顺序：前置内容 → 输入框 → 清空按钮 → 后置内容；
- 输入法组合期间不把中间值交给父组件，避免重渲染打断候选词选择；
- 只读字段仍可获得焦点，所以值可以被键盘选中复制。

### 减弱动效

`--input-duration` 指向 `--motion-duration-interaction`，而 Token 包在 `prefers-reduced-motion: reduce` 下把它归零。所以组件样式表里没有第二份 `prefers-reduced-motion` 块——两处声明就是两个需要同步的地方，而验证断言的是**计算出来的过渡时长**，不是源码里有没有那段媒体查询。

### 强制颜色模式

`forced-colors: active` 下用系统颜色替换 Token：`Field` / `FieldText` 用于字段，`GrayText` 用于禁用，`Mark` 用于错误边界，`Highlight` 用于焦点环。色相在这里不可用，所以任何只靠色相表达的状态都不可靠——这也是错误状态始终由 `aria-invalid` 承载、焦点始终由环而不只是边框颜色承载的原因。

## 与 TDesign 的取舍

参考实现是 `refer/tdesign-common/style/web/components/input` 与 `refer/tdesign-vue-next/packages/components/input`。吸收的是组织方式，不是 API 数量。

### 采纳

| 参考实现 | Yue 的做法 |
| --- | --- |
| 基础 / 禁用 / 异常 / 提示四类状态 | 作为第一阶段就定下来的状态契约，绑定 `aria-invalid` |
| 大中小尺寸 | 复用控制尺寸契约，不新造一套 `sm \| md \| lg` |
| 前置 / 后置内容 | `prefix` / `suffix` 插槽，不绑定图标库 |
| 可清空 | 第二阶段实现为真正的 `<button type="button">`，保留输入焦点 |
| 原生 `maxlength` | 直接透传，不包装 |
| 外层包裹 + 原生 input | 采纳结构，但**先定 DOM 契约再写样式**（见下） |
| 状态 × 主题矩阵做文档与回归 | 采纳：浏览器里逐格量对比度，含每个交互状态 |

### 不采纳

| 参考实现的做法 | 为什么不抄 |
| --- | --- |
| `autoWidth` | 需要 ResizeObserver、字体测量和 SSR 处理，收益不抵复杂度 |
| `format` / `formatter` | 格式化会改变「展示值」和「编辑值」的关系，应先做独立 formatter composable |
| `maxcharacter` / `allowInputOverMax` | 按中文权重计数涉及算法、截断策略和国际化，应为独立 RFC，不做成第一版隐藏能力 |
| `showCount` | 第一版先透传 `maxlength`；计数展示要等计数规则确定 |
| 密码规则提示 | 业务级强度规则不属于基础输入控件 |
| 大量图标 Props（`prefixIcon` 等） | 会把组件绑到一个图标库；插槽已经足够，且不强制依赖 |
| 在 Input 内部注入明文切换 | 组合能力交给 suffix 或后续 `YuePasswordInput`，不在基础组件里藏状态 |
| 内置 Label / 帮助文本 / 错误文本 | 那是 `YueField` 的职责 |
| 拼接多个控件成「组合输入框」 | 交给容器或 Addon，`YueInput` 只负责一个输入框 |

### 为什么外层包裹要先定 DOM 契约

引入包裹层会同时改变四件事：焦点归属、禁用表现、属性透传目标和表单关联。如果先写样式、再回头决定 `id` 该落在 `<div>` 还是 `<input>` 上，之前所有基于样式写下的测试和文档都会跟着失效。

所以顺序是反的：**先写死契约，再写样式**。契约是「外层只画，内部才是控件」，`id` / `name` / `aria-*` 一律进内部 `<input>`，`class` / `style` / `data-*` 留在外层。这四件事各自只有一个明确答案，样式才有稳定的落脚点。

## 还没有的东西

以下能力**故意没有实现**，因为现在没有真实消费方、没有测试、也没有 Token 契约：

- `borderless`（无边框）：需要先定义表面层级和对应的焦点规则；
- `align`：要等真正的数字或代码输入场景；
- `YueField`：label、description、error、required、`aria-describedby` 与布局；
- `YueTextarea`：复用状态与尺寸契约，但有自己的行高、resize 和高度 Token。

`YueInput` 的完成标准不是「API 数量接近 TDesign」，而是：**一个原生输入控件，在不同主题、状态、尺寸和消费者打包方式下，都保持正确的语义、视觉和可验证行为。**
