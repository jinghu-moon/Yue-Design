# Yue Design

把设计系统拆成可独立构建、独立发布的包，每个包配一套可执行的门禁。

```
Yue-Design/
├─ packages/
│  ├─ tokens/     @yue-ui/design-tokens   纯 CSS Token，零依赖、无构建步骤
│  ├─ hooks/      @yue-ui/hooks           Vue composables 与公共契约
│  └─ vue/        @yue-ui/vue             Vue 3 组件包（当前：Button 族四个组件、YueInput）
├─ apps/
│  └─ docs/       @yue-ui/docs            VitePress 文档站（指南 / 设计 / 基础 / 组件）
├─ tools/         Token 审计器、构建产物检查器、API↔文档一致性检查器、tarball 消费验证器
├─ tests/         Token 解析与审计门禁、API↔文档门禁、树摇验证、文档视觉验证
├─ design-tokens-generic-v4/  迁移前的 HTML 原型，逐字节保持不变，作为视觉基准
├─ package.json
├─ pnpm-workspace.yaml
└─ tsconfig.base.json
```

架构方向是单向的：`tokens → hooks → vue → docs`。

## 环境要求

| 组件 | 版本 |
| --- | --- |
| Node.js | ≥ 22.12 |
| pnpm | 10.30.1（由 corepack 提供，见 `packageManager`） |

`pnpm` 未安装在 PATH 上，命令统一通过 corepack 调用，使用缓存中的固定版本：

```bash
corepack enable              # 可选：把 shim 装进 Node 目录
corepack pnpm --version      # 10.30.1
```

## 致谢

Yue Design 的设计规范、组件 API 和工程实践参考了以下开源项目，在此致谢：

| 项目 | 对 Yue Design 的帮助 |
| --- | --- |
| [TDesign](https://github.com/Tencent/tdesign) | 提供企业级设计体系、颜色与深色模式规范，以及组件文档组织方式的参考。 |
| [tdesign-vue-next](https://github.com/Tencent/tdesign-vue-next) | 提供 Vue 组件 API、状态设计、可访问性处理和组件文档结构的实践参考。 |
| [tdesign-common](https://github.com/Tencent/tdesign-common) | 提供 Button 等组件的 CSS 实现、Token 组织和交互状态处理的研究样本。 |
| [Vuetify](https://github.com/vuetifyjs/vuetify) | 提供 Button 组件的信息架构（Anatomy / API / Guide）、状态建模、上下文默认值机制，以及真实浏览器测试的参考。 |

仓库中的 `refer/` 文件夹是本地研究资料，已被 Git 忽略，不会提交到 GitHub。Yue Design 没有复制 TDesign 的品牌色、图标资源或运行时实现；具体采纳与舍弃记录见文档中的设计说明。相关上游内容仍遵循各自项目的许可证。

## 许可证

Yue Design 自有代码采用 [MIT License](./LICENSE)。

## 命令

```bash
corepack pnpm install            # 安装 workspace 依赖
corepack pnpm typecheck          # 每个包独立类型检查
corepack pnpm build              # 拓扑顺序：tokens → hooks → vue → docs
corepack pnpm test               # 门禁测试 + 组件测试
corepack pnpm audit:tokens       # Token 对比度审计与原型↔包一致性
corepack pnpm audit:docs         # API ↔ 文档一致性（类型 / SFC / API 表 / 示例）
corepack pnpm audit:i18n         # 语言包 key / 参数 / 空值 / metadata 与硬编码文案
corepack pnpm audit:docs:i18n    # 中英文页面镜像、链接、锚点与结构一致性
corepack pnpm verify:dist        # 构建产物检查（外部资源 / 资源存在性 / 层顺序 / 包 exports / lang + canonical + hreflang）
corepack pnpm verify             # 上面八项串起来跑一遍
corepack pnpm verify:treeshaking # 单组件入口、全量入口与单语言包入口的树摇验证
corepack pnpm verify:visual      # Playwright 文档视觉验证（含双语切换，产出截图）
corepack pnpm verify:tarball     # pack 后在临时项目里安装并渲染（含语言包与 vue-i18n adapter）
corepack pnpm verify:all         # verify + 上三项
corepack pnpm dev                # 文档站开发服务器
```

## 当前状态

`corepack pnpm verify:all` 退出码 0：

| 门禁 | 结果 |
| --- | --- |
| `typecheck` | tokens / hooks / vue / docs 全部通过 |
| `build` | `packages/tokens`、`packages/hooks/dist`、`packages/vue/dist`（4 个 JS 入口 + 3 个 CSS 入口 + 3 个 locale 入口 + 声明）、`apps/docs/.vitepress/dist`（源页面 21 中文 + 21 英文，构建出 43 个 HTML：42 个页面 + `404.html`） |
| `test` | 500 项测试通过（22 个测试文件），含 locale 层 103 项（hooks 73 + vue catalog 23 + Node 无 DOM 7）、SSR/hydration 12 项、vue-i18n adapter 8 项与两个 i18n 门禁自身的 34 项夹具测试 |
| `audit:tokens` | 原型 64/64；包 **110/110**（32 条迁移契约 + 23 条包内新增 × 2 主题）；原型 ↔ 包 1804 项共享解析零差异；70 项包内新增 Token 被显式登记；禁用态作为**豁免项测量但不门禁**（浅色 2.20:1 / 深色 3.19:1） |
| `audit:docs` | 4 个组件的 23 个 Prop、10 个 Slot、2 个 Emit 与 API 页表格逐名对齐；SFC 的 `defineProps` / `defineEmits` / `<slot>` 与类型定义同向；129 处示例标签只使用存在的 Prop；`YueConfig` 的 1 项（`size`）与应用级配置表一致；文档里引用的审计项数（110）与 `token-audit.pairs.mjs` 一致 |
| `audit:i18n` | 1 个 message key（`input.clear`）与 2 个语言包逐叶对齐；无空值、无孤儿 key、无 metadata 缺失；`packages/vue/src` 全部 15 个源文件**按结构**检查硬编码用户文案（模板文本节点 / 用户可见属性 / 字面量绑定 / 脚本文本，中英文都查），当前 0 处命中，英文负向夹具覆盖 `aria-label="Clear"` 等 8 种写法 |
| `audit:docs:i18n` | 21 组页面镜像齐全；标题层级、代码块（数量 + 语言）、VitePress 容器、组件标签与属性名逐一相同；78 条内部链接留在自己的语言树内，18 个锚点在**构建产物**里真的存在；英文散文里 0 个汉字（仅 8 个汉字作为被引用的中文数据出现在代码里） |
| `verify:dist` | 0 处外部资源加载；构建产物里每个 locale 的页面在**水合前**就带着自己的文案（中文页「清空」/「Clear」/「Clear」，英文页反之）；sitemap 收录 42 个 URL（21 个 `/en/`）并在 origin 仍是占位域名时打印警告；19 个字体资产本地化；层顺序声明先于层块；`@yue-ui/vue` 与 `@yue-ui/hooks` 全部 exports 指向存在的文件，每个相对说明符都带扩展名；**每个**组件样式表都无层且命名空间与 JS 常量一致；两个包里的配置注入键都必须是 `Symbol.for(...)`——私有 `Symbol` 会让跨包配置静默失效；语言包入口是纯数据（123 / 120 B）且只有默认包能从根入口到达；**42 个页面**各自带 `lang` + canonical + `zh-CN` / `en-US` / `x-default`，且指向另一棵树的同一页 |
| `verify:treeshaking` | button / input 两个单组件入口都不含注册路径与 Reka primitive，且**互不包含对方**；Button 入口恰好带齐 Button 族的四个组件与分组样式；全量入口包含全部与注册路径；单语言包入口 **90 B**，不含组件代码、不发 CSS，组件入口也不夹带 `zh-CN`；四个入口的 js / css 体积都在 `tests/tree-shaking/verify.mjs` 的 `BUDGET` 里记录并断言（超限即失败，涨预算必须说明理由） |
| `verify:visual` | 浅色 / 深色 / Accent / 390px 无溢出 / 0 外部请求 / 0 控制台错误；DOM 类名确实被已加载规则命中；**主题 × 变体 25 格 × 4 状态（静止 / hover / focus-visible / pressed）× 2 主题 = 200 次逐格对比度测量**（浅色最低 4.66:1，深色最低 5.90:1）；**Button 解剖图的 6 个部件选择器都在真实 DOM 里命中**（含 `:focus-visible` 焦点环）；**loading 与不 loading 的两个同内容按钮宽度逐像素相等**（浅色 / 深色各一次），加载层覆盖内边距盒、spinner 居中、label 仍在 DOM 且 `opacity: 0`、`loader` 插槽替换指示器；**非原生 `tag` 的 Tab 顺序用真实按键走查**（`loading` 的 `<a>` 必须被 Tab 命中且不带 `aria-disabled` / `tabindex`，`disabled` 的 `<a>` 必须被跳过）；**分段控件**圆角合并（`4px / 0px / 4px`）、共享边重叠、选中填充与未选中不同、选中文字对比度浅色 7.32:1 / 深色 10.53:1（hover 6.47:1 / 8.72:1）、强制选择、禁用项不可改选择、独立 `active` 按钮报告 `aria-pressed`；**Input 在浅色 / 深色 / 中性 Accent 下各 8 个状态**，含真实 Tab 走查（禁用必被跳过、只读必被到达）、只读可全选复制而禁用不可聚焦、`label for` 真的聚焦到原生控件、清空后焦点仍在输入框、**locale 按子树生效**（同一份标记，默认「清空」vs 子树里的 `Clear`）、**RTL 下整块字段镜像**（前缀到右侧、清空控件到左侧）、248 字符长值下控件自身滚动而页面不溢出、以及 `forced-colors` 与 `prefers-reduced-motion` 的计算值；**双语**用真实点击走一遍 VitePress locale 菜单：路径与 `hash` 一起过去、`html[lang]` 跟随、刷新与返回都保持、暗色模式下语言互不干扰、英文页导航 / 侧栏 / 搜索按钮无中文、404 页同时给出两种语言与两个入口；三个 locale 来源逐个断言（页面语言 / 子树指定包 / **无对应语言包的地区标签经 fallback 链兜底**） |
| `verify:tarball` | tokens + hooks + vue 三个 tarball 装入临时项目：11 个子路径解析、hooks 由原生 Node ESM 加载并调用、类型声明可用、浏览器里 Button 与 Input 都真实渲染（Input 的 `id` 必须落在原生 `<input>` 上，尺寸必须等于应用级配置解析出的 Token）、**跨包 locale 真的生效且会继承**（从 `@yue-ui/hooks` 调 `provideLocale()` 能改到 `@yue-ui/vue` 组件读到的文案，同时保留应用级的 `size`）、**语言包子路径**（`@yue-ui/vue/locale/zh-CN`）在装好的项目里抵达组件、**应用的 `vue-i18n` 能接管组件文案**（切换引擎语言后已挂载组件立即换字，不需要重新挂载）、**真实输入法组合只发布一次**（用 CDP 驱动浏览器自己的组合事件顺序，而不是测试手写的顺序） |

另外核对过：

- `design-tokens-generic-v4/**` 共 24 个文件 **SHA256 逐字节未变**（原型只被复制，从未被改动）
- 复制进包的 CSS 与 6 个字体文件与原型源文件 **逐字节一致**（品牌注释与 Button / Input 组件 Token 的新增除外，见「已知取舍」）
- Tabler 图标字体**未**复制进 Token 包（`components/*.css` 从未引用它）

## 设计约束

- **Token 与组件分开打包。** Token 包能被任何技术栈消费；组件样式发布在
  `@yue-ui/vue/style.css` / `@yue-ui/vue/button.css`，不打包 Token，避免字体等资源被复制多份。
- **加载顺序是契约。** `@yue-ui/design-tokens/index.css` 声明
  `@layer primitives, semantics, components, implementations, demo`，
  必须最先加载。组件样式表自身不声明层顺序。
- **组件规则不进层。** 无层样式优先于所有层，所以组件规则一旦放进 `@layer`，
  宿主的无层重置（VitePress 的 `button` 重置、Tailwind Preflight、normalize.css）
  就会赢过它。Token 的层顺序仍然有效，覆写请重指 Component Token。
  这一点有测试守着：`tests/style-bundle.test.mjs` 与 `verify:dist` 都断言组件样式表里没有 `@layer`。
- **样式不使用 `scoped`。** 组件 CSS 全局生效，外部才能覆写与主题化。
- **图标不进 Token 包。** 组件通过插槽接收图标，不绑定 Tabler 或 Material Icons。
- **设计规范可执行。** `apps/docs/design/` 记录色彩、深色模式、字体、图标、布局和动效；
  能落到代码的规则必须对应 Token、组件 CSS 或自动化测试。
- **审计器严格失败。** 遇到无法建模的 CSS 构造、悬空引用或 `!important` 时直接报错，
  而不是跳过——否则门禁形同虚设。
- **Vue 包自包含。** `@yue-ui/hooks` 在构建时被编译进 `@yue-ui/vue`，
  且公开类型不引用它，所以发布物除 `vue` 之外没有运行时依赖。
- **Token 的对比度契约分两份，且只对定义它的目标生效。** `CONTRAST_PAIRS` 是从原型逐字转录的迁移契约（有测试守着它不许漂移），`PACKAGE_CONTRAST_PAIRS` 是包自己的追加契约（success/warning 实心填充、五个主题的「可读色」、链接色、以及开关按钮的选中态）。原型不会被要求满足后者——它根本没有那些 Token，要求它满足是范畴错误。
- **文档表格是门禁，不是快照。** Props / Slots / Emits / 应用级配置的 API 表、SFC 里的 `defineProps` / `defineEmits` / `<slot>`、类型定义和示例里用到的属性名，由 `pnpm audit:docs` 逐项互相对照（`tools/lib/api-docs.mjs`）。文档里引用的数字（例如审计项数）也一起检查——Button 页曾经写着 92，而当时的真实数字已经是 104。三者读同一份契约：`tools/api-docs.contract.mjs`。
- **两份契约的分工是明确的，不是遗漏。** 审计只能算它能解析的颜色：不透明填充，以及画在已知表面上的可读色。`outline`/`dashed`/`text` 的 hover 与 pressed 用的是 `color-mix(in srgb, currentColor X%, transparent)` —— 它取决于落在什么元素上，解析器算不出来。这些状态由浏览器扫描负责（把每一格真的推进静止 / hover / focus-visible / pressed 再量合成后的结果）。把 `--opacity-pressed` 从 .10 抬到 .55 可以验证这条边界：审计报 5 对不透明组合失败，浏览器扫描报 **40 次**状态测量失败。
- **发布出去的 ESM 必须能离开本仓库。** `@yue-ui/hooks` 的 JavaScript 由 `tsc` 直接产出
  （不经过打包器），所以相对导入必须写成 `'./types.js'` —— 省略扩展名时，仓库内的测试
  全都会通过（都走打包器或 workspace 链接），但消费者一 `import` 就是
  `ERR_MODULE_NOT_FOUND`。三层检查守着这条：`tests/esm-specifiers.test.mjs`（源码静态检查）、
  `verify:dist`（构建产物里每个相对说明符都必须带扩展名）、`verify:tarball`
  （把 hooks 单独打包安装，用**原生 Node ESM** 加载并调用其导出）。
- **类名命名空间是常量，不是配置项。** CSS 选择器无法在运行时由变量拼出，
  而样式表是随包预构建的；可配置的命名空间只会产出样式表匹配不到的类名，
  让组件静默变成裸样式。`YueConfig` 因此只有 `size` 与 `messages`，传 `prefix` 会收到解释性警告。
  这一点由三层检查守着：`useNamespace` 测试、组件测试里「DOM 类名 ↔ 样式表」一致性断言、
  以及 `verify:dist`（样式表命名空间必须与构建产物里的 JS 常量一致）与
  `verify:tarball`（真实浏览器里确认 DOM 类名确实被已加载的规则命中）。

## 已知取舍

- **字体体积**：`packages/tokens/assets` 约 17MB（HarmonyOS Sans SC ×4 等）。
  当前优先保证视觉基准不失真；做 tarball 发布验证时会重新评估是否拆成可选子路径。
- **原型基准与包的差异**：`packages/tokens/src/**` 的注释已改成新品牌名，
  新增了 **70 个 Token**（Button 与 Input 组件 Token、语义层 `--action-warning`、
  文本层级、布局边界、语义动效别名），并删掉了原型里两处**同一块内重复声明**的 Token
  （`--input-color`、`--progress-fill`，删除的都是值完全相同的后一条，解析结果不变）。
  原型保持逐字节不变，因此两者的**共享 Token 值**仍由审计器逐项比对，新增项被登记在
  `tools/token-audit.pairs.mjs` 的 `PACKAGE_ONLY_TOKENS` 里；任何未登记的包内新增 Token
  都会让 `pnpm test` 失败，而 `tests/token-source.test.mjs` 负责让重复声明不再回来。
- **文案走 `YueConfig.messages`，不是每个组件一个 Prop**。组件自己渲染的字符串
  （目前只有清空按钮的无障碍名称）放在应用级消息表里，`app.use(YueUI, { messages })`
  或 `provideYueConfig()` 都能配置，后者可以只作用于一个子树。一条文案一个 Prop 只服务
  一个组件、要在每个调用点重复，而且会把「翻译」变成「改标记」。
- **`provideYueConfig()` 是覆盖，不是重置**。它读取当前子树已经看到的配置作为基底再部分合并，
  所以 `app.use(YueUI, { size: 'lg' })` 之后在子树里 `provideYueConfig({ messages })`
  会保留 `size: 'lg'`；嵌套的 provider 也同理，内层只改它点名的选项。应用级的
  `installYueConfig()` 仍从默认值开始——最外层没有可继承的父级。
- **`YueInput` 持有字段自己的值，不是「完全受控」组件**。字段的值、`clearable` 按钮的可见性和
  渲染都读同一个内部值；`modelValue` 是**外部**变化来源，父组件改了才采用，父组件重渲染而值没变则
  什么都不做。所以清空按钮在父组件不响应 `update:modelValue` 时也会正确消失，旧值也不会被下一次
  重渲染写回。组合输入期间父组件推来的新值会被推迟到组合结束——用户的输入优先，与 Vue 自带
  `v-model` 一致。
- **一次输入法组合只发布一次，无论引擎的事件顺序**。Chrome / Safari 在 `compositionend` 之后
  还会发一个 `input`，而 CDP 驱动的 Chromium（以及 Firefox）把最终 `input` 发在 `compositionend`
  **之前**、之后不再发。两条路径都必须能发布，重复到达的那次必须是无操作——所以判断依据是「值变了
  没有」，不是「哪个事件先到」。`verify:tarball` 用 CDP 驱动真实的组合事件顺序断言只发布一次；
  只依赖尾部 `input` 的实现会在这里报 0 次（已用探针验证）。
- **`input` 的载荷永远是「`type === 'input'` 且带真实 `target`」的 DOM 事件**，不保证「逐字转发」。
  组合结束时发布的值，携带它的事件可能是 `compositionend`——那根本不是输入事件，直接转发会破坏按
  `event.type` 分支或读 `InputEvent.data` 的处理器。所以：组合期间浏览器为**最终值**发过 `input`
  → 转发那一个真实事件（`data` / `inputType` / `isComposing` 都是浏览器的）；否则**派发**一个合成的
  `InputEvent`（`inputType: 'insertCompositionText'`，`data` 为 `null`——组件知道最终值但不知道输入法
  插入的那一段文本，编一个 delta 比留空更糟）。合成事件是真正 dispatch 出去的，所以 `target` 就是
  内部 `<input>`，而不是在旁边造一个没有 `target` 的对象。
  **绝不转发组合中途的事件**：Chrome / Safari 顺序下，`compositionend` 到来时最近的 `input` 携带的
  还是中间文本（`zhong`），转发它会让 `data` 描述过时的值；判断依据是「那个事件被派发时的值是否仍是
  控件当前的值」。`change` / `focus` / `blur` 仍然逐字转发。`verify:tarball` 在真实浏览器里断言
  `type === 'input'`、是 `InputEvent`、`data` 等于最终文本、且 `target` 就是那个 `<input>`。
- **清空入口只有一个**。`type="search"` 与 `type="text"` 共用同一套外观重置
  （原生控件的 `appearance: none`），因此 Chromium 自带的搜索清空按钮不会被保留：它只在部分
  引擎存在、无法用 Token 定制、没有可访问名称，与 `clearable` 并存时还会同时出现两个。
  这是一条明确决定，不是某条 CSS 重置的副作用——早期版本的注释声称相反，且在 Chromium 里
  无法复现。
- **Input 的路线图：阶段 0–4 与阶段 6 已完成，阶段 5 刻意留空**。
  `borderless`、`align`、`autoWidth`、`format`、`YueField`、`YueTextarea` 都**没有**实现，因为
  [`docs/02-yue-input-roadmap.md`](docs/02-yue-input-roadmap.md) 对它们的门禁是「真实消费场景出现后才做」，
  并明确禁止「为了对齐 TDesign API 数量而加入没有消费方、没有测试和没有 Token 契约的 Props」。
  需要其中任何一项时，它应该带着自己的消费方、测试和 Token 契约单独落地；逐条理由记在
  [`apps/docs/components/input/guide.md`](apps/docs/components/input/guide.md) 的「还没有的东西」。
- **Button 变体 `ghost` 已更名为 `text`（破坏性变更）**。参考实现的 `variant="text"` 与 Yue
  原来的 `ghost` 是同一种观感（完整控件盒、无填充无边框、悬停给淡色覆盖层），两个名字一种外观
  只会让人纠结，所以统一叫 `text`；`link` 保留但语义收紧为**行内**动作（无固定高度）。
  同时新增 `dashed` 变体与 `warning` 主题。类型联合是编译期错误来源，所以残留调用会直接编译失败。
  逐条取舍（采纳了什么、刻意不抄什么、为什么）记在
  [`apps/docs/components/button.md`](apps/docs/components/button.md) 的「与 TDesign 的取舍」与「与 Vuetify 的取舍」。
- **Button 的 loading 不再顶替 `leading` 位（破坏性变更）**。内容留在原位，加载层
  （`.yue-button__loader`，`position: absolute; inset: 0`）盖在上面，所以请求前后按钮宽度一致；
  内容用 `opacity: 0` 隐藏而不是卸载，按钮在加载期间仍然有可访问名称。想换指示器请用 `loader`
  插槽，它替换的是指示器而不是布局。这条由浏览器测量守着：两个同内容按钮的宽度必须逐像素相等。
- **`loading` 不等于 `disabled`，而且在每一种标签上说同一句话**。`loading` 只输出 `aria-busy="true"`：
  不写 `aria-disabled`、不写 `tabindex`，`<a loading>` 也仍然留在 Tab 顺序里；退出 Tab 顺序只由
  `disabled` 触发（非原生标签写 `aria-disabled="true"` + `tabindex="-1"`）。激活由点击处理器拦下
  （含 `preventDefault()`，所以键盘 Enter 不会跳转）。这条由两层门禁守着：单元测试把
  `tag × disabled × loading` 的输出矩阵逐格钉死；`verify:visual` 在浏览器里用真实按键走一遍——
  从普通 `<a>` 按一次 Tab 必须落在 `loading` 的 `<a>` 上，再按一次必须跳过 `disabled` 的那个。
  它确实抓得住回归：把 `tabindex` 的判断改回 `disabled || loading` 之后，浏览器门禁报
  「the loading anchor claims to be disabled」与「Tab skipped the loading anchor」。
- **开关按钮的 `active` 是三态**。不传＝普通按钮（**不输出** `aria-pressed`），`false`＝开关按钮且未选中，
  `true`＝选中并加 `is-active`。Vue 的 Boolean 隐式转换会把「没传」变成 `false`，所以这个 prop 在
  `withDefaults` 里显式声明了 `default: undefined`——需要区分「不是开关」与「未选中」时，这不是细节。
- **分组逻辑不放进 Button**。`YueButtonGroup`（合并圆角 + `role="group"`，无选择状态）、
  `YueButtonToggle`（持有 `v-model`）、`YueButtonToggleItem`（一个就是某个值的按钮）各自只做一件事，
  `YueButton` 不知道「组」存在。分段控件的选择是**强制**的：再次点击已选中的项不会取消——
  「一个都没选中」回答不了「现在是哪一个」；可以全部关掉的一组按钮用 `YueButtonGroup` +
  每个按钮自己的 `active`。方向键与 roving tabindex 刻意留空：只改 tab 顺序而不提供方向键比不做更糟。
- **`YueButtonGroup` 不是「一次设置八个 prop」的快捷方式**。它没有 `theme` / `variant` / `size`；
  「这一片区域的按钮更紧凑」用容器上重指 `--button-*` Component Token 表达（文档站的密度切换演示的就是它），
  这样不会出现同一件事的第二种写法。
- **`verify:visual` 里的截图是产物，不是基线**。脚本断言的是「截图确实被写下」以及浏览器里
  量出来的计算值与对比度，不做像素比对。所以改动视觉后 `git diff` 里的 PNG 变化是**结果**而非
  失败信号；真正的门禁是那些测量断言。
- **禁用态对比度是测量项，不是门禁项**。WCAG 1.4.3 明确豁免非活动控件，本设计系统的禁用态也是
  刻意安静的（浅色 2.20:1）。给它定一个体系并不打算满足的阈值，比不测更糟，所以审计**打印**这个
  数字并在 README 与组件文档里写下实测值，但不会因此让构建变红。同一份数据在
  `verify:visual` 里也从浏览器量了一遍（同样是 2.20:1），两条路径互相印证。
- **密度不是 Token 契约的一部分**：`data-density` 只存在于文档站，用重指
  Component Token 的方式演示「消费方覆写」，Token 包里没有 density 维度。
- **`.npmrc` 固定了镜像源**：本机无法直连 `registry.npmjs.org`，仓库内固定为
  `mirrors.tencent.com/npm` 并开启 `prefer-offline`（依赖版本均已锁定在 pnpm store 中）。
- **`verify:tarball` 用的是本机已安装的 Chrome**（`playwright-core` 不下载浏览器），
  可用 `YUE_BROWSER_PATH` 指定其它浏览器。
