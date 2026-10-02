# 布局

布局规范负责容器边界、间距和响应式行为；组件只负责自身尺寸，不应该知道页面列数或业务断点。

## Token

| 用途 | Token |
| --- | --- |
| 文本容器 | `--container-text` |
| 页面容器 | `--container-page` |
| 页面左右内边距 | `--layout-page-gutter` / `--layout-page-gutter-lg` |
| 栅格列数 | `--layout-grid-columns` |
| 栅格间距 | `--layout-grid-gap` |
| 断点 | `--breakpoint-sm`、`--breakpoint-md`、`--breakpoint-lg`、`--breakpoint-xl` |

## 规则

1. 页面内容使用最大宽度容器，长文本不要铺满宽屏。
2. 小屏优先使用流式布局和换行，不能依赖横向滚动承载主要内容。
3. 栅格用于页面编排，不应让组件内部出现与页面耦合的媒体查询。
4. 间距优先从 `--space-*` 和 `--gap-*` 选择；只有无法表达的特殊几何才增加新 Token。
5. 触控目标和按钮高度由组件 Token 保证，页面布局不能用负 margin 抵消它们。

## 响应式检查

文档视觉门禁在 `390px` 宽度检查 `scrollWidth === clientWidth`。新增页面或组件必须同时检查窄屏、宽屏和内容变长的情况。
