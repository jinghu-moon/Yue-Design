#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../../../..', import.meta.url)))

function fail(message) {
  console.error(`new:component: ${message}`)
  process.exit(1)
}

const args = process.argv.slice(2)
const name = args.shift()
if (!name || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) {
  fail('name must be a lower-kebab component name, for example `tag` or `date-picker`')
}

const options = { position: 'in-place', drive: 'template', lifecycle: 'persistent', composition: 'atomic' }
for (let index = 0; index < args.length; index += 2) {
  const key = args[index]?.replace(/^--/, '')
  const value = args[index + 1]
  if (!(key in options) || !value) fail(`unknown or incomplete option: ${args[index] ?? ''}`)
  options[key] = value
}
const allowed = {
  position: ['in-place', 'detached'],
  drive: ['template', 'imperative'],
  lifecycle: ['persistent', 'transient'],
  composition: ['atomic', 'compound'],
}
for (const [key, values] of Object.entries(allowed)) {
  if (!values.includes(options[key])) fail(`${key} must be one of: ${values.join(', ')}`)
}

const pascal = name.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('')
const componentDir = join(root, 'packages/vue/src/components', name)
if (existsSync(componentDir)) fail(`${componentDir} already exists; refusing to overwrite it`)
mkdirSync(componentDir, { recursive: true })

const files = {
  'types.ts': `export interface Yue${pascal}Props {\n  size?: 'sm' | 'md' | 'lg'\n}\n\nexport interface Yue${pascal}Slots {\n  default?: () => unknown\n}\n`,
  [`Yue${pascal}.vue`]: `<script setup lang="ts">\nimport { useNamespace } from '@yue-ui/hooks'\nimport type { Yue${pascal}Props, Yue${pascal}Slots } from './types'\n\ndefineOptions({ name: 'Yue${pascal}', inheritAttrs: false })\nwithDefaults(defineProps<Yue${pascal}Props>(), { size: undefined })\ndefineSlots<Yue${pascal}Slots>()\nconst ns = useNamespace('${name}')\n</script>\n\n<template>\n  <div v-bind="$attrs" :class="[ns.b(), ns.m(size ?? 'md')]">\n    <slot />\n  </div>\n</template>\n`,
  'index.ts': `import Yue${pascal} from './Yue${pascal}.vue'\n\nexport { Yue${pascal} }\nexport default Yue${pascal}\nexport type { Yue${pascal}Props, Yue${pascal}Slots } from './types'\n`,
  'style.css': `.yue-${name} {\n  box-sizing: border-box;\n  color: var(--${name}-color);\n}\n\n.yue-${name}--sm {\n  min-height: var(--${name}-height-sm);\n}\n\n.yue-${name}--md {\n  min-height: var(--${name}-height-md);\n}\n\n.yue-${name}--lg {\n  min-height: var(--${name}-height-lg);\n}\n`,
  [`Yue${pascal}.test.ts`]: `import { describe, expect, it } from 'vitest'\n\ndescribe('Yue${pascal}', () => {\n  it('has a test boundary to replace with contract assertions', () => {\n    expect(true).toBe(true)\n  })\n})\n`,
}
for (const [file, content] of Object.entries(files)) writeFileSync(join(componentDir, file), content, 'utf8')

const docsDir = join(root, 'apps/docs/components', name)
mkdirSync(docsDir, { recursive: true })
writeFileSync(join(root, `apps/docs/components/${name}.md`), `# Yue${pascal}\n\n<script setup lang="ts">\nimport Yue${pascal} from '@yue-ui/vue/${name}'\n</script>\n\n<Yue${pascal}>Example</Yue${pascal}>\n\nSee [API](./${name}/api) and [Guide](./${name}/guide).\n`, 'utf8')
writeFileSync(join(docsDir, 'api.md'), `# Yue${pascal} API\n\nImport Yue${pascal} from @yue-ui/vue/${name}. Document Props, Slots, Emits, DOM routing, tokens and accessibility output here.\n`, 'utf8')
writeFileSync(join(docsDir, 'guide.md'), `# Yue${pascal} Guide\n\nRecord when to use Yue${pascal}, when not to use it, the reference implementation, composition rules and deliberate limitations.\n`, 'utf8')

console.log(`created packages/vue/src/components/${name} and apps/docs/components/${name}*`)
console.log(`classification: ${options.drive}, ${options.position}, ${options.lifecycle}, ${options.composition}`)
console.log('next: add package exports/style aggregation, real tokens, docs examples, and contract tests')
