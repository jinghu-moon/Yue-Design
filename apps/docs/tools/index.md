# Token 审计

`tools/audit-tokens.mjs` 是 Token 包的门禁。它是零依赖的 Node 实现，不依赖浏览器、PostCSS 或任何构建工具——因为它必须在任何工具链变动下都还能跑。

```bash
corepack pnpm audit:tokens
```

## 它检查四件事

1. **对比度** — 迁移自原型的 32 组前景/背景配对，浅色/深色各一遍（原型目标 **64 项**）；
   包目标在这些之上还跑自己新增的 23 组（**110 项**）。任何一项低于阈值即失败（正文 4.5:1，边界与焦点环 3:1）。
2. **可解析性** — 每个 Token 在每个模式下都必须解析成功。悬空引用、循环引用、无法建模的选择器或 `!important` 都会直接报错，而不是被跳过。
3. **一致性** — 当审计多个目标时，所有目标在每个模式下必须解析出完全相同的结果；与原型**有意的分歧**必须逐条登记在 `PACKAGE_DIVERGENCES` 里（当前 10 条，全部是 Tag 的紧凑尺度与方角），未登记的分歧失败，登记了却不再分歧也失败。
4. **架构** — 可达性（声明在公共入口取不到的文件里就失败）、解析（`@yue-ui/vue` 里每个 `var()` 都必须有人声明）、唯一性（同一 token 不能在两个文件里各声明一次）、层方向（`semantics` 不得依赖 `components`）、导出诚实（`./component-tokens/*.css` 必须是 token，`./implementations.css` 必须只是选择器，且不得导出内部源码树）与目录完整（每个声明文件顶部的 `@yue-token-catalogue` 必须覆盖自己文件里的每个 token）。

## 为什么审计器要自己实现 CSS 解析

原型的审计跑在浏览器里，用 `getComputedStyle` 读取计算值。迁移到 Node 后，最容易出错的地方是把浏览器的行为简化掉：

- **层顺序优先于具体度**。`@layer` 的顺序排在 specificity 之前，一个低具体度的后置层声明会覆盖高具体度的前置层声明。
- **未分层的声明优先于所有层**。审计器按真实的 CSS 规则给未分层声明最高的层序号。
- **`color-mix()` 需要预乘与 alpha 缩放**，`color-mix(in srgb, #1f1f1f 8%, transparent)` 必须得到「颜色不变、alpha 为 0.08」，否则叠在底色上算出来的对比度会完全失真。
- **透明度需要逐层合成**。幽灵按钮悬停这类配对是「半透明前景叠在基础表面上」，必须先合成再算对比度。
- **亮度阈值沿用原型的遗留分支**（`0.03928 / 12.92`）。差异远小于一档对比度，但「迁移后审计仍然通过」只有在两边算法一致时才是可验证的说法。

遇到无法建模的构造时，审计器**直接失败**，而不是忽略。这正是它能被当作门禁的原因：没有 Token 能悄悄逃出这套级联模型。

## 输出示例

```text
Yue Design · Token Audit
──────────────────────────────────────────────────────────────────────────────
contract: 32 migrated pairs (+23 package-only) × 2 profiles
gating profiles: light/azure, dark/azure

▌ prototype — design-tokens-generic-v4/tokens/index.css
  files: index.css ← primitives/_index.css ← semantics/_index.css ← component-tokens/_index.css
  layers: primitives < semantics < components < implementations < demo
  tokens: light/azure 451, dark/azure 451 (declared 451)
  ...
  → 64/64 PASS (32 pairs × 2 profiles)

▌ parity prototype ↔ package
  profiles probed: light/azure, dark/azure, light/neutral, dark/neutral
  resolutions compared: 1804
  differences: 0
  registered divergences: 10
  → SUPERSET + REGISTERED DIVERGENCES — no drift, no loss

▌ architecture (reachability, resolution, one declaration site, layer direction)
  architecture: 646 declared token(s) across 40 reachable file(s), 19 catalogue group(s) in 19 file(s)
  unreachable 0, undeclared 0, duplicates 0, cross-file slots 0, layer violations 0

RESULT: PASS
```

## 这组配对从哪来

`tools/token-audit.pairs.mjs` 里的 32 组配对是从 `design-tokens-generic-v4.html`
内嵌的 `const pairs` 逐字转录的。测试会重新从该 HTML 中提取这组数组并与模块比对，
所以它不可能悄悄漂移；文档与门禁也共享同一份定义。

## Accent 模式为什么只做诊断

原型从未采样 `[data-accent=neutral]` 模式，因此把 neutral 也设为门禁，会让一次
「忠实的迁移」因为原型本身没检查过的东西而失败。审计会报告 neutral 的结果
（当前原型 64/64、包 110/110），但不让它决定退出码。

## 即将补充

- 对比度审计页：直接读取 Token 包并按模式渲染完整矩阵
- Token 浏览器：列出每个 Token 在四种模式下的解析值
- Accent 切换与浅色/深色切换控件
