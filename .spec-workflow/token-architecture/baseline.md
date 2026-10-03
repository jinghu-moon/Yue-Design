# Token 重构基线（Phase 0）

执行方案：`docs/05-yue-token-refactor-plan.md`。本文件是 Phase 0 的产出，记录**改动前**的可观测状态，
供 Phase 2（纯目录迁移，要求解析结果完全一致）和 Phase 4（改名，要求旧名归零）逐项对比。

采集命令与结果都是实跑输出，不是推断。

## 1. 工作区标识

```text
commit:      2939417 (main)
dirty:       71 项未提交改动（并行工作流：Tag 组件、文档站、i18n 门禁）
```

**重要：** 这 71 项包含本重构开始前就已存在的并行改动（Tag 组件、文档站 hostname、i18n 相关）。
Phase 6 比对时必须区分“本重构引入的差异”与“并行工作流引入的差异”，不能把后者算作重构结果。
完整清单见 `git status --porcelain`（执行前快照）。

## 2. Token inventory

生成器：`tools/token-inventory.mjs`（读取公共入口图，与对比度审计共用解析器）。
产物：`.spec-workflow/token-architecture/inventory.json`（含每个 token 的声明文件、层、可见性策略、
消费方，以及 4 个 profile 下的解析值）。

```text
tokens:                 591
  primitives:           169
  semantics:             77
  component-tokens:     345
public override:        331（catalogue 中标记 public 的组件 token）
internal:                14（control-* 尺度）
unreferenced:           128（声明但当前无 var() 消费方——Phase 3 的输入）
public graph files:       4（index.css ← primitives/semantics/components.css）
catalogue groups:        18
prototype archive:       7 个文件（src/components/*.css），声明 0 个 token
by namespace:           button 85, tag 90, box 59, input 38, control 14, switch 12,
                        avatar 8, badge 7, spinner 5, status 5, menu 4, progress 4,
                        icon 3, divider 3, checkbox 2, link 2, radio 2, textarea 2,
                        + primitives/semantics 命名空间（azure/neutral/error/surface/text…）
```

`oldTokenNames`（591 条）与 `oldPaths`（4 个公共图文件 + 7 个归档文件）是 Phase 4 映射表的“旧”半边。

## 3. 门禁基线

```text
test:                PASS — Test Files 26 passed (26) / Tests 597 passed (597)
audit:tokens:        PASS — 原型 64/64；包 110/110；registered divergences 10；
                            architecture: 591 declared token(s) across 4 reachable file(s), 18 catalogue group(s)；
                            unreachable 0, undeclared 0, duplicates 0, cross-file slots 0, layer violations 0
audit:docs:          PASS — 4 component(s), 23 prop(s), 10 slot(s), 2 emit(s), 129 example tag(s)
audit:i18n:          PASS — 1 key / 2 pack / 15 source file(s) 无硬编码文案
audit:docs:i18n:     PASS — 24 page pair(s), 90 links, 18 anchors 对构建产物校验
verify:dist:         PASS — bilingual 48 page(s)（24 in /en/）；sitemap 48 URL；
                            prerender 逐 locale 正确；字体 19 个本地化；0 外部资源加载
verify:treeshaking:  PASS — locale 90B；四个入口均在 BUDGET 内
verify:visual:       PASS — 双语/RTL/长文案/主题矩阵/焦点环；9 张截图写入 tests/visual/
verify:tarball:      PASS — 三包安装、locale 子路径、vue-i18n adapter、真实 IME
verify:all:          PASS（上述全部串跑，退出码 0）
```

## 4. 产物与资源

```text
apps/docs dist style.css:        172371 bytes
packages/vue/dist/style.css:      40037 bytes
packages/vue/dist/components/button/style.css: 17588 bytes
packages/vue/dist/components/input/style.css:  11876 bytes
packages/tokens/src 合计:         72759 bytes / 12 个 CSS 文件
字体（docs dist assets）:         19 个（本地化，无外部 CDN）
视觉截图:                         tests/visual/*.png 共 9 张（button×4、input×3、dark×2 等）
```

## 5. Phase 2 的比对方式

Phase 2 完成后，用同一命令重新生成 inventory，并断言：

1. `tokens.length` 与 `counts.byLayer` 不变；
2. 每个 token 在 4 个 profile 下的 `resolved` 值逐字不变（脚本比对 inventory.json，不做人工核对）；
3. `reachableFromEntry` 全为 true，`layer` 只出现 primitives/semantics/components；
4. 门禁数字不变（除 `public graph files` 数量，因为文件被拆分）；
5. `oldPaths` 中的每个文件在新布局下都有唯一归属。

Phase 4 的比对：`oldTokenNames` 中的每个名字在源码与构建产物中都不再出现，且每个新名字都能解析。

## 5b. Phase 2 进行记录 — 组件 Token 与原型归档（已完成）

执行：`tools/split-component-tokens.mjs`（一次性 codemod，Phase 2 全部完成后删除）。

```text
布局：packages/tokens/src/
  index.css                     唯一的层声明与公共入口
  primitives.css                169 token（待 Phase 2 剩余部分拆分）
  semantics.css                  77 token（同上）
  component-tokens/_index.css    + 18 个按命名空间拆分的文件（345 token，18 个 catalogue 组）
  implementations.css            原型选择器入口（opt-in）
  prototype/*.css                7 个原型实现文件（原 src/components/*.css）
  exports：删除 ./components.css 与 ./src/*，新增 ./component-tokens/*.css
```

前后 diff（`inventory-phase0.json` ↔ `inventory.json`）：

```text
tokens 591 → 591          新增名 0        丢失名 0
resolved 差异 0（4 个 profile × 591 token 逐字比对）
层分布不变：primitives 169 / semantics 77 / components 345
公共图文件 4 → 22（预期：拆分）
catalogue：18 组，分布在 18 个文件；inventory policy 331 public / 14 internal 不变
```

门禁（全部实跑通过）：

```text
test:          PASS — 26 files / 600 tests
audit:tokens:  PASS — architecture: 591 token / 22 可达文件 / 18 目录组；
                       unreachable 0, undeclared 0, duplicates 0, layer violations 0
verify:all:    PASS — 8 个门禁全绿（含 tarball 对新导出 ./component-tokens/*.css 的解析）
```

随之更新的测试（都是路径假设，不是断言削弱）：`css-tokens`（层入口改为发现式 + 接受扁平/嵌套两种布局）、
`token-source`（源文件发现式 + 原型对比覆盖全部 sheet）、`token-audit`（分歧登记值改为在
`component-tokens/` 聚合查找）、`verify-tarball`（消费方 specifier 与路径）。

## 5c. Phase 2 完成记录（全部三层已拆分）

```text
布局：packages/tokens/src/
  index.css                       层声明 + 三个目录入口（layer() 只在入口）
  primitives/_index.css           color, typography, space, shape, motion, effects, control
  semantics/_index.css            surface, text, border, feedback, action, accent,
                                  interaction, elevation, scrim
  component-tokens/_index.css     18 个命名空间文件（catalogue 随 Token 分布）
  implementations.css             → prototype/*.css（7 个原型实现文件）
  exports：`./index.css`、`./implementations.css`、`./component-tokens/*.css`、`./assets/*`
```

最终前后 diff（`inventory-phase0.json` ↔ `inventory.json`）：

```text
tokens 591 → 591      新增名 0      丢失名 0
4 profile × 591 token 解析值差异 0
层分布：primitives 169→181，semantics 77→79，components 345→331（control 几何上移、两个 accent 角色语义化）
catalogue 18 → 17 组；公共图文件 4 → 37
门禁：test PASS（600）；audit:tokens PASS；verify:all PASS（含 fonts 19 emitted、tarball 消费新 exports）
```

过程中被门禁抓到的三个真实缺陷（均已修）：

1. `primitives/_index.css` 漏掉 `control.css` → 14 个名字丢失、122 处未解析（inventory diff 报出）；
2. 块末尾声明缺分号，拆分后被下一个 chunk 吞进值里 → 6 处值差异（resolver 报出，生成器改为统一补分号）；
3. 字体路径替换只匹配双引号，源码用单引号 → 构建产物残留 `../assets/`（`verify:dist` 报出）。

两个一次性 codemod 已按各自文件头写明的删除条件删除。

## 6. 风险登记（Phase 0 出的已知项）

| 风险 | 影响 | 处理 |
| --- | --- | --- |
| 并行 Tag 工作流同时修改 `packages/tokens/src/components.css` 与 `packages/vue/src/components/tag/` | 迁移与改名会与其冲突 | 每阶段开始前重跑 inventory 与门禁；改名（Phase 4）与 Tag 工作流冻结顺序必须协调 |
| 字体相对路径依赖目录深度（`../assets/`） | 拆分到 `primitives/` 后路径变化，字体静默失效 | Phase 2 修正后用 `verify:dist` 的字体计数 + 浏览器 `document.fonts` 复验 |
| `unreferenced` 128 个 token | 可能是 Phase 3 的候选，也可能是迁移遗漏 | Phase 3 前逐个判定，不为目录完整性保留 |
| 原型归档（7 文件）没有视觉门禁 | 移动路径后选择器范围可能变化 | Phase 2 只改路径不改规则，并用 implementations 入口渲染对比 |
| `src/*` 通配 exports | 会把内部目录变成事实公共 API | Phase 5 删除，Phase 0 已记录旧入口清单 |

## 5d. 隔离对比：改动前后两个提交

<!-- BEGIN ISOLATED TOKEN DIFF (generated by tools/baseline-diff.mjs) -->

### 隔离对比：改动前后两个提交的 Token 解析值

由 `node tools/baseline-diff.mjs --before <checkout>/packages/tokens/src` 生成：
把改动前的提交检出到独立 worktree，用**同一个解析器**读两侧的 Token 表，逐 profile 比较解析值。
它只读 CSS，不需要安装依赖，因此可以在旧的 package.json 上运行。

- 改动前入口：`.git\yue-before\packages\tokens\src\index.css`（13 个 CSS 文件）
- 改动后入口：`packages\tokens\src\index.css`（45 个 CSS 文件）
- 参与比较的 `profile × token`：1182
- 新增名字：140；消失名字：0；解析值变化：43

| 变化 | profile × token | 改动前 | 改动后 |
| --- | --- | --- | --- |
| 新增 | `dark/azure --tag-border-radius-round` | — | 999px |
| 新增 | `dark/azure --tag-close-icon-size` | — | 12px |
| 新增 | `dark/azure --tag-danger-filled-background` | — | #f5aaa3 |
| 新增 | `dark/azure --tag-danger-filled-border-color` | — | transparent |
| 新增 | `dark/azure --tag-danger-filled-color` | — | #fee8e6 |
| 新增 | `dark/azure --tag-danger-outline-background` | — | transparent |
| 新增 | `dark/azure --tag-danger-outline-border-color` | — | #7c322c |
| 新增 | `dark/azure --tag-danger-outline-color` | — | #f5aaa3 |
| 新增 | `dark/azure --tag-danger-tint-background` | — | #391512 |
| 新增 | `dark/azure --tag-danger-tint-border-color` | — | transparent |
| 新增 | `dark/azure --tag-danger-tint-color` | — | #fee8e6 |
| 新增 | `dark/azure --tag-danger-tint-outline-background` | — | #391512 |
| 新增 | `dark/azure --tag-danger-tint-outline-border-color` | — | #7c322c |
| 新增 | `dark/azure --tag-danger-tint-outline-color` | — | #fee8e6 |
| 新增 | `dark/azure --tag-default-filled-background` | — | #2b2b2b |
| 新增 | `dark/azure --tag-default-filled-border-color` | — | transparent |
| 新增 | `dark/azure --tag-default-filled-color` | — | #f5f5f5 |
| 新增 | `dark/azure --tag-default-outline-background` | — | transparent |
| 新增 | `dark/azure --tag-default-outline-border-color` | — | #383838 |
| 新增 | `dark/azure --tag-default-outline-color` | — | #b8b8b8 |
| 新增 | `dark/azure --tag-default-tint-background` | — | #202020 |
| 新增 | `dark/azure --tag-default-tint-border-color` | — | transparent |
| 新增 | `dark/azure --tag-default-tint-color` | — | #b8b8b8 |
| 新增 | `dark/azure --tag-default-tint-outline-background` | — | #202020 |
| 新增 | `dark/azure --tag-default-tint-outline-border-color` | — | #383838 |
| 新增 | `dark/azure --tag-default-tint-outline-color` | — | #b8b8b8 |
| 新增 | `dark/azure --tag-duration` | — | 100ms |
| 新增 | `dark/azure --tag-ease` | — | cubic-bezier(.2, 0, .38, .9) |
| 新增 | `dark/azure --tag-focus-ring-color` | — | #93c1ff |
| 新增 | `dark/azure --tag-focus-ring-offset` | — | 2px |
| 新增 | `dark/azure --tag-focus-ring-width` | — | 2px |
| 新增 | `dark/azure --tag-font-weight` | — | 500 |
| 新增 | `dark/azure --tag-line-height` | — | 1 |
| 新增 | `dark/azure --tag-opacity-disabled` | — | .38 |
| 新增 | `dark/azure --tag-primary-filled-background` | — | #1d67c1 |
| 新增 | `dark/azure --tag-primary-filled-border-color` | — | transparent |
| 新增 | `dark/azure --tag-primary-filled-color` | — | #fff |
| 新增 | `dark/azure --tag-primary-outline-background` | — | transparent |
| 新增 | `dark/azure --tag-primary-outline-border-color` | — | #93c1ff |
| 新增 | `dark/azure --tag-primary-outline-color` | — | #93c1ff |
| 值变化 | `dark/azure --button-danger-background-hover` | color-mix(in srgb, #121212 calc(.08*100%), #f5aaa3) | color-mix(in srgb, #121212 calc(.12*100%), #f5aaa3) |
| 值变化 | `dark/azure --button-danger-background-pressed` | color-mix(in srgb, #121212 calc(.10*100%), #f5aaa3) | color-mix(in srgb, #121212 calc(.18*100%), #f5aaa3) |
| 值变化 | `dark/azure --button-default-background-hover` | color-mix(in srgb, #f5f5f5 calc(.08*100%), #2b2b2b) | color-mix(in srgb, #f5f5f5 calc(.12*100%), #2b2b2b) |
| 值变化 | `dark/azure --button-default-background-pressed` | color-mix(in srgb, #f5f5f5 calc(.10*100%), #2b2b2b) | color-mix(in srgb, #f5f5f5 calc(.18*100%), #2b2b2b) |
| 值变化 | `dark/azure --button-ghost-background-hover` | color-mix(in srgb, #f5f5f5 calc(.08*100%), transparent) | color-mix(in srgb, #f5f5f5 calc(.12*100%), transparent) |
| 值变化 | `dark/azure --button-ghost-background-pressed` | color-mix(in srgb, #f5f5f5 calc(.10*100%), transparent) | color-mix(in srgb, #f5f5f5 calc(.18*100%), transparent) |
| 值变化 | `dark/azure --button-primary-background-hover` | color-mix(in srgb, #121212 calc(.08*100%), #f5f5f5) | color-mix(in srgb, #121212 calc(.12*100%), #f5f5f5) |
| 值变化 | `dark/azure --button-primary-background-pressed` | color-mix(in srgb, #121212 calc(.10*100%), #f5f5f5) | color-mix(in srgb, #121212 calc(.18*100%), #f5f5f5) |
| 值变化 | `dark/azure --button-secondary-background-hover` | color-mix(in srgb, #f5f5f5 calc(.08*100%), #181818) | color-mix(in srgb, #f5f5f5 calc(.12*100%), #181818) |
| 值变化 | `dark/azure --button-secondary-background-pressed` | color-mix(in srgb, #f5f5f5 calc(.10*100%), #181818) | color-mix(in srgb, #f5f5f5 calc(.18*100%), #181818) |
| 值变化 | `dark/azure --button-selected-background-hover` | color-mix(in srgb, #bed9fe calc(.08*100%), #0f2644) | color-mix(in srgb, #bed9fe calc(.12*100%), #0f2644) |
| 值变化 | `dark/azure --button-selected-background-pressed` | color-mix(in srgb, #bed9fe calc(.10*100%), #0f2644) | color-mix(in srgb, #bed9fe calc(.18*100%), #0f2644) |
| 值变化 | `dark/azure --button-subtle-background-hover` | color-mix(in srgb, currentColor calc(.08*100%), transparent) | color-mix(in srgb, currentColor calc(.12*100%), transparent) |
| 值变化 | `dark/azure --button-subtle-background-pressed` | color-mix(in srgb, currentColor calc(.10*100%), transparent) | color-mix(in srgb, currentColor calc(.18*100%), transparent) |
| 值变化 | `dark/azure --button-success-background-hover` | color-mix(in srgb, #121212 calc(.08*100%), #64ae82) | color-mix(in srgb, #121212 calc(.12*100%), #64ae82) |
| 值变化 | `dark/azure --button-success-background-pressed` | color-mix(in srgb, #121212 calc(.10*100%), #64ae82) | color-mix(in srgb, #121212 calc(.18*100%), #64ae82) |
| 值变化 | `dark/azure --button-warning-background-hover` | color-mix(in srgb, #121212 calc(.08*100%), #f7c44d) | color-mix(in srgb, #121212 calc(.12*100%), #f7c44d) |
| 值变化 | `dark/azure --button-warning-background-pressed` | color-mix(in srgb, #121212 calc(.10*100%), #f7c44d) | color-mix(in srgb, #121212 calc(.18*100%), #f7c44d) |
| 值变化 | `dark/azure --list-row-background-hover` | color-mix(in srgb, #f5f5f5 calc(.08*100%), transparent) | color-mix(in srgb, #f5f5f5 calc(.12*100%), transparent) |
| 值变化 | `dark/azure --menu-item-background-hover` | color-mix(in srgb, #f5f5f5 calc(.08*100%), transparent) | color-mix(in srgb, #f5f5f5 calc(.12*100%), transparent) |
| 值变化 | `dark/azure --opacity-hover` | .08 | .12 |
| 值变化 | `dark/azure --opacity-pressed` | .10 | .18 |
| 值变化 | `dark/azure --tag-background-hover` | color-mix(in srgb, #b8b8b8 calc(.08*100%), #181818) | color-mix(in srgb, #b8b8b8 calc(.12*100%), #181818) |
| 值变化 | `dark/azure --tag-border-radius` | 9999px | calc(8px/2) |
| 值变化 | `dark/azure --tag-font-size-lg` | 16px | 13px |
| 值变化 | `dark/azure --tag-font-size-md` | 14px | 12px |
| 值变化 | `dark/azure --tag-font-size-sm` | 12px | 11px |
| 值变化 | `dark/azure --tag-height-lg` | 40px | 30px |
| 值变化 | `dark/azure --tag-height-md` | 32px | 24px |
| 值变化 | `dark/azure --tag-height-sm` | 28px | 20px |
| 值变化 | `dark/azure --tag-padding-inline-lg` | 16px | 10px |
| 值变化 | `dark/azure --tag-padding-inline-md` | 12px | 8px |
| 值变化 | `dark/azure --tag-padding-inline-sm` | 8px | 6px |
| 值变化 | `light/azure --tag-border-radius` | 9999px | calc(8px/2) |
| 值变化 | `light/azure --tag-font-size-lg` | 16px | 13px |
| 值变化 | `light/azure --tag-font-size-md` | 14px | 12px |
| 值变化 | `light/azure --tag-font-size-sm` | 12px | 11px |
| 值变化 | `light/azure --tag-height-lg` | 40px | 30px |
| 值变化 | `light/azure --tag-height-md` | 32px | 24px |
| 值变化 | `light/azure --tag-height-sm` | 28px | 20px |
| 值变化 | `light/azure --tag-padding-inline-lg` | 16px | 10px |
| 值变化 | `light/azure --tag-padding-inline-md` | 12px | 8px |
| 值变化 | `light/azure --tag-padding-inline-sm` | 8px | 6px |

（表格已截断：新增 140、消失 0、值变化 43）

<!-- END ISOLATED TOKEN DIFF -->

Phase 0 的基线有一个真实弱点：它取自一个**同时含 71 项无关改动**的工作树，因此证明的是"整合后的树能跑"，
不是"Token 迁移本身保值"。现在两个状态都是提交，可以把对比隔离出来：

```text
改动前 2939417（src/ 下 13 个 CSS：index.css ← primitives.css ← semantics.css ← components.css）
改动后 ed1bfb0（src/ 下 45 个 CSS：{primitives,semantics,component-tokens,prototype}/…）
```

方法：把改动前的提交检出到独立 worktree（`.git/yue-before`），用**同一个解析器**读两侧的 Token 表，
逐 profile 比较解析值；改动名按 `PACKAGE_RENAMES` 映射后再比较，因此改名不会表现为「丢失 + 新增」。
该工具只读 CSS、不依赖已安装依赖，所以能在旧的 `package.json` 上运行（`tools/baseline-diff.mjs`）。

结果（下方生成块为原始输出）：

- **消失名字 0** —— 没有任何 Token 在迁移中丢掉；
- **新增名字 140** —— 这些 Token 在改动前的**公共入口图里根本不可达**：旧 `./components.css` 指向的是
  原型实现层入口，组件 Token 因此不在公共链路上。这 140 个名字是「原本声明了但用户拿不到」的部分，
  现在可达——即 `breaking-changes.md` 里那条导出名实背离的修复，在解析层面得到确认；
- **解析值变化 43** —— 其中 20 条是已登记的 10 个 Tag 分歧 × 2 个门禁 profile（高度 28/32/40 → 20/24/30、
  内边距、字号、圆角 9999px → `calc(8px/2)`），其余是 dark 透明度变化及其派生 token。相对**提交** 2939417 它们确实是变化（第一版对比只报出这 20 条，原因见下）；Phase 0 的
  `inventory-phase0.json` 之所以看不到这些差异，是因为那份基线取自含并行改动的工作树（Tag 的紧凑
  尺度当时尚未提交）——这正是本节要修掉的混淆。

### 上一版遗留疑问：已定位为解析器 API 的静默陷阱

第一版隔离对比报告"dark 的 `--opacity-hover` / `--opacity-pressed` 没有出现在值变化里"，并把它列为未解释项。
现已查清，**根因不在 Token，而在解析器的调用方式**：

```text
inventory.json（工具传 profile 对象）：  --opacity-hover → dark/azure .12   ✓
baseline-diff（我传 profile.id 字符串）： 改动前 .08 / 改动后 .08          ✗ 两侧都错
```

解析器从 **profile 对象**上读模式（`{ id, dark }`）；只传 id 字符串时 `dark` 为 `undefined`，
于是**静默按浅色解析**——不报错、不警告，两侧都拿到浅色值，因此那次对比只看得见在浅色下也不同的
20 条 Tag 分歧，而 dark 的透明度变化整体隐形。

处置（两处，都在代码里而不是笔记里）：

1. `tools/lib/css-tokens.mjs`：`names` / `value` / `tryValue` 现在**拒绝字符串 profile**并直接抛错，
   说明"传对象而不是 id；只传 id 会静默按浅色解析"。门禁里的静默错误答案比崩溃更坏。
2. `tools/baseline-diff.mjs`：改为传 profile 对象。

修正后的隔离对比结果（下方生成块为原始输出）：

- **消失 0**；
- **新增 140** —— 改动前公共入口不可达的 Token（旧 `./components.css` 指向原型实现层入口），
  即导出名实背离修复的解析层证据；
- **解析值变化 43** —— 20 条为 10 个 Tag 分歧 × 2 个门禁 profile，其余为 dark 透明度变化本身及其
  派生 token（`--opacity-hover`/`--opacity-pressed` 与从它们 `color-mix` 出来的按钮、列表、菜单悬停/按下底色）。

也就是说：**值变化总数此前被低估，现在已覆盖完整**；而新登记的分歧数量（27 条）与本对比中的 43 条
不是同一口径——前者按"名字"登记，后者按"profile × 名字"计数。
