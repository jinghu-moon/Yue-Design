/**
 * The locale catalog contract, as a library.
 *
 * `tools/audit-i18n.mjs` is the CLI; everything that decides whether a catalog is healthy lives
 * here so it can be driven against fixtures. A gate whose only executable form reads the real
 * repository cannot be tested for the defects it exists to catch.
 *
 * The six properties:
 *
 *   1. **key parity** — every pack has exactly the catalog's leaves. A missing key renders the key
 *      itself; an extra one is a translation nobody reads;
 *   2. **parameter parity** — the same `{name}` placeholders in every language, or a user sees
 *      `{count}`;
 *   3. **no empty values** — an empty string is not a translation;
 *   4. **no silent copies** — a pack whose value equals the default must say so explicitly with an
 *      `// untranslated: reason` marker on the same line, which is how a deliberate exception stays
 *      visible instead of being indistinguishable from an unfinished translation;
 *   5. **metadata parity** — every key documents its purpose, parameters and whether assistive
 *      technology announces it; every metadata entry names a real key;
 *   6. **no hard-coded user-facing text** — a Chinese string literal in a component is text that
 *      escaped the catalog and cannot be translated at all.
 */

/** CJK ideographs plus the fullwidth punctuation that only appears in Chinese prose. */
export const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/

/**
 * The marker that exempts a value from the copy check.
 *
 * Deliberately verbose and greppable: `// untranslated: brand name, identical in every language`.
 * A bare `// ok` comment would be invisible in review, and the *reason* is the part a reviewer
 * needs.
 */
const UNTRANSLATED_MARKER = /\/\/\s*untranslated\s*:\s*(.+?)\s*$/

/**
 * Read a language pack without executing TypeScript.
 *
 * The pack is a literal object of string leaves — a rule of the catalog, not a coincidence — so a
 * small reader is enough and the gate needs no build step. Anything it cannot read is a hard error
 * rather than a skipped check.
 *
 * Each leaf also records the source line it came from, which is what makes the `untranslated`
 * marker checkable: the marker is a comment, and comments do not survive parsing.
 *
 * @returns {Map<string, { value: string, line: number, marked: string | null }>}
 */
export function readPack(source, file) {
  const assignment = source.indexOf('= {')
  if (assignment === -1) throw new Error(`${file}: no object literal to read`)
  const open = source.indexOf('{', assignment)

  let depth = 0
  let close = -1
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    else if (source[index] === '}') {
      depth -= 1
      if (depth === 0) {
        close = index
        break
      }
    }
  }
  if (close === -1) throw new Error(`${file}: unbalanced object literal`)

  const lineOf = (index) => source.slice(0, index).split('\n').length
  const lineTextOf = (index) => {
    const start = source.lastIndexOf('\n', index) + 1
    const end = source.indexOf('\n', index)
    return source.slice(start, end === -1 ? source.length : end)
  }

  const leaves = new Map()
  const stack = []
  let buffer = ''
  let entryEnd = open

  const flush = () => {
    const text = buffer.trim()
    buffer = ''
    if (text === '') return
    const match = /^([A-Za-z_$][\w$]*)\s*:\s*(.+?),?$/.exec(text)
    if (!match) throw new Error(`${file}: cannot read the entry "${text}"`)
    const [, key, value] = match
    const leaf = /^(['"])(.*)\1$/.exec(value.trim())
    if (!leaf) throw new Error(`${file}: "${key}" is not a string literal`)
    const marked = UNTRANSLATED_MARKER.exec(lineTextOf(entryEnd))?.[1] ?? null
    leaves.set([...stack, key].join('.'), {
      value: leaf[2],
      line: lineOf(entryEnd),
      marked,
    })
  }

  const body = source.slice(open + 1, close)
  // Comments and string literals are walked character by character rather than stripped: the marker
  // check reads the original source by index, so removing characters would shift every position —
  // and a value like `'{count} items'` contains braces that must not be read as structure.
  let inComment = false
  let quote = null
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index]
    entryEnd = open + 1 + index

    if (inComment) {
      if (character === '\n') inComment = false
      continue
    }
    if (quote !== null) {
      buffer += character
      if (character === '\\') {
        buffer += body[index + 1] ?? ''
        index += 1
        continue
      }
      if (character === quote) quote = null
      continue
    }
    if (character === '/' && body[index + 1] === '/') {
      inComment = true
      continue
    }
    if (character === "'" || character === '"') {
      quote = character
      buffer += character
      continue
    }
    if (character === '{') {
      const pending = /([A-Za-z_$][\w$]*)\s*:\s*$/.exec(buffer.trim())
      if (!pending) throw new Error(`${file}: a nested object has no key`)
      stack.push(pending[1])
      buffer = ''
      continue
    }
    if (character === '}') {
      flush()
      stack.pop()
      continue
    }
    if (character === ',') {
      flush()
      continue
    }
    buffer += character
  }
  flush()
  return leaves
}

/** Keys documented in `catalog.ts` (the metadata record's keys). */
export function readMetadataKeys(source) {
  const start = source.indexOf('YUE_MESSAGE_META')
  if (start === -1) return new Set()
  const body = source.slice(source.indexOf('{', start))
  return new Set([...body.matchAll(/^\s*(['"])([^'"]+)\1\s*:/gm)].map((match) => match[2]))
}

/** The catalog's leaves, read from the `YueLocaleMessages` type: `input.clear` and friends. */
export function readCatalogKeys(source) {
  const declared = new Map()
  const start = source.indexOf('export type YueLocaleMessages')
  if (start === -1) return declared
  const body = source.slice(start)
  const stack = []
  for (const line of body.split('\n')) {
    const open = /^\s*([A-Za-z_$][\w$]*)\s*:\s*\{\s*$/.exec(line)
    if (open) {
      stack.push(open[1])
      continue
    }
    const leaf = /^\s*([A-Za-z_$][\w$]*)\s*:\s*string\s*$/.exec(line)
    if (leaf) {
      declared.set([...stack, leaf[1]].join('.'), true)
      continue
    }
    if (/^\s*\}/.test(line) && stack.length > 0) {
      stack.pop()
      continue
    }
    if (/^\s*\} satisfies|^export type YueMessageKey/.test(line)) break
  }
  return declared
}

export function placeholders(value) {
  return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort().join(',')
}

/**
 * Strip comments before looking for hard-coded text.
 *
 * A comment may quote a Chinese string on purpose (the migration notes do), and a check that
 * flagged those would push the explanation out of the code.
 */
export function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

/* ------------------------------------------------------------------ *
 * Hard-coded user-facing text
 *
 * The original version of this check only looked for CJK characters, which meant a component could
 * ship `aria-label="Clear"` and pass: the audit reported "no hard-coded copy" while a string no
 * translator can reach was rendered on screen. The rule is therefore structural — where *can* text
 * a user reads come from? — rather than lexical.
 *
 * In an SFC there are exactly four such places, and all four are checked:
 *
 *   1. **literal text in the `<template>`** — any letter outside `{{ }}` is text the user reads;
 *   2. **a literal value on a user-visible attribute** (`aria-label`, `title`, `alt`,
 *      `placeholder`, …) — the accessible name is text the user reads;
 *   3. **a literal inside an attribute binding** (`:aria-label="'Clear'"`) — same, written
 *      differently;
 *   4. **a literal in `<script>`** that is user-facing text: it contains CJK, or it reads like
 *      prose (two words), or it is assigned to a name or property that means text.
 *
 * Developer-facing messages (`warn('…')`, `throw new Error('…')`) are exempt: they are not on
 * screen, they are not translated, and flagging them would push them out of the component and away
 * from the code that needs them.
 *
 * The honest limit: a *single English word* assigned in `<script>` to a name that says nothing about
 * text (`const fallback = 'Clear'`) is indistinguishable from an identifier without type
 * information. Templates carry essentially all user-visible text, and the template rules are
 * complete for them, so that gap is named here rather than hidden.
 * ------------------------------------------------------------------ */

/** Attributes whose value a user perceives. `aria-hidden` and friends deliberately do not qualify. */
export const USER_VISIBLE_ATTRIBUTES = [
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'aria-valuetext',
  'aria-roledescription',
  'aria-braillelabel',
  'title',
  'alt',
  'placeholder',
  'label',
]

/** Two words in a row, which an identifier, key or class name never is. */
const PROSE = /[A-Za-z]{2,}[ \t]+[A-Za-z]{2,}/

/** Selector-ish values are not prose: `'button, a, input, select, textarea'`. */
const SELECTORISH = /[[\]{},>#;]|^\s*[.#]/

/**
 * Names that mean "this string is read by a human".
 *
 * Split into camelCase/underscore segments and matched per segment, because substring matching is
 * wrong in both directions: `variant` contains "aria", and `toggleContext` contains "text".
 */
const TEXT_WORDS = new Set([
  'label',
  'title',
  'text',
  'message',
  'placeholder',
  'description',
  'caption',
  'hint',
  'tooltip',
])

function isTextName(name) {
  const segments = name
    .split(/[_\s]+|(?<=[a-z0-9])(?=[A-Z])/)
    .filter(Boolean)
    .map((segment) => segment.toLowerCase())
  return segments.some((segment) => TEXT_WORDS.has(segment) || segment.startsWith('aria'))
}

/** Calls whose string arguments are for the developer, not the user. */
const DEVELOPER_CALL = /\b(?:warn|diagnose|console\.(?:warn|error|log|info)|Error)\s*\(/g

const lineOf = (source, index) => source.slice(0, index).split('\n').length

/** The parenthesised ranges of developer-facing calls, so their literals can be exempted. */
function developerRanges(script) {
  const ranges = []
  for (const match of script.matchAll(DEVELOPER_CALL)) {
    const open = match.index + match[0].length - 1
    let depth = 0
    for (let index = open; index < script.length; index += 1) {
      const character = script[index]
      if (character === '(') depth += 1
      else if (character === ')') {
        depth -= 1
        if (depth === 0) {
          ranges.push([open, index])
          break
        }
      }
    }
  }
  return ranges
}

/** Comment ranges, so a literal quoted inside one is not mistaken for code. */
function commentRanges(source) {
  const ranges = []
  for (const match of source.matchAll(/\/\*[\s\S]*?\*\//g)) {
    ranges.push([match.index, match.index + match[0].length])
  }
  for (const match of source.matchAll(/\/\/[^\n]*/g)) {
    ranges.push([match.index, match.index + match[0].length])
  }
  return ranges
}

const inside = (ranges, index) => ranges.some(([start, end]) => index >= start && index < end)

/**
 * All string literals in a script, with positions that still map to the original source.
 *
 * Comments are filtered by range rather than stripped: stripping would shift every index, and the
 * reported line number is the only thing that makes a failure actionable.
 */
function scriptLiterals(source) {
  const comments = commentRanges(source)
  const literals = []
  const pattern = /(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0
    if (inside(comments, index)) continue
    literals.push({ value: match[2], index })
  }
  return literals
}

/**
 * The template region of an SFC, with HTML comments removed.
 *
 * Multi-root and nested `<template>` tags are not a concern here: the check only needs the text and
 * attributes a user can reach, and Vue's own compiler is what validates the structure.
 */
function templateOf(source) {
  const start = source.indexOf('<template>')
  if (start === -1) return ''
  const end = source.lastIndexOf('</template>')
  if (end === -1) return ''
  return source.slice(start + '<template>'.length, end).replace(/<!--[\s\S]*?-->/g, '')
}

function scriptOf(source) {
  const start = source.search(/<script\b[^>]*>/)
  if (start === -1) return ''
  const openEnd = source.indexOf('>', start) + 1
  const end = source.indexOf('</script>', openEnd)
  if (end === -1) return ''
  return source.slice(openEnd, end)
}

/** Where the script block starts in the file, so a script-relative index maps to a real line. */
function scriptStart(source) {
  const start = source.search(/<script\b[^>]*>/)
  if (start === -1) return 0
  return source.indexOf('>', start) + 1
}

/**
 * Find hard-coded user-facing text in one source file.
 *
 * @param {{ path: string, source: string }} file
 * @returns {Array<{ line: number, kind: string, text: string }>}
 */
export function findHardCodedText({ path, source }) {
  const found = []
  const isVue = path.endsWith('.vue')
  const template = isVue ? templateOf(source) : ''
  const script = isVue ? scriptOf(source) : stripComments(source)

  /* 1 — literal text nodes */
  //
  // Alternating segments: `<…>` is a tag (attributes are handled below), anything else is text the
  // user reads. Splitting on the delimiters instead of matching them is what keeps a tag's *inner*
  // text (`div ref="…"`) from being mistaken for a text node.
  for (const match of template.matchAll(/<[^>]*>|[^<]+/g)) {
    const segment = match[0]
    if (segment.startsWith('<')) continue
    const withoutInterpolation = segment.replace(/\{\{[\s\S]*?\}\}/g, '')
    const text = withoutInterpolation.trim()
    if (!/[A-Za-z\u4e00-\u9fff]/.test(text)) continue
    found.push({
      line: lineOf(source, source.indexOf(template) + (match.index ?? 0)),
      kind: 'template text',
      text,
    })
  }

  /* 2 + 3 — user-visible attributes and literal bindings */
  for (const match of template.matchAll(/(v-bind:|:)?([A-Za-z-]+)\s*=\s*(["'])([\s\S]*?)\3/g)) {
    const [, modifier, name, , value] = match
    const line = lineOf(source, source.indexOf(template) + (match.index ?? 0))
    const bare = name.replace(/^v-bind:/, '')

    if (modifier === undefined) {
      if (USER_VISIBLE_ATTRIBUTES.includes(bare) && /[A-Za-z\u4e00-\u9fff]/.test(value)) {
        found.push({ line, kind: `attribute ${bare}`, text: value })
      }
      continue
    }

    // `:aria-label="'Clear'"` — a literal where a message key belongs.
    const literal = /^\s*(['"])((?:\\.|(?!\1)[^\\])*)\1\s*$/.exec(value)
    if (
      literal &&
      (USER_VISIBLE_ATTRIBUTES.includes(bare) || /[A-Za-z\u4e00-\u9fff]/.test(literal[2])) &&
      /[A-Za-z\u4e00-\u9fff]/.test(literal[2])
    ) {
      found.push({ line, kind: `binding ${bare}="${literal[2]}"`, text: literal[2] })
    }
  }

  /* 4 — script literals that are text */
  const developer = isVue ? developerRanges(script) : []
  // Script-relative indices are mapped back to file lines: a report pointing at the wrong line is
  // worse than no report, because it sends the reader to innocent code.
  const offset = isVue ? scriptStart(source) : 0
  for (const literal of scriptLiterals(script)) {
    if (inside(developer, literal.index)) continue
    const { value } = literal
    if (!/[A-Za-z\u4e00-\u9fff]/.test(value)) continue
    const line = lineOf(source, offset + literal.index)

    if (CJK.test(value)) {
      found.push({ line, kind: 'script literal', text: value })
      continue
    }
    if (PROSE.test(value) && !SELECTORISH.test(value)) {
      found.push({ line, kind: 'script prose', text: value })
      continue
    }
    // `const clearLabel = 'Clear'` / `{ label: 'Clear' }`: the *name* is what makes it text.
    const before = script.slice(Math.max(0, literal.index - 120), literal.index)
    const assigned = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*$/.exec(before)
    const property = /([A-Za-z_$][\w$]*)\s*:\s*$/.exec(before)
    const name = assigned?.[1] ?? property?.[1]
    if (name !== undefined && isTextName(name)) {
      found.push({ line, kind: `script ${name} =`, text: value })
    }
  }

  return found
}

/**
 * Check one catalog against its packs and the components that consume it.
 *
 * @param {object} options
 * @param {string} options.catalogSource  `catalog.ts`
 * @param {Array<{locale: string, file: string, source: string, isDefault?: boolean}>} options.packs
 * @param {Array<{path: string, source: string}>} [options.components]  component sources to scan
 * @returns {{ problems: string[], notes: string[], stats: object }}
 */
export function checkCatalog({ catalogSource, packs: packInputs, components = [] }) {
  const problems = []
  const notes = []
  const stats = { keys: 0, packs: 0, exempt: 0, componentFiles: 0 }

  const catalog = readCatalogKeys(catalogSource)
  const metadata = readMetadataKeys(catalogSource)
  if (catalog.size === 0) {
    problems.push('the catalog declares no keys — the reader lost track of the type')
  }

  const packs = packInputs.map((pack) => ({
    ...pack,
    leaves: readPack(pack.source, pack.file),
  }))
  const defaultPack = packs.find((pack) => pack.isDefault)
  if (packs.length > 0 && !defaultPack) problems.push('no default pack is configured')

  /* 1 + 5 — parity with the catalog, and metadata */
  for (const pack of packs) {
    const keys = new Set(pack.leaves.keys())
    for (const key of catalog.keys()) {
      if (!keys.has(key)) problems.push(`${pack.locale}: missing key "${key}"`)
    }
    for (const key of keys) {
      if (!catalog.has(key)) problems.push(`${pack.locale}: "${key}" is not in the catalog`)
    }
  }
  for (const key of catalog.keys()) {
    if (!metadata.has(key)) problems.push(`catalog key "${key}" has no metadata entry`)
  }
  for (const key of metadata) {
    if (!catalog.has(key)) problems.push(`metadata names "${key}", which is not in the catalog`)
  }

  /* 2 + 3 + 4 — parameters, emptiness, and copies of the default */
  for (const pack of packs) {
    for (const [key, entry] of pack.leaves) {
      if (entry.value.trim() === '') problems.push(`${pack.locale} ${key}: empty value`)

      const reference = defaultPack?.leaves.get(key)
      if (reference === undefined) continue

      if (placeholders(entry.value) !== placeholders(reference.value)) {
        problems.push(
          `${pack.locale} ${key}: parameters [${placeholders(entry.value)}] do not match the ` +
            `default [${placeholders(reference.value)}]`,
        )
      }

      if (pack.isDefault) continue
      const isCopy = entry.value === reference.value
      if (isCopy && entry.marked === null) {
        problems.push(
          `${pack.locale} ${key}: identical to the ${defaultPack.locale} default at line ` +
            `${entry.line}. If that is intended, mark the line ` +
            '`// untranslated: <reason>`; otherwise translate it.',
        )
      } else if (isCopy) {
        stats.exempt += 1
        notes.push(`${pack.locale} ${key}: explicitly untranslated (${entry.marked})`)
      } else if (entry.marked !== null) {
        problems.push(
          `${pack.locale} ${key}: line ${entry.line} is marked untranslated but its value differs ` +
            `from the default — remove the stale marker`,
        )
      }
    }
  }

  /* 6 — no hard-coded user-facing text in components */
  const findings = []
  for (const component of components) {
    for (const hit of findHardCodedText(component)) {
      findings.push(`${component.path}:${hit.line} [${hit.kind}] "${hit.text.slice(0, 60)}"`)
    }
  }
  for (const finding of findings) {
    problems.push(`hard-coded user-facing text: ${finding} — read it from the catalog instead`)
  }

  stats.keys = catalog.size
  stats.packs = packs.length
  stats.componentFiles = components.length
  stats.hardCoded = findings.length
  notes.push(
    `catalog: ${stats.keys} key(s), ${packs.length} pack(s) ` +
      `(${packs.map((pack) => `${pack.locale}: ${pack.leaves.size}`).join(', ')})`,
  )
  notes.push(
    `components: ${components.length} source file(s) checked for hard-coded text ` +
      '(template text nodes, user-visible attributes, literal bindings, and script text)',
  )

  return { problems, notes, stats }
}
