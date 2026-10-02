import { getCurrentInstance, inject, provide } from 'vue'
import type { App } from 'vue'
import { yueConfigKey } from './injection.js'
import { DEFAULT_YUE_CONFIG } from './types.js'
import type { YueConfig } from './types.js'

/** Merge a partial configuration onto the defaults. */
function resolveConfig(config: Partial<YueConfig>): YueConfig {
  return { ...DEFAULT_YUE_CONFIG, ...config }
}

/**
 * Report configuration keys the library does not understand.
 *
 * `prefix` gets a message of its own rather than the generic typo warning,
 * because it is the one key a reasonable person expects to exist and its failure
 * mode is invisible: the component would render `.app-button` while the prebuilt
 * stylesheet only ever matches `.yue-button`, so the button silently loses every
 * rule. Naming the reason here is the difference between a five-minute fix and an
 * afternoon of CSS debugging.
 *
 * `Record<string, unknown>` rather than `Partial<YueConfig>` on purpose: the whole
 * point is to be reachable by callers the type system cannot help — plain
 * JavaScript, or an options object assembled from JSON.
 *
 * The warning is not gated behind a development flag. `@yue-ui/hooks` is compiled
 * by `tsc`, not by a bundler's define step, so `import.meta.env` would either
 * survive into the published JavaScript (and break a plain browser) or be read
 * from an object that does not exist. It is also a programming-error warning: it
 * never fires for correct usage, and a consumer who passes an unsupported key
 * wants to know in every environment.
 */
function warnAboutUnknownKeys(config: Record<string, unknown>) {
  const unknown = Object.keys(config).filter((key) => !(key in DEFAULT_YUE_CONFIG))
  if (unknown.length === 0) return

  for (const key of unknown) {
    if (key === 'prefix' || key === 'namespace') {
      console.warn(
        `[yue] \`${key}\` is not a supported option: the component class namespace is fixed to ` +
          `"yue". The stylesheet that matches those classes ships prebuilt, and a CSS selector ` +
          `cannot be assembled from a runtime value — a configurable prefix would render classes ` +
          `no rule matches, leaving every component unstyled. Changing the namespace is a ` +
          `build-time change to the stylesheet, not a runtime option.`,
      )
    } else {
      console.warn(
        `[yue] unknown config option \`${key}\`. Supported options: ` +
          `${Object.keys(DEFAULT_YUE_CONFIG).join(', ')}.`,
      )
    }
  }
}

/**
 * Read the active Yue configuration.
 *
 * Returns a fresh copy of the defaults when called outside a component (module
 * scope, a unit test, a plain function). That matters for two reasons: `inject()`
 * outside `setup()` warns and returns `undefined`, and handing out the shared
 * frozen default would let one caller's mutation leak into every other one.
 */
export function useConfig(): YueConfig {
  if (!getCurrentInstance()) return { ...DEFAULT_YUE_CONFIG }
  return { ...inject(yueConfigKey, DEFAULT_YUE_CONFIG) }
}

/**
 * Provide configuration to a component subtree.
 * @returns the resolved configuration, so the provider can reuse it.
 */
export function provideYueConfig(config: Partial<YueConfig> = {}): YueConfig {
  warnAboutUnknownKeys(config)
  const resolved = resolveConfig(config)
  // `provide()` also warns outside `setup()`; returning the value keeps this
  // usable in a plain helper.
  if (getCurrentInstance()) provide(yueConfigKey, resolved)
  return resolved
}

/**
 * Provide configuration to an entire application, which outlives any component
 * subtree and is therefore how a host app configures the library:
 *
 * ```ts
 * app.use(YueUI, { size: 'sm' })
 * ```
 */
export function installYueConfig(app: App, config: Partial<YueConfig> = {}): YueConfig {
  warnAboutUnknownKeys(config)
  const resolved = resolveConfig(config)
  app.provide(yueConfigKey, resolved)
  return resolved
}
