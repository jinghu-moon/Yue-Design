import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  compileSelector,
  createResolver,
  loadTokenSheet,
  parseCss,
} from '../tools/lib/css-tokens.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TOKENS_ENTRY = resolve(REPO_ROOT, 'packages/tokens/src/index.css')

const profile = (theme, accent = 'azure') => ({ theme, accent, id: `${theme}/${accent}` })
const light = profile('light')
const dark = profile('dark')
const lightNeutral = profile('light', 'neutral')

const resolverFor = (css) => createResolver(parseCss(css, { file: 'fixture.css' }))

describe('compileSelector', () => {
  it('models the selectors used by the token sheets', () => {
    expect(compileSelector(':root').matches(light)).toBe(true)
    expect(compileSelector('[data-theme=dark]').matches(dark)).toBe(true)
    expect(compileSelector('[data-theme=dark]').matches(light)).toBe(false)
    expect(compileSelector('[data-theme="dark"]').matches(dark)).toBe(true)
    expect(compileSelector('[data-accent=neutral]').matches(lightNeutral)).toBe(true)
    expect(compileSelector('[data-accent=neutral]').matches(light)).toBe(false)
  })

  it('requires every part of a compound selector to match', () => {
    const compound = compileSelector('[data-accent=neutral][data-theme=dark]')
    expect(compound.matches(profile('dark', 'neutral'))).toBe(true)
    expect(compound.matches(dark)).toBe(false)
    expect(compound.matches(lightNeutral)).toBe(false)
  })

  it('scores specificity like CSS does', () => {
    expect(compileSelector(':root').specificity).toBe(10)
    expect(compileSelector('[data-theme=dark]').specificity).toBe(10)
    expect(compileSelector('[data-accent=neutral][data-theme=dark]').specificity).toBe(20)
  })

  it('refuses selectors it cannot model instead of ignoring them', () => {
    expect(() => compileSelector('.btn')).toThrow(/unsupported selector/)
    expect(() => compileSelector('#app')).toThrow(/unsupported selector/)
    expect(() => compileSelector('div span')).toThrow(/unsupported selector/)
    expect(() => compileSelector('[data-density=compact]')).toThrow(/unsupported selector/)
    expect(() => compileSelector(':root > *')).toThrow(/unsupported selector/)
  })
})

describe('cascade model', () => {
  it('lets layer order outrank specificity', () => {
    const resolver = resolverFor(`
      @layer low, high;
      @layer low { [data-accent=neutral][data-theme=dark] { --probe: specific-but-low-layer; } }
      @layer high { :root { --probe: later-layer; } }
    `)
    expect(resolver.value('--probe', profile('dark', 'neutral'))).toBe('later-layer')
  })

  it('applies specificity inside a layer, then source order', () => {
    const resolver = resolverFor(`
      :root { --probe: base; }
      [data-theme=dark] { --probe: themed; }
      :root { --other: first; }
      :root { --other: second; }
    `)
    expect(resolver.value('--probe', light)).toBe('base')
    expect(resolver.value('--probe', dark)).toBe('themed')
    expect(resolver.value('--other', light)).toBe('second')
  })

  it('lets unlayered declarations outrank every layer', () => {
    const resolver = resolverFor(`
      @layer a;
      @layer a { :root { --probe: layered; } }
      :root { --probe: unlayered; }
    `)
    expect(resolver.value('--probe', light)).toBe('unlayered')
  })

  it('keeps accent overrides scoped to their profile', () => {
    const resolver = resolverFor(`
      :root { --accent-solid: #1f75db; }
      [data-accent=neutral] { --accent-solid: #1f1f1f; }
      [data-accent=neutral][data-theme=dark] { --accent-solid: #f5f5f5; }
    `)
    expect(resolver.value('--accent-solid', light)).toBe('#1f75db')
    expect(resolver.value('--accent-solid', lightNeutral)).toBe('#1f1f1f')
    expect(resolver.value('--accent-solid', profile('dark', 'neutral'))).toBe('#f5f5f5')
    expect(resolver.value('--accent-solid', dark)).toBe('#1f75db')
  })

  it('excludes conditional blocks from profile resolution', () => {
    const resolver = resolverFor(`
      :root { --probe: base; }
      @media (forced-colors: active) { :root { --probe: forced; } }
    `)
    expect(resolver.value('--probe', light)).toBe('base')
  })
})

describe('variable resolution', () => {
  it('follows reference chains and uses fallbacks', () => {
    const resolver = resolverFor(`
      :root {
        --base: #1f1f1f;
        --alias: var(--base);
        --deep: color-mix(in srgb, var(--alias) calc(.08*100%), transparent);
        --fallback: var(--absent, 12px);
      }
    `)
    expect(resolver.value('--alias', light)).toBe('#1f1f1f')
    expect(resolver.value('--deep', light)).toBe(
      'color-mix(in srgb, #1f1f1f calc(.08*100%), transparent)',
    )
    expect(resolver.value('--fallback', light)).toBe('12px')
  })

  it('detects cycles instead of looping forever', () => {
    const resolver = resolverFor(':root { --a: var(--b); --b: var(--a); }')
    expect(() => resolver.value('--a', light)).toThrow(/circular token reference/)
  })

  it('reports unresolved references with the declaring file', () => {
    const resolver = resolverFor(':root { --a: var(--nope); }')
    expect(() => resolver.value('--a', light)).toThrow(/unresolved reference: var\(--nope\)/)
  })

  it('reports tokens that are missing from a profile', () => {
    const resolver = resolverFor(':root { --a: #fff; }')
    expect(() => resolver.value('--missing', light)).toThrow(/is not defined for light\/azure/)
  })
})

describe('parser strictness', () => {
  it('rejects !important, which would invert layer order', () => {
    expect(() => parseCss(':root { --a: #fff !important; }')).toThrow(/uses !important/)
  })

  it('rejects at-rules it does not model', () => {
    expect(() => parseCss('@container (width > 10px) { :root { --a: #fff; } }')).toThrow(
      /unsupported at-rule/,
    )
    expect(() => parseCss('@property --a { syntax: "*"; }')).toThrow(/unsupported at-rule/)
  })

  it('rejects unsupported selectors unless explicitly allowed', () => {
    expect(() => parseCss('.btn { --a: #fff; }')).toThrow(/unsupported selector/)
    expect(() =>
      parseCss('.btn { --a: #fff; }', { allowUnsupportedSelectors: true }),
    ).not.toThrow()
  })

  it('ignores @font-face bodies', () => {
    const sheet = parseCss(
      "@font-face { font-family: X; src: url('./x.woff2') } :root { --a: #fff; }",
    )
    expect(sheet.declarations.map((entry) => entry.name)).toEqual(['--a'])
  })
})

describe('the real token package', () => {
  it('loads the layer entries in declared cascade order', () => {
    const sheet = loadTokenSheet({ entry: TOKENS_ENTRY })
    expect(sheet.layerOrder).toEqual([
      'primitives',
      'semantics',
      'components',
      'implementations',
      'demo',
    ])
    // The entry file comes first, and every layer is reached through its own entry — a flat sheet
    // before the split, a directory entry after it. The exact file list is deliberately *not*
    // asserted: Phase 2 of the token refactor splits the sheets into per-namespace and per-category
    // files, and a test that pins the list has to be edited at the same moment the files move — which
    // is how a layout change starts looking like a behaviour change.
    const fromSrc = sheet.files.map((file) => file.replaceAll('\\', '/').split('/src/')[1] ?? file)
    expect(fromSrc[0]).toBe('index.css')
    expect(fromSrc).toContain('component-tokens/_index.css')
    for (const file of fromSrc.slice(1)) {
      expect(file).toMatch(/^(primitives|semantics|component-tokens)(\/|\.css$)/)
    }
  })

  it('exposes every token in both themes with nothing unresolved', () => {
    const resolver = createResolver(loadTokenSheet({ entry: TOKENS_ENTRY }))
    expect(resolver.names(light).length).toBeGreaterThan(400)
    expect(resolver.names(dark).length).toBe(resolver.names(light).length)
    for (const name of resolver.names(light)) {
      expect(resolver.tryValue(name, light), name).toMatchObject({ ok: true })
    }
  })

  it('resolves chained references to literal values', () => {
    const resolver = createResolver(loadTokenSheet({ entry: TOKENS_ENTRY }))
    expect(resolver.value('--text-primary', light)).toBe('#1f1f1f')
    expect(resolver.value('--surface', light)).toBe('#fff')
    expect(resolver.value('--accent-solid', light)).toBe('#1f75db')
    expect(resolver.value('--accent-solid', lightNeutral)).toBe('#1f1f1f')
  })
})
