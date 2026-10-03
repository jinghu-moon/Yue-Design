/**
 * Token package architecture rules.
 *
 * These exist because of a defect class, not a defect: the Tag component shipped with undefined
 * sizes and a pill radius for its "square" shape, and every existing gate passed. The values were
 * all present in the repository — in `src/components/tag.css`, a file the public entry never
 * imported — while the reachable declarations were the prototype's control-scale aliases. Nothing
 * could see it:
 *
 *   - `audit:tokens` resolved the token package's own entry and found it internally consistent;
 *   - no check looked at what `@yue-ui/vue` *uses*, so `--tag-focus-ring-width` could be undefined;
 *   - no check noticed that two files declared the same token with different values;
 *   - the misleading `./components.css` export pointed at the unreachable entry.
 *
 * So the rules are about reachability, resolution and uniqueness, and each one is a failure rather
 * than a warning. `tests/token-architecture.test.mjs` drives them against fixtures in both
 * directions, so a rule that stops being able to fail is caught as well.
 *
 * Read with:
 *   - `reachableDeclarations`  who declares what, and whether the public entry can see it
 *   - `undeclaredUses`         what the components reference that nobody declares
 *   - `duplicateDeclarations`  the same name declared twice in two files
 *   - `layerViolations`        a lower layer depending on a higher one
 *   - `exportProblems`         an export whose name and target disagree
 *   - `catalogueProblems`      a token with no catalogue group, or a group with no tokens
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve as resolvePath } from 'node:path'
import { stripComments } from './css-tokens.mjs'

/** Layer order, lowest precedence first — the order `src/index.css` declares. */
export const LAYER_ORDER = ['primitives', 'semantics', 'components', 'implementations']

/** Private composition slots a component owns inside its own rule block. */
const PRIVATE_PREFIX = '--_'

/**
 * Selectors whose custom properties are *tokens*, i.e. global names a consumer can see.
 *
 * Everything else — `.btn { --bg: … }`, `.field { --h: … }` — is a local composition slot, private
 * to the rule that declares it. Without this distinction the prototype archive's own internals look
 * like 300 unreachable tokens, and the check drowns in noise instead of finding the one file that
 * was genuinely unreachable.
 */
const GLOBAL_SELECTOR = /^(?::root|html)\b|^\[data-(?:theme|accent)/

const USE = /var\(\s*(--[\w-]+)/g
const IMPORT = /@import\s+url\(\s*['"]?([^'")]+)['"]?\s*\)\s*(?:layer\(\s*([\w-]+)\s*\))?/g

const relativeTo = (root, path) => relative(root, path).replaceAll('\\', '/')


/** Every CSS file under a directory, recursively. */
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
  return files
}

/**
 * Declarations in one file, split into global tokens and local slots by their selector.
 *
 * The audit parser cannot answer this: it models the selectors a *token sheet* uses and deliberately
 * skips blocks it cannot compile, which is everything the prototype archive is made of
 * (`.btn { --bg: … }`). So this is a small block scanner: it tracks the selector that encloses each
 * declaration and ignores at-rule wrappers (`@media`, `@layer`, `@supports`), which do not change
 * whether a declaration is a token.
 *
 * The distinction is the whole point of the check. A `:root` block in an unreachable file is the Tag
 * defect — a token that no consumer can see — while `.btn { --bg: … }` in that same file is a private
 * composition slot and entirely correct.
 */
function declarationsIn(file) {
  const source = stripComments(readFileSync(file, 'utf8'))
  const tokens = []
  const slots = []

  // Selector stack: entry is the effective style selector (`:root`, `.btn`, …), or null inside an
  // at-rule prologue that has not opened a style block yet.
  const selectors = []
  let buffer = ''
  for (const character of source) {
    if (character === '{') {
      const selector = buffer.trim().replace(/\s+/g, ' ')
      buffer = ''
      selectors.push(selector.startsWith('@') ? { atRule: selector, selector: null } : { selector })
      continue
    }
    if (character === '}') {
      selectors.pop()
      buffer = ''
      continue
    }
    if (character === ';') {
      buffer = ''
      continue
    }
    if (character === '\n') continue
    buffer += character

    // A complete `--name: value` sitting in the buffer of a style block.
    const declaration = /(--[\w-]+)\s*:\s*(.+)$/.exec(buffer)
    if (declaration === null) continue
    const effective = selectors.filter((entry) => entry.selector !== null).at(-1)
    if (effective === undefined) continue
    const record = { name: declaration[1], value: declaration[2].trim(), selector: effective.selector }
    if (GLOBAL_SELECTOR.test(record.selector)) tokens.push(record)
    else slots.push(record)
    buffer = ''
  }

  return { tokens, slots }
}

/** `var()` uses in one file. */
function usesIn(file) {
  const source = stripComments(readFileSync(file, 'utf8'))
  return [...source.matchAll(USE)].map((match) => match[1])
}

/**
 * The import graph, resolved to `file -> layer`.
 *
 * Layer is read from the `@import … layer(name)` wrapper rather than from a filename convention:
 * the point of the defect was that a file's *name* said one thing and its layer said another.
 */
export function importGraph(entry, visited = new Map(), inheritedLayer = null) {
  if (!existsSync(entry)) return visited
  const absolute = resolvePath(entry)
  if (visited.has(absolute)) return visited
  const source = stripComments(readFileSync(absolute, 'utf8'))
  visited.set(absolute, inheritedLayer)
  for (const match of source.matchAll(IMPORT)) {
    const target = resolvePath(dirname(absolute), match[1])
    const layer = match[2] ?? null
    const nested = importGraph(target, visited, layer ?? inheritedLayer)
    // A `layer()` on this import decides the imported file's layer. Without one, the file belongs to
    // the layer of whatever imported it — which is what makes a directory entry (`_index.css` inside
    // `component-tokens/`) work: the entry is imported with `layer(components)` and its own imports
    // carry no wrapper, because repeating the layer in ten files is exactly the duplication this
    // refactor removes.
    if (layer !== null) nested.set(target, layer)
  }
  return visited
}

/** The `@yue-token-catalogue` block from a sheet: `prefix | purpose | public|internal`. */
export function readCatalogue(source) {
  const marker = source.indexOf('@yue-token-catalogue')
  if (marker === -1) return null
  const end = source.indexOf('*/', marker)
  const block = source.slice(marker, end === -1 ? source.length : end)
  const groups = []
  for (const line of block.split('\n')) {
    // Rows are comment lines (` *   input-  | … | public`), so the leading `*` and the alignment
    // padding are part of the format.
    const match = /^\s*\*?\s*([\w-]+)-\s*\|\s*([^|]+?)\s*\|\s*(public|internal)\s*$/.exec(line)
    if (match) groups.push({ prefix: `${match[1]}-`, purpose: match[2], override: match[3] })
  }
  return groups
}

/**
 * Check the token package's architecture.
 *
 * @param {object} options
 * @param {string} options.repoRoot
 * @param {string} [options.packageDir] `packages/tokens`
 * @param {string} [options.consumerDir] `packages/vue/src` — the stylesheets that consume tokens
 * @returns {{problems: string[], notes: string[], stats: object}}
 */
export function checkTokenArchitecture({
  repoRoot,
  packageDir = 'packages/tokens',
  consumerDir = 'packages/vue/src',
}) {
  const problems = []
  const notes = []
  const pkgDir = join(repoRoot, packageDir)
  const srcDir = join(pkgDir, 'src')
  const entryFile = join(srcDir, 'index.css')
  const archiveEntry = join(srcDir, 'implementations.css')

  if (!existsSync(entryFile)) {
    return { problems: [`${packageDir}/src/index.css does not exist`], notes, stats: {} }
  }

  /* 1 — reachability ------------------------------------------------- */
  const publicGraph = importGraph(entryFile)
  const archiveGraph = importGraph(archiveEntry)
  const publicFiles = new Set(
    [...publicGraph.keys()].filter((file) => file !== archiveEntry && !archiveGraph.has(file)),
  )
  publicFiles.add(entryFile)

  const declarations = new Map()
  const localSlots = new Map()
  for (const file of cssFiles(srcDir)) {
    const { tokens, slots } = declarationsIn(file)
    for (const token of tokens) {
      const list = declarations.get(token.name) ?? []
      list.push({ ...token, file })
      declarations.set(token.name, list)
    }
    for (const slot of slots) {
      const list = localSlots.get(slot.name) ?? new Set()
      list.add(file)
      localSlots.set(slot.name, list)
    }
  }

  const unreachable = []
  for (const [name, entries] of declarations) {
    const reachable = entries.some((entry) => publicFiles.has(entry.file))
    if (!reachable) {
      const files = [...new Set(entries.map((entry) => relativeTo(pkgDir, entry.file)))]
      unreachable.push(`${name} (${files.join(', ')})`)
    }
  }
  for (const problem of unreachable) {
    problems.push(
      `unreachable token declaration: ${problem} — the public entry does not import the file that ` +
        'declares it, so nothing a consumer installs defines this name',
    )
  }

  /* 2 — undeclared uses in consumers -------------------------------- */
  const declaredNames = new Set([...declarations.keys(), ...localSlots.keys()])
  const undeclared = new Map()
  for (const dir of [consumerDir, join(packageDir, 'src')]) {
    for (const file of cssFiles(join(repoRoot, dir))) {
      for (const name of usesIn(file)) {
        if (declaredNames.has(name) || name.startsWith(PRIVATE_PREFIX)) continue
        const where = undeclared.get(name) ?? new Set()
        where.add(relativeTo(repoRoot, file))
        undeclared.set(name, where)
      }
    }
  }
  for (const [name, where] of [...undeclared].sort()) {
    problems.push(
      `undeclared token: ${[...where].join(', ')} uses var(${name}), which no file in ` +
        `${packageDir}/src declares — the declaration silently invalidates`,
    )
  }

  /* 2b — a private slot must stay inside the file that declares it -- */
  const crossFileSlots = []
  for (const dir of [consumerDir, join(packageDir, 'src')]) {
    for (const file of cssFiles(join(repoRoot, dir))) {
      for (const name of usesIn(file)) {
        const owners = localSlots.get(name)
        if (owners === undefined || declarations.has(name)) continue
        if (!owners.has(file)) {
          crossFileSlots.push(
            `${relativeTo(repoRoot, file)} uses private slot ${name}, declared only in ` +
              `${[...owners].map((owner) => relativeTo(repoRoot, owner)).join(', ')}`,
          )
        }
      }
    }
  }
  for (const violation of [...new Set(crossFileSlots)]) {
    problems.push(
      `private slot used across files: ${violation} — a ` +
        'composition slot is scoped to its own rule block and does not exist anywhere else',
    )
  }

  /* 3 — one declaration site per token ------------------------------ */
  const duplicates = []
  for (const [name, entries] of declarations) {
    const files = [...new Set(entries.map((entry) => entry.file))]
    if (files.length > 1) {
      duplicates.push(`${name} in ${files.map((file) => relativeTo(pkgDir, file)).join(' + ')}`)
    }
  }
  for (const duplicate of duplicates) {
    problems.push(
      `duplicate token declaration: ${duplicate} — two files defining one name is how a stale copy ` +
        'wins silently; keep the declaration where the public entry can reach it',
    )
  }

  /* 4 — layer direction -------------------------------------------- */
  const layerOfFile = (file) => publicGraph.get(file) ?? archiveGraph.get(file) ?? null
  const layerViolations = []
  for (const file of [...publicFiles, ...archiveGraph.keys()]) {
    const layer = layerOfFile(file)
    if (layer === null) continue
    const index = LAYER_ORDER.indexOf(layer)
    for (const name of usesIn(file)) {
      if (name.startsWith(PRIVATE_PREFIX)) continue
      const entries = declarations.get(name)
      if (entries === undefined) continue
      for (const entry of entries) {
        const declaredLayer = layerOfFile(entry.file)
        // Declared in a file the public entry cannot see at all: any reference is a violation,
        // because the reference will not resolve for a consumer.
        if (declaredLayer === null && !publicFiles.has(entry.file)) {
          layerViolations.push(
            `${relativeTo(pkgDir, file)} (${layer}) uses ${name}, declared only in the ` +
              `unreachable ${relativeTo(pkgDir, entry.file)}`,
          )
          continue
        }
        if (declaredLayer === null) continue
        if (LAYER_ORDER.indexOf(declaredLayer) > index) {
          layerViolations.push(
            `${relativeTo(pkgDir, file)} (${layer}) uses ${name}, declared in the later layer ` +
              `${declaredLayer} (${relativeTo(pkgDir, entry.file)})`,
          )
        }
      }
    }
  }
  for (const violation of [...new Set(layerViolations)]) {
    problems.push(
      `layer direction: ${violation} — dependencies run primitives → semantics → components, and a ` +
        'forward reference silently breaks when the later layer is not loaded',
    )
  }

  /* 5 — exports are honest ----------------------------------------- */
  const manifestPath = join(pkgDir, 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const exportProblems = []
  // The internal tree is not public API: a wildcard export would make every future file split a
  // compatibility question, which is the opposite of what this refactor is buying.
  for (const key of Object.keys(manifest.exports ?? {})) {
    if (/^\.\/src\//.test(key)) {
      exportProblems.push(`exports["${key}"] exposes the internal source tree; export named entries`)
    }
  }
  for (const [key, value] of Object.entries(manifest.exports ?? {})) {
    if (key.includes('*')) continue
    const target = join(pkgDir, value)
    if (!existsSync(target)) {
      exportProblems.push(`exports["${key}"] points at ${value}, which does not exist`)
      continue
    }
    if (!key.endsWith('.css')) continue
    // A CSS export whose name promises tokens must deliver tokens; one that promises
    // implementations must not.
    const declares = declarationsIn(target).tokens.length
    if (key === './implementations.css' && declares > 0) {
      exportProblems.push(
        `exports["./implementations.css"] (${value}) declares ${declares} token(s); selectors and ` +
          'declarations belong to different entries',
      )
    }
    if (key === './implementations.css' && importGraph(target).size === 0) {
      exportProblems.push(`exports["./implementations.css"] (${value}) imports nothing`)
    }
  }
  for (const problem of exportProblems) problems.push(`package exports: ${problem}`)

  /* 6 — the catalogue describes the sheets ------------------------- */
  //
  // Aggregated across every reachable file that declares tokens, and keyed by no filename: Phase 2 of
  // the refactor splits one `components.css` into `component-tokens/*.css`, and a gate that looked for
  // a particular path would have to be rewritten at the same moment the files move — the exact order
  // `docs/05-yue-token-refactor-plan.md` forbids ("extend the gates, then migrate"). Each declaration
  // site may carry its own `@yue-token-catalogue` block; together they must cover every declared token
  // exactly once, so the catalogue travels with the tokens it describes.
  const catalogueFiles = [...publicFiles].filter(
    (file) => existsSync(file) && publicGraph.get(file) === 'components',
  )
  const groups = []
  let catalogueFilesWithBlock = 0
  for (const file of catalogueFiles) {
    const block = readCatalogue(readFileSync(file, 'utf8'))
    if (block === null) continue
    catalogueFilesWithBlock += 1
    groups.push(...block.map((group) => ({ ...group, file: relativeTo(pkgDir, file) })))
  }
  let catalogueCount = 0
  if (groups.length === 0) {
    problems.push(
      'no @yue-token-catalogue block in any file the public entry reaches through the components ' +
        'layer — a component token sheet without a catalogue is a list of names with no statement of ' +
        'what may be overridden',
    )
  } else {
    catalogueCount = groups.length
    // Catalogue prefixes are written without the leading `--` (`input-`, not `--input-`), because the
    // catalogue is read by people; the comparison strips it rather than asking for it twice.
    const bare = (name) => name.replace(/^--/, '')
    const sheetTokens = [
      ...new Set(
        catalogueFiles.flatMap((file) => declarationsIn(file).tokens.map((entry) => entry.name)),
      ),
    ]
    for (const token of sheetTokens) {
      const matches = groups.filter((group) => bare(token).startsWith(group.prefix))
      if (matches.length === 0) {
        problems.push(`catalogue: ${token} belongs to no group — add its prefix to the catalogue`)
      } else if (matches.length > 1) {
        problems.push(
          `catalogue: ${token} matches ${matches.length} groups ` +
            `(${matches.map((group) => `${group.prefix} in ${group.file}`).join(', ')})`,
        )
      }
    }
    for (const group of groups) {
      if (!sheetTokens.some((token) => bare(token).startsWith(group.prefix))) {
        problems.push(`catalogue: group "${group.prefix}" in ${group.file} has no tokens`)
      }
    }
  }

  notes.push(
    `architecture: ${declarations.size} declared token(s) across ${publicFiles.size} reachable ` +
      `file(s), ${catalogueCount} catalogue group(s) in ${catalogueFilesWithBlock} file(s)`,
  )

  return {
    problems,
    notes,
    stats: {
      declared: declarations.size,
      reachableFiles: publicFiles.size,
      unreachable: unreachable.length,
      undeclared: undeclared.size,
      crossFileSlots: crossFileSlots.length,
      duplicates: duplicates.length,
      layerViolations: layerViolations.length,
      catalogueGroups: catalogueCount,
      catalogueFiles: catalogueFilesWithBlock,
    },
  }
}

/** Convenience for the CLI: a directory that must exist for the check to mean anything. */
export function assertLayout(repoRoot, packageDir = 'packages/tokens') {
  const srcDir = join(repoRoot, packageDir, 'src')
  if (!statSync(srcDir, { throwIfNoEntry: false })) {
    throw new Error(`${packageDir}/src is missing; the architecture check would be vacuous`)
  }
}
