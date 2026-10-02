import { describe, expect, it } from 'vitest'
import { YUE_NAMESPACE } from '../config/types.js'
import { useNamespace } from './useNamespace.js'

describe('useNamespace', () => {
  it('builds exactly the documented names', () => {
    const ns = useNamespace('button')

    expect(ns.b()).toBe('yue-button')
    expect(ns.e('icon')).toBe('yue-button__icon')
    expect(ns.m('primary')).toBe('yue-button--primary')
    expect(ns.em('icon', 'sm')).toBe('yue-button__icon--sm')
    expect(ns.is('disabled')).toBe('is-disabled')
    expect(ns.is('loading')).toBe('is-loading')
    expect(ns.block).toBe('yue-button')
    expect(ns.namespace).toBe('yue')
  })

  it('takes the block name without the namespace', () => {
    expect(useNamespace('button').b()).toBe('yue-button')
    expect(useNamespace('input').b()).toBe('yue-input')
  })

  it('takes the namespace from a single constant', () => {
    // One place decides the namespace, so a component can never restate it and
    // the stylesheet has exactly one namespace to match.
    expect(YUE_NAMESPACE).toBe('yue')
    expect(useNamespace('anything').namespace).toBe(YUE_NAMESPACE)
    expect(useNamespace('anything').b()).toBe(`${YUE_NAMESPACE}-anything`)
  })

  it('reads no reactive state, so it is safe outside a component', () => {
    // This is what makes the namespace impossible to configure: there is no config
    // lookup to influence it, and therefore no way to emit a class the prebuilt
    // stylesheet does not match.
    expect(() => useNamespace('button')).not.toThrow()
    expect(useNamespace('button').b()).toBe('yue-button')
  })
})
