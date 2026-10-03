import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
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
  PACKAGE_ONLY_TOKENS,
  PACKAGE_PAIRS,
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
  const result = auditTarget({ ...target(spec), pairs })

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
    const result = auditTarget({ ...packageTarget, pairs: PACKAGE_DIAGNOSTIC_PAIRS })
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
    const pairs = auditTarget({ ...packageTarget, pairs: PACKAGE_PAIRS })
    const labels = pairs.checks.map((check) => check.label)
    for (const [label] of PACKAGE_DIAGNOSTIC_PAIRS) {
      expect(labels).not.toContain(label)
    }
  })
})

describe('prototype ↔ package parity', () => {
  // Superset mode. The prototype is a byte-frozen visual regression baseline, so
  // the package is expected to have grown; what may never happen is a dropped
  // token or a shared token resolving differently.
  const parity = compareTargets(target(DEFAULT_TARGETS[0]), target(DEFAULT_TARGETS[1]), {
    allowAdditions: true,
  })

  it('resolves every shared token to the identical value in every scope', () => {
    expect(parity.differences).toEqual([])
    expect(parity.identical).toBe(true)
    expect(parity.compared).toBeGreaterThan(1000)
    expect(parity.profiles).toHaveLength(4)
  })

  it('grows only by the pinned package-only tokens', () => {
    // Any new package-only token must be added to PACKAGE_ONLY_TOKENS by hand,
    // which is what keeps "the package may grow" from becoming a loophole.
    expect(parity.addedNames).toEqual(PACKAGE_ONLY_TOKENS)
  })

  it('still fails closed when additions are not explicitly allowed', () => {
    const strict = compareTargets(target(DEFAULT_TARGETS[0]), target(DEFAULT_TARGETS[1]))
    expect(strict.addedNames).toEqual([])
    // Strict mode must report the additions as differences, and only as
    // package-side additions — never as something the prototype lost. One record
    // is emitted per probed profile, so the names are deduplicated here.
    expect([...new Set(strict.differences.map((difference) => difference.name))].sort()).toEqual(
      PACKAGE_ONLY_TOKENS,
    )
    expect(strict.differences.every((difference) => difference.kind === 'missing-on-left')).toBe(
      true,
    )
    expect(strict.identical).toBe(false)
  })
})

describe('non-gating diagnostics', () => {
  it('also clears the neutral accent scopes', () => {
    const diagnostics = auditTarget({
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
  const broken = auditTarget({ id: 'broken', entry: override })

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
