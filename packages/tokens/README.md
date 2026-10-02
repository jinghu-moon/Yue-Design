# @snapclip/design-tokens

SnapClip 的设计 Token，纯 CSS 自定义属性。不依赖 Vue，不依赖任何框架，没有构建步骤。

## 安装与引用

```bash
pnpm add @snapclip/design-tokens
```

```js
import '@snapclip/design-tokens/index.css'
```

```css
/* 或者从 CSS 引用 */
@import '@snapclip/design-tokens/index.css';
```

## 两个入口

| 入口 | 文件 | 内容 |
| --- | --- | --- |
| `@snapclip/design-tokens`（即 `./index.css`） | `src/index.css` | 层顺序声明 + `primitives` + `semantics` + `components` 三个 Token 层 |
| `@snapclip/design-tokens/components.css` | `src/components/index.css` | `implementations` 层，原型期的 `.btn` 等选择器 |

**加载顺序是契约的一部分。** `index.css` 声明了

```css
@layer primitives, semantics, components, implementations, demo;
```

所以它必须先于任何组件样式加载。`components.css`（以及 `@snapclip/vue/style.css`）
自身不再声明层顺序，否则可能在 `primitives` 之前创建 `implementations`，
把级联顺序反过来。

## 模式

```html
<html data-theme="dark" data-accent="neutral">
```

| 模式 | 触发方式 |
| --- | --- |
| 浅色 | `:root`（默认） |
| 深色 | `[data-theme=dark]`，同时设置 `color-scheme: dark` |
| Accent | `[data-accent=neutral]`；默认 azure 无需属性 |
| 强制颜色 | `@media (forced-colors: active)` |

## 资源

`assets/` 内含 6 个字体文件（HarmonyOS Sans SC ×4、FiraCode、TCloudNumber），
由 `src/primitives.css` 中的 `@font-face` 通过 `../assets/` 相对路径引用。
包内**不包含**图标字体：组件通过插槽接收图标，不绑定图标库。

> 已知取舍：字体约 17MB，会显著增大包的体积。做发布与 tarball 消费验证时会重新评估
> 是否拆成独立的可选子路径。

## 门禁

```bash
corepack pnpm audit:tokens          # 从仓库根目录
corepack pnpm -C packages/tokens audit   # 或只审计本包
```

32 组对比度配对 × 浅色/深色 = 64 项检查，外加悬空引用与跨目标一致性检查。
详见文档站的「Token 审计」页面。
