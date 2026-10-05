# Interview rounds

`round` is an interview iteration, not merely a visual section. A later question
must record why it exists:

```js
{ id: 40, round: 2, introducedBy: 'user-question-1', supersedes: [33] }
```

The agent may stop or open another round based on the decision frontier. It may not
freeze a specification on the user's behalf. Each round should preserve its input:
the previous snapshot, open user questions, and relevant findings.

Recommended directory layout:

```text
interviews/{component}/
  panel.html
  data.js
  answers.json
  findings.json
  history/answers-r001.json
  research/sources.md
```

Never overwrite history files. The current `answers.json` is a convenience snapshot;
the history files are the audit trail.
