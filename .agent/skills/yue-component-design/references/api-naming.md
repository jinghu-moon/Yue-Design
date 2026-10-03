# API naming and public contracts

This is the Yue naming authority for new components. Existing public Button/Input names remain
the compatibility baseline until an intentional development-stage redesign changes them.

## Names

- Use a full, descriptive noun: `YueDatePicker`, not `YueDatePkr`.
- `size`, `disabled`, `loading`, `readonly`, `invalid`, `clearable`, `placement` and `attach`
  keep their established meanings when applicable.
- For visibility, use `open` for new APIs. It matches native `<dialog>`/`<details>` and the
  Reka/ARIA vocabulary. Do not introduce `visible`; if a future breaking redesign changes an
  existing name, record it explicitly in the handoff.
- Use `variant` for visual treatment, `theme` for semantic intent, `shape` for geometry,
  `placement` for spatial position, and `tag` for the rendered element.

## Events, models and expose

- `modelValue` is the primary `v-model`; use a named model only for an independent value.
- Event names describe the native or semantic action: `update:modelValue`, `change`, `focus`,
  `blur`, `open`, `close`, `confirm`. Declare every event so it cannot fall through and fire twice.
- Payload starts with the primary value or native event. Additional context is one typed object.
- Forward native events unchanged when possible. If an event is synthesized or de-duplicated,
  state that in types/docs and test `type`, `target`, timing and value behavior.
- Expose only stable imperative methods (`focus`, `blur`, `scrollIntoView`, etc.) through
  `defineExpose`; do not expose internal refs or implementation state. Prefer `nativeElement`
  when a consumer needs the underlying element.

## Slots and DOM

- Use slots for consumer-owned content and icons. Do not add an icon/string prop when a slot can
  preserve semantics and composition.
- Standard part names are `root`, `header`, `body`, `footer`, `trigger`, `content`, `popup`,
  `prefix`, `suffix`, `label`, and `description`; choose only parts that exist.
- Use BEM part classes for styling hooks. State uses native attributes, ARIA, or `data-state`
  from the interaction primitive; do not invent parallel boolean classes for every state.
- Route `id`, `name`, `aria-*`, form attributes and keyboard attributes to the actual native
  control. A visual wrapper must not become a second fake control.

## Token names

Component tokens use `--{component}-{role}-{state}` or `--{component}-{property}-{size}`:
`--input-border-color-focus`, `--button-height-md`. Semantic tokens own meaning; primitives
own palette values. Never name a token after a pixel value or a specific brand color.

## Incorrect / correct

```ts
// Incorrect: two booleans describe one state and a visual prop carries content.
defineProps<{ visible: boolean; outlined: boolean; icon: string }>()

// Correct: one semantic state, orthogonal appearance, and a slot for the icon.
defineProps<{ open: boolean; variant: 'solid' | 'outline' }>()
```
