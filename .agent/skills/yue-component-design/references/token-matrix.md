# Token and state matrix

Write this matrix before CSS. It is a design decision record, not a list of every conceivable
state. A cell marked `N/A` must explain why the state cannot occur.

| Axis | Values to enumerate | Required observation |
| --- | --- | --- |
| Profile | light, dark; accent/neutral when consumed | computed colors and contrast |
| Size | every public size | stable height, padding, typography |
| Variant/theme | every public combination | resting, hover, focus-visible, pressed |
| State | disabled, readonly, loading, selected, invalid | semantic DOM plus visual output |
| Motion | normal, `prefers-reduced-motion` | duration/animation and static fallback |
| System | `forced-colors: active` where interactive | system colors and non-color state cue |

Keep the chain:

```text
primitive token -> semantic token -> component token -> component CSS
```

Component CSS may read private composition variables such as `--_fill` only when each is
assigned from a component token in the same block. Raw `#hex`, primitive variables and another
component's tokens are prohibited. Disabled text may be below WCAG contrast because WCAG
explicitly exempts disabled controls; measure it and label it diagnostic rather than claiming a
passing threshold.

For each interactive color pair record the measured ratio and threshold. Text needs 4.5:1
(3:1 for large text); focus indicators and non-text boundaries need 3:1. Contrast alone never
replaces `aria-*`, focus rings or state attributes.
