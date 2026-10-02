/**
 * The canonical contrast contract for Yue semantic tokens.
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

/**
 * Contrast pairs that are *the package's own* contract, on top of the migrated one.
 *
 * `CONTRAST_PAIRS` above is a verbatim transcription of the prototype's table and is
 * asserted to stay that way, so it cannot grow. But the package has since gained
 * combinations the prototype never had — a `success` and a `warning` solid fill, and
 * the readable-on-surface accent role every unfilled variant draws from. Without
 * this list those would be the only Button colours nobody checks, and "warning with
 * white text" would have shipped at 3.8:1.
 *
 * Gating for the package target only: the prototype does not have these tokens, so
 * requiring them there would be a category error.
 *
 * SCOPE — this list is deliberately limited to colours the resolver can compute:
 * opaque fills and the accents drawn on a known surface. It does **not** cover the
 * hover and pressed states of the unfilled variants, because those are
 * `color-mix(in srgb, currentColor X%, transparent)` — a value that depends on the
 * element it lands on and that `tools/lib/color.mjs` cannot resolve. Those states are
 * gated instead by the browser sweep in `tests/visual/verify.mjs`, which drives every
 * theme x variant cell into resting / hover / focus-visible / pressed and measures the
 * composited result. The two gates are complementary, and this boundary is stated
 * rather than implied: an unresolvable token here would be silently skipped, so it is
 * kept out of the list on purpose. Raising `--opacity-pressed` to 0.55 fails the audit
 * on 5 opaque pairs and the browser sweep on 40 state measurements.
 *
 * Entry shape matches `CONTRAST_PAIRS`: [label, foreground, background | [...], min].
 */
export const PACKAGE_CONTRAST_PAIRS = [
  // Saturated status fills. `danger` is covered by the migrated table; these are its
  // siblings, and they are what makes the "every theme x every variant" matrix
  // trustworthy instead of eyeballed.
  ['成功按钮', '--button-success-color', '--button-success-background', 4.5],
  ['成功按钮 悬停', '--button-success-color', '--button-success-background-hover', 4.5],
  ['成功按钮 按下', '--button-success-color', '--button-success-background-pressed', 4.5],
  ['警告按钮', '--button-warning-color', '--button-warning-background', 4.5],
  ['警告按钮 悬停', '--button-warning-color', '--button-warning-background-hover', 4.5],
  ['警告按钮 按下', '--button-warning-color', '--button-warning-background-pressed', 4.5],
  // The accent role every unfilled variant paints its text and border with, drawn on
  // the surface those variants actually sit on.
  ['描边按钮文字 默认', '--button-default-accent', '--button-outline-background', 4.5],
  ['描边按钮文字 主要', '--button-primary-accent', '--button-outline-background', 4.5],
  ['描边按钮文字 危险', '--button-danger-accent', '--button-outline-background', 4.5],
  ['描边按钮文字 警告', '--button-warning-accent', '--button-outline-background', 4.5],
  ['描边按钮文字 成功', '--button-success-accent', '--button-outline-background', 4.5],
  // Unfilled variants that sit on the page rather than on a surface card.
  ['文本按钮文字 页面背景', '--button-default-accent', '--page', 4.5],
  ['链接按钮文字 页面背景', '--button-link-color', '--page', 4.5],
  ['链接按钮文字 基础表面', '--button-link-color', '--surface', 4.5],
]

/**
 * The complete contract the package must satisfy: the migrated table, verbatim,
 * plus the package's own additions.
 *
 * The prototype target keeps the migrated table alone — see `PACKAGE_CONTRAST_PAIRS`.
 */
export const PACKAGE_PAIRS = [...CONTRAST_PAIRS, ...PACKAGE_CONTRAST_PAIRS]

/**
 * Tokens the package is allowed to have beyond the prototype, pinned exactly.
 *
 * `design-tokens-generic-v4/` is a byte-frozen visual regression baseline, so the
 * Button Component Tokens that `YueButton` needs are declared in the package only.
 * The parity gate therefore runs in superset mode, and this list is what stops
 * that from becoming a loophole: `tests/token-audit.test.mjs` asserts the audit's
 * reported additions equal this array, so any new package-only token is a
 * deliberate, reviewed edit to this file rather than silent token sprawl.
 *
 * Every entry is referenced by `packages/vue/src/components/button/style.css`.
 */
export const PACKAGE_ONLY_TOKENS = [
  // Design contracts added after the frozen prototype: text hierarchy, layout,
  // and semantic motion aliases.
  '--breakpoint-lg',
  '--breakpoint-md',
  '--breakpoint-sm',
  '--breakpoint-xl',
  '--layout-grid-columns',
  '--layout-grid-gap',
  '--layout-page-gutter',
  '--layout-page-gutter-lg',
  '--motion-duration-enter',
  '--motion-duration-exit',
  '--motion-duration-interaction',
  '--motion-ease-standard',
  '--text-disabled',
  // Warning action pair: the semantic layer's counterpart to `--action-danger`,
  // added because the Button API now exposes a `warning` theme. It lives in
  // `semantics.css` with its siblings rather than in the components layer, and is
  // reported here like any other post-migration addition.
  '--action-on-warning',
  '--action-warning',
  // Geometry, typography and motion the migrated geometry set does not cover.
  '--button-border-radius-full',
  '--button-dashed-border-style',
  '--button-duration',
  '--button-ease',
  '--button-font-weight',
  '--button-icon-size-lg',
  '--button-icon-size-md',
  '--button-icon-size-sm',
  '--button-line-height',
  '--button-padding-inline-flush',
  '--button-spinner-border-width',
  '--button-spinner-duration',
  // Focus ring.
  '--button-focus-ring-color',
  '--button-focus-ring-offset',
  '--button-focus-ring-width',
  // Disabled.
  '--button-disabled-background',
  '--button-disabled-border-color',
  '--button-disabled-color',
  // Per-theme "readable on a plain surface" role, used by outline, dashed and text.
  '--button-danger-accent',
  '--button-default-accent',
  '--button-primary-accent',
  '--button-success-accent',
  '--button-warning-accent',
  // Warning solid fill (the danger contract, mirrored).
  '--button-warning-background',
  '--button-warning-background-hover',
  '--button-warning-background-pressed',
  '--button-warning-border-color',
  '--button-warning-color',
  // Success solid fill (the danger contract, mirrored).
  '--button-success-background',
  '--button-success-background-hover',
  '--button-success-background-pressed',
  '--button-success-border-color',
  '--button-success-color',
  // One shared hover/pressed overlay for the unfilled variants.
  '--button-subtle-background',
  '--button-subtle-background-hover',
  '--button-subtle-background-pressed',
  // Outline and link.
  '--button-link-color',
  '--button-link-decoration',
  '--button-link-decoration-hover',
  '--button-outline-background',
].sort()

/** Default audit targets, resolved from the repository root. */
export const DEFAULT_TARGETS = [
  { id: 'prototype', entry: 'design-tokens-generic-v4/tokens/index.css' },
  { id: 'package', entry: 'packages/tokens/src/index.css' },
]

/** Path to the prototype, used by the transcription guard in the test suite. */
export const PROTOTYPE_HTML = 'design-tokens-generic-v4/design-tokens-generic-v4.html'
