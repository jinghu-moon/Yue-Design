# Locale key change process

When a locale key is added, renamed, or removed, all supported language packs must be updated
in the same commit. A key that exists in one language but not another causes a missing-key
diagnostic at runtime and fails `audit:i18n`.

## Adding a new key

1. Choose the key name following `catalogs.md` conventions: `{component}.{action}` in
   semantic terms, all lowercase, no language words in the key.
   ```
   Good:  input.clear        pagination.next    dialog.close
   Bad:   input.clearButton  pagination.nextEn  clearInputField
   ```

2. Add the key to the typed catalog (`src/locale/catalog.ts` or equivalent). The TypeScript
   type must be updated; the compiler enforces that every language pack satisfies the type.

3. Add the translated value to every supported language pack file. Do not leave any language
   pack without the new key. If a translation is genuinely not yet available, mark it:
   ```ts
   // untranslated: pending review — remove before 1.0
   'input.clear': 'Clear',  // fallback to English
   ```
   An untranslated marker is a temporary placeholder, not a permanent state. Set a follow-up
   to resolve it before the first stable release.

4. Run `corepack pnpm audit:i18n` and confirm it exits 0. This gate fails if any key is
   missing from any language pack.

## Renaming a key

Renaming a key is a breaking change. Follow
`yue-component-spec/references/breaking-change-process.md` in full, then:

1. Update the key name in the typed catalog.
2. Update every component or composable that calls `t('old.key')` — search the codebase
   for the old key name before committing.
3. Update every language pack to use the new key name. Delete the old key from every pack.
4. Update the component API docs (the locale keys section of the API page).
5. Run `corepack pnpm audit:i18n` and `corepack pnpm typecheck`.

Do not add both the old and new key as an alias. This is pre-release; use the correct name
and remove the old one.

## Removing a key

1. Verify no component or composable still calls `t('key.to.remove')`. A grep across
   `packages/vue/src` and `apps/docs` is required.
2. Remove the key from the typed catalog.
3. Remove the key from every language pack.
4. Run `corepack pnpm typecheck` — a language pack that still has the removed key will
   produce a type error (excess property check).
5. Run `corepack pnpm audit:i18n`.

## Verification

| Change | Required commands |
| --- | --- |
| New key | `typecheck`, `audit:i18n` |
| Renamed key | `typecheck`, `audit:i18n`, search for old key usages |
| Removed key | `typecheck`, `audit:i18n`, search confirms zero usages |
| Any of the above + docs site | `audit:docs:i18n` |

## Hard rules

- Never leave a language pack with a key missing. The `audit:i18n` gate enforces parity.
- Do not add a compatibility alias that maps the old key name to the new value. Remove the
  old key and update all call sites.
- Untranslated markers (`// untranslated: reason`) must include a reason and are allowed
  only as a short-term placeholder. They must not survive into a stable release without
  being resolved.
- Locale key changes that affect user-visible component behavior (aria-label text, button
  labels, error messages) must be listed in the handoff report under "Locale keys changed."
