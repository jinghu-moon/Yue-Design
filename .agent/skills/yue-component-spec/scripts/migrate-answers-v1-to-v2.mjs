#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const [input, output = 'answers.v2.json', dataFile] = process.argv.slice(2);
if (!input) {
  console.error('Usage: node migrate-answers-v1-to-v2.mjs <v1.json> [output.json] [data.js]');
  process.exit(2);
}
const old = JSON.parse(fs.readFileSync(input, 'utf8'));
let data = null;
if (dataFile) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(dataFile, 'utf8'), context, { filename: dataFile });
  data = context.window;
}
const answers = {};
for (const [id, entry] of Object.entries(old.answers || {})) {
  const question = data?.QUESTIONS?.find((item) => String(item.id) === String(id));
  if (data && !question) continue;
  const letters = Array.isArray(entry.letters) ? entry.letters : [];
  const note = typeof entry.note === 'string' ? entry.note : '';
  const type = question?.type || 'choice';
  answers[id] = {
    type,
    status: type === 'fact-question' ? 'needs-research' : (letters.length ? 'decided' : note.trim() ? 'question' : 'unknown'),
    letters: type === 'fact-question' ? [] : letters,
    value: type === 'fact-question' ? '' : '',
    note,
    round: Number(question?.round || 1),
    introducedBy: question?.introducedBy || null,
    supersedes: Array.isArray(question?.supersedes) ? question.supersedes : [],
    updatedAt: null,
  };
}
const migrated = {
  schemaVersion: 2,
  component: old.component || '',
  templateVersion: '2.0.0',
  exportedAt: new Date().toISOString(),
  round: Math.max(1, ...(data?.QUESTIONS || []).map((q) => Number(q.round || 1))),
  answers,
  userQuestions: [],
  findings: Array.isArray(data?.FINDINGS) ? data.FINDINGS : [],
  freezeGate: { choice: null, updatedAt: null },
};
fs.writeFileSync(output, JSON.stringify(migrated, null, 2) + '\n');
console.log(`migrated ${Object.keys(answers).length} answers to ${output}`);
