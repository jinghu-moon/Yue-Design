# I18N verification matrix

| Changed surface | Required evidence |
| --- | --- |
| One component string/key | focused component test + catalog parity audit |
| Locale runtime/provider | hooks tests + SSR smoke + cross-package Symbol/consumer test |
| Language pack/export | typecheck + build + key/parameter parity + tree-shaking |
| External adapter | adapter unit test + installed tarball consumer test |
| Docs translation/config | docs typecheck + VitePress build + direct locale route/browser switch |
| Interactive locale/RTL/long text | all applicable rows + real browser visual assertions |
| Handoff | `corepack pnpm verify:all` plus `audit:i18n` and docs locale audit |

Do not mark a gate as passed when a browser, locale, or provider was unavailable. A fallback
rendering that hides a missing key is a diagnostic result, not a successful translation audit.
