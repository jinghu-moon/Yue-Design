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
 *
 * The check count is `pairs x profiles` and depends on which pair list the target is
 * held to, so it is reported by the run rather than stated here: the frozen prototype
 * gates 32 pairs (64 checks) and the package gates those plus its own additions (104
 * checks at the time of writing). A number written into this comment would go stale the
 * first time a pair was added — which is exactly what happened to it.
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
  // The selected state of a toggle button. The tokens are the migrated
  // `--button-selected-*` family, which resolves to the accent-subtle pair the migrated
  // table already gates — but gating the *component* tokens is what ties that number to
  // the state `YueButton.is-active` actually paints. All three states are listed because a
  // selected button still reacts to hover and press.
  ['选中按钮文字', '--button-selected-color', '--button-selected-background', 4.5],
  ['选中按钮文字 悬停', '--button-selected-color', '--button-selected-background-hover', 4.5],
  ['选中按钮文字 按下', '--button-selected-color', '--button-selected-background-pressed', 4.5],

  // Input. The migrated table already covers the resting text, the placeholder and
  // the resting/hover border; these are the states and parts it never had.
  ['输入框焦点边界 / 输入背景', '--input-border-color-focus', '--input-background', 3],
  ['输入框错误边界 / 输入背景', '--input-border-color-invalid', '--input-background', 3],
  // Readonly keeps its value readable — it is explicitly not the disabled state, so
  // the disabled exemption does not apply here.
  ['只读输入文字 / 只读背景', '--input-color', '--input-background-readonly', 4.5],
  // Prefix/suffix content is text, so it is held to the text threshold.
  ['前置后置文字 / 输入背景', '--input-affix-color', '--input-background', 4.5],
  // The clear control is a graphical control: WCAG 1.4.11 asks for 3:1.
  ['清空控件 / 输入背景', '--input-clear-color', '--input-background', 3],
  ['清空控件 悬停 / 输入背景', '--input-clear-color-hover', '--input-background', 3],
]

/**
 * Pairs that are measured and printed but never gate.
 *
 * Two kinds of thing live here, for the same reason: they have a real number worth
 * showing a reviewer, and a threshold that would be a lie to enforce.
 *
 * 1. **Disabled state.** WCAG 1.4.3 exempts inactive controls, and this design system
 *    deliberately ships a quiet disabled state, so gating it at 3:1 would force a
 *    visual change nobody asked for. Reporting it keeps the number visible.
 *
 * 2. **Translucent foregrounds.** `--disabled-content` is
 *    `color-mix(…, transparent)`, so its rendered colour is the composite over
 *    whatever it sits on. `flatten()` treats the *first* layer as opaque, which means
 *    a lone translucent foreground is measured as if it were solid — for the pair
 *    below that reports 11.94:1 where the rendered result is far lower. The entry
 *    therefore composites the foreground explicitly: the array is painted bottom-up,
 *    so `[page, disabled background, disabled text]` is the colour a user sees, and it
 *    is compared against the same background. This is also why such a pair must not
 *    gate: getting the composite wrong is a silent false pass, and the honest place
 *    for a number with that history is the diagnostics block.
 *
 * Same entry shape as `PACKAGE_CONTRAST_PAIRS`, except that the foreground may be an
 * array when the text itself is translucent.
 */
export const PACKAGE_DIAGNOSTIC_PAIRS = [
  [
    '禁用输入文字 / 禁用背景（豁免，仅供参考）',
    ['--page', '--input-background-disabled', '--input-color-disabled'],
    ['--page', '--input-background-disabled'],
    3,
  ],
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
 * Component Tokens that the Vue components need are declared in the package only.
 * The parity gate therefore runs in superset mode, and this list is what stops
 * that from becoming a loophole: `tests/token-audit.test.mjs` asserts the audit's
 * reported additions equal this array, so any new package-only token is a
 * deliberate, reviewed edit to this file rather than silent token sprawl.
 *
 * Every entry is referenced by at least one component stylesheet —
 * `packages/vue/src/components/{button,input}/style.css` — or by the shared token
 * sheets. A token with no consumer would be a claim nobody can verify, which is why
 * the roadmap's stage 0 asks for the consumer before the token.
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
  // Input component tokens added for YueInput; the rest of the `--input-*` contract
  // came across with the migration.
  '--input-affix-color',
  '--input-background-readonly',
  '--input-clear-border-radius',
  '--input-clear-color',
  '--input-clear-color-hover',
  '--input-clear-glyph-width',
  '--input-clear-hit-size',
  '--input-duration',
  '--input-ease',
  '--input-focus-ring-color',
  '--input-focus-ring-offset',
  '--input-focus-ring-width',
  '--input-icon-size-lg',
  '--input-icon-size-md',
  '--input-icon-size-sm',
].sort()

/** Default audit targets, resolved from the repository root. */
export const DEFAULT_TARGETS = [
  { id: 'prototype', entry: 'design-tokens-generic-v4/tokens/index.css' },
  { id: 'package', entry: 'packages/tokens/src/index.css' },
]

/** Path to the prototype, used by the transcription guard in the test suite. */
export const PROTOTYPE_HTML = 'design-tokens-generic-v4/design-tokens-generic-v4.html'
