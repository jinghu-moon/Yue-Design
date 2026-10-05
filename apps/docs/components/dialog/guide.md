# YueDialog 指南

## 什么时候使用

当用户必须在继续之前完成或确认一件事时使用 Dialog：删除确认、必填表单、无法跳过的设置。Dialog 会阻塞页面其余内容，因此每个页面同时只应有一个真正需要回答的对话框。

如果只是靠近触发元素的补充内容，请使用 `YuePopover`；如果是一组菜单项，请使用未来的 `YueMenu`。

## 受控状态与关闭渠道

推荐用 `v-model` 由父级掌握 open 状态。关闭渠道固定为三条：显式按钮、Escape、点击遮罩；`danger` 变体默认关闭后两条，必须通过按钮回答。任何关闭都会先经过 `beforeClose(reason)` 守卫，返回 `false` 或 reject 可中止。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { YueDialog } from '@yue-ui/vue/dialog'

const open = ref(false)
async function guard(reason) {
  if (reason === 'scrim') return confirm('尚未保存，确定离开？')
  return true
}
</script>

<YueDialog v-model="open" title="编辑资料" :before-close="guard">
  <p>表单内容放在默认插槽里。</p>
</YueDialog>
```

## 焦点、层级与滚动

打开时焦点落在对话框容器，Tab 在卡片内环回，背景按模态链设置 `inert`——同级 teleport 浮层不会被误屏蔽。关闭时仅在键盘或程序触发的情况下回焦。遮罩与卡片位于 `--layer-modal`，高于 transient 浮层 ramp。背景滚动通过 `overflow: clip` 加 `scrollbar-gutter: stable` 锁定，避免布局跳动。

## 表面与动效

`surface="modal"` 是居中卡片，`surface="fullscreen"` 适合移动端整屏流程。进入动画从触发器中心飞入到视口中心（位移向量按视口比例钳制）；没有 trigger 时原地生长。具体时长与曲线是原型阶段确定的值，机制（每阶段单一时长源 + 真实 `transitionend`）已冻结。

## 模态性与非模态

`surface` 只决定形状（居中卡片或整屏），不决定模态性——`modal` 与 `fullscreen` 都是模态。需要让背景保持可交互时（如可持续操作的查找替换、侧边确认），置 `modeless`：此时不加 `aria-modal`、不 inert 背景、不锁滚动、不 trap 焦点，Esc 与遮罩的关闭渠道仍按 `variant` 与 `closeOn*` 生效。

## 忙态与异步关闭

`beforeClose` 返回一个 pending Promise 时，组件自动进入忙态：确认按钮显示 spinner 并禁用，Esc 与遮罩关闭被屏蔽，避免用户在守卫未落定前重复触发。也可用 `loading` 由外部强制这一状态（例如提交请求尚在飞行中）。忙态解除后关闭流程继续按守卫结果进行。

## 动作裁剪与部件定制

`showConfirm`/`showCancel` 控制内置按钮是否渲染，两者皆 `false` 时整个 footer 消失，得到无动作区或单动作对话框。`close-icon` 插槽替换右上角图标而不改动关闭按钮本体与其 accessible name。`classNames`/`styles` 按结构部件（`overlay`/`scrim`/`panel`/`header`/`body`/`footer`/`close`）分别合并，用于在不覆盖内置类的前提下微调单个部件。`lazy` 让内容推迟到首次打开才实例化，之后跨关闭保持挂载，适合正文昂贵的对话框。

## 内置文案与 i18n

确认、取消、关闭图标这三处内建文案来自 `dialog.confirm`、`dialog.cancel`、`dialog.closeLabel` 三个 locale 键，随语言包切换。需要自定义文案时用 `confirmText`/`cancelText`，或用 `footer` 插槽完全接管动作区（此时不渲染任何内建文案）。

## 实现取舍

参考 Vuetify 的 overlay/stack/focusTrap 分层、Ant Design 的标题 `useId` 绑定与 mask/panel 动画分离、TDesign 的 DOM 五层职责划分；拒绝把模态语义下沉进共享 hooks——teleport、栈、回焦、滚动锁属于 `packages/hooks` 的无语义 overlay 底座，而 focus trap、`inert`、`aria-modal` 只由 Dialog 消费，不回流 Popover。
