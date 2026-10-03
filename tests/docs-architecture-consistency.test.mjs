import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Architecture prose must not contradict the package.
 *
 * The Phase 6 audit found the README and both doc trees still describing deleted files (`src/primitives.css`,
 * `components.css`, `src/components/box.css`) and an `./components.css` export, plus layer counts and a
 * quoted audit summary from earlier splits. `pnpm verify:all` passed throughout, because the docs gates
 * check that pages *exist*, are translated and do not hard-code strings — not that their architecture
 * claims are true. A reader following them would import paths that do not resolve.
 *
 * Two lessons from that audit are built into this file:
 *
 *   1. the counts are **read from the inventory CLI**, not written here. An earlier version of this test
 *      hard-coded `179/81/331`, which only proved the docs agreed with the test — editing both would have
 *      passed. Recomputing from source means the docs have to agree with the package.
 *   2. the path check covers *every* deleted path, not the handful that first came to mind. One audit
 *      round later `src/components/box.css` was still live because the list only named whole files.
 */

/** Run the inventory CLI and parse its JSON: the package's own view of itself. */
function inventory() {
  const stdout = execFileSync(process.execPath, ['tools/token-inventory.mjs', '--json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  return JSON.parse(stdout)
}

/** The layer table's facts, as a directory under `packages/tokens`: layer name → {dir, count}. */
function layerFacts() {
  const { counts, generatedFrom } = inventory()
  return {
    files: generatedFrom.files.length,
    catalogueGroups: generatedFrom.catalogueGroups,
    tokens: counts.tokens,
    rows: [
      { layer: 'primitives', dir: 'src/primitives', count: counts.byLayer.primitives },
      { layer: 'semantics', dir: 'src/semantics', count: counts.byLayer.semantics },
      { layer: 'components', dir: 'src/component-tokens', count: counts.byLayer.components },
    ],
  }
}

const DOC_FILES = [
  'packages/tokens/README.md',
  'apps/docs/architecture/index.md',
  'apps/docs/en/architecture/index.md',
  'apps/docs/foundation/index.md',
  'apps/docs/en/foundation/index.md',
  'apps/docs/tools/index.md',
  'apps/docs/en/tools/index.md',
]

const read = (path) => readFileSync(path, 'utf8')

describe('architecture documentation matches the package', () => {
  it('names no deleted path as a live one', () => {
    // Every path the Phase 2–5 split removed, in the shapes prose actually uses. A sentence that
    // explains a removal says so (「已删除」/removed/deleted) and is allowed to name the old path.
    const deleted = [
      'src/primitives.css',
      'src/semantics.css',
      'src/components.css',
      'src/components/',
      "url('./primitives.css')",
      "url('./semantics.css')",
      "url('./components.css')",
      './components.css',
    ]
    const problems = []
    for (const file of DOC_FILES) {
      read(file)
        .split('\n')
        .forEach((line, index) => {
          // A sentence that explains a change legitimately names the old path: 「曾经」「已删除」,
          // "removed", "was renamed". Without this the history would have to leave the code.
          if (/曾经|已删除|历史|已迁移|removed|deleted|was renamed/i.test(line)) return
          for (const stale of deleted) {
            if (line.includes(stale)) problems.push(`${file}:${index + 1} still references ${stale}`)
          }
        })
    }
    expect(problems).toEqual([])
  })

  it('states the layer counts the package actually has', () => {
    const facts = layerFacts()
    for (const file of ['apps/docs/foundation/index.md', 'apps/docs/en/foundation/index.md']) {
      const source = read(file)
      for (const { layer, dir, count } of facts.rows) {
        const row = source.split('\n').find((line) => line.startsWith(`| \`${layer}\` |`))
        expect(row, `${file} has no ${layer} row`).toBeDefined()
        expect(row, `${file} ${layer} row`).toContain(dir)
        // The count comes from the CLI, so a layer move or a rename has to update the prose.
        expect(row, `${file} ${layer} row must state ${count}`).toContain(`| ${count} |`)
      }
    }
  })

  it('quotes the architecture summary the audit actually prints', () => {
    // The tools pages show audit output; the audit's own summary line is the source of truth for it.
    const facts = layerFacts()
    const expected = `architecture: ${facts.tokens} declared token(s) across ${facts.files} reachable file(s), ${facts.catalogueGroups} catalogue group(s)`
    for (const file of ['apps/docs/tools/index.md', 'apps/docs/en/tools/index.md']) {
      const quoted = read(file)
        .split('\n')
        .filter((line) => line.includes('architecture:') && line.includes('reachable file'))
      expect(quoted.length, `${file} quotes no architecture summary`).toBeGreaterThan(0)
      for (const line of quoted) {
        expect(line, `${file} quotes a stale summary`).toContain(expected)
      }
    }
  })

  it('documents only exports the package declares', () => {
    const manifest = JSON.parse(read('packages/tokens/package.json'))
    const declared = Object.keys(manifest.exports)
    for (const file of ['packages/tokens/README.md', 'apps/docs/en/foundation/index.md']) {
      const source = read(file)
      for (const match of source.matchAll(/@yue-ui\/design-tokens(\/[^\s`)',:"\]]+)?/g)) {
        const entry = match[1] ?? ''
        if (entry === '' || entry.startsWith('/locale')) continue
        // Documented patterns (`component-tokens/*.css`, `assets/*`) are compared by prefix, so a doc
        // sentence may name the wildcard the manifest actually declares.
        const normalized = entry.replace(/^\./, '')
        const known = declared.some((key) => {
          const declaredPath = key === '.' ? '/index.css' : key.replace(/^\./, '')
          if (declaredPath.includes('*')) {
            return normalized.startsWith(declaredPath.slice(0, declaredPath.indexOf('*')))
          }
          return normalized === declaredPath
        })
        expect(known, `${file} documents @yue-ui/design-tokens${entry}, which is not exported`).toBe(true)
      }
    }
  })

  it('describes the font path the font-face rules actually use', () => {
    // The audit caught this one specifically: the README still sent readers to `src/primitives.css` and
    // `../assets/`, one directory short after the files moved into subdirectories.
    const typography = read('packages/tokens/src/primitives/typography.css')
    const uses = [...typography.matchAll(/url\('([^']+)'\)/g)].map((match) => match[1])
    expect(uses.length).toBeGreaterThan(0)
    expect(uses.every((url) => url.startsWith('../../assets/'))).toBe(true)
    expect(read('packages/tokens/README.md')).toContain('src/primitives/typography.css')
  })

  it('states the test counts the recorded run produced', () => {
    // The counts are generated by `pnpm sync:handoff`, which runs the suite and rewrites them. Manual
    // updates lost this twice: a file was listed with 13 tests while it had 18, and the suite total was a
    // release behind. The residual is the record's own freshness — hence the script in the checklist.
    const counts = JSON.parse(read('.spec-workflow/token-architecture/test-counts.json'))
    const handoff = read('.spec-workflow/token-architecture/handoff.md')
    for (const match of handoff.matchAll(/(\d+) 测试 \/ (\d+) 文件/g)) {
      expect(Number(match[1]), 'a stated test total is stale').toBe(counts.tests)
      expect(Number(match[2]), 'a stated file count is stale').toBe(counts.files)
    }
    for (const [file, count] of Object.entries(counts.perFile)) {
      // Read the number that follows *this* filename: the §1 list puts several files on one line, and
      // taking the line's first number compared one file's count against another's.
      const line = handoff.split('\n').find((candidate) => candidate.includes(`${file} (`))
      if (line === undefined) continue
      const after = line.slice(line.indexOf(`${file} (`) + file.length + 2)
      const stated = /^(\d+)\)/.exec(after)
      expect(stated, `${file} is listed without a count`).not.toBeNull()
      expect(Number(stated[1]), `${file} is listed with a stale count`).toBe(count)
    }
  })

  it('keeps the committed inventory in step with the sources', () => {
    // The docs gate trusts the CLI, so the committed inventory has to be the CLI's current output —
    // otherwise the gate would certify the docs against a stale self-description.
    const committed = JSON.parse(read('.spec-workflow/token-architecture/inventory.json'))
    const live = inventory()
    expect(live.counts).toEqual(committed.counts)
    expect(live.generatedFrom.files.length).toBe(committed.generatedFrom.files.length)
    expect(live.generatedFrom.catalogueGroups).toBe(committed.generatedFrom.catalogueGroups)
    expect(live.oldTokenNames).toEqual(committed.oldTokenNames)
  })
})
