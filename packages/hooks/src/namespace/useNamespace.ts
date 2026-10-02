import { YUE_NAMESPACE } from '../config/types.js'
import type { Namespace } from '../config/types.js'

/**
 * Build the BEM class-name factory for one component block.
 *
 * ```ts
 * const ns = useNamespace('button')
 * ns.b()          // yue-button
 * ns.e('icon')    // yue-button__icon
 * ns.m('primary') // yue-button--primary
 * ns.is('loading')// is-loading
 * ```
 *
 * The block name is passed **without** the namespace — `useNamespace('button')`,
 * never `useNamespace('yue-button')` — so there is exactly one place that decides
 * the namespace (`YUE_NAMESPACE`), and components never restate it.
 *
 * This deliberately does not read `YueConfig`. The namespace is not configurable:
 * the stylesheet that matches these classes ships prebuilt, so a runtime prefix
 * could only ever emit classes nothing styles. See `YUE_NAMESPACE` in
 * `../config/types.ts` for the full reasoning.
 *
 * Because it reads no reactive state, this is a plain function: safe to call at
 * module scope, in a test, or outside a component.
 */
export function useNamespace(block: string): Namespace {
  const base = `${YUE_NAMESPACE}-${block}`

  return {
    namespace: YUE_NAMESPACE,
    block: base,
    b: () => base,
    e: (element: string) => `${base}__${element}`,
    m: (modifier: string) => `${base}--${modifier}`,
    em: (element: string, modifier: string) => `${base}__${element}--${modifier}`,
    is: (state: string) => `is-${state}`,
  }
}
