# Vue contracts in Yue

## SFC and public API

- Use `<script setup lang="ts">` and `defineOptions({ name, inheritAttrs: false })` when
  attribute routing needs control.
- Define Props, Emits and Slots from the public contract. `defineExpose` exposes only stable
  methods such as `focus` or `blur`, never internal refs or state.
- Use `modelValue` for the primary value and named models only for independent values. Emits carry
  the new value first; native events are forwarded unchanged unless the docs state a synthesis.
- Prefer slots for consumer-owned content and icons instead of string or icon-name props.

## Fallthrough attributes

`id`, `name`, `aria-*`, form attributes and keyboard attributes must land on the actual semantic
control. `class`, `style` and `data-*` may belong to the visual root when that is the documented
contract. Test both positive routing and the absence of the attribute on the wrong node.

```vue
<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })
const attrs = useAttrs()
</script>

<template>
  <div :class="attrs.class">
    <input v-bind="{ ...attrs, class: undefined }" />
  </div>
</template>
```

Do not copy this shape blindly: define which attributes belong to root and control before coding.

## Emits and listeners

Declare every event in `defineEmits`. An undeclared `@input` can fall through to the inner
control while the component also emits its own event, causing duplicate consumer callbacks. For
IME or synthesized events, test event `type`, `target`, value and ordering in a real browser.

Official reference: [Vue fallthrough attributes](https://vuejs.org/guide/components/attrs),
[Vue events](https://vuejs.org/guide/components/events).
