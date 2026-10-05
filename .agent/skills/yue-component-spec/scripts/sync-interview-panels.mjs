#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const template = path.join(root, '.agent/skills/yue-component-spec/references/interview-panel-template.html');
const interviews = path.join(root, 'interviews');
const source = fs.readFileSync(template, 'utf8');
const dirs = fs.readdirSync(interviews, { withFileTypes: true }).filter((entry) => entry.isDirectory());
let changed = 0;
for (const dir of dirs) {
  const panel = path.join(interviews, dir.name, 'panel.html');
  const data = path.join(interviews, dir.name, 'data.js');
  if (!fs.existsSync(data)) continue;
  if (!fs.existsSync(panel) || fs.readFileSync(panel, 'utf8') !== source) {
    fs.writeFileSync(panel, source);
    changed++;
    console.log(`synced ${path.relative(root, panel)}`);
  }
}
console.log(`synced ${changed} interview panel(s)`);
