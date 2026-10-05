import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import { DOC_CONTRACTS } from '../tools/api-docs.contract.mjs'
import {
  checkApiDocs,
  documentedNames,
  markdownSections,
  markdownTableRows,
  parseExtends,
  parseMember,
  parseTypeSource,
  resolveInterface,
  sfcEmitNames,
  sfcForwardsAllProps,
  sfcPropAccesses,
  sfcPropsType,
  sfcSlotNames,
  splitMembers,
} from '../tools/lib/api-docs.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/* ------------------------------------------------------------------ *
 * The real contract
 * ------------------------------------------------------------------ */

describe('the API ⇄ documentation gate', () => {
  describe('against this repository', () => {
    const results = DOC_CONTRACTS.map((contract) => ({
      contract,
      result: checkApiDocs({ root: REPO_ROOT, ...contract }),
    }))

    it('reports no problems', () => {
      const problems = results.flatMap(({ result }) => result.problems)
      expect(problems).toEqual([])
    })

    it('actually inspected every component, prop, slot, emit and example', () => {
      // A gate that inspected nothing also reports no problems. These counts are the
      // evidence that "no problems" is a statement about the documentation rather than
      // about an empty loop — and they fail loudly if a reader stops recognising a file.
      const stats = results.map(({ result }) => result.stats)
      expect(stats).toHaveLength(DOC_CONTRACTS.length)
      for (const { contract, result } of results) {
        const entry = result.stats
        if (contract.id === 'button') {
          expect(entry.components).toBe(4)
          expect(entry.props).toBeGreaterThanOrEqual(20)
          expect(entry.slots).toBe(10)
          expect(entry.emits).toBe(2)
          expect(entry.examples).toBeGreaterThan(50)
        } else if (contract.id === 'popover') {
          expect(entry.components).toBe(1)
          expect(entry.props).toBe(14)
          expect(entry.slots).toBe(2)
          expect(entry.emits).toBe(5)
          expect(entry.examples).toBeGreaterThan(0)
        } else if (contract.id === 'dialog') {
          expect(entry.components).toBe(1)
          expect(entry.props).toBe(26)
          expect(entry.slots).toBe(4)
          expect(entry.emits).toBe(7)
          expect(entry.examples).toBeGreaterThan(0)
        }
      }
    })

    it('resolves inheritance instead of reporting the child as empty', () => {
      const contract = DOC_CONTRACTS[0]
      const registry = parseTypeSource(readFileSync(resolve(REPO_ROOT, contract.types), 'utf8'))
      const item = resolveInterface(registry, 'YueButtonToggleItemProps')
      expect(item.own.map((member) => member.name)).toEqual(['value'])
      expect(item.all.map((member) => member.name)).toEqual(
        expect.arrayContaining(['value', 'theme', 'variant', 'size', 'shape', 'disabled']),
      )
    })
  })

  /* ---------------------------------------------------------------- *
   * Fixtures: the gate has to fail when the documentation drifts
   * ---------------------------------------------------------------- */

  const temporary = []
  afterAll(() => {
    for (const dir of temporary) rmSync(dir, { recursive: true, force: true })
  })

  const TYPES = `
export interface WidgetSharedProps {
  /** Shared by the widget and its item. */
  size?: 'sm' | 'md'
}

export interface WidgetProps extends WidgetSharedProps {
  /** Standalone toggle state. */
  active?: boolean
}

export interface WidgetSlots {
  default?: () => unknown
  loader?: () => unknown
}

export interface WidgetEmits {
  (event: 'change', payload: string): void
}
`

  const CONFIG_TYPES = `
export interface Config {
  size: string
  messages: Record<string, string>
}
`

  const DOCS = `# Widget

## 引入

\`\`\`ts
import { Widget } from '@yue/vue/widget'
\`\`\`

## Widget

\`size\` 继承自 \`WidgetSharedProps\`，\`active\` 属于 \`WidgetProps\`。

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| \`size\` | \`'sm' \\| 'md'\` | \`'md'\` | 尺寸 |
| \`active\` | \`boolean\` | \`false\` | 选中态 |

### Slots

| 插槽 | 内容 |
| --- | --- |
| \`default\` | 标签 |
| \`loader\` | 自定义加载 |

### Events

| 事件 | 载荷 |
| --- | --- |
| \`change\` | \`string\` |

## 应用级配置

| 配置项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| \`size\` | \`'sm' \\| 'md'\` | \`'md'\` | 回落尺寸 |
| \`messages\` | \`Partial<Messages>\` | \`{}\` | 文案表 |
`

  const SFC = `<script setup lang="ts">
import { useNamespace } from '@yue/hooks'
import type { WidgetProps } from './types'

const props = withDefaults(defineProps<WidgetProps>(), { size: 'md', active: false })
const emit = defineEmits<{ change: [payload: string] }>()
const ns = useNamespace('widget')

function onClick() {
  emit('change', props.size ?? '')
}
</script>

<template>
  <button :class="[ns.b(), { [ns.is('active')]: props.active }]" :aria-pressed="props.active" @click="onClick">
    <slot />
    <span v-if="props.active" :class="ns.e('loader')"><slot name="loader" /></span>
  </button>
</template>
`

  const EXAMPLES = `# Widget 示例

<Widget size="sm" active />

\`\`\`vue
<Widget size="md">保存</Widget>
\`\`\`
`

  /**
   * Write a fixture and return the spec the checker consumes.
   *
   * A real directory rather than a mocked reader: the checker's job is to read files, and a
   * fixture that never reached the filesystem would leave the part with the bugs in it —
   * paths, offsets, comment masking — untested.
   */
  function fixture(overrides = {}) {
    const root = mkdtempSync(join(tmpdir(), 'yue-api-docs-'))
    temporary.push(root)
    const files = {
      'types.ts': overrides.types ?? TYPES,
      'config.ts': overrides.config ?? CONFIG_TYPES,
      'api.md': overrides.docs ?? DOCS,
      'Widget.vue': overrides.sfc ?? SFC,
      'examples.md': overrides.examples ?? EXAMPLES,
    }
    for (const [name, contents] of Object.entries(files)) {
      const target = join(root, name)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, contents, 'utf8')
    }
    return {
      root,
      types: 'types.ts',
      docs: 'api.md',
      config: { file: 'config.ts', type: 'Config', section: '应用级配置' },
      components: [
        {
          name: 'Widget',
          section: 'Widget',
          props: 'WidgetProps',
          slots: 'WidgetSlots',
          emits: 'WidgetEmits',
          sfc: 'Widget.vue',
        },
      ],
      exampleFiles: ['examples.md'],
      ...overrides.spec,
    }
  }

  const check = (overrides) => checkApiDocs(fixture(overrides))
  const problemsOf = (result) => result.problems.join('\n')

  it('accepts the fixture when nothing has drifted', () => {
    const result = check({})
    expect(result.problems).toEqual([])
    expect(result.stats).toMatchObject({ components: 1, props: 2, slots: 2, emits: 1 })
    expect(result.stats.examples).toBe(2)
  })

  it('rejects a declared prop that the table forgot', () => {
    const result = check({
      docs: DOCS.replace('| `active` | `boolean` | `false` | 选中态 |\n', ''),
    })
    expect(problemsOf(result)).toContain('prop `active` is declared but missing')
  })

  it('rejects a documented prop that no longer exists', () => {
    const result = check({ docs: DOCS.replace('| `active` | `boolean`', '| `actived` | `boolean`') })
    expect(problemsOf(result)).toContain('the Props table documents `actived`')
  })

  it('rejects a prop the component never reads', () => {
    const result = check({ sfc: SFC.replaceAll('props.active', 'false') })
    expect(problemsOf(result)).toContain('`active` is declared and documented but never read')
  })

  it('rejects a prop the component reads but does not declare', () => {
    const result = check({ sfc: SFC.replace('props.size', 'props.sizes') })
    expect(problemsOf(result)).toContain('reads `props.sizes`')
  })

  it('rejects a slot that is declared but never rendered', () => {
    const result = check({ sfc: SFC.replace('<slot name="loader" />', '') })
    expect(problemsOf(result)).toContain('declares `loader` but the component renders no such slot')
  })

  it('rejects an emit table row that does not match the declared emit', () => {
    const result = check({
      docs: DOCS.replace('| `change` | `string` |', '| `onChange` | `string` |'),
    })
    expect(problemsOf(result)).toContain('event `change` is declared but missing from the Events table')
    expect(problemsOf(result)).toContain('the Events table documents `onChange`')
  })

  it('rejects an emit the component declares and never fires', () => {
    const result = check({
      sfc: SFC.replace("emit('change', props.size ?? '')", 'void props.size'),
    })
    expect(problemsOf(result)).toContain('no `change` event is ever fired')
  })

  it('rejects an example that passes a prop which does not exist', () => {
    const result = check({ examples: EXAMPLES.replace('size="sm"', 'size="sm" tone="loud"') })
    expect(problemsOf(result)).toContain('`tone` is not a documented prop')
  })

  it('accepts class, aria and data attributes in examples', () => {
    const result = check({
      examples: EXAMPLES.replace('<Widget size="sm" active />', '<Widget size="sm" class="x" aria-label="y" data-z="1" @click="f" />'),
    })
    expect(result.problems).toEqual([])
  })

  it('rejects a component whose defineProps names another interface', () => {
    const result = check({
      sfc: SFC.replace('defineProps<WidgetProps>', 'defineProps<WidgetSharedProps>'),
    })
    expect(problemsOf(result)).toContain('does not use `WidgetProps`')
  })

  it('rejects an app-config table that has drifted from the config type', () => {
    // This is the defect that started the gate: the page said the configuration had one
    // option while the library had two.
    const result = check({
      docs: DOCS.replace('| `messages` | `Partial<Messages>` | `{}` | 文案表 |\n', ''),
    })
    expect(problemsOf(result)).toContain('`Config.messages` is configurable')
  })

  it('rejects an app-config table that invents an option', () => {
    const result = check({
      docs: DOCS.replace(
        '| `messages` | `Partial<Messages>` | `{}` | 文案表 |',
        "| `messages` | `Partial<Messages>` | `{}` | 文案表 |\n| `prefix` | `string` | `'yue'` | 命名空间 |",
      ),
    })
    expect(problemsOf(result)).toContain('lists `prefix`')
  })

  it('rejects an inherited contract the page never names', () => {
    const result = check({ docs: DOCS.replace('`WidgetSharedProps`', '基类') })
    expect(problemsOf(result)).toContain('never mentions `WidgetSharedProps`')
  })

  it('rejects an Omit that names a member the base does not have', () => {
    const result = check({
      types: TYPES.replace(
        'export interface WidgetProps extends WidgetSharedProps {',
        "export interface WidgetProps extends Omit<WidgetSharedProps, 'tone'> {",
      ),
    })
    expect(problemsOf(result)).toContain("Omit<WidgetSharedProps, 'tone'>")
  })

  it('throws rather than guessing at a type it cannot resolve', () => {
    expect(() => resolveInterface(parseTypeSource(TYPES), 'Nope')).toThrow(/cannot resolve type/)
    expect(() =>
      check({
        spec: {
          components: [
            {
              name: 'Widget',
              section: 'Widget',
              props: 'Nope',
              slots: 'WidgetSlots',
              emits: null,
              sfc: 'Widget.vue',
            },
          ],
        },
      }),
    ).toThrow(/cannot resolve type/)
  })

  it('reports a missing section instead of checking nothing', () => {
    const result = check({ docs: DOCS.replace('## Widget\n', '## Widgets\n') })
    expect(problemsOf(result)).toContain('has no section `## Widget`')
  })

  describe('prose that quotes a number from another contract', () => {
    const withCounts = (docs) => ({
      docs,
      spec: {
        gatedCounts: {
          files: ['api.md'],
          pattern: /(\d+)\s*项门禁/g,
          expected: 12,
          label: 'contrast checks',
        },
      },
    })

    it('accepts the number the contract actually gates', () => {
      const result = check(withCounts(`${DOCS}\n共 12 项门禁。\n`))
      expect(result.problems).toEqual([])
    })

    it('rejects a stale number', () => {
      const result = check(withCounts(`${DOCS}\n共 10 项门禁。\n`))
      expect(problemsOf(result)).toContain('documents 10 contrast checks')
    })

    it('rejects a page that stops quoting the number at all', () => {
      const result = check(withCounts(DOCS))
      expect(problemsOf(result)).toContain('states no contrast checks')
    })
  })
})

/* ------------------------------------------------------------------ *
 * The readers themselves
 * ------------------------------------------------------------------ */

describe('the api-docs readers', () => {
  it('masks comments without moving anything', () => {
    const source = 'export interface A {\n  /** { not: "code", it: doesn\'t } */\n  a?: string\n}\n'
    const registry = parseTypeSource(source)
    expect(registry.interfaces.get('A').members.map((member) => member.name)).toEqual(['a'])
  })

  it('splits members at the top level only', () => {
    expect(splitMembers('a: string; b: { c: number; d: number }; e: () => void')).toEqual([
      'a: string',
      'b: { c: number; d: number }',
      'e: () => void',
    ])
  })

  it('splits on commas when the body is an object type', () => {
    expect(splitMembers('a: string, b: [x: number]', { commas: true })).toEqual([
      'a: string',
      'b: [x: number]',
    ])
  })

  it('reads optional and quoted members', () => {
    expect(parseMember('size?: string')).toEqual({ name: 'size', optional: true })
    expect(parseMember("'update:modelValue': [value: string]")).toEqual({
      name: 'update:modelValue',
      optional: false,
    })
    expect(parseMember('(event: "click"): void')).toBeNull()
  })

  it('parses extends with and without Omit', () => {
    expect(parseExtends('extends A')).toEqual([{ name: 'A', omit: [] }])
    expect(parseExtends("extends Omit<B, 'x' | 'y'>")).toEqual([{ name: 'B', omit: ['x', 'y'] }])
  })

  it('follows a single-line alias to its interface', () => {
    const registry = parseTypeSource('export interface A { a?: string }\nexport type B = A\n')
    expect(resolveInterface(registry, 'B').all.map((member) => member.name)).toEqual(['a'])
  })

  it('reads the props type, emits, prop accesses, slot names and prop spreading of an SFC', () => {
    const sfc = `<script setup lang="ts">
const props = withDefaults(defineProps<Thing>(), { a: 1 })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { a: _a, ...rest } = props
</script>
<template><div><slot name="leading" /><slot /></div></template>`
    expect(sfcPropsType(sfc)).toBe('Thing')
    expect(sfcEmitNames(sfc)).toEqual(['update:modelValue'])
    expect(sfcPropAccesses(sfc)).toEqual([])
    expect(sfcForwardsAllProps(sfc)).toBe(true)
    expect(sfcSlotNames(sfc).sort()).toEqual(['default', 'leading'])
  })

  it('reads markdown sections and the first column of their tables', () => {
    const sections = markdownSections('# T\n\n## A\n\n| x |\n| --- |\n| `one` |\n| two |\n\n## B\n')
    expect([...sections.keys()]).toEqual(['A', 'B'])
    expect(markdownTableRows(sections.get('A'))).toEqual([['`one`'], ['two']])
    expect(documentedNames(sections.get('A'))).toEqual(['one', 'two'])
  })

  it('returns no rows for a section without a table', () => {
    expect(documentedNames('just prose')).toEqual([])
  })
})
