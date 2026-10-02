// Ambient types for the documentation site.
//
// This file intentionally declares nothing: `vite/client` (enabled through
// `types` in tsconfig.json) already provides `import.meta.env` and the `*.css`
// module declarations, and declaring `*.css` here as well would give the same
// module two different shapes. It is kept as the anchor for any docs-only
// ambient declaration that turns out to be needed.
export {}
