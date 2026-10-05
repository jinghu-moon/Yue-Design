# Research findings

Findings are agent-owned, read-only facts. They are not user decisions and must not
be counted as answered questions.

```js
window.FINDINGS = [
  {
    id: 'finding-floating-ui',
    topic: '@floating-ui/dom vs @floating-ui/vue',
    finding: '...',
    sources: ['refer/floating-ui-master', 'official documentation'],
    confidence: 'high',
    leadsTo: [40],
    round: 2,
  },
];
```

For each component, preserve source evidence and rejected alternatives under
`research/`. The spec may summarize a finding, but the evidence must remain
inspectable.
