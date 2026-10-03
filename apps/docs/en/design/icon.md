# Icon

## Yue does not bundle an icon library

Yue **does not provide an icon library, an icon font, a default SVG set, or an external CDN**, and it does not ship Tabler, Material Icons, and the like as runtime dependencies. This is a deliberate boundary: applications choose their own icon assets and licenses, and Yue only defines how icons are carried inside components.

## Component contract

Taking Button as an example, icons are passed in through slots:

```vue
<YueButton>
  <template #leading><SaveIcon aria-hidden="true" /></template>
  Save
</YueButton>
```

- The `leading` and `trailing` slots sit at `.yue-button__icon--leading` / `.yue-button__icon--trailing` respectively.
- Sizing is controlled uniformly by `--button-icon-size-sm|md|lg`, and the icon itself should use `width: 100%; height: 100%`.
- SVG inherits `currentColor` by default; do not hard-code a theme colour inside the icon file.
- Decorative icons set `aria-hidden="true"`; icons that convey information must have adjacent text or an accessible name.
- `shape="circle"` is an icon button and must provide an `aria-label` or `aria-labelledby`. Development mode warns about instances without a name.

## When choosing icons

Prefer icons with a clear meaning and consistent strokes that are still recognisable at the `sm/md/lg` sizes. Do not use an icon to replace text that must be read, and do not bypass asset management and accessibility checks by pulling in a remote font.
