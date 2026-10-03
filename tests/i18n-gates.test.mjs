import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Run a gate against the real repository and report both the result and its stdout. */
function runGate(script) {
  try {
    const stdout = execFileSync('node', [join(REPO_ROOT, script)], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
    return { code: 0, stdout }
  } catch (error) {
    return { code: error.status ?? 1, stdout: `${error.stdout ?? ''}${error.stderr ?? ''}` }
  }
}

/**
 * Both locale gates are `node` scripts rather than vitest suites, so the test drives the real
 * command. That is deliberate: the thing being verified is the *gate*, including its exit code
 * and its message, and a wrapper that re-implemented the check would verify nothing.
 */
describe('audit:i18n', () => {
  const result = runGate('tools/audit-i18n.mjs')

  it('passes against this repository', () => {
    expect(result.stdout).toContain('RESULT: PASS')
    expect(result.code).toBe(0)
  })

  it('reports what it inspected, so a passing run is not vacuous', () => {
    expect(result.stdout).toMatch(/catalog: \d+ key\(s\), \d+ pack\(s\)/)
    expect(result.stdout).toMatch(/components: \d+ source file\(s\) checked/)
  })
})

describe('audit:docs:i18n', () => {
  const result = runGate('tools/check-docs-i18n.mjs')

  it('passes against this repository', () => {
    // The English tree is a deliverable of the same change that added this gate, so a failure
    // here is a real gap rather than an expected first-run state.
    expect(result.stdout).toContain('RESULT: PASS')
    expect(result.code).toBe(0)
  })

  it('reports coverage rather than only the absence of problems', () => {
    expect(result.stdout).toMatch(
      /docs i18n: \d+ page pair\(s\), \d+ links \(\d+ hash\(es\) verified/,
    )
  })
})

/* ------------------------------------------------------------------ *
 * Negative probes
 *
 * A gate that cannot fail is a gate that does not exist. Each case plants the exact defect the
 * gate exists for, in a throwaway copy of the trees, and asserts the message mentions it.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * The catalog rules
 *
 * Driven through the library with fixtures, because the interesting cases — an explicit
 * `untranslated` marker, a stale one, a dropped placeholder — do not exist in the shippable
 * catalog by definition.
 * ------------------------------------------------------------------ */

describe('the locale catalog gate', () => {
  const CATALOG = `export type YueLocaleMessages = {
  input: {
    clear: string
  }
}

export const YUE_MESSAGE_META = {
  'input.clear': { purpose: 'Clear button', params: [], announced: true },
}
`

  const pack = (body, { default: isDefault = false } = {}) => ({
    locale: isDefault ? 'en-US' : 'zh-CN',
    file: isDefault ? 'en-US.ts' : 'zh-CN.ts',
    isDefault,
    source: `const pack = {\n${body}\n} satisfies YueLocaleMessages\n\nexport default pack\n`,
  })

  const check = async ({ catalog = CATALOG, packs, components = [] }) => {
    const { checkCatalog } = await import('../tools/lib/locale-catalog.mjs')
    return checkCatalog({ catalogSource: catalog, packs, components })
  }

  const EN = pack("  input: { clear: 'Clear' },", { default: true })

  it('accepts a translated pack', async () => {
    const result = await check({ packs: [EN, pack("  input: { clear: '清空' },")] })
    expect(result.problems).toEqual([])
    expect(result.stats.keys).toBe(1)
  })

  it('detects a missing key', async () => {
    const result = await check({ packs: [EN, pack('  input: {},')] })
    expect(result.problems.join('\n')).toContain('missing key "input.clear"')
  })

  it('detects a key that is not in the catalog', async () => {
    const result = await check({
      packs: [EN, pack("  input: { clear: '清空', extra: 'x' },")],
    })
    expect(result.problems.join('\n')).toContain('"input.extra" is not in the catalog')
  })

  it('detects an empty value', async () => {
    const result = await check({ packs: [EN, pack("  input: { clear: '' },")] })
    expect(result.problems.join('\n')).toContain('empty value')
  })

  it('detects a dropped interpolation parameter', async () => {
    const catalog = `export type YueLocaleMessages = {
  list: {
    count: string
  }
}

export const YUE_MESSAGE_META = {
  'list.count': { purpose: 'Item count', params: ['count'], announced: false },
}
`
    const result = await check({
      catalog,
      packs: [
        pack("  list: { count: '{count} items' },", { default: true }),
        pack("  list: { count: '个项目' },"),
      ],
    })
    expect(result.problems.join('\n')).toContain('do not match the default')
  })

  it('flags a copy of the default as an unfinished translation', async () => {
    const result = await check({ packs: [EN, pack("  input: { clear: 'Clear' },")] })
    expect(result.problems.join('\n')).toContain('identical to the en-US default')
  })

  it('accepts a copy that is explicitly marked untranslated', async () => {
    const result = await check({
      packs: [EN, pack("  input: { clear: 'Clear' }, // untranslated: product name")],
    })
    expect(result.problems).toEqual([])
    expect(result.notes.join('\n')).toContain('explicitly untranslated (product name)')
    expect(result.stats.exempt).toBe(1)
  })

  it('detects a stale untranslated marker', async () => {
    const result = await check({
      packs: [EN, pack("  input: { clear: '清空' }, // untranslated: product name")],
    })
    expect(result.problems.join('\n')).toContain('stale marker')
  })

  it('detects a catalog key with no metadata', async () => {
    const result = await check({
      catalog: CATALOG.replace(/^\s*'input\.clear'.*$/m, ''),
      packs: [EN, pack("  input: { clear: '清空' },")],
    })
    expect(result.problems.join('\n')).toContain('has no metadata entry')
  })

  it('detects metadata for a key that does not exist', async () => {
    const result = await check({
      catalog: CATALOG.replace(
        "'input.clear': { purpose: 'Clear button', params: [], announced: true },",
        "'input.clear': { purpose: 'Clear button', params: [], announced: true },\n  'input.gone': { purpose: 'x', params: [], announced: false },",
      ),
      packs: [EN, pack("  input: { clear: '清空' },")],
    })
    expect(result.problems.join('\n')).toContain('"input.gone", which is not in the catalog')
  })

  /**
   * The hard-coded-text rule, case by case.
   *
   * The English cases are the point: the first version of this check only looked for CJK characters,
   * so `aria-label="Clear"` — a string no translator could ever reach — passed an audit that claimed
   * to find hard-coded copy. Each case below is a place user-visible text can hide in an SFC.
   */
  const hardCoded = async (source, path = 'packages/vue/src/components/input/YueInput.vue') => {
    const result = await check({
      packs: [EN, pack("  input: { clear: '清空' },")],
      components: [{ path, source }],
    })
    return result.problems.join('\n')
  }

  it('detects Chinese text assigned in a component', async () => {
    const problems = await hardCoded(`<script setup>\nconst label = '清空'\n</script>\n`)
    expect(problems).toContain('hard-coded user-facing text')
  })

  it('detects an English accessible name on an attribute', async () => {
    const problems = await hardCoded(
      `<template>\n  <button aria-label="Clear" />\n</template>\n`,
    )
    expect(problems).toContain('[attribute aria-label] "Clear"')
  })

  it('detects an English title attribute', async () => {
    const problems = await hardCoded(`<template>\n  <span title="Close" />\n</template>\n`)
    expect(problems).toContain('[attribute title] "Close"')
  })

  it('detects English literal text in a template', async () => {
    const problems = await hardCoded(`<template>\n  <span>Add</span>\n</template>\n`)
    expect(problems).toContain('[template text] "Add"')
  })

  it('detects an English literal inside an attribute binding', async () => {
    const problems = await hardCoded(`<template>\n  <button :aria-label="'Clear'" />\n</template>\n`)
    expect(problems).toContain('[binding aria-label="Clear"]')
  })

  it('detects an English literal assigned to a text-shaped name', async () => {
    const problems = await hardCoded(`<script setup>\nconst clearLabel = 'Clear'\n</script>\n`)
    expect(problems).toContain('[script clearLabel =] "Clear"')
  })

  it('detects an English sentence in a component script', async () => {
    const problems = await hardCoded(
      `<script setup>\nconst message = 'Something went wrong while saving'\n</script>\n`,
    )
    expect(problems).toContain('hard-coded user-facing text')
    expect(problems).toContain('Something went wrong while saving')
  })

  it('does not flag a developer-facing warning', async () => {
    // Not on screen, not translated: flagging these would push the explanation out of the component
    // and away from the code that needs it.
    const problems = await hardCoded(
      `<script setup>\nconst props = defineProps()\nif (!props.x) {\n  warn('[YueInput] shape="circle" needs an accessible name. Pass aria-label.')\n}\n</script>\n`,
    )
    expect(problems).toEqual('')
  })

  it('does not flag prop defaults, class names or selectors', async () => {
    // The false positives the segment-based name check exists to avoid: `variant` contains "aria"
    // and `toggleContext` contains "text".
    const problems = await hardCoded(
      `<script setup>\nconst props = withDefaults(defineProps(), {\n  variant: 'solid',\n  tag: 'button',\n})\nconst toggleContext = 'yue-toggle-context'\nconst selector = 'button, a, input, select, textarea, [contenteditable]'\n</script>\n`,
    )
    expect(problems).toEqual('')
  })

  it('does not flag non-visible attributes or Chinese in comments', async () => {
    const problems = await hardCoded(
      `<script setup>\n// 迁移说明：以前这里是 '清空'\n/* 也包含 中文 */\nexport const x = 1\n</script>\n\n<template>\n  <div class="yue-x" aria-hidden="true" data-yue="input" role="group" />\n</template>\n`,
    )
    expect(problems).toEqual('')
  })
})

describe('the bilingual gate detects drift', () => {
  const temporary = []
  afterAll(() => {
    for (const dir of temporary) rmSync(dir, { recursive: true, force: true })
  })

  /** A minimal two-tree site, built on disk so the real gate can read it. */
  function fixture({ zh, en, dist = true }) {
    const root = mkdtempSync(join(tmpdir(), 'yue-docs-i18n-'))
    temporary.push(root)
    const docsDir = join(root, 'docs')
    mkdirSync(join(docsDir, 'en'), { recursive: true })
    for (const [relative_, content] of Object.entries(zh)) {
      const file = join(docsDir, relative_)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, content, 'utf8')
    }
    for (const [relative_, content] of Object.entries(en)) {
      const file = join(docsDir, 'en', relative_)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, content, 'utf8')
    }
    const distDir = join(root, 'dist')
    if (dist) {
      // Mirrors the built layout: `/en/...` has its own directory, and each page carries the
      // heading ids the anchor check resolves against.
      for (const [relative_, html] of Object.entries({
        'index.html': '<h1 id="hello">Hello</h1>',
        'guide.html': '<h2 id="why">Why</h2>',
        'en/index.html': '<h1 id="hello">Hello</h1>',
        'en/guide.html': '<h2 id="why">Why</h2>',
      })) {
        const file = join(distDir, relative_)
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(file, html, 'utf8')
      }
    }
    return { docsDir, distDir, root }
  }

  const ZH = `# 标题

## 小节

\`\`\`ts
const a = 1
\`\`\`

::: tip 提示
内容
:::

<YueButton size="lg" data-probe="x">保存</YueButton>

[指南](/guide)
`
  const EN = `# Title

## Section

\`\`\`ts
const a = 1
\`\`\`

::: tip Tip
content
:::

<YueButton size="lg" data-probe="x">Save</YueButton>

[Guide](/en/guide)
`

  /** A second page, so link targets exist and the anchor check has something to resolve. */
  const ZH_GUIDE = `# 指南

## 为什么
`
  const EN_GUIDE = `# Guide

## Why
`

  /** A tree with both pages, the shape every link test needs. */
  function paired(overrides = {}) {
    return fixture({
      zh: { 'index.md': ZH, 'guide.md': ZH_GUIDE, ...(overrides.zh ?? {}) },
      en: { 'index.md': EN, 'guide.md': EN_GUIDE, ...(overrides.en ?? {}) },
      dist: overrides.dist,
    })
  }

  /** Run the checker in-process against a fixture. */
  async function check(files) {
    const { checkDocsI18n } = await import('../tools/lib/docs-i18n.mjs')
    return checkDocsI18n(files)
  }

  it('accepts a faithful mirror', async () => {
    const result = await check(paired())
    expect(result.problems).toEqual([])
  })

  it('detects a missing mirror', async () => {
    const result = await check(fixture({ zh: { 'index.md': ZH }, en: {} }))
    expect(result.problems.join('\n')).toContain('missing English mirror')
  })

  it('detects an untranslated sentence', async () => {
    const result = await check(
      paired({ en: { 'index.md': EN.replace('content', '内容') } }),
    )
    expect(result.problems.join('\n')).toContain('untranslated text')
  })

  it('detects a dropped code sample', async () => {
    const result = await check(
      paired({ en: { 'index.md': EN.replace(/```ts\nconst a = 1\n```\n/, '') } }),
    )
    expect(result.problems.join('\n')).toContain('code block')
  })

  it('detects a changed heading structure', async () => {
    const result = await check(
      paired({ en: { 'index.md': EN.replace('## Section', '### Section') } }),
    )
    expect(result.problems.join('\n')).toContain('heading structure differs')
  })

  it('detects a missing VitePress container', async () => {
    const result = await check(
      paired({ en: { 'index.md': EN.replace(/::: tip Tip\ncontent\n:::\n/, '') } }),
    )
    expect(result.problems.join('\n')).toContain('containers differ')
  })

  it('detects a link that leaves its own locale tree', async () => {
    const result = await check(
      paired({ en: { 'index.md': EN.replace('/en/guide', '/guide') } }),
    )
    expect(result.problems.join('\n')).toContain('leaves its own locale tree')
  })

  it('detects a link to a page that does not exist', async () => {
    const result = await check(
      paired({ en: { 'index.md': EN.replace('/en/guide', '/en/nope') } }),
    )
    expect(result.problems.join('\n')).toContain('page that does not exist')
  })

  it('detects an anchor that does not resolve in the built page', async () => {
    const result = await check(
      paired({ en: { 'index.md': EN.replace('/en/guide', '/en/guide#gone') } }),
    )
    expect(result.problems.join('\n')).toContain('no heading with that id')
  })

  it('accepts an anchor that does resolve', async () => {
    const result = await check(
      paired({ en: { 'index.md': EN.replace('/en/guide', '/en/guide#why') } }),
    )
    expect(result.problems).toEqual([])
  })
})
