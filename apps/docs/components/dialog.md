# YueDialog 对话框

`YueDialog` 是一个阻塞式的模态表面，用于在继续之前要求用户完成或确认一件事。它处理焦点陷阱、按模态链计算的背景 `inert`、滚动锁定、`aria-modal`、条件回焦、Esc 顶层仲裁与关闭守卫；菜单、tooltip 和非模态浮层由专用组件负责。

<script setup lang="ts">
import { ref } from 'vue'
import { YueButton, YueDialog } from '@yue-ui/vue'
import PreviewFrame from '../.vitepress/theme/components/PreviewFrame.vue'

const basicOpen = ref(false)
const dangerOpen = ref(false)
const scrollOpen = ref(false)
const guardOpen = ref(false)
const lastReason = ref('尚未关闭')
function recordClose(payload: { reason: string }) {
  lastReason.value = payload.reason
}
async function guard(reason: string) {
  return reason !== 'scrim'
}

const basicCode = `<YueButton @click="basicOpen = true">打开对话框</YueButton>
<YueDialog v-model="basicOpen" title="退出登录" description="确定要退出当前账号吗？" @close="recordClose">
  <p>这是一段正文内容，确认与取消按钮由组件内建。</p>
</YueDialog>`

const dangerCode = `<YueButton @click="dangerOpen = true" variant="outline">删除项目</YueButton>
<YueDialog v-model="dangerOpen" title="删除项目" variant="danger" confirm-text="删除">
  <p>危险操作会提升为 alertdialog，并默认禁用 Esc 与遮罩关闭。</p>
</YueDialog>`

const scrollCode = `<YueDialog v-model="scrollOpen" title="服务条款" :scrollable="true">
  <div class="long-body">超长正文只让 body 滚动，header 与 footer 固定。</div>
</YueDialog>`

const guardCode = `<YueDialog v-model="guardOpen" title="尚未保存" :before-close="guard">
  <p>before-close 返回 false 或 reject 会中止关闭。</p>
</YueDialog>`
</script>

<PreviewFrame title="基础确认" description="真实模态：Tab 在卡片内环回，背景 inert，Esc 或遮罩关闭并回报原因。" :code="basicCode" surface-class="preview-frame__surface--stack">
  <YueButton @click="basicOpen = true" data-dialog-basic-open>打开对话框</YueButton>
  <YueDialog v-model="basicOpen" title="退出登录" description="确定要退出当前账号吗？" @close="recordClose" data-dialog-basic>
    <p>这是一段正文内容，确认与取消按钮由组件内建。</p>
  </YueDialog>
  <span>最近一次关闭：{{ lastReason }}</span>
</PreviewFrame>

## 危险确认

`variant="danger"` 把 role 提升为 `alertdialog`，并默认关闭 Esc 与遮罩两条渠道，用户必须通过按钮回答。

<PreviewFrame title="删除确认" description="危险变体只允许按钮关闭，确认文案可通过 confirm-text 覆盖 locale 键。" :code="dangerCode" surface-class="preview-frame__surface--stack">
  <YueButton @click="dangerOpen = true" variant="outline" data-dialog-danger-open>删除项目</YueButton>
  <YueDialog v-model="dangerOpen" title="删除项目" variant="danger" confirm-text="删除" data-dialog-danger>
    <p>危险操作会提升为 alertdialog，并默认禁用 Esc 与遮罩关闭。</p>
  </YueDialog>
</PreviewFrame>

## 长内容滚动

`scrollable` 固定 header 与 footer，仅正文滚动；省略时整张卡片滚动。

<PreviewFrame title="条款正文" description="滚动归属由 scrollable 切换，背景滚动始终被锁死且不产生布局跳动。" :code="scrollCode" surface-class="preview-frame__surface--stack">
  <YueButton @click="scrollOpen = true" data-dialog-scroll-open>查看条款</YueButton>
  <YueDialog v-model="scrollOpen" title="服务条款" :scrollable="true" data-dialog-scroll>
    <p v-for="n in 8" :key="n">第 {{ n }} 条：这里是一段较长的条款正文，用来验证只有 body 区域滚动。</p>
  </YueDialog>
</PreviewFrame>

## 关闭守卫

任何关闭都先经过 `before-close(reason)`，返回 `false` 或一个 reject 的 Promise 会中止关闭，受控状态保持不变。

<PreviewFrame title="拦截遮罩关闭" description="守卫按 reason 决策：这里拒绝 scrim 关闭，其他渠道放行。" :code="guardCode" surface-class="preview-frame__surface--stack">
  <YueButton @click="guardOpen = true" data-dialog-guard-open>编辑资料</YueButton>
  <YueDialog v-model="guardOpen" title="尚未保存" :before-close="guard" data-dialog-guard>
    <p>点击遮罩不会关闭，因为守卫拒绝了 scrim 原因。</p>
  </YueDialog>
</PreviewFrame>

## 典型用法

```vue
<YueDialog v-model="open" title="Title" variant="danger" @confirm="remove">
  <p>Body content goes in the default slot.</p>
</YueDialog>
```

组件默认 Teleport 到 `body`，可用 `teleport` 指定其他目标或设为 `false` 保持原位；入场动画从 `trigger` 中心飞入到视口中心（无 `trigger` 时原地生长）。

详见 [API](./dialog/api) 和 [指南](./dialog/guide)。
