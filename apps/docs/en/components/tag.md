<script setup lang="ts">
import { ref } from 'vue'
import { YueTag, YueCheckTag } from '@yue-ui/vue'
import PreviewFrame from '../../.vitepress/theme/components/PreviewFrame.vue'

const basicCode = `<YueTag>Default tag</YueTag>`

const themeCode = `<YueTag theme="default">Default</YueTag>
<YueTag theme="primary">Primary</YueTag>
<YueTag theme="success">Success</YueTag>
<YueTag theme="warning">Warning</YueTag>
<YueTag theme="danger">Danger</YueTag>`

const variantCode = `<YueTag theme="primary" variant="filled">Filled</YueTag>
<YueTag theme="primary" variant="tint">Tint</YueTag>
<YueTag theme="primary" variant="outline">Outline</YueTag>
<YueTag theme="primary" variant="tint-outline">Tint-Outline</YueTag>`

const matrixCode = `<!-- 5 themes × 4 variants -->
<template v-for="theme in themes" :key="theme">
  <YueTag v-for="variant in variants" :key="variant"
    :theme="theme" :variant="variant">
    {{ theme }}
  </YueTag>
</template>`

const sizeCode = `<YueTag size="sm">Small</YueTag>
<YueTag size="md">Medium</YueTag>
<YueTag size="lg">Large</YueTag>`

const shapeCode = `<YueTag theme="primary" shape="square">Square</YueTag>
<YueTag theme="primary" shape="round">Round</YueTag>`

const closableCode = `<YueTag closable @close="onClose">Closable</YueTag>
<YueTag theme="primary" closable @close="onClose">Primary</YueTag>
<YueTag theme="danger" closable @close="onClose">Danger</YueTag>`

const disabledCode = `<YueTag disabled>Disabled</YueTag>
<YueTag theme="primary" disabled>Disabled</YueTag>
<YueTag closable disabled>No close</YueTag>`

const clickableCode = `<YueTag tag="button" theme="primary" @click="onFilter">Clickable</YueTag>
<YueTag tag="button" @click="onFilter">Default</YueTag>
<YueTag tag="button" theme="success" @click="onFilter">Success</YueTag>`

const maxWidthCode = `<YueTag :max-width="80">This is a very long tag label</YueTag>
<YueTag theme="primary" :max-width="120">This label gets truncated at max-width</YueTag>`

const colorCode = `<YueTag color="#7c3aed">Custom purple</YueTag>
<YueTag color="#0ea5e9" variant="tint">Sky tint</YueTag>
<YueTag color="#f59e0b" variant="outline">Amber outline</YueTag>
<YueTag color="#10b981" variant="tint-outline">Green tint-outline</YueTag>`

const checkTagCode = `<YueCheckTag v-model="selected1">Vue</YueCheckTag>
<YueCheckTag v-model="selected2">React</YueCheckTag>
<YueCheckTag v-model="selected3" disabled>Angular (disabled)</YueCheckTag>`

const iconCode = `<YueTag theme="primary">
  <template #icon><IconTag :size="12" /></template>
  With icon
</YueTag>`

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

# Tag

Tags are used for labelling, categorizing, or representing status. Supports themes, variants, sizes, close buttons, and custom colors. `YueCheckTag` is the selectable variant for multi-select filter scenarios.

Full API at [API reference](./tag/api). Design decisions at [Guide](./tag/guide).

## Basic

<PreviewFrame title="Basic" :code="basicCode">
  <YueTag>Default tag</YueTag>
</PreviewFrame>

## Theme

<PreviewFrame title="Theme" :code="themeCode" surface-class="demo-row">
  <YueTag theme="default">Default</YueTag>
  <YueTag theme="primary">Primary</YueTag>
  <YueTag theme="success">Success</YueTag>
  <YueTag theme="warning">Warning</YueTag>
  <YueTag theme="danger">Danger</YueTag>
</PreviewFrame>

## Variant

<PreviewFrame title="Variants (primary theme)" :code="variantCode" surface-class="demo-row">
  <YueTag theme="primary" variant="filled">Filled</YueTag>
  <YueTag theme="primary" variant="tint">Tint</YueTag>
  <YueTag theme="primary" variant="outline">Outline</YueTag>
  <YueTag theme="primary" variant="tint-outline">Tint-Outline</YueTag>
</PreviewFrame>

## Theme × Variant matrix

<PreviewFrame title="5 themes × 4 variants" :code="matrixCode" surface-class="demo-matrix">
  <template v-for="theme in themes" :key="theme">
    <div class="demo-matrix__row">
      <YueTag v-for="variant in variants" :key="variant" :theme="theme" :variant="variant">
        {{ theme }}
      </YueTag>
    </div>
  </template>
</PreviewFrame>

## Size

<PreviewFrame title="Size" :code="sizeCode" surface-class="demo-row demo-row--align-center">
  <YueTag size="sm">Small</YueTag>
  <YueTag size="md">Medium</YueTag>
  <YueTag size="lg">Large</YueTag>
</PreviewFrame>

## Shape

<PreviewFrame title="Shape" :code="shapeCode" surface-class="demo-row">
  <YueTag theme="primary" shape="square">Square</YueTag>
  <YueTag theme="primary" shape="round">Round</YueTag>
</PreviewFrame>

## Closable

<PreviewFrame title="Closable" :code="closableCode" surface-class="demo-row">
  <template v-if="!closedTags.has('default')">
    <YueTag closable @close="onClose('default')">Closable</YueTag>
  </template>
  <template v-if="!closedTags.has('primary')">
    <YueTag theme="primary" closable @close="onClose('primary')">Primary</YueTag>
  </template>
  <template v-if="!closedTags.has('danger')">
    <YueTag theme="danger" closable @close="onClose('danger')">Danger</YueTag>
  </template>
  <button v-if="closedTags.size" class="demo-reset-btn" @click="resetClosed">Reset</button>
</PreviewFrame>

## Disabled

<PreviewFrame title="Disabled" :code="disabledCode" surface-class="demo-row">
  <YueTag disabled>Disabled</YueTag>
  <YueTag theme="primary" disabled>Disabled</YueTag>
  <YueTag closable disabled>No close</YueTag>
</PreviewFrame>

## Clickable (tag="button")

Use `tag="button"` to give a tag full keyboard and pointer interaction semantics. The `@click` listener works on any tag, but `<button>` is the right element when a tag triggers an action.

<PreviewFrame title='Clickable' :code="clickableCode" surface-class="demo-row">
  <YueTag tag="button" theme="primary">Clickable</YueTag>
  <YueTag tag="button">Default</YueTag>
  <YueTag tag="button" theme="success">Success</YueTag>
</PreviewFrame>

## Max-width truncation

<PreviewFrame title="Max-width truncation" :code="maxWidthCode" surface-class="demo-row demo-row--align-center">
  <YueTag :max-width="80">This is a very long tag label</YueTag>
  <YueTag theme="primary" :max-width="120">This label gets truncated at max-width</YueTag>
</PreviewFrame>

## Icon slot

<PreviewFrame title="Icon" :code="iconCode" surface-class="demo-row">
  <YueTag theme="primary">With icon</YueTag>
</PreviewFrame>

## Custom color

Pass any valid CSS color. The component derives text and background from the luminance of the value.

<PreviewFrame title="Custom color" :code="colorCode" surface-class="demo-row">
  <YueTag color="#7c3aed">Custom purple</YueTag>
  <YueTag color="#0ea5e9" variant="tint">Sky tint</YueTag>
  <YueTag color="#f59e0b" variant="outline">Amber outline</YueTag>
  <YueTag color="#10b981" variant="tint-outline">Green tint-outline</YueTag>
</PreviewFrame>

## CheckTag

`YueCheckTag` is a `role="checkbox"` element with `v-model` controlled and `defaultChecked` uncontrolled modes.

<PreviewFrame title="CheckTag basic" :code="checkTagCode" surface-class="demo-row">
  <YueCheckTag v-model="selected1">Vue</YueCheckTag>
  <YueCheckTag v-model="selected2">React</YueCheckTag>
  <YueCheckTag v-model="selected3" disabled>Angular (disabled)</YueCheckTag>
</PreviewFrame>

## CheckTag filter group

<PreviewFrame title="Multi-select filter" :code="checkTagGroupCode" surface-class="demo-row">
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
