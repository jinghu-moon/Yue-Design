#!/usr/bin/env node
/**
 * Yue token audit — the release gate for @yue-ui/design-tokens.
 *
 *   node tools/audit-tokens.mjs [--target <dir|file>]... [--json] [--quiet] [--no-diagnostics]
 *
 * Gating:
 *   1. every contrast pair passes in every gating profile (light + dark)
 *   2. every token in every profile resolves (no dangling var(), no cycles)
 *   3. when more than one target is audited, all targets resolve identically
 *
 * The `neutral` accent profiles are reported but never gating: the browser
 * prototype never sampled them, so a faithful migration must not be able to
 * fail on them.
 */
import { statSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditTarget, compareTargets } from './lib/audit.mjs'
import {
  AUDIT_PROFILES,
  CONTRAST_PAIRS,
  DEFAULT_TARGETS,
  DIAGNOSTIC_PROFILES,
  PACKAGE_DIAGNOSTIC_PAIRS,
  PACKAGE_PAIRS,
} from './token-audit.pairs.mjs'

const REPO_ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..')

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

function parseArgs(argv) {
  const options = { targets: [], json: false, quiet: false, diagnostics: true }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--target') {
      const value = argv[index + 1]
      if (!value) throw new Error('--target needs a path')
      options.targets.push(value)
      index += 1
    } else if (arg.startsWith('--target=')) {
      options.targets.push(arg.slice('--target='.length))
    } else if (arg === '--json') {
      options.json = true
    } else if (arg === '--quiet') {
      options.quiet = true
    } else if (arg === '--no-diagnostics') {
      options.diagnostics = false
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else {
      throw new Error(`unknown argument "${arg}"`)
    }
  }
  return options
}

/** A target may be a directory (resolving to <dir>/src/index.css) or a file. */
function normalizeTarget(spec) {
  const entry = typeof spec === 'string' ? spec : spec.entry
  const providedId = typeof spec === 'string' ? undefined : spec.id
  const absolute = isAbsolute(entry) ? entry : resolvePath(REPO_ROOT, entry)
  let resolvedEntry = absolute
  let fallbackId = displayPath(absolute)
  try {
    if (statSync(absolute).isDirectory()) {
      resolvedEntry = join(absolute, 'src', 'index.css')
      fallbackId = `${displayPath(absolute)}/src/index.css`
    }
  } catch (error) {
    throw new Error(`target "${entry}" is not readable: ${error.message}`)
  }
  return { id: providedId ?? fallbackId, entry: resolvedEntry }
}

/** Repo-relative, forward-slashed path for stable output across platforms. */
function displayPath(absolute) {
  const relativePath = relative(REPO_ROOT, absolute)
  return (relativePath === '' ? '.' : relativePath).replaceAll('\\', '/')
}

/* ------------------------------------------------------------------ *
 * Presentation
 * ------------------------------------------------------------------ */

const WIDE_RANGES = [
  [0x1100, 0x115f],
  [0x2e80, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe6f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x20000, 0x3fffd],
]

function displayWidth(text) {
  let width = 0
  for (const character of String(text)) {
    const code = character.codePointAt(0)
    width += WIDE_RANGES.some(([low, high]) => code >= low && code <= high) ? 2 : 1
  }
  return width
}

function pad(text, width) {
  const value = String(text)
  return value + ' '.repeat(Math.max(0, width - displayWidth(value)))
}

function padStart(text, width) {
  const value = String(text)
  return ' '.repeat(Math.max(0, width - displayWidth(value))) + value
}

const RULE = '─'.repeat(78)

function renderTarget(result, { quiet }) {
  const lines = []
  lines.push(`▌ ${result.id} — ${displayPath(result.entry)}`)
  lines.push(
    `  files: ${result.files.map((file) => basename(file)).join(' ← ')}`,
  )
  lines.push(`  layers: ${result.layerOrder.join(' < ')}`)
  lines.push(
    `  tokens: ${result.profiles
      .map((profile) => `${profile} ${result.tokenCounts[profile]}`)
      .join(', ')} (declared ${result.declaredTokenCount})`,
  )

  if (result.unresolved.length > 0) {
    lines.push(`  ✗ ${result.unresolved.length} unresolved token reference(s):`)
    for (const failure of result.unresolved.slice(0, 20)) {
      lines.push(`      [${failure.profile}] ${failure.name}: ${failure.message}`)
    }
    if (result.unresolved.length > 20) {
      lines.push(`      … ${result.unresolved.length - 20} more`)
    }
  }

  lines.push(`  ${RULE}`)
  const header = [' #', pad('配对', 34), pad('前景', 27), pad('背景', 46), padStart('≥', 4), padStart('亮色', 7), padStart('暗色', 7), ' 结果']
  lines.push(`  ${header.join(' ')}`)

  const byPair = new Map()
  for (const check of result.checks) {
    if (!byPair.has(check.label)) byPair.set(check.label, [])
    byPair.get(check.label).push(check)
  }
  let index = 0
  for (const [label, checks] of byPair) {
    index += 1
    const first = checks[0]
    const vs = Object.fromEntries(checks.map((check) => [check.profile, check]))
    const lightProfile = result.profiles[0]
    const darkProfile = result.profiles[1]
    const format = (check) => (check === undefined ? '—' : check.ratio === null ? 'ERR' : check.ratio.toFixed(2))
    const background = [].concat(first.background).join(' + ')
    const verdict = checks.every((check) => check.pass) ? 'PASS' : 'FAIL'
    lines.push(
      `  ${padStart(index, 2)} ${pad(label, 34)} ${pad(first.foreground, 27)} ${pad(background, 46)} ` +
        `${padStart(first.minimum, 4)} ${padStart(format(vs[lightProfile]), 7)} ${padStart(format(vs[darkProfile]), 7)}  ${verdict}`,
    )
  }

  const failures = result.failed
  if (failures.length > 0 && !quiet) {
    lines.push('')
    lines.push(`  failures (${failures.length}):`)
    for (const failure of failures) {
      lines.push(
        `    [${failure.profile}] ${failure.label}: ` +
          (failure.error
            ? failure.error
            : `${failure.ratio.toFixed(2)}:1 < ${failure.minimum}:1 — ` +
              `${failure.foregroundValue} on ${failure.backgroundValue}`),
      )
    }
  }

  lines.push('')
  lines.push(
    `  → ${result.passed}/${result.total} ${result.ok ? 'PASS' : 'FAIL'} ` +
      `(${result.pairCount} pairs × ${result.profiles.length} profiles)`,
  )
  return lines
}

function renderParity(parity) {
  const lines = [`▌ parity ${parity.left} ↔ ${parity.right}`]
  lines.push(`  profiles probed: ${parity.profiles.join(', ')}`)
  lines.push(`  resolutions compared: ${parity.compared}`)
  lines.push(`  differences: ${parity.differences.length}`)
  if (parity.differences.length > 0) {
    for (const difference of parity.differences.slice(0, 25)) {
      lines.push(
        `    [${difference.profile}] ${difference.name} — ${difference.kind}` +
          (difference.left === undefined
            ? ''
            : `\n        ${parity.left}: ${difference.left}\n        ${parity.right}: ${difference.right}`),
      )
    }
    if (parity.differences.length > 25) {
      lines.push(`    … ${parity.differences.length - 25} more`)
    }
  }
  // Additions are reported, never silent: the prototype is a byte-frozen
  // baseline, so every package-only token is a deliberate extension and should be
  // visible in the release log rather than quietly widening the contract.
  const added = parity.addedNames ?? []
  lines.push(`  additions (package-only): ${added.length}`)
  for (const name of added) lines.push(`    + ${name}`)
  lines.push(
    `  → ${parity.identical ? (added.length > 0 ? 'SUPERSET — no drift, no loss' : 'IDENTICAL') : 'DIVERGED'}`,
  )
  return lines
}

/* ------------------------------------------------------------------ *
 * main
 * ------------------------------------------------------------------ */

function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    process.stdout.write(
      'usage: node tools/audit-tokens.mjs [--target <dir|file>]... [--json] [--quiet] [--no-diagnostics]\n',
    )
    return 0
  }

  const specs = options.targets.length > 0 ? options.targets : DEFAULT_TARGETS
  const targets = specs.map((spec) => normalizeTarget(spec))

  // The migrated prototype is held to the migrated contract, verbatim. Everything
  // else — the package, and any ad-hoc `--target` — is held to that contract *plus*
  // the package's own additions, because only the package defines them.
  const pairsFor = (id) => (id === 'prototype' ? CONTRAST_PAIRS : PACKAGE_PAIRS)

  const results = targets.map((target) =>
    auditTarget({ id: target.id, entry: target.entry, pairs: pairsFor(target.id) }),
  )
  // Superset mode: the package started as a byte-identical copy of the frozen
  // prototype and is now allowed to grow. Dropped tokens and value drift still
  // fail; additions are surfaced by renderParity and pinned by the test suite.
  const parity =
    results.length > 1
      ? compareTargets(targets[0], targets[1], { allowAdditions: true })
      : null

  const diagnostics = options.diagnostics
    ? results.map((result) =>
        auditTarget({
          id: result.id,
          entry: result.entry,
          profiles: DIAGNOSTIC_PROFILES,
          pairs: pairsFor(result.id),
        }),
      )
    : []

  // The package's exempt pairs, measured so the numbers stay visible. These never
  // contribute to `ok` — see PACKAGE_DIAGNOSTIC_PAIRS for why each one is exempt.
  const exempt =
    options.diagnostics && specs === DEFAULT_TARGETS
      ? results
          .filter((result) => result.id !== 'prototype')
          .map((result) =>
            auditTarget({
              id: result.id,
              entry: result.entry,
              pairs: PACKAGE_DIAGNOSTIC_PAIRS,
            }),
          )
      : []

  const gatingOk = results.every((result) => result.ok)
  const parityOk = parity === null || parity.identical
  const ok = gatingOk && parityOk

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok,
          gating: results.map(({ resolver, ...rest }) => rest),
          parity,
          exempt: exempt.map(({ resolver, ...rest }) => rest),
          diagnostics: diagnostics.map(({ resolver, ...rest }) => rest),
        },
        null,
        2,
      )}\n`,
    )
    return ok ? 0 : 1
  }

  const out = []
  out.push('Yue Design · Token Audit')
  out.push(RULE)
  out.push(
    `contract: ${CONTRAST_PAIRS.length} migrated pairs (+${PACKAGE_PAIRS.length - CONTRAST_PAIRS.length} ` +
      `package-only) × ${AUDIT_PROFILES.length} profiles`,
  )
  out.push(`gating profiles: ${AUDIT_PROFILES.map((profile) => profile.id).join(', ')}`)
  out.push('')
  for (const [index, result] of results.entries()) {
    if (index > 0) out.push('')
    out.push(...renderTarget(result, options))
  }
  if (parity) {
    out.push('')
    out.push(...renderParity(parity))
  }
  if (diagnostics.length > 0) {
    out.push('')
    out.push('▌ diagnostics (non-gating)')
    for (const result of diagnostics) {
      out.push(`  ${result.id} ${result.profiles.join(', ')}: ${result.passed}/${result.total} PASS`)
      for (const failure of result.failed) {
        out.push(
          `    [${failure.profile}] ${failure.label}: ` +
            (failure.error ?? `${failure.ratio.toFixed(2)}:1 < ${failure.minimum}:1`),
        )
      }
      for (const unresolved of result.unresolved) {
        out.push(`    [${unresolved.profile}] ${unresolved.name}: ${unresolved.message}`)
      }
    }
  }
  if (exempt.length > 0) {
    out.push('')
    out.push('▌ exempt pairs (measured, never gating)')
    for (const result of exempt) {
      for (const check of result.checks) {
        const value =
          check.error ??
          `${check.ratio.toFixed(2)}:1 (minimum ${check.minimum}:1 would be ${
            check.pass ? 'met' : 'missed'
          })`
        out.push(`  [${check.profile}] ${check.label}: ${value}`)
      }
    }
  }
  out.push('')
  out.push(RULE)
  out.push(ok ? 'RESULT: PASS' : 'RESULT: FAIL')
  process.stdout.write(`${out.join('\n')}\n`)
  return ok ? 0 : 1
}

try {
  process.exitCode = main()
} catch (error) {
  process.stderr.write(`audit-tokens: ${error.message}\n`)
  process.exitCode = 2
}
