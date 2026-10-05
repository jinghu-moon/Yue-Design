# YueDialog 组件规格

> 状态：已冻结 · 日期：2026-10-04
> 访谈来源：`interviews/yue-dialog/answers.json`（31 题，schema v2）；快照 `history/answers-r001.json`、`history/answers-r003-round4.json`
> 调研证据：`interviews/yue-dialog/research/sources.md`
> 冻结确认：面板 freeze gate 选择 Freeze；用户确认「1 按 Q23=C，2 Q16 数值延后原型」。
> 决策覆盖记录：**Q5=B 被 Q23=C 覆盖**（同一"运行时归属"轴，Q23 为后提出且专为此冲突而生）。Q3=C 的备注由 Q23=C 定性为"底座复用"，非"嵌套场景"。

## Reference materials

**参考实现**：Vuetify `VOverlay` / `VDialog` / `composables/stack.ts` / `composables/focusTrap.ts` / `VOverlay/scrollStrategies.ts`（三级分层、栈、focus trap、滚动锁最完整）；Ant Design `Modal`（`useId` 标题绑定、z-index 栈、mask/panel 动画分离、语义槽 classNames）；TDesign `Dialog`（DOM 五层职责、same-target 点击判定、IME/顶层键盘仲裁）。均只提取设计意图，不复制类名/token 名/prop 名/内部实现。

| 来源 | 借鉴内容 | 拒绝内容 |
| --- | --- | --- |
| Vuetify | 底座(运行时)→模态(语义+默认值)→形态(sheet) 三级分层；栈 `z = 全局栈顶 + step`、空栈回落基值；关闭权分配 Esc→全局顶层、外点→局部顶层且必须落在自身遮罩；focus trap 的 Tab 环回 + 捕获拉回两条路线；滚动锁的祖先去重/解锁临时关平滑/内联边距补偿；滚动归属三态纯样式实现；reduced-motion 退化 | 588 行定位策略（dialog 只需弹性居中）、408 行 useActivator 的 hover/focus/click 矩阵、`_disableGlobalStack` 私有逃生口、用 DOM 类名判组件身份、同一回焦职责三处各写一遍、遮罩与内容动画不同步 |
| Ant Design | 可访问名用框架稳定 id 自动生成并绑定标题；focus trap 默认值由模态语义派生；z-index 栈基值只在顶层生效、嵌套不叠加；动作回调返回 promise 自动 pending；离场结束为唯一卸载点；语义槽 classNames/styles 函数式读取 props；`wireframe` 一开关切两套结构 | 命令式静态方法与模板式并存的整套代价（contextHolder/模块级 destroyFns/异步渲染补丁）；confirm 把真实标题 `display:none`；role 恒为 dialog 连破坏性确认也不升 alertdialog；`aria-describedby` 缺失；行为靠回调形参个数决定 |
| TDesign | DOM 五层职责分离；点击关闭热区落对齐层并要求 mousedown/mouseup 同点；键盘渠道 isComposing 保护 + 顶层判定；lazy/关闭保留/关闭销毁三档正交卸载；遮罩与内容动画分离 | 无障碍完全空缺（无 role/aria-modal/可访问名，关闭键不可 Tab 到达）；打开主动 blur 无 trap 无回焦；`mode` 一个 prop 绑死遮罩/定位/拖拽/锁滚；锁滚注入 `html body{}` 高优先级样式 + `width:calc(100%-Npx)`；CSS 0.2s/JS 300ms 双时长源导致事件比视觉晚 100ms；Web 端无运行时 token 变量 |

## Identity

- **组件名**：`YueDialog`
- **包入口**：`@yue-ui/vue`；新增 `@yue-ui/vue/dialog` 与 `@yue-ui/vue/dialog.css`
- **分类**：Drive `template`（命令式确认流程延后为独立可选入口，见 non-features）；Position `detached`；Lifecycle `transient`（默认关闭即卸载，`persistent` 保留）；Composition `atomic`（公开 API）
- **最近已有 Yue 组件**：`YuePopover`（同为 detached overlay，但 Dialog 不以 Popover 为底座，两者共享 hooks 层）
- **运行时归属（Q23=C，覆盖 Q5=B）**：只有全局/局部顶层谓词与栈序列（`registerOverlay` / `isTopOverlay`）抽入 `packages/hooks/src/overlay/stack.ts`，由 `YueDialog` 与 `YuePopover` 共同消费——这兑现了 Popover spec 承诺的“Menu/Select/Tooltip/Dialog 复用无语义栈”。teleport 目标解析、回焦、滚动锁等**模态运行时目前只被 Dialog 消费，依仓库规则“shared logic 须有第二消费者才进 hooks”内联在 `YueDialog.vue`**，不预先下沉（出现第二消费者时再提）。
- **模态语义归属**：focus trap、模态遮罩、背景不可达、`aria-modal`、滚动锁、破坏性确认语义是 **YueDialog 独有**，不下沉进 hooks 层，也不回流 Popover。

## Problem and use cases

**YueDialog** 承载需要用户专注完成或确认的任务（表单、详情、破坏性确认），提供真正的模态能力：焦点被可靠锁在 dialog 内、背景视觉与可达性都不可操作、背景页面滚动被锁定、关闭可被程序化否决、关闭后焦点按规则回归。它不承担锚定式浮层（Menu/Tooltip/Select）的定位职责。

```vue
<!-- Use case 1: 受控表单弹窗，独立上下文（视口居中） -->
<YueDialog v-model="open" title="编辑资料" @confirm="save">
  <ProfileForm />
</YueDialog>

<!-- Use case 2: 破坏性确认，danger variant → alertdialog + 默认禁 Esc/遮罩 -->
<YueDialog v-model="confirmOpen" variant="danger" title="删除项目" description="此操作不可撤销" @confirm="doDelete" />

<!-- Use case 3: trigger 上下文，入场从触发器中心飞入（FLIP），关闭前否决未保存改动 -->
<YueDialog v-model="editOpen" :trigger="anchorBtn" :before-close="guardUnsaved">
  <template #header>附件预览</template>
  <AttachmentViewer />
</YueDialog>

<!-- Use case 4: fullscreen（移动端形态），正文滚动、头脚固定 -->
<YueDialog v-model="detailOpen" fullscreen scrollable title="订单详情">
  <OrderTimeline />
</YueDialog>

<!-- Use case 5: 自定义动作区，footer 插槽完全由消费者接管（不触发内置 locale 键渲染） -->
<YueDialog v-model="open" title="导入数据">
  <ImportPanel />
  <template #footer="{ close }"><button @click="close('programmatic')">稍后再说</button></template>
</YueDialog>
```

## Explicit non-features

- [ ] **命令式 `YueDialog.confirm()` / `mountDialog()` 主 API**（Q18=C）— reason：命令式双轨在参照系里代价最高（另起组件树、模块级销毁列表、异步渲染补丁）。确认流程留给**独立可选入口**，且其卸载信号必须是真实 after-close 而非硬编码延时；主组件 API 保持纯模板式。
- [ ] **锚定定位 / placement / flip（Popover 式）**（Q3=A→C 范围内仍不含锚定）— reason：dialog 只需视口居中或 fullscreen；锚定留给 Menu/Tooltip。
- [ ] **可拖拽、侧滑抽屉、底部 sheet 形态**（Q2=C 只含 modal + fullscreen）— reason：拖拽是 TDesign 的病根之一，抽屉/sheet 是独立组件。
- [ ] **点击 dialog 外任意位置关闭 / 浏览器返回键关闭**（Q6 排除 D、E）— reason：外点会吃掉背景页面合法交互；返回键属路由集成，另立议题。
- [ ] **背景页面滚动穿透时的坐标存取/横向补偿**（Q20=B）— reason：改用 `overflow:clip + scrollbar-gutter:stable` 从源头消除跳动，不做坐标存取；不支持该组合的浏览器接受轻微位移。
- [ ] **向消费者公开 overlay 栈实现、内部 z-index 计算、Floating UI / hooks 内部类型**（Q21=B、Q27=B）— reason：栈与层叠上下文是内部机制。
- [ ] **RTL 镜像、路由集成、多步向导 stepper 语义** — 本切片不含；后续独立处理。

## API draft

### Public types

```ts
export type YueDialogVariant = 'default' | 'danger'          // danger → role=alertdialog + 图标/主按钮样式 + 默认禁 Esc/遮罩（Q26=B）
export type YueDialogSurface = 'modal' | 'fullscreen'        // Q2=C
export type YueDialogSize = 'sm' | 'md' | 'lg' | 'xl'         // 宽度档位（Q17=C）
export type YueDialogCloseReason = 'confirm' | 'cancel' | 'close-btn' | 'escape' | 'scrim' | 'programmatic'
export type YueDialogBeforeClose = (reason: YueDialogCloseReason) => boolean | Promise<boolean>
```

### Props

| Prop | Type | Default | Controlled? | Governs |
| --- | --- | --- | --- | --- |
| `modelValue` | `boolean` | `undefined` | **yes（Q4=A，唯一真相源）** | open state；所有关闭渠道只 emit `update:modelValue`，不自行改写 |
| `title` | `string` | `undefined` | no | 内置标题；自动 `aria-labelledby` 绑定（Q13=B） |
| `description` | `string` | `undefined` | no | 可选副文案，参与 `aria-describedby`（Q13=B 之上） |
| `variant` | `YueDialogVariant` | `'default'` | no | 危险/普通语义切换（Q26=B） |
| `surface` | `YueDialogSurface` | `'modal'` | no | 形状：居中卡片（modal）/ 整屏（fullscreen）（Q2=C）。**不决定模态性**（B2）——两者默认都模态，模态性由 `modeless` 单独控制 |
| `size` | `YueDialogSize` | config 或 `'md'` | no | `--dialog-width-*` 档位（Q17=C） |
| `width` | `string \| number` | `undefined` | no | 显式覆盖档位；仍受 `--space` 安全边距约束（Q17=C） |
| `scrollable` | `boolean` | `false` | no | 正文滚动、头脚固定；否则整卡滚动（Q19=C） |
| `persistent` | `boolean` | `false` | no | 整体禁止非按钮关闭（禁 Esc + 遮罩），并保留内容挂载（Q24=A） |
| `closeOnEscape` | `boolean` | `variant !== 'danger'` | no | 是否响应 Esc（Q6=B，danger 默认关） |
| `closeOnScrim` | `boolean` | `variant !== 'danger'` | no | 是否响应遮罩点击（Q6=C，danger 默认关） |
| `beforeClose` | `YueDialogBeforeClose` | `undefined` | no | 关闭前否决，可返回 false/Promise（Q7=B） |
| `confirmText` | `string` | locale `dialog.confirm` | no | 内置确认按钮文案（Q14=C） |
| `cancelText` | `string` | locale `dialog.cancel` | no | 内置取消按钮文案（Q14=C） |
| `close` | `boolean \| { ariaLabel?: string }` | `true` | no | 右上角 icon-only 关闭键；可访问名取 locale `dialog.closeLabel`（Q15=B） |
| `teleport` | `boolean \| string \| HTMLElement` | `'body'` | no | 挂载目标（复用 overlay hooks） |
| `trigger` | `HTMLElement \| (() => HTMLElement \| null)` | `undefined` | no | trigger 上下文；驱动入场飞入原点与回焦默认目标（Q3=C、Q25 修订为 FLIP 飞入） |
| `restoreFocus` | `boolean` | `true` | no | 关闭后按条件回焦（Q12=B） |
| `ariaLabel` | `string` | `undefined` | no | 显式可访问名，优先级高于自动 `aria-labelledby`（Q13=B） |
| `modeless` | `boolean` | `false` | no | 非模态表面：不加 `aria-modal`、不 inert 背景、不锁滚、不 trap 焦点（C5；与 `surface` 解耦，见 B2） |
| `loading` | `boolean` | `false` | no | 强制确认按钮进入忙态（spinner + 禁用）并屏蔽 Esc/遮罩；`beforeClose` 返回 pending Promise 时自动进入（C1） |
| `showConfirm` | `boolean` | `true` | no | 是否渲染内置确认按钮（C2；与 `showCancel` 皆 `false` 时整个 footer 消失） |
| `showCancel` | `boolean` | `true` | no | 是否渲染内置取消按钮（C2） |
| `lazy` | `boolean` | `false` | no | 首次打开前不实例化内容，之后跨关闭保持挂载（C4） |
| `classNames` | `YueDialogClassNames` | `undefined` | no | 按结构部件（overlay/scrim/panel/header/body/footer/close）合并类名（C3） |
| `styles` | `YueDialogStyles` | `undefined` | no | 按结构部件合并内联样式（C3） |

受控语义：`modelValue` 存在即为唯一真相源，任何关闭请求只 emit，绝不自行变更；不存在时组件内部持有以 `false` 初始化的 ref。danger（`variant='danger'`）会派生 `role=alertdialog` 与关闭渠道默认值，但显式 prop 优先。

### Emits

| Event | Payload | When |
| --- | --- | --- |
| `update:modelValue` | `boolean` | 任一渠道的关闭请求或打开被接受 |
| `open` | `void` | 状态转为 open 后 |
| `close` | `{ reason: YueDialogCloseReason; event?: Event }` | 请求进入关闭流程（beforeClose 之前） |
| `confirm` | `void` | 点击内置确认按钮（先走 beforeClose('confirm')） |
| `closed` | `{ reason }` | 状态确认为 closed |
| `after-open` | `void` | 入场动效完成 |
| `after-close` | `void` | 离场动效完成（真实 transitionend 驱动）；transient 内容随后卸载（Q30=A） |

顺序稳定：`close`（请求）→ `beforeClose` 裁决 → `update:modelValue`（受控）→ 动效 → `after-close`。重复请求同状态不 emit。

### Slots

| Slot | Scope | Purpose |
| --- | --- | --- |
| `header` | `{ titleId }` | 标题区；缺省用 `title` prop 自动生成带 id 的标题 |
| `default` | `{ close }` | 正文内容 |
| `footer` | `{ close, confirm, cancel }` | 动作区；**缺省时渲染内置确认/取消按钮（触发 locale 键）**，传入则完全由消费者接管、不渲染内置文案 |
| `close-icon` | — | 替换右上角内置关闭图标；按钮本体与其 accessible name 不变（C6） |

### Expose

```ts
open(): void
close(reason?: YueDialogCloseReason): void   // 'programmatic' 走同一 beforeClose 裁决
updatePosition(): void                        // fullscreen/size 变化后重算，无第三方类型泄漏
```

不暴露任何 DOM 节点或 overlay 内部对象。

### Attribute routing

- `inheritAttrs: false`。
- 落穿属性默认落到 dialog 卡片根（承载 `role`/`aria-modal`）。
- `class`/`style` → 卡片根；`aria-label`/`aria-labelledby`/`aria-describedby` 受必需 ARIA 关系约束（见 Accessibility）。
- trigger/遮罩/滚动区的事件由内部处理，绝不静默附加到无关元素。

## Accessibility

- **Role**：`modal` + `variant='default'` → `role="dialog"`；`variant='danger'` → `role="alertdialog"`（Q26=B，三家组库都没做，Yue 在此领先）。`aria-modal="true"` 落在包含遮罩的模态根上。
- **APG**：[Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)；alertdialog 用 [Alertdialog](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/)。
- **可访问名（Q13=B）**：内置 `title` 自动生成 id 并 `aria-labelledby` 绑定；`description` 参与 `aria-describedby`；显式 `ariaLabel` 优先；两者都缺时 dev 告警且 a11y 门禁失败。
- **初始焦点（Q11=A）**：打开后焦点落在 dialog 容器（`tabindex="-1"`），而非第一个控件，让 AT 先念出可访问名与描述。
- **焦点边界（Q10=C）**：双开——① Tab 环回（容器内首尾跳转，无可聚焦元素时钉在容器）；② 背景不可达（对 dialog 之外的应用根子树设 `inert`，含 `aria-hidden` 兜底）。**连带约束（写入 hooks 层）**：`inert` 不得屏蔽同样 teleport 在应用根之外的其它浮层（如从 Popover 内容里打开的 Dialog 场景）——背景不可达的范围必须按"当前模态链"计算，而非粗暴对整棵 `#app` 设 inert。
- **回焦（Q12=B）**：关闭由键盘（Esc/内部动作）或程序触发 → 回到打开前元素（`trigger` 或记录的活动元素）；焦点已离开 dialog 到文档其他位置 → 不抢回。
- **输入法（Q22=E）**：IME composition 进行中按 Esc 不关闭。
- **键盘行为**：

| Key / target | Action | Prevent default | Event |
| --- | --- | --- | --- |
| `Escape`（顶层、`closeOnEscape` 且非 danger 默认禁） | 触发关闭请求 → `beforeClose('escape')` | 是（被处理时） | `close({reason:'escape'})` |
| `Tab` / `Shift+Tab` 在容器内 | 环回，焦点不出 dialog | 在首/末元素处 | none |
| `Enter` / `Space` 在内置按钮 | 触发 confirm/cancel | native | `confirm` / `closed` |
| 方向键 | 无 Dialog 行为 | no | none |

- **嵌套与顶层仲裁（Q21=B）**：最小栈（模块级 reactive 序列 + "是否全局顶层"谓词）；Esc 只关全局顶层；后开 dialog 自动压在前面之上；子浮层内容点击不误关父 dialog。
- **层级（Q9=B、Q27=B）**：模态基值走新增的 semantics 层 `--layer-modal`（高于 `--layer-popover/tooltip/toast`），primitive 层级表不动；dialog 根建立独立层叠上下文，内部浮层相对其之上，不外泄 z-index 计算。
- forced-colors 下卡片边框用系统色保边界（沿用 `prototype/overlay.css` 的 `CanvasText` 意图）；reduced-motion 下零时长（Q31=A，与 Popover 一致）。

## Token intent

新增 `packages/tokens/src/component-tokens/dialog.css`；组件 CSS **不得直读 primitive token**。新增 `--dialog-*` 命名空间属"有意扩词表"，须同步 `tools/lib/token-vocabulary.mjs` 的 `PHRASES.dialog` 与 `tools/token-audit.pairs.mjs` 的 `PACKAGE_ONLY_TOKENS`，并重算 inventory / token-usage 报告物（Q8=B、Q29=B）。

> **Q29=B 冲突裁决（review 阶段，`audit:component dialog` FAIL 触发）**：Q29=B 原读作"表面色直读
> `--box-*-dialog`，不包二重间接"，与全库硬规则"component CSS 只读自己的 `--{name}-*` 与 `--_*`"
> （yue-component-design SKILL 第 3 步；`audit:component` 机械执行）冲突。库内先例 `--popover-background:
> var(--box-background-popover)` 证明两者本不矛盾——Popover 同样以 pass-through 别名转发 Box 契约并通过
> 门禁。裁决：**隔离规则优先，Q29=B 收窄解释为"别名只做整体转发、不重铸/不改写 Box 值"**，surface 轴以
> `--dialog-background` 等 pass-through 别名转发 `--box-*-dialog`，值仍由 Box 拥有。下表 Token consumed 列
> 相应更新为组件命名空间名。

| Axis | Token consumed | Notes |
| --- | --- | --- |
| Surface | `--dialog-background` / `--dialog-color` / `--dialog-border-color` / `--dialog-border-width` / `--dialog-border-radius` / `--dialog-padding` / `--dialog-shadow` | pass-through 别名整体转发已冻结的 `--box-*-dialog` 契约，不重铸值（Q29=B 裁决见上） |
| Scrim | `--dialog-scrim-color` → `--scrim-modal`（新增 semantics 角色 token） | Q16 定案：模态遮罩取明暗一致的 `rgb(0 0 0/.5)`，由自有语义 `--scrim-modal` 承载，不改共享 `--scrim`（后者仍明 .56/暗 .64，供瞬时浮层） |
| Elevation | `--dialog-z-index` → `--layer-modal`（新增 semantics 角色 token） | Dialog 只经自有别名读它；`--layer-dialog` 仍为未消费名，token-usage 报告须能解释（Q9=B） |
| Width | `--dialog-width-sm/md/lg/xl` | 档位（Q17=C）；`width` prop 覆盖，受 `--dialog-spacing` 安全边距约束 |
| Header/Footer | `--dialog-header-height`、`--dialog-footer-gap`、`--dialog-section-padding` | dialog 特有结构轴（Q29=B） |
| Action buttons | `--dialog-action-*`（background/border-*/text-color/on-primary/on-danger/spacing-*/danger-*/primary-*） | dialog 内置确认/取消按钮的轴，别名转发 `--surface-component`、`--border-*`、`--text-primary`、`--action-*`、`--space-*`、`--radius-md`、`--box-color-inverse` |
| Motion | `--dialog-duration-enter` / `--dialog-duration-exit` / `--dialog-ease` | **单一时长源**：遮罩与卡片共用，退场由真实 transitionend 驱动（Q30=A）→ 命名时长阶梯的 250/150ms 档（模态比瞬时浮层更沉稳，不走共享 enter/exit 角色）；入场为从 trigger 中心的 clamped translate（Q25 修订），无 trigger 回退原地 scale；reduced-motion 零时长 |

具体时长/缓动/遮罩强度数值 = **Q16 已定案**（原型目测后确认，见下）；宽度是调用方经 `width` prop 传入的数据、非 token 议题。不阻塞 token 名与公共 API 冻结。`--dialog-*` 短语命名须过 token grammar 门禁。

> **Q16 定案（review 阶段采纳，原型目测后确认）**：
> - **时长**：把时长原语从三档扩为 50ms 步进阶梯 `--duration-100…400`（`fast/normal/slow` 改为 100/200/300 档的别名，零改动到 button/spinner/tag 与共享 motion semantics）。dialog 入场/离场比瞬时浮层更沉稳，故 `--dialog-duration-enter` 命名 `--duration-250`、`--dialog-duration-exit` 命名 `--duration-150`（enter 慢于 exit，符合 Q30 单时长源）。缓动保持 `--motion-ease-standard`。
> - **遮罩**：新增语义 `--scrim-modal: rgb(0 0 0/.5)`（明暗一致），`--dialog-scrim-color` 指向它；不动共享 `--scrim`（.56/.64，供瞬时浮层）。模态自持遮罩强度，避免在组件层写裸色字面量。
> - **宽度**：`--dialog-width-*` 保持转发 `--width-*` 刻度；脱档宽度（如 560）由组件已有的 `width` prop 传入，不进 token——宽度是调用方数据，不是设计刻度。
> - **fullscreen** 整屏 `scale(0.96)` 属实现缺陷，已改为 sheet 式 `translateY(16px)`；modal 的 `scale(0.96)` 仅在无 trigger 回退时生效。位移量（translate px / scale %）作为组件 CSS 字面量保留，不为它扩 `--dialog-*` 词表（非语义值）。

> **Q25 修订（review 阶段采纳，推翻原 Q25=A）**：入场由“朝 trigger 方向 scale 生长”改为 **Vuetify 式 FLIP 飞入**——卡片从 trigger 中心 `translate` 到视口中心出现、关闭时飞回，位移向量方向指向 trigger、长度按 `min(vw,vh)*0.18` 钳制（避免边角 trigger 把模态横穿全屏）。无 trigger 时回退原地 `scale(.96)`；fullscreen 保持 sheet `translateY(16px)`（不飞）。位移经 `--_dialog-tx/ty/enter-scale` 私有槽由 `getBoundingClientRect` 手算，**不引入 Floating UI**（tree-shaking 硬断言不变）。机制冻结；具体时长已随 Q16 定案（enter 250/exit 150），位移钳制系数 0.18 为原型确认值。

## i18n

Q14=C + Q15=B 使 Dialog 自带内置文案，须走 `yue-i18n` 完整流程（见 `docs/03-yue-i18n-roadmap.md` 与 `.agent/skills/yue-i18n/SKILL.md`），在**同一提交**内新增并四处同步：

| Key | 用途 | announced |
| --- | --- | --- |
| `dialog.confirm` | 内置确认按钮文案 | 否（可见文本） |
| `dialog.cancel` | 内置取消按钮文案 | 否（可见文本） |
| `dialog.closeLabel` | icon-only 关闭按钮的可访问名（唯一名称） | **是** |

同步点：`packages/vue/src/locale/catalog.ts`（形状 + `YUE_MESSAGE_META`）、`zh-CN.ts`、`en-US.ts`，过 `satisfies` 与 `audit:i18n`。这是**对 Popover spec「不内置 locale 文案」立场的一次显式偏离**：Dialog 的动作/关闭是组件 chrome（catalog 注释界定的合法范畴），而内容文案仍归消费者。`footer` 插槽一旦由消费者传入，即不渲染任何内置键。

## File structure (planned)

```text
packages/hooks/src/overlay/
  stack.ts                           # 全局/局部顶层谓词 + 栈序列（registerOverlay / isTopOverlay）
                                     # 唯一进 hooks 的 overlay 运行时：Popover 与 Dialog 都是其消费者。
                                     # 模态语义（focus trap / 背景 inert / 滚动锁 / 条件回焦 / teleport 目标）
                                     # 只被 Dialog 消费，依 Identity 第 26 行「不下沉 hooks」与仓库规则
                                     # 「shared logic 须有第二消费者才进 hooks」，内联在 YueDialog.vue。

packages/vue/src/components/dialog/
  YueDialog.vue                      # 模态运行时（trap/inert/scroll/refocus/FLIP）内联于此
  types.ts
  index.ts
  style.css

packages/vue/src/locale/{catalog.ts, zh-CN.ts, en-US.ts}   # 新增 3 个 dialog.* 键
packages/tokens/src/component-tokens/dialog.css            # 新增 --dialog-* 结构轴
packages/tokens/src/semantics/{scrim.css, 新增 modal-layer}.css  # --layer-modal
tools/lib/token-vocabulary.mjs  tools/token-audit.pairs.mjs       # 扩词表 + parity

apps/docs/components/dialog.md
apps/docs/components/dialog/api.md
apps/docs/components/dialog/guide.md
apps/docs/en/components/dialog/{api,guide,index}.md
```

Popover 改造：`packages/vue/src/components/popover/` 与 Dialog 共享 `hooks/src/overlay/stack.ts`（同一栈序列、同一 isTopOverlay 谓词）。**外部行为不变**，故对 Popover 非破坏性（见下）。模态运行时不进 hooks，也不回流 Popover；任何 Dialog 公共 API 变化须先更新本 spec。

## Verification contract（Q22=A-F，全部为可执行门禁）

- **A11y / axe（A）**：axe 无 violation；`role`（dialog/alertdialog）、`aria-modal`、`aria-labelledby`/`describedby` 齐全，缺可访问名时失败。
- **焦点边界（B）**：Tab 环回不出 dialog；背景 inert 实际生效（AT 不可达）；初始焦点落在容器；条件回焦规则被断言。**且**必须断言"从 Popover 内容打开 Dialog 时，其它 teleport 浮层未被 inert 误屏蔽"。
- **视觉回归（C）**：明/暗主题 + forced-colors 下遮罩与卡片层级靠边框仍可读。
- **负向探针（D）**：组件 CSS 直读 primitive token 失败；关闭/卸载后残留全局监听失败；遮罩点击误关底层实例失败；Dialog 泄漏 overlay/Floating UI 内部类型失败。
- **键盘与滚动（E）**：IME composition 中 Esc 不关；滚动锁不引起横向跳动。
- **包边界（F）**：未使用 Dialog 时不进产物；Dialog 不泄漏内部 overlay 实现类型。
- **单元**：受控/否决（beforeClose 返回 false/Promise 拒绝）；danger 派生 alertdialog 与默认禁渠道；persistent 屏蔽非按钮关闭；transient/persistent 挂载；嵌套栈顶层仲裁；SSR `renderToString` 无浏览器全局；事件顺序与重复请求抑制。

## Breaking changes

**对 YueDialog：N/A — 新组件。** 公共 API 在实现前冻结；改 prop/emit/slot/role 默认/non-feature 须先修订本 spec。

**对 YuePopover：内部重构，非破坏性**（breaking-change-process.md「Internal refactor with identical external behavior」）。但须遵守：
- Popover 公共 API（props/emits/slots/expose/role 默认/token 名）**逐字不变**；改造前先写"旧行为快照测试"作回归锚，改造后不得弱化断言。
- Popover 仍不得承接模态语义（其 spec 的 non-feature 边界不变）；overlay hooks 层保持无语义，trap/inert/scrollBlock 只被 Dialog 消费。

## 审计修订（review 阶段 · 2026-10-05）

对标 `refer/` 中 Vuetify / Ant Design / TDesign 的 dialog 实现审计后，在本预发布切片内就地修复下列缺陷与能力缺口（每条都有 before/after 回归测试，dialog 单测 21→32）：

- **B1（激活时机）**：原实现仅在 `watch(isOpen)` 中建立模态环境，导致挂载时已为 `modelValue=true` 的实例（SSR/持久化路由）从不回焦、从不锁滚、从不 `emit('open')`。抽出 `activate()/deactivate()`，`onMounted` 时对已开实例兼平。
- **B2（模态性与 surface 解耦）**：原 `blocksBackground = surface==='modal'` 把 `fullscreen` 误当非模态（不锁背景、不 trap）。改为 `isModal = !modeless`；`fullscreen` 也按模态处理，新增 `modeless`（C5）单独控制非模态。
- **B3（可见性焦点判据）**：`isFocusable` 原先只看 `offsetParent`/禁用，对 `visibility:hidden` 但占位的控件误判，使 Tab 环可落在不可聚焦元素上。加入 computed style 的 `visibility/display` 判据，无可聚焦元素时钉在容器。
- **C1（忙态/异步关闭）**：`isBusy = loading || guardPending`；`beforeClose` 返回 pending Promise 期间自动置忙，确认按钮 spinner + 禁用，屏蔽 Esc/遮罩。
- **C2（动作裁剪）**：`showConfirm`/`showCancel` 控制内置按钮；`hasFooter` 据插槽与动作开关决定 footer 是否渲染。
- **C3（分部件定制）**：`classNames`/`styles` 按结构部件名合并（对齐 Ant Design 语义槽），经 `props.*` 读取以过 docs 契约。
- **C4（延迟挂载）**：`lazy` 首次打开前不实例化内容，`hasOpened` 后跨关闭保持挂载。
- **C5（非模态）**：`modeless` 去掉 aria-modal/inert/锁滚/trap，背景保持可交互（Esc/遮罩仍按 `variant`/`closeOn*`）。
- **C6（close-icon 插槽）**：替换内置关闭图标而不动按钮本体与可访问名。
- **拒绝项**：新增 info/warning/success 语义变体（C7）不做——会模糊 `danger→alertdialog` 的纯粹性，属 cosmetic scope creep。本修订不改行 File-structure 示意图中错列的 hooks 模块（见上），只使其与 Identity 正文一致。

## Open questions

- [x] **Q16 动效数值**：已定案（原型目测后确认）。时长阶梯扩为 `--duration-100…400`，dialog enter 250/exit 150 + `--motion-ease-standard`；遮罩新增 `--scrim-modal`（明暗 .5）；宽度走 `width` prop 不进 token；fullscreen 修为 `translateY(16px)`。飞入钳制系数 0.18（Q25）。机制与 token 名均已冻结。
- [ ] **命令式确认入口**：留待 Dialog 主体完成后独立评估，须以 after-close 为卸载信号，不得硬编码延时（Q18=C）。
