/**
 * The canonical contrast contract for SnapClip semantic tokens.
 *
 * This list is a verbatim transcription of `const pairs` inside
 * design-tokens-generic-v4.html, which is the visual baseline for the system.
 * `tests/token-audit.test.mjs` re-extracts the array from that file and asserts
 * the two are identical, so this module cannot silently drift from the
 * prototype's own definition of "the audit still passes".
 *
 * Entry shape: [label, foregroundToken, backgroundToken | [tokens...], minimumRatio]
 * A background array is composited bottom-up (first entry is the opaque base),
 * matching the prototype's `flat()` helper.
 */
export const CONTRAST_PAIRS = [
  ['正文 / 基础表面', '--text-primary', '--surface', 4.5],
  ['次要文字 / 基础表面', '--text-secondary', '--surface', 4.5],
  ['主要操作文字 / 主要操作', '--action-on-primary', '--action-primary', 4.5],
  ['交互边界 / 基础表面', '--border-control', '--surface', 3],
  ['焦点环 / 页面背景', '--focus-ring', '--page', 3],
  ['信息文字 / 信息容器', '--info-fg', '--info-bg', 4.5],
  ['错误文字 / 错误容器', '--error-fg', '--error-bg', 4.5],
  ['成功文字 / 成功容器', '--success-fg', '--success-bg', 4.5],
  ['主按钮 悬停', '--button-primary-color', '--button-primary-background-hover', 4.5],
  ['主按钮 按下', '--button-primary-color', '--button-primary-background-pressed', 4.5],
  ['危险按钮', '--button-danger-color', '--button-danger-background', 4.5],
  ['危险按钮 悬停', '--button-danger-color', '--button-danger-background-hover', 4.5],
  ['危险按钮 按下', '--button-danger-color', '--button-danger-background-pressed', 4.5],
  ['次按钮 悬停', '--button-secondary-color', '--button-secondary-background-hover', 4.5],
  ['次按钮 按下', '--button-secondary-color', '--button-secondary-background-pressed', 4.5],
  [
    '幽灵按钮 悬停',
    '--button-ghost-color',
    ['--surface', '--button-ghost-background-hover'],
    4.5,
  ],
  ['选中项', '--selection-fg', '--selection-bg', 4.5],
  ['输入文字 / 输入背景', '--input-color', '--input-background', 4.5],
  ['占位符 / 输入背景', '--input-placeholder-color', '--input-background', 4.5],
  ['输入框边界 / 输入背景', '--input-border-color', '--input-background', 3],
  [
    '菜单项 悬停',
    '--menu-item-color',
    ['--box-background-popover', '--menu-item-background-hover'],
    4.5,
  ],
  ['列表行 悬停', '--list-row-color', ['--surface', '--list-row-background-hover'], 4.5],
  ['主题色文字 / 基础表面', '--accent-text', '--surface', 4.5],
  ['主题色文字 / 页面背景', '--accent-text', '--page', 4.5],
  ['主题色淡底文字 / 淡底', '--accent-subtle-text', '--accent-subtle', 4.5],
  ['选中文字 / 主题色', '--on-accent', '--accent-solid', 4.5],
  ['主题色边界 / 基础表面', '--accent-border', '--surface', 3],
  ['Box subtle 文字', '--box-color-subtle', '--box-background-subtle', 4.5],
  ['Box raised 文字（层级 3）', '--box-color-raised', '--box-background-raised-3', 4.5],
  ['Box inverse 文字', '--box-color-inverse', '--box-background-inverse', 4.5],
  ['输入框悬停边界 / 输入背景', '--input-border-color-hover', '--input-background', 3],
  ['强调边界 / 基础表面', '--border-strong', '--surface', 3],
]

/**
 * Gating profiles. Exactly the two scopes the browser prototype samples:
 * `:root` (light) and `[data-theme=dark]`, both with the default azure accent.
 * 32 pairs x 2 profiles = 64 gating checks per target.
 */
export const AUDIT_PROFILES = [
  { id: 'light/azure', theme: 'light', accent: 'azure' },
  { id: 'dark/azure', theme: 'dark', accent: 'azure' },
]

/**
 * Reported but never gating: the prototype's `[data-accent=neutral]` overrides
 * were never part of its contrast table, so they must not be able to turn a
 * faithful migration red.
 */
export const DIAGNOSTIC_PROFILES = [
  { id: 'light/neutral', theme: 'light', accent: 'neutral' },
  { id: 'dark/neutral', theme: 'dark', accent: 'neutral' },
]

/** Every scope the resolver is asked about, used for cross-target parity. */
export const PROBE_PROFILES = [...AUDIT_PROFILES, ...DIAGNOSTIC_PROFILES]

/** Default audit targets, resolved from the repository root. */
export const DEFAULT_TARGETS = [
  { id: 'prototype', entry: 'design-tokens-generic-v4/tokens/index.css' },
  { id: 'package', entry: 'packages/tokens/src/index.css' },
]

/** Path to the prototype, used by the transcription guard in the test suite. */
export const PROTOTYPE_HTML = 'design-tokens-generic-v4/design-tokens-generic-v4.html'
