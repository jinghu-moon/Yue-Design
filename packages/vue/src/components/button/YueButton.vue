<script setup lang="ts">
import { computed, ref, useAttrs, watchPostEffect } from 'vue'
import { useConfig, useNamespace } from '@yue-ui/hooks'
import type { YueButtonProps } from './types'

defineOptions({
  name: 'YueButton',
  // Fallthrough is handled by hand. Vue's automatic merging appends `$attrs`
  // *after* the component's own bindings, which would let an arbitrary attribute
  // silently overwrite `disabled`, `aria-disabled` or `aria-busy`.
  inheritAttrs: false,
})

const props = withDefaults(defineProps<YueButtonProps>(), {
  theme: 'default',
  variant: 'solid',
  shape: 'square',
  disabled: false,
  loading: false,
  block: false,
  nativeType: 'button',
  tag: 'button',
  // Explicitly `undefined`, which is not the same as leaving it out. Vue's boolean
  // casting turns an absent Boolean prop into `false`, and this prop has to be able to say
  // three things: "pressed", "not pressed", and "this is not a toggle button at all". The
  // declared default is what suppresses the cast.
  active: undefined,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const ns = useNamespace('button')
const config = useConfig()
const attrs = useAttrs()
// Not `ref<HTMLElement>`: `ref` on `<component :is>` yields the element for a
// string tag and the component *instance* for a component tag.
const rootRef = ref<unknown>(null)

/** `size` prop wins; the app-level `YueConfig.size` is the fallback. */
const resolvedSize = computed(() => props.size ?? config.size)

/**
 * A native `<button>` is the only tag that can be disabled by the platform.
 * Everything else — `<a>`, `<div>`, a custom component — has to be told through
 * `aria-disabled` and stopped in the click handler.
 */
const isNativeButton = computed(() => props.tag === 'button')

/**
 * The activation guard: what the click handler refuses.
 *
 * `loading` blocks activation without setting native `disabled`, so a button that is
 * mid-request keeps its focus and does not drop out of the tab order. This is the *only*
 * thing `loading` and `disabled` have in common — the attributes are decided separately, by
 * `isDisabledOffNative` below, precisely so that a state expressed in the handler cannot
 * leak into what the element announces.
 */
const isInactive = computed(() => props.disabled || props.loading)

/**
 * The only state that takes a non-native tag out of the tab order.
 *
 * Deliberately *not* `isInactive`. `loading` means "busy, still reachable" on every tag, and
 * a non-native control has to say the same thing a native `<button>` says: the platform
 * removes a disabled `<button>` from the tab order and focuses past it, so the `<a>` /
 * component path reproduces that with `tabindex="-1"` — and reproduces *only* that. Folding
 * `loading` in here made the two paths disagree: the same `loading` prop announced
 * `aria-disabled="true"` and `tabindex="-1"` on an anchor while the native button announced
 * only `aria-busy`. Activation is refused by the handler in both cases, which is what makes
 * "still focusable" honest rather than optimistic.
 */
const isDisabledOffNative = computed(() => !isNativeButton.value && props.disabled)

/**
 * `aria-pressed` is only emitted when the caller opted into the toggle contract by
 * setting `active` at all. An undefined `active` is not "false": it means this is an
 * ordinary button, and announcing a pressed state for one would be a lie a screen
 * reader cannot see through.
 */
const ariaPressed = computed(() =>
  props.active === undefined ? undefined : String(props.active),
)

const rootClass = computed(() => [
  ns.b(),
  ns.m(props.theme),
  ns.m(props.variant),
  ns.m(resolvedSize.value),
  ns.m(props.shape),
  {
    [ns.is('disabled')]: props.disabled,
    [ns.is('loading')]: props.loading,
    [ns.is('block')]: props.block,
    [ns.is('active')]: props.active === true,
  },
])

const forwardedAttrs = computed(() => {
  // `class` is re-attached explicitly in the template, because `inheritAttrs:
  // false` switches off Vue's automatic merging.
  const { class: _class, style, ...rest } = attrs
  // `style` is only forwarded when the consumer actually set one: a binding that
  // is present but undefined still serialises to `style=""` in server-rendered
  // output.
  return style ? { ...rest, style } : rest
})

const iconClass = (position: 'leading' | 'trailing') => [ns.e('icon'), ns.em('icon', position)]

function onClick(event: MouseEvent) {
  if (isInactive.value) {
    // A disabled native <button> never dispatches a click, so this branch exists
    // for the tags that cannot be disabled natively. `preventDefault` stops an
    // <a> from navigating and `stopPropagation` keeps the event from reaching a
    // parent that would act on it anyway.
    event.preventDefault()
    event.stopPropagation()
    return
  }
  emit('click', event)
}

// A `circle` button is icon-only, so its accessible name is the only thing a
// screen-reader user has to go on. Warn in development rather than ship an
// unlabelled button; Vite replaces `import.meta.env.DEV` with `false` in the
// production build, so rollup drops this whole block from `dist`.
if (import.meta.env.DEV) {
  watchPostEffect(() => {
    if (props.shape !== 'circle') return
    // Read the aria attributes before bailing out, so the effect re-runs when
    // they change rather than only when the shape does.
    void attrs['aria-label']
    void attrs['aria-labelledby']

    const raw = rootRef.value
    const element =
      raw instanceof HTMLElement ? raw : ((raw as { $el?: unknown } | null)?.$el ?? null)
    if (!(element instanceof HTMLElement)) return

    const named =
      element.textContent?.trim() !== '' ||
      element.hasAttribute('aria-label') ||
      element.hasAttribute('aria-labelledby') ||
      element.hasAttribute('title')
    if (!named) {
      console.warn(
        '[YueButton] shape="circle" renders an icon-only button, which needs an accessible ' +
          'name. Pass `aria-label`, or point `aria-labelledby` at visible text.',
      )
    }
  })
}
</script>

<template>
  <component
    :is="props.tag"
    ref="rootRef"
    v-bind="forwardedAttrs"
    :class="[rootClass, attrs.class]"
    :type="isNativeButton ? props.nativeType : undefined"
    :disabled="isNativeButton && props.disabled ? true : undefined"
    :aria-disabled="isDisabledOffNative ? 'true' : undefined"
    :aria-busy="props.loading ? 'true' : undefined"
    :aria-pressed="ariaPressed"
    :tabindex="isDisabledOffNative ? -1 : undefined"
    @click="onClick"
  >
    <!--
      The content keeps its place while loading and is only made invisible (see
      `.yue-button.is-loading` in the stylesheet). Replacing the leading slot with the
      spinner — the obvious alternative — makes the button change width mid-request and
      drops the label out of the accessibility tree, so it is deliberately not done.
    -->
    <span v-if="$slots.leading" :class="iconClass('leading')">
      <slot name="leading" />
    </span>

    <span v-if="$slots.default" :class="ns.e('label')">
      <slot />
    </span>

    <span v-if="$slots.trailing" :class="iconClass('trailing')">
      <slot name="trailing" />
    </span>

    <span v-if="props.loading" :class="ns.e('loader')">
      <!--
        The default indicator is decoration: `aria-busy` on the button is what tells a
        screen reader the control is working. A custom loader is left in the
        accessibility tree on purpose, so a consumer whose indicator carries real
        information ("上传中 40%") can expose it.
      -->
      <slot name="loader">
        <span :class="ns.e('spinner')" aria-hidden="true" />
      </slot>
    </span>
  </component>
</template>
