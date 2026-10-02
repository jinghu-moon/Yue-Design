import { defineConfig } from 'vitest/config'

/**
 * The root test project covers the dependency-free tooling that guards the
 * design tokens (CSS parser, colour maths, contrast audit). Component tests
 * will live next to the components once @snapclip/vue has a real surface.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.mjs'],
    testTimeout: 30_000,
  },
})
