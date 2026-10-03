# Yue locale architecture

## Ownership boundary

Yue owns only strings that Yue renders itself: clear-button names, pagination controls, date
navigation labels, loading announcements and similar component chrome. The consumer owns page
copy, field labels, business validation, domain errors and arbitrary slot content.

Do not solve an ownership mistake with a new prop. A `clearLabel` prop makes one string harder
to translate globally; a locale key keeps the semantic owner in the locale layer.

## Runtime contract

The core should expose a small, framework-native instance:

```ts
interface YueLocaleInstance {
  current: Ref<string>
  fallback: Ref<string>
  messages: Ref<YueLocaleMessages>
  t(key: YueMessageKey, params?: YueMessageParams): string
  n(value: number, options?: Intl.NumberFormatOptions): string
  d(value: Date | number, options?: Intl.DateTimeFormatOptions): string
  provide(options: YueLocaleOptions): YueLocaleInstance
}
```

`provideLocale()` derives from the nearest instance and shallow/deep merges only the documented
message tree. `installYueLocale()` starts from defaults. The context is reactive so an existing
component updates after locale switching. Use `Symbol.for('yue:locale')` because hooks and the
Vue package can be bundled as separate copies.

## Adapters

An adapter implements the same `t`, `n`, `d`, current locale and fallback behavior. The core
types must not import a third-party type. Put each adapter in its own optional entry and peer
dependency. The first documented adapter should be vue-i18n because it is mature and supports
Composition API plus lazy locale loading; Intlayer and Paraglide are application build choices,
not core dependencies; Tolgee belongs to translation-management integrations.

## SSR and direction

Locale must be selected deterministically on the server and client. Do not infer the browser
locale during setup in a way that changes the first HTML. Set `document.documentElement.lang`
only in a client-side effect after the selected locale is known. Direction should be derived from
locale metadata or an explicit override and exposed to components; CSS uses logical properties.

## Official references

- [Vue provide/inject](https://vuejs.org/guide/components/provide-inject)
- [Vue SSR hydration](https://vuejs.org/guide/scaling-up/ssr.html#hydration-mismatch)
- [Vue I18n lazy loading](https://vue-i18n.intlify.dev/guide/advanced/lazy)
- [Vue I18n Composition API](https://vue-i18n.intlify.dev/guide/advanced/composition)
- [ECMAScript Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
