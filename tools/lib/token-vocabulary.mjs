/**
 * The frozen component-token vocabulary — the machine-checkable form of
 * `docs/05-yue-token-refactor-plan.md` §5 and `.spec-workflow/token-architecture/naming-grammar.md` §2/§3b/§3c.
 *
 * Two tables, and the difference between them matters:
 *
 *   `PHRASES`  every axis+property phrase the components actually use, transcribed from the sheet and
 *             reviewed against §3c. This is the *frozen* vocabulary: a new name must fit an existing
 *             phrase or the phrase must be added here on purpose.
 *   `AXES`     the namespaces whose §2 axis order is strict enough to check positionally. `button` and
 *             `tag` declare theme → variant; a leading segment that is a known axis value in the wrong
 *             position fails, which is the axis-order error the vocabulary exists to prevent. The other
 *             namespaces embed their variant in the phrase (`background-popover`), so their phrase list is
 *             the whole contract and no axis table is claimed for them.
 *
 * Honest limit: `PHRASES` was derived from the current sheet. It therefore certifies "no *new* name
 * outside the frozen vocabulary" and "no axis-order error where axes are declared" — not "every existing
 * name is the best possible name". Judgements like `background` vs `fill` are recorded in §3 of the grammar
 * doc, not enforced here.
 */

/** Axis values, per namespace, position by position (§2). Only namespaces whose order is frozen. */
export const AXES = {
  button: [
    ['default', 'primary', 'secondary', 'danger', 'warning', 'success', 'info', 'subtle', 'inverse'],
    ['solid', 'outline', 'tint', 'text', 'ghost', 'link', 'dashed', 'plain', 'selected', 'disabled', 'block', 'flush'],
  ],
  tag: [
    ['default', 'primary', 'success', 'warning', 'danger'],
    ['filled', 'tint', 'outline', 'tint-outline', 'selected', 'disabled', 'round', 'block'],
  ],
}

/** Axis + property phrases, per namespace, exactly as the frozen sheet uses them (§3c). */
export const PHRASES = {
  avatar: [
    'background',
    'border-radius',
    'color',
    'font-size',
    'size',
  ],
  badge: [
    'background',
    'border-radius',
    'color',
    'font-size',
    'foreground',
    'height',
    'padding-inline',
  ],
  box: [
    'background-dialog',
    'background-inverse',
    'background-panel',
    'background-plain',
    'background-popover',
    'background-raised',
    'background-raised-2',
    'background-raised-3',
    'background-subtle',
    'background-toast',
    'background-tooltip',
    'border-color',
    'border-color-dialog',
    'border-color-panel',
    'border-color-popover',
    'border-color-raised-2',
    'border-color-raised-3',
    'border-radius',
    'border-radius-dialog',
    'border-radius-panel',
    'border-radius-popover',
    'border-radius-toast',
    'border-radius-tooltip',
    'border-width',
    'border-width-dialog',
    'border-width-panel',
    'border-width-popover',
    'border-width-raised-2',
    'border-width-raised-3',
    'color-dialog',
    'color-inverse',
    'color-panel',
    'color-plain',
    'color-popover',
    'color-raised',
    'color-subtle',
    'color-toast',
    'color-tooltip',
    'font-size-popover',
    'font-size-tooltip',
    'padding',
    'padding-block-toast',
    'padding-block-tooltip',
    'padding-dialog',
    'padding-inline-toast',
    'padding-inline-tooltip',
    'padding-panel',
    'padding-popover',
    'shadow-0',
    'shadow-1',
    'shadow-2',
    'shadow-3',
    'shadow-dialog',
    'shadow-panel',
    'shadow-popover',
    'shadow-toast',
  ],
  button: [
    'border-radius',
    'border-radius-full',
    'border-width',
    'danger-accent',
    'danger-background',
    'danger-border-color',
    'danger-color',
    'dashed-border-style',
    'default-accent',
    'default-background',
    'default-border-color',
    'default-color',
    'disabled-background',
    'disabled-border-color',
    'disabled-color',
    'duration',
    'ease',
    'focus-ring-color',
    'focus-ring-offset',
    'focus-ring-width',
    'font-size',
    'font-weight',
    'gap',
    'ghost-background',
    'ghost-border-color',
    'ghost-color',
    'height',
    'icon-size',
    'line-height',
    'link-color',
    'link-decoration',
    'outline-background',
    'padding-block',
    'padding-inline',
    'padding-inline-flush',
    'primary-accent',
    'primary-background',
    'primary-border-color',
    'primary-color',
    'secondary-background',
    'secondary-border-color',
    'secondary-color',
    'selected-background',
    'selected-border-color',
    'selected-color',
    'selected-marker-color',
    'selected-marker-width',
    'spinner-border-width',
    'spinner-duration',
    'subtle-background',
    'success-accent',
    'success-background',
    'success-border-color',
    'success-color',
    'warning-accent',
    'warning-background',
    'warning-border-color',
    'warning-color',
  ],
  checkbox: [
    'accent-color',
    'size',
  ],
  divider: [
    'border-color',
    'border-width',
    'margin-block',
  ],
  dialog: [
    'action-background',
    'action-border-color',
    'action-border-radius',
    'action-border-width',
    'action-danger-background',
    'action-danger-border',
    'action-on-danger',
    'action-on-primary',
    'action-primary-background',
    'action-primary-border',
    'action-spacing-block',
    'action-spacing-inline',
    'action-text-color',
    'background',
    'border-color',
    'border-radius',
    'border-width',
    'color',
    'duration-enter',
    'duration-exit',
    'ease',
    'footer-gap',
    'header-height',
    'padding',
    'scrim-color',
    'section-padding',
    'shadow',
    'spacing',
    'width',
    'z-index',
  ],
  icon: [
    'size',
  ],
  input: [
    'affix-color',
    'background',
    'background-readonly',
    'border-color',
    'border-radius',
    'border-width',
    'clear-border-radius',
    'clear-color',
    'clear-glyph-width',
    'clear-hit-size',
    'color',
    'duration',
    'ease',
    'focus-ring-color',
    'focus-ring-offset',
    'focus-ring-width',
    'font-size',
    'gap',
    'height',
    'icon-size',
    'padding-block',
    'padding-inline',
    'placeholder-color',
  ],
  popover: [
    'background',
    'border-color',
    'border-radius',
    'border-width',
    'color',
    'duration-enter',
    'duration-exit',
    'ease',
    'font-size',
    'padding',
    'shadow',
    'z-index',
  ],
  link: [
    'color',
    'decoration',
  ],
  menu: [
    'item-background',
    'item-border-radius',
    'item-color',
    'width',
  ],
  progress: [
    'border-radius',
    'fill',
    'height',
    'track',
  ],
  radio: [
    'accent-color',
    'size',
  ],
  spinner: [
    'border-width',
    'color',
    'duration',
    'size',
    'track',
  ],
  status: [
    'border-radius',
    'border-width',
    'gap',
    'padding-block',
    'padding-inline',
  ],
  switch: [
    'background',
    'background-checked',
    'border-color',
    'border-radius',
    'border-width',
    'height',
    'inset',
    'thumb',
    'thumb-color',
    'thumb-color-checked',
    'thumb-shift',
    'width',
  ],
  tag: [
    'background',
    'border-color',
    'border-radius',
    'border-radius-round',
    'border-width',
    'close-icon-size',
    'color',
    'danger-filled-background',
    'danger-filled-border-color',
    'danger-filled-color',
    'danger-outline-background',
    'danger-outline-border-color',
    'danger-outline-color',
    'danger-tint-background',
    'danger-tint-border-color',
    'danger-tint-color',
    'danger-tint-outline-background',
    'danger-tint-outline-border-color',
    'danger-tint-outline-color',
    'default-filled-background',
    'default-filled-border-color',
    'default-filled-color',
    'default-outline-background',
    'default-outline-border-color',
    'default-outline-color',
    'default-tint-background',
    'default-tint-border-color',
    'default-tint-color',
    'default-tint-outline-background',
    'default-tint-outline-border-color',
    'default-tint-outline-color',
    'duration',
    'ease',
    'focus-ring-color',
    'focus-ring-offset',
    'focus-ring-width',
    'font-size',
    'font-weight',
    'gap',
    'height',
    'line-height',
    'opacity',
    'padding-block',
    'padding-inline',
    'primary-filled-background',
    'primary-filled-border-color',
    'primary-filled-color',
    'primary-outline-background',
    'primary-outline-border-color',
    'primary-outline-color',
    'primary-tint-background',
    'primary-tint-border-color',
    'primary-tint-color',
    'primary-tint-outline-background',
    'primary-tint-outline-border-color',
    'primary-tint-outline-color',
    'success-filled-background',
    'success-filled-border-color',
    'success-filled-color',
    'success-outline-background',
    'success-outline-border-color',
    'success-outline-color',
    'success-tint-background',
    'success-tint-border-color',
    'success-tint-color',
    'success-tint-outline-background',
    'success-tint-outline-border-color',
    'success-tint-outline-color',
    'warning-filled-background',
    'warning-filled-border-color',
    'warning-filled-color',
    'warning-outline-background',
    'warning-outline-border-color',
    'warning-outline-color',
    'warning-tint-background',
    'warning-tint-border-color',
    'warning-tint-color',
    'warning-tint-outline-background',
    'warning-tint-outline-border-color',
    'warning-tint-outline-color',
  ],
  textarea: [
    'line-height',
    'padding-block',
  ],
}

export const VOCABULARY = { axes: AXES, phrases: PHRASES }

const STATE_ORDER = ['selected', 'invalid', 'disabled', 'hover', 'pressed', 'focus']
const SIZE_SUFFIXES = ['xs', 'sm', 'md', 'lg', 'xl']

/**
 * Parse one component token name against the frozen vocabulary.
 *
 * @param {string} name `--button-ghost-background-hover`
 * @param {number} axisValueCount kept for callers that report vocabulary size
 * @param {{axes: object, phrases: object}} vocabulary
 * @param {string[]} knownNamespaces namespaces the package actually has
 * @param {Set<string>} frozenAxisNames names §3b froze as legal leading-state axis values
 */
export function parseTokenName(name, vocabulary, knownNamespaces, frozenAxisNames) {
  const bare = name.replace(/^--/, '')
  const segments = bare.split('-')
  const namespace = segments[0]

  if (!knownNamespaces.includes(namespace)) {
    return { ok: false, reason: `unknown component namespace "${namespace}"` }
  }
  const known = vocabulary.phrases[namespace]
  if (known === undefined) {
    return { ok: false, reason: `no frozen vocabulary for namespace "${namespace}"` }
  }

  if (STATE_ORDER.includes(segments[1]) && segments.length > 2 && !frozenAxisNames.has(name)) {
    return {
      ok: false,
      reason: `a leading state segment ("${segments[1]}") is only allowed as a frozen axis value (§3b)`,
    }
  }

  let tail = segments.slice(1)
  if (tail.length === 0) return { ok: false, reason: 'the name carries no property' }

  if (tail.length > 1 && SIZE_SUFFIXES.includes(tail[tail.length - 1])) tail = tail.slice(0, -1)

  const states = []
  while (tail.length > 1 && STATE_ORDER.includes(tail[tail.length - 1])) states.unshift(tail.pop())
  for (let index = 1; index < states.length; index += 1) {
    if (STATE_ORDER.indexOf(states[index]) < STATE_ORDER.indexOf(states[index - 1])) {
      return { ok: false, reason: `trailing states are out of §5 order (${states.join(', ')})` }
    }
  }

  const phrase = tail.join('-')
  if (known.includes(phrase)) return { ok: true }

  // Not a frozen phrase: if its first segment is a known axis value, say so — that is an axis-order
  // error, not an unknown property, and the two need different fixes.
  const axisSets = vocabulary.axes[namespace] ?? []
  const knownAxisValues = new Set(axisSets.flat())
  if (knownAxisValues.has(tail[0])) {
    return {
      ok: false,
      reason:
        `"${tail[0]}" is an axis value but ${namespace} frozen order is ` +
        `${axisSets.map((values) => values.join('|')).join(' → ')} → property` +
        `; "${phrase}" is not a property of this vocabulary (frozen: ${known.join(', ')})`,
    }
  }
  return {
    ok: false,
    reason: `"${phrase}" is not in the frozen vocabulary for ${namespace}`,
  }
}

/** Number of axis values across the frozen axis tables, for the gate's summary line. */
export const AXIS_VALUE_COUNT = Object.values(AXES).reduce(
  (total, sets) => total + sets.reduce((count, set) => count + set.length, 0),
  0,
)

/**
 * Role vocabulary for the two layers the component grammar does not cover (Phase 4 batch ①).
 *
 * Components are named `--{namespace}-{axis…}-{property}`; the other layers name **roles**, so their grammar
 * is a family table instead of an axis order: `--{family}` or `--{family}-{remainder}`, where both the
 * family and the remainder are frozen. It is derived from the sheet and records the same caveat as the
 * component table — it certifies that a *new* name cannot appear outside the frozen vocabulary, not that
 * every existing name is the best possible name.
 */
export const LAYER_VOCABULARY = {
  "primitives": {
    "amber": [
      "100",
      "200",
      "300",
      "400",
      "50",
      "500",
      "600",
      "700",
      "800",
      "900",
      "950"
    ],
    "azure": [
      "100",
      "200",
      "300",
      "400",
      "50",
      "500",
      "600",
      "700",
      "800",
      "900",
      "950"
    ],
    "blue": [
      "100",
      "200",
      "300",
      "400",
      "50",
      "500",
      "600",
      "700",
      "800",
      "900",
      "950"
    ],
    "border": [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5"
    ],
    "breakpoint": [
      "lg",
      "md",
      "sm",
      "xl"
    ],
    "container": [
      "page",
      "text"
    ],
    "control": [
      "font-size-lg",
      "font-size-md",
      "font-size-sm",
      "height-lg",
      "height-md",
      "height-sm",
      "icon-size-lg",
      "icon-size-md",
      "icon-size-sm",
      "padding-inline-lg",
      "padding-inline-md",
      "padding-inline-sm"
    ],
    "duration": [
      "100",
      "150",
      "200",
      "250",
      "300",
      "350",
      "400",
      "fast",
      "normal",
      "slow"
    ],
    "ease": [
      "enter",
      "exit",
      "standard"
    ],
    "font": [
      "mono",
      "number",
      "size-2xl",
      "size-3xl",
      "size-display",
      "size-lg",
      "size-md",
      "size-sm",
      "size-xl",
      "ui"
    ],
    "gap": [
      "control-group",
      "form-field",
      "page-section",
      "section"
    ],
    "green": [
      "100",
      "200",
      "300",
      "400",
      "50",
      "500",
      "600",
      "700",
      "800",
      "900",
      "950"
    ],
    "layer": [
      "base",
      "dialog",
      "popover",
      "sticky",
      "toast",
      "tooltip"
    ],
    "layout": [
      "grid-columns",
      "grid-gap",
      "page-gutter",
      "page-gutter-lg"
    ],
    "leading": [
      "normal",
      "relaxed",
      "tight"
    ],
    "line": [
      "height-2xl",
      "height-3xl",
      "height-display",
      "height-lg",
      "height-md",
      "height-sm",
      "height-xl"
    ],
    "motion": [
      "duration-enter",
      "duration-exit",
      "duration-interaction",
      "ease-standard"
    ],
    "neutral": [
      "0",
      "100",
      "1000",
      "200",
      "300",
      "400",
      "50",
      "500",
      "600",
      "700",
      "800",
      "900",
      "950"
    ],
    "opacity": [
      "disabled-container",
      "disabled-content",
      "dragged",
      "focus",
      "hover",
      "pressed"
    ],
    "radius": [
      "base",
      "full",
      "lg",
      "md",
      "none",
      "sm",
      "xl",
      "xs"
    ],
    "red": [
      "100",
      "200",
      "300",
      "400",
      "50",
      "500",
      "600",
      "700",
      "800",
      "900",
      "950"
    ],
    "size": [
      "12",
      "16",
      "20",
      "24",
      "28",
      "32",
      "40",
      "48",
      "56"
    ],
    "space": [
      "0",
      "12",
      "16",
      "2",
      "24",
      "32",
      "4",
      "48",
      "64",
      "8"
    ],
    "tracking": [
      "normal",
      "wide"
    ],
    "weight": [
      "display",
      "medium",
      "regular",
      "semibold"
    ],
    "width": [
      "lg",
      "md",
      "sm",
      "xl"
    ]
  },
  "semantics": {
    "accent": [
      "100",
      "200",
      "300",
      "400",
      "50",
      "500",
      "600",
      "700",
      "800",
      "900",
      "950",
      "border",
      "solid",
      "subtle",
      "subtle-text",
      "text"
    ],
    "action": [
      "danger",
      "on-danger",
      "on-primary",
      "on-warning",
      "primary",
      "warning"
    ],
    "border": [
      "control",
      "default",
      "divider",
      "strong"
    ],
    "control": [
      "accent",
      "accent-checked"
    ],
    "disabled": [
      "container",
      "content"
    ],
    "elevation": [
      "dialog",
      "panel",
      "popover"
    ],
    "error": [
      "",
      "bg",
      "border",
      "foreground"
    ],
    "focus": [
      "ring-color",
      "ring-offset",
      "ring-width"
    ],
    "info": [
      "",
      "bg",
      "border",
      "foreground"
    ],
    "list": [
      "row-background-hover",
      "row-background-selected",
      "row-color"
    ],
    "layer": [
      "modal"
    ],
    "on": [
      "accent"
    ],
    "page": [
      ""
    ],
    "scrim": [
      "",
      "modal"
    ],
    "selected": [
      "background",
      "color",
      "marker-color",
      "marker-width"
    ],
    "selection": [
      "bg",
      "foreground"
    ],
    "shadow": [
      "1",
      "2",
      "3"
    ],
    "success": [
      "",
      "bg",
      "border",
      "foreground"
    ],
    "surface": [
      "",
      "component",
      "inverse",
      "level-2",
      "level-2-border",
      "level-3",
      "level-3-border",
      "subtle"
    ],
    "text": [
      "disabled",
      "inverse",
      "link",
      "placeholder",
      "primary",
      "secondary"
    ],
    "warning": [
      "",
      "bg",
      "border",
      "foreground"
    ]
  }
}
