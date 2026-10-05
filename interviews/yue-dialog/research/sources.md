# YueDialog 调研素材与借用/拒绝记录

## 快照 r001 的机械化修正（Agent 操作，不是用户决策）

用户在面板上一口气答完 22 题并选择 freeze。读取 `answers.json` 后发现三处不能直接当作决策记录的问题，
已在 `data.js` 第四轮（Q23–Q31）中回问，原样保存在 `history/answers-r001.json`：

1. **Q6 / Q22 录入错位（我的缺陷）**：两题本意是多选，但我在 `data.js` 里漏标 `type: 'multi-choice'`，
   面板按单选渲染，导致导出 `letters` 只有一个字母，而备注写着完整组合（Q6「选择 A B C」、
   Q22「我选择 A B C D E F」）。已把两题改为 `multi-choice`，并按**备注里的直接枚举**预填字母
   （这两处备注就是在列出选项，不是在表达倾向），并在 Q24 / Q28 中请用户确认——
   预填是 Agent 的操作，不构成决策，用户必须亲眼看并确认。
2. **Q3 与 Q5 方向冲突**：Q3 选 C（独立 + trigger 两种上下文都支持）并在备注写「内部可以复用 Popover 组件」，
   而 Q5 选 B（Dialog 自包含、不改造 Popover）。「底座复用 Popover」与「自包含」互斥，
   且后者撞上 Popover spec 把模态遮罩 / trap / 背景不可达列为 non-feature 的边界。→ Q23。
3. **Q16 状态与内容矛盾**：该题被我标为 `prototype-gate`（不可散文定夺），用户却给出了机制级答案
   （TDesign 式缩放 + 遮罩内容同步 + 原点为触发器），且选了解冻之外的 `decided`。
   已把**机制**拆为 Q30（可散文定夺）、**数值**留在 Q16 走原型，并把 Q16 的 `required` 由 false 改为 true
   ——三家组库的共同缺陷正是遮罩与内容不同步，这不该是可选门禁。

另：Q16 的「动画原点是触发器」依赖 Q3 的 trigger 上下文是否存在，因此追加 Q25 确定无触发器时的回落规则。

生成于第一轮访谈之前。来源均为 `refer/` 内本地副本，逐条可核验；读不到的东西在本文件里明写"未找到"，
不做推测性陈述。本文件的职责是保留证据颗粒度，`data.js` 的 `FINDINGS` 是它的摘要。

## 一、参照系

### 1. TDesign Dialog

- 组件源码：`refer/tdesign-vue-next/packages/components/dialog/`
- 样式与 token：`refer/tdesign-common/style/web/components/dialog/`

**借（设计意图，不借类名/prop 名/实现）**

- 五层 DOM 职责分离：层级容器 / 遮罩 / 滚动视口 / 对齐层 / 卡片，每层只做一件事。
- "点击空白关闭"的判定放在**对齐层**，并要求 mousedown 与 mouseup 落在同一目标，避免卡内拖选误关。
- 键盘渠道做输入法保护（composition 进行中不响应退出键），并在多个浮层共存时先判定"我是不是当前顶层"。
- 卸载信号只有一个：离场动画结束。lazy 挂载 / 关闭后保留 / 关闭即销毁是三档正交语义。
- 遮罩动画与内容动画分离，可各自降级。

**拒**

- 无障碍完全空缺：无 role、无 `aria-modal`、无可访问名绑定；关闭控件是不可 Tab 到达的 `span + svg`。
- 打开时主动 blur 当前焦点，既无 trap 也无回焦。
- 用一个模式 prop 同时决定遮罩、定位、可拖拽、锁滚 —— 四件事被绑死，无法独立组合。
- 锁滚靠向 body 注入高优先级样式 + `width:calc(100% - Npx)` 补偿，关闭后再延迟 150ms 移除。
- 动画时长双源：CSS 侧 0.2s、JS 侧写死 300ms，事件与卸载比视觉晚约 100ms。
- Web 端样式无任何运行时变量（构建期塌陷），无法主题化、无法局部覆写。
- 关闭所有权不对称：确认按钮不自动关，其余渠道强制改写可见性且使用者无法否决。

### 2. Ant Design Modal

- 源码：`refer/ant-design/components/modal/`
- **证据限制**：仓库内无 `node_modules`，底层 `@rc-component/dialog` 源码不可读；`react-focus-lock` 与 `scrollLocker` 在全仓 0 命中，只能确认"未被引用"，不能确认其行为。本节目的 = antd 自身源码 + Jest 快照 + 测试名。

**借**

- 可访问名用框架的稳定 id 机制自动生成并绑定标题；焦点陷阱的默认值**由模态语义派生**（有遮罩即 trap），而不是要求使用者显式开启。
- 层级用栈模型：基值只在顶层生效、嵌套不叠加，并把当前值下发给内部浮层，避免嵌套时层级指数增长。
- 动作区回调返回 promise 时自动进入 pending 态；离场结束事件是唯一卸载点。
- 语义槽位的样式/类名注入（含函数式读取当前 props），比几十个离散 props 更可维护。
- 一个 `wireframe` 开关切换两套结构，便于无装饰场景。

**拒**

- 命令式静态方法与模板式组件并存所带来的一整套代价：另起组件树、context holder、模块级销毁列表、异步渲染补丁、容器配置对静态方法失效只能告警。
- 确认类弹窗复用同一套结构却把真实标题 `display:none`，可访问名指向隐藏节点。
- 始终用 `dialog` 角色，破坏性确认也不升级为 `alertdialog`；`aria-describedby` 全仓 0 命中。
- 行为由回调形参个数决定（`actionFn.length`）。
- 遮罩与内容动画时长不同步（作用域覆写后二者结束时间不一致）。
- 废弃 prop 长期共存，靠告警过渡。

### 3. Vuetify Overlay / Dialog

- 源码：`refer/vuetify/packages/vuetify/src/components/VOverlay/`、`.../VDialog/`、
  `src/composables/stack.ts`、`src/composables/focusTrap.ts`、`VOverlay/scrollStrategies.ts`
- **路径勘误**：`VOverlay/types.ts`、`composables/zindex`、`composables/useScroll`、
  `prohibited/activeWatchers/useClose`、`packages/api-cases/` 均不存在，最初的任务描述基于错误假设。
  测试只有 `.spec.browser.tsx`，无 Node 单测。

**借**

- 三级堆叠的可行性：底座（运行时）→ 模态（语义 + 默认值）→ 形态（sheet）。VDialog 只有约 136 行，
  说明"模态语义层"应当很薄。
- 栈：模块级 reactive 序列，激活时取全局栈顶 + step，空栈回落到自身默认基值；销毁时线性移除。
- 关闭权分配：退出键只给全局顶层，外部点击只给局部顶层且必须落在自身遮罩，子浮层不得关闭父级。
- 焦点陷阱两条路线：Tab 环回（文档级单监听 + 引用计数，向上找最近激活容器为边界）与捕获式拉回
  （一次性 focusin，指针按下后 100ms 抑制）。首个焦点落在内容包裹容器而不是第一个控件。
- 滚动锁的可核验细节最完整：滚动祖先去重、跳过已锁、坐标取负写入 CSS 变量、解锁时临时关闭
  平滑滚动以保证同步复位、文档滚动条用内联边距补偿、根元素特例处理为固定定位、整个策略跑在独立
  effect scope 并等一帧后启动。
- 滚动归属三态由样式决定，不需要 JS 参与。
- 尊重降低动效偏好时退化为纯透明度变化；面积过大时放慢动画。

**拒**

- 为定位付出的 588 行策略代码：dialog 实际需要的是约 35 行弹性居中，锚定定位应留给 Menu/Tooltip。
- 408 行激活器矩阵（hover/focus/click 组合与计时补丁）与 dialog 无关。
- 私有逃生口（禁用全局栈、子菜单通道）与用 DOM 类名字符串判断组件身份。
- 背景不可达不用原生机制，仅靠事后拉回；可访问名与描述完全不绑定；回焦逻辑在三处各写一遍。
- 遮罩独立 0.3s 淡入与内容 225/125ms 不同步；大量无解释的魔法数字。
- transition 的多型联合与没有消费者的 persisted 字段。

## 二、Yue 侧既有事实（本次访谈的硬约束）

| 事实 | 位置 | 影响 |
| --- | --- | --- |
| Popover 把 trap / 模态遮罩 / 背景不可达 / 返回键明确列为 non-feature，归属 YueDialog | `.spec-workflow/yue-popover/spec.md` | Dialog 是这些能力的首个也是唯一归属地 |
| Popover 承诺"Menu/Select/Tooltip/Dialog 复用无语义 hooks" | 同上 L24 | 底座必须无语义；但 hooks 包目前只有 config/locale/namespace |
| Popover 立场：不内置关闭按钮与 locale 文案 | 同上 L67 | Dialog 若要内置按钮，等于推翻该立场，须显式决策 |
| 七个 `--box-*-dialog` 表面契约已存在且已冻结 | `packages/tokens/src/component-tokens/box.css` | Dialog 的表面值不必从头设计 |
| 词表无 `dialog` 命名空间 | `tools/lib/token-vocabulary.mjs` | 新增 `--dialog-*` 需同时改 PHRASES 与 PACKAGE_ONLY_TOKENS |
| `--layer-dialog: 20` 低于 `--layer-popover: 30`，tooltip/toast 更高 | `packages/tokens/src/primitives/effects.css` | 模态层级与模态语义矛盾，必须修 |
| `--scrim` 明 0.56 / 暗 0.64 | `packages/tokens/src/semantics/scrim.css` | 比三家参照都重，是否直接用作遮罩需看画面 |
| 仓库自己的 dialog 视觉意图档案（fixed + grid 居中 + padding + scrim + forced-colors 边框） | `packages/tokens/src/prototype/overlay.css` | 结构骨架已有共识，不是空白起步 |
| locale catalog 只有 2 个叶子键，形状由 `satisfies` 硬校验，每键需元数据 | `packages/vue/src/locale/catalog.ts` | 内置文案的成本可精确预估 |
| Popover 的 API 形态（modelValue/defaultOpen/expose、close 带 reason 枚举、after-open/after-close、restoreFocus） | `packages/vue/src/components/popover/types.ts` | Dialog 的 API 应当与同族对齐 |

## 三、留给原型阶段的不可散文定夺项

- 入场/退场动效类别与遮罩/内容是否共用同一时长源（Q16，`prototype-gate`）。
- 遮罩强度（现有 `--scrim` 0.56/0.64 是否过重）与卡片在明暗、forced-colors 下的层级可读性。
- 宽度档位实际观感与窄屏安全边距。
