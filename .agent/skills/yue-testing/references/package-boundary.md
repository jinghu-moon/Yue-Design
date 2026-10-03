# SSR and package-boundary tests

Use `renderToString` when setup might touch browser globals. Import built ESM with native Node
when a package claims to be directly consumable. Build temporary tarballs and install them in a
clean consumer when exports, CSS entries, peer dependencies, injection keys or locale packs change.

Tree-shaking checks must be bidirectional: a single-component entry must not contain another
component or plugin registry, and the plugin entry must contain the expected registration path.
Locale checks must prove a single locale entry does not pull every language into the root graph.

Distribution checks should inspect emitted files, not only sources: relative ESM imports need
extensions where Node requires them, CSS entries must exist and remain unlayered, and public
types/exports must point at real files.
