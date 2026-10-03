<script setup lang="ts">
import { ref } from 'vue'
import { YueTag, YueCheckTag } from '@yue-ui/vue'
import PreviewFrame from '../.vitepress/theme/components/PreviewFrame.vue'

const basicCode = `<YueTag>默认标签</YueTag>`

const themeCode = `<YueTag theme="default">默认</YueTag>
<YueTag theme="primary">主要</YueTag>
<YueTag theme="success">成功</YueTag>
<YueTag theme="warning">警告</YueTag>
<YueTag theme="danger">危险</YueTag>`

const variantCode = `<YueTag theme="primary" variant="filled">Filled</YueTag>
<YueTag theme="primary" variant="tint">Tint</YueTag>
<YueTag theme="primary" variant="outline">Outline</YueTag>
<YueTag theme="primary" variant="tint-outline">Tint-Outline</YueTag>`

const matrixCode = `<!-- 5 个主题 × 4 个变体 -->
<template v-for="theme in themes" :key="theme">
  <YueTag v-for="variant in variants" :key="variant"
    :theme="theme" :variant="variant">
    {{ theme }}
  </YueTag>
</template>`

const sizeCode = `<YueTag size="sm">小</YueTag>
<YueTag size="md">中</YueTag>
<YueTag size="lg">大</YueTag>`

const shapeCode = `<YueTag theme="primary" shape="square">方形</YueTag>
<YueTag theme="primary" shape="round">圆形</YueTag>`

const closableCode = `<YueTag closable @close="onClose">可关闭</YueTag>
<YueTag theme="primary" closable @close="onClose">主要</YueTag>
<YueTag theme="danger" closable @close="onClose">危险</YueTag>`

const disabledCode = `<YueTag disabled>禁用</YueTag>
<YueTag theme="primary" disabled>禁用</YueTag>
<YueTag closable disabled>不可关闭</YueTag>`

const clickableCode = `<YueTag tag="button" theme="primary" @click="onFilter">可点击</YueTag>
<YueTag tag="button" @click="onFilter">默认</YueTag>
<YueTag tag="button" theme="success" @click="onFilter">成功</YueTag>`

const maxWidthCode = `<YueTag :max-width="80">这是一段很长的标签文本</YueTag>
<YueTag theme="primary" :max-width="120">这是一段很长的标签文本会被截断</YueTag>`

const iconCode = `<YueTag theme="primary">
  <template #icon><IconTag :size="12" /></template>
  带图标
</YueTag>`

const colorCode = `<YueTag color="#7c3aed">自定义紫色</YueTag>
<YueTag color="#0ea5e9" variant="tint">天蓝 Tint</YueTag>
<YueTag color="#f59e0b" variant="outline">琥珀 Outline</YueTag>
<YueTag color="#10b981" variant="tint-outline">绿 Tint-Outline</YueTag>`

const checkTagCode = `<YueCheckTag v-model="selected1">Vue</YueCheckTag>
<YueCheckTag v-model="selected2">React</YueCheckTag>
<YueCheckTag v-model="selected3" disabled>Angular（禁用）</YueCheckTag>`

const checkTagGroupCode = `<YueCheckTag
  v-for="tag in tags"
  :key="tag.value"
  v-model="tag.checked"
  @change="onTagChange"
>{{ tag.label }}</YueCheckTag>`

const themes = ['default', 'primary', 'success', 'warning', 'danger'] as const
const variants = ['filled', 'tint', 'outline', 'tint-outline'] as const

const closedTags = ref<Set<string>>(new Set())
function onClose(tag: string) {
  closedTags.value = new Set([...closedTags.value, tag])
}
function resetClosed() {
  closedTags.value = new Set()
}

const selected1 = ref(false)
const selected2 = ref(true)
const selected3 = ref(false)

const checkTags = ref([
  { value: 'vue', label: 'Vue', checked: true },
  { value: 'react', label: 'React', checked: false },
  { value: 'svelte', label: 'Svelte', checked: false },
  { value: 'solid', label: 'Solid', checked: false },
])
</script>

# Tag 标签

标签用于标注、分类，或表示状态。支持主题色、变体、尺寸、关闭和自定义颜色；`YueCheckTag` 是可选中的标签，适合多选筛选场景。

完整 API 见 [API 文档](./tag/api)；设计决策见[指南](./tag/guide)。

## 基础示例

<PreviewFrame title="基础" :code="basicCode">
  <YueTag>默认标签</YueTag>
</PreviewFrame>

## 主题

<PreviewFrame title="主题" :code="themeCode" surface-class="demo-row">
  <YueTag theme="default">默认</YueTag>
  <YueTag theme="primary">主要</YueTag>
  <YueTag theme="success">成功</YueTag>
  <YueTag theme="warning">警告</YueTag>
  <YueTag theme="danger">危险</YueTag>
</PreviewFrame>

## 变体

<PreviewFrame title="变体（以 primary 为例）" :code="variantCode" surface-class="demo-row">
  <YueTag theme="primary" variant="filled">Filled</YueTag>
  <YueTag theme="primary" variant="tint">Tint</YueTag>
  <YueTag theme="primary" variant="outline">Outline</YueTag>
  <YueTag theme="primary" variant="tint-outline">Tint-Outline</YueTag>
</PreviewFrame>

## 主题 × 变体矩阵

<PreviewFrame title="5 主题 × 4 变体" :code="matrixCode" surface-class="demo-matrix">
  <template v-for="theme in themes" :key="theme">
    <div class="demo-matrix__row">
      <YueTag v-for="variant in variants" :key="variant" :theme="theme" :variant="variant">
        {{ theme }}
      </YueTag>
    </div>
  </template>
</PreviewFrame>

## 尺寸

<PreviewFrame title="尺寸" :code="sizeCode" surface-class="demo-row demo-row--align-center">
  <YueTag size="sm">小</YueTag>
  <YueTag size="md">中</YueTag>
  <YueTag size="lg">大</YueTag>
</PreviewFrame>

## 形状

<PreviewFrame title="形状" :code="shapeCode" surface-class="demo-row">
  <YueTag theme="primary" shape="square">方形</YueTag>
  <YueTag theme="primary" shape="round">圆形</YueTag>
</PreviewFrame>

## 可关闭

<PreviewFrame title="可关闭" :code="closableCode" surface-class="demo-row">
  <template v-if="!closedTags.has('default')">
    <YueTag closable @close="onClose('default')">可关闭</YueTag>
  </template>
  <template v-if="!closedTags.has('primary')">
    <YueTag theme="primary" closable @close="onClose('primary')">主要</YueTag>
  </template>
  <template v-if="!closedTags.has('danger')">
    <YueTag theme="danger" closable @close="onClose('danger')">危险</YueTag>
  </template>
  <button v-if="closedTags.size" class="demo-reset-btn" @click="resetClosed">重置</button>
</PreviewFrame>

## 禁用

<PreviewFrame title="禁用" :code="disabledCode" surface-class="demo-row">
  <YueTag disabled>禁用</YueTag>
  <YueTag theme="primary" disabled>禁用</YueTag>
  <YueTag closable disabled>不可关闭</YueTag>
</PreviewFrame>

## 可点击（tag="button"）

使用 `tag="button"` 赋予标签完整的键盘和指针交互语义。监听 `@click` 在任何标签上都能生效，但当标签触发动作时，`<button>` 才是语义正确的根元素。

<PreviewFrame title="可点击" :code="clickableCode" surface-class="demo-row">
  <YueTag tag="button" theme="primary">可点击</YueTag>
  <YueTag tag="button">默认</YueTag>
  <YueTag tag="button" theme="success">成功</YueTag>
</PreviewFrame>

## 最大宽度截断

<PreviewFrame title="最大宽度截断" :code="maxWidthCode" surface-class="demo-row demo-row--align-center">
  <YueTag :max-width="80">这是一段很长的标签文本</YueTag>
  <YueTag theme="primary" :max-width="120">这是一段很长的标签文本会被截断</YueTag>
</PreviewFrame>

## 图标插槽

<PreviewFrame title="图标" :code="iconCode" surface-class="demo-row">
  <YueTag theme="primary">带图标</YueTag>
</PreviewFrame>

## 自定义颜色

传入任意合法 CSS 颜色值，组件根据亮度自动推导文字色和背景色。

<PreviewFrame title="自定义颜色" :code="colorCode" surface-class="demo-row">
  <YueTag color="#7c3aed">自定义紫色</YueTag>
  <YueTag color="#0ea5e9" variant="tint">天蓝 Tint</YueTag>
  <YueTag color="#f59e0b" variant="outline">琥珀 Outline</YueTag>
  <YueTag color="#10b981" variant="tint-outline">绿 Tint-Outline</YueTag>
</PreviewFrame>

## CheckTag 可选中标签

`YueCheckTag` 是 `role="checkbox"` 标签，支持 `v-model` 控制模式和 `defaultChecked` 非受控模式。

<PreviewFrame title="CheckTag 基础" :code="checkTagCode" surface-class="demo-row">
  <YueCheckTag v-model="selected1">Vue</YueCheckTag>
  <YueCheckTag v-model="selected2">React</YueCheckTag>
  <YueCheckTag v-model="selected3" disabled>Angular（禁用）</YueCheckTag>
</PreviewFrame>

## CheckTag 多选筛选组

<PreviewFrame title="多选筛选" :code="checkTagGroupCode" surface-class="demo-row">
  <YueCheckTag
    v-for="tag in checkTags"
    :key="tag.value"
    v-model="tag.checked"
  >{{ tag.label }}</YueCheckTag>
</PreviewFrame>

<style>
.demo-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
}
.demo-row--align-center {
  align-items: center;
}
.demo-matrix {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
}
.demo-matrix__row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.demo-reset-btn {
  padding: 2px 8px;
  font-size: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}
.demo-reset-btn:hover {
  background: var(--vp-c-bg-soft);
}
</style>

## 选中态与主题

未选中时是中性 chip；选中后使用 `theme` 指定的配色（默认 `primary`）。下面四个是真实渲染的标签，用于验证选中配色随主题变化、hover 只强调已有背景。

<span class="yue-tag yue-tag--md yue-tag--check is-checked yue-tag--primary" data-probe="check-theme">primary</span>
<span class="yue-tag yue-tag--md yue-tag--check is-checked yue-tag--success" data-probe="check-theme">success</span>
<span class="yue-tag yue-tag--md yue-tag--check is-checked yue-tag--warning" data-probe="check-theme">warning</span>
<span class="yue-tag yue-tag--md yue-tag--check is-checked yue-tag--danger" data-probe="check-theme">danger</span>

### 填充变体的主题（可交互）

同一组配色的常规填充标签，用于验证每个主题的底色与文字在浅色和深色下都达到 4.5:1。

<span class="yue-tag yue-tag--md yue-tag--primary" data-probe="filled-theme">primary</span>
<span class="yue-tag yue-tag--md yue-tag--success" data-probe="filled-theme">success</span>
<span class="yue-tag yue-tag--md yue-tag--warning" data-probe="filled-theme">warning</span>
<span class="yue-tag yue-tag--md yue-tag--danger" data-probe="filled-theme">danger</span>
