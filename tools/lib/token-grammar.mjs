/**
 * Phase 4 gates: naming grammar, and old names that are still alive.
 *
 * `docs/05-yue-token-refactor-plan.md` §5 freezes a grammar, and §7 Phase 4 requires two gates around
 * it. They answer different questions and neither substitutes for the other:
 *
 *   1. **grammar** — is this name well-formed? A token can be perfectly reachable, singly declared and
 *      catalogued while still being named `--button-…-fg`, and nothing else in the suite notices.
 *   2. **residue** — is a *renamed* name still in use somewhere? The parity register already fails when a
 *      name disappears from one side of the comparison, but it says nothing about a stale reference left
 *      in a stylesheet that the audit's token graph does not read (Vue component CSS, for instance).
 *
 * Both walk the sources rather than a remembered list, so a file added to the layout is covered without
 * editing this module.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { LAYER_VOCABULARY, VOCABULARY, parseTokenName } from './token-vocabulary.mjs'
import { join, relative } from 'node:path'

/**
 * Names whose second segment is a state and whose reading is frozen as an *axis value*, not a misplaced
 * modifier: \`--button-selected-background\` is "the selected variant's background", and
 * \`--button-focus-ring-width\` is the compound property \`focus-ring\` plus \`width\`.
 *
 * Frozen in \`.spec-workflow/token-architecture/naming-grammar.md\` §3b. A name that reads this way but is not
 * listed fails the gate, so the axis vocabulary can only grow by an explicit, reviewed edit.
 */
export const AXIS_STATE_NAMES = new Set([
  '--button-disabled-background',
  '--button-disabled-border-color',
  '--button-disabled-color',
  '--button-focus-ring-color',
  '--button-focus-ring-offset',
  '--button-focus-ring-width',
  '--button-selected-background',
  '--button-selected-background-hover',
  '--button-selected-background-pressed',
  '--button-selected-border-color',
  '--button-selected-color',
  '--button-selected-marker-color',
  '--button-selected-marker-width',
  '--input-focus-ring-color',
  '--input-focus-ring-offset',
  '--input-focus-ring-width',
  '--tag-focus-ring-color',
  '--tag-focus-ring-offset',
  '--tag-focus-ring-width',
])

/** The frozen state order from §5: a state never precedes another state out of this order. */
export const STATE_ORDER = ['selected', 'invalid', 'disabled', 'hover', 'pressed', 'focus']

/** Size suffixes, which §5 requires to come last. */
const SIZE_SUFFIXES = new Set(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'])

/**
 * Abbreviations §5 forbids. `fg` is named explicitly; the rest are the same class of shorthand found in
 * the sheet, and silently allowing them would make the rule "no abbreviations except the ones we used".
 */
const ABBREVIATIONS = {
  fg: 'foreground',
  bg: 'background',
  bd: 'border',
  fs: 'font-size',
  px: 'padding-inline',
}

const DECLARATION = /^\s*(--[\w-]+)\s*:/gm

const rel = (root, path) => relative(root, path).replaceAll('\\', '/')

function cssFiles(dir) {
  const files = []
  if (!existsSync(dir)) return files
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.css')) files.push(full)
    }
  }
  walk(dir)
  return files
}

/** Global (token) declarations in one file, ignoring the private `--_slot` composition values. */
function tokenNames(file) {
  const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  return [...source.matchAll(DECLARATION)]
    .map((match) => match[1])
    .filter((name) => !name.startsWith('--_'))
}

/**
 * Validate a component token name against the frozen grammar.
 *
 * @returns {{ ok: boolean, expected?: string, reason?: string }}
 */
export function validateTokenName(name, namespaces) {
  const bare = name.replace(/^--/, '')
  const segments = bare.split('-')
  const namespace = segments[0]

  if (namespaces !== undefined && !namespaces.includes(namespace)) {
    return { ok: false, reason: `unknown component namespace "${namespace}"` }
  }

  // Abbreviations, spelled out.
  for (const [short, long] of Object.entries(ABBREVIATIONS)) {
    const index = segments.indexOf(short)
    if (index === -1) continue
    const expected = `--${[...segments.slice(0, index), ...long.split('-'), ...segments.slice(index + 1)].join('-')}`
    return { ok: false, expected, reason: `"${short}" is an abbreviation; write "${long}"` }
  }

  // Size last.
  const sizeIndex = segments.findIndex((segment) => SIZE_SUFFIXES.has(segment))
  if (sizeIndex !== -1 && sizeIndex !== segments.length - 1) {
    const expected = `--${[...segments.slice(0, sizeIndex), ...segments.slice(sizeIndex + 1), segments[sizeIndex]].join('-')}`
    return { ok: false, expected, reason: 'a size segment must come last' }
  }

  // Trailing states must follow §5's order. A state *before* the property is an axis value
  // (`--button-selected-background` reads as "the selected variant's background"), so it is reported
  // separately: whether that reading is right is a per-component decision, and the plan freezes the axis
  // order per component rather than globally.
  const states = segments
    .map((segment, index) => ({ segment, index }))
    .filter((entry) => STATE_ORDER.includes(entry.segment))
  if (states.length > 0) {
    for (let index = 1; index < states.length; index += 1) {
      const previous = STATE_ORDER.indexOf(states[index - 1].segment)
      const current = STATE_ORDER.indexOf(states[index].segment)
      if (current < previous) {
        return {
          ok: false,
          expected: `--${[...segments.slice(0, states[index - 1].index), states[index].segment, states[index - 1].segment, ...segments.slice(states[index].index + 1)].join('-')}`,
          reason: `state "${states[index].segment}" must come before "${states[index - 1].segment}" (§5 order: ${STATE_ORDER.join(', ')})`,
        }
      }
    }
  }

  return { ok: true }
}

/**
 * Validate a role-layer name against its frozen family table.
 *
 * Components are named `--{namespace}-{axis…}-{property}`; the primitive and semantic layers name **roles**,
 * so their grammar is `--{family}` or `--{family}-{remainder}` with both halves frozen. Without this the
 * claim "the naming gate covers the token set" was only true of one layer: `--space-x8` or a `--surface-blur`
 * modifier could be added and nothing would notice.
 *
 * @returns {{ ok: boolean, reason?: string }}
 */
export function matchLayerName(name, families) {
  const segments = name.replace(/^--/, '').split('-')
  const family = segments[0]
  if (families[family] === undefined) {
    return { ok: false, reason: `unknown "${family}" family in this layer` }
  }
  const remainder = segments.slice(1).join('-')
  if (families[family].includes(remainder)) return { ok: true }
  const allowed = families[family].filter(Boolean).map((entry) => `-${entry}`)
  return {
    ok: false,
    reason:
      `"${name}" is not in the frozen vocabulary: ${family} allows ` +
      `${allowed.length === 0 ? '(no suffix)' : allowed.join(', ')}`,
  }
}

/**
 * Check every component token name against the grammar.
 *
 * @param {{ repoRoot: string, packageDir?: string }} options
 */
export function checkTokenGrammar({ repoRoot, packageDir = 'packages/tokens' }) {
  const dir = join(repoRoot, packageDir, 'src/component-tokens')
  const problems = []
  const namespaces = []
  for (const file of cssFiles(dir)) {
    const namespace = file.replaceAll('\\', '/').split('/').pop().replace(/\.css$/, '')
    if (namespace !== '_index') namespaces.push(namespace)
  }

  let checked = 0
  const axisReview = []
  for (const file of cssFiles(dir)) {
    if (file.endsWith('_index.css')) continue
    for (const name of tokenNames(file)) {
      checked += 1
      const segments = name.replace(/^--/, '').split('-')
      if (STATE_ORDER.includes(segments[1]) && segments.length > 2) axisReview.push(name)

      // Structural parse against the frozen per-namespace vocabulary: axes in order, then a property,
      // then trailing states, then an optional size.
      const result = parseTokenName(name, VOCABULARY, namespaces, AXIS_STATE_NAMES)
      if (result.ok) continue
      problems.push(
        `${rel(repoRoot, file)}: ${name} — ${result.reason}` +
          (result.expected === undefined ? '' : `; expected ${result.expected}`),
      )
    }
  }

  // The same rule for the two role layers, which the component grammar does not describe: their names are
  // `--{family}` or `--{family}-{remainder}`, and both halves are frozen (Phase 4 batch ①).
  let layerChecked = 0
  for (const layer of ['primitives', 'semantics']) {
    for (const file of cssFiles(join(repoRoot, packageDir, 'src', layer))) {
      if (file.endsWith('_index.css')) continue
      for (const name of tokenNames(file)) {
        layerChecked += 1
        const verdict = matchLayerName(name, LAYER_VOCABULARY[layer])
        if (!verdict.ok) problems.push(`${rel(repoRoot, file)}: ${name} — ${verdict.reason}`)
      }
    }
  }

  return {
    problems,
    notes: [
      `grammar: ${checked} component token name(s) checked against §5`,
      `grammar: ${axisReview.length} name(s) use a leading state segment as a frozen axis value (§3b)`,
      `grammar: ${layerChecked} role-layer name(s) checked against the frozen family tables`,
    ],
    axisReview,
    stats: {
      checked,
      layerChecked,
      violations: problems.length,
      namespaces: namespaces.length,
      axisReview: axisReview.length,
    },
  }
}

/**
 * Check that no renamed-away name is still declared or referenced in the sources.
 *
 * Scoped to stylesheets: prose may legitimately mention an old name when explaining the migration, and a
 * gate that failed on documentation would force the history out of the docs.
 *
 * @param {{ repoRoot: string, renames: Array<{prototype: string, package: string}> }} options
 */
export function checkRenameResidue({ repoRoot, renames }) {
  const problems = []
  const searched = renames.filter((entry) => entry.prototype !== entry.package)
  if (searched.length === 0) {
    return { problems, notes: ['residue: no renames registered yet'], stats: { searched: 0, hits: 0 } }
  }

  const roots = ['packages/tokens/src', 'packages/vue/src', 'apps/docs/.vitepress/theme']
  const files = roots.flatMap((root) => cssFiles(join(repoRoot, root)))
  let hits = 0

  for (const entry of searched) {
    // A word boundary on both sides: `--badge-fg` must not match `--badge-fg-something`.
    const pattern = new RegExp(`${entry.prototype.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'g')
    for (const file of files) {
      // Comments are stripped first: a comment that explains a rename has to name the old token.
      const raw = readFileSync(file, 'utf8')
      const source = raw.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
      for (const match of source.matchAll(pattern)) {
        hits += 1
        const line = source.slice(0, match.index).split('\n').length
        problems.push(
          `${rel(repoRoot, file)}:${line}: still uses ${entry.prototype}, which was renamed to ` +
            `${entry.package} — the old name resolves to nothing`,
        )
      }
    }
  }

  return {
    problems,
    notes: [`residue: ${searched.length} renamed name(s) checked across ${files.length} stylesheet(s)`],
    stats: { searched: searched.length, files: files.length, hits },
  }
}
