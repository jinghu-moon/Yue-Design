import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { checkTokenArchitecture } from '../tools/lib/token-architecture.mjs'

/**
 * The token architecture gate, proved able to fail.
 *
 * Every rule here exists because a real defect got through every other gate. The Tag component
 * shipped with undefined sizes, an undefined focus ring and a pill radius on its "square" shape
 * while `audit:tokens`, `test` and `verify:visual` were all green — the values existed, in a file
 * the public entry never imported.
 *
 * So each case below plants that exact defect in a throwaway package and asserts the gate names it.
 * A rule that stopped being able to fail would make `verify` greener without making the package
 * correct, which is the failure mode this file is here to prevent.
 */
const temporary = []
afterAll(() => {
  for (const dir of temporary) rmSync(dir, { recursive: true, force: true })
})

const CATALOGUE = `/* @yue-token-catalogue v1
 *
 *   token- | test tokens | public
 */
`

/** Build a minimal token package (plus a consumer) and return its root. */
function fixture({
  entry = "@layer primitives, semantics, components, implementations, demo;\n@import url('./primitives.css') layer(primitives);\n@import url('./semantics.css') layer(semantics);\n@import url('./components.css') layer(components);\n",
  files = {},
  manifest = {
    name: '@yue-fixture/tokens',
    exports: {
      '.': './src/index.css',
      './index.css': './src/index.css',
      './components.css': './src/components.css',
      './implementations.css': './src/implementations.css',
    },
  },
  consumer = {},
  writeManifest = true,
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'yue-token-architecture-'))
  temporary.push(root)

  const write = (base, relative_, content) => {
    const file = join(root, base, relative_)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, content, 'utf8')
  }

  write('packages/tokens', 'src/index.css', entry)
  write('packages/tokens', 'src/primitives.css', ':root {\n  --size-1: 1px;\n}\n')
  write('packages/tokens', 'src/semantics.css', ':root {\n  --surface: var(--size-1);\n}\n')
  write('packages/tokens', 'src/components.css', `${CATALOGUE}:root {\n  --token-a: var(--surface);\n}\n`)
  write('packages/tokens', 'src/implementations.css', "@import url('./components/legacy.css') layer(implementations);\n")
  write('packages/tokens', 'src/components/legacy.css', '.legacy {\n  --slot: var(--token-a);\n  color: var(--slot);\n}\n')
  if (writeManifest) write('packages/tokens', 'package.json', JSON.stringify(manifest, null, 2))
  for (const [relative_, content] of Object.entries(files)) write('packages/tokens', relative_, content)
  for (const [relative_, content] of Object.entries(consumer)) write('packages/vue', relative_, content)

  return root
}

const check = (root) =>
  checkTokenArchitecture({
    repoRoot: root,
    packageDir: 'packages/tokens',
    consumerDir: 'packages/vue/src',
  })

describe('token architecture gate', () => {
  it('accepts a package where every declaration is reachable and used correctly', () => {
    const result = check(fixture())
    expect(result.problems).toEqual([])
    expect(result.stats.unreachable).toBe(0)
  })

  it('detects a declaration the public entry cannot reach', () => {
    // The Tag defect: the tokens exist in the implementation layer, and the components layer
    // declares the same names with different values.
    const root = fixture({
      files: {
        'src/components/tag.css': ':root {\n  --tag-height-md: 24px;\n}\n',
      },
      entry:
        "@layer primitives, semantics, components, implementations, demo;\n" +
        "@import url('./primitives.css') layer(primitives);\n" +
        "@import url('./semantics.css') layer(semantics);\n" +
        "@import url('./components.css') layer(components);\n",
    })
    const result = check(root)
    expect(result.problems.join('\n')).toContain('unreachable token declaration: --tag-height-md')
  })

  it('detects a token a component uses but nobody declares', () => {
    // `--tag-focus-ring-width` was referenced by the CheckTag stylesheet and declared nowhere the
    // public entry could see, so the focus ring silently did not render.
    const root = fixture({
      consumer: {
        'src/components/tag/style.css': '.yue-tag:focus-visible {\n  outline: var(--tag-focus-ring-width) solid red;\n}\n',
      },
    })
    const result = check(root)
    expect(result.problems.join('\n')).toContain('undeclared token')
    expect(result.problems.join('\n')).toContain('--tag-focus-ring-width')
  })

  it('detects the same token declared in two files', () => {
    const root = fixture({
      files: { 'src/semantics.css': ':root {\n  --surface: var(--size-1);\n  --token-a: var(--size-1);\n}\n' },
    })
    const result = check(root)
    expect(result.problems.join('\n')).toContain('duplicate token declaration: --token-a')
  })

  it('detects a lower layer depending on a higher one', () => {
    // `semantics.css` used to do `--list-row-background-hover: var(--button-ghost-background-hover)`.
    const root = fixture({
      files: { 'src/semantics.css': ':root {\n  --list-row-background-hover: var(--token-a);\n}\n' },
    })
    const result = check(root)
    expect(result.problems.join('\n')).toContain('layer direction')
    expect(result.stats.layerViolations).toBe(1)
  })

  it('detects a private slot used from another file', () => {
    const root = fixture({
      files: { 'src/components/other.css': '.other {\n  color: var(--slot);\n}\n' },
    })
    const result = check(root)
    expect(result.problems.join('\n')).toContain('private slot used across files')
  })

  it('detects an export that exposes the internal source tree', () => {
    // Phase 5 removed the `./src/*` wildcard: every internal file split would otherwise become part of
    // the public contract.
    const root = fixture({
      manifest: {
        name: '@yue-fixture/tokens',
        exports: {
          './index.css': './src/index.css',
          './implementations.css': './src/implementations.css',
          './src/*': './src/*',
        },
      },
    })
    const result = check(root)
    expect(result.problems.join('\n')).toContain('exposes the internal source tree')
  })

  it('detects an implementations entry that declares tokens', () => {
    // Selectors and declarations belong to different entries; the archive must stay declaration-free.
    const root = fixture({
      manifest: {
        name: '@yue-fixture/tokens',
        exports: {
          './index.css': './src/index.css',
          './implementations.css': './src/implementations.css',
        },
      },
    })
    writeFileSync(
      join(root, 'packages/tokens/src/implementations.css'),
      ":root { --accidental-token: 1px; }\n.legacy { color: red; }\n",
      'utf8',
    )
    const result = check(root)
    expect(result.problems.join('\n')).toContain('declares 1 token(s)')
  })

  it('detects an export that points at a file which does not exist', () => {
    const root = fixture({
      manifest: {
        name: '@yue-fixture/tokens',
        exports: { './index.css': './src/index.css', './missing.css': './src/missing.css' },
      },
    })
    const result = check(root)
    expect(result.problems.join('\n')).toContain('does not exist')
  })

  it('detects a token with no catalogue group', () => {
    const root = fixture({
      files: { 'src/components.css': `${CATALOGUE}:root {\n  --orphan: 1px;\n}\n` },
    })
    const result = check(root)
    expect(result.problems.join('\n')).toContain('--orphan belongs to no group')
  })

  it('detects a catalogue group with no tokens', () => {
    const root = fixture({
      files: { 'src/components.css': `${CATALOGUE.replace('  token- | test tokens | public', '  token- | test tokens | public\n *   ghost- | nothing here | public')}:root {\n  --token-a: var(--surface);\n}\n` },
    })
    const result = check(root)
    expect(result.problems.join('\n')).toContain('group "ghost-" in')
    expect(result.problems.join('\n')).toContain('has no tokens')
  })

  it('detects a missing catalogue block', () => {
    const root = fixture({
      files: { 'src/components.css': ':root {\n  --token-a: var(--surface);\n}\n' },
    })
    const result = check(root)
    expect(result.problems.join('\n')).toContain('@yue-token-catalogue')
  })
})

describe('the gate understands the target layout before any file moves', () => {
  /**
   * Phase 1 of `docs/05-yue-token-refactor-plan.md`: the gates must describe the *target* directory
   * layout first, because a gate that only knows the current one has to be rewritten at the same
   * moment the files move — and then nothing is checking the move.
   *
   * This fixture is the target layout in miniature: three layers under `_index.css` entries, no
   * `layer()` wrapper on the inner imports (the entry carries it), the catalogue split across two
   * component-token files, and the prototype selectors under `prototype/`.
   */
  function targetLayout({ componentTokens = {}, catalogueSuffix = '' } = {}) {
    const root = mkdtempSync(join(tmpdir(), 'yue-token-target-'))
    temporary.push(root)
    const write = (relative_, content) => {
      const file = join(root, 'packages/tokens', relative_)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, content, 'utf8')
    }

    write(
      'src/index.css',
      "@layer primitives, semantics, components, implementations, demo;\n" +
        "@import url('./primitives/_index.css') layer(primitives);\n" +
        "@import url('./semantics/_index.css') layer(semantics);\n" +
        "@import url('./component-tokens/_index.css') layer(components);\n",
    )
    // The layer lives on the entry only; the inner imports deliberately carry no wrapper.
    write('src/primitives/_index.css', "@import url('./space.css');\n")
    write('src/primitives/space.css', ':root {\n  --space-4: 4px;\n}\n')
    write('src/semantics/_index.css', "@import url('./surface.css');\n")
    write('src/semantics/surface.css', ':root {\n  --surface: var(--space-4);\n}\n')
    write(
      'src/component-tokens/_index.css',
      "@import url('./button.css');\n@import url('./input.css');\n" +
        // Extra files are imported too, so a fixture can place a token in a *reachable* file and test
        // the catalogue rule rather than accidentally testing reachability.
        Object.keys(componentTokens)
          .map((name) => `@import url('./${name}');\n`)
          .join(''),
    )
    write(
      'src/component-tokens/button.css',
      '/* @yue-token-catalogue v1\n *\n *   button- | button contract | public\n */\n' +
        ':root {\n  --button-height-md: var(--space-4);\n}\n',
    )
    write(
      'src/component-tokens/input.css',
      "/* @yue-token-catalogue v1\n *\n *   input- | input contract | public\n */\n" +
        `:root {\n  --input-border-radius: var(--space-4);${catalogueSuffix}\n}\n`,
    )
    for (const [name, content] of Object.entries(componentTokens)) {
      write(`src/component-tokens/${name}`, content)
    }
    write(
      'src/implementations.css',
      "@import url('./prototype/button.css') layer(implementations);\n",
    )
    write('src/prototype/button.css', '.btn {\n  --bg: var(--button-height-md);\n  background: var(--bg);\n}\n')
    write(
      'package.json',
      JSON.stringify(
        {
          name: '@yue-fixture/tokens',
          exports: {
            '.': './src/index.css',
            './index.css': './src/index.css',
            './implementations.css': './src/implementations.css',
            './component-tokens/*.css': './src/component-tokens/*.css',
          },
        },
        null,
        2,
      ),
    )
    return root
  }

  it('accepts the target layout, including a catalogue split across files', () => {
    const result = check(targetLayout())
    expect(result.problems).toEqual([])
    // The nested imports must inherit the components layer from the entry, or the catalogue would be
    // invisible and every component token would read as uncatalogued.
    expect(result.stats.catalogueFiles).toBe(2)
    expect(result.stats.catalogueGroups).toBe(2)
  })

  it('still detects an uncatalogued token after the move', () => {
    const result = check(
      targetLayout({
        componentTokens: { 'badge.css': ':root {\n  --badge-background: var(--surface);\n}\n' },
      }),
    )
    const problems = result.problems.join('\n')
    expect(problems).toContain('--badge-background belongs to no group')
    // The file is reachable through the components entry, so this is a catalogue gap, not an
    // unreachable declaration — the two must not be confused.
    expect(problems).not.toContain('unreachable token declaration')
  })

  it('still detects a prototype file that declares a token after the move', () => {
    const result = check(
      targetLayout({
        componentTokens: {},
      }),
    )
    expect(result.problems).toEqual([])
    // Now break the rule the archive must obey: a `:root` declaration inside `prototype/`.
    const root = targetLayout()
    writeFileSync(
      join(root, 'packages/tokens/src/prototype/button.css'),
      ':root {\n  --btn-height: 32px;\n}\n.btn {\n  height: var(--btn-height);\n}\n',
      'utf8',
    )
    const broken = check(root)
    expect(broken.problems.join('\n')).toContain('unreachable token declaration: --btn-height')
  })
})

describe('the real package passes every architecture rule', () => {
  const result = checkTokenArchitecture({ repoRoot: process.cwd() })

  it('reports no problems', () => {
    expect(result.problems).toEqual([])
  })

  it('reports what it inspected, so a pass is not vacuous', () => {
    expect(result.stats.declared).toBeGreaterThan(500)
    expect(result.stats.catalogueGroups).toBeGreaterThan(10)
    expect(result.stats.unreachable).toBe(0)
    expect(result.stats.undeclared).toBe(0)
    expect(result.stats.duplicates).toBe(0)
    expect(result.stats.layerViolations).toBe(0)
  })
})
