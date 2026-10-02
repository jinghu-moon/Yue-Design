# 基础

Token 包 `@snapclip/design-tokens` 是纯 CSS，没有构建步骤。它由三个 Token 层与一个实现层组成，共 **451 个唯一 Token 名**（568 条声明，含深色与 Accent 覆写）。

## 分层与规模

| 层 | 文件 | 声明数 | 内容 |
| --- | --- | ---: | --- |
| `primitives` | `src/primitives.css` | 212 | 标尺、字体、动效、原始色板 |
| `semantics` | `src/semantics.css` | 134 | 主题与交互角色、Accent |
| `components` | `src/components.css` | 222 | 组件几何与视觉契约 |
| `implementations` | `src/components/*.css` | — | 原型期组件选择器（`.btn` 等），由 `@snapclip/vue` 逐步接管 |

按 Token 名归类：

| 类别 | 数量 |
| --- | ---: |
| 原始色板（`--neutral-*`、`--azure-*` …） | 68 |
| 组件契约（`--button-*`、`--input-*` …） | 216 |
| 语义角色（`--surface`、`--text-*`、`--border-*` …） | 61 |
| 空间 / 尺寸 / 圆角 / 描边 | 36 |
| 字体 / 字号 / 行高 | 26 |
| 动效 / 不透明度 / 层级 | 18 |
| Accent 角色 | 18 |

## 四种模式

Token 包同时支持四种形态，全部通过 `data-*` 属性或媒体查询切换，不需要 JS 分支：

```html
<html data-theme="dark" data-accent="neutral">
```

- **浅色** — `:root`
- **深色** — `[data-theme=dark]`，同时设置 `color-scheme: dark`
- **Accent** — `[data-accent=neutral]` 覆写整套 `--accent-*`；默认 azure 不需要属性
- **强制颜色** — `forced-colors: active` 下保留层级与状态线索（见 `src/components/box.css`、`overlay.css`）

## 引用方式

```css
/* 应用入口：一次引入全部 Token */
@import '@snapclip/design-tokens/index.css';
```

```js
// 或者交给打包器
import '@snapclip/design-tokens/index.css'
```

包导出了 `index.css`（Token 层）与 `components.css`（实现层）两个入口；层顺序由
`index.css` 声明，因此 **Token 必须先于组件样式加载**。

## 即将补充

- 颜色规范（色板、语义映射、对比度矩阵）
- 排版与间距标尺
- Token 浏览器（直接读取包内 CSS，而不是维护第二份清单）
