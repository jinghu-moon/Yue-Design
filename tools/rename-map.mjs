import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parseCss, stripComments } from './lib/css-tokens.mjs'

// Derive the rename map from the frozen grammar + property dictionary. The script only enumerates;
// judgement (which property really means "fill") stays with the reviewer, which is why the output is a
// checked-in table rather than an applied edit.
const DICTIONARY = { fg: 'foreground' }
const BATCHES = (namespace) => (namespace === 'badge' || ['info', 'warning', 'error', 'success', 'selection'].includes(namespace) ? 'P4-a' : 'P4-unassigned')

const entries = []
for (const dir of ['primitives', 'semantics', 'component-tokens']) {
  const base = join('packages/tokens/src', dir)
  for (const name of readdirSync(base)) {
    if (!name.endsWith('.css') || name === '_index.css') continue
    const path = join(base, name)
    const sheet = parseCss(stripComments(readFileSync(path, 'utf8')), { file: path, allowUnsupportedSelectors: true, readImport: (t) => ({ file: t, css: '' }) })
    for (const d of sheet.declarations) {
      if (!/^(?::root|html)\b|^\[data-/.test((d.selectorText ?? '').trim())) continue
      const bare = d.name.replace(/^--/, '')
      const segments = bare.split('-')
      const last = segments[segments.length - 1]
      if (DICTIONARY[last] === undefined) continue
      const namespace = segments[0]
      entries.push({
        from: d.name,
        to: `--${[...segments.slice(0, -1), DICTIONARY[last]].join('-')}`,
        layer: dir === 'component-tokens' ? 'components' : dir,
        namespace,
        batch: BATCHES(namespace),
        reason: `property "${last}" must be spelled out per §5 (no abbreviations)`,
      })
    }
  }
}
entries.sort((a, b) => a.from.localeCompare(b.from))
mkdirSync('.spec-workflow/token-architecture', { recursive: true })
writeFileSync('.spec-workflow/token-architecture/rename-map.json', `${JSON.stringify({ generated: 'tools/rename-map.mjs', dictionary: DICTIONARY, batchP4a: entries.filter((e) => e.batch === 'P4-a'), pending: entries.filter((e) => e.batch !== 'P4-a'), all: entries }, null, 2)}\n`, 'utf8')
console.log('mapping entries:', entries.length)
for (const e of entries) console.log(`  ${e.batch} ${e.from} → ${e.to}  (${e.layer})`)
