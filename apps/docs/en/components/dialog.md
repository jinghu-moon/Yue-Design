# YueDialog

`YueDialog` is a blocking modal surface that asks the user to finish or confirm something before continuing. It owns the focus trap, background `inert` computed per the modal chain, scroll lock, `aria-modal`, conditional return focus, top-most Escape arbitration, and a close guard; menus, tooltips, and non-modal surfaces belong to dedicated components.

<script setup lang="ts">
import { ref } from 'vue'
import { YueButton, YueDialog } from '@yue-ui/vue'
import PreviewFrame from '../../.vitepress/theme/components/PreviewFrame.vue'

const basicOpen = ref(false)
const dangerOpen = ref(false)
const scrollOpen = ref(false)
const guardOpen = ref(false)
const lastReason = ref('Not closed yet')
function recordClose(payload: { reason: string }) {
  lastReason.value = payload.reason
}
async function guard(reason: string) {
  return reason !== 'scrim'
}

const basicCode = `<YueButton @click="basicOpen = true">Open dialog</YueButton>
<YueDialog v-model="basicOpen" title="Sign out" description="Sign out of the current account?" @close="recordClose">
  <p>Body content goes here; the confirm and cancel buttons are built in.</p>
</YueDialog>`

const dangerCode = `<YueButton @click="dangerOpen = true" variant="outline">Delete item</YueButton>
<YueDialog v-model="dangerOpen" title="Delete item" variant="danger" confirm-text="Delete">
  <p>A dangerous action promotes the role to alertdialog and disables Esc and scrim close by default.</p>
</YueDialog>`

const scrollCode = `<YueDialog v-model="scrollOpen" title="Terms of service" :scrollable="true">
  <div class="long-body">A long body scrolls only the body region while header and footer stay pinned.</div>
</YueDialog>`

const guardCode = `<YueDialog v-model="guardOpen" title="Unsaved changes" :before-close="guard">
  <p>Returning false or a rejected Promise from before-close aborts the close.</p>
</YueDialog>`
</script>

<PreviewFrame title="Basic confirmation" description="A real modal: Tab wraps inside the card, the background is inert, and Esc or a scrim click reports its reason." :code="basicCode" surface-class="preview-frame__surface--stack">
  <YueButton @click="basicOpen = true" data-dialog-basic-open>Open dialog</YueButton>
  <YueDialog v-model="basicOpen" title="Sign out" description="Sign out of the current account?" @close="recordClose" data-dialog-basic>
    <p>Body content goes here; the confirm and cancel buttons are built in.</p>
  </YueDialog>
  <span>Last close: {{ lastReason }}</span>
</PreviewFrame>

## Dangerous confirmation

`variant="danger"` promotes the role to `alertdialog` and disables the Esc and scrim channels by default, so the user must answer through a button.

<PreviewFrame title="Delete confirmation" description="The danger variant only allows button closes; the confirm label can override the locale key through confirm-text." :code="dangerCode" surface-class="preview-frame__surface--stack">
  <YueButton @click="dangerOpen = true" variant="outline" data-dialog-danger-open>Delete item</YueButton>
  <YueDialog v-model="dangerOpen" title="Delete item" variant="danger" confirm-text="Delete" data-dialog-danger>
    <p>A dangerous action promotes the role to alertdialog and disables Esc and scrim close by default.</p>
  </YueDialog>
</PreviewFrame>

## Scrolling long content

`scrollable` pins the header and footer and scrolls only the body; when omitted the whole card scrolls.

<PreviewFrame title="Terms body" description="Scroll ownership switches via scrollable, while background scrolling stays locked without layout shift." :code="scrollCode" surface-class="preview-frame__surface--stack">
  <YueButton @click="scrollOpen = true" data-dialog-scroll-open>View terms</YueButton>
  <YueDialog v-model="scrollOpen" title="Terms of service" :scrollable="true" data-dialog-scroll>
    <p v-for="n in 8" :key="n">Clause {{ n }}: a longer paragraph of terms text that shows only the body region scrolls.</p>
  </YueDialog>
</PreviewFrame>

## Close guard

Every close first passes through `before-close(reason)`; returning `false` or a Promise that rejects aborts the close and leaves the controlled state untouched.

<PreviewFrame title="Intercepting a scrim close" description="The guard decides by reason: here it rejects the scrim channel and allows the others." :code="guardCode" surface-class="preview-frame__surface--stack">
  <YueButton @click="guardOpen = true" data-dialog-guard-open>Edit profile</YueButton>
  <YueDialog v-model="guardOpen" title="Unsaved changes" :before-close="guard" data-dialog-guard>
    <p>Clicking the scrim does not close it, because the guard rejects the scrim reason.</p>
  </YueDialog>
</PreviewFrame>

## Typical use

```vue
<YueDialog v-model="open" title="Title" variant="danger" @confirm="remove">
  <p>Body content goes in the default slot.</p>
</YueDialog>
```

The surface teleports to `body` by default; `teleport` can target another node or be set to `false` to keep it in place, and the enter animation flies in from the `trigger`'s centre to the viewport centre (growing in place when there is no `trigger`).

See the [API](./dialog/api) and [Guide](./dialog/guide).
