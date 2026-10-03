# Layout

The layout specification is responsible for container boundaries, spacing, and responsive behavior; a component is only responsible for its own size and should not know about page column counts or business breakpoints.

## Token

| Purpose | Token |
| --- | --- |
| Text container | `--container-text` |
| Page container | `--container-page` |
| Page horizontal padding | `--layout-page-gutter` / `--layout-page-gutter-lg` |
| Grid column count | `--layout-grid-columns` |
| Grid gap | `--layout-grid-gap` |
| Breakpoints | `--breakpoint-sm`, `--breakpoint-md`, `--breakpoint-lg`, `--breakpoint-xl` |

## Rules

1. Page content uses a maximum-width container; long text must not fill a wide screen.
2. Small screens prefer fluid layout and wrapping; main content must not depend on horizontal scrolling.
3. Grids are for page composition; a component must not contain media queries coupled to the page.
4. Spacing is chosen from `--space-*` and `--gap-*` first; a new token is added only for special geometry that cannot be expressed otherwise.
5. Touch targets and button heights are guaranteed by component tokens; page layout must not cancel them out with negative margins.

## Responsive checks

The documentation visual gate checks `scrollWidth === clientWidth` at a width of `390px`. Any new page or component must also be checked on narrow screens, wide screens, and with longer content.
