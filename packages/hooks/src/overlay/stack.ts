/**
 * The shared overlay stack — the one piece of detached-overlay runtime that more than
 * one Yue component genuinely needs.
 *
 * A `YuePopover` and a `YueDialog` can be open at the same time (a dialog opened from
 * popover content, a popover opened from a dialog body). Two rules have to hold *across*
 * the two components, and cannot be decided inside either one alone:
 *
 *   - Escape closes the topmost surface, not every surface;
 *   - an outside pointerdown reaches the topmost surface, and a click inside a child
 *     must not close its parent.
 *
 * Both are answers to "which instance is on top", so the ordering lives here as a module
 * level stack. The registration API is deliberately semantic-free: it stores an opaque
 * record with a `contains` test and a `close` request, and knows nothing about modality,
 * focus traps, scrims or scroll locking — those belong to the component that owns the
 * interaction, and are exactly why this module does **not** grow a `useOverlay()`.
 *
 * This is the point where the extraction became justified: the stack already existed for
 * Popover, and Dialog is its second real consumer. Until a second component needed it,
 * keeping the array inside `popover/` was the correct call (see the repository rule that
 * shared logic enters `packages/hooks` only when a second consumer justifies it).
 */

/**
 * One open surface as the stack sees it.
 *
 * `contains` answers "did this event land inside me (trigger, content, or — for a dialog —
 * anywhere in its own teleported subtree)". `close` is the outside-close request; a
 * component that does not close on outside-anywhere interaction supplies a no-op, because
 * the stack's job is dispatch, not policy.
 */
export interface OverlayRecord {
  contains: (event: Event) => boolean
  close: (event: Event) => void
}

const records: OverlayRecord[] = []
let pointerListener: ((event: PointerEvent) => void) | undefined

function onPointerDown(event: PointerEvent) {
  const top = records.at(-1)
  if (!top || top.contains(event)) return
  top.close(event)
}

/**
 * Push a surface onto the stack and return its disposer.
 *
 * The document-level pointerdown listener is installed on the first registration and
 * removed on the last, so a page with no open overlay carries no global listener. A
 * double dispose is safe: the record is removed once and the second call is ignored.
 */
export function registerOverlay(record: OverlayRecord): () => void {
  records.push(record)
  if (records.length === 1 && typeof document !== 'undefined') {
    pointerListener = onPointerDown
    document.addEventListener('pointerdown', pointerListener, true)
  }

  let active = true
  return () => {
    if (!active) return
    active = false
    const index = records.indexOf(record)
    if (index !== -1) records.splice(index, 1)
    if (records.length === 0 && pointerListener && typeof document !== 'undefined') {
      document.removeEventListener('pointerdown', pointerListener, true)
      pointerListener = undefined
    }
  }
}

/** Whether `record` is the current topmost surface — the Escape and outside-owner check. */
export function isTopOverlay(record: OverlayRecord): boolean {
  return records.at(-1) === record
}
