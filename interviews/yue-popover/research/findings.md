# YuePopover findings

## Floating UI adapter boundary

`@floating-ui/dom` is the framework-neutral positioning core. `@floating-ui/vue`
adds Vue composables and lifecycle integration. Yue already owns Vue 3 lifecycle,
Teleport, ARIA, outside handling and focus restoration, so the component should
use the DOM core internally and keep Floating UI types out of the public API.

Evidence is recorded in `data.js` as `finding-floating-ui-adapters` and linked to
questions 39 and 40.
