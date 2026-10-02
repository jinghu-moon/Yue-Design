// Stylesheet imports resolve through the bundler, not through TypeScript, so
// the docs type-check needs an ambient declaration for the token package.
declare module '*.css' {
  const content: string
  export default content
}
