<script setup lang="ts">
import { ref } from 'vue'
import { YueButton, YuePopover } from '@yue-ui/vue'
import PreviewFrame from '../../.vitepress/theme/components/PreviewFrame.vue'

const open = ref(false)
const filterOpen = ref(false)
const manualOpen = ref(false)
const manualAnchor = ref<HTMLElement | null>(null)
const lastCloseReason = ref('Not closed yet')
function recordClose(payload: { reason: string }) {
  lastCloseReason.value = payload.reason
}

const basicCode = `<YuePopover v-model="open">
  <template #trigger="{ props }">
    <YueButton v-bind="props">Open Popover</YueButton>
  </template>
  <div>Forms, buttons, and other interactive content can go here.</div>
</YuePopover>`

const placementCode = `<YuePopover v-model="filterOpen" placement="bottom-start">
  <template #trigger="{ props }">
    <YueButton v-bind="props" variant="outline">Filters</YueButton>
  </template>
  <div class="popover-panel">
    <strong>Filter options</strong>
    <label><input type="checkbox" checked /> Show active only</label>
    <label><input type="checkbox" /> Include archived</label>
  </div>
</YuePopover>`

const triggerCode = `<YuePopover trigger="hover" role="tooltip" placement="top">
  <template #trigger="{ props }">
    <YueButton v-bind="props" variant="text">Hover for details</YueButton>
  </template>
  <span>Popover can hold interactive content; use a tooltip for plain help.</span>
</YuePopover>

<YuePopover trigger="focus" role="tooltip">
  <template #trigger="{ props }">
    <YueButton v-bind="props" variant="text">Focus for details</YueButton>
  </template>
  <span>It closes when focus leaves the trigger and content.</span>
</YuePopover>`

const manualCode = `<button ref="manualAnchor" type="button">External anchor</button>
<YuePopover
  v-model="manualOpen"
  trigger="manual"
  :anchor="manualAnchor"
  placement="right"
>
  <div>Without a trigger slot, anchor supplies the positioning reference.</div>
</YuePopover>
<YueButton variant="outline" @click="manualOpen = !manualOpen">
  {{ manualOpen ? 'Close' : 'Open' }}
</YueButton>`

const closeCode = `<YuePopover
  close-on-content-click
  @close="recordClose"
>
  <template #trigger="{ props }">
    <YueButton v-bind="props">Close after content click</YueButton>
  </template>
  <button type="button">Complete and close</button>
</YuePopover>
<span>Last close: {{ lastCloseReason }}</span>`
</script>

# YuePopover

`YuePopover` is a non-modal detached surface for interactive content near a trigger. It owns positioning, collision handling, Teleport, outside/Escape closing, stacking, and conditional focus restoration. Menu navigation, modal dialog behavior, and tooltip-specific policy belong to dedicated components.

<PreviewFrame title="Basic interaction" description="A real Teleport surface: click the trigger to open, Escape or an outside click to close." :code="basicCode">
  <YuePopover v-model="open" data-popover-root aria-label="Example popover">
    <template #trigger="{ props }">
      <YueButton v-bind="props" data-popover-trigger>Open Popover</YueButton>
    </template>
    <div aria-label="Example content" data-popover-content>Forms, buttons, and other interactive content can go here.</div>
  </YuePopover>
</PreviewFrame>

## Placement and interactive content

Popover keeps content near its anchor. `placement` is the preferred position; it flips and shifts when space is limited. Form controls inside the panel remain real consumer-owned controls.

<PreviewFrame title="Filter panel" description="bottom-start aligns a panel with the button edge; content clicks do not close it by default." :code="placementCode" surface-class="preview-frame__surface--stack">
  <YuePopover v-model="filterOpen" placement="bottom-start" data-popover-placement="bottom-start" aria-label="Filter panel">
    <template #trigger="{ props }">
      <YueButton v-bind="props" variant="outline">Filters</YueButton>
    </template>
    <div class="popover-panel">
      <strong>Filter options</strong>
      <label><input type="checkbox" checked /> Show active only</label>
      <label><input type="checkbox" /> Include archived</label>
    </div>
  </YuePopover>
</PreviewFrame>

## Trigger modes

Use `click` for stable action panels, and `hover` or `focus` for short explanations. Each mode uses the same trigger slot props, so events are not attached to an unintended element.

<PreviewFrame title="Hover and focus" description="The tooltip role changes the ARIA relationship; it does not add menu or dialog behavior." :code="triggerCode">
  <YuePopover trigger="hover" role="tooltip" placement="top" data-popover-hover>
    <template #trigger="{ props }">
      <YueButton v-bind="props" variant="text">Hover for details</YueButton>
    </template>
    <span>Popover can hold interactive content; use a tooltip for plain help.</span>
  </YuePopover>

  <YuePopover trigger="focus" role="tooltip" data-popover-focus>
    <template #trigger="{ props }">
      <YueButton v-bind="props" variant="text">Focus for details</YueButton>
    </template>
    <span>It closes when focus leaves the trigger and content.</span>
  </YuePopover>
</PreviewFrame>

## External anchor and manual control

When there is no trigger slot, `anchor` supplies the positioning reference. `trigger="manual"` installs no automatic open/close events; the consumer owns the state.

<PreviewFrame title="manual + anchor" description="A native element can be the anchor while the surface keeps the same collision and Teleport behavior." :code="manualCode" surface-class="preview-frame__surface--stack">
  <button ref="manualAnchor" type="button">External anchor</button>
  <YuePopover v-model="manualOpen" trigger="manual" :anchor="manualAnchor" placement="right" data-popover-manual aria-label="External anchor content">
    <div>Without a trigger slot, anchor supplies the positioning reference.</div>
  </YuePopover>
  <YueButton variant="outline" @click="manualOpen = !manualOpen">
    {{ manualOpen ? 'Close' : 'Open' }}
  </YueButton>
</PreviewFrame>

## Close policy and events

Use `close-on-content-click` for short flows that finish after a selection. The `close` event reports `trigger`, `outside`, `escape`, or `programmatic` as its reason.

<PreviewFrame title="Close after content click" description="The event payload lets the consumer record the reason or decide what happens next." :code="closeCode" surface-class="preview-frame__surface--stack">
  <YuePopover close-on-content-click @close="recordClose" data-popover-close>
    <template #trigger="{ props }">
      <YueButton v-bind="props">Close after content click</YueButton>
    </template>
    <button type="button">Complete and close</button>
  </YuePopover>
  <span>Last close: {{ lastCloseReason }}</span>
</PreviewFrame>

## Typical use

```vue
<YuePopover placement="bottom-start">
  <template #trigger="{ props }">
    <YueButton v-bind="props">Filters</YueButton>
  </template>
  <FilterPanel />
</YuePopover>
```

The component flips and shifts when space is limited and updates when the viewport, scroll container, or content size changes.

See the [API](./popover/api) and [Guide](./popover/guide).
