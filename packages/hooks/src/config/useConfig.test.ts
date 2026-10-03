import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { DEFAULT_YUE_CONFIG } from './types.js'
import { yueConfigKey } from './injection.js'
import { installYueConfig, provideYueConfig, useConfig } from './useConfig.js'
import type { YueConfig, YueConfigInput } from './types.js'

/**
 * `provide()` writes to the current instance and `inject()` reads the *parent*
 * chain, so a configuration provided and consumed by the same component would
 * never be seen. These helpers always provide in a parent and read in a child —
 * the same shape a real component tree has.
 */
function readUnderProvide(config: Partial<YueConfig>, read: () => unknown) {
  let seen: unknown
  const Child = defineComponent({
    setup() {
      seen = read()
      return () => h('i')
    },
  })
  const Parent = defineComponent({
    setup() {
      provideYueConfig(config)
      return () => h(Child)
    },
  })
  mount(Parent)
  return seen
}

/** Silence an expected warning while asserting it was emitted. */
function captureWarnings() {
  return vi.spyOn(console, 'warn').mockImplementation(() => {})
}

describe('useConfig', () => {
  it('returns the defaults outside a component', () => {
    // A composable used at module scope or in a plain unit test must not warn and
    // must not return undefined.
    expect(useConfig()).toEqual(DEFAULT_YUE_CONFIG)
  })

  it('returns a fresh object, so a caller cannot mutate the shared default', () => {
    const first = useConfig()
    first.size = 'lg'
    expect(useConfig().size).toBe(DEFAULT_YUE_CONFIG.size)
  })

  it('always resolves to a complete configuration', () => {
    // The injection key is exported, so a caller can provide a bare object through
    // `provide:` directly. The resolved shape must still carry every key.
    expect(readUnderProvide({ size: 'lg' } as never, useConfig)).toEqual({ size: 'lg' })
    expect(readUnderProvide({} as never, useConfig)).toEqual({ size: 'md' })
  })

  it('reads the configuration a parent provided', () => {
    // Compared against the whole resolved shape rather than just `size`: a resolved
    // config always carries every top-level key, so asserting a partial object would
    // quietly stop noticing a key that stopped being provided.
    expect(readUnderProvide({ size: 'lg' }, useConfig)).toEqual({ size: 'lg' })
  })

  it('lets an app-wide configuration reach a component through inject', () => {
    let seen: unknown
    const Host = defineComponent({
      setup() {
        seen = useConfig()
        return () => h('i')
      },
    })
    mount(Host, { global: { provide: { [yueConfigKey]: { size: 'sm' } } } })

    expect(seen).toEqual({ size: 'sm' })
  })

  it('returns the resolved configuration when it is not in a component', () => {
    // `provideYueConfig` must stay usable from a plain helper, where `provide()`
    // would warn.
    expect(provideYueConfig({ size: 'sm' })).toEqual({ size: 'sm' })
  })

  it('ignores an explicitly undefined option instead of wiping the default', () => {
    // The plugin forwards a destructured options object, so `size` is often present and
    // undefined. Spreading it would resolve to `{ size: undefined }`, which no component can
    // tell from "no configuration" — it renders `yue-button--undefined`.
    expect(provideYueConfig({ size: undefined })).toEqual({ size: 'md' })
    expect(installYueConfig({ provide: () => {} } as never, { size: undefined })).toEqual({
      size: 'md',
    })
  })

  it('has exactly one option, and no way to change the class namespace', () => {
    // The regression guard for the defect this file exists to prevent: a
    // configurable namespace renders classes the prebuilt stylesheet cannot match.
    // `size` is the whole configuration surface — text moved to the locale instance,
    // which is a separate mechanism with its own tests.
    expect(Object.keys(DEFAULT_YUE_CONFIG)).toEqual(['size'])
    expect(Object.isFrozen(DEFAULT_YUE_CONFIG)).toBe(true)
  })
})

describe('nesting and inheritance', () => {
  /**
   * Mount a two-level tree and report what the innermost component sees.
   *
   * `outer` and `inner` are the two `provideYueConfig()` calls; an undefined one is not
   * called at all, so a level can be absent. The app-level config is supplied as `size: 'sm'`
   * through the injection key, standing in for `app.use(YueUI, { size: 'sm' })`.
   */
  function readNested(outer: YueConfigInput | undefined, inner: YueConfigInput | undefined) {
    let seen: YueConfig | undefined
    const Innermost = defineComponent({
      setup() {
        seen = useConfig()
        return () => h('i')
      },
    })
    const level = (config: YueConfigInput | undefined) =>
      defineComponent({
        setup(_, { slots }) {
          if (config) provideYueConfig(config)
          return () => slots.default?.()
        },
      })
    const Outer = level(outer)
    const Inner = level(inner)

    mount(
      defineComponent({
        render: () =>
          h(Outer, null, { default: () => h(Inner, null, { default: () => h(Innermost) }) }),
      }),
      { global: { provide: { [yueConfigKey]: { size: 'sm' } } } },
    )
    if (!seen) throw new Error('the innermost component never read the configuration')
    return seen
  }

  it('inherits the parent configuration instead of restarting from the defaults', () => {
    // Merging onto the defaults instead of onto what the subtree already sees would
    // revert an app-level `size: 'sm'` to `md` for any subtree that provides anything.
    expect(readNested(undefined, {}).size).toBe('sm')
  })

  it('lets an inner provider override one option and keep the others', () => {
    expect(readNested({ size: 'lg' }, {}).size).toBe('lg')
  })

  it('lets an inner provider override an inherited option', () => {
    expect(readNested({ size: 'lg' }, { size: 'sm' }).size).toBe('sm')
  })

  it('resolves from the defaults when called outside a component', () => {
    // There is no parent to inherit from, so `{}` yields exactly the defaults.
    expect(provideYueConfig()).toEqual(DEFAULT_YUE_CONFIG)
  })
})

describe('unsupported configuration keys', () => {
  it('rejects a namespace option at the type level', () => {
    // The primary guard, and a two-way one: re-adding `prefix` to `YueConfig`
    // would make these directives unused, which is itself a compile error.
    // @ts-expect-error `prefix` is not a supported option.
    provideYueConfig({ prefix: 'app' })
    // @ts-expect-error `namespace` is not a supported option.
    installYueConfig({ provide: () => {} } as never, { namespace: 'app' })
    // @ts-expect-error `messages` is not a configuration option any more.
    provideYueConfig({ messages: { clear: 'Clear' } })
  })

  it('explains why a namespace cannot be configured', () => {
    const warn = captureWarnings()

    // Cast through `unknown`: a plain-JavaScript caller, or an options object
    // built from JSON, can reach this without the type system intervening — which
    // is exactly the case the warning is for.
    provideYueConfig({ prefix: 'app' } as unknown as Partial<YueConfig>)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('fixed to "yue"'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unstyled'))
    warn.mockRestore()
  })

  it('routes a namespace provided to the plugin through the same explanation', () => {
    const warn = captureWarnings()
    const app = { provide: () => {} }

    installYueConfig(app as never, { namespace: 'app' } as unknown as Partial<YueConfig>)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('fixed to "yue"'))
    warn.mockRestore()
  })

  it('names the locale contract when a caller still passes `messages`', () => {
    // The removed option is the one a migration will actually hit, and its failure mode
    // without a warning is silent: the strings are simply ignored and the UI falls back to
    // the shipped language. So the message says where the text went, not just "unknown key".
    const warn = captureWarnings()

    provideYueConfig({ messages: { clear: 'Clear' } } as unknown as Partial<YueConfig>)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('locale instance'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('provideLocale'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('04-yue-i18n-rfc'))
    warn.mockRestore()
  })

  it('reports an unknown key as a typo, listing the supported options', () => {
    const warn = captureWarnings()

    provideYueConfig({ szie: 'lg' } as unknown as Partial<YueConfig>)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown config option `szie`'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Supported options: size'))
    warn.mockRestore()
  })

  it('stays silent for a supported configuration', () => {
    const warn = captureWarnings()

    provideYueConfig({ size: 'lg' })
    installYueConfig({ provide: () => {} } as never, { size: 'md' })
    installYueConfig({ provide: () => {} } as never)

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('installYueConfig', () => {
  it('registers the configuration on the app', () => {
    const provided: Array<[unknown, unknown]> = []
    const app = { provide: (key: unknown, value: unknown) => provided.push([key, value]) }

    const resolved = installYueConfig(app as never, { size: 'sm' })

    // What is registered is the *resolved* config, not the caller's partial object —
    // otherwise every consumer would have to merge the defaults again on read.
    expect(resolved).toEqual({ size: 'sm' })
    expect(provided).toEqual([[yueConfigKey, { size: 'sm' }]])
  })

  it('uses a Symbol, not a string, as the injection key', () => {
    // The documented contract: string keys collide between libraries.
    expect(typeof yueConfigKey).toBe('symbol')
  })

  it('registers the key in the global symbol registry, so every copy shares it', () => {
    // This is what makes configuration work across the package boundary. `@yue-ui/vue`
    // compiles this package into its bundle, so the key exists twice in a real install;
    // `Symbol('yue:config')` would produce two different symbols and `inject()` matches by
    // identity. The failure would be silent — `inject(key, fallback)` treats a mismatched
    // key exactly like nothing provided — so the registry is asserted rather than assumed.
    expect(Symbol.keyFor(yueConfigKey)).toBe('yue:config')
    expect(yueConfigKey).toBe(Symbol.for('yue:config'))
  })

  it('is the same key a second copy of this module would produce', async () => {
    // Simulates the two-copy situation by re-importing the module fresh: module state is
    // per-registry, but the symbol registry is global, so a re-evaluated module must hand
    // back an identical key.
    vi.resetModules()
    const reloaded = await import('./injection.js')
    expect(reloaded.yueConfigKey).toBe(yueConfigKey)
  })
})
