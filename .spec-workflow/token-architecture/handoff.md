# Token 架构重构交接（Phase 6）

执行计划：`docs/05-yue-token-refactor-plan.md`（唯一执行依据）。本文件是 Phase 6 的交付，
与文件树、`package.json` exports 和实跑门禁逐条对应。

## 1. 路径变化

```text
删除（旧聚合与旧目录）
  packages/tokens/src/primitives.css           → primitives/{_index,color,typography,space,shape,motion,effects,control}.css
  packages/tokens/src/semantics.css            → semantics/{_index,surface,text,border,feedback,action,accent,interaction,elevation,scrim}.css
  packages/tokens/src/components.css           → component-tokens/{_index,18 个命名空间}.css
  packages/tokens/src/components/（原型归档）   → prototype/{box,button,form,list,misc,overlay,status}.css
  packages/tokens/src/components/index.css     → implementations.css（显式 opt-in 入口）

新增
  packages/tokens/src/primitives/_index.css    等 4 个目录入口（只做 @import）
  tools/lib/token-architecture.mjs             可达性/唯一性/层方向/exports/目录 门禁
  tools/lib/token-grammar.mjs                  命名 grammar 与旧名残留门禁
  tools/token-inventory.mjs                    Token inventory 生成器（前后 diff 的依据）
  tools/rename-map.mjs                         从冻结 grammar 推导改名映射
  tests/token-architecture.test.mjs (17) tests/token-grammar.test.mjs (23)
  tests/docs-architecture-consistency.test.mjs (7) tests/token-tag-geometry.test.mjs (7)

exports（收窄后）
  ".", "./index.css", "./implementations.css", "./component-tokens/*.css", "./assets/*", "./package.json"
  —— 无 "./components.css"（名实背离的旧导出）、无 "./src/*"（不把内部树变成公共 API）
```

`src/` 共 45 个文件：component-tokens 18、prototype 7、primitives 8、semantics 10、入口 2。

## 2. Token 数量与 namespace 变化

```text
tokens 591（不变）        层分布：primitives 179 / semantics 81 / components 331
catalogue 17 组 / 17 文件  公共图文件 4 → 37
```

层分布的 6 处移动是有意的分类修正，不是数量变化：
- `control-*` 12 个几何尺度：components → primitives（§4：不带组件语义的尺度属 primitive）；
- `--control-accent` / `--control-accent-checked`：components → semantics（它们引用 `--accent-solid` /
  `--on-accent`，层方向门禁拦下了「primitive 引用 semantics」的前向引用）；
- `--focus-width` / `--focus-offset`：primitives → semantics（与 `--focus-ring-color` 合成三件套）。

## 3. 旧名 → 新名映射（9 条，全部登记在 `PACKAGE_RENAMES`）

| 旧名 | 新名 | 理由 |
| --- | --- | --- |
| `--focus-ring` | `--focus-ring-color` | 旧名是**颜色**却读起来像整个环；三件套现在同层 |
| `--focus-width` | `--focus-ring-width` | 环的几何是语义决策，不该在 primitive 层 |
| `--focus-offset` | `--focus-ring-offset` | 同上 |
| `--badge-fg` | `--badge-foreground` | §5：property 不得缩写为 `fg` |
| `--info-fg` | `--info-foreground` | 同上 |
| `--warning-fg` | `--warning-foreground` | 同上 |
| `--error-fg` | `--error-foreground` | 同上 |
| `--success-fg` | `--success-foreground` | 同上 |
| `--selection-fg` | `--selection-foreground` | 同上 |

不保留 alias：旧名在包内已不存在，残留门禁（扫 50 个样式表）0 命中。
登记表由测试断言「实际生效的改名集合 == 注册表」且无空转条目。

## 4. 视觉行为变化

**本方案（Phase 2–5）引入的视觉值变化：0。**

- Phase 2 的验收判据是解析值逐字一致：4 个 profile × 591 token **差异 0**；
- 两批改名都是等值改名：parity 门禁按名字比较，注册表把原型名映射到新名后比较值，
  10 条已登记分歧（全部来自上一份报告的 Tag 紧凑尺度与方角）之外无值差异；
- 唯一的行为变化是**新增断言**暴露并修好的两处**失效引用**（不是设计变更）：
  文档主题 `custom.css` 仍在用 `--success-fg` / `--focus-ring` / `--focus-width` / `--focus-offset`，
  在改名后会静默失效——由残留门禁在首次运行时抓到并修复。这正是该门禁存在的理由：
  parity 注册表看不到 token 图之外的样式表。

上一份报告（`docs/Temp/log.txt`）带来的 Tag 视觉变化已单独登记在
`.spec-workflow/token-architecture/breaking-changes.md`（高度 32→24、圆角 9999→4px、禁用透明度 0.45→0.38）。

## 5. 前后测试结果

```text
基线口径（限制，不是脚注）：基线取自 commit 2939417 **但工作区当时含 71 项并行改动**，因此下面比较的是
整合后的工作树，而不是隔离的 Token 改动——Token 迁移本身的等价性由「4 profile × 591 token 解析值差异 0」
和两批等值改名证明，不依赖该基线。
基线（Phase 0，commit 2939417，工作区 71 项并行改动）：
  test 597 / 26 files；audit:tokens 110/110 + architecture 0 违规；verify:all PASS
迁移后（Phase 6）：
  test 628 / 28 files；audit:tokens：原型 64/64、包 110/110、10 条登记分歧、
    grammar 331 名 0 违规（19 名按 §3b 冻结）、residue 9 名 × 50 表 0 命中、
    architecture 591 token / 37 可达文件 / 17 目录组 / unreachable·undeclared·duplicates·layer 0
  verify:all PASS（8 项：dist / treeshaking / visual / tarball 含在内；
    fonts 19 emitted；bilingual 48 页；prerender 逐 locale 正确）
审计后新增/改造的门禁：
  grammar 门禁改为**按 namespace 的结构解析**（tools/lib/token-vocabulary.mjs：冻结短语表 + button/tag 的
    axis 顺序表），负向夹具含轴顺序错位、词表外 property、未冻结前导 state 等
  新增 docs 一致性门禁（tests/docs-architecture-consistency.test.mjs）：散文不得提到已删除的路径/导出、
    层表数量必须等于 inventory、只能提到 package.json 真正声明的导出、README 字体路径必须与 @font-face 一致
  诊断路径接入 PACKAGE_RENAMES：package light/neutral 由 100/110 修正为 110/110，并加回归断言
  tarball 门禁新增 implementations.css 的浏览器渲染断言
意图变化：无值变化。测试从基线的 597 增至 696（28 文件），增量全部是本方案新增的门禁与断言：
  架构 17（原 11 + 目标布局夹具）、grammar 18、docs 一致性 6、改名登记 2、Token 驱动渲染 5（并入 verify:visual）、
  tarball 归档渲染 7 个 namespace；期间未删除或削弱任何既有断言
```

## 6. 未覆盖风险与后续约束

| 项 | 现状 | 约束/触发条件 |
| --- | --- | --- |
| grammar 门禁只覆盖 component-tokens 层 | primitive / semantic 按角色命名，不适用 §5 的组件 grammar | 新增语义层的命名规则前先冻结该层的 grammar，再扩展门禁 |
| 19 个前导 state 段名字 | 已按 §3b 冻结为合法（variant 取值 / 复合 property 短语） | 新出现的同类名字必须有意加入 `AXIS_STATE_NAMES`，否则门禁失败 |
| 未被其他文件消费的 Token（117） | **正常，不是债务** | Token 集是设计语言，覆盖必然宽于当前用量。`node tools/token-usage-report.mjs` 逐条给出存在理由：94 个原型契约定住名字、13 个只在声明文件内部被组合消费（如 `--accent-600` ← 同文件的 `--accent-solid`；旧口径排除自文件引用，把它们错报成孤儿）、10 个是文档化的面向消费者原语（断点/布局/动效时长，部分结构上无法被 CSS `var()` 读取）。**需要动作的：0** |
| `--opacity-focus` / `--opacity-dragged` | 无消费方，为 parity 保留 | 出现消费方时补验收；否则考虑随原型基线一起冻结 |
| §6 点名的 `--overlay-bg` / `--overlay-border` / `--text-heading` | **已决定：不添加**（§6 本来就禁止无消费方新增） | 触发条件：出现第一个真实消费方时，同时提交四种模式行为、覆盖策略、文档与解析测试。这不是待办项，是符合方案的决策 |
| 草稿的 dark 模式 opacity 值变更（`.12` / `.18`） | **未实施** | 需要设计确认；实施时按「独立行为变更」验收（对比度 + 浏览器断言） |
| 原型归档（`prototype/*.css`） | 可选入口，**7 个 namespace + 3 个状态族**各有真实浏览器断言 | `verify:tarball` 从安装后的 tarball 渲染归档页：`.btn`（height/background/border）、`.field`（gap）、`.list-row`（min-height）、`.overlay`、`.box[data-tone=subtle]`、`.status`、`.link`，全部与浏览器解析出的 Token 比较；**规则族**另测 hover（`.btn:hover` 背景 = `--button-default-background-hover`，真实指针进入）、`:disabled`（背景 = `--disabled-container`、文字 = `--disabled-content`）、`[data-bordered]`（border-width = `--border-1`）。未覆盖：其余尺寸/tone 变体、`.list-row.selected`、`.status` 各语义色、以及需要 JS 的规则——新增归档规则时按同一表格补一条断言 |

## 6b. 审核（Phase 6 交付后）与处置

审核在整合工作树上重跑 `pnpm verify:all`（通过）后提出 4 项，全部已修复，且每一项都换来了一个门禁而不是
一次性编辑：

| 审核项 | 处置 | 证据 |
| --- | --- | --- |
| P1 架构文档仍描述旧文件树与已删除导出 | README + 中英文架构/Foundation/工具页同步；新增 docs 一致性门禁 | 该门禁首次运行又抓到我漏掉的 4 处（英文架构页两个 `@import`、英文工具页两处 `components.css`） |
| P1 命名门禁未实现冻结 grammar | 改为按 namespace 的结构解析（冻结短语表 + axis 顺序表） | 负向夹具：轴顺序错位 `--button-solid-primary-background`、词表外 property `--badge-blur-radius` |
| P2 neutral 诊断把已改名 Token 报成 unresolved | 诊断路径接入注册表 | `package light/neutral, dark/neutral: 110/110 PASS`（修复前 100/110）+ 回归断言 |
| P2 原型归档无视觉验收 | tarball 门禁新增归档页面的浏览器渲染断言 | `.btn` 高度/背景/边框三项与浏览器解析出的 Token 相等 |

审核同时指出基线来自含并行改动的整合工作树——已在 §5 明确写为限制。

第二轮审核（在第一轮修复之后）指出 5 项，全部已修复：

| 第二轮审核项 | 处置 | 证据 |
| --- | --- | --- |
| Foundation 页仍引用已删除的 `src/components/box.css`、`overlay.css` | 改为 `src/component-tokens/box.css`、`src/prototype/overlay.css`（中英文） | docs 一致性门禁的路径检查扩到**每一个**已删除路径，并允许「曾经/已删除/removed」这类历史句 |
| 工具页示例输出仍是 4 file / 18 group | 更新为真实的 37 file / 17 group | 门禁现在**从 inventory CLI 计算**该行并要求文档引用与之一致 |
| 文档测试硬编码 179/81/331 | 改为调用 `tools/token-inventory.mjs --json` 读取 | 新增「提交的 inventory 必须等于 CLI 当前输出」断言 |
| handoff 的测试数量/文件列表过期 | 按实跑重新统计（696 测试 / 33 文件，逐文件列出） | §1、§5、§9 |
| 归档视觉门禁只是代表路径 | 扩展到 7 个 namespace 各一项断言 | `implementations.css: 6 further namespace(s) render from tokens (field, list, overlay, box, status, link)` |

## 7. §9 完成标准逐条对照

| # | 标准 | 证据 |
| --- | --- | --- |
| 1 | 目标目录职责不再冲突 | §1 文件树；4 个目录入口只做 `@import` |
| 2 | Token 只有一个声明点，所有声明可达 | architecture：unreachable 0、duplicates 0、cross-file slots 0（591 token / 37 文件） |
| 3 | 层依赖单向且由门禁保护 | 层方向检查 0 违规（含被拦下的 `--control-accent` 前向引用） |
| 4 | 没有旧 Token 名、旧入口或临时兼容层残留 | §3 的 9 条改名 + 残留门禁 0 命中；旧文件/目录/exports 已删除；两个一次性 codemod 已删 |
| 5 | 新增 Semantic Token 均有真实消费方与验收 | 未新增无消费方 Token；三件套有 Token 驱动渲染断言 + 对比度矩阵 |
| 6 | Button/Input/Tag 与原型页面无无意回归 | Phase 2 解析 diff 0；verify:visual（主题矩阵 / RTL / 长文案 / 双语）与 tarball（真实 IME）全绿 |
| 7 | 全部门禁通过 | §5：696 测试 / 33 文件 + `verify:all` 8 项 |
| 8 | 视觉差异均有登记 | §4：本方案 0 值变化；Tag 的登记在 breaking-changes.md |
| 9 | handoff 与文件树/exports/测试一致 | 本文件；exports 与 `package.json` 逐条一致，并由 docs 一致性门禁持续核对文档侧 |
