/**
 * The bilingual documentation contract.
 *
 * A translated page is not "a page in English": it is the *same page* in another language.
 * Everything structural — how many sections, which code samples, which components are
 * demonstrated, which pages link where — has to survive the translation, and prose has to
 * actually be translated. Neither property is visible in review, because a page that dropped a
 * code sample still reads perfectly well.
 *
 * So the two trees are compared mechanically:
 *
 *   structure   heading levels, fenced code blocks (language + order), VitePress containers,
 *               component tags and their attribute *names* (values legitimately differ, since
 *               an example's visible label is content);
 *   language    prose must not contain CJK in the English tree — a translated heading above an
 *               untranslated paragraph is the defect this exists for. CJK inside code is
 *               counted and reported instead, because an i18n page legitimately *quotes*
 *               Chinese strings as data;
 *   links       every internal link stays inside its own tree, resolves to a page that exists,
 *               and its hash resolves to a heading in the built page;
 *   coverage    every Chinese page has an English mirror and vice versa.
 *
 * Reading the built HTML for hash checks (rather than reimplementing VitePress' slugify) is
 * deliberate: the slug rule has changed between VitePress versions, and an audit that
 * disagreed with the generator would report defects that do not exist.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, posix, relative as relativePath, resolve as resolvePath } from 'node:path'

/** Files that are never translated: they are not pages, or they are the other tree. */
const NOT_A_PAGE = [/^public\//, /^\.vitepress\//, /^en\//]

/** CJK ideographs plus the fullwidth punctuation that only appears in Chinese prose. */
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/

/** One markdown link, `[text](target)`; images share the syntax and are checked the same way. */
const MARKDOWN_LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

/** A component usage: `<YueButton attr="x"…>` or `<PreviewFrame …>`. */
const COMPONENT_TAG = /<([A-Z][A-Za-z0-9]*)\b([^>]*)>/g

/** `::: tip Title` … `:::` */
const CONTAINER = /^:::+\s*([a-z-]+)?/gm

/**
 * ``` fence, with its info string.
 *
 * `[ \t]*` and not `\s*` between the backticks and the info: `\s` matches a newline, so a
 * *closing* fence would swallow the next line as its "info string" and the block count would be
 * wrong in a way that looks like a translation defect.
 */
const FENCE = /^(`{3,}|~{3,})[ \t]*([^\n]*)$/gm

/** Inline code spans: `` `x` ``. Their content is data, not prose. */
const INLINE_CODE = /`[^`\n]*`/g

/** Split markdown into fenced-code regions and everything else. */
function splitCode(content) {
  const blocks = []
  const prose = []
  let cursor = 0
  for (const match of content.matchAll(FENCE)) {
    if (match.index < cursor) continue
    const fence = match[1]
    const closePattern = new RegExp(`^${fence[0] === '`' ? '`' : '~'}{${fence.length},}[ \\t]*$`, 'm')
    const rest = content.slice(match.index + match[0].length)
    const close = closePattern.exec(rest)
    const end = close ? match.index + match[0].length + close.index + close[0].length : content.length
    prose.push(content.slice(cursor, match.index))
    blocks.push({ info: match[2].trim(), body: content.slice(match.index, end) })
    cursor = end
  }
  prose.push(content.slice(cursor))
  return { prose: prose.join('\n'), blocks }
}

/** Heading levels, in document order. */
function headingLevels(content) {
  return [...content.matchAll(/^(#{1,6})\s+\S/gm)].map((match) => match[1].length)
}

/** Component tags and, per tag, the *names* of the attributes it carries. */
function componentUsage(content) {
  const usage = new Map()
  for (const match of content.matchAll(COMPONENT_TAG)) {
    const [, tag, rawAttributes] = match
    // `v-bind="x"` carries no name of its own; directives are kept as written.
    const withoutValues = rawAttributes.replace(/"[^"]*"|'[^']*'/g, '""')
    const names = [...withoutValues.matchAll(/(?:^|\s)([:@#]?[A-Za-z_][\w:.-]*)/g)]
      .map((attribute) => attribute[1])
      .sort()
    const existing = usage.get(tag) ?? new Set()
    for (const name of names) existing.add(name)
    usage.set(tag, existing)
  }
  return usage
}

/** Every page in a tree, as `relativePath -> source`. */
export function readPages(docsDir, tree = '') {
  const root = tree === '' ? docsDir : join(docsDir, tree)
  const pages = new Map()
  if (!existsSync(root)) return pages

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (!entry.name.endsWith('.md')) continue
      const relative_ = relativePath(root, full).replaceAll('\\', '/')
      if (tree === '' && NOT_A_PAGE.some((pattern) => pattern.test(relative_))) continue
      pages.set(relative_, readFileSync(full, 'utf8'))
    }
  }
  walk(root)
  return pages
}

/** The heading text of a page, in order. */
function headings(content) {
  return [...content.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map((match) => match[1])
}

/**
 * The heading ids a built page actually contains.
 *
 * Read from the HTML rather than recomputed: VitePress' slug rule is an implementation detail,
 * and the file that matters is the one the deployment serves.
 */
export function headingIds(distDir, urlPath) {
  const cleaned = urlPath.replace(/^\//, '').replace(/\/$/, '')
  const candidates =
    cleaned === ''
      ? ['index.html']
      : [`${cleaned}.html`, `${cleaned}/index.html`, cleaned]
  for (const candidate of candidates) {
    const file = join(distDir, candidate)
    if (existsSync(file) && statSync(file).isFile()) {
      return new Set(
        [...readFileSync(file, 'utf8').matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]),
      )
    }
  }
  return null
}

/**
 * Check the two documentation trees against each other.
 *
 * @param {object} options
 * @param {string} options.docsDir  `apps/docs`
 * @param {string} options.distDir  built site, for hash validation
 * @returns {{ problems: string[], notes: string[], stats: object }}
 */
export function checkDocsI18n({ docsDir, distDir }) {
  const problems = []
  const notes = []
  const stats = { pages: 0, links: 0, hashes: 0, codeCjk: 0 }

  const zh = readPages(docsDir)
  const en = readPages(docsDir, 'en')

  /* coverage ---------------------------------------------------------- */
  for (const relative_ of zh.keys()) {
    if (!en.has(relative_)) problems.push(`missing English mirror: en/${relative_}`)
  }
  for (const relative_ of en.keys()) {
    if (!zh.has(relative_)) problems.push(`English page has no Chinese source: en/${relative_}`)
  }
  stats.pages = zh.size

  const distAvailable = existsSync(distDir)

  for (const [relative_, source] of zh) {
    const mirror = en.get(relative_)
    if (mirror === undefined) continue

    /* structure ------------------------------------------------------- */
    const sourceLevels = headingLevels(source)
    const mirrorLevels = headingLevels(mirror)
    if (sourceLevels.join(',') !== mirrorLevels.join(',')) {
      problems.push(
        `en/${relative_}: heading structure differs (zh [${sourceLevels.join(',')}] vs ` +
          `en [${mirrorLevels.join(',')}])`,
      )
    }

    const sourceSplit = splitCode(source)
    const mirrorSplit = splitCode(mirror)
    if (sourceSplit.blocks.length !== mirrorSplit.blocks.length) {
      problems.push(
        `en/${relative_}: ${mirrorSplit.blocks.length} code block(s), source has ` +
          `${sourceSplit.blocks.length}`,
      )
    }
    const sourceLangs = sourceSplit.blocks.map((block) => block.info).join(',')
    const mirrorLangs = mirrorSplit.blocks.map((block) => block.info).join(',')
    if (sourceLangs !== mirrorLangs) {
      problems.push(`en/${relative_}: code block languages differ (${sourceLangs} vs ${mirrorLangs})`)
    }

    const sourceContainers = [...source.matchAll(CONTAINER)].map((match) => match[1] ?? '')
    const mirrorContainers = [...mirror.matchAll(CONTAINER)].map((match) => match[1] ?? '')
    if (sourceContainers.join(',') !== mirrorContainers.join(',')) {
      problems.push(
        `en/${relative_}: VitePress containers differ (${sourceContainers.join('|')} vs ` +
          `${mirrorContainers.join('|')})`,
      )
    }

    const sourceUsage = componentUsage(source)
    const mirrorUsage = componentUsage(mirror)
    for (const [tag, attributes] of sourceUsage) {
      const mirrored = mirrorUsage.get(tag)
      if (!mirrored) {
        problems.push(`en/${relative_}: the source uses <${tag}> and the mirror does not`)
        continue
      }
      const missing = [...attributes].filter((name) => !mirrored.has(name))
      if (missing.length > 0) {
        problems.push(`en/${relative_}: <${tag}> is missing attribute(s) ${missing.join(', ')}`)
      }
    }
    for (const tag of mirrorUsage.keys()) {
      if (!sourceUsage.has(tag)) {
        problems.push(`en/${relative_}: the mirror uses <${tag}>, which the source does not`)
      }
    }

    /* language -------------------------------------------------------- */
    //
    // Prose must be English. Inline code and fenced blocks are *data*: an i18n page quotes
    // `'清空'` as the zh-CN value of a key, and a check that flagged that would force the
    // documentation to stop showing the thing it is documenting. Those characters are counted
    // and reported instead, so a reviewer can see how much Chinese survives and why.
    const inlineCode = (mirrorSplit.prose.match(INLINE_CODE) ?? []).join(' ')
    const proseWithoutCode = mirrorSplit.prose.replace(INLINE_CODE, '')
    const cjkInProse = [...proseWithoutCode.matchAll(new RegExp(CJK, 'g'))]
    if (cjkInProse.length > 0) {
      const first = proseWithoutCode.search(CJK)
      const line = proseWithoutCode.slice(0, first).split('\n').length
      problems.push(
        `en/${relative_}: untranslated text near line ${line} of the prose ` +
          `(${cjkInProse.length} CJK character(s))`,
      )
    }
    const cjkInData =
      [...mirrorSplit.blocks.join('\n').matchAll(new RegExp(CJK, 'g'))].length +
      [...inlineCode.matchAll(new RegExp(CJK, 'g'))].length
    stats.codeCjk += cjkInData
    if (cjkInData > 0) {
      notes.push(`en/${relative_}: ${cjkInData} CJK character(s) inside code (quoted data)`)
    }

    /* links ----------------------------------------------------------- */
    const checkLink = (target, where) => {
      if (/^(?:https?:)?\/\//.test(target) || target.startsWith('mailto:')) return
      const isEnglish = where.startsWith('en/')
      const prefix = isEnglish ? '/en/' : '/'
      const expectPrefix = isEnglish ? '/en/' : '/'

      let urlPath = ''
      let hash = ''
      if (target.startsWith('#')) {
        urlPath = `/${where.replace(/\.md$/, '')}`
        hash = target.slice(1)
      } else if (target.startsWith('/')) {
        if (!target.startsWith(expectPrefix)) {
          problems.push(
            `${where}: link "${target}" leaves its own locale tree (expected "${prefix}…")`,
          )
          return
        }
        const [path, anchor] = target.split('#')
        urlPath = path
        hash = anchor ?? ''
      } else {
        // Relative markdown link: resolve against the page's directory, then treat as a path.
        const base = posix.dirname(where)
        const resolved = posix.normalize(posix.join(base, target.split('#')[0]))
        const [path, anchor] = [resolved, target.split('#')[1] ?? '']
        urlPath = `/${path}`
        hash = anchor
      }

      stats.links += 1

      // The path must resolve to a page in the *same* tree. The English map is keyed relative to
      // `en/`, so the locale prefix is stripped before looking: `/en/guide` is `guide.md` there.
      const bare = urlPath.replace(/^\//, '').replace(/\/$/, '')
      const inEnglishTree = bare === 'en' || bare.startsWith('en/')
      const key = inEnglishTree ? bare.replace(/^en\/?/, '') : bare
      const candidates =
        key === '' ? ['index.md'] : [`${key}.md`, `${key}/index.md`]
      const exists = candidates.some((candidate) =>
        inEnglishTree ? en.has(candidate) : zh.has(candidate),
      )
      if (!exists) {
        problems.push(`${where}: link "${target}" points at a page that does not exist`)
        return
      }

      // Hash resolves in the built page?
      if (hash === '') return
      stats.hashes += 1
      if (!distAvailable) {
        problems.push(
          `${where}: cannot verify "${target}" — no built site found. Run \`corepack pnpm build\` first.`,
        )
        return
      }
      const ids = headingIds(distDir, urlPath)
      if (ids === null) {
        problems.push(`${where}: link "${target}" has no built page to verify against`)
      } else if (!ids.has(decodeURIComponent(hash))) {
        problems.push(`${where}: link "${target}" — no heading with that id in the built page`)
      }
    }

    for (const [, target] of source.matchAll(MARKDOWN_LINK)) checkLink(target, relative_)
    for (const [, target] of mirror.matchAll(MARKDOWN_LINK)) checkLink(target, `en/${relative_}`)

    /* frontmatter ----------------------------------------------------- */
    const frontmatterKeys = (content) => {
      const match = /^---\n([\s\S]*?)\n---/.exec(content)
      if (!match) return []
      return [...match[1].matchAll(/^([A-Za-z][\w-]*):/gm)].map((entry) => entry[1]).sort()
    }
    if (frontmatterKeys(source).join(',') !== frontmatterKeys(mirror).join(',')) {
      problems.push(`en/${relative_}: frontmatter keys differ from the source`)
    }
  }

  /* prose sanity: a Chinese page that lost its text is not a page ----- */
  const frontmatterLayout = (content) => /^---\n[\s\S]*?^layout:\s*(\S+)/m.exec(content)?.[1] ?? null

  for (const [relative_, source] of zh) {
    if (!CJK.test(source)) {
      problems.push(`${relative_}: the Chinese page contains no Chinese text at all`)
    }
    // A `layout: home` page is a VitePress hero and legitimately has no markdown headings; any
    // other page without one is a page whose structure was lost.
    if (headings(source).length === 0 && frontmatterLayout(source) === null) {
      problems.push(`${relative_}: the page has no headings`)
    }
  }

  notes.push(
    `docs i18n: ${stats.pages} page pair(s), ${stats.links} links (${stats.hashes} hash(es) ` +
      `verified against the built site), ${stats.codeCjk} CJK character(s) in English code samples`,
  )

  return { problems, notes, stats }
}

export { relativePath, resolvePath }
