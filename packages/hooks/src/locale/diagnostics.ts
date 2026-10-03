/**
 * Missing-key and malformed-message diagnostics.
 *
 * A translation layer that silently renders nothing is worse than one that renders the key:
 * the first looks finished, the second is obviously broken. So every failure path here
 * *records* a structured diagnostic that a test can drain, and reports it once per
 * (reason, locale, key, parameter) on the console.
 *
 * No `import.meta.env` guard. `@yue-ui/hooks` is compiled by `tsc`, not by a bundler with a
 * define step, so a `DEV` flag would either survive into the published JavaScript and break
 * a plain browser, or read an object that does not exist. The precedent is
 * `warnAboutUnknownKeys`: a programming-error warning that never fires for correct usage is
 * worth having in every environment.
 */
import type { YueLocaleDiagnostic } from './types.js'

interface DiagnosticStore {
  readonly queue: YueLocaleDiagnostic[]
  readonly reported: Set<string>
}

/**
 * `@yue-ui/vue` bundles the hooks implementation into its self-contained artefact, while an
 * application can also import `@yue-ui/hooks` directly. A module-local queue would therefore
 * make a diagnostic disappear when it is produced by one copy and consumed by the other. Keep
 * the store beside the cross-package locale key so both copies observe the same diagnostics.
 */
const diagnosticsStoreKey = Symbol.for('yue:locale-diagnostics')
const globalRegistry = globalThis as typeof globalThis & {
  [key: symbol]: DiagnosticStore | undefined
}
const store =
  globalRegistry[diagnosticsStoreKey] ?? (globalRegistry[diagnosticsStoreKey] = {
    queue: [],
    reported: new Set<string>(),
  })

function signature(diagnostic: YueLocaleDiagnostic): string {
  return [
    diagnostic.reason,
    diagnostic.locale,
    diagnostic.key ?? '',
    diagnostic.param ?? '',
  ].join('|')
}

/** Record a diagnostic, and report it once. */
export function diagnose(diagnostic: YueLocaleDiagnostic): void {
  store.queue.push(diagnostic)
  const id = signature(diagnostic)
  if (store.reported.has(id)) return
  store.reported.add(id)
  console.warn(`[yue] ${diagnostic.message}`)
}

/** Take everything recorded so far, emptying the queue. */
export function consumeLocaleDiagnostics(): YueLocaleDiagnostic[] {
  return store.queue.splice(0, store.queue.length)
}

/** Look at what has been recorded without emptying the queue. */
export function peekLocaleDiagnostics(): readonly YueLocaleDiagnostic[] {
  return store.queue
}

/**
 * Forget every recorded diagnostic, including the "already reported" memory.
 *
 * For tests only: the queue is global so that a diagnostic raised while rendering is still
 * observable afterwards, which means a test that asserts on it has to start from a known
 * state.
 */
export function resetLocaleDiagnostics(): void {
  store.queue.length = 0
  store.reported.clear()
}
