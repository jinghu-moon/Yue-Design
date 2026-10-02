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

<!-- 也可以是任何组件；放在响应式状态里记得 markRaw -->
<YueButton :tag="RouterLink" to="/pricing">查看定价</YueButton>`

const loadingCode = `<YueButton theme="primary" :loading="submitting" @click="submit">
  {{ submitting ? '提交中' : '提交' }}
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
</script>

# Button 按钮

本页是 **示例**：所有区域渲染真实的 `YueButton`。接口表见 [API](./button/api)，使用原则见[指南](./button/guide)。

按钮是 `@yue-ui/vue` 的第一个组件，也是整条链路（Token → Hooks → 组件 → 文档 → 打包消费）的验证用例。

页面上的每个示例渲染的都是**真实的 `YueButton`**：同一份组件源码、同一份 `@yue-ui/vue/style.css`。它们不是截图，也不是抄写下来的 HTML —— 如果组件坏了，这一页就会跟着坏。

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

对比度不是估的：`--button-{theme}-color` 落在 `--button-{theme}-background` 上、以及悬停与按下两个状态，都在 `pnpm audit:tokens` 的 92 项门禁里。

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

### 渲染成 `<a>` 或自定义组件

<PreviewFrame title="tag" description="只有 <button> 能被平台禁用，其余标签靠 aria-disabled 与自己拦点击。" :code="tagCode">
  <YueButton tag="a" href="#渲染成-a-或自定义组件">查看定价</YueButton>
  <YueButton tag="a" href="#渲染成-a-或自定义组件" disabled>查看定价（禁用）</YueButton>
</PreviewFrame>

`tag` 接受任意标签名或组件。传组件时请用 `markRaw()` 包一层，否则 Vue 会把组件定义也变成响应式对象并在控制台提醒。

## 加载状态

<PreviewFrame title="加载状态" description="loading 会阻止点击、设置 aria-busy，并把 leading 位换成 spinner —— 但不设置原生 disabled。" :code="loadingCode">
  <YueButton theme="primary" :loading="submitting" @click="submit">
    {{ submitting ? '提交中' : '提交' }}
  </YueButton>
  <YueButton loading>默认加载</YueButton>
  <YueButton variant="outline" loading>描边加载</YueButton>
</PreviewFrame>

点第一个按钮可以看到真实的状态流转。

`loading` 与 `disabled` 故意不复用同一个机制：

- `disabled` → 原生 `disabled`，元素退出可聚焦序列。
- `loading` → `aria-busy="true"` + 处理器拦截点击，**保留焦点与 tab 顺序**。请求还没回来就把焦点从用户脚下抽走，是比「能点到」更糟的问题。

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
| `leading` | `.yue-button__icon--leading` | `loading` 时被 spinner 顶替 |
| `trailing` | `.yue-button__icon--trailing` | `loading` 时隐藏 |

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

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `theme` | `'default' \| 'primary' \| 'success' \| 'warning' \| 'danger'` | `'default'` | 语义色角色 |
| `variant` | `'solid' \| 'outline' \| 'dashed' \| 'text' \| 'link'` | `'solid'` | 绘制方式 |
| `size` | `'sm' \| 'md' \| 'lg'` | 取 `YueConfig.size`（`'md'`） | 尺寸档位 |
| `shape` | `'square' \| 'round' \| 'circle'` | `'square'` | 圆角形态 |
| `disabled` | `boolean` | `false` | 原生 `disabled`，或 `aria-disabled` |
| `loading` | `boolean` | `false` | 阻止点击、`aria-busy`、显示 spinner |
| `block` | `boolean` | `false` | 吃满容器宽度 |
| `nativeType` | `'button' \| 'submit' \| 'reset'` | `'button'` | 只在 `tag="button"` 时生效 |
| `tag` | `string \| Component` | `'button'` | 渲染成什么；`'a'` 与自定义组件按非 button 处理 |

`YueConfig`（应用级配置）只有一项：

| 配置项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 组件未传 `size` 时的回落值 |

## Slots

| 插槽 | 说明 |
| --- | --- |
| `default` | 按钮文字 |
| `leading` | 文字前的内容，通常是图标 |
| `trailing` | 文字后的内容，通常是图标 |

## Events

| 事件 | 载荷 | 触发条件 |
| --- | --- | --- |
| `click` | `MouseEvent` | 仅在既未 `disabled` 也未 `loading` 时触发 |

`click` 是声明过的 emit，所以 `@click` 不会落到 `$attrs` 里，也不会和原生事件各触发一次。

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

| 用途 | Token |
| --- | --- |
| 尺寸档位 | `--button-height-{sm,md,lg}`、`--button-padding-inline-{sm,md,lg}`、`--button-font-size-{sm,md,lg}` |
| 几何 | `--button-padding-block`、`--button-padding-inline-flush`、`--button-gap`、`--button-border-width`、`--button-border-radius`、`--button-border-radius-full` |
| 排版 | `--button-font-weight`、`--button-line-height` |
| 图标与加载 | `--button-icon-size-{sm,md,lg}`、`--button-spinner-border-width`、`--button-spinner-duration` |
| 动效 | `--button-duration`、`--button-ease` |
| 焦点 | `--button-focus-ring-color`、`--button-focus-ring-width`、`--button-focus-ring-offset` |
| 禁用 | `--button-disabled-background`、`--button-disabled-color`、`--button-disabled-border-color` |
| 未填充变体 | `--button-subtle-background`、`--button-subtle-background-hover`、`--button-subtle-background-pressed`、`--button-outline-background` |
| 链接变体 | `--button-link-color`、`--button-link-decoration`、`--button-link-decoration-hover` |

## 无障碍说明

- **原生优先。** 默认渲染 `<button type="button">`，键盘、焦点、表单语义都由平台提供。
- **`disabled` 与 `aria-disabled` 分工明确。** `<button>` 用原生 `disabled`；`<a>` 和自定义组件用 `aria-disabled="true"`，同时 `tabindex="-1"` 退出 tab 顺序，点击在处理器里被拦掉。
- **`loading` 不夺走焦点。** 它设置 `aria-busy="true"` 并拦截点击，但保留元素可聚焦；spinner 是 `aria-hidden="true"` 的装饰，状态由 `aria-busy` 播报。
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

