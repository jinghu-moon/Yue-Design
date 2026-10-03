# Compound components

Use when a parent owns a relationship or selection among children (tabs, menu, toggle, table
columns). The parent is the state owner; children emit intent and render the state they receive.

- Define a typed context with a stable `Symbol.for('yue:{family}')` key when the context crosses
  package boundaries.
- Specify registration, ordering, disabled-item behavior, controlled value and unmount cleanup.
- Keep the leaf usable as a standalone primitive when that is meaningful.
- Do not duplicate the same state in parent and child or make a plain atomic component know its group.
- Map selection/open state to `aria-*`/`data-state` and test the full keyboard pattern, not only clicks.
