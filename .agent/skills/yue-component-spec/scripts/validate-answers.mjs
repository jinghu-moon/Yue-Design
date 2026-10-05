#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const [file, dataFile] = process.argv.slice(2);
if (!file) {
  console.error('Usage: node validate-answers.mjs <answers.json> [data.js]');
  process.exit(2);
}
const payload = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
const errors = [];
const statuses = new Set(['decided', 'unknown', 'needs-research', 'needs-prototype', 'question', 'not-applicable']);
let questions = null;
if (dataFile) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.resolve(dataFile), 'utf8'), context, { filename: dataFile });
  questions = new Map((context.window.QUESTIONS || []).map((question) => [String(question.id), question]));
}
if (payload.schemaVersion !== 2) errors.push('schemaVersion must be 2');
if (!payload.component) errors.push('component is required');
if (!payload.answers || typeof payload.answers !== 'object') errors.push('answers is required');
for (const [id, answer] of Object.entries(payload.answers || {})) {
  if (!answer || typeof answer !== 'object') { errors.push(`Q${id}: answer must be an object`); continue; }
  if (!statuses.has(answer.status)) errors.push(`Q${id}: invalid status ${answer.status}`);
  if (!Array.isArray(answer.letters)) errors.push(`Q${id}: letters must be an array`);
  if (answer.status === 'not-applicable' && !String(answer.note || '').trim()) errors.push(`Q${id}: not-applicable needs a note`);
  if (answer.status === 'decided' && !answer.letters?.length && !String(answer.value || '').trim() && !String(answer.note || '').trim()) errors.push(`Q${id}: decided answer has no value`);
  const question = questions?.get(String(id));
  if (dataFile && !question) errors.push(`Q${id}: answer has no matching question`);
  if (question && answer.type && answer.type !== (question.type || (question.options?.length ? 'choice' : 'open'))) errors.push(`Q${id}: answer type does not match data.js`);
}
if (questions) for (const id of questions.keys()) if (!(id in (payload.answers || {}))) errors.push(`Q${id}: required answer entry is missing`);
for (const item of payload.userQuestions || []) {
  if (!item.id || !String(item.text || '').trim()) errors.push('user question must have id and text');
  if (!['open', 'resolved', 'empty'].includes(item.status)) errors.push(`${item.id || 'user-question'}: invalid status`);
}
if (payload.freezeGate?.choice === 'freeze') {
  const findingIds = new Set((payload.findings || []).flatMap((finding) => Array.isArray(finding.leadsTo) ? finding.leadsTo.map(String) : []));
  for (const [id, answer] of Object.entries(payload.answers || {})) {
    if (answer.status === 'needs-research' && findingIds.has(String(id))) continue;
    if (answer.status === 'needs-research' || answer.status === 'needs-prototype' || answer.status === 'question' || answer.status === 'unknown') errors.push(`cannot freeze with Q${id} status ${answer.status}`);
  }
  for (const item of payload.userQuestions || []) if (item.status === 'open') errors.push(`cannot freeze with open ${item.id}`);
}
if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`validated answers for ${payload.component}`);
