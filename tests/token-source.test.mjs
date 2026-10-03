import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PACKAGE_RENAMES } from '../tools/token-audit.pairs.mjs'

/**
 * Invariants about the token *source*, as opposed to the values it resolves to.
 *
 * `pnpm audit:tokens` checks what the tokens mean: contrast, and parity with the frozen
 * prototype. These checks are about the file itself, and they exist because a resolvable
 * but redundant declaration is invisible to every value-level gate — it resolves to the
 * right colour either way, so nothing fails and nothing points at it.
 */

/**
 * The sheets the package publishes, discovered rather than listed.
 *
 * Phase 2 of the token refactor splits these files, and a hardcoded list would have stopped covering
 * the new ones exactly when coverage mattered most — the move itself. Discovery walks the layer
 * directories, so a file that is added to the layout is checked without editing this test.
 */
function discoverSources() {
  const roots = ['packages/tokens/src/primitives', 'packages/tokens/src/semantics', 'packages/tokens/src/component-tokens']
  const files = []
  for (const root of roots) {
    for (const base of [process.cwd(), resolve(process.cwd(), '..')]) {
      const dir = resolve(base, root)
      if (!existsSync(dir)) continue
      for (const entry of readdirSync(dir)) {
        if (entry.endsWith('.css') && entry !== '_index.css') files.push(join(dir, entry))
      }
      break
    }
  }
  if (files.length > 0) return files
  // Before the split, each layer was a single file; keep working on both layouts so the test is not
  // the reason a change has to be atomic.
  return [
    'packages/tokens/src/primitives.css',
    'packages/tokens/src/semantics.css',
    'packages/tokens/src/components.css',
  ].map((relativePath) => relativePath)
}

const SOURCES = discoverSources()

function readSource(relativePath) {
  // An absolute path is already resolved (the discovery above), a relative one is tried from both the
  // workspace root and the package dir.
  if (resolve(relativePath) === relativePath && existsSync(relativePath)) {
    return readFileSync(relativePath, 'utf8')
  }
  for (const candidate of [
    resolve(process.cwd(), relativePath),
    resolve(process.cwd(), '..', relativePath),
  ]) {
    if (existsSync(candidate)) return readFileSync(candidate, 'utf8')
  }
  throw new Error(`could not locate ${relativePath} from ${process.cwd()}`)
}

/** Strip comments so a documented example declaration is never counted. */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Split a stylesheet into `{ selector, body }` blocks, ignoring at-rule nesting.
 *
 * Enough for these files, which are flat sequences of `:root { … }` and media queries;
 * a full parser would be a dependency, and the checks below only need declaration
 * bodies.
 */
function blocks(css) {
  const out = []
  const pattern = /([^{}]+)\{([^{}]*)\}/g
  let match
  while ((match = pattern.exec(css)) !== null) {
    out.push({ selector: match[1].trim(), body: match[2] })
  }
  return out
}

const declarations = (body) =>
  [...body.matchAll(/(^|;)\s*(--[a-z0-9-]+)\s*:/gi)].map((match) => match[2])

describe('the token sources', () => {
  it('declare each custom property at most once per block', () => {
    // A duplicate is not a functional bug — the later declaration wins — which is exactly
    // why it survives: every value-level gate passes, and the file slowly accumulates
    // second copies of declarations that were already correct.
    //
    // Two instances of this were removed from `components.css` when this check was
    // written, both of them inherited verbatim from the frozen prototype:
    // `--input-color` (declared on the input group *and* again among the button group)
    // and `--progress-fill` (declared at the top of the block and again near the end).
    // Each removal deleted the *later* of two byte-identical declarations, so no resolved
    // value changed — which is why the audit's parity gate sees nothing.
    const duplicates = []
    for (const source of SOURCES) {
      const css = stripComments(readSource(source))
      for (const block of blocks(css)) {
        const seen = new Map()
        for (const name of declarations(block.body)) {
          const count = (seen.get(name) ?? 0) + 1
          seen.set(name, count)
          if (count === 2) duplicates.push(`${source} → ${block.selector}: ${name}`)
        }
      }
    }
    expect(duplicates).toEqual([])
  })

  it('leaves the frozen prototype alone', () => {
    // The prototype is a byte-frozen baseline. It is allowed to contain the duplicate
    // that was removed from the package — but if the package copy ever drifts from it in
    // a *value*, the audit's parity gate reports it, not this test.
    const prototype = resolve(process.cwd(), 'design-tokens-generic-v4/tokens/components.css')
    if (!existsSync(prototype)) return
    const prototypeNames = new Set(
      blocks(stripComments(readFileSync(prototype, 'utf8'))).flatMap((block) =>
        declarations(block.body),
      ),
    )
    // Every source the package publishes, so the check follows the sheets when the layout changes.
    const packageNames = new Set(
      SOURCES.flatMap((source) =>
        blocks(stripComments(readSource(source))).flatMap((block) => declarations(block.body)),
      ),
    )
    // A registered rename removes a name on purpose; anything else disappearing is still a failure.
    const renamed = new Map(PACKAGE_RENAMES.map((entry) => [entry.prototype, entry.package]))
    const expected = new Set(
      [...prototypeNames].map((name) => renamed.get(name) ?? name),
    )
    const removed = [...expected].filter((name) => !packageNames.has(name))
    // Removing the *second* declaration of a token leaves the first, so no name may
    // disappear. This is the assertion that makes the cleanup above safe to repeat: a
    // future edit that deletes the last declaration of a token fails here.
    expect(removed).toEqual([])
  })
})
