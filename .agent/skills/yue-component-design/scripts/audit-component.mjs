#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../../../..', import.meta.url)))
const name = process.argv[2]
if (!name || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) {
  console.error('audit:component: provide a lower-kebab component name')
  process.exit(1)
}
const pascal = name.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('')
const dir = join(root, 'packages/vue/src/components', name)
const docs = join(root, 'apps/docs/components')
const errors = []
const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\s)\/\/.*$/gm, '$1')
const required = ['types.ts', `Yue${pascal}.vue`, 'index.ts', 'style.css', `Yue${pascal}.test.ts`]
for (const file of required) if (!existsSync(join(dir, file))) errors.push(`missing packages/vue/src/components/${name}/${file}`)
for (const file of [`${name}.md`, `${name}/api.md`, `${name}/guide.md`]) if (!existsSync(join(docs, file))) errors.push(`missing apps/docs/components/${file}`)

if (existsSync(dir)) {
  for (const file of readdirSync(dir)) {
    const path = join(dir, file)
    if (!file.endsWith('.vue') && !file.endsWith('.ts')) continue
    const source = readFileSync(path, 'utf8')
    const code = stripComments(source)
    if (file.endsWith('.vue') && /<style(?:\s|>)/i.test(code)) errors.push(`${file}: SFC must not contain <style>`)
    if (/from\s+['"][^'"]+\.css['"]|import\s+['"][^'"]+\.css['"]/.test(code)) errors.push(`${file}: JavaScript must not import CSS`)
    const delegatesToNamespacedChild = /import\s+[A-Z][A-Za-z0-9]*\s+from\s+['"]\.\/Yue[A-Z]/.test(code)
    if (file.endsWith('.vue') && !delegatesToNamespacedChild && !/useNamespace\(\s*['"][^'"]+['"]\s*\)/.test(code)) {
      errors.push(`${file}: must use a Yue namespace via useNamespace()`)
    }
  }
  const css = existsSync(join(dir, 'style.css'))
    ? stripComments(readFileSync(join(dir, 'style.css'), 'utf8'))
    : ''
  if (/@layer\b/.test(css)) errors.push('style.css: component CSS must be unlayered')
  const allowed = new RegExp(`var\\(--(?:${name}-|_)`)
  for (const match of css.matchAll(/var\((--[a-z0-9_-]+)/g)) if (!allowed.test(`var(${match[1]}`)) errors.push(`style.css: reads non-${name} token ${match[1]}`)
  if (css && !css.includes(`.yue-${name}`)) errors.push(`style.css: missing .yue-${name} BEM root`)
  const index = existsSync(join(dir, 'index.ts')) ? readFileSync(join(dir, 'index.ts'), 'utf8') : ''
  if (!index.includes(`Yue${pascal}`)) errors.push('index.ts: component is not exported')
}

if (errors.length) {
  console.error(`audit:component ${name}: FAIL`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
console.log(`audit:component ${name}: PASS (${required.length} source files, 3 docs contracts)`)
