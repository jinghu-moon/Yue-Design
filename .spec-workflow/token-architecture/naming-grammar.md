# 命名 grammar 与改名映射（Phase 4）

执行依据：`docs/05-yue-token-refactor-plan.md` §5、§7 Phase 4。本文件是 Phase 4 的冻结件：
grammar、各组件 axis 顺序、property 词典、批次划分，以及旧名→新名映射的生成方式。

## 1. Grammar

```text
--{component}-{axis...}-{property}-{state...}-{size?}
```

- **component**：组件命名空间（`button`、`input`、`tag`…）；primitive 与 semantic 层不带 component
  前缀（`--space-8`、`--surface`），它们的"component"位由 layer 表达。
- **axis**：变体轴，按各组件冻结的顺序排列（见 §2），最后一轴之后才接 property。
- **property**：完整、可读的 CSS 语义词。**不得缩写**：`fg` → `foreground`。
- **state**：固定顺序 `selected`, `invalid`, `disabled`, `hover`, `pressed`, `focus`；出现在 property 之后。
- **size**：只在几何或明确尺寸变体上使用，**永远在末尾**。

不做全局字符串替换：每个名字进入映射表，由对应 namespace 的批次验收。

## 2. 各组件 axis 顺序（冻结）

| 组件 | axis 顺序 | 例（现状 → 目标） |
| --- | --- | --- |
| button | theme → variant → property → state → size | `--button-ghost-background-hover` ✓ 已符合 |
| input | property → state → size（无 theme/variant 轴） | `--input-border-color-focus` ✓ 已符合 |
| tag | theme → variant → property → state → size | `--tag-primary-tint-outline-border-color` ✓ 已符合 |
| badge | property | `--badge-fg` → `--badge-foreground` |
| 其余（box/menu/status/switch/checkbox/radio/progress/spinner/divider/icon/link/textarea/avatar） | property → state → size | 未发现 axis 违规 |

## 3. Property 词典（本次冻结的词条）

| 现名 | 目标名 | 判定依据 |
| --- | --- | --- |
| `fg` | `foreground` | §5 明确要求：不得默认缩写为 `fg` |
| `color` | 保留 `color` | 只有表达"组件填充"语义时才改为 `fill`；文本颜色保持 `color` |
| `background` | 保留 `background` | 组件填充语义统一用 `background`，`--_fill` 是私有槽，不是公共 token |
| `border-color` | 保留 `border-color` | 与 `border-width` / `border-radius` 同名前缀会造成歧义，不改 |
| `accent` | 保留 | 表达"以 accent 为前景色"的语义，非缩写 |

## 3b. 前导 state 段的冻结判定（19 个名字）

grammar 门禁测出 19 个名字的第二段是 state（`selected` / `disabled` / `focus`），它们**不是错位的修饰符**，
而是两类合法读法：

| 读法 | 名字 | 判定 |
| --- | --- | --- |
| state 段作为**变体取值** | `--button-selected-background`、`--button-selected-color`、`--button-selected-border-color`、`--button-selected-background-hover`、`--button-selected-background-pressed`、`--button-selected-marker-width`、`--button-selected-marker-color`、`--button-disabled-background`、`--button-disabled-color`、`--button-disabled-border-color` | button 的 axis 顺序是 theme → **variant** → property → state，`selected` / `disabled` 是 variant 取值 |
| `focus-ring` 作为**复合 property 短语** | `--button-focus-ring-color`、`--button-focus-ring-width`、`--button-focus-ring-offset`、`--input-focus-ring-*`、`--tag-focus-ring-*` | `focus-ring` 是一个 property 短语（环的三个属性），其后没有 state |

两个表格即 `tools/lib/token-grammar.mjs` 里的 `AXIS_STATE_NAMES`（19 条）。规则是：第二段为 state
且后面还有段的**新名字**必须在这份清单里，否则门禁失败并提示"要么让 state 后置，要么有意识地把它加入清单"。
这份清单只能通过有意识的编辑增长——这就是"逐组件冻结 axis 顺序"在机器可检查形式下的样子。

首次测量结果：**331 个名字，0 处机械违规；19 个名字按上表冻结为合法**。

## 3c. 各 namespace 的段词汇（实测，用于评审新名字）

```text
avatar   background border color font lg md radius size sm xl
badge    background border color font foreground height inline padding radius size
box      0 1 2 3 background block border color dialog font inline inverse lg md padding panel plain popover radius raised shadow size sm subtle toast tooltip width
button   accent background block border color danger dashed decoration default disabled duration ease flush focus font full gap ghost height hover icon inline lg line link marker md offset outline padding pressed primary radius ring secondary selected size sm spinner style subtle success warning weight width
checkbox accent color size
divider  block border color margin width
icon     lg md size sm
input    affix background block border clear color disabled duration ease focus font gap glyph height hit hover icon inline invalid lg md offset padding placeholder radius readonly ring size sm width
link     color decoration
menu     background border color hover item radius width
progress border fill height radius track
radio    accent color size
spinner  border color duration size track width
status   block border gap inline padding radius width
switch   background border checked color height inset radius shift thumb width
tag      background block border close color danger default disabled duration ease filled focus font gap height hover icon inline lg line md offset opacity outline padding primary radius ring round selected size sm success tint warning weight width
textarea block height line padding
```

| 批次 | 范围 | 名字数 | 状态 |
| --- | --- | --- | --- |
| P4-a | semantic + component 的 `-fg` → `-foreground` | 6 | **本批**  |
| P4-b | button namespace（85） | 待生成映射 | 未开始 |
| P4-c | input namespace（38） | 待生成映射 | 未开始 |
| P4-d | tag namespace（90） | 待生成映射 | 未开始（需 Tag 工作流冻结） |
| P4-e | 其余 namespace（box / menu / status / switch / checkbox / radio / progress / spinner / divider / icon / link / textarea / avatar） | 待生成映射 | 未开始 |
| P4-f | primitive 与 semantic 的非 `-fg` 名字 | 待生成映射 | 未开始 |

## 5. 映射生成

`tools/rename-map.mjs` 按本文件的 grammar 与词典**推导**每个 token 的目标名，输出
`.spec-workflow/token-architecture/rename-map.json`（`{ from, to, layer, namespace, batch, reason }`）。
推导结果必须人工复核：脚本只负责穷举，不负责判断"这个 property 是否真的表达填充语义"。

## 6. 落地的三个前置机制（Phase 3 已建成）

1. `PACKAGE_RENAMES` 注册表：parity 门禁按名字比较，改名必须登记，未登记即失败、登记却不匹配也失败；
2. `auditTarget({ renames })`：对比度契约按目标解析名字，使从原型逐字转录的配对在包侧用新名求值；
3. 旧名残留门禁（`tools/lib/token-architecture.mjs`）：映射表里的任何旧名一旦仍出现在源码或构建产物里即失败。
