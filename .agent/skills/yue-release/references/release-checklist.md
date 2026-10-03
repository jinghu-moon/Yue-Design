# Yue release checklist

- [ ] User explicitly authorized the release/publish mutation.
- [ ] Branch, status, lockfile and package versions are known; no unrelated changes were reverted.
- [ ] `corepack pnpm typecheck` and `corepack pnpm build` pass.
- [ ] `corepack pnpm test`, `audit:tokens`, `audit:docs`, `audit:i18n` and `audit:docs:i18n` pass.
- [ ] `verify:dist`, `verify:treeshaking`, `verify:visual` and `verify:tarball` pass as applicable.
- [ ] Public exports, types, CSS entries, locale entries and README/docs agree.
- [ ] **The documentation site's canonical origin is real.** `SITE_HOSTNAME` in
      `apps/docs/.vitepress/config.ts` defaults to the placeholder `https://yue-design.example`, and
      canonical links, `hreflang` alternates and the sitemap are all built from it. `verify:dist`
      prints the origin it found; while it still says `yue-design.example`, the site must not be
      deployed — every search-engine hint would point at a domain that is not ours.
- [ ] Tarballs install in a clean consumer and no workspace path leaks.
- [ ] Package size and dependency changes are reviewed.
- [ ] PR body/changelog state deliberate breaking changes and known limitations.
- [ ] Publish/tag/push results are reported with URLs and versions, or the work stops before mutation.
