# Message catalogs and language packs

## Key rules

- Use stable feature namespaces: `input.clear`, `pagination.next`, `datePicker.selectDate`.
- Keys describe meaning, not source code location or language: `input.clear`, not `clearButtonText`.
- One sentence is one message. Use interpolation (`{name}` or the selected engine's typed form),
  never concatenation of translated fragments.
- Do not put HTML, Vue templates, or component names in a message. Compose links and emphasis in
  the component around translated text.
- Plural behavior belongs to the locale contract; do not branch on English grammar in a component.
- Every message key documents its parameter names and whether it is announced to assistive technology.

## Language-pack rules

- Every supported locale has the same leaf key set and parameter set.
- A missing translation must fail `audit:i18n`; a temporary fallback must be explicitly marked,
  visible in the audit output, and not reported as complete. The marker is a trailing comment on
  the same line as the value:

  ```ts
  // Value equals the default on purpose — a product name that is not translated.
  clear: 'Clear', // untranslated: product name
  ```

  A copy of the default without the marker fails the audit; a marker on a line whose value has since
  been translated fails it too, so the exemption cannot outlive the reason for it.
- Export language packs by subpath (`@yue-ui/vue/locale/en-US`) so unused locales are not bundled.
- Keep the default pack small and avoid loading all locale packs from the root entry.
- Normalize BCP 47 tags consistently (`zh-CN`, `en-US`, `ar`, not mixed underscore spellings).

## Review examples

```ts
// Incorrect: grammar and word order are now hard-coded in the component.
text.value = t('items') + ' ' + count + t('selected')

// Correct: one message owns the sentence and the locale owns plural grammar.
text.value = t('selection.selectedItems', { count })
```

For dates, numbers, currencies, lists and relative time use `Intl.DateTimeFormat`,
`Intl.NumberFormat`, `Intl.ListFormat` and `Intl.RelativeTimeFormat` through the locale instance.
Do not compare formatted output to hard-coded punctuation: platform output can legitimately vary.

## Checklist for a key change

- [ ] key is namespaced and typed;
- [ ] all locale packs contain it;
- [ ] interpolation/plural parameters match;
- [ ] default and fallback behavior is tested;
- [ ] component/docs use the key rather than a literal;
- [ ] removed or renamed keys have no orphan references.
