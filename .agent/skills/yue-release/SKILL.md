---
name: yue-release
description: Prepare, review, or execute a Yue Design GitHub/npm release, including package boundaries, changelog, pull request evidence, tarballs, provenance, and release gates. Trigger for release, publish, version, changelog, PR preparation, package audit, or npm distribution; do not use for ordinary component implementation or docs-only edits.
metadata:
  short-description: Yue package release and contribution workflow
---

# Yue release

This Skill describes the release boundary; it does not grant permission to publish or push.
Read the routed reference:

| Task | Read |
| --- | --- |
| package exports, types, tarball | `references/package-boundary.md` |
| PR, commit and changelog | `references/pr-changelog.md` |
| release acceptance | `references/release-checklist.md` |

## Yue release principles

- The repository is pre-release until the owner explicitly declares a public release. During
  development, correct breaking changes are allowed; do not add compatibility APIs for release
  theater.
- Never publish from a dirty or unverified tree. Preserve unrelated user changes and stop when
  ownership of overlapping files is unclear.
- Packages must be consumable from their exports, declaration files, CSS entries and tarball,
  not merely from the workspace source aliases.
- A release report contains actual command output/results, changed public contracts, known limits,
  package sizes and screenshots/links where relevant.
- Publishing credentials, npm provenance and GitHub mutation require explicit user authorization.

## Workflow

1. Inspect branch, status, package versions, workspace lockfile and intended release scope.
2. Review public API/docs/token/I18N changes and choose one coherent versioning decision.
3. Run release gates from `references/release-checklist.md`; do not replace a failing gate with a
   weaker command.
4. Build and inspect packed tarballs in a clean consumer project.
5. Prepare a focused commit/PR description and changelog entry in the repository's language format.
6. Stop before `npm publish`, GitHub push, tag, or release creation unless explicitly authorized.

Current baseline commands include `corepack pnpm verify:all`, `npm pack --dry-run` per package,
and the repository's type/build/audit commands. Changesets, publint, attw and size-limit are
planned release tooling, not installed commands until the project adopts them.
