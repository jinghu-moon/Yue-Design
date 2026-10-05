/**
 * AGENT: copy this file to  interviews/{component-kebab}/data.js
 * Fill in COMPONENT_NAME, SECTIONS, and QUESTIONS below.
 * Do NOT edit panel.html — it loads this file via <script src="./data.js">.
 *
 * JS object syntax is intentional: trailing commas and // comments are allowed,
 * which makes this far less error-prone than embedding JSON in HTML.
 */

window.COMPONENT_NAME = 'YueButton'; // e.g. "YueButton"
window.SCHEMA_VERSION = 2;
window.TEMPLATE_VERSION = '2.0.0';
window.FINDINGS = [];

window.SECTIONS = [
  // One entry per interview round.
  // start/end are inclusive question IDs.
  { title: '第一轮：组件定义与边界', start: 1, end: 4 },
  { title: '第二轮：API 设计',        start: 5, end: 9 },
  { title: '第三轮：可访问性与状态',  start: 10, end: 13 },
];

window.QUESTIONS = [
  {
    id: 1,
    round: 1,
    type: 'choice',
    required: true,
    introducedBy: null,
    summary: '使用场景',          // ≤10 字，显示在目录和进度条
    question: '这个组件的核心使用场景是什么？它解决什么问题？请选择最准确的描述。',
    options: [
      { letter: 'A', text: '触发操作（提交、确认、导航）', recommended: true  },
      { letter: 'B', text: '切换状态（开/关、选中）',       recommended: false },
      { letter: 'C', text: '两者都需要，作为统一的操作入口', recommended: false },
    ],
    recommended: ['A'],
  },
  {
    id: 2,
    round: 1,
    type: 'choice',
    required: true,
    introducedBy: null,
    summary: '组件分类',
    question: '按驱动方式分类，这个组件应该是哪种？',
    options: [
      { letter: 'A', text: 'template 驱动（在模板中声明式使用）', recommended: true  },
      { letter: 'B', text: 'imperative 驱动（通过 JS 调用创建）',  recommended: false },
    ],
    recommended: ['A'],
  },
  {
    id: 3,
    round: 1,
    type: 'multi-choice',
    required: true,
    introducedBy: null,
    summary: '首版范围',
    question: '首版需要同时覆盖哪些能力？可多选，选择结果会作为同一个设计决策保存。',
    options: [
      { letter: 'A', text: '键盘与焦点行为', recommended: true },
      { letter: 'B', text: '主题与状态 Token', recommended: true },
      { letter: 'C', text: 'Imperative API', recommended: false },
    ],
    recommended: ['A', 'B'],
  },
  // ... 继续添加问题
];
