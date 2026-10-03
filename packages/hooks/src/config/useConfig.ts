import { getCurrentInstance, inject, provide } from 'vue'
import type { App } from 'vue'
import { yueConfigKey } from './injection.js'
import { DEFAULT_YUE_CONFIG } from './types.js'
import type { YueConfig, YueConfigInput } from './types.js'

/**
 * Merge a partial configuration onto a *base*, which is not always the built-in defaults.
 *
 * The base matters. At the application level it is `DEFAULT_YUE_CONFIG`; for a subtree it
 * is whatever that subtree already sees, because `provideYueConfig()` is an **override**,
 * not a reset. Merging onto the defaults instead would make
 * `app.use(YueUI, { size: 'sm' })` followed by an unrelated `provideYueConfig({})` silently
 * revert the subtree to `size: 'md'`.
 *
 * Text is not part of this object any more: it lives in the locale instance
 * (`provideLocale()` / `useLocale()`), because a language is not a component option — see
 * `docs/04-yue-i18n-rfc.md`. Keeping the two mechanisms separate is what stops a subtree
 * that changes language from also having to restate its size.
 */
function resolveConfig(base: YueConfig, config: YueConfigInput): YueConfig {
  // `undefined` values are skipped rather than spread. A caller who forwards an options object
  // it did not author — the plugin does exactly that — would otherwise pass
  // `{ size: undefined }` and wipe the default, which surfaces as a class named
  // `yue-button--undefined` rather than as an error.
  const defined = Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== undefined),
  )
  return { ...base, ...defined }
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
 * `messages` gets its own message for the same reason: it *used* to be a configuration
 * option, and a caller who still passes it would otherwise lose their translations with no
 * indication of where they went.
 *
 * `object` rather than `Partial<YueConfig>` on purpose: the whole point is to be reachable
 * by callers the type system cannot help — plain JavaScript, or an options object
 * assembled from JSON. It is also why it is not `Record<string, unknown>`: an interface
 * gets no implicit index signature, so that spelling would have rejected the very
 * `YueConfigInput` this function is here to validate.
 *
 * The warning is not gated behind a development flag. `@yue-ui/hooks` is compiled
 * by `tsc`, not by a bundler's define step, so `import.meta.env` would either
 * survive into the published JavaScript (and break a plain browser) or be read
 * from an object that does not exist. It is also a programming-error warning: it
 * never fires for correct usage, and a consumer who passes an unsupported key
 * wants to know in every environment.
 */
function warnAboutUnknownKeys(config: object) {
  const unknown = Object.keys(config).filter((key) => !(key in DEFAULT_YUE_CONFIG))
  if (unknown.length === 0) return

  for (const key of unknown) {
    if (key === 'messages') {
      console.warn(
        `[yue] \`messages\` is not a configuration option any more: component text is owned ` +
          `by the locale instance. Use \`app.use(YueUI, { locale, packs })\`, ` +
          `\`provideLocale({ messages })\` or \`<YueLocaleProvider :messages="…">\` instead. ` +
          `The key names changed too — see \`docs/04-yue-i18n-rfc.md\` for the migration table.`,
      )
    } else if (key === 'prefix' || key === 'namespace') {
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
 * A fresh copy of the defaults is returned when called outside a component (module scope, a
 * unit test, a plain function): `inject()` outside `setup()` warns and returns `undefined`,
 * and handing out the shared frozen default would let one caller's mutation leak into every
 * other one.
 */
export function useConfig(): YueConfig {
  if (!getCurrentInstance()) return { ...DEFAULT_YUE_CONFIG }
  return resolveConfig(DEFAULT_YUE_CONFIG, inject(yueConfigKey, DEFAULT_YUE_CONFIG))
}

/**
 * Provide configuration to a component subtree.
 *
 * The base is the configuration the subtree *already* sees, not the built-in defaults, so
 * this is an override rather than a reset: `app.use(YueUI, { size: 'sm' })` followed by a
 * subtree provider keeps `size: 'sm'`. Providers nest the same way, so an inner subtree can
 * override one option of an outer one.
 *
 * Called outside a component there is no parent to inherit from, so the defaults are the
 * base and nothing is provided — the return value is still resolved, which keeps this
 * usable from a plain helper.
 *
 * @returns the resolved configuration, so the provider can reuse it.
 */
export function provideYueConfig(config: YueConfigInput = {}): YueConfig {
  warnAboutUnknownKeys(config)
  const instance = getCurrentInstance()
  const resolved = resolveConfig(instance ? useConfig() : DEFAULT_YUE_CONFIG, config)
  // `provide()` also warns outside `setup()`, which is why it is guarded rather than
  // called unconditionally.
  if (instance) provide(yueConfigKey, resolved)
  return resolved
}

/**
 * Provide configuration to an entire application, which outlives any component
 * subtree and is therefore how a host app configures the library:
 *
 * ```ts
 * app.use(YueUI, { size: 'sm' })
 * ```
 *
 * The base here is the defaults, not the current configuration: an application is the
 * outermost scope, there is nothing above it to inherit from, and `installYueConfig` runs
 * during `app.use()` where no component instance exists to inject from.
 */
export function installYueConfig(app: App, config: YueConfigInput = {}): YueConfig {
  warnAboutUnknownKeys(config)
  const resolved = resolveConfig(DEFAULT_YUE_CONFIG, config)
  app.provide(yueConfigKey, resolved)
  return resolved
}
