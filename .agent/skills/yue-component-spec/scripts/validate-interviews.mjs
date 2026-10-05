#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.argv[2] || 'interviews');
const skillRoot = path.resolve('.agent/skills/yue-component-spec/scripts');
const errors = [];
if (!fs.existsSync(root)) process.exit(0);
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = path.join(root, entry.name);
  const data = path.join(dir, 'data.js');
  const answers = path.join(dir, 'answers.json');
  if (!fs.existsSync(data)) continue;
  const checks = [['validate-interview-data.mjs', data, []]];
  if (fs.existsSync(answers)) checks.push(['validate-answers.mjs', answers, [data]]);
  for (const [script, file, ...extra] of checks) {
    const result = spawnSync(process.execPath, [path.join(skillRoot, script), file, ...extra.flat()], { encoding: 'utf8' });
    if (result.status !== 0) errors.push(`${entry.name}/${path.basename(file)}\n${result.stderr || result.stdout}`);
    else process.stdout.write(result.stdout);
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
