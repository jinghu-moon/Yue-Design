# Package boundary release checks

For each public package and subpath verify:

- `package.json` exports point to existing JS, `.d.ts` and CSS files;
- ESM imports resolve in native Node where the package claims to support it;
- Vue remains the intended peer dependency and no workspace-only import leaks into the tarball;
- root, per-component and plugin entries have the intended tree-shaking graph;
- CSS is present only through explicit style entries and has the intended cascade/layer behavior;
- one locale/component entry does not pull unrelated components or every language;
- a clean temporary consumer can install and render the tarball.

Use `publint --strict` and `attw --pack` only after those tools are added to the repository. Do
not claim their checks were run when they are not installed.
