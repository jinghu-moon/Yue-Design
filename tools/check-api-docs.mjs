#!/usr/bin/env node
/**
 * Documentation ⇄ API consistency gate.
 *
 * Reads the contracts in `tools/api-docs.contract.mjs` and asserts that, for every
 * component in them, the declarations in `types.ts`, the component that implements them,
 * the API page tables and the examples all describe the same public interface. The rules
 * and the reasoning live in `tools/lib/api-docs.mjs`.
 *
 * Why a release gate rather than a review checklist: the failure this catches is *silent*.
 * A renamed prop leaves documentation that looks perfectly reasonable, a component test
 * that still passes (the class it renders is unchanged), and a type-check that never reads
 * markdown. The only thing that notices is a comparison between the two artefacts, and the
 * only way that comparison keeps happening is if it runs on every verification.
 *
 * Usage: node tools/check-api-docs.mjs [--quiet]
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DOC_CONTRACTS } from './api-docs.contract.mjs'
import { checkApiDocs } from './lib/api-docs.mjs'

const REPO_ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Fail early and clearly on a malformed contract.
 *
 * The checker itself would report a missing section for a typo in `docs`, but a wrong
 * *shape* (a `components` entry without `props`) would make it throw somewhere deep inside
 * the reader, where the message no longer mentions the contract that caused it.
 */
function validateContract(contract) {
  const problems = []
  if (!contract.id) problems.push('contract has no `id`')
  if (!contract.types) problems.push(`${contract.id}: no \`types\``)
  if (!contract.docs) problems.push(`${contract.id}: no \`docs\``)
  if (!Array.isArray(contract.components) || contract.components.length === 0) {
    problems.push(`${contract.id}: no \`components\``)
  }
  for (const component of contract.components ?? []) {
    for (const key of ['name', 'section', 'props', 'sfc']) {
      if (!component[key]) problems.push(`${contract.id}/${component.name ?? '?'}: no \`${key}\``)
    }
  }
  if (!Array.isArray(contract.exampleFiles) || contract.exampleFiles.length === 0) {
    problems.push(`${contract.id}: no \`exampleFiles\``)
  }
  return problems
}

/**
 * A contract that points at a file which does not exist is a gate that silently checks
 * less than it claims, so existence is asserted here rather than surfacing as an ENOENT
 * stack trace from inside the reader.
 */
function validateFiles(contract) {
  const problems = []
  const entries = [
    ['types', contract.types],
    ['docs', contract.docs],
    ...(contract.config ? [['config.file', contract.config.file]] : []),
    ...contract.components.map((component) => [`components.${component.name}.sfc`, component.sfc]),
    ...contract.exampleFiles.map((file) => ['exampleFiles', file]),
  ]
  for (const [label, file] of entries) {
    try {
      readFileSync(resolvePath(REPO_ROOT, file), 'utf8')
    } catch {
      problems.push(`${contract.id}: ${label} does not exist: ${file}`)
    }
  }
  return problems
}

function main() {
  const quiet = process.argv.includes('--quiet')
  const problems = []
  const notes = []

  process.stdout.write('Yue Design · API ⇄ documentation consistency\n')

  for (const contract of DOC_CONTRACTS) {
    process.stdout.write(`contract: ${contract.id} (${contract.docs})\n`)

    const structural = [...validateContract(contract), ...validateFiles(contract)]
    if (structural.length > 0) {
      problems.push(...structural)
      continue
    }

    const result = checkApiDocs({ root: REPO_ROOT, ...contract })
    problems.push(...result.problems)
    if (!quiet) {
      for (const note of result.notes) {
        process.stdout.write(`  ${note}\n`)
        notes.push(note)
      }
    }
  }

  if (problems.length > 0) {
    process.stdout.write(`\n${problems.length} problem(s):\n`)
    for (const problem of problems) process.stdout.write(`  ✗ ${problem}\n`)
    process.stdout.write(
      '\nThe API page is the published interface: a table row and a declared prop are the\n' +
        'same promise, so they are edited together.\n',
    )
    process.stdout.write('\nRESULT: FAIL\n')
    return 1
  }

  process.stdout.write('\nRESULT: PASS\n')
  return 0
}

try {
  process.exitCode = main()
} catch (error) {
  process.stderr.write(`check-api-docs: ${error.message}\n`)
  process.exitCode = 2
}
