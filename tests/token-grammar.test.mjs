import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { checkRenameResidue, checkTokenGrammar } from '../tools/lib/token-grammar.mjs'
import { LAYER_VOCABULARY, VOCABULARY, parseTokenName } from '../tools/lib/token-vocabulary.mjs'
import { matchLayerName } from '../tools/lib/token-grammar.mjs'

/**
 * Phase 4's two gates, proved able to fail.
 *
 * The grammar gate exists because a token can be reachable, singly-declared and catalogued while still
 * being named `--button-…-fg`; the residue gate exists because the parity register only sees names inside
 * the audit's token graph, not a stale reference left in a component stylesheet. Neither is a substitute
 * for the other, and both need negative fixtures: a rule that stopped being able to fail would make the
 * refactor look finished.
 */
const temporary = []
afterAll(() => {
  for (const dir of temporary) rmSync(dir, { recursive: true, force: true })
})

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'yue-grammar-'))
  temporary.push(root)
  for (const [relative_, content] of Object.entries(files)) {
    const file = join(root, relative_)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, content, 'utf8')
  }
  return root
}

const NAMESPACES = ['badge', 'button', 'input', 'tag']

describe('the naming grammar', () => {
  const namespaces = Object.keys(VOCABULARY.phrases)
  const check = (name, frozen = new Set()) => parseTokenName(name, VOCABULARY, namespaces, frozen)

  it('accepts names that follow the frozen grammar', () => {
    for (const name of [
      '--button-height-md',
      '--button-ghost-background-hover',
      '--button-primary-background',
      '--tag-primary-tint-outline-border-color',
      '--input-border-color-focus',
      '--box-background-popover',
      '--badge-padding-inline',
    ]) {
      expect(check(name).ok, name).toBe(true)
    }
  })

  it('rejects an axis-value in the wrong axis position', () => {
    // `solid` is button's *variant* (axis 2). Leading with it is an axis-order error, and the message
    // has to say which order is frozen — the whole point of freezing it per component.
    const result = check('--button-solid-primary-background')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('axis value')
  })

  it('rejects a property outside the frozen vocabulary', () => {
    const result = check('--badge-blur-radius')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('not in the frozen vocabulary')
  })

  it('rejects an unknown axis value for a declared axis', () => {
    const result = check('--tag-loud-filled-background')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('not in the frozen vocabulary')
  })

  it('rejects an abbreviation and names the offending segment', () => {
    const result = check('--badge-fg')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('"fg"')
  })

  it('rejects a size that is not last', () => {
    const result = check('--button-sm-height')
    expect(result.ok).toBe(false)
  })

  it('rejects trailing states in the wrong order', () => {
    const result = check('--button-background-pressed-hover')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('§5 order')
  })

  it('rejects an unknown component namespace', () => {
    expect(check('--widget-height-md').ok).toBe(false)
  })

  it('rejects a leading state segment that §3b has not frozen', () => {
    const result = check('--button-selected-blur')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('§3b')
  })

  it('accepts a leading state segment that §3b froze', () => {
    const frozen = new Set(['--button-selected-background'])
    expect(check('--button-selected-background', frozen).ok).toBe(true)
  })

  it('reports a violation in the sheet, with the file and the offending name', () => {
    const root = fixture({
      'packages/tokens/src/component-tokens/badge.css': ':root {\n  --badge-blur-radius: 4px;\n}\n',
    })
    const result = checkTokenGrammar({ repoRoot: root })
    expect(result.problems.join('\n')).toContain('--badge-blur-radius')
    expect(result.problems.join('\n')).toContain('frozen vocabulary')
    expect(result.stats.checked).toBe(1)
  })

  it('queues axis-valued names for the per-component freeze instead of failing them', () => {
    // `--button-selected-background` reads as "the selected variant's background", which is a *variant*
    // value, not a misplaced state. It is listed in §3b, so the gate accepts it and reports it.
    const root = fixture({
      'packages/tokens/src/component-tokens/button.css': ':root {\n  --button-selected-background: red;\n}\n',
    })
    const result = checkTokenGrammar({ repoRoot: root })
    expect(result.problems).toEqual([])
    expect(result.axisReview).toEqual(['--button-selected-background'])
  })
})

describe('the rename residue gate', () => {
  const renames = [{ prototype: '--success-fg', package: '--success-foreground' }]

  it('detects a stale reference in a stylesheet the token graph does not read', () => {
    const root = fixture({
      'packages/vue/src/components/tag/style.css': '.yue-tag { color: var(--success-fg); }\n',
    })
    const result = checkRenameResidue({ repoRoot: root, renames })
    expect(result.problems.join('\n')).toContain('--success-fg')
    expect(result.problems.join('\n')).toContain('--success-foreground')
    expect(result.stats.hits).toBe(1)
  })

  it('detects a stale declaration', () => {
    const root = fixture({
      'packages/tokens/src/semantics/feedback.css': ':root {\n  --success-fg: red;\n}\n',
    })
    expect(checkRenameResidue({ repoRoot: root, renames }).problems).toHaveLength(1)
  })

  it('does not flag the old name inside a comment', () => {
    // A comment that explains a rename has to name the old token; flagging that would push the history
    // out of the code.
    const root = fixture({
      'packages/tokens/src/semantics/feedback.css':
        ':root {\n  /* was --success-fg, renamed for §5 */\n  --success-foreground: red;\n}\n',
    })
    expect(checkRenameResidue({ repoRoot: root, renames }).problems).toEqual([])
  })

  it('does not match a longer name that merely starts the same way', () => {
    const root = fixture({
      'packages/vue/src/components/tag/style.css': '.yue-tag { color: var(--success-fg-strong); }\n',
    })
    expect(checkRenameResidue({ repoRoot: root, renames }).problems).toEqual([])
  })

  it('is inert when nothing is registered', () => {
    const root = fixture({ 'packages/vue/src/components/tag/style.css': '.x { color: red; }\n' })
    const result = checkRenameResidue({ repoRoot: root, renames: [] })
    expect(result.problems).toEqual([])
    expect(result.stats.searched).toBe(0)
  })
})

describe('the real package passes both Phase 4 gates', () => {
  it('reports no grammar violation and no residue', async () => {
    const { PACKAGE_RENAMES } = await import('../tools/token-audit.pairs.mjs')
    const grammar = checkTokenGrammar({ repoRoot: process.cwd() })
    const residue = checkRenameResidue({ repoRoot: process.cwd(), renames: PACKAGE_RENAMES })
    expect(grammar.problems).toEqual([])
    expect(residue.problems).toEqual([])
    // Not vacuous: the grammar gate inspected every component token, and the residue gate actually
    // searched for the registered renames.
    expect(grammar.stats.checked).toBeGreaterThan(300)
    expect(residue.stats.searched).toBeGreaterThan(0)
  })
})

describe('the role-layer grammar (primitives and semantics)', () => {
  // The component grammar says nothing about these layers, so without this table "the naming gate covers
  // the token set" was true of one layer only.
  const check = (name, layer) => matchLayerName(name, LAYER_VOCABULARY[layer])

  it('accepts names built from a frozen family and remainder', () => {
    for (const [name, layer] of [
      ['--space-8', 'primitives'],
      ['--neutral-500', 'primitives'],
      ['--radius-base', 'primitives'],
      ['--surface-subtle', 'semantics'],
      ['--text-primary', 'semantics'],
      ['--focus-ring-width', 'semantics'],
      ['--page', 'semantics'],
    ]) {
      expect(check(name, layer).ok, name).toBe(true)
    }
  })

  it('rejects a remainder the family does not use', () => {
    const result = check('--space-x8', 'primitives')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('frozen vocabulary')
  })

  it('rejects a modifier the role does not have', () => {
    const result = check('--surface-blur', 'semantics')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('surface allows')
  })

  it('rejects a family the layer does not have', () => {
    const result = check('--brand-500', 'primitives')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('unknown "brand" family')
  })

  it('reports a role-layer violation in the sheet', () => {
    const root = fixture({
      'packages/tokens/src/primitives/space.css': ':root {\n  --space-x8: 8px;\n}\n',
      'packages/tokens/src/semantics/surface.css': ':root {\n  --surface-blur: 4px;\n}\n',
    })
    const result = checkTokenGrammar({ repoRoot: root })
    expect(result.problems.join('\n')).toContain('--space-x8')
    expect(result.problems.join('\n')).toContain('--surface-blur')
    expect(result.stats.layerChecked).toBe(2)
  })
})
