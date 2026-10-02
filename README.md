# Yue Design

把设计系统拆成可独立构建、独立发布的包，每个包配一套可执行的门禁。

```
Yue-Design/
├─ packages/
│  ├─ tokens/     @yue-ui/design-tokens   纯 CSS Token，零依赖、无构建步骤
│  ├─ hooks/      @yue-ui/hooks           Vue composables 与公共契约
│  └─ vue/        @yue-ui/vue             Vue 3 组件包（当前：YueButton）
├─ apps/
│  └─ docs/       @yue-ui/docs            VitePress 文档站（指南 / 设计 / 基础 / 组件）
├─ tools/         Token 审计器、构建产物检查器、tarball 消费验证器
├─ tests/         Token 解析与审计门禁、树摇验证、文档视觉验证
├─ design-tokens-generic-v4/  迁移前的 HTML 原型，逐字节保持不变，作为视觉基准
├─ package.json
├─ pnpm-workspace.yaml
└─ tsconfig.base.json
```

架构方向是单向的：`tokens → hooks → vue → docs`。

## 环境要求

| 组件 | 版本 |
| --- | --- |
| Node.js | ≥ 20.19 |
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
corepack pnpm verify:dist        # 构建产物检查（外部资源 / 资源存在性 / 层顺序 / 包 exports）
corepack pnpm verify             # 上面五项串起来跑一遍
corepack pnpm verify:treeshaking # 单组件入口与全量入口的树摇验证
corepack pnpm verify:visual      # Playwright 文档视觉验证（产出截图）
corepack pnpm verify:tarball     # pack 后在临时项目里安装并渲染
corepack pnpm verify:all         # verify + 上三项
corepack pnpm dev                # 文档站开发服务器
```

## 当前状态

`corepack pnpm verify:all` 退出码 0：

| 门禁 | 结果 |
| --- | --- |
| `typecheck` | tokens / hooks / vue / docs 全部通过 |
| `build` | `packages/tokens`、`packages/hooks/dist`、`packages/vue/dist`（3 个 JS 入口 + 2 个 CSS 入口 + 声明）、`apps/docs/.vitepress/dist`（9 页） |
| `test` | 158 项测试通过（Token 工具链 77 + hooks/vue 组件 81） |
| `audit:tokens` | 原型 64/64；包 **92/92**（32 条迁移契约 + 14 条包内新增 × 2 主题）；原型 ↔ 包 1804 项共享解析零差异；55 项包内新增 Token 被显式登记 |
| `verify:dist` | 0 处外部资源加载；19 个字体资产本地化；层顺序声明先于层块；`@yue-ui/vue` 与 `@yue-ui/hooks` 全部 exports 指向存在的文件，每个相对说明符都带扩展名；组件样式表命名空间与 JS 常量一致 |
| `verify:treeshaking` | 单组件入口不含注册路径与 Reka primitive；全量入口包含两者 |
| `verify:visual` | 浅色 / 深色 / Accent / 390px 无溢出 / 0 外部请求 / 0 控制台错误；DOM 类名确实被已加载规则命中；**主题 × 变体 25 格 × 4 状态（静止 / hover / focus-visible / pressed）× 2 主题 = 200 次逐格对比度测量**（浅色最低 4.66:1，深色最低 5.90:1）；hover 与 `:focus-visible` 落在同一颜色状态、焦点环保留、且每个状态都真的进入过 |
| `verify:tarball` | tokens + hooks + vue 三个 tarball 装入临时项目：9 个子路径解析、hooks 由原生 Node ESM 加载并调用、类型声明可用、浏览器真实渲染 |

另外核对过：

- `design-tokens-generic-v4/**` 共 24 个文件 **SHA256 逐字节未变**（原型只被复制，从未被改动）
- 复制进包的 CSS 与 6 个字体文件与原型源文件 **逐字节一致**（品牌注释与 Button 组件 Token 的新增除外，见「已知取舍」）
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
- **Token 的对比度契约分两份，且只对定义它的目标生效。** `CONTRAST_PAIRS` 是从原型逐字转录的迁移契约（有测试守着它不许漂移），`PACKAGE_CONTRAST_PAIRS` 是包自己的追加契约（success/warning 实心填充、五个主题的「可读色」、链接色）。原型不会被要求满足后者——它根本没有那些 Token，要求它满足是范畴错误。
- **两份契约的分工是明确的，不是遗漏。** 审计只能算它能解析的颜色：不透明填充，以及画在已知表面上的可读色。`outline`/`dashed`/`text` 的 hover 与 pressed 用的是 `color-mix(in srgb, currentColor X%, transparent)` —— 它取决于落在什么元素上，解析器算不出来。这些状态由浏览器扫描负责（把每一格真的推进静止 / hover / focus-visible / pressed 再量合成后的结果）。把 `--opacity-pressed` 从 .10 抬到 .55 可以验证这条边界：审计报 5 对不透明组合失败，浏览器扫描报 **40 次**状态测量失败。
- **发布出去的 ESM 必须能离开本仓库。** `@yue-ui/hooks` 的 JavaScript 由 `tsc` 直接产出
  （不经过打包器），所以相对导入必须写成 `'./types.js'` —— 省略扩展名时，仓库内的测试
  全都会通过（都走打包器或 workspace 链接），但消费者一 `import` 就是
  `ERR_MODULE_NOT_FOUND`。三层检查守着这条：`tests/esm-specifiers.test.mjs`（源码静态检查）、
  `verify:dist`（构建产物里每个相对说明符都必须带扩展名）、`verify:tarball`
  （把 hooks 单独打包安装，用**原生 Node ESM** 加载并调用其导出）。
- **类名命名空间是常量，不是配置项。** CSS 选择器无法在运行时由变量拼出，
  而样式表是随包预构建的；可配置的命名空间只会产出样式表匹配不到的类名，
  让组件静默变成裸样式。`YueConfig` 因此只有 `size`，传 `prefix` 会收到解释性警告。
  这一点由三层检查守着：`useNamespace` 测试、组件测试里「DOM 类名 ↔ 样式表」一致性断言、
  以及 `verify:dist`（样式表命名空间必须与构建产物里的 JS 常量一致）与
  `verify:tarball`（真实浏览器里确认 DOM 类名确实被已加载的规则命中）。

## 已知取舍

- **字体体积**：`packages/tokens/assets` 约 17MB（HarmonyOS Sans SC ×4 等）。
  当前优先保证视觉基准不失真；做 tarball 发布验证时会重新评估是否拆成可选子路径。
- **原型基准与包的差异**：`packages/tokens/src/**` 的注释已改成新品牌名，
  并新增了 55 个 Token（Button 组件 Token、语义层 `--action-warning`、文本层级、布局边界、语义动效别名）。
  原型保持逐字节不变，因此两者的**共享 Token 值**仍由审计器逐项比对，新增项被登记在
  `tools/token-audit.pairs.mjs` 的 `PACKAGE_ONLY_TOKENS` 里；任何未登记的
  包内新增 Token 都会让 `pnpm test` 失败。
- **Button 变体 `ghost` 已更名为 `text`（破坏性变更）**。参考实现的 `variant="text"` 与 Yue
  原来的 `ghost` 是同一种观感（完整控件盒、无填充无边框、悬停给淡色覆盖层），两个名字一种外观
  只会让人纠结，所以统一叫 `text`；`link` 保留但语义收紧为**行内**动作（无固定高度）。
  同时新增 `dashed` 变体与 `warning` 主题。类型联合是编译期错误来源，所以残留调用会直接编译失败。
  逐条取舍（采纳了什么、刻意不抄什么、为什么）记在
  [`apps/docs/components/button.md`](apps/docs/components/button.md) 的「与 TDesign 的取舍」。
- **密度不是 Token 契约的一部分**：`data-density` 只存在于文档站，用重指
  Component Token 的方式演示「消费方覆写」，Token 包里没有 density 维度。
- **`.npmrc` 固定了镜像源**：本机无法直连 `registry.npmjs.org`，仓库内固定为
  `mirrors.tencent.com/npm` 并开启 `prefer-offline`（依赖版本均已锁定在 pnpm store 中）。
- **`verify:tarball` 用的是本机已安装的 Chrome**（`playwright-core` 不下载浏览器），
  可用 `YUE_BROWSER_PATH` 指定其它浏览器。
