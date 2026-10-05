/**
 * YueTag 组件设计访谈 — data.js
 * 由 Agent 生成，panel.html 通过 <script src="./data.js"> 加载。
 * 修改此文件即可更新问题，无需碰 panel.html。
 */

window.COMPONENT_NAME = 'YueTag';
window.SCHEMA_VERSION = 2;
window.TEMPLATE_VERSION = '2.0.0';
window.FINDINGS = [];

window.SECTIONS = [
  { title: '第一轮：组件边界与家族划分', start: 1, end: 4 },
  { title: '第二轮：视觉轴——variant、theme、size、shape', start: 5, end: 9 },
  { title: '第三轮：可关闭与可选择行为', start: 10, end: 13 },
  { title: '第四轮：API 细节与非功能决策', start: 14, end: 17 },
];

window.QUESTIONS = [
  // ── 第一轮 ──────────────────────────────────────────────────
  {
    id: 1,
    round: 1,
    summary: '家族范围',
    question:
      'Tag 家族此次要包含哪些成员？TDesign 把"静态标注"和"可选择"拆成 TTag / TCheckTag 两个组件；Ant Design 做法相同。' +
      '这次我们一起设计，还是先只做静态标注型，可选择留到后续迭代？',
    options: [
      {
        letter: 'A',
        text: '只设计静态标注型 YueTag（closable 可选），可选择型后续单独立项',
        recommended: true,
      },
      {
        letter: 'B',
        text: '同时设计 YueTag + YueCheckTag，本次一起冻结 API',
        recommended: false,
      },
      {
        letter: 'C',
        text: '只做 YueTag，但预留 checked/onChange 接口，后续平滑升级',
        recommended: false,
      },
    ],
    recommended: 'A',
  },
  {
    id: 2,
    round: 1,
    summary: '语义元素',
    question:
      '标注型 Tag 渲染成什么元素？TDesign 用 <div>，Ant Design 用 <span>。' +
      'Tag 通常出现在文本流内（<span> 更自然）或独立块中（<div>/<span> 均可）。' +
      'Yue 的 Button 已经支持 tag prop 切换元素，Tag 是否也需要这个能力？',
    options: [
      {
        letter: 'A',
        text: '默认渲染 <span>，不暴露 tag prop（保持简单）',
        recommended: true,
      },
      {
        letter: 'B',
        text: '默认渲染 <span>，保留 tag prop 支持切换（与 YueButton 保持一致）',
        recommended: false,
      },
      {
        letter: 'C',
        text: '默认渲染 <div>（行内块，布局更可预测）',
        recommended: false,
      },
    ],
    recommended: 'A',
  },
  {
    id: 3,
    round: 1,
    summary: '导航能力',
    question:
      'Tag 是否需要支持链接导航（href / router-link）？' +
      'Ant Design 6.0 新增了 href + target，TDesign 不支持。' +
      '如果 Tag 只是标注，导航属于非功能；但如果业务需要"可点击跳转的标签"，这里要决策。',
    options: [
      {
        letter: 'A',
        text: '不支持导航，Tag 只做标注；链接场景用 YueButton variant=link 替代',
        recommended: true,
      },
      {
        letter: 'B',
        text: '支持 href + target，内部切换为 <a> 标签',
        recommended: false,
      },
    ],
    recommended: 'A',
  },
  {
    id: 4,
    round: 1,
    summary: '点击交互',
    question:
      '静态标注型 Tag 是否需要 onClick 事件？' +
      'TDesign 暴露了 onClick（但 disabled 时不触发）。' +
      '如果不暴露，点击直接透传给原生 span；如果暴露，需要定义 disabled 行为。',
    options: [
      {
        letter: 'A',
        text: '暴露 onClick，disabled 时阻止触发（与 TDesign 一致）',
        recommended: true,
      },
      {
        letter: 'B',
        text: '不暴露 onClick，点击事件由消费者自行绑定（保持 Tag 纯展示）',
        recommended: false,
      },
    ],
    recommended: 'A',
  },

  // ── 第二轮 ──────────────────────────────────────────────────
  {
    id: 5,
    round: 2,
    summary: 'variant 轴',
    question:
      'Tag 的视觉变体轴叫什么，包含哪些值？' +
      'TDesign 用 variant: dark | light | outline | light-outline。' +
      'Ant Design 6 用 variant: filled | solid | outlined。' +
      'Yue Button 用 variant: solid | outline | dashed | text | link。' +
      '参考 Button 的命名语义，Tag 的 variant 值是什么？',
    options: [
      {
        letter: 'A',
        text: 'filled（纯色填充）| tint（淡色背景）| outline（描边无填充）| tint-outline（淡色+描边）',
        recommended: true,
      },
      {
        letter: 'B',
        text: '复用 Button 的 solid | outline | dashed，去掉 text 和 link',
        recommended: false,
      },
      {
        letter: 'C',
        text: '不设 variant，只用 theme 控制颜色，视觉固定为淡色背景',
        recommended: false,
      },
    ],
    recommended: 'A',
  },
  {
    id: 6,
    round: 2,
    summary: 'theme 轴',
    question:
      'Tag 的语义色角色（theme）与 Button 保持一致吗？' +
      'Yue Button 的 theme: default | primary | success | warning | danger。' +
      'TDesign 多了 primary 的具体颜色定制，Ant Design 还支持任意色值字符串。' +
      '这次 Tag 是否直接复用这五个 theme，还是有增减？',
    options: [
      {
        letter: 'A',
        text: '直接复用 Button 的五个 theme，不添加自定义颜色字符串',
        recommended: true,
      },
      {
        letter: 'B',
        text: '复用五个 theme，额外支持 color 属性传任意色值（TDesign 方案）',
        recommended: false,
      },
      {
        letter: 'C',
        text: '裁减为 default | primary | danger，去掉 success 和 warning',
        recommended: false,
      },
    ],
    recommended: 'A',
  },
  {
    id: 7,
    round: 2,
    summary: 'size 轴',
    question:
      'Tag 的尺寸枚举与 ComponentSize 保持一致吗？当前 Yue 的 ComponentSize = sm | md | lg。' +
      'TDesign 是 small | medium | large，Ant Design 6 是 small | middle | large。',
    options: [
      {
        letter: 'A',
        text: '直接复用 ComponentSize（sm | md | lg），与 Button/Input 完全对齐',
        recommended: true,
      },
      {
        letter: 'B',
        text: '定义独立的 TagSize，以便后续单独扩展（如新增 xs）',
        recommended: false,
      },
    ],
    recommended: 'A',
  },
  {
    id: 8,
    round: 2,
    summary: 'shape 轴',
    question:
      'Tag 需要多种形状吗？TDesign 支持 square | round | mark（标记型，左侧半圆）。' +
      'Ant Design 不区分形状，默认圆角。' +
      'Yue Button 有 square | round | circle。',
    options: [
      {
        letter: 'A',
        text: '支持 square（直角）| round（胶囊），不做 mark 类标记型',
        recommended: true,
      },
      {
        letter: 'B',
        text: '只有一种形状（圆角矩形），不设 shape prop',
        recommended: false,
      },
      {
        letter: 'C',
        text: '支持 square | round | mark，与 TDesign 保持一致',
        recommended: false,
      },
    ],
    recommended: 'A',
  },
  {
    id: 9,
    round: 2,
    summary: '文字截断',
    question:
      'Tag 是否支持 maxWidth 溢出省略？TDesign 通过 maxWidth prop 控制，内部用 text-overflow: ellipsis。' +
      '使用场景：动态标签内容可能很长（如用户输入的 tag）。',
    options: [
      {
        letter: 'A',
        text: '支持 maxWidth prop（接受 string | number），超出截断并显示 title tooltip',
        recommended: true,
      },
      {
        letter: 'B',
        text: '不支持 maxWidth，截断由消费者在容器上自行处理',
        recommended: false,
      },
    ],
    recommended: 'A',
  },

  // ── 第三轮 ──────────────────────────────────────────────────
  {
    id: 10,
    round: 3,
    summary: 'closable',
    question:
      'closable Tag 的关闭按钮用什么实现？' +
      'TDesign 用内置图标 + onClose 事件，支持全局替换 closeIcon。' +
      'Yue 目前没有图标系统。关闭按钮用 slot 还是内置 SVG 还是字符 ×？',
    options: [
      {
        letter: 'A',
        text: '内置简单 SVG × 图标，提供 close-icon slot 允许替换',
        recommended: true,
      },
      {
        letter: 'B',
        text: '只用 close-icon slot，不内置默认图标（消费者必须传）',
        recommended: false,
      },
      {
        letter: 'C',
        text: '内置 Unicode × 字符，不提供 slot（最简方案）',
        recommended: false,
      },
    ],
    recommended: 'A',
  },
  {
    id: 11,
    round: 3,
    summary: 'close 事件',
    question:
      'closable Tag 点击关闭时，组件自己消失还是只抛事件让父级决定？' +
      'TDesign 只抛 onClose 事件，父级控制显示逻辑（受控）。' +
      'Ant Design 也是同样的纯受控方案。',
    options: [
      {
        letter: 'A',
        text: '纯受控：只 emit close 事件，组件不自行隐藏（与 TDesign/Ant Design 一致）',
        recommended: true,
      },
      {
        letter: 'B',
        text: '非受控默认：点击后自动隐藏，同时 emit close；父级可阻止',
        recommended: false,
      },
    ],
    recommended: 'A',
  },
  {
    id: 12,
    round: 3,
    summary: 'disabled 行为',
    question:
      'disabled Tag 的行为是什么？TDesign 的 disabled 只对 default theme 生效，其他 theme 不支持。' +
      'Yue 是否全 theme 都支持 disabled，还是限制范围？',
    options: [
      {
        letter: 'A',
        text: '全 theme 均支持 disabled，统一降低 opacity 并阻止事件',
        recommended: true,
      },
      {
        letter: 'B',
        text: '只有 default theme 支持 disabled（与 TDesign 保持一致）',
        recommended: false,
      },
    ],
    recommended: 'A',
  },
  {
    id: 13,
    round: 3,
    summary: '图标插槽',
    question:
      'Tag 是否需要前置图标插槽？TDesign 通过 icon slot 或 icon prop 支持前置图标，常见用途是给标签加类型图标。',
    options: [
      {
        letter: 'A',
        text: '提供 icon slot（前置），不提供 trailing slot（关闭按钮已占用后置）',
        recommended: true,
      },
      {
        letter: 'B',
        text: '不提供 icon slot，消费者把图标放在 default slot 里自己排版',
        recommended: false,
      },
    ],
    recommended: 'A',
  },

  // ── 第四轮 ──────────────────────────────────────────────────
  {
    id: 14,
    round: 4,
    summary: '属性透传',
    question:
      'fallthrough attributes 默认落在哪个元素上？Tag 的根元素就是 <span>，' +
      '没有 wrapper + inner 的两层结构，所以 class/style/data-* 都落根元素即可。是否有需要重定向的属性？',
    options: [
      {
        letter: 'A',
        text: '全部透传到根 <span>，不做重定向（Tag 结构简单，无需分层）',
        recommended: true,
      },
      {
        letter: 'B',
        text: '将 class/style 透传到根，其余属性重定向到内部文本 span',
        recommended: false,
      },
    ],
    recommended: 'A',
  },
  {
    id: 15,
    round: 4,
    summary: 'i18n',
    question:
      '关闭按钮的 aria-label 是否需要 i18n？' +
      'Yue 已有 locale 系统（YueLocaleProvider）。关闭按钮的无障碍标签 "关闭" / "Close" 应走 locale 还是硬编码？',
    options: [
      {
        letter: 'A',
        text: '走 locale 系统，在 zh-CN / en-US 中各注册一条 tag.closeLabel',
        recommended: true,
      },
      {
        letter: 'B',
        text: '接受 closeAriaLabel prop，消费者自己传；不走 locale',
        recommended: false,
      },
      {
        letter: 'C',
        text: '硬编码英文 "Remove tag"，暂不处理 i18n',
        recommended: false,
      },
    ],
    recommended: 'A',
  },
  {
    id: 16,
    round: 4,
    summary: '非功能项',
    question:
      '以下功能这次明确不做，逐项确认：' +
      '① 可选择型 CheckTag ② 自定义色值字符串（color prop）③ mark 标记形状 ④ Tag 输入框（TagInput）。' +
      '有哪些需要改变决策？',
    options: [
      {
        letter: 'A',
        text: '全部确认为非功能，后续单独立项',
        recommended: true,
      },
      {
        letter: 'B',
        text: '① CheckTag 需要提前做，其余不做',
        recommended: false,
      },
      {
        letter: 'C',
        text: '② 自定义 color prop 需要，其余不做',
        recommended: false,
      },
    ],
    recommended: 'A',
  },
  {
    id: 17,
    round: 4,
    summary: '组件文件结构',
    question:
      '参考 Button 的目录结构（YueButton.vue / style.css / types.ts / index.ts），' +
      'Tag 是否按同样模式组织？如果第一轮决定同时做 YueCheckTag，则会多一个文件。',
    options: [
      {
        letter: 'A',
        text: '同 Button 模式：tag/YueTag.vue + style.css + types.ts + index.ts',
        recommended: true,
      },
      {
        letter: 'B',
        text: '加一层 tag/ 子目录再细分（为未来 CheckTag 留空间）',
        recommended: false,
      },
    ],
    recommended: 'A',
  },
];
