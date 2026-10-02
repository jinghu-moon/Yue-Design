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
  PROTOTYPE_HTML,
} from '../tools/token-audit.pairs.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const absolute = (entry) => resolve(REPO_ROOT, entry)
const target = (spec) => ({ id: spec.id, entry: absolute(spec.entry) })

const TEMP_DIR = resolve(REPO_ROOT, 'node_modules/.tmp/token-audit')
afterAll(() => {
  rmSync(TEMP_DIR, { recursive: true, force: true })
})

describe('contrast contract', () => {
  it('covers every pair in both gating profiles', () => {
    expect(CONTRAST_PAIRS).toHaveLength(32)
    expect(AUDIT_PROFILES.map((entry) => entry.id)).toEqual(['light/azure', 'dark/azure'])
    for (const pair of CONTRAST_PAIRS) {
      expect(pair).toHaveLength(4)
      expect(pair[1]).toMatch(/^--/)
      expect([].concat(pair[2]).every((token) => /^--/.test(token))).toBe(true)
      expect([3, 4.5]).toContain(pair[3])
    }
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
  const result = auditTarget(target(spec))

  it('passes every gating check', () => {
    expect(result.total).toBe(CONTRAST_PAIRS.length * AUDIT_PROFILES.length)
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

describe('prototype ↔ package parity', () => {
  const parity = compareTargets(target(DEFAULT_TARGETS[0]), target(DEFAULT_TARGETS[1]))

  it('resolves every token to the identical value in every scope', () => {
    expect(parity.differences).toEqual([])
    expect(parity.identical).toBe(true)
    expect(parity.compared).toBeGreaterThan(1000)
    expect(parity.profiles).toHaveLength(4)
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
