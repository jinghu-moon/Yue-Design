<script setup lang="ts">
import { ref } from 'vue'

/**
 * Snippets live here rather than inside a `<template #code>` slot: markdown-it does not
 * treat `<template>` as a block-level tag, so a fenced code block nested in a named slot
 * is not reliably parsed, and a snippet that silently renders as a paragraph is worse
 * than no snippet.
 *
 * Every snippet is the markup of the example directly above it.
 */
const basicCode = `const email = ref('')

<YueInput v-model="email" placeholder="you@example.com" />
<p>值是：{{ email }}</p>`

const sizeCode = `const email = ref('')

<YueInput v-model="email" size="sm" placeholder="小" />
<YueInput v-model="email" size="md" placeholder="中" />
<YueInput v-model="email" size="lg" placeholder="大" />

<!-- 不写 size 时取应用级配置 -->
<YueInput v-model="email" placeholder="跟随配置" />`

const stateCode = `<YueInput model-value="可以编辑" />

<YueInput model-value="不可编辑" disabled />
<YueInput model-value="只读，可选中可复制" readonly />
<YueInput model-value="格式不对" invalid />

<!-- 异常与只读可以叠加 -->
<YueInput model-value="只读且异常" readonly invalid />`

const nativeCode = `<!--
  原生属性直接透传到内部的 <input>，不是 Yue 的 Props：
  表单提交、浏览器校验、自动填充和 label 关联都靠它们。
-->
<label for="email-field">邮箱</label>
<YueInput
  id="email-field"
  v-model="email"
  name="email"
  type="email"
  autocomplete="email"
  inputmode="email"
  maxlength="64"
  minlength="3"
  pattern=".+@.+"
  required
  placeholder="you@example.com"
  aria-describedby="email-hint"
/>
<p id="email-hint">我们会用它发送登录链接，不会公开。</p>`

const affixCode = `<!-- 装饰图标由调用方标记 aria-hidden；交互控件不放进来 -->
<YueInput placeholder="金额">
  <template #prefix>
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 8h12M8 3v10" stroke="currentColor" stroke-width="1.5" fill="none" />
    </svg>
  </template>
  <template #suffix><span>元</span></template>
</YueInput>

<YueInput type="search" placeholder="搜索组件">
  <template #suffix>
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M10 10l3.5 3.5" stroke="currentColor" stroke-width="1.5" />
    </svg>
  </template>
</YueInput>`

const clearCode = `const keyword = ref('可以清空')

<!-- 清空控件是真正的 <button type="button">，清空后焦点留在输入框 -->
<YueInput v-model="keyword" clearable placeholder="搜索关键词" />

<!-- 无障碍名称取自 locale catalog 的 input.clear，不是组件 Prop：
     app.use(YueUI, { locale: 'zh-CN', packs: { 'zh-CN': ZhCN } }) -->`

const messagesCode = `// 整个应用换成中文：语言包是独立的入口，不用就不会被打包
import ZhCN from '@yue-ui/vue/locale/zh-CN'

app.use(YueUI, { locale: 'zh-CN', packs: { 'zh-CN': ZhCN } })

// 或只换一个子树：同一页上的两块区域可以各自不同语言
import { provideLocale } from '@yue-ui/vue/locale'

provideLocale({ locale: 'zh-CN', packs: { 'zh-CN': ZhCN } })`

const passwordCode = `<!-- 第一版只透传 type="password"；显示/隐藏交给可组合的 suffix -->
<YueInput type="password" v-model="secret" placeholder="密码" autocomplete="current-password" />

<!-- 明文切换是消费者自己的 suffix 控件，不由基础输入框偷偷注入 -->
<YueInput :type="revealed ? 'text' : 'password'" v-model="secret">
  <template #suffix>
    <button type="button" class="linkish" @click="revealed = !revealed">
      {{ revealed ? '隐藏' : '显示' }}
    </button>
  </template>
</YueInput>`

const narrowCode = `<div class="narrow-demo">
  <YueInput placeholder="窄屏下也不会横向溢出" />
</div>

/* 输入框宽度是 100%，并允许在 flex/grid 列里收缩（min-width: 0），
   所以窄屏只受容器约束；长值由 input 自己横向滚动，不撑破页面。 */
.narrow-demo { width: 100%; max-width: 22rem; }`

const rtlCode = `<!-- dir 落在字段外层：整块字段一起镜像，
     内部 <input> 继承方向，前后置内容跟着换边。 -->
<YueInput dir="rtl" model-value="١٢٣٤" clearable>
  <template #prefix><span aria-hidden="true">#</span></template>
  <template #suffix><span aria-hidden="true">٫</span></template>
</YueInput>`

const matrixCode = `<!-- 状态矩阵：每一格都是一个真实 YueInput，只是 props 不同。
     表格里的 data-input-state 是给 verify:visual 用的钩子，不是必需的 API。 -->
<div v-for="state in matrixStates" :key="state.id" class="matrix-row">
  <span class="matrix-row__label">{{ state.label }}</span>
  <YueInput v-bind="state.props" :data-input-state="state.id" />
</div>`

const themeCode = `<!-- 同一份标记在浅色、深色和任一 Accent 下都成立：
     颜色全部由 --input-* Token 解析，组件里没有一行判断主题。 -->
<YueInput placeholder="占位符也要达到 4.5:1" />
<YueInput model-value="值在前景，可读性由 --input-color 保证" />
<YueInput model-value="只读" readonly />
<YueInput model-value="禁用（WCAG 豁免，只测量不门禁）" disabled />`

const chooseCode = `<!-- 校验失败是「异常」，不是「禁用」：它依然可编辑 -->
<YueInput :invalid="!isValid" v-model="value" />

<!-- 只读用于「能看见、能复制、不能改」的值，比如订单号 -->
<YueInput readonly :model-value="orderNo" />

<!-- 真正不可操作时才用 disabled：它不会被提交，也不会被读屏当可编辑控件 -->
<YueInput disabled :model-value="locked" />`

const email = ref('')
const keyword = ref('可以清空')
const secret = ref('hunter2')
const revealed = ref(false)
const isValid = ref(true)

/** The full state roster the visual matrix walks, spelled out so it cannot drift. */
const matrixStates = [
  { id: 'resting', label: 'resting', props: { modelValue: 'A-1024' } },
  { id: 'placeholder', label: 'placeholder', props: { placeholder: '请输入' } },
  { id: 'disabled', label: 'disabled', props: { modelValue: 'A-1024', disabled: true } },
  { id: 'readonly', label: 'readonly', props: { modelValue: 'A-1024', readonly: true } },
  { id: 'invalid', label: 'invalid', props: { modelValue: 'not-an-email', invalid: true } },
  { id: 'readonly-invalid', label: 'readonly + invalid', props: { modelValue: 'A-1024', readonly: true, invalid: true } },
  { id: 'clearable', label: 'clearable', props: { modelValue: 'A-1024', clearable: true } },
  { id: 'affixed', label: 'prefix / suffix', props: { modelValue: 'A-1024' } },
]
</script>

# Input 输入框

`YueInput` 是一个原生单行 `<input>`：`v-model`、尺寸、状态、前后置内容，以及一个真正的清空按钮。它不负责 label、帮助文本和错误文案——那是 `YueField` 的职责。

每个预览框的右上角都有自己的外观工具条（浅色 / 深色 / Accent / 密度 / 重置），改的是 Token，页面上的每一个示例都会跟着变。

## 基础输入与 v-model

值永远是字符串。基础输入框不会猜 `'42'` 是不是数字，需要转换时由消费者或将来的类型化字段负责。

<PreviewFrame title="基础" description="原生 input 的键盘、输入法和选区行为全部保留。" :code="basicCode">
  <YueInput v-model="email" placeholder="you@example.com" data-input-state="basic" />
</PreviewFrame>

值是：`{{ email }}`

## 尺寸

三档尺寸复用 Button 的控制尺寸契约（`ComponentSize`），不是输入框自己的一套像素。不写 `size` 时回落应用级配置。

<PreviewFrame title="尺寸" description="sm / md / lg，以及不写 size 时回落到配置。" :code="sizeCode" surface-class="preview-frame__surface--stack">
  <YueInput size="sm" placeholder="小" />
  <YueInput size="md" placeholder="中" />
  <YueInput size="lg" placeholder="大" />
  <YueInput v-model="email" placeholder="跟随配置" />
</PreviewFrame>

| `size` | 高度 | 横向内边距 | 字号 | 前后置图标 |
| --- | --- | --- | --- | --- |
| `sm` | `--input-height-sm` | `--input-padding-inline-sm` | `--input-font-size-sm` | `--input-icon-size-sm` |
| `md` | `--input-height-md` | `--input-padding-inline-md` | `--input-font-size-md` | `--input-icon-size-md` |
| `lg` | `--input-height-lg` | `--input-padding-inline-lg` | `--input-font-size-lg` | `--input-icon-size-lg` |

## disabled / readonly / invalid

三者是三件不同的事，视觉上也必须不同：

<PreviewFrame title="三种不可编辑 / 异常状态" description="只读不是禁用；异常也不是禁用。" :code="stateCode" surface-class="preview-frame__surface--stack">
  <YueInput model-value="可以编辑" data-input-state="example-editable" />
  <YueInput model-value="不可编辑" disabled data-input-state="example-disabled" />
  <YueInput model-value="只读，可选中可复制" readonly data-input-state="example-readonly" />
  <YueInput model-value="格式不对" invalid data-input-state="example-invalid" />
  <YueInput model-value="只读且异常" readonly invalid data-input-state="example-readonly-invalid" />
</PreviewFrame>

| 状态 | 原生行为 | 视觉语义 |
| --- | --- | --- |
| `disabled` | 原生 `disabled`：不可聚焦、不提交、读屏不当可编辑 | 禁用背景 + 禁用文字 + 不可操作光标 |
| `readonly` | 原生 `readonly`：**仍可聚焦、可选中复制、仍会提交** | 更安静的背景，文字保持可读 |
| `invalid` | `aria-invalid="true"` | 错误边界 |

::: tip `readonly` 与 `disabled` 的区别不是风格问题
只读字段的用途是「看得见、选得中、复制得走，但改不了」——比如订单号。用 `disabled` 去表达它，会让值变得不可选中、不可复制，也不会随表单提交。两者的对比度门禁也不同：禁用态在 WCAG 里是豁免的，只读态不是，所以只读文字仍然被审计要求达到 4.5:1。
:::

::: warning `invalid` 只表达「校验没过」，不解释原因
它设置 `aria-invalid="true"` 并切换错误边界，但**不渲染任何错误文案**。错在哪里、怎么提示，是 `YueField` 的事——两个组件各写一份错误文案，就有了两个需要同步的真相来源。
:::

异常状态下的焦点优先级见[指南](/components/input/guide#异常状态下的焦点)。

## placeholder 与原生属性

`name`、`autocomplete`、`inputmode`、`required`、`maxlength`、`minlength`、`pattern`、`aria-*`、`id` 都是**原生属性透传**，不是 Yue 的 Props。它们在内部真正的 `<input>` 上，所以 `label for`、表单提交、浏览器校验和自动填充照常工作。

<PreviewFrame title="原生属性" description="label 关联的是内部 input，不是外层 div。" :code="nativeCode" surface-class="preview-frame__surface--stack">
  <label for="email-field" class="field-label">邮箱</label>
  <YueInput
    id="email-field"
    v-model="email"
    name="email"
    type="email"
    autocomplete="email"
    inputmode="email"
    maxlength="64"
    minlength="3"
    pattern=".+@.+"
    required
    placeholder="you@example.com"
    aria-describedby="email-hint"
    data-input-state="native-attrs"
  />
  <p id="email-hint" class="field-hint">我们会用它发送登录链接，不会公开。</p>
</PreviewFrame>

下面的表格说明了每个属性最终落在哪个元素上——这是组件的公开 DOM 契约：

| 属性 | 落在 | 为什么 |
| --- | --- | --- |
| `id`、`name`、`autocomplete`、`inputmode`、`required`、`maxlength`、`minlength`、`pattern`、`aria-*` | 内部 `<input>` | 它们是表单控件语义；放在 `<div>` 上等于没写 |
| `class`、`style`、`data-*` | 外层 `.yue-input` | 它们是「整个组件」的身份与测试钩子 |

## prefix / suffix

插槽，不绑定任何图标库。装饰图标请自己写 `aria-hidden="true"`；**交互控件不要放进装饰 span 里**——需要按钮时用 `clearable` 或自建独立控件。

<PreviewFrame title="前后置内容" description="高度、图标尺寸和间距全部来自 Token。" :code="affixCode" surface-class="preview-frame__surface--stack">
  <YueInput placeholder="金额" data-input-state="affix-prefix">
    <template #prefix>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 8h12M8 3v10" stroke="currentColor" stroke-width="1.5" fill="none" />
      </svg>
    </template>
    <template #suffix><span>元</span></template>
  </YueInput>
  <YueInput type="search" placeholder="搜索组件" data-input-state="affix-search">
    <template #suffix>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="1.5" />
        <path d="M10 10l3.5 3.5" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </template>
  </YueInput>
</PreviewFrame>

插槽只增加装饰：它不会改变值、选区或键盘行为，也不会生成额外的焦点目标。

## clearable

清空控件是真正的 `<button type="button">`：可以被 Tab 到达、有可访问名称、有独立 hover 和 focus-visible 样式。清空之后焦点留在输入框里——清空是「重新输入」的开始，不是编辑的结束。

<PreviewFrame title="可清空" description="清空后焦点仍在输入框；Tab 可以到达清空按钮。" :code="clearCode" surface-class="preview-frame__surface--stack">
  <YueInput v-model="keyword" clearable placeholder="搜索关键词" data-input-state="clearable-demo" />
</PreviewFrame>

清空控件**不会**出现在禁用、只读或空值时：对一个改不了的输入框提供「清空」是在说谎。

### 无障碍名称

清空按钮的 `aria-label` 来自 Yue 的 locale catalog（key `input.clear`），默认英文 `Clear`。它不是组件 Prop——一条文案一个 Prop 只服务一个组件、要在每个调用点重复，还会把「翻译」变成「改标记」。

<PreviewFrame title="同一个字段，三种 locale 来源" description="三个字段的标记完全一样：第一个读页面语言（中文），第二个在一个 locale 子树里读英文，第三个只给了一个地区标签（en-GB），仓库里并没有这个语言包。" :code="messagesCode" surface-class="preview-frame__surface--stack">
  <YueInput v-model="keyword" clearable data-input-state="clearable-default" />
  <LocaleScope locale="en-US">
    <YueInput v-model="keyword" clearable data-input-state="clearable-translated" />
  </LocaleScope>
  <LocaleScope locale="en-GB">
    <YueInput v-model="keyword" clearable data-input-state="clearable-regional" />
  </LocaleScope>
</PreviewFrame>

上面三个字段的标记完全一样，区别只在于外面那层 `LocaleScope` 把子树切到了哪个 locale。组件不知道「语言」存在，它只读 `t('input.clear')`；`verify:visual` 会在真实浏览器里断言三个 `aria-label`：默认读页面语言，第二个等于 `Clear`，第三个同样等于 `Clear`——但第三条是**兜底链**在起作用：仓库里没有 `en-GB` 语言包，`en-GB` 沿 `en-GB → en → en-US` 回落到默认包，而不是报错或渲染出 key。

`provideLocale()` 从 `@yue-ui/vue/locale` 导出，完整契约见[国际化指南](/guide/i18n)。


## 密码

第一版只要求 `type="password"` 正确透传。明文切换是**消费者自己的 suffix 控件**——基础输入框不会偷偷注入图标和内部状态。

<PreviewFrame title="密码" description="明文切换由消费者组合，不在组件内部。" :code="passwordCode" surface-class="preview-frame__surface--stack">
  <YueInput type="password" v-model="secret" placeholder="密码" autocomplete="current-password" data-input-state="password" />
  <YueInput :type="revealed ? 'text' : 'password'" v-model="secret" data-input-state="password-reveal">
    <template #suffix>
      <button type="button" class="linkish" @click="revealed = !revealed">
        {{ revealed ? '隐藏' : '显示' }}
      </button>
    </template>
  </YueInput>
</PreviewFrame>

## 浅色 / 深色 / Accent

输入框的所有颜色都来自 Token，所以切换主题时不需要 JS 参与：`--input-background`、`--input-border-color*`、`--input-color` 和 `--input-placeholder-color` 各自在浅色与深色下解析成不同值。

<PreviewFrame title="同一份标记，三种主题环境" description="用页面顶部的开关切换主题与 Accent；下面这些字段的标记一个字都不用改。" :code="themeCode" surface-class="preview-frame__surface--stack">
  <YueInput placeholder="占位符也要达到 4.5:1" data-input-state="theme-placeholder" />
  <YueInput model-value="值在前景，可读性由 --input-color 保证" data-input-state="theme-resting" />
  <YueInput model-value="只读" readonly data-input-state="theme-readonly" />
  <YueInput model-value="禁用（WCAG 豁免，只测量不门禁）" disabled data-input-state="theme-disabled" />
</PreviewFrame>

深色模式下 Error 边界会换成更深色阶上的浅红，保证它仍然看得见——这些取值都在 `pnpm audit:tokens` 的 110 项门禁里（含只读文字、焦点边界、错误边界、前后置文字和清空控件）。断言不只在 Token 层：`verify:visual` 会在浅色、深色和中性 Accent 三种环境下各量一遍浏览器里真实渲染的结果。

::: tip 组件不知道主题
`YueInput` 里没有一行 JS 判断当前是浅色还是深色，也没有 `theme` Prop。主题是 Token 解析的结果，不是组件的状态——所以服务端渲染不会因为主题不同而产出不同的 HTML。
:::

## 状态矩阵

<PreviewFrame
  title="主题 × 状态"
  description="每一格都是一个真实输入框；浅色与深色的对比度都在 verify:visual 里量过。"
  :code="matrixCode"
  surface-class="preview-frame__surface--matrix"
>
  <div v-for="state in matrixStates" :key="state.id" class="matrix-row">
    <span class="matrix-row__label">{{ state.label }}</span>
    <YueInput
      v-bind="state.props"
      :data-input-state="state.id"
      :placeholder="state.props.placeholder ?? '请输入'"
    />
  </div>
</PreviewFrame>

::: tip 键盘焦点不依赖颜色
`:focus-visible` 会在整个字段外面画一圈焦点环（`--input-focus-ring-*`），而不是只把边框换个颜色。异常状态叠加焦点时，错误边界**保持错误色**，焦点提示由环承担——所以键盘用户不会因为聚焦而失去「这里错了」的信息。
:::

## 窄屏

字段宽度是 `100%`，并允许在 flex / grid 列里收缩（`min-width: 0`），所以窄屏只会受容器约束，不会把页面撑出横向滚动。

<PreviewFrame title="窄宽度" description="390px 视口下无横向溢出，这一条在 verify:visual 里断言。" :code="narrowCode">
  <div class="narrow-demo">
    <YueInput placeholder="窄屏下也不会横向溢出" data-input-state="narrow" />
  </div>
</PreviewFrame>

### RTL

`dir` 属于字段本身而不是它内部的控件：外层才是排布前后置内容的元素。所以 `dir` 落在 `.yue-input` 上，内部 `<input>` 继承它——整块字段一起镜像，而不是只有输入的文字镜像、前后置图标还留在原顺序。

<PreviewFrame title="从右到左" description="前缀在最右，清空按钮在输入框左侧。" :code="rtlCode" surface-class="preview-frame__surface--stack">
  <div class="narrow-demo">
    <YueInput dir="rtl" model-value="١٢٣٤" clearable data-input-state="rtl">
      <template #prefix><span aria-hidden="true">#</span></template>
      <template #suffix><span aria-hidden="true">٫</span></template>
    </YueInput>
  </div>
</PreviewFrame>

把 `dir` 写在祖先容器上也一样：内部的 `<input>` 会继承方向，外层照旧是排布者。

## 什么时候不用它

- 需要 label、帮助文本、错误文案和必填标记 → 等 `YueField`，不要把表单布局塞回输入框；
- 需要多行 → `YueTextarea`，它的行高和 resize 与单行不同；
- 需要数字增减、日期、下拉、标签输入 → 各自独立组件，不用一个 `type` 参数全包；
- 需要数字格式化 → 先做独立的 formatter，再考虑接到输入框上。

## 选哪一个「不可编辑」状态

这三个状态经常被混用，但它们的原生行为完全不同：

<PreviewFrame title="三选一" description="先问「用户还能不能改」，再问「值还要不要提交」。" :code="chooseCode" surface-class="preview-frame__surface--stack">
  <YueInput :invalid="!isValid" model-value="格式不对，但可以继续改" data-input-state="choose-invalid" />
  <YueInput readonly model-value="A-1024（只读，可复制）" data-input-state="choose-readonly" />
  <YueInput disabled model-value="A-1024（禁用，不提交）" data-input-state="choose-disabled" />
</PreviewFrame>

| 想问的问题 | 用 |
| --- | --- |
| 用户改错了，需要重新输入 | `invalid` |
| 值由系统给出，用户只能看和复制 | `readonly` |
| 这个字段当前完全不适用 | `disabled` |
