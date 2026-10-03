import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ComponentSize as HooksComponentSize } from '@yue-ui/hooks'
import type { ComponentSize } from './size'
import type { YueButtonSize } from '../components/button/types'
import type { YueInputSize } from '../components/input/types'

/** `true` only when the two types are mutually assignable, i.e. the same type. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

/**
 * Compile-time proof that the package has exactly one control-size contract.
 *
 * Three claims, all resolved by `vue-tsc`:
 *
 *   1. the package's own `ComponentSize` still matches the hooks layer's — the
 *      declaration is duplicated in `shared/size.ts` so a shipped `.d.ts` never points
 *      at a package the consumer has not installed, and that is only safe while it is
 *      checked;
 *   2. `YueButtonSize` *is* `ComponentSize`, not a coincidentally identical union;
 *   3. `YueInputSize` is the same type too.
 *
 * If the hooks layer gains a fourth step, or a component restates the union, one of
 * these annotations becomes `never` and this file stops compiling.
 */
const hooksParity: Same<ComponentSize, HooksComponentSize> = true
const buttonAlias: Same<YueButtonSize, ComponentSize> = true
const inputAlias: Same<YueInputSize, ComponentSize> = true

/**
 * Read a source file as text.
 *
 * Needed because `YueInputSize` and friends are types: they do not exist at runtime, so
 * `name in module` can never prove anything about them. Only the compiler can check the
 * aliases, and only the source text can show that no component declared a second union.
 */
function readSource(relativePath: string): string {
  for (const candidate of [
    resolve(process.cwd(), 'packages/vue/src', relativePath),
    resolve(process.cwd(), 'src', relativePath),
  ]) {
    if (existsSync(candidate)) return readFileSync(candidate, 'utf8')
  }
  throw new Error(`could not locate ${relativePath} from ${process.cwd()}`)
}

describe('the shared control-size contract', () => {
  it('still matches the component layer, at both ends', () => {
    // The checks are the type annotations above; referencing them keeps
    // `noUnusedLocals` satisfied and makes the intent visible in the test name.
    expect([hooksParity, buttonAlias, inputAlias]).toEqual([true, true, true])
  })

  it('is declared once, and each component aliases it', () => {
    for (const [label, path, ownName] of [
      ['button', 'components/button/types.ts', 'YueButtonSize'],
      ['input', 'components/input/types.ts', 'YueInputSize'],
    ]) {
      const source = readSource(path)
      // It must name the shared type...
      expect(source, `${label} does not reference the shared contract`).toContain('ComponentSize')
      // ...and must not restate the union. This is the regression that matters: a
      // second literal union type-checks fine and drifts silently.
      expect(
        /=\s*'sm'\s*\|\s*'md'\s*\|\s*'lg'/.test(source),
        `${label}/types.ts declares its own size union instead of aliasing ComponentSize`,
      ).toBe(false)
      expect(source, `${label} should still export ${ownName}`).toContain(
        `export type ${ownName}`,
      )
    }
  })

  it('declares the union exactly once in the package', () => {
    const declarations = [
      'shared/size.ts',
      'components/button/types.ts',
      'components/input/types.ts',
    ].filter((path) => /=\s*'sm'\s*\|\s*'md'\s*\|\s*'lg'/.test(readSource(path)))
    expect(declarations).toEqual(['shared/size.ts'])
  })
})
