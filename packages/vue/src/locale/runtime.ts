/**
 * The locale facade: `@yue-ui/hooks`' mechanism, bound to Yue's catalog.
 *
 * Separate from the barrel (`./index`) so the provider component can import it without a
 * cycle, and so the runtime — the part components depend on — stays a small, dependency-free
 * module.
 */
import {
  createLocale,
  installYueLocale as installHooksLocale,
  provideLocale as provideHooksLocale,
  useLocale as useHooksLocale,
} from '@yue-ui/hooks'
import type { YueLocaleInstance, YueLocaleOptions } from '@yue-ui/hooks'
import type { App } from 'vue'
import { enUS } from './en-US'
import type { YueLocaleMessages, YueMessageKey } from './catalog'

/** The instance every Yue component reads. */
export type YueLocale = YueLocaleInstance<YueLocaleMessages, YueMessageKey>

/**
 * Fold the built-in pack in underneath whatever the caller supplied.
 *
 * The caller's pack wins: an application that ships its own `en-US` strings is not
 * overridden by the library's, and an application that ships only `fr-FR` still gets
 * English for the keys it did not translate, instead of keys rendered as text.
 */
export function withDefaultPack(
  options: YueLocaleOptions<YueLocaleMessages> = {},
): YueLocaleOptions<YueLocaleMessages> {
  return { ...options, packs: { 'en-US': enUS, ...options.packs } }
}

/** Create a locale instance that starts from Yue's defaults. */
export function createYueLocale(options: YueLocaleOptions<YueLocaleMessages> = {}): YueLocale {
  return createLocale<YueLocaleMessages, YueMessageKey>(withDefaultPack(options))
}

/**
 * A shared instance for components rendered outside any provider.
 *
 * Created lazily so importing the library never allocates one, and shared so two components
 * in the same tree cannot disagree about the language.
 */
let bareInstance: YueLocale | undefined

/** The fallback instance, exposed for the provider component and for tests. */
export function bareYueLocale(): YueLocale {
  bareInstance ??= createYueLocale()
  return bareInstance
}

/** Read the locale the current component sees. */
export function useLocale(): YueLocale {
  return useHooksLocale<YueLocaleMessages, YueMessageKey>(bareYueLocale())
}

/** Provide a locale to a component subtree, inheriting what it already sees. */
export function provideLocale(options: YueLocaleOptions<YueLocaleMessages> = {}): YueLocale {
  return provideHooksLocale<YueLocaleMessages, YueMessageKey>(withDefaultPack(options))
}

/** Install a locale for an entire application. */
export function installYueLocale(
  app: App,
  options: YueLocaleOptions<YueLocaleMessages> = {},
): YueLocale {
  return installHooksLocale<YueLocaleMessages, YueMessageKey>(app, withDefaultPack(options))
}
