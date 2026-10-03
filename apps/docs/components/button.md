<script setup lang="ts">
import { ref } from 'vue'

/**
 * Snippets live here rather than inside a `<template #code>` slot: markdown-it
 * does not treat `<template>` as a block-level tag, so a fenced code block nested
 * in a named slot is not reliably parsed, and a snippet that silently renders as
 * a paragraph is worse than no snippet.
 *
 * Every snippet is the markup of the example directly above it.
 */
const basicCode = `<YueButton>保存</YueButton>`

const themeCode = `<YueButton theme="default">默认</YueButton>
<YueButton theme="primary">主要</YueButton>
<YueButton theme="success">成功</YueButton>
<YueButton theme="warning">警告</YueButton>
<YueButton theme="danger">危险</YueButton>`

const variantCode = `<YueButton theme="primary" variant="solid">Solid</YueButton>
<YueButton theme="primary" variant="outline">Outline</YueButton>
<YueButton theme="primary" variant="dashed">Dashed</YueButton>
<YueButton theme="primary" variant="text">Text</YueButton>
<YueButton theme="primary" variant="link">Link</YueButton>`

const solidOutlineCode = `<YueButton theme="default" variant="solid">Solid</YueButton>
<YueButton theme="default" variant="outline">Outline</YueButton>
<YueButton theme="default" variant="dashed">Dashed</YueButton>
<YueButton theme="default" variant="text">Text</YueButton>
<YueButton theme="default" variant="link">Link</YueButton>`

const matrixCode = `<YueButton
  v-for="theme in themes"
  :key="theme"
  :theme="theme"
  variant="solid"
>{{ theme }}</YueButton>`

const focusCode = `/* hover 与 focus-visible 共享同一个颜色状态：键盘用户看到的
 * 「当前是哪一个」与鼠标用户一致。焦点环是另一条声明，
 * 不会被填充色顶掉。 */
.yue-button--solid:hover:not(.is-disabled):not(.is-loading),
.yue-button--solid:focus-visible:not(.is-disabled):not(.is-loading) {
  background-color: var(--_fill-hover);
}`

const sizeCode = `<YueButton size="sm">小</YueButton>
<YueButton size="md">中</YueButton>
<YueButton size="lg">大</YueButton>

<!-- 不写 size 时取应用级配置 -->
<YueButton>跟随配置</YueButton>`

const shapeCode = `<YueButton shape="square">直角</YueButton>
<YueButton shape="round">圆角</YueButton>
<YueButton shape="circle" aria-label="搜索" variant="outline">
  <template #leading><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M10 10l3.5 3.5" stroke="currentColor" stroke-width="1.5" /></svg></template>
</YueButton>`

const disabledCode = `<YueButton disabled>默认</YueButton>
<YueButton theme="primary" disabled>主要</YueButton>
<YueButton variant="outline" disabled>描边</YueButton>
<YueButton variant="link" disabled>链接</YueButton>`

const tagCode = `<!-- 渲染成 <a>：没有原生 disabled，改用 aria-disabled + tabindex="-1" -->
<YueButton tag="a" href="/pricing">查看定价</YueButton>
<YueButton tag="a" href="/pricing" disabled>查看定价（禁用）</YueButton>

<!-- loading 在 <a> 上和 <button> 上说的是同一句话：忙，但仍然可以按 Tab 到达。
     它不会把自己伪装成 disabled（不写 aria-disabled、不写 tabindex），
     拦下点击的是处理器。 -->
<YueButton tag="a" href="/pricing" loading>提交中</YueButton>

<!-- 也可以是任何组件；放在响应式状态里记得 markRaw -->
<YueButton :tag="RouterLink" to="/pricing">查看定价</YueButton>`

const loadingStabilityCode = `<!-- 两个按钮的文字、图标、尺寸完全相同，只有 loading 不同 -->
<YueButton size="lg">
  <template #leading><PlusIcon /></template>
  保存更改
</YueButton>

<YueButton size="lg" loading>
  <template #leading><PlusIcon /></template>
  保存更改
</YueButton>`

const blockCode = `<YueButton theme="primary" block>整行按钮</YueButton>`

const slotCode = `<YueButton theme="primary">
  <template #leading><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" /></svg></template>
  新建
</YueButton>

<YueButton variant="outline">
  更多
  <template #trailing><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" /></svg></template>
</YueButton>`

const entryCode = `// 只用一个组件：不引入插件，打包器只保留这一条链路
import YueButton from '@yue-ui/vue/button'
import '@yue-ui/vue/button.css'
import '@yue-ui/design-tokens/index.css'

// 或者按名导入
import { YueButton } from '@yue-ui/vue'
import '@yue-ui/vue/style.css'
import '@yue-ui/design-tokens/index.css'

// 或者全量注册（唯一会触碰 app 的入口）
import { createApp } from 'vue'
import YueUI from '@yue-ui/vue/plugin'
import '@yue-ui/vue/style.css'
import '@yue-ui/design-tokens/index.css'

createApp(App).use(YueUI, { size: 'md' }).mount('#app')`

const overrideCode = `/* 推荐：重指组件 Token。Token 住在 components 层，用 demo 层覆写即可生效。 */
@layer demo {
  :root {
    --button-primary-background: var(--accent-solid);
  }
}

/* 只想改某一块区域，就在容器上重指组件 Token，按钮自己不需要知道。 */
.checkout-actions {
  --button-height-md: var(--size-28);
  --button-padding-inline-md: var(--space-8);
}`

const submitting = ref(false)
async function submit() {
  submitting.value = true
  await new Promise((resolve) => setTimeout(resolve, 1200))
  submitting.value = false
}

/**
 * The full matrix, spelled out rather than derived from the component's types: the
 * documentation should fail to build if someone adds a theme or variant and forgets
 * to show it here.
 */
const matrixThemes = ['default', 'primary', 'success', 'warning', 'danger']
const matrixVariants = ['solid', 'outline', 'dashed', 'text', 'link']

const anatomyCode = `<YueButton size="lg">
  <template #leading><SaveIcon /></template>
  保存
  <template #trailing><CaretDownIcon /></template>
</YueButton>

<!-- loading：内容留在原位，加载层盖在上面，宽度不跳 -->
<YueButton size="lg" loading>保存</YueButton>`

const loaderCode = `<!-- 默认：spinner，aria-hidden -->
<YueButton theme="primary" :loading="submitting" @click="submit">
  {{ submitting ? '提交中' : '提交' }}
</YueButton>

<!-- 自定义：仍然是按钮自己的指示器，不绑定任何图标库 -->
<YueButton loading>
  <template #loader><span class="my-loader" /></template>
  上传
</YueButton>`

const groupCode = `<!-- 只是拼在一起：合并圆角 + role="group"，没有选择状态 -->
<YueButtonGroup aria-label="对齐方式">
  <YueButton variant="outline">左</YueButton>
  <YueButton variant="outline">居中</YueButton>
  <YueButton variant="outline">右</YueButton>
</YueButtonGroup>

<!-- 分段控件：分组之上加一个 v-model，选中项输出 aria-pressed -->
<YueButtonToggle v-model="align" aria-label="对齐方式">
  <YueButtonToggleItem value="left">左</YueButtonToggleItem>
  <YueButtonToggleItem value="center">居中</YueButtonToggleItem>
  <YueButtonToggleItem value="right">右</YueButtonToggleItem>
</YueButtonToggle>`

const toggleItemCode = `<!-- 每一项仍然是按钮：theme / variant / size / loading 都能单独给 -->
<YueButtonToggle v-model="viewMode" aria-label="视图">
  <YueButtonToggleItem value="list" variant="outline">
    <template #leading><ListIcon /></template>
    列表
  </YueButtonToggleItem>
  <YueButtonToggleItem value="grid" variant="outline">网格</YueButtonToggleItem>
  <YueButtonToggleItem value="board" variant="outline" disabled>看板</YueButtonToggleItem>
</YueButtonToggle>

<!-- 可以全部关掉的一组按钮：分组 + 各自独立的 active -->
<YueButtonGroup aria-label="文本格式">
  <YueButton variant="text" :active="bold" @click="bold = !bold">粗体</YueButton>
  <YueButton variant="text" :active="italic" @click="italic = !italic">斜体</YueButton>
</YueButtonGroup>`

const align = ref('center')
const viewMode = ref('list')
const bold = ref(true)
const italic = ref(false)
</script>

# Button 按钮

本页是 **示例**：所有区域渲染真实的 `YueButton`（以及 Button 族的 `YueButtonGroup`、`YueButtonToggle`、`YueButtonToggleItem`）。接口表见 [API](./button/api)，使用原则见[指南](./button/guide)。

按钮是 `@yue-ui/vue` 的第一个组件，也是整条链路（Token → Hooks → 组件 → 文档 → 打包消费）的验证用例。

页面上的每个示例渲染的都是**真实的组件**：同一份组件源码、同一份 `@yue-ui/vue/style.css`。它们不是截图，也不是抄写下来的 HTML —— 如果组件坏了，这一页就会跟着坏。

## 按需引入示例

三个入口，各管一件事：

<PreviewFrame title="三个入口" description="根入口只做命名导出，插件入口才注册组件。" :code="entryCode">
  <YueButton theme="primary">命名导入</YueButton>
  <YueButton>根入口</YueButton>
  <YueButton variant="outline">插件注册</YueButton>
</PreviewFrame>

| 入口 | 作用 |
| --- | --- |
| `@yue-ui/vue` | 命名导出，不注册任何组件；打包器只保留用到的部分 |
| `@yue-ui/vue/button` | 单组件入口，`default` 就是 `YueButton` |
| `@yue-ui/vue/plugin` | 全量注册，唯一会调用 `app.component()` 的入口 |
| `@yue-ui/vue/style.css` | 全部组件样式 |
| `@yue-ui/vue/button.css` | 只有 Button 的样式 |

::: tip 样式必须显式引入
组件不解析 CSS：`dist/*.js` 里没有任何样式导入。这样 ESM 入口在 Node / SSR 下也能直接解析，级联顺序也留在你自己的源码里可见。
:::

## 组件解剖（Anatomy）

按钮不是一个 `<button>` 加一段文字。它有六个部分，每一部分都由一个类名、若干 Component Token 和一条无障碍规则定义。先看结构，再看后面的 API 表会容易得多。

<ButtonAnatomy />

<PreviewFrame title="解剖图对应的真实代码" description="上面的两个按钮就是这段代码渲染出来的，加载层也在里面。" :code="anatomyCode">
  <YueButton size="lg">
    <template #leading>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </template>
    保存
    <template #trailing>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </template>
  </YueButton>
  <YueButton size="lg" loading>保存</YueButton>
</PreviewFrame>

| # | 部分 | 选择器 | 由什么决定 |
| --- | --- | --- | --- |
| 1 | 外层按钮盒 | `.yue-button` | `--button-height-*`、`--button-padding-inline-*`、`--button-border-width`、`--button-border-radius` |
| 2 | 前置内容 | `.yue-button__icon--leading` | `leading` 插槽；`--button-icon-size-*`、`--button-gap` |
| 3 | 文本区域 | `.yue-button__label` | 默认插槽；`--button-font-size-*`、`--button-font-weight`、`--button-line-height` |
| 4 | 后置内容 | `.yue-button__icon--trailing` | `trailing` 插槽；与前置内容同一套尺寸 Token |
| 5 | 加载层 | `.yue-button__loader` | `loading` 为真时渲染；`loader` 插槽或默认的 `.yue-button__spinner` |
| 6 | 焦点环与点击区域 | `.yue-button:focus-visible` | `--button-focus-ring-*`；点击区域就是控件盒本身（`link` 例外） |

三条结构约定值得单独记住：

- **加载层是独立的一层。** 它绝对定位覆盖在内容之上，因此 loading 不会改变按钮宽度，也不会把 label 从无障碍树里摘掉 —— 见下面的[加载状态](#加载状态)。
- **内容不会被替换，只会被隐藏。** loading 时 `leading` / `trailing` 仍然是它们在 DOM 里的那个位置，只是被画成透明；换掉某个插槽是最容易被写下去、也最容易被忽略的布局抖动来源。
- **`link` 主动放弃盒子。** 它的第 1 部分没有固定高度和横向内边距，点击区域明显更小 —— 这就是为什么它只适合嵌在句子里。

## 基础示例

<PreviewFrame title="基础示例" description="不传任何属性时：theme=default、variant=solid、size=md、shape=square。" :code="basicCode">
  <YueButton>保存</YueButton>
</PreviewFrame>

## 主题变体

`theme` 决定按钮「是干什么的」，也就是它取哪一组语义色。

<PreviewFrame title="主题变体" description="五个语义角色，与 variant 相互独立。" :code="themeCode">
  <YueButton theme="default">默认</YueButton>
  <YueButton theme="primary">主要</YueButton>
  <YueButton theme="success">成功</YueButton>
  <YueButton theme="warning">警告</YueButton>
  <YueButton theme="danger">危险</YueButton>
</PreviewFrame>

| `theme` | 语义 | 实心填充来源 | 实心对比度（浅 / 深） |
| --- | --- | --- | --- |
| `default` | 中性操作 | `--button-default-background` | 16.48 / 16.29 |
| `primary` | 页面主操作 | `--button-primary-background` | 4.54 / 5.58 |
| `success` | 确认 / 完成 | `--button-success-background` | 6.55 / 7.06 |
| `warning` | 需要注意 | `--button-warning-background` | 5.73 / 11.56 |
| `danger` | 破坏性操作 | `--button-danger-background` | 6.31 / 9.96 |

对比度不是估的：`--button-{theme}-color` 落在 `--button-{theme}-background` 上、悬停与按下两个状态、未填充变体的 accent 文字，以及选中态的 `--button-selected-*`，都在 `pnpm audit:tokens` 的 110 项门禁里（这个数字由 `tools/token-audit.pairs.mjs` 决定，`audit:docs` 会检查它有没有写错）。

## Solid / Outline / Dashed / Text / Link

`variant` 决定「怎么画」，与 `theme` 正交。它们回答的是两个不同的问题：

- **要不要外壳** —— `solid` 填充，`outline` / `dashed` 描边，`text` 什么都不画；
- **占不占盒子** —— 除 `link` 外都保留完整控件盒（固定高度 + 横向内边距），所以点击区域和其他按钮一致；`link` 故意去掉盒子，因为它要嵌在句子中间。

<PreviewFrame title="主色上的五种画法" description="同一个 theme，五种权重。" :code="variantCode">
  <YueButton theme="primary" variant="solid">Solid</YueButton>
  <YueButton theme="primary" variant="outline">Outline</YueButton>
  <YueButton theme="primary" variant="dashed">Dashed</YueButton>
  <YueButton theme="primary" variant="text">Text</YueButton>
  <YueButton theme="primary" variant="link">Link</YueButton>
</PreviewFrame>

<PreviewFrame title="中性色上的五种画法" description="切换 theme 不需要改 variant。" :code="solidOutlineCode">
  <YueButton theme="default" variant="solid">Solid</YueButton>
  <YueButton theme="default" variant="outline">Outline</YueButton>
  <YueButton theme="default" variant="dashed">Dashed</YueButton>
  <YueButton theme="default" variant="text">Text</YueButton>
  <YueButton theme="default" variant="link">Link</YueButton>
</PreviewFrame>

| `variant` | 填充 | 边框 | 文字 | 盒子 | 用途 |
| --- | --- | --- | --- | --- | --- |
| `solid` | 主题实心色 | 无 | 实心上的内容色 | 有 | 页面上唯一的主操作 |
| `outline` | `--surface` | 实线，主题可读色 | 主题可读色 | 有 | 次级操作，需要边界感 |
| `dashed` | `--surface` | 虚线，主题可读色 | 主题可读色 | 有 | 「新增」「添加配置」等低频动作，虚线本身就在说「这里还能加东西」 |
| `text` | 透明 | 无 | 主题可读色 | 有 | 工具栏、表格行内、密集区域 |
| `link` | 透明 | 无 | `--button-link-color` | **无** | 嵌在句子里的行内跳转 |

::: tip `text` 与 `link` 的边界
两者都「没有外壳」，但只有一个保留盒子。

`text` 是**安静一点的按钮**：高度和内边距与 `solid` 完全一致，点击区域一样大，悬停时用共享的淡色覆盖层给出反馈。`link` 是**行内动作**：没有固定高度、没有横向内边距，读链接色，悬停加下划线。

所以工具栏里用 `text`，句子里用 `link`。不要用 `link` 当「更轻的按钮」——它的点击区域会小到不该有的程度。
:::

::: warning 未填充变体的文字色不是 solid 的文字色
`solid` 的文字是「饱和填充色上的内容色」（浅色模式下是白色），放到白底上就看不见了。所以 `outline` / `dashed` / `text` 读的是另一组 Token：`--button-{theme}-accent`，它们各自指向一个语义文字角色，且每一条都被对比度门禁覆盖。
:::

### hover 与 focus-visible 共享一个状态

<PreviewFrame title="键盘与鼠标看到同一个提示" description="聚焦后按 Tab 走一遍，填充色与悬停一致，焦点环始终保留。" :code="focusCode">
  <YueButton theme="primary" variant="solid">主操作</YueButton>
  <YueButton variant="outline">次级操作</YueButton>
  <YueButton variant="dashed">新增一项</YueButton>
  <YueButton variant="text">工具</YueButton>
</PreviewFrame>

焦点环是**独立声明**，不会被填充色顶掉：`outline: none` 这类重置没有采纳，因为它会把键盘用户唯一的位置提示删掉。

## 主题 × 变体矩阵

把 5 个主题和 5 种画法铺开，用来检查每个组合——尤其是深色模式下填充与文字会不会一起翻车。

<PreviewFrame
  title="主题 × 变体"
  description="每一格都是一个真实按钮；浅色与深色的对比度都在 verify:visual 里量过。"
  :code="matrixCode"
  surface-class="preview-frame__surface--matrix"
>
  <div v-for="variant in matrixVariants" :key="variant" class="matrix-row">
    <span class="matrix-row__label">{{ variant }}</span>
    <YueButton
      v-for="theme in matrixThemes"
      :key="theme"
      :theme="theme"
      :variant="variant"
      :data-matrix="`${variant}-${theme}`"
    >
      {{ theme }}
    </YueButton>
  </div>
</PreviewFrame>

<PreviewFrame
  title="状态矩阵"
  description="禁用与加载在每一档主题上的样子；禁用态是 WCAG 明确豁免的，所以只校验它用的是不是约定 Token。"
  surface-class="preview-frame__surface--matrix"
>
  <div v-for="theme in matrixThemes" :key="theme" class="matrix-row">
    <span class="matrix-row__label">{{ theme }}</span>
    <YueButton :theme="theme" :data-state="`${theme}-normal`">正常</YueButton>
    <YueButton :theme="theme" :data-state="`${theme}-disabled`" disabled>禁用</YueButton>
    <YueButton :theme="theme" :data-state="`${theme}-loading`" loading>加载</YueButton>
  </div>
</PreviewFrame>

## 尺寸

<PreviewFrame title="尺寸" description="sm / md / lg，以及不写 size 时回落到配置。" :code="sizeCode" surface-class="preview-frame__surface">
  <YueButton size="sm">小</YueButton>
  <YueButton size="md">中</YueButton>
  <YueButton size="lg">大</YueButton>
  <YueButton>跟随配置</YueButton>
</PreviewFrame>

三个尺寸档位不是硬编码的像素，而是各自指向一组几何 Token：

| `size` | 高度 | 横向内边距 | 字号 | 图标 |
| --- | --- | --- | --- | --- |
| `sm` | `--button-height-sm` | `--button-padding-inline-sm` | `--button-font-size-sm` | `--button-icon-size-sm` |
| `md` | `--button-height-md` | `--button-padding-inline-md` | `--button-font-size-md` | `--button-icon-size-md` |
| `lg` | `--button-height-lg` | `--button-padding-inline-lg` | `--button-font-size-lg` | `--button-icon-size-lg` |

不传 `size` 时用应用级配置里的 `size`（默认 `md`）。配置通过插件选项或 `provideYueConfig()` 提供；组件自身的 `size` 永远优先。

::: warning 命名空间是固定的，不是配置项
`useNamespace('button')` 产出 `yue-button`，这个 `yue` 来自 `YUE_NAMESPACE` 常量，
`YueConfig` 里**没有** `prefix`。

原因很实际：CSS 选择器无法在运行时由变量拼出来。一旦命名空间可配置，类名会变成
`.app-button`，而随包发布的样式表只写了 `.yue-button`——每条规则都静默失效，
按钮退化成宿主默认样式。类名本身就是公开 API（下面「Token 映射」和「覆写与级联」
都直接引用它们），所以让它可以被改，只会让文档对改了它的人变成错的。

真要换命名空间，正确做法是在**生成样式表时**改写选择器，而不是运行时配置。
传了 `prefix` 会立刻收到一条解释性警告。
:::

## 形状

<PreviewFrame title="形状" description="circle 是图标按钮，必须给可访问名称。" :code="shapeCode">
  <YueButton shape="square">直角</YueButton>
  <YueButton shape="round">圆角</YueButton>
  <YueButton shape="circle" aria-label="搜索" variant="outline">
    <template #leading>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="1.5" />
        <path d="M10 10l3.5 3.5" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </template>
  </YueButton>
</PreviewFrame>

| `shape` | 圆角 | 说明 |
| --- | --- | --- |
| `square` | `--button-border-radius` | 默认 |
| `round` | `--button-border-radius-full` | 胶囊形 |
| `circle` | `--button-border-radius-full` | 正方形 + 全圆角；宽度等于高度，横向内边距归零 |

`circle` 没有可见文字，可访问名称就是它唯一的语义来源。开发模式下不给 `aria-label` / `aria-labelledby` 会在控制台收到警告（生产构建里这段代码会被 tree-shake 掉）。

## 禁用状态

<PreviewFrame title="禁用状态" description="原生 button 使用原生 disabled；其他标签使用 aria-disabled。" :code="disabledCode">
  <YueButton disabled>默认</YueButton>
  <YueButton theme="primary" disabled>主要</YueButton>
  <YueButton variant="outline" disabled>描边</YueButton>
  <YueButton variant="link" disabled>链接</YueButton>
</PreviewFrame>

- `disabled` 在 `<button>` 上设置**原生** `disabled`，点击由浏览器拦掉。
- 换成 `<a>` 或自定义组件时用 `aria-disabled="true"` + `tabindex="-1"`，并在点击处理器里 `preventDefault()`。
- 原生 `<button>` 上**不会**同时加 `aria-disabled`：平台已经表达了禁用，再加一次会被读屏重复播报。
- **`loading` 与这整套输出无关。** 它在任何标签上都只输出 `aria-busy="true"`，不写 `aria-disabled`、不写 `tabindex`：忙不等于禁用，浏览器里按 Tab 必须仍然能到达它。下面这一小节里三个 `<a>` 的差异可以直接用 Tab 走一遍。

### 渲染成 `<a>` 或自定义组件

<PreviewFrame title="tag" description="disabled 的 <a> 退出 Tab 顺序；loading 的 <a> 不退出——它的 Tab 顺序由浏览器逐次按键验证。" :code="tagCode">
  <YueButton tag="a" href="#渲染成-a-或自定义组件" data-anchor="plain">查看定价</YueButton>
  <YueButton tag="a" href="#渲染成-a-或自定义组件" loading data-anchor="loading">提交中</YueButton>
  <YueButton tag="a" href="#渲染成-a-或自定义组件" disabled data-anchor="disabled">查看定价（禁用）</YueButton>
</PreviewFrame>

`tag` 接受任意标签名或组件。传组件时请用 `markRaw()` 包一层，否则 Vue 会把组件定义也变成响应式对象并在控制台提醒。

三者输出的差别，一字不多：

| 状态 | `disabled` | `aria-disabled` | `aria-busy` | `tabindex` |
| --- | --- | --- | --- | --- |
| 普通 `<a>` | — | — | — | — |
| `loading` 的 `<a>` | — | — | `"true"` | — |
| `disabled` 的 `<a>` | — | `"true"` | — | `"-1"` |
| 原生 `<button>` + `loading` | — | — | `"true"` | —（原生按钮从不写 `tabindex`） |

`loading` 期间点击被处理器 `preventDefault()` 拦下（包括键盘 Enter 触发的锚点跳转），所以「仍然可聚焦」是成立的，而不是乐观假设。

## 加载状态

<PreviewFrame title="加载状态" description="loading 会阻止点击、设置 aria-busy，并把加载层盖在内容上 —— 但不设置原生 disabled。" :code="loaderCode">
  <YueButton theme="primary" :loading="submitting" @click="submit">
    {{ submitting ? '提交中' : '提交' }}
  </YueButton>
  <YueButton loading data-loading-default>默认加载</YueButton>
  <YueButton variant="outline" loading>描边加载</YueButton>
  <YueButton loading data-loader-custom>
    <template #loader><span class="docs-loader" /></template>
    自定义加载
  </YueButton>
</PreviewFrame>

点第一个按钮可以看到真实的状态流转；最后一个用的是 `loader` 插槽，它替换的是**指示器**，不是布局。

`loading` 与 `disabled` 故意不复用同一个机制：

- `disabled` → 原生 `disabled`，元素退出可聚焦序列。
- `loading` → `aria-busy="true"` + 处理器拦截点击，**保留焦点与 tab 顺序**。请求还没回来就把焦点从用户脚下抽走，是比「能点到」更糟的问题。

### 加载不改变布局

内容留在原位、加载层盖在上面，这不是审美选择，而是为了让按钮在请求前后保持同一个宽度：

<PreviewFrame title="同样的内容，一个在加载" description="两个按钮的文字、图标与尺寸完全相同，只有 loading 不同；宽度在浏览器里被逐像素比对。" :code="loadingStabilityCode" surface-class="preview-frame__surface--stack">
  <YueButton size="lg" data-loading-idle>
    <template #leading>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </template>
    保存更改
  </YueButton>
  <YueButton size="lg" loading data-loading-active>
    <template #leading>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </template>
    保存更改
  </YueButton>
</PreviewFrame>

三件事同时成立，缺一不可：

| 约定 | 为什么 |
| --- | --- |
| 内容不卸载（无 `v-if`） | 卸载会立刻改变宽度，也会让按钮在加载期间失去可访问名称 |
| 内容用 `opacity: 0` 隐藏，不用 `display: none` / `visibility: hidden` | 后两者会把文字移出无障碍树；`opacity` 只影响绘制 |
| 加载层 `position: absolute; inset: 0` | 完全脱离布局；默认 spinner 与自定义 loader 都不会撑开按钮 |

文案仍然建议从「提交」变成「提交中」：`aria-busy` 说明的是「忙」，说不出在忙什么，而 spinner 对读屏用户是不可见的。

## 按钮分组与分段控件

三个组件，各管一件事。**分组逻辑不放进 `YueButton`**：按钮不需要知道「组」这个概念存在。

- `YueButton` —— 单个按钮，`active` 是它唯一的开关语义；
- `YueButtonGroup` —— 合并圆角 + `role="group"`，没有选择状态；
- `YueButtonToggle` —— 在分组之上持有 `v-model`；
- `YueButtonToggleItem` —— 一个就是某个值的按钮。

<PreviewFrame title="分组与分段控件" description="上面两个只是拼在一起，下面两个会记住选了哪一个。" :code="groupCode">
  <div class="group-demo">
    <YueButtonGroup aria-label="对齐方式">
      <YueButton variant="outline" data-toggle-state="group-left">左</YueButton>
      <YueButton variant="outline">居中</YueButton>
      <YueButton variant="outline">右</YueButton>
    </YueButtonGroup>
  </div>
  <div class="group-demo">
    <YueButtonToggle v-model="align" aria-label="对齐方式" data-toggle="align">
      <YueButtonToggleItem value="left" variant="outline" data-toggle-item="left">左</YueButtonToggleItem>
      <YueButtonToggleItem value="center" variant="outline" data-toggle-item="center">居中</YueButtonToggleItem>
      <YueButtonToggleItem value="right" variant="outline" data-toggle-item="right">右</YueButtonToggleItem>
    </YueButtonToggle>
  </div>
</PreviewFrame>

当前选中：`{{ align }}`。点击后会立即变化 —— 这一页渲染的是真实组件，不是示意图。

分组是**结构**，不是「一次设置八个 prop」的快捷方式。它没有 `theme` / `variant` / `size`：对照组内的按钮逐项设置，或者按[覆写与级联](#覆写与级联)里说的，在容器上重指 `--button-*` Token。

### 选中态的视觉与语义

选中项读的是迁移时就存在的 `--button-selected-*` 一族（`--selected-background` / `--selected-color`），它们本来就被对比度门禁覆盖，只是此前没有组件去画。

<PreviewFrame title="每一项仍然是一个按钮" description="theme / variant / size / loading 都可以单独给；disabled 只禁用它自己。" :code="toggleItemCode" surface-class="preview-frame__surface--stack">
  <YueButtonToggle v-model="viewMode" aria-label="视图" data-toggle="view">
    <YueButtonToggleItem value="list" variant="outline" data-toggle-item="list">
      <template #leading>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" stroke-width="1.5" />
        </svg>
      </template>
      列表
    </YueButtonToggleItem>
    <YueButtonToggleItem value="grid" variant="outline" data-toggle-item="grid">网格</YueButtonToggleItem>
    <YueButtonToggleItem value="board" variant="outline" disabled data-toggle-item="board">看板</YueButtonToggleItem>
  </YueButtonToggle>

  <YueButtonGroup aria-label="文本格式">
    <YueButton variant="text" :active="bold" data-standalone="bold" @click="bold = !bold">粗体</YueButton>
    <YueButton variant="text" :active="italic" data-standalone="italic" @click="italic = !italic">斜体</YueButton>
  </YueButtonGroup>
</PreviewFrame>

| 场景 | 用什么 |
| --- | --- |
| 几个选项**必须**有一个是当前项（分段控件） | `YueButtonToggle` + `YueButtonToggleItem`，选中项输出 `aria-pressed="true"` |
| 一组互不相关的开关（粗体 / 斜体） | `YueButtonGroup` + 每个 `YueButton` 自己的 `active` |
| 只是视觉上排在一起 | `YueButtonGroup` |

选择是强制的：再次点击已选中的项不会取消选择。没有「当前项」的分段控件回答不了「现在是哪一个」；可以全部关掉的一组按钮是上面第二种场景。

::: tip 键盘导航尚未实现
分组现在只是一组普通的 Tab 停靠点，方向键与 roving tabindex 是后续工作。只改 tab 顺序而不提供方向键，会比不做更糟，所以这一步没有半成品。
:::

## Block 状态

<PreviewFrame title="Block 状态" description="block 让按钮吃满容器宽度。" :code="blockCode" surface-class="preview-frame__surface--block">
  <YueButton theme="primary" block>整行按钮</YueButton>
</PreviewFrame>

## Leading / Trailing 插槽

图标通过插槽传入，不绑定任何图标库。完整的资源边界、尺寸和无障碍规则见[设计 / 图标](/design/icon)。

<PreviewFrame title="插槽" description="leading / trailing 各自包在 .yue-button__icon 里，尺寸随 size 走。" :code="slotCode">
  <YueButton theme="primary">
    <template #leading>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </template>
    新建
  </YueButton>
  <YueButton variant="outline">
    更多
    <template #trailing>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </template>
  </YueButton>
</PreviewFrame>

| 插槽 | 渲染位置 | 备注 |
| --- | --- | --- |
| `default` | `.yue-button__label` | 省略时请另行提供可访问名称 |
| `leading` | `.yue-button__icon--leading` | `loading` 时留在原位并被隐藏，不会被顶替 |
| `trailing` | `.yue-button__icon--trailing` | `loading` 时留在原位并被隐藏 |
| `loader` | `.yue-button__loader` | 替换默认 spinner；渲染在绝对定位的加载层里 |

## 接口表在 API 页

这一页只回答「长什么样、怎么用」。Props、Slots、Events 和应用级配置的完整表格只写在 [Button API](./button/api) 一处 —— 同一份契约抄两遍，就一定会有一遍先过期。**`YueConfig` 只有 `size`**；语言不在配置里，它是 locale 实例，见[国际化指南](/guide/i18n)。

## 深色主题

用上方工具条里的**深色**切一次即可 —— 切换作用在文档根节点上，因为 Token 契约里浅色值定义在 `:root`、深色值定义在 `[data-theme=dark]`：嵌在深色页面里的容器没法用 `data-theme="light"` 把继承下来的深色值「撤销」回去。

深色模式下需要单独确认的是这几个角色：

| 角色 | 浅色 | 深色 |
| --- | --- | --- |
| `--button-danger-background` | `--red-700`（深红填充 + 白字） | `--error` → `--red-300`（浅红填充 + 深字） |
| `--button-success-background` | `--success` → `--green-700` | `--success` → `--green-400` |
| `--button-success-color` | `--text-inverse` → 白 | `--text-inverse` → 近黑 |

也就是说危险 / 成功这类「饱和填充」在深色下会整体翻过来：填充变亮、文字变暗。`--text-inverse` 正是这个「反色内容」角色，所以成功按钮不需要额外造一个 `--on-success`。

## Accent 主题

工具条里的**天蓝 / 中性**切换会写 `data-accent`。Token 契约里 `azure` 是默认作用域（没有对应覆盖块），`neutral` 才是一段真正的覆盖 —— 所以切到中性才是这套主题色轴真的接上了的证据。

受影响的不只是填充色：`--accent-text`、`--accent-border`、`--on-accent`、以及 `--link-decoration`（中性下变 `underline`）都会跟着走，Link 变体因此会从「无下划线」变成「有下划线」。

## Token 映射

组件样式里不出现任何裸色值，也不直接读 primitive Token。`--_*` 是组件内部的组合槽位，每个都由下面这些 Button Component Token 赋值，主题修饰符只负责重指：

| 组合槽位 | 由哪个 Token 赋值（`default` 主题） |
| --- | --- |
| `--_fill` | `--button-default-background` |
| `--_fill-hover` | `--button-default-background-hover` |
| `--_fill-pressed` | `--button-default-background-pressed` |
| `--_on-fill` | `--button-default-color` |
| `--_accent` | `--button-default-accent` |
| `--_border` | `--button-default-border-color` |
| `--_radius` | `--button-border-radius`（`round` / `circle` 会把它改成 `--button-border-radius-full`） |

| 用途 | Token |
| --- | --- |
| 尺寸档位 | `--button-height-{sm,md,lg}`、`--button-padding-inline-{sm,md,lg}`、`--button-font-size-{sm,md,lg}` |
| 几何 | `--button-padding-block`、`--button-padding-inline-flush`、`--button-gap`、`--button-border-width`、`--button-border-radius`、`--button-border-radius-full` |
| 排版 | `--button-font-weight`、`--button-line-height` |
| 图标与加载 | `--button-icon-size-{sm,md,lg}`、`--button-spinner-border-width`、`--button-spinner-duration` |
| 选中态 | `--button-selected-background`、`--button-selected-color`、`--button-selected-border-color`、`--button-selected-background-hover`、`--button-selected-background-pressed` |
| 动效 | `--button-duration`、`--button-ease` |
| 焦点 | `--button-focus-ring-color`、`--button-focus-ring-width`、`--button-focus-ring-offset` |
| 禁用 | `--button-disabled-background`、`--button-disabled-color`、`--button-disabled-border-color` |
| 未填充变体 | `--button-subtle-background`、`--button-subtle-background-hover`、`--button-subtle-background-pressed`、`--button-outline-background` |
| 链接变体 | `--button-link-color`、`--button-link-decoration`、`--button-link-decoration-hover` |

分组不引入任何新 Token：合并圆角读的是按钮自己的 `--_radius`（由 `--button-border-radius` 或 `--button-border-radius-full` 赋值），重叠边框读的是 `--button-border-width`。

## 无障碍说明

- **原生优先。** 默认渲染 `<button type="button">`，键盘、焦点、表单语义都由平台提供。
- **`disabled` 与 `aria-disabled` 分工明确。** `<button>` 用原生 `disabled`；`<a>` 和自定义组件用 `aria-disabled="true"`，同时 `tabindex="-1"` 退出 tab 顺序，点击在处理器里被拦掉。
- **`loading` 不夺走焦点，也不夺走名字。** 它设置 `aria-busy="true"` 并拦截点击，但保留元素可聚焦；内容用 `opacity: 0` 隐藏而不是卸载，所以按钮在请求期间仍然有可访问名称，spinner 是 `aria-hidden="true"` 的装饰。
- **`active` 的三态是有意的。** 不传 `active` 的按钮不会输出 `aria-pressed`：普通按钮不该被读成开关按钮；`active=false` 才表示「是开关按钮，当前未选中」。
- **分段控件必须有名。** `YueButtonToggle` 渲染 `role="group"`，请传 `aria-label` 或用 `aria-labelledby` 指向可见文字，组内每一项输出 `aria-pressed="true|false"`。
- **`circle` 必须有可访问名称。** 图标是 `aria-hidden` 的，所以请用 `aria-label`，或让 `aria-labelledby` 指向可见文字。开发模式下缺失会收到一次控制台警告。
- **焦点环来自 Token。** `:focus-visible` 用 `--button-focus-ring-*` 绘制，宽度与偏移都不是硬编码值，跟随主题变化。
- **尊重用户偏好。** `prefers-reduced-motion: reduce` 下过渡和 spinner 旋转被关闭，但保留静态加载提示；`forced-colors: active` 下边框改用系统色 `ButtonBorder`，禁用态用 `GrayText`。

## 覆写与级联

Token 包声明了层顺序，但**组件规则本身不在任何层里**，这不是疏漏：

> 无层（unlayered）样式优先于所有层，无论选择器权重多高。如果组件规则写进 `@layer implementations`，任何宿主环境的无层重置都会赢过它 —— VitePress 自带 `button { background-color: transparent }`，Tailwind 的 Preflight、normalize.css 也一样。放在层里的按钮，填充色会在真实项目里悄悄消失。

所以分工是：

| 想改什么 | 怎么做 |
| --- | --- |
| 颜色、尺寸、圆角等**成体系**的值 | 重指 Button Component Token。Token 住在 `components` 层，用 `@layer demo` 覆写最干净，也不需要 `!important` |
| 某一区域内的密度 / 尺寸 | 在容器上重指组件 Token，组件读到的就是新值 |
| 单条组件规则的细节 | 像平常一样写一条权重不低于它的 CSS，并在组件样式之后加载 |

<PreviewFrame title="覆写方式" description="动的是 Token，不是组件的 CSS 选择器。" :code="overrideCode" surface-class="preview-frame__surface--stack">
  <YueButton theme="primary">主操作</YueButton>
  <YueButton variant="outline">次级操作</YueButton>
</PreviewFrame>

上面工具条里的**紧凑**密度演示的就是第二种：它作用在预览容器上，只重指了这一块区域里的组件 Token，按钮本身对此一无所知。

## 与 TDesign 的取舍

参考实现（`refer/tdesign-common/style/web/components/button`）里有几条久经考验的交互规则值得吸收，也有几条是 Yue 刻意不抄的。逐条记下来，免得以后反复讨论。

### 采纳

| 来自参考实现 | Yue 的做法 |
| --- | --- |
| `touch-action: manipulation` | 直接采纳：去掉移动端约 300ms 的双击缩放延迟，又不关闭双指缩放 |
| `vertical-align: middle` | 直接采纳：按钮嵌进文字流或表格单元时对齐正确 |
| `position: relative` | 采纳为**在盒内定位的上下文**。今天的 spinner 与图标都在流内，所以现在零成本；没有它，将来任何绝对定位的层都会逃到一个无关的祖先上 |
| `hover` 与 `focus-visible` 共享颜色状态 | 采纳**原则**，用 Token 重写选择器：键盘用户与鼠标用户看到同一个「当前在哪」提示。焦点环是独立声明，始终保留 |
| `variant="text"` | 采纳语义：保留完整控件盒（点击区域与其他按钮一致）、无填充无边框、悬停给淡色覆盖层 |
| `variant="dashed"` | 采纳：与 `outline` 共享全部取值，只差 `border-style`，适合「新增」这类低频动作 |
| `theme="warning"` | 采纳：语义层补齐 `--action-warning` / `--action-on-warning`，与 `--action-danger` 同级 |
| 图标与文字固定间距 | 采纳**原则**，但继续用 `gap: var(--button-gap)`，不写死 8px |
| 主题 × 状态矩阵做文档与回归 | 采纳：上面两节矩阵就是它，且 `verify:visual` 会逐格量对比度 |

### 不采纳

| 参考实现的做法 | 为什么不抄 |
| --- | --- |
| `transition: all` | 只过渡背景、边框、文字颜色。`all` 会把布局属性也纳入动画，代价是难查的性能问题 |
| `overflow: hidden` | 它是为 ripple 服务的。Yue 没有 ripple，加上它只会裁掉自定义内容和将来的局部反馈 |
| 内置 ripple | 增加组件逻辑与动效复杂度；无依赖方案更稳，且 ripple 需要 `overflow: hidden` 才能工作 |
| `outline: none` | 直接删掉键盘用户唯一的位置提示。参考实现自己另画了焦点态，Yue 用 `:focus-visible` + 焦点环 Token 达到同样效果，不动浏览器默认行为 |
| `padding: calc(内边距 - 边框宽度)` | Yue 已经用 `box-sizing: border-box` 和尺寸 Token，机械照搬会让 Token 与实际盒模型打架 |
| `--td-*` Token 与具体色值 | Yue 有自己的 `--button-*` 体系；跨库抄色值会让两套主题各自演变后无法解释差异 |
| `--ghost` 修饰符（`white-ghost` 前景，用于深色/彩色底上） | Yue 的 `--button-ghost-*` 是迁移时就定下的「未填充」契约，而且被审计门禁盯着。把它改成「反色底上的按钮」会直接推翻那条契约。真要这种按钮，应当新增一组 `--button-on-inverse-*` Token，而不是复用 `ghost` |
| 把 `text` 与 `ghost` 并存 | 参考实现的 `variant="text"` 与 Yue 原来的 `ghost` 是同一种观感。两个名字一种外观，只会让使用者纠结选哪个——所以 Yue 统一叫 `text` |

## 与 Vuetify 的取舍

`refer/vuetify` 是另一条参考线：它的 Button 是一个大型生态组件，成熟之处在**信息架构**（Usage → API → Anatomy → Props → Variants → Slots → Examples → Accessibility）、**状态建模**（`active` / `loading` / `readonly` 正交）、**上下文默认值**和**真实浏览器测试**。Yue 吸收的正是这四条，而不是它的 API 面。

### 采纳

| 来自 Vuetify | Yue 的做法 |
| --- | --- |
| 文档里的 Anatomy | 采纳：本页开头的[组件解剖](#组件解剖-anatomy)，用真实 `YueButton` 渲染，不是示意图 |
| `active` 与 `disabled` / `loading` 正交 | 采纳：`active` 是三态（不传 / `false` / `true`），独立于禁用与加载 |
| 可替换的 `loader` 插槽 | 采纳：默认 spinner 保留，自定义指示器渲染在同一个绝对定位的加载层里，不绑定图标库 |
| loading 时内容留在原位（`opacity: 0`） | 采纳：见[加载不改变布局](#加载不改变布局) |
| 分组与选择分开建模 | 采纳，但拆得更细：`YueButtonGroup`（结构）/ `YueButtonToggle`（`v-model`）/ `YueButtonToggleItem`（一个值） |
| API 元数据与文档的一致性检查 | 采纳：`pnpm audit:docs` 比对类型定义、SFC、API 表与示例中的 prop |
| 浏览器里跑状态与对比度 | 采纳：`verify:visual` 逐格量测，本文档页就是被测对象 |

### 不采纳

| Vuetify 的做法 | 为什么不抄 |
| --- | --- |
| `icon` / `prepend-icon` / `append-icon` 字符串 prop | 依赖 VIcon 与图标注册表。Yue 明确不自带图标库，`leading` / `trailing` 插槽对通用包更合适 |
| `elevation` / `ripple` / `position` / `location` / 任意尺寸 prop | Material 专属能力；ripple 还需要 `overflow: hidden`，会裁掉自定义内容 |
| 五档尺寸 × 五档 density | Yue 保持少量、可验证的档位；“这一片更紧凑”用容器上重指 `--button-*` Token 表达 |
| `defaults: { VBtn: { … } }` 通用默认值 Provider | 目前只有一个组件需要子树默认值，过早抽象会把一个配置项变成一层框架。先保留 `YueConfig` + `provideYueConfig()` 的两级继承 |
| Sass 编译期主题变量 | Yue 的 CSS Token 与 CSS 变量支持运行时换肤和浅色 / 深色模式 |
| 把 `value` / 分组逻辑塞进 Button | 按钮不需要知道「组」存在。分组由 `YueButtonToggle` + `YueButtonToggleItem` 承担 |

