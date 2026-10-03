# Component draft template

Use this template to produce the component spec before writing any code. Fill every section.
Leave no field as "TBD" — if something is unknown, write "Not yet decided: [question to resolve]"
so the gap is visible.

---

## Reference materials (when provided)

When the task provides screenshots, HTML, or links to reference component libraries
(TDesign, Vuetify, Ant Design, Reka, shadcn, Nuxt UI, etc.), use them as follows:

**Extract from screenshots:**
- Visual axes: what sizes, variants, themes, and states are visible
- Token intent: spacing rhythm, radius scale, border weight, color roles (not the hex values)
- Interaction states: hover, active, focus, disabled, loading — which are visually distinct
- Slot structure: what content regions exist (icon leading/trailing, label, description, badge)

**Extract from HTML:**
- Semantic element choices (native `<button>` vs `<div role="button">`, etc.)
- ARIA attributes in use (`aria-pressed`, `aria-disabled`, `aria-expanded`, etc.)
- CSS class naming patterns that reveal intent (not for copying, but for understanding the API surface)
- DOM structure that reveals slot/composition decisions

**Do not:**
- Copy class names, CSS variables, or token names from the reference library into Yue
- Reproduce the reference library's internal implementation or prop names verbatim
- Treat the reference screenshot as a pixel-perfect spec — extract the design intent, not the exact measurements
- Derive Yue's API from the reference API count or shape; derive it from the use cases

Record what was borrowed (a design decision, an interaction pattern, an ARIA choice) and
what was deliberately rejected in the Identity section below.

---

## Identity

- **Component name:** `Yue[Name]` (PascalCase; what the consumer imports)
- **Package entry:** `@yue-ui/vue` (add per-component entry if treeshaking needs it)
- **Classification:**
  - Drive: `template` | `imperative`
  - Position: `in-place` | `detached`
  - Lifecycle: `persistent` | `transient`
  - Composition: `atomic` | `compound`
- **Nearest existing Yue component:** (or "none")
- **Reference implementation chosen:** (Reka / Vuetify / Ant Design / Nuxt UI / shadcn — name it and why)

---

## Problem and use cases

**What problem does this component solve?**
One paragraph. State the user need, not the implementation.

**Use cases (minimum three, each with markup sketch):**

```vue
<!-- Use case 1: [label] -->
<YueName ... />

<!-- Use case 2: [label] -->
<YueName ... />

<!-- Use case 3: [label] -->
<YueName ... />
```

If you cannot write the markup, the API is not ready. Stop here and resolve it first.

---

## Explicit non-features

Things this component will NOT do in this slice. Each entry is a decision, not an omission.

- [ ] [Feature X] — reason: [consumer owns it / out of scope / follow-up issue]
- [ ] [Feature Y] — reason: ...

---

## API draft

### Props

| Prop | Type | Default | Controlled? | Governs |
| --- | --- | --- | --- | --- |
| `modelValue` | `T` | — | yes | [what DOM/ARIA output it controls] |
| `size` | `'sm' \| 'md' \| 'lg'` | config or `'md'` | no | height, padding, font |
| ... | | | | |

*Controlled* means the prop requires `v-model` or `:prop + @event` to update; uncontrolled
means the component manages its own state when the prop is absent.

### Emits

| Event | Payload | When |
| --- | --- | --- |
| `update:modelValue` | `T` | on user action that changes the value |
| ... | | |

### Slots

| Slot | Fallback | Purpose |
| --- | --- | --- |
| `default` | — | [label, content, items] |
| ... | | |

### Expose

List only stable methods the consumer legitimately calls. Prefer zero exposed methods.
If exposure is needed, write: `method(args): return` and the use case.

### Attribute routing

Which element receives fallthrough attributes by default, and which attrs are redirected:

- **Default:** attrs fall through to `[element]`
- **Redirected:** `class`, `style` → wrapper div; `dir` → wrapper div; all others → native input

---

## Accessibility

- **Role:** `[native element role / explicit role / none — inherits from child]`
- **APG pattern:** [link to pattern or "N/A"]
- **Keyboard behavior:**

| Key | Action |
| --- | --- |
| `Space` / `Enter` | activate |
| ... | ... |

- **Required accessible name source:** `aria-label` / `aria-labelledby` / visible text
- **States communicated via ARIA:** `aria-disabled`, `aria-busy`, `aria-pressed`, ...
- **Deviations from APG and why:** (or "none")

---

## Token intent

Do not write values. Write the axes and the semantic token names you will consume.

| Axis | Token consumed | Notes |
| --- | --- | --- |
| Size | `--{name}-height-sm/md/lg`, `--{name}-padding-inline-*` | |
| Color fill | `--{name}-fill`, `--{name}-fill-hover` | → semantic color token |
| Border | `--{name}-border-color` | |
| Radius | `--{name}-radius` | |
| Motion | `--{name}-duration` | → global motion token |

---

## Breaking changes (if modifying an existing component)

If this spec modifies a public API, read `breaking-change-process.md` and fill this section
before proceeding to implementation. Otherwise write "N/A — new component."

| Changed surface | Old | New | Reason |
| --- | --- | --- | --- |
| Prop `variant` | `'ghost'` not present | added | needed for transparent button affordance |
| ... | | | |

---

## Open questions

List any unresolved decisions. Each must be resolved before the API is frozen.

- [ ] [Question]: [who resolves it / what we are waiting for]
