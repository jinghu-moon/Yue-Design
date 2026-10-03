#!/usr/bin/env node
/**
 * Token inventory — the Phase 0 artifact of `docs/05-yue-token-refactor-plan.md`.
 *
 * The refactor moves every declaration to a new directory and renames every component token, so the
 * two things it cannot be done without are:
 *
 *   1. a complete list of what exists now — name, declaring file, layer, resolved value per profile,
 *      who references it, and whether it is a public override point;
 *   2. the same list, machine-readable, so the migration can be *diffed*: Phase 2 requires the
 *      resolved set and values to be identical, and Phase 4 requires every old name to disappear.
 *
 * A hand-written inventory would be wrong within a day, which is why this is a script and why its
 * output is checked in. It reads the package through the same parser the contrast audit uses, so
 * "what the inventory says" and "what the audit enforces" cannot disagree.
 *
 * Usage:
 *   node tools/token-inventory.mjs                 # summary
 *   node tools/token-inventory.mjs --write         # + write the JSON artifact
 *   node tools/token-inventory.mjs --json          # print the JSON
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, relative, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createResolver, loadTokenSheet, stripComments } from './lib/css-tokens.mjs'
import { importGraph, readCatalogue } from './lib/token-architecture.mjs'
import { AUDIT_PROFILES, DIAGNOSTIC_PROFILES } from './token-audit.pairs.mjs'

const REPO_ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(REPO_ROOT, 'packages/tokens/src')
const ENTRY = join(SRC, 'index.css')
const ARCHIVE = join(SRC, 'implementations.css')
const OUTPUT = join(REPO_ROOT, '.spec-workflow/token-architecture/inventory.json')
const CONSUMER_DIRS = ['packages/vue/src', 'apps/docs/.vitepress/theme']

const rel = (path) => relative(REPO_ROOT, path).replaceAll('\\', '/')

function cssFiles(dir) {
  const files = []
  if (!existsSync(dir)) return files
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.css')) files.push(full)
    }
  }
  walk(dir)
  for (const extra of CONSUMER_DIRS) walk(join(REPO_ROOT, extra))
  return files
}

/** Which file declares each global token, and in which layer. */
function declarationSites() {
  // The layer comes from the import graph, not from a filename: the whole refactor is about files
  // whose name stopped describing their job, so a name-based guess would be the wrong oracle.
  const entryGraph = importGraph(ENTRY)
  const archiveGraph = importGraph(ARCHIVE)
  const layerOf = (file) =>
    entryGraph.get(file) ?? (archiveGraph.has(file) ? 'implementations' : 'unreachable')

  const sheet = loadTokenSheet({ entry: ENTRY })
  const sites = new Map()
  for (const declaration of sheet.declarations) {
    const record = sites.get(declaration.name) ?? { files: new Set(), layers: new Set() }
    record.files.add(declaration.file ? rel(declaration.file) : '(inline)')
    record.layers.add(layerOf(declaration.file))
    sites.set(declaration.name, record)
  }
  return { sheet, sites, layerOf }
}

/** Every `var(--x)` reference, by file, so consumers and orphans are facts rather than guesses. */
function references() {
  const byToken = new Map()
  for (const file of cssFiles(SRC)) {
    const source = stripComments(readFileSync(file, 'utf8'))
    for (const match of source.matchAll(/var\(\s*(--[\w-]+)/g)) {
      const list = byToken.get(match[1]) ?? new Set()
      list.add(rel(file))
      byToken.set(match[1], list)
    }
  }
  return byToken
}

/** Public override points, from the catalogue blocks the architecture gate already enforces. */
function cataloguePolicy() {
  // Aggregated across every file the public entry reaches, and keyed by no filename: the catalogue
  // moved from one sheet into `component-tokens/*.css`, one block per file, so reading a fixed path
  // would report "0 groups" for a layout that is perfectly catalogued.
  const entryGraph = importGraph(ENTRY)
  const groups = []
  for (const [file, layer] of entryGraph) {
    if (layer !== 'components' || !existsSync(file)) continue
    const block = readCatalogue(readFileSync(file, 'utf8'))
    if (block === null) continue
    groups.push(...block.map((group) => ({ ...group, file: rel(file) })))
  }
  return {
    groups,
    policy(name) {
      const bare = name.replace(/^--/, '')
      const matches = groups.filter((group) => bare.startsWith(group.prefix))
      if (matches.length !== 1) return 'unknown'
      return matches[0].override
    },
  }
}

function buildInventory() {
  const { sheet, sites, layerOf } = declarationSites()
  const refs = references()
  const { groups, policy } = cataloguePolicy()
  const resolver = createResolver(sheet)
  const profiles = [...AUDIT_PROFILES, ...DIAGNOSTIC_PROFILES]

  const tokens = []
  for (const name of [...sites.keys()].sort()) {
    const record = sites.get(name)
    const declared = [...record.files].sort()
    const layers = [...record.layers].sort()
    const used = [...(refs.get(name) ?? [])].sort()
    const reachable = !layers.includes('unreachable')
    const values = {}
    for (const profile of profiles) {
      const outcome = resolver.tryValue(name, profile)
      values[profile.id] = outcome.ok ? outcome.value : `error: ${outcome.error}`
    }
    // Policy is a statement about *who may override this name*, and the answer differs by layer:
    // a primitive is an internal scale, a semantic role is a themed contract, and only a component
    // token can be an override point advertised in the catalogue.
    const layer = layers.includes('components')
      ? 'components'
      : layers.includes('semantics')
        ? 'semantics'
        : layers.includes('primitives')
          ? 'primitives'
          : 'unreachable'
    const publicOverride =
      layer === 'components' ? policy(name) : layer === 'unreachable' ? 'n/a' : layer
    tokens.push({
      name,
      namespace: name.replace(/^--/, '').split('-')[0],
      declaredIn: declared,
      layer,
      reachableFromEntry: reachable,
      publicOverride,
      consumers: used.filter((file) => !declared.includes(file)),
      resolved: values,
    })
  }

  const byNamespace = new Map()
  const byLayer = new Map()
  for (const token of tokens) {
    byNamespace.set(token.namespace, (byNamespace.get(token.namespace) ?? 0) + 1)
    byLayer.set(token.layer, (byLayer.get(token.layer) ?? 0) + 1)
  }

  return {
    generatedFrom: {
      entry: rel(ENTRY),
      archive: rel(ARCHIVE),
      files: sheet.files.map((file) => rel(file)).sort(),
      catalogueGroups: groups.length,
    },
    profiles: profiles.map((profile) => profile.id),
    counts: {
      tokens: tokens.length,
      declared: sheet.tokenNames.length,
      byNamespace: Object.fromEntries([...byNamespace].sort()),
      byLayer: Object.fromEntries([...byLayer].sort()),
      publicOverride: tokens.filter((token) => token.publicOverride === 'public').length,
      internal: tokens.filter((token) => token.publicOverride === 'internal').length,
      unreferenced: tokens.filter((token) => token.consumers.length === 0).length,
    },
    /** The "old names" half of Phase 4's mapping table: every name that must stop existing. */
    oldTokenNames: tokens.map((token) => token.name),
    /** The "old paths" half of Phase 0 task 4. */
    oldPaths: sheet.files.map((file) => rel(file)).sort(),
    tokens,
  }
}

function main() {
  const argv = process.argv.slice(2)
  const inventory = buildInventory()

  if (argv.includes('--write')) {
    mkdirSync(dirname(OUTPUT), { recursive: true })
    writeFileSync(OUTPUT, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8')
    process.stdout.write(`wrote ${rel(OUTPUT)}\n`)
  }
  if (argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`)
    return 0
  }

  const { counts, generatedFrom } = inventory
  process.stdout.write('Yue Design · Token inventory\n')
  process.stdout.write(`  entry: ${generatedFrom.entry}\n`)
  process.stdout.write(`  files in the public graph: ${generatedFrom.files.length}\n`)
  process.stdout.write(`  tokens: ${counts.tokens} (declared ${counts.declared})\n`)
  process.stdout.write(
    `  policy: ${counts.publicOverride} public override point(s), ${counts.internal} internal\n`,
  )
  process.stdout.write(`  unreferenced: ${counts.unreferenced}\n`)
  process.stdout.write('  by namespace:\n')
  for (const [namespace, count] of Object.entries(counts.byNamespace)) {
    process.stdout.write(`    ${namespace.padEnd(12)} ${count}\n`)
  }
  return 0
}

try {
  process.exitCode = main()
} catch (error) {
  process.stderr.write(`token-inventory: ${error.message}\n`)
  process.exitCode = 2
}
