# 基础

Token 包 `@yue-ui/design-tokens` 是纯 CSS，没有构建步骤。它由三个 Token 层与一个实现层组成，共 **638 个唯一 Token 名**。

## 分层与规模

| 层 | 文件 | 声明数 | 内容 |
| --- | --- | ---: | --- |
| `primitives` | `src/primitives/*.css` | 186 | 标尺、字体、动效、原始色板与控制尺度 |
| `semantics` | `src/semantics/*.css` | 83 | 主题与交互角色、Accent |
| `components` | `src/component-tokens/*.css` | 377 | 组件几何与视觉契约，按组件命名空间拆分 |
| `implementations` | `src/prototype/*.css`（经 `src/implementations.css`） | — | 原型期组件选择器（`.btn` 等），可选入口，由 `@yue-ui/vue` 逐步接管 |

按 Token 名的首段（命名空间）归类，合计 638：

| 类别 | 数量 |
| --- | ---: |
| 原始色板（`--neutral-*`、`--azure-*` …） | 68 |
| 组件契约（`--button-*`、`--input-*` …） | 380 |
| 语义角色（`--surface`、`--text-*`、`--action-*` …） | 56 |
| 空间 / 尺寸 / 圆角 / 描边（`--space-*`、`--border-*` …） | 69 |
| 字体 / 字号 / 行高 | 26 |
| 动效 / 不透明度 / 层级 | 23 |
| Accent 角色 | 16 |

命名空间口径与上面的分层口径不同：组件契约按名字统计，其中 `--list-row-*`（3 个）声明在 `semantics` 层，因此这里是 380 而不是 377。

## 四种模式

Token 包同时支持四种形态，全部通过 `data-*` 属性或媒体查询切换，不需要 JS 分支：

```html
<html data-theme="dark" data-accent="neutral">
```

- **浅色** — `:root`
- **深色** — `[data-theme=dark]`，同时设置 `color-scheme: dark`
- **Accent** — `[data-accent=neutral]` 覆写整套 `--accent-*`；默认 azure 不需要属性
- **强制颜色** — `forced-colors: active` 下保留层级与状态线索（见 `src/component-tokens/box.css`、`src/prototype/overlay.css`）

## 引用方式

```css
/* 应用入口：一次引入全部 Token */
@import '@yue-ui/design-tokens/index.css';
```

```js
// 或者交给打包器
import '@yue-ui/design-tokens/index.css'
```

包导出了三个入口：`index.css`（层顺序 + 三个 Token 层，**唯一需要安装的入口**）、
`component-tokens/*.css`（只有 Component Token 声明，已被 `index.css` 包含）、以及可选的
`implementations.css`（原型期选择器归档，不被 `index.css` 引用）。层顺序由 `index.css` 声明，
因此 **Token 必须先于组件样式加载**。

Component Token 只有一处声明（`src/component-tokens/`，每个命名空间一个文件），由 `corepack pnpm audit:tokens` 的架构检查
强制：声明在不可达文件里、引用未声明的 token、同名 token 声明两次、语义层反向依赖组件层，
四类问题都会让审计失败。

## 设计规范

颜色、深色模式、排版、图标、布局和动效原则见[设计规范](/design/)。本页只负责
Token 层级、加载顺序和 CSS API；设计决策不在这里维护第二份版本。

## 即将补充

- Token 浏览器（直接读取包内 CSS，而不是维护第二份清单）
