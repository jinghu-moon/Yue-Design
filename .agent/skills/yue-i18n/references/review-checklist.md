# I18N review checklist

Apply this to any diff containing user-facing text.

## Ownership and keys

- [ ] Every visible/announced string is a locale key or intentionally consumer-owned.
- [ ] Key uses the existing feature namespace and has no language/source-code wording.
- [ ] No string concatenation, HTML in messages, or one-off translation prop.
- [ ] Interpolation and plural parameters are declared and tested.

## Catalogs and runtime

- [ ] Every locale has the key; no orphan, empty, or silently missing value exists.
- [ ] Fallback and missing-key diagnostics are intentional.
- [ ] Locale switching updates mounted components and `html[lang]` without hydration mismatch.
- [ ] Date/number/list output uses Intl; RTL uses direction metadata and logical CSS.
- [ ] Core package has no hard dependency on an application i18n engine.

## Components and docs

- [ ] ARIA names and state announcements are translated.
- [ ] Long translations fit or scroll without page-level overflow.
- [ ] Component Example/API/Guide pages are updated in both languages when public.
- [ ] Docs navigation, search text, theme controls and preview chrome are also localized.

## Evidence

- [ ] Focused unit tests and catalog audit pass.
- [ ] Browser checks cover switching, fallback, ARIA, long text, direction and persistence where applicable.
- [ ] Distribution/tree-shaking/tarball checks cover the changed package boundary.
- [ ] The report states actual commands, results, known untranslated surfaces and intentional limits.
