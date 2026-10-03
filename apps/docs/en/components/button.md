<script setup lang="ts">
import { ref } from 'vue'

/**
 * Snippets live here rather than inside a `<template #code>` slot: markdown-it
 * does not treat `<template>` as a block-level tag, so a fenced code block nested
 * in a named slot is not reliably parsed, and a snippet that silently renders as
 * a paragraph is worse than no snippet.
 *
 * Every snippet is the markup of the example directly above it.
 */
const basicCode = `<YueButton>Save</YueButton>`

const themeCode = `<YueButton theme="default">Default</YueButton>
<YueButton theme="primary">Primary</YueButton>
<YueButton theme="success">Success</YueButton>
<YueButton theme="warning">Warning</YueButton>
<YueButton theme="danger">Danger</YueButton>`

const variantCode = `<YueButton theme="primary" variant="solid">Solid</YueButton>
<YueButton theme="primary" variant="outline">Outline</YueButton>
<YueButton theme="primary" variant="dashed">Dashed</YueButton>
<YueButton theme="primary" variant="text">Text</YueButton>
<YueButton theme="primary" variant="link">Link</YueButton>`

const solidOutlineCode = `<YueButton theme="default" variant="solid">Solid</YueButton>
<YueButton theme="default" variant="outline">Outline</YueButton>
<YueButton theme="default" variant="dashed">Dashed</YueButton>
<YueButton theme="default" variant="text">Text</YueButton>
<YueButton theme="default" variant="link">Link</YueButton>`

const matrixCode = `<YueButton
  v-for="theme in themes"
  :key="theme"
  :theme="theme"
  variant="solid"
>{{ theme }}</YueButton>`

const focusCode = `/* hover and focus-visible share the same color state: what keyboard
 * users see as "which one is current" matches what mouse users see. The focus ring
 * is a separate declaration and is not displaced by the fill color. */
.yue-button--solid:hover:not(.is-disabled):not(.is-loading),
.yue-button--solid:focus-visible:not(.is-disabled):not(.is-loading) {
  background-color: var(--_fill-hover);
}`

const sizeCode = `<YueButton size="sm">Small</YueButton>
<YueButton size="md">Medium</YueButton>
<YueButton size="lg">Large</YueButton>

<!-- With no size, the app-level configuration applies -->
<YueButton>Follows config</YueButton>`

const shapeCode = `<YueButton shape="square">Square</YueButton>
<YueButton shape="round">Rounded</YueButton>
<YueButton shape="circle" aria-label="Search" variant="outline">
  <template #leading><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M10 10l3.5 3.5" stroke="currentColor" stroke-width="1.5" /></svg></template>
</YueButton>`

const disabledCode = `<YueButton disabled>Default</YueButton>
<YueButton theme="primary" disabled>Primary</YueButton>
<YueButton variant="outline" disabled>Outline</YueButton>
<YueButton variant="link" disabled>Link</YueButton>`

const tagCode = `<!-- Renders as an <a>: there is no native disabled, so aria-disabled + tabindex="-1" is used instead -->
<YueButton tag="a" href="/pricing">View pricing</YueButton>
<YueButton tag="a" href="/pricing" disabled>View pricing (disabled)</YueButton>

<!-- loading says the same thing on an <a> as on a <button>: busy, but still reachable with Tab.
     It does not disguise itself as disabled (no aria-disabled, no tabindex);
     the handler is what blocks the click. -->
<YueButton tag="a" href="/pricing" loading>Submitting</YueButton>

<!-- It can also be any component; remember markRaw when it lives in reactive state -->
<YueButton :tag="RouterLink" to="/pricing">View pricing</YueButton>`

const loadingStabilityCode = `<!-- The two buttons have identical text, icon and size; only loading differs -->
<YueButton size="lg">
  <template #leading><PlusIcon /></template>
  Save changes
</YueButton>

<YueButton size="lg" loading>
  <template #leading><PlusIcon /></template>
  Save changes
</YueButton>`

const blockCode = `<YueButton theme="primary" block>Full-width button</YueButton>`

const slotCode = `<YueButton theme="primary">
  <template #leading><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" /></svg></template>
  New
</YueButton>

<YueButton variant="outline">
  More
  <template #trailing><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" /></svg></template>
</YueButton>`

const entryCode = `// Just one component: no plugin, and the bundler keeps only this one path
import YueButton from '@yue-ui/vue/button'
import '@yue-ui/vue/button.css'
import '@yue-ui/design-tokens/index.css'

// Or import by name
import { YueButton } from '@yue-ui/vue'
import '@yue-ui/vue/style.css'
import '@yue-ui/design-tokens/index.css'

// Or register everything (the only entry that touches app)
import { createApp } from 'vue'
import YueUI from '@yue-ui/vue/plugin'
import '@yue-ui/vue/style.css'
import '@yue-ui/design-tokens/index.css'

createApp(App).use(YueUI, { size: 'md' }).mount('#app')`

const overrideCode = `/* Recommended: re-point the component tokens. Tokens live in the components layer, so overriding them from the demo layer takes effect. */
@layer demo {
  :root {
    --button-primary-background: var(--accent-solid);
  }
}

/* To change only one area, re-point the component tokens on the container; the button itself does not need to know. */
.checkout-actions {
  --button-height-md: var(--size-28);
  --button-padding-inline-md: var(--space-8);
}`

const submitting = ref(false)
async function submit() {
  submitting.value = true
  await new Promise((resolve) => setTimeout(resolve, 1200))
  submitting.value = false
}

/**
 * The full matrix, spelled out rather than derived from the component's types: the
 * documentation should fail to build if someone adds a theme or variant and forgets
 * to show it here.
 */
const matrixThemes = ['default', 'primary', 'success', 'warning', 'danger']
const matrixVariants = ['solid', 'outline', 'dashed', 'text', 'link']

const anatomyCode = `<YueButton size="lg">
  <template #leading><SaveIcon /></template>
  Save
  <template #trailing><CaretDownIcon /></template>
</YueButton>

<!-- loading: the content stays in place, the loading layer covers it, the width does not jump -->
<YueButton size="lg" loading>Save</YueButton>`

const loaderCode = `<!-- Default: spinner, aria-hidden -->
<YueButton theme="primary" :loading="submitting" @click="submit">
  {{ submitting ? 'Submitting' : 'Submit' }}
</YueButton>

<!-- Custom: still the button's own indicator, not bound to any icon library -->
<YueButton loading>
  <template #loader><span class="my-loader" /></template>
  Upload
</YueButton>`

const groupCode = `<!-- Just stuck together: merged radii + role="group", no selection state -->
<YueButtonGroup aria-label="Alignment">
  <YueButton variant="outline">Left</YueButton>
  <YueButton variant="outline">Center</YueButton>
  <YueButton variant="outline">Right</YueButton>
</YueButtonGroup>

<!-- Segmented control: a v-model on top of the group, the selected item outputs aria-pressed -->
<YueButtonToggle v-model="align" aria-label="Alignment">
  <YueButtonToggleItem value="left">Left</YueButtonToggleItem>
  <YueButtonToggleItem value="center">Center</YueButtonToggleItem>
  <YueButtonToggleItem value="right">Right</YueButtonToggleItem>
</YueButtonToggle>`

const toggleItemCode = `<!-- Every item is still a button: theme / variant / size / loading can each be set on its own -->
<YueButtonToggle v-model="viewMode" aria-label="View">
  <YueButtonToggleItem value="list" variant="outline">
    <template #leading><ListIcon /></template>
    List
  </YueButtonToggleItem>
  <YueButtonToggleItem value="grid" variant="outline">Grid</YueButtonToggleItem>
  <YueButtonToggleItem value="board" variant="outline" disabled>Board</YueButtonToggleItem>
</YueButtonToggle>

<!-- A group of buttons that can all be off: a group + an independent active on each -->
<YueButtonGroup aria-label="Text formatting">
  <YueButton variant="text" :active="bold" @click="bold = !bold">Bold</YueButton>
  <YueButton variant="text" :active="italic" @click="italic = !italic">Italic</YueButton>
</YueButtonGroup>`

const align = ref('center')
const viewMode = ref('list')
const bold = ref(true)
const italic = ref(false)
</script>

# Button

This page is **examples**: every area renders a real `YueButton` (as well as the Button family's `YueButtonGroup`, `YueButtonToggle` and `YueButtonToggleItem`). See [API](./button/api) for the interface tables and the [guide](./button/guide) for usage principles.

Button is the first component of `@yue-ui/vue`, and the verification case for the whole pipeline (tokens → hooks → component → docs → packaged consumption).

Every example on this page renders a **real component**: the same component source, the same `@yue-ui/vue/style.css`. They are not screenshots and not copied HTML — if the component breaks, this page breaks with it.

## On-demand import examples

Three entry points, each with one job:

<PreviewFrame title="Three entry points" description="The root entry only does named exports; only the plugin entry registers components." :code="entryCode">
  <YueButton theme="primary">Named import</YueButton>
  <YueButton>Root entry</YueButton>
  <YueButton variant="outline">Plugin registration</YueButton>
</PreviewFrame>

| Entry | Purpose |
| --- | --- |
| `@yue-ui/vue` | Named exports, registers no component; the bundler keeps only the parts in use |
| `@yue-ui/vue/button` | Single-component entry, `default` is `YueButton` |
| `@yue-ui/vue/plugin` | Full registration, the only entry that calls `app.component()` |
| `@yue-ui/vue/style.css` | Styles for every component |
| `@yue-ui/vue/button.css` | Only the Button styles |

::: tip Styles must be imported explicitly
The components do not resolve CSS: there is no style import at all in `dist/*.js`. That way the ESM entry also resolves directly under Node / SSR, and the cascade order stays visible in your own source.
:::

## Anatomy

A button is not a `<button>` plus a run of text. It has six parts, and each part is defined by one class name, a number of component tokens and one accessibility rule. Looking at the structure first makes the API tables further down much easier to read.

<ButtonAnatomy />

<PreviewFrame title="The real code behind the anatomy diagram" description="The two buttons above are rendered by this code, and the loading layer is in there too." :code="anatomyCode">
  <YueButton size="lg">
    <template #leading>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </template>
    Save
    <template #trailing>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </template>
  </YueButton>
  <YueButton size="lg" loading>Save</YueButton>
</PreviewFrame>

| # | Part | Selector | Determined by |
| --- | --- | --- | --- |
| 1 | Outer button box | `.yue-button` | `--button-height-*`, `--button-padding-inline-*`, `--button-border-width`, `--button-border-radius` |
| 2 | Leading content | `.yue-button__icon--leading` | the `leading` slot; `--button-icon-size-*`, `--button-gap` |
| 3 | Text area | `.yue-button__label` | the default slot; `--button-font-size-*`, `--button-font-weight`, `--button-line-height` |
| 4 | Trailing content | `.yue-button__icon--trailing` | the `trailing` slot; the same set of size tokens as the leading content |
| 5 | Loading layer | `.yue-button__loader` | rendered when `loading` is true; the `loader` slot or the default `.yue-button__spinner` |
| 6 | Focus ring and hit area | `.yue-button:focus-visible` | `--button-focus-ring-*`; the hit area is the control box itself (`link` excepted) |

Three structural conventions are worth remembering on their own:

- **The loading layer is a separate layer.** It is absolutely positioned over the content, so loading does not change the button width and does not take the label out of the accessibility tree — see [Loading state](#loading-state) below.
- **Content is not replaced, only hidden.** While loading, `leading` / `trailing` stay where they are in the DOM and are merely painted transparent; swapping a slot out is the easiest source of layout shift to write down and the easiest to overlook.
- **`link` deliberately gives up the box.** Its part 1 has no fixed height and no horizontal padding, so the hit area is noticeably smaller — which is why it only fits inside a sentence.

## Basic examples

<PreviewFrame title="Basic example" description="With no attribute passed: theme=default, variant=solid, size=md, shape=square." :code="basicCode">
  <YueButton>Save</YueButton>
</PreviewFrame>

## Theme variants

`theme` decides what the button "is for", that is, which set of semantic colors it takes.

<PreviewFrame title="Theme variants" description="Five semantic roles, mutually independent from variant." :code="themeCode">
  <YueButton theme="default">Default</YueButton>
  <YueButton theme="primary">Primary</YueButton>
  <YueButton theme="success">Success</YueButton>
  <YueButton theme="warning">Warning</YueButton>
  <YueButton theme="danger">Danger</YueButton>
</PreviewFrame>

| `theme` | Semantic | Solid fill source | Solid contrast (light / dark) |
| --- | --- | --- | --- |
| `default` | Neutral action | `--button-default-background` | 16.48 / 16.29 |
| `primary` | Primary page action | `--button-primary-background` | 4.54 / 5.58 |
| `success` | Confirmation / completion | `--button-success-background` | 6.55 / 7.06 |
| `warning` | Needs attention | `--button-warning-background` | 5.73 / 11.56 |
| `danger` | Destructive action | `--button-danger-background` | 6.31 / 9.96 |

The contrast is not estimated: `--button-{theme}-color` on `--button-{theme}-background`, the hover and pressed states, the accent text of the unfilled variants, and the selected-state `--button-selected-*` are all among the 110 gates in `pnpm audit:tokens` (that number is determined by `tools/token-audit.pairs.mjs`, and `audit:docs` checks whether it is written correctly).

## Solid / Outline / Dashed / Text / Link

`variant` decides "how it is painted", and is orthogonal to `theme`. They answer two different questions:

- **Whether there is a shell** — `solid` fills, `outline` / `dashed` draw a border, `text` draws nothing;
- **Whether it occupies the box** — all of them except `link` keep the full control box (fixed height + horizontal padding), so the hit area matches the other buttons; `link` deliberately drops the box, because it is meant to sit in the middle of a sentence.

<PreviewFrame title="Five treatments on the primary color" description="One theme, five weights." :code="variantCode">
  <YueButton theme="primary" variant="solid">Solid</YueButton>
  <YueButton theme="primary" variant="outline">Outline</YueButton>
  <YueButton theme="primary" variant="dashed">Dashed</YueButton>
  <YueButton theme="primary" variant="text">Text</YueButton>
  <YueButton theme="primary" variant="link">Link</YueButton>
</PreviewFrame>

<PreviewFrame title="Five treatments on the neutral color" description="Switching theme does not require changing variant." :code="solidOutlineCode">
  <YueButton theme="default" variant="solid">Solid</YueButton>
  <YueButton theme="default" variant="outline">Outline</YueButton>
  <YueButton theme="default" variant="dashed">Dashed</YueButton>
  <YueButton theme="default" variant="text">Text</YueButton>
  <YueButton theme="default" variant="link">Link</YueButton>
</PreviewFrame>

| `variant` | Fill | Border | Text | Box | Use |
| --- | --- | --- | --- | --- | --- |
| `solid` | Theme solid color | None | Content color on the solid fill | Yes | The one primary action on the page |
| `outline` | `--surface` | Solid line, theme-readable color | Theme-readable color | Yes | Secondary action that needs a sense of boundary |
| `dashed` | `--surface` | Dashed line, theme-readable color | Theme-readable color | Yes | Low-frequency actions such as "Add" or "Add configuration"; the dashes themselves say "something else can go here" |
| `text` | Transparent | None | Theme-readable color | Yes | Toolbars, table rows, dense areas |
| `link` | Transparent | None | `--button-link-color` | **No** | An inline jump embedded in a sentence |

::: tip The boundary between `text` and `link`
Both have "no shell", but only one keeps the box.

`text` is **a quieter button**: its height and padding are exactly the same as `solid`, the hit area is just as large, and hover gives feedback through the shared subtle overlay. `link` is **an inline action**: no fixed height, no horizontal padding, it reads the link color and underlines on hover.

So use `text` in a toolbar and `link` inside a sentence. Do not use `link` as "a lighter button" — its hit area becomes smaller than it should ever be.
:::

::: warning The text color of unfilled variants is not the text color of solid
The `solid` text is "the content color on a saturated fill" (white in light mode), which would be invisible on a white background. So `outline` / `dashed` / `text` read a different set of tokens: `--button-{theme}-accent`; each of them points at a semantic text role, and every one is covered by the contrast gates.
:::

### hover and focus-visible share one state

<PreviewFrame title="Keyboard and mouse see the same cue" description="Focus and Tab through them: the fill matches hover, and the focus ring is always kept." :code="focusCode">
  <YueButton theme="primary" variant="solid">Primary action</YueButton>
  <YueButton variant="outline">Secondary action</YueButton>
  <YueButton variant="dashed">Add an item</YueButton>
  <YueButton variant="text">Tools</YueButton>
</PreviewFrame>

The focus ring is an **independent declaration** and is not displaced by the fill color: resets such as `outline: none` were not adopted, because they delete the only position cue a keyboard user has.

## Theme × variant matrix

Laying out the 5 themes and the 5 treatments is how every combination gets checked — especially whether the fill and the text fall over together in dark mode.

<PreviewFrame
  title="Theme × variant"
  description="Every cell is a real button; the light and dark contrast are both measured in verify:visual."
  :code="matrixCode"
  surface-class="preview-frame__surface--matrix"
>
  <div v-for="variant in matrixVariants" :key="variant" class="matrix-row">
    <span class="matrix-row__label">{{ variant }}</span>
    <YueButton
      v-for="theme in matrixThemes"
      :key="theme"
      :theme="theme"
      :variant="variant"
      :data-matrix="`${variant}-${theme}`"
    >
      {{ theme }}
    </YueButton>
  </div>
</PreviewFrame>

<PreviewFrame
  title="State matrix"
  description="How disabled and loading look in each theme; the disabled state is explicitly exempt under WCAG, so only whether it uses the agreed tokens is verified."
  surface-class="preview-frame__surface--matrix"
>
  <div v-for="theme in matrixThemes" :key="theme" class="matrix-row">
    <span class="matrix-row__label">{{ theme }}</span>
    <YueButton :theme="theme" :data-state="`${theme}-normal`">Normal</YueButton>
    <YueButton :theme="theme" :data-state="`${theme}-disabled`" disabled>Disabled</YueButton>
    <YueButton :theme="theme" :data-state="`${theme}-loading`" loading>Loading</YueButton>
  </div>
</PreviewFrame>

## Size

<PreviewFrame title="Size" description="sm / md / lg, and falling back to the configuration when size is omitted." :code="sizeCode" surface-class="preview-frame__surface">
  <YueButton size="sm">Small</YueButton>
  <YueButton size="md">Medium</YueButton>
  <YueButton size="lg">Large</YueButton>
  <YueButton>Follows config</YueButton>
</PreviewFrame>

The three size steps are not hard-coded pixels; each one points at a set of geometry tokens:

| `size` | Height | Horizontal padding | Font size | Icon |
| --- | --- | --- | --- | --- |
| `sm` | `--button-height-sm` | `--button-padding-inline-sm` | `--button-font-size-sm` | `--button-icon-size-sm` |
| `md` | `--button-height-md` | `--button-padding-inline-md` | `--button-font-size-md` | `--button-icon-size-md` |
| `lg` | `--button-height-lg` | `--button-padding-inline-lg` | `--button-font-size-lg` | `--button-icon-size-lg` |

When `size` is not passed, the `size` from the app-level configuration is used (default `md`). The configuration is provided through plugin options or `provideYueConfig()`; the component's own `size` always wins.

::: warning The namespace is fixed, not a configuration option
`useNamespace('button')` produces `yue-button`, and that `yue` comes from the `YUE_NAMESPACE` constant. `YueConfig` has **no** `prefix`.

The reason is practical: a CSS selector cannot be assembled from a variable at runtime. Once the namespace is configurable, the class names become `.app-button`, while the stylesheet shipped with the package only writes `.yue-button` — every rule silently stops applying and the button degrades to the host's default styling. The class names are themselves public API (both "Token mapping" and "Overrides and the cascade" below reference them directly), so making them changeable would only make the documentation wrong for whoever changed them.

If the namespace really has to change, the correct approach is to rewrite the selectors **when the stylesheet is generated**, not to configure them at runtime. Passing `prefix` immediately produces an explanatory warning.
:::

## Shape

<PreviewFrame title="Shape" description="circle is an icon button and must be given an accessible name." :code="shapeCode">
  <YueButton shape="square">Square</YueButton>
  <YueButton shape="round">Rounded</YueButton>
  <YueButton shape="circle" aria-label="Search" variant="outline">
    <template #leading>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="1.5" />
        <path d="M10 10l3.5 3.5" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </template>
  </YueButton>
</PreviewFrame>

| `shape` | Radius | Notes |
| --- | --- | --- |
| `square` | `--button-border-radius` | Default |
| `round` | `--button-border-radius-full` | Capsule |
| `circle` | `--button-border-radius-full` | Square + fully rounded; the width equals the height and the horizontal padding drops to zero |

`circle` has no visible text, so its accessible name is the only source of its meaning. In development mode, omitting `aria-label` / `aria-labelledby` produces a console warning (in a production build this code is tree-shaken away).

## Disabled state

<PreviewFrame title="Disabled state" description="A native button uses the native disabled; other tags use aria-disabled." :code="disabledCode">
  <YueButton disabled>Default</YueButton>
  <YueButton theme="primary" disabled>Primary</YueButton>
  <YueButton variant="outline" disabled>Outline</YueButton>
  <YueButton variant="link" disabled>Link</YueButton>
</PreviewFrame>

- On a `<button>`, `disabled` sets the **native** `disabled`, and the browser blocks the click.
- With an `<a>` or a custom component it uses `aria-disabled="true"` + `tabindex="-1"`, and calls `preventDefault()` in the click handler.
- On a native `<button>` it does **not** add `aria-disabled` as well: the platform already expresses the disabled state, and adding it a second time makes screen readers announce it twice.
- **`loading` is unrelated to this whole set of output.** On any tag it only outputs `aria-busy="true"`, writing neither `aria-disabled` nor `tabindex`: busy is not disabled, and Tab must still reach it in the browser. The difference between the three `<a>` elements in the subsection below can be walked through with Tab directly.

### Rendered as `<a>` or a custom component

<PreviewFrame title="tag" description="A disabled <a> leaves the Tab order; a loading <a> does not — its Tab order is verified key by key in the browser." :code="tagCode">
  <YueButton tag="a" href="#rendered-as-a-or-a-custom-component" data-anchor="plain">View pricing</YueButton>
  <YueButton tag="a" href="#rendered-as-a-or-a-custom-component" loading data-anchor="loading">Submitting</YueButton>
  <YueButton tag="a" href="#rendered-as-a-or-a-custom-component" disabled data-anchor="disabled">View pricing (disabled)</YueButton>
</PreviewFrame>

`tag` accepts any tag name or component. When passing a component, wrap it in `markRaw()`, otherwise Vue turns the component definition into a reactive object too and warns in the console.

The difference between the output of the three, not a word more:

| State | `disabled` | `aria-disabled` | `aria-busy` | `tabindex` |
| --- | --- | --- | --- | --- |
| Plain `<a>` | — | — | — | — |
| `<a>` with `loading` | — | — | `"true"` | — |
| `<a>` with `disabled` | — | `"true"` | — | `"-1"` |
| Native `<button>` + `loading` | — | — | `"true"` | — (a native button never writes `tabindex`) |

During `loading` the click is blocked by the handler's `preventDefault()` (including the anchor jump triggered by Enter on the keyboard), so "still focusable" holds rather than being an optimistic assumption.

## Loading state

<PreviewFrame title="Loading state" description="loading blocks clicks, sets aria-busy and covers the content with the loading layer — but does not set the native disabled." :code="loaderCode">
  <YueButton theme="primary" :loading="submitting" @click="submit">
    {{ submitting ? 'Submitting' : 'Submit' }}
  </YueButton>
  <YueButton loading data-loading-default>Default loading</YueButton>
  <YueButton variant="outline" loading>Outline loading</YueButton>
  <YueButton loading data-loader-custom>
    <template #loader><span class="docs-loader" /></template>
    Custom loading
  </YueButton>
</PreviewFrame>

Clicking the first button shows a real state transition; the last one uses the `loader` slot, which replaces the **indicator**, not the layout.

`loading` and `disabled` deliberately do not reuse the same mechanism:

- `disabled` → the native `disabled`, and the element leaves the focusable sequence.
- `loading` → `aria-busy="true"` + the handler blocking the click, **keeping focus and the tab order**. Pulling focus out from under the user before the request comes back is a worse problem than being clickable.

### Loading does not change the layout

Keeping the content in place with the loading layer on top is not an aesthetic choice; it is what keeps the button the same width before and after the request:

<PreviewFrame title="The same content, one of them loading" description="The two buttons have identical text, icon and size, and only loading differs; the widths are compared pixel by pixel in the browser." :code="loadingStabilityCode" surface-class="preview-frame__surface--stack">
  <YueButton size="lg" data-loading-idle>
    <template #leading>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </template>
    Save changes
  </YueButton>
  <YueButton size="lg" loading data-loading-active>
    <template #leading>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </template>
    Save changes
  </YueButton>
</PreviewFrame>

Three things hold at the same time, and not one of them can be missing:

| Convention | Why |
| --- | --- |
| The content is not unmounted (no `v-if`) | Unmounting would change the width immediately, and would also make the button lose its accessible name while loading |
| The content is hidden with `opacity: 0`, not `display: none` / `visibility: hidden` | The latter two take the text out of the accessibility tree; `opacity` only affects painting |
| The loading layer is `position: absolute; inset: 0` | Completely out of flow; neither the default spinner nor a custom loader stretches the button |

The label should still change from "Submit" to "Submitting": `aria-busy` states "busy", but cannot say what it is busy with, and the spinner is invisible to screen reader users.

## Button groups and segmented controls

Three components, each with one job. **Grouping logic does not go into `YueButton`**: a button does not need to know that the concept of a "group" exists.

- `YueButton` — a single button, `active` is its only switch semantic;
- `YueButtonGroup` — merged radii + `role="group"`, with no selection state;
- `YueButtonToggle` — holds the `v-model` on top of the group;
- `YueButtonToggleItem` — one item is a button for a value.

<PreviewFrame title="Group and segmented control" description="The top two are just stuck together; the bottom two remember which one was selected." :code="groupCode">
  <div class="group-demo">
    <YueButtonGroup aria-label="Alignment">
      <YueButton variant="outline" data-toggle-state="group-left">Left</YueButton>
      <YueButton variant="outline">Center</YueButton>
      <YueButton variant="outline">Right</YueButton>
    </YueButtonGroup>
  </div>
  <div class="group-demo">
    <YueButtonToggle v-model="align" aria-label="Alignment" data-toggle="align">
      <YueButtonToggleItem value="left" variant="outline" data-toggle-item="left">Left</YueButtonToggleItem>
      <YueButtonToggleItem value="center" variant="outline" data-toggle-item="center">Center</YueButtonToggleItem>
      <YueButtonToggleItem value="right" variant="outline" data-toggle-item="right">Right</YueButtonToggleItem>
    </YueButtonToggle>
  </div>
</PreviewFrame>

Currently selected: `{{ align }}`. It changes immediately after a click — this page renders real components, not mock-ups.

A group is **structure**, not a shortcut for "setting eight props at once". It has no `theme` / `variant` / `size`: set those on the buttons inside the group item by item, or, as described in [Overrides and the cascade](#overrides-and-the-cascade), re-point the `--button-*` tokens on the container.

### The visuals and semantics of the selected state

The selected item reads the `--button-selected-*` family that already existed at migration time (`--selected-background` / `--selected-color`); they were already covered by the contrast gates, there was simply no component painting them before.

<PreviewFrame title="Every item is still a button" description="theme / variant / size / loading can each be set on its own; disabled only disables that one item." :code="toggleItemCode" surface-class="preview-frame__surface--stack">
  <YueButtonToggle v-model="viewMode" aria-label="View" data-toggle="view">
    <YueButtonToggleItem value="list" variant="outline" data-toggle-item="list">
      <template #leading>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" stroke-width="1.5" />
        </svg>
      </template>
      List
    </YueButtonToggleItem>
    <YueButtonToggleItem value="grid" variant="outline" data-toggle-item="grid">Grid</YueButtonToggleItem>
    <YueButtonToggleItem value="board" variant="outline" disabled data-toggle-item="board">Board</YueButtonToggleItem>
  </YueButtonToggle>

  <YueButtonGroup aria-label="Text formatting">
    <YueButton variant="text" :active="bold" data-standalone="bold" @click="bold = !bold">Bold</YueButton>
    <YueButton variant="text" :active="italic" data-standalone="italic" @click="italic = !italic">Italic</YueButton>
  </YueButtonGroup>
</PreviewFrame>

| Scenario | What to use |
| --- | --- |
| Several options where **exactly one** must be current (segmented control) | `YueButtonToggle` + `YueButtonToggleItem`; the selected item outputs `aria-pressed="true"` |
| A set of unrelated toggles (bold / italic) | `YueButtonGroup` + each `YueButton`'s own `active` |
| Merely lined up visually | `YueButtonGroup` |

The selection is mandatory: clicking the already selected item again does not deselect it. A segmented control with no "current item" cannot answer "which one is it now"; a group of buttons that can all be turned off is the second scenario above.

::: tip Keyboard navigation is not implemented yet
A group is currently just a set of ordinary Tab stops; arrow keys and a roving tabindex are follow-up work. Changing only the tab order without providing arrow keys would be worse than doing nothing, so this step has no half-finished version.
:::

## Block state

<PreviewFrame title="Block state" description="block makes the button fill the container width." :code="blockCode" surface-class="preview-frame__surface--block">
  <YueButton theme="primary" block>Full-width button</YueButton>
</PreviewFrame>

## Leading / Trailing slots

Icons are passed in through slots and are not bound to any icon library. See [Design / Icon](/en/design/icon) for the complete asset boundary, sizes and accessibility rules.

<PreviewFrame title="Slots" description="leading / trailing are each wrapped in .yue-button__icon, and the size follows size." :code="slotCode">
  <YueButton theme="primary">
    <template #leading>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </template>
    New
  </YueButton>
  <YueButton variant="outline">
    More
    <template #trailing>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </template>
  </YueButton>
</PreviewFrame>

| Slot | Rendered at | Notes |
| --- | --- | --- |
| `default` | `.yue-button__label` | Provide an accessible name separately when it is omitted |
| `leading` | `.yue-button__icon--leading` | Stays in place and is hidden while `loading`; it is not displaced |
| `trailing` | `.yue-button__icon--trailing` | Stays in place and is hidden while `loading` |
| `loader` | `.yue-button__loader` | Replaces the default spinner; rendered inside the absolutely positioned loading layer |

## The interface tables live on the API page

This page only answers "what does it look like and how is it used". The complete tables of Props, Slots, Events and app-level configuration are written in exactly one place, [Button API](./button/api) — copy the same contract twice and one copy is bound to go stale first. **`YueConfig` only has `size`**; language is not in the configuration, it is a locale instance, see the [i18n guide](/en/guide/i18n).

## Dark theme

Switch **Dark** once in the toolbar above — the switch acts on the document root, because in the token contract the light values are defined on `:root` and the dark values on `[data-theme=dark]`: a container nested inside a dark page cannot use `data-theme="light"` to "undo" the inherited dark values back again.

These are the roles that need separate confirmation in dark mode:

| Role | Light | Dark |
| --- | --- | --- |
| `--button-danger-background` | `--red-700` (dark red fill + white text) | `--error` → `--red-300` (light red fill + dark text) |
| `--button-success-background` | `--success` → `--green-700` | `--success` → `--green-400` |
| `--button-success-color` | `--text-inverse` → white | `--text-inverse` → near black |

In other words, saturated fills such as danger / success flip over as a whole in dark mode: the fill gets lighter and the text gets darker. `--text-inverse` is exactly this "inverse content" role, so the success button does not need an extra `--on-success`.

## Accent theme

The **Azure / Neutral** switch in the toolbar writes `data-accent`. In the token contract `azure` is the default scope (there is no corresponding override block), and only `neutral` is a real override — so switching to neutral is the proof that this accent axis is truly wired up.

More than the fill color is affected: `--accent-text`, `--accent-border`, `--on-accent`, and `--link-decoration` (which becomes `underline` under neutral) all follow along, so the Link variant goes from "no underline" to "underlined".

## Token mapping

No bare color value appears in the component styles, and primitive tokens are not read directly either. `--_*` are the component's internal composition slots, each assigned by the Button component tokens below, and theme modifiers only re-point them:

| Composition slot | Assigned by which token (`default` theme) |
| --- | --- |
| `--_fill` | `--button-default-background` |
| `--_fill-hover` | `--button-default-background-hover` |
| `--_fill-pressed` | `--button-default-background-pressed` |
| `--_on-fill` | `--button-default-color` |
| `--_accent` | `--button-default-accent` |
| `--_border` | `--button-default-border-color` |
| `--_radius` | `--button-border-radius` (`round` / `circle` change it to `--button-border-radius-full`) |

| Purpose | Token |
| --- | --- |
| Size steps | `--button-height-{sm,md,lg}`, `--button-padding-inline-{sm,md,lg}`, `--button-font-size-{sm,md,lg}` |
| Geometry | `--button-padding-block`, `--button-padding-inline-flush`, `--button-gap`, `--button-border-width`, `--button-border-radius`, `--button-border-radius-full` |
| Typography | `--button-font-weight`, `--button-line-height` |
| Icons and loading | `--button-icon-size-{sm,md,lg}`, `--button-spinner-border-width`, `--button-spinner-duration` |
| Selected state | `--button-selected-background`, `--button-selected-color`, `--button-selected-border-color`, `--button-selected-background-hover`, `--button-selected-background-pressed` |
| Motion | `--button-duration`, `--button-ease` |
| Focus | `--button-focus-ring-color`, `--button-focus-ring-width`, `--button-focus-ring-offset` |
| Disabled | `--button-disabled-background`, `--button-disabled-color`, `--button-disabled-border-color` |
| Unfilled variants | `--button-subtle-background`, `--button-subtle-background-hover`, `--button-subtle-background-pressed`, `--button-outline-background` |
| Link variant | `--button-link-color`, `--button-link-decoration`, `--button-link-decoration-hover` |

A group introduces no new token: the merged radii read the button's own `--_radius` (assigned by `--button-border-radius` or `--button-border-radius-full`), and the overlapping borders read `--button-border-width`.

## Accessibility notes

- **Native first.** It renders `<button type="button">` by default, so keyboard, focus and form semantics all come from the platform.
- **`disabled` and `aria-disabled` have clearly separated roles.** `<button>` uses the native `disabled`; `<a>` and custom components use `aria-disabled="true"`, together with `tabindex="-1"` to leave the tab order, and the click is blocked in the handler.
- **`loading` takes away neither focus nor the name.** It sets `aria-busy="true"` and intercepts the click, but keeps the element focusable; the content is hidden with `opacity: 0` rather than unmounted, so the button still has an accessible name during the request, and the spinner is an `aria-hidden="true"` decoration.
- **The three states of `active` are intentional.** A button that is not passed `active` does not output `aria-pressed`: a plain button should not be read as a toggle button; only `active=false` means "it is a toggle button and is currently unselected".
- **A segmented control must have a name.** `YueButtonToggle` renders `role="group"`, so pass `aria-label` or use `aria-labelledby` pointing at visible text, and each item inside the group outputs `aria-pressed="true|false"`.
- **`circle` must have an accessible name.** The icon is `aria-hidden`, so use `aria-label`, or have `aria-labelledby` point at visible text. A missing name produces one console warning in development mode.
- **The focus ring comes from tokens.** `:focus-visible` is painted with `--button-focus-ring-*`; neither the width nor the offset is a hard-coded value, and both follow the theme.
- **Respect user preferences.** Under `prefers-reduced-motion: reduce` the transitions and the spinner rotation are turned off, but the static loading cue is kept; under `forced-colors: active` the border switches to the system color `ButtonBorder` and the disabled state uses `GrayText`.

## Overrides and the cascade

The token package declares the layer order, but **the component rules themselves are in no layer**, and this is not an oversight:

> Unlayered styles take precedence over all layers, no matter how high the selector specificity. If the component rules were written into `@layer implementations`, any unlayered reset in the host environment would win over them — VitePress ships `button { background-color: transparent }`, and Tailwind's Preflight and normalize.css are the same. A button placed inside a layer would have its fill color silently disappear in a real project.

So the division of labour is:

| What you want to change | How to do it |
| --- | --- |
| **Systematic** values such as color, size and radius | Re-point the Button component tokens. Tokens live in the `components` layer, so overriding with `@layer demo` is the cleanest and needs no `!important` |
| The density / size within one area | Re-point the component tokens on the container, and the component reads the new values |
| The detail of a single component rule | Write a CSS rule with no lower specificity than it, as usual, and load it after the component styles |

<PreviewFrame title="How to override" description="What changes is the tokens, not the component's CSS selectors." :code="overrideCode" surface-class="preview-frame__surface--stack">
  <YueButton theme="primary">Primary action</YueButton>
  <YueButton variant="outline">Secondary action</YueButton>
</PreviewFrame>

The **Compact** density in the toolbar above demonstrates the second one: it acts on the preview container and re-points only the component tokens inside that area, and the button itself knows nothing about it.

## Trade-offs with TDesign

The reference implementation (`refer/tdesign-common/style/web/components/button`) contains several battle-tested interaction rules worth absorbing, and several that Yue deliberately does not copy. They are recorded one by one here, so that the discussion does not have to be repeated later.

### Adopted

| From the reference implementation | What Yue does |
| --- | --- |
| `touch-action: manipulation` | Adopted directly: it removes the roughly 300ms double-tap zoom delay on mobile without disabling pinch zoom |
| `vertical-align: middle` | Adopted directly: alignment is correct when a button is embedded in a text flow or a table cell |
| `position: relative` | Adopted as **a positioning context inside the box**. Today's spinner and icons are all in flow, so it costs nothing now; without it, any absolutely positioned layer in the future would escape to an unrelated ancestor |
| `hover` and `focus-visible` share a color state | Adopted the **principle** and rewrote the selectors with tokens: keyboard users and mouse users see the same "where am I now" cue. The focus ring is a separate declaration and is always kept |
| `variant="text"` | Adopted the semantics: the full control box is kept (the hit area matches the other buttons), no fill and no border, and hover gives a subtle overlay |
| `variant="dashed"` | Adopted: it shares every value with `outline` and differs only in `border-style`, which suits low-frequency actions such as "Add" |
| `theme="warning"` | Adopted: the semantic layer gains `--action-warning` / `--action-on-warning`, at the same level as `--action-danger` |
| A fixed gap between icon and text | Adopted the **principle**, but continues to use `gap: var(--button-gap)` instead of hard-coding 8px |
| Theme × state matrices for documentation and regression | Adopted: the two matrices above are it, and `verify:visual` measures the contrast cell by cell |

### Not adopted

| What the reference implementation does | Why it is not copied |
| --- | --- |
| `transition: all` | Only the background, border and text color are transitioned. `all` would bring layout properties into the animation too, at the price of performance problems that are hard to trace |
| `overflow: hidden` | It exists to serve the ripple. Yue has no ripple, and adding it would only clip custom content and future local feedback |
| A built-in ripple | It adds component logic and motion complexity; a dependency-free approach is more stable, and a ripple needs `overflow: hidden` to work |
| `outline: none` | It deletes the only position cue a keyboard user has. The reference implementation draws its own focus state; Yue achieves the same effect with `:focus-visible` + focus ring tokens, without touching the browser default behaviour |
| `padding: calc(padding - border width)` | Yue already uses `box-sizing: border-box` and size tokens, so copying this mechanically would make the tokens fight the actual box model |
| `--td-*` tokens and concrete color values | Yue has its own `--button-*` system; copying color values across libraries would make the differences impossible to explain once the two themes evolve separately |
| The `--ghost` modifier (`white-ghost` foreground, for use on dark / colored backgrounds) | Yue's `--button-ghost-*` is the "unfilled" contract fixed at migration time, and it is watched by the audit gates. Changing it into "a button on an inverse background" would directly overturn that contract. If such a button is really wanted, a new set of `--button-on-inverse-*` tokens should be added rather than reusing `ghost` |
| Keeping `text` and `ghost` side by side | The reference implementation's `variant="text"` and Yue's former `ghost` look the same. Two names for one appearance only make users agonise over which to choose — so Yue calls it `text` uniformly |

## Trade-offs with Vuetify

`refer/vuetify` is another reference line: its Button is a large ecosystem component, and its maturity lies in **information architecture** (Usage → API → Anatomy → Props → Variants → Slots → Examples → Accessibility), **state modelling** (`active` / `loading` / `readonly` orthogonal), **context defaults** and **real browser testing**. These four are exactly what Yue absorbs, not its API surface.

### Adopted

| From Vuetify | What Yue does |
| --- | --- |
| Anatomy in the documentation | Adopted: the [Anatomy](#anatomy) at the top of this page, rendered with real `YueButton` components, not a diagram |
| `active` orthogonal to `disabled` / `loading` | Adopted: `active` has three states (not passed / `false` / `true`), independent of disabled and loading |
| A replaceable `loader` slot | Adopted: the default spinner is kept, and a custom indicator renders inside the same absolutely positioned loading layer, without being bound to an icon library |
| The content stays in place while loading (`opacity: 0`) | Adopted: see [Loading does not change the layout](#loading-does-not-change-the-layout) |
| Grouping and selection modelled separately | Adopted, but split more finely: `YueButtonGroup` (structure) / `YueButtonToggle` (`v-model`) / `YueButtonToggleItem` (one value) |
| Consistency checks between API metadata and documentation | Adopted: `pnpm audit:docs` compares the type definitions, the SFCs, the API tables and the props used in the examples |
| Running states and contrast in a browser | Adopted: `verify:visual` measures cell by cell, and this documentation page is the object under test |

### Not adopted

| What Vuetify does | Why it is not copied |
| --- | --- |
| `icon` / `prepend-icon` / `append-icon` string props | They depend on VIcon and an icon registry. Yue explicitly ships no icon library, and the `leading` / `trailing` slots are a better fit for a general-purpose package |
| `elevation` / `ripple` / `position` / `location` / arbitrary size props | Material-only capabilities; the ripple also needs `overflow: hidden`, which would clip custom content |
| Five size steps × five density steps | Yue keeps a small, verifiable set of steps; "this area is more compact" is expressed by re-pointing the `--button-*` tokens on the container |
| A generic defaults Provider, `defaults: { VBtn: { … } }` | Right now only one component needs subtree defaults, and abstracting too early turns one configuration option into a framework layer. The two-level inheritance of `YueConfig` + `provideYueConfig()` is kept for now |
| Sass compile-time theme variables | Yue's CSS tokens and CSS variables support runtime skinning and light / dark mode |
| Stuffing `value` / grouping logic into Button | A button does not need to know that a "group" exists. Grouping is handled by `YueButtonToggle` + `YueButtonToggleItem` |
