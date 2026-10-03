# Breaking change process

A breaking change is any modification to a public API surface that requires a consumer to
update their code. This project is pre-release, so breaking changes are allowed, but they
must be tracked and tested — "pre-release" means no backward-compatibility obligation,
not no documentation.

## What counts as a breaking change

**Always breaking:**
- Removing a prop, emit, slot, or exposed method
- Renaming a prop, emit, slot, or exposed method
- Narrowing the accepted type of a prop (e.g. `string | number` → `string`)
- Changing the payload type of an emit
- Changing or removing a stable CSS class that consumers likely target (`.yue-{name}`)
- Removing a token variable that consumers override

**Likely breaking (check consumer impact):**
- Changing a prop default that consumers rely on
- Changing DOM structure that affects slot projection or CSS selectors
- Changing attribute routing (e.g. `dir` now goes to inner element instead of wrapper)
- Removing a behavior that existing tests assert

**Not breaking:**
- Adding a new optional prop with a backward-compatible default
- Adding a new slot
- Adding a new emit that was not previously fired
- Internal refactor with identical external behavior
- Expanding an accepted type (e.g. `string` → `string | number`)
- New token variable with a sensible default

## Required steps for every breaking change

### 1. Record the change in the spec

In the `## Breaking changes` section of the component draft, fill the table:

| Changed surface | Old | New | Reason |
| --- | --- | --- | --- |
| Prop `variant` type | `'solid' \| 'outline'` | added `'ghost'` | [why] |

"Reason" must be a concrete design rationale, not "cleanup" or "refactor."

### 2. Write a before-state test snapshot

Before modifying the implementation, write or verify a test that asserts the OLD behavior.
Run it and confirm it passes. This is the regression anchor.

```ts
// BEFORE: verify old behavior is currently working
it('variant prop accepts solid and outline', () => {
  // ... assert old valid values
})
```

### 3. Implement the change

Make the implementation change. The before-state test will now fail (that is correct —
it documents what changed).

### 4. Update the test to assert NEW behavior

Replace the before-state test with one that asserts the new intended behavior, plus
any edge cases introduced by the change.

```ts
// AFTER: verify new behavior
it('variant prop accepts solid, outline, and ghost', () => {
  // ... assert new valid values including ghost
})
it('ghost variant renders without fill background', () => {
  // ... assert visual semantics
})
```

### 5. Add a regression test for adjacent behavior

If the change touched a shared code path, add a test that exercises the neighboring
behavior to confirm nothing regressed silently.

### 6. Document in the handoff

In the handoff `## Contract` → `Breaking changes` section, list every breaking change
with the before and after behavior. Do not write "none" if there is one.

In the handoff `## Regression and limits` section, list:
- Which tests were updated and why
- Any consumer migration needed (even if "consumers update their usage of prop X")

## Hard rules

- Do not remove a test that is failing because of a breaking change. Update it.
- Do not add `@ts-ignore` or `as any` to make a type error from a breaking change disappear.
- Do not create a compatibility shim to preserve old behavior alongside new behavior.
  This is pre-release; remove the old design and implement the correct one.
- If the breaking change affects locale keys, follow `yue-i18n/references/catalogs.md`
  and update all language packs in the same commit.
