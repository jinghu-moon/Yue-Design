import { ref } from 'vue'

export type DocsTheme = 'light' | 'dark'
export type DocsAccent = 'azure' | 'neutral'

/**
 * Density is the one appearance axis that is *preview-scoped* rather than
 * document-wide, and the only one the token contract does not model: the token
 * package has no density dimension. A preview frame applies it by re-pointing the
 * Button's own Component Tokens on its surface, which is exactly the override
 * mechanism a consumer would use — so the demo stays honest about what is a token
 * feature and what is a consumer override.
 */
export type DocsDensity = 'comfortable' | 'compact'

export const DOCS_THEME_DEFAULT: DocsTheme = 'light'
export const DOCS_ACCENT_DEFAULT: DocsAccent = 'azure'
export const DOCS_DENSITY_DEFAULT: DocsDensity = 'comfortable'

/**
 * Shared appearance state for the documentation site.
 *
 * It lives at module scope rather than in `provide()` because every preview frame
 * on a page shares one document: two `PreviewFrame`s toggling theme independently
 * would fight over `html.dark`, and the last one to render would silently win. One
 * piece of state, many controls.
 */
const theme = ref<DocsTheme>(DOCS_THEME_DEFAULT)
const accent = ref<DocsAccent>(DOCS_ACCENT_DEFAULT)

const root = () => (typeof document === 'undefined' ? null : document.documentElement)

/**
 * Theme is applied by toggling `html.dark` — VitePress' own appearance mechanism
 * — so the docs chrome and the token contract can never disagree. Mapping
 * `html.dark` onto `[data-theme]` is `useTokenAppearance`'s job; `data-theme` is
 * mirrored here as well only so the first paint after a click is already correct
 * instead of waiting for the observer.
 *
 * The theme is deliberately NOT applied to a preview container: the token sheet
 * defines light values on `:root` and dark values on `[data-theme=dark]`, so a
 * nested `data-theme="light"` could not undo the dark values it inherits from
 * `html`.
 */
function applyTheme(value: DocsTheme) {
  const element = root()
  if (!element) return
  element.classList.toggle('dark', value === 'dark')
  element.dataset.theme = value
}

/** Accent is a flat attribute: the token sheet overrides `[data-accent=neutral]`. */
function applyAccent(value: DocsAccent) {
  const element = root()
  if (!element) return
  element.dataset.accent = value
}

/** Read and drive the documentation appearance from a preview control. */
export function usePreviewAppearance() {
  return {
    theme,
    accent,
    setTheme(value: DocsTheme) {
      theme.value = value
      applyTheme(value)
    },
    setAccent(value: DocsAccent) {
      accent.value = value
      applyAccent(value)
    },
    /** Back to light + azure. Does not touch a frame's local density. */
    reset() {
      theme.value = DOCS_THEME_DEFAULT
      accent.value = DOCS_ACCENT_DEFAULT
      applyTheme(DOCS_THEME_DEFAULT)
      applyAccent(DOCS_ACCENT_DEFAULT)
    },
  }
}

/**
 * Mirror the documentation host's appearance onto the token contract.
 *
 * VitePress switches themes with `html.dark`; the tokens switch with
 * `[data-theme=dark]`. Without this bridge the tokens loaded into the docs would
 * stay on their light values while the page went dark.
 *
 * It also syncs the shared state *from* the DOM, so using VitePress' own
 * appearance switch (or the OS preference on first load) leaves the preview
 * controls showing the truth rather than a stale guess.
 *
 * This lives in the docs theme because the docs site is its only consumer. When a
 * second consumer appears it moves to `@yue-ui/hooks` — not before, so the
 * composable's API is shaped by real usage.
 *
 * @returns a teardown function, for callers that own a component lifetime.
 */
export function useTokenAppearance() {
  if (typeof document === 'undefined') return () => {}

  const element = document.documentElement
  const sync = () => {
    const dark = element.classList.contains('dark')
    element.dataset.theme = dark ? 'dark' : 'light'
    theme.value = dark ? 'dark' : 'light'
  }

  // Adopt whatever the host already decided before the first paint.
  theme.value = element.classList.contains('dark') ? 'dark' : 'light'
  accent.value = element.dataset.accent === 'neutral' ? 'neutral' : 'azure'

  const observer = new MutationObserver(sync)
  sync()
  // Only `class` is observed, and sync() writes `data-theme` plus the refs, so
  // this cannot feed back into itself.
  observer.observe(element, { attributes: true, attributeFilter: ['class'] })

  return () => observer.disconnect()
}
