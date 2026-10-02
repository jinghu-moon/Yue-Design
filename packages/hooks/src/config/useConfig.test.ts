import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { DEFAULT_YUE_CONFIG } from './types.js'
import { yueConfigKey } from './injection.js'
import { installYueConfig, provideYueConfig, useConfig } from './useConfig.js'
import type { YueConfig } from './types.js'

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

  it('reads the configuration a parent provided', () => {
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

  it('has no way to change the class namespace', () => {
    // The regression guard for the defect this file exists to prevent: a
    // configurable namespace renders classes the prebuilt stylesheet cannot match.
    expect(Object.keys(DEFAULT_YUE_CONFIG)).toEqual(['size'])
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

    expect(resolved).toEqual({ size: 'sm' })
    expect(provided).toEqual([[yueConfigKey, { size: 'sm' }]])
  })

  it('uses a Symbol, not a string, as the injection key', () => {
    // The documented contract: string keys collide between libraries.
    expect(typeof yueConfigKey).toBe('symbol')
  })
})
