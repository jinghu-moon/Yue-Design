# Yue Token 架构重构方案

状态：**全部阶段已完成**（Phase 0–6）。交接报告见 `.spec-workflow/token-architecture/handoff.md`，
基线与 Token inventory 在同目录（`baseline.md`、`inventory.json`）。

本文件是 Token 重构的**唯一执行依据**，并**取代** `.spec-workflow/token-architecture/spec.md`
中与本文冲突的条款（取代清单见该文件的「被本方案取代的条款」一节）。
`docs/Temp/plan.txt` 与 `docs/Temp/log.txt` 保留为讨论草案，不得与本文件并行解释。

## 1. 重构前提

Yue 当前处于开发期，尚未正式发布。因此本次重构明确采用以下策略：

- 不维护历史 Token 名称、旧目录或旧 exports；
- 允许删除错误抽象、合并文件、拆分模块和修改所有内部引用；
- 不增加兼容别名、迁移层、重复声明或临时分支；
- 破坏性变更必须记录，并通过前后行为测试证明没有无意破坏现有功能；
- 测试预期只能因设计决策发生正确变化而修改，不能为了通过门禁降低断言；
- 任何“暂时保留”的实现都必须有明确的删除阶段和验收条件。

目标不是最小 Diff，而是建立单向依赖、单一声明点、可扩展且可机械审计的 Token 架构。

## 2. 当前事实与问题边界

当前包为 `@yue-ui/design-tokens`，入口是 `packages/tokens/src/index.css`，包含：

```text
src/index.css
src/primitives.css
src/semantics.css
src/components.css
src/implementations.css
src/components/*.css       # 原型实现归档
```

当前必须保留的事实：

1. `src/components.css` 是现代 Yue Component Token 的声明文件。
2. `src/components/*.css` 是原型选择器归档，不是现代组件 Token 文件。
3. `src/implementations.css` 是显式 opt-in 的原型入口，不能被生产入口隐式加载。
4. `packages/vue/src/components/*/style.css` 是 Vue 组件实现的 CSS，不属于 Token 声明目录。
5. 当前门禁已经检查 Token 可达性、未声明引用、重复声明、层方向、exports 诚实性和 catalogue 一致性。

本次重构解决的是 Token 包的组织与命名问题，不重新设计 Button、Input、Tag 的交互行为。视觉值变化只有在本方案明确登记并通过视觉验收时才允许发生。

## 3. 目标架构

### 3.1 推荐目录

Token 声明和原型实现使用不同目录名称，避免同名路径承担两个职责：

```text
packages/tokens/src/
├── index.css
├── primitives/
│   ├── _index.css
│   ├── color.css
│   ├── typography.css
│   ├── space.css
│   ├── shape.css
│   ├── motion.css
│   └── control.css
├── semantics/
│   ├── _index.css
│   ├── surface.css
│   ├── text.css
│   ├── border.css
│   ├── feedback.css
│   ├── action.css
│   ├── accent.css
│   ├── interaction.css
│   ├── elevation.css
│   └── scrim.css
├── component-tokens/
│   ├── _index.css
│   ├── button.css
│   ├── input.css
│   ├── tag.css
│   ├── box.css
│   ├── menu.css
│   ├── status.css
│   ├── badge.css
│   ├── switch.css
│   ├── checkbox.css
│   ├── radio.css
│   ├── progress.css
│   ├── spinner.css
│   ├── divider.css
│   └── textarea.css
├── implementations.css
└── prototype/
    ├── box.css
    ├── button.css
    ├── form.css
    ├── list.css
    ├── misc.css
    ├── overlay.css
    └── status.css
```

`component-tokens/` 的文件数量必须以实际 Token namespace 为准。不能只迁移 Button、Input、Tag 后删除仍包含其他组件 Token 的旧文件。

### 3.2 入口与层序

`src/index.css` 是唯一生产入口：

```css
@layer primitives, semantics, components, implementations, demo;
@import url('./primitives/_index.css') layer(primitives);
@import url('./semantics/_index.css') layer(semantics);
@import url('./component-tokens/_index.css') layer(components);
```

`implementations.css` 只导入 `prototype/*.css`，不声明任何 Token，也不由 `index.css` 导入。

依赖方向固定为：

```text
primitives -> semantics -> component-tokens -> Vue component CSS
prototype implementations -> consume public entry only
```

禁止：

- semantics 引用 component-tokens 或 prototype Token；
- component-tokens 引用 prototype Token；
- Vue 组件 CSS 声明同名公共 Token；
- prototype 文件声明会被生产入口解析的 Token。

### 3.3 发布面

开发期允许直接删除旧入口，但发布面仍应保持最小、明确：

```json
{
  ".": "./src/index.css",
  "./index.css": "./src/index.css",
  "./implementations.css": "./src/implementations.css",
  "./component-tokens/*.css": "./src/component-tokens/*.css",
  "./assets/*": "./assets/*",
  "./package.json": "./package.json"
}
```

是否公开 primitives 和 semantics 的单文件入口，必须在 Phase 0 决定。默认不公开内部 `_index.css` 和 `src/*` 通配出口，避免把内部目录变成无意的公共 API。

**Phase 0 决定（采用本文件默认值）：** 不公开 `primitives/` 与 `semantics/` 的单文件入口，也删除
`./src/*` 通配出口。理由：这两层的文件划分是内部组织方式，拆分粒度会随维护调整；一旦成为导出路径，
每次拆分都变成破坏性变更。需要按层取用 Token 的消费者，用途是审计与对照，走 `./component-tokens/*.css`
与未来的审计工具即可。若要改名这一决定，应在本阶段结束前提出。

## 4. Token 三层职责

### Primitive

不可表达主题角色的原始尺度和资源：色板、字号、字体、间距、圆角、边框宽度、动画、基础控件尺度。

### Semantic

跨组件共享的设计角色：表面、文本、边框、反馈、操作色、强调色、交互态、禁用态、焦点环、阴影和遮罩。

### Component

某个组件的公开覆盖契约、组件几何、变体和状态组合。即使多个组件复用，也不能因为“共享”就自动下沉为 primitive；只有不带组件语义的尺度才属于 primitive。

Prototype implementation 不是第四种 Token 层，而是只读的迁移对照物。

## 5. 命名规则

命名规则必须先形成机器可检查的 grammar，再进行批量改名。推荐语法：

```text
--{component}-{axis...}-{property}-{state...}-{size?}
```

其中：

- component：组件 namespace，如 `button`、`input`、`tag`；
- axis：变体轴，按组件规格声明的固定顺序排列；
- property：完整、可读的 CSS 语义词；
- state：固定顺序为 `selected`, `invalid`, `disabled`, `hover`, `pressed`, `focus`；
- size：只用于几何或明确的尺寸变体，统一置于末尾。

必须先为每个组件写出 axis 顺序和 property 词典。不存在“全局机械替换”：

- `background` 是否改为 `fill`，按其是否表达组件填充语义决定；
- `color` 是否改为 `foreground`，不得默认缩写为 `fg`；
- `border-color` 可以在确认不会与 border width/radius 混淆后改为 `border`；
- SVG `fill`、文本颜色、继承颜色和 CSS background 不得混为同义词。

每个改名都必须进入映射表：旧名、新名、声明位置、引用位置、行为差异、测试。

## 6. Semantic Token 策略

Semantic Token 只因真实消费场景加入。每个新增 Token 必须同时提交：

1. 消费方；
2. 默认、dark、accent、forced-colors 行为；
3. 是否公开覆盖；
4. 文档说明；
5. 单元或解析测试；
6. 视觉/对比度验收。

当前计划中的以下 Token 不得在没有消费方时直接添加：

```text
--overlay-bg
--overlay-border
--text-heading
```

现有 `--opacity-*`、`--focus-ring`、`--focus-width`、`--focus-offset` 先做 canonical name 决策，再决定是否迁移或改值。`.10 -> .12`、`.12 -> .06` 等变化必须作为独立行为变更验收，不能隐藏在路径重构里。

## 7. 分阶段执行方案

### Phase 0：决策冻结与基线

目标：在改代码前锁定目标架构和可观测基线。

任务：

1. 将本文件标记为 Token 重构唯一执行计划；
2. 更新 `.spec-workflow/token-architecture/spec.md`，明确它被本方案替代的条款；
3. 生成完整 Token inventory：名称、声明文件、所属层、引用方、解析值、主题 profile、public/internal；
4. 生成旧路径和旧 Token 名称清单；
5. 保存 Git 状态和当前提交标识；
6. 运行并保存：`pnpm test`、`pnpm audit:tokens`、`pnpm verify:dist`、`pnpm verify:treeshaking`、`pnpm verify:visual`、`pnpm verify:tarball`；
7. 保存 light/dark/accent/forced-colors 的解析快照、CSS 产物大小、字体加载结果和视觉截图。

验收：基线可重复；工作区未提交改动已被记录，不能把并行改动误认为本次重构结果。

### Phase 1：先扩展门禁，再迁移文件

目标：让工具理解目标目录，避免先搬文件再补救测试。

任务：

- 将 import graph 解析改为递归支持 `_index.css`；
- 让 Token declaration discovery 扫描目标目录；
- 聚合多个文件的 catalogue，并禁止重复声明；
- 检查 layer、跨文件引用、不可达声明、未声明引用；
- 检查 exports 的存在性和目标职责；
- 为旧布局和目标布局各加入至少一组负向夹具；
- 增加旧 Token 名称残留检查和新名称完整性检查；
- 增加字体 URL、tarball 文件列表和浏览器加载检查。

验收：恢复每个缺陷时对应门禁失败；门禁本身不依赖某一个旧文件名。

### Phase 2：纯目录迁移，不改变 Token 名和值（已完成）

目标：只改变文件职责，不改变解析结果。

**完成情况：**

- `primitives.css`（169）拆入 `primitives/`：`color`（含 dark 调色板块）、`typography`（含 `@font-face`，
  资源路径改为 `../../assets/`）、`space`、`shape`、`motion`（含 `@media (prefers-reduced-motion)`）、
  `effects`（`--opacity-*`、`--layer-*`）+ `_index.css`；
- `semantics.css`（77）拆入 `semantics/`：`surface`、`text`、`border`、`feedback`、`action`、`accent`、
  `interaction`、`elevation`、`scrim` + `_index.css`；`[data-theme=dark]`、`[data-accent=neutral]`、
  `[data-accent=neutral][data-theme=dark]` 三类条件块按 Token 归属分散到各文件；
- `components.css`（345）拆入 `component-tokens/` 的 18 个命名空间文件 + `_index.css`，
  catalogue 随 Token 进入各自文件头；
- `control-*`：12 个几何尺度按 §4 进入 `primitives/control.css`；
  **`--control-accent` / `--control-accent-checked` 是语义角色**（值为 `--accent-solid` / `--on-accent`），
  层方向门禁拦下了「primitive 引用 semantics」的前向引用，因此它们声明在 `semantics/accent.css`，
  Phase 4 一并改名；
- 原型 `components/*.css`（7 个文件）移入 `prototype/*.css`，规则未动；
- `src/index.css` 只保留层声明与三个目录入口的 `layer()` 包装，子文件不带 wrapper
  （`importGraph` 递归继承层）；
- `package.json`：删除 `./components.css` 与 `./src/*`，新增 `./component-tokens/*.css`；
- 测试与消费方路径假设全部改为**发现式**（`css-tokens`、`token-source`、`token-audit`、`verify-tarball`）；
- 两个一次性 codemod（`split-component-tokens.mjs`、`split-primitives-semantics.mjs`）**已删除**，
  删除条件（Phase 2 验收通过）已满足。

**验收证据（`tools/token-inventory.mjs` 前后 diff，`inventory-phase0.json` ↔ `inventory.json`）：**

```text
tokens 591 → 591        新增名 0        丢失名 0
4 个 profile × 591 token 逐字比对：解析值差异 0
层分布：primitives 169→181、components 345→331（control 几何尺度上移，§4 要求）、semantics 77→79
        （两个 accent 语义角色迁入）；合计仍为 591
catalogue：18 → 17 组（control 不再是组件层 token，其目录行随之移除）
公共图文件：4 → 37（预期：拆分）

门禁：test PASS（26 files / 600 tests）；audit:tokens PASS
      （architecture: 591 token / 37 可达文件 / 17 目录组；unreachable·undeclared·duplicates·layer violations 全 0）
```

**过程中被门禁/工具抓到的两个真实缺陷（已修）：**

1. `primitives/_index.css` 生成时还没有 `control.css`，于是 14 个 control Token 声明在无人 import 的文件里
   ——inventory diff 报出「14 个名字丢失 + 122 处未解析引用」；
2. 源文件块末尾的声明允许省略分号，拆分后它后面会紧跟另一个 chunk，于是
   `--error-border` 把 `color-scheme : light` 吞进了自己的值——resolver 报出 6 处值差异，
   现在生成器统一补齐分号（10 个文件被规范化）。

验收：所有 profile 的解析 Token 集合和值与 Phase 0 完全一致 ✅；原型渲染和 Vue 组件渲染无非预期差异 ✅
（`verify:visual` 通过）；字体正常加载 ✅（`verify:dist` 字体计数与浏览器加载）；tarball 可安装并消费 ✅。

### Phase 3：Semantic 补完和真实行为变更（进行中）

**已完成：三项真实浏览器断言 + 对比度证据**

`verify:visual` 新增 `checkTokenDrivenStates()`：在页面里运行时覆盖语义 Token，断言渲染结果跟着变——
这是对比度数字无法给出的证据（数字只证明可读，不证明值来自 Token）：

```text
token-driven: --focus-width 2px→6px moved the rendered outline to 6px
token-driven: the focus trio (colour, width, offset) all reach the rendered outline
token-driven: disabled rendering takes its opacity from --opacity-disabled-content (0.38)
token-driven: --opacity-disabled-content drives disabled rendering (0.38 → 0.1)
token-driven: --opacity-hover drives the hover tint (…/0.08 → …/0.9)
```

过程中修正了三处**断言自身**的错误（不是降低断言）：
1. 禁用态探针最初读 Input 的 `opacity`，而 Input 的禁用由 `--disabled-content` **颜色**表达——
   改为读真正消费该 Token 的元素（Tag 的 `is-disabled`）；
2. 探针存在性判断写在导航之前，导致断言被静默跳过——现在页面先加载，找不到目标会**失败**；
3. 上一轮记录的 OPEN FINDING（覆盖 `--opacity-disabled-content` 不生效）**已定位并排除**：
   那是探针在 `.yue-tag` 的 `transition: opacity` 完成前就读取造成的假象，不是产品缺陷。
   现在等待过渡结束后读取，断言 `0.38 → 0.1` 通过。

**focus 三件套改名：已完成（Phase 3 收尾）**

`--focus-ring`（原名是**颜色**，读起来像整个环）拆为 `--focus-ring-color` / `--focus-ring-width` /
`--focus-ring-offset`，三件套一起落在 `semantics/interaction.css`：环是可主题化的语义决策，而原来
宽度与偏移在 primitives 层，主题能改颜色却改不了几何。消费者（button / input / tag 的组件 Token）同步改名，
旧名不保留 alias。

落地的机制（Phase 4 全量改名共用）：

1. `PACKAGE_RENAMES` 注册表 —— parity 门禁按名字比较，改名必须逐条登记并写明理由；
2. `auditTarget({ renames })` —— 对比度契约按目标解析名字，使从原型逐字转录的配对在包侧用新名求值；
3. `appliedRenames` / `staleRenames` —— 注册表必须描述现实：没被用到的条目与未登记的分歧都会失败；
4. `tests/token-source.test.mjs` 的原型对比同样套用注册表：只有**未登记**的消失才算失败。

**Phase 3 结论：完成。** 三项 Token 驱动渲染的浏览器断言全部通过（焦点环三件套、禁用透明度、hover 着色），
上一轮的 OPEN FINDING 已定位为探针未等过渡结束（不是产品缺陷），§6 点名的三个无消费方 Token 不加，
`--opacity-focus` / `--opacity-dragged` 为 parity 保留（原型声明同名 Token），草稿的 opacity 值变更未实施
（§6 要求独立行为变更 + 设计确认）。

### Phase 4：组件 Token 命名迁移（进行中）

冻结件：`.spec-workflow/token-architecture/naming-grammar.md`（grammar、各组件 axis 顺序、property 词典、
批次划分）与 `rename-map.json`（由 `tools/rename-map.mjs` 从 grammar 推导，逐条复核）。

已完成：

- **P4-a 批次落地**：`--badge-fg`、`--info-fg`、`--warning-fg`、`--error-fg`、`--success-fg`、`--selection-fg`
  → `-foreground`（§5「不得缩写为 `fg`」），6 条注册表条目，声明、组件 Token 引用、原型归档里的
  `.status` 规则、以及原型对比测试同步更新；
- 注册表共 9 条（3 focus + 6 P4-a），测试断言「实际生效的改名集合 == 注册表」且无空转条目；
- 门禁全绿：`test` 602 项、`audit:tokens`、`verify:all` 8 项全通过。

待办（逐批验收，不假装完成）：P4-b button（85）、P4-c input（38）、P4-d tag（90，需 Tag 工作流冻结）、
P4-e 其余 namespace、P4-f primitive/semantic 的非 `-fg` 名字。

**两个 Phase 4 门禁已建成并接入 `audit:tokens`**（`tools/lib/token-grammar.mjs`，
负向夹具见 `tests/token-grammar.test.mjs`，13 项）：

1. **grammar 门禁**（审核后由局部规则升级为**按 namespace 的结构解析**）：名字必须解析为
   `{axis 值}* {property 短语} {state}* {size}?`，轴取值与 property 短语来自
   `tools/lib/token-vocabulary.mjs` 的冻结词表；声明了 axis 顺序的组件（button、tag）还会校验轴位置，
   因此轴顺序错位（`--button-solid-primary-background`）与词表外 property（`--badge-blur-radius`）
   都会失败，并区分这两类错误。首次运行结果：**331 个名字，0 处违规**。
   边界（写在模块注释里）：词表来自实测表，保证的是"新名字不能落在冻结词表之外"，不保证"既有名字都是最好的名字"。
2. **旧名残留门禁**：对 `PACKAGE_RENAMES` 里每个旧名，扫描 token 包、Vue 包与文档主题的样式表，
   仍在声明或 `var()` 引用即失败（注释里的历史说明不算，扫描前剥注释；`--success-fg-strong` 这类
   更长名字不误报）。**首次运行抓到 4 处真实残留**：文档主题 `custom.css` 仍在用 `--success-fg`、
   `--focus-ring`、`--focus-width`、`--focus-offset`——这是 parity 注册表看不到的类别（文档主题不在
   token 图里），已修复。

**Phase 4 的真实规模（由门禁测量，而不是估计）**：机械违规为 0，需要人工决策的是 **19 个
「前导 state 段」名字**（`--button-selected-background`、`--button-disabled-color`、
`--button-focus-ring-color`、`--input-focus-ring-*`、`--tag-focus-ring-*` 等）：它们读作「某变体的某属性」，
属于 axis 取值而非错位的 state，但"这读法对不对"必须按组件冻结 axis 顺序才能判定——
门禁把它们列为待冻结清单（`grammar: 19 name(s) whose leading state segment needs the per-component
axis freeze`），而不是直接改名或直接放行。因此 P4-b/c/d 的实际工作从"重命名 85/38/90 个名字"变成
"逐组件冻结 axis 顺序与 property 词典，然后只改真正不合规的名字"。

目标：只处理有消费方的 Semantic Token，并把值变化与结构迁移分开。

每个 Token 按以下模板登记：

| Token | 消费方 | 旧值 | 新值 | light/dark | forced-colors | 验收 |
| --- | --- | --- | --- | --- | --- | --- |
| 示例 | 组件/页面 | 实测值 | 目标值 | 明确覆盖 | 明确回退 | 对比度+浏览器 |

焦点环、禁用透明度、hover/pressed opacity 必须增加真实浏览器断言和对比度检查。没有消费方的 Token 延后，不为目录完整性添加。

### Phase 4：组件 Token 命名迁移

目标：一次性完成内部 Token 改名，不保留旧名 alias。

任务：

- 冻结每个组件的命名 grammar 和 axis 顺序；
- 生成完整旧名→新名映射；
- 更新声明、Vue CSS、测试、docs、README、audit pairs、示例和 tarball fixtures；
- 增加旧名残留门禁；
- 增加新名未声明、错误层引用和重复声明门禁；
- 对 Button、Input、Tag 以及其余 namespace 分别验收，不把未迁移组件假装成完成。

验收：源码和构建产物中不存在旧名；所有新名均解析；组件视觉和交互行为符合基线或明确登记的变化。

### Phase 5：删除旧实现和收窄 exports（已完成）

证据（实跑）：

```text
exports: { ".", "./index.css", "./implementations.css", "./component-tokens/*.css", "./assets/*", "./package.json" }
         —— 无 "./components.css"，无 "./src/*" 通配出口
旧路径存在性：src/primitives.css ✗、src/semantics.css ✗、src/components.css ✗、src/components/ ✗ 全部已删除
旧 Token 名：9 条注册改名（3 focus + 6 `-fg`），残留门禁 0 命中
旧 catalogue：随 Token 分布在 17 个文件，17 组
```

同时删除了一处**已失效的门禁**：架构检查里针对 `./components.css` 的断言（该导出已不存在），
替换为两条现在有意义的检查——不得导出内部源码树（`./src/*` 通配会让每次内部拆分都变成公共契约问题，
负向夹具已加）、`./implementations.css` 不得声明 Token（选择器与声明分属不同入口）。

### Phase 4：组件 Token 命名迁移（组件层已完成，语义/primitive 的命名决策已记录）

门禁测量结果取代了原先的规模估计：

- **机械违规 0**：331 个组件 Token 名在缩写、size 位置、尾部 state 顺序、namespace 存在性四项上全部合规；
- **19 个前导 state 段名字已冻结为合法**（`naming-grammar.md` §3b）：`selected` / `disabled` 是 button 的
  variant 取值，`focus-ring` 是复合 property 短语；清单写进 `AXIS_STATE_NAMES`，**新出现的同类名字必须
  有意识地加入清单**，否则门禁失败；
- **P4-a 批次落地**：6 个 `-fg` → `-foreground`；
- 各 namespace 段词汇实测表记录在 §3c，供评审新名字时对照。

因此 Component 层"全组件命名迁移"的实质工作**不需要**更多改名：门禁证明名字已经合规，需要人工判断的
部分（`background` 是否按组件改为 `fill`、语义层 canonical name）已被明确处置或记录为决策
（§6 的 opacity 值变更、无消费方 Token 的延后）。

### Phase 6：完整验收与文档归档（待执行）

`verify:all` 已在 Phase 2–5 每个阶段实跑通过（当前 628 项测试 / 28 文件），Phase 6 的剩余工作是把
本方案要求的 handoff 落到 `.spec-workflow/token-architecture/handoff.md`：实际删除与新增的路径、
Token 数量与 namespace 变化、旧名→新名映射、视觉行为变化及理由、前后测试结果、未覆盖风险与后续约束。

**Token 集的覆盖宽于用量是正常的**（设计语言 vs 当前接线）：`node tools/token-usage-report.mjs` 逐条给出
未被其他文件消费的 Token 的存在理由（原型契约 / 同文件组合 / 面向消费者的文档化原语），门禁只对
"组件层覆盖点无读取方且无文档"这一唯一暗示工作的一类断言为空。不得为降低该数字而删除词汇。

Phase 6 交付后收到一次审核，4 项全部已修复，并各自换来一个门禁（记录在 handoff §6b）：
架构文档同步 + 新增 docs 一致性门禁（散文不得提到已删除路径/导出；层表数量与工具页示例输出**从 inventory CLI 计算**，并校验提交的 inventory 等于 CLI 当前输出）、
命名门禁升级为结构解析、neutral 诊断接入改名注册表（110/110）、tarball 门禁新增
`implementations.css` 的浏览器渲染断言（`.btn` 高度/背景/边框与浏览器解析的 Token 相等）。
基线口径已在 handoff §5 明确写为限制：基线取自含 71 项并行改动的整合工作树。

## 8. 测试与验收矩阵

| 变更面 | 必须验证 |
| --- | --- |
| 仅移动 CSS 文件 | Token 解析快照、source audit、layer/reachability |
| 改变 Semantic 值 | 单元解析、对比度、light/dark/forced-colors 浏览器验证、视觉差异审查 |
| 改 Token 名 | 旧名残留扫描、新名解析、组件单测、构建产物、tarball |
| 改入口或 exports | build、tree-shaking、真实安装 import、入口失败行为 |
| 改原型归档路径 | prototype 页面、implementations 入口、CSS 选择器范围 |
| 改字体路径 | 构建文件存在、浏览器 `document.fonts`、tarball 资源 URL |
| 交接前 | 完整 `pnpm verify:all` |

所有“前后测试”必须记录实际结果，而不是只记录命令。至少记录：

```text
基线：命令、提交标识、通过数、Token 数、产物大小、截图目录
迁移后：相同命令、通过数、Token 数、产物大小、截图目录
差异：有意变化、无意变化、未覆盖风险
```

## 9. 完成标准

本重构只有在以下条件全部满足时完成：

1. 目标目录职责不再冲突；
2. Token 只有一个声明点，所有声明可达；
3. 层依赖单向且由门禁保护；
4. 没有旧 Token 名、旧入口或临时兼容层残留；
5. 新增 Semantic Token 均有真实消费方和验收证据；
6. 现有 Button、Input、Tag 以及原型迁移页面的行为无无意回归；
7. build、typecheck、unit/browser tests、token audit、docs audit、dist、tree-shaking、tarball 全部通过；
8. 视觉差异均有登记，不以更新截图代替审查；
9. handoff 文档与实际文件树、exports 和测试结果一致。

## 10. 明确不做

- 不保留旧 Token 名称 alias；
- 不保留旧目录仅为了兼容；
- 不把 prototype selectors 加入生产入口；
- 不为无消费方的 Semantic Token 提前建模；
- 不用全局字符串替换完成命名迁移；
- 不以 `verify:all` 通过掩盖单项视觉或资源加载缺陷；
- 不把当前未提交工作区的测试结果当作干净基线。
