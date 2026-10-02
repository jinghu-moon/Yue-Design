# 动效

动效的职责是解释状态变化、建立空间关系和给出进行中的反馈，而不是装饰页面。

## Token

| 用途 | Token |
| --- | --- |
| 快速交互 | `--motion-duration-interaction` |
| 进入 | `--motion-duration-enter` |
| 离开 | `--motion-duration-exit` |
| 标准缓动 | `--motion-ease-standard` |

组件可以继续使用自己的 Component Token（例如 `--button-duration`），但它们应映射到这些语义别名，而不是直接散落 `100ms` 或自定义 cubic-bezier。

## 取舍规则

- 颜色、边界和短距离位移适合快速动效；复杂容器转换才使用更长时长。
- 同一序列只保留一个主运动方向，避免多个元素同时无意义地编排。
- 加载反馈必须在关闭动效后仍然可理解。Button 在 `prefers-reduced-motion: reduce` 下停止旋转，保留静态 spinner 形状。
- 页面切换和可关闭浮层应支持减少动效；不能把动效作为发现功能的唯一线索。
- `forced-colors: active` 下优先保留边界、焦点和文本，不依赖阴影或渐变表达状态。

## 自查

新增动效前问三个问题：它解释了什么变化？没有它是否仍然可用？用户要求减少动效时是否还有等价反馈？如果都无法回答，就不应该添加该动效。
