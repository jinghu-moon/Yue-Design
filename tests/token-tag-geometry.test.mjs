import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createResolver, loadTokenSheet } from '../tools/lib/css-tokens.mjs'
import { AUDIT_PROFILES } from '../tools/token-audit.pairs.mjs'

/**
 * The Tag component tokens, as they resolve through the *public* entry.
 *
 * This file is the regression anchor for the token-package architecture change. It was first
 * written against the defective state — where `--tag-height-md` resolved to the prototype's control
 * alias (32px), `--tag-border-radius` to `--radius-full` (9999px) and `--tag-opacity-disabled` to a
 * local `0.45` — and passed, which is what "before-state test" means
 * (`.spec-workflow/token-architecture/breaking-changes.md`). It now asserts the intended compact
 * chip ramp.
 *
 * The point of resolving through `packages/tokens/src/index.css` rather than reading the files is
 * that the defect was *not* visible in any single file: the compact values existed, in
 * `src/components/tag.css`, but were unreachable from the entry a consumer installs. A test that
 * grepped the sources would have passed while the Tag rendered as a 32px pill.
 */
const PACKAGE_ENTRY = resolve('packages/tokens/src/index.css')

function packageResolver() {
  return createResolver(loadTokenSheet({ entry: PACKAGE_ENTRY }))
}

describe('Tag tokens resolve through the public entry', () => {
  const profile = AUDIT_PROFILES[0]

  it('uses the compact chip height ramp, not the control scale', () => {
    const resolver = packageResolver()
    expect(resolver.value('--tag-height-sm', profile)).toBe('20px')
    expect(resolver.value('--tag-height-md', profile)).toBe('24px')
    expect(resolver.value('--tag-height-lg', profile)).toBe('30px')
  })

  it('uses the compact chip padding ramp', () => {
    const resolver = packageResolver()
    expect(resolver.value('--tag-padding-inline-sm', profile)).toBe('6px')
    expect(resolver.value('--tag-padding-inline-md', profile)).toBe('8px')
    expect(resolver.value('--tag-padding-inline-lg', profile)).toBe('10px')
  })

  it('uses the compact chip type ramp', () => {
    const resolver = packageResolver()
    expect(resolver.value('--tag-font-size-sm', profile)).toBe('11px')
    expect(resolver.value('--tag-font-size-md', profile)).toBe('12px')
    expect(resolver.value('--tag-font-size-lg', profile)).toBe('13px')
  })

  it('squares the default shape and keeps `round` as a separate variant', () => {
    const resolver = packageResolver()
    // The token layer expresses the corner as a scale step (`--radius-sm` = `calc(8px / 2)` = 4px on
    // screen), so the assertion is on the expression: a raw `4px` here would mean the component had
    // stopped tracing to the radius scale. The rendered value is measured at 4px in a browser by the
    // after-state probe recorded in `.spec-workflow/token-architecture/breaking-changes.md`.
    expect(resolver.value('--tag-border-radius', profile)).toBe('calc(8px/2)')
    expect(resolver.value('--tag-border-radius-round', profile)).toBe('999px')
    expect(resolver.value('--tag-border-radius', profile)).not.toBe(
      resolver.value('--tag-border-radius-round', profile),
    )
  })

  it('takes disabled opacity from the shared primitive instead of a local magic number', () => {
    const resolver = packageResolver()
    expect(resolver.value('--tag-opacity-disabled', profile)).toBe(
      resolver.value('--opacity-disabled-content', profile),
    )
    expect(resolver.value('--tag-opacity-disabled', profile)).toBe('.38')
  })

  it('declares the focus ring the CheckTag variant consumes', () => {
    const resolver = packageResolver()
    expect(resolver.value('--tag-focus-ring-width', profile)).toBe('2px')
    expect(resolver.value('--tag-focus-ring-offset', profile)).toBe('2px')
    expect(resolver.value('--tag-focus-ring-color', profile)).not.toBe('')
  })

  it('keeps the prototype-named tag tokens resolvable, so parity can still compare them', () => {
    const resolver = packageResolver()
    // These are the prototype's names for the same component. The parity gate resolves them on both
    // sides, so deleting them would read as a lost token rather than as a cleanup.
    expect(resolver.value('--tag-background', profile)).not.toBe('')
    expect(resolver.value('--tag-border-color', profile)).not.toBe('')
  })
})
