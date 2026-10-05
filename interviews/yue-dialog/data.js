/**
 * YueDialog design interview.
 * The panel template loads this file without a bundler.
 *
 * Research basis (see ./research/sources.md):
 *   refer/tdesign-vue-next/packages/components/dialog + refer/tdesign-common/style/web/components/dialog
 *   refer/ant-design/components/modal
 *   refer/vuetify/packages/vuetify/src/components/{VOverlay,VDialog} + composables/{stack,focusTrap}.ts
 *   .spec-workflow/yue-popover/spec.md, packages/tokens/src/**, packages/vue/src/**
 */

window.COMPONENT_NAME = 'YueDialog';
window.SCHEMA_VERSION = 2;
window.TEMPLATE_VERSION = '2.0.0';

window.FINDINGS = [
  {
    id: 'finding-tdesign-dialog',
    topic: 'TDesign Dialog：结构可取，无障碍与生命周期不可取',
    finding:
      'DOM 五层职责分离（层级容器 ctx / mask / wrap 滚动视口 / position flex 对齐 / 卡片 / header-body-footer），' +
      '点击关闭热区落在对齐层并用 useSameTarget 判定 mousedown 与 mouseup 同点，避免卡内拖选误关；' +
      'ESC 挂在 document 上，带 isComposing 输入法保护、顶层浮层判定与 stopImmediatePropagation；' +
      'mode 一个 prop 同时决定遮罩、定位、可拖拽、锁滚（四件事耦合）。' +
      '反面事实：整棵 DOM 没有 role / aria-modal / aria-labelledby，关闭按钮是 span + svg 不可 Tab 到达；' +
      '打开时主动 document.activeElement.blur()，既无 trap 也无回焦；' +
      '锁滚靠向 body 注入 `html body{overflow-y:hidden;width:calc(100% - Npx)}` 高优先级样式，关闭后延迟 150ms 移除；' +
      '动画时长 CSS 侧 @anim-duration-base = 0.2s 而 JS 侧写死 300ms，opened/closed 事件与卸载比视觉晚约 100ms；' +
      'Web 端样式没有任何 --td-dialog-* 运行时变量（构建期塌陷），仅 mobile 端有 var() 形式。' +
      '层级 dialog = 2500，低于 popup 5500 / tooltip 5600 / message 6000。',
    sources: [
      'refer/tdesign-vue-next/packages/components/dialog',
      'refer/tdesign-common/style/web/components/dialog',
    ],
    confidence: 'high',
    leadsTo: [2, 5, 6, 7, 9, 10, 11, 16],
    round: 1,
  },
  {
    id: 'finding-antd-modal',
    topic: 'Ant Design Modal：ARIA 与 z-index 栈可取，命令式双轨是负债',
    finding:
      'DOM 四层：root → mask（pointer-events:none，纯视觉）→ wrap（fixed inset:0 overflow:auto，同时承担点击关闭、Esc、滚动）' +
      '→ panel（role="dialog" aria-modal="true" tabindex="-1"）→ container（视觉盒）→ close/header/body/footer。' +
      'focus trap 默认值由模态语义派生：trap = (mask !== false)，可由 focusable.trap 覆写；' +
      '标题用 useId 生成 id 并 aria-labelledby 绑定；无标题时不输出 labelledby（等于无可访问名）。' +
      'role 恒为 dialog，连 Modal.confirm 也不是 alertdialog；全仓 aria-describedby 0 命中。' +
      'z-index 栈：useZIndex 基值 1000，容器类每层 +100 但只有顶层叠加基值（嵌套不叠加），并把当前值经 context 下发给内部浮层；' +
      '静态 confirm 固定取栈顶 2000，超限 dev 告警。' +
      'mask fade 与 panel zoom 完全分离且时长不同（Modal 作用域把 enter 覆写为 motionDurationSlow，mask 用 mid → 不同步结束）；' +
      'transform-origin 取全局捕获的鼠标位置（100ms 窗口），代码调用退化为中心。' +
      'onOk 返回 promise 时自动 loading，afterClose 是唯一卸载信号；9 个语义槽 classNames/styles 支持函数式读取 info.props；' +
      'wireframe 一个开关切换两套结构。' +
      '代价：静态方法另起 React 树，需要 useModal + contextHolder / App 包裹 / holderRender 三套补丁、setTimeout 异步渲染、模块级 destroyFns 与 mousePosition；' +
      'getContainer=false 对静态方法无效只能告警；废弃 prop 成堆；actionFn.length 靠形参个数决定行为。' +
      '证据限制：仓库无 node_modules，@rc-component/dialog 与 scrollLocker、react-focus-lock 内部实现无法读取，只能确认"未被引用"。',
    sources: ['refer/ant-design/components/modal'],
    confidence: 'medium',
    leadsTo: [5, 7, 9, 10, 11, 12, 13, 16, 18],
    round: 1,
  },
  {
    id: 'finding-vuetify-overlay',
    topic: 'Vuetify VOverlay / VDialog：三级分层与滚动锁实现最完整',
    finding:
      'VOverlay（约 490 行）是浮层运行时底座：activator、定位策略、stack、teleport、scrim、四条关闭渠道 + persistent 拒绝反馈、' +
      '滚动策略、focus trap、回焦、动效壳、懒挂载；VDialog（约 136 行）只做三件事——改默认值（居中定位、scrollStrategy block、' +
      'trap + retain、z 基线 2400、专属 transition）、加模态语义（role=dialog 与 aria-modal 落在包含遮罩的根 div 上、' +
      '内容容器 tabindex="-1"、给 activator 注 aria-haspopup、fullscreen 关闭定位）、加内容布局与滚动归属；' +
      'VBottomSheet 再叠在 dialog 之上，证明三级堆叠成立。' +
      '栈是模块级 reactive 序列 [uid, zIndex]，激活时 z = 全局栈顶 + 10（空栈用自身默认值），dispose 线性 splice；' +
      '提供 globalTop / localTop 两个谓词；关闭权分配为 Esc → globalTop、外点 → localTop 且必须落在 scrim 自身、父级不被子级关闭。' +
      'focus trap 两条路线并存：Tab 环回（文档级单 keydown + 引用计数，向上找最近激活容器为边界）与捕获式拉回（一次性 focusin，pointerdown 后 100ms 抑制）；' +
      'dialog 两开关全开，menu 只开捕获，tooltip 全摘；首个焦点落在内容包裹层（tabindex=-1）而非第一个控件；' +
      '未找到背景 inert / aria-hidden，也未找到 aria-labelledby / aria-describedby；回焦逻辑在三处各写一遍。' +
      '滚动锁细节最多：收集目标与内容的所有滚动祖先去重、跳过已锁；把 scrollLeft/scrollTop 取负写入两个 CSS 变量并加锁类；' +
      '解锁时读回坐标并临时置 scroll-behavior:auto 保证同步滚动；文档滚动条用 window.innerWidth - documentElement.offsetWidth 经 padding-inline-end 补偿；' +
      'html 特殊处理为 position:fixed + 负偏移；整个策略跑在独立 effect scope 且 await setTimeout(0) 一帧后启动。' +
      '滚动归属三态纯样式决定：默认卡片自身滚（外框 max calc(100% - 48px)）/ scrollable 只有正文滚（头脚固定）/ fullscreen 整屏。' +
      '动效有 target 时 css={false} 全 JS 驱动 FLIP（入 225ms、出 125ms，reduced-motion 退化纯 opacity 125/85ms，面积 > 视口 12% 最多放慢 1.5 倍）；' +
      'scrim 是独立 0.3s fade，与内容 225/125ms 不同步（真实不一致）；afterLeave → lazy 释放 → teleport 子树卸载。' +
      '不该背的复杂度：588 行定位策略（dialog 实际只需约 35 行 flex 居中）、408 行 useActivator 的 hover/focus/click 矩阵、' +
      'transition 多型联合 + 无消费者的 persisted、_disableGlobalStack 私有逃生口、用 DOM 类名判组件身份、魔法数字密集、同一职责三处实现。',
    sources: ['refer/vuetify/packages/vuetify/src'],
    confidence: 'high',
    leadsTo: [3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 19, 21],
    round: 1,
  },
  {
    id: 'finding-popover-boundary',
    topic: 'YuePopover 已把 Dialog 语义写成 non-feature',
    finding:
      '.spec-workflow/yue-popover/spec.md：Popover 是"共享 overlay 行为的公开基础组件"，并明确 Menu / Select / Tooltip / Dialog' +
      '"复用无语义 hooks，而不是通过 props 把所有语义集中到 Popover"；non-feature 清单包含' +
      '"Dialog focus trap, modal scrim, inert background and modal back-button behavior — belongs to YueDialog"；' +
      '同时声明"Built-in close button or locale text — content and accessible naming are supplied by the consumer"。' +
      'role 默认值为 dialog（浮层语义），且 role 变化不引入 Menu/Dialog 行为；close 事件带 reason 枚举' +
      '（trigger / outside / escape / programmatic）；提供 after-open / after-close 与 restoreFocus prop；' +
      'reduced-motion 下必须零时长；--_popover-reveal-* 是组件内部值而非公开 token。' +
      '已定义的负向探针：直读 primitive token、泄漏 Floating UI 类型、关闭后残留监听、子点击误关父级。',
    sources: ['.spec-workflow/yue-popover/spec.md', 'packages/vue/src/components/popover/types.ts'],
    confidence: 'high',
    leadsTo: [3, 4, 6, 13, 18, 22, 23, 26, 27],
    round: 1,
  },
  {
    id: 'finding-alertdialog',
    topic: '三家组库都没有破坏性确认的专用角色',
    finding:
      'Ant Design 的 role 恒为 dialog（Modal.confirm 也不输出 alertdialog）；TDesign 整树无任何 ARIA；'
      + 'Vuetify VDialog 只给 role=dialog + aria-modal。全仓未找到 alertdialog 的公开 API 或实现。'
      + '差异在于：alertdialog 语义下辅助技术会预期“必须回应”并会语意提醒，且惯例是禁止遮罩/退出键关闭。'
      + 'Yue 若要这个语义，只需一个 prop 切换 role 并联动默认关闭渠道，不必新建组件。',
    sources: ['refer/ant-design/components/modal', 'refer/vuetify/packages/vuetify/src/components/VDialog', 'refer/tdesign-vue-next/packages/components/dialog'],
    confidence: 'high',
    leadsTo: [25],
    round: 4,
  },
  {
    id: 'finding-layer-modal',
    topic: '选择 semantics 层 --layer-modal 后的连带后果',
    finding:
      'Q9 选了 B（semantics 新增 --layer-modal，primitive 层级表保持原样）。这意味着：'
      + 'primitive 的 --layer-dialog 仍存在但不再是 Dialog 的读取源，变成无人消费或仅 prototype 消费的 token；'
      + 'packages/tokens/src/prototype/overlay.css 的 .dialog-backdrop 目前正读 --layer-dialog，需要同步；'
      + 'token-usage 报告必须能解释这个未消费名（否则门禁失败）；'
      + '另外 --layer-tooltip(40) / --layer-toast(50) 低于模态基值时，dialog 内部的 tooltip/menu 与 dialog 本体不同层根，'
      + '需要显式决定 dialog 子树是否自带层叠上下文。',
    sources: ['packages/tokens/src/primitives/effects.css', 'packages/tokens/src/prototype/overlay.css', 'tools/token-usage-report.mjs'],
    confidence: 'high',
    leadsTo: [27],
    round: 4,
  },
  {
    id: 'finding-token-surface',
    topic: 'Dialog 表面 token 已存在，但没有 dialog 命名空间',
    finding:
      'packages/tokens/src/component-tokens/box.css 已提供完整 dialog 表面契约：' +
      '--box-background-dialog（→ --box-background-raised-3）、--box-color-dialog、--box-border-color-dialog、' +
      '--box-border-width-dialog、--box-border-radius-dialog、--box-padding-dialog、--box-shadow-dialog；' +
      '冻结词表 tools/lib/token-vocabulary.mjs 的 PHRASES.box 已含以上全部短语。' +
      'PHRASES 中不存在 dialog 命名空间（现有：avatar/badge/box/button/checkbox/divider/icon/input/link/menu/popover/tag…），' +
      '因此新增 --dialog-* 属于"有意扩词表"：必须同步 PHRASES 与 tools/token-audit.pairs.mjs 的 PACKAGE_ONLY_TOKENS，' +
      '并重算 inventory / token-usage 报告物。box 命名空间下没有 font-size-dialog，也没有宽度 / 头部 / 底部 / 间距类短语。',
    sources: ['packages/tokens/src/component-tokens/box.css', 'tools/lib/token-vocabulary.mjs', 'tools/token-audit.pairs.mjs'],
    confidence: 'high',
    leadsTo: [7, 17, 19],
    round: 1,
  },
  {
    id: 'finding-layer-inversion',
    topic: '既有层级 token 把 dialog 排在 popover 之下',
    finding:
      'packages/tokens/src/primitives/effects.css：--layer-base 0 / --layer-sticky 10 / --layer-dialog 20 / ' +
      '--layer-popover 30 / --layer-tooltip 40 / --layer-toast 50。' +
      '即模态层 dialog 低于非模态的 popover，tooltip 与 toast 又高于 dialog。' +
      'prototype/overlay.css 的 .dialog-backdrop 已经在用 position:fixed + z-index:var(--layer-dialog) + inset:0 + ' +
      'display:grid + place-items:center + padding:var(--box-padding-dialog) + background:var(--scrim)，' +
      '并注释"elevation is never the only hierarchy marker"（forced-colors 下补 CanvasText 边框）。' +
      '参照系各家排布并不一致：TDesign dialog 2500 < popup 5500 < tooltip 5600 < message 6000；' +
      'Vuetify overlay 2000 / dialog 2400，step 10，运行时栈；antd zIndexPopupBase 1000 + 容器每层 100 且嵌套不叠加。' +
      '共同点是 dialog 必须高于其宿主页面内的普通内容与同页浮层。',
    sources: ['packages/tokens/src/primitives/effects.css', 'packages/tokens/src/prototype/overlay.css', 'refer/*'],
    confidence: 'high',
    leadsTo: [8, 9, 27],
    round: 1,
  },
  {
    id: 'finding-scrim-token',
    topic: '--scrim 已有明暗双值',
    finding:
      'packages/tokens/src/semantics/scrim.css：:root { --scrim: rgb(0 0 0/.56) }，' +
      '[data-theme=dark] { --scrim: rgb(0 0 0/.64) }。' +
      '参照系取值：Vuetify scrim opacity 0.32（#000）、antd mask 用 color 派生、TDesign mask 纯 opacity + linear 动画。' +
      'Yue 现值明显更重（0.56/0.64），是否直接用于模态遮罩需要一次有画面可看的判断。',
    sources: ['packages/tokens/src/semantics/scrim.css'],
    confidence: 'high',
    leadsTo: [16],
    round: 1,
  },
  {
    id: 'finding-no-overlay-hooks',
    topic: 'hooks 包目前没有任何 overlay 运行时能力',
    finding:
      'packages/hooks/src 只有 config/、locale/、namespace/ 三个目录，没有 useOverlay / useFocusTrap / useScrollLock / useStack。' +
      'Popover 的定位、Escape、焦点恢复、teleport 逻辑都在组件自身内部实现，未被第二个消费者复用。' +
      '因此 Dialog 的运行时能力要么先在组件内本地实现，要么在本次决策中抽成 hooks 层的共享底座；' +
      'Popover spec 已承诺"Menu/Select/Tooltip/Dialog 复用无语义 hooks"，但那份 hooks 目前并不存在。',
    sources: ['packages/hooks/src', 'packages/vue/src/components/popover'],
    confidence: 'high',
    leadsTo: [5],
    round: 1,
  },
  {
    id: 'finding-i18n-cost',
    topic: '内置按钮文案会强制走完整 i18n 流程',
    finding:
      'packages/vue/src/locale/catalog.ts 是消息形状的唯一真源，当前只有 input.clear 与 tag.closeLabel 两个叶子键；' +
      '每个键必须同步：语言包 zh-CN.ts / en-US.ts（satisfies 校验，缺键或多键直接构建失败）、' +
      'YUE_MESSAGE_META（purpose / params / announced，缺元数据即 audit:i18n 失败）。' +
      'catalog 注释明确边界："A string owned by the consumer is not a translation problem, it is their content."，' +
      '而 Popover spec 的立场是不提供内置关闭按钮与 locale 文案。' +
      '因此 Dialog 一旦内置确认/取消按钮或 icon-only 关闭控件，就必然引入新的 locale 键与双语包 + 元数据 + 审计成本。',
    sources: ['packages/vue/src/locale/catalog.ts', 'packages/vue/src/locale/zh-CN.ts', 'packages/vue/src/locale/en-US.ts', '.agent/skills/yue-i18n/SKILL.md'],
    confidence: 'high',
    leadsTo: [14, 15],
    round: 1,
  },
];

window.SECTIONS = [
  { title: '第一轮：组件定义、边界与所有权', start: 1, end: 8 },
  { title: '第二轮：模态机制（层级 / 焦点 / 滚动 / 命名）', start: 9, end: 13 },
  { title: '第三轮：外观、动作、动效与验证契约', start: 14, end: 22 },
  { title: '第四轮：冲突消解与边界决策', start: 23, end: 31 },
];

window.QUESTIONS = [
  // ───────────────── 第一轮：组件定义、边界与所有权 ─────────────────
  {
    id: 1,
    round: 1,
    required: true,
    introducedBy: null,
    summary: '核心场景',
    question:
      'YueDialog 首要解决哪类问题？（参照系里 dialog 同时被用于"必须完成的流程"和"打断式的确认"，两者对焦点与关闭权的要求不同）',
    options: [
      { letter: 'A', text: '承载需要用户专注完成或确认的任务：表单、详情、破坏性确认', recommended: true },
      { letter: 'B', text: '主要承载长内容浏览（文档、图片、报表预览）', recommended: false },
      { letter: 'C', text: '作为移动端底部面板 / 抽屉的替代品', recommended: false },
      { letter: 'D', text: '以上都要，第一版就把三类场景全部覆盖', recommended: false },
    ],
    recommended: ['A'],
  },
  {
    id: 2,
    round: 1,
    required: true,
    introducedBy: null,
    summary: '表面范围',
    question:
      '第一版要公开哪些"表面模式"？（TDesign 用一个 mode prop 同时决定遮罩、定位、可拖拽、锁滚，四件事被绑死；Vuetify 把 fullscreen 放进 dialog、把 sheet 拆成第三个组件）',
    options: [
      { letter: 'A', text: '只做居中模态', recommended: false },
      { letter: 'B', text: '居中模态 + 非模态可交互浮层面板（无遮罩、不锁滚、不 trap）', recommended: false },
      { letter: 'C', text: '居中模态 + fullscreen（整屏，含移动端形态）', recommended: true },
      { letter: 'D', text: '模态 + 非模态 + fullscreen + 可拖拽 + 侧向抽屉全部一次做完', recommended: false },
    ],
    recommended: ['C'],
  },
  {
    id: 3,
    round: 1,
    required: true,
    introducedBy: 'finding-popover-boundary',
    summary: '上下文模型',
    question:
      'Dialog 与触发它的按钮（activator）之间应当是什么关系？这决定它是不是"锚定"组件。（YuePopover 的 trigger 是 click/hover/focus/manual 的锚定模型；Vuetify 的 dialog 默认视口居中、activator 只负责开关与 aria-haspopup）',
    options: [
      { letter: 'A', text: '独立上下文：Dialog 自己拥有 modelValue 与显示状态，不接收 anchor，不跟随触发器定位', recommended: true },
      { letter: 'B', text: '沿用 Popover 式 trigger 上下文：Dialog 内置在触发器插槽里，由 trigger 控制开关', recommended: false },
      { letter: 'C', text: '两种都支持，trigger 可选，缺省时为独立上下文', recommended: false },
    ],
    recommended: ['A'],
  },
  {
    id: 4,
    round: 1,
    required: true,
    introducedBy: 'finding-popover-boundary',
    summary: '状态所有权',
    question:
      '开合状态由谁拥有？（Popover 已经是 modelValue + defaultOpen + expose 的受控模型；参照系里 TDesign/antd 的关闭渠道会直接改写 visible，使用者无法否决）',
    options: [
      { letter: 'A', text: '完全受控：modelValue / update:modelValue 是唯一真相源，任何关闭渠道都只是"请求关闭"', recommended: true },
      { letter: 'B', text: '非受控优先：组件内部持有状态，事件只做通知', recommended: false },
      { letter: 'C', text: '受控 + defaultOpen 的混合（与 YuePopover 一致）', recommended: false },
    ],
    recommended: ['A'],
  },
  {
    id: 5,
    round: 1,
    required: true,
    introducedBy: 'finding-no-overlay-hooks',
    summary: '运行时归属',
    question:
      'trap / scrim / scroll lock / 栈 / 回焦这些 overlay 运行时能力放在哪里？（这是 Popover spec 承诺给 Menu/Select/Tooltip/Dialog 的"无语义 hooks"，但至今不存在。Vuetify 用 VOverlay 底座 + VDialog 语义层的两级结构，代价是 490 行底座 + 588 行定位策略）',
    options: [
      { letter: 'A', text: '全部在 YueDialog 内部实现，暂不抽取，等第二个真实消费者出现再上移', recommended: false },
      { letter: 'B', text: '先做 YueDialog 自包含，同时冻结内部边界文档，Menu 到来时一次性迁移为共享底座', recommended: true },
      { letter: 'C', text: '本次就抽出 packages/hooks 的 overlay 底座，Dialog 与 Popover 同时改造', recommended: false },
      { letter: 'D', text: '直接以 YuePopover 为底座，Dialog 包一层模态语义', recommended: false },
    ],
    recommended: ['B'],
  },
  {
    id: 6,
    round: 1,
    type: 'multi-choice',
    required: true,
    introducedBy: 'finding-tdesign-dialog',
    summary: '关闭渠道',
    question:
      '第一版允许哪些关闭渠道？（multi-choice。参照系：TDesign 三种渠道且互不对等——confirm 的取消键不自动关，其余渠道强制 update:visible；antd maskClosable 可关；Vuetify 四条渠道 + persistent 抖动作为拒绝反馈）',
    options: [
      { letter: 'A', text: '显式关闭按钮 / 插槽内动作按钮', recommended: true },
      { letter: 'B', text: 'Escape 键', recommended: true },
      { letter: 'C', text: '点击遮罩（scrim）', recommended: true },
      { letter: 'D', text: '点击 dialog 之外的任意位置（含背景页面）', recommended: false },
      { letter: 'E', text: '路由返回 / 浏览器后退键', recommended: false },
    ],
    recommended: ['A', 'B', 'C'],
  },
  {
    id: 7,
    round: 1,
    required: true,
    introducedBy: 'finding-antd-modal',
    summary: '否决机制',
    question:
      '除显式关闭按钮外，非显式渠道（Escape、遮罩）能否被使用者否决？（三家组库都没有真正的"关闭前否决"：TDesign 只能事后同步，antd 靠 onCancel 副作用，Vuetify 靠 persistent 直接拒绝。而表单未保存时拦下 Escape 是 Dialog 最常见的真实需求）',
    options: [
      { letter: 'A', text: '不否决：渠道由 prop 开关（closeOnEscape / closeOnScrim）控制，关掉即完全不允许', recommended: false },
      { letter: 'B', text: '提供 before-close(reason) 钩子，可返回 false / Promise 拒绝这次关闭，渠道事件统一走 request-close', recommended: true },
      { letter: 'C', text: '不引入否决，但提供 persistent：破坏性确认时禁止 Escape 与遮罩，只留按钮', recommended: false },
    ],
    recommended: ['B'],
  },
  {
    id: 8,
    round: 1,
    required: true,
    introducedBy: 'finding-token-surface',
    summary: 'Token 归属',
    question:
      'Dialog 的 CSS 变量走哪条链路？（硬约束：组件 CSS 不得直读 primitive token，spec.md L169 级约束。现状：--box-*-dialog 七个表面契约已冻结可用；PHRASES 里没有 dialog 命名空间；popover 的做法是 --popover-* 读取 --box-*-popover 作为自己的公开契约）',
    options: [
      { letter: 'A', text: '组件 CSS 直接消费 --box-*-dialog，不新增命名空间', recommended: false },
      { letter: 'B', text: '新增 --dialog-* 组件命名空间（background / color / border-* / radius / padding / shadow / width / header-* / footer-* …），值一律转指 --box-*-dialog；同步扩 PHRASES 与 PACKAGE_ONLY_TOKENS', recommended: true },
      { letter: 'C', text: '先在 semantics 层加模态角色 token，再由 --dialog-* 读取', recommended: false },
    ],
    recommended: ['B'],
  },
  // ───────────────── 第二轮：模态机制 ─────────────────
  {
    id: 9,
    round: 2,
    required: true,
    introducedBy: 'finding-layer-inversion',
    summary: '层级修正',
    question:
      '既有 primitive token 里 --layer-dialog 是 20，低于 --layer-popover 的 30，而 tooltip 40 / toast 50 也都在 dialog 之上。模态遮罩必须压住宿主页面的一切内容（包括同页 popover/menu），否则焦点边界与视觉模态自相矛盾。怎么修？',
    options: [
      { letter: 'A', text: '改 primitive 值：把 --layer-dialog 提到 popover 之上（dialog > popover > tooltip > toast 或 dialog > tooltip > toast > popover）', recommended: false },
      { letter: 'B', text: '在 semantics 层新增 --layer-modal（高于 --layer-tooltip/--layer-toast），Dialog 只读它，primitive 层级表保持原样并单独说明语义', recommended: true },
      { letter: 'C', text: '不动层级 token，Dialog 用运行时栈自己算 z-index，token 只作为栈基值', recommended: false },
      { letter: 'D', text: '维持现状（dialog 20 低于 popover 30），认为同页共存由使用者自行避让', recommended: false },
    ],
    recommended: ['B'],
  },
  {
    id: 10,
    round: 2,
    required: true,
    introducedBy: 'finding-vuetify-overlay',
    summary: '焦点陷阱',
    question:
      '焦点不外逃用哪条技术路线？（Vuetify 两条都做了：Tab 环回 + 捕获式拉回；三家组库都没有把背景 inert 作为主手段——TDesign 靠 blur()，antd/Vuetify 靠事后拉回。inert 是现代浏览器的原生保证，但会连带影响背景上的浮层与第三方组件）',
    options: [
      { letter: 'A', text: 'Tab 环回（trap）：在 dialog 根上拦截 keydown，首尾跳到对侧，无可聚焦元素时钉在容器', recommended: false },
      { letter: 'B', text: '背景不可达：对 dialog 之外的应用根子树设置 inert（含 aria-hidden 兜底），Tab 自然不出去', recommended: true },
      { letter: 'C', text: 'A 与 B 同时实施：inert 为主、Tab 环回为兜底（inert 不可用时仍成立）', recommended: false },
      { letter: 'D', text: '只捕获式拉回（focusin 时把焦点拽回容器），不拦截 Tab', recommended: false },
    ],
    recommended: ['C'],
  },
  {
    id: 11,
    round: 2,
    required: true,
    introducedBy: 'finding-antd-modal',
    summary: '初始焦点',
    question:
      'Dialog 打开后焦点首先落在哪里？（Vuetify 落在内容包裹容器 tabindex="-1" 而不是第一个控件——避免屏幕阅读器跳过介绍直接念到按钮；antd 的 confirm 默认聚焦主操作按钮 autoFocusButton: "ok"；TDesign 是主动 blur，等于没有答案）',
    options: [
      { letter: 'A', text: 'dialog 容器本身（tabindex="-1"），让 AT 先念出可访问名与描述', recommended: true },
      { letter: 'B', text: '第一个可聚焦控件（通常是关闭按钮或标题后的输入框）', recommended: false },
      { letter: 'C', text: '主操作按钮（确认键），与 antd confirm 一致', recommended: false },
      { letter: 'D', text: 'A 为默认，另提供 autofocus prop 可指定选择器或首控件', recommended: false },
    ],
    recommended: ['A'],
  },
  {
    id: 12,
    round: 2,
    required: true,
    introducedBy: 'finding-vuetify-overlay',
    summary: '回焦规则',
    question:
      '关闭后焦点回到哪里？（Vuetify：若最后一次 mousedown 在 dialog 外部则不回焦，避免把焦点从用户刚点的按钮上抢走；Popover 已有 restoreFocus prop 且是无条件回焦的简化版本）',
    options: [
      { letter: 'A', text: '无条件回到打开前的元素（沿用 Popover 的 restoreFocus 语义）', recommended: false },
      { letter: 'B', text: '条件回焦：仅当关闭由键盘（Escape / 内部动作）或程序触发时回焦；焦点已离开 dialog 到文档其他位置时不回焦', recommended: true },
      { letter: 'C', text: '完全不自动回焦，交给使用者在 after-close 里处理', recommended: false },
    ],
    recommended: ['B'],
  },
  {
    id: 13,
    round: 2,
    required: true,
    introducedBy: 'finding-popover-boundary',
    summary: '可访问命名',
    question:
      '可访问名与描述由谁提供？（Popover spec 已定"组件不造文案，name 由消费者经 aria-label/aria-labelledby  supplied"；antd 用 useId 自动把 aria-labelledby 绑到标题 id，无标题时不输出；三家都没有 aria-describedby）',
    options: [
      { letter: 'A', text: '要求使用者显式传 aria-label 或 aria-labelledby，组件不自动关联标题；缺失时 dev 告警 + a11y 门禁失败', recommended: false },
      { letter: 'B', text: '内置标题槽并自动生成 id 做 aria-labelledby；显式 aria-label 优先级更高；无标题且无 label 时 dev 告警', recommended: true },
      { letter: 'C', text: '在 B 之上再加 aria-describedby 自动绑定正文集容器', recommended: false },
    ],
    recommended: ['B'],
  },
  // ───────────────── 第三轮：外观、动作、动效与验证契约 ─────────────────
  {
    id: 14,
    round: 3,
    required: true,
    introducedBy: 'finding-i18n-cost',
    summary: '动作区形态',
    question:
      '底部动作区（OK/Cancel）怎么做？（这是本组件最大的一次成本分叉：一旦组件自己渲染按钮文字，就必须向 locale catalog 新增键并同步 zh-CN / en-US / 元数据 / audit:i18n。YuePopover 的既有立场是不内置任何文案；antd 用 locale.context 的 okText/cancelText，TDesign 用 confirmBtn/cancelBtn 接受 string|ButtonProps|null）',
    options: [
      { letter: 'A', text: '只提供 footer 插槽，按钮与文案全由使用者写，组件零 locale 键', recommended: false },
      { letter: 'B', text: '提供 confirmText/cancelText props（字符串必填），组件渲染 YueButton，不引入 locale 键', recommended: false },
      { letter: 'C', text: '内置 action presets：footer 未传时渲染确认/取消，文案取 locale（dialog.confirm / dialog.cancel），走 yue-i18n 完整流程', recommended: true },
    ],
    recommended: ['C'],
  },
  {
    id: 15,
    round: 3,
    required: true,
    introducedBy: 'finding-i18n-cost',
    summary: '关闭控件',
    question:
      '是否内置右上角 icon-only 关闭按钮？（icon-only 意味着必须有一个 locale 键作为唯一可访问名，这是 Popover spec 明确拒绝过的做法；TDesign 的关闭按钮是 span + svg，不可 Tab 到达，属于反面教材）',
    options: [
      { letter: 'A', text: '不内置，关闭只能通过 footer 动作或插槽由使用者放置', recommended: false },
      { letter: 'B', text: '内置，close 属性可配置（boolean | { ariaLabel }），默认 true，新增 dialog.closeLabel 一个 locale 键', recommended: true },
      { letter: 'C', text: '内置但默认 false，需要时显式开启', recommended: false },
    ],
    recommended: ['B'],
  },
  {
    id: 16,
    round: 3,
    required: true,
    type: 'prototype-gate',
    introducedBy: 'finding-scrim-token',
    summary: '入场动效',
    question:
      'Dialog 的入场/退场动效属于哪一类？散文无法定夺，需要看到画面。（可核验的参照事实：TDesign 是 scale(0.01)+opacity 的 zoom + mask 纯 opacity，且 CSS 0.2s / JS 300ms 双源导致事件比视觉晚 100ms；antd panel zoom 与 mask fade 分离且时长不同；Vuetify 用 FLIP 从触发器生长（入 225ms / 出 125ms），scrim 独立 0.3s，同样不同步；YuePopover 走的是 clip-path reveal。三家共同缺陷就是遮罩与内容动画不同步——Yue 至少要在这里做对）',
    options: [],
    recommended: [],
  },
  {
    id: 17,
    round: 3,
    required: true,
    introducedBy: 'finding-token-surface',
    summary: '宽度策略',
    question:
      'Dialog 宽度如何确定？（TDesign 是 width prop 默认 480px + 无响应式降级；Vuetify 用 max-width calc(100% - 48px) 的样式约束；antd 有 width prop + token 默认 520，窄屏靠 CSS 覆盖）',
    options: [
      { letter: 'A', text: '自由值：width prop 接受任意 CSS 长度，默认 480px，窄屏不做特殊处理', recommended: false },
      { letter: 'B', text: '档位：size = sm / md / lg / xl（token 化，进 --dialog-width-*），宽度只允许从档位里选', recommended: false },
      { letter: 'C', text: '档位 + 覆盖：size 决定默认 max-width，width 可显式覆盖，且始终受 --space 安全边距约束（max-width 不超过视口内边距）', recommended: true },
    ],
    recommended: ['C'],
  },
  {
    id: 18,
    round: 3,
    required: true,
    introducedBy: 'finding-antd-modal',
    summary: '命令式 API',
    question:
      '是否需要 Dialog.confirm() / mountDialog() 这类命令式 API？（antd 为此付出了整套代价：另起组件树 + useModal/contextHolder + 模块级 destroyFns + setTimeout 异步渲染 + getContainer 失效告警；TDesign 的 DialogPlugin 里 destroy() 硬编码 300ms、多实例不自毁残留 DOM；Popover spec 已把 imperative 列为 non-feature）',
    options: [
      { letter: 'A', text: '不做：只有模板式组件，异步确认流程由使用者持有 modelValue', recommended: false },
      { letter: 'B', text: '做 yueConfirm(options) 单例式确认框，返回 promise，内部用统一挂载点与 after-close 卸载', recommended: false },
      { letter: 'C', text: '第一版只做模板式；把确认流程做成可选的独立包/入口（不污染主组件 API），且卸载信号必须是动效 after-close 而非硬编码延时', recommended: true },
    ],
    recommended: ['C'],
  },
  {
    id: 19,
    round: 3,
    required: true,
    introducedBy: 'finding-vuetify-overlay',
    summary: '滚动归属',
    question:
      '内容超长时谁负责滚动？（Vuetify 三态纯样式实现且可核验细节最多；TDesign/antd 都是整卡在一个 overflow:auto 视口里，头脚会一起滚走）',
    options: [
      { letter: 'A', text: '整卡滚动：dialog 卡片自身 overflow:auto，header/footer 随之滚走', recommended: false },
      { letter: 'B', text: '正文滚动：header/footer 固定，default 插槽区域 overflow:auto（需要内容高度约束）', recommended: false },
      { letter: 'C', text: '两态并存：默认整卡，scrollable 属性切换为正文滚动；fullscreen 模式整屏滚动', recommended: true },
      { letter: 'D', text: '不约束，完全交给使用者自己放 overflow', recommended: false },
    ],
    recommended: ['C'],
  },
  {
    id: 20,
    round: 3,
    required: true,
    introducedBy: 'finding-tdesign-dialog',
    summary: '滚动锁定',
    question:
      '背景页面的滚动锁怎么做？（TDesign 向 body 注入高优先级 style 并用 width:calc(100% - Npx) 补偿滚动条、关闭后延迟 150ms 移除；Vuetify 把滚动坐标取负写进 CSS 变量、解锁时临时 scroll-behavior:auto、滚动条用 padding-inline-end 补偿、html 特殊处理为 position:fixed；antd 只做 body overflowY:hidden，滚动条补偿未找到。三家共同风险是锁滚时页面横向跳动）',
    options: [
      { letter: 'A', text: '锁 document：body overflow:hidden + 实测滚动条宽度补偿（注入样式或内联）', recommended: false },
      { letter: 'B', text: '锁 document：overflow:clip + scrollbar-gutter:stable 从源头消除跳动，不做坐标存取；不支持的浏览器接受轻微位移', recommended: true },
      { letter: 'C', text: '不锁文档，只让 dialog 内容自滚，背景可自由滚动（非模态场景友好，但模态语义变弱）', recommended: false },
      { letter: 'D', text: '提供 scrollLock 开关，模态默认锁、非模态默认不锁，锁实现按 B', recommended: false },
    ],
    recommended: ['B'],
  },
  {
    id: 21,
    round: 3,
    required: true,
    introducedBy: 'finding-vuetify-overlay',
    summary: '嵌套与顶层仲裁',
    question:
      '多实例嵌套与同时打开时如何管理？（Vuetify：模块级 reactive 栈，z = 栈顶 + 10，Esc→globalTop、外点→localTop 且必须落在自身 scrim；antd：容器每层 +100 但嵌套不叠加基值；TDesign：zIndex prop + usePopupManager 的 1000+n 只用于顶层判定，等于三套并行）',
    options: [
      { letter: 'A', text: '不做栈：每个实例用自己的 --layer-modal，依赖 DOM 顺序覆盖；Escape 谁监听谁就关（会误关底层）', recommended: false },
      { letter: 'B', text: '最小栈：模块级 reactive 序列 + "是否顶层"谓词，Escape 只关顶层，后开的 dialog 自动压在前面之上；不公开 z-index 计算细节', recommended: true },
      { letter: 'C', text: '完整栈 + zIndex prop + 内部浮层继承（antd 式 context 下发），允许使用者显式指定层级', recommended: false },
      { letter: 'D', text: '明确禁止嵌套：dev 环境下检测到第二个模态实例即告警', recommended: false },
    ],
    recommended: ['B'],
  },
  {
    id: 22,
    round: 3,
    type: 'multi-choice',
    required: true,
    introducedBy: 'finding-popover-boundary',
    summary: '验证契约',
    question:
      '哪些验证必须成为 Dialog 的交付门禁？（multi-choice。Popover 那一轮成立的做法是把这些写成可执行断言而非愿望：axe 扫描、forced-colors、视觉回归、负向探针）',
    options: [
      { letter: 'A', text: 'axe 无 violation；role / aria-modal / 可访问名断言齐全', recommended: true },
      { letter: 'B', text: '焦点边界可执行测试：Tab 环回不出 dialog、inert 生效、初始焦点与回焦规则被断言', recommended: true },
      { letter: 'C', text: '视觉回归覆盖明暗主题 + forced-colors（遮罩在 forced-colors 下仍靠边框保层级）', recommended: true },
      { letter: 'D', text: '负向探针：组件 CSS 不得直读 primitive token、关闭后不得残留全局监听、遮罩点击不得误关底层实例', recommended: true },
      { letter: 'E', text: '输入法进行中按 Escape 不关（isComposing 保护）与滚动锁不引起横向跳动', recommended: true },
      { letter: 'F', text: '树摇与包边界：未使用 Dialog 时不进入产物，Dialog 不泄漏内部 overlay 实现类型', recommended: true },
    ],
    recommended: ['A', 'B', 'C', 'D', 'E', 'F'],
  },
  // ───────────────── 第四轮：冲突消解与边界决策 ─────────────────
  // 来源：r001 快照中 Q3 选了 C（独立 + trigger 两种上下文都支持），并在备注里写
  // "内部可以复用 Popover 组件"。该备注与 Q5=B（Dialog 自包含、不改造 Popover）方向相反，
  // 也与 Q16 的"动画原点是触发器"构成依赖，因此必须先消解再冻结。
  {
    id: 23,
    round: 4,
    required: true,
    introducedBy: 'finding-popover-boundary',
    summary: '复用含义',
    question:
      'Q3 你选了 C（独立上下文 + trigger 上下文都支持），备注"内部可以复用 Popover 组件"。'
      + '这句话有两种读法，后果完全不同：'
      + '① 若指"Dialog 可以出现在 Popover 内容里，两者叠加时层级/Escape/trap 必须共存正确"——那是嵌套场景需求，Dialog 仍可自包含，与 Q5=B 不冲突；'
      + '② 若指"Dialog 的实现底座复用 YuePopover 组件"——那直接与 Q5=B 冲突，也撞上 Popover spec 把模态遮罩/trap/背景不可达列为 non-feature 的边界。'
      + '（事实补充：仓库里已有一个 YuePopover 的 detached/Teleport 实现，但 Popover 的 spec 明确拒绝承接模态语义；'
      + '另需留意 Q10 你选了 C（inert + Tab 环回双开）——若 Dialog 要从 Popover 内容里打开并对背景页面设 inert，'
      + 'Popover 自己 teleport 在应用根之外，会被 inert 连带屏蔽，导致浮层里剩下一个点不动的 Dialog）',
    options: [
      { letter: 'A', text: '①：要的是"Dialog 能从 Popover 内容里打开"这个嵌套场景，Dialog 实现仍自包含（Q5=B 不变）', recommended: true },
      { letter: 'B', text: '②：Dialog 以 YuePopover 为底座，Popover 新增模态相关 props/插槽来承接 trap + 遮罩 + 锁滚', recommended: false },
      { letter: 'C', text: '②的变体：把 Popover 与 Dialog 共用的运行时（teleport / 栈 / 关闭渠道 / 回焦 / 锁滚）抽成 packages/hooks 内部层，两者各自消费，Popover 同步改造', recommended: false },
      { letter: 'D', text: '取消 trigger 上下文，回到 Q3=A：Dialog 只有独立上下文，不做任何 Popover 关联', recommended: false },
    ],
    recommended: ['A'],
  },
  {
    id: 24,
    round: 4,
    type: 'multi-choice',
    required: true,
    introducedBy: 'user-export-artifact-6',
    summary: '关闭配置粒度',
    question:
      'Q6 的导出结果是 letters=[A]，备注写"选择 A B C"。面板把该题渲染成了单选（我在 data.js 里漏标 multi-choice），'
      + '所以我按备注把它修正为 A+B+C，并已把 data.js 的该题改为 multi-choice——请确认这正是你的意思（字母已预填，只需确认）。'
      + '顺带定粒度：这些渠道要不要各自可关？（事实补充：Q7 已决定有 before-close 可否决，所以"临时禁止遮罩关闭"有两种实现路径）',
    options: [
      { letter: 'A', text: '确认 A+B+C 是我要的；三个渠道默认全开，只用一个 persistent prop 整体禁止非按钮关闭', recommended: true },
      { letter: 'B', text: '确认 A+B+C 是我要的；但拆成 closeOnEscape / closeOnScrim 两个独立开关（对齐 Popover 现有 prop 形状）', recommended: false },
      { letter: 'C', text: '确认 A+B+C 是我要的；渠道全开且不做任何关闭开关，拦截一律走 before-close', recommended: false },
      { letter: 'D', text: '我改主意了（请在备注里写明新的渠道组合）', recommended: false },
    ],
    recommended: ['A'],
  },
  {
    id: 25,
    round: 4,
    required: true,
    introducedBy: 'user-answer-16',
    summary: '无触发器时的动画原点',
    question:
      'Q16 你写"基于 TDesign 的动画效果，再同步遮罩与内容动画，动画原点是触发器"。'
      + '"原点是触发器"只在 trigger 上下文成立；而程序化打开（异步流程、路由守卫、Q18 的确认流程）没有触发器。'
      + '参照事实：TDesign 的缩放原点固定为视口中心；antd/Vuetify 用全局捕获的鼠标位置（100ms 窗口），代码调用退化为中心。'
      + '本题与 Q23 无关，无论 Q23 选什么都需要这个回落规则。',
    options: [
      { letter: 'A', text: '无触发器时回落到视口中心（同 TDesign），有触发器时用触发器几何中心', recommended: true },
      { letter: 'B', text: '总是用最后一次指针位置（antd/TDesign 式），无指针信息时退化为中心', recommended: false },
      { letter: 'C', text: 'Dialog 不需要生长感：固定从中心缩放，只有 Popover/Menu 才用原点跟随', recommended: false },
      { letter: 'D', text: '无 trigger 上下文的场景改用底边滑入（贴近移动端 fullscreen 的心智）', recommended: false },
    ],
    recommended: ['A'],
  },
  {
    id: 26,
    round: 4,
    required: true,
    introducedBy: 'finding-alertdialog',
    summary: 'alertdialog',
    question:
      '破坏性确认是否要使用 alertdialog 角色？（三家组库都没做：antd 的 role 恒为 dialog，TDesign 无任何 ARIA，Vuetify 只有 dialog。'
      + '差异：alertdialog 下辅助技术预期"必须回应"，且惯例是禁止遮罩/退出键关闭。Q1=A 已把破坏性确认列入核心场景）',
    options: [
      { letter: 'A', text: '不做：role 恒为 dialog，破坏性只靠内容里的危险按钮表达', recommended: false },
      { letter: 'B', text: '做：theme/variant 中的 danger 值同时切换 aria-modal 角色为 alertdialog、图标与主按钮样式，并默认关闭 Escape/遮罩', recommended: true },
      { letter: 'C', text: '做：暴露 role prop（dialog | alertdialog），角色与关闭渠道由使用者自己组合', recommended: false },
    ],
    recommended: ['B'],
  },
  {
    id: 27,
    round: 4,
    required: true,
    introducedBy: 'finding-layer-modal',
    summary: '子浮层层级',
    question:
      'Q9=B 之后：模态基值（--layer-modal）高于 --layer-popover(30)/--layer-tooltip(40)/--layer-toast(50) 时，'
      + 'dialog 内部的 tooltip、menu、select 会不会被 dialog 本体盖住？（Q21 的栈只解决 dialog 之间，不解决 dialog 内部浮层。'
      + '参照：antd 把当前层级经 context 下发给内部浮层并 +50；Vuetify 用局部栈 localTop + 可关闭全局栈的私有逃生口）',
    options: [
      { letter: 'A', text: '不做特殊处理：dialog 根不建层叠上下文，内部浮层继续用全局 token，靠 DOM 顺序', recommended: false },
      { letter: 'B', text: 'dialog 根建立层叠上下文，内部浮层在 dialog 之上相对定位；不向消费者公开 z-index 细节', recommended: true },
      { letter: 'C', text: '向内部浮层下发层级偏移（antd 式 context），但这需要 Menu/Select/Tooltip 已存在，本次只记录为待办', recommended: false },
    ],
    recommended: ['B'],
  },
  {
    id: 28,
    round: 4,
    required: true,
    introducedBy: 'user-export-artifact-22',
    summary: '验证契约确认',
    question:
      'Q22 的导出是 letters=[A]，备注写"我选择 A B C D E F"，同是被我漏标 multi-choice 导致的录入错位。'
      + '我已把 Q22 改为 multi-choice，并按你的备注**预填了 A-F**（Q6 的 A+B+C 同理已预填）——'
      + '但预填是 Agent 的操作不是你的决策，请在 Q22 上过一眼，不对就改。'
      + '本题只问：除了这六项，你还想加什么门禁？'
      + '候选（选 B 时写在备注里即可）：RTL/阿拉伯语镜像、iOS Safari 地址栏收起时的锁滚跳动、SSR/hydration 下的 teleport 挂载、模态下背景对屏幕阅读器真正不可达（inert 实际生效的断言）。',
    options: [
      { letter: 'A', text: '确认 Q6/Q22 的预填就是我要的，不再加门禁', recommended: true },
      { letter: 'B', text: '预填基本对，但我还要加门禁（写在备注里；Q22 的改动直接在题上勾）', recommended: false },
      { letter: 'C', text: '我不确定，你按 Popover 那一轮已有的门禁清单对齐就行', recommended: false },
    ],
    recommended: ['A'],
  },
  {
    id: 29,
    round: 4,
    required: true,
    introducedBy: 'finding-token-surface',
    summary: 'Token 契约广度',
    question:
      'Q8=B 确定新增 --dialog-* 命名空间。它的公开广度到哪里？（现状参照：--popover-* 公开 10 个，全部转指 --box-*-popover 或语义 token；'
      + '而 --box-*-dialog 已经包含背景/前景/边框色/边框宽/圆角/内边距/阴影七项，dialog 还需要宽度、头部/底部、间距、动效时长等 box 里没有的轴）',
    options: [
      { letter: 'A', text: '全镜像：每个表面轴都提供 --dialog-*（包含 background/color/border-*/radius/padding/shadow），使用者可一处覆写', recommended: false },
      { letter: 'B', text: '只公开 dialog 特有的结构轴（宽度档位、头/脚高度与间距、遮罩与动效时长）；表面色继续读 --box-*-dialog，不包一层二重间接', recommended: true },
      { letter: 'C', text: '最小面：只公开宽度档位与动效时长，其余靠公开的结构类名覆写', recommended: false },
    ],
    recommended: ['B'],
  },
  {
    id: 30,
    round: 4,
    required: true,
    introducedBy: 'user-answer-16',
    summary: '动效机制',
    question:
      'Q16 被标成了“无法散文定夺”，但你给的答案其实已把机制定了下来（TDesign 式缩放 + 遮罩与内容同步 + 原点跟随触发器），'
      + '剩下的只是具体时长/曲线/位移数值。把机制单独拎出来确认，数值给 Q16 走原型。'
      + '（事实补充：遮罩与内容不同步是 TDesign/antd/Vuetify 三家的共同缺陷——TDesign 因 CSS 0.2s / JS 300ms 双源导致事件比视觉晚 100ms；'
      + 'Vuetify 遮罩 0.3s vs 内容 225/125ms）',
    options: [
      { letter: 'A', text: '确认机制：遮罩纯 opacity 淡入 + 卡片 scale+opacity 生长，两者共用单一时长源（同一 --dialog-duration-* / --dialog-ease token 与同一动效类），after-close 由真实的 transitionend 而非写死延时驱动', recommended: true },
      { letter: 'B', text: '机制同上，但允许遮罩比卡片短（视觉分层更清），代价是两个时长 token 与两处同步逻辑', recommended: false },
      { letter: 'C', text: '不依赖 transitionend，退场用固定延时兜底（TDesign 式，实现简单但必然出现双时长源）', recommended: false },
    ],
    recommended: ['A'],
  },
  {
    id: 31,
    round: 4,
    required: true,
    introducedBy: 'finding-popover-boundary',
    summary: '降低动效降级',
    question:
      'reduced-motion 下的降级强度？（事实补充：YuePopover 的既有硬规则是“偏好降低动效时必须零时长”；Vuetify 则保留 125/85ms 的纯 opacity 过渡，不是零时长。两者不能直接兼容，需要明确 Dialog 站哪边）',
    options: [
      { letter: 'A', text: '与 Popover 一致：零时长，遮罩与卡片直接到位（库内一致，最保守）', recommended: true },
      { letter: 'B', text: '允许保留短纯 opacity（≤ 150ms），去除 scale 与位移（Vuetify 式）', recommended: false },
      { letter: 'C', text: '零时长仅适用于退场，入场仍可短淡入', recommended: false },
    ],
    recommended: ['A'],
  },
];
