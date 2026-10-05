# YuePopover 弹出层

`YuePopover` 是一个非模态 detached 浮层，用于在触发元素附近展示可交互内容。它处理定位、碰撞翻转、Teleport、outside/Escape 关闭、嵌套层级和焦点恢复；菜单导航、模态对话框和 tooltip 专用策略由专用组件负责。

<script setup lang="ts">
import { ref } from 'vue'
import { YueButton, YuePopover } from '@yue-ui/vue'
import PreviewFrame from '../.vitepress/theme/components/PreviewFrame.vue'

const open = ref(false)
const filterOpen = ref(false)
const manualOpen = ref(false)
const manualAnchor = ref<HTMLElement | null>(null)
const lastCloseReason = ref('尚未关闭')
function recordClose(payload: { reason: string }) {
  lastCloseReason.value = payload.reason
}

const basicCode = `<YuePopover v-model="open">
  <template #trigger="{ props }">
    <YueButton v-bind="props">打开 Popover</YueButton>
  </template>
  <div>这里可以放置表单、按钮或其他交互内容。</div>
</YuePopover>`

const placementCode = `<YuePopover v-model="filterOpen" placement="bottom-start">
  <template #trigger="{ props }">
    <YueButton v-bind="props" variant="outline">筛选</YueButton>
  </template>
  <div class="popover-panel">
    <strong>筛选条件</strong>
    <label><input type="checkbox" checked /> 只显示进行中</label>
    <label><input type="checkbox" /> 包含已归档</label>
  </div>
</YuePopover>`

const triggerCode = `<YuePopover trigger="hover" role="tooltip" placement="top">
  <template #trigger="{ props }">
    <YueButton v-bind="props" variant="text">悬停查看说明</YueButton>
  </template>
  <span>Popover 可以承载可交互内容；纯说明也可以使用 tooltip。</span>
</YuePopover>

<YuePopover trigger="focus" role="tooltip">
  <template #trigger="{ props }">
    <YueButton v-bind="props" variant="text">聚焦查看说明</YueButton>
  </template>
  <span>焦点离开 trigger 或 content 后关闭。</span>
</YuePopover>`

const manualCode = `<button ref="manualAnchor" type="button">外部锚点</button>
<YuePopover
  v-model="manualOpen"
  trigger="manual"
  :anchor="manualAnchor"
  placement="right"
>
  <div>没有 trigger 插槽时，用 anchor 指定定位参照物。</div>
</YuePopover>
<YueButton variant="outline" @click="manualOpen = !manualOpen">
  {{ manualOpen ? '关闭' : '打开' }}
</YueButton>`

const closeCode = `<YuePopover
  close-on-content-click
  @close="recordClose"
>
  <template #trigger="{ props }">
    <YueButton v-bind="props">点击内容后关闭</YueButton>
  </template>
  <button type="button">完成并关闭</button>
</YuePopover>
<span>最近一次关闭：{{ lastCloseReason }}</span>`
</script>

<PreviewFrame title="基础交互" description="真实 Teleport 浮层：点击 trigger 打开，Escape 或外部点击关闭。" :code="basicCode">
  <YuePopover v-model="open" data-popover-root aria-label="示例弹出层">
    <template #trigger="{ props }">
      <YueButton v-bind="props" data-popover-trigger>打开 Popover</YueButton>
    </template>
    <div aria-label="示例内容" data-popover-content>这里可以放置表单、按钮或其他交互内容。</div>
  </YuePopover>
</PreviewFrame>

## 定位与交互内容

Popover 只负责把内容放到锚点附近。`placement` 是首选位置，空间不足时会自动 flip/shift；内容里的表单控件仍然是调用方的真实控件。

<PreviewFrame title="筛选面板" description="bottom-start 适合从按钮边缘对齐的面板；点击面板内部默认不会关闭。" :code="placementCode" surface-class="preview-frame__surface--stack">
  <YuePopover v-model="filterOpen" placement="bottom-start" data-popover-placement="bottom-start" aria-label="筛选面板">
    <template #trigger="{ props }">
      <YueButton v-bind="props" variant="outline">筛选</YueButton>
    </template>
    <div class="popover-panel">
      <strong>筛选条件</strong>
      <label><input type="checkbox" checked /> 只显示进行中</label>
      <label><input type="checkbox" /> 包含已归档</label>
    </div>
  </YuePopover>
</PreviewFrame>

## Trigger 模式

`click` 适合稳定的操作面板；`hover` 与 `focus` 适合短说明。两者都通过同一个 trigger 插槽传递属性，不会把事件偷偷附加到错误的元素。

<PreviewFrame title="hover 与 focus" description="tooltip 语义只改变 ARIA 关系，不会凭空增加菜单或对话框行为。" :code="triggerCode">
  <YuePopover trigger="hover" role="tooltip" placement="top" data-popover-hover>
    <template #trigger="{ props }">
      <YueButton v-bind="props" variant="text">悬停查看说明</YueButton>
    </template>
    <span>Popover 可以承载可交互内容；纯说明也可以使用 tooltip。</span>
  </YuePopover>

  <YuePopover trigger="focus" role="tooltip" data-popover-focus>
    <template #trigger="{ props }">
      <YueButton v-bind="props" variant="text">聚焦查看说明</YueButton>
    </template>
    <span>焦点离开 trigger 或 content 后关闭。</span>
  </YuePopover>
</PreviewFrame>

## 外部锚点与手动控制

没有 trigger 插槽时，`anchor` 提供定位参照物；`trigger="manual"` 表示组件不安装自动打开/关闭事件，状态完全由调用方掌握。

<PreviewFrame title="manual + anchor" description="锚点可以是原生元素；浮层仍然使用同一套碰撞和 Teleport 逻辑。" :code="manualCode" surface-class="preview-frame__surface--stack">
  <button ref="manualAnchor" type="button">外部锚点</button>
  <YuePopover v-model="manualOpen" trigger="manual" :anchor="manualAnchor" placement="right" data-popover-manual aria-label="外部锚点内容">
    <div>没有 trigger 插槽时，用 anchor 指定定位参照物。</div>
  </YuePopover>
  <YueButton variant="outline" @click="manualOpen = !manualOpen">
    {{ manualOpen ? '关闭' : '打开' }}
  </YueButton>
</PreviewFrame>

## 关闭策略与事件

`close-on-content-click` 用于完成按钮、选择后关闭等短流程；`close` 事件会给出 `trigger`、`outside`、`escape` 或 `programmatic` 原因。

<PreviewFrame title="点击内容后关闭" description="事件载荷可以让消费方记录或决定下一步动作。" :code="closeCode" surface-class="preview-frame__surface--stack">
  <YuePopover close-on-content-click @close="recordClose" data-popover-close>
    <template #trigger="{ props }">
      <YueButton v-bind="props">点击内容后关闭</YueButton>
    </template>
    <button type="button">完成并关闭</button>
  </YuePopover>
  <span>最近一次关闭：{{ lastCloseReason }}</span>
</PreviewFrame>

## 典型用法

```vue
<YuePopover placement="bottom-start">
  <template #trigger="{ props }">
    <YueButton v-bind="props">筛选</YueButton>
  </template>
  <FilterPanel />
</YuePopover>
```

组件会在可用空间不足时自动翻转和吸附；滚动、resize 与内容尺寸变化会自动重新定位。

详见 [API](./popover/api) 和 [指南](./popover/guide)。
