import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import { auditTarget, compareTargets, extractPrototypePairs } from '../tools/lib/audit.mjs'
import {
  AUDIT_PROFILES,
  CONTRAST_PAIRS,
  DEFAULT_TARGETS,
  DIAGNOSTIC_PROFILES,
  PACKAGE_CONTRAST_PAIRS,
  PACKAGE_DIAGNOSTIC_PAIRS,
  PACKAGE_DIVERGENCES,
  PACKAGE_ONLY_TOKENS,
  PACKAGE_PAIRS,
  PACKAGE_RENAMES,
  PROTOTYPE_HTML,
} from '../tools/token-audit.pairs.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const absolute = (entry) => resolve(REPO_ROOT, entry)
const target = (spec) => ({ id: spec.id, entry: absolute(spec.entry) })

/**
 * Which contract a target must satisfy.
 *
 * The prototype is held to the migrated table and nothing more; everything else is
 * held to that table plus the package's own additions, because only the package
 * defines them. Same rule the CLI uses.
 */
const pairsFor = (id) => (id === 'prototype' ? CONTRAST_PAIRS : PACKAGE_PAIRS)

/**
 * Shape check for a pair list.
 *
 * The foreground may be an array when the text itself is translucent: an opaque
 * `flatten()` assumes its first layer is solid, so a lone translucent foreground would
 * be measured as if it were the raw colour. Painting it over an explicit base is the
 * only way to get a real number.
 */
const parseable = (pairs, label) => {
  for (const pair of pairs) {
    expect(pair, label).toHaveLength(4)
    for (const token of [].concat(pair[1])) expect(token, label).toMatch(/^--/)
    expect([].concat(pair[2]).every((token) => /^--/.test(token)), label).toBe(true)
    expect(pair[3], label).toBeGreaterThanOrEqual(3)
  }
}

const TEMP_DIR = resolve(REPO_ROOT, 'node_modules/.tmp/token-audit')
afterAll(() => {
  rmSync(TEMP_DIR, { recursive: true, force: true })
})

describe('contrast contract', () => {
  it('covers every pair in both gating profiles', () => {
    expect(CONTRAST_PAIRS).toHaveLength(32)
    expect(AUDIT_PROFILES.map((entry) => entry.id)).toEqual(['light/azure', 'dark/azure'])
    parseable(CONTRAST_PAIRS, 'migrated')
  })

  it('keeps the package-only additions well formed', () => {
    expect(PACKAGE_CONTRAST_PAIRS.length).toBeGreaterThan(0)
    parseable(PACKAGE_CONTRAST_PAIRS, 'package-only')
  })

  it('is a faithful transcription of the browser prototype, not a hand-copied list', (context) => {
    const prototype = absolute(PROTOTYPE_HTML)
    if (!existsSync(prototype)) {
      context.skip()
      return
    }
    expect(extractPrototypePairs(prototype)).toEqual(JSON.parse(JSON.stringify(CONTRAST_PAIRS)))
  })

  it('extracts the prototype contract with the documented shape', (context) => {
    const prototype = absolute(PROTOTYPE_HTML)
    if (!existsSync(prototype)) {
      context.skip()
      return
    }
    const pairs = extractPrototypePairs(prototype)
    expect(Array.isArray(pairs)).toBe(true)
    expect(pairs.length).toBeGreaterThan(0)
    expect(pairs[0]).toHaveLength(4)
  })
})

describe.each(DEFAULT_TARGETS)('$id target', (spec) => {
  const pairs = pairsFor(spec.id)
  const result = auditTarget({ ...target(spec), pairs, renames: spec.id === 'prototype' ? [] : PACKAGE_RENAMES })

  it('passes every gating check', () => {
    expect(result.pairCount).toBe(pairs.length)
    expect(result.total).toBe(pairs.length * AUDIT_PROFILES.length)
    expect(result.failed.map((failure) => `${failure.profile} ${failure.label}`)).toEqual([])
    expect(result.passed).toBe(result.total)
    expect(result.ok).toBe(true)
  })

  it('resolves every token in every profile', () => {
    expect(result.unresolved).toEqual([])
    expect(result.tokenCounts['light/azure']).toBeGreaterThan(400)
  })

  it('keeps the declared cascade layers', () => {
    expect(result.layerOrder).toEqual([
      'primitives',
      'semantics',
      'components',
      'implementations',
      'demo',
    ])
  })

  it('reports sensible ratios for the sampled colours', () => {
    for (const check of result.checks) {
      expect(check.ratio, `${check.profile} ${check.label}`).toBeGreaterThanOrEqual(1)
      expect(check.ratio).toBeLessThanOrEqual(21)
      if (check.pass) expect(check.ratio).toBeGreaterThanOrEqual(check.minimum)
    }
  })
})

describe('the package-only contrast contract', () => {
  it('extends the migrated table rather than replacing it', () => {
    expect(PACKAGE_PAIRS).toEqual([...CONTRAST_PAIRS, ...PACKAGE_CONTRAST_PAIRS])
    expect(PACKAGE_PAIRS.length).toBe(CONTRAST_PAIRS.length + PACKAGE_CONTRAST_PAIRS.length)
    // No pair may appear twice, or the audit would double-count a gating check.
    expect(new Set(PACKAGE_PAIRS.map((pair) => pair[0])).size).toBe(PACKAGE_PAIRS.length)
  })

  it('adds combinations rather than restating the migrated table', () => {
    // Two separate claims, because either alone would be too weak:
    //
    //  - no entry may duplicate a migrated *combination*, or the list would be a
    //    second copy of the table that could drift from it. A migrated token can
    //    still appear here — `--input-border-color-focus` and
    //    `--input-border-color-invalid` are migration-era tokens whose states the
    //    prototype never sampled, and gating them is new coverage, not duplication;
    //  - at least one entry must name a post-migration token, or the list would be
    //    purely about old tokens and belong in CONTRAST_PAIRS (which it cannot join,
    //    because that one is a verbatim transcription).
    const signature = (pair) =>
      `${JSON.stringify([].concat(pair[1]))}|${JSON.stringify([].concat(pair[2]))}`
    const migrated = new Set(CONTRAST_PAIRS.map(signature))

    for (const pair of PACKAGE_CONTRAST_PAIRS) {
      expect(migrated.has(signature(pair)), `${pair[0]} duplicates a migrated pair`).toBe(false)
    }

    const additions = new Set(PACKAGE_ONLY_TOKENS)
    const namesAnAddition = PACKAGE_CONTRAST_PAIRS.some(([, foreground, background]) =>
      [].concat(foreground, background).some((token) => additions.has(token)),
    )
    expect(namesAnAddition).toBe(true)
  })

  it('would fail on the frozen prototype, which is why it is not applied there', () => {
    // The reason the contract is per-target rather than global: the prototype has no
    // `--button-warning-*` or `--button-*-accent` at all, so asking it to clear these
    // pairs would report "unresolved reference" for colours it was never meant to
    // define — a category error dressed up as a stricter gate.
    const prototype = auditTarget({ ...target(DEFAULT_TARGETS[0]), pairs: PACKAGE_PAIRS })
    expect(prototype.ok).toBe(false)
    expect(prototype.failed.length).toBeGreaterThan(0)
    expect(prototype.failed.every((failure) => typeof failure.error === 'string')).toBe(true)
  })

  it('gates the combinations the migration never had', () => {
    const labels = PACKAGE_CONTRAST_PAIRS.map((pair) => pair[0])
    for (const expected of ['成功按钮', '警告按钮']) {
      expect(labels).toContain(expected)
    }
    for (const theme of ['默认', '主要', '危险', '警告', '成功']) {
      expect(labels).toContain(`描边按钮文字 ${theme}`)
    }
    for (const expected of ['输入框焦点边界 / 输入背景', '输入框错误边界 / 输入背景']) {
      expect(labels).toContain(expected)
    }
  })
})

describe('the exempt contrast contract', () => {
  const packageTarget = target(DEFAULT_TARGETS[1])

  it('is well formed, including the translucent foreground it exists for', () => {
    expect(PACKAGE_DIAGNOSTIC_PAIRS.length).toBeGreaterThan(0)
    parseable(PACKAGE_DIAGNOSTIC_PAIRS, 'exempt')
    expect(
      PACKAGE_DIAGNOSTIC_PAIRS.some((pair) => Array.isArray(pair[1])),
      'the disabled-state pair must composite its translucent text over a base',
    ).toBe(true)
  })

  it('is measured, and measured against the composite rather than the raw colour', () => {
    const result = auditTarget({ ...packageTarget, pairs: PACKAGE_DIAGNOSTIC_PAIRS, renames: PACKAGE_RENAMES })
    expect(result.unresolved).toEqual([])
    for (const check of result.checks) {
      expect(check.error).toBeUndefined()
      expect(check.ratio).toBeGreaterThan(1)
      expect(check.ratio).toBeLessThan(21)
    }
    // The reason the pair cannot gate: an exempt *and* translucent-anchored number.
    // `--disabled-content` is a `color-mix(..., transparent)`, so the raw colour
    // reports far higher than the composite a user actually sees.
    const raw = auditTarget({
      ...packageTarget,
      pairs: [['raw', '--input-color-disabled', ['--page', '--input-background-disabled'], 3]],
    })
    const composited = result.checks.find((check) => check.profile === 'light/azure')
    const rawLight = raw.checks.find((check) => check.profile === 'light/azure')
    expect(composited.ratio).toBeLessThan(rawLight.ratio)
  })

  it('is not part of the gating contract, so it can never turn the audit red', () => {
    const pairs = auditTarget({ ...packageTarget, pairs: PACKAGE_PAIRS, renames: PACKAGE_RENAMES })
    const labels = pairs.checks.map((check) => check.label)
    for (const [label] of PACKAGE_DIAGNOSTIC_PAIRS) {
      expect(labels).not.toContain(label)
    }
  })
})

describe('prototype ↔ package parity', () => {
  // Superset mode. The prototype is a byte-frozen visual regression baseline, so
  // the package is expected to have grown; what may never happen is a dropped
  // token or a shared token resolving differently *without being registered*.
  const parity = compareTargets(target(DEFAULT_TARGETS[0]), target(DEFAULT_TARGETS[1]), {
    allowAdditions: true,
    allowedDivergences: PACKAGE_DIVERGENCES,
    // Renames are registered too: the parity gate compares by name, so without this a rename reads as
    // a lost token on one side and token sprawl on the other.
    allowedRenames: PACKAGE_RENAMES,
  })

  it('resolves every shared token identically, except the registered divergences', () => {
    expect(parity.differences).toEqual([])
    expect(parity.identical).toBe(true)
    expect(parity.compared).toBeGreaterThan(1000)
    expect(parity.profiles).toHaveLength(4)
    // The register is not a wider allowance: it must describe exactly what diverges.
    expect(parity.divergentNames).toEqual(
      PACKAGE_DIVERGENCES.map((entry) => entry.name).sort(),
    )
    expect(parity.staleDivergences).toEqual([])
  })

  it('pins each registered divergence to the value the sheet actually declares', () => {
    // Without this, a register entry could claim one value while the sheet declares another, and
    // the reason for the divergence would describe something that is no longer true.
    //
    // The sheets are discovered rather than named: the component tokens moved from one file into
    // `component-tokens/*.css`, and this assertion must keep working across that kind of move.
    //
    // Every layer, not just `component-tokens/`: a change to a primitive is transitive, so the register
    // legitimately holds semantics-layer tokens too (`--list-row-background-hover` resolves differently in
    // dark because `--opacity-hover` does). Narrowing the lookup to one directory would have made this
    // assertion reject real entries; widening it keeps the intent — the registered value must be the value
    // the sheet declares — for every layer.
    const sheets = ['component-tokens', 'semantics', 'primitives']
      .map((layer) => resolve(REPO_ROOT, 'packages/tokens/src', layer))
      .flatMap((dir) =>
        readdirSync(dir)
          .filter((name) => name.endsWith('.css') && name !== '_index.css')
          .map((name) => readFileSync(resolve(dir, name), 'utf8')),
      )
      .join('\n')
    for (const entry of PACKAGE_DIVERGENCES) {
      // Every declaration of the name, not just the first: a theme-scoped divergence (`--opacity-hover` is
      // `.08` at `:root` and `.12` under `[data-theme=dark]`) declares the token twice, and the register
      // states the value that diverges. Accepting any declaration keeps the guard's intent — the registered
      // value must be one the sheet really declares — while making multi-theme tokens expressible.
      const declarations = [...sheets.matchAll(new RegExp(`\\${entry.name}\\s*:\\s*([^;]+);`, 'g'))].map((match) =>
        match[1].trim(),
      )
      expect(declarations.length, `${entry.name} is registered but not declared in any token file`).toBeGreaterThan(0)
      expect(declarations, `${entry.name} pins a value the sheet does not declare`).toContain(entry.package)
      expect(entry.prototype).toBeTruthy()
      expect(entry.reason.length).toBeGreaterThan(20)
    }
  })

  it('applies exactly the registered renames, and no stale entries', () => {
    // The parity comparison resolves every token, so it must exercise every registered rename — a
    // register entry that nothing matches would otherwise sit there looking authoritative.
    expect(parity.appliedRenames).toEqual(
      PACKAGE_RENAMES.map((rename) => rename.prototype).sort(),
    )
    expect(parity.staleRenames).toEqual([])
  })

  it('resolves a renamed pair against the package sheet', () => {
    // The contract names the prototype's token; the package answers under the new one. If the mapping
    // were missing, the pair would fail as an unresolved reference rather than measuring a colour.
    const packageRun = auditTarget({
      ...target(DEFAULT_TARGETS[1]),
      pairs: PACKAGE_PAIRS,
      renames: PACKAGE_RENAMES,
    })
    // A pair audit reports only the renames its *pairs* name — the contract references
    // `--focus-ring`, not the width or offset — and every reported name must be registered.
    const registered = new Set(PACKAGE_RENAMES.map((rename) => rename.prototype))
    expect(packageRun.appliedRenames.length).toBeGreaterThan(0)
    for (const name of packageRun.appliedRenames) expect(registered.has(name)).toBe(true)
    expect(packageRun.unresolved).toEqual([])
  })

  it('grows only by the pinned package-only tokens', () => {
    // Any new package-only token must be added to PACKAGE_ONLY_TOKENS by hand,
    // which is what keeps "the package may grow" from becoming a loophole.
    expect(parity.addedNames).toEqual(PACKAGE_ONLY_TOKENS)
  })

  it('still fails closed when additions are not explicitly allowed', () => {
    const strict = compareTargets(target(DEFAULT_TARGETS[0]), target(DEFAULT_TARGETS[1]), {
    allowedRenames: PACKAGE_RENAMES,
  })
    // With no register the rename shows up as a lost token plus an addition — which is exactly why
    // the register exists, and what this assertion documents.
    expect(strict.addedNames).toEqual([])
    // Strict mode reports every difference, and only as package-side kinds: additions
    // (`missing-on-left`) plus the value divergences that the register normally explains. Nothing
    // may appear as something the prototype lost.
    expect([...new Set(strict.differences.map((difference) => difference.name))].sort()).toEqual(
      [...PACKAGE_ONLY_TOKENS, ...PACKAGE_DIVERGENCES.map((entry) => entry.name)].sort(),
    )
    expect(
      strict.differences.every((difference) =>
        ['missing-on-left', 'value'].includes(difference.kind),
      ),
    ).toBe(true)
    expect(strict.identical).toBe(false)
  })

  it('still fails closed when divergences are not registered', () => {
    // The whole point of the register: the same comparison without it reports the Tag geometry as
    // drift, exactly as it did before the register existed.
    const unregistered = compareTargets(target(DEFAULT_TARGETS[0]), target(DEFAULT_TARGETS[1]), {
      allowAdditions: true,
      allowedRenames: PACKAGE_RENAMES,
    })
    const names = [...new Set(unregistered.differences.map((difference) => difference.name))].sort()
    expect(names).toEqual(PACKAGE_DIVERGENCES.map((entry) => entry.name).sort())
    expect(unregistered.differences.every((difference) => difference.kind === 'value')).toBe(true)
    expect(unregistered.identical).toBe(false)
  })

  it('reports a registered name that no longer diverges', () => {
    const stale = compareTargets(target(DEFAULT_TARGETS[0]), target(DEFAULT_TARGETS[1]), {
      allowedRenames: PACKAGE_RENAMES,
      allowAdditions: true,
      allowedDivergences: [...PACKAGE_DIVERGENCES, '--button-height-md'],
    })
    expect(stale.staleDivergences).toEqual(['--button-height-md'])
  })
})

describe('non-gating diagnostics', () => {
  it('resolves renamed tokens in the neutral accent diagnostics', () => {
    // The diagnostics run is non-gating, so a renamed token it could not resolve showed up as a false
    // "unresolved reference" in a successful audit's output. A diagnostic that cries wolf is worse than
    // no diagnostic, so the register is asserted here rather than trusted to be passed.
    const run = auditTarget({
      ...target(DEFAULT_TARGETS[1]),
      profiles: DIAGNOSTIC_PROFILES,
      pairs: PACKAGE_PAIRS,
      renames: PACKAGE_RENAMES,
    })
    expect(run.unresolved).toEqual([])
    expect(run.appliedRenames.length).toBeGreaterThan(0)
  })

  it('also clears the neutral accent scopes', () => {
    const diagnostics = auditTarget({
      renames: PACKAGE_RENAMES,
      ...target(DEFAULT_TARGETS[1]),
      profiles: DIAGNOSTIC_PROFILES,
    })
    expect(diagnostics.failed.map((failure) => `${failure.profile} ${failure.label}`)).toEqual([])
  })
})

describe('the gate can actually fail', () => {
  // An unlayered override outranks every cascade layer, so this is also a live
  // check that the resolver models layer priority the way browsers do.
  const override = resolve(TEMP_DIR, 'broken.css')
  mkdirSync(TEMP_DIR, { recursive: true })
  writeFileSync(
    override,
    `@import url('${absolute(DEFAULT_TARGETS[1].entry).replaceAll('\\', '/')}');\n` +
      ':root { --text-primary: #f8f8f8; }\n',
    'utf8',
  )
  const broken = auditTarget({ id: 'broken', entry: override, renames: PACKAGE_RENAMES })

  it('fails when a token is driven below its contrast floor', () => {
    expect(broken.ok).toBe(false)
    expect(broken.failed.length).toBeGreaterThan(0)
    const lightFailure = broken.failed.find(
      (failure) => failure.profile === 'light/azure' && failure.label === '正文 / 基础表面',
    )
    expect(lightFailure).toBeDefined()
    expect(lightFailure.ratio).toBeLessThan(4.5)
  })

  it('keeps the other profile unaffected', () => {
    const darkCheck = broken.checks.find(
      (check) => check.profile === 'dark/azure' && check.label === '正文 / 基础表面',
    )
    expect(darkCheck.pass).toBe(true)
  })

  it('still reports the untouched pairs as passing', () => {
    const untouched = broken.checks.find(
      (check) => check.label === '焦点环 / 页面背景' && check.profile === 'light/azure',
    )
    expect(untouched.pass).toBe(true)
  })
})
