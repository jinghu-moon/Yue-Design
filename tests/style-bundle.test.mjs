import { existsSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { bundleStyle } from '../packages/vue/scripts/build-style.mjs'

// Use real (platform-resolved) paths as fixture keys, so the bundler's own
// path resolution and the fake filesystem agree on Windows as well as POSIX.
const ROOT = resolve('/pkg/src')
const ENTRY = join(ROOT, 'style.css')
const at = (name) => join(ROOT, name)

/** In-memory filesystem so the bundler can be tested without touching disk. */
const fakeFs = (files) => ({
  read: (file) => {
    const key = file.replaceAll('\\', '/')
    if (!(key in files)) throw new Error(`ENOENT: ${key}`)
    return files[key]
  },
})

const normalise = (files) =>
  Object.fromEntries(Object.entries(files).map(([key, value]) => [key.replaceAll('\\', '/'), value]))

describe('style bundle', () => {
  it('inlines @import in declaration order', () => {
    const { css, files } = bundleStyle(
      ENTRY,
      fakeFs(
        normalise({
          [ENTRY]: "@import './a.css';\n@import './b.css';\n",
          [at('a.css')]: '.a { color: red }\n',
          [at('b.css')]: '.b { color: blue }\n',
        }),
      ),
    )
    expect(css).toBe('.a { color: red }\n\n.b { color: blue }\n\n')
    expect(files.map((file) => file.split(/[\\/]/).pop())).toEqual(['style.css', 'a.css', 'b.css'])
  })

  it('preserves layer() wrappers and url() forms', () => {
    const { css } = bundleStyle(
      ENTRY,
      fakeFs(
        normalise({
          [ENTRY]: '@import url("./a.css") layer(implementations);\n',
          [at('a.css')]: '.a { color: red }',
        }),
      ),
    )
    expect(css).toBe('@layer implementations {\n.a { color: red }\n}\n')
  })

  it('resolves nested imports relative to the importing file', () => {
    const { css } = bundleStyle(
      ENTRY,
      fakeFs(
        normalise({
          [ENTRY]: "@import './components/index.css';\n",
          [at('components/index.css')]: "@import './button.css';\n",
          [at('components/button.css')]: '.yue-button { height: 32px }\n',
        }),
      ),
    )
    expect(css).toBe('.yue-button { height: 32px }\n\n\n')
  })

  it('inlines a file only once', () => {
    const { css, files } = bundleStyle(
      ENTRY,
      fakeFs(normalise({ [ENTRY]: "@import './a.css';\n@import './a.css';\n", [at('a.css')]: '.a { color: red }' })),
    )
    expect(css.match(/\.a \{/g)).toHaveLength(1)
    expect(files).toHaveLength(2)
  })

  it('keeps non-import CSS untouched, including @layer blocks', () => {
    const source = '@layer implementations {\n.yue-button { height: var(--button-height-md) }\n}\n'
    const { css } = bundleStyle(ENTRY, fakeFs(normalise({ [ENTRY]: source })))
    expect(css).toBe(source)
  })

  it('ignores @import mentioned inside a comment', () => {
    const source = "/* load @import url('./never.css') elsewhere */\n.a { color: red }\n"
    const { css, files } = bundleStyle(ENTRY, fakeFs(normalise({ [ENTRY]: source })))
    expect(css).toBe(source)
    expect(files).toHaveLength(1)
  })

  it('fails the build on a missing import instead of dropping rules', () => {
    expect(() =>
      bundleStyle(ENTRY, fakeFs(normalise({ [ENTRY]: "@import './missing.css';\n" }))),
    ).toThrow(/cannot read .*missing\.css/)
  })
})

describe('the real component stylesheet entry', () => {
  const entry = fileURLToPath(new URL('../packages/vue/src/style.css', import.meta.url))
  const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

  it('pulls in one stylesheet per component, and nothing else', () => {
    // Derived from the filesystem rather than listed, so adding a component cannot
    // leave its stylesheet out of the aggregate sheet unnoticed: the test compares the
    // bundle against "every `src/components/*/style.css` that exists".
    const srcDir = fileURLToPath(new URL('../packages/vue/src', import.meta.url))
    const expected = readdirSync(join(srcDir, 'components'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `components/${entry.name}/style.css`)
      .filter((relativePath) => existsSync(join(srcDir, relativePath)))
      .sort()
    expect(expected.length).toBeGreaterThan(1)

    const { files } = bundleStyle(entry)
    const names = files.map((file) => relative(srcDir, file).replaceAll('\\', '/')).sort()
    expect(names).toEqual(['style.css', ...expected].sort())
  })

  it('never declares @layer, so a host reset cannot outrank the components', () => {
    // Unlayered CSS outranks every cascade layer regardless of specificity.
    // VitePress ships `button { background-color: transparent }`; if these rules
    // were in `@layer implementations` that reset would win and the Button would
    // render with no fill in the docs — which is exactly how this was found.
    // Declaring a layer *order* here would be worse still: it could create
    // `implementations` before `primitives` and invert the token cascade.
    const { css } = bundleStyle(entry)
    expect(stripComments(css)).not.toMatch(/@layer/i)
  })

  it('still emits the component rules themselves', () => {
    const { css } = bundleStyle(entry)
    expect(css).toContain('.yue-button')
    expect(css).toContain('.yue-button--solid')
  })
})
