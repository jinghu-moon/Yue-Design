/**
 * The documentation contract, written down once.
 *
 * `tools/check-api-docs.mjs` (the release gate) and `tests/api-docs.test.mjs` (the unit
 * test of the gate itself) both read this file, so "the documentation is consistent" means
 * the same thing in `pnpm verify` and in `pnpm test` — the same reason the contrast
 * contract lives in `tools/token-audit.pairs.mjs`.
 *
 * Each contract names the files that have to agree:
 *
 *   - `types`      where the public interfaces are declared (the source of truth);
 *   - `docs`       the API page whose tables are the published interface;
 *   - `components` one entry per component: the interfaces it exposes and the single-file
 *                  component that implements them;
 *   - `exampleFiles` markdown whose examples must only use props that exist;
 *   - `gatedCounts` prose that quotes a number derived from another contract file, which is
 *                  the same kind of claim as a prop name and drifts the same way.
 *
 * Adding a component to a contract is what puts it under the gate: the checker fails on a
 * section it cannot find, so a component cannot be documented by accident and forgotten
 * here without the list itself being updated.
 */
import { AUDIT_PROFILES, PACKAGE_PAIRS } from './token-audit.pairs.mjs'

/**
 * How many contrast checks `pnpm audit:tokens` performs on the package.
 *
 * Derived rather than written down twice: the pages below quote this number in prose, and
 * "104" had already outlived the contract it described by one pair before this check
 * existed.
 */
const GATED_CONTRAST_CHECKS = PACKAGE_PAIRS.length * AUDIT_PROFILES.length

export const DOC_CONTRACTS = [
  {
    id: 'button',
    types: 'packages/vue/src/components/button/types.ts',
    docs: 'apps/docs/components/button/api.md',
    config: {
      file: 'packages/hooks/src/config/types.ts',
      type: 'YueConfig',
      section: '应用级配置',
    },
    components: [
      {
        name: 'YueButton',
        section: 'YueButton',
        props: 'YueButtonProps',
        slots: 'YueButtonSlots',
        emits: 'YueButtonEmits',
        sfc: 'packages/vue/src/components/button/YueButton.vue',
      },
      {
        name: 'YueButtonGroup',
        section: 'YueButtonGroup',
        props: 'YueButtonGroupProps',
        slots: 'YueButtonGroupSlots',
        emits: null,
        sfc: 'packages/vue/src/components/button/YueButtonGroup.vue',
      },
      {
        name: 'YueButtonToggle',
        section: 'YueButtonToggle',
        props: 'YueButtonToggleProps',
        slots: 'YueButtonToggleSlots',
        emits: 'YueButtonToggleEmits',
        sfc: 'packages/vue/src/components/button/YueButtonToggle.vue',
      },
      {
        name: 'YueButtonToggleItem',
        section: 'YueButtonToggleItem',
        props: 'YueButtonToggleItemProps',
        slots: 'YueButtonToggleItemSlots',
        emits: null,
        sfc: 'packages/vue/src/components/button/YueButtonToggleItem.vue',
      },
    ],
    exampleFiles: [
      'apps/docs/components/button.md',
      'apps/docs/components/button/api.md',
      'apps/docs/components/button/guide.md',
    ],
    gatedCounts: {
      // Both component pages quote the audit's check count. A number in prose is a claim
      // about `tools/token-audit.pairs.mjs`, so it is checked against it rather than
      // trusted — the Button page was quoting a count that had been wrong for a while.
      files: ['apps/docs/components/button.md', 'apps/docs/components/input.md'],
      pattern: /(\d+)\s*项门禁/g,
      expected: GATED_CONTRAST_CHECKS,
      label: 'contrast checks',
    },
  },
]
