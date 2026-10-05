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
  // A modal's mode-invariant backdrop (Q16): the frozen prototype's `--scrim` is per-theme, so the
  // dialog's own scrim role is new package vocabulary.
  '--scrim-modal',
  // Popover's detached surface contract is new package vocabulary; the frozen
  // prototype predates the component and therefore has no corresponding names.
  '--box-font-size-popover',
  '--popover-background',
  '--popover-border-color',
  '--popover-border-radius',
  '--popover-border-width',
  '--popover-color',
  '--popover-duration-enter',
  '--popover-duration-exit',
  '--popover-ease',
  '--popover-font-size',
  '--popover-padding',
  '--popover-shadow',
  '--popover-z-index',
  // Dialog's modal tier and namespace are new package vocabulary; the frozen prototype predates
  // the component and has no `--dialog-*` names or a modal stacking role. The surface contract it
  // aliases (`--box-*-dialog`) already exists in the baseline, so the `--dialog-*` entries are
  // pass-through aliases, not new values (Q8=B, Q9=B, Q29=B under namespace isolation).
  '--layer-modal',
  '--dialog-action-background',
  '--dialog-action-border-color',
  '--dialog-action-border-radius',
  '--dialog-action-border-width',
  '--dialog-action-danger-background',
  '--dialog-action-danger-border',
  '--dialog-action-on-danger',
  '--dialog-action-on-primary',
  '--dialog-action-primary-background',
  '--dialog-action-primary-border',
  '--dialog-action-spacing-block',
  '--dialog-action-spacing-inline',
  '--dialog-action-text-color',
  '--dialog-background',
  '--dialog-border-color',
  '--dialog-border-radius',
  '--dialog-border-width',
  '--dialog-color',
  '--dialog-duration-enter',
  '--dialog-duration-exit',
  '--dialog-ease',
  '--dialog-footer-gap',
  '--dialog-header-height',
  '--dialog-padding',
  '--dialog-scrim-color',
  '--dialog-section-padding',
  '--dialog-shadow',
  '--dialog-spacing',
  '--dialog-width-lg',
  '--dialog-width-md',
  '--dialog-width-sm',
  '--dialog-width-xl',
  '--dialog-z-index',
  // The Q16 duration ladder rungs are new package primitives; the frozen prototype predates the
  // 50ms-stepped scale and defined only fast/normal/slow, which are now aliases onto these rungs.
  '--duration-100',
  '--duration-150',
  '--duration-200',
  '--duration-250',
  '--duration-300',
  '--duration-350',
  '--duration-400',
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
  // Tag component tokens added for YueTag + YueCheckTag.
  // Geometry tokens that also exist in the frozen prototype (--tag-height-*,
  // --tag-font-size-*, --tag-padding-*, --tag-gap, --tag-border-width,
  // --tag-border-radius) are shared tokens — they appear in both targets with
  // the same value — so they are NOT listed here. Only tokens the prototype
  // never defined are listed as package-only additions.
  '--tag-border-radius-round',
  '--tag-close-icon-size',
  '--tag-danger-filled-background',
  '--tag-danger-filled-border-color',
  '--tag-danger-filled-color',
  '--tag-danger-outline-background',
  '--tag-danger-outline-border-color',
  '--tag-danger-outline-color',
  '--tag-danger-tint-background',
  '--tag-danger-tint-border-color',
  '--tag-danger-tint-color',
  '--tag-danger-tint-outline-background',
  '--tag-danger-tint-outline-border-color',
  '--tag-danger-tint-outline-color',
  '--tag-default-filled-background',
  '--tag-default-filled-border-color',
  '--tag-default-filled-color',
  '--tag-default-outline-background',
  '--tag-default-outline-border-color',
  '--tag-default-outline-color',
  '--tag-default-tint-background',
  '--tag-default-tint-border-color',
  '--tag-default-tint-color',
  '--tag-default-tint-outline-background',
  '--tag-default-tint-outline-border-color',
  '--tag-default-tint-outline-color',
  '--tag-duration',
  '--tag-ease',
  '--tag-focus-ring-color',
  '--tag-focus-ring-offset',
  '--tag-focus-ring-width',
  '--tag-font-weight',
  '--tag-line-height',
  '--tag-opacity-disabled',
  '--tag-primary-filled-background',
  '--tag-primary-filled-border-color',
  '--tag-primary-filled-color',
  '--tag-primary-outline-background',
  '--tag-primary-outline-border-color',
  '--tag-primary-outline-color',
  '--tag-primary-tint-background',
  '--tag-primary-tint-border-color',
  '--tag-primary-tint-color',
  '--tag-primary-tint-outline-background',
  '--tag-primary-tint-outline-border-color',
  '--tag-primary-tint-outline-color',
  '--tag-success-filled-background',
  '--tag-success-filled-border-color',
  '--tag-success-filled-color',
  '--tag-success-outline-background',
  '--tag-success-outline-border-color',
  '--tag-success-outline-color',
  '--tag-success-tint-background',
  '--tag-success-tint-border-color',
  '--tag-success-tint-color',
  '--tag-success-tint-outline-background',
  '--tag-success-tint-outline-border-color',
  '--tag-success-tint-outline-color',
  '--tag-warning-filled-background',
  '--tag-warning-filled-border-color',
  '--tag-warning-filled-color',
  '--tag-warning-outline-background',
  '--tag-warning-outline-border-color',
  '--tag-warning-outline-color',
  '--tag-warning-tint-background',
  '--tag-warning-tint-border-color',
  '--tag-warning-tint-color',
  '--tag-warning-tint-outline-background',
  '--tag-warning-tint-outline-border-color',
  '--tag-warning-tint-outline-color',
].sort()

/**
 * Shared tokens whose package value is *deliberately* different from the prototype's.
 *
 * The prototype is byte-frozen, so its values are the migration baseline; anything the package
 * resolves differently would normally be drift. But a baseline can also be wrong, and the Tag
 * proves it: the prototype defines `--tag-height-*` as aliases of the form-control scale and
 * `--tag-border-radius` as `--radius-full`, which is correct for a 32px-tall control and wrong
 * for a chip — the Tag rendered as a pill at control height, and its own compact ramp lived in a
 * file the public entry never loaded.
 *
 * So the parity gate gains a register instead of a wider allowance:
 *
 *   - a divergence that is not listed here still fails, exactly as before;
 *   - a listed name that no longer diverges also fails (`staleDivergences`), so the register
 *     cannot rot into a blanket exemption;
 *   - `tests/token-audit.test.mjs` asserts the audit's reported divergences equal this register
 *     *and* that each registered package value matches what `components.css` actually declares,
 *     so this table cannot drift from the sheet it describes.
 *
 * `prototype` and `package` are the declared expressions, kept for review; the gate compares
 * resolved values.
 */
export const PACKAGE_DIVERGENCES = [
  {
    name: '--button-danger-background-hover',
    prototype: 'color-mix(in srgb, var(--button-danger-color) calc(var(--opacity-hover)*100%), var(--button-danger-background))',
    package: 'color-mix(in srgb, var(--button-danger-color) calc(var(--opacity-hover)*100%), var(--button-danger-background))',
    reason:
      'Derives from --opacity-hover / --opacity-pressed, which dark overrides (registered separately): its resolved dark value differs from the prototype on purpose, while the declared expression is identical.',
  },
  {
    name: '--button-danger-background-pressed',
    prototype: 'color-mix(in srgb, var(--button-danger-color) calc(var(--opacity-pressed)*100%), var(--button-danger-background))',
    package: 'color-mix(in srgb, var(--button-danger-color) calc(var(--opacity-pressed)*100%), var(--button-danger-background))',
    reason:
      'Derives from --opacity-hover / --opacity-pressed, which dark overrides (registered separately): its resolved dark value differs from the prototype on purpose, while the declared expression is identical.',
  },
  {
    name: '--button-default-background-hover',
    prototype: 'color-mix(in srgb, var(--button-default-color) calc(var(--opacity-hover)*100%), var(--button-default-background))',
    package: 'color-mix(in srgb, var(--button-default-color) calc(var(--opacity-hover)*100%), var(--button-default-background))',
    reason:
      'Derives from --opacity-hover / --opacity-pressed, which dark overrides (registered separately): its resolved dark value differs from the prototype on purpose, while the declared expression is identical.',
  },
  {
    name: '--button-default-background-pressed',
    prototype: 'color-mix(in srgb, var(--button-default-color) calc(var(--opacity-pressed)*100%), var(--button-default-background))',
    package: 'color-mix(in srgb, var(--button-default-color) calc(var(--opacity-pressed)*100%), var(--button-default-background))',
    reason:
      'Derives from --opacity-hover / --opacity-pressed, which dark overrides (registered separately): its resolved dark value differs from the prototype on purpose, while the declared expression is identical.',
  },
  {
    name: '--button-ghost-background-hover',
    prototype: 'color-mix(in srgb, var(--button-ghost-color) calc(var(--opacity-hover)*100%), transparent)',
    package: 'color-mix(in srgb, var(--button-ghost-color) calc(var(--opacity-hover)*100%), transparent)',
    reason:
      'Derives from --opacity-hover / --opacity-pressed, which dark overrides (registered separately): its resolved dark value differs from the prototype on purpose, while the declared expression is identical.',
  },
  {
    name: '--button-ghost-background-pressed',
    prototype: 'color-mix(in srgb, var(--button-ghost-color) calc(var(--opacity-pressed)*100%), transparent)',
    package: 'color-mix(in srgb, var(--button-ghost-color) calc(var(--opacity-pressed)*100%), transparent)',
    reason:
      'Derives from --opacity-hover / --opacity-pressed, which dark overrides (registered separately): its resolved dark value differs from the prototype on purpose, while the declared expression is identical.',
  },
  {
    name: '--button-primary-background-hover',
    prototype: 'color-mix(in srgb, var(--button-primary-color) calc(var(--opacity-hover)*100%), var(--button-primary-background))',
    package: 'color-mix(in srgb, var(--button-primary-color) calc(var(--opacity-hover)*100%), var(--button-primary-background))',
    reason:
      'Derives from --opacity-hover / --opacity-pressed, which dark overrides (registered separately): its resolved dark value differs from the prototype on purpose, while the declared expression is identical.',
  },
  {
    name: '--button-primary-background-pressed',
    prototype: 'color-mix(in srgb, var(--button-primary-color) calc(var(--opacity-pressed)*100%), var(--button-primary-background))',
    package: 'color-mix(in srgb, var(--button-primary-color) calc(var(--opacity-pressed)*100%), var(--button-primary-background))',
    reason:
      'Derives from --opacity-hover / --opacity-pressed, which dark overrides (registered separately): its resolved dark value differs from the prototype on purpose, while the declared expression is identical.',
  },
  {
    name: '--button-secondary-background-hover',
    prototype: 'color-mix(in srgb, var(--button-secondary-color) calc(var(--opacity-hover)*100%), var(--button-secondary-background))',
    package: 'color-mix(in srgb, var(--button-secondary-color) calc(var(--opacity-hover)*100%), var(--button-secondary-background))',
    reason:
      'Derives from --opacity-hover / --opacity-pressed, which dark overrides (registered separately): its resolved dark value differs from the prototype on purpose, while the declared expression is identical.',
  },
  {
    name: '--button-secondary-background-pressed',
    prototype: 'color-mix(in srgb, var(--button-secondary-color) calc(var(--opacity-pressed)*100%), var(--button-secondary-background))',
    package: 'color-mix(in srgb, var(--button-secondary-color) calc(var(--opacity-pressed)*100%), var(--button-secondary-background))',
    reason:
      'Derives from --opacity-hover / --opacity-pressed, which dark overrides (registered separately): its resolved dark value differs from the prototype on purpose, while the declared expression is identical.',
  },
  {
    name: '--button-selected-background-hover',
    prototype: 'color-mix(in srgb, var(--button-selected-color) calc(var(--opacity-hover)*100%), var(--button-selected-background))',
    package: 'color-mix(in srgb, var(--button-selected-color) calc(var(--opacity-hover)*100%), var(--button-selected-background))',
    reason:
      'Derives from --opacity-hover / --opacity-pressed, which dark overrides (registered separately): its resolved dark value differs from the prototype on purpose, while the declared expression is identical.',
  },
  {
    name: '--button-selected-background-pressed',
    prototype: 'color-mix(in srgb, var(--button-selected-color) calc(var(--opacity-pressed)*100%), var(--button-selected-background))',
    package: 'color-mix(in srgb, var(--button-selected-color) calc(var(--opacity-pressed)*100%), var(--button-selected-background))',
    reason:
      'Derives from --opacity-hover / --opacity-pressed, which dark overrides (registered separately): its resolved dark value differs from the prototype on purpose, while the declared expression is identical.',
  },
  {
    name: '--list-row-background-hover',
    prototype: 'var(--button-ghost-background-hover)',
    package: 'color-mix(in srgb, var(--list-row-color) calc(var(--opacity-hover)*100%), transparent)',
    reason:
      'Derives from --opacity-hover / --opacity-pressed, which dark overrides (registered separately): its resolved dark value differs from the prototype on purpose, while the declared expression is identical.',
  },
  {
    name: '--menu-item-background-hover',
    prototype: 'var(--button-ghost-background-hover)',
    package: 'var(--button-ghost-background-hover)',
    reason:
      'Derives from --opacity-hover / --opacity-pressed, which dark overrides (registered separately): its resolved dark value differs from the prototype on purpose, while the declared expression is identical.',
  },
  {
    name: '--tag-background-hover',
    prototype: 'color-mix(in srgb, var(--tag-color) calc(var(--opacity-hover)*100%), var(--tag-background))',
    package: 'color-mix(in srgb, var(--tag-color) calc(var(--opacity-hover)*100%), var(--tag-background))',
    reason:
      'Derives from --opacity-hover / --opacity-pressed, which dark overrides (registered separately): its resolved dark value differs from the prototype on purpose, while the declared expression is identical.',
  },
  {
    name: '--opacity-hover',
    prototype: '.08',
    package: '.12',
    reason:
      'Only in dark (\`[data-theme=dark]\`): 8% over a near-black surface is imperceptible. Measured by ' +
      'the pixel sampler in tools/measure-dark-opacity.mjs.',
  },
  {
    name: '--opacity-pressed',
    prototype: '.10',
    package: '.18',
    reason:
      'Only in dark (\`[data-theme=dark]\`): pressed feedback was the weakest state in the same measurement.',
  },
  {
    name: '--tag-height-sm',
    prototype: 'var(--control-height-sm)',
    package: '20px',
    reason: 'Tag is a chip, not a form control: 28px is an input height, not a label height.',
  },
  {
    name: '--tag-height-md',
    prototype: 'var(--control-height-md)',
    package: '24px',
    reason: 'Tag is a chip, not a form control: 32px made a label as tall as a button.',
  },
  {
    name: '--tag-height-lg',
    prototype: 'var(--control-height-lg)',
    package: '30px',
    reason: 'Tag is a chip, not a form control: 40px is an input height, not a label height.',
  },
  {
    name: '--tag-padding-inline-sm',
    prototype: 'var(--control-padding-inline-sm)',
    package: '6px',
    reason: 'Chip padding: the control scale pads for a click target, not for a label.',
  },
  {
    name: '--tag-padding-inline-md',
    prototype: 'var(--control-padding-inline-md)',
    package: '8px',
    reason: 'Chip padding: 12px of inline padding stretches a 24px label into a control.',
  },
  {
    name: '--tag-padding-inline-lg',
    prototype: 'var(--control-padding-inline-lg)',
    package: '10px',
    reason: 'Chip padding: the control scale pads for a click target, not for a label.',
  },
  {
    name: '--tag-font-size-sm',
    prototype: 'var(--control-font-size-sm)',
    package: '11px',
    reason: 'Chip type: label text sits one step below control text so a chip never reads as a field.',
  },
  {
    name: '--tag-font-size-md',
    prototype: 'var(--control-font-size-md)',
    package: '12px',
    reason: 'Chip type: 14px leaves no breathing room inside a 24px chip.',
  },
  {
    name: '--tag-font-size-lg',
    prototype: 'var(--control-font-size-lg)',
    package: '13px',
    reason: 'Chip type: label text sits one step below control text so a chip never reads as a field.',
  },
  {
    name: '--tag-border-radius',
    prototype: 'var(--radius-full)',
    package: 'var(--radius-sm)',
    reason:
      'The default Tag shape is square; a pill is the `round` variant, expressed by ' +
      '`--tag-border-radius-round`. With the prototype value the two shapes rendered identically, ' +
      'so the shape axis was decorative.',
  },
]

/**
 * Tokens the package renamed, with the prototype name they replace.
 *
 * The prototype is a byte-frozen baseline that the parity gate compares by *name*: a rename would look
 * exactly like a lost token on one side and token sprawl on the other, when it is neither. The register
 * is the only way to rename, and it is the mechanism Phase 4 needs for the full component-token
 * migration — so it is built here, with the three focus tokens as its first entries.
 *
 * A rename is not an alias: the old name is gone from the package, and a consumer that overrode it must
 * move to the new one (recorded in the breaking-change table).
 */
export const PACKAGE_RENAMES = [
  {
    prototype: '--badge-fg',
    package: '--badge-foreground',
    reason:
      'Property names are spelled out; `fg` is not a documented abbreviation (§5).',
  },
  {
    prototype: '--info-fg',
    package: '--info-foreground',
    reason:
      'Property names are spelled out; `fg` is not a documented abbreviation (§5).',
  },
  {
    prototype: '--warning-fg',
    package: '--warning-foreground',
    reason:
      'Property names are spelled out; `fg` is not a documented abbreviation (§5).',
  },
  {
    prototype: '--error-fg',
    package: '--error-foreground',
    reason:
      'Property names are spelled out; `fg` is not a documented abbreviation (§5).',
  },
  {
    prototype: '--success-fg',
    package: '--success-foreground',
    reason:
      'Property names are spelled out; `fg` is not a documented abbreviation (§5).',
  },
  {
    prototype: '--selection-fg',
    package: '--selection-foreground',
    reason:
      'Property names are spelled out; `fg` is not a documented abbreviation (§5).',
  },
  {
    prototype: '--focus-ring',
    package: '--focus-ring-color',
    reason:
      'The old name was the ring *colour*, which read like the whole ring; the trio is now ' +
      'colour/width/offset and lives in the semantic layer.',
  },
  {
    prototype: '--focus-width',
    package: '--focus-ring-width',
    reason: 'Ring geometry is a semantic decision, not a primitive, and belongs to the named trio.',
  },
  {
    prototype: '--focus-offset',
    package: '--focus-ring-offset',
    reason: 'Ring geometry is a semantic decision, not a primitive, and belongs to the named trio.',
  },
]

/** Default audit targets, resolved from the repository root. */
export const DEFAULT_TARGETS = [
  { id: 'prototype', entry: 'design-tokens-generic-v4/tokens/index.css' },
  { id: 'package', entry: 'packages/tokens/src/index.css' },
]

/** Path to the prototype, used by the transcription guard in the test suite. */
export const PROTOTYPE_HTML = 'design-tokens-generic-v4/design-tokens-generic-v4.html'
