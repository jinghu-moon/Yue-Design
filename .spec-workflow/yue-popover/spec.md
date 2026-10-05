# YuePopover 组件规格

> 状态：已冻结 · 日期：2026-10-04
> 访谈来源：`interviews/yue-popover/answers.json`
> 规格冻结确认：第 41 题选择 A。第 38 题的“继续访谈”被第 39–41 题的调研结果和最终确认覆盖。

## Reference materials

**参考实现**：Vuetify `VOverlay` / `VMenu` / `useActivator` / location and scroll strategies、Floating UI `@floating-ui/dom`、ChengJing `SelectMenu`、TDesign `Popup`（`refer/tdesign-common/style/web/components/popup/`）。

| 来源 | 借鉴内容 | 拒绝内容 |
| --- | --- | --- |
| Vuetify | 把 activator、定位、scroll strategy、stack、Teleport、focus restore 拆成无语义 composables；嵌套 overlay 按打开顺序协调 outside 与关闭级联 | 把 `VOverlay` 的全部 props 形状搬进 YuePopover；scrim、modal、router/back-button 和菜单专用行为不属于本组件 |
| Floating UI | `computePosition`、`flip`、`shift`、`size`、`autoUpdate`、clipping ancestors、RTL 与虚拟 reference 的成熟边界处理 | 不向 Yue 消费者暴露 Floating UI 类型或 middleware；不直接把第三方 `useFloating` 返回值当作 Yue 公共 API |
| ChengJing | 明确的 placement 候选、真实内容测量、滚动/resize 更新、嵌套浮层需求 | `checkFit/calculateCoords` 只覆盖有限 viewport 情况；不复制第二套定位算法，也不把菜单键盘导航塞入 Popover |
| TDesign Popup | 入场动效机制：`clip-path` 逐帧 reveal（沿主轴从面向 trigger 的那条边展开）+ 同时淡入；静止多边形向外过冲（`-20%`/`120%`）以免裁掉阴影；动画只写 `clip-path`/`opacity` 而不碰 `transform` | 不引入 `expandAnimation` 开关 prop——Yue 只保留一种入场动效，调用方不选动画；不只覆盖 top/bottom 两侧（TDesign 的 `right` 变体在源码中被注释掉），而是把同一条规则推到四个 placement 以匹配 flip 后的 `data-placement`；时长/缓动继续走 Yue 的 motion token，不采用 `0.2s` + `cubic-bezier(.38,0,.24,1)` 字面值，因此 leave 仍为 `--popover-duration-exit` 的 100ms而非 TDesign 的对称 200ms |

## Identity

- **组件名**：`YuePopover`
- **包入口**：`@yue-ui/vue`；新增 `@yue-ui/vue/popover` 与 `@yue-ui/vue/popover.css`
- **分类**：Drive `template`；Position `detached`；Lifecycle `transient`（默认关闭时卸载，`persistent` 时保留）；Composition `atomic`（公开 API）
- **最近已有 Yue 组件**：`YueButton`（trigger 的原生按钮语义和 slot props 绑定）
- **基础层定位**：Popover 是共享 overlay 行为的公开基础组件；Menu、Select、Tooltip、Dialog 复用无语义 hooks，而不是通过 props 把所有语义集中到 Popover。
- **定位基础**：`@floating-ui/dom` 是 `@yue-ui/vue` 的内部运行时依赖。Yue 自己封装 Vue 3 响应式、Teleport、open ownership、ARIA、outside、stack、focus restore 和 close reason。

## Problem and use cases

**YuePopover** 在触发元素附近展示可交互的补充内容，同时可靠处理 detached DOM、碰撞翻转、滚动重定位、outside/Escape 关闭和焦点恢复。它是一个可复用的非模态浮层基础，不承担 Menu、Tooltip 或 Dialog 的专用键盘和模态语义。

```vue
<!-- Use case 1: click trigger + interactive content -->
<YuePopover>
  <template #trigger="{ props }">
    <YueButton v-bind="props">更多操作</YueButton>
  </template>
  <div>可放置表单、按钮或其他交互内容</div>
</YuePopover>

<!-- Use case 2: controlled open state and close reason -->
<YuePopover v-model="open" @close="onClose">
  <template #trigger="{ props }"><YueButton v-bind="props">筛选</YueButton></template>
  <FilterPanel @done="open = false" />
</YuePopover>

<!-- Use case 3: manual mode with an external anchor -->
<YuePopover v-model="open" trigger="manual" :anchor="anchorEl" placement="bottom-start">
  <HelpContent />
</YuePopover>

<!-- Use case 4: focus reference for a non-modal explanatory surface -->
<YuePopover trigger="focus" role="tooltip" :close-on-content-click="false">
  <template #trigger="{ props }"><button v-bind="props">字段说明</button></template>
  <span>该字段的补充说明</span>
</YuePopover>
```

## Explicit non-features

- [ ] **Imperative create/open API** — template usage plus `defineExpose` methods covers the use cases; a global promise API would create a second ownership model
- [ ] **Public `YuePopoverTrigger` / `YuePopoverContent` / `YuePopoverArrow` components** — keep the public surface atomic; internal hooks remain reusable
- [ ] **Menu keyboard navigation, type-ahead, roving tabindex** — belongs to `YueMenu`, which owns the APG menu pattern
- [ ] **Dialog focus trap, modal scrim, inert background and modal back-button behavior** — belongs to `YueDialog`
- [ ] **Tooltip-specific timing and non-interactive content policy** — `role="tooltip"` is an escape hatch for a simple surface; `YueTooltip` owns hover delays and tooltip semantics
- [ ] **Arrow rendering** — no arrow in this slice; later arrow support must add its own token and browser gate
- [ ] **Consumer-facing Floating UI middleware or types** — Yue exposes its own placement/offset contract
- [ ] **Built-in close button or locale text** — content and accessible naming are supplied by the consumer; this component adds no i18n key

## API draft

### Public types

```ts
export type YuePopoverPlacement =
  | 'top' | 'top-start' | 'top-end'
  | 'right' | 'right-start' | 'right-end'
  | 'bottom' | 'bottom-start' | 'bottom-end'
  | 'left' | 'left-start' | 'left-end'

export type YuePopoverTrigger = 'click' | 'hover' | 'focus' | 'manual'
export type YuePopoverCloseReason = 'trigger' | 'outside' | 'escape' | 'programmatic'
export type YuePopoverRole = 'dialog' | 'tooltip' | 'presentation'
export type YuePopoverAnchor = HTMLElement | (() => HTMLElement | null)
```

`@floating-ui/dom` `Placement`, `VirtualElement`, `Middleware` and result objects are internal implementation types and are not re-exported.

### Props

| Prop | Type | Default | Controlled? | Governs |
| --- | --- | --- | --- | --- |
| `modelValue` | `boolean` | `undefined` | yes when present | open state; emits `update:modelValue` |
| `defaultOpen` | `boolean` | `false` | no | initial state in uncontrolled mode |
| `trigger` | `YuePopoverTrigger` | `'click'` | no | event policy for the trigger slot |
| `anchor` | `YuePopoverAnchor \| undefined` | `undefined` | no | external reference when no trigger slot is used |
| `placement` | `YuePopoverPlacement` | `'bottom'` | no | preferred placement; Floating UI may return a flipped placement |
| `offset` | `number` | `8` | no | gap between reference and floating content, in CSS pixels |
| `teleport` | `boolean \| string \| HTMLElement` | `'body'` | no | `false` keeps content in place; string/element is the Teleport target |
| `persistent` | `boolean` | `false` | no | keeps closed content mounted when true |
| `closeOnOutside` | `boolean` | `true` | no | closes on pointerdown outside trigger/content |
| `closeOnEscape` | `boolean` | `true` | no | closes the topmost instance on Escape |
| `closeOnContentClick` | `boolean` | `false` | no | closes after a click inside content |
| `restoreFocus` | `boolean` | `true` | no | restores the opening trigger only when focus still belongs to this interaction |
| `role` | `YuePopoverRole` | `'dialog'` | no | content ARIA role; role changes do not add Menu/Dialog behavior |
| `disabled` | `boolean` | `false` | no | prevents trigger-driven opening and forces closed |

When `modelValue` is present, internal requests emit `update:modelValue` and do not mutate the source of truth independently. When absent, the component owns a ref initialized from `defaultOpen`.

### Emits

| Event | Payload | When |
| --- | --- | --- |
| `update:modelValue` | `boolean` | a user or programmatic request changes controlled open state |
| `open` | `{ trigger: Event \| undefined }` | the state becomes open after the request is accepted |
| `close` | `{ reason: YuePopoverCloseReason; event?: Event }` | the state becomes closed or a close request is accepted |
| `after-open` | `void` | enter transition has completed |
| `after-close` | `void` | leave transition has completed; transient content is then unmounted |

Event ordering is stable: `update:modelValue` (if controlled) → `open`/`close` → transition → `after-open`/`after-close`. A duplicate request for the already reached state emits nothing.

### Slots

| Slot | Scope | Purpose |
| --- | --- | --- |
| `trigger` | `{ props, isOpen, open, close, toggle }` | optional reference/trigger. `props` carries id, `aria-expanded`, `aria-controls`, and trigger handlers |
| `default` | `{ isOpen, close }` | detached content; the consumer supplies the accessible name/description where required |

If `trigger` is omitted, `anchor` is required for automatic positioning. `trigger="manual"` may be used with either a trigger slot or an external anchor; it installs no automatic open/close handlers.

### Expose

```ts
open(): void
close(reason?: 'programmatic'): void
toggle(): void
updatePosition(): Promise<void>
```

No DOM nodes or Floating UI objects are exposed. `updatePosition()` is the escape hatch for content whose size changes outside a reactive update; normal open/scroll/resize updates are automatic.

### Attribute routing

- `inheritAttrs: false`.
- `class` and `style` fall through to the floating content root.
- `id`, `role`, `aria-*`, `data-*` and other non-event attrs fall through to the floating content root, subject to the required ARIA relationship.
- Trigger attrs and event handlers are provided through the `trigger` slot's `props`; they are never silently attached to an unrelated element.

## Accessibility

- **Role**: floating content defaults to `role="dialog"`; `role="tooltip"` is allowed for non-interactive explanatory content; `role="presentation"` removes the component's dialog semantics when the consumer supplies an alternative relationship. Dedicated Menu/Dialog/Tooltip components own their complete APG semantics.
- **APG**: [Dialog (non-modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) for the default interactive surface; [Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) only for the explicit tooltip role.
- **Required accessible name**: default dialog must receive `aria-label` or `aria-labelledby`; the component does not invent visible text or locale labels. Trigger receives `aria-expanded` and `aria-controls`.
- **Keyboard behavior**:

| Key / target | Action | Prevent default | Event |
| --- | --- | --- | --- |
| `Enter` / `Space` on native trigger | browser activates the trigger; click policy toggles | native behavior only | `open`/`close` through click |
| `Escape` while topmost and `closeOnEscape` | close and conditionally restore trigger focus | yes when handled | `close({ reason: 'escape' })` |
| `Tab` in content | natural document focus order; no trap | no | none |
| direction keys | no Popover behavior | no | none |

- Opening does not steal focus by default. Closing restores the trigger only if it still owns the interaction focus; an outside click that moved focus elsewhere must not steal it back.
- Nested instances use a stack: Escape and outside handling affect the topmost instance, and clicks inside a child do not close its parent.
- `disabled` is communicated through `aria-disabled` on the trigger slot props; disabled instances do not open.
- A forced-colors rule must preserve content boundary and focus visibility with system colors. Reduced-motion uses the existing motion tokens and removes enter/leave animation when requested.
- Enter motion is a `clip-path` reveal anchored to the trigger: the surface collapses onto the edge that faces its trigger and grows back to the full rect while fading in. The starting edge is derived from `data-placement`, which carries the flipped placement, so a `bottom` surface unfolding downward and one that flipped to `top` unfold in opposite directions. The resting polygon overhangs the box so the shadow is never clipped, and no `clip-path` may remain after the animation. The motion must not write `transform` — Floating UI owns that property. The earlier scale/translate model was rejected, not kept: a 2% `scale` plus a 4px slide is below the perception threshold, and tuning its origin and direction per placement could not fix what the mechanism itself could not express.

## Token intent

Add `packages/tokens/src/component-tokens/popover.css`; component CSS must not read primitive tokens directly.

| Axis | Token consumed | Notes |
| --- | --- | --- |
| Surface | `--popover-background` | semantic raised surface |
| Text | `--popover-color` | semantic text role |
| Border | `--popover-border-color`, `--popover-border-width` | visible boundary without relying only on shadow |
| Shape | `--popover-border-radius` | component token grammar |
| Type | `--popover-font-size` | delegates to `--box-font-size-popover` → `--font-size-md` (14px); the surface owns its own type instead of inheriting the host page's body size |
| Spacing | `--popover-padding` | content inset; runtime `offset` is geometry, not a token value |
| Elevation | `--popover-shadow`, `--popover-z-index` | default non-modal overlay level |
| Motion | `--popover-duration-enter/exit`, `--popover-ease` | resolve to motion semantics; reduced motion must be zero-duration; the reveal start/end polygons are component-internal `--_popover-reveal-*` values, not public tokens |

No arrow token is added in this slice. Token names and values must pass token grammar, contrast, and unresolved-reference gates.

## i18n

No built-in user-facing strings are rendered by YuePopover, so no locale key is added. Trigger labels, dialog names, and content text are consumer-owned and must follow the consumer's i18n system.

## File structure (planned)

```text
packages/hooks/src/overlay/
  types.ts                 # neutral close/placement contracts
  useFloatingPosition.ts   # @floating-ui/dom adapter
  useOverlayStack.ts       # topmost/Escape/nested ownership
  useOutsidePointer.ts     # pointerdown boundary and cleanup
  useFocusRestore.ts       # conditional restore target
  useTeleportTarget.ts     # SSR-safe target resolution

packages/vue/src/components/popover/
  YuePopover.vue
  types.ts
  index.ts
  style.css

packages/tokens/src/component-tokens/popover.css
apps/docs/components/popover.md
apps/docs/components/popover/api.md
apps/docs/components/popover/guide.md
```

The exact hook split may change during implementation only if public behavior and ownership remain unchanged; API changes require updating this spec first.

## Verification contract

- **Unit**: controlled/uncontrolled ownership; trigger modes; duplicate request suppression; close reasons and event ordering; disabled; transient/persistent mounting; nested stack; SSR `renderToString` without browser globals; stable ids.
- **Browser**: real Chromium assertions for every placement, flip and shift near viewport edges; Teleport target; content resize; scroll and resize cleanup; outside pointer; topmost Escape; conditional focus restore; nested popover; reduced-motion and forced-colors behavior; axe scan for representative interactive content.
- **Package**: typecheck, build, API-docs parity, token audit, dist/treeshaking, tarball install and a consumer using only `@yue-ui/vue/popover` plus its CSS entry.
- **Negative probes**: missing accessible name for default dialog, leaking Floating UI types, direct primitive-token reads, stale listeners after close/unmount, child click closing parent, and a hand-written positioning fallback must fail a gate or review check.

## Breaking changes

N/A — new component. The public API is nevertheless frozen before implementation; changing a prop, event, slot, role default, dependency boundary or non-feature requires a spec amendment before code changes.

## Open questions

None for this slice. Arrow support, Menu/Dialog/Tooltip specialized components, modal behavior and imperative APIs require separate component specs.
