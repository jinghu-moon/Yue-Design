<script setup lang="ts">
import { ref } from 'vue'
import ZhCN from '@yue-ui/vue/locale/zh-CN'

/**
 * Snippets live here rather than inside a `<template #code>` slot: markdown-it does not
 * treat `<template>` as a block-level tag, so a fenced code block nested in a named slot
 * is not reliably parsed, and a snippet that silently renders as a paragraph is worse
 * than no snippet.
 *
 * Every snippet is the markup of the example directly above it.
 */
const zhCN = ZhCN

const basicCode = `const email = ref('')

<YueInput v-model="email" placeholder="you@example.com" />
<p>Value is: {{ email }}</p>`

const sizeCode = `const email = ref('')

<YueInput v-model="email" size="sm" placeholder="Small" />
<YueInput v-model="email" size="md" placeholder="Medium" />
<YueInput v-model="email" size="lg" placeholder="Large" />

<!-- When size is omitted it falls back to the app-level configuration -->
<YueInput v-model="email" placeholder="Follows configuration" />`

const stateCode = `<YueInput model-value="Editable" />

<YueInput model-value="Not editable" disabled />
<YueInput model-value="Readonly, selectable and copyable" readonly />
<YueInput model-value="Wrong format" invalid />

<!-- Invalid and readonly can be combined -->
<YueInput model-value="Readonly and invalid" readonly invalid />`

const nativeCode = `<!--
  Native attributes pass straight through to the inner <input>; they are not Yue Props:
  form submission, browser validation, autofill and label association all rely on them.
-->
<label for="email-field">Email</label>
<YueInput
  id="email-field"
  v-model="email"
  name="email"
  type="email"
  autocomplete="email"
  inputmode="email"
  maxlength="64"
  minlength="3"
  pattern=".+@.+"
  required
  placeholder="you@example.com"
  aria-describedby="email-hint"
/>
<p id="email-hint">We use it to send the sign-in link and never make it public.</p>`

const affixCode = `<!-- Decorative icons are marked aria-hidden by the caller; interactive controls do not go here -->
<YueInput placeholder="Amount">
  <template #prefix>
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 8h12M8 3v10" stroke="currentColor" stroke-width="1.5" fill="none" />
    </svg>
  </template>
  <template #suffix><span>CNY</span></template>
</YueInput>

<YueInput type="search" placeholder="Search components">
  <template #suffix>
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M10 10l3.5 3.5" stroke="currentColor" stroke-width="1.5" />
    </svg>
  </template>
</YueInput>`

const clearCode = `const keyword = ref('Clearable')

<!-- The clear control is a real <button type="button">; after clearing, focus stays in the input -->
<YueInput v-model="keyword" clearable placeholder="Search keywords" />

<!-- The accessible name comes from the locale catalog's input.clear, not from a component Prop:
     app.use(YueUI, { locale: 'zh-CN', packs: { 'zh-CN': ZhCN } }) -->`

const messagesCode = `// Switch the whole app to Chinese: the language pack is a separate entry, so it is not bundled unless used
import ZhCN from '@yue-ui/vue/locale/zh-CN'

app.use(YueUI, { locale: 'zh-CN', packs: { 'zh-CN': ZhCN } })

// Or switch only one subtree: two regions on the same page can each use a different language
import { provideLocale } from '@yue-ui/vue/locale'

provideLocale({ locale: 'zh-CN', packs: { 'zh-CN': ZhCN } })`

const passwordCode = `<!-- The first version only passes type="password" through; showing/hiding is left to a composable suffix -->
<YueInput type="password" v-model="secret" placeholder="Password" autocomplete="current-password" />

<!-- The plaintext toggle is the consumer's own suffix control; the base input does not inject it secretly -->
<YueInput :type="revealed ? 'text' : 'password'" v-model="secret">
  <template #suffix>
    <button type="button" class="linkish" @click="revealed = !revealed">
      {{ revealed ? 'Hide' : 'Show' }}
    </button>
  </template>
</YueInput>`

const narrowCode = `<div class="narrow-demo">
  <YueInput placeholder="No horizontal overflow on narrow screens either" />
</div>

/* The input is 100% wide and allowed to shrink inside a flex/grid column (min-width: 0),
   so narrow screens only constrain it through the container; long values scroll
   horizontally inside the input itself instead of bursting the page. */
.narrow-demo { width: 100%; max-width: 22rem; }`

const rtlCode = `<!-- dir sits on the field wrapper: the whole field mirrors together,
     the inner <input> inherits the direction, and the prefix/suffix content swaps sides. -->
<YueInput dir="rtl" model-value="١٢٣٤" clearable>
  <template #prefix><span aria-hidden="true">#</span></template>
  <template #suffix><span aria-hidden="true">٫</span></template>
</YueInput>`

const matrixCode = `<!-- State matrix: every cell is a real YueInput, only the props differ.
     The data-input-state in the table is a hook for verify:visual, not required API. -->
<div v-for="state in matrixStates" :key="state.id" class="matrix-row">
  <span class="matrix-row__label">{{ state.label }}</span>
  <YueInput v-bind="state.props" :data-input-state="state.id" />
</div>`

const themeCode = `<!-- The same markup holds in light, dark and any Accent:
     all colours resolve from --input-* tokens, and not one line in the component checks the theme. -->
<YueInput placeholder="The placeholder must reach 4.5:1 too" />
<YueInput model-value="The value is foreground; readability is guaranteed by --input-color" />
<YueInput model-value="Readonly" readonly />
<YueInput model-value="Disabled (WCAG exempt, measured but not gated)" disabled />`

const chooseCode = `<!-- Failed validation is "invalid", not "disabled": it stays editable -->
<YueInput :invalid="!isValid" v-model="value" />

<!-- readonly is for values that are visible and copyable but not editable, such as an order number -->
<YueInput readonly :model-value="orderNo" />

<!-- Only use disabled when the field is truly inoperable: it is not submitted and screen readers do not treat it as an editable control -->
<YueInput disabled :model-value="locked" />`

const email = ref('')
const keyword = ref('Clearable')
const secret = ref('hunter2')
const revealed = ref(false)
const isValid = ref(true)

/** The full state roster the visual matrix walks, spelled out so it cannot drift. */
const matrixStates = [
  { id: 'resting', label: 'resting', props: { modelValue: 'A-1024' } },
  { id: 'placeholder', label: 'placeholder', props: { placeholder: 'Please enter' } },
  { id: 'disabled', label: 'disabled', props: { modelValue: 'A-1024', disabled: true } },
  { id: 'readonly', label: 'readonly', props: { modelValue: 'A-1024', readonly: true } },
  { id: 'invalid', label: 'invalid', props: { modelValue: 'not-an-email', invalid: true } },
  { id: 'readonly-invalid', label: 'readonly + invalid', props: { modelValue: 'A-1024', readonly: true, invalid: true } },
  { id: 'clearable', label: 'clearable', props: { modelValue: 'A-1024', clearable: true } },
  { id: 'affixed', label: 'prefix / suffix', props: { modelValue: 'A-1024' } },
]
</script>

# Input

`YueInput` is a native single-line `<input>`: `v-model`, sizes, states, prefix/suffix content, and a real clear button. It does not own the label, helper text or error copy—that is `YueField`'s job.

Every preview box has its own appearance toolbar in the top-right corner (light / dark / Accent / density / reset). It changes tokens, and every example on the page follows along.

## Basic input and v-model

The value is always a string. The base input does not guess whether `'42'` is a number; conversion is the consumer's job, or a future typed field's.

<PreviewFrame title="Basic" description="All native input keyboard, IME and selection behaviour is preserved." :code="basicCode">
  <YueInput v-model="email" placeholder="you@example.com" data-input-state="basic" />
</PreviewFrame>

The value is: `{{ email }}`

## Sizes

The three sizes reuse Button's control-size contract (`ComponentSize`) rather than the input inventing its own pixel values. When `size` is omitted it falls back to the app-level configuration.

<PreviewFrame title="Sizes" description="sm / md / lg, and falling back to configuration when size is omitted." :code="sizeCode" surface-class="preview-frame__surface--stack">
  <YueInput size="sm" placeholder="Small" />
  <YueInput size="md" placeholder="Medium" />
  <YueInput size="lg" placeholder="Large" />
  <YueInput v-model="email" placeholder="Follows configuration" />
</PreviewFrame>

| `size` | Height | Inline padding | Font size | Prefix/suffix icon |
| --- | --- | --- | --- | --- |
| `sm` | `--input-height-sm` | `--input-padding-inline-sm` | `--input-font-size-sm` | `--input-icon-size-sm` |
| `md` | `--input-height-md` | `--input-padding-inline-md` | `--input-font-size-md` | `--input-icon-size-md` |
| `lg` | `--input-height-lg` | `--input-padding-inline-lg` | `--input-font-size-lg` | `--input-icon-size-lg` |

## disabled / readonly / invalid

These three are three different things, and they must look different too:

<PreviewFrame title="Three non-editable / invalid states" description="readonly is not disabled; invalid is not disabled either." :code="stateCode" surface-class="preview-frame__surface--stack">
  <YueInput model-value="Editable" data-input-state="example-editable" />
  <YueInput model-value="Not editable" disabled data-input-state="example-disabled" />
  <YueInput model-value="Readonly, selectable and copyable" readonly data-input-state="example-readonly" />
  <YueInput model-value="Wrong format" invalid data-input-state="example-invalid" />
  <YueInput model-value="Readonly and invalid" readonly invalid data-input-state="example-readonly-invalid" />
</PreviewFrame>

| State | Native behaviour | Visual semantics |
| --- | --- | --- |
| `disabled` | Native `disabled`: not focusable, not submitted, screen readers do not treat it as editable | Disabled background + disabled text + not-allowed cursor |
| `readonly` | Native `readonly`: **still focusable, still selectable and copyable, still submitted** | Quieter background, text stays readable |
| `invalid` | `aria-invalid="true"` | Error boundary |

::: tip The difference between `readonly` and `disabled` is not a matter of style
A readonly field exists for values that are "visible, selectable and copyable, but not editable"—an order number, say. Expressing that with `disabled` makes the value unselectable and uncopyable, and it is not submitted with the form either. Their contrast gates differ too: the disabled state is exempt under WCAG, the readonly state is not, so readonly text is still audited against 4.5:1.
:::

::: warning `invalid` only says "validation failed", it does not explain why
It sets `aria-invalid="true"` and switches the error boundary, but it **renders no error copy at all**. Where the error is and how to announce it is `YueField`'s business—if both components wrote their own error copy, there would be two sources of truth to keep in sync.
:::

For focus priority in the invalid state, see the [guide](/en/components/input/guide#focus-in-an-invalid-state).

## placeholder and native attributes

`name`, `autocomplete`, `inputmode`, `required`, `maxlength`, `minlength`, `pattern`, `aria-*` and `id` are all **native attributes passed through**, not Yue Props. They land on the real `<input>` inside, so `label for`, form submission, browser validation and autofill keep working as usual.

<PreviewFrame title="Native attributes" description="The label is associated with the inner input, not the outer div." :code="nativeCode" surface-class="preview-frame__surface--stack">
  <label for="email-field" class="field-label">Email</label>
  <YueInput
    id="email-field"
    v-model="email"
    name="email"
    type="email"
    autocomplete="email"
    inputmode="email"
    maxlength="64"
    minlength="3"
    pattern=".+@.+"
    required
    placeholder="you@example.com"
    aria-describedby="email-hint"
    data-input-state="native-attrs"
  />
  <p id="email-hint" class="field-hint">We use it to send the sign-in link and never make it public.</p>
</PreviewFrame>

The table below shows which element each attribute ends up on—this is the component's public DOM contract:

| Attribute | Lands on | Why |
| --- | --- | --- |
| `id`, `name`, `autocomplete`, `inputmode`, `required`, `maxlength`, `minlength`, `pattern`, `aria-*` | The inner `<input>` | They are form-control semantics; putting them on a `<div>` is as good as not writing them |
| `class`, `style`, `data-*` | The outer `.yue-input` | They are the identity of "the whole component" and its test hooks |

## prefix / suffix

Slots, bound to no icon library. Mark decorative icons `aria-hidden="true"` yourself; **do not put interactive controls inside a decorative span**—when you need a button, use `clearable` or build your own separate control.

<PreviewFrame title="Prefix and suffix content" description="Height, icon size and spacing all come from tokens." :code="affixCode" surface-class="preview-frame__surface--stack">
  <YueInput placeholder="Amount" data-input-state="affix-prefix">
    <template #prefix>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 8h12M8 3v10" stroke="currentColor" stroke-width="1.5" fill="none" />
      </svg>
    </template>
    <template #suffix><span>CNY</span></template>
  </YueInput>
  <YueInput type="search" placeholder="Search components" data-input-state="affix-search">
    <template #suffix>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="1.5" />
        <path d="M10 10l3.5 3.5" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </template>
  </YueInput>
</PreviewFrame>

Slots only add decoration: they do not change the value, the selection or keyboard behaviour, and they do not create extra focus targets.

## clearable

The clear control is a real `<button type="button">`: it is reachable by Tab, it has an accessible name, and it has its own hover and focus-visible styles. After clearing, focus stays inside the input—clearing is the start of "typing again", not the end of editing.

<PreviewFrame title="Clearable" description="After clearing, focus is still in the input; Tab reaches the clear button." :code="clearCode" surface-class="preview-frame__surface--stack">
  <YueInput v-model="keyword" clearable placeholder="Search keywords" data-input-state="clearable-demo" />
</PreviewFrame>

The clear control does **not** appear when the field is disabled, readonly or empty: offering "clear" on an input you cannot change is a lie.

### Accessible name

The clear button's `aria-label` comes from Yue's locale catalog (key `input.clear`), English `Clear` by default. It is not a component Prop—one string per Prop serves one component only, has to be repeated at every call site, and turns "translating" into "editing markup".

<PreviewFrame title="One field, three locale sources" description="The three fields have identical markup: the first reads the page language (English), the second reads Chinese inside a locale subtree, and the third is given only a regional tag (zh-Hans-CN) for which no pack exists in the repository." :code="messagesCode" surface-class="preview-frame__surface--stack">
  <YueInput v-model="keyword" clearable data-input-state="clearable-default" />
  <LocaleScope locale="zh-CN" :packs="{ 'zh-CN': zhCN }">
    <YueInput v-model="keyword" clearable data-input-state="clearable-translated" />
  </LocaleScope>
  <LocaleScope locale="zh-Hans-CN">
    <YueInput v-model="keyword" clearable data-input-state="clearable-regional" />
  </LocaleScope>
</PreviewFrame>

The three fields above have exactly the same markup; the only difference is which locale the outer `LocaleScope` switches the subtree to. The component does not know that "language" exists, it only reads `t('input.clear')`; `verify:visual` asserts three `aria-label` values in a real browser: the default reads the page language, the second equals `'清空'`, and the third also equals `'清空'` — but that third one is the **fallback chain** at work: there is no `zh-Hans-CN` pack in the repository, so `zh-Hans-CN` falls back through `zh-Hans-CN → zh-CN → zh → en-US` to the Chinese pack instead of failing or rendering the key.

`provideLocale()` is exported from `@yue-ui/vue/locale`; the full contract is in the [i18n guide](/en/guide/i18n).


## Password

The first version only requires `type="password"` to pass through correctly. The plaintext toggle is **the consumer's own suffix control**—the base input does not secretly inject icons and internal state.

<PreviewFrame title="Password" description="The plaintext toggle is composed by the consumer, not built into the component." :code="passwordCode" surface-class="preview-frame__surface--stack">
  <YueInput type="password" v-model="secret" placeholder="Password" autocomplete="current-password" data-input-state="password" />
  <YueInput :type="revealed ? 'text' : 'password'" v-model="secret" data-input-state="password-reveal">
    <template #suffix>
      <button type="button" class="linkish" @click="revealed = !revealed">
        {{ revealed ? 'Hide' : 'Show' }}
      </button>
    </template>
  </YueInput>
</PreviewFrame>

## Light / dark / Accent

All input colours come from tokens, so switching theme needs no JavaScript: `--input-background`, `--input-border-color*`, `--input-color` and `--input-placeholder-color` each resolve to different values in light and dark.

<PreviewFrame title="The same markup in three theme environments" description="Use the switches at the top of the page to change theme and Accent; not one character of the markup below has to change." :code="themeCode" surface-class="preview-frame__surface--stack">
  <YueInput placeholder="The placeholder must reach 4.5:1 too" data-input-state="theme-placeholder" />
  <YueInput model-value="The value is foreground; readability is guaranteed by --input-color" data-input-state="theme-resting" />
  <YueInput model-value="Readonly" readonly data-input-state="theme-readonly" />
  <YueInput model-value="Disabled (WCAG exempt, measured but not gated)" disabled data-input-state="theme-disabled" />
</PreviewFrame>

In dark mode the Error boundary switches to a lighter red on a deeper ramp so it stays visible—these values are all inside the 110 gates of `pnpm audit:tokens` (including readonly text, focus boundary, error boundary, prefix/suffix text and the clear control). The assertions are not only at the token layer: `verify:visual` measures the real rendered result in the browser under all three environments—light, dark and a neutral Accent.

::: tip The component does not know the theme
There is not a single line of JS in `YueInput` that checks whether the current theme is light or dark, and there is no `theme` Prop. The theme is the result of token resolution, not component state—so server-side rendering does not produce different HTML for different themes.
:::

## State matrix

<PreviewFrame
  title="Theme × state"
  description="Every cell is a real input; the light and dark contrast is measured in verify:visual."
  :code="matrixCode"
  surface-class="preview-frame__surface--matrix"
>
  <div v-for="state in matrixStates" :key="state.id" class="matrix-row">
    <span class="matrix-row__label">{{ state.label }}</span>
    <YueInput
      v-bind="state.props"
      :data-input-state="state.id"
      :placeholder="state.props.placeholder ?? 'Please enter'"
    />
  </div>
</PreviewFrame>

::: tip Keyboard focus does not depend on colour
`:focus-visible` draws a focus ring around the whole field (`--input-focus-ring-*`) rather than just recolouring the border. When the invalid state is combined with focus, the error boundary **keeps the error colour** and the focus cue is carried by the ring—so keyboard users do not lose the "something is wrong here" information just because they focused the field.
:::

## Narrow screens

The field is `100%` wide and allowed to shrink inside a flex / grid column (`min-width: 0`), so narrow screens only constrain it through the container and never push the page into horizontal scrolling.

<PreviewFrame title="Narrow width" description="No horizontal overflow at a 390px viewport; this one is asserted in verify:visual." :code="narrowCode">
  <div class="narrow-demo">
    <YueInput placeholder="No horizontal overflow on narrow screens either" data-input-state="narrow" />
  </div>
</PreviewFrame>

### RTL

`dir` belongs to the field itself rather than to the control inside it: the outer element is what lays out the prefix/suffix content. So `dir` lands on `.yue-input` and the inner `<input>` inherits it—the whole field mirrors together, instead of only the typed text mirroring while the prefix/suffix icons stay in their original order.

<PreviewFrame title="Right to left" description="The prefix is rightmost and the clear button is on the left of the input." :code="rtlCode" surface-class="preview-frame__surface--stack">
  <div class="narrow-demo">
    <YueInput dir="rtl" model-value="١٢٣٤" clearable data-input-state="rtl">
      <template #prefix><span aria-hidden="true">#</span></template>
      <template #suffix><span aria-hidden="true">٫</span></template>
    </YueInput>
  </div>
</PreviewFrame>

Putting `dir` on an ancestor container works the same way: the inner `<input>` inherits the direction and the outer element remains the layout owner.

## When not to use it

- You need a label, helper text, error copy and a required marker → wait for `YueField`, do not push form layout back into the input;
- You need multiple lines → `YueTextarea`, whose line height and resize differ from the single-line input;
- You need number stepping, dates, dropdowns or tag input → separate components, rather than one `type` parameter covering everything;
- You need number formatting → build a separate formatter first, and only then consider wiring it to an input.

## Which "non-editable" state to choose

These three states are often mixed up, but their native behaviour is completely different:

<PreviewFrame title="Pick one of the three" description="First ask whether the user can still change it, then ask whether the value should still be submitted." :code="chooseCode" surface-class="preview-frame__surface--stack">
  <YueInput :invalid="!isValid" model-value="Wrong format, but still editable" data-input-state="choose-invalid" />
  <YueInput readonly model-value="A-1024 (readonly, copyable)" data-input-state="choose-readonly" />
  <YueInput disabled model-value="A-1024 (disabled, not submitted)" data-input-state="choose-disabled" />
</PreviewFrame>

| The question you are asking | Use |
| --- | --- |
| The user entered something wrong and needs to retype it | `invalid` |
| The value comes from the system and the user can only view and copy it | `readonly` |
| This field simply does not apply right now | `disabled` |
