/**
 * Why does a token exist that no stylesheet consumes?
 *
 * A token set is a **design language**: it offers a closed scale of primitives and semantic roles so a
 * consumer can compose something the library never shipped. Coverage is therefore *necessarily* wider than
 * current usage — `--amber-400`, `--space-7`, `--breakpoint-lg` are not orphans, they are the vocabulary.
 * Treating "nothing references it" as debt produces the wrong action (deleting the vocabulary) and the
 * wrong metric (a number that can only be reduced by making the system less useful).
 *
 * So this module answers a different question: **is this token's existence explained?** Every unconsumed
 * token must fall into exactly one cause, and each cause carries its own rule:
 *
 *   scale-step            a step of a closed ramp or scale (colour ramps, space/radius/type scales).
 *                         Expected forever: the ramp is the contract, not a shopping list.
 *   consumer-facing       documented in the foundation pages for direct use (breakpoints, layout gutters,
 *                         motion durations). CSS `var()` cannot even read some of these — a media query
 *                         condition takes no custom property — so "unconsumed in CSS" is structural.
 *   prototype-contract    the frozen prototype declares the same name, so the parity gate pins it.
 *   same-file-composition the only references sit in the file that declares it (a semantic role composed
 *                         from its own ramp, e.g. `--accent-solid: var(--accent-600)`). The inventory's
 *                         cross-file rule hides these, so they must not be reported as unconsumed at all.
 *   interface-without-reader  a component-layer public override point that nothing reads and that no page
 *                         documents. This is the *only* actionable cause, and the fix is to give it a
 *                         reader or stop advertising it — deleting the name is not the first answer,
 *                         because the prototype may define it.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { AUDIT_PROFILES, DEFAULT_TARGETS, PACKAGE_ONLY_TOKENS, PACKAGE_RENAMES } from '../token-audit.pairs.mjs'
import { createResolver, loadTokenSheet } from './css-tokens.mjs'

/** Every token name the frozen prototype declares, across all profiles. */
export function prototypeTokenNames() {
  const resolver = createResolver(loadTokenSheet({ entry: DEFAULT_TARGETS[0].entry }))
  const names = new Set()
  for (const profile of AUDIT_PROFILES) for (const name of resolver.names(profile)) names.add(name)
  return names
}

/**
 * The documentation set a token may be justified by: the package README plus every docs page. Kept here so
 * the report and the gate cannot disagree about what counts as documented — the first version of the gate
 * only read the README and called four documented breakpoints undocumented.
 */
export function docFilesFor(repoRoot = process.cwd()) {
  const files = [join(repoRoot, 'packages/tokens/README.md')]
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist' && !entry.name.startsWith('.')) walk(child)
      } else if (entry.name.endsWith('.md')) files.push(child)
    }
  }
  walk(join(repoRoot, 'apps/docs'))
  return files.map((file) => file.replaceAll('\\', '/'))
}

/** Markdown documentation that mentions a token by name. */
export function docMentionIndex(files) {
  const sources = files.map((file) => ({ file, text: readFileSync(file, 'utf8') }))
  return (name) => sources.filter(({ text }) => text.includes(name)).map(({ file }) => file)
}

/** Stylesheets and scripts that could reference a token, across the repository. */
export function referenceSources(repoRoot = process.cwd()) {
  const files = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', '.vitepress'].includes(entry.name)) walk(child)
      } else if (/\.(css|vue|ts|mjs)$/.test(entry.name)) {
        files.push(child.replaceAll('\\', '/'))
      }
    }
  }
  for (const root of ['packages/tokens/src', 'packages/vue/src', 'apps/docs/.vitepress/theme', 'tests']) {
    walk(join(repoRoot, root))
  }
  return files.map((file) => ({ file, text: readFileSync(file, 'utf8') }))
}

const escape = (name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Which files reference this token via `var()`, repo-wide or only in its own declaring file. */
export function referenceSplit(name, declaredIn, sources, repoRoot = process.cwd()) {
  const root = repoRoot.replaceAll('\\', '/')
  const pattern = new RegExp(`var\\(\\s*${escape(name)}\\s*[,)]`)
  const referencing = sources.filter(({ text }) => pattern.test(text)).map(({ file }) => file)
  const declared = new Set(declaredIn.map((file) => (file.startsWith(root) ? file : `${root}/${file}`)))
  return {
    referencing,
    fromOtherFiles: referencing.filter((file) => !declared.has(file)),
  }
}

/** A step of a closed ramp or scale: colour steps, t-shirt sizes, numeric steps. */
const SCALE_STEP = /-(50|100|200|300|400|500|600|700|800|900|950|2xs|xs|sm|md|lg|xl|2xl|3xl|full|none|\d+)$/

/** Namespaces whose tokens CSS cannot read even in principle (media queries, JS orchestration). */
const NOT_CSS_CONSUMABLE = new Set(['breakpoint', 'layout', 'motion', 'duration'])

/**
 * @param {{ inventory: object, sources: Array<{file: string, text: string}>, docs?: (name: string) => string[], repoRoot?: string }} options
 */
export function classifyUnconsumed({ inventory, sources, docs = () => [], repoRoot = process.cwd() }) {
  const prototype = prototypeTokenNames()
  const renamedFrom = new Map(PACKAGE_RENAMES.map((entry) => [entry.package, entry.prototype]))
  const pinned = new Set(PACKAGE_ONLY_TOKENS.map((entry) => entry[0]))

  const rows = inventory.tokens
    .filter((token) => (token.consumers ?? []).length === 0)
    .map((token) => {
      const declaredIn = (Array.isArray(token.declaredIn) ? token.declaredIn : [token.declaredIn]).map((file) =>
        file.replaceAll('\\', '/'),
      )
      const oldName = renamedFrom.get(token.name) ?? null
      const inPrototype = prototype.has(token.name) || (oldName !== null && prototype.has(oldName))
      const publicOverride = Boolean(token.publicOverride)
      const docMentions = docs(token.name)
      const split = referenceSplit(token.name, declaredIn, sources, repoRoot)

      const cause = split.referencing.length > 0
        ? 'same-file-composition'
        : inPrototype
          ? 'prototype-contract'
          : NOT_CSS_CONSUMABLE.has(token.namespace)
            ? 'consumer-facing'
            : docMentions.length > 0
              ? 'consumer-facing'
              : publicOverride && token.layer === 'components'
                ? 'interface-without-reader'
                : SCALE_STEP.test(token.name)
                  ? 'scale-step'
                  : 'interface-without-reader'

      return {
        name: token.name,
        layer: token.layer,
        namespace: token.namespace,
        declaredIn,
        publicOverride,
        inPrototype,
        renamedFrom: oldName,
        pinnedByParity: pinned.has(token.name) || oldName !== null,
        docMentions,
        referencedIn: split.referencing,
        cause,
        verdict: cause === 'interface-without-reader' ? 'needs-decision' : 'expected',
      }
    })

  const byCause = new Map()
  for (const row of rows) byCause.set(row.cause, [...(byCause.get(row.cause) ?? []), row])

  return {
    rows,
    byCause: Object.fromEntries(byCause),
    counts: Object.fromEntries([...byCause].map(([cause, list]) => [cause, list.length])),
    needsDecision: rows.filter((row) => row.verdict === 'needs-decision'),
  }
}
