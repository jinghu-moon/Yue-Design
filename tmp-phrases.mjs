import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const STATES = ['selected', 'invalid', 'disabled', 'hover', 'pressed', 'focus']
const SIZES = ['xs', 'sm', 'md', 'lg', 'xl']
const dir = 'packages/tokens/src/component-tokens'
const table = {}
for (const name of readdirSync(dir)) {
  if (!name.endsWith('.css') || name === '_index.css') continue
  const namespace = name.replace('.css', '')
  const source = readFileSync(join(dir, name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const phrases = new Set()
  for (const match of source.matchAll(/^\s*(--[\w-]+)\s*:/gm)) {
    let tail = match[1].replace(/^--/, '').split('-').slice(1)
    if (tail.length > 1 && SIZES.includes(tail[tail.length - 1])) tail = tail.slice(0, -1)
    while (tail.length > 1 && STATES.includes(tail[tail.length - 1])) tail.pop()
    if (tail.length > 0) phrases.add(tail.join('-'))
  }
  table[namespace] = [...phrases].sort()
}
const lines = Object.entries(table).map(([namespace, phrases]) =>
  `  ${namespace}: [\n${phrases.map((phrase) => `    '${phrase}',`).join('\n')}\n  ],`,
)
writeFileSync('.spec-workflow/token-architecture/phrases.generated.txt', `${JSON.stringify(table, null, 2)}\n`, 'utf8')
console.log(lines.join('\n'))
