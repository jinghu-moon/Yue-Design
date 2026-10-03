/**
 * The API ⇄ documentation contract reader.
 *
 * Why this exists: the docs are the published interface, and nothing in a normal
 * type-check reads them. A prop renamed in `types.ts` leaves the API table describing a
 * prop that no longer exists; a prop added to the component leaves the table silently
 * short. Both are invisible to `vue-tsc` (markdown is not in the program) and to a
 * component test (the class still renders). The failure mode is documentation that is
 * confidently wrong, and "the docs drift" is the one defect a design system cannot
 * detect by looking at its own output.
 *
 * So the docs are treated as an artefact with a schema, exactly like the built
 * JavaScript is in `tools/verify-dist.mjs`:
 *
 *   component `.vue` ─┐
 *                     ├─ must agree ─→ api.md tables ─→ must agree ─→ examples
 *   `types.ts` ───────┘
 *
 * Four directions are checked, per component:
 *
 *   1. every prop/slot/emit the type declares is documented;
 *   2. every name the documentation lists is a prop/slot/emit that exists — a typo or a
 *      leftover is an error rather than a dead row nobody notices;
 *   3. the single-file component actually uses what it declares (a prop that no line of
 *      the component reads is a prop that does nothing), and declares what it uses;
 *   4. the examples only pass props that exist, so a snippet cannot teach a prop that was
 *      removed two refactors ago.
 *
 * Deliberately a reader, not a TypeScript parser. It understands the subset these files
 * are written in — `export interface`, `extends`, `Omit<…>`, single-line `export type`
 * aliases, `defineProps<T>()`, `defineEmits<{ … }>()`, `<slot name="…">` — and throws on
 * anything else rather than guessing. A silent parse failure would be a gate that passes
 * for the wrong reason, which is worse than no gate.
 */
import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'

/* ------------------------------------------------------------------ *
 * Lexical helpers
 * ------------------------------------------------------------------ */

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Blank out comments while preserving offsets and newlines.
 *
 * Offsets matter: every brace scan below works on the masked copy and then slices the
 * original, so a doc comment cannot be mistaken for code and a JSDoc example containing
 * `{ … }` cannot unbalance a scan.
 */
export function maskComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (match, prefix) => prefix + ' '.repeat(match.length - prefix.length))
}

/** Index of the string literal's closing quote, honouring backslash escapes. */
function endOfString(text, start) {
  const quote = text[start]
  for (let index = start + 1; index < text.length; index += 1) {
    if (text[index] === '\\') {
      index += 1
      continue
    }
    if (text[index] === quote) return index
  }
  throw new Error(`unterminated string literal at offset ${start}`)
}

/**
 * Index of the `}` that closes the `{` at `openIndex`, skipping strings and nested braces.
 */
export function matchingBrace(text, openIndex) {
  let depth = 0
  for (let index = openIndex; index < text.length; index += 1) {
    const character = text[index]
    if (character === "'" || character === '"' || character === '`') {
      index = endOfString(text, index)
      continue
    }
    if (character === '{') depth += 1
    else if (character === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  throw new Error(`unbalanced braces from offset ${openIndex}`)
}

const OPENERS = '{<(['
const CLOSERS = '}>)]'

/**
 * Split a type body into its top-level members.
 *
 * Top level means "not inside `{}`, `<>`, `()` or `[]`", so a member whose type is an
 * object literal, a generic or a function type stays in one piece — and a type argument
 * list containing commas (`Omit<A, 'b' | 'c'>`) does not become two members.
 */
export function splitMembers(body, { commas = false } = {}) {
  const members = []
  let buffer = ''
  let depth = 0
  const flush = () => {
    const text = buffer.trim()
    if (text !== '') members.push(text)
    buffer = ''
  }

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index]
    if (character === "'" || character === '"' || character === '`') {
      const end = endOfString(body, index)
      buffer += body.slice(index, end + 1)
      index = end
      continue
    }
    if (OPENERS.includes(character)) depth += 1
    else if (CLOSERS.includes(character)) depth -= 1

    if (depth <= 0 && (character === ';' || character === '\n' || (commas && character === ','))) {
      flush()
      continue
    }
    buffer += character
  }
  flush()
  return members
}

/**
 * `name?: Type` → `{ name, optional }`. Call signatures and index signatures return
 * `null`: they are not named members, and pretending they were would produce a member
 * called `event`.
 *
 * Quoted keys are accepted because an emit that is not a valid identifier has to be
 * written as one — `'update:modelValue': [value: string]` is the only way to declare it in
 * `defineEmits`, and reading it as "no members" would make the emit look undeclared.
 */
export function parseMember(text) {
  const cleaned = text.replace(/^\s*(?:readonly|public)\s+/, '').trim()
  const match = /^(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*(\??)\s*:/.exec(cleaned)
  if (!match) return null
  return { name: match[1] ?? match[2] ?? match[3], optional: match[4] === '?' }
}

/** `extends A, Omit<B, 'x' | 'y'>` → `[{ name, omit }]`. */
export function parseExtends(header) {
  const match = /extends\s+([\s\S]+)$/.exec(header.replace(/\s+/g, ' ').trim())
  if (!match) return []
  return splitMembers(match[1], { commas: true }).map((entry) => {
    const text = entry.trim()
    const omit = /^Omit\s*<\s*([A-Za-z_$][\w$]*)\s*,\s*([^>]+)>$/.exec(text)
    if (!omit) return { name: text, omit: [] }
    return {
      name: omit[1],
      omit: [...omit[2].matchAll(/'([^']+)'/g)].map((quoted) => quoted[1]),
    }
  })
}

/* ------------------------------------------------------------------ *
 * Type sources
 * ------------------------------------------------------------------ */

/**
 * Read every interface and single-line type alias out of a type module.
 *
 * Single-line aliases only on purpose: the aliases in these files are names for a union
 * or for another named type (`export type YueButtonSize = ComponentSize`). An alias that
 * spans lines throws below rather than being quietly ignored, because the one thing the
 * resolver can do with an alias is follow it.
 *
 * Every scan runs on the *masked* text: braces and quotes inside a doc comment are prose,
 * and an apostrophe in "doesn't" would otherwise read as the start of a string literal.
 * Masking preserves offsets, so the two texts are interchangeable slice for slice.
 */
export function parseTypeSource(source) {
  const masked = maskComments(source)
  const interfaces = new Map()

  for (const match of masked.matchAll(
    /(?:^|\n)\s*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)\b([^{]*)\{/g,
  )) {
    const name = match[1]
    const bodyStart = match.index + match[0].length
    const body = masked.slice(bodyStart, matchingBrace(masked, bodyStart - 1))
    interfaces.set(name, {
      header: match[2].trim(),
      body,
      members: splitMembers(body).map(parseMember).filter(Boolean),
    })
  }

  const aliases = new Map()
  for (const match of masked.matchAll(
    /(?:^|\n)\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=\s*([^\n;]+)/g,
  )) {
    aliases.set(match[1], match[2].trim())
  }

  return { interfaces, aliases }
}

/**
 * Every member of `name`, including inherited ones, with the inheritance folded in.
 *
 * `Omit<>` is honoured rather than ignored: `YueButtonToggleItemProps extends
 * Omit<YueButtonSharedProps, 'active'>` means ten props, not zero, and an omitted name
 * that does not exist in the base is reported — that typo is how a component silently
 * accepts a prop it does not implement.
 */
export function resolveInterface(registry, name, problems = [], trail = []) {
  const direct = registry.interfaces.get(name)
  if (direct) {
    const bases = parseExtends(direct.header)
    const inherited = []
    for (const base of bases) {
      const baseMembers = resolveInterface(registry, base.name, problems, [...trail, name])
      const names = baseMembers.all.map((member) => member.name)
      for (const omitted of base.omit) {
        if (!names.includes(omitted)) {
          problems.push(
            `${name}: \`Omit<${base.name}, '${omitted}'>\` removes a member that does not exist`,
          )
        }
      }
      for (const member of baseMembers.all) {
        if (base.omit.includes(member.name)) continue
        if (!inherited.some((existing) => existing.name === member.name)) inherited.push(member)
      }
    }
    return {
      name,
      own: direct.members,
      all: [...direct.members, ...inherited],
      bases,
      // Kept for the emit reader: an emits interface declares call signatures, whose
      // member "name" is a parameter label rather than the event name.
      body: direct.body,
    }
  }

  const alias = registry.aliases.get(name)
  if (alias !== undefined) {
    const target = alias.trim()
    if (registry.interfaces.has(target) || registry.aliases.has(target)) {
      const resolved = resolveInterface(registry, target, problems, [...trail, name])
      // An alias is not an extension: every member is "own" for the alias's consumers.
      return { name, own: resolved.all, all: resolved.all, bases: [], body: resolved.body }
    }
  }

  throw new Error(
    `cannot resolve type \`${name}\`${trail.length ? ` (from ${trail.join(' → ')})` : ''}. ` +
      'Only interfaces, interfaces extending named interfaces or `Omit<Interface, …>`, and ' +
      'single-line aliases of those are understood.',
  )
}

/* ------------------------------------------------------------------ *
 * Single-file components
 * ------------------------------------------------------------------ */

/** `defineProps<YueButtonProps>()` → `YueButtonProps`. */
export function sfcPropsType(source) {
  const match = /defineProps\s*<\s*([A-Za-z_$][\w$]*)\s*>/.exec(source)
  return match ? match[1] : null
}

/** The names declared by `defineEmits<{ … }>()`. */
export function sfcEmitNames(source) {
  const match = /defineEmits\s*<\s*\{([\s\S]*?)\}\s*>/.exec(source)
  if (!match) return []
  return splitMembers(match[1], { commas: true })
    .map(parseMember)
    .filter(Boolean)
    .map((member) => member.name)
}

/**
 * The names the component actually fires, read through the binding `defineEmits` returns.
 *
 * The binding is looked up rather than assumed to be `emit`: a component that names it
 * `notify` would otherwise look like one that never fires anything, and the gate would
 * report a defect that does not exist — which is how a gate loses its authority.
 */
export function sfcFiredEmits(source) {
  const binding = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*defineEmits/.exec(source)?.[1]
  const pattern = binding
    ? new RegExp(`\\b${escapeRegExp(binding)}\\(\\s*['"]([^'"]+)['"]`, 'g')
    : /\bemit\(\s*['"]([^'"]+)['"]/g
  return [...new Set([...source.matchAll(pattern)].map((match) => match[1]))]
}

/** Every `props.<name>` read in the component, script and template alike. */
export function sfcPropAccesses(source) {
  return [...new Set([...source.matchAll(/\bprops\.([A-Za-z_$][\w$]*)/g)].map((match) => match[1]))]
}

/**
 * Whether the component forwards its whole props object (`const { value, ...rest } =
 * props`) instead of reading each prop by name.
 *
 * That pattern is how a wrapper component stays honest: it re-exposes an interface it did
 * not write, so "every member is read by name" cannot be the rule. The spread is asserted
 * *positively* here — a component that declares inherited props and forwards none of them
 * is the bug this rule exists for.
 */
export function sfcForwardsAllProps(source) {
  return /\.\.\.[A-Za-z_$][\w$]*\s*\}\s*=\s*props\b/.test(source) || /\{\s*\.\.\.props\b/.test(source)
}

/** The slot names the component can render: `<slot name="x">`, or `default` for `<slot>`. */
export function sfcSlotNames(source) {
  const names = new Set()
  for (const match of source.matchAll(/<slot\b([^>]*)>/g)) {
    const name = /name="([^"]+)"/.exec(match[1])
    names.add(name ? name[1] : 'default')
  }
  return [...names]
}

/* ------------------------------------------------------------------ *
 * Markdown
 * ------------------------------------------------------------------ */

/** The level-2 sections of a markdown document, by heading text. */
export function markdownSections(markdown) {
  const sections = new Map()
  const pattern = /^##\s+(.+?)\s*$/gm
  const headings = [...markdown.matchAll(pattern)]
  for (const [index, heading] of headings.entries()) {
    const bodyStart = heading.index + heading[0].length
    const bodyEnd = index + 1 < headings.length ? headings[index + 1].index : markdown.length
    sections.set(heading[1].trim(), markdown.slice(bodyStart, bodyEnd))
  }
  return sections
}

/** The level-3 subsections of a section body, by heading text. */
export function markdownSubsections(section) {
  const subsections = new Map()
  const headings = [...section.matchAll(/^###\s+(.+?)\s*$/gm)]
  for (const [index, heading] of headings.entries()) {
    const bodyStart = heading.index + heading[0].length
    const bodyEnd = index + 1 < headings.length ? headings[index + 1].index : section.length
    subsections.set(heading[1].trim(), section.slice(bodyStart, bodyEnd))
  }
  return subsections
}

/**
 * The data rows of the first markdown table in `text`, as arrays of cells.
 *
 * Header row and `--- | ---` separator are dropped; a table with no data rows returns `[]`,
 * which the caller must treat as "documented nothing" rather than "nothing to document".
 */
export function markdownTableRows(text) {
  const lines = text.split('\n').filter((line) => /^\s*\|/.test(line))
  if (lines.length === 0) return []
  const cells = (line) =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim())
  const rows = lines.map(cells)
  const separator = (row) => row.every((cell) => /^:?-{2,}:?$/.test(cell))
  return rows.slice(1).filter((row) => !separator(row))
}

/** The name a documentation row introduces: the first code span, else the plain text. */
export function documentedName(cell) {
  const code = /`([^`]+)`/.exec(cell)
  return (code ? code[1] : cell).trim()
}

/** The names a table's first column introduces. */
export function documentedNames(text) {
  return markdownTableRows(text).map((row) => documentedName(row[0]))
}

/* ------------------------------------------------------------------ *
 * The check
 * ------------------------------------------------------------------ */

/**
 * Attributes that are not props and must not be asked to be: Vue's own bindings and ARIA,
 * then the fixed set of HTML attributes a component is expected to merge or forward.
 *
 * A prefix list rather than one alternation with the fixed names, because `to` inside the
 * same alternation happily matches `tone` — and an example passing a prop that does not
 * exist would then be waved through by a substring of an allowlisted attribute.
 */
const NON_PROP_ATTRIBUTE_PREFIX = /^(?::|@|#|v-|aria-|data-)/
const NON_PROP_ATTRIBUTES = new Set([
  'class',
  'style',
  'id',
  'role',
  'title',
  'dir',
  'lang',
  'key',
  'ref',
  'is',
  'slot',
  'href',
  'to',
  'target',
  'rel',
  'tabindex',
])

const isNonPropAttribute = (attribute) =>
  NON_PROP_ATTRIBUTE_PREFIX.test(attribute) || NON_PROP_ATTRIBUTES.has(attribute)

/** Components whose tags the example scan looks for, longest name first. */
function tagPattern(names) {
  const sorted = [...names].sort((left, right) => right.length - left.length).map(escapeRegExp)
  return new RegExp(`<(${sorted.join('|')})\\b([^>]*)>`, 'g')
}

function tagAttributes(body) {
  // Quoted values first: an attribute value may contain spaces (`aria-label="对齐 方式"`) or
  // a `>` (`:tag="a > b"`, which is not valid here but must not desynchronise the scan).
  const withoutValues = body.replace(/"[^"]*"|'[^']*'/g, '""')
  return [...withoutValues.matchAll(/(?:^|\s)([:@#]?[A-Za-z_][\w:.-]*)/g)].map((match) => match[1])
}

/**
 * Check one documentation set against its type declarations.
 *
 * @param {object} spec
 * @param {string} spec.root        repository root
 * @param {string} spec.types       type module that declares the public interfaces
 * @param {string} spec.docs        the API markdown page
 * @param {Array}  spec.components  `{ name, section, props, slots, emits, sfc }`
 * @param {object} [spec.config]    `{ file, type, section }` for the app-level config table
 * @param {string[]} [spec.exampleFiles] markdown files whose examples are scanned
 * @returns {{ problems: string[], notes: string[], stats: object }}
 */
export function checkApiDocs(spec) {
  const problems = []
  const notes = []
  const stats = { components: 0, props: 0, slots: 0, emits: 0, examples: 0 }

  const read = (relative) => readFileSync(resolvePath(spec.root, relative), 'utf8')
  const registry = parseTypeSource(read(spec.types))
  const docs = read(spec.docs)
  const sections = markdownSections(docs)

  /** Every name each component exposes, for the example scan below. */
  const propsByComponent = new Map()

  for (const component of spec.components) {
    stats.components += 1
    const section = sections.get(component.section)
    if (section === undefined) {
      problems.push(`${component.name}: ${spec.docs} has no section \`## ${component.section}\``)
      continue
    }
    const subsections = markdownSubsections(section)

    /* props ------------------------------------------------------------ */
    const props = resolveInterface(registry, component.props, problems)
    const ownNames = props.own.map((member) => member.name)
    const allNames = props.all.map((member) => member.name)
    propsByComponent.set(component.name, allNames)
    stats.props += allNames.length

    // A missing subsection is reported once, as a missing table, rather than once per prop.
    if (!subsections.has('Props')) {
      problems.push(
        `${component.name}: no \`### Props\` table in the \`## ${component.section}\` section`,
      )
    }
    const documentedProps = documentedNames(subsections.get('Props') ?? '')
    for (const name of ownNames) {
      if (!documentedProps.includes(name)) {
        problems.push(`${component.name}: prop \`${name}\` is declared but missing from the Props table`)
      }
    }
    for (const name of documentedProps) {
      if (!allNames.includes(name)) {
        problems.push(`${component.name}: the Props table documents \`${name}\`, which does not exist`)
      }
    }
    if (props.bases.length > 0) {
      // An inherited contract that the page does not name is a documented surface nobody
      // can look up: the reader has no way to know these props are accepted at all.
      for (const base of props.bases) {
        if (!section.includes(base.name)) {
          problems.push(
            `${component.name}: the section never mentions \`${base.name}\`, so its inherited props are undocumented`,
          )
        }
      }
    }

    /* slots ------------------------------------------------------------ */
    const slots = component.slots
      ? resolveInterface(registry, component.slots, problems)
      : { own: [], all: [] }
    const slotNames = slots.all.map((member) => member.name)
    stats.slots += slotNames.length
    if (component.slots && slotNames.length > 0 && !subsections.has('Slots')) {
      problems.push(
        `${component.name}: no \`### Slots\` table in the \`## ${component.section}\` section`,
      )
    }
    const documentedSlots = documentedNames(subsections.get('Slots') ?? '')
    for (const name of slotNames) {
      if (!documentedSlots.includes(name)) {
        problems.push(`${component.name}: slot \`${name}\` is declared but missing from the Slots table`)
      }
    }
    for (const name of documentedSlots) {
      if (!slotNames.includes(name)) {
        problems.push(`${component.name}: the Slots table documents \`${name}\`, which does not exist`)
      }
    }

    /* emits ------------------------------------------------------------ */
    const emits = component.emits ? resolveInterface(registry, component.emits, problems) : null
    // `YueButtonEmits` is a call-signature interface, so its members are not named
    // properties: the event name is the string literal in the first parameter, which is the
    // only place it can be written without repeating what `defineEmits` already says.
    const declaredEmits = emits ? emitNamesFromBody(emits.body) : []
    stats.emits += declaredEmits.length
    if (!subsections.has('Events') && (declaredEmits.length > 0 || component.emits)) {
      problems.push(
        `${component.name}: no \`### Events\` table in the \`## ${component.section}\` section`,
      )
    }
    if (!component.emits && subsections.has('Events')) {
      problems.push(
        `${component.name}: documents an Events table but declares no emits interface`,
      )
    }
    const documentedEmits = documentedNames(subsections.get('Events') ?? '')
    for (const name of declaredEmits) {
      if (!documentedEmits.includes(name)) {
        problems.push(`${component.name}: event \`${name}\` is declared but missing from the Events table`)
      }
    }
    for (const name of documentedEmits) {
      if (!declaredEmits.includes(name)) {
        problems.push(`${component.name}: the Events table documents \`${name}\`, which does not exist`)
      }
    }

    /* the component itself --------------------------------------------- */
    if (component.sfc) {
      const sfc = read(component.sfc)
      const propsType = sfcPropsType(sfc)
      if (propsType !== component.props) {
        problems.push(
          `${component.sfc}: \`defineProps<${propsType ?? '…'}>\` does not use \`${component.props}\`, ` +
            'so the component and the documented interface are two different contracts',
        )
      }

      const accesses = sfcPropAccesses(sfc)
      const forwardsAll = sfcForwardsAllProps(sfc)
      for (const name of accesses) {
        if (!allNames.includes(name)) {
          problems.push(`${component.sfc}: reads \`props.${name}\`, which \`${component.props}\` does not declare`)
        }
      }
      for (const name of allNames) {
        if (!accesses.includes(name) && !forwardsAll) {
          problems.push(
            `${component.sfc}: \`${name}\` is declared and documented but never read, so setting it does nothing`,
          )
        }
      }

      const sfcEmits = sfcEmitNames(sfc)
      if (component.emits) {
        for (const name of sfcEmits) {
          if (!declaredEmits.includes(name)) {
            problems.push(`${component.sfc}: emits \`${name}\`, which \`${component.emits}\` does not declare`)
          }
        }
        const fired = sfcFiredEmits(sfc)
        for (const name of declaredEmits) {
          if (!sfcEmits.includes(name)) {
            problems.push(`${component.sfc}: \`${component.emits}\` declares \`${name}\` but the component never declares it in \`defineEmits\``)
          } else if (!fired.includes(name)) {
            problems.push(
              `${component.sfc}: \`${component.emits}\` declares \`${name}\` but no \`${name}\` event is ever fired, so a consumer listening for it waits forever`,
            )
          }
        }
      } else if (sfcEmits.length > 0) {
        problems.push(`${component.sfc}: emits ${sfcEmits.join(', ')} with no documented emits interface`)
      }

      const sfcSlots = sfcSlotNames(sfc)
      for (const name of sfcSlots) {
        if (!slotNames.includes(name)) {
          problems.push(`${component.sfc}: renders a \`${name}\` slot that \`${component.slots}\` does not declare`)
        }
      }
      for (const name of slotNames) {
        if (!sfcSlots.includes(name)) {
          problems.push(`${component.sfc}: \`${component.slots}\` declares \`${name}\` but the component renders no such slot`)
        }
      }
    }
  }

  /* the app-level configuration table ---------------------------------- */
  if (spec.config) {
    const configRegistry = parseTypeSource(read(spec.config.file))
    const config = resolveInterface(configRegistry, spec.config.type, problems)
    const configNames = config.all.map((member) => member.name)
    const configSection = sections.get(spec.config.section)
    if (configSection === undefined) {
      problems.push(`${spec.docs} has no \`## ${spec.config.section}\` section`)
    } else {
      const documentedConfig = documentedNames(configSection)
      for (const name of configNames) {
        if (!documentedConfig.includes(name)) {
          problems.push(
            `\`${spec.config.type}.${name}\` is configurable but the \`${spec.config.section}\` table does not list it`,
          )
        }
      }
      for (const name of documentedConfig) {
        if (!configNames.includes(name)) {
          problems.push(`the \`${spec.config.section}\` table lists \`${name}\`, which \`${spec.config.type}\` does not declare`)
        }
      }
      notes.push(
        `config: ${configNames.length} option(s) documented (${configNames.join(', ')})`,
      )
    }
  }

  /* examples ------------------------------------------------------------ */
  const tagNames = spec.components.map((component) => component.name)
  const pattern = tagPattern(tagNames)
  for (const file of spec.exampleFiles ?? []) {
    const source = read(file)
    for (const match of source.matchAll(pattern)) {
      const [, tag, body] = match
      stats.examples += 1
      for (const attribute of tagAttributes(body)) {
        if (isNonPropAttribute(attribute)) continue
        const declared = propsByComponent.get(tag) ?? []
        if (!declared.includes(attribute)) {
          problems.push(`${file}: \`<${tag} ${attribute}…>\` — \`${attribute}\` is not a documented prop`)
        }
      }
    }
  }

  /* prose that quotes a number from another contract -------------------- */
  if (spec.gatedCounts) {
    const { files, pattern, expected, label } = spec.gatedCounts
    let quoted = 0
    for (const file of files) {
      const text = read(file)
      const found = [...text.matchAll(pattern)].map((match) => Number(match[1]))
      quoted += found.length
      if (found.length === 0) {
        problems.push(`${file}: states no ${label ?? 'count'} (expected ${expected}), so the claim is unchecked`)
        continue
      }
      for (const value of found) {
        if (value !== expected) {
          problems.push(
            `${file}: documents ${value} ${label ?? 'count'}(s) but \`tools/token-audit.pairs.mjs\` gates ${expected}`,
          )
        }
      }
    }
    notes.push(`prose counts: ${quoted} documented figure(s) checked against ${expected}`)
  }

  notes.push(
    `api: ${stats.components} component(s), ${stats.props} prop(s), ${stats.slots} slot(s), ` +
      `${stats.emits} emit(s), ${stats.examples} example tag(s) checked`,
  )

  return { problems, notes, stats }
}

/**
 * Emit names out of a call-signature emits interface body.
 *
 * `(event: 'click', payload: MouseEvent): void` is the documented spelling — the name is
 * the string literal in the first parameter, which is the only place it can be written
 * without duplicating the literal `defineEmits` already has to contain.
 */
function emitNamesFromBody(body) {
  const names = []
  for (const match of body.matchAll(/\(\s*event\s*:\s*'([^']+)'/g)) names.push(match[1])
  return names
}
