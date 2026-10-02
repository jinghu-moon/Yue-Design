# 组件

组件按同一套模板逐个落地：组件源码 → 包入口 → 文档页 → 树摇验证 → tarball 消费验证。第一个走完整条链路的是 Button。

## 已实现

| 组件 | 状态 | 文档 |
| --- | --- | --- |
| `YueButton` | 已完成 | [示例](./button) · [API](./button/api) · [指南](./button/guide) |

## 组件文档的三份契约

每个成熟组件分成三页：

- **示例**：可运行的真实组件，验证样式、状态和交互。
- **API**：从 TypeScript 公共类型整理出的 Props、Slots、Events、入口和 Token。
- **指南**：何时使用、如何选择变体、如何组合以及无障碍注意事项。

三页分别服务于试用、开发和设计决策，避免一张长页面同时承担三种阅读任务。

## 为什么先做垂直切片

原型的 HTML 里有按钮、表单、标签、列表、状态、浮层、盒子等一批组件。一次性把它们全部改写成 Vue，会得到一个无法回退的大改动，而且在此之前无法验证「打包后能否被外部项目消费」这件事。

所以顺序是：**先让一个组件走完从组件源码到文档页、到 tarball 消费的完整链路**，再横向复制。

## 每个组件的固定约定

- 类名使用 BEM：`.yue-button`、`.yue-button--primary`、`.yue-button__icon`
- 只消费自己的 Component Token（`--button-*`），不写裸色值，不直接读 primitive Token
- **不使用 `<style scoped>`** —— 样式全局生效，外部才能覆写与主题化
- 组件样式放在 `@layer implementations`，Token 包独占层顺序声明
- 组件 JS 不导入 CSS，样式通过 `@yue-ui/vue/style.css` 或 `@yue-ui/vue/<component>.css` 显式引入
- 根入口只做命名导出，全量注册只在 `@yue-ui/vue/plugin` 里发生

## 这份文档的硬性要求

组件页必须**引用真实的 `@yue-ui/vue` 组件**，而不是手写 HTML 示例。示例代码与页面渲染的必须是同一个组件、同一份样式，否则文档会先于实现漂移。

后续组件（`YueInput`、`YueTag`、`YuePopover`、`YueDialog`）沿用同一模板。其中 `YuePopover`、`YueDialog` 才开始引入 Reka UI。
