# Token 包架构：规格（冻结）

状态：**已冻结，但实施依据已被取代**（用户已就四项决策逐条确认，见「决策记录」）。

> **后续被取代的部分：** `docs/05-yue-token-refactor-plan.md` 是 Token 重构的**唯一执行依据**，
> 本文件在其冲突处失效。被取代的条款：
>
> | 本文件条款 | 被取代为 |
> | --- | --- |
> | 「架构（改动后）」的目录布局（`components.css` 单文件 + `components/` 归档） | 方案 §3.1：`primitives/`、`semantics/`、`component-tokens/`、`prototype/` 四目录 |
> | 「门禁（新增）」六项检查隐含的文件名假设 | 方案 §7 Phase 1：门禁必须递归理解 `_index.css`，不得依赖任何旧文件名 |
> | 「Explicit non-features」中「不在本次改动里重命名 Tag token」 | 方案 §7 Phase 4：全部组件 token 一次性改名，不保留 alias |
> | 「Open questions」中的 Tag 命名与 `lg` 取值 | 方案 §5 命名 grammar + §7 Phase 3 的值变更登记 |
>
> 仍然有效：决策 1（单一声明点）、决策 3（原型归档 opt-in）、决策 4（无消费方不加 semantic token），
> 以及「与报告的差异」一节的代码事实。本文件保留为决策历史。

来源材料：`docs/Temp/log.txt`（Token 包架构调研报告，含 TDesign / Ant Design 5 / Vuetify 4 对比）。
本规格对该报告的结论做了**两处修正**，修正依据是代码事实，写在「与报告的差异」一节。

## Identity

- 改动对象：`@yue-ui/design-tokens` 包（纯 CSS，无构建步骤）的 **token 声明架构**，以及
  保护该架构的门禁。不是新组件，也不是新的视觉方向。
- 影响面：`packages/tokens/src/**`、`packages/tokens/package.json`、`tools/audit-tokens.mjs`
  及其门禁、`packages/vue/src/components/tag/style.css` 的取值、双语 token 文档。

## Problem and use cases

### 复现（改动前实测）

浏览器实测（`apps/docs/.vitepress/dist`，`/components/tag`，58 个 Tag）：

| 观测量 | 改动前 | 说明 |
| --- | --- | --- |
| `.yue-tag--md.yue-tag--square` 的 `height` | **32px** | 应取紧凑 chip ramp 的 24px |
| 同上 `padding-inline` | **12px** | 应取 8px |
| 同上 `font-size` | **14px** | 应取 12px |
| 同上 `border-radius` | **9999px** | `--tag-border-radius` 取到原型的 `--radius-full`，于是 `--square` 与 `--round` 视觉上无法区分 |
| `is-disabled` 的 `opacity` | **0.45** | 系统约定是 `--opacity-disabled-content`（.38） |

token 解析实测（`createResolver(loadTokenSheet('packages/tokens/src/index.css'))`，
profile `light/azure`）：`--tag-height-md` = `32px`、`--tag-padding-inline-md` = `12px`、
`--tag-font-size-md` = `14px`、`--tag-border-radius` = `9999px`、`--tag-opacity-disabled` = `0.45`。

### 根因（结构性，不是单点 bug）

1. **token 有两条链路，只有一条被安装。** `src/components.css`（进入 `layer(components)`）被
   `src/index.css` 引入；`src/components/*.css`（进入 `layer(implementations)`）只被
   `src/components/index.css` 引入，而 `index.css` **不引用它**。同一批 `--tag-*` 名字在两边各写一遍，
   生效的那份是原型的控制尺寸别名，Tag 真正需要的紧凑 ramp 在不可达的那份里。
2. **`package.json` 的导出名与内容背离。** `"./components.css": "./src/components/index.css"`
   指向的是那个不可达目录入口，而不是 `src/components.css`。消费者按导出名使用，拿到的是游离的
   implementations 层样式。
3. **没有编译期检查。** 「声明了但不可达」「引用了但没声明」两类错误都不会被任何门禁发现：
   `audit:tokens` 只解析 token 包自己的入口图，从不看 `@yue-ui/vue` 里对 token 的 `var()` 引用。
4. **语义层反向依赖组件层。** `semantics.css:148` 的
   `--list-row-background-hover: var(--button-ghost-background-hover)` 引用了 components 层的
   token，破坏 `primitives → semantics → components` 的单向依赖；CSS 懒解析让它"能跑"，
   一旦 components 层缺失就静默失效。
5. **组件 token 在层内反向穿透到实现层。** `components/form.css` 的 focus ring 写死了
   `var(--space-4)`，而 `--input-focus-ring-width` / `--input-focus-ring-offset` 已存在却没人用——
   改 token 不生效，必须改实现文件。
6. **禁用态 opacity 有一个魔法数字**（`0.45`），没有引用 primitives 的约定值。

### 用到的场景

- 任何消费者安装 `@yue-ui/design-tokens/index.css` + `@yue-ui/vue/style.css` 后，组件的每个
  `var(--x)` 都必须解析到真实值（Tag 的 focus ring / disabled opacity 曾经是空的）。
- 维护者改一个 token 时必须知道"改哪里才生效"，且只有一处。
- 审查者要能机械地判断"这个 token 有没有被加载"。

## 决策记录

| # | 决策 | 结果 |
| --- | --- | --- |
| 1 | 架构方向 | **C：单一声明点 + 原型归档改名**。`components.css` 是 Component Token 的唯一声明点；`components/*.css` 保留为显式命名的可选归档；`./components.css` 指向真正的 token 文件；新增四类门禁。**不采用报告的方案 B**（把 `components/*.css` 并入主入口），因为按字面执行会把原型 UI 选择器发给每个消费者。 |
| 2 | Tag 取值 | **紧凑 chip ramp 为准**：高度 20/24/30、padding-inline 6/8/10、字号 11/12/13、`--tag-border-radius: var(--radius-sm)`、`--tag-opacity-disabled: var(--opacity-disabled-content)`。**不做重命名**，避免与并行的 Tag 组件工作流冲突；`.spec-workflow/yue-tag/spec.md` 里的 `--tag-fill-*` / `--tag-radius` 命名留给 Tag 工作流执行。破坏性视觉变更，前后测试见 breaking-changes.md。 |
| 3 | 原型实现层 | **改名为 `./implementations.css` 保留**。主入口不引用它；它是迁移对照物证，不是发布面。 |
| 4 | P2 `--surface-invert-aware` | **暂不新增，记为明确非目标**。触发条件：出现第一个需要「亮色填充 / 暗色透传父背景」的组件时再加，并登记进 `PACKAGE_ONLY_TOKENS`。 |

## 与报告的差异（依据代码事实）

| 报告结论 | 事实 | 处理 |
| --- | --- | --- |
| 「推荐方案 B：每个 `components/*.css` 自带 token 块与规则块，由 `index.css` 统一 import」 | `components/*.css` 的选择器是原型期的 `.btn` / `.field` / `.list-row` / `.status` / `.overlay`，共约 600 行；现代组件层在 `packages/vue/src/components/*/style.css`（`.yue-*`）。只有 `tag.css` 是纯 token 文件（0 个选择器）。 | 采用 C：达到 B 的目标（单一声明点）但不把原型选择器带进主入口；`tag.css` 的 token 并入 `components.css` 后删除该文件。 |
| 「`components/tag.css` 的 geometry 与 `components.css` 同名 token 值不同，implementations 层优先级更高所以后者赢」 | 实测生效值恰恰是**原型**那份（32px / 9999px），因为 `components/index.css` 从未被主入口引用；`tag.css` 是死文件。 | 以「可达性」为门禁的核心：不可达的声明直接失败，不再靠"哪层优先级高"推断。 |
| 「prototype 也有 `--tag-height-*`，parity 测试要求值完全一致」 | 属实。原型 `design-tokens-generic-v4/tokens/components.css` 声明了同名 token，`compareTargets` 对共享名比较**解析后的值**。 | 紧凑 ramp 是与原型的**有意分歧**。新增 `PACKAGE_DIVERGENCES` 登记表：每条分歧写明名字、原型值、包值、理由，并由测试断言"实际分歧集合 == 登记集合"，把静默漂移变成必须审查的编辑。 |

## Token 改动表

| token | 改动前（可达值） | 改动后 | 来源 |
| --- | --- | --- | --- |
| `--tag-height-sm/md/lg` | `var(--control-height-sm/md/lg)` → 28/32/40px | 20px / 24px / 30px | 紧凑 chip ramp（分歧登记） |
| `--tag-padding-inline-sm/md/lg` | `var(--control-padding-inline-*)` → 8/12/16px | 6px / 8px / 10px | 同上 |
| `--tag-font-size-sm/md/lg` | `var(--control-font-size-*)` → 12/14/16px | 11px / 12px / 13px | 同上 |
| `--tag-border-radius` | `var(--radius-full)` → 9999px | `var(--radius-sm)` → 4px | 默认方形；`round` 由 `--tag-border-radius-round` 表达 |
| `--tag-opacity-disabled` | `0.45` | `var(--opacity-disabled-content)` → .38 | 统一系统禁用透明度 |
| `--tag-padding-block` / `--tag-gap` / `--tag-border-width` | 原型值 | 不变 | 与原型的取值一致，无需分歧 |
| `--tag-focus-ring-*` / `--tag-close-icon-size` / `--tag-font-weight` / `--tag-line-height` / `--tag-duration` / `--tag-ease` / 颜色矩阵 | 已在 `components.css` | 值不变，仅确认唯一副本 | package-only，已登记 |

紧凑 ramp 的说明（写进 CSS 注释）：**Tag 是 chip，不是表单控件**。它不带 `--control-*` 抽象，
因为控件的 32/40px 高度与 12/16px 内边距是为可点击输入准备的，套在标签上会让「标签」看起来像按钮。
ramp 因此是 Tag 自己的尺度，允许落在 4px 网格之外（`lg` = 30px）。

## 架构（改动后）

```
packages/tokens/src/
├── index.css                 @layer primitives, semantics, components, implementations, demo;
│                             @import primitives / semantics / components.css     ← 唯一被安装的链路
├── primitives.css            原始尺度（--size-*、--space-*、--font-size-*、--radius-*、--opacity-*）
├── semantics.css             主题与交互角色（不得引用 components / implementations）
├── components.css            唯一 Component Token 声明点（layer components）
├── implementations.css       原型期选择器归档入口（layer implementations），不被 index.css 引用
└── components/               原型期选择器（.btn / .field / .list-row / …），只被 implementations.css 引用
```

`package.json`（改动后）：

```json
"./index.css": "./src/index.css",
"./components.css": "./src/components.css",
"./implementations.css": "./src/implementations.css",
"./src/*": "./src/*"
```

## 门禁（新增，全部可失败）

`tools/lib/token-architecture.mjs` + `tools/audit-tokens.mjs` 接入，`tests/token-architecture.test.mjs`
逐条负向夹具：

1. **可达性**：包内声明的每个 token 都必须能从 `src/index.css` 解析到；不可达的声明 = 失败（Tag bug 的直接类别）。
2. **引用已声明**：`packages/vue/src/**/*.css` 里每个 `var(--x)` 必须在公共入口里声明，或属于允许的
   私有槽（`--_*` 前缀）或运行时注入白名单（`--yue-*` 由宿主提供）。未声明 = 失败。
3. **单一声明点**：同一 token 不允许在两个包内文件里各声明一次（同一文件内的主题块除外）。
4. **层方向**：`semantics.css` 不得引用 components/implementations 层独有 token；`components.css`
   不得引用 implementations 层独有 token。
5. **导出诚实**：`package.json` 每个 `exports` 指向存在的文件；`./components.css` 与
   `./implementations.css` 指向名实相符的文件。
6. **目录文档**：`components.css` 顶部机器可读目录块列出每个 token 的用途与可覆盖性，
   且与文件里实际声明的 token 集合一致（多一个少一个都失败）。

## Explicit non-features

- 不引入 RGB 通道式颜色存储（Vuetify 做法）。现有 `color-mix()` 已满足 opacity 合成，改格式会
  触及全部 200+ 颜色 token 且无收益。
- 不引入 TDesign 的 `--td-bg-color-specialcomponent` 等价 token（见决策 4）。
- 不做 Ant Design 式的算法生成色阶（本项目保留设计师对每一步的控制权）。
- 不把原型期选择器（`.btn` 等）并入主入口。
- 不在本次改动里重命名 Tag token（留给 Tag 工作流）。

## Breaking changes

见 `breaking-changes.md`（同一目录）。影响面：Tag 的渲染尺寸与默认圆角、禁用态透明度、
`@yue-ui/design-tokens/components.css` 的指向、`--tag-*` 的解析值。

## Open questions

- Tag `lg` 高度取 30px（本规格保持 Tag 工作流已写下的值）还是回到 4px 网格的 32px？
  留给 Tag 工作流确认；改这三个值只需一行 + 一条分歧登记。
- `.spec-workflow/yue-tag/spec.md` 的 token 命名（`--tag-fill-*` / `--tag-radius`）与当前实现的
  `--tag-{theme}-{variant}-*` 尚未统一，属于 Tag 组件工作流的范围。
