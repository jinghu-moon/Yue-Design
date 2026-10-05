# Token 使用情况报告

> 前提：**Token 集是设计语言，覆盖必然宽于组件当前用量**。下面的数字是"未被其他文件引用"的清单，
> 不是待清理的债务；报表的作用是让每一个这样的 Token 都**有可解释的存在理由**。

生成方式：`node tools/token-usage-report.mjs`。总数 116，全部可解释（需要动作的：0）。

| 存在理由 | 数量 | 含义 |
| --- | --- | --- |
| `same-file-composition` | 16 | 只在声明它的文件内部被引用（语义角色由本文件的色阶组合而成）——计数口径排除自文件引用，实际上有消费者 |
| `prototype-contract` | 90 | 冻结原型声明同名 Token，parity 门禁固定住它 |
| `consumer-facing` | 10 | 面向消费者的公共原语，已在文档中说明（断点/布局/动效时长等，其中部分结构上无法被 CSS `var()` 读取） |
| `scale-step` | 0 | 闭合刻度中的一个档位：刻度本身就是契约，不按当前用量裁剪 |
| `interface-without-reader` | 0 | **唯一需要动作的一类**：组件层公共覆盖点，既没有读取方也没有文档 |

## prototype-contract（90）

| Token | 层 | 命名空间 | 声明位置 | 同文件引用 |
| --- | --- | --- | --- | --- |
| `--accent-400` | semantics | accent | `packages/tokens/src/semantics/accent.css` | — |
| `--accent-50` | semantics | accent | `packages/tokens/src/semantics/accent.css` | — |
| `--accent-500` | semantics | accent | `packages/tokens/src/semantics/accent.css` | — |
| `--accent-900` | semantics | accent | `packages/tokens/src/semantics/accent.css` | — |
| `--amber-200` | primitives | amber | `packages/tokens/src/primitives/color.css` | — |
| `--amber-400` | primitives | amber | `packages/tokens/src/primitives/color.css` | — |
| `--amber-50` | primitives | amber | `packages/tokens/src/primitives/color.css` | — |
| `--amber-500` | primitives | amber | `packages/tokens/src/primitives/color.css` | — |
| `--badge-background` | components | badge | `packages/tokens/src/component-tokens/badge.css` | — |
| `--badge-border-radius` | components | badge | `packages/tokens/src/component-tokens/badge.css` | — |
| `--badge-color` | components | badge | `packages/tokens/src/component-tokens/badge.css` | — |
| `--badge-font-size` | components | badge | `packages/tokens/src/component-tokens/badge.css` | — |
| `--badge-foreground` | components | badge | `packages/tokens/src/component-tokens/badge.css` | — |
| `--badge-height` | components | badge | `packages/tokens/src/component-tokens/badge.css` | — |
| `--badge-padding-inline` | components | badge | `packages/tokens/src/component-tokens/badge.css` | — |
| `--blue-200` | primitives | blue | `packages/tokens/src/primitives/color.css` | — |
| `--blue-400` | primitives | blue | `packages/tokens/src/primitives/color.css` | — |
| `--blue-50` | primitives | blue | `packages/tokens/src/primitives/color.css` | — |
| `--blue-500` | primitives | blue | `packages/tokens/src/primitives/color.css` | — |
| `--blue-700` | primitives | blue | `packages/tokens/src/primitives/color.css` | — |
| `--border-3` | primitives | border | `packages/tokens/src/primitives/shape.css` | — |
| `--border-4` | primitives | border | `packages/tokens/src/primitives/shape.css` | — |
| `--border-5` | primitives | border | `packages/tokens/src/primitives/shape.css` | — |
| `--box-background-panel` | components | box | `packages/tokens/src/component-tokens/box.css` | — |
| `--box-background-toast` | components | box | `packages/tokens/src/component-tokens/box.css` | — |
| `--box-border-color-panel` | components | box | `packages/tokens/src/component-tokens/box.css` | — |
| `--box-border-radius-panel` | components | box | `packages/tokens/src/component-tokens/box.css` | — |
| `--box-border-radius-toast` | components | box | `packages/tokens/src/component-tokens/box.css` | — |
| `--box-border-width-panel` | components | box | `packages/tokens/src/component-tokens/box.css` | — |
| `--box-color-panel` | components | box | `packages/tokens/src/component-tokens/box.css` | — |
| `--box-color-toast` | components | box | `packages/tokens/src/component-tokens/box.css` | — |
| `--box-padding-block-toast` | components | box | `packages/tokens/src/component-tokens/box.css` | — |
| `--box-padding-inline-toast` | components | box | `packages/tokens/src/component-tokens/box.css` | — |
| `--box-shadow-panel` | components | box | `packages/tokens/src/component-tokens/box.css` | — |
| `--box-shadow-toast` | components | box | `packages/tokens/src/component-tokens/box.css` | — |
| `--button-selected-marker-color` | components | button | `packages/tokens/src/component-tokens/button.css` | — |
| `--button-selected-marker-width` | components | button | `packages/tokens/src/component-tokens/button.css` | — |
| `--container-page` | primitives | container | `packages/tokens/src/primitives/space.css` | — |
| `--container-text` | primitives | container | `packages/tokens/src/primitives/space.css` | — |
| `--ease-enter` | primitives | ease | `packages/tokens/src/primitives/motion.css` | — |
| `--ease-exit` | primitives | ease | `packages/tokens/src/primitives/motion.css` | — |
| `--elevation-panel` | semantics | elevation | `packages/tokens/src/semantics/elevation.css` | — |
| `--font-number` | primitives | font | `packages/tokens/src/primitives/typography.css` | — |
| `--font-size-2xl` | primitives | font | `packages/tokens/src/primitives/typography.css` | — |
| `--font-size-display` | primitives | font | `packages/tokens/src/primitives/typography.css` | — |
| `--gap-page-section` | primitives | gap | `packages/tokens/src/primitives/space.css` | — |
| `--gap-section` | primitives | gap | `packages/tokens/src/primitives/space.css` | — |
| `--green-50` | primitives | green | `packages/tokens/src/primitives/color.css` | — |
| `--green-500` | primitives | green | `packages/tokens/src/primitives/color.css` | — |
| `--green-600` | primitives | green | `packages/tokens/src/primitives/color.css` | — |
| `--green-950` | primitives | green | `packages/tokens/src/primitives/color.css` | — |
| `--icon-size-lg` | components | icon | `packages/tokens/src/component-tokens/icon.css` | — |
| `--icon-size-md` | components | icon | `packages/tokens/src/component-tokens/icon.css` | — |
| `--icon-size-sm` | components | icon | `packages/tokens/src/component-tokens/icon.css` | — |
| `--info` | semantics | info | `packages/tokens/src/semantics/feedback.css` | — |
| `--layer-base` | primitives | layer | `packages/tokens/src/primitives/effects.css` | — |
| `--layer-sticky` | primitives | layer | `packages/tokens/src/primitives/effects.css` | — |
| `--layer-toast` | primitives | layer | `packages/tokens/src/primitives/effects.css` | — |
| `--leading-normal` | primitives | leading | `packages/tokens/src/primitives/typography.css` | — |
| `--leading-relaxed` | primitives | leading | `packages/tokens/src/primitives/typography.css` | — |
| `--leading-tight` | primitives | leading | `packages/tokens/src/primitives/typography.css` | — |
| `--line-height-2xl` | primitives | line | `packages/tokens/src/primitives/typography.css` | — |
| `--line-height-3xl` | primitives | line | `packages/tokens/src/primitives/typography.css` | — |
| `--line-height-display` | primitives | line | `packages/tokens/src/primitives/typography.css` | — |
| `--line-height-lg` | primitives | line | `packages/tokens/src/primitives/typography.css` | — |
| `--line-height-sm` | primitives | line | `packages/tokens/src/primitives/typography.css` | — |
| `--line-height-xl` | primitives | line | `packages/tokens/src/primitives/typography.css` | — |
| `--neutral-1000` | primitives | neutral | `packages/tokens/src/primitives/color.css` | — |
| `--neutral-400` | primitives | neutral | `packages/tokens/src/primitives/color.css` | — |
| `--neutral-500` | primitives | neutral | `packages/tokens/src/primitives/color.css` | — |
| `--opacity-dragged` | primitives | opacity | `packages/tokens/src/primitives/effects.css` | — |
| `--opacity-focus` | primitives | opacity | `packages/tokens/src/primitives/effects.css` | — |
| `--radius-none` | primitives | radius | `packages/tokens/src/primitives/shape.css` | — |
| `--radius-xl` | primitives | radius | `packages/tokens/src/primitives/shape.css` | — |
| `--radius-xs` | primitives | radius | `packages/tokens/src/primitives/shape.css` | — |
| `--red-200` | primitives | red | `packages/tokens/src/primitives/color.css` | — |
| `--red-400` | primitives | red | `packages/tokens/src/primitives/color.css` | — |
| `--red-50` | primitives | red | `packages/tokens/src/primitives/color.css` | — |
| `--red-500` | primitives | red | `packages/tokens/src/primitives/color.css` | — |
| `--size-48` | primitives | size | `packages/tokens/src/primitives/space.css` | — |
| `--space-48` | primitives | space | `packages/tokens/src/primitives/space.css` | — |
| `--tag-background-hover` | components | tag | `packages/tokens/src/component-tokens/tag.css` | — |
| `--tag-background-selected` | components | tag | `packages/tokens/src/component-tokens/tag.css` | — |
| `--tag-border-color` | components | tag | `packages/tokens/src/component-tokens/tag.css` | — |
| `--tag-border-color-selected` | components | tag | `packages/tokens/src/component-tokens/tag.css` | — |
| `--tag-color-selected` | components | tag | `packages/tokens/src/component-tokens/tag.css` | — |
| `--tracking-normal` | primitives | tracking | `packages/tokens/src/primitives/typography.css` | — |
| `--tracking-wide` | primitives | tracking | `packages/tokens/src/primitives/typography.css` | — |
| `--weight-display` | primitives | weight | `packages/tokens/src/primitives/typography.css` | — |
| `--weight-regular` | primitives | weight | `packages/tokens/src/primitives/typography.css` | — |

## same-file-composition（16）

| Token | 层 | 命名空间 | 声明位置 | 同文件引用 |
| --- | --- | --- | --- | --- |
| `--accent-100` | semantics | accent | `packages/tokens/src/semantics/accent.css` | `D:/100_Projects/110_Daily/Yue-Design-System/packages/tokens/src/semantics/accent.css` |
| `--accent-200` | semantics | accent | `packages/tokens/src/semantics/accent.css` | `D:/100_Projects/110_Daily/Yue-Design-System/packages/tokens/src/semantics/accent.css` |
| `--accent-300` | semantics | accent | `packages/tokens/src/semantics/accent.css` | `D:/100_Projects/110_Daily/Yue-Design-System/packages/tokens/src/semantics/accent.css` |
| `--accent-600` | semantics | accent | `packages/tokens/src/semantics/accent.css` | `D:/100_Projects/110_Daily/Yue-Design-System/packages/tokens/src/semantics/accent.css`<br>`D:/100_Projects/110_Daily/Yue-Design-System/tests/token-usage.test.mjs` |
| `--accent-700` | semantics | accent | `packages/tokens/src/semantics/accent.css` | `D:/100_Projects/110_Daily/Yue-Design-System/packages/tokens/src/semantics/accent.css` |
| `--accent-800` | semantics | accent | `packages/tokens/src/semantics/accent.css` | `D:/100_Projects/110_Daily/Yue-Design-System/packages/tokens/src/semantics/accent.css` |
| `--accent-950` | semantics | accent | `packages/tokens/src/semantics/accent.css` | `D:/100_Projects/110_Daily/Yue-Design-System/packages/tokens/src/semantics/accent.css` |
| `--duration-100` | primitives | duration | `packages/tokens/src/primitives/motion.css` | `D:/100_Projects/110_Daily/Yue-Design-System/packages/tokens/src/primitives/motion.css` |
| `--duration-200` | primitives | duration | `packages/tokens/src/primitives/motion.css` | `D:/100_Projects/110_Daily/Yue-Design-System/packages/tokens/src/primitives/motion.css` |
| `--duration-300` | primitives | duration | `packages/tokens/src/primitives/motion.css` | `D:/100_Projects/110_Daily/Yue-Design-System/packages/tokens/src/primitives/motion.css` |
| `--radius-base` | primitives | radius | `packages/tokens/src/primitives/shape.css` | `D:/100_Projects/110_Daily/Yue-Design-System/packages/tokens/src/primitives/shape.css` |
| `--shadow-2` | semantics | shadow | `packages/tokens/src/semantics/elevation.css` | `D:/100_Projects/110_Daily/Yue-Design-System/packages/tokens/src/semantics/elevation.css` |
| `--shadow-3` | semantics | shadow | `packages/tokens/src/semantics/elevation.css` | `D:/100_Projects/110_Daily/Yue-Design-System/packages/tokens/src/semantics/elevation.css` |
| `--space-32` | primitives | space | `packages/tokens/src/primitives/space.css` | `D:/100_Projects/110_Daily/Yue-Design-System/packages/tokens/src/primitives/space.css` |
| `--tag-background` | components | tag | `packages/tokens/src/component-tokens/tag.css` | `D:/100_Projects/110_Daily/Yue-Design-System/packages/tokens/src/component-tokens/tag.css` |
| `--tag-color` | components | tag | `packages/tokens/src/component-tokens/tag.css` | `D:/100_Projects/110_Daily/Yue-Design-System/packages/tokens/src/component-tokens/tag.css` |

## consumer-facing（10）

| Token | 层 | 命名空间 | 声明位置 | 同文件引用 |
| --- | --- | --- | --- | --- |
| `--breakpoint-lg` | primitives | breakpoint | `packages/tokens/src/primitives/space.css` | — |
| `--breakpoint-md` | primitives | breakpoint | `packages/tokens/src/primitives/space.css` | — |
| `--breakpoint-sm` | primitives | breakpoint | `packages/tokens/src/primitives/space.css` | — |
| `--breakpoint-xl` | primitives | breakpoint | `packages/tokens/src/primitives/space.css` | — |
| `--duration-350` | primitives | duration | `packages/tokens/src/primitives/motion.css` | — |
| `--duration-400` | primitives | duration | `packages/tokens/src/primitives/motion.css` | — |
| `--layout-grid-columns` | primitives | layout | `packages/tokens/src/primitives/space.css` | — |
| `--layout-grid-gap` | primitives | layout | `packages/tokens/src/primitives/space.css` | — |
| `--layout-page-gutter` | primitives | layout | `packages/tokens/src/primitives/space.css` | — |
| `--layout-page-gutter-lg` | primitives | layout | `packages/tokens/src/primitives/space.css` | — |

