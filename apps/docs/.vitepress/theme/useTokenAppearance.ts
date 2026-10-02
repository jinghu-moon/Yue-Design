import { getCurrentInstance, onMounted, onUnmounted } from 'vue'

/**
 * Mirror the documentation host's appearance onto the token contract.
 *
 * VitePress switches themes with `html.dark`; SnapClip tokens switch with
 * `[data-theme=dark]`. Without this bridge the tokens loaded into the docs would
 * stay on their light values while the page went dark.
 *
 * This lives in the docs theme for now because the docs site is its only
 * consumer. When a second consumer appears it moves to `@snapclip/hooks` as
 * `useTokenAppearance` — not before, so the composable's API is shaped by real
 * usage.
 */
export function useTokenAppearance() {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const sync = () => {
    root.dataset.theme = root.classList.contains('dark') ? 'dark' : 'light'
  }
  const observer = new MutationObserver(sync)

  const start = () => {
    sync()
    // Only `class` is observed, and sync() only writes `data-theme`, so this
    // cannot feed back into itself.
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
  }
  const stop = () => observer.disconnect()

  if (getCurrentInstance()) {
    onMounted(start)
    onUnmounted(stop)
  } else {
    start()
  }
}
