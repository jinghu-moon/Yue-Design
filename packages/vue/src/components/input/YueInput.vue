<script setup lang="ts">
/**
 * YueInput — one native `<input>` and the content either side of it.
 *
 * The component's job is to *not* get in the way: the value, the keyboard, form
 * submission, autofill, browser validation and the accessibility tree all belong to the
 * platform, and every one of them breaks the moment a `<div>` pretends to be an input.
 * So the DOM is a wrapper around a real control, and the wrapper only ever paints.
 */
import { computed, ref, useAttrs, watch } from 'vue'
import type { StyleValue } from 'vue'
import { useConfig, useNamespace } from '@yue-ui/hooks'
import { useLocale } from '../../locale/runtime'
import type { YueInputProps, YueInputSlots } from './types'

defineOptions({ name: 'YueInput', inheritAttrs: false })

const props = withDefaults(defineProps<YueInputProps>(), {
  modelValue: '',
  size: undefined,
  type: 'text',
  disabled: false,
  readonly: false,
  invalid: false,
  placeholder: undefined,
  clearable: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  input: [event: Event]
  change: [event: Event]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  clear: []
}>()

defineSlots<YueInputSlots>()

const ns = useNamespace('input')
const attrs = useAttrs()
const config = useConfig()
const locale = useLocale()

const inputRef = ref<HTMLInputElement | null>(null)

/** Component prop wins over the application-level default, exactly like `YueButton`. */
const size = computed(() => props.size ?? config.size)

/**
 * The clear control's accessible name, from Yue's catalog.
 *
 * Deliberately not a prop: a prop would serve one component, have to be repeated at every
 * call site, and turn a translation into a change to the markup. It reads *inside* the
 * computed so that switching language re-renders the name — the string is reactive, the
 * component does not have to be rebuilt.
 *
 * No local fallback either. `useLocale()` resolves through the pack chain and, if the key is
 * genuinely missing, returns the key itself plus a diagnostic — a hard-coded `'清空'` here is
 * exactly how a Chinese string ends up in an English application.
 */
const clearLabel = computed(() => locale.t('input.clear'))

/**
 * `class`, `style` and `data-*` describe the component as a whole, so they land on the
 * wrapper; every other attribute is a native input attribute and goes on the control.
 * Routing them explicitly is the reason `inheritAttrs` is off — otherwise Vue would
 * spread all of them onto the wrapper, and `id`, `name`, `aria-*` and `required` would
 * end up on a `<div>` where none of them do anything.
 */
const rootStyle = computed(() => attrs.style as StyleValue | undefined)

/**
 * Attributes that belong to the *field* rather than to the control.
 *
 * `dir` is a layout property: the wrapper is what lays out the affix row, and the
 * control inherits the direction from it. Leaving `dir` on the `<input>` would mirror
 * the text inside the field while the prefix/suffix row stayed in visual order — a field
 * that is half-RTL. Everything else native (`lang`, `autocomplete`, …) is about the
 * control or its text, so it stays there.
 */
const FIELD_ATTRS = ['dir']

/**
 * `class`, `style`, `data-*` and `dir` describe the component as a whole, so they land on
 * the wrapper; every other attribute is a native input attribute and goes on the control.
 * Routing them explicitly is the reason `inheritAttrs` is off — otherwise Vue would
 * spread all of them onto the wrapper, and `id`, `name`, `aria-*` and `required` would
 * end up on a `<div>` where none of them do anything.
 */
const rootData = computed(() => {
  const root: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('data-') || FIELD_ATTRS.includes(key)) root[key] = value
  }
  return root
})

const controlAttrs = computed(() => {
  const control: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class' || key === 'style') continue
    if (key.startsWith('data-') || FIELD_ATTRS.includes(key)) continue
    control[key] = value
  }
  return control
})

const rootClass = computed(() => [
  ns.b(),
  ns.m(size.value),
  {
    'is-disabled': props.disabled,
    'is-readonly': props.readonly,
    'is-invalid': props.invalid,
  },
  attrs.class,
])

/**
 * The value the field is showing.
 *
 * The DOM is driven by this ref rather than directly by `modelValue`, so the field has one
 * source of truth for its own value: what is rendered, whether the clear control exists,
 * and whether an incoming event counts as a change all read the same thing.
 *
 * Binding `:value="props.modelValue"` and writing the DOM directly in `onClear` left the
 * two out of step whenever a parent did not respond to `update:modelValue`: the field
 * emptied but the button stayed visible (it still read the stale prop), and the next parent
 * render wrote the old value back into the field.
 *
 * It also mirrors the control *during* an IME composition. That is not cosmetic: Vue
 * re-applies a dynamic `value` prop on every patch rather than only when it changed, so a
 * re-render while the composition is open would overwrite the text the IME is building —
 * which is why Vue's own `v-model` directive skips its DOM write in `beforeUpdate` while
 * `el.composing`. Keeping this ref equal to what the control holds makes the patch a no-op
 * instead, which works for a template binding.
 */
const currentValue = ref(props.modelValue)

/**
 * The last value handed to the consumer.
 *
 * Deliberately not reactive: it is bookkeeping for de-duplication, never rendered. It is
 * separate from `currentValue` because the two answer different questions — "what does the
 * control hold" versus "what has already been published" — and during a composition the
 * first moves while the second must not.
 */
let published = props.modelValue

/**
 * Adopt a value that came from outside.
 *
 * Skips an echo of what this component just published (`next === currentValue`) so a parent
 * re-render never fights the caret, and skips while composing because replacing the value
 * mid-composition interrupts the IME — that change loses to the user's composition, exactly
 * as it does in Vue's own `v-model`.
 */
watch(
  () => props.modelValue,
  (next) => {
    if (composing.value || next === currentValue.value) return
    currentValue.value = next
    // Adopted from outside, so it is now also what the consumer has; without this, a later
    // input event carrying that same string would look like a change.
    published = next
  },
)

/**
 * The clear control only exists where it is an action: a disabled or readonly field
 * cannot be edited, so offering to clear it would be a lie, and an empty field has
 * nothing to clear.
 */
const showClear = computed(
  () => props.clearable && !props.disabled && !props.readonly && currentValue.value !== '',
)

/**
 * True between `compositionstart` and `compositionend`, i.e. while an IME is composing.
 *
 * An `input` event fired mid-composition carries a half-finished value. Publishing it would
 * make the parent re-render the field with that intermediate string, which interrupts the
 * IME and can drop the candidate the user was choosing.
 */
const composing = ref(false)

/**
 * Publish a value the control now holds, **at most once per change**.
 *
 * The unchanged-value guard is what makes IME input correct, and it is why this component
 * does not have to guess at event ordering. The engines disagree:
 *
 *   - Chrome and Safari fire `compositionend` and then an `input` with the final value;
 *   - Firefox fires the final `input` while the composition is still open (so `onInput`
 *     only mirrors it) and *then* `compositionend` — which is also what CDP-driven input in
 *     Chromium produces, with no trailing `input` at all.
 *
 * So both paths have to be able to publish, and the second one to arrive must be a no-op
 * rather than a duplicate. Comparing against what was published does exactly that: one
 * composition, one emit, whichever order the engine uses — and a browser that delivers the
 * final value only once still publishes it.
 *
 * Vue's own `v-model` relies on the same idempotence by a different route: its
 * `compositionend` handler re-dispatches a synthetic `input`, so the model listener may run
 * twice for one composition, which is harmless because assigning an unchanged value to a
 * `ref` triggers nothing. A component that *emits* cannot lean on that, so the check is
 * explicit here.
 *
 * Only `onInput` calls this, and it is always reached from a real `input` event — so the
 * payload is `event` itself rather than something derived from it. No path hands a
 * `compositionend` to a consumer.
 */
function commit(event: Event) {
  const element = event.target as HTMLInputElement
  // Mirror first: the control is the source of the value, and everything rendered reads it.
  currentValue.value = element.value
  if (element.value === published) return
  published = element.value
  emit('update:modelValue', element.value)
  emit('input', event)
}

/**
 * The last `input` event the browser sent during the composition, with the value it carried.
 *
 * The value is recorded at dispatch time because that is what decides whether the event
 * describes the publication it might be used for. In Chrome's order the last mid-composition
 * event still carries the *intermediate* text — using it would report `data: 'zhong'` for a
 * publication of `'中文'` — so a cached event is only reused when the value it was dispatched
 * with is still the control's value.
 */
let compositionInput: { event: Event; value: string } | null = null

function onInput(event: Event) {
  const element = event.target as HTMLInputElement
  if (composing.value) {
    // Mirror without publishing: the field has to keep rendering what the IME holds, or the
    // next patch would overwrite it, but the consumer must not see a half-finished value.
    compositionInput = { event, value: element.value }
    currentValue.value = element.value
    return
  }
  commit(event)
}

function onCompositionStart() {
  composing.value = true
  // Scoped to one composition, so a previous one's event can never be reused.
  compositionInput = null
}

/**
 * A dispatched `input` event, for a publication that has no browser event of its own.
 *
 * Dispatched through the control rather than merely constructed, for two reasons: it gives
 * the event a real `target`/`currentTarget` (a hand-built event that is never dispatched has
 * neither, so `event.target.value` would throw for exactly the consumers the docs tell to
 * read it), and it routes the publication through the ordinary `input` path instead of
 * beside it.
 */
function dispatchSyntheticInput(element: HTMLInputElement) {
  const event =
    typeof InputEvent === 'function'
      ? // `data` is left unset on purpose: the component knows the resulting value, not the
        // text the IME inserted, and inventing a delta would be a worse lie than `null`.
        new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText' })
      : new Event('input', { bubbles: true })
  element.dispatchEvent(event)
}

/**
 * Publish whatever the composition produced.
 *
 * Two cases, and between them they cover every engine order without a stale payload:
 *
 *   - the browser already sent an `input` carrying the final value (Firefox, and CDP-driven
 *     Chromium) — that event is reused, so `data` and `inputType` are the browser's own;
 *   - it has not (Chrome, Safari, where the trailing `input` arrives after this handler) —
 *     a synthetic `input` is dispatched, which publishes the value through the normal path
 *     and arrives with a real `target`. The engine's trailing event then finds the value
 *     already published and is de-duplicated.
 */
function onCompositionEnd() {
  composing.value = false
  const element = inputRef.value
  const cached = compositionInput
  compositionInput = null
  // Compared against the *control's* value, not the mirrored one. In Chrome's order the
  // browser updates the value as the composition commits, without an `input` event of its
  // own, so the mirror still holds the intermediate text at this point — and a comparison
  // against the mirror would call a stale event current.
  if (cached && element && cached.value === element.value) {
    commit(cached.event)
    return
  }
  if (!element) return
  dispatchSyntheticInput(element)
}

function onChange(event: Event) {
  emit('change', event)
}

function onFocus(event: FocusEvent) {
  emit('focus', event)
}

function onBlur(event: FocusEvent) {
  emit('blur', event)
}

/**
 * Clicking the field's chrome — its padding, an affix, an empty area — focuses the
 * control, the way a native field with a larger hit area behaves. Skipped when the click
 * already landed on something interactive, so the clear control keeps working and text
 * selection inside the input is never pre-empted.
 */
function onRootMouseDown(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target || target === inputRef.value) return
  if (target.closest('button, a, input, select, textarea, [contenteditable]')) return
  event.preventDefault()
  inputRef.value?.focus()
}

/**
 * Empty the field and keep the caret where it was.
 *
 * Sets the field's own value rather than writing the DOM: the render then clears the
 * control *and* hides the button, because both read `currentValue`. Writing `element.value`
 * directly left the button visible (it still read the stale `modelValue`) and let the next
 * parent render put the old value back.
 *
 * Focus moves back to the control because clearing is the start of retyping, not the end of
 * editing.
 */
function onClear() {
  currentValue.value = ''
  published = ''
  emit('update:modelValue', '')
  emit('clear')
  inputRef.value?.focus()
}
</script>

<template>
  <div
    v-bind="rootData"
    :class="rootClass"
    :style="rootStyle"
    @mousedown="onRootMouseDown"
  >
    <span v-if="$slots.prefix" :class="ns.e('prefix')">
      <slot name="prefix" />
    </span>

    <input
      ref="inputRef"
      v-bind="controlAttrs"
      :class="ns.e('native')"
      :type="props.type"
      :value="currentValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :readonly="props.readonly"
      :aria-invalid="props.invalid ? 'true' : undefined"
      @input="onInput"
      @change="onChange"
      @focus="onFocus"
      @blur="onBlur"
      @compositionstart="onCompositionStart"
      @compositionend="onCompositionEnd"
    />

    <button
      v-if="showClear"
      :class="ns.e('clear')"
      type="button"
      :aria-label="clearLabel"
      @mousedown.prevent
      @click="onClear"
    />

    <span v-if="$slots.suffix" :class="ns.e('suffix')">
      <slot name="suffix" />
    </span>
  </div>
</template>
