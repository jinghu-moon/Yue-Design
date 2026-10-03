/**
 * Keep the handoff's test numbers true.
 *
 * The audit caught stale counts twice ("13 tests" for a file with 18, "628" for a suite of 635) — a class of
 * drift that manual updates lose every time, because the numbers live in prose while the truth lives in a
 * test run. So the numbers become generated: this tool runs the suite once, records the result in
 * `.spec-workflow/token-architecture/test-counts.json`, and rewrites every count the handoff states.
 *
 * `tests/docs-architecture-consistency.test.mjs` then fails when the handoff and that record disagree, so
 * the two artifacts cannot drift apart. Residual, stated rather than implied: the record itself is only as
 * fresh as the last run of this tool, so it belongs in the release checklist next to `pnpm verify:all`.
 *
 * Usage: `corepack pnpm sync:handoff`
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const REPO_ROOT = process.cwd()
const RECORD = '.spec-workflow/token-architecture/test-counts.json'
const HANDOFF = '.spec-workflow/token-architecture/handoff.md'

/**
 * Run the suite and read the counts off its own report.
 *
 * The JSON reporter's \`--outputFile\` proved unreliable when nested under \`pnpm exec\`, and the default
 * reporter already prints exactly what is needed: one \`✓ |project| path (N tests)\` line per file plus the
 * \`Test Files\`/\`Tests\` totals. Parsing that removes a moving part without weakening the record.
 */
function runSuite() {
  let stdout = ''
  try {
    // A shell: `corepack` is a `.cmd` shim on Windows, and spawning it directly yields no stdout at all
    // (which the first version of this tool silently turned into a zero-count record).
    stdout = execFileSync('corepack pnpm test', { cwd: REPO_ROOT, encoding: 'utf8', shell: true, maxBuffer: 64 * 1024 * 1024 })
  } catch (error) {
    // A failing suite still prints its counts, and a real failure is reported by \`pnpm test\` itself.
    stdout = String(error.stdout ?? '')
  }

  const plain = stdout.replace(/\u001B\[[0-9;]*m/g, '')
  const perFile = {}
  for (const match of plain.matchAll(/[✓×]\s*\|[^|]*\|\s*(\S+?)\s*\((\d+) tests?\)/g)) {
    perFile[match[1].replaceAll('\\', '/')] = Number(match[2])
  }
  const total = /Tests\s+(\d+) passed/.exec(plain)
  const files = /Test Files\s+(\d+) passed/.exec(plain)
  return {
    files: files === null ? Object.keys(perFile).length : Number(files[1]),
    tests: total === null ? 0 : Number(total[1]),
    perFile,
  }
}

const counts = runSuite()
if (counts.tests === 0 || counts.files === 0) {
  process.stderr.write(
    'sync:handoff: could not read the suite result (0 tests / 0 files) — refusing to overwrite the ' +
      'handoff with an empty record. Run `corepack pnpm test` and check its output format.\n',
  )
  process.exit(1)
}
writeFileSync(`${REPO_ROOT}/${RECORD}`, `${JSON.stringify(counts, null, 2)}\n`, 'utf8')

let handoff = readFileSync(`${REPO_ROOT}/${HANDOFF}`, 'utf8')
const before = handoff

// Prose counts, in the shapes the handoff actually uses.
handoff = handoff.replaceAll(/\d+ 测试 \/ \d+ 文件/g, `${counts.tests} 测试 / ${counts.files} 文件`)
handoff = handoff.replace(/(测试从基线的 597 增至 )\d+/, `$1${counts.tests}`)

// The §1 file list: `tests/<file> (<n>)` for every file the handoff names, plus any it should name.
for (const [file, count] of Object.entries(counts.perFile)) {
  const pattern = new RegExp(`(${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*\\(\\d+\\)`)
  if (pattern.test(handoff)) handoff = handoff.replace(pattern, `$1 (${count})`)
}

writeFileSync(`${REPO_ROOT}/${HANDOFF}`, handoff, 'utf8')
console.log(`suite: ${counts.tests} tests / ${counts.files} files`)
console.log(`handoff updated: ${handoff !== before}`)
for (const [file, count] of Object.entries(counts.perFile)) {
  if (handoff.includes(`${file} (`)) console.log(`  ${file}: ${count}`)
}
