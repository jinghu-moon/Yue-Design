/**
 * A small, strict CSS reader for design-token sheets, plus a cascade-accurate
 * resolver for custom properties.
 *
 * Why not PostCSS: this is a release gate. A zero-dependency reader keeps the
 * audit runnable no matter what happens to the build toolchain, and it lets the
 * reader be *stricter* than a general CSS parser — anything it does not
 * understand is a hard error, so no token can silently escape the audit.
 *
 * Modelled cascade properties:
 *   - `@layer a, b, c;` declaration order, and `@import ... layer(x)`
 *   - `@layer name { ... }` block nesting and `layer(a.b)` dotted names
 *   - unlayered declarations outrank every layer (per CSS cascade)
 *   - specificity, then source order, within a layer
 *   - `@media` / `@supports` blocks are parsed but marked conditional, and are
 *     excluded from profile resolution (no token sheet uses them today)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'

/* ------------------------------------------------------------------ *
 * Selectors
 * ------------------------------------------------------------------ */

const SIMPLE_SELECTOR = /\[[^\]]*\]|::?[a-zA-Z-]+|[a-zA-Z][\w-]*|\*/g

function unsupportedSelector(selector, where) {
  return new Error(
    `${where}: unsupported selector "${selector}". Only ":root", "html", ` +
      `"[data-theme=...]" and "[data-accent=...]" (and combinations) are modelled, ` +
      `so that no declaration can silently take part in — or escape — the cascade.`,
  )
}

/**
 * Compile a selector into a predicate over `{ theme, accent }` plus a numeric
 * specificity. Any selector this cannot model throws.
 */
export function compileSelector(selector, where = '<inline>') {
  const text = selector.trim()
  if (text === '') throw new Error(`${where}: empty selector`)

  SIMPLE_SELECTOR.lastIndex = 0
  const parts = []
  let consumed = 0
  let match = SIMPLE_SELECTOR.exec(text)
  while (match !== null) {
    if (match.index !== consumed) throw unsupportedSelector(selector, where)
    consumed = match.index + match[0].length
    parts.push(match[0])
    match = SIMPLE_SELECTOR.exec(text)
  }
  if (parts.length === 0 || consumed !== text.length) {
    throw unsupportedSelector(selector, where)
  }

  let classes = 0
  let types = 0
  const tests = []
  for (const part of parts) {
    if (part === ':root') {
      classes += 1
      continue
    }
    if (part === 'html') {
      types += 1
      continue
    }
    const attribute = /^\[\s*([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+))\s*\]$/.exec(part)
    if (!attribute) throw unsupportedSelector(selector, where)
    const attributeName = attribute[1].toLowerCase()
    const attributeValue = (attribute[2] ?? attribute[3] ?? attribute[4] ?? '').toLowerCase()
    const profileKey =
      attributeName === 'data-theme' ? 'theme' : attributeName === 'data-accent' ? 'accent' : null
    if (profileKey === null) throw unsupportedSelector(selector, where)
    classes += 1
    tests.push((profile) => String(profile[profileKey] ?? '').toLowerCase() === attributeValue)
  }

  return {
    text,
    specificity: classes * 10 + types,
    matches: (profile) => tests.every((test) => test(profile)),
  }
}

/* ------------------------------------------------------------------ *
 * Low-level text handling
 * ------------------------------------------------------------------ */

export function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Given the index of a `{`, return its body and the index just past the `}`. */
function readBlock(text, open) {
  let depth = 0
  for (let index = open; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"' || char === "'") {
      const quote = char
      index += 1
      while (index < text.length && text[index] !== quote) {
        if (text[index] === '\\') index += 1
        index += 1
      }
      continue
    }
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return { body: text.slice(open + 1, index), next: index + 1 }
    }
  }
  throw new Error(`unterminated block starting at offset ${open}`)
}

/** Split a declaration list on top-level `;`. */
function splitDeclarations(body) {
  const out = []
  let current = ''
  let depth = 0
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index]
    if (char === '"' || char === "'") {
      const quote = char
      current += char
      index += 1
      while (index < body.length && body[index] !== quote) {
        if (body[index] === '\\') {
          current += body[index]
          index += 1
        }
        current += body[index]
        index += 1
      }
      current += quote
      continue
    }
    if (char === '(') depth += 1
    else if (char === ')') depth -= 1
    if (char === ';' && depth === 0) {
      out.push(current)
      current = ''
      continue
    }
    current += char
  }
  if (current.trim() !== '') out.push(current)
  return out
}

/* ------------------------------------------------------------------ *
 * Parsing
 * ------------------------------------------------------------------ */

function collectDeclarations(selector, body, ctx, state, where) {
  let compiled
  try {
    compiled = compileSelector(selector, where)
  } catch (error) {
    if (ctx.allowUnsupportedSelectors) return
    throw error
  }
  const layer = ctx.layerStack.length > 0 ? ctx.layerStack[ctx.layerStack.length - 1] : null
  for (const raw of splitDeclarations(body)) {
    const colon = raw.indexOf(':')
    if (colon === -1) continue
    const property = raw.slice(0, colon).trim()
    if (!property.startsWith('--')) continue
    let value = raw.slice(colon + 1).trim()
    if (/!\s*important$/i.test(value)) {
      throw new Error(
        `${where}: "${property}" uses !important. Importance inverts layer order and ` +
          `is not modelled by the token audit; remove it from the token sheet.`,
      )
    }
    state.declarations.push({
      name: property,
      value,
      selector: compiled,
      selectorText: compiled.text,
      specificity: compiled.specificity,
      layer,
      layerIndex: 0,
      condition: ctx.condition,
      order: state.order,
      file: where,
    })
    state.order += 1
  }
}

function walk(text, ctx, state) {
  const where = ctx.file
  let index = 0
  while (index < text.length) {
    const char = text[index]
    if (/\s/.test(char) || char === ';') {
      index += 1
      continue
    }
    if (char === '}') throw new Error(`${where}: unexpected "}" at offset ${index}`)

    if (char === '@') {
      const at = /^@([a-zA-Z-]+)/.exec(text.slice(index))
      if (!at) throw new Error(`${where}: malformed at-rule at offset ${index}`)
      const name = at[1].toLowerCase()
      const afterName = index + at[0].length
      const semi = text.indexOf(';', afterName)
      const open = text.indexOf('{', afterName)

      if (semi !== -1 && (open === -1 || semi < open)) {
        handleAtStatement(name, text.slice(afterName, semi).trim(), ctx, state, where)
        index = semi + 1
        continue
      }
      if (open === -1) throw new Error(`${where}: unterminated @${name}`)
      const block = readBlock(text, open)
      const prelude = text.slice(afterName, open).trim()
      if (name === 'media' || name === 'supports') {
        walk(block.body, { ...ctx, condition: `@${name} ${prelude}` }, state)
      } else if (name === 'layer') {
        const names = prelude
          .split(',')
          .flatMap((entry) => entry.trim().split('.'))
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0)
        if (names.length === 0) throw new Error(`${where}: @layer block without a name`)
        walk(block.body, { ...ctx, layerStack: [...ctx.layerStack, ...names] }, state)
      } else if (name === 'font-face' || name === 'page' || name.endsWith('keyframes')) {
        // No design tokens live in these blocks.
      } else {
        throw new Error(
          `${where}: unsupported at-rule "@${name}". The token audit is strict on ` +
            `purpose — teach it about this construct instead of letting it pass unseen.`,
        )
      }
      index = block.next
      continue
    }

    const open = text.indexOf('{', index)
    if (open === -1) {
      const rest = text.slice(index).trim()
      if (rest !== '') throw new Error(`${where}: unexpected content "${rest.slice(0, 40)}"`)
      break
    }
    const selector = text.slice(index, open).trim()
    const block = readBlock(text, open)
    collectDeclarations(selector, block.body, ctx, state, where)
    index = block.next
  }
}

function handleAtStatement(name, prelude, ctx, state, where) {
  if (name === 'layer') {
    for (const part of prelude.split(',')) {
      const layerName = part.trim()
      if (layerName === '') continue
      if (!state.layerOrder.includes(layerName)) state.layerOrder.push(layerName)
    }
    return
  }

  if (name === 'import') {
    const target = readImportTarget(prelude, where)
    const layerMatch = /layer\(\s*([^)]*)\s*\)/i.exec(prelude)
    const leftover = prelude
      .replace(/url\(\s*(?:"[^"]*"|'[^']*'|[^)'"]*)\s*\)/i, '')
      .replace(/layer\(\s*[^)]*\s*\)/i, '')
      .trim()
    if (leftover !== '') {
      throw new Error(
        `${where}: unsupported @import condition "${leftover}" in "${prelude}". ` +
          `Media-conditional imports are not modelled by the token audit.`,
      )
    }
    if (!ctx.readImport) {
      throw new Error(`${where}: @import cannot be resolved in this context ("${prelude}")`)
    }
    const child = ctx.readImport(target, where)
    if (!child) return
    const layerStack =
      layerMatch && layerMatch[1].trim() !== ''
        ? [...ctx.layerStack, ...layerMatch[1].split('.').map((piece) => piece.trim())]
        : ctx.layerStack
    state.walkFile(child.css, child.file, layerStack, ctx.condition)
    return
  }

  if (name === 'charset' || name === 'namespace' || name === 'custom-media') return

  throw new Error(`${where}: unsupported at-rule "@${name}"`)
}

function readImportTarget(prelude, where) {
  const url = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]*))\s*\)/i.exec(prelude)
  const raw = url ? (url[1] ?? url[2] ?? url[3] ?? '') : (prelude.split(/\s+/)[0] ?? '')
  const target = raw.trim()
  if (target === '') throw new Error(`${where}: @import without a target ("${prelude}")`)
  return target
}

/** Shared driver: walk an entry sheet (following @import) into a flat sheet. */
function run(entryCss, entryFile, readImport, allowUnsupportedSelectors) {
  const state = { layerOrder: [], declarations: [], files: [], order: 0 }
  const walkFile = (css, file, layerStack, condition) => {
    state.files.push(file)
    walk(
      stripComments(css),
      { file, layerStack, condition, readImport, allowUnsupportedSelectors },
      state,
    )
  }
  // Exposed so @import can reuse the same file bookkeeping.
  state.walkFile = walkFile
  walkFile(entryCss, entryFile, [], null)

  // Discover layers that were used but never declared, in first-seen order.
  const indexByLayer = new Map(state.layerOrder.map((name, position) => [name, position]))
  for (const declaration of state.declarations) {
    if (declaration.layer === null) continue
    if (!indexByLayer.has(declaration.layer)) {
      indexByLayer.set(declaration.layer, state.layerOrder.length)
      state.layerOrder.push(declaration.layer)
    }
  }
  // Unlayered declarations outrank every layer.
  const unlayeredIndex = state.layerOrder.length
  for (const declaration of state.declarations) {
    declaration.layerIndex =
      declaration.layer === null ? unlayeredIndex : indexByLayer.get(declaration.layer)
  }

  const layerCounts = new Map()
  const tokenNames = new Set()
  for (const declaration of state.declarations) {
    const key = declaration.layer ?? '(unlayered)'
    layerCounts.set(key, (layerCounts.get(key) ?? 0) + 1)
    tokenNames.add(declaration.name)
  }

  return {
    entry: entryFile,
    files: state.files,
    layerOrder: state.layerOrder,
    declarations: state.declarations,
    conditions: [...new Set(state.declarations.map((entry) => entry.condition).filter(Boolean))],
    layerCounts,
    tokenNames: [...tokenNames].sort(),
  }
}

/** Parse an in-memory stylesheet. `readImport` is optional. */
export function parseCss(css, options = {}) {
  const {
    file = '<inline>',
    readImport = null,
    allowUnsupportedSelectors = false,
  } = options
  return run(css, file, readImport, allowUnsupportedSelectors)
}

/** Read a token sheet tree from disk, following `@import` relative to each file. */
export function loadTokenSheet({ entry, allowUnsupportedSelectors = false }) {
  const entryFile = resolvePath(entry)
  const readImport = (target, fromFile) => {
    const clean = target.split('#')[0].split('?')[0]
    const resolved = clean.startsWith('/')
      ? resolvePath(clean)
      : resolvePath(dirname(fromFile), clean)
    try {
      return { file: resolved, css: readFileSync(resolved, 'utf8') }
    } catch (error) {
      throw new Error(`cannot resolve @import "${target}" from ${fromFile}: ${error.message}`)
    }
  }
  return run(readFileSync(entryFile, 'utf8'), entryFile, readImport, allowUnsupportedSelectors)
}

/* ------------------------------------------------------------------ *
 * Resolution
 * ------------------------------------------------------------------ */

function substituteVariables(value, lookup) {
  let out = ''
  let cursor = 0
  for (;;) {
    const start = value.indexOf('var(', cursor)
    if (start === -1) {
      out += value.slice(cursor)
      return out
    }
    out += value.slice(cursor, start)
    const open = start + 3
    const close = matchingParen(value, open)
    const inner = value.slice(open + 1, close)
    const comma = splitTopLevelOnce(inner)
    const reference = comma.name
    const fallback = comma.fallback
    out += lookup(reference, fallback)
    cursor = close + 1
  }
}

function matchingParen(text, open) {
  let depth = 0
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === '(') depth += 1
    else if (text[index] === ')') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  throw new Error(`unbalanced parentheses in "${text}"`)
}

function splitTopLevelOnce(text) {
  let depth = 0
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '(') depth += 1
    else if (char === ')') depth -= 1
    else if (char === ',' && depth === 0) {
      return { name: text.slice(0, index).trim(), fallback: text.slice(index + 1).trim() }
    }
  }
  return { name: text.trim(), fallback: undefined }
}

/**
 * Build a resolver over a parsed sheet. `profile` is `{ theme, accent, id }`.
 */
export function createResolver(sheet) {
  const profileCache = new Map()

  const cascadeOrder = [...sheet.declarations].sort(
    (a, b) =>
      a.layerIndex - b.layerIndex || a.specificity - b.specificity || a.order - b.order,
  )

  function declarationsFor(profile) {
    const key = `${profile.theme}|${profile.accent}`
    const cached = profileCache.get(key)
    if (cached) return cached
    const map = new Map()
    for (const declaration of cascadeOrder) {
      if (declaration.condition) continue
      if (!declaration.selector.matches(profile)) continue
      map.set(declaration.name, declaration)
    }
    profileCache.set(key, map)
    return map
  }

  function resolve(name, profile, trail) {
    const declarations = declarationsFor(profile)
    const declaration = declarations.get(name)
    if (!declaration) {
      throw new Error(
        `token "${name}" is not defined for ${profile.id ?? `${profile.theme}/${profile.accent}`}`,
      )
    }
    const lookup = (reference, fallback) => {
      if (trail.includes(reference)) {
        throw new Error(
          `circular token reference: ${[...trail, name, reference].join(' -> ')}`,
        )
      }
      if (declarations.has(reference)) return resolve(reference, profile, [...trail, name])
      if (fallback !== undefined) return substituteVariables(fallback, lookup)
      throw new Error(
        `unresolved reference: var(${reference}) used by ${name} ` +
          `(declared in ${declaration.file}, selector "${declaration.selectorText}")`,
      )
    }
    return substituteVariables(declaration.value, lookup)
  }

  return {
    sheet,
    declarationsFor,
    /** Every token name visible in this profile, in declaration order. */
    names(profile) {
      return [...declarationsFor(profile).keys()]
    },
    /** Fully substituted value string. Throws on unknown/circular references. */
    value(name, profile) {
      return resolve(name, profile, [])
    },
    /** Non-throwing variant used for exhaustive sweeps. */
    tryValue(name, profile) {
      try {
        return { ok: true, value: resolve(name, profile, []) }
      } catch (error) {
        return { ok: false, error: error.message }
      }
    },
  }
}
