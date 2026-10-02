/**
 * Audit engine shared by the CLI (`tools/audit-tokens.mjs`) and the test suite,
 * so `pnpm test` and `pnpm audit:tokens` can never disagree about what passing
 * means.
 */
import { readFileSync } from 'node:fs'
import { formatColor, parseColor } from './color.mjs'
import { contrastRatio, flatten } from './contrast.mjs'
import { createResolver, loadTokenSheet } from './css-tokens.mjs'
import {
  AUDIT_PROFILES,
  CONTRAST_PAIRS,
  PROBE_PROFILES,
} from '../token-audit.pairs.mjs'
function resolveLayers(resolver, profile, tokens) {
  return [].concat(tokens).map((token) => parseColor(resolver.value(token, profile)))
}

function evaluatePair(resolver, profile, pair) {
  const [label, foreground, background, minimum] = pair
  const base = {
    profile: profile.id,
    label,
    foreground,
    background,
    minimum,
  }
  try {
    const foregroundColor = flatten(resolveLayers(resolver, profile, foreground))
    const backgroundColor = flatten(resolveLayers(resolver, profile, background))
    const ratio = contrastRatio(foregroundColor, backgroundColor)
    return {
      ...base,
      ratio,
      pass: ratio >= minimum,
      foregroundValue: formatColor(foregroundColor),
      backgroundValue: formatColor(backgroundColor),
    }
  } catch (error) {
    return { ...base, ratio: null, pass: false, error: error.message }
  }
}

/** Every token in every profile must resolve; a dangling var() is a hard error. */
function sweepUnresolved(resolver, profiles) {
  const failures = []
  for (const profile of profiles) {
    for (const name of resolver.names(profile)) {
      const outcome = resolver.tryValue(name, profile)
      if (!outcome.ok) failures.push({ profile: profile.id, name, message: outcome.error })
    }
  }
  return failures
}

/**
 * Audit one token sheet.
 *
 * `pairs` defaults to the migrated contrast contract. A target may extend it with
 * its own additional contract — the package target does, because it has grown
 * combinations the frozen prototype never had. The prototype target must not:
 * requiring colours the baseline does not define would be a category error, not a
 * stricter check.
 *
 * @returns structured result: checks, failures, unresolved references, counts.
 */
export function auditTarget({ id, entry, profiles = AUDIT_PROFILES, pairs = CONTRAST_PAIRS }) {
  const sheet = loadTokenSheet({ entry })
  const resolver = createResolver(sheet)

  const checks = []
  for (const profile of profiles) {
    for (const pair of pairs) {
      checks.push(evaluatePair(resolver, profile, pair))
    }
  }
  const unresolved = sweepUnresolved(resolver, profiles)
  const failed = checks.filter((check) => !check.pass)

  return {
    id,
    entry: sheet.entry,
    files: sheet.files,
    layerOrder: sheet.layerOrder,
    layerCounts: Object.fromEntries(sheet.layerCounts),
    declaredTokenCount: sheet.tokenNames.length,
    tokenCounts: Object.fromEntries(
      profiles.map((profile) => [profile.id, resolver.names(profile).length]),
    ),
    profiles: profiles.map((profile) => profile.id),
    pairCount: pairs.length,
    checks,
    failed,
    unresolved,
    passed: checks.length - failed.length,
    total: checks.length,
    ok: failed.length === 0 && unresolved.length === 0,
    resolver,
  }
}

/**
 * Prove a package token sheet still honours the prototype it was migrated from.
 *
 * The migration contract is asymmetric, and the asymmetry is the point:
 *
 *   - a token the prototype defines and the package lost (`missing-on-right`) is
 *     always a failure — that is the migration silently dropping a value;
 *   - a shared token that resolves differently is always a failure — that is
 *     drift;
 *   - a token the package adds (`missing-on-left`) is growth, not drift. It is
 *     rejected by default, and when `allowAdditions` is set it is returned in
 *     `addedNames` instead, so the caller has to acknowledge it explicitly rather
 *     than let token sprawl pass unnoticed.
 *
 * @param {{id: string, entry: string}} left  the prototype sheet
 * @param {{id: string, entry: string}} right the package sheet
 * @param {{allowAdditions?: boolean}} [options]
 */
export function compareTargets(left, right, options = {}) {
  const { allowAdditions = false } = options
  const profiles = PROBE_PROFILES
  const leftResolver = createResolver(loadTokenSheet({ entry: left.entry }))
  const rightResolver = createResolver(loadTokenSheet({ entry: right.entry }))
  const differences = []
  const additions = []
  let compared = 0

  for (const profile of profiles) {
    const leftNames = new Set(leftResolver.names(profile))
    const rightNames = new Set(rightResolver.names(profile))
    const union = [...new Set([...leftNames, ...rightNames])].sort()
    for (const name of union) {
      const inLeft = leftNames.has(name)
      const inRight = rightNames.has(name)
      if (!inLeft || !inRight) {
        if (!inLeft && allowAdditions) {
          additions.push({ profile: profile.id, name, kind: 'added-on-right' })
        } else {
          differences.push({
            profile: profile.id,
            name,
            kind: inLeft ? 'missing-on-right' : 'missing-on-left',
          })
        }
        continue
      }
      const leftValue = leftResolver.tryValue(name, profile)
      const rightValue = rightResolver.tryValue(name, profile)
      compared += 1
      if (!leftValue.ok || !rightValue.ok) {
        if (leftValue.ok !== rightValue.ok || leftValue.error !== rightValue.error) {
          differences.push({
            profile: profile.id,
            name,
            kind: 'resolution',
            left: leftValue.ok ? leftValue.value : `error: ${leftValue.error}`,
            right: rightValue.ok ? rightValue.value : `error: ${rightValue.error}`,
          })
        }
        continue
      }
      if (leftValue.value !== rightValue.value) {
        differences.push({
          profile: profile.id,
          name,
          kind: 'value',
          left: leftValue.value,
          right: rightValue.value,
        })
      }
    }
  }

  return {
    left: left.id,
    right: right.id,
    profiles: profiles.map((profile) => profile.id),
    compared,
    differences,
    additions,
    /** Unique, sorted package-only token names — the growth, deduplicated. */
    addedNames: [...new Set(additions.map((addition) => addition.name))].sort(),
    identical: differences.length === 0,
  }
}

/**
 * Re-read the contrast contract out of the browser prototype. Used by the test
 * suite to prove `token-audit.pairs.mjs` is a faithful transcription rather than
 * a hand-copied list that could drift.
 */
export function extractPrototypePairs(htmlPath) {
  const html = readFileSync(htmlPath, 'utf8')
  const marker = html.indexOf('const pairs = [')
  if (marker === -1) throw new Error(`${htmlPath}: could not find "const pairs = ["`)
  const open = html.indexOf('[', marker)
  const close = html.indexOf('];', open)
  if (close === -1) throw new Error(`${htmlPath}: could not find the end of the pairs array`)
  // The prototype's literal has a trailing comma, so it is not strict JSON.
  const literal = html.slice(open, close + 1).replace(/,(\s*[\]}])/g, '$1')
  return JSON.parse(literal)
}
