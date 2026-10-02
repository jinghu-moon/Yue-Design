/**
 * @snapclip/hooks — shared Vue composables for SnapClip components.
 *
 * This package is intentionally empty for now. It exists in the workspace so
 * that the first composable has a home that is already wired into `typecheck`,
 * `build` and the dependency graph, rather than being retrofitted later.
 *
 * Nothing is exported yet: inventing composables before there is a component
 * that needs them would be API design by guesswork. The first real consumer is
 * `DsButton` (loading/disabled state composition), followed by the appearance
 * synchronisation that maps VitePress' `html.dark` onto the token contract's
 * `[data-theme]`.
 */
export {}
