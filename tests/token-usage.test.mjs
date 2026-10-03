import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { classifyUnconsumed, docFilesFor, docMentionIndex, referenceSources } from '../tools/lib/token-usage.mjs'

/**
 * Unconsumed tokens are normal; unexplained ones are not.
 *
 * A token set is a design language, so coverage is necessarily wider than current usage — `--amber-400`
 * and `--breakpoint-lg` are vocabulary, and the earlier version of this gate framed them as debt to be
 * deleted. The invariant worth enforcing is weaker and truer: **every token that no other file consumes
 * must fall into a cause that explains it**, and the one cause that implies work — a component-layer
 * public override point nothing reads and no page documents — must be empty or explicitly accepted.
 */
const inventory = JSON.parse(readFileSync('.spec-workflow/token-architecture/inventory.json', 'utf8'))
const report = JSON.parse(readFileSync('.spec-workflow/token-architecture/token-usage.json', 'utf8'))
const sources = referenceSources()
const docs = docMentionIndex(docFilesFor())

const classification = () => classifyUnconsumed({ inventory, sources, docs })

describe('unconsumed tokens', () => {
  it('are each explained by a cause', () => {
    const { rows, counts } = classification()
    const accounted = Object.values(counts).reduce((total, count) => total + count, 0)
    expect(accounted).toBe(rows.length)
  })

  it('leave no component override point without a reader or documentation', () => {
    // This is the only cause that implies work. If it ever stops being empty, the fix is to give the token
    // a reader or document it as a knob — not to delete a name the frozen prototype may still define.
    const { needsDecision } = classification()
    expect(needsDecision.map((row) => row.name)).toEqual([])
  })

  it('separates tokens consumed inside their own file from genuinely unconsumed ones', () => {
    // The inventory's consumer rule excludes the declaring file, so `--accent-solid: var(--accent-600)`
    // in one file made `--accent-600` look orphaned. These must not be reported as unconsumed.
    const { byCause = {} } = classification()
    const composed = byCause['same-file-composition'] ?? []
    expect(composed.length).toBeGreaterThan(0)
    for (const row of composed) {
      expect(row.referencedIn.length, `${row.name} has no reference in its own file`).toBeGreaterThan(0)
    }
  })

  it('keeps every consumer-facing primitive documented', () => {
    const { byCause = {} } = classification()
    for (const row of byCause['consumer-facing'] ?? []) {
      expect(row.docMentions.length, `${row.name} is justified as consumer-facing but undocumented`).toBeGreaterThan(0)
    }
  })

  it('keeps every prototype-contract token actually in the prototype', () => {
    const { byCause = {} } = classification()
    const rows = byCause['prototype-contract'] ?? []
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row.inPrototype).toBe(true)
  })

  it('matches the committed report, so the picture cannot drift silently', () => {
    const { counts, rows } = classification()
    expect(report.counts).toEqual(counts)
    expect(report.total).toBe(rows.length)
    expect(report.needsDecision).toBe(0)
  })

  it('agrees with the count the inventory prints', () => {
    // `counts.unreferenced` means "no reference from another file" — the name is the inventory's, and this
    // assertion is what keeps the two views of the same fact in step.
    expect(inventory.counts.unreferenced).toBe(report.total)
  })
})
