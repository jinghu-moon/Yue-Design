#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node validate-interview-data.mjs <data.js>');
  process.exit(2);
}
const source = fs.readFileSync(path.resolve(file), 'utf8');
const context = { window: {} };
vm.runInNewContext(source, context, { filename: file });
const { window } = context;
const questions = Array.isArray(window.QUESTIONS) ? window.QUESTIONS : [];
const sections = Array.isArray(window.SECTIONS) ? window.SECTIONS : [];
const errors = [];
const ids = new Set();
if (window.SCHEMA_VERSION !== 2) errors.push('SCHEMA_VERSION must be 2');
if (!window.COMPONENT_NAME) errors.push('COMPONENT_NAME is required');
if (!questions.length) errors.push('QUESTIONS must not be empty');
for (const q of questions) {
  if (!Number.isInteger(q.id) || ids.has(q.id)) errors.push(`duplicate/invalid question id: ${q.id}`);
  ids.add(q.id);
  const type = q.type || (Array.isArray(q.options) ? 'choice' : 'open');
  if (!['choice', 'multi-choice', 'open', 'fact-question', 'prototype-gate'].includes(type)) errors.push(`Q${q.id}: invalid type ${type}`);
  if (q.required !== undefined && q.required !== false && q.required !== true) errors.push(`Q${q.id}: required must be boolean`);
  if ((type === 'choice' || type === 'multi-choice') && !Array.isArray(q.options)) errors.push(`Q${q.id}: choice question needs options`);
  const recommended = q.recommended == null ? [] : Array.isArray(q.recommended) ? q.recommended : [q.recommended];
  if (type === 'multi-choice' && !Array.isArray(q.recommended)) errors.push(`Q${q.id}: multi-choice recommended must be an array`);
  const optionLetters = new Set((q.options || []).map((o) => o.letter));
  for (const letter of recommended) if (!optionLetters.has(letter)) errors.push(`Q${q.id}: recommended option ${letter} does not exist`);
}
for (const section of sections) {
  if (!Number.isInteger(section.start) || !Number.isInteger(section.end) || section.start > section.end) errors.push(`invalid section range: ${section.title}`);
}
if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`validated ${questions.length} questions (${window.COMPONENT_NAME})`);
