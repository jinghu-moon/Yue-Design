/**
 * The control-size contract, shared by every component that offers a `size` prop.
 *
 * There is exactly one of these in the package. A per-component union (`YueButtonSize`
 * being `'sm' | 'md' | 'lg'`, `YueInputSize` being the same three strings again) is
 * how a design system ends up with sizes that cannot be renamed together: adding a
 * fourth step means finding every copy, and the copies cannot be checked against each
 * other. Components therefore *alias* this type rather than restating it —
 * `YueButtonSize` and `YueInputSize` are both `ComponentSize`, so their public names
 * stay meaningful while the definition stays single.
 *
 * Why not simply re-export `ComponentSize` from `@yue-ui/hooks`? Because
 * `@yue-ui/vue` bundles the hooks layer at build time and declares no runtime
 * dependency on it: a shipped `.d.ts` that imported `@yue-ui/hooks` would send a
 * consumer looking for a package they never installed. The declaration is duplicated
 * *once*, here, and `size.test.ts` carries a compile-time assertion that it still
 * matches the hooks layer — so a drift is a build failure rather than a silent
 * divergence.
 */
export type ComponentSize = 'sm' | 'md' | 'lg'
