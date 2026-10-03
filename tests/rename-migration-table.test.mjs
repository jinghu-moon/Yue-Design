import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PACKAGE_RENAMES } from '../tools/token-audit.pairs.mjs'
import { BEGIN, END, renameTable } from '../tools/rename-table.mjs'

/**
 * A rename has two halves: the package stops answering to the old name, and the docs say so.
 *
 * The gates already prove the first half — the parity register fails on an unregistered rename, and the
 * residue gate fails when a renamed-away name is still declared or referenced. Neither says anything about
 * what a *consumer* is told, and "no aliases" is only defensible if the replacement name is published.
 *
 * The table is generated from the register rather than typed, so the copy cannot drift; this gate is what
 * makes the generation mandatory instead of a thing someone remembers to run.
 */
const TARGETS = ['packages/tokens/README.md', '.spec-workflow/token-architecture/breaking-changes.md']

const block = (file) => {
  const source = readFileSync(file, 'utf8')
  const match = new RegExp(`${BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).exec(source)
  return match === null ? null : match[0]
}

describe('the rename migration table', () => {
  it('is present in both the package README and the breaking-change record', () => {
    for (const file of TARGETS) {
      expect(block(file), `${file} has no generated rename table`).not.toBeNull()
    }
  })

  it('matches the register exactly, so it cannot go stale', () => {
    const expected = renameTable('zh')
    for (const file of TARGETS) {
      expect(block(file), `${file} lists a different set of renames`).toBe(expected)
    }
  })

  it('documents every registered rename, and only registered ones', () => {
    const source = block('packages/tokens/README.md') ?? ''
    for (const entry of PACKAGE_RENAMES) {
      expect(source, `${entry.prototype} → ${entry.package} is not documented`).toContain(
        `\`${entry.prototype}\` | \`${entry.package}\``,
      )
    }
    // A row for a rename that no longer exists would send a consumer to a name nothing declares.
    const rows = source.split('\n').filter((line) => line.startsWith('| `--'))
    expect(rows).toHaveLength(PACKAGE_RENAMES.length)
  })

  it('states that the old name is gone rather than aliased', () => {
    // The distinction is the whole point of the table: a consumer searching for the old name must find a
    // replacement, not a compatibility shim.
    const readme = readFileSync('packages/tokens/README.md', 'utf8')
    expect(readme).toMatch(/不保留\s*alias|不保留别名|no aliases/i)
  })
})
