# 设计哲学

这些原则不是宣言，而是已经写在 Token 源码里的约束。每条都指向仓库中真实存在的代码。

## 1. 分层，而不是堆叠

级联层顺序在 `packages/tokens/src/index.css` 中一次性声明：

```
primitives < semantics < components < implementations < demo
```

- **primitives** — 稳定的标尺与原始色板（`--space-*`、`--neutral-*`、`--azure-*`、字体、动效）
- **semantics** — 主题与交互角色（`--surface`、`--text-primary`、`--border-control`、Accent）
- **components** — 组件几何与视觉契约（`--button-height-md`、`--input-border-color`）
- **implementations** — 具体的组件选择器（`.btn`），发布在 `@yue-ui/vue/style.css`

组件只消费语义与组件角色，不直接读取原始色板。因此换一套 Accent，不需要动任何组件选择器。

## 2. 层级不靠阴影

浅色模式下层级表面都是白色，阴影无法承担表达层级的职责。所以层级由**边框角色**标记：

```css
--surface-level-2-border: var(--border-divider);
--surface-level-3-border: var(--border-default);
```

即使完全禁用阴影，Level 3 依然可与 Level 2 区分。这也是 forced-colors 模式下唯一能存活下来的层级线索。

## 3. 交互状态用透明度，不用新颜色

悬停、按下、拖拽的视觉强度由不透明度标尺加上 `color-mix()` 表达：

```css
--opacity-hover: .08;
--button-ghost-background-hover:
  color-mix(in srgb, var(--button-ghost-color) calc(var(--opacity-hover) * 100%), transparent);
```

好处是状态色永远跟随它所在的底色与前景色，不需要为每个主题、每个 Accent 手写一套状态色。

## 4. 对比度是门禁，不是建议

32 组迁移配对 × 浅色/深色 = 原型 64 项检查（包目标再加上自己新增的 23 组，共 110 项），任何一项低于阈值就让构建失败。这组配对不是重新发明的，而是从原型 HTML 内嵌的审计里原样提取，并由测试反向校验，确保不会在迁移中悄悄漂移。参见 [Token 审计](/tools/)。

## 5. 主题开关是属性，不是分支

主题与 Accent 都通过 `data-*` 属性切换，组件与 JS 都不需要知道当前是哪套配色：

```html
<html data-theme="dark" data-accent="neutral">
```

文档站把 VitePress 的 `html.dark` 映射到这个契约上（见 `.vitepress/theme/useTokenAppearance.ts`），因此文档的深色切换与组件消费的是同一套 Token。

## 6. 图标不进 Token 包

完整的尺寸、插槽、`currentColor` 和无障碍规则见[设计 / 图标](/design/icon)。

Tabler 图标字体只出现在原型里，从未被 `tokens/` 或 `components/*.css` 引用。组件通过插槽接收图标，不绑定任何图标库：

```vue
<YueButton>
  <template #leading><IconSearch /></template>
  搜索
</YueButton>
```

## 7. 组件规则不进层

Token 的层顺序（`primitives < semantics < components < implementations < demo`）解决的是
Token 之间的优先级，所以 Token 值写在层里。

组件规则则相反：无层样式优先于所有层，组件规则一旦放进 `@layer`，宿主的无层重置
（VitePress 的 `button` 重置、Tailwind Preflight、normalize.css）就会赢过它 ——
按钮的填充色会在真实项目里悄悄消失。所以 `@yue-ui/vue/style.css` 是**无层**的，
覆写走重指 Component Token 这条路。
